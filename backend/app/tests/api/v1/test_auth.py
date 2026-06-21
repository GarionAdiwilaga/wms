from datetime import datetime, timezone
import pytest
from app.models.user import User
from app.core.security import get_password_hash, create_access_token

def mock_active_user():
    user = User(
        user_id=1,
        username="testuser",
        password_hash=get_password_hash("password123"),
        full_name="Test User",
        role="warehouse_staff",
        branch_id=None,
        token_version=1,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    return user

def mock_inactive_user():
    user = mock_active_user()
    user.is_active = False
    return user

def test_login_success(client, mock_db_session):
    # Setup mock user
    user = mock_active_user()
    mock_db_session.scalars.return_value.first.return_value = user

    response = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "password123",
        "remember_me": False
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "testuser"

def test_login_invalid_password(client, mock_db_session):
    user = mock_active_user()
    mock_db_session.scalars.return_value.first.return_value = user

    response = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "wrongpassword",
        "remember_me": False
    })
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

def test_login_inactive_user(client, mock_db_session):
    user = mock_inactive_user()
    mock_db_session.scalars.return_value.first.return_value = user

    response = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "password123",
        "remember_me": False
    })
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"

def test_get_current_user_valid_token(client, mock_db_session):
    user = mock_active_user()
    mock_db_session.get.return_value = user
    
    token = create_access_token(user_id=user.user_id, role=user.role, token_version=user.token_version)
    
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"

def test_get_current_user_invalid_token(client, mock_db_session):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
