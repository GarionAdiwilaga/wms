from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta

from app.services.base import ServiceBase
from app.repositories.transfer import TransferRepository
from app.models.transfer import Transfer, TransferLine
from app.models.branch import Branch
from app.models.item import Item
from app.schemas.transfer import TransferCreate, TransferUpdate, TransferReceive, TransferCancel
from app.schemas.inventory import StockChangeLine
from app.services.inventory_service import inventory_service, InsufficientStockError
from app.models.user import User

class TransferService(ServiceBase[TransferRepository, Transfer, TransferCreate, Any]):
    def __init__(self, repository: TransferRepository, db: Session):
        super().__init__(repository=repository)
        self.db = db

    def create(self, obj_in: TransferCreate, current_user: User) -> Transfer:
        # 1. Validate source and destination branches
        source_branch = self.db.get(Branch, obj_in.source_branch_id)
        if not source_branch or not source_branch.is_active:
            raise HTTPException(status_code=400, detail="Source branch tidak ditemukan atau tidak aktif")

        dest_branch = self.db.get(Branch, obj_in.dest_branch_id)
        if not dest_branch or not dest_branch.is_active:
            raise HTTPException(status_code=400, detail="Destination branch tidak ditemukan atau tidak aktif")

        if obj_in.source_branch_id == obj_in.dest_branch_id:
            raise HTTPException(status_code=400, detail="Source branch dan destination branch tidak boleh sama")

        # 2. Validate line items
        if not obj_in.lines:
            raise HTTPException(status_code=400, detail="Baris item transfer tidak boleh kosong")

        item_ids = [line.item_id for line in obj_in.lines]
        if len(item_ids) != len(set(item_ids)):
            raise HTTPException(status_code=400, detail="Item duplikat tidak diperbolehkan dalam baris transfer")

        items = self.db.query(Item).filter(Item.item_id.in_(item_ids), Item.is_active == True).all()
        found_item_ids = {item.item_id for item in items}
        for item_id in item_ids:
            if item_id not in found_item_ids:
                raise HTTPException(status_code=400, detail=f"Item dengan ID {item_id} tidak ditemukan atau tidak aktif")

        # 3. Generate transfer_number: TRF-{YYYYMMDD}-{seq:03d}
        now_local = datetime.now()
        date_str = now_local.strftime("%Y%m%d")
        
        # Count transfers created today to get next sequence
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        count = self.db.query(func.count(Transfer.transfer_id)).filter(
            Transfer.created_at >= today_start,
            Transfer.created_at < today_end
        ).scalar() or 0
        sequence = count + 1
        transfer_number = f"TRF-{date_str}-{sequence:03d}"

        # 4. Create Transfer Session
        db_transfer = Transfer(
            transfer_number=transfer_number,
            source_branch_id=obj_in.source_branch_id,
            dest_branch_id=obj_in.dest_branch_id,
            status="draft",
            notes=obj_in.notes,
            created_by=current_user.user_id
        )
        self.db.add(db_transfer)
        self.db.flush()  # Generate transfer_id

        # 5. Create Transfer Lines
        for line in obj_in.lines:
            db_line = TransferLine(
                transfer_id=db_transfer.transfer_id,
                item_id=line.item_id,
                sent_quantity=line.sent_quantity
            )
            self.db.add(db_line)

        self.db.commit()
        self.db.refresh(db_transfer)

        # Log creation
        self.audit_service.log_create(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=db_transfer.transfer_id,
            new_values={"transfer_number": transfer_number, "source_branch_id": db_transfer.source_branch_id, "dest_branch_id": db_transfer.dest_branch_id}
        )
        self.db.commit()

        return db_transfer

    def update(self, id: int, obj_in: TransferUpdate, current_user: User) -> Transfer:
        transfer = self.get(id)
        if transfer.status != "draft":
            raise HTTPException(status_code=400, detail="Hanya transfer dengan status 'draft' yang dapat diubah")

        # Capture old values for audit logging
        old_values = {
            "dest_branch_id": transfer.dest_branch_id,
            "notes": transfer.notes,
            "lines": [{"item_id": line.item_id, "sent_quantity": line.sent_quantity} for line in transfer.lines]
        }

        if obj_in.dest_branch_id is not None:
            if obj_in.dest_branch_id == transfer.source_branch_id:
                raise HTTPException(status_code=400, detail="Source branch dan destination branch tidak boleh sama")
            dest_branch = self.db.get(Branch, obj_in.dest_branch_id)
            if not dest_branch or not dest_branch.is_active:
                raise HTTPException(status_code=400, detail="Destination branch tidak ditemukan atau tidak aktif")
            transfer.dest_branch_id = obj_in.dest_branch_id

        if obj_in.notes is not None:
            transfer.notes = obj_in.notes

        if obj_in.lines is not None:
            # Delete old lines
            for line in transfer.lines:
                self.db.delete(line)
            self.db.flush()

            # Create new lines
            item_ids = [line.item_id for line in obj_in.lines]
            if len(item_ids) != len(set(item_ids)):
                raise HTTPException(status_code=400, detail="Item duplikat tidak diperbolehkan")

            items = self.db.query(Item).filter(Item.item_id.in_(item_ids), Item.is_active == True).all()
            found_item_ids = {item.item_id for item in items}
            for item_id in item_ids:
                if item_id not in found_item_ids:
                    raise HTTPException(status_code=400, detail=f"Item dengan ID {item_id} tidak ditemukan atau tidak aktif")

            for line in obj_in.lines:
                db_line = TransferLine(
                    transfer_id=transfer.transfer_id,
                    item_id=line.item_id,
                    sent_quantity=line.sent_quantity
                )
                self.db.add(db_line)

        self.db.commit()
        self.db.refresh(transfer)

        # Log update
        new_values = {
            "dest_branch_id": transfer.dest_branch_id,
            "notes": transfer.notes,
            "lines": [{"item_id": line.item_id, "sent_quantity": line.sent_quantity} for line in transfer.lines]
        }
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=transfer.transfer_id,
            old_values=old_values,
            new_values=new_values
        )
        self.db.commit()

        return transfer

    def ship(self, id: int, current_user: User) -> Transfer:
        transfer = self.get(id)
        if transfer.status != "draft":
            raise HTTPException(status_code=400, detail="Hanya transfer dengan status 'draft' yang dapat dikirim")

        # 1. Execute ledger transaction OUT on source branch
        change_lines = [
            StockChangeLine(item_id=line.item_id, quantity=line.sent_quantity)
            for line in transfer.lines
        ]
        
        try:
            inventory_service.execute_stock_changes(
                db=self.db,
                branch_id=transfer.source_branch_id,
                transaction_type="OUT",
                reference_type="transfer",
                reference_id=transfer.transfer_id,
                document_no=transfer.transfer_number,
                lines=change_lines,
                notes=transfer.notes,
                created_by=current_user.user_id
            )
        except InsufficientStockError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # 2. Transition state
        transfer.status = "in_transit"
        transfer.shipped_at = func.now()
        transfer.shipped_by = current_user.user_id

        self.db.commit()
        self.db.refresh(transfer)

        # Audit log
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=transfer.transfer_id,
            old_values={"status": "draft"},
            new_values={"status": "in_transit", "shipped_at": transfer.shipped_at.isoformat() if transfer.shipped_at else None}
        )
        self.db.commit()

        return transfer

    def receive(self, id: int, obj_in: TransferReceive, current_user: User) -> Transfer:
        transfer = self.get(id)
        if transfer.status != "in_transit":
            raise HTTPException(status_code=400, detail="Hanya transfer dengan status 'in_transit' yang dapat diterima")

        # Map receiving lines to database lines
        line_map = {line.line_id: line for line in transfer.lines}
        
        # Verify all receiving lines belong to this transfer session
        for receive_line in obj_in.lines:
            if receive_line.line_id not in line_map:
                raise HTTPException(status_code=400, detail=f"Line ID {receive_line.line_id} tidak valid untuk transfer ini")

        # Update received quantities and variance
        for receive_line in obj_in.lines:
            db_line = line_map[receive_line.line_id]
            db_line.received_quantity = receive_line.received_quantity
            db_line.variance_notes = receive_line.variance_notes
            db_line.variance_reason = receive_line.variance_reason

        # 1. Execute ledger transaction IN on destination branch (for positive received quantities)
        change_lines = [
            StockChangeLine(item_id=line.item_id, quantity=line.received_quantity)
            for line in transfer.lines
            if line.received_quantity and line.received_quantity > 0
        ]
        
        if change_lines:
            inventory_service.execute_stock_changes(
                db=self.db,
                branch_id=transfer.dest_branch_id,
                transaction_type="IN",
                reference_type="transfer",
                reference_id=transfer.transfer_id,
                document_no=transfer.transfer_number,
                lines=change_lines,
                notes=obj_in.received_notes,
                created_by=current_user.user_id
            )

        # 2. Transition state
        transfer.status = "received"
        transfer.received_at = func.now()
        transfer.received_by = current_user.user_id
        transfer.received_notes = obj_in.received_notes

        self.db.commit()
        self.db.refresh(transfer)

        # Audit log
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=transfer.transfer_id,
            old_values={"status": "in_transit"},
            new_values={"status": "received", "received_at": transfer.received_at.isoformat() if transfer.received_at else None}
        )
        self.db.commit()

        return transfer

    def cancel(self, id: int, obj_in: TransferCancel, current_user: User) -> Transfer:
        transfer = self.get(id)
        if transfer.status in ("received", "cancelled"):
            raise HTTPException(status_code=400, detail="Tidak dapat membatalkan transfer yang sudah selesai/dibatalkan")

        old_status = transfer.status

        # 1. If in_transit, we must reverse the OUT shipment by adding the sent items back to source branch
        if old_status == "in_transit":
            change_lines = [
                StockChangeLine(item_id=line.item_id, quantity=line.sent_quantity)
                for line in transfer.lines
            ]
            inventory_service.execute_stock_changes(
                db=self.db,
                branch_id=transfer.source_branch_id,
                transaction_type="IN",
                reference_type="transfer",
                reference_id=transfer.transfer_id,
                document_no=transfer.transfer_number,
                lines=change_lines,
                notes=f"Reversal of transfer cancellation: {obj_in.cancellation_reason}",
                created_by=current_user.user_id
            )

        # 2. Transition state
        transfer.status = "cancelled"
        transfer.cancelled_at = func.now()
        transfer.cancelled_by = current_user.user_id
        transfer.cancellation_reason = obj_in.cancellation_reason

        self.db.commit()
        self.db.refresh(transfer)

        # Audit log
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=transfer.transfer_id,
            old_values={"status": old_status},
            new_values={"status": "cancelled", "cancelled_at": transfer.cancelled_at.isoformat() if transfer.cancelled_at else None}
        )
        self.db.commit()

        return transfer
