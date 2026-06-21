from fastapi import APIRouter, Depends
from typing import List
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate
from app.services.category import CategoryService
from app.core.dependencies import SessionDep, ActiveUserDep, require_role
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: SessionDep, current_user: ActiveUserDep):
    """Retrieve all categories."""
    service = CategoryService(db)
    return service.get_multi()

@router.get("/{id}", response_model=CategoryResponse)
def get_category(id: int, db: SessionDep, current_user: ActiveUserDep):
    """Retrieve a specific category by ID."""
    service = CategoryService(db)
    return service.get(id)

@router.post("/", response_model=CategoryResponse)
def create_category(
    obj_in: CategoryCreate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Create a new category (Super Admin only)."""
    service = CategoryService(db)
    return service.create(obj_in, current_user)

@router.put("/{id}", response_model=CategoryResponse)
def update_category(
    id: int,
    obj_in: CategoryUpdate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Update a category (Super Admin only)."""
    service = CategoryService(db)
    return service.update(id, obj_in, current_user)

@router.delete("/{id}", response_model=CategoryResponse)
def delete_category(
    id: int,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Delete a category (Super Admin only)."""
    service = CategoryService(db)
    return service.delete(id, current_user)
