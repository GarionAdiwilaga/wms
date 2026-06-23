from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.repositories.base import CRUDBase
from app.models.transfer import Transfer
from app.schemas.transfer import TransferCreate
from typing import Optional, Any

class TransferRepository(CRUDBase[Transfer, TransferCreate, Any]):
    def __init__(self, db: Session):
        super().__init__(Transfer, db)

    def list_transfers(
        self,
        *,
        branch_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> list[Transfer]:
        stmt = select(self.model)
        
        if branch_id is not None:
            stmt = stmt.where(
                or_(
                    self.model.source_branch_id == branch_id,
                    self.model.dest_branch_id == branch_id
                )
            )
        if status is not None:
            stmt = stmt.where(self.model.status == status)
            
        stmt = stmt.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_transfers(
        self,
        *,
        branch_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> int:
        stmt = select(func.count(self.model.transfer_id))
        
        if branch_id is not None:
            stmt = stmt.where(
                or_(
                    self.model.source_branch_id == branch_id,
                    self.model.dest_branch_id == branch_id
                )
            )
        if status is not None:
            stmt = stmt.where(self.model.status == status)
            
        return self.db.scalar(stmt) or 0
