"""
Celery tasks for automated bill and subscription tracking.
This module runs daily to check all active bills/subscriptions and:
- Calculate next due dates
- Create pending transactions 3 days before due  
- Send notifications to users
- Mark overdue bills
"""

from celery import shared_task
import calendar
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import select, and_
from uuid import uuid4
import asyncio

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.bill import Bill 
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.notification import Notification
from app.models.loan import Loan

def calculate_next_due_date(due_day: int, last_paid_at: datetime = None) -> datetime:
    """Calculate next bill due date based on due_day of month."""
    today = datetime.utcnow()
    safe_due_day = max(1, due_day)
    
    if last_paid_at:
        # Calculate from last payment
        next_month = last_paid_at + relativedelta(months=1)
        last_day = calendar.monthrange(next_month.year, next_month.month)[1]
        return next_month.replace(day=min(safe_due_day, last_day))
    else:
        # First time - use this month or next
        last_day_this_month = calendar.monthrange(today.year, today.month)[1]
        next_due = today.replace(day=min(safe_due_day, last_day_this_month))
        
        if next_due < today:
            next_month = today + relativedelta(months=1)
            last_day_next_month = calendar.monthrange(next_month.year, next_month.month)[1]
            next_due = next_month.replace(day=min(safe_due_day, last_day_next_month))
        
        return next_due

async def create_pending_transaction_and_notification(
    db, user_id: str, bill_id: str = None, subscription_id: str = None,
    amount: float = 0, description: str = "", category_id: str = None, due_date: datetime = None
):
    """Create a pending transaction and notification for a bill/subscription."""
    # Check if pending transaction already exists
    existing = await db.execute(
        select(Transaction).filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.status == "pending",
                Transaction.bill_id == bill_id if bill_id else Transaction.subscription_id == subscription_id
            )
        )
    )
    if existing.scalars().first():
        return  # Already created

    # Create pending transaction
    transaction = Transaction(
        id=str(uuid4()),
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        type="EXPENSE",
        description=description,
        occurred_at=due_date,
        status="pending",
        bill_id=bill_id,
        subscription_id=subscription_id
    )
    db.add(transaction)

    # Create notification
    days_until_due = (due_date - datetime.utcnow()).days
    notification = Notification(
        id=str(uuid4()),
        user_id=user_id,
        title=f"Bill Due in {days_until_due} Days",
        message=f"{description} - INR {amount:.2f} due on {due_date.strftime('%b %d, %Y')}",
        type="bill_reminder",
        action_url=f"/dashboard/transactions",
        related_id=transaction.id
    )
    db.add(notification)
    
    await db.commit()
    return transaction

async def process_bills():
    """Check all active bills and create pending transactions."""
    async with AsyncSessionLocal() as db:
        # Get all active bills
        result = await db.execute(select(Bill))
        bills = result.scalars().all()
        
        for bill in bills:
            if bill.autopay_enabled:
                # Autopay-enabled bills are handled by the autopilot payment-order pipeline.
                continue

            # Calculate next due date
            next_due = calculate_next_due_date(bill.due_day, bill.last_paid_at)
            
            # Create pending transaction 3 days before
            reminder_date = next_due - timedelta(days=3)
            
            if datetime.utcnow() >= reminder_date and datetime.utcnow() < next_due:
                await create_pending_transaction_and_notification(
                    db=db,
                    user_id=bill.user_id,
                    bill_id=bill.id,
                    amount=float(bill.amount_estimated),
                    description=bill.name,
                    category_id=bill.category_id,
                    due_date=next_due
                )

async def process_subscriptions():
    """Check all active subscriptions and create pending transactions."""
    async with AsyncSessionLocal() as db:
        # Get all active subscriptions
        result = await db.execute(
            select(Subscription).filter(Subscription.is_active == True)
        )
        subscriptions = result.scalars().all()
        
        for sub in subscriptions:
            # Use next_billing_date if set, otherwise calculate from billing_cycle
            if sub.next_billing_date:
                next_due = sub.next_billing_date
            else:
                # Initialize next billing date
                next_due = datetime.utcnow() + timedelta(days=30 if sub.billing_cycle == "monthly" else 365)
                sub.next_billing_date = next_due
                db.add(sub)
                await db.commit()
            
            # Create pending transaction 3 days before
            reminder_date = next_due - timedelta(days=3)
            
            if datetime.utcnow() >= reminder_date and datetime.utcnow() < next_due:
                await create_pending_transaction_and_notification(
                    db=db,
                    user_id=sub.user_id,
                    subscription_id=sub.id,
                    amount=float(sub.amount),
                    description=sub.name,
                    category_id=sub.category_id,
                    due_date=next_due
                )

async def process_loans():
    """Check all active loans and create pending transactions for upcoming EMIs."""
    async with AsyncSessionLocal() as db:
        # Get all active loans
        result = await db.execute(select(Loan).filter(Loan.status == "active"))
        loans = result.scalars().all()
        
        for loan in loans:
            # Calculate next due date
            next_due = calculate_next_due_date(loan.due_day, loan.last_paid_at)
            
            # Create pending transaction 3 days before
            reminder_date = next_due - timedelta(days=3)
            
            if datetime.utcnow() >= reminder_date and datetime.utcnow() < next_due:
                # Check if pending transaction already exists
                existing = await db.execute(
                    select(Transaction).filter(
                        Transaction.user_id == loan.user_id,
                        Transaction.status == "pending",
                        Transaction.loan_id == loan.id
                    )
                )
                if existing.scalars().first():
                    continue  # Already created
                
                # Create pending transaction
                transaction = Transaction(
                    id=str(uuid4()),
                    user_id=loan.user_id,
                    category_id=loan.category_id,
                    amount=loan.emi_amount,
                    type="EXPENSE",
                    description=f"EMI Payment: {loan.name}",
                    occurred_at=next_due,
                    status="pending",
                    loan_id=loan.id
                )
                db.add(transaction)
                
                # Create notification
                days_until_due = (next_due - datetime.utcnow()).days
                notification = Notification(
                    id=str(uuid4()),
                    user_id=loan.user_id,
                    title=f"EMI Due in {days_until_due} Days",
                    message=f"{loan.name} EMI - INR {loan.emi_amount:.2f} due on {next_due.strftime('%b %d, %Y')}",
                    type="bill_reminder",
                    action_url=f"/dashboard/transactions",
                    related_id=transaction.id
                )
                db.add(notification)
                
                await db.commit()

@shared_task(name='app.tasks.bill_automation.check_and_create_pending_bills')
def check_and_create_pending_bills():
    """
    Main periodic task that runs daily to check bills, subscriptions, and loans.
    Creates pending transactions and notifications for upcoming payments.
    Also executes Autopilot payments for due bills.
    """
    async def run_all_tasks():
        await process_bills()
        await process_subscriptions()
        await process_loans()

        from app.services.autopilot import AutopilotService
        async with AsyncSessionLocal() as db:
            await AutopilotService.prepare_payment_orders_for_all_users(
                db,
                days_ahead=settings.AUTOPILOT_PAYMENT_PREPARE_DAYS,
            )
            await AutopilotService.execute_due_approved_payments(db)

    asyncio.run(run_all_tasks())

    return "Bill automation task completed"
