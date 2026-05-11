from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

class SavingsGoalBase(BaseModel):
    name: str
    target_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    current_amount: Optional[Decimal] = Field(default=0, ge=0, max_digits=14, decimal_places=2)
    monthly_contribution: Optional[Decimal] = Field(default=0, ge=0, max_digits=14, decimal_places=2)
    target_date: Optional[datetime] = None
    priority: int = Field(default=5, ge=1, le=10)

class SavingsGoalCreate(SavingsGoalBase):
    pass

class SavingsGoalUpdate(SavingsGoalBase):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    current_amount: Optional[Decimal] = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    monthly_contribution: Optional[Decimal] = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    target_date: Optional[datetime] = None
    priority: Optional[int] = Field(default=None, ge=1, le=10)
    is_completed: Optional[bool] = None

class SavingsGoalResponse(SavingsGoalBase):
    id: str
    user_id: str
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SavingsLogResponse(BaseModel):
    id: str
    goal_id: str
    amount: Decimal
    note: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class SavingsContribution(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    note: Optional[str] = None
