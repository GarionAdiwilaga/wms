import sys
import os
import threading
import time
import httpx

# Set backend root in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_concurrency_test():
    print("Starting Concurrency Audit...")
    
    # We will use the running backend API container.
    base_url = "http://localhost:8000"
    
    # 1. Login as Super Admin to setup stock and retrieve credentials
    print("Logging in as admin...")
    login_res = httpx.post(f"{base_url}/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return
    
    token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Login as Staff A and Staff B
    print("Logging in as Staff A and Staff B...")
    token_a = httpx.post(f"{base_url}/api/v1/auth/login", json={"username": "test_bh1", "password": "test123456"}).json()["access_token"]
    token_b = httpx.post(f"{base_url}/api/v1/auth/login", json={"username": "test_ws1", "password": "test123456"}).json()["access_token"]
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # 3. Find a test item. We can use the first item in the catalog.
    items_res = httpx.get(f"{base_url}/api/v1/items/", headers=admin_headers)
    items = items_res.json()["data"]
    if not items:
        print("No items in catalog to test.")
        return
    
    test_item = items[0]
    item_id = test_item["item_id"]
    item_code = test_item["item_code"]
    print(f"Using test item: {item_code} (ID: {item_id})")
    
    # 4. Set stock of this item at Branch 1 to exactly 10 using Stock Opname.
    stock_res = httpx.get(f"{base_url}/api/v1/branch-stocks/?branch_id=1&page_size=100", headers=admin_headers)
    current_stock = 0
    for stock in stock_res.json()["data"]:
        if stock["item_code"] == item_code:
            current_stock = stock["quantity"]
            break
            
    print(f"Current stock of {item_code} at Branch 1: {current_stock}")
    
    # Adjust stock to exactly 10 using Stock Opname
    print("Adjusting stock to exactly 10...")
    opname_payload = {
        "branch_id": 1,
        "category_id": test_item["category_id"],
        "status": "draft",
        "notes": "Concurrency Audit Adjustment",
        "lines": [{"item_id": item_id, "physical_quantity": 10}]
    }
    opname_res = httpx.post(f"{base_url}/api/v1/stock-opname/", json=opname_payload, headers=admin_headers)
    print("Opname creation status:", opname_res.status_code)
    print("Opname creation body:", opname_res.text)
    if opname_res.status_code != 201:
        print(f"Opname failed: {opname_res.text}")
        return
    session_id = opname_res.json()["session_id"]
    
    # Complete opname
    complete_res = httpx.post(f"{base_url}/api/v1/stock-opname/{session_id}/complete", headers=admin_headers)
    print("Opname completion status:", complete_res.status_code)
    print("Opname completion body:", complete_res.text)
    if complete_res.status_code != 200:
        print(f"Complete opname failed: {complete_res.text}")
        return
    
    # Verify stock is now 10
    stock_res2 = httpx.get(f"{base_url}/api/v1/branch-stocks/?branch_id=1&page_size=100", headers=admin_headers)
    post_opname_stock = 0
    for stock in stock_res2.json()["data"]:
        if stock["item_code"] == item_code:
            post_opname_stock = stock["quantity"]
            break
    print(f"Verified stock after opname adjustment: {post_opname_stock}")
    assert post_opname_stock == 10, "Failed to adjust stock to 10"
    
    # 5. Perform concurrent Outbound requests of 8 units each.
    outbound_payload = {
        "branch_id": 1,
        "status": "completed",
        "reference_no": "CONCURRENCY-TEST",
        "lines": [{"item_id": item_id, "quantity": 8}],
        "notes": "Concurrency Test Outbound"
    }
    
    status_codes = []
    response_details = []
    
    def send_outbound(headers, worker_name):
        print(f"Worker {worker_name} sending outbound request...")
        with httpx.Client() as client:
            res = client.post(f"{base_url}/api/v1/outbound/", json=outbound_payload, headers=headers)
            status_codes.append(res.status_code)
            response_details.append((worker_name, res.status_code, res.text))
            print(f"Worker {worker_name} received status {res.status_code}")
        
    t1 = threading.Thread(target=send_outbound, args=(headers_a, "Staff A"))
    t2 = threading.Thread(target=send_outbound, args=(headers_b, "Staff B"))
    
    # Start threads almost simultaneously
    t1.start()
    t2.start()
    
    t1.join()
    t2.join()
    
    print("\nResults of Concurrency Audit:")
    for name, code, detail in response_details:
        print(f"- {name}: Status {code}, Response: {detail[:200]}")
        
    # Check assertions
    assert 201 in status_codes, "At least one outbound request must succeed"
    assert 400 in status_codes, "At least one outbound request must fail"
    
    # 6. Verify final stock is exactly 2 (10 - 8 = 2)
    stock_res3 = httpx.get(f"{base_url}/api/v1/branch-stocks/?branch_id=1&page_size=100", headers=admin_headers)
    final_stock = 0
    for stock in stock_res3.json()["data"]:
        if stock["item_code"] == item_code:
            final_stock = stock["quantity"]
            break
    print(f"Final stock of {item_code} at Branch 1: {final_stock}")
    assert final_stock == 2, f"Expected final stock 2, got {final_stock}"
    print("CONCURRENCY AUDIT PASSED SUCCESSFULLY! ✅")

if __name__ == "__main__":
    run_concurrency_test()
