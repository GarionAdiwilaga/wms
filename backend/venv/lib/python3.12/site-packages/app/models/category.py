from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, Text, CheckConstraint
from app.db.base import Base, TimestampMixin

class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        CheckConstraint("code = UPPER(code)", name="chk_category_code_upper"),
    )
