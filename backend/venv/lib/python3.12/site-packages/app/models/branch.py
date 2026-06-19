from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Text, CheckConstraint
from app.db.base import Base, TimestampMixin

class Branch(Base, TimestampMixin):
    __tablename__ = "branches"

    branch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    location: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="branch")

    __table_args__ = (
        CheckConstraint("code = UPPER(code)", name="chk_branch_code_upper"),
    )
