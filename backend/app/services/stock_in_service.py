from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.services.base import ServiceBase
from app.repositories.stock_in import StockInRepository
from app.models.stock_in import StockInSession, StockInLine
from app.models.item import Item
from app.models.branch import Branch
from app.schemas.stock_in import StockInCreate
from app.schemas.inventory import StockChangeLine
from app.services.inventory_service import inventory_service, InsufficientStockError
from app.models.user import User

class StockInService(ServiceBase[StockInRepository, StockInSession, StockInCreate, Any]):
    def __init__(self, repository: StockInRepository, db: Session):
        super().__init__(repository=repository)
        self.db = db

    def create(self, obj_in: StockInCreate, current_user: User) -> StockInSession:
        # 1. Validate branch_id
        branch = self.db.get(Branch, obj_in.branch_id)
        if not branch:
            raise HTTPException(status_code=400, detail="Branch tidak ditemukan")
        if not branch.is_active:
            raise HTTPException(status_code=400, detail="Branch tidak aktif")

        # 2. Check for empty lines
        if not obj_in.lines:
            raise HTTPException(status_code=400, detail="Baris item tidak boleh kosong")

        # 3. Check for duplicate items in lines
        item_ids = [line.item_id for line in obj_in.lines]
        if len(item_ids) != len(set(item_ids)):
            raise HTTPException(status_code=400, detail="Duplicate items in the stock-in request are not allowed")

        # 4. Check that all items exist and are active
        items = self.db.query(Item).filter(Item.item_id.in_(item_ids), Item.is_active == True).all()
        found_item_ids = {item.item_id for item in items}
        for item_id in item_ids:
            if item_id not in found_item_ids:
                raise HTTPException(status_code=400, detail=f"Item dengan ID {item_id} tidak ditemukan atau tidak aktif")

        # 5. Create session object
        session_data = obj_in.model_dump(exclude={"lines"})
        db_session_obj = StockInSession(
            **session_data,
            created_by=current_user.user_id
        )
        self.db.add(db_session_obj)
        self.db.flush()  # Generate session_id

        # 6. Add lines
        for line in obj_in.lines:
            db_line = StockInLine(
                session_id=db_session_obj.session_id,
                item_id=line.item_id,
                quantity=line.quantity
            )
            self.db.add(db_line)
        self.db.flush()

        # 7. Execute stock changes if completed
        if db_session_obj.status == "completed":
            # Map lines to StockChangeLine schema
            change_lines = [
                StockChangeLine(item_id=line.item_id, quantity=line.quantity)
                for line in obj_in.lines
            ]
            inventory_service.execute_stock_changes(
                db=self.db,
                branch_id=db_session_obj.branch_id,
                transaction_type="IN",
                reference_type="stock_in",
                reference_id=db_session_obj.session_id,
                document_no=db_session_obj.reference_no,
                lines=change_lines,
                notes=db_session_obj.notes,
                created_by=current_user.user_id
            )
        else:
            # If not completed (e.g. draft), commit manually
            self.db.commit()

        # Refresh to load relationships
        self.db.refresh(db_session_obj)

        # Log creation to audit service
        self.audit_service.log_create(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=db_session_obj.session_id,
            new_values=obj_in.model_dump()
        )
        self.db.commit()

        return db_session_obj
