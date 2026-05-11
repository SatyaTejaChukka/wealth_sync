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
from datetime import datetime
from app.core.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_subscriptions_amount_non_negative"),
        CheckConstraint(
            "billing_cycle IN ('monthly', 'yearly')",
            name="ck_subscriptions_billing_cycle_valid",
        ),
        CheckConstraint("usage_count >= 0", name="ck_subscriptions_usage_count_non_negative"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    amount = Column(Numeric(14,2), nullable=False)
    billing_cycle = Column(String, default="monthly") # monthly, yearly
    next_billing_date = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0) # For "Cost per usage" analysis
    is_active = Column(Boolean, default=True)
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)
    
    # Relationship
    category = relationship("BudgetCategory", foreign_keys=[category_id])
