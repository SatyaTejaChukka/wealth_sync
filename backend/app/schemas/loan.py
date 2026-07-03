from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.budget import CategoryResponse


class LoanBase(BaseModel):
    name: str = Field(min_length=1)
    principal_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    interest_rate: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    tenure_months: int = Field(gt=0)
    start_date: date
    due_day: int = Field(ge=1, le=31)
    interest_type: str = Field(default="compound", pattern="^(simple|compound)$")
    category_id: Optional[str] = None
    autopay_enabled: bool = False


class LoanCreate(LoanBase):
    emi_amount: Optional[Decimal] = Field(default=None, ge=0)


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    principal_amount: Optional[Decimal] = Field(default=None, gt=0)
    interest_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)
    tenure_months: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[date] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    interest_type: Optional[str] = Field(default=None, pattern="^(simple|compound)$")
    category_id: Optional[str] = None
    autopay_enabled: Optional[bool] = None
    status: Optional[str] = None


class LoanResponse(LoanBase):
    id: str
    user_id: str
    emi_amount: Decimal
    status: str
    last_paid_at: Optional[datetime] = None
    category: Optional[CategoryResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LoanCalculateRequest(BaseModel):
    principal_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    interest_rate: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    tenure_months: int = Field(gt=0)
    emi_amount: Optional[Decimal] = Field(default=None, ge=0)
    interest_type: str = Field(default="compound", pattern="^(simple|compound)$")


class AmortizationPeriod(BaseModel):
    month: int
    emi_amount: Decimal
    principal_paid: Decimal
    interest_paid: Decimal
    remaining_principal: Decimal


class LoanCalculateResponse(BaseModel):
    emi_amount: Decimal
    total_interest: Decimal
    total_amount: Decimal
    amortization_schedule: List[AmortizationPeriod]


class LoanDetailsResponse(BaseModel):
    loan: LoanResponse
    outstanding_principal: Decimal
    total_principal_paid: Decimal
    total_interest_paid: Decimal
    remaining_tenure_months: int
    next_due_date: Optional[datetime] = None
    amortization_schedule: List[AmortizationPeriod]
