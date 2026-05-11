from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class AutopilotPayment(Base):
    __tablename__ = "autopilot_payments"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "source_type",
            "source_id",
            "due_on",
            name="uq_autopilot_payment_source_cycle",
        ),
        UniqueConstraint(
            "execution_idempotency_key",
            name="uq_autopilot_payment_execution_idempotency_key",
        ),
        CheckConstraint(
            "source_type IN ('BILL', 'SUBSCRIPTION', 'GOAL')",
            name="ck_autopilot_payments_source_type_valid",
        ),
        CheckConstraint(
            (
                "status IN "
                "('approval_required', 'approved', 'processing', 'succeeded', 'failed', 'cancelled')"
            ),
            name="ck_autopilot_payments_status_valid",
        ),
        CheckConstraint("amount >= 0", name="ck_autopilot_payments_amount_non_negative"),
        CheckConstraint("length(currency) = 3", name="ck_autopilot_payments_currency_len_3"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)

    # BILL | SUBSCRIPTION | GOAL
    source_type = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String, nullable=False, default="INR")

    due_on = Column(Date, index=True, nullable=False)

    # approval_required | approved | processing | succeeded | failed | cancelled
    status = Column(String, nullable=False, default="approval_required")
    approval_required = Column(Boolean, nullable=False, default=True)

    # internal_ledger | provider_name
    provider = Column(String, nullable=False, default="internal_ledger")
    provider_reference = Column(String, nullable=True)
    provider_action_url = Column(String, nullable=True)
    failure_reason = Column(Text, nullable=True)
    execution_idempotency_key = Column(String, nullable=True)

    approved_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=True)
    meta_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    category = relationship("BudgetCategory", foreign_keys=[category_id])
    transaction = relationship("Transaction", foreign_keys=[transaction_id])
    state_history = relationship(
        "AutopilotPaymentStateHistory",
        back_populates="payment",
        cascade="all, delete-orphan",
    )


class AutopilotPaymentStateHistory(Base):
    __tablename__ = "autopilot_payment_state_history"
    __table_args__ = (
        UniqueConstraint(
            "payment_id",
            "event_type",
            "idempotency_key",
            name="uq_autopilot_payment_state_history_event_idempotency",
        ),
        CheckConstraint(
            (
                "to_status IN "
                "('approval_required', 'approved', 'processing', 'succeeded', 'failed', 'cancelled')"
            ),
            name="ck_autopilot_state_history_to_status_valid",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    payment_id = Column(String, ForeignKey("autopilot_payments.id"), nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    trace_id = Column(String, nullable=True)
    actor_user_id = Column(String, nullable=True)
    idempotency_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    payment = relationship("AutopilotPayment", back_populates="state_history")
