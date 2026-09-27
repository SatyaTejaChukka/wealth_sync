from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import update, delete
from uuid import uuid4

from app.api import deps
from app.api.validators import ensure_category_owned
from app.core.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.autopilot_payment import AutopilotPayment
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse

router = APIRouter()

@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    sub_in: SubscriptionCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=sub_in.category_id,
    )

    sub = Subscription(
        id=str(uuid4()),
        user_id=current_user.id,
        **sub_in.model_dump()
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    
    # Load subscription with category relationship
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.category)).where(Subscription.id == sub.id)
    )
    sub = result.scalar_one()
    return sub

@router.get("/", response_model=List[SubscriptionResponse])
async def read_subscriptions(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.category)).filter(Subscription.user_id == current_user.id)
    )
    return result.scalars().all()

@router.put("/{sub_id}", response_model=SubscriptionResponse)
async def update_subscription(
    sub_id: str,
    sub_in: SubscriptionUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(select(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id))
    sub = result.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    update_data = sub_in.model_dump(exclude_unset=True)
    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=update_data.get("category_id", sub.category_id),
    )

    for k, v in update_data.items():
        setattr(sub, k, v)
        
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Reload with category relationship
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.category)).where(Subscription.id == sub.id)
    )
    sub = result.scalar_one()
    return sub

@router.delete("/{sub_id}", response_model=SubscriptionResponse)
async def delete_subscription(
    sub_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    delete_transactions: bool = Query(True, description="Whether to also delete transactions associated with this subscription")
) -> Any:
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.category)).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    sub = result.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    response_data = SubscriptionResponse.model_validate(sub)

    if delete_transactions:
        # Delete transactions referencing this subscription
        await db.execute(
            delete(Transaction)
            .where(Transaction.subscription_id == sub_id, Transaction.user_id == current_user.id)
        )
    else:
        # Unlink transactions referencing this subscription
        await db.execute(
            update(Transaction)
            .where(Transaction.subscription_id == sub_id, Transaction.user_id == current_user.id)
            .values(subscription_id=None)
        )

    # Clean up any autopilot payment orders referencing this subscription
    await db.execute(
        delete(AutopilotPayment)
        .where(
            AutopilotPayment.source_type == "SUBSCRIPTION",
            AutopilotPayment.source_id == sub_id,
            AutopilotPayment.user_id == current_user.id
        )
    )

    await db.delete(sub)
    await db.commit()
    return response_data

@router.post("/{sub_id}/log-usage", response_model=SubscriptionResponse)
async def log_usage(
    sub_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.category)).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    sub = result.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    sub.usage_count += 1
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Reload with category relationship
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.category)).where(Subscription.id == sub.id)
    )
    sub = result.scalar_one()
    return sub
