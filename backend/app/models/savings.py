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

class SavingsGoal(Base):
    __tablename__ = "savings_goals"
    __table_args__ = (
        CheckConstraint("target_amount >= 0", name="ck_savings_goals_target_non_negative"),
        CheckConstraint("current_amount >= 0", name="ck_savings_goals_current_non_negative"),
        CheckConstraint(
            "monthly_contribution >= 0",
            name="ck_savings_goals_monthly_contribution_non_negative",
        ),
        CheckConstraint("priority >= 1 AND priority <= 10", name="ck_savings_goals_priority_range"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(14,2), nullable=False)
    current_amount = Column(Numeric(14,2), default=0)
    monthly_contribution = Column(Numeric(14,2), default=0)
    target_date = Column(DateTime, nullable=True)
    priority = Column(Integer, default=5) # 1-10
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    logs = relationship("SavingsLog", back_populates="goal", cascade="all, delete-orphan")

class SavingsLog(Base):
    __tablename__ = "savings_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    goal_id = Column(String, ForeignKey("savings_goals.id"), nullable=False)
    amount = Column(Numeric(14,2), nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    goal = relationship("SavingsGoal", back_populates="logs")
