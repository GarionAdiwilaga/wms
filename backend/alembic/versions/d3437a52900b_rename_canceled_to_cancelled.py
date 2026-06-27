"""rename canceled to cancelled

Revision ID: d3437a52900b
Revises: cfd8947d315e
Create Date: 2026-06-27 05:46:22.635281

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3437a52900b'
down_revision: Union[str, None] = 'cfd8947d315e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update existing data
    op.execute("UPDATE stock_opname_sessions SET status = 'cancelled' WHERE status = 'canceled'")
    
    # Drop old constraint and create new one
    op.drop_constraint('chk_opname_status', 'stock_opname_sessions', type_='check')
    op.create_check_constraint('chk_opname_status', 'stock_opname_sessions', "status IN ('draft', 'completed', 'cancelled')")


def downgrade() -> None:
    # Update existing data back to canceled
    op.execute("UPDATE stock_opname_sessions SET status = 'canceled' WHERE status = 'cancelled'")
    
    # Drop new constraint and recreate old one
    op.drop_constraint('chk_opname_status', 'stock_opname_sessions', type_='check')
    op.create_check_constraint('chk_opname_status', 'stock_opname_sessions', "status IN ('draft', 'completed', 'canceled')")
