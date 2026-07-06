from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

from app.domain.enums import TransactionStatus, TransactionType
from app.schemas.budget import CategoryResponse


class TransactionBase(BaseModel):
    category_id: Optional[str] = None
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    type: TransactionType
    description: Optional[str] = None
    occurred_at: Optional[datetime] = None
    status: Optional[TransactionStatus] = TransactionStatus.completed
    bill_id: Optional[str] = None
    subscription_id: Optional[str] = None
    loan_id: Optional[str] = None
    lent_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    type: Optional[TransactionType] = None
    description: Optional[str] = None
    occurred_at: Optional[datetime] = None
    status: Optional[TransactionStatus] = None
    bill_id: Optional[str] = None
    subscription_id: Optional[str] = None
    loan_id: Optional[str] = None
    lent_id: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
