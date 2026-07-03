from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Loan(Base):
    __tablename__ = "loans"
    __table_args__ = (
        CheckConstraint("principal_amount > 0", name="ck_loans_principal_positive"),
        CheckConstraint("interest_rate >= 0", name="ck_loans_interest_rate_non_negative"),
        CheckConstraint("tenure_months > 0", name="ck_loans_tenure_months_positive"),
        CheckConstraint("due_day >= 1 AND due_day <= 31", name="ck_loans_due_day_range"),
        CheckConstraint("emi_amount >= 0", name="ck_loans_emi_amount_non_negative"),
        CheckConstraint("status IN ('active', 'closed')", name="ck_loans_status_valid"),
        CheckConstraint("interest_type IN ('simple', 'compound')", name="ck_loans_interest_type_valid"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    principal_amount = Column(Numeric(14, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), nullable=False)  # Annual interest rate (e.g. 10.50%)
    tenure_months = Column(Integer, nullable=False)  # Tenure in months
    start_date = Column(Date, nullable=False)  # Loan start date
    due_day = Column(Integer, nullable=False)  # Day of month when EMI is due
    emi_amount = Column(Numeric(14, 2), nullable=False)  # EMI amount
    interest_type = Column(String, default="compound", nullable=False)  # simple, compound
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)  # Category (e.g. Loans)
    autopay_enabled = Column(Boolean, default=False)
    status = Column(String, default="active")  # active, closed
    last_paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    category = relationship("BudgetCategory", foreign_keys=[category_id])
    transactions = relationship("Transaction", back_populates="loan", cascade="all, delete-orphan")
