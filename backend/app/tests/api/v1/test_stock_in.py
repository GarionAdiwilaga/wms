import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import create_access_token
from app.models.stock_in import StockInSession
from app.models.inventory import BranchStock, InventoryTransaction

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_create_stock_in_completed(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "completed",
        "reference_no": "PO-12345",
        "supplier_invoice_no": "INV-SUP-99",
        "notes": "Incoming supplier stock",
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 50}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    assert resp.status_code == 201
    
    content = resp.json()
    assert content["status"] == "completed"
    assert content["reference_no"] == "PO-12345"
    assert content["supplier_invoice_no"] == "INV-SUP-99"
    assert len(content["lines"]) == 1
    assert content["lines"][0]["item_id"] == setup_test_item.item_id
    assert content["lines"][0]["quantity"] == 50
    assert content["lines"][0]["item_code"] == setup_test_item.item_code
    assert content["lines"][0]["item_name"] == setup_test_item.name
    
    # Verify stock in branch_stocks
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock is not None
    assert stock.quantity == 50

    # Verify inventory_transactions ledger entry
    tx = db_session.query(InventoryTransaction).filter(
        InventoryTransaction.branch_id == setup_test_branch.branch_id,
        InventoryTransaction.item_id == setup_test_item.item_id
    ).first()
    assert tx is not None
    assert tx.transaction_type == "IN"
    assert tx.reference_type == "stock_in"
    assert tx.quantity == 50

def test_create_stock_in_draft(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "draft",
        "reference_no": "PO-12345-DRAFT",
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 50}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    assert resp.status_code == 201
    
    # Draft should not update ledger/stocks
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock is None or stock.quantity == 0

def test_create_stock_in_duplicate_items(db_client: TestClient, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "completed",
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 10},
            {"item_id": setup_test_item.item_id, "quantity": 20}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    assert resp.status_code == 400
    assert "Duplicate items" in resp.json()["detail"]

def test_create_stock_in_nonexistent_item(db_client: TestClient, test_user: User, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "branch_id": setup_test_branch.branch_id,
        "status": "completed",
        "lines": [
            {"item_id": 99999, "quantity": 10}
        ]
    }
    
    resp = db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    assert resp.status_code == 400
    assert "tidak ditemukan" in resp.json()["detail"]

def test_create_stock_in_branch_restriction(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
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
    
    # Attempting to post to a different branch should fail with 403
    resp = db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    assert resp.status_code == 403

def test_list_stock_in_sessions(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Create a session
    data = {
        "branch_id": setup_test_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 10}
        ]
    }
    db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    
    # List sessions
    resp = db_client.get("/api/v1/stock-in/", headers=headers)
    assert resp.status_code == 200
    content = resp.json()
    assert content["total"] >= 1
    assert len(content["data"]) >= 1
    assert content["data"][0]["branch_id"] == setup_test_branch.branch_id

def test_stock_in_pdf_export(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Create a session
    data = {
        "branch_id": setup_test_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "quantity": 10}
        ]
    }
    resp = db_client.post("/api/v1/stock-in/", json=data, headers=headers)
    assert resp.status_code == 201
    session_id = resp.json()["session_id"]
    
    # Get PDF
    response = db_client.get(f"/api/v1/stock-in/{session_id}/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 1000

