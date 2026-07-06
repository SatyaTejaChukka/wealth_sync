from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field

from app.domain.enums import RecurringFrequency

class IncomeSourceBase(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    frequency: RecurringFrequency = RecurringFrequency.monthly
    payday: Optional[str] = None
    active: bool = True

class IncomeSourceCreate(IncomeSourceBase):
    pass

class IncomeSourceUpdate(IncomeSourceBase):
    amount: Optional[Decimal] = Field(default=None, gt=0)
    frequency: Optional[RecurringFrequency] = None
    active: Optional[bool] = None

class IncomeSourceResponse(IncomeSourceBase):
    id: str
    user_id: str

    class Config:
        from_attributes = True
