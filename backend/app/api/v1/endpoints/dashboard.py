"""
Dashboard summary endpoint — Phase 6.1

Read-only aggregation of existing tables.
No ReportService calls (avoids pagination overhead for simple count queries).
No new business logic — purely SELECT/COUNT/SUM aggregations.
"""
from datetime import datetime, date, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_active_user, ActiveUserDep
from app.models.inventory import InventoryTransaction
from app.models.item import Item
from app.models.branch import Branch
from app.models.user import User
from app.models.stock_in import StockInSession, StockInLine
from app.models.outbound import OutboundSession, OutboundLine
from app.models.transfer import Transfer
from app.models.stock_opname import StockOpnameSession
from app.models.inventory import BranchStock
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    StockInTodaySummary,
    OutboundTodaySummary,
    RecentTransaction,
    DashboardNotifications,
)

from fastapi import Depends

router = APIRouter()


def _resolve_branch_id(current_user: User, requested_branch_id: Optional[int]) -> Optional[int]:
    """
    RBAC: branch_head and warehouse_staff are always locked to their own branch.
    super_admin may pass any branch_id, or None (no filter applied to queries).
    """
    if current_user.role != "super_admin":
        return current_user.branch_id
    return requested_branch_id


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    branch_id: Optional[int] = Query(None, description="Branch to summarise. Ignored for non-super_admin."),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Returns an operational dashboard summary for the given branch.

    Data sources (all read-only):
    - stock_in_sessions / stock_in_lines
    - outbound_sessions / outbound_lines
    - transfers
    - inventory_transactions (last 5 for recent activity)
    - branch_stocks + items.minimum_stock (notification: low stock)
    - stock_opname_sessions (notification: overdue draft sessions)
    """
    effective_branch_id = _resolve_branch_id(current_user, branch_id)

    # Resolve branch display name
    branch_name: Optional[str] = None
    if effective_branch_id is not None:
        branch_row = db.get(Branch, effective_branch_id)
        if branch_row:
            branch_name = branch_row.name

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_str = date.today().isoformat()

    # ------------------------------------------------------------------
    # KPI 1 — Stock In today
    # ------------------------------------------------------------------
    stock_in_query = (
        select(
            func.count(StockInSession.session_id).label("session_count"),
            func.coalesce(func.sum(StockInLine.quantity), 0).label("total_units"),
        )
        .join(StockInLine, StockInSession.session_id == StockInLine.session_id)
        .where(
            StockInSession.transaction_date >= today_start,
            StockInSession.transaction_date < today_end,
            StockInSession.status == "completed",
        )
    )
    if effective_branch_id is not None:
        stock_in_query = stock_in_query.where(StockInSession.branch_id == effective_branch_id)

    stock_in_row = db.execute(stock_in_query).one()

    # ------------------------------------------------------------------
    # KPI 2 — Outbound today
    # ------------------------------------------------------------------
    outbound_query = (
        select(
            func.count(OutboundSession.session_id).label("session_count"),
            func.coalesce(func.sum(OutboundLine.quantity), 0).label("total_units"),
        )
        .join(OutboundLine, OutboundSession.session_id == OutboundLine.session_id)
        .where(
            OutboundSession.transaction_date >= today_start,
            OutboundSession.transaction_date < today_end,
            OutboundSession.status == "completed",
        )
    )
    if effective_branch_id is not None:
        outbound_query = outbound_query.where(OutboundSession.branch_id == effective_branch_id)

    outbound_row = db.execute(outbound_query).one()

    # ------------------------------------------------------------------
    # KPI 3 — Transfers currently in transit
    # For branch_head/staff: show transfers going TO or FROM their branch.
    # For super_admin with no branch filter: all in-transit transfers.
    # ------------------------------------------------------------------
    transit_query = select(func.count(Transfer.transfer_id)).where(Transfer.status == "in_transit")
    if effective_branch_id is not None:
        transit_query = transit_query.where(
            or_(
                Transfer.source_branch_id == effective_branch_id,
                Transfer.dest_branch_id == effective_branch_id,
            )
        )
    transfers_in_transit: int = db.scalar(transit_query) or 0

    # ------------------------------------------------------------------
    # Recent Activity — last 5 inventory_transactions
    # ------------------------------------------------------------------
    recent_query = (
        select(
            InventoryTransaction.transaction_id,
            InventoryTransaction.transaction_type,
            InventoryTransaction.reference_type,
            InventoryTransaction.quantity,
            InventoryTransaction.created_at,
            Item.name.label("item_name"),
            Item.item_code,
            Branch.name.label("branch_name"),
            User.full_name.label("operator_name"),
        )
        .join(Item, InventoryTransaction.item_id == Item.item_id)
        .join(Branch, InventoryTransaction.branch_id == Branch.branch_id)
        .join(User, InventoryTransaction.created_by == User.user_id)
        .order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.transaction_id.desc())
        .limit(8)
    )
    if effective_branch_id is not None:
        recent_query = recent_query.where(InventoryTransaction.branch_id == effective_branch_id)

    recent_rows = db.execute(recent_query).all()

    recent_transactions = [
        RecentTransaction(
            transaction_id=r.transaction_id,
            transaction_type=r.transaction_type,
            reference_type=r.reference_type,
            item_name=r.item_name,
            item_code=r.item_code,
            quantity=r.quantity,
            branch_name=r.branch_name,
            operator_name=r.operator_name,
            created_at=r.created_at.isoformat(),
        )
        for r in recent_rows
    ]

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------

    # Low stock count
    low_stock_query = (
        select(func.count())
        .select_from(BranchStock)
        .join(Item, BranchStock.item_id == Item.item_id)
        .where(BranchStock.quantity <= Item.minimum_stock)
    )
    if effective_branch_id is not None:
        low_stock_query = low_stock_query.where(BranchStock.branch_id == effective_branch_id)
    low_stock_count: int = db.scalar(low_stock_query) or 0

    # Transfers awaiting receipt (in_transit, destined for this branch)
    awaiting_query = select(func.count(Transfer.transfer_id)).where(Transfer.status == "in_transit")
    if effective_branch_id is not None:
        awaiting_query = awaiting_query.where(Transfer.dest_branch_id == effective_branch_id)
    transfers_awaiting_receipt: int = db.scalar(awaiting_query) or 0

    # Overdue draft opname sessions (draft, created > 7 days ago)
    overdue_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    overdue_query = (
        select(func.count(StockOpnameSession.session_id))
        .where(
            StockOpnameSession.status == "draft",
            StockOpnameSession.created_at <= overdue_cutoff,
        )
    )
    if effective_branch_id is not None:
        overdue_query = overdue_query.where(StockOpnameSession.branch_id == effective_branch_id)
    overdue_opname_sessions: int = db.scalar(overdue_query) or 0

    # ------------------------------------------------------------------
    # Assemble response
    # ------------------------------------------------------------------
    return DashboardSummaryResponse(
        branch_id=effective_branch_id,
        branch_name=branch_name,
        date=today_str,
        stock_in_today=StockInTodaySummary(
            session_count=int(stock_in_row.session_count),
            total_units=int(stock_in_row.total_units),
        ),
        outbound_today=OutboundTodaySummary(
            session_count=int(outbound_row.session_count),
            total_units=int(outbound_row.total_units),
        ),
        transfers_in_transit=transfers_in_transit,
        recent_transactions=recent_transactions,
        notifications=DashboardNotifications(
            low_stock_count=low_stock_count,
            transfers_awaiting_receipt=transfers_awaiting_receipt,
            overdue_opname_sessions=overdue_opname_sessions,
        ),
    )
