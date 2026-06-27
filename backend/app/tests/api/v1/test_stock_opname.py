import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.category import Category
from app.core.security import create_access_token
from app.models.stock_opname import StockOpnameSession
from app.models.inventory import BranchStock, InventoryTransaction
from app.services.inventory_service import inventory_service
from app.schemas.inventory import StockChangeLine

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_create_opname_draft(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Get item's category_id
    category_id = setup_test_item.category_id

    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": category_id,
        "status": "draft",
        "notes": "Opname bulanan draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 45}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    assert resp.status_code == 201
    
    content = resp.json()
    assert content["status"] == "draft"
    assert len(content["lines"]) == 1
    assert content["lines"][0]["physical_quantity"] == 45
    # Variance and system_quantity are 0/unreconciled in draft
    assert content["lines"][0]["system_quantity"] == 0

def test_create_opname_invalid_category(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Create another category
    other_cat = Category(code="CAT_OTHER", name="Other Cat")
    db_session.add(other_cat)
    db_session.flush()

    # Create an item in other_cat to satisfy the active items check
    from app.models.item import Item
    item_in_other = Item(
        item_code="CAT-SUP-009",
        manual_code="SUP-009",
        name="Test Item Other",
        category_id=other_cat.category_id,
        supplier_id=setup_test_item.supplier_id,
        uom_id=setup_test_item.uom_id,
        minimum_stock=5,
        is_active=True
    )
    db_session.add(item_in_other)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Try to do opname with other_cat, but item is in setup_test_item's category
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": other_cat.category_id,
        "status": "draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 45}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    assert resp.status_code == 400
    assert "tidak termasuk dalam kategori" in resp.json()["detail"]

def test_create_opname_empty_category(db_client: TestClient, db_session: Session, test_user: User, setup_test_branch):
    # Create another category with no items
    empty_cat = Category(code="CAT_EMPTY", name="Empty Cat")
    db_session.add(empty_cat)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": empty_cat.category_id,
        "status": "draft",
        "lines": []
    }
    
    resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    assert resp.status_code == 400
    assert "tidak memiliki item aktif" in resp.json()["detail"]

def test_complete_opname_positive_variance(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock of 30
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=30)],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Create draft
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": setup_test_item.category_id,
        "status": "draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 45} # 45 physical vs 30 system -> +15 variance
        ]
    }
    create_resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    session_id = create_resp.json()["session_id"]

    # Complete session
    comp_resp = db_client.post(f"/api/v1/stock-opname/{session_id}/complete", headers=headers)
    assert comp_resp.status_code == 200
    
    content = comp_resp.json()
    assert content["status"] == "completed"
    assert content["lines"][0]["system_quantity"] == 30
    assert content["lines"][0]["physical_quantity"] == 45
    assert content["lines"][0]["variance"] == 15

    # Verify branch_stocks is updated to 45
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock.quantity == 45

    # Verify positive adjustment ADJUSTMENT_PLUS transaction
    tx = db_session.query(InventoryTransaction).filter(
        InventoryTransaction.branch_id == setup_test_branch.branch_id,
        InventoryTransaction.item_id == setup_test_item.item_id,
        InventoryTransaction.transaction_type == "ADJUSTMENT_PLUS",
        InventoryTransaction.reference_type == "opname"
    ).first()
    assert tx is not None
    assert tx.quantity == 15

def test_complete_opname_negative_variance(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock of 30
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=30)],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Create draft
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": setup_test_item.category_id,
        "status": "draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 20} # 20 physical vs 30 system -> -10 variance
        ]
    }
    create_resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    session_id = create_resp.json()["session_id"]

    # Complete session
    comp_resp = db_client.post(f"/api/v1/stock-opname/{session_id}/complete", headers=headers)
    assert comp_resp.status_code == 200
    
    content = comp_resp.json()
    assert content["status"] == "completed"
    assert content["lines"][0]["system_quantity"] == 30
    assert content["lines"][0]["physical_quantity"] == 20
    assert content["lines"][0]["variance"] == -10

    # Verify branch_stocks is updated to 20
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock.quantity == 20

    # Verify negative adjustment ADJUSTMENT_MINUS transaction
    tx = db_session.query(InventoryTransaction).filter(
        InventoryTransaction.branch_id == setup_test_branch.branch_id,
        InventoryTransaction.item_id == setup_test_item.item_id,
        InventoryTransaction.transaction_type == "ADJUSTMENT_MINUS",
        InventoryTransaction.reference_type == "opname"
    ).first()
    assert tx is not None
    assert tx.quantity == 10

