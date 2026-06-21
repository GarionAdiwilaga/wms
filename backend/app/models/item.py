from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey
from app.db.base import Base, TimestampMixin

class Item(Base, TimestampMixin):
    __tablename__ = "items"

    item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    manual_code: Mapped[str] = mapped_column(String, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.category_id"), nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.supplier_id"), nullable=False)
    uom_id: Mapped[int] = mapped_column(ForeignKey("uom.uom_id"), nullable=False)
    
    minimum_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_path: Mapped[str | None] = mapped_column(String)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    category = relationship("Category")
    supplier = relationship("Supplier")
    uom = relationship("UOM")
