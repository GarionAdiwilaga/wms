import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import create_access_token
from app.models.inventory import BranchStock
from app.services.inventory_service import inventory_service
from app.schemas.inventory import StockChangeLine

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_initial_load(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 100}
        ],
        "notes": "Initial setup"
    }
    
    resp = db_client.post("/api/v1/inventory/initial-load", json=data, headers=headers)
    assert resp.status_code == 200
    
    content = resp.json()
    assert len(content) == 1
    assert content[0]["quantity"] == 100
    assert content[0]["reference_type"] == "initial_load"
    
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock is not None
    assert stock.quantity == 100

def test_initial_load_not_super_admin(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    test_user.role = "branch_head"
    test_user.branch_id = setup_test_branch.branch_id
    db_session.commit()
    
    headers = get_auth_headers(test_user.user_id, "branch_head")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 100}
        ]
    }
    
    resp = db_client.post("/api/v1/inventory/initial-load", json=data, headers=headers)
    assert resp.status_code == 403

def test_get_branch_stocks(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no=None,
        lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=50)],
        notes=None,
        created_by=test_user.user_id
    )
    
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    resp = db_client.get(f"/api/v1/branch-stocks?branch_id={setup_test_branch.branch_id}", headers=headers)
    assert resp.status_code == 200
    
    content = resp.json()
    assert content["total"] == 1
    assert content["data"][0]["quantity"] == 50
    assert content["data"][0]["item_name"] == "Test Item"
