from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, CheckConstraint, Index, Integer
from app.db.base import Base, TimestampMixin
from sqlalchemy import func
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.audit_log import AuditLog

class User(Base, TimestampMixin):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.branch_id", ondelete="RESTRICT"), index=True)
    token_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    branch: Mapped["Branch"] = relationship(back_populates="users")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user", viewonly=True)

    __table_args__ = (
        CheckConstraint("role IN ('super_admin', 'branch_head', 'warehouse_staff')", name="chk_user_role"),
        CheckConstraint("(role = 'super_admin') OR (branch_id IS NOT NULL)", name="chk_user_branch"),
        Index("idx_users_username_lower", func.lower(username), unique=True),
    )
