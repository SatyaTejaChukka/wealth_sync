from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.bill import Bill
from app.models.budget import BudgetCategory, BudgetRule
from app.models.income import IncomeSource
from app.models.savings import SavingsGoal, SavingsLog
from app.models.subscription import Subscription
from app.models.transaction import Transaction


class FinancialPlanningService:
    GOAL_CONTRIBUTION_PREFIX = "Autopilot Goal Contribution:"

    @staticmethod
    def _to_decimal(value: Decimal | float | int | None) -> Decimal:
        if value is None:
            return Decimal("0")
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    @staticmethod
    def _to_money(value: Decimal) -> float:
        return float(round(value, 2))

    @staticmethod
    def _monthly_multiplier(frequency: str | None) -> Decimal:
        value = (frequency or "monthly").strip().lower()
        if value == "monthly":
            return Decimal("1")
        if value == "weekly":
            return Decimal("52") / Decimal("12")
        if value == "biweekly":
            return Decimal("26") / Decimal("12")
        if value == "yearly":
            return Decimal("1") / Decimal("12")
        if value == "daily":
            return Decimal("30")
        return Decimal("1")

    @staticmethod
    def _effective_transaction(transaction: Transaction) -> bool:
        return transaction.status in {None, "completed"}

    @classmethod
    def _effective_transaction_filter(cls):
        return or_(Transaction.status == "completed", Transaction.status.is_(None))

    @classmethod
    def _allocate_goals_by_priority(
        cls,
        goals: List[SavingsGoal],
        available_amount: Decimal,
    ) -> tuple[List[Dict[str, Any]], Decimal]:
        remaining = max(Decimal("0"), available_amount)
        allocations: List[Dict[str, Any]] = []

        sorted_goals = sorted(
            goals,
            key=lambda goal: (
                -max(0, int(goal.priority or 0)),
                str(goal.name or ""),
                str(goal.id or ""),
            ),
        )

        total_allocated = Decimal("0")
        for goal in sorted_goals:
            requested = max(Decimal("0"), cls._to_decimal(goal.monthly_contribution))
            allocated = min(requested, remaining)
            remaining -= allocated
            total_allocated += allocated
            shortfall = max(Decimal("0"), requested - allocated)
            allocations.append(
                {
                    "goal_id": goal.id,
                    "goal_name": goal.name,
                    "priority": int(goal.priority or 0),
                    "requested": cls._to_money(requested),
                    "allocated": cls._to_money(allocated),
                    "shortfall": cls._to_money(shortfall),
                    "is_fully_funded": shortfall == 0,
                }
            )

        return allocations, total_allocated

    @classmethod
    def _build_confidence(
        cls,
        *,
        salary_source: str,
        salary_considered: Decimal,
        monthly_income_from_transactions: Decimal,
        monthly_income_from_sources: Decimal,
        pending_transaction_count: int,
        uncategorized_expense_count: int,
        commitment_coverage_ok: bool,
    ) -> Dict[str, Any]:
        reasons: List[str] = []

        if salary_considered <= 0:
            return {
                "score": 20,
                "label": "low",
                "reasons": ["No usable monthly income basis is available yet."],
            }

        score = 92

        if salary_source == "income_sources":
            score -= 15
            reasons.append("Using configured income because no posted income was found this month.")
        elif salary_source == "income_transactions":
            reasons.append("Using posted income transactions for this month's income basis.")

        if monthly_income_from_transactions > 0 and monthly_income_from_sources > 0:
            larger = max(monthly_income_from_transactions, monthly_income_from_sources)
            variance_ratio = (
                abs(monthly_income_from_transactions - monthly_income_from_sources) / larger
                if larger > 0
                else Decimal("0")
            )
            if variance_ratio >= Decimal("0.25"):
                score -= 10
                reasons.append("Posted income differs meaningfully from configured income settings.")

        if pending_transaction_count > 0:
            score -= min(15, pending_transaction_count * 3)
            reasons.append(
                f"{pending_transaction_count} pending transaction(s) may still change this month's picture."
            )

        if uncategorized_expense_count > 0:
            score -= min(12, uncategorized_expense_count * 2)
            reasons.append(
                f"{uncategorized_expense_count} uncategorized expense(s) reduce planning precision."
            )

        if not commitment_coverage_ok:
            score -= 20
            reasons.append("Income does not fully cover hard commitments.")

        score = max(15, min(100, score))
        if score >= 80:
            label = "high"
        elif score >= 55:
            label = "medium"
        else:
            label = "low"

        return {
            "score": score,
            "label": label,
            "reasons": reasons,
        }

    @classmethod
    async def calculate_comprehensive_overview(
        cls,
        session: AsyncSession,
        user_id: str,
        *,
        salary_override: float | None = None,
        free_money_min_percent: float = 20.0,
        now: datetime | None = None,
    ) -> Dict[str, Any]:
        now = now or datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        floor_percent = max(0.0, min(float(free_money_min_percent), 80.0))

        income_res = await session.execute(select(IncomeSource).filter(IncomeSource.user_id == user_id))
        income_sources = income_res.scalars().all()

        bills_res = await session.execute(select(Bill).filter(Bill.user_id == user_id))
        bills = bills_res.scalars().all()

        subs_res = await session.execute(
            select(Subscription).filter(Subscription.user_id == user_id, Subscription.is_active == True)
        )
        subscriptions = subs_res.scalars().all()

        goals_res = await session.execute(
            select(SavingsGoal).filter(SavingsGoal.user_id == user_id, SavingsGoal.is_completed == False)
        )
        goals = goals_res.scalars().all()

        categories_res = await session.execute(
            select(BudgetCategory).filter(BudgetCategory.user_id == user_id)
        )
        budget_categories = categories_res.scalars().all()
        category_name_map = {category.id: category.name for category in budget_categories}

        rules_res = await session.execute(select(BudgetRule).filter(BudgetRule.user_id == user_id))
        budget_rules = rules_res.scalars().all()

        month_tx_res = await session.execute(
            select(Transaction).filter(
                Transaction.user_id == user_id,
                Transaction.occurred_at >= start_of_month,
                Transaction.occurred_at <= now,
            )
        )
        month_transactions = month_tx_res.scalars().all()

        month_logs_res = await session.execute(
            select(SavingsLog, SavingsGoal)
            .join(SavingsGoal, SavingsGoal.id == SavingsLog.goal_id)
            .filter(
                SavingsGoal.user_id == user_id,
                SavingsLog.created_at >= start_of_month,
                SavingsLog.created_at <= now,
            )
        )
        month_logs = month_logs_res.all()

        active_income_sources = [income for income in income_sources if bool(income.active)]
        monthly_income_from_sources = sum(
            (
                cls._to_decimal(income.amount) * cls._monthly_multiplier(income.frequency)
                for income in active_income_sources
            ),
            Decimal("0"),
        )

        completed_transactions = [
            tx for tx in month_transactions if cls._effective_transaction(tx)
        ]
        completed_expense_transactions = [
            tx
            for tx in completed_transactions
            if tx.type == "EXPENSE"
        ]
        completed_income_transactions = [
            tx
            for tx in completed_transactions
            if tx.type == "INCOME"
        ]
        pending_transaction_count = sum(1 for tx in month_transactions if tx.status == "pending")
        uncategorized_expense_count = sum(
            1
            for tx in completed_expense_transactions
            if tx.category_id is None and not tx.bill_id and not tx.subscription_id
        )

        monthly_income_from_transactions = sum(
            (cls._to_decimal(tx.amount) for tx in completed_income_transactions),
            Decimal("0"),
        )

        if salary_override is None:
            if monthly_income_from_transactions > 0:
                salary_considered = max(Decimal("0"), monthly_income_from_transactions)
                salary_source = "income_transactions"
            else:
                salary_considered = max(Decimal("0"), monthly_income_from_sources)
                salary_source = "income_sources"
        else:
            salary_considered = max(Decimal("0"), cls._to_decimal(salary_override))
            salary_source = "salary_override"

        commitments_items: List[Dict[str, Any]] = []
        unpaid_bills_amount = Decimal("0")
        for bill in bills:
            is_paid_this_month = bool(bill.last_paid_at and bill.last_paid_at >= start_of_month)
            if is_paid_this_month:
                continue
            amount = max(
                Decimal("0"),
                cls._to_decimal(bill.amount_estimated)
                * cls._monthly_multiplier(getattr(bill, "frequency", "monthly")),
            )
            unpaid_bills_amount += amount
            commitments_items.append(
                {
                    "type": "BILL",
                    "name": bill.name,
                    "amount": cls._to_money(amount),
                    "priority": 100,
                    "metadata": {
                        "due_day": bill.due_day,
                        "autopay_enabled": bool(bill.autopay_enabled),
                    },
                }
            )

        subscriptions_amount = Decimal("0")
        for subscription in subscriptions:
            amount = max(
                Decimal("0"),
                cls._to_decimal(subscription.amount)
                * cls._monthly_multiplier(subscription.billing_cycle or "monthly"),
            )
            subscriptions_amount += amount
            commitments_items.append(
                {
                    "type": "SUBSCRIPTION",
                    "name": subscription.name,
                    "amount": cls._to_money(amount),
                    "priority": 90,
                    "metadata": {
                        "billing_cycle": subscription.billing_cycle,
                    },
                }
            )

        commitments_total = unpaid_bills_amount + subscriptions_amount

        planned_expense_items: List[Dict[str, Any]] = []
        planned_expense_requested_total = Decimal("0")
        planned_rule_category_ids: set[str] = set()
        for rule in budget_rules:
            monthly_limit = cls._to_decimal(rule.monthly_limit)
            if monthly_limit <= 0:
                continue
            planned_rule_category_ids.add(rule.category_id)
            planned_expense_requested_total += monthly_limit
            planned_expense_items.append(
                {
                    "rule_id": rule.id,
                    "category_id": rule.category_id,
                    "category_name": category_name_map.get(rule.category_id, "Uncategorized"),
                    "requested": cls._to_money(monthly_limit),
                }
            )

        goal_requested_total = sum(
            (max(Decimal("0"), cls._to_decimal(goal.monthly_contribution)) for goal in goals),
            Decimal("0"),
        )
        free_money_floor = salary_considered * (Decimal(str(floor_percent)) / Decimal("100"))
        remaining_after_commitments = salary_considered - commitments_total

        if remaining_after_commitments <= 0:
            planned_expense_allocated = Decimal("0")
            planned_expense_shortfall = planned_expense_requested_total
            goal_allocations = [
                {
                    "goal_id": goal.id,
                    "goal_name": goal.name,
                    "priority": int(goal.priority or 0),
                    "requested": cls._to_money(max(Decimal("0"), cls._to_decimal(goal.monthly_contribution))),
                    "allocated": 0.0,
                    "shortfall": cls._to_money(max(Decimal("0"), cls._to_decimal(goal.monthly_contribution))),
                    "is_fully_funded": False,
                }
                for goal in goals
            ]
            allocated_to_goals = Decimal("0")
            free_money = Decimal("0")
            free_money_floor_met = False
        else:
            allocatable_after_floor = max(Decimal("0"), remaining_after_commitments - free_money_floor)
            planned_expense_allocated = min(planned_expense_requested_total, allocatable_after_floor)
            planned_expense_shortfall = max(
                Decimal("0"),
                planned_expense_requested_total - planned_expense_allocated,
            )

            remaining_planned_distribution = planned_expense_allocated
            for item in planned_expense_items:
                requested_amount = cls._to_decimal(item["requested"])
                if requested_amount <= 0 or remaining_planned_distribution <= 0:
                    item["allocated"] = 0.0
                    item["shortfall"] = cls._to_money(requested_amount)
                    continue
                allocated_amount = min(requested_amount, remaining_planned_distribution)
                remaining_planned_distribution -= allocated_amount
                item["allocated"] = cls._to_money(allocated_amount)
                item["shortfall"] = cls._to_money(requested_amount - allocated_amount)

            planned_expense_allocated = sum(
                (cls._to_decimal(item.get("allocated", 0)) for item in planned_expense_items),
                Decimal("0"),
            )

            goals_budget_cap = max(
                Decimal("0"),
                remaining_after_commitments - free_money_floor - planned_expense_allocated,
            )
            budget_for_goals = min(goal_requested_total, goals_budget_cap)
            goal_allocations, allocated_to_goals = cls._allocate_goals_by_priority(goals, budget_for_goals)
            free_money = max(
                Decimal("0"),
                remaining_after_commitments - planned_expense_allocated - allocated_to_goals,
            )
            free_money_floor_met = free_money >= free_money_floor or remaining_after_commitments <= free_money_floor

        goal_shortfall = max(Decimal("0"), goal_requested_total - allocated_to_goals)
        commitment_coverage_ok = salary_considered >= commitments_total
        total_protected_budget = commitments_total + planned_expense_allocated + allocated_to_goals

        goal_contribution_tx_total = sum(
            (
                cls._to_decimal(tx.amount)
                for tx in completed_expense_transactions
                if (tx.description or "").startswith(cls.GOAL_CONTRIBUTION_PREFIX)
            ),
            Decimal("0"),
        )
        commitment_spend_actual = sum(
            (
                cls._to_decimal(tx.amount)
                for tx in completed_expense_transactions
                if tx.bill_id or tx.subscription_id
            ),
            Decimal("0"),
        )
        planned_spend_actual = sum(
            (
                cls._to_decimal(tx.amount)
                for tx in completed_expense_transactions
                if not tx.bill_id
                and not tx.subscription_id
                and not (tx.description or "").startswith(cls.GOAL_CONTRIBUTION_PREFIX)
                and tx.category_id in planned_rule_category_ids
            ),
            Decimal("0"),
        )
        total_spent_month = sum(
            (cls._to_decimal(tx.amount) for tx in completed_expense_transactions),
            Decimal("0"),
        )
        today_spent = sum(
            (
                cls._to_decimal(tx.amount)
                for tx in completed_expense_transactions
                if tx.occurred_at and tx.occurred_at >= start_of_today
            ),
            Decimal("0"),
        )
        goal_contribution_actual = sum(
            (cls._to_decimal(log.amount) for log, _goal in month_logs),
            Decimal("0"),
        )
        flexible_spend_actual = max(
            Decimal("0"),
            total_spent_month - commitment_spend_actual - planned_spend_actual - goal_contribution_tx_total,
        )

        commitment_overage = max(Decimal("0"), commitment_spend_actual - commitments_total)
        planned_overage = max(Decimal("0"), planned_spend_actual - planned_expense_allocated)
        goal_overage = max(Decimal("0"), goal_contribution_actual - allocated_to_goals)
        total_overage = commitment_overage + planned_overage + goal_overage
        safe_to_spend_remaining = max(Decimal("0"), free_money - flexible_spend_actual - total_overage)

        if not commitment_coverage_ok:
            primary_constraint = "commitments"
            health_state = "critical"
            status_message = "Income does not fully cover hard commitments. Manual review is needed."
        elif planned_expense_shortfall > 0:
            primary_constraint = "planned_expenses"
            health_state = "warning"
            status_message = "Hard commitments are covered. Planned expenses are only partially funded."
        elif goal_shortfall > 0:
            primary_constraint = "goals"
            health_state = "warning"
            status_message = "Hard commitments are covered. Goals are being funded by priority."
        elif not free_money_floor_met:
            primary_constraint = "free_money_floor"
            health_state = "warning"
            status_message = "Core allocations are funded, but the free-money floor is below target."
        else:
            primary_constraint = "healthy"
            health_state = "healthy"
            status_message = "Your monthly plan is aligned and the free-money floor is protected."

        warnings: List[str] = []
        warning_details: List[Dict[str, Any]] = []

        def add_warning(code: str, severity: str, message: str, amount: Decimal | None = None) -> None:
            warnings.append(message)
            warning_details.append(
                {
                    "code": code,
                    "severity": severity,
                    "message": message,
                    "amount": cls._to_money(amount or Decimal("0")),
                }
            )

        if not commitment_coverage_ok:
            deficit = commitments_total - salary_considered
            add_warning(
                "commitment_deficit",
                "critical",
                f"Hard commitment deficit: {cls._to_money(deficit)}",
                deficit,
            )
        if planned_expense_shortfall > 0:
            add_warning(
                "planned_shortfall",
                "warning",
                f"Planned expense shortfall: {cls._to_money(planned_expense_shortfall)}",
                planned_expense_shortfall,
            )
        if goal_shortfall > 0:
            add_warning(
                "goal_shortfall",
                "warning",
                f"Goal shortfall: {cls._to_money(goal_shortfall)}",
                goal_shortfall,
            )
        if not free_money_floor_met:
            floor_gap = max(Decimal("0"), free_money_floor - free_money)
            add_warning(
                "free_money_floor_gap",
                "warning",
                f"Free-money floor gap: {cls._to_money(floor_gap)}",
                floor_gap,
            )
        if total_overage > 0:
            add_warning(
                "budget_overage",
                "warning",
                f"Actual spending has exceeded protected allocations by {cls._to_money(total_overage)}",
                total_overage,
            )

        confidence = cls._build_confidence(
            salary_source=salary_source,
            salary_considered=salary_considered,
            monthly_income_from_transactions=monthly_income_from_transactions,
            monthly_income_from_sources=monthly_income_from_sources,
            pending_transaction_count=pending_transaction_count,
            uncategorized_expense_count=uncategorized_expense_count,
            commitment_coverage_ok=commitment_coverage_ok,
        )

        salary_rule_engine = {
            "salary_considered": cls._to_money(salary_considered),
            "salary_source": salary_source,
            "salary_candidates": {
                "from_income_transactions": cls._to_money(monthly_income_from_transactions),
                "from_income_sources": cls._to_money(monthly_income_from_sources),
            },
            "rules_config": {
                "commitments_first": True,
                "planned_expenses_after_commitments": True,
                "goal_strategy": "priority_desc",
                "free_money_min_percent": floor_percent,
            },
            "allocation": {
                "commitments": cls._to_money(max(Decimal("0"), commitments_total)),
                "planned_expenses": cls._to_money(max(Decimal("0"), planned_expense_allocated)),
                "goals": cls._to_money(max(Decimal("0"), allocated_to_goals)),
                "free_money": cls._to_money(max(Decimal("0"), free_money)),
                "free_money_floor_target": cls._to_money(max(Decimal("0"), free_money_floor)),
                "free_money_floor_met": free_money_floor_met,
            },
            "buckets": {
                "commitments": commitments_items,
                "planned_expenses": planned_expense_items,
                "goals": goal_allocations,
            },
            "totals": {
                "planned_expenses_requested": cls._to_money(planned_expense_requested_total),
                "planned_expenses_allocated": cls._to_money(planned_expense_allocated),
                "planned_expenses_shortfall": cls._to_money(planned_expense_shortfall),
                "goal_requested": cls._to_money(goal_requested_total),
                "goal_allocated": cls._to_money(allocated_to_goals),
                "goal_shortfall": cls._to_money(goal_shortfall),
                "commitment_coverage_ratio": (
                    cls._to_money(salary_considered / commitments_total)
                    if commitments_total > 0
                    else 0.0
                ),
            },
            "actuals": {
                "spent_this_month": cls._to_money(total_spent_month),
                "spent_today": cls._to_money(today_spent),
                "commitment_spend": cls._to_money(commitment_spend_actual),
                "planned_spend": cls._to_money(planned_spend_actual),
                "goal_contributions": cls._to_money(goal_contribution_actual),
                "flexible_spend": cls._to_money(flexible_spend_actual),
            },
            "confidence": confidence,
            "status": {
                "health_state": health_state,
                "primary_constraint": primary_constraint,
                "commitment_deficit": cls._to_money(max(Decimal("0"), commitments_total - salary_considered)),
                "planned_expense_shortfall": cls._to_money(planned_expense_shortfall),
                "goal_shortfall": cls._to_money(goal_shortfall),
                "free_money_floor_gap": cls._to_money(max(Decimal("0"), free_money_floor - free_money)),
                "budget_overage": cls._to_money(total_overage),
            },
            "money_flow": {
                "income": cls._to_money(salary_considered),
                "hard_commitments": cls._to_money(commitments_total),
                "planned_expenses": cls._to_money(planned_expense_allocated),
                "goals": cls._to_money(allocated_to_goals),
                "protected_total": cls._to_money(total_protected_budget),
                "free_money_budget": cls._to_money(free_money),
                "flexible_spend": cls._to_money(flexible_spend_actual),
                "remaining_safe_to_spend": cls._to_money(safe_to_spend_remaining),
                "commitment_overage": cls._to_money(commitment_overage),
                "planned_overage": cls._to_money(planned_overage),
                "goal_overage": cls._to_money(goal_overage),
                "total_overage": cls._to_money(total_overage),
            },
            "status_message": status_message,
            "warnings": warnings,
            "warning_details": warning_details,
        }

        safe_to_spend_stats = {
            "total_income": cls._to_money(salary_considered),
            "total_committed": cls._to_money(total_protected_budget),
            "total_spent_month": cls._to_money(total_spent_month),
            "upcoming_commitments": cls._to_money(commitments_total),
            "monthly_free_budget": cls._to_money(free_money),
            "safe_to_spend": cls._to_money(safe_to_spend_remaining),
            "income_basis": salary_source,
            "money_flow": salary_rule_engine["money_flow"],
            "actuals": salary_rule_engine["actuals"],
            "planning_status": salary_rule_engine["status"],
            "confidence": confidence,
            "salary_rule_engine": salary_rule_engine,
            "breakdown": {
                "unpaid_bills": cls._to_money(unpaid_bills_amount),
                "subscriptions": cls._to_money(subscriptions_amount),
                "hard_commitments": cls._to_money(commitments_total),
                "planned_expenses_requested": cls._to_money(planned_expense_requested_total),
                "planned_expenses_allocated": cls._to_money(planned_expense_allocated),
                "savings_goals_requested": cls._to_money(goal_requested_total),
                "savings_goals_allocated": cls._to_money(allocated_to_goals),
                "income_from_transactions": cls._to_money(monthly_income_from_transactions),
                "income_from_sources": cls._to_money(monthly_income_from_sources),
                "monthly_income": cls._to_money(salary_considered),
                "monthly_committed": cls._to_money(total_protected_budget),
                "remaining_budget": cls._to_money(safe_to_spend_remaining),
                "spent_this_month": cls._to_money(total_spent_month),
                "spent_today": cls._to_money(today_spent),
                "committed_spend": cls._to_money(commitment_spend_actual),
                "planned_spend": cls._to_money(planned_spend_actual),
                "goal_contributions": cls._to_money(goal_contribution_actual),
                "flexible_spend": cls._to_money(flexible_spend_actual),
                "free_money_floor_target": cls._to_money(free_money_floor),
                "free_money_allocated": cls._to_money(free_money),
                "pending_transaction_count": pending_transaction_count,
                "uncategorized_expense_count": uncategorized_expense_count,
            },
        }

        return {
            "generated_at": now.isoformat(),
            "safe_to_spend_stats": safe_to_spend_stats,
            "salary_rule_engine": salary_rule_engine,
        }
