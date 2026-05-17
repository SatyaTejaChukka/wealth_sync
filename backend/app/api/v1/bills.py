from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import uuid4
from datetime import datetime

from app.api import deps
from app.api.validators import ensure_category_owned
from app.core.database import get_db
from app.models.user import User
from app.models.bill import Bill
from app.schemas.bill import BillCreate, BillUpdate, BillResponse

router = APIRouter()

@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    bill_in: BillCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create a new bill.
    """
    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=bill_in.category_id,
    )

    bill = Bill(
        id=str(uuid4()),
        user_id=current_user.id,
        **bill_in.model_dump()
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    
    # Load the bill with category relationship
    result = await db.execute(
        select(Bill).options(selectinload(Bill.category)).where(Bill.id == bill.id)
    )
    bill = result.scalar_one()
    return bill

@router.get("/", response_model=List[BillResponse])
async def read_bills(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Retrieve all bills.
    """
    result = await db.execute(
        select(Bill).options(selectinload(Bill.category)).filter(Bill.user_id == current_user.id)
    )
    bills = result.scalars().all()
    return bills

@router.put("/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: str,
    bill_in: BillUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Update a bill.
    """
    result = await db.execute(
        select(Bill).filter(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    update_data = bill_in.model_dump(exclude_unset=True)
    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=update_data.get("category_id", bill.category_id),
    )

    for field, value in update_data.items():
        setattr(bill, field, value)

    db.add(bill)
    await db.commit()
    await db.refresh(bill)

    # Reload with category relationship
    result = await db.execute(
        select(Bill).options(selectinload(Bill.category)).where(Bill.id == bill.id)
    )
    bill = result.scalar_one()
    return bill

@router.delete("/{bill_id}", response_model=BillResponse)
async def delete_bill(
    bill_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Delete a bill.
    """
    result = await db.execute(
        select(Bill).options(selectinload(Bill.category)).filter(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    await db.delete(bill)
    await db.commit()
    return bill

@router.post("/{bill_id}/mark-paid", response_model=BillResponse)
async def mark_bill_paid(
    bill_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Mark a bill as paid for the current cycle.
    """
    result = await db.execute(
        select(Bill).options(selectinload(Bill.category)).filter(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.last_paid_at = datetime.utcnow()
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


@router.post("/{bill_id}/mark-unpaid", response_model=BillResponse)
async def mark_bill_unpaid(
    bill_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Mark a bill as unpaid for the current cycle.
    """
    result = await db.execute(
        select(Bill).options(selectinload(Bill.category)).filter(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.last_paid_at = None
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill
