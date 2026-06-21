from fastapi import APIRouter, Depends
from typing import List
from app.schemas.supplier import SupplierResponse, SupplierCreate, SupplierUpdate
from app.services.supplier import SupplierService
from app.core.dependencies import SessionDep, ActiveUserDep, require_role
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(db: SessionDep, current_user: ActiveUserDep):
    """Retrieve all suppliers."""
    service = SupplierService(db)
    return service.get_multi()

@router.get("/{id}", response_model=SupplierResponse)
def get_supplier(id: int, db: SessionDep, current_user: ActiveUserDep):
    """Retrieve a specific supplier by ID."""
    service = SupplierService(db)
    return service.get(id)

@router.post("/", response_model=SupplierResponse)
def create_supplier(
    obj_in: SupplierCreate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Create a new supplier (Super Admin only)."""
    service = SupplierService(db)
    return service.create(obj_in, current_user)

@router.put("/{id}", response_model=SupplierResponse)
def update_supplier(
    id: int,
    obj_in: SupplierUpdate,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Update a supplier (Super Admin only)."""
    service = SupplierService(db)
    return service.update(id, obj_in, current_user)

@router.delete("/{id}", response_model=SupplierResponse)
def delete_supplier(
    id: int,
    db: SessionDep,
    current_user: User = Depends(require_role(["super_admin"]))
):
    """Delete a supplier (Super Admin only)."""
    service = SupplierService(db)
    return service.delete(id, current_user)
