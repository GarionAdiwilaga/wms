from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.services.base import ServiceBase
from app.repositories.stock_opname import StockOpnameRepository
from app.models.stock_opname import StockOpnameSession, StockOpnameLine
from app.models.branch import Branch
from app.models.category import Category
from app.models.item import Item
from app.models.inventory import BranchStock
from app.schemas.stock_opname import StockOpnameCreate, StockOpnameUpdate
from app.schemas.inventory import StockChangeLine
from app.services.inventory_service import inventory_service
from app.models.user import User

class OpnameService(ServiceBase[StockOpnameRepository, StockOpnameSession, StockOpnameCreate, Any]):
    def __init__(self, repository: StockOpnameRepository, db: Session):
        super().__init__(repository=repository)
        self.db = db

    def create(self, obj_in: StockOpnameCreate, current_user: User) -> StockOpnameSession:
        # 1. Validate branch
        branch = self.db.get(Branch, obj_in.branch_id)
        if not branch or not branch.is_active:
            raise HTTPException(status_code=400, detail="Branch tidak ditemukan atau tidak aktif")

        # 2. Validate category (mandatory in category-scoped workflow)
        if obj_in.category_id is None:
            raise HTTPException(status_code=400, detail="Kategori wajib dipilih untuk sesi opname")

        category = self.db.get(Category, obj_in.category_id)
        if not category or not category.is_active:
            raise HTTPException(status_code=400, detail="Kategori tidak ditemukan atau tidak aktif")

        # Ensure category has active items
        active_item_exists = self.db.query(Item).filter(
            Item.category_id == obj_in.category_id,
            Item.is_active == True
        ).first()
        if not active_item_exists:
            raise HTTPException(status_code=400, detail="Kategori yang dipilih tidak memiliki item aktif")

        # 3. Validate line items
        if obj_in.lines:
            item_ids = [line.item_id for line in obj_in.lines]
            if len(item_ids) != len(set(item_ids)):
                raise HTTPException(status_code=400, detail="Item duplikat tidak diperbolehkan dalam baris opname")

            items = self.db.query(Item).filter(Item.item_id.in_(item_ids), Item.is_active == True).all()
            found_items_map = {item.item_id: item for item in items}
            
            for item_id in item_ids:
                if item_id not in found_items_map:
                    raise HTTPException(status_code=400, detail=f"Item dengan ID {item_id} tidak ditemukan atau tidak aktif")
                
                item = found_items_map[item_id]
                if item.category_id != obj_in.category_id:
                    raise HTTPException(status_code=400, detail=f"Item '{item.name}' ({item.item_code}) tidak termasuk dalam kategori '{category.name}'")

        # 4. Create Session
        db_session = StockOpnameSession(
            branch_id=obj_in.branch_id,
            category_id=obj_in.category_id,
            status=obj_in.status,
            notes=obj_in.notes,
            created_by=current_user.user_id
        )
        self.db.add(db_session)
        self.db.flush()

        # 5. Create Lines (Snapshot current stock level)
        if obj_in.lines:
            stocks = self.db.query(BranchStock).filter(
                BranchStock.branch_id == db_session.branch_id,
                BranchStock.item_id.in_(item_ids)
            ).all()
            stock_map = {s.item_id: s.quantity for s in stocks}

            for line in obj_in.lines:
                current_qty = stock_map.get(line.item_id, 0)
                # Default physical quantity to system quantity if it is 0 at creation
                phys_qty = line.physical_quantity if line.physical_quantity != 0 else current_qty
                db_line = StockOpnameLine(
                    session_id=db_session.session_id,
                    item_id=line.item_id,
                    system_quantity=current_qty,
                    physical_quantity=phys_qty,
                    variance=phys_qty - current_qty
                )
                self.db.add(db_line)
        self.db.flush()

        # 6. If completed immediately, run complete logic
        if db_session.status == "completed":
            # Set status to draft temporarily so complete method can run
            db_session.status = "draft"
            self.db.commit()
            return self.complete(db_session.session_id, current_user)

        self.db.commit()
        self.db.refresh(db_session)

        # Log creation
        self.audit_service.log_create(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=db_session.session_id,
            new_values={"branch_id": db_session.branch_id, "category_id": db_session.category_id, "status": db_session.status}
        )
        self.db.commit()

        return db_session

    def update(self, id: int, obj_in: StockOpnameUpdate, current_user: User) -> StockOpnameSession:
        session = self.get(id)
        if session.status != "draft":
            raise HTTPException(status_code=400, detail="Hanya opname dengan status 'draft' yang dapat diubah")

        old_values = {
            "notes": session.notes,
            "lines": [{"item_id": line.item_id, "physical_quantity": line.physical_quantity} for line in session.lines]
        }

        if obj_in.notes is not None:
            session.notes = obj_in.notes

        if obj_in.lines is not None:
            # Map existing lines to preserve their system_quantity snapshot
            existing_snapshots = {line.item_id: line.system_quantity for line in session.lines}

            # Delete old lines
            for line in session.lines:
                self.db.delete(line)
            self.db.flush()

            # Validate and create new lines
            item_ids = [line.item_id for line in obj_in.lines]
            if len(item_ids) != len(set(item_ids)):
                raise HTTPException(status_code=400, detail="Item duplikat tidak diperbolehkan")

            items = self.db.query(Item).filter(Item.item_id.in_(item_ids), Item.is_active == True).all()
            found_items_map = {item.item_id: item for item in items}
            for item_id in item_ids:
                if item_id not in found_items_map:
                    raise HTTPException(status_code=400, detail=f"Item dengan ID {item_id} tidak ditemukan atau tidak aktif")
                
                item = found_items_map[item_id]
                if session.category_id is not None and item.category_id != session.category_id:
                    raise HTTPException(status_code=400, detail=f"Item '{item.name}' tidak termasuk dalam kategori")

            # Query stock only for items that are new to this session
            new_item_ids = [item_id for item_id in item_ids if item_id not in existing_snapshots]
            new_stock_map = {}
            if new_item_ids:
                stocks = self.db.query(BranchStock).filter(
                    BranchStock.branch_id == session.branch_id,
                    BranchStock.item_id.in_(new_item_ids)
                ).all()
                new_stock_map = {s.item_id: s.quantity for s in stocks}

            for line in obj_in.lines:
                if line.item_id in existing_snapshots:
                    # Existing item: keep the snapshot
                    current_qty = existing_snapshots[line.item_id]
                    phys_qty = line.physical_quantity
                else:
                    # New item: capture stock level snapshot
                    current_qty = new_stock_map.get(line.item_id, 0)
                    # Default physical quantity to system quantity if it is 0 at first addition
                    phys_qty = line.physical_quantity if line.physical_quantity != 0 else current_qty

                db_line = StockOpnameLine(
                    session_id=session.session_id,
                    item_id=line.item_id,
                    system_quantity=current_qty,
                    physical_quantity=phys_qty,
                    variance=phys_qty - current_qty
                )
                self.db.add(db_line)

        self.db.commit()
        self.db.refresh(session)

        # Log update
        new_values = {
            "notes": session.notes,
            "lines": [{"item_id": line.item_id, "physical_quantity": line.physical_quantity} for line in session.lines]
        }
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=session.session_id,
            old_values=old_values,
            new_values=new_values
        )
        self.db.commit()

        return session

    def complete(self, id: int, current_user: User) -> StockOpnameSession:
        session = self.get(id)
        if session.status != "draft":
            raise HTTPException(status_code=400, detail="Hanya opname dengan status 'draft' yang dapat diselesaikan")
            
        if not session.lines:
            raise HTTPException(status_code=400, detail="Tidak dapat menyelesaikan opname karena tidak ada barang yang diproses")

        # 1. Gather positive and negative adjustment lines based on immutable system_quantity snapshots
        plus_lines = []
        minus_lines = []

        for line in session.lines:
            # Treat system_quantity as immutable. Calculate variance using stored system_quantity.
            line.variance = line.physical_quantity - line.system_quantity

            if line.variance > 0:
                plus_lines.append(StockChangeLine(item_id=line.item_id, quantity=line.variance))
            elif line.variance < 0:
                minus_lines.append(StockChangeLine(item_id=line.item_id, quantity=abs(line.variance)))

        self.db.flush()

        # 2. Execute positive adjustments (ADJUSTMENT_PLUS)
        if plus_lines:
            inventory_service.execute_stock_changes(
                db=self.db,
                branch_id=session.branch_id,
                transaction_type="ADJUSTMENT_PLUS",
                reference_type="opname",
                reference_id=session.session_id,
                document_no=f"OPN-{session.session_id}",
                lines=plus_lines,
                notes=session.notes,
                created_by=current_user.user_id
            )

        # 3. Execute negative adjustments (ADJUSTMENT_MINUS)
        if minus_lines:
            inventory_service.execute_stock_changes(
                db=self.db,
                branch_id=session.branch_id,
                transaction_type="ADJUSTMENT_MINUS",
                reference_type="opname",
                reference_id=session.session_id,
                document_no=f"OPN-{session.session_id}",
                lines=minus_lines,
                notes=session.notes,
                created_by=current_user.user_id
            )

        # 4. Lock state
        session.status = "completed"
        self.db.commit()
        self.db.refresh(session)

        # Log completion
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=session.session_id,
            old_values={"status": "draft"},
            new_values={"status": "completed"}
        )
        self.db.commit()

        return session

    def cancel(self, id: int, current_user: User) -> StockOpnameSession:
        session = self.get(id)
        if session.status != "draft":
            raise HTTPException(status_code=400, detail="Hanya opname dengan status 'draft' yang dapat dibatalkan")

        session.status = "cancelled"
        self.db.commit()
        self.db.refresh(session)

        # Log cancellation
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=session.session_id,
            old_values={"status": "draft"},
            new_values={"status": "cancelled"}
        )
        self.db.commit()

        return session
