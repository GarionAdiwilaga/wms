"""initial

Revision ID: 001
Revises: 
Create Date: 2026-06-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # branches
    op.create_table('branches',
        sa.Column('branch_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('location', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('code = UPPER(code)', name='chk_branch_code_upper'),
        sa.PrimaryKeyConstraint('branch_id')
    )
    op.create_index(op.f('ix_branches_code'), 'branches', ['code'], unique=True)
    op.create_index(op.f('ix_branches_name'), 'branches', ['name'], unique=True)

    # categories
    op.create_table('categories',
        sa.Column('category_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('code = UPPER(code)', name='chk_category_code_upper'),
        sa.PrimaryKeyConstraint('category_id')
    )
    op.create_index(op.f('ix_categories_code'), 'categories', ['code'], unique=True)
    op.create_index(op.f('ix_categories_name'), 'categories', ['name'], unique=True)

    # suppliers
    op.create_table('suppliers',
        sa.Column('supplier_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('contact_person', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('code = UPPER(code)', name='chk_supplier_code_upper'),
        sa.PrimaryKeyConstraint('supplier_id')
    )
    op.create_index(op.f('ix_suppliers_code'), 'suppliers', ['code'], unique=True)
    op.create_index(op.f('ix_suppliers_name'), 'suppliers', ['name'], unique=True)

    # uom
    op.create_table('uom',
        sa.Column('uom_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('code = UPPER(code)', name='chk_uom_code_upper'),
        sa.PrimaryKeyConstraint('uom_id')
    )
    op.create_index(op.f('ix_uom_code'), 'uom', ['code'], unique=True)
    op.create_index(op.f('ix_uom_name'), 'uom', ['name'], unique=True)

    # users
    op.create_table('users',
        sa.Column('user_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('token_version', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("(role = 'super_admin') OR (branch_id IS NOT NULL)", name='chk_user_branch'),
        sa.CheckConstraint("role IN ('super_admin', 'branch_head', 'warehouse_staff')", name='chk_user_role'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.branch_id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index('idx_users_username_lower', 'users', [sa.text('lower(username)')], unique=True)
    op.create_index(op.f('ix_users_branch_id'), 'users', ['branch_id'], unique=False)

    # audit_logs
    op.create_table('audit_logs',
        sa.Column('log_id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.BigInteger(), nullable=False),
        sa.Column('old_values', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('new_values', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("action IN ('CREATE', 'UPDATE', 'DELETE')", name='chk_audit_log_action'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('log_id')
    )
    op.create_index('idx_audit_logs_created_at_brin', 'audit_logs', ['created_at'], unique=False, postgresql_using='brin')
    op.create_index('idx_audit_logs_entity', 'audit_logs', ['entity_type', 'entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index('idx_audit_logs_entity', table_name='audit_logs')
    op.drop_index('idx_audit_logs_created_at_brin', table_name='audit_logs', postgresql_using='brin')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_users_branch_id'), table_name='users')
    op.drop_index('idx_users_username_lower', table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_uom_name'), table_name='uom')
    op.drop_index(op.f('ix_uom_code'), table_name='uom')
    op.drop_table('uom')
    op.drop_index(op.f('ix_suppliers_name'), table_name='suppliers')
    op.drop_index(op.f('ix_suppliers_code'), table_name='suppliers')
    op.drop_table('suppliers')
    op.drop_index(op.f('ix_categories_name'), table_name='categories')
    op.drop_index(op.f('ix_categories_code'), table_name='categories')
    op.drop_table('categories')
    op.drop_index(op.f('ix_branches_name'), table_name='branches')
    op.drop_index(op.f('ix_branches_code'), table_name='branches')
    op.drop_table('branches')
