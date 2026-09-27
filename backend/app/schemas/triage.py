from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel


class TriageAction(BaseModel):
    id: str
    priority: int
    severity: Literal["critical", "high", "medium", "low"]
    area: Literal[
        "cashflow",
        "bills",
        "budget",
        "subscriptions",
        "transactions",
        "setup",
        "loans",
        "savings",
    ]
    title: str
    detail: str
    impact_amount: Decimal = Decimal("0")
    due_date: Optional[datetime] = None
    action_route: str
    action_label: str


class FinancialTriageResponse(BaseModel):
    generated_at: datetime
    stress_score: int  # 0 = calm, 100 = critical financial stress
    stress_level: Literal["low", "moderate", "high", "critical"]
    monthly_income: Decimal
    monthly_expenses: Decimal
    burn_rate_pct: float
    monthly_fixed_costs: Decimal
    liquidity_buffer_days: int
    pending_transaction_count: int
    uncategorized_expense_count: int
    actions: List[TriageAction]

