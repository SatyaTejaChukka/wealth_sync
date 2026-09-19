import hashlib
from abc import ABC, abstractmethod
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple, Type
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.budget import BudgetCategory
from app.models.electricity_account import ElectricityAccount, ElectricityBill
from app.models.notification import Notification
from app.models.transaction import Transaction
from app.schemas.electricity import ElectricityProviderInfo


# ==============================================================================
# Provider Interface & Implementations
# ==============================================================================

class BaseElectricityProvider(ABC):
    code: str
    name: str
    state: str
    consumer_number_label: str = "Service Number / Consumer ID"
    help_text: str = "Enter your consumer number"
    sample_consumer_number: str = "1311200045678"

    @abstractmethod
    async def fetch_bill(
        self, consumer_number: str, mobile: Optional[str] = None
    ) -> Optional[dict]:
        """
        Fetch latest bill from provider or aggregator.
        Returns dict with:
          - consumer_name: str
          - bill_number: str
          - bill_date: date
          - due_date: date
          - amount: float
          - units_consumed: Optional[float]
        """
        pass

    def validate_consumer_number(self, consumer_number: str) -> bool:
        return len(consumer_number.strip()) >= 4


class MockElectricityProvider(BaseElectricityProvider):
    code = "MOCK"
    name = "Demo / Simulation Provider"
    state = "Universal"
    consumer_number_label = "Demo Service Number"
    help_text = "Enter any 6 to 13-digit number to simulate live bill fetching"
    sample_consumer_number = "999888777666"

    async def fetch_bill(
        self, consumer_number: str, mobile: Optional[str] = None
    ) -> Optional[dict]:
        clean_num = consumer_number.strip()
        # Deterministic generation using consumer_number hash and current month
        today = date.today()
        current_year = today.year
        current_month = today.month

        # Seed value for stable simulation
        hash_seed = int(hashlib.md5(f"{clean_num}-{current_year}-{current_month}".encode()).hexdigest()[:6], 16)

        # Generate realistic amount between ₹650 and ₹4,200
        amount = round(650.0 + (hash_seed % 3550), 2)
        units = round(90.0 + (hash_seed % 280), 1)

        # Bill date on the 5th of this month, Due date on 25th of this month
        bill_day = 5
        due_day = 25
        try:
            bill_date = date(current_year, current_month, bill_day)
        except ValueError:
            bill_date = date(current_year, current_month, 1)

        try:
            due_date = date(current_year, current_month, due_day)
        except ValueError:
            due_date = bill_date + timedelta(days=20)

        # Bill number format: MOCK-YYYYMM-XXXX
        bill_number = f"MOCK-{current_year}{current_month:02d}-{clean_num[-4:] if len(clean_num) >= 4 else clean_num}"
        consumer_name = f"Consumer #{clean_num[-4:]}"

        return {
            "consumer_name": consumer_name,
            "bill_number": bill_number,
            "bill_date": bill_date,
            "due_date": due_date,
            "amount": amount,
            "units_consumed": units,
        }


class APSPDCLProvider(BaseElectricityProvider):
    code = "APSPDCL"
    name = "APSPDCL (Andhra Pradesh Southern Power)"
    state = "Andhra Pradesh"
    consumer_number_label = "13-Digit Service Number"
    help_text = "Enter your 13-digit APSPDCL LT Service Number"
    sample_consumer_number = "1311200045678"

    async def fetch_bill(
        self, consumer_number: str, mobile: Optional[str] = None
    ) -> Optional[dict]:
        clean_num = consumer_number.strip()
        today = date.today()
        current_year = today.year
        current_month = today.month

        # In production with BBPS / aggregator API credentials:
        # response = await call_bbps_api(biller_id="APSPDCL001", consumer_number=clean_num, mobile=mobile)
        # return parsed_response

        # Realistic simulation matching APSPDCL bill generation cycle
        hash_seed = int(hashlib.md5(f"APSPDCL-{clean_num}-{current_year}-{current_month}".encode()).hexdigest()[:6], 16)
        amount = round(480.0 + (hash_seed % 2850), 2)
        units = round(85.0 + (hash_seed % 230), 1)

        bill_date = date(current_year, current_month, 8)
        due_date = bill_date + timedelta(days=15)
        bill_number = f"AP-{current_year}{current_month:02d}-{clean_num[-6:]}"
        consumer_name = f"APSPDCL Consumer ({clean_num[-4:]})"

        return {
            "consumer_name": consumer_name,
            "bill_number": bill_number,
            "bill_date": bill_date,
            "due_date": due_date,
            "amount": amount,
            "units_consumed": units,
        }


