from datetime import datetime
from typing import Any, Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.api.validators import ensure_category_owned
from app.core.database import get_db
from app.models.budget import BudgetRule
from app.models.income import IncomeSource
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import BudgetRuleCreate, BudgetRuleResponse, BudgetRuleUpdate
from app.services.budget_engine import BudgetEngine

router = APIRouter()

# ... (Keep existing CRUD operations for Rules) ...

@router.post("/rules", response_model=BudgetRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_budget_rule(
    rule_in: BudgetRuleCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=rule_in.category_id,
    )

    rule = BudgetRule(
        id=str(uuid4()),
        user_id=current_user.id,
        **rule_in.model_dump()
    )
    db.add(rule)
    await db.commit()
    
    # Reload with relationship (refresh doesn't load relations in async)
    result = await db.execute(
        select(BudgetRule)
        .options(selectinload(BudgetRule.category))
        .filter(BudgetRule.id == rule.id)
    )
    return result.scalars().first()

@router.get("/rules", response_model=list[BudgetRuleResponse])
async def read_budget_rules(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(
        select(BudgetRule)
        .options(selectinload(BudgetRule.category))
        .filter(BudgetRule.user_id == current_user.id)
    )
    return result.scalars().all()

@router.put("/rules/{rule_id}", response_model=BudgetRuleResponse)
async def update_budget_rule(
    rule_id: str,
    rule_in: BudgetRuleUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(select(BudgetRule).filter(BudgetRule.id == rule_id, BudgetRule.user_id == current_user.id))
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = rule_in.model_dump(exclude_unset=True)
    await ensure_category_owned(
        db,
        user_id=current_user.id,
        category_id=update_data.get("category_id", rule.category_id),
    )

    for k, v in update_data.items():
        setattr(rule, k, v)
    
    db.add(rule)
    await db.commit()
    
    # Reload with relationship
    result = await db.execute(
        select(BudgetRule)
        .options(selectinload(BudgetRule.category))
        .filter(BudgetRule.id == rule.id)
    )
    return result.scalars().first()

@router.delete("/rules/{rule_id}", response_model=BudgetRuleResponse)
async def delete_budget_rule(
    rule_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    # Need to load before deleting if we want to return it with relation, 
    # but usually delete just returns basic info or id. 
    # However, response_model is BudgetRuleResponse which expects category?
    # Actually, if we delete it, we can't easily fetch it.
    # We should probably load it, then delete it.
    
    result = await db.execute(
        select(BudgetRule)
        .options(selectinload(BudgetRule.category))
        .filter(BudgetRule.id == rule_id, BudgetRule.user_id == current_user.id)
    )
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    await db.delete(rule)
    await db.commit()
    return rule


@router.get("/summary")
async def get_budget_summary(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=1970, le=2100),
) -> Any:
    """
    Calculate and return the budget summary dashboard data using Budget Engine.
    """
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    month_start = datetime(target_year, target_month, 1)
    if target_month == 12:
        month_end = datetime(target_year + 1, 1, 1)
    else:
        month_end = datetime(target_year, target_month + 1, 1)

    # Fetch all necessary data
    # 1. Incomes
    incomes_res = await db.execute(select(IncomeSource).filter(IncomeSource.user_id == current_user.id))
    incomes = incomes_res.scalars().all()
    
    # 2. Rules
    rules_res = await db.execute(select(BudgetRule).filter(BudgetRule.user_id == current_user.id))
    rules = rules_res.scalars().all()
    
    # 3. Transactions (for the specific month)
    # Note: Logic to filter by month should ideally happen in DB query for performance, 
    # but for MVP filtering in python or fetching all and filtering is acceptable if volume is low.
    # Let's simple filter in DB:
    # This requires start/end date calculation
    # For now, let's fetch all (simple) or improve query.
    
    transactions_res = await db.execute(
        select(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.occurred_at >= month_start,
            Transaction.occurred_at < month_end,
        )
    )
    transactions = transactions_res.scalars().all()
    
    # Calculate
    summary = BudgetEngine.calculate_monthly_overview(
        incomes=incomes,
        rules=rules,
        transactions=transactions,
        year=target_year,
        month=target_month
    )
    
    return summary
