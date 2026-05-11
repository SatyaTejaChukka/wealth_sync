"""add_invariants_and_autopilot_history

Revision ID: 2c8fd7c5b2da
Revises: 1f2b6f8c0e11
Create Date: 2026-02-25 18:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2c8fd7c5b2da"
down_revision: Union[str, None] = "1f2b6f8c0e11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Core invariants
    op.create_check_constraint(
        "ck_transactions_amount_non_negative",
        "transactions",
        "amount >= 0",
    )
    op.create_check_constraint(
        "ck_transactions_type_valid",
        "transactions",
        "type IN ('INCOME', 'EXPENSE')",
    )
    op.create_check_constraint(
        "ck_transactions_status_valid",
        "transactions",
        "status IN ('pending', 'completed', 'cancelled')",
    )
    op.create_check_constraint(
        "ck_transactions_single_source_link",
        "transactions",
        "bill_id IS NULL OR subscription_id IS NULL",
    )

    op.create_check_constraint(
        "ck_budget_rules_allocation_value_non_negative",
        "budget_rules",
        "allocation_value >= 0",
    )
    op.create_check_constraint(
        "ck_budget_rules_monthly_limit_non_negative",
        "budget_rules",
        "monthly_limit IS NULL OR monthly_limit >= 0",
    )
    op.create_check_constraint(
        "ck_budget_rules_allocation_type_valid",
        "budget_rules",
        "allocation_type IN ('FIXED', 'PERCENT')",
    )
    op.create_check_constraint(
        "ck_budget_rules_percent_max_100",
        "budget_rules",
        "allocation_type != 'PERCENT' OR allocation_value <= 100",
    )

    op.create_check_constraint(
        "ck_bills_amount_non_negative",
        "bills",
        "amount_estimated >= 0",
    )
    op.create_check_constraint(
        "ck_bills_due_day_range",
        "bills",
        "due_day >= 1 AND due_day <= 31",
    )
    op.create_check_constraint(
        "ck_bills_frequency_valid",
        "bills",
        "frequency IN ('monthly', 'weekly', 'biweekly', 'yearly', 'daily')",
    )

    op.create_check_constraint(
        "ck_income_sources_amount_non_negative",
        "income_sources",
        "amount >= 0",
    )
    op.create_check_constraint(
        "ck_income_sources_frequency_valid",
        "income_sources",
        "frequency IN ('monthly', 'weekly', 'biweekly', 'yearly', 'daily')",
    )

    op.create_check_constraint(
        "ck_subscriptions_amount_non_negative",
        "subscriptions",
        "amount >= 0",
    )
    op.create_check_constraint(
        "ck_subscriptions_billing_cycle_valid",
        "subscriptions",
        "billing_cycle IN ('monthly', 'yearly')",
    )
    op.create_check_constraint(
        "ck_subscriptions_usage_count_non_negative",
        "subscriptions",
        "usage_count >= 0",
    )

    op.create_check_constraint(
        "ck_savings_goals_target_non_negative",
        "savings_goals",
        "target_amount >= 0",
    )
    op.create_check_constraint(
        "ck_savings_goals_current_non_negative",
        "savings_goals",
        "current_amount >= 0",
    )
    op.create_check_constraint(
        "ck_savings_goals_monthly_contribution_non_negative",
        "savings_goals",
        "monthly_contribution >= 0",
    )
    op.create_check_constraint(
        "ck_savings_goals_priority_range",
        "savings_goals",
        "priority >= 1 AND priority <= 10",
    )

    # Autopilot hardening
    op.add_column(
        "autopilot_payments",
        sa.Column("execution_idempotency_key", sa.String(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_autopilot_payment_execution_idempotency_key",
        "autopilot_payments",
        ["execution_idempotency_key"],
    )
    op.create_check_constraint(
        "ck_autopilot_payments_source_type_valid",
        "autopilot_payments",
        "source_type IN ('BILL', 'SUBSCRIPTION', 'GOAL')",
    )
    op.create_check_constraint(
        "ck_autopilot_payments_status_valid",
        "autopilot_payments",
        (
            "status IN "
            "('approval_required', 'approved', 'processing', 'succeeded', 'failed', 'cancelled')"
        ),
    )
    op.create_check_constraint(
        "ck_autopilot_payments_amount_non_negative",
        "autopilot_payments",
        "amount >= 0",
    )
    op.create_check_constraint(
        "ck_autopilot_payments_currency_len_3",
        "autopilot_payments",
        "length(currency) = 3",
    )

    op.create_table(
        "autopilot_payment_state_history",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("payment_id", sa.String(), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("trace_id", sa.String(), nullable=True),
        sa.Column("actor_user_id", sa.String(), nullable=True),
        sa.Column("idempotency_key", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            (
                "to_status IN "
                "('approval_required', 'approved', 'processing', 'succeeded', 'failed', 'cancelled')"
            ),
            name="ck_autopilot_state_history_to_status_valid",
        ),
        sa.ForeignKeyConstraint(["payment_id"], ["autopilot_payments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "payment_id",
            "event_type",
            "idempotency_key",
            name="uq_autopilot_payment_state_history_event_idempotency",
        ),
    )
    op.create_index(
        op.f("ix_autopilot_payment_state_history_payment_id"),
        "autopilot_payment_state_history",
        ["payment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_autopilot_payment_state_history_payment_id"),
        table_name="autopilot_payment_state_history",
    )
    op.drop_table("autopilot_payment_state_history")

    op.drop_constraint(
        "ck_autopilot_payments_currency_len_3",
        "autopilot_payments",
        type_="check",
    )
    op.drop_constraint(
        "ck_autopilot_payments_amount_non_negative",
        "autopilot_payments",
        type_="check",
    )
    op.drop_constraint(
        "ck_autopilot_payments_status_valid",
        "autopilot_payments",
        type_="check",
    )
    op.drop_constraint(
        "ck_autopilot_payments_source_type_valid",
        "autopilot_payments",
        type_="check",
    )
    op.drop_constraint(
        "uq_autopilot_payment_execution_idempotency_key",
        "autopilot_payments",
        type_="unique",
    )
    op.drop_column("autopilot_payments", "execution_idempotency_key")

    op.drop_constraint("ck_savings_goals_priority_range", "savings_goals", type_="check")
    op.drop_constraint(
        "ck_savings_goals_monthly_contribution_non_negative",
        "savings_goals",
        type_="check",
    )
    op.drop_constraint("ck_savings_goals_current_non_negative", "savings_goals", type_="check")
    op.drop_constraint("ck_savings_goals_target_non_negative", "savings_goals", type_="check")

    op.drop_constraint("ck_subscriptions_usage_count_non_negative", "subscriptions", type_="check")
    op.drop_constraint("ck_subscriptions_billing_cycle_valid", "subscriptions", type_="check")
    op.drop_constraint("ck_subscriptions_amount_non_negative", "subscriptions", type_="check")

    op.drop_constraint("ck_income_sources_frequency_valid", "income_sources", type_="check")
    op.drop_constraint("ck_income_sources_amount_non_negative", "income_sources", type_="check")

    op.drop_constraint("ck_bills_frequency_valid", "bills", type_="check")
    op.drop_constraint("ck_bills_due_day_range", "bills", type_="check")
    op.drop_constraint("ck_bills_amount_non_negative", "bills", type_="check")

    op.drop_constraint("ck_budget_rules_percent_max_100", "budget_rules", type_="check")
    op.drop_constraint("ck_budget_rules_allocation_type_valid", "budget_rules", type_="check")
    op.drop_constraint(
        "ck_budget_rules_monthly_limit_non_negative",
        "budget_rules",
        type_="check",
    )
    op.drop_constraint(
        "ck_budget_rules_allocation_value_non_negative",
        "budget_rules",
        type_="check",
    )

    op.drop_constraint("ck_transactions_single_source_link", "transactions", type_="check")
    op.drop_constraint("ck_transactions_status_valid", "transactions", type_="check")
    op.drop_constraint("ck_transactions_type_valid", "transactions", type_="check")
    op.drop_constraint("ck_transactions_amount_non_negative", "transactions", type_="check")
