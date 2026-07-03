from typing import Any, List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from uuid import uuid4
from datetime import datetime, date
from decimal import Decimal

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.lent_money import LentMoney
from app.models.transaction import Transaction
from app.schemas.lent_money import (
    LentMoneyCreate,
    LentMoneyUpdate,
    LentMoneyResponse,
    LentMoneyDetailsResponse
)
from app.schemas.transaction import TransactionResponse
from app.services.lent_money_service import LentMoneyService

router = APIRouter()


@router.get("/", response_model=List[LentMoneyResponse])
async def list_lent_records(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Optional[str] = Query(default=None, pattern="^(active|settled)$")
) -> Any:
    """
    Retrieve all user lent portfolios.
    """
    query = select(LentMoney).options(selectinload(LentMoney.category)).filter(LentMoney.user_id == current_user.id)
    if status:
        query = query.filter(LentMoney.status == status)

    query = query.order_by(LentMoney.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=LentMoneyResponse, status_code=status.HTTP_201_CREATED)
async def create_lent_record(
    lent_in: LentMoneyCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create a new lending profile and automatically log the initial cash outflow in the ledger.
    """
    lent_data = lent_in.model_dump()
    lent = LentMoney(
        id=str(uuid4()),
        user_id=current_user.id,
        **lent_data
    )
    db.add(lent)
    
    # Auto-log the cash outflow transaction representing the principal lent
    lent_date_dt = datetime.combine(lent.lent_at, datetime.min.time())
    transaction = Transaction(
        id=str(uuid4()),
        user_id=current_user.id,
        category_id=lent.category_id,
        amount=lent.principal_amount,
        type="EXPENSE",
        description=f"Lent Principal: {lent.borrower_name}",
        occurred_at=lent_date_dt,
        status="completed",
        lent_id=lent.id
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(lent, ["category"])
    return lent


@router.get("/{lent_id}", response_model=LentMoneyDetailsResponse)
async def get_lent_record_details(
    lent_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Retrieve detail metrics for a lent profile (elapsed days/months, accrued interest, repayments list, outstanding balance).
    """
    result = await db.execute(
        select(LentMoney).options(selectinload(LentMoney.category)).filter(
            LentMoney.id == lent_id,
            LentMoney.user_id == current_user.id
        )
    )
    lent = result.scalars().first()
    if not lent:
        raise HTTPException(status_code=404, detail="Lending profile not found")

    details = await LentMoneyService.get_lent_status_details(db, lent)
    return details


@router.put("/{lent_id}", response_model=LentMoneyResponse)
async def update_lent_record(
    lent_id: str,
    lent_in: LentMoneyUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Update details of a lent profile.
    """
    result = await db.execute(
        select(LentMoney).options(selectinload(LentMoney.category)).filter(
            LentMoney.id == lent_id,
            LentMoney.user_id == current_user.id
        )
    )
    lent = result.scalars().first()
    if not lent:
        raise HTTPException(status_code=404, detail="Lending profile not found")

    update_data = lent_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lent, field, value)

    db.add(lent)
    await db.commit()
    await db.refresh(lent)
    return lent


@router.delete("/{lent_id}", response_model=LentMoneyResponse)
async def delete_lent_record(
    lent_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Remove a lending record.
    """
    result = await db.execute(
        select(LentMoney).filter(
            LentMoney.id == lent_id,
            LentMoney.user_id == current_user.id
        )
    )
    lent = result.scalars().first()
    if not lent:
        raise HTTPException(status_code=404, detail="Lending profile not found")

    await db.delete(lent)
    await db.commit()
    return lent


@router.post("/{lent_id}/repay", response_model=TransactionResponse)
async def record_repayment(
    lent_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    amount: float = Query(gt=0),
    notes: Optional[str] = Query(default=None)
) -> Any:
    """
    Record an income payment received from the borrower. Automatically settles the portfolio if balance becomes zero.
    """
    result = await db.execute(
        select(LentMoney).filter(
            LentMoney.id == lent_id,
            LentMoney.user_id == current_user.id
        )
    )
    lent = result.scalars().first()
    if not lent:
        raise HTTPException(status_code=404, detail="Lending profile not found")

    if lent.status == "settled":
        raise HTTPException(status_code=400, detail="Lending profile is already fully settled")

    # Log income transaction
    transaction = Transaction(
        id=str(uuid4()),
        user_id=current_user.id,
        category_id=lent.category_id,
        amount=amount,
        type="INCOME",
        description=notes or f"Repayment: {lent.borrower_name}",
        occurred_at=datetime.utcnow(),
        status="completed",
        lent_id=lent.id
    )
    db.add(transaction)

    # Check new status
    details = await LentMoneyService.get_lent_status_details(db, lent)
    new_outstanding = details["outstanding_balance"] - Decimal(str(amount))
    
    if new_outstanding <= 0:
        lent.status = "settled"
        db.add(lent)

    await db.commit()
    await db.refresh(transaction, ["category"])
    return transaction
