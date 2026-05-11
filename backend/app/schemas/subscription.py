from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

from app.domain.enums import SubscriptionBillingCycle
from app.schemas.budget import CategoryResponse

class SubscriptionBase(BaseModel):
    name: str
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    billing_cycle: SubscriptionBillingCycle = SubscriptionBillingCycle.monthly
    next_billing_date: Optional[datetime] = None
    is_active: bool = True
    category_id: Optional[str] = None

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    billing_cycle: Optional[SubscriptionBillingCycle] = None
    next_billing_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    category_id: Optional[str] = None

class SubscriptionResponse(SubscriptionBase):
    id: str
    user_id: str
    usage_count: int
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
