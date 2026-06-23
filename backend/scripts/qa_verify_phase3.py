import sys
import os
from fastapi.testclient import TestClient

# Ensure backend root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import SessionLocal
from app.models.item import Item
from app.models.inventory import InventoryTransaction, BranchStock

def run_verification():
    print("Initializing TestClient...")
    client = TestClient(app)

    # 1. Login
    print("Logging in as admin...")
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if login_resp.status_code != 200:
        print(f"CRITICAL FAILURE: Login failed. Code: {login_resp.status_code}, Body: {login_resp.text}")
        sys.exit(1)
        
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    db = SessionLocal()
    try:
        # 2. Ensure item exists or create it
        item = db.query(Item).filter(Item.manual_code == "QA001").first()
        if not item:
            print("Creating test item QA001...")
            item_resp = client.post("/api/v1/items", json={
                "name": "QA Verify Part",
                "category_id": 51,
                "supplier_id": 50,
                "uom_id": 1,
                "manual_code": "QA001",
                "minimum_stock": 5
            }, headers=headers)
            if item_resp.status_code not in (200, 201):
                print(f"CRITICAL FAILURE: Item creation failed. Code: {item_resp.status_code}, Body: {item_resp.text}")
                sys.exit(1)
            item_id = item_resp.json()["item_id"]
            print(f"Test item created with ID: {item_id}")
        else:
            item_id = item.item_id
            print(f"Test item QA001 already exists with ID: {item_id}")

        # Clean up existing stock/transactions for clean test run
        db.query(BranchStock).filter(BranchStock.item_id == item_id).delete()
        db.query(InventoryTransaction).filter(InventoryTransaction.item_id == item_id).delete()
        db.commit()
        print("Cleaned up existing branch stocks and transaction records for test item.")

        # 3. Stock In Test
        print("\n--- Running Stock In Verification ---")
        stock_in_payload = {
            "branch_id": 1,
            "status": "completed",
            "lines": [
                {
                    "item_id": item_id,
                    "quantity": 10
                }
            ]
        }
        
        # We need to see if post path is `/stock-in` or `/stock-in/`
        stock_in_resp = client.post("/api/v1/stock-in", json=stock_in_payload, headers=headers)
        if stock_in_resp.status_code == 307:
            # Handle redirect manually if client didn't do it automatically
            redirect_url = stock_in_resp.headers["Location"]
            print(f"Handling redirect to: {redirect_url}")
            stock_in_resp = client.post(redirect_url, json=stock_in_payload, headers=headers)
            
        print(f"Stock In response code: {stock_in_resp.status_code}")
        if stock_in_resp.status_code not in (200, 201):
            print(f"CRITICAL FAILURE: Stock In request failed. Body: {stock_in_resp.text}")
            sys.exit(1)
            
        # Verify Database State
        print("Checking database state for Stock In...")
        tx = db.query(InventoryTransaction).filter(
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "IN"
        ).first()
        
        if not tx:
            print("CRITICAL FAILURE: No IN transaction record created in inventory_transactions!")
            sys.exit(1)
        print(f"Success: Found IN transaction record with quantity: {tx.quantity}")
        
        stock = db.query(BranchStock).filter(
            BranchStock.branch_id == 1,
            BranchStock.item_id == item_id
        ).first()
        
        if not stock or stock.quantity != 10:
            print(f"CRITICAL FAILURE: Branch stock cache is incorrect! Expected: 10, Found: {stock.quantity if stock else 'None'}")
            sys.exit(1)
        print(f"Success: Branch stock cache successfully increased to: {stock.quantity}")

        # 4. Outbound Negative Stock Test
        print("\n--- Running Outbound Negative Stock Verification ---")
        outbound_payload = {
            "branch_id": 1,
            "status": "completed",
            "lines": [
                {
                    "item_id": item_id,
                    "quantity": 999999
                }
            ]
        }
        
        outbound_resp = client.post("/api/v1/outbound", json=outbound_payload, headers=headers)
        if outbound_resp.status_code == 307:
            redirect_url = outbound_resp.headers["Location"]
            print(f"Handling redirect to: {redirect_url}")
            outbound_resp = client.post(redirect_url, json=outbound_payload, headers=headers)
            
        print(f"Outbound response code: {outbound_resp.status_code}")
        print(f"Outbound response body: {outbound_resp.text}")
        
        if outbound_resp.status_code == 201 or outbound_resp.status_code == 200:
            print("CRITICAL FAILURE: Request succeeded! Negative stock was NOT prevented!")
            sys.exit(1)
            
        print("Success: Outbound request was rejected by the server.")

        # Re-check database state
        db.expire_all()
        stock_after = db.query(BranchStock).filter(
            BranchStock.branch_id == 1,
            BranchStock.item_id == item_id
        ).first()
        
        if stock_after.quantity != 10:
            print(f"CRITICAL FAILURE: Branch stock was mutated! Expected: 10, Found: {stock_after.quantity}")
            sys.exit(1)
        print(f"Success: Branch stock remained unchanged at: {stock_after.quantity}")

        out_tx = db.query(InventoryTransaction).filter(
            InventoryTransaction.item_id == item_id,
            InventoryTransaction.transaction_type == "OUT"
        ).first()
        if out_tx:
            print("CRITICAL FAILURE: Transaction was not rolled back! Found OUT transaction in database!")
            sys.exit(1)
        print("Success: No OUT transaction records were persisted.")

        print("\nALL SWAGGER/API VERIFICATIONS PASSED SUCCESSFULLY.")

    except Exception as e:
        print(f"EXCEPTION DURING VERIFICATION: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_verification()
