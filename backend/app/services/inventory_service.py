from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from app.models.inventory import InventoryTransaction, BranchStock
from app.schemas.inventory import StockChangeLine
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class InsufficientStockError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class InventoryService:
    def execute_stock_changes(
        self,
        db: Session,
        *,
        branch_id: int,
        transaction_type: str,       # e.g. "IN", "OUT", "ADJUSTMENT_PLUS"
        reference_type: str,         # e.g. "stock_in", "manual", "system", "initial_load"
        reference_id: Optional[int],
        document_no: Optional[str],
        lines: List[StockChangeLine],
        notes: Optional[str],
        created_by: int,
    ) -> List[InventoryTransaction]:
        """
        Single atomic operation:
        1. Sort lines by item_id (deterministic lock order)
        2. SELECT FOR UPDATE on branch_stocks
        3. Validate stock for deductions (application-level)
        4. INSERT inventory_transactions (one per line)
        5. UPSERT branch_stocks
        6. INSERT audit_log
        7. COMMIT
        """
        if not lines:
            return []

        ADDITIVE_TYPES = {"IN", "TRANSFER_IN", "ADJUSTMENT_PLUS"}
        SUBTRACTIVE_TYPES = {"OUT", "TRANSFER_OUT", "ADJUSTMENT_MINUS"}

        if transaction_type not in ADDITIVE_TYPES and transaction_type not in SUBTRACTIVE_TYPES:
            raise ValueError(f"Invalid transaction type: {transaction_type}")

        is_subtractive = transaction_type in SUBTRACTIVE_TYPES

        # 1. Sort lines by item_id (deterministic lock order to prevent deadlocks)
        sorted_lines = sorted(lines, key=lambda x: x.item_id)

        try:
            # Set statement-level lock timeout
            db.execute(text("SET LOCAL lock_timeout = '5s';"))

            item_ids = [line.item_id for line in sorted_lines]
            
            # 2. SELECT FOR UPDATE on branch_stocks
            existing_stocks = db.query(BranchStock).filter(
                BranchStock.branch_id == branch_id,
                BranchStock.item_id.in_(item_ids)
            ).with_for_update().all()
            
            stock_map = {stock.item_id: stock for stock in existing_stocks}
            
            transactions = []
            
            for line in sorted_lines:
                stock = stock_map.get(line.item_id)
                
                # 3. Validate stock for deductions
                if is_subtractive:
                    current_qty = stock.quantity if stock else 0
                    if current_qty < line.quantity:
                        raise InsufficientStockError(f"Stok tidak mencukupi untuk item_id {line.item_id}. Tersedia: {current_qty}, Dibutuhkan: {line.quantity}")
                    
                # 4. INSERT inventory_transactions
                transaction = InventoryTransaction(
                    item_id=line.item_id,
                    branch_id=branch_id,
                    transaction_type=transaction_type,
                    quantity=line.quantity,
                    reference_type=reference_type,
                    reference_id=reference_id,
                    document_no=document_no,
                    notes=notes,
                    created_by=created_by
                )
                db.add(transaction)
                transactions.append(transaction)
                
                # 5. UPSERT branch_stocks
                if not stock:
                    stock = BranchStock(
                        branch_id=branch_id,
                        item_id=line.item_id,
                        quantity=line.quantity if not is_subtractive else -line.quantity
                    )
                    db.add(stock)
                else:
                    if is_subtractive:
                        stock.quantity -= line.quantity
                    else:
                        stock.quantity += line.quantity

            db.commit()
            for t in transactions:
                db.refresh(t)
            
            logger.info("Stock change processed", extra={
                "transaction_type": transaction_type,
                "reference_type": reference_type,
                "reference_id": reference_id,
                "items_count": len(lines),
                "branch_id": branch_id
            })
            return transactions

        except IntegrityError as e:
            db.rollback()
            if "chk_branch_stock_quantity" in str(e):
                raise InsufficientStockError("Stok tidak mencukupi untuk operasi ini")
            raise
        except Exception as e:
            db.rollback()
            logger.error("Stock change failed", exc_info=True, extra={"reference_type": reference_type, "items_count": len(lines)})
            raise

    def rebuild_cache(
        self,
        db: Session,
        branch_id: Optional[int] = None,
    ) -> int:
        """Rebuild branch_stocks from ledger. Returns rows rebuilt."""
        # Optional: Implement later or if needed
        pass

    def get_branch_stock(
        self,
        db: Session,
        branch_id: int,
        item_id: int,
    ) -> int:
        """Quick stock lookup for a single item at a branch."""
        stock = db.query(BranchStock).filter(
            BranchStock.branch_id == branch_id,
            BranchStock.item_id == item_id
        ).first()
        return stock.quantity if stock else 0

inventory_service = InventoryService()
