from app.services.base import ServiceBase
from app.repositories.category import CategoryRepository
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.models.user import User
from typing import Any
from sqlalchemy.orm import Session

class CategoryService(ServiceBase[CategoryRepository, Category, CategoryCreate, CategoryUpdate]):
    def __init__(self, db: Session):
        super().__init__(CategoryRepository(db))

    def create(self, obj_in: CategoryCreate, current_user: User) -> Category:
        self.check_uniqueness("name", obj_in.name)
        return super().create(obj_in, current_user)

    def update(self, id: Any, obj_in: CategoryUpdate, current_user: User) -> Category:
        if obj_in.name is not None:
            self.check_uniqueness("name", obj_in.name, exclude_id=id)
        return super().update(id, obj_in, current_user)
