from app.repositories.base import CRUDBase
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from sqlalchemy.orm import Session

class CategoryRepository(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    def __init__(self, db: Session):
        super().__init__(Category, db)
