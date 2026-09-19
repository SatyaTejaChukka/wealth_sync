from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ElectricityProviderInfo(BaseModel):
    code: str
    name: str
    state: str
    consumer_number_label: str = "Service Number / Consumer Number"
    help_text: str = "Enter your electricity connection number"
    sample_consumer_number: str = "1311200045678"


class ElectricityBillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    bill_number: str
    bill_date: date
    due_date: date
    amount: float
    units_consumed: Optional[float] = None
    status: str
    fetched_at: datetime
    paid_at: Optional[datetime] = None
    transaction_id: Optional[str] = None


class ElectricityAccountCreate(BaseModel):
    provider_code: str = Field(..., description="Provider code e.g. APSPDCL, BESCOM, TSSPDCL, MSEDCL, MOCK")
    consumer_number: str = Field(..., min_length=3, max_length=30, description="Service number or Consumer ID")
    registered_mobile: Optional[str] = Field(None, max_length=15)
    nickname: Optional[str] = Field(None, max_length=100, description="e.g. Home, Apartment, Office")
    category_id: Optional[str] = None
    autopay_enabled: bool = False


class ElectricityAccountUpdate(BaseModel):
    nickname: Optional[str] = None
    category_id: Optional[str] = None
    autopay_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class ElectricityAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    provider_code: str
    consumer_number: str
    consumer_name: Optional[str] = None
    registered_mobile: Optional[str] = None
    nickname: Optional[str] = None
    category_id: Optional[str] = None
    is_active: bool
    autopay_enabled: bool
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    bills: List[ElectricityBillResponse] = []
    latest_bill: Optional[ElectricityBillResponse] = None


class ElectricityFetchPreview(BaseModel):
    provider_code: str
    consumer_number: str
    consumer_name: str
    bill_number: str
    bill_date: date
    due_date: date
    amount: float
    units_consumed: Optional[float] = None


class ElectricityPayRequest(BaseModel):
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None
