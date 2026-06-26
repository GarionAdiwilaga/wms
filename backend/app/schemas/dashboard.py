from pydantic import BaseModel
from typing import Optional


class StockInTodaySummary(BaseModel):
    session_count: int
    total_units: int


class OutboundTodaySummary(BaseModel):
    session_count: int
    total_units: int


class RecentTransaction(BaseModel):
    transaction_id: int
    transaction_type: str  # 'IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS', 'OPNAME'
    reference_type: str    # 'stock_in', 'outbound', 'transfer', 'opname', etc. — use this to distinguish transfers
    item_name: str
    item_code: str
    quantity: int
    branch_name: str
    operator_name: str
    created_at: str  # ISO-8601


class DashboardNotifications(BaseModel):
    low_stock_count: int               # items at or below minimum_stock for this branch
    transfers_awaiting_receipt: int    # transfers with status='in_transit' destined for this branch
    overdue_opname_sessions: int       # draft opname sessions older than 7 days for this branch


class DashboardSummaryResponse(BaseModel):
    branch_id: Optional[int]
    branch_name: Optional[str]
    date: str                                    # "YYYY-MM-DD"
    stock_in_today: StockInTodaySummary
    outbound_today: OutboundTodaySummary
    transfers_in_transit: int
    recent_transactions: list[RecentTransaction]
    notifications: DashboardNotifications
