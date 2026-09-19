"""add_electricity_accounts_and_bills

Revision ID: a1c2e3f4d5e6
Revises: f28d9d1ad4e3
Create Date: 2026-09-17 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c2e3f4d5e6'
down_revision: Union[str, None] = 'f28d9d1ad4e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'electricity_accounts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('provider_code', sa.String(), nullable=False),
        sa.Column('consumer_number', sa.String(), nullable=False),
        sa.Column('consumer_name', sa.String(), nullable=True),
        sa.Column('registered_mobile', sa.String(), nullable=True),
        sa.Column('nickname', sa.String(), nullable=True),
        sa.Column('category_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('autopay_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('last_checked_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['category_id'], ['budget_categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_electricity_accounts_user_id'), 'electricity_accounts', ['user_id'], unique=False)

    op.create_table(
        'electricity_bills',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('account_id', sa.String(), nullable=False),
        sa.Column('bill_number', sa.String(), nullable=False),
        sa.Column('bill_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('units_consumed', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='unpaid'),
        sa.Column('fetched_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('transaction_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['electricity_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_electricity_bills_account_id'), 'electricity_bills', ['account_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_electricity_bills_account_id'), table_name='electricity_bills')
    op.drop_table('electricity_bills')
    op.drop_index(op.f('ix_electricity_accounts_user_id'), table_name='electricity_accounts')
    op.drop_table('electricity_accounts')
