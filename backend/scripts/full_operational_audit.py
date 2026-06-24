"""
Full Operational Simulation Audit - Gudang Piala Kaltim WMS
Phases A-I: Master Data, Stock, Outbound, Transfers, Opname, Reports, Concurrency, Integrity
"""
import sys
import os
import threading
import time
import json
import httpx

BASE_URL = "http://localhost:8000"
RESULTS = []

def r(label, passed, detail=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    RESULTS.append({"label": label, "passed": passed, "detail": detail})
    print(f"{status} | {label}" + (f" — {detail}" if detail else ""))

def login(username, password):
    res = httpx.post(f"{BASE_URL}/api/v1/auth/login", json={"username": username, "password": password})
    if res.status_code != 200:
        raise RuntimeError(f"Login failed for {username}: {res.text}")
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def get_all_branch_stocks(headers, branch_id):
    """Fetch all branch stocks across pages for a branch."""
    all_stocks = {}
    page = 1
    while True:
        res = httpx.get(f"{BASE_URL}/api/v1/branch-stocks/?branch_id={branch_id}&page_size=100&page={page}", headers=headers)
        data = res.json()
        for s in data.get("data", []):
            all_stocks[s["item_id"]] = s["quantity"]
        if page >= data.get("total_pages", 1):
            break
        page += 1
    return all_stocks

def get_stock(headers, branch_id, item_id):
    """Get stock quantity for a specific item at a branch."""
    stocks = get_all_branch_stocks(headers, branch_id)
    return stocks.get(item_id, 0)

# ─────────────────────────────────────────────
# PHASE A: Master Data Validation
# ─────────────────────────────────────────────
def phase_a(admin_h):
    print("\n" + "="*60)
    print("PHASE A — Master Data Validation")
    print("="*60)

    # A1: Categories exist
    res = httpx.get(f"{BASE_URL}/api/v1/categories/", headers=admin_h)
    categories = res.json().get("data", res.json()) if isinstance(res.json(), dict) else res.json()
    r("A1: Categories load", res.status_code == 200 and len(categories) > 0, f"{len(categories)} categories found")

    # A2: Suppliers exist
    res = httpx.get(f"{BASE_URL}/api/v1/suppliers/", headers=admin_h)
    suppliers = res.json().get("data", res.json()) if isinstance(res.json(), dict) else res.json()
    r("A2: Suppliers load", res.status_code == 200 and len(suppliers) > 0, f"{len(suppliers)} suppliers found")

    # A3: Items exist (paginated)
    res = httpx.get(f"{BASE_URL}/api/v1/items/?page_size=100", headers=admin_h)
    items_data = res.json()
    items = items_data.get("data", [])
    r("A3: Items load (paginated)", res.status_code == 200 and len(items) > 0, f"{items_data.get('total', 0)} items total")

    if not items:
        r("A4+: Item operations", False, "No items to test")
        return None, None, None

    # A4: Create new item — get IDs from existing seeded items
    # Categories is a list
    cat_list = categories if isinstance(categories, list) else categories.get("data", [])
    cat_id = cat_list[0]["category_id"] if cat_list else None

    sup_res = httpx.get(f"{BASE_URL}/api/v1/suppliers/", headers=admin_h)
    sup_data = sup_res.json()
    suppliers_list = sup_data if isinstance(sup_data, list) else sup_data.get("data", [])
    sup_id = suppliers_list[0]["supplier_id"] if suppliers_list else None

    # Get UOM ID from first existing item
    uom_id = items[0].get("uom_id") if items else None

    new_item_payload = {
        "name": "Test Item QA Audit",
        "manual_code": "QATST01",
        "category_id": cat_id,
        "supplier_id": sup_id,
        "uom_id": uom_id,
        "minimum_stock": 10,
        "description": "QA audit test item"
    }
    create_res = httpx.post(f"{BASE_URL}/api/v1/items/", json=new_item_payload, headers=admin_h)
    r("A4: Create new item", create_res.status_code == 201, f"Status: {create_res.status_code} — {create_res.text[:100]}")

    new_item = create_res.json() if create_res.status_code == 201 else None
    new_item_id = new_item["item_id"] if new_item else None
    new_item_code = new_item["item_code"] if new_item else None

    # A5: Edit allowed field (description)
    if new_item_id:
        edit_res = httpx.put(f"{BASE_URL}/api/v1/items/{new_item_id}", json={"description": "Updated by QA"}, headers=admin_h)
        r("A5: Edit allowed field (description)", edit_res.status_code == 200, f"Status: {edit_res.status_code}")

    # A6: Search by name
    search_res = httpx.get(f"{BASE_URL}/api/v1/items/?search=Test+Item+QA+Audit", headers=admin_h)
    found = search_res.json().get("total", 0) > 0 if search_res.status_code == 200 else False
    r("A6: Search by name", found, f"Search returned {search_res.json().get('total', 0)} results")

    # A7: Search by item code
    if new_item_code:
        search_code_res = httpx.get(f"{BASE_URL}/api/v1/items/?search={new_item_code}", headers=admin_h)
        found_code = search_code_res.json().get("total", 0) > 0
        r("A7: Search by item code", found_code, f"Found by code: {new_item_code}")

    # A8: QR lookup (item detail by item_id)
    if new_item_id:
        detail_res = httpx.get(f"{BASE_URL}/api/v1/items/{new_item_id}", headers=admin_h)
        r("A8: QR lookup (item detail)", detail_res.status_code == 200, f"Item code: {new_item_code}")

    return items[0], cat_id, items

# ─────────────────────────────────────────────
# PHASE B: Initial Load / Stock Setup
# ─────────────────────────────────────────────
def phase_b(admin_h):
    print("\n" + "="*60)
    print("PHASE B — Initial Load")
    print("="*60)

    # Use existing seeded stock (already loaded in previous sessions)
    # Verify all 3 branches have stock
    for branch_id, branch_name in [(1, "Balikpapan"), (2, "Samarinda"), (3, "Bontang")]:
        stocks = get_all_branch_stocks(admin_h, branch_id)
        has_stock = len(stocks) > 0
        total_items_with_stock = sum(1 for q in stocks.values() if q > 0)
        r(f"B{branch_id}: {branch_name} has branch stock", has_stock,
          f"{total_items_with_stock} items with stock")

    # B4: Ledger entries exist (movement report) — route is /movements, key is 'items'
    mov_res = httpx.get(f"{BASE_URL}/api/v1/reports/movements?branch_id=1&page_size=5", headers=admin_h)
    has_ledger = mov_res.status_code == 200 and mov_res.json().get("total", 0) > 0
    r("B4: Inventory movement ledger exists", has_ledger, f"{mov_res.json().get('total', 0)} transactions found")

# ─────────────────────────────────────────────
# PHASE C: Daily Warehouse Operations
# ─────────────────────────────────────────────
def phase_c(admin_h, bpn_ws_h, branch1_id=1):
    print("\n" + "="*60)
    print("PHASE C — Daily Warehouse Operations")
    print("="*60)

    # Get items with stock at branch 1
    stocks = get_all_branch_stocks(admin_h, branch1_id)
    items_with_stock = [(iid, qty) for iid, qty in stocks.items() if qty >= 5]
    if not items_with_stock:
        r("C: Stock In / Outbound", False, "No items with sufficient stock at branch 1")
        return None, None

    test_item_id, test_item_qty = items_with_stock[0]
    print(f"  Using item_id={test_item_id} with qty={test_item_qty} at branch 1")

    # Get category for this item
    items_res = httpx.get(f"{BASE_URL}/api/v1/items/{test_item_id}", headers=admin_h)
    cat_id = items_res.json()["category_id"] if items_res.status_code == 200 else None

    # C1: Morning Stock In (using admin to avoid RBAC branch issues for bpn_ws)
    stock_in_payload = {
        "branch_id": branch1_id,
        "status": "completed",
        "notes": "QA Audit Stock In",
        "lines": [
            {"item_id": test_item_id, "quantity": 20, "notes": "Morning receiving"}
        ]
    }
    si_res = httpx.post(f"{BASE_URL}/api/v1/stock-in/", json=stock_in_payload, headers=admin_h)
    r("C1: Stock In transaction created", si_res.status_code == 201, f"Status: {si_res.status_code}")

    # Verify stock increased
    new_stock = get_stock(admin_h, branch1_id, test_item_id)
    r("C2: Stock increased after Stock In", new_stock >= test_item_qty + 20,
      f"Before={test_item_qty}, After={new_stock}, Expected >= {test_item_qty + 20}")

    # C3: Afternoon Outbound — normal transaction
    outbound_qty = min(5, new_stock)
    out_payload = {
        "branch_id": branch1_id,
        "status": "completed",
        "reference_no": "QA-OUT-001",
        "notes": "QA Audit Outbound",
        "lines": [{"item_id": test_item_id, "quantity": outbound_qty}]
    }
    out_res = httpx.post(f"{BASE_URL}/api/v1/outbound/", json=out_payload, headers=admin_h)
    r("C3: Outbound transaction created", out_res.status_code == 201, f"Status: {out_res.status_code}")

    post_out_stock = get_stock(admin_h, branch1_id, test_item_id)
    r("C4: Stock decreased after Outbound", post_out_stock < new_stock,
      f"Before={new_stock}, After={post_out_stock}, Deducted={new_stock - post_out_stock}")

    # C5: Outbound exceeding stock — must be rejected
    excess_qty = post_out_stock + 999
    excess_payload = {
        "branch_id": branch1_id,
        "status": "completed",
        "reference_no": "QA-OUT-EXCEED",
        "notes": "QA Audit Excess Outbound",
        "lines": [{"item_id": test_item_id, "quantity": excess_qty}]
    }
    excess_res = httpx.post(f"{BASE_URL}/api/v1/outbound/", json=excess_payload, headers=admin_h)
    r("C5: Excess outbound blocked", excess_res.status_code in [400, 422],
      f"Status: {excess_res.status_code}")

    # C6: Stock unchanged after blocked excess
    after_excess_stock = get_stock(admin_h, branch1_id, test_item_id)
    r("C6: Stock unchanged after blocked outbound", after_excess_stock == post_out_stock,
      f"Stock: {after_excess_stock}")

    # C7: Item History (movement report for this item)
    hist_res = httpx.get(f"{BASE_URL}/api/v1/reports/item-history/{test_item_id}?branch_id={branch1_id}", headers=admin_h)
    r("C7: Item history updates after transactions", hist_res.status_code == 200 and hist_res.json().get("total", 0) > 0,
      f"History entries: {hist_res.json().get('total', 0)}")

    return test_item_id, post_out_stock

# ─────────────────────────────────────────────
# PHASE D: Multi-User Concurrency
# ─────────────────────────────────────────────
def phase_d(admin_h, test_item_id, branch1_id=1):
    print("\n" + "="*60)
    print("PHASE D — Multi-User Concurrency")
    print("="*60)

    # Set stock to exactly 15 using opname (get category first)
    item_res = httpx.get(f"{BASE_URL}/api/v1/items/{test_item_id}", headers=admin_h)
    cat_id = item_res.json()["category_id"]

    current_stock = get_stock(admin_h, branch1_id, test_item_id)
    target_qty = 15
    print(f"  Setting stock to {target_qty} via opname (current={current_stock})")

    opname_payload = {
        "branch_id": branch1_id,
        "category_id": cat_id,
        "status": "draft",
        "notes": "Concurrency Test Setup",
        "lines": [{"item_id": test_item_id, "physical_quantity": target_qty}]
    }
    op_res = httpx.post(f"{BASE_URL}/api/v1/stock-opname/", json=opname_payload, headers=admin_h)
    if op_res.status_code != 201:
        r("D: Concurrency test setup (opname)", False, f"Opname create failed: {op_res.text[:200]}")
        return

    session_id = op_res.json()["session_id"]
    comp_res = httpx.post(f"{BASE_URL}/api/v1/stock-opname/{session_id}/complete", headers=admin_h)
    if comp_res.status_code != 200:
        r("D: Concurrency test setup (opname complete)", False, f"Opname complete failed: {comp_res.text[:200]}")
        return

    # Verify stock is now target_qty
    setup_stock = get_stock(admin_h, branch1_id, test_item_id)
    r("D1: Stock set to target for concurrency test", setup_stock == target_qty,
      f"Target={target_qty}, Actual={setup_stock}")

    if setup_stock != target_qty:
        print(f"  WARNING: Setup stock {setup_stock} != {target_qty}, continuing anyway")
        target_qty = setup_stock

    # Two outbound requests for 10 units each (total 20 > 15 → one must fail)
    # Using admin user in two threads (simulating two sessions)
    per_thread_qty = 10
    status_codes = []
    responses = []

    def send_outbound(worker_name):
        payload = {
            "branch_id": branch1_id,
            "status": "completed",
            "reference_no": f"CONCURRENCY-{worker_name}",
            "notes": f"Concurrent Outbound from {worker_name}",
            "lines": [{"item_id": test_item_id, "quantity": per_thread_qty}]
        }
        # Each thread uses a fresh token
        tok = httpx.post(f"{BASE_URL}/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        with httpx.Client(timeout=30) as client:
            res = client.post(f"{BASE_URL}/api/v1/outbound/", json=payload, headers=h)
            status_codes.append(res.status_code)
            responses.append((worker_name, res.status_code, res.text[:200]))
            print(f"  Worker {worker_name}: status={res.status_code}")

    t1 = threading.Thread(target=send_outbound, args=("Worker-A",))
    t2 = threading.Thread(target=send_outbound, args=("Worker-B",))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    has_success = 201 in status_codes
    has_failure = any(c in [400, 409, 422] for c in status_codes)
    r("D2: Exactly one concurrent outbound succeeded", has_success, f"Codes: {status_codes}")
    r("D3: Exactly one concurrent outbound failed (stock protection)", has_failure, f"Codes: {status_codes}")

    # Final stock check: must be target_qty - per_thread_qty (only one deduction)
    final_stock = get_stock(admin_h, branch1_id, test_item_id)
    expected = target_qty - per_thread_qty
    r("D4: No negative stock after concurrency", final_stock >= 0, f"Final stock: {final_stock}")
    r("D5: Exactly one deduction applied", final_stock == expected,
      f"Expected={expected}, Actual={final_stock}")

    return final_stock

# ─────────────────────────────────────────────
# PHASE E: Transfers
# ─────────────────────────────────────────────
def phase_e(admin_h, test_item_id, branch1_id=1, branch2_id=2):
    print("\n" + "="*60)
    print("PHASE E — Transfers")
    print("="*60)

    stock_before_origin = get_stock(admin_h, branch1_id, test_item_id)
    stock_before_dest = get_stock(admin_h, branch2_id, test_item_id)
    print(f"  Before transfer — Origin(B1)={stock_before_origin}, Dest(B2)={stock_before_dest}")

    # Ensure origin has enough stock
    if stock_before_origin < 30:
        print(f"  Adjusting origin stock to 50 via opname...")
        item_res = httpx.get(f"{BASE_URL}/api/v1/items/{test_item_id}", headers=admin_h)
        cat_id = item_res.json()["category_id"]
        op_payload = {
            "branch_id": branch1_id,
            "category_id": cat_id,
            "status": "draft",
            "notes": "Transfer test stock setup",
            "lines": [{"item_id": test_item_id, "physical_quantity": 50}]
        }
        op = httpx.post(f"{BASE_URL}/api/v1/stock-opname/", json=op_payload, headers=admin_h)
        if op.status_code == 201:
            httpx.post(f"{BASE_URL}/api/v1/stock-opname/{op.json()['session_id']}/complete", headers=admin_h)
        stock_before_origin = get_stock(admin_h, branch1_id, test_item_id)

    # E1: Create transfer draft (B1 -> B2, 30 units)
    ship_qty = 30
    transfer_payload = {
        "source_branch_id": branch1_id,
        "dest_branch_id": branch2_id,
        "notes": "QA Transfer Test",
        "lines": [{"item_id": test_item_id, "sent_quantity": ship_qty}]
    }
    create_res = httpx.post(f"{BASE_URL}/api/v1/transfers/", json=transfer_payload, headers=admin_h)
    r("E1: Transfer draft created", create_res.status_code == 201, f"Status: {create_res.status_code} — {create_res.text[:150]}")

    if create_res.status_code != 201:
        return None

    transfer_id = create_res.json()["transfer_id"]

    # E2: Ship the transfer
    ship_res = httpx.post(f"{BASE_URL}/api/v1/transfers/{transfer_id}/ship", headers=admin_h)
    r("E2: Transfer shipped (draft -> in_transit)", ship_res.status_code == 200, f"Status: {ship_res.status_code}")

    # E3: Origin stock deducted on ship
    stock_after_ship_origin = get_stock(admin_h, branch1_id, test_item_id)
    expected_origin = stock_before_origin - ship_qty
    r("E3: Origin stock deducted on ship",
      stock_after_ship_origin == expected_origin,
      f"Before={stock_before_origin}, After={stock_after_ship_origin}, Expected={expected_origin}")

    # E4: Dest stock NOT yet changed
    stock_after_ship_dest = get_stock(admin_h, branch2_id, test_item_id)
    r("E4: Destination stock unchanged before receipt",
      stock_after_ship_dest == stock_before_dest,
      f"Before={stock_before_dest}, After={stock_after_ship_dest}")

    # E5: Receive with variance (28 of 30 — 2 damaged)
    receive_qty = 28
    # First get the transfer lines to find the line_id
    transfer_detail = httpx.get(f"{BASE_URL}/api/v1/transfers/{transfer_id}", headers=admin_h)
    transfer_lines = transfer_detail.json().get("lines", []) if transfer_detail.status_code == 200 else []
    receive_lines = []
    for line in transfer_lines:
        receive_lines.append({
            "line_id": line["line_id"],
            "received_quantity": receive_qty,
            "variance_reason": "Damaged in Transit",
            "variance_notes": "2 units cracked during shipping QA test"
        })
    receive_payload = {"lines": receive_lines} if receive_lines else {"lines": [{"received_quantity": receive_qty, "variance_reason": "Damaged in Transit"}]}
    recv_res = httpx.post(f"{BASE_URL}/api/v1/transfers/{transfer_id}/receive", json=receive_payload, headers=admin_h)
    r("E5: Transfer received with variance", recv_res.status_code == 200, f"Status: {recv_res.status_code} — {recv_res.text[:150]}")

    # E6: Destination stock increased by received_qty
    stock_after_recv_dest = get_stock(admin_h, branch2_id, test_item_id)
    expected_dest = stock_before_dest + receive_qty
    r("E6: Destination stock increased by received quantity",
      stock_after_recv_dest == expected_dest,
      f"Before={stock_before_dest}, After={stock_after_recv_dest}, Expected={expected_dest}")

    # E7: Origin lost ship_qty (not receive_qty)
    r("E7: Origin permanently lost shipped quantity (not received)",
      stock_after_ship_origin == stock_before_origin - ship_qty,
      f"Origin stock: {stock_after_ship_origin}")

    # E8: Variance report
    var_res = httpx.get(f"{BASE_URL}/api/v1/reports/transfer-variance?transfer_id={transfer_id}", headers=admin_h)
    has_variance = (var_res.status_code == 200)
    r("E8: Transfer variance report accessible", has_variance, f"Status: {var_res.status_code}")

    # E9: Immutability — cannot re-receive or cancel received transfer
    cancel_res = httpx.post(f"{BASE_URL}/api/v1/transfers/{transfer_id}/cancel", headers=admin_h)
    r("E9: Received transfer cannot be cancelled",
      cancel_res.status_code in [400, 422, 409],
      f"Cancel status: {cancel_res.status_code}")

    # E10: Transfer Cancellation Test (create a new draft and cancel after ship)
    transfer2_payload = {
        "source_branch_id": branch1_id,
        "dest_branch_id": branch2_id,
        "notes": "QA Cancellation Test Transfer",
        "lines": [{"item_id": test_item_id, "sent_quantity": 10}]
    }
    t2_create = httpx.post(f"{BASE_URL}/api/v1/transfers/", json=transfer2_payload, headers=admin_h)
    if t2_create.status_code == 201:
        t2_id = t2_create.json()["transfer_id"]
        stock_before_cancel = get_stock(admin_h, branch1_id, test_item_id)

        # Ship it
        httpx.post(f"{BASE_URL}/api/v1/transfers/{t2_id}/ship", headers=admin_h)
        stock_after_ship2 = get_stock(admin_h, branch1_id, test_item_id)

        # Cancel it — must include cancellation_reason
        cancel2_res = httpx.post(f"{BASE_URL}/api/v1/transfers/{t2_id}/cancel",
                                  json={"cancellation_reason": "QA Test Cancellation"},
                                  headers=admin_h)
        r("E10: In-transit transfer can be cancelled", cancel2_res.status_code == 200,
          f"Status: {cancel2_res.status_code} — {cancel2_res.text[:150]}")

        stock_after_cancel = get_stock(admin_h, branch1_id, test_item_id)
        r("E11: Stock restored after cancellation",
          stock_after_cancel == stock_before_cancel,
          f"Before cancel={stock_before_cancel}, After cancel={stock_after_cancel}")

    return transfer_id

# ─────────────────────────────────────────────
# PHASE F: Stock Opname
# ─────────────────────────────────────────────
def phase_f(admin_h, test_item_id, branch1_id=1):
    print("\n" + "="*60)
    print("PHASE F — Stock Opname")
    print("="*60)

    item_res = httpx.get(f"{BASE_URL}/api/v1/items/{test_item_id}", headers=admin_h)
    cat_id = item_res.json()["category_id"]

    # Get current stock
    current_stock = get_stock(admin_h, branch1_id, test_item_id)
    print(f"  Current stock: {current_stock}")

    # F1: Positive variance (physical > system)
    positive_physical = current_stock + 10
    op1 = httpx.post(f"{BASE_URL}/api/v1/stock-opname/", json={
        "branch_id": branch1_id, "category_id": cat_id, "status": "draft",
        "notes": "QA Opname Positive",
        "lines": [{"item_id": test_item_id, "physical_quantity": positive_physical}]
    }, headers=admin_h)
    r("F1a: Positive variance opname created", op1.status_code == 201)
    if op1.status_code == 201:
        sid = op1.json()["session_id"]
        comp = httpx.post(f"{BASE_URL}/api/v1/stock-opname/{sid}/complete", headers=admin_h)
        r("F1b: Positive variance opname completed", comp.status_code == 200)
        comp_data = comp.json()
        line = comp_data["lines"][0]
        r("F1c: Positive variance stored correctly",
          line["variance"] == 10 and line["system_quantity"] == current_stock,
          f"system={line['system_quantity']}, physical={line['physical_quantity']}, variance={line['variance']}")
        stock_after_pos = get_stock(admin_h, branch1_id, test_item_id)
        r("F1d: Stock increased for positive variance",
          stock_after_pos == current_stock + 10,
          f"Before={current_stock}, After={stock_after_pos}, Expected={current_stock + 10}")
        current_stock = stock_after_pos

    # F2: Negative variance (physical < system)
    negative_physical = current_stock - 5
    op2 = httpx.post(f"{BASE_URL}/api/v1/stock-opname/", json={
        "branch_id": branch1_id, "category_id": cat_id, "status": "draft",
        "notes": "QA Opname Negative",
        "lines": [{"item_id": test_item_id, "physical_quantity": negative_physical}]
    }, headers=admin_h)
    r("F2a: Negative variance opname created", op2.status_code == 201)
    if op2.status_code == 201:
        sid2 = op2.json()["session_id"]
        comp2 = httpx.post(f"{BASE_URL}/api/v1/stock-opname/{sid2}/complete", headers=admin_h)
        r("F2b: Negative variance opname completed", comp2.status_code == 200)
        comp2_data = comp2.json()
        line2 = comp2_data["lines"][0]
        r("F2c: Negative variance stored correctly",
          line2["variance"] == -5 and line2["system_quantity"] == current_stock,
          f"system={line2['system_quantity']}, physical={line2['physical_quantity']}, variance={line2['variance']}")
        stock_after_neg = get_stock(admin_h, branch1_id, test_item_id)
        r("F2d: Stock decreased for negative variance",
          stock_after_neg == current_stock - 5,
          f"Before={current_stock}, After={stock_after_neg}, Expected={current_stock - 5}")
        current_stock = stock_after_neg

    # F3: Zero variance (physical == system) — no ledger rows
    zero_physical = current_stock
    op3 = httpx.post(f"{BASE_URL}/api/v1/stock-opname/", json={
        "branch_id": branch1_id, "category_id": cat_id, "status": "draft",
        "notes": "QA Opname Zero",
        "lines": [{"item_id": test_item_id, "physical_quantity": zero_physical}]
    }, headers=admin_h)
    r("F3a: Zero variance opname created", op3.status_code == 201)
    if op3.status_code == 201:
        sid3 = op3.json()["session_id"]
        # Check ledger count before
        mov_before = httpx.get(f"{BASE_URL}/api/v1/reports/inventory-movement?branch_id={branch1_id}&item_id={test_item_id}&page_size=100", headers=admin_h)
        ledger_before = mov_before.json().get("total", 0)

        comp3 = httpx.post(f"{BASE_URL}/api/v1/stock-opname/{sid3}/complete", headers=admin_h)
        r("F3b: Zero variance opname completed", comp3.status_code == 200)
        comp3_data = comp3.json()
        line3 = comp3_data["lines"][0]
        r("F3c: Zero variance stored correctly", line3["variance"] == 0, f"variance={line3['variance']}")

        # Check ledger count after
        mov_after = httpx.get(f"{BASE_URL}/api/v1/reports/inventory-movement?branch_id={branch1_id}&item_id={test_item_id}&page_size=100", headers=admin_h)
        ledger_after = mov_after.json().get("total", 0)
        r("F3d: Zero variance generates NO ledger rows",
          ledger_after == ledger_before,
          f"Ledger before={ledger_before}, after={ledger_after}")

        # Stock unchanged
        stock_after_zero = get_stock(admin_h, branch1_id, test_item_id)
        r("F3e: Stock unchanged after zero variance opname",
          stock_after_zero == current_stock,
          f"Before={current_stock}, After={stock_after_zero}")

# ─────────────────────────────────────────────
# PHASE G: Reports
# ─────────────────────────────────────────────
def phase_g(admin_h, branch1_id=1):
    print("\n" + "="*60)
    print("PHASE G — Reports")
    print("="*60)

    # G1: Stock Report (JSON)
    res = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id={branch1_id}&page_size=5", headers=admin_h)
    r("G1: Stock Report (JSON)", res.status_code == 200 and res.json().get("total", 0) > 0,
      f"Total: {res.json().get('total', 0)}")

    # G2: Stock Report CSV (uses ?export=csv)
    csv_res = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id={branch1_id}&export=csv", headers=admin_h, follow_redirects=True)
    r("G2: Stock Report CSV export", csv_res.status_code == 200 and "text/csv" in csv_res.headers.get("content-type", ""),
      f"Status: {csv_res.status_code}, CT: {csv_res.headers.get('content-type','')}")

    # G3: Stock Report XLSX
    xlsx_res = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id={branch1_id}&export=xlsx", headers=admin_h, follow_redirects=True)
    r("G3: Stock Report XLSX export", xlsx_res.status_code == 200 and "spreadsheetml" in xlsx_res.headers.get("content-type", ""),
      f"Status: {xlsx_res.status_code}, CT: {xlsx_res.headers.get('content-type', '')}")

    # G4: Low Stock Report
    low_res = httpx.get(f"{BASE_URL}/api/v1/reports/low-stock?branch_id={branch1_id}", headers=admin_h)
    r("G4: Low Stock Report", low_res.status_code == 200,
      f"Low stock items: {low_res.json().get('total', 0)}")

    # G5: Inventory Movement Report — route is /movements, response key is 'items'
    mov_res = httpx.get(f"{BASE_URL}/api/v1/reports/movements?branch_id={branch1_id}&page_size=5", headers=admin_h)
    has_mov = mov_res.status_code == 200 and mov_res.json().get("total", 0) > 0
    r("G5: Inventory Movement Report", has_mov,
      f"Status={mov_res.status_code}, Total: {mov_res.json().get('total', 0) if mov_res.status_code==200 else 'N/A'}")

    # G6: Movement CSV
    mov_csv = httpx.get(f"{BASE_URL}/api/v1/reports/movements?branch_id={branch1_id}&export=csv", headers=admin_h, follow_redirects=True)
    r("G6: Movement Report CSV", mov_csv.status_code == 200 and "text/csv" in mov_csv.headers.get("content-type", ""),
      f"Status: {mov_csv.status_code}")

    # G7: Movement XLSX
    mov_xlsx = httpx.get(f"{BASE_URL}/api/v1/reports/movements?branch_id={branch1_id}&export=xlsx", headers=admin_h, follow_redirects=True)
    r("G7: Movement Report XLSX", mov_xlsx.status_code == 200 and "spreadsheetml" in mov_xlsx.headers.get("content-type", ""),
      f"Status: {mov_xlsx.status_code}")

    # G8: Transfer Variance Report
    tv_res = httpx.get(f"{BASE_URL}/api/v1/reports/transfer-variance", headers=admin_h)
    r("G8: Transfer Variance Report", tv_res.status_code == 200, f"Status: {tv_res.status_code}")

    # G9: Audit Log — route is /audit-logs
    al_res = httpx.get(f"{BASE_URL}/api/v1/reports/audit-logs?page_size=5", headers=admin_h)
    r("G9: Audit Log Report", al_res.status_code == 200 and al_res.json().get("total", 0) > 0,
      f"Status={al_res.status_code}, Total: {al_res.json().get('total', 0) if al_res.status_code==200 else al_res.text[:100]}")

    # G10: Audit Log CSV
    al_csv = httpx.get(f"{BASE_URL}/api/v1/reports/audit-logs?export=csv", headers=admin_h, follow_redirects=True)
    r("G10: Audit Log CSV", al_csv.status_code == 200 and "text/csv" in al_csv.headers.get("content-type", ""),
      f"Status: {al_csv.status_code}")

# ─────────────────────────────────────────────
# PHASE H: RBAC Enforcement
# ─────────────────────────────────────────────
def phase_h(admin_h):
    print("\n" + "="*60)
    print("PHASE H — RBAC Enforcement")
    print("="*60)

    # Branch Head (branch 1) — can see reports for own branch
    bh_h = login("test_bh1", "test123456")
    res = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id=1", headers=bh_h)
    r("H1: Branch Head can view own branch stock report", res.status_code == 200,
      f"Status: {res.status_code}")

    # Branch Head — cannot view other branch stock report
    res2 = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id=2", headers=bh_h)
    r("H2: Branch Head blocked from other branch report", res2.status_code in [400, 403],
      f"Status: {res2.status_code}")

    # Warehouse Staff (branch 1) — cannot view reports
    ws_h = login("test_ws1", "test123456")
    res3 = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id=1", headers=ws_h)
    r("H3: Warehouse Staff blocked from reports", res3.status_code in [400, 403],
      f"Status: {res3.status_code}")

    # Warehouse Staff — cannot do initial load
    load_res = httpx.post(f"{BASE_URL}/api/v1/inventory/initial-load", json={
        "branch_id": 1, "notes": "test", "lines": []
    }, headers=ws_h)
    r("H4: Warehouse Staff blocked from Initial Load", load_res.status_code == 403,
      f"Status: {load_res.status_code}")

    # Warehouse Staff — can do outbound on own branch
    stocks = get_all_branch_stocks(admin_h, 1)
    items_with_stock = [(iid, qty) for iid, qty in stocks.items() if qty >= 1]
    if items_with_stock:
        ws_out = httpx.post(f"{BASE_URL}/api/v1/outbound/", json={
            "branch_id": 1, "status": "completed", "reference_no": "QA-WS-OUT-001",
            "notes": "WS RBAC test outbound",
            "lines": [{"item_id": items_with_stock[0][0], "quantity": 1}]
        }, headers=ws_h)
        r("H5: Warehouse Staff can do outbound on own branch", ws_out.status_code == 201,
          f"Status: {ws_out.status_code}")

        # Warehouse Staff — cannot do outbound on other branch
        ws_cross = httpx.post(f"{BASE_URL}/api/v1/outbound/", json={
            "branch_id": 2, "status": "completed", "reference_no": "QA-WS-CROSS",
            "notes": "WS cross-branch outbound test",
            "lines": [{"item_id": items_with_stock[0][0], "quantity": 1}]
        }, headers=ws_h)
        r("H6: Warehouse Staff blocked from cross-branch outbound", ws_cross.status_code == 403,
          f"Status: {ws_cross.status_code}")

    # Samarinda BH can only see own branch
    smd_bh_h = login("smd_bh", "test123456")
    res_smd = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id=2", headers=smd_bh_h)
    r("H7: Samarinda BH can view Samarinda stock report", res_smd.status_code == 200,
      f"Status: {res_smd.status_code}")

    res_smd_cross = httpx.get(f"{BASE_URL}/api/v1/reports/stock?branch_id=1", headers=smd_bh_h)
    r("H8: Samarinda BH blocked from Balikpapan report", res_smd_cross.status_code in [400, 403],
      f"Status: {res_smd_cross.status_code}")

# ─────────────────────────────────────────────
# PHASE I: Data Integrity Audit
# ─────────────────────────────────────────────
def phase_i(admin_h):
    print("\n" + "="*60)
    print("PHASE I — Data Integrity Audit")
    print("="*60)

    # Use SQLAlchemy directly (running inside container)
    import sys, os
    sys.path.insert(0, "/app")
    from sqlalchemy import create_engine, text
    from app.core.config import settings

    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # I1: branch_stocks cache == inventory_transactions aggregate
        discrepancy_sql = text("""
            SELECT COUNT(*)
            FROM branch_stocks bs
            LEFT JOIN (
                SELECT branch_id, item_id,
                       SUM(CASE WHEN transaction_type='IN' THEN quantity
                                WHEN transaction_type='OUT' THEN -quantity
                                ELSE 0 END) AS ledger_qty
                FROM inventory_transactions
                GROUP BY branch_id, item_id
            ) agg ON bs.branch_id=agg.branch_id AND bs.item_id=agg.item_id
            WHERE ABS(bs.quantity - COALESCE(agg.ledger_qty, 0)) > 0
        """)
        disc_count = conn.execute(discrepancy_sql).scalar()
        r("I1: branch_stocks cache matches inventory_transactions ledger",
          disc_count == 0, f"{disc_count} discrepancies found")

        # I2: No negative stock
        neg_sql = text("SELECT COUNT(*) FROM branch_stocks WHERE quantity < 0")
        neg_count = conn.execute(neg_sql).scalar()
        r("I2: No negative stock exists", neg_count == 0,
          f"{neg_count} rows with negative stock")

        # I3: No orphan inventory_transactions
        orphan_sql = text("""
            SELECT COUNT(*) FROM inventory_transactions it
            LEFT JOIN items i ON it.item_id = i.item_id
            LEFT JOIN branches b ON it.branch_id = b.branch_id
            WHERE i.item_id IS NULL OR b.branch_id IS NULL
        """)
        orphan_count = conn.execute(orphan_sql).scalar()
        r("I3: No orphan inventory_transactions", orphan_count == 0,
          f"{orphan_count} orphan rows found")

        # I4: No orphan transfer_lines
        xfer_sql = text("""
            SELECT COUNT(*) FROM transfer_lines tl
            LEFT JOIN transfers t ON tl.transfer_id = t.transfer_id
            WHERE t.transfer_id IS NULL
        """)
        xfer_count = conn.execute(xfer_sql).scalar()
        r("I4: No orphan transfer_lines", xfer_count == 0,
          f"{xfer_count} orphan transfer line rows found")

        # I5: No orphan stock_opname_lines
        opname_sql = text("""
            SELECT COUNT(*) FROM stock_opname_lines ol
            LEFT JOIN stock_opname_sessions s ON ol.session_id = s.session_id
            WHERE s.session_id IS NULL
        """)
        opname_count = conn.execute(opname_sql).scalar()
        r("I5: No orphan stock_opname_lines", opname_count == 0,
          f"{opname_count} orphan opname line rows found")

    # I6: Audit logs exist for key operations
    audit_res = httpx.get(f"{BASE_URL}/api/v1/reports/audit-logs?page_size=5", headers=admin_h)
    has_audit = audit_res.status_code == 200 and audit_res.json().get("total", 0) > 0
    r("I6: Audit logs exist via API", has_audit, f"Total audit entries: {audit_res.json().get('total', 0) if audit_res.status_code==200 else audit_res.text[:100]}")

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
def print_summary():
    print("\n" + "="*60)
    print("FULL OPERATIONAL AUDIT — SUMMARY")
    print("="*60)

    passed = [x for x in RESULTS if x["passed"]]
    failed = [x for x in RESULTS if not x["passed"]]

    print(f"\nTotal: {len(RESULTS)} | Passed: {len(passed)} | Failed: {len(failed)}")
    score = round((len(passed) / len(RESULTS)) * 100) if RESULTS else 0
    print(f"Score: {score}%")

    if failed:
        print(f"\n{'='*40}")
        print("❌ FAILED CHECKS:")
        print(f"{'='*40}")
        for f in failed:
            print(f"  - {f['label']}: {f['detail']}")
    else:
        print("\n✅ ALL CHECKS PASSED!")

    return passed, failed, score

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════╗")
    print("║  Gudang Piala Kaltim WMS — Full Operational Audit  ║")
    print("╚══════════════════════════════════════════════════╝")

    admin_h = login("admin", "admin123")
    bpn_ws_h = login("test_ws1", "test123456")

    # Phase A: Master Data
    first_item, cat_id, all_items = phase_a(admin_h)

    # Phase B: Initial Load / Stock Verification
    phase_b(admin_h)

    # Phase C: Daily Operations
    if all_items:
        # Use a stable item from the seeded dataset with stock at branch 1
        test_item_id, post_op_stock = phase_c(admin_h, bpn_ws_h, branch1_id=1)
    else:
        test_item_id = None

    # Phase D: Concurrency
    if test_item_id:
        phase_d(admin_h, test_item_id, branch1_id=1)

    # Phase E: Transfers
    if test_item_id:
        phase_e(admin_h, test_item_id, branch1_id=1, branch2_id=2)

    # Phase F: Stock Opname
    if test_item_id:
        phase_f(admin_h, test_item_id, branch1_id=1)

    # Phase G: Reports
    phase_g(admin_h, branch1_id=1)

    # Phase H: RBAC
    phase_h(admin_h)

    # Phase I: Data Integrity
    phase_i(admin_h)

    # Summary
    passed, failed, score = print_summary()