class BESCOMProvider(BaseElectricityProvider):
    code = "BESCOM"
    name = "BESCOM (Bangalore Electricity Supply)"
    state = "Karnataka"
    consumer_number_label = "10-Digit Account ID"
    help_text = "Enter your 10-digit BESCOM Account ID"
    sample_consumer_number = "5432109876"

    async def fetch_bill(
        self, consumer_number: str, mobile: Optional[str] = None
    ) -> Optional[dict]:
        clean_num = consumer_number.strip()
        today = date.today()
        current_year = today.year
        current_month = today.month

        hash_seed = int(hashlib.md5(f"BESCOM-{clean_num}-{current_year}-{current_month}".encode()).hexdigest()[:6], 16)
        amount = round(550.0 + (hash_seed % 3100), 2)
        units = round(110.0 + (hash_seed % 260), 1)

        bill_date = date(current_year, current_month, 10)
        due_date = bill_date + timedelta(days=16)
        bill_number = f"KA-{current_year}{current_month:02d}-{clean_num[-5:]}"
        consumer_name = f"BESCOM Consumer ({clean_num[-4:]})"

        return {
            "consumer_name": consumer_name,
            "bill_number": bill_number,
            "bill_date": bill_date,
            "due_date": due_date,
            "amount": amount,
            "units_consumed": units,
        }


class TSSPDCLProvider(BaseElectricityProvider):
    code = "TSSPDCL"
    name = "TSSPDCL (Telangana Southern Power)"
    state = "Telangana"
    consumer_number_label = "Unique Service Number (USCNO)"
    help_text = "Enter your 9-digit Unique Service Number"
    sample_consumer_number = "100234567"

    async def fetch_bill(
        self, consumer_number: str, mobile: Optional[str] = None
    ) -> Optional[dict]:
        clean_num = consumer_number.strip()
        today = date.today()
        current_year = today.year
        current_month = today.month

        hash_seed = int(hashlib.md5(f"TSSPDCL-{clean_num}-{current_year}-{current_month}".encode()).hexdigest()[:6], 16)
        amount = round(420.0 + (hash_seed % 2600), 2)
        units = round(95.0 + (hash_seed % 210), 1)

        bill_date = date(current_year, current_month, 7)
        due_date = bill_date + timedelta(days=15)
        bill_number = f"TS-{current_year}{current_month:02d}-{clean_num[-5:]}"
        consumer_name = f"TSSPDCL Consumer ({clean_num[-4:]})"

        return {
            "consumer_name": consumer_name,
            "bill_number": bill_number,
            "bill_date": bill_date,
            "due_date": due_date,
            "amount": amount,
            "units_consumed": units,
        }


class MSEDCLProvider(BaseElectricityProvider):
    code = "MSEDCL"
    name = "MSEDCL (Mahavitaran Maharashtra)"
    state = "Maharashtra"
    consumer_number_label = "12-Digit Consumer Number"
    help_text = "Enter your 12-digit Mahavitaran Consumer Number"
    sample_consumer_number = "012345678901"

    async def fetch_bill(
        self, consumer_number: str, mobile: Optional[str] = None
    ) -> Optional[dict]:
        clean_num = consumer_number.strip()
        today = date.today()
        current_year = today.year
        current_month = today.month

        hash_seed = int(hashlib.md5(f"MSEDCL-{clean_num}-{current_year}-{current_month}".encode()).hexdigest()[:6], 16)
        amount = round(720.0 + (hash_seed % 3800), 2)
        units = round(130.0 + (hash_seed % 300), 1)

        bill_date = date(current_year, current_month, 12)
        due_date = bill_date + timedelta(days=18)
        bill_number = f"MH-{current_year}{current_month:02d}-{clean_num[-6:]}"
        consumer_name = f"MSEDCL Consumer ({clean_num[-4:]})"

        return {
            "consumer_name": consumer_name,
            "bill_number": bill_number,
            "bill_date": bill_date,
            "due_date": due_date,
            "amount": amount,
            "units_consumed": units,
        }


# ==============================================================================
# Service Manager & Registry
# ==============================================================================

PROVIDERS_REGISTRY: Dict[str, Type[BaseElectricityProvider]] = {
    "APSPDCL": APSPDCLProvider,
    "BESCOM": BESCOMProvider,
    "TSSPDCL": TSSPDCLProvider,
    "MSEDCL": MSEDCLProvider,
    "MOCK": MockElectricityProvider,
}


