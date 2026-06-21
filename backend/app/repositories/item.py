from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from app.repositories.base import CRUDBase
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate
from typing import Optional

class ItemRepository(CRUDBase[Item, ItemCreate, ItemUpdate]):
    def __init__(self, db: Session):
        super().__init__(Item, db)

    def search(
        self, 
        q: Optional[str] = None, 
        skip: int = 0, 
        limit: int = 100
    ) -> list[Item]:
        stmt = select(self.model)
        
        if q:
            search_term = f"%{q}%"
            stmt = stmt.where(
                or_(
                    self.model.item_code.ilike(search_term),
                    self.model.manual_code.ilike(search_term),
                    self.model.name.ilike(search_term)
                )
            )
            
        stmt = stmt.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())
        
    def count(self, q: Optional[str] = None) -> int:
        stmt = select(func.count(self.model.item_id))
        
        if q:
            search_term = f"%{q}%"
            stmt = stmt.where(
                or_(
                    self.model.item_code.ilike(search_term),
                    self.model.manual_code.ilike(search_term),
                    self.model.name.ilike(search_term)
                )
            )
            
        return self.db.scalar(stmt) or 0
