import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import create_access_token
from app.models.outbound import OutboundSession
from app.models.inventory import BranchStock, InventoryTransaction
from app.services.inventory_service import inventory_service
from app.schemas.inventory import StockChangeLine

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_create_outbound_success(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock of 100
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=100)],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "completed",
        "reference_no": "SO-888",
        "notes": "Customer shipment",
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 40}
        ]
    }
    
    resp = db_client.post("/api/v1/outbound/", json=data, headers=headers)
    assert resp.status_code == 201
    
    content = resp.json()
    assert content["status"] == "completed"
    assert content["reference_no"] == "SO-888"
    assert len(content["lines"]) == 1
    assert content["lines"][0]["item_id"] == setup_test_item.item_id
    assert content["lines"][0]["quantity"] == 40
    
    # Verify stock is now 60
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock is not None
    assert stock.quantity == 60

    # Verify outbound transaction ledger entry
    tx = db_session.query(InventoryTransaction).filter(
        InventoryTransaction.branch_id == setup_test_branch.branch_id,
        InventoryTransaction.item_id == setup_test_item.item_id,
        InventoryTransaction.transaction_type == "OUT"
    ).first()
    assert tx is not None
    assert tx.reference_type == "outbound"
    assert tx.quantity == 40

def test_create_outbound_insufficient_stock(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock of 10
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=10)],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Try to outbound 40 (available 10)
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "completed",
        "reference_no": "SO-889",
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 40}
        ]
    }
    
    resp = db_client.post("/api/v1/outbound/", json=data, headers=headers)
    assert resp.status_code == 400
    assert "Stok tidak mencukupi" in resp.json()["detail"]

def test_create_outbound_optional_reference_no(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup stock
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=10)],
        notes=None,
        created_by=test_user.user_id
    )

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "completed",
        "reference_no": None,  # Optional
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 5}
        ]
    }
    
    resp = db_client.post("/api/v1/outbound/", json=data, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["reference_no"] is None

def test_create_outbound_branch_restriction(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    from app.models.branch import Branch
    # Make user a branch head of another branch
    other_branch = setup_test_branch
    
    user_branch = Branch(code="USR_BR", name="User Branch", location="User Location", is_active=True)
    db_session.add(user_branch)
    db_session.flush()
    
    test_user.role = "branch_head"
    test_user.branch_id = user_branch.branch_id
    db_session.commit()
    
    headers = get_auth_headers(test_user.user_id, "branch_head")
    
    data = {
        "branch_id": other_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 10}
        ]
    }
    
    resp = db_client.post("/api/v1/outbound/", json=data, headers=headers)
    assert resp.status_code == 403