class ElectricityService:

    @staticmethod
    def get_supported_providers() -> List[ElectricityProviderInfo]:
        return [
            ElectricityProviderInfo(
                code=provider_cls.code,
                name=provider_cls.name,
                state=provider_cls.state,
                consumer_number_label=provider_cls.consumer_number_label,
                help_text=provider_cls.help_text,
                sample_consumer_number=provider_cls.sample_consumer_number,
            )
            for provider_cls in PROVIDERS_REGISTRY.values()
        ]

    @staticmethod
    def get_provider(provider_code: str) -> BaseElectricityProvider:
        code_upper = provider_code.upper()
        provider_cls = PROVIDERS_REGISTRY.get(code_upper, MockElectricityProvider)
        return provider_cls()

    @staticmethod
    async def fetch_and_sync_latest_bill(
        db: AsyncSession, account: ElectricityAccount, send_notifications: bool = True
    ) -> Tuple[Optional[ElectricityBill], bool]:
        """
        Fetches the latest bill from the provider for the given account.
        Saves new bill if not already present.
        Returns (ElectricityBill, is_new: bool).
        """
        provider = ElectricityService.get_provider(account.provider_code)
        bill_data = await provider.fetch_bill(
            consumer_number=account.consumer_number,
            mobile=account.registered_mobile,
        )

        if not bill_data:
            return None, False

        account.last_checked_at = datetime.utcnow()
        if bill_data.get("consumer_name") and not account.consumer_name:
            account.consumer_name = bill_data["consumer_name"]

        # Check if bill with this bill_number already exists for this account
        existing_bill_res = await db.execute(
            select(ElectricityBill).filter(
                ElectricityBill.account_id == account.id,
                ElectricityBill.bill_number == bill_data["bill_number"],
            )
        )
        existing_bill = existing_bill_res.scalars().first()

        if existing_bill:
            # Update latest fetched info (e.g. status)
            existing_bill.fetched_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing_bill)
            return existing_bill, False

        # Create new bill
        new_bill = ElectricityBill(
            account_id=account.id,
            bill_number=bill_data["bill_number"],
            bill_date=bill_data["bill_date"],
            due_date=bill_data["due_date"],
            amount=bill_data["amount"],
            units_consumed=bill_data.get("units_consumed"),
            status="unpaid",
            fetched_at=datetime.utcnow(),
        )
        db.add(new_bill)

        # Dispatch notification if new bill found
        if send_notifications:
            label = account.nickname or account.provider_code
            notif = Notification(
                user_id=account.user_id,
                title="⚡ Electricity Bill Generated",
                message=f"Your {label} bill of ₹{bill_data['amount']:,.2f} is generated (Due: {bill_data['due_date'].strftime('%b %d, %Y')}).",
                type="bill_reminder",
                action_url="/dashboard/bills",
                related_id=new_bill.id,
            )
            db.add(notif)

        await db.commit()
        await db.refresh(new_bill)
        return new_bill, True

    @staticmethod
    async def pay_bill(
        db: AsyncSession, bill_id: str, user_id: str, amount: Optional[float] = None
    ) -> ElectricityBill:
        """
        Marks an electricity bill as paid and creates an expense transaction.
        """
        bill_res = await db.execute(
            select(ElectricityBill)
            .join(ElectricityAccount)
            .filter(
                ElectricityBill.id == bill_id,
                ElectricityAccount.user_id == user_id,
            )
            .options(selectinload(ElectricityBill.account))
        )
        bill = bill_res.scalars().first()
        if not bill:
            raise ValueError("Electricity bill not found")

        if bill.status == "paid":
            return bill

        pay_amount = amount if amount is not None else float(bill.amount)

        # 1. Find or create Electricity BudgetCategory
        cat_res = await db.execute(
            select(BudgetCategory).filter(
                BudgetCategory.user_id == user_id,
                BudgetCategory.name.ilike("%electricity%"),
            )
        )
        category = cat_res.scalars().first()
        if not category and bill.account.category_id:
            cat_account_res = await db.execute(
                select(BudgetCategory).filter(
                    BudgetCategory.id == bill.account.category_id,
                    BudgetCategory.user_id == user_id,
                )
            )
            category = cat_account_res.scalars().first()

        if not category:
            category = BudgetCategory(
                id=str(uuid4()),
                user_id=user_id,
                name="Electricity & Utilities",
                color="#eab308",  # vibrant amber/yellow
            )
            db.add(category)
            await db.flush()

        # 2. Create Completed Expense Transaction
        account_name = bill.account.nickname or f"{bill.account.provider_code} ({bill.account.consumer_number[-4:]})"
        transaction = Transaction(
            id=str(uuid4()),
            user_id=user_id,
            category_id=category.id,
            amount=pay_amount,
            type="EXPENSE",
            description=f"Electricity Bill: {account_name} - #{bill.bill_number}",
            occurred_at=datetime.utcnow(),
            status="completed",
        )
        db.add(transaction)
        await db.flush()

        # 3. Update Bill status and link transaction
        bill.status = "paid"
        bill.paid_at = datetime.utcnow()
        bill.transaction_id = transaction.id

        # 4. Create Notification
        notif = Notification(
            user_id=user_id,
            title="⚡ Bill Payment Recorded",
            message=f"Recorded payment of ₹{pay_amount:,.2f} for {account_name}.",
            type="payment_success",
            action_url="/dashboard/transactions",
            related_id=transaction.id,
        )
        db.add(notif)

        await db.commit()
        await db.refresh(bill)
        return bill

    @staticmethod
    async def should_poll_account(
        db: AsyncSession, account: ElectricityAccount, target_date: Optional[date] = None
    ) -> Tuple[bool, str]:
        """
        Determines whether external API polling is needed for this electricity account based on:
        1. Current month bill already fetched (skip)
        2. Active generation window (Days 1 - 18) -> poll daily
        3. Off-cycle window (Days 19 - 31) -> weekly cooldown
        """
        import calendar

        current_date = target_date or date.today()
        month_start = date(current_date.year, current_date.month, 1)
        _, last_day = calendar.monthrange(current_date.year, current_date.month)
        month_end = date(current_date.year, current_date.month, last_day)

        # 1. Check if bill for current month has already been fetched
        bill_res = await db.execute(
            select(ElectricityBill).filter(
                ElectricityBill.account_id == account.id,
                ElectricityBill.bill_date >= month_start,
                ElectricityBill.bill_date <= month_end,
            )
        )
        existing_bill = bill_res.scalars().first()
        if existing_bill:
            return False, "current_month_bill_already_fetched"

        # 2. Check active billing cycle window (1st to 18th of month)
        if 1 <= current_date.day <= 18:
            return True, "active_generation_window"

        # 3. Off-cycle window (19th onwards) - throttle to once every 7 days
        if account.last_checked_at:
            days_since_check = (datetime.utcnow() - account.last_checked_at).days
            if days_since_check < 7:
                return False, "off_cycle_throttled"
            return True, "off_cycle_weekly_retry"

        return True, "off_cycle_never_polled"

    @staticmethod
    async def process_due_reminders(
        db: AsyncSession,
        bill: ElectricityBill,
        account: ElectricityAccount,
        today: Optional[date] = None,
    ) -> Optional[Notification]:
        """
        Evaluates unpaid bill against due date stages (3 days, 1 day, due today, overdue)
        and creates deduplicated reminder notifications without external network calls.
        """
        if bill.status != "unpaid":
            return None

        current_date = today or date.today()
        days_until_due = (bill.due_date - current_date).days

        if days_until_due == 3:
            title = "⚠️ Electricity Bill Due in 3 Days"
            notif_type = "bill_reminder"
        elif days_until_due == 1:
            title = "⚠️ Electricity Bill Due Tomorrow"
            notif_type = "bill_reminder"
        elif days_until_due == 0:
            title = "⚡ Electricity Bill Due Today"
            notif_type = "bill_reminder"
        elif days_until_due < 0:
            title = "🚨 Electricity Bill Overdue"
            notif_type = "bill_overdue"
        else:
            return None

        # Deduplication check: verify if this exact reminder title was already created for this bill
        existing_notif = await db.execute(
            select(Notification).filter(
                Notification.user_id == account.user_id,
                Notification.related_id == bill.id,
                Notification.title == title,
            )
        )
        if existing_notif.scalars().first():
            return None

        label = account.nickname or account.provider_code
        if days_until_due < 0:
            msg = f"Your {label} bill of ₹{float(bill.amount):,.2f} was due on {bill.due_date.strftime('%b %d, %Y')} and is now overdue."
        else:
            msg = f"Your {label} bill of ₹{float(bill.amount):,.2f} is due on {bill.due_date.strftime('%b %d, %Y')}."

        notif = Notification(
            user_id=account.user_id,
            title=title,
            message=msg,
            type=notif_type,
            action_url="/dashboard/bills",
            related_id=bill.id,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        return notif

