import calendar
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.lent_money import LentMoney
from app.models.transaction import Transaction


class LentMoneyService:
    """
    Business logic for calculating elapsed duration, accumulated simple interest,
    and tracking outstanding peer-to-peer lending balances.
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
        """
        if end_date <= start_date:
            return {"years": 0, "months": 0, "days": 0}

        years = end_date.year - start_date.year
        months = end_date.month - start_date.month
        days = end_date.day - start_date.day

        if days < 0:
            # Borrow days from the previous month
            prev_month = end_date.month - 1 if end_date.month > 1 else 12
            prev_year = end_date.year if end_date.month > 1 else end_date.year - 1
            _, days_in_prev = calendar.monthrange(prev_year, prev_month)
            days += days_in_prev
            months -= 1

        if months < 0:
            months += 12
            years -= 1

        return {"years": max(0, years), "months": max(0, months), "days": max(0, days)}

    @classmethod
    def calculate_accrued_interest(cls, lent: LentMoney, up_to_date: date) -> Decimal:
        """
        Calculate accumulated simple or compound interest on the principal.
        Supports:
        - percentage type (e.g. 12% per year, or 2% per month)
        - rupees_per_amount type (e.g. 2 rs per 100 rs per month)
        """
        start_date = lent.lent_at
        if up_to_date <= start_date:
            return Decimal("0.00")

        delta_days = (up_to_date - start_date).days
        P = cls._to_decimal(lent.principal_amount)
        rate_val = cls._to_decimal(lent.interest_rate_val)
        rate_basis = cls._to_decimal(lent.interest_rate_basis)

        # Calculate rate multiplier
        if lent.interest_rate_type == "percentage":
            rate_fraction = rate_val / Decimal("100")
        else:
            basis = rate_basis or Decimal("100")
            if basis <= 0:
                basis = Decimal("100")
            rate_fraction = rate_val / basis

        # Calculate time period fraction based on frequency
        if lent.interest_frequency == "monthly":
            time_fraction = Decimal(delta_days) / Decimal("30.0")
        else:
            time_fraction = Decimal(delta_days) / Decimal("365.0")

        # Check if compounding or simple
        is_compound = getattr(lent, "interest_type", "simple") == "compound"

        if is_compound:
            period_days = 30 if lent.interest_frequency == "monthly" else 365
            full_periods = delta_days // period_days
            remaining_days = delta_days % period_days
            try:
                # Compound interest over full periods
                compounded_principal = float(P) * ((1.0 + float(rate_fraction)) ** full_periods)
                # Simple interest on the compounded principal for the fractional period
                interest_rem = compounded_principal * float(rate_fraction) * (float(remaining_days) / float(period_days))
                total_accrued = compounded_principal + interest_rem
                interest = Decimal(str(total_accrued)) - P
            except Exception:
                interest = P * rate_fraction * time_fraction
        else:
            interest = P * rate_fraction * time_fraction

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
