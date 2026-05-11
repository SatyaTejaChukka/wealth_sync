from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_transactions_amount_non_negative"),
        CheckConstraint("type IN ('INCOME', 'EXPENSE')", name="ck_transactions_type_valid"),
        CheckConstraint(
            "status IN ('pending', 'completed', 'cancelled')",
            name="ck_transactions_status_valid",
        ),
        CheckConstraint(
            "bill_id IS NULL OR subscription_id IS NULL",
            name="ck_transactions_single_source_link",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)
    amount = Column(Numeric(14,2), nullable=False)
    type = Column(String, nullable=False) # INCOME or EXPENSE
    description = Column(String, nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Bill tracking fields
    status = Column(String, default="completed") # pending, completed, cancelled
    bill_id = Column(String, ForeignKey("bills.id"), nullable=True)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=True)

    category = relationship("BudgetCategory", back_populates="transactions")
