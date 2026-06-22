from sqlalchemy import Column, Integer, String, BigInteger, ForeignKey, CheckConstraint, Index, DateTime, text, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    transaction_id = Column(BigInteger, primary_key=True, autoincrement=True)
    item_id = Column(BigInteger, ForeignKey("items.item_id"), nullable=False)
    branch_id = Column(BigInteger, ForeignKey("branches.branch_id"), nullable=False)
    
    transaction_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    
    reference_type = Column(String, nullable=False)
    reference_id = Column(BigInteger, nullable=True)
    document_no = Column(String, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

    item = relationship("Item")
    branch = relationship("Branch")
    creator = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS')",
            name="chk_inv_tx_type"
        ),
        CheckConstraint("quantity > 0", name="chk_inv_tx_quantity"),
        CheckConstraint(
            "reference_type IN ('stock_in', 'outbound', 'transfer', 'opname', 'initial_load', 'manual', 'system')",
            name="chk_inv_ref_type"
        ),
        Index("ix_invtx_item_branch", "item_id", "branch_id"),
        Index("ix_invtx_branch_created", "branch_id", "created_at"),
        Index("ix_invtx_reference", "reference_type", "reference_id"),
        Index("ix_invtx_document_no", "document_no", postgresql_where=text("document_no IS NOT NULL")),
    )

class BranchStock(Base):
    __tablename__ = "branch_stocks"

    branch_id = Column(BigInteger, ForeignKey("branches.branch_id"), primary_key=True, nullable=False)
    item_id = Column(BigInteger, ForeignKey("items.item_id"), primary_key=True, nullable=False)
    quantity = Column(Integer, nullable=False, server_default="0")
    updated_at = Column(DateTime(timezone=True), server_default=text("now()"), onupdate=text("now()"), nullable=False)

    branch = relationship("Branch")
    item = relationship("Item")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="chk_branch_stock_quantity"),
        Index("ix_bstock_item", "item_id"),
    )
