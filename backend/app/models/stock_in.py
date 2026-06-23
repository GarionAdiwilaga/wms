from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, CheckConstraint, UniqueConstraint, func
from app.db.base import Base, TimestampMixin
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.user import User
    from app.models.item import Item

class StockInSession(Base, TimestampMixin):
    __tablename__ = "stock_in_sessions"

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id", ondelete="RESTRICT"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default="completed", nullable=False)
    reference_no: Mapped[str | None] = mapped_column(String, nullable=True)
    supplier_invoice_no: Mapped[str | None] = mapped_column(String, nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    received_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True)

    # Relationships
    branch: Mapped["Branch"] = relationship("Branch")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    receiver: Mapped["User | None"] = relationship("User", foreign_keys=[received_by])
    lines: Mapped[list["StockInLine"]] = relationship(
        "StockInLine", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'completed', 'cancelled')", name="chk_stock_in_status"),
    )

class StockInLine(Base):
    __tablename__ = "stock_in_lines"

    line_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("stock_in_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.item_id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session: Mapped["StockInSession"] = relationship("StockInSession", back_populates="lines")
    item: Mapped["Item"] = relationship("Item")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_stock_in_line_quantity"),
        UniqueConstraint("session_id", "item_id", name="uq_stock_in_session_item"),
    )
