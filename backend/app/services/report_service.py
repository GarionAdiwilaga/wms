from typing import Any, Optional, Tuple, List
from datetime import datetime
from sqlalchemy import select, func, or_, case, distinct
from sqlalchemy.orm import Session, aliased
from app.models.inventory import InventoryTransaction, BranchStock
from app.models.item import Item
from app.models.branch import Branch
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.user import User
from app.models.transfer import Transfer, TransferLine
from app.models.audit_log import AuditLog

from app.services.report_queries import build_stock_report_query

class ReportService:
    @staticmethod
    def get_stock_report(
        db: Session,
        branch_id: Optional[int] = None,
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        is_export: bool = False
    ) -> Tuple[List[Any], int]:
        query = build_stock_report_query(
            branch_id=branch_id,
            category_id=category_id,
            supplier_id=supplier_id,
            search=search
        ).order_by(Branch.name, Item.item_code)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        if not is_export:
            query = query.limit(limit).offset(offset)

        results = db.execute(query).all()
        return results, total

    @staticmethod
    def get_low_stock_report(
        db: Session,
        branch_id: Optional[int] = None,
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        is_export: bool = False
    ) -> Tuple[List[Any], int]:
        query = select(
            Branch.name.label("branch_name"),
            Item.item_code,
            Item.name.label("item_name"),
            Category.name.label("category_name"),
            Supplier.name.label("supplier_name"),
            BranchStock.quantity,
            Item.minimum_stock,
            (Item.minimum_stock - BranchStock.quantity).label("shortage")
        ).join(
            Branch, BranchStock.branch_id == Branch.branch_id
        ).join(
            Item, BranchStock.item_id == Item.item_id
        ).join(
            Category, Item.category_id == Category.category_id
        ).join(
            Supplier, Item.supplier_id == Supplier.supplier_id
        ).where(
            BranchStock.quantity <= Item.minimum_stock
        )

        if branch_id is not None:
            query = query.where(BranchStock.branch_id == branch_id)
        if category_id is not None:
            query = query.where(Item.category_id == category_id)
        if supplier_id is not None:
            query = query.where(Item.supplier_id == supplier_id)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Item.item_code.ilike(search_term),
                    Item.name.ilike(search_term),
                    Supplier.name.ilike(search_term),
                    Category.name.ilike(search_term)
                )
            )

        query = query.order_by(Branch.name, Item.item_code)

        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        if not is_export:
            query = query.limit(limit).offset(offset)

        results = db.execute(query).all()
        return results, total

    @staticmethod
    def get_item_history_report(
        db: Session,
        item_id: int,
        branch_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 20,
        offset: int = 0,
        is_export: bool = False
    ) -> Tuple[List[Any], int]:
        query = select(
            InventoryTransaction.transaction_id,
            InventoryTransaction.created_at,
            Branch.name.label("branch_name"),
            InventoryTransaction.transaction_type,
            InventoryTransaction.quantity,
            InventoryTransaction.reference_type,
            InventoryTransaction.reference_id,
            InventoryTransaction.document_no,
            InventoryTransaction.notes,
            User.full_name.label("operator_name")
        ).join(
            Branch, InventoryTransaction.branch_id == Branch.branch_id
        ).join(
            User, InventoryTransaction.created_by == User.user_id
        ).where(
            InventoryTransaction.item_id == item_id
        )

        if branch_id is not None:
            query = query.where(InventoryTransaction.branch_id == branch_id)
        if start_date is not None:
            query = query.where(InventoryTransaction.created_at >= start_date)
        if end_date is not None:
            query = query.where(InventoryTransaction.created_at <= end_date)

        query = query.order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.transaction_id.desc())

        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        if not is_export:
            query = query.limit(limit).offset(offset)

        results = db.execute(query).all()
        return results, total

    @staticmethod
    def get_inventory_movement_report(
        db: Session,
        branch_id: Optional[int] = None,
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        is_export: bool = False
    ) -> Tuple[List[Any], int]:
        signed_quantity = case(
            (InventoryTransaction.transaction_type.in_(['IN', 'TRANSFER_IN', 'ADJUSTMENT_PLUS']), InventoryTransaction.quantity),
            else_=-InventoryTransaction.quantity
        )

        balance_after = func.sum(signed_quantity).over(
            partition_by=[InventoryTransaction.branch_id, InventoryTransaction.item_id],
            order_by=[InventoryTransaction.created_at.asc(), InventoryTransaction.transaction_id.asc()]
        ).label("balance_after")

        subquery = select(
            InventoryTransaction.transaction_id,
            InventoryTransaction.created_at,
            InventoryTransaction.branch_id,
            Branch.name.label("branch_name"),
            InventoryTransaction.item_id,
            Item.item_code,
            Item.name.label("item_name"),
            Item.category_id,
            Item.supplier_id,
            InventoryTransaction.transaction_type,
            InventoryTransaction.quantity,
            InventoryTransaction.reference_type,
            InventoryTransaction.reference_id,
            InventoryTransaction.document_no,
            InventoryTransaction.notes,
            User.full_name.label("operator_name"),
            balance_after
        ).join(
            Branch, InventoryTransaction.branch_id == Branch.branch_id
        ).join(
            Item, InventoryTransaction.item_id == Item.item_id
        ).join(
            User, InventoryTransaction.created_by == User.user_id
        )

        if branch_id is not None:
            subquery = subquery.where(InventoryTransaction.branch_id == branch_id)
        if category_id is not None:
            subquery = subquery.where(Item.category_id == category_id)
        if supplier_id is not None:
            subquery = subquery.where(Item.supplier_id == supplier_id)
        if end_date is not None:
            subquery = subquery.where(InventoryTransaction.created_at <= end_date)
        if search:
            search_term = f"%{search}%"
            subquery = subquery.where(
                or_(
                    Item.item_code.ilike(search_term),
                    Item.name.ilike(search_term),
                    InventoryTransaction.document_no.ilike(search_term)
                )
            )

        subquery_cte = subquery.cte("movement_cte")

        query = select(
            subquery_cte.c.transaction_id,
            subquery_cte.c.created_at,
            subquery_cte.c.branch_name,
            subquery_cte.c.item_code,
            subquery_cte.c.item_name,
            subquery_cte.c.transaction_type,
            subquery_cte.c.quantity,
            subquery_cte.c.balance_after,
            subquery_cte.c.reference_type,
            subquery_cte.c.reference_id,
            subquery_cte.c.document_no,
            subquery_cte.c.notes,
            subquery_cte.c.operator_name
        )

        if start_date is not None:
            query = query.where(subquery_cte.c.created_at >= start_date)

        query = query.order_by(subquery_cte.c.created_at.desc(), subquery_cte.c.transaction_id.desc())

        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        if not is_export:
            query = query.limit(limit).offset(offset)

        results = db.execute(query).all()
        return results, total

    @staticmethod
    def get_transfer_variance_report(
        db: Session,
        branch_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        is_export: bool = False
    ) -> Tuple[List[Any], int, dict[str, int]]:
        SourceBranch = aliased(Branch, name="source_branch")
        DestBranch = aliased(Branch, name="dest_branch")

        query = select(
            Transfer.transfer_number,
            SourceBranch.name.label("source_branch_name"),
            DestBranch.name.label("dest_branch_name"),
            Transfer.received_at,
            Item.item_code,
            Item.name.label("item_name"),
            TransferLine.sent_quantity,
            TransferLine.received_quantity,
            (TransferLine.sent_quantity - TransferLine.received_quantity).label("variance"),
            TransferLine.variance_reason,
            TransferLine.variance_notes,
            User.full_name.label("receiver_name")
        ).select_from(
            TransferLine
        ).join(
            Transfer, TransferLine.transfer_id == Transfer.transfer_id
        ).join(
            Item, TransferLine.item_id == Item.item_id
        ).join(
            SourceBranch, Transfer.source_branch_id == SourceBranch.branch_id
        ).join(
            DestBranch, Transfer.dest_branch_id == DestBranch.branch_id
        ).join(
            User, Transfer.received_by == User.user_id
        ).where(
            Transfer.status == 'received'
        ).where(
            TransferLine.sent_quantity != TransferLine.received_quantity
        )

        if branch_id is not None:
            query = query.where(or_(Transfer.source_branch_id == branch_id, Transfer.dest_branch_id == branch_id))
        if start_date is not None:
            query = query.where(Transfer.received_at >= start_date)
        if end_date is not None:
            query = query.where(Transfer.received_at <= end_date)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Transfer.transfer_number.ilike(search_term),
                    Item.item_code.ilike(search_term),
                    Item.name.ilike(search_term)
                )
            )

        query = query.order_by(Transfer.received_at.desc())

        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        # Fetch summary metrics
        total_transfers_query = select(func.count(Transfer.transfer_id)).where(Transfer.status == 'received')
        transfers_with_variance_query = select(func.count(distinct(Transfer.transfer_id))).join(
            TransferLine, Transfer.transfer_id == TransferLine.transfer_id
        ).where(
            Transfer.status == 'received'
        ).where(
            TransferLine.sent_quantity != TransferLine.received_quantity
        )
        total_lost_units_query = select(
            func.sum(TransferLine.sent_quantity - TransferLine.received_quantity)
        ).join(
            Transfer, TransferLine.transfer_id == Transfer.transfer_id
        ).where(
            Transfer.status == 'received'
        )

        if branch_id is not None:
            total_transfers_query = total_transfers_query.where(or_(Transfer.source_branch_id == branch_id, Transfer.dest_branch_id == branch_id))
            transfers_with_variance_query = transfers_with_variance_query.where(or_(Transfer.source_branch_id == branch_id, Transfer.dest_branch_id == branch_id))
            total_lost_units_query = total_lost_units_query.where(or_(Transfer.source_branch_id == branch_id, Transfer.dest_branch_id == branch_id))
        if start_date is not None:
            total_transfers_query = total_transfers_query.where(Transfer.received_at >= start_date)
            transfers_with_variance_query = transfers_with_variance_query.where(Transfer.received_at >= start_date)
            total_lost_units_query = total_lost_units_query.where(Transfer.received_at >= start_date)
        if end_date is not None:
            total_transfers_query = total_transfers_query.where(Transfer.received_at <= end_date)
            transfers_with_variance_query = transfers_with_variance_query.where(Transfer.received_at <= end_date)
            total_lost_units_query = total_lost_units_query.where(Transfer.received_at <= end_date)

        total_transfers = db.scalar(total_transfers_query) or 0
        transfers_with_variance = db.scalar(transfers_with_variance_query) or 0
        total_lost_units = db.scalar(total_lost_units_query) or 0

        summary = {
            "total_transfers": total_transfers,
            "transfers_with_variance": transfers_with_variance,
            "total_lost_units": int(total_lost_units)
        }

        if not is_export:
            query = query.limit(limit).offset(offset)

        results = db.execute(query).all()
        return results, total, summary

    @staticmethod
    def get_audit_log_report(
        db: Session,
        branch_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 20,
        offset: int = 0,
        is_export: bool = False
    ) -> Tuple[List[Any], int]:
        query = select(
            AuditLog.log_id,
            AuditLog.created_at,
            User.full_name.label("operator_name"),
            AuditLog.action,
            AuditLog.entity_type,
            AuditLog.entity_id,
            AuditLog.old_values,
            AuditLog.new_values,
            AuditLog.ip_address
        ).join(
            User, AuditLog.user_id == User.user_id
        )

        if branch_id is not None:
            query = query.where(User.branch_id == branch_id)
        if user_id is not None:
            query = query.where(AuditLog.user_id == user_id)
        if action is not None:
            query = query.where(AuditLog.action == action)
        if entity_type is not None:
            query = query.where(AuditLog.entity_type == entity_type)
        if start_date is not None:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date is not None:
            query = query.where(AuditLog.created_at <= end_date)

        query = query.order_by(AuditLog.created_at.desc())

        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        if not is_export:
            query = query.limit(limit).offset(offset)

        results = db.execute(query).all()
        return results, total
