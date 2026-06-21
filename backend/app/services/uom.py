from app.services.base import ServiceBase
from app.repositories.uom import UOMRepository
from app.models.uom import UOM
from app.schemas.uom import UOMCreate, UOMUpdate
from app.models.user import User
from typing import Any
from sqlalchemy.orm import Session

class UOMService(ServiceBase[UOMRepository, UOM, UOMCreate, UOMUpdate]):
    def __init__(self, db: Session):
        super().__init__(UOMRepository(db))

    def create(self, obj_in: UOMCreate, current_user: User) -> UOM:
        self.check_uniqueness("code", obj_in.code)
        self.check_uniqueness("name", obj_in.name)
        return super().create(obj_in, current_user)

    def update(self, id: Any, obj_in: UOMUpdate, current_user: User) -> UOM:
        if obj_in.code is not None:
            self.check_uniqueness("code", obj_in.code, exclude_id=id)
        if obj_in.name is not None:
            self.check_uniqueness("name", obj_in.name, exclude_id=id)
        return super().update(id, obj_in, current_user)
