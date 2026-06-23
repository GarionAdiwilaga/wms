import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.uom import UOM
from app.core.security import create_access_token
import io
from unittest.mock import patch

def get_auth_headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role, token_version=1)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def master_data(db_session: Session):
    cat = Category(code="CAT_TEST1", name="Category Test 1")
    sup = Supplier(code="SUP_TEST1", name="Supplier Test 1")
    uom = UOM(code="UOM_TEST1", name="Test UOM")
    db_session.add_all([cat, sup, uom])
    db_session.flush()
    return {"category_id": cat.category_id, "supplier_id": sup.supplier_id, "uom_id": uom.uom_id}

def test_create_item(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    
    data = {
        "name": "Test Item",
        "description": "A test item",
        "uom_id": master_data["uom_id"],
        "minimum_stock": 10,
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "001"
    }
    
    resp = db_client.post("/api/v1/items/", json=data, headers=headers)
    assert resp.status_code == 201
    content = resp.json()
    assert content["item_code"] == "CAT_TEST1-SUP_TEST1-001"
    assert content["name"] == "Test Item"
    assert content["minimum_stock"] == 10

def test_create_item_duplicate_code(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "name": "Test Item",
        "uom_id": master_data["uom_id"],
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "002"
    }
    db_client.post("/api/v1/items/", json=data, headers=headers)
    
    resp = db_client.post("/api/v1/items/", json=data, headers=headers)
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]

def test_update_item_immutability(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "name": "Test Item",
        "uom_id": master_data["uom_id"],
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "003"
    }
    create_resp = db_client.post("/api/v1/items/", json=data, headers=headers)
    item_id = create_resp.json()["item_id"]
    
    update_data = {
        "name": "Updated Name",
        "category_id": master_data["category_id"],
        "manual_code": "004"
    }
    update_resp = db_client.put(f"/api/v1/items/{item_id}", json=update_data, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Updated Name"
    assert update_resp.json()["item_code"] == "CAT_TEST1-SUP_TEST1-003"
    assert "manual_code" in update_resp.json()
    assert update_resp.json()["manual_code"] == "003"

def test_delete_item_is_disabled(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "name": "Test Item",
        "uom_id": master_data["uom_id"],
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "005"
    }
    create_resp = db_client.post("/api/v1/items/", json=data, headers=headers)
    item_id = create_resp.json()["item_id"]
    
    delete_resp = db_client.delete(f"/api/v1/items/{item_id}", headers=headers)
    assert delete_resp.status_code == 405

def test_upload_image(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "name": "Test Item Image",
        "uom_id": master_data["uom_id"],
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "006"
    }
    create_resp = db_client.post("/api/v1/items/", json=data, headers=headers)
    item_id = create_resp.json()["item_id"]
    
    file_content = b"fake image content"
    files = {"file": ("test.png", io.BytesIO(file_content), "image/png")}
    
    with patch("app.services.item.open", create=True), patch("app.services.item.shutil.copyfileobj"), patch("app.services.item.os.makedirs"):
        upload_resp = db_client.post(f"/api/v1/items/{item_id}/image", files=files, headers=headers)
    assert upload_resp.status_code == 200
    assert upload_resp.json()["image_path"].startswith("/uploads/items/")
    assert upload_resp.json()["image_url"].startswith("http")

def test_lookup_item(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "name": "Test Item Lookup",
        "uom_id": master_data["uom_id"],
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "007"
    }
    db_client.post("/api/v1/items/", json=data, headers=headers)
    
    resp = db_client.get("/api/v1/items/lookup?item_code=CAT_TEST1-SUP_TEST1-007", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Item Lookup"

def test_search_item(db_client: TestClient, db_session: Session, test_user: User, master_data: dict):
    headers = get_auth_headers(test_user.user_id, "super_admin")
    data = {
        "name": "Unique Searchable Name",
        "uom_id": master_data["uom_id"],
        "category_id": master_data["category_id"],
        "supplier_id": master_data["supplier_id"],
        "manual_code": "SRCH1"
    }
    db_client.post("/api/v1/items/", json=data, headers=headers)
    
    resp = db_client.get("/api/v1/items/?q=Unique", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1
    assert resp.json()["data"][0]["item_code"] == "CAT_TEST1-SUP_TEST1-SRCH1"
