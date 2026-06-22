import pytest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.services.inventory_service import inventory_service, InsufficientStockError
from app.schemas.inventory import StockChangeLine
from app.models.inventory import InventoryTransaction, BranchStock

def test_execute_stock_changes_additive(db_session: Session, test_user, setup_test_item, setup_test_branch):
    lines = [
        StockChangeLine(item_id=setup_test_item.item_id, quantity=100)
    ]
    
    transactions = inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="IN",
        reference_type="initial_load",
        reference_id=None,
        document_no="INIT-001",
        lines=lines,
        notes="Test load",
        created_by=test_user.user_id
    )
    
    assert len(transactions) == 1
    assert transactions[0].transaction_type == "IN"
    assert transactions[0].quantity == 100
    assert transactions[0].reference_type == "initial_load"
    
    # Check cache
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    
    assert stock is not None
    assert stock.quantity == 100

def test_execute_stock_changes_subtractive(db_session: Session, test_user, setup_test_item, setup_test_branch):
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
    
    # Subtract stock
    lines = [StockChangeLine(item_id=setup_test_item.item_id, quantity=20)]
    inventory_service.execute_stock_changes(
        db=db_session,
        branch_id=setup_test_branch.branch_id,
        transaction_type="OUT",
        reference_type="manual",
        reference_id=None,
        document_no="OUT-001",
        lines=lines,
        notes="Test out",
        created_by=test_user.user_id
    )
    
    stock = db_session.query(BranchStock).filter(
        BranchStock.branch_id == setup_test_branch.branch_id,
        BranchStock.item_id == setup_test_item.item_id
    ).first()
    
    assert stock.quantity == 30

def test_execute_stock_changes_insufficient_stock(db_session: Session, test_user, setup_test_item, setup_test_branch):
    # Add 10
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
    
    # Try to subtract 15
    with pytest.raises(InsufficientStockError):
        inventory_service.execute_stock_changes(
            db=db_session,
            branch_id=setup_test_branch.branch_id,
            transaction_type="OUT",
            reference_type="manual",
            reference_id=None,
            document_no=None,
            lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=15)],
            notes=None,
            created_by=test_user.user_id
        )

def test_execute_stock_changes_invalid_transaction_type(db_session: Session, test_user, setup_test_item, setup_test_branch):
    with pytest.raises(ValueError):
        inventory_service.execute_stock_changes(
            db=db_session,
            branch_id=setup_test_branch.branch_id,
            transaction_type="INVALID",
            reference_type="manual",
            reference_id=None,
            document_no=None,
            lines=[StockChangeLine(item_id=setup_test_item.item_id, quantity=10)],
            notes=None,
            created_by=test_user.user_id
        )
