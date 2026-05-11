from sqlalchemy import CheckConstraint, Column, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from uuid import uuid4
from app.core.database import Base

class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    
    rules = relationship("BudgetRule", back_populates="category", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="category")

class BudgetRule(Base):
    __tablename__ = "budget_rules"
    __table_args__ = (
        CheckConstraint("allocation_value >= 0", name="ck_budget_rules_allocation_value_non_negative"),
        CheckConstraint(
            "monthly_limit IS NULL OR monthly_limit >= 0",
            name="ck_budget_rules_monthly_limit_non_negative",
        ),
        CheckConstraint(
            "allocation_type IN ('FIXED', 'PERCENT')",
            name="ck_budget_rules_allocation_type_valid",
        ),
        CheckConstraint(
            "allocation_type != 'PERCENT' OR allocation_value <= 100",
            name="ck_budget_rules_percent_max_100",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=False)
    allocation_type = Column(String, nullable=False) # FIXED or PERCENT
    allocation_value = Column(Numeric(14,2), nullable=False)
    monthly_limit = Column(Numeric(14,2), nullable=True)

    category = relationship("BudgetCategory", back_populates="rules")
