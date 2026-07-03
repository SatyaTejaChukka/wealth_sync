from datetime import datetime, date
from uuid import uuid4
from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class LentMoney(Base):
    __tablename__ = "debts_lent"
    __table_args__ = (
        CheckConstraint("principal_amount > 0", name="ck_debts_lent_principal_positive"),
        CheckConstraint("interest_rate_val >= 0", name="ck_debts_lent_interest_rate_val_non_negative"),
        CheckConstraint("status IN ('active', 'settled')", name="ck_debts_lent_status_valid"),
        CheckConstraint("interest_rate_type IN ('percentage', 'rupees_per_amount')", name="ck_debts_lent_rate_type_valid"),
        CheckConstraint("interest_frequency IN ('monthly', 'yearly')", name="ck_debts_lent_frequency_valid"),
        CheckConstraint("interest_type IN ('simple', 'compound')", name="ck_debts_lent_interest_type_valid"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    borrower_name = Column(String, nullable=False)
    principal_amount = Column(Numeric(14, 2), nullable=False)
    interest_rate_type = Column(String, nullable=False)  # 'percentage', 'rupees_per_amount'
    interest_rate_val = Column(Numeric(10, 2), nullable=False)  # e.g., 12.00 (%) or 2.00 (rupees)
    interest_rate_basis = Column(Numeric(14, 2), default=100.0, nullable=True)  # e.g., 100 in 2rs for 100rs
    interest_frequency = Column(String, default="monthly", nullable=False)  # 'monthly', 'yearly'
    interest_type = Column(String, default="simple", nullable=False)  # 'simple', 'compound'
    lent_at = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String, default="active")  # 'active', 'settled'
    notes = Column(String, nullable=True)
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    category = relationship("BudgetCategory", foreign_keys=[category_id])
    transactions = relationship("Transaction", back_populates="lent_record", cascade="all, delete-orphan")
