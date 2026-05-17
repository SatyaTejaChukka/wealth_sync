from decimal import Decimal
from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import uuid4

from app.api import deps
from app.core.database import get_db
from app.domain.enums import RecurringFrequency
from app.models.user import User
from app.models.income import IncomeSource
from app.schemas.income import IncomeSourceCreate, IncomeSourceUpdate, IncomeSourceResponse

router = APIRouter()

SUPPORTED_FREQUENCIES = {frequency.value for frequency in RecurringFrequency}


def _normalize_frequency(value: str | RecurringFrequency | None) -> str:
    if isinstance(value, RecurringFrequency):
        normalized = value.value
    else:
        normalized = (value or "").strip().lower()
    if normalized not in SUPPORTED_FREQUENCIES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid frequency '{value}'. "
                f"Supported values: {', '.join(sorted(SUPPORTED_FREQUENCIES))}."
            ),
        )
    return normalized


def _parse_day_from_payday(payday: str | None) -> int | None:
    if payday is None:
        return None
    cleaned = payday.strip()
    if not cleaned:
        return None
    digits = "".join(ch for ch in cleaned if ch.isdigit())
    if not digits:
        return None
    day = int(digits)
    if day < 1 or day > 31:
        return None
    return day


def _validate_income_payload(
    *,
    amount: Any,
    frequency: str,
    payday: str | None,
    active: bool,
) -> None:
    if amount is None or Decimal(str(amount)) <= 0:
        raise HTTPException(status_code=422, detail="Income amount must be greater than zero.")

    if active and frequency == "monthly":
        payday_day = _parse_day_from_payday(payday)
        if payday_day is None:
            raise HTTPException(
                status_code=422,
                detail="For active monthly income, set salary credit day (1-31).",
            )

@router.post("/", response_model=IncomeSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    income_in: IncomeSourceCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create a new income source.
    """
    payload = income_in.model_dump()
    payload["frequency"] = _normalize_frequency(payload.get("frequency"))
    _validate_income_payload(
        amount=payload.get("amount"),
        frequency=payload.get("frequency"),
        payday=payload.get("payday"),
        active=bool(payload.get("active")),
    )

    income = IncomeSource(
        id=str(uuid4()),
        user_id=current_user.id,
        **payload
    )
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income

@router.get("/", response_model=List[IncomeSourceResponse])
async def read_incomes(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Retrieve all income sources for the current user.
    """
    result = await db.execute(select(IncomeSource).filter(IncomeSource.user_id == current_user.id))
    incomes = result.scalars().all()
    return incomes

@router.put("/{income_id}", response_model=IncomeSourceResponse)
async def update_income(
    income_id: str,
    income_in: IncomeSourceUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Update an income source.
    """
    result = await db.execute(
        select(IncomeSource).filter(IncomeSource.id == income_id, IncomeSource.user_id == current_user.id)
    )
    income = result.scalars().first()
    if not income:
        raise HTTPException(status_code=404, detail="Income source not found")

    update_data = income_in.model_dump(exclude_unset=True)

    merged_amount = update_data.get("amount", income.amount)
    merged_frequency = _normalize_frequency(update_data.get("frequency", income.frequency))
    merged_payday = update_data.get("payday", income.payday)
    merged_active = bool(update_data.get("active", income.active))

    _validate_income_payload(
        amount=merged_amount,
        frequency=merged_frequency,
        payday=merged_payday,
        active=merged_active,
    )

    update_data["frequency"] = merged_frequency

    for field, value in update_data.items():
        setattr(income, field, value)

    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income

@router.delete("/{income_id}", response_model=IncomeSourceResponse)
async def delete_income(
    income_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Delete an income source.
    """
    result = await db.execute(
        select(IncomeSource).filter(IncomeSource.id == income_id, IncomeSource.user_id == current_user.id)
    )
    income = result.scalars().first()
    if not income:
        raise HTTPException(status_code=404, detail="Income source not found")

    await db.delete(income)
    await db.commit()
    return income
