from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.repositories.base import CRUDBase
from app.models.stock_in import StockInSession
from app.schemas.stock_in import StockInCreate
from typing import Optional, Any

class StockInRepository(CRUDBase[StockInSession, StockInCreate, Any]):
    def __init__(self, db: Session):
        super().__init__(StockInSession, db)

    def list_sessions(
        self,
        *,
        branch_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> list[StockInSession]:
        stmt = select(self.model)
        if branch_id is not None:
            stmt = stmt.where(self.model.branch_id == branch_id)
        if status is not None:
            stmt = stmt.where(self.model.status == status)
        stmt = stmt.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_sessions(
        self,
        *,
        branch_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> int:
        stmt = select(func.count(self.model.session_id))
        if branch_id is not None:
            stmt = stmt.where(self.model.branch_id == branch_id)
        if status is not None:
            stmt = stmt.where(self.model.status == status)
        return self.db.scalar(stmt) or 0
