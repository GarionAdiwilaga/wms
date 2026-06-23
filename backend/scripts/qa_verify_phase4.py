import sys
import os
from fastapi.testclient import TestClient

# Ensure backend root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.item import Item
from app.models.inventory import InventoryTransaction, BranchStock
from app.models.transfer import Transfer, TransferLine
from app.models.stock_opname import StockOpnameSession, StockOpnameLine
from app.services.inventory_service import inventory_service
from app.schemas.inventory import StockChangeLine
from app.core.security import create_access_token

def run_verification():
    print("Initializing TestClient...")
    client = TestClient(app)
    db = SessionLocal()

    # Test Item setup (QA001)
    item = db.query(Item).filter(Item.manual_code == "QA001").first()
    if not item:
        print("CRITICAL FAILURE: Test item QA001 not found.")
        sys.exit(1)
    item_id = item.item_id
    print(f"Using test item QA001 (ID: {item_id}, Category ID: {item.category_id})")

    # Define cleanups
    def cleanup_all():
        db.query(BranchStock).filter(BranchStock.item_id == item_id).delete()
        db.query(InventoryTransaction).filter(InventoryTransaction.item_id == item_id).delete()
        db.query(TransferLine).filter(TransferLine.item_id == item_id).delete()
        db.query(Transfer).delete()
        db.query(StockOpnameLine).filter(StockOpnameLine.item_id == item_id).delete()
        db.query(StockOpnameSession).delete()
        db.commit()

    # Call cleanup_all first to clear referencing FK constraints before deleting users
    cleanup_all()

    # Create test users for RBAC checks
    print("Setting up temporary test users in DB...")
    
    # Clean up existing users with these names
    temp_users = db.query(User).filter(User.username.in_(["b1head", "b2head", "b1staff"])).all()
    if temp_users:
        user_ids = [u.user_id for u in temp_users]
        from app.models.audit_log import AuditLog
        db.query(AuditLog).filter(AuditLog.user_id.in_(user_ids)).delete()
        db.query(User).filter(User.user_id.in_(user_ids)).delete()
        db.commit()

    b1head = User(username="b1head", password_hash="dummy", full_name="B1 Head", role="branch_head", branch_id=1)
    b2head = User(username="b2head", password_hash="dummy", full_name="B2 Head", role="branch_head", branch_id=2)
    b1staff = User(username="b1staff", password_hash="dummy", full_name="B1 Staff", role="warehouse_staff", branch_id=1)
    
    db.add(b1head)
    db.add(b2head)
    db.add(b1staff)
    db.commit()
    db.refresh(b1head)
    db.refresh(b2head)
    db.refresh(b1staff)

    # Helper function to generate auth headers
    def auth_headers(user: User):
        token = create_access_token(user_id=user.user_id, role=user.role, token_version=user.token_version)
        return {"Authorization": f"Bearer {token}"}

    # Fetch admin
    admin = db.query(User).filter(User.username == "admin").first()
    admin_headers = auth_headers(admin)
    b1head_headers = auth_headers(b1head)
    b2head_headers = auth_headers(b2head)
    b1staff_headers = auth_headers(b1staff)

    def reset_stocks(b1_qty=0, b2_qty=0):
        cleanup_all()
        # Seed Branch 1
        if b1_qty > 0:
            inventory_service.execute_stock_changes(
                db=db, branch_id=1, transaction_type="IN", reference_type="manual",
                reference_id=None, document_no="SEED", lines=[StockChangeLine(item_id=item_id, quantity=b1_qty)],
                notes=None, created_by=admin.user_id
            )
        # Seed Branch 2
        if b2_qty > 0:
            inventory_service.execute_stock_changes(
                db=db, branch_id=2, transaction_type="IN", reference_type="manual",
                reference_id=None, document_no="SEED", lines=[StockChangeLine(item_id=item_id, quantity=b2_qty)],
                notes=None, created_by=admin.user_id
            )
        db.commit()

    try:
        # ==========================================
        # 1. TRANSFER STATE MACHINE & LEDGER (draft -> in_transit -> received)
        # ==========================================
        print("\n--- Verifying Transfer Lifecycle: draft -> in_transit -> received ---")
        reset_stocks(b1_qty=100, b2_qty=0)

        # Create draft transfer
        transfer_payload = {
            "source_branch_id": 1,
            "dest_branch_id": 2,
            "notes": "Test Transfer",
            "lines": [{"item_id": item_id, "sent_quantity": 40}]
        }
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=admin_headers)
        assert res.status_code == 201, f"Failed to create transfer: {res.text}"
        trf = res.json()
        trf_id = trf["transfer_id"]
        line_id = trf["lines"][0]["line_id"]
        assert trf["status"] == "draft"

        # Verify stock not modified during draft
        assert inventory_service.get_branch_stock(db, 1, item_id) == 100
        assert inventory_service.get_branch_stock(db, 2, item_id) == 0

        # Ship it (draft -> in_transit)
        res = client.post(f"/api/v1/transfers/{trf_id}/ship", headers=admin_headers)
        assert res.status_code == 200, f"Ship failed: {res.text}"
        assert res.json()["status"] == "in_transit"

        # Verify stock deducted from source, no stock added to destination
        assert inventory_service.get_branch_stock(db, 1, item_id) == 60
        assert inventory_service.get_branch_stock(db, 2, item_id) == 0
        
        # Verify OUT transaction exists in database
        tx_out = db.query(InventoryTransaction).filter(
            InventoryTransaction.branch_id == 1,
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "OUT",
            InventoryTransaction.reference_type == "transfer"
        ).first()
        assert tx_out is not None, "OUT transaction not written for ship"
        assert tx_out.quantity == 40
        print("Success: Stock deducted from source branch upon ship. No virtual transit stock exists.")

        # Receive with variance (in_transit -> received)
        receive_payload = {
            "received_notes": "Received slightly less",
            "lines": [{
                "line_id": line_id,
                "received_quantity": 38,
                "variance_notes": "2 damaged during shipping",
                "variance_reason": "Damaged in Transit"
            }]
        }
        res = client.post(f"/api/v1/transfers/{trf_id}/receive", json=receive_payload, headers=admin_headers)
        assert res.status_code == 200, f"Receive failed: {res.text}"
        trf_received = res.json()
        assert trf_received["status"] == "received"
        assert trf_received["lines"][0]["received_quantity"] == 38
        assert trf_received["lines"][0]["variance_reason"] == "Damaged in Transit"

        # Verify destination stock increased by received quantity
        assert inventory_service.get_branch_stock(db, 1, item_id) == 60
        assert inventory_service.get_branch_stock(db, 2, item_id) == 38
        
        # Verify IN transaction exists in database
        tx_in = db.query(InventoryTransaction).filter(
            InventoryTransaction.branch_id == 2,
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "IN",
            InventoryTransaction.reference_type == "transfer"
        ).first()
        assert tx_in is not None, "IN transaction not written for receive"
        assert tx_in.quantity == 38
        print("Success: Received with variance successfully updated destination stock and stored variance reasons.")

        # ==========================================
        # 2. RECEIPT IMMUTABILITY
        # ==========================================
        print("\n--- Verifying Receipt Immutability ---")
        # Try to modify line quantities (update endpoint)
        res = client.put(f"/api/v1/transfers/{trf_id}", json={
            "notes": "Should fail",
            "lines": [{"item_id": item_id, "sent_quantity": 99}]
        }, headers=admin_headers)
        assert res.status_code == 400, "Should reject update of received transfer"
        
        # Try to cancel it
        res = client.post(f"/api/v1/transfers/{trf_id}/cancel", json={"cancellation_reason": "fail"}, headers=admin_headers)
        assert res.status_code == 400, "Should reject cancellation of received transfer"
        print("Success: Received transfer is immutable (rejects updates and cancellation).")

        # ==========================================
        # 3. TRANSFER STATE MACHINE (in_transit -> cancelled)
        # ==========================================
        print("\n--- Verifying Transfer Lifecycle: in_transit -> cancelled (reversal) ---")
        reset_stocks(b1_qty=100, b2_qty=0)

        # Create & Ship
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=admin_headers)
        trf_id = res.json()["transfer_id"]
        client.post(f"/api/v1/transfers/{trf_id}/ship", headers=admin_headers)
        assert inventory_service.get_branch_stock(db, 1, item_id) == 60

        # Cancel in-transit
        res = client.post(f"/api/v1/transfers/{trf_id}/cancel", json={"cancellation_reason": "cancelled test"}, headers=admin_headers)
        assert res.status_code == 200, f"Cancel in_transit failed: {res.text}"
        assert res.json()["status"] == "cancelled"

        # Verify stock restored to source branch, destination branch untouched
        assert inventory_service.get_branch_stock(db, 1, item_id) == 100
        assert inventory_service.get_branch_stock(db, 2, item_id) == 0
        
        # Verify IN ledger transaction exists for reversal
        tx_rev = db.query(InventoryTransaction).filter(
            InventoryTransaction.branch_id == 1,
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "IN",
            InventoryTransaction.reference_type == "transfer",
            InventoryTransaction.notes.contains("Reversal")
        ).first()
        assert tx_rev is not None, "Reversal transaction not found"
        assert tx_rev.quantity == 40
        print("Success: Cancellation of in-transit transfer restored stock to origin branch via IN ledger transaction.")

        # ==========================================
        # 4. TRANSFER STATE MACHINE (draft -> cancelled)
        # ==========================================
        print("\n--- Verifying Transfer Lifecycle: draft -> cancelled ---")
        reset_stocks(b1_qty=100, b2_qty=0)
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=admin_headers)
        trf_id = res.json()["transfer_id"]
        
        res = client.post(f"/api/v1/transfers/{trf_id}/cancel", json={"cancellation_reason": "cancel draft"}, headers=admin_headers)
        assert res.status_code == 200, f"Cancel draft failed: {res.text}"
        assert res.json()["status"] == "cancelled"
        assert inventory_service.get_branch_stock(db, 1, item_id) == 100
        print("Success: Cancellation of draft transfer completed with no stock changes.")

        # ==========================================
        # 5. STOCK OPNAME (draft -> completed, positive variance)
        # ==========================================
        print("\n--- Verifying Stock Opname: Positive Variance ---")
        reset_stocks(b1_qty=30, b2_qty=0)

        opname_payload = {
            "branch_id": 1,
            "category_id": item.category_id,
            "status": "draft",
            "notes": "Test Opname",
            "lines": [{"item_id": item_id, "physical_quantity": 45}]
        }
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=admin_headers)
        assert res.status_code == 201, f"Failed to create opname: {res.text}"
        op_session = res.json()
        op_id = op_session["session_id"]
        assert op_session["status"] == "draft"

        # Complete opname
        res = client.post(f"/api/v1/stock-opname/{op_id}/complete", headers=admin_headers)
        assert res.status_code == 200, f"Complete opname failed: {res.text}"
        completed_op = res.json()
        assert completed_op["status"] == "completed"
        
        # Verify snapshot fields
        line = completed_op["lines"][0]
        assert line["system_quantity"] == 30
        assert line["physical_quantity"] == 45
        assert line["variance"] == 15

        # Verify stock cache updated to 45
        assert inventory_service.get_branch_stock(db, 1, item_id) == 45

        # Verify positive variance generates IN transaction with reference_type 'opname'
        tx_opname = db.query(InventoryTransaction).filter(
            InventoryTransaction.branch_id == 1,
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "IN",
            InventoryTransaction.reference_type == "opname"
        ).first()
        assert tx_opname is not None, "Opname IN transaction not found"
        assert tx_opname.quantity == 15
        print("Success: Completed Stock Opname with positive variance. Snapshot stored, stock updated, IN transaction generated.")

        # ==========================================
        # 6. STOCK OPNAME (negative variance)
        # ==========================================
        print("\n--- Verifying Stock Opname: Negative Variance ---")
        reset_stocks(b1_qty=30, b2_qty=0)

        opname_payload["lines"][0]["physical_quantity"] = 20
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=admin_headers)
        op_id = res.json()["session_id"]

        res = client.post(f"/api/v1/stock-opname/{op_id}/complete", headers=admin_headers)
        assert res.status_code == 200
        completed_op = res.json()
        line = completed_op["lines"][0]
        assert line["system_quantity"] == 30
        assert line["physical_quantity"] == 20
        assert line["variance"] == -10
        
        assert inventory_service.get_branch_stock(db, 1, item_id) == 20

        # Verify negative variance generates OUT transaction with reference_type 'opname'
        tx_opname = db.query(InventoryTransaction).filter(
            InventoryTransaction.branch_id == 1,
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "OUT",
            InventoryTransaction.reference_type == "opname"
        ).first()
        assert tx_opname is not None, "Opname OUT transaction not found"
        assert tx_opname.quantity == 10
        print("Success: Completed Stock Opname with negative variance. Snapshot stored, stock updated, OUT transaction generated.")

        # ==========================================
        # 7. STOCK OPNAME (zero variance)
        # ==========================================
        print("\n--- Verifying Stock Opname: Zero Variance ---")
        reset_stocks(b1_qty=30, b2_qty=0)

        opname_payload["lines"][0]["physical_quantity"] = 30
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=admin_headers)
        op_id = res.json()["session_id"]

        res = client.post(f"/api/v1/stock-opname/{op_id}/complete", headers=admin_headers)
        assert res.status_code == 200
        completed_op = res.json()
        line = completed_op["lines"][0]
        assert line["system_quantity"] == 30
        assert line["physical_quantity"] == 30
        assert line["variance"] == 0
        
        assert inventory_service.get_branch_stock(db, 1, item_id) == 30

        # Verify no opname transaction is generated
        tx_opname = db.query(InventoryTransaction).filter(
            InventoryTransaction.branch_id == 1,
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.reference_type == "opname"
        ).first()
        assert tx_opname is None, "Should not generate opname transaction for zero variance"
        print("Success: Completed Stock Opname with zero variance. No ledger rows generated.")

        # ==========================================
        # 8. RBAC VERIFICATION
        # ==========================================
        print("\n--- Verifying Role-Based Access Control (RBAC) ---")
        reset_stocks(b1_qty=100, b2_qty=0)

        # B2 Head tries to create transfer originating from B1 (Branch 1) -> Should get 403
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=b2head_headers)
        assert res.status_code == 403, f"B2 Head should not be able to create transfer from B1: {res.status_code}"
        
        # B1 Head can create transfer originating from B1 -> Should succeed
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=b1head_headers)
        assert res.status_code == 201, f"B1 Head should be able to create transfer from B1: {res.text}"
        trf_id = res.json()["transfer_id"]
        line_id = res.json()["lines"][0]["line_id"]

        # Warehouse staff tries to ship transfer -> Should get 403 (restricted to admin/branch_head)
        res = client.post(f"/api/v1/transfers/{trf_id}/ship", headers=b1staff_headers)
        assert res.status_code == 403, f"Warehouse staff should not be able to ship transfers: {res.status_code}"

        # B1 Head ships it
        res = client.post(f"/api/v1/transfers/{trf_id}/ship", headers=b1head_headers)
        assert res.status_code == 200

        # B1 Head tries to receive transfer at B2 -> Should get 403
        receive_payload = {
            "received_notes": "notes",
            "lines": [{"line_id": line_id, "received_quantity": 40}]
        }
        res = client.post(f"/api/v1/transfers/{trf_id}/receive", json=receive_payload, headers=b1head_headers)
        assert res.status_code == 403, f"B1 Head should not be able to receive transfer destined for B2: {res.status_code}"

        # B2 Head receives transfer at B2 -> Should succeed
        res = client.post(f"/api/v1/transfers/{trf_id}/receive", json=receive_payload, headers=b2head_headers)
        assert res.status_code == 200, f"B2 Head receive failed: {res.text}"

        # B1 Staff tries to perform opname at B2 -> Should get 403
        opname_payload = {
            "branch_id": 2,
            "category_id": item.category_id,
            "status": "draft",
            "lines": [{"item_id": item_id, "physical_quantity": 45}]
        }
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=b1staff_headers)
        assert res.status_code == 403, f"B1 Staff should not be able to perform opname at B2: {res.status_code}"

        # B1 Staff can perform opname at B1 -> Should succeed
        opname_payload["branch_id"] = 1
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=b1staff_headers)
        assert res.status_code == 201, f"B1 Staff should be able to perform opname at B1: {res.text}"
        
        print("Success: RBAC verification passed (Branch restrictions enforced, write actions restricted to correct roles).")

        print("\nALL PHASE 4.1 BACKEND VERIFICATIONS PASSED SUCCESSFULLY.")

    except AssertionError as e:
        print(f"CRITICAL FAILURE: Verification failed! {e}")
        sys.exit(1)
    except Exception as e:
        print(f"EXCEPTION DURING VERIFICATION: {e}")
        sys.exit(1)
    finally:
        # Cleanup temporary users and their audit logs
        cleanup_all()
        temp_users = db.query(User).filter(User.username.in_(["b1head", "b2head", "b1staff"])).all()
        if temp_users:
            user_ids = [u.user_id for u in temp_users]
            from app.models.audit_log import AuditLog
            db.query(AuditLog).filter(AuditLog.user_id.in_(user_ids)).delete()
            db.query(User).filter(User.user_id.in_(user_ids)).delete()
            db.commit()
        db.close()

if __name__ == "__main__":
    run_verification()
