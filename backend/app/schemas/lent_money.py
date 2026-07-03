from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

from app.schemas.budget import CategoryResponse
from app.schemas.transaction import TransactionResponse


class LentMoneyBase(BaseModel):
    borrower_name: str = Field(min_length=1)
    principal_amount: Decimal = Field(gt=0)
    interest_rate_type: str = Field(pattern="^(percentage|rupees_per_amount)$")
    interest_rate_val: Decimal = Field(ge=0)
    interest_rate_basis: Optional[Decimal] = Field(default=100.0, ge=0)
    interest_frequency: str = Field(default="monthly", pattern="^(monthly|yearly)$")
    interest_type: str = Field(default="simple", pattern="^(simple|compound)$")
    lent_at: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    category_id: Optional[str] = None


class LentMoneyCreate(LentMoneyBase):
    @model_validator(mode="after")
    def validate_rate_basis(self) -> "LentMoneyCreate":
        if self.interest_rate_type == "rupees_per_amount":
            if self.interest_rate_basis is None or self.interest_rate_basis <= 0:
                raise ValueError("interest_rate_basis must be greater than 0 when rate type is rupees_per_amount")
        return self


class LentMoneyUpdate(BaseModel):
    borrower_name: Optional[str] = None
    principal_amount: Optional[Decimal] = Field(default=None, gt=0)
    interest_rate_type: Optional[str] = Field(default=None, pattern="^(percentage|rupees_per_amount)$")
    interest_rate_val: Optional[Decimal] = Field(default=None, ge=0)
    interest_rate_basis: Optional[Decimal] = Field(default=None, ge=0)
    interest_frequency: Optional[str] = Field(default=None, pattern="^(monthly|yearly)$")
    interest_type: Optional[str] = Field(default=None, pattern="^(simple|compound)$")
    lent_at: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    category_id: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(active|settled)$")


class LentMoneyResponse(LentMoneyBase):
    id: str
    user_id: str
    status: str
    category: Optional[CategoryResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ElapsedDuration(BaseModel):
    years: int
    months: int
    days: int


class LentMoneyDetailsResponse(BaseModel):
    lent_record: LentMoneyResponse
    accrued_interest: Decimal
    total_repayments: Decimal
    outstanding_balance: Decimal
    elapsed_duration: ElapsedDuration
    transactions: List[TransactionResponse]
