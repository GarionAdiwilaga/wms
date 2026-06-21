import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.core.dependencies import get_db
from app.db.session import engine, SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
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

