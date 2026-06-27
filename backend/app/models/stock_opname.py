from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, CheckConstraint, UniqueConstraint, func
from app.db.base import Base, TimestampMixin
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.category import Category
    from app.models.user import User
    from app.models.item import Item

class StockOpnameSession(Base, TimestampMixin):
    __tablename__ = "stock_opname_sessions"

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id", ondelete="RESTRICT"), index=True, nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.category_id", ondelete="RESTRICT"), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)

    # Relationships
    branch: Mapped["Branch"] = relationship("Branch")
    category: Mapped["Category"] = relationship("Category")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    lines: Mapped[list["StockOpnameLine"]] = relationship(
        "StockOpnameLine", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'completed', 'cancelled')", name="chk_opname_status"),
    )

class StockOpnameLine(Base):
    __tablename__ = "stock_opname_lines"

    line_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("stock_opname_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.item_id", ondelete="RESTRICT"), nullable=False, index=True)
    system_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    physical_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    variance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session: Mapped["StockOpnameSession"] = relationship("StockOpnameSession", back_populates="lines")
    item: Mapped["Item"] = relationship("Item")

    __table_args__ = (
        CheckConstraint("physical_quantity >= 0", name="chk_opname_physical_quantity"),
        UniqueConstraint("session_id", "item_id", name="uq_opname_session_item"),
    )
