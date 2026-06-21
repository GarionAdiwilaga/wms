from fastapi import APIRouter, Depends
from typing import List
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.services.user import UserService
from app.core.dependencies import SessionDep, ActiveUserDep, require_role
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_users(db: SessionDep, current_user: ActiveUserDep):
    """Retrieve all users."""
    service = UserService(db)
    return service.get_multi()

@router.get("/{id}", response_model=UserResponse)
def get_user(id: int, db: SessionDep, current_user: ActiveUserDep):
    """Retrieve a specific user by ID."""
    service = UserService(db)
    return service.get(id)

@router.post("/", response_model=UserResponse)
def create_user(
    obj_in: UserCreate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Create a new user (Super Admin only)."""
    service = UserService(db)
    return service.create(obj_in, current_user)

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    obj_in: UserUpdate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Update a user (Super Admin only)."""
    service = UserService(db)
    return service.update(id, obj_in, current_user)

@router.delete("/{id}", response_model=UserResponse)
def delete_user(
    id: int,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Delete a user (Super Admin only)."""
    service = UserService(db)
    return service.delete(id, current_user)
