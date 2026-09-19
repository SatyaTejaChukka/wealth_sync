from datetime import datetime
from uuid import uuid4
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ElectricityAccount(Base):
    __tablename__ = "electricity_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, index=True, nullable=False)
    provider_code = Column(String, nullable=False)  # e.g., 'APSPDCL', 'BESCOM', 'MSEDCL', 'TSSPDCL', 'MOCK'
    consumer_number = Column(String, nullable=False)  # e.g. 13-digit service number or consumer ID
    consumer_name = Column(String, nullable=True)
    registered_mobile = Column(String, nullable=True)
    nickname = Column(String, nullable=True)  # e.g., "Home", "Parents House", "Office"
    category_id = Column(String, ForeignKey("budget_categories.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    autopay_enabled = Column(Boolean, default=False, nullable=False)
    last_checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    category = relationship("BudgetCategory", foreign_keys=[category_id])
    bills = relationship(
        "ElectricityBill",
        back_populates="account",
        cascade="all, delete-orphan",
        order_by="desc(ElectricityBill.bill_date)",
    )


class ElectricityBill(Base):
    __tablename__ = "electricity_bills"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    account_id = Column(String, ForeignKey("electricity_accounts.id"), index=True, nullable=False)
    bill_number = Column(String, nullable=False)
    bill_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    units_consumed = Column(Numeric(10, 2), nullable=True)
    status = Column(String, default="unpaid", nullable=False)  # 'unpaid', 'paid', 'overdue'
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=True)

    # Relationships
    account = relationship("ElectricityAccount", back_populates="bills")
    transaction = relationship("Transaction", foreign_keys=[transaction_id])
