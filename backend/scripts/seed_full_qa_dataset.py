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
from app.models.stock_in import StockInSession, StockInLine
from app.models.outbound import OutboundSession, OutboundLine
from app.models.audit_log import AuditLog
from app.core.security import create_access_token

def seed():
    print("Initializing TestClient for Seeding...")
    client = TestClient(app)
    db = SessionLocal()

    # Get admin user and headers
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("CRITICAL FAILURE: Admin user not found.")
        sys.exit(1)
        
    token = create_access_token(user_id=admin.user_id, role=admin.role, token_version=admin.token_version)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Clean up existing tables
    print("Clearing existing tables...")
    db.query(AuditLog).delete()
    db.query(BranchStock).delete()
    db.query(InventoryTransaction).delete()
    db.query(TransferLine).delete()
    db.query(Transfer).delete()
    db.query(StockOpnameLine).delete()
    db.query(StockOpnameSession).delete()
    db.query(StockInLine).delete()
    db.query(StockInSession).delete()
    db.query(OutboundLine).delete()
    db.query(OutboundSession).delete()
    db.query(Item).delete()
    db.query(Category).delete()
    db.query(Supplier).delete()
    db.query(UOM).delete()
    db.commit()
    print("Database cleared.")

    # 2. Seed UOM
    print("Seeding UOM Pieces...")
    res = client.post("/api/v1/uoms/", json={"code": "pcs", "name": "Pieces"}, headers=headers)
    assert res.status_code == 200, f"UOM creation failed: {res.text}"
    uom_id = res.json()["uom_id"]

    # 3. Seed Categories
    categories_spec = [
        {"code": "STL", "name": "Stall"},
        {"code": "PNG", "name": "Peninggi"},
        {"code": "FIG", "name": "Figur"},
        {"code": "MED", "name": "Medali"},
        {"code": "MRM", "name": "Marmer"},
        {"code": "AKR", "name": "Akrilik"},
        {"code": "ETC", "name": "Etching"}
    ]
    category_map = {}
    print("Seeding Categories...")
    for cat in categories_spec:
        res = client.post("/api/v1/categories/", json=cat, headers=headers)
        assert res.status_code == 200, f"Category {cat['code']} failed: {res.text}"
        category_map[cat["code"]] = res.json()["category_id"]

    # 4. Seed Suppliers
    suppliers_spec = [
        {"code": "ONX", "name": "ONIX"},
        {"code": "FUN", "name": "FUNTROPHY"},
        {"code": "EVN", "name": "EVAN"},
        {"code": "JRD", "name": "JORDAN"},
        {"code": "ICI", "name": "IMPORT_CICI"},
        {"code": "INT", "name": "INTERNAL"}
    ]
    supplier_map = {}
    print("Seeding Suppliers...")
    for sup in suppliers_spec:
        res = client.post("/api/v1/suppliers/", json=sup, headers=headers)
        assert res.status_code == 200, f"Supplier {sup['code']} failed: {res.text}"
        supplier_map[sup["code"]] = res.json()["supplier_id"]

    # 5. Seed Items
    items_spec = [
        # ONIX
        {"cat": "STL", "sup": "ONX", "manual": "040", "name": "Stall 40cm", "min": 20},
        {"cat": "STL", "sup": "ONX", "manual": "050", "name": "Stall 50cm", "min": 25},
        {"cat": "STL", "sup": "ONX", "manual": "060", "name": "Stall 60cm", "min": 30},
        {"cat": "PNG", "sup": "ONX", "manual": "B204", "name": "Peninggi B204 8cm", "min": 35},
        {"cat": "PNG", "sup": "ONX", "manual": "B205", "name": "Peninggi B205 10cm", "min": 40},
        # FUNTROPHY
        {"cat": "STL", "sup": "FUN", "manual": "040", "name": "Stall 40cm", "min": 20},
        {"cat": "STL", "sup": "FUN", "manual": "050", "name": "Stall 50cm", "min": 25},
        {"cat": "FIG", "sup": "FUN", "manual": "FT348", "name": "Figur FT348 Gold", "min": 30},
        {"cat": "FIG", "sup": "FUN", "manual": "FT349", "name": "Figur FT349 Silver", "min": 35},
        {"cat": "FIG", "sup": "FUN", "manual": "FT350", "name": "Figur FT350 Bronze", "min": 40},
        # EVAN
        {"cat": "PNG", "sup": "EVN", "manual": "B204", "name": "Peninggi B204 8cm", "min": 20},
        {"cat": "PNG", "sup": "EVN", "manual": "B205", "name": "Peninggi B205 10cm", "min": 25},
        {"cat": "PNG", "sup": "EVN", "manual": "B206", "name": "Peninggi B206 12cm", "min": 30},
        {"cat": "PNG", "sup": "EVN", "manual": "J1", "name": "Peninggi J1", "min": 35},
        {"cat": "PNG", "sup": "EVN", "manual": "J2", "name": "Peninggi J2", "min": 40},
        # JORDAN
        {"cat": "FIG", "sup": "JRD", "manual": "BOLA", "name": "Figur Bola", "min": 20},
        {"cat": "FIG", "sup": "JRD", "manual": "BASKET", "name": "Figur Basket", "min": 25},
        {"cat": "FIG", "sup": "JRD", "manual": "FUTSAL", "name": "Figur Futsal", "min": 30},
        {"cat": "FIG", "sup": "JRD", "manual": "BADMINTON", "name": "Figur Badminton", "min": 35},
        {"cat": "FIG", "sup": "JRD", "manual": "VOLI", "name": "Figur Voli", "min": 40},
        # IMPORT CICI
        {"cat": "MED", "sup": "ICI", "manual": "BELANDA", "name": "Medali Tali Belanda", "min": 20},
        {"cat": "MED", "sup": "ICI", "manual": "BIRKUN", "name": "Medali Tali Biru Kuning", "min": 25},
        {"cat": "MED", "sup": "ICI", "manual": "MERPUT", "name": "Medali Tali Merah Putih", "min": 30},
        {"cat": "MED", "sup": "ICI", "manual": "POLOS", "name": "Medali Polos", "min": 35},
        {"cat": "MED", "sup": "ICI", "manual": "PREMIUM", "name": "Medali Premium", "min": 40},
        # MARMER (INTERNAL)
        {"cat": "MRM", "sup": "INT", "manual": "M03", "name": "Marmer 3cm", "min": 20},
        {"cat": "MRM", "sup": "INT", "manual": "M05G", "name": "Marmer 5cm Guci", "min": 25},
        {"cat": "MRM", "sup": "INT", "manual": "M05B", "name": "Marmer 5cm Bulat", "min": 30},
        {"cat": "MRM", "sup": "INT", "manual": "M07", "name": "Marmer 7cm", "min": 35},
        {"cat": "MRM", "sup": "INT", "manual": "M10", "name": "Marmer 10cm", "min": 40},
        # AKRILIK (INTERNAL)
        {"cat": "AKR", "sup": "INT", "manual": "KOSONG", "name": "Medali Akrilik Kosongan", "min": 20},
        {"cat": "AKR", "sup": "INT", "manual": "UV", "name": "Medali Akrilik UV", "min": 25},
        {"cat": "AKR", "sup": "INT", "manual": "UVG", "name": "Akrilik UV Gold", "min": 30},
        {"cat": "AKR", "sup": "INT", "manual": "UVS", "name": "Akrilik UV Silver", "min": 35},
        {"cat": "AKR", "sup": "INT", "manual": "UVB", "name": "Akrilik UV Bronze", "min": 40},
        # ETCHING (INTERNAL)
        {"cat": "ETC", "sup": "INT", "manual": "GOLD", "name": "Medali Etching Gold", "min": 20},
        {"cat": "ETC", "sup": "INT", "manual": "SILVER", "name": "Medali Etching Silver", "min": 25},
        {"cat": "ETC", "sup": "INT", "manual": "BRONZE", "name": "Medali Etching Bronze", "min": 30},
        {"cat": "ETC", "sup": "INT", "manual": "ET01", "name": "Etching Premium 1", "min": 35},
        {"cat": "ETC", "sup": "INT", "manual": "ET02", "name": "Etching Premium 2", "min": 40}
    ]
    item_map = {} # code -> item_id
    item_by_index = [] # list of (item_id, min_stock, code, category_id)
    print("Seeding Items...")
    for it in items_spec:
        payload = {
            "name": it["name"],
            "category_id": category_map[it["cat"]],
            "supplier_id": supplier_map[it["sup"]],
            "uom_id": uom_id,
            "manual_code": it["manual"],
            "minimum_stock": it["min"]
        }
        res = client.post("/api/v1/items/", json=payload, headers=headers)
        assert res.status_code in (200, 201), f"Item {it['name']} failed: {res.text}"
        data = res.json()
        item_map[data["item_code"]] = data["item_id"]
        item_by_index.append((data["item_id"], it["min"], data["item_code"], category_map[it["cat"]]))
    print(f"Successfully seeded {len(item_by_index)} items.")

    # 6. Populate Branches via Initial Load
    # We want varied quantities for the 3 branches:
    # B1 (Balikpapan=1):
    #   Items 0-9: High stock (300)
    #   Items 10-19: Low stock (5)
    #   Items 20-29: Exactly at minimum stock
    #   Items 30-39: Zero stock (not loaded)
    # B2 (Samarinda=2):
    #   Items 0-9: Zero stock
    #   Items 10-19: High stock (400)
    #   Items 20-29: Low stock (8)
    #   Items 30-39: Exactly at minimum stock
    # B3 (Bontang=3):
    #   Items 0-9: Exactly at minimum stock
    #   Items 10-19: Zero stock
    #   Items 20-29: High stock (500)
    #   Items 30-39: Low stock (10)
    print("Populating all branches via Initial Load...")
    
    b1_lines = []
    b2_lines = []
    b3_lines = []

    for idx, (item_id, min_stock, code, cat_id) in enumerate(item_by_index):
        # Branch 1
        if 0 <= idx < 10:
            b1_lines.append({"item_id": item_id, "quantity": 300})
        elif 10 <= idx < 20:
            b1_lines.append({"item_id": item_id, "quantity": 5})
        elif 20 <= idx < 30:
            b1_lines.append({"item_id": item_id, "quantity": min_stock})
        # Branch 2
        if 10 <= idx < 20:
            b2_lines.append({"item_id": item_id, "quantity": 400})
        elif 20 <= idx < 30:
            b2_lines.append({"item_id": item_id, "quantity": 8})
        elif 30 <= idx < 40:
            b2_lines.append({"item_id": item_id, "quantity": min_stock})
        # Branch 3
        if 0 <= idx < 10:
            b3_lines.append({"item_id": item_id, "quantity": min_stock})
        elif 20 <= idx < 30:
            b3_lines.append({"item_id": item_id, "quantity": 500})
        elif 30 <= idx < 40:
            b3_lines.append({"item_id": item_id, "quantity": 10})

    # Call initial load
    res = client.post("/api/v1/inventory/initial-load", json={"branch_id": 1, "lines": b1_lines, "notes": "B1 Load"}, headers=headers)
    assert res.status_code in (200, 201), f"B1 Load failed: {res.text}"
    res = client.post("/api/v1/inventory/initial-load", json={"branch_id": 2, "lines": b2_lines, "notes": "B2 Load"}, headers=headers)
    assert res.status_code in (200, 201), f"B2 Load failed: {res.text}"
    res = client.post("/api/v1/inventory/initial-load", json={"branch_id": 3, "lines": b3_lines, "notes": "B3 Load"}, headers=headers)
    assert res.status_code in (200, 201), f"B3 Load failed: {res.text}"
    print("Initial load completed for all branches.")

    # 7. Perform Stock In sessions
    print("Performing Stock In...")
    # Add 50 units of items 30-32 (currently 0 stock on Branch 1)
    stock_in_lines = [
        {"item_id": item_by_index[30][0], "quantity": 50},
        {"item_id": item_by_index[31][0], "quantity": 50},
        {"item_id": item_by_index[32][0], "quantity": 50}
    ]
    res = client.post("/api/v1/stock-in/", json={
        "branch_id": 1,
        "status": "completed",
        "reference_no": "SI-SEED-01",
        "supplier_invoice_no": "INV-SEED-01",
        "lines": stock_in_lines,
        "notes": "Seeding Stock In"
    }, headers=headers)
    assert res.status_code == 201, f"Stock In failed: {res.text}"

    # 8. Perform Outbound sessions
    print("Performing Outbound...")
    # Deduct 100 units from Item 0 and 1 at Branch 1 (shipped 300 originally)
    outbound_lines = [
        {"item_id": item_by_index[0][0], "quantity": 100},
        {"item_id": item_by_index[1][0], "quantity": 100}
    ]
    res = client.post("/api/v1/outbound/", json={
        "branch_id": 1,
        "status": "completed",
        "reference_no": "OUT-SEED-01",
        "lines": outbound_lines,
        "notes": "Seeding Outbound"
    }, headers=headers)
    assert res.status_code == 201, f"Outbound failed: {res.text}"

    # 9. Perform Transfers
    print("Performing Transfers...")
    # Transfer 1: Completed transfer (B1 -> B2, Item 2, sent 50, received 50)
    res = client.post("/api/v1/transfers/", json={
        "source_branch_id": 1,
        "dest_branch_id": 2,
        "notes": "Completed Transfer Seed",
        "lines": [{"item_id": item_by_index[2][0], "sent_quantity": 50}]
    }, headers=headers)
    assert res.status_code == 201, res.text
    trf1_id = res.json()["transfer_id"]
    line_id = res.json()["lines"][0]["line_id"]
    
    # Ship
    res = client.post(f"/api/v1/transfers/{trf1_id}/ship", headers=headers)
    assert res.status_code == 200, res.text
    # Receive
    res = client.post(f"/api/v1/transfers/{trf1_id}/receive", json={
        "received_notes": "All items received",
        "lines": [{"line_id": line_id, "received_quantity": 50}]
    }, headers=headers)
    assert res.status_code == 200, res.text

    # Transfer 2: Transfer with variance (B1 -> B2, Item 3, sent 30, received 28)
    res = client.post("/api/v1/transfers/", json={
        "source_branch_id": 1,
        "dest_branch_id": 2,
        "notes": "Variance Transfer Seed",
        "lines": [{"item_id": item_by_index[3][0], "sent_quantity": 30}]
    }, headers=headers)
    assert res.status_code == 201, res.text
    trf2_id = res.json()["transfer_id"]
    line_id2 = res.json()["lines"][0]["line_id"]
    
    # Ship
    res = client.post(f"/api/v1/transfers/{trf2_id}/ship", headers=headers)
    assert res.status_code == 200, res.text
    # Receive with variance
    res = client.post(f"/api/v1/transfers/{trf2_id}/receive", json={
        "received_notes": "Received with variance",
        "lines": [{
            "line_id": line_id2,
            "received_quantity": 28,
            "variance_notes": "2 broken",
            "variance_reason": "Damaged in Transit"
        }]
    }, headers=headers)
    assert res.status_code == 200, res.text

    # Transfer 3: Cancelled transfer (B1 -> B2, Item 4, sent 40, cancel after ship)
    res = client.post("/api/v1/transfers/", json={
        "source_branch_id": 1,
        "dest_branch_id": 2,
        "notes": "Cancelled Transfer Seed",
        "lines": [{"item_id": item_by_index[4][0], "sent_quantity": 40}]
    }, headers=headers)
    assert res.status_code == 201, res.text
    trf3_id = res.json()["transfer_id"]
    
    # Ship
    res = client.post(f"/api/v1/transfers/{trf3_id}/ship", headers=headers)
    assert res.status_code == 200, res.text
    # Cancel
    res = client.post(f"/api/v1/transfers/{trf3_id}/cancel", json={
        "cancellation_reason": "Shipment cancelled by sender"
    }, headers=headers)
    assert res.status_code == 200, res.text

    # 10. Perform Stock Opname sessions
    print("Performing Stock Opname...")
    # Category: Medali (MED) (Category ID category_map["MED"])
    # Item 20 (MED-ICI-BELANDA, B1 stock: min_stock=20)
    # Item 21 (MED-ICI-BIRKUN, B1 stock: min_stock=25)
    # Item 22 (MED-ICI-MERPUT, B1 stock: min_stock=30)
    
    # Positive variance: Item 20, system 20 -> physical 30 (+10)
    # Negative variance: Item 21, system 25 -> physical 15 (-10)
    # Zero variance: Item 22, system 30 -> physical 30 (0)
    
    res = client.post("/api/v1/stock-opname/", json={
        "branch_id": 1,
        "category_id": category_map["MED"],
        "status": "draft",
        "notes": "Audit Opname MED",
        "lines": [
            {"item_id": item_by_index[20][0], "physical_quantity": 30},
            {"item_id": item_by_index[21][0], "physical_quantity": 15},
            {"item_id": item_by_index[22][0], "physical_quantity": 30}
        ]
    }, headers=headers)
    assert res.status_code == 201, res.text
    opname_id = res.json()["session_id"]
    
    # Complete
    res = client.post(f"/api/v1/stock-opname/{opname_id}/complete", headers=headers)
    assert res.status_code == 200, res.text

    print("ALL DATASET SEEDING COMPLETED SUCCESSFULLY.")
    db.close()

if __name__ == "__main__":
    seed()
