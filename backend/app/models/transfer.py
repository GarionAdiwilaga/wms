from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, CheckConstraint, UniqueConstraint, func
from app.db.base import Base, TimestampMixin
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.user import User
    from app.models.item import Item

class Transfer(Base, TimestampMixin):
    __tablename__ = "transfers"

    transfer_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    transfer_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    source_branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id", ondelete="RESTRICT"), index=True, nullable=False)
    dest_branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id", ondelete="RESTRICT"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft", index=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shipped_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    source_branch: Mapped["Branch"] = relationship("Branch", foreign_keys=[source_branch_id])
    dest_branch: Mapped["Branch"] = relationship("Branch", foreign_keys=[dest_branch_id])
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    shipper: Mapped["User | None"] = relationship("User", foreign_keys=[shipped_by])
    receiver: Mapped["User | None"] = relationship("User", foreign_keys=[received_by])
    canceller: Mapped["User | None"] = relationship("User", foreign_keys=[cancelled_by])
    lines: Mapped[list["TransferLine"]] = relationship(
        "TransferLine", back_populates="transfer", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("source_branch_id != dest_branch_id", name="chk_transfer_branches"),
        CheckConstraint("status IN ('draft', 'in_transit', 'received', 'cancelled')", name="chk_transfer_status"),
    )

class TransferLine(Base):
    __tablename__ = "transfer_lines"

    line_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    transfer_id: Mapped[int] = mapped_column(ForeignKey("transfers.transfer_id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.item_id", ondelete="RESTRICT"), nullable=False, index=True)
    sent_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    received_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    variance_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    variance_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    transfer: Mapped["Transfer"] = relationship("Transfer", back_populates="lines")
    item: Mapped["Item"] = relationship("Item")

    __table_args__ = (
        CheckConstraint("sent_quantity > 0", name="chk_transfer_sent_quantity"),
        CheckConstraint("received_quantity >= 0 OR received_quantity IS NULL", name="chk_transfer_received_quantity"),
        UniqueConstraint("transfer_id", "item_id", name="uq_transfer_session_item"),
    )
