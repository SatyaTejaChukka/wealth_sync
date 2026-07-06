import calendar
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import case, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.bill import Bill
from app.models.budget import BudgetCategory, BudgetRule
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.loan import Loan
from app.schemas.triage import FinancialTriageResponse, TriageAction


class FinancialTriageService:
    """Generate prioritized cleanup actions for messy personal finances."""

    @staticmethod
    def _to_decimal(value: Decimal | float | int | None) -> Decimal:
        if value is None:
            return Decimal("0")
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    @staticmethod
    def _month_due_date(now: datetime, due_day: int) -> datetime:
        last_day = calendar.monthrange(now.year, now.month)[1]
        safe_day = max(1, min(due_day, last_day))
        return now.replace(day=safe_day, hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _stress_level(score: int) -> str:
        if score >= 75:
            return "critical"
        if score >= 50:
            return "high"
        if score >= 25:
            return "moderate"
        return "low"

    @staticmethod
    def _action_id(area: str, title: str, index: int) -> str:
        clean = "".join(ch for ch in title.lower() if ch.isalnum() or ch == " ").strip().replace(" ", "-")
        return f"{area}-{clean[:48]}-{index}"

    @classmethod
    async def generate(cls, db: AsyncSession, user_id: str) -> FinancialTriageResponse:
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        total_res = await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        case((Transaction.type == "INCOME", Transaction.amount), else_=0)
                    ),
                    0,
                ).label("total_income"),
                func.coalesce(
                    func.sum(
                        case((Transaction.type == "EXPENSE", Transaction.amount), else_=0)
                    ),
                    0,
                ).label("total_expenses"),
            ).filter(Transaction.user_id == user_id)
        )
        totals_row = total_res.one()
        total_income = cls._to_decimal(totals_row.total_income)
        total_expenses = cls._to_decimal(totals_row.total_expenses)

        monthly_res = await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        case((Transaction.type == "INCOME", Transaction.amount), else_=0)
                    ),
                    0,
                ).label("monthly_income"),
                func.coalesce(
                    func.sum(
                        case((Transaction.type == "EXPENSE", Transaction.amount), else_=0)
                    ),
                    0,
                ).label("monthly_expenses"),
            ).filter(
                Transaction.user_id == user_id,
                Transaction.occurred_at >= month_start,
            )
        )
        monthly_row = monthly_res.one()
        monthly_income = cls._to_decimal(monthly_row.monthly_income)
        monthly_expenses = cls._to_decimal(monthly_row.monthly_expenses)

        pending_res = await db.execute(
            select(
                func.count(Transaction.id).label("pending_count"),
                func.coalesce(func.sum(Transaction.amount), 0).label("pending_total"),
            ).filter(
                Transaction.user_id == user_id,
                Transaction.type == "EXPENSE",
                Transaction.status == "pending",
            )
        )
        pending_row = pending_res.one()
        pending_transaction_count = int(pending_row.pending_count or 0)
        pending_transaction_total = cls._to_decimal(pending_row.pending_total)

        uncategorized_res = await db.execute(
            select(
                func.count(Transaction.id).label("uncategorized_count"),
                func.coalesce(func.sum(Transaction.amount), 0).label("uncategorized_total"),
            ).filter(
                Transaction.user_id == user_id,
                Transaction.type == "EXPENSE",
                Transaction.category_id.is_(None),
                Transaction.occurred_at >= thirty_days_ago,
            )
        )
        uncategorized_row = uncategorized_res.one()
        uncategorized_expense_count = int(uncategorized_row.uncategorized_count or 0)
        uncategorized_expense_total = cls._to_decimal(uncategorized_row.uncategorized_total)

        total_balance = total_income - total_expenses

        if monthly_income > 0:
            burn_rate_pct = float((monthly_expenses / monthly_income) * Decimal("100"))
        elif monthly_expenses > 0:
            burn_rate_pct = 100.0
        else:
            burn_rate_pct = 0.0

        elapsed_days = max(1, now.day)
        average_daily_spend = monthly_expenses / Decimal(elapsed_days) if monthly_expenses > 0 else Decimal("0")
        if average_daily_spend > 0 and total_balance > 0:
            liquidity_buffer_days = int(total_balance / average_daily_spend)
        elif total_balance <= 0 and average_daily_spend > 0:
            liquidity_buffer_days = 0
        else:
            liquidity_buffer_days = 365

        category_result = await db.execute(
            select(BudgetCategory).filter(BudgetCategory.user_id == user_id)
        )
        categories = category_result.scalars().all()
        category_name_map = {category.id: category.name for category in categories}

        rule_result = await db.execute(select(BudgetRule).filter(BudgetRule.user_id == user_id))
        rules = rule_result.scalars().all()

        monthly_category_spend_res = await db.execute(
            select(
                Transaction.category_id,
                func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
            ).filter(
                Transaction.user_id == user_id,
                Transaction.type == "EXPENSE",
                Transaction.category_id.is_not(None),
                Transaction.occurred_at >= month_start,
            ).group_by(Transaction.category_id)
        )
        monthly_category_spend: dict[str, Decimal] = {
            row.category_id: cls._to_decimal(row.spent)
            for row in monthly_category_spend_res
        }

        over_budget_rules: list[dict] = []
        for rule in rules:
            limit = cls._to_decimal(rule.monthly_limit)
            if limit <= 0:
                continue

            spent = monthly_category_spend.get(rule.category_id, Decimal("0"))
            if spent > limit:
                over_budget_rules.append(
                    {
                        "rule": rule,
                        "category_name": category_name_map.get(rule.category_id, "Uncategorized"),
                        "spent": spent,
                        "limit": limit,
                        "over_by": spent - limit,
                    }
                )
        over_budget_rules.sort(key=lambda item: item["over_by"], reverse=True)

        bills_result = await db.execute(select(Bill).filter(Bill.user_id == user_id))
        bills = bills_result.scalars().all()

        overdue_bills: list[dict] = []
        due_soon_bills: list[dict] = []
        for bill in bills:
            due_date = cls._month_due_date(now, bill.due_day)
            paid_this_cycle = bool(bill.last_paid_at and bill.last_paid_at >= due_date)
            if paid_this_cycle:
                continue

            if now > due_date + timedelta(days=1):
                overdue_bills.append({"bill": bill, "due_date": due_date})
            elif 0 <= (due_date - now).days <= 7:
                due_soon_bills.append({"bill": bill, "due_date": due_date})

        subscription_result = await db.execute(
            select(Subscription).filter(Subscription.user_id == user_id, Subscription.is_active == True)
        )
        subscriptions = subscription_result.scalars().all()

        monthly_subscription_cost = Decimal("0")
        stale_subscriptions: list[dict] = []
        for subscription in subscriptions:
            base_amount = cls._to_decimal(subscription.amount)
            monthly_cost = (
                base_amount if subscription.billing_cycle == "monthly" else base_amount / Decimal("12")
            )
            monthly_subscription_cost += monthly_cost
            if subscription.usage_count <= 1 and monthly_cost >= Decimal("15"):
                stale_subscriptions.append(
                    {"subscription": subscription, "monthly_cost": monthly_cost}
                )
        stale_subscriptions.sort(key=lambda item: item["monthly_cost"], reverse=True)

        loans_result = await db.execute(
            select(Loan).filter(Loan.user_id == user_id, Loan.status == "active")
        )
        loans = loans_result.scalars().all()

        overdue_loans: list[dict] = []
        for loan in loans:
            due_date = cls._month_due_date(now, loan.due_day)
            paid_this_cycle = bool(loan.last_paid_at and loan.last_paid_at >= due_date)
            if paid_this_cycle:
                continue
            if now > due_date + timedelta(days=1):
                overdue_loans.append({"loan": loan, "due_date": due_date})

        monthly_bill_cost = sum((cls._to_decimal(bill.amount_estimated) for bill in bills), Decimal("0"))
        monthly_loan_cost = sum((cls._to_decimal(loan.emi_amount) for loan in loans), Decimal("0"))
        monthly_fixed_costs = monthly_bill_cost + monthly_subscription_cost + monthly_loan_cost

        actions: list[TriageAction] = []

        def add_action(
            *,
            priority: int,
            severity: str,
            area: str,
            title: str,
            detail: str,
            impact_amount: Decimal = Decimal("0"),
            due_date: datetime | None = None,
            action_route: str,
            action_label: str,
        ) -> None:
            actions.append(
                TriageAction(
                    id=cls._action_id(area, title, len(actions) + 1),
                    priority=priority,
                    severity=severity,
                    area=area,
                    title=title,
                    detail=detail,
                    impact_amount=impact_amount,
                    due_date=due_date,
                    action_route=action_route,
                    action_label=action_label,
                )
            )

        if monthly_income == 0 and monthly_expenses > 0:
            add_action(
                priority=100,
                severity="critical",
                area="cashflow",
                title="No income logged this month",
                detail="Expenses are being recorded, but income is missing. Add paycheck or freelance income to prevent misleading risk signals.",
                impact_amount=monthly_expenses,
                action_route="/dashboard/transactions",
                action_label="Add income transaction",
            )
        elif burn_rate_pct >= 100:
            add_action(
                priority=96,
                severity="critical",
                area="cashflow",
                title="Monthly burn rate is above 100%",
                detail=f"Current spending is at {burn_rate_pct:.1f}% of income. Trim variable spending before the month closes.",
                impact_amount=monthly_expenses - monthly_income,
                action_route="/dashboard/analytics",
                action_label="Review spending trend",
            )
        elif burn_rate_pct >= 85:
            add_action(
                priority=88,
                severity="high",
                area="cashflow",
                title="Burn rate is getting tight",
                detail=f"Spending reached {burn_rate_pct:.1f}% of income. A small cut this week can prevent overdraft pressure.",
                impact_amount=monthly_expenses,
                action_route="/dashboard/analytics",
                action_label="Audit top categories",
            )

        if liquidity_buffer_days < 15:
            severity = "critical" if liquidity_buffer_days < 7 else "high"
            add_action(
                priority=90 if severity == "critical" else 78,
                severity=severity,
                area="cashflow",
                title="Liquidity buffer is low",
                detail=f"At current pace, available balance covers about {liquidity_buffer_days} day(s). Prioritize essentials and delay optional spend.",
                impact_amount=average_daily_spend * Decimal("15"),
                action_route="/dashboard/transactions",
                action_label="Review upcoming payments",
            )

        for overdue in overdue_bills[:3]:
            bill = overdue["bill"]
            due_date = overdue["due_date"]
            severity = "critical" if not bill.autopay_enabled else "high"
            add_action(
                priority=94 if severity == "critical" else 82,
                severity=severity,
                area="bills",
                title=f"Bill overdue: {bill.name}",
                detail=f"This bill was due on {due_date.date().isoformat()}. Mark it paid or reschedule immediately.",
                impact_amount=cls._to_decimal(bill.amount_estimated),
                due_date=due_date,
                action_route="/dashboard/bills",
                action_label="Resolve overdue bill",
            )

        for overdue in overdue_loans[:3]:
            loan = overdue["loan"]
            due_date = overdue["due_date"]
            severity = "critical" if not loan.autopay_enabled else "high"
            add_action(
                priority=95 if severity == "critical" else 83,
                severity=severity,
                area="loans",
                title=f"EMI overdue: {loan.name}",
                detail=f"This loan EMI of {loan.emi_amount:.2f} was due on {due_date.date().isoformat()}. Pay it immediately.",
                impact_amount=cls._to_decimal(loan.emi_amount),
                due_date=due_date,
                action_route="/dashboard/loans",
                action_label="Pay EMI",
            )

        if not overdue_bills and due_soon_bills:
            next_due = min(due_soon_bills, key=lambda item: item["due_date"])
            due_bill = next_due["bill"]
            due_date = next_due["due_date"]
            add_action(
                priority=62,
                severity="medium",
                area="bills",
                title=f"Upcoming bill in {max((due_date - now).days, 0)} day(s)",
                detail=f"{due_bill.name} is due on {due_date.date().isoformat()}. Queue this payment now to avoid end-of-month stress.",
                impact_amount=cls._to_decimal(due_bill.amount_estimated),
                due_date=due_date,
                action_route="/dashboard/bills",
                action_label="Plan bill payment",
            )

        for over_budget in over_budget_rules[:2]:
            over_ratio = (
                float(over_budget["over_by"] / over_budget["limit"])
                if over_budget["limit"] > 0
                else 0
            )
            severity = "high" if over_ratio >= 0.2 else "medium"
            add_action(
                priority=84 if severity == "high" else 70,
                severity=severity,
                area="budget",
                title=f"{over_budget['category_name']} is over budget",
                detail=f"Spent {over_budget['spent']:.2f} vs limit {over_budget['limit']:.2f}. Reduce this category or rebalance your budget rules.",
                impact_amount=over_budget["over_by"],
                action_route="/dashboard/budget",
                action_label="Adjust budget rule",
            )

        if pending_transaction_count > 0:
            add_action(
                priority=72,
                severity="medium",
                area="transactions",
                title=f"{pending_transaction_count} pending payment(s) need review",
                detail="Pending expenses create uncertainty in your real balance. Confirm or cancel them so your dashboard reflects reality.",
                impact_amount=pending_transaction_total,
                action_route="/dashboard/transactions",
                action_label="Clear pending items",
            )

        if uncategorized_expense_count > 0:
            add_action(
                priority=66,
                severity="medium",
                area="transactions",
                title=f"{uncategorized_expense_count} uncategorized expense(s)",
                detail="Uncategorized spend hides patterns and weakens budget alerts. Categorize recent transactions to improve guidance quality.",
                impact_amount=uncategorized_expense_total,
                action_route="/dashboard/transactions",
                action_label="Categorize transactions",
            )

        if monthly_income > 0 and monthly_subscription_cost > 0:
            subscription_ratio = monthly_subscription_cost / monthly_income
            if subscription_ratio >= Decimal("0.15"):
                add_action(
                    priority=68,
                    severity="high",
                    area="subscriptions",
                    title="Subscriptions are consuming a large share of income",
                    detail=f"Recurring services take about {float(subscription_ratio * Decimal('100')):.1f}% of monthly income.",
                    impact_amount=monthly_subscription_cost,
                    action_route="/dashboard/subscriptions",
                    action_label="Trim recurring costs",
                )
            elif subscription_ratio >= Decimal("0.08"):
                add_action(
                    priority=58,
                    severity="medium",
                    area="subscriptions",
                    title="Recurring costs deserve a quick audit",
                    detail=f"Subscriptions total about {float(subscription_ratio * Decimal('100')):.1f}% of monthly income. Cancel low-value services.",
                    impact_amount=monthly_subscription_cost,
                    action_route="/dashboard/subscriptions",
                    action_label="Audit subscriptions",
                )

        if stale_subscriptions:
            worst_stale = stale_subscriptions[0]
            sub = worst_stale["subscription"]
            add_action(
                priority=56,
                severity="low",
                area="subscriptions",
                title=f"Low-usage subscription: {sub.name}",
                detail="Usage is minimal but cost is recurring. If this is not essential, pause or cancel it.",
                impact_amount=worst_stale["monthly_cost"],
                action_route="/dashboard/subscriptions",
                action_label="Review subscription",
            )

        if monthly_expenses > 0 and not rules:
            add_action(
                priority=52,
                severity="medium",
                area="setup",
                title="No budget rules configured",
                detail="Set at least 3 category limits (needs, bills, discretionary) so overspending gets flagged early.",
                action_route="/dashboard/budget",
                action_label="Create budget rules",
            )

        if monthly_expenses > 0 and not categories:
            add_action(
                priority=48,
                severity="medium",
                area="setup",
                title="No categories configured",
                detail="Categories are required for accurate analytics and budget alerts. Create categories for your top spending areas.",
                action_route="/dashboard/budget",
                action_label="Create categories",
            )

        if not actions:
            add_action(
                priority=40,
                severity="low",
                area="setup",
                title="Solid month so far",
                detail="No major cleanup actions detected. Keep logging transactions to maintain this baseline.",
                action_route="/dashboard/transactions",
                action_label="Log new transactions",
            )

        risk_score = 0
        if monthly_income == 0 and monthly_expenses > 0:
            risk_score += 35
        else:
            if burn_rate_pct >= 100:
                risk_score += 35
            elif burn_rate_pct >= 90:
                risk_score += 25
            elif burn_rate_pct >= 80:
                risk_score += 18
            elif burn_rate_pct >= 70:
                risk_score += 10
            elif burn_rate_pct > 0:
                risk_score += 4

        risk_score += min(len(overdue_bills) * 18, 36)
        risk_score += min(len(overdue_loans) * 20, 40)
        risk_score += min(len(over_budget_rules) * 8, 24)

        if monthly_income > 0 and pending_transaction_total > 0:
            pending_ratio = pending_transaction_total / monthly_income
            if pending_ratio >= Decimal("0.25"):
                risk_score += 15
            elif pending_ratio >= Decimal("0.10"):
                risk_score += 10
            elif pending_ratio >= Decimal("0.05"):
                risk_score += 6
        elif pending_transaction_total > 0:
            risk_score += 8

        if uncategorized_expense_count >= 8:
            risk_score += 12
        elif uncategorized_expense_count > 0:
            risk_score += 6

        if monthly_income > 0 and monthly_subscription_cost > 0:
            sub_ratio = monthly_subscription_cost / monthly_income
            if sub_ratio >= Decimal("0.20"):
                risk_score += 12
            elif sub_ratio >= Decimal("0.12"):
                risk_score += 7

        if liquidity_buffer_days <= 0:
            risk_score += 20
        elif liquidity_buffer_days < 7:
            risk_score += 16
        elif liquidity_buffer_days < 15:
            risk_score += 10
        elif liquidity_buffer_days < 30:
            risk_score += 5

        stress_score = max(0, min(100, int(risk_score)))
        actions.sort(key=lambda action: action.priority, reverse=True)

        return FinancialTriageResponse(
            generated_at=now,
            stress_score=stress_score,
            stress_level=cls._stress_level(stress_score),
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            burn_rate_pct=round(burn_rate_pct, 2),
            monthly_fixed_costs=monthly_fixed_costs,
            liquidity_buffer_days=max(0, liquidity_buffer_days),
            pending_transaction_count=pending_transaction_count,
            uncategorized_expense_count=uncategorized_expense_count,
            actions=actions,
        )

