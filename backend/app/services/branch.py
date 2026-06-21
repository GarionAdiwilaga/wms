from app.services.base import ServiceBase
from app.repositories.branch import BranchRepository
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate
from app.models.user import User
from typing import Any
from sqlalchemy.orm import Session

class BranchService(ServiceBase[BranchRepository, Branch, BranchCreate, BranchUpdate]):
    def __init__(self, db: Session):
        super().__init__(BranchRepository(db))

    def create(self, obj_in: BranchCreate, current_user: User) -> Branch:
        self.check_uniqueness("code", obj_in.code)
        self.check_uniqueness("name", obj_in.name)
        return super().create(obj_in, current_user)

    def update(self, id: Any, obj_in: BranchUpdate, current_user: User) -> Branch:
        if obj_in.code is not None:
            self.check_uniqueness("code", obj_in.code, exclude_id=id)
        if obj_in.name is not None:
            self.check_uniqueness("name", obj_in.name, exclude_id=id)
        return super().update(id, obj_in, current_user)
