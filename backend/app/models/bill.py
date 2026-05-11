from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship
from uuid import uuid4
from app.core.database import Base

class Bill(Base):
    __tablename__ = "bills"
    __table_args__ = (
        CheckConstraint("amount_estimated >= 0", name="ck_bills_amount_non_negative"),
        CheckConstraint("due_day >= 1 AND due_day <= 31", name="ck_bills_due_day_range"),
        CheckConstraint(
            "frequency IN ('monthly', 'weekly', 'biweekly', 'yearly', 'daily')",
            name="ck_bills_frequency_valid",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    amount_estimated = Column(Numeric(14,2), nullable=False)
    due_day = Column(Integer, nullable=False) # 1-31
    frequency = Column(String, default="monthly")
    autopay_enabled = Column(Boolean, default=False)
    last_paid_at = Column(DateTime, nullable=True)
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)
    
    # Relationship
    category = relationship("BudgetCategory", foreign_keys=[category_id])
