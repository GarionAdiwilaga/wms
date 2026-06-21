from app.services.base import ServiceBase
from app.repositories.supplier import SupplierRepository
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.models.user import User
from typing import Any
from sqlalchemy.orm import Session

class SupplierService(ServiceBase[SupplierRepository, Supplier, SupplierCreate, SupplierUpdate]):
    def __init__(self, db: Session):
        super().__init__(SupplierRepository(db))

    def create(self, obj_in: SupplierCreate, current_user: User) -> Supplier:
        self.check_uniqueness("code", obj_in.code)
        self.check_uniqueness("name", obj_in.name)
        return super().create(obj_in, current_user)

    def update(self, id: Any, obj_in: SupplierUpdate, current_user: User) -> Supplier:
        if obj_in.code is not None:
            self.check_uniqueness("code", obj_in.code, exclude_id=id)
        if obj_in.name is not None:
            self.check_uniqueness("name", obj_in.name, exclude_id=id)
        return super().update(id, obj_in, current_user)
