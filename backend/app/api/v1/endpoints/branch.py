from fastapi import APIRouter, Depends
from typing import List
from app.schemas.branch import BranchResponse, BranchCreate, BranchUpdate
from app.services.branch import BranchService
from app.core.dependencies import SessionDep, ActiveUserDep, require_role
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[BranchResponse])
def get_branches(db: SessionDep, current_user: ActiveUserDep):
    """Retrieve all branches."""
    service = BranchService(db)
    return service.get_multi()

@router.get("/{id}", response_model=BranchResponse)
def get_branch(id: int, db: SessionDep, current_user: ActiveUserDep):
    """Retrieve a specific branch by ID."""
    service = BranchService(db)
    return service.get(id)

@router.post("/", response_model=BranchResponse)
def create_branch(
    obj_in: BranchCreate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Create a new branch (Super Admin only)."""
    service = BranchService(db)
    return service.create(obj_in, current_user)

@router.put("/{id}", response_model=BranchResponse)
def update_branch(
    id: int,
    obj_in: BranchUpdate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Update a branch (Super Admin only)."""
    service = BranchService(db)
    return service.update(id, obj_in, current_user)

@router.delete("/{id}", response_model=BranchResponse)
def delete_branch(
    id: int,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Delete a branch (Super Admin only)."""
    service = BranchService(db)
    return service.delete(id, current_user)
