from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

from app.domain.enums import RecurringFrequency
from app.schemas.budget import CategoryResponse

class BillBase(BaseModel):
    name: str
    amount_estimated: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    due_day: int = Field(ge=1, le=31)
    frequency: RecurringFrequency = RecurringFrequency.monthly
    autopay_enabled: bool = False
    category_id: Optional[str] = None

class BillCreate(BillBase):
    pass

class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount_estimated: Optional[Decimal] = Field(default=None, gt=0)
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    frequency: Optional[RecurringFrequency] = None
    autopay_enabled: Optional[bool] = None
    category_id: Optional[str] = None

class BillResponse(BillBase):
    id: str
    user_id: str
    last_paid_at: Optional[datetime] = None
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
