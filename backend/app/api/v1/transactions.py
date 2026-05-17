from typing import Any, List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import uuid4
from datetime import datetime

from app.api import deps
from app.api.validators import (
    ensure_category_owned,
    ensure_not_future_timestamp,
    ensure_transaction_links_owned,
    to_utc_naive,
)
from app.core.database import get_db
from app.domain.enums import TransactionStatus, TransactionType
from app.models.user import User
from app.models.transaction import Transaction
from app.models.bill import Bill
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter()

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_in: TransactionCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create a new transaction.
    """
    transaction_data = transaction_in.model_dump()
    transaction_data["occurred_at"] = to_utc_naive(transaction_data.get("occurred_at"))

    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=transaction_data.get("category_id"),
    )
    await ensure_transaction_links_owned(
        db,
        user_id=current_user.id,
        bill_id=transaction_data.get("bill_id"),
        subscription_id=transaction_data.get("subscription_id"),
    )

    transaction = Transaction(
        id=str(uuid4()),
        user_id=current_user.id,
        **transaction_data
    )
    # Ensure occurred_at is set if not provided
    if not transaction.occurred_at:
        transaction.occurred_at = datetime.utcnow()

    if transaction.status == TransactionStatus.completed.value:
        ensure_not_future_timestamp(transaction.occurred_at, field_name="occurred_at")

    db.add(transaction)
    await db.commit()
    await db.refresh(transaction, ['category'])
    return transaction

@router.get("/", response_model=List[TransactionResponse])
async def read_transactions(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
    type: TransactionType | None = None,
    status: TransactionStatus | None = None,
    search: Optional[str] = None
) -> Any:
    """
    Retrieve transactions with optional filtering.
    """
    query = select(Transaction).options(selectinload(Transaction.category)).filter(Transaction.user_id == current_user.id)
    
    if type:
        query = query.filter(Transaction.type == type.value)

    if status:
        query = query.filter(Transaction.status == status.value)
        
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    
    query = query.offset(skip).limit(limit).order_by(Transaction.occurred_at.desc())
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    return transactions

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_in: TransactionUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Update a transaction.
    """
    result = await db.execute(
        select(Transaction).options(selectinload(Transaction.category)).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    transaction = result.scalars().first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = transaction_in.model_dump(exclude_unset=True)
    if "occurred_at" in update_data:
        update_data["occurred_at"] = to_utc_naive(update_data.get("occurred_at"))

    target_category_id = update_data.get("category_id", transaction.category_id)
    target_bill_id = update_data.get("bill_id", transaction.bill_id)
    target_subscription_id = update_data.get("subscription_id", transaction.subscription_id)

    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=target_category_id,
    )
    await ensure_transaction_links_owned(
        db,
        user_id=current_user.id,
        bill_id=target_bill_id,
        subscription_id=target_subscription_id,
    )

    target_status = update_data.get("status", transaction.status)
    target_occurred_at = update_data.get("occurred_at", transaction.occurred_at)
    if target_status == TransactionStatus.completed.value:
        ensure_not_future_timestamp(target_occurred_at, field_name="occurred_at")

    for field, value in update_data.items():
        setattr(transaction, field, value)

    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction

@router.delete("/{transaction_id}", response_model=TransactionResponse)
async def delete_transaction(
    transaction_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Delete a transaction.
    """
    result = await db.execute(
        select(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    transaction = result.scalars().first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    await db.delete(transaction)
    await db.commit()
    return transaction

@router.post("/{transaction_id}/complete", response_model=TransactionResponse)
async def complete_transaction(
    transaction_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Mark a pending transaction as completed (paid).
    """
    result = await db.execute(
        select(Transaction).options(selectinload(Transaction.category)).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalars().first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status != "pending":
        raise HTTPException(status_code=400, detail="Transaction is not pending")
    
    transaction.status = "completed"
    transaction.occurred_at = datetime.utcnow() # Update to actual payment time
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    
    # Update bill/subscription last_paid_at if linked
    if transaction.bill_id:
        bill_result = await db.execute(
            select(Bill).filter(
                Bill.id == transaction.bill_id,
                Bill.user_id == current_user.id,
            )
        )
        bill = bill_result.scalars().first()
        if bill:
            bill.last_paid_at = datetime.utcnow()
            db.add(bill)
            await db.commit()
    elif transaction.subscription_id:
        from app.models.subscription import Subscription
        sub_result = await db.execute(
            select(Subscription).filter(
                Subscription.id == transaction.subscription_id,
                Subscription.user_id == current_user.id,
            )
        )
        sub = sub_result.scalars().first()
        if sub:
            from dateutil.relativedelta import relativedelta
            # Update next billing date based on cycle
            if sub.billing_cycle == "monthly":
                sub.next_billing_date = datetime.utcnow() + relativedelta(months=1)
            elif sub.billing_cycle == "yearly":
                sub.next_billing_date = datetime.utcnow() + relativedelta(years=1)
            db.add(sub)
            await db.commit()
    
    return transaction
