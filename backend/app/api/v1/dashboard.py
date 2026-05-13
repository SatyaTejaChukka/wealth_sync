from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import case, func, or_
from datetime import datetime, timedelta

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.budget import BudgetCategory
from app.models.transaction import Transaction
from app.models.savings import SavingsGoal
from app.services.health_score import HealthScoreService
from app.services.financial_triage import FinancialTriageService
from app.services.autopilot import AutopilotService
from app.schemas.triage import FinancialTriageResponse
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()

class DashboardStats(BaseModel):
    total_balance: Decimal
    balance_change: float
    monthly_income: Decimal
    monthly_expenses: Decimal
    income_change: float
    expenses_change: float
    total_savings: Decimal
    health_score: dict
    recent_transactions: List[dict]
    spending_chart: List[dict]
    category_chart: List[dict]
    safe_to_spend_stats: dict

@router.get("/summary", response_model=DashboardStats)
async def get_dashboard_summary(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    chart_range: str = Query(default="week", pattern="^(week|month)$")
) -> Any:
    """
    Get aggregated dashboard statistics.
    """
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    effective_tx_filter = or_(Transaction.status == "completed", Transaction.status.is_(None))

    if now.month == 1:
        start_of_prev_month = now.replace(
            year=now.year - 1,
            month=12,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
    else:
        start_of_prev_month = now.replace(
            month=now.month - 1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    def _to_decimal(value: Decimal | float | int | None) -> Decimal:
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value or 0))

    async def _sum_income_expenses(
        *,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> tuple[Decimal, Decimal]:
        query = select(
            func.coalesce(
                func.sum(
                    case((Transaction.type == "INCOME", Transaction.amount), else_=0)
                ),
                0,
            ).label("income"),
            func.coalesce(
                func.sum(
                    case((Transaction.type == "EXPENSE", Transaction.amount), else_=0)
                ),
                0,
            ).label("expense"),
        ).filter(
            Transaction.user_id == current_user.id,
            effective_tx_filter,
        )
        if start:
            query = query.filter(Transaction.occurred_at >= start)
        if end:
            query = query.filter(Transaction.occurred_at < end)
        res = await db.execute(query)
        row = res.one()
        return _to_decimal(row.income), _to_decimal(row.expense)

    # 1. Total Balance & Savings
    total_income, total_expenses = await _sum_income_expenses(end=now)
    total_balance = total_income - total_expenses

    # Calculate total savings from goals
    savings_query = select(func.sum(SavingsGoal.current_amount)).filter(SavingsGoal.user_id == current_user.id)
    savings_res = await db.execute(savings_query)
    total_savings = savings_res.scalar() or Decimal(0)

    # 2. Monthly Stats
    monthly_income, monthly_expenses = await _sum_income_expenses(start=start_of_month, end=now)
    prev_income, prev_expenses = await _sum_income_expenses(
        start=start_of_prev_month,
        end=start_of_month,
    )

    def calc_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return float((current - previous) / previous * 100)

    income_change = calc_change(monthly_income, prev_income)
    expenses_change = calc_change(monthly_expenses, prev_expenses)

    # Balance Trend
    prev_balance_income, prev_balance_expenses = await _sum_income_expenses(end=start_of_month)
    prev_total_balance = prev_balance_income - prev_balance_expenses

    balance_change = calc_change(total_balance, prev_total_balance)

    # Fetch all categories for mapping
    categories_res = await db.execute(select(BudgetCategory).filter(BudgetCategory.user_id == current_user.id))
    categories = categories_res.scalars().all()
    cat_name_map = {str(c.id): c.name for c in categories}

    # 4. Recent Transactions
    recent_transactions_query = (
        select(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            effective_tx_filter,
            Transaction.occurred_at <= now,
        )
        .order_by(Transaction.occurred_at.desc())
        .limit(5)
    )
    result_recent = await db.execute(recent_transactions_query)
    recent_transactions = result_recent.scalars().all()
    
    recent_mapped = [
        {
            "id": t.id,
            "title": t.description or "Unknown",
            "category": cat_name_map.get(str(t.category_id), "Uncategorized"), 
            "amount": t.amount if t.type == 'INCOME' else -t.amount,
            "date": t.occurred_at.strftime("%b %d") if t.occurred_at else "",
            "type": t.type.lower()
        }
        for t in recent_transactions
    ]

    # 5. Spending Chart
    chart_data = []
    days = []

    if chart_range == 'week':
        # Last 7 days
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            days.append(day.date())
    else:
        # Month view: Start of month to now
        curr = start_of_month
        while curr <= now:
            days.append(curr.date())
            curr += timedelta(days=1)

    chart_start = days[0]
    chart_expense_res = await db.execute(
        select(
            func.date(Transaction.occurred_at).label("txn_day"),
            func.coalesce(func.sum(Transaction.amount), 0).label("amount"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "EXPENSE",
            effective_tx_filter,
            Transaction.occurred_at >= datetime.combine(chart_start, datetime.min.time()),
            Transaction.occurred_at <= now,
        )
        .group_by(func.date(Transaction.occurred_at))
    )
    chart_expense_map = {
        str(row.txn_day): float(_to_decimal(row.amount))
        for row in chart_expense_res
    }

    for day in days:
        day_expenses = chart_expense_map.get(day.isoformat(), 0.0)

        if chart_range == 'week':
            label = day.strftime("%a")
        else:
            label = day.strftime("%b %d")

        chart_data.append({
            "name": label,
            "amount": day_expenses,
        })

    # 6. Category Chart (Expenses by Category for this month)
    category_chart = []
    category_res = await db.execute(
        select(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("amount"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "EXPENSE",
            Transaction.occurred_at >= start_of_month,
            Transaction.occurred_at <= now,
            effective_tx_filter,
        )
        .group_by(Transaction.category_id)
    )

    for row in category_res:
        cat_id = str(row.category_id) if row.category_id else "Uncategorized"
        category_chart.append({
            "name": cat_name_map.get(cat_id, "Uncategorized"),
            "value": float(_to_decimal(row.amount)),
        })
    
    # Sort categories by value desc for insights
    category_chart.sort(key=lambda x: x['value'], reverse=True)

    # 3. Health Score (Calculated LAST to use category data)
    health_stats = HealthScoreService.calculate_score( 
        monthly_income, 
        monthly_expenses, 
        0, 
        0, 
        top_categories=category_chart 
    )

    # 7. Unified planning overview for safe-to-spend + rule engine
    planning_overview = await AutopilotService.calculate_comprehensive_overview(db, current_user.id)
    safe_to_spend_stats = planning_overview["safe_to_spend_stats"]

    return {
        "total_balance": total_balance,
        "balance_change": balance_change,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "income_change": income_change,
        "expenses_change": expenses_change,
        "total_savings": total_savings,
        "health_score": health_stats,
        "recent_transactions": recent_mapped,
        "spending_chart": chart_data,
        "category_chart": category_chart,
        "safe_to_spend_stats": safe_to_spend_stats
    }


@router.get("/triage", response_model=FinancialTriageResponse)
async def get_financial_triage(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FinancialTriageResponse:
    """
    Return prioritized cleanup actions for the user's current financial situation.
    """
    return await FinancialTriageService.generate(db, current_user.id)
