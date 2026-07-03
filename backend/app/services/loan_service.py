from decimal import Decimal
from typing import Dict, List, Optional
from datetime import datetime, date

from app.models.loan import Loan


class LoanService:
    @staticmethod
    def calculate_emi(principal: Decimal, annual_rate: Decimal, tenure_months: int, interest_type: str = "compound") -> Decimal:
        """
        Calculate EMI using standard formula depending on interest_type:
        - compound: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
        - simple: EMI = (P + P * (R/100) * (n/12)) / n
        """
        if principal <= 0 or tenure_months <= 0:
            return Decimal("0")

        if annual_rate == 0:
            return Decimal(round(principal / Decimal(tenure_months), 2))

        if interest_type == "simple":
            total_interest = principal * (annual_rate / Decimal("100")) * (Decimal(tenure_months) / Decimal("12"))
            emi = (principal + total_interest) / Decimal(tenure_months)
            return Decimal(round(emi, 2))

        # Monthly interest rate = Annual rate / 12 / 100
        monthly_rate = annual_rate / Decimal(12) / Decimal(100)
        
        try:
            one_plus_r_n = (Decimal("1") + monthly_rate) ** tenure_months
            emi = principal * monthly_rate * one_plus_r_n / (one_plus_r_n - Decimal("1"))
            return Decimal(round(emi, 2))
        except ZeroDivisionError:
            return Decimal("0")

    @classmethod
    def generate_amortization_schedule(
        cls,
        principal: Decimal,
        annual_rate: Decimal,
        tenure_months: int,
        emi_amount: Optional[Decimal] = None,
        interest_type: str = "compound"
    ) -> List[Dict]:
        """
        Generate month-by-month amortization schedule.
        """
        schedule = []
        remaining = principal
        monthly_rate = annual_rate / Decimal(12) / Decimal(100)

        # Use standard EMI calculation if not provided
        emi = emi_amount if emi_amount is not None else cls.calculate_emi(principal, annual_rate, tenure_months, interest_type)

        is_simple = interest_type == "simple"
        total_simple_interest = Decimal("0")
        if is_simple:
            total_simple_interest = principal * (annual_rate / Decimal("100")) * (Decimal(tenure_months) / Decimal("12"))

        for month in range(1, tenure_months + 1):
            if remaining <= 0:
                break

            if annual_rate == 0:
                interest_paid = Decimal("0")
                principal_paid = min(emi, remaining)
            else:
                if is_simple:
                    interest_paid = total_simple_interest / Decimal(tenure_months)
                    principal_paid = emi - interest_paid
                else:
                    interest_paid = remaining * monthly_rate
                    principal_paid = emi - interest_paid

            # Last month adjust for rounding errors
            if month == tenure_months or remaining - principal_paid <= 0:
                principal_paid = remaining
                emi = principal_paid + interest_paid

            # Round to 2 decimal places
            emi_rounded = Decimal(round(emi, 2))
            interest_rounded = Decimal(round(interest_paid, 2))
            principal_rounded = Decimal(round(principal_paid, 2))
            
            remaining -= principal_rounded
            if remaining < 0 or month == tenure_months:
                remaining = Decimal("0")
            
            remaining_rounded = Decimal(round(remaining, 2))

            schedule.append({
                "month": month,
                "emi_amount": emi_rounded,
                "principal_paid": principal_rounded,
                "interest_paid": interest_rounded,
                "remaining_principal": remaining_rounded
            })

        return schedule

    @classmethod
    def get_loan_status(cls, loan: Loan, payments_count: int) -> Dict:
        """
        Calculate current loan balance metrics based on the number of payments completed.
        """
        interest_type = getattr(loan, "interest_type", "compound")
        schedule = cls.generate_amortization_schedule(
            principal=loan.principal_amount,
            annual_rate=loan.interest_rate,
            tenure_months=loan.tenure_months,
            emi_amount=loan.emi_amount,
            interest_type=interest_type
        )

        schedule_len = len(schedule)
        
        if payments_count >= schedule_len:
            # Loan is fully paid
            return {
                "outstanding_principal": Decimal("0"),
                "total_principal_paid": loan.principal_amount,
                "total_interest_paid": sum(p["interest_paid"] for p in schedule),
                "remaining_tenure_months": 0,
                "amortization_schedule": schedule
            }

        # Partially paid
        outstanding_principal = schedule[payments_count - 1]["remaining_principal"] if payments_count > 0 else loan.principal_amount
        total_principal_paid = sum(schedule[i]["principal_paid"] for i in range(payments_count))
        total_interest_paid = sum(schedule[i]["interest_paid"] for i in range(payments_count))
        remaining_tenure_months = max(0, loan.tenure_months - payments_count)

        return {
            "outstanding_principal": outstanding_principal,
            "total_principal_paid": total_principal_paid,
            "total_interest_paid": total_interest_paid,
            "remaining_tenure_months": remaining_tenure_months,
            "amortization_schedule": schedule
        }
