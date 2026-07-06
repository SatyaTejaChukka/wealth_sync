from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.bill import Bill
from app.models.budget import BudgetCategory
from app.models.subscription import Subscription
from app.models.loan import Loan
from app.models.lent_money import LentMoney


MAX_FUTURE_SKEW_SECONDS = 5


def to_utc_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def ensure_not_future_timestamp(value: datetime | None, *, field_name: str) -> None:
    if value is None:
        return
    normalized = to_utc_naive(value)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if normalized > now_utc + timedelta(seconds=MAX_FUTURE_SKEW_SECONDS):
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} cannot be in the future.",
        )


async def ensure_category_owned(
    session: AsyncSession,
    *,
    user_id: str,
    category_id: str | None,
) -> None:
    if category_id is None:
        return
    category_result = await session.execute(
        select(BudgetCategory.id).filter(
            BudgetCategory.id == category_id,
            BudgetCategory.user_id == user_id,
        )
    )
    if category_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Category not found")


async def ensure_transaction_links_owned(
    session: AsyncSession,
    *,
    user_id: str,
    bill_id: str | None,
    subscription_id: str | None,
    loan_id: str | None = None,
    lent_id: str | None = None,
) -> None:
    non_null_links = sum(1 for link in [bill_id, subscription_id, loan_id, lent_id] if link is not None)
    if non_null_links > 1:
        raise HTTPException(
            status_code=422,
            detail="A transaction can link at most one of bill_id, subscription_id, loan_id, or lent_id.",
        )

    if bill_id:
        bill_result = await session.execute(
            select(Bill.id).filter(Bill.id == bill_id, Bill.user_id == user_id)
        )
        if bill_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Bill not found")

    if subscription_id:
        subscription_result = await session.execute(
            select(Subscription.id).filter(
                Subscription.id == subscription_id,
                Subscription.user_id == user_id,
            )
        )
        if subscription_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Subscription not found")

    if loan_id:
        loan_result = await session.execute(
            select(Loan.id).filter(
                Loan.id == loan_id,
                Loan.user_id == user_id,
            )
        )
        if loan_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Loan profile not found")

    if lent_id:
        lent_result = await session.execute(
            select(LentMoney.id).filter(
                LentMoney.id == lent_id,
                LentMoney.user_id == user_id,
            )
        )
        if lent_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Lending profile not found")
