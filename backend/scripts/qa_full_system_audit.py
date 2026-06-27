import sys
import os
import json
from fastapi.testclient import TestClient

# Ensure backend root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.item import Item
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.uom import UOM
from app.models.inventory import InventoryTransaction, BranchStock
from app.models.transfer import Transfer, TransferLine
from app.models.stock_opname import StockOpnameSession, StockOpnameLine
from app.services.inventory_service import inventory_service
from app.schemas.inventory import StockChangeLine
from app.core.security import create_access_token

def run_audit():
    print("Initializing TestClient for Full-System Audit...")
    client = TestClient(app)
    db = SessionLocal()

    # Define test context/results
    results = {}
    
    # 1. Setup temporary test users in DB
    print("Setting up temporary test users...")
    
    # Clean up existing users with these names
    db.query(User).filter(User.username.in_(["audit_b1head", "audit_b2head", "audit_b1staff"])).delete()
    db.commit()

    b1head = User(username="audit_b1head", password_hash="dummy", full_name="Audit B1 Head", role="branch_head", branch_id=1)
    b2head = User(username="audit_b2head", password_hash="dummy", full_name="Audit B2 Head", role="branch_head", branch_id=2)
    b1staff = User(username="audit_b1staff", password_hash="dummy", full_name="Audit B1 Staff", role="warehouse_staff", branch_id=1)
    
    db.add(b1head)
    db.add(b2head)
    db.add(b1staff)
    db.commit()
    db.refresh(b1head)
    db.refresh(b2head)
    db.refresh(b1staff)

    # Auth headers generator
    def auth_headers(user: User):
        token = create_access_token(user_id=user.user_id, role=user.role, token_version=user.token_version)
        return {"Authorization": f"Bearer {token}"}

    admin = db.query(User).filter(User.username == "admin").first()
    admin_headers = auth_headers(admin)
    b1head_headers = auth_headers(b1head)
    b2head_headers = auth_headers(b2head)
    b1staff_headers = auth_headers(b1staff)

    # Resolve static dependencies (use existing category 51/1, supplier 50/1, uom 1)
    # Check what supplier and category exists
    cat = db.query(Category).first()
    sup = db.query(Supplier).first()
    uom = db.query(UOM).first()
    
    if not (cat and sup and uom):
        print("CRITICAL FAILURE: Base data (Category, Supplier, UOM) missing from DB.")
        sys.exit(1)
        
    print(f"Using Base Entities: Cat={cat.name} ({cat.category_id}), Sup={sup.name} ({sup.supplier_id}), UOM={uom.name} ({uom.uom_id})")

    # Audit Item codes
    test_manual_code = "AUDIT99"
    expected_item_code = f"{cat.code}-{sup.code}-{test_manual_code}"

    # Clean up any leftover audit items/data first
    def cleanup_audit_data():
        audit_items = db.query(Item).filter(Item.manual_code.like("AUDIT%")).all()
        audit_item_ids = [i.item_id for i in audit_items]
        
        if audit_item_ids:
            from app.models.stock_in import StockInLine, StockInSession
            from app.models.outbound import OutboundLine, OutboundSession
            db.query(BranchStock).filter(BranchStock.item_id.in_(audit_item_ids)).delete()
            db.query(InventoryTransaction).filter(InventoryTransaction.item_id.in_(audit_item_ids)).delete()
            db.query(TransferLine).filter(TransferLine.item_id.in_(audit_item_ids)).delete()
            db.query(StockOpnameLine).filter(StockOpnameLine.item_id.in_(audit_item_ids)).delete()
            db.query(StockInLine).filter(StockInLine.item_id.in_(audit_item_ids)).delete()
            db.query(OutboundLine).filter(OutboundLine.item_id.in_(audit_item_ids)).delete()
            db.query(StockInSession).delete()
            db.query(OutboundSession).delete()
            
        db.query(Transfer).delete()
        db.query(StockOpnameSession).delete()
        
        for item in audit_items:
            db.delete(item)
            
        db.commit()

    cleanup_audit_data()

    try:
        # ==========================================
        # 1. CREATE ITEM
        # ==========================================
        print("\n--- Workflow 1: Create Item ---")
        payload = {
            "name": "Audit Test Item",
            "category_id": cat.category_id,
            "supplier_id": sup.supplier_id,
            "uom_id": uom.uom_id,
            "manual_code": test_manual_code,
            "minimum_stock": 10
        }
        res = client.post("/api/v1/items/", json=payload, headers=admin_headers)
        if res.status_code == 201:
            item_data = res.json()
            item_id = item_data["item_id"]
            # Verify code auto-generation
            if item_data["item_code"] == expected_item_code:
                # Try creating duplicate
                dup_res = client.post("/api/v1/items/", json=payload, headers=admin_headers)
                if dup_res.status_code == 400 and "already exists" in dup_res.json()["detail"].lower():
                    results["1. Create Item"] = "PASS"
                else:
                    results["1. Create Item"] = f"FAIL (duplicate check code: {dup_res.status_code})"
            else:
                results["1. Create Item"] = f"FAIL (expected code: {expected_item_code}, got: {item_data['item_code']})"
        else:
            results["1. Create Item"] = f"FAIL (status: {res.status_code}, error: {res.text})"

        if results.get("1. Create Item") != "PASS":
            print(f"Workflow 1 failed. Aborting further audit.")
            sys.exit(1)

        print(f"Create Item: {results['1. Create Item']} (Item ID: {item_id}, Code: {expected_item_code})")

        # ==========================================
        # 2. INITIAL LOAD
        # ==========================================
        print("\n--- Workflow 2: Initial Load ---")
        load_payload = {
            "branch_id": 1,
            "lines": [{"item_id": item_id, "quantity": 100}],
            "notes": "Initial audit load"
        }
        # Non-super_admin should get 403
        bh_res = client.post("/api/v1/inventory/initial-load", json=load_payload, headers=b1head_headers)
        if bh_res.status_code == 403:
            # Super admin should succeed
            adm_res = client.post("/api/v1/inventory/initial-load", json=load_payload, headers=admin_headers)
            if adm_res.status_code in (200, 201):
                # Check DB cache and transaction
                stock_qty = inventory_service.get_branch_stock(db, 1, item_id)
                tx = db.query(InventoryTransaction).filter(
                    InventoryTransaction.branch_id == 1,
                    InventoryTransaction.item_id == item_id,
                    InventoryTransaction.transaction_type == "IN",
                    InventoryTransaction.reference_type == "initial_load"
                ).first()
                if stock_qty == 100 and tx is not None:
                    results["2. Initial Load"] = "PASS"
                else:
                    results["2. Initial Load"] = f"FAIL (Stock: {stock_qty}, Tx: {tx})"
            else:
                results["2. Initial Load"] = f"FAIL (Admin load status: {adm_res.status_code})"
        else:
            results["2. Initial Load"] = f"FAIL (Branch Head role bypass check got: {bh_res.status_code})"
        print(f"Initial Load: {results['2. Initial Load']}")

        # ==========================================
        # 3. STOCK IN
        # ==========================================
        print("\n--- Workflow 3: Stock In ---")
        stock_in_payload = {
            "branch_id": 1,
            "status": "draft",
            "reference_no": "SI-AUDIT-001",
            "lines": [{"item_id": item_id, "quantity": 50}]
        }
        # Create draft
        res = client.post("/api/v1/stock-in/", json=stock_in_payload, headers=admin_headers)
        if res.status_code == 201:
            si_session = res.json()
            assert si_session["status"] == "draft"
            # Verify stock cache remains 100
            assert inventory_service.get_branch_stock(db, 1, item_id) == 100
            
            # Since PUT/update endpoint doesn't exist for Stock In, let's create a completed session directly
            stock_in_payload["status"] = "completed"
            stock_in_payload["reference_no"] = "SI-AUDIT-002"
            res2 = client.post("/api/v1/stock-in/", json=stock_in_payload, headers=admin_headers)
            if res2.status_code == 201:
                # Verify stock cache increased to 150
                stock_qty = inventory_service.get_branch_stock(db, 1, item_id)
                tx = db.query(InventoryTransaction).filter(
                    InventoryTransaction.branch_id == 1,
                    InventoryTransaction.item_id == item_id,
                    InventoryTransaction.transaction_type == "IN",
                    InventoryTransaction.reference_type == "stock_in"
                ).first()
                if stock_qty == 150 and tx is not None and tx.quantity == 50:
                    results["3. Stock In"] = "PASS"
                else:
                    results["3. Stock In"] = f"FAIL (Stock: {stock_qty}, Tx: {tx})"
            else:
                results["3. Stock In"] = f"FAIL (Completed stock-in status: {res2.status_code})"
        else:
            results["3. Stock In"] = f"FAIL (Draft creation status: {res.status_code})"
        print(f"Stock In: {results['3. Stock In']}")

        # ==========================================
        # 4. OUTBOUND
        # ==========================================
        print("\n--- Workflow 4: Outbound (Negative Stock Prevention) ---")
        # Try outbound exceeding stock (150 in stock, try 151)
        outbound_payload = {
            "branch_id": 1,
            "status": "completed",
            "reference_no": "SO-AUDIT-001",
            "lines": [{"item_id": item_id, "quantity": 151}]
        }
        res = client.post("/api/v1/outbound/", json=outbound_payload, headers=admin_headers)
        if res.status_code == 400 and "Stok tidak mencukupi" in res.json()["detail"]:
            # Stock remains 150
            assert inventory_service.get_branch_stock(db, 1, item_id) == 150
            
            # Now outbound valid quantity (30)
            outbound_payload["lines"][0]["quantity"] = 30
            res2 = client.post("/api/v1/outbound/", json=outbound_payload, headers=admin_headers)
            if res2.status_code == 201:
                # Stock becomes 120
                stock_qty = inventory_service.get_branch_stock(db, 1, item_id)
                tx = db.query(InventoryTransaction).filter(
                    InventoryTransaction.branch_id == 1,
                    InventoryTransaction.item_id == item_id,
                    InventoryTransaction.transaction_type == "OUT",
                    InventoryTransaction.reference_type == "outbound"
                ).first()
                if stock_qty == 120 and tx is not None and tx.quantity == 30:
                    results["4. Outbound"] = "PASS"
                else:
                    results["4. Outbound"] = f"FAIL (Stock: {stock_qty}, Tx: {tx})"
            else:
                results["4. Outbound"] = f"FAIL (Valid outbound status: {res2.status_code})"
        else:
            results["4. Outbound"] = f"FAIL (Exceeding outbound status: {res.status_code}, error: {res.text})"
        print(f"Outbound: {results['4. Outbound']}")

        # ==========================================
        # 5. TRANSFER
        # ==========================================
        print("\n--- Workflow 5: Transfer ---")
        # Create draft transfer
        transfer_payload = {
            "source_branch_id": 1,
            "dest_branch_id": 2,
            "notes": "Audit Transfer",
            "lines": [{"item_id": item_id, "sent_quantity": 40}]
        }
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=admin_headers)
        if res.status_code == 201:
            trf = res.json()
            trf_id = trf["transfer_id"]
            line_id = trf["lines"][0]["line_id"]
            
            # Ship transfer
            res_ship = client.post(f"/api/v1/transfers/{trf_id}/ship", headers=admin_headers)
            if res_ship.status_code == 200:
                assert inventory_service.get_branch_stock(db, 1, item_id) == 80
                assert inventory_service.get_branch_stock(db, 2, item_id) == 0
                
                # Receive transfer (all 40)
                rec_payload = {
                    "received_notes": "All ok",
                    "lines": [{"line_id": line_id, "received_quantity": 40}]
                }
                res_rec = client.post(f"/api/v1/transfers/{trf_id}/receive", json=rec_payload, headers=admin_headers)
                if res_rec.status_code == 200:
                    # Verified ledger values
                    s1 = inventory_service.get_branch_stock(db, 1, item_id)
                    s2 = inventory_service.get_branch_stock(db, 2, item_id)
                    if s1 == 80 and s2 == 40:
                        results["5. Transfer"] = "PASS"
                    else:
                        results["5. Transfer"] = f"FAIL (Stock B1: {s1}, B2: {s2})"
                else:
                    results["5. Transfer"] = f"FAIL (Receive status: {res_rec.status_code})"
            else:
                results["5. Transfer"] = f"FAIL (Ship status: {res_ship.status_code})"
        else:
            results["5. Transfer"] = f"FAIL (Draft status: {res.status_code})"
        print(f"Transfer: {results['5. Transfer']}")

        # ==========================================
        # 6. TRANSFER VARIANCE
        # ==========================================
        print("\n--- Workflow 6: Transfer Variance ---")
        # Stock: B1 = 80, B2 = 40
        # Create transfer from B1 to B2 for 30
        transfer_payload["lines"][0]["sent_quantity"] = 30
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=admin_headers)
        if res.status_code == 201:
            trf = res.json()
            trf_id = trf["transfer_id"]
            line_id = trf["lines"][0]["line_id"]
            
            client.post(f"/api/v1/transfers/{trf_id}/ship", headers=admin_headers)
            assert inventory_service.get_branch_stock(db, 1, item_id) == 50
            
            # Receive 25 (Variance = 5 lost)
            rec_payload = {
                "received_notes": "5 lost",
                "lines": [{
                    "line_id": line_id,
                    "received_quantity": 25,
                    "variance_notes": "Lost",
                    "variance_reason": "Damaged in Transit"
                }]
            }
            res_rec = client.post(f"/api/v1/transfers/{trf_id}/receive", json=rec_payload, headers=admin_headers)
            if res_rec.status_code == 200:
                s1 = inventory_service.get_branch_stock(db, 1, item_id)
                s2 = inventory_service.get_branch_stock(db, 2, item_id)
                db_line = db.query(TransferLine).filter(TransferLine.line_id == line_id).first()
                # Variance = sent_quantity (30) - received_quantity (25) = 5
                if s1 == 50 and s2 == 65 and db_line.variance_reason == "Damaged in Transit":
                    results["6. Transfer Variance"] = "PASS"
                else:
                    results["6. Transfer Variance"] = f"FAIL (B1: {s1}, B2: {s2}, reason: {db_line.variance_reason if db_line else 'None'})"
            else:
                results["6. Transfer Variance"] = f"FAIL (Receive status: {res_rec.status_code})"
        else:
            results["6. Transfer Variance"] = f"FAIL (Create status: {res.status_code})"
        print(f"Transfer Variance: {results['6. Transfer Variance']}")

        # ==========================================
        # 7. TRANSFER CANCELLATION
        # ==========================================
        print("\n--- Workflow 7: Transfer Cancellation ---")
        # Stock: B1 = 50, B2 = 65
        # Create transfer from B1 to B2 for 20
        transfer_payload["lines"][0]["sent_quantity"] = 20
        res = client.post("/api/v1/transfers/", json=transfer_payload, headers=admin_headers)
        if res.status_code == 201:
            trf = res.json()
            trf_id = trf["transfer_id"]
            
            client.post(f"/api/v1/transfers/{trf_id}/ship", headers=admin_headers)
            assert inventory_service.get_branch_stock(db, 1, item_id) == 30
            
            # Cancel transfer (in_transit -> cancelled)
            res_cancel = client.post(f"/api/v1/transfers/{trf_id}/cancel", json={"cancellation_reason": "cancellation audit"}, headers=admin_headers)
            if res_cancel.status_code == 200:
                s1 = inventory_service.get_branch_stock(db, 1, item_id)
                s2 = inventory_service.get_branch_stock(db, 2, item_id)
                if s1 == 50 and s2 == 65:
                    results["7. Transfer Cancellation"] = "PASS"
                else:
                    results["7. Transfer Cancellation"] = f"FAIL (Stock B1: {s1}, B2: {s2})"
            else:
                results["7. Transfer Cancellation"] = f"FAIL (Cancel status: {res_cancel.status_code})"
        else:
            results["7. Transfer Cancellation"] = f"FAIL (Create status: {res.status_code})"
        print(f"Transfer Cancellation: {results['7. Transfer Cancellation']}")

        # ==========================================
        # 8. STOCK OPNAME
        # ==========================================
        print("\n--- Workflow 8: Stock Opname ---")
        # Stock: B1 = 50, B2 = 65
        # Create draft opname session for Cat at Branch 1. Physical count: 40 (Variance = -10)
        opname_payload = {
            "branch_id": 1,
            "category_id": cat.category_id,
            "status": "draft",
            "notes": "Audit Opname",
            "lines": [{"item_id": item_id, "physical_quantity": 40}]
        }
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=admin_headers)
        if res.status_code == 201:
            op = res.json()
            op_id = op["session_id"]
            
            # Complete opname
            res_comp = client.post(f"/api/v1/stock-opname/{op_id}/complete", headers=admin_headers)
            if res_comp.status_code == 200:
                completed_op = res_comp.json()
                line = completed_op["lines"][0]
                s1 = inventory_service.get_branch_stock(db, 1, item_id)
                tx = db.query(InventoryTransaction).filter(
                    InventoryTransaction.branch_id == 1,
                    InventoryTransaction.item_id == item_id,
                    InventoryTransaction.transaction_type == "ADJUSTMENT_MINUS",
                    InventoryTransaction.reference_type == "opname"
                ).first()
                if line["system_quantity"] == 50 and line["physical_quantity"] == 40 and line["variance"] == -10 and s1 == 40 and tx is not None:
                    results["8. Stock Opname"] = "PASS"
                else:
                    results["8. Stock Opname"] = f"FAIL (System: {line['system_quantity']}, Physical: {line['physical_quantity']}, Stock B1: {s1}, Tx: {tx})"
            else:
                results["8. Stock Opname"] = f"FAIL (Complete status: {res_comp.status_code})"
        else:
            results["8. Stock Opname"] = f"FAIL (Create status: {res.status_code})"
        print(f"Stock Opname: {results['8. Stock Opname']}")

        # ==========================================
        # 9. LOW STOCK DETECTION
        # ==========================================
        print("\n--- Workflow 9: Low Stock Detection ---")
        # Stock: B1 = 40 (minimum_stock is 10)
        # Let's do an opname to set B1 stock to 5 (which is below minimum_stock 10)
        opname_payload["lines"][0]["physical_quantity"] = 5
        res = client.post("/api/v1/stock-opname/", json=opname_payload, headers=admin_headers)
        op_id = res.json()["session_id"]
        client.post(f"/api/v1/stock-opname/{op_id}/complete", headers=admin_headers)
        assert inventory_service.get_branch_stock(db, 1, item_id) == 5
        
        # Query branch stocks with low_stock_only=True
        res_low = client.get("/api/v1/branch-stocks/?branch_id=1&low_stock_only=true", headers=admin_headers)
        if res_low.status_code == 200:
            data = res_low.json()["data"]
            # Find our item
            found = any(d["item_code"] == expected_item_code for d in data)
            if found:
                results["9. Low Stock Detection"] = "PASS"
            else:
                results["9. Low Stock Detection"] = f"FAIL (Item {expected_item_code} not found in low stock list)"
        else:
            results["9. Low Stock Detection"] = f"FAIL (Query status: {res_low.status_code})"
        print(f"Low Stock Detection: {results['9. Low Stock Detection']}")

        # ==========================================
        # 10. MULTI-BRANCH VISIBILITY
        # ==========================================
        print("\n--- Workflow 10: Multi-Branch Visibility ---")
        # B1 Head tries to query Branch 2 stocks -> Should get 403
        res = client.get("/api/v1/branch-stocks/?branch_id=2", headers=b1head_headers)
        if res.status_code == 403:
            # Super admin can query Branch 2 stocks -> Should succeed
            res_admin = client.get("/api/v1/branch-stocks/?branch_id=2", headers=admin_headers)
            if res_admin.status_code == 200:
                results["10. Multi-Branch Visibility"] = "PASS"
            else:
                results["10. Multi-Branch Visibility"] = f"FAIL (Admin query status: {res_admin.status_code})"
        else:
            results["10. Multi-Branch Visibility"] = f"FAIL (Branch Head bypass check status: {res.status_code})"
        print(f"Multi-Branch Visibility: {results['10. Multi-Branch Visibility']}")

        # ==========================================
        # 11. RBAC
        # ==========================================
        print("\n--- Workflow 11: RBAC ---")
        # Warehouse staff tries to create transfer -> should get 403
        staff_res = client.post("/api/v1/transfers/", json=transfer_payload, headers=b1staff_headers)
        if staff_res.status_code == 403:
            # B1 Head tries to complete opname at B2 -> should get 403
            # Create opname at B2 as admin
            op_payload_b2 = {
                "branch_id": 2,
                "category_id": cat.category_id,
                "status": "draft",
                "lines": [{"item_id": item_id, "physical_quantity": 65}]
            }
            res_draft = client.post("/api/v1/stock-opname/", json=op_payload_b2, headers=admin_headers)
            op_id_b2 = res_draft.json()["session_id"]
            
            res_b1comp = client.post(f"/api/v1/stock-opname/{op_id_b2}/complete", headers=b1head_headers)
            if res_b1comp.status_code == 403:
                results["11. RBAC"] = "PASS"
            else:
                results["11. RBAC"] = f"FAIL (B1 Head complete opname at B2 got: {res_b1comp.status_code})"
        else:
            results["11. RBAC"] = f"FAIL (Warehouse staff create transfer got: {staff_res.status_code})"
        print(f"RBAC: {results['11. RBAC']}")

    except AssertionError as e:
        print(f"ASSERTION ERROR during audit: {e}")
        db.rollback()
    except Exception as e:
        print(f"EXCEPTION during audit: {e}")
        db.rollback()
    finally:
        # Cleanup audit data
        print("Cleaning up audit data...")
        cleanup_audit_data()
        
        # Cleanup temporary users and their audit logs
        temp_users = db.query(User).filter(User.username.in_(["audit_b1head", "audit_b2head", "audit_b1staff"])).all()
        if temp_users:
            user_ids = [u.user_id for u in temp_users]
            from app.models.audit_log import AuditLog
            db.query(AuditLog).filter(AuditLog.user_id.in_(user_ids)).delete()
            db.query(User).filter(User.user_id.in_(user_ids)).delete()
            db.commit()
        db.close()
        
    print("\n--- AUDIT RESULTS SUMMARY ---")
    print(json.dumps(results, indent=2))
    
    # Save results to a file for reporting
    with open("/app/scripts/audit_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_audit()
