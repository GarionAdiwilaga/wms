import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.branch import Branch
from app.core.security import create_access_token
from app.models.transfer import Transfer
from app.models.inventory import BranchStock, InventoryTransaction
from app.services.inventory_service import inventory_service
from app.schemas.inventory import StockChangeLine

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_create_transfer_draft(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Create destination branch
    dest_branch = Branch(code="DST_BR", name="Destination Branch", location="Dest Loc", is_active=True)
    db_session.add(dest_branch)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "source_branch_id": setup_test_branch.branch_id,
        "dest_branch_id": dest_branch.branch_id,
        "notes": "Weekly restock draft",
        "lines": [
            {"item_id": setup_test_item.item_id, "sent_quantity": 25}
        ]
    }
    
    resp = db_client.post("/api/v1/transfers/", json=data, headers=headers)
    assert resp.status_code == 201
    
    content = resp.json()
    assert content["status"] == "draft"
    assert content["transfer_number"].startswith("TRF-")
    assert len(content["lines"]) == 1
    assert content["lines"][0]["sent_quantity"] == 25
    assert content["lines"][0]["item_code"] == setup_test_item.item_code

def test_ship_transfer_success(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock of 100 on source branch
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

    dest_branch = Branch(code="DST_BR_2", name="Destination Branch 2", location="Dest Loc", is_active=True)
    db_session.add(dest_branch)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Create draft transfer
    data = {
        "source_branch_id": setup_test_branch.branch_id,
        "dest_branch_id": dest_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "sent_quantity": 40}
        ]
    }
    create_resp = db_client.post("/api/v1/transfers/", json=data, headers=headers)
    transfer_id = create_resp.json()["transfer_id"]

    # Ship transfer
    ship_resp = db_client.post(f"/api/v1/transfers/{transfer_id}/ship", headers=headers)
    assert ship_resp.status_code == 200
    assert ship_resp.json()["status"] == "in_transit"

    # Verify stock on source branch decreased by 40 (100 -> 60)
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock.quantity == 60

    # Verify transaction type is OUT
    tx = db_session.query(InventoryTransaction).filter(
        InventoryTransaction.branch_id == setup_test_branch.branch_id,
        InventoryTransaction.item_id == setup_test_item.item_id,
        InventoryTransaction.transaction_type == "OUT"
    ).first()
    assert tx is not None
    assert tx.reference_type == "transfer"
    assert tx.quantity == 40

def test_ship_transfer_insufficient_stock(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
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

    dest_branch = Branch(code="DST_BR_3", name="Destination Branch 3", location="Dest Loc", is_active=True)
    db_session.add(dest_branch)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Try to ship 40 (only 10 available)
    data = {
        "source_branch_id": setup_test_branch.branch_id,
        "dest_branch_id": dest_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "sent_quantity": 40}
        ]
    }
    create_resp = db_client.post("/api/v1/transfers/", json=data, headers=headers)
    transfer_id = create_resp.json()["transfer_id"]

    ship_resp = db_client.post(f"/api/v1/transfers/{transfer_id}/ship", headers=headers)
    assert ship_resp.status_code == 400
    assert "Stok tidak mencukupi" in ship_resp.json()["detail"]

def test_receive_transfer_success_with_variance(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup stock
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

    dest_branch = Branch(code="DST_BR_4", name="Destination Branch 4", location="Dest Loc", is_active=True)
    db_session.add(dest_branch)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Ship
    data = {
        "source_branch_id": setup_test_branch.branch_id,
        "dest_branch_id": dest_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "sent_quantity": 50}
        ]
    }
    create_resp = db_client.post("/api/v1/transfers/", json=data, headers=headers)
    transfer = create_resp.json()
    transfer_id = transfer["transfer_id"]
    line_id = transfer["lines"][0]["line_id"]

    db_client.post(f"/api/v1/transfers/{transfer_id}/ship", headers=headers)

    # Receive 48 (Variance: shipped 50 - received 48 = 2 lost/damaged units)
    receive_data = {
        "received_notes": "Slight damage on 2 items",
        "lines": [
            {
                "line_id": line_id,
                "received_quantity": 48,
                "variance_notes": "2 rusak",
                "variance_reason": "Damaged in Transit"
            }
        ]
    }
    
    rec_resp = db_client.post(f"/api/v1/transfers/{transfer_id}/receive", json=receive_data, headers=headers)
    assert rec_resp.status_code == 200
    
    content = rec_resp.json()
    assert content["status"] == "received"
    assert content["lines"][0]["received_quantity"] == 48
    assert content["lines"][0]["variance_reason"] == "Damaged in Transit"

    # Verify destination branch stock has exactly 48
    dest_stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == dest_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert dest_stock.quantity == 48

    # Verify transaction type is IN
    tx = db_session.query(InventoryTransaction).filter(
        InventoryTransaction.branch_id == dest_branch.branch_id,
        InventoryTransaction.item_id == setup_test_item.item_id,
        InventoryTransaction.transaction_type == "IN"
    ).first()
    assert tx is not None
    assert tx.reference_type == "transfer"
    assert tx.quantity == 48

def test_cancel_in_transit_transfer(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Setup initial stock
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

    dest_branch = Branch(code="DST_BR_5", name="Destination Branch 5", location="Dest Loc", is_active=True)
    db_session.add(dest_branch)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    # Ship
    data = {
        "source_branch_id": setup_test_branch.branch_id,
        "dest_branch_id": dest_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "sent_quantity": 50}
        ]
    }
    create_resp = db_client.post("/api/v1/transfers/", json=data, headers=headers)
    transfer_id = create_resp.json()["transfer_id"]

    db_client.post(f"/api/v1/transfers/{transfer_id}/ship", headers=headers)

    # Cancel in-transit transfer
    cancel_data = {"cancellation_reason": "Order cancelled by buyer"}
    cancel_resp = db_client.post(f"/api/v1/transfers/{transfer_id}/cancel", json=cancel_data, headers=headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # Verify stock on source branch is restored to 100 (initially 100 -> shipped 50 -> cancelled 100)
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    assert stock.quantity == 100

def test_transfer_branch_restrictions(db_client: TestClient, db_session: Session, test_user: User, setup_test_item, setup_test_branch):
    # Create destination branch
    dest_branch = Branch(code="DST_BR_6", name="Destination Branch 6", location="Dest Loc", is_active=True)
    db_session.add(dest_branch)
    db_session.flush()

    # Assign test user to destination branch as branch head
    test_user.role = "branch_head"
    test_user.branch_id = dest_branch.branch_id
    db_session.commit()

    headers = get_auth_headers(test_user.user_id, "branch_head")

    # Try to create a transfer originating from the source branch (different branch)
    data = {
        "source_branch_id": setup_test_branch.branch_id,
        "dest_branch_id": dest_branch.branch_id,
        "lines": [
            {"item_id": setup_test_item.item_id, "sent_quantity": 25}
        ]
    }
    
    resp = db_client.post("/api/v1/transfers/", json=data, headers=headers)
    assert resp.status_code == 403
