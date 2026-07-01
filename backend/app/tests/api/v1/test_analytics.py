import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.user import User
from app.models.item import Item
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.uom import UOM
from app.models.inventory import InventoryTransaction, BranchStock
from app.core.security import create_access_token, get_password_hash
from app.services.report_service import ReportService

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def test_data(db_session: Session):
    # Setup UOM
    uom = UOM(code="PCS", name="Pieces", is_active=True)
    db_session.add(uom)
    db_session.flush()

    # Create Branches
    branch_a = Branch(code="BRA", name="Branch A", location="Location A", is_active=True)
    branch_b = Branch(code="BRB", name="Branch B", location="Location B", is_active=True)
    db_session.add_all([branch_a, branch_b])
    db_session.flush()

    # Create Categories
    cat_marmer = Category(code="MRM", name="Marmer", is_active=True)
    cat_akrilik = Category(code="AKR", name="Akrilik", is_active=True)
    db_session.add_all([cat_marmer, cat_akrilik])
    db_session.flush()

    # Create Suppliers
    supplier_a = Supplier(code="SUPA", name="Supplier A", contact_person="A", is_active=True)
    db_session.add(supplier_a)
    db_session.flush()

    # Create Users
    admin = User(
        username="super_admin_test",
        password_hash=get_password_hash("admin123"),
        full_name="Super Admin User",
        role="super_admin",
        branch_id=None,
        is_active=True
    )
    head_a = User(
        username="branch_head_a",
        password_hash=get_password_hash("head123"),
        full_name="Branch Head A",
        role="branch_head",
        branch_id=branch_a.branch_id,
        is_active=True
    )
    head_b = User(
        username="branch_head_b",
        password_hash=get_password_hash("head123"),
        full_name="Branch Head B",
        role="branch_head",
        branch_id=branch_b.branch_id,
        is_active=True
    )
    staff_a = User(
        username="staff_a",
        password_hash=get_password_hash("staff123"),
        full_name="Staff User A",
        role="warehouse_staff",
        branch_id=branch_a.branch_id,
        is_active=True
    )
    db_session.add_all([admin, head_a, head_b, staff_a])
    db_session.flush()

    # Create Items
    item1 = Item(
        item_code="MRM-SUPA-001",
        manual_code="001",
        name="Piala Marmer Besar",
        category_id=cat_marmer.category_id,
        supplier_id=supplier_a.supplier_id,
        uom_id=uom.uom_id,
        minimum_stock=10,
        is_active=True
    )
    item2 = Item(
        item_code="AKR-SUPA-002",
        manual_code="002",
        name="Plakat Akrilik Custom",
        category_id=cat_akrilik.category_id,
        supplier_id=supplier_a.supplier_id,
        uom_id=uom.uom_id,
        minimum_stock=5,
        is_active=True
    )
    item3 = Item(
        item_code="MRM-SUPA-003",
        manual_code="003",
        name="Piala Marmer Kecil (Never Moved)",
        category_id=cat_marmer.category_id,
        supplier_id=supplier_a.supplier_id,
        uom_id=uom.uom_id,
        minimum_stock=5,
        is_active=True
    )
    db_session.add_all([item1, item2, item3])
    db_session.flush()

    # Branch Stocks Cache
    bs1_a = BranchStock(branch_id=branch_a.branch_id, item_id=item1.item_id, quantity=100)
    bs2_a = BranchStock(branch_id=branch_a.branch_id, item_id=item2.item_id, quantity=50)
    bs3_a = BranchStock(branch_id=branch_a.branch_id, item_id=item3.item_id, quantity=10)
    db_session.add_all([bs1_a, bs2_a, bs3_a])
    db_session.flush()

    # Transactions setup (Branch A)
    # 1. Initial Load (should be ignored by velocity and classification)
    tx_init = InventoryTransaction(
        item_id=item1.item_id,
        branch_id=branch_a.branch_id,
        transaction_type="IN",
        quantity=150,
        reference_type="initial_load",
        created_by=admin.user_id,
        created_at=datetime.now(timezone.utc) - timedelta(days=10)
    )
    # 2. Outbound OUT transaction
    tx_out = InventoryTransaction(
        item_id=item1.item_id,
        branch_id=branch_a.branch_id,
        transaction_type="OUT",
        quantity=30,
        reference_type="outbound",
        created_by=staff_a.user_id,
        created_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    # 3. Opname adjustment (should be ignored by velocity)
    tx_opname = InventoryTransaction(
        item_id=item2.item_id,
        branch_id=branch_a.branch_id,
        transaction_type="ADJUSTMENT_MINUS",
        quantity=5,
        reference_type="opname",
        created_by=head_a.user_id,
        created_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    # 4. Inbound IN transaction
    tx_in = InventoryTransaction(
        item_id=item2.item_id,
        branch_id=branch_a.branch_id,
        transaction_type="IN",
        quantity=20,
        reference_type="stock_in",
        created_by=staff_a.user_id,
        created_at=datetime.now(timezone.utc) - timedelta(days=3)
    )

    db_session.add_all([tx_init, tx_out, tx_opname, tx_in])
    db_session.flush()

    return {
        "admin": admin,
        "head_a": head_a,
        "head_b": head_b,
        "staff_a": staff_a,
        "branch_a": branch_a,
        "branch_b": branch_b,
        "item1": item1,
        "item2": item2,
        "item3": item3,
    }

def test_analytics_velocity(db_client: TestClient, test_data: dict):
    headers = get_auth_headers(test_data["head_a"].user_id, "branch_head")
    response = db_client.get(
        "/api/v1/analytics/velocity?days=30",
        headers=headers
    )
    assert response.status_code == 200
    res = response.json()
    assert "generated_at" in res
    assert len(res["data"]) > 0
    # Velocity entry check
    entry = res["data"][0]
    assert entry["item_id"] == test_data["item1"].item_id
    assert entry["total_outbound"] == 30
    assert entry["velocity"] == 1.0 # 30 / 30

def test_analytics_velocity_parameter_constraints(db_client: TestClient, test_data: dict):
    headers = get_auth_headers(test_data["admin"].user_id, "super_admin")
    # Days too small
    response = db_client.get("/api/v1/analytics/velocity?days=5", headers=headers)
    assert response.status_code == 422

    # Days too large
    response = db_client.get("/api/v1/analytics/velocity?days=500", headers=headers)
    assert response.status_code == 422

def test_analytics_rbac_lock(db_client: TestClient, test_data: dict):
    # Head A tries to query Branch B
    headers = get_auth_headers(test_data["head_a"].user_id, "branch_head")
    response = db_client.get(
        f"/api/v1/analytics/velocity?branch_id={test_data['branch_b'].branch_id}",
        headers=headers
    )
    assert response.status_code == 403

    # Staff user is blocked entirely (only admin/head allowed)
    staff_headers = get_auth_headers(test_data["staff_a"].user_id, "warehouse_staff")
    response = db_client.get("/api/v1/analytics/velocity", headers=staff_headers)
    assert response.status_code == 403

def test_analytics_activity_trends(db_client: TestClient, test_data: dict):
    headers = get_auth_headers(test_data["head_a"].user_id, "branch_head")
    response = db_client.get("/api/v1/analytics/trends?days=7", headers=headers)
    assert response.status_code == 200
    res = response.json()
    assert len(res["data"]) == 7 # Padded to 7 days
    # Verify daily quantities are padded / sorted chronologically
    dates = [d["date"] for d in res["data"]]
    assert dates == sorted(dates)

def test_analytics_distributions_reconciliation(db_client: TestClient, test_data: dict, db_session: Session):
    headers = get_auth_headers(test_data["admin"].user_id, "super_admin")
    response = db_client.get("/api/v1/analytics/distributions", headers=headers)
    assert response.status_code == 200
    res = response.json()

    # Reconcile sum of category quantities with ReportService outputs
    analytics_total_cat_qty = sum(c["total_quantity"] for c in res["categories"])
    report_rows, total = ReportService.get_stock_report(db_session, is_export=True)
    report_total_qty = sum(r.quantity for r in report_rows)

    assert analytics_total_cat_qty == report_total_qty
    # Ensure branch data is present for Super Admin
    assert res["branches"] is not None
    analytics_total_br_qty = sum(b["total_quantity"] for b in res["branches"])
    assert analytics_total_br_qty == report_total_qty

def test_analytics_top_operators(db_client: TestClient, test_data: dict):
    headers = get_auth_headers(test_data["head_a"].user_id, "branch_head")
    response = db_client.get("/api/v1/analytics/operators", headers=headers)
    assert response.status_code == 200
    res = response.json()
    # verify opname exclusions
    assert len(res["data"]) > 0
    op_entry = res["data"][0]
    # operator staff_a has 2 non-opname transactions (outbound & stock_in)
    assert op_entry["operator_name"] == "Staff User A"
    assert op_entry["total_transactions"] == 2

def test_analytics_classification(db_client: TestClient, test_data: dict):
    headers = get_auth_headers(test_data["head_a"].user_id, "branch_head")
    response = db_client.get("/api/v1/analytics/classification?page=1&page_size=10", headers=headers)
    assert response.status_code == 200
    res = response.json()
    assert res["total"] == 3 # all 3 active items are included
    
    # item3 has never moved (should fall back to creation date, which is today/0 days ago)
    item3_entry = next(i for i in res["data"] if i["item_id"] == test_data["item3"].item_id)
    assert item3_entry["days_since_last_movement"] == 0
    assert item3_entry["last_movement_date"] is not None

    # item1 has outbound (outbound was 2 days ago)
    item1_entry = next(i for i in res["data"] if i["item_id"] == test_data["item1"].item_id)
    assert item1_entry["days_since_last_movement"] == 2
