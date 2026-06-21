import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.branch import Branch
from app.models.user import User
from app.core.security import create_access_token

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

def test_create_branch_super_admin(db_client: TestClient, db_session: Session, test_user: User):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {"code": "BR001", "name": "Main Branch", "location": "Downtown"}
    
    response = db_client.post("/api/v1/branches/", json=data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["code"] == "BR001"
    assert content["name"] == "Main Branch"
    assert content["location"] == "Downtown"

def test_create_branch_uniqueness(db_client: TestClient, db_session: Session, test_user: User):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    # First create
    db_client.post("/api/v1/branches/", json={"code": "BR002", "name": "South Branch"}, headers=headers)
    # Second create with same code but different case
    response = db_client.post("/api/v1/branches/", json={"code": "br002", "name": "Another Branch"}, headers=headers)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_get_branches(db_client: TestClient, db_session: Session, test_user: User):
    headers = get_auth_headers(test_user.user_id, "branch_head")
    response = db_client.get("/api/v1/branches/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_update_branch(db_client: TestClient, db_session: Session, test_user: User):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    # Create first
    resp = db_client.post("/api/v1/branches/", json={"code": "BR003", "name": "East Branch"}, headers=headers)
    branch_id = resp.json()["branch_id"]
    
    # Update
    update_resp = db_client.put(f"/api/v1/branches/{branch_id}", json={"name": "East Coast Branch"}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "East Coast Branch"

def test_delete_branch_unauthorized(db_client: TestClient, db_session: Session):
    # Create a branch first
    branch = Branch(code="TESTBR", name="Test Branch", location="Test Location")
    db_session.add(branch)
    db_session.flush()

    # Create a warehouse staff user
    from app.core.security import get_password_hash
    staff = User(
        username="staff_test",
        password_hash=get_password_hash("staff123"),
        full_name="Staff Test",
        role="warehouse_staff",
        branch_id=branch.branch_id,
        is_active=True
    )
    db_session.add(staff)
    db_session.flush()

    headers = get_auth_headers(staff.user_id, "warehouse_staff")
    response = db_client.delete(f"/api/v1/branches/{branch.branch_id}", headers=headers)
    assert response.status_code == 403
