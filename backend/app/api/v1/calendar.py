import calendar
from datetime import date, datetime
from typing import Any, List, Optional, Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.bill import Bill
from app.models.loan import Loan
from app.models.subscription import Subscription
from app.models.lent_money import LentMoney

router = APIRouter()

class CalendarEventResponse(BaseModel):
    title: str
    amount: float
    type: str  # "bill", "loan", "subscription", "lent"
    due_date: str  # YYYY-MM-DD
    status: str  # "paid", "unpaid", "expected" (for lent returns)
    linked_id: str

@router.get("/events", response_model=List[CalendarEventResponse])
async def get_calendar_events(
    year: int,
    month: int,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Get all financial calendar events for the user in a given year and month.
    """
    if month < 1 or month > 12:
        return []

    # Get the last day of the selected month
    _, last_day = calendar.monthrange(year, month)
    
    events = []

    # 1. Fetch Bills
    bills_res = await db.execute(
        select(Bill).filter(Bill.user_id == current_user.id)
    )
    bills = bills_res.scalars().all()
    for bill in bills:
        # Determine due date for this bill in the given month/year
        due_day = min(bill.due_day, last_day)
        event_date = date(year, month, due_day)
        
        # Check payment status
        paid = False
        if bill.last_paid_at:
            # If the bill was paid in the selected month/year
            paid = (bill.last_paid_at.year == year and bill.last_paid_at.month == month)
            
        events.append(CalendarEventResponse(
            title=bill.name,
            amount=float(bill.amount_estimated),
            type="bill",
            due_date=event_date.isoformat(),
            status="paid" if paid else "unpaid",
            linked_id=bill.id
        ))

    # 2. Fetch Loans
    loans_res = await db.execute(
        select(Loan).filter(Loan.user_id == current_user.id, Loan.status == "active")
    )
    loans = loans_res.scalars().all()
    for loan in loans:
        due_day = min(loan.due_day, last_day)
        event_date = date(year, month, due_day)
        
        # Only show EMI if the event month/year is on or after the loan start date
        loan_start_month = date(loan.start_date.year, loan.start_date.month, 1)
        event_month = date(year, month, 1)
        
        if event_month >= loan_start_month:
            paid = False
            if loan.last_paid_at:
                paid = (loan.last_paid_at.year == year and loan.last_paid_at.month == month)
                
            events.append(CalendarEventResponse(
                title=f"EMI: {loan.name}",
                amount=float(loan.emi_amount),
                type="loan",
                due_date=event_date.isoformat(),
                status="paid" if paid else "unpaid",
                linked_id=loan.id
            ))

    # 3. Fetch Subscriptions
    subs_res = await db.execute(
        select(Subscription).filter(Subscription.user_id == current_user.id)
    )
    subs = subs_res.scalars().all()
    for sub in subs:
        # If renewal is monthly, renewal date is in the selected month
        # We can use sub.created_at day as the billing day
        billing_day = min(sub.created_at.day if sub.created_at else 1, last_day)
        event_date = date(year, month, billing_day)
        
        events.append(CalendarEventResponse(
            title=f"Sub: {sub.name}",
            amount=float(sub.amount),
            type="subscription",
            due_date=event_date.isoformat(),
            status="paid",  # Defaults to paid since subscriptions are usually autopaid/recurring
            linked_id=sub.id
        ))

    # 4. Fetch Lent Money (returns)
    lent_res = await db.execute(
        select(LentMoney).filter(LentMoney.user_id == current_user.id, LentMoney.status == "active")
    )
    lent_records = lent_res.scalars().all()
    for lent in lent_records:
        # Check if due_date is in the selected month/year
        if lent.due_date and lent.due_date.year == year and lent.due_date.month == month:
            events.append(CalendarEventResponse(
                title=f"Return: {lent.borrower_name}",
                amount=float(lent.principal_amount),
                type="lent",
                due_date=lent.due_date.isoformat(),
                status="expected",
                linked_id=lent.id
            ))
            
        # Also map recurring interest dues if frequency is monthly
        if lent.interest_frequency == "monthly":
            lent_day = min(lent.lent_at.day, last_day)
            interest_date = date(year, month, lent_day)
            # Only show future/current interest expected
            if interest_date >= lent.lent_at:
                # Calculate interest amount (monthly)
                rate_val = float(lent.interest_rate_val)
                if lent.interest_rate_type == "percentage":
                    interest_amount = float(lent.principal_amount) * (rate_val / 100.0)
                else:
                    basis = float(lent.interest_rate_basis) if lent.interest_rate_basis else 100.0
                    interest_amount = float(lent.principal_amount) * (rate_val / basis)
                
                events.append(CalendarEventResponse(
                    title=f"Interest: {lent.borrower_name}",
                    amount=interest_amount,
                    type="lent",
                    due_date=interest_date.isoformat(),
                    status="expected",
                    linked_id=lent.id
                ))

    return events
