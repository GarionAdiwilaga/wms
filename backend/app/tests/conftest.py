import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.core.dependencies import get_db
from app.db.session import engine, SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.models.item import Item
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.uom import UOM
from app.models.branch import Branch
from typing import Generator
from sqlalchemy.orm import Session

@pytest.fixture
def mock_db_session():
    session = MagicMock()
    yield session

@pytest.fixture
def client(mock_db_session):
    def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Provides a transactional database session rolled back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    
    # Enable nested transaction savepoint so application-level commits do not persist
    session.begin_nested()
    
    yield session
    
    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def test_user(db_session: Session) -> User:
    """Creates a temporary Super Admin user in the database."""
    user = User(
        username="admin_test",
        password_hash=get_password_hash("admin123"),
        full_name="Admin Test",
        role="super_admin",
        branch_id=None,
        is_active=True
    )
    db_session.add(user)
    db_session.flush()
    return user

@pytest.fixture(scope="function")
def db_client(db_session: Session) -> Generator[TestClient, None, None]:
    """Provides a TestClient using the real transactional database session."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def setup_test_branch(db_session: Session) -> Branch:
    branch = Branch(code="TST", name="Test Branch", location="Test Location", is_active=True)
    db_session.add(branch)
    db_session.flush()
    return branch

@pytest.fixture(scope="function")
def setup_test_item(db_session: Session) -> Item:
    cat = Category(code="CAT_TST", name="Category Test")
    sup = Supplier(code="SUP_TST", name="Supplier Test")
    uom = UOM(code="UOM_TST", name="UOM Test")
    db_session.add_all([cat, sup, uom])
    db_session.flush()

    item = Item(
        item_code="CAT_TST-SUP_TST-001",
        manual_code="001",
        name="Test Item",
        category_id=cat.category_id,
        supplier_id=sup.supplier_id,
        uom_id=uom.uom_id,
        minimum_stock=10,
        is_active=True
    )
    db_session.add(item)
    db_session.flush()
    return item