def test_opname_branch_restrictions(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    from app.models.branch import Branch
    # Create another branch
    other_branch = Branch(code="OTH_BR", name="Other Branch", location="Other Loc", is_active=True)
    db_session.add(other_branch)
    db_session.flush()

    # Assign test user to other_branch
    test_user.role = "warehouse_staff"
    test_user.branch_id = other_branch.branch_id
    db_session.commit()

    headers = get_auth_headers(test_user.user_id, "warehouse_staff")

    # Try to do opname for setup_test_branch (different branch)
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": setup_test_item.category_id,
        "status": "draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 10}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    assert resp.status_code == 403

def test_create_opname_snapshots_system_stock(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # 1. Setup initial stock of 30
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=30)],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # 2. Create draft session without specifying physical_quantity to verify default
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": setup_test_item.category_id,
        "status": "draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 0}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    assert resp.status_code == 201
    content = resp.json()
    assert content["lines"][0]["system_quantity"] == 30
    # physical_quantity should default to system_quantity (30) in backend
    assert content["lines"][0]["physical_quantity"] == 30

def test_update_opname_preserves_snapshot_and_snapshots_new_item(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    from app.models.item import Item
    # 1. Create a second item B
    item_b = Item(
        item_code="CAT-SUP-002",
        manual_code="SUP-002",
        name="Test Item B",
        category_id=setup_test_item.category_id,
        supplier_id=setup_test_item.supplier_id,
        uom_id=setup_test_item.uom_id,
        minimum_stock=5,
        is_active=True
    )
    db_session.add(item_b)
    db_session.flush()

    # 2. Setup initial stock of 30 for item A and 50 for item B
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[
            StockChangeLine(item_id=setup_test_item.item_id, quantity=30),
            StockChangeLine(item_id=item_b.item_id, quantity=50),
        ],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")

    # 3. Create draft session containing only item A
    data = {
        "branch_id": setup_test_branch.branch_id,
        "category_id": setup_test_item.category_id,
        "status": "draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 30}
        ]
    }
    create_resp = db_client.post("/api/v1/stock-opname/", json=data, headers=headers)
    session_id = create_resp.json()["session_id"]
    
    # 4. Change stock of item A in background (simulating movement)
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="manual",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=10)],
        notes=None,
        created_by=test_user.user_id
    )

    # 5. Update draft by keeping item A (phys count 35) and adding item B (phys count 0 by default)
    update_data = {
        "notes": "Updated notes",
        "lines": [
            {"item_id": setup_test_item.item_id, "physical_quantity": 35},
            {"item_id": item_b.item_id, "physical_quantity": 0} # 0 will default to system stock 50
        ]
    }
    update_resp = db_client.put(f"/api/v1/stock-opname/{session_id}", json=update_data, headers=headers)
    assert update_resp.status_code == 200
    content = update_resp.json()
    
    # Sort lines by item_id to inspect
    lines = sorted(content["lines"], key=lambda x: x["item_id"])
    
    # Item A: system_quantity snapshot must remain 30 (preserved), physical_quantity updated to 35
    assert lines[0]["item_id"] == setup_test_item.item_id
    assert lines[0]["system_quantity"] == 30
    assert lines[0]["physical_quantity"] == 35

    # Item B: system_quantity snapshot must be captured as 50, physical_quantity defaulted to 50
    assert lines[1]["item_id"] == item_b.item_id
    assert lines[1]["system_quantity"] == 50
    assert lines[1]["physical_quantity"] == 50
