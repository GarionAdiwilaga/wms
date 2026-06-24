import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import create_access_token, get_password_hash

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_create_user_super_admin(db_client: TestClient, db_session: Session, test_user: User, setup_test_branch):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "username": "new_staff_member",
        "password": "staffpassword123",
        "full_name": "New Staff Member",
        "role": "warehouse_staff",
        "branch_id": setup_test_branch.branch_id
    }
    
    response = db_client.post("/api/v1/users/", json=data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["username"] == "new_staff_member"
    assert content["full_name"] == "New Staff Member"
    assert content["role"] == "warehouse_staff"
    assert content["branch_id"] == setup_test_branch.branch_id

def test_create_user_unauthorized(db_client: TestClient, db_session: Session, test_user: User, setup_test_branch):
    # Create a branch head user in the database
    bh = User(
        username="bh_for_test",
        password_hash=get_password_hash("bh123"),
        full_name="Branch Head For Test",
        role="branch_head",
        branch_id=setup_test_branch.branch_id,
        is_active=True
    )
    db_session.add(bh)
    db_session.flush()

    headers = get_auth_headers(bh.user_id, "branch_head")
    data = {
        "username": "unauthorized_staff",
        "password": "staffpassword123",
        "full_name": "Unauthorized Staff",
        "role": "warehouse_staff",
        "branch_id": setup_test_branch.branch_id
    }
    
    response = db_client.post("/api/v1/users/", json=data, headers=headers)
    assert response.status_code == 403

def test_update_user_super_admin(db_client: TestClient, db_session: Session, test_user: User, setup_test_branch):
    # First create a user manually
    staff = User(
        username="staff_to_update",
        password_hash=get_password_hash("staff123"),
        full_name="Staff Initial Name",
        role="warehouse_staff",
        branch_id=setup_test_branch.branch_id,
        is_active=True
    )
    db_session.add(staff)
    db_session.flush()

    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "full_name": "Staff Updated Name",
        "role": "branch_head"
    }

    response = db_client.put(f"/api/v1/users/{staff.user_id}", json=data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["username"] == "staff_to_update"
    assert content["full_name"] == "Staff Updated Name"
    assert content["role"] == "branch_head"

def test_get_users(db_client: TestClient, test_user: User):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    response = db_client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1
