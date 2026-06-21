from fastapi import APIRouter, Depends
from typing import List
from app.schemas.uom import UOMResponse, UOMCreate, UOMUpdate
from app.services.uom import UOMService
from app.core.dependencies import SessionDep, ActiveUserDep, require_role
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[UOMResponse])
def get_uoms(db: SessionDep, current_user: ActiveUserDep):
    """Retrieve all UOMs."""
    service = UOMService(db)
    return service.get_multi()

@router.get("/{id}", response_model=UOMResponse)
def get_uom(id: int, db: SessionDep, current_user: ActiveUserDep):
    """Retrieve a specific UOM by ID."""
    service = UOMService(db)
    return service.get(id)

@router.post("/", response_model=UOMResponse)
def create_uom(
    obj_in: UOMCreate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Create a new UOM (Super Admin only)."""
    service = UOMService(db)
    return service.create(obj_in, current_user)

@router.put("/{id}", response_model=UOMResponse)
def update_uom(
    id: int,
    obj_in: UOMUpdate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Update a UOM (Super Admin only)."""
    service = UOMService(db)
    return service.update(id, obj_in, current_user)

@router.delete("/{id}", response_model=UOMResponse)
def delete_uom(
    id: int,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Delete a UOM (Super Admin only)."""
    service = UOMService(db)
    return service.delete(id, current_user)
