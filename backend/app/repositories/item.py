from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from app.repositories.base import CRUDBase
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate
from app.models.category import Category
from app.models.supplier import Supplier
from typing import Optional

class ItemRepository(CRUDBase[Item, ItemCreate, ItemUpdate]):
    def __init__(self, db: Session):
        super().__init__(Item, db)

    def search(
        self, 
        q: Optional[str] = None, 
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> list[Item]:
        stmt = select(self.model)
        
        if q:
            search_term = f"%{q}%"
            stmt = stmt.outerjoin(self.model.category).outerjoin(self.model.supplier)
            stmt = stmt.where(
                or_(
                    self.model.item_code.ilike(search_term),
                    self.model.manual_code.ilike(search_term),
                    self.model.name.ilike(search_term),
                    Category.name.ilike(search_term),
                    Supplier.name.ilike(search_term)
                )
            )
            
        if category_id is not None:
            stmt = stmt.where(self.model.category_id == category_id)
        if supplier_id is not None:
            stmt = stmt.where(self.model.supplier_id == supplier_id)
        if is_active is not None:
            stmt = stmt.where(self.model.is_active == is_active)
            
        stmt = stmt.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())
        
    def count(
        self, 
        q: Optional[str] = None,
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> int:
        stmt = select(func.count(self.model.item_id))
        
        if q:
            search_term = f"%{q}%"
            stmt = stmt.outerjoin(self.model.category).outerjoin(self.model.supplier)
            stmt = stmt.where(
                or_(
                    self.model.item_code.ilike(search_term),
                    self.model.manual_code.ilike(search_term),
                    self.model.name.ilike(search_term),
                    Category.name.ilike(search_term),
                    Supplier.name.ilike(search_term)
                )
            )
            
        if category_id is not None:
            stmt = stmt.where(self.model.category_id == category_id)
        if supplier_id is not None:
            stmt = stmt.where(self.model.supplier_id == supplier_id)
        if is_active is not None:
            stmt = stmt.where(self.model.is_active == is_active)
            
        return self.db.scalar(stmt) or 0
