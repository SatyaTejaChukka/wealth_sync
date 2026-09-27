from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional
from typing_extensions import Annotated
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, PlainSerializer


def _coerce_money(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


# Validates inputs to Decimal and serializes cleanly as float in JSON responses
Money = Annotated[
    Decimal,
    BeforeValidator(_coerce_money),
    PlainSerializer(
        lambda v: float(round(Decimal(str(v or 0)), 2)),
        return_type=float,
    ),
]


class VaultBasis(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    balance_source: str = "tracked_ledger"
    horizon_start: date
    horizon_end: date
    horizon_source: str  # "next_income_date" | "month_end_fallback"
    next_income_date: Optional[date] = None
    included_transaction_statuses: List[str] = Field(
        default_factory=lambda: ["completed", "legacy_null"]
    )


class ProtectedVaultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source_type: str  # "BILL" | "LOAN" | "SUBSCRIPTION"
    source_id: str
    name: str
    amount: Money
    due_on: date
    payment_status: Optional[str] = None
    provider_action_url: Optional[str] = None


class ProtectedVaultBucket(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    amount: Money
    item_count: int
    items: List[ProtectedVaultItem] = Field(default_factory=list)


class FutureVaultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    goal_id: str
    name: str
    planned_amount: Money
    completed_amount: Money
    reserved_amount: Money
    target_date: Optional[date] = None


class FutureVaultBucket(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    amount: Money
    item_count: int
    items: List[FutureVaultItem] = Field(default_factory=list)


class FreeVaultBucket(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    amount: Money
    daily_amount: Money
    days_remaining: int


class VaultBuckets(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    protected: ProtectedVaultBucket
    future: FutureVaultBucket
    free: FreeVaultBucket


class VaultIntegrity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state: str  # "covered" | "shortfall" | "incomplete"
    reserve_total: Money
    shortfall_amount: Money
    coverage_percent: float
    message: str


class VaultDataQuality(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state: str  # "ready" | "warning" | "needs_setup"
    reasons: List[str] = Field(default_factory=list)


class CommitmentVaultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    generated_at: datetime
    basis: VaultBasis
    tracked_balance: Money
    vaults: VaultBuckets
    integrity: VaultIntegrity
    data_quality: VaultDataQuality


class CommitmentVaultSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tracked_balance: Money
    protected_amount: Money
    future_amount: Money
    free_amount: Money
    integrity_state: str  # "covered" | "shortfall" | "incomplete"
    shortfall_amount: Money
    horizon_end: date
