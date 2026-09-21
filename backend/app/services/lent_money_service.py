from datetime import date
from decimal import Decimal
from typing import Dict, List, Any
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.lent_money import LentMoney
from app.models.transaction import Transaction


class LentMoneyService:
    """
    Business logic for calculating elapsed duration, accumulated simple/compound interest,
    and tracking outstanding peer-to-peer lending balances.
    Calculations are strictly performed on a monthly basis.
    """

    @staticmethod
    def _to_decimal(value: Decimal | float | int | None) -> Decimal:
        if value is None:
            return Decimal("0.00")
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    @staticmethod
    def calculate_elapsed_duration(start_date: date, end_date: date) -> Dict[str, int]:
        """
        Calculate exact years, months, and days elapsed between two dates.
        Uses dateutil.relativedelta for accurate calendar-month calculations.
        """
        if end_date <= start_date:
            return {"years": 0, "months": 0, "days": 0}

        rd = relativedelta(end_date, start_date)
        return {"years": max(0, rd.years), "months": max(0, rd.months), "days": max(0, rd.days)}

    @classmethod
    def calculate_accrued_interest(cls, lent: LentMoney, up_to_date: date) -> Decimal:
        """
        Calculate accumulated simple or compound interest on the principal on a monthly basis.
        Does not calculate daily fractional interest.
        Supports:
        - percentage type (e.g. 12% per year, or 2% per month)
        - rupees_per_amount type (e.g. 2 rs per 100 rs per month)
        """
        start_date = lent.lent_at
        if up_to_date <= start_date:
            return Decimal("0.00")

        rd = relativedelta(up_to_date, start_date)
        total_months = max(0, rd.years * 12 + rd.months)

        if total_months == 0:
            return Decimal("0.00")

        P = cls._to_decimal(lent.principal_amount)
        rate_val = cls._to_decimal(lent.interest_rate_val)
        rate_basis = cls._to_decimal(lent.interest_rate_basis)

        # Calculate rate multiplier
        if lent.interest_rate_type == "percentage":
            base_rate = rate_val / Decimal("100")
        else:
            basis = rate_basis or Decimal("100")
            if basis <= 0:
                basis = Decimal("100")
            base_rate = rate_val / basis

        # Calculate monthly rate
        if lent.interest_frequency == "yearly":
            monthly_rate = base_rate / Decimal("12")
        else:
            monthly_rate = base_rate

        is_compound = getattr(lent, "interest_type", "simple") == "compound"

        if is_compound:
            if lent.interest_frequency == "yearly":
                full_years = total_months // 12
                rem_months = total_months % 12
                # Annual compounding with simple monthly interest for remainder months
                compounded = P * ((Decimal("1") + base_rate) ** full_years)
                if rem_months > 0:
                    compounded = compounded * (Decimal("1") + (base_rate / Decimal("12")) * Decimal(str(rem_months)))
                interest = compounded - P
            else:
                # Monthly compounding over total elapsed months
                compounded = P * ((Decimal("1") + monthly_rate) ** total_months)
                interest = compounded - P
        else:
            # Simple monthly interest: P * monthly_rate * total_months
            interest = P * monthly_rate * Decimal(str(total_months))

        return interest.quantize(Decimal("0.01"))

    @classmethod
    async def get_lent_status_details(cls, db: AsyncSession, lent: LentMoney) -> Dict[str, Any]:
        """
        Query transactions and calculate detail metrics for a lent profile.
        """
        # Ensure transactions are loaded
        result = await db.execute(
            select(Transaction).options(selectinload(Transaction.category)).filter(
                Transaction.lent_id == lent.id,
                Transaction.status == "completed"
            ).order_by(Transaction.occurred_at.desc())
        )
        completed_transactions = result.scalars().all()

        total_repayments = sum((cls._to_decimal(tx.amount) for tx in completed_transactions if tx.type == "INCOME"), Decimal("0"))

        # Accrued interest calculations
        today = date.today()
        accrued_interest = cls.calculate_accrued_interest(lent, today)

        # Outstanding balance calculation
        lent_principal = cls._to_decimal(lent.principal_amount)
        outstanding_balance = lent_principal + accrued_interest - total_repayments
        
        # Ensure outstanding balance is non-negative
        outstanding_balance = max(Decimal("0.00"), outstanding_balance)

        # Duration details
        duration = cls.calculate_elapsed_duration(lent.lent_at, today)

        return {
            "lent_record": lent,
            "accrued_interest": accrued_interest,
            "total_repayments": total_repayments,
            "outstanding_balance": outstanding_balance,
            "elapsed_duration": duration,
            "transactions": completed_transactions
        }
