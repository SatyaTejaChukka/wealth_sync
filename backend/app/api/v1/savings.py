from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import uuid4

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.savings import SavingsGoal, SavingsLog
from app.schemas.savings import SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse, SavingsContribution, SavingsLogResponse

router = APIRouter()

@router.post("/", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_in: SavingsGoalCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    goal_data = goal_in.model_dump()
    if goal_data.get('target_date'):
        goal_data['target_date'] = goal_data['target_date'].replace(tzinfo=None)

    goal = SavingsGoal(
        id=str(uuid4()),
        user_id=current_user.id,
        **goal_data
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal

@router.get("/", response_model=List[SavingsGoalResponse])
async def read_goals(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(select(SavingsGoal).filter(SavingsGoal.user_id == current_user.id))
    return result.scalars().all()

@router.put("/{goal_id}", response_model=SavingsGoalResponse)
async def update_goal(
    goal_id: str,
    goal_in: SavingsGoalUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(select(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings Goal not found")
    
    for k, v in goal_in.model_dump(exclude_unset=True).items():
        setattr(goal, k, v)
        
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal

@router.delete("/{goal_id}", response_model=SavingsGoalResponse)
async def delete_goal(
    goal_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    result = await db.execute(select(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings Goal not found")

    response_data = SavingsGoalResponse.model_validate(goal)

    await db.delete(goal)
    await db.commit()
    return response_data

@router.post("/{goal_id}/contribute", response_model=SavingsGoalResponse)
async def contribute_to_goal(
    goal_id: str,
    contribution: SavingsContribution,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    # 1. Fetch Goal
    result = await db.execute(select(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings Goal not found")

    # 2. Add Log
    log = SavingsLog(
        id=str(uuid4()),
        goal_id=goal_id,
        amount=contribution.amount,
        note=contribution.note
    )
    db.add(log)

    # 3. Update Goal Total
    goal.current_amount += contribution.amount
    
    # Check completion
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True

    await db.commit()
    await db.refresh(goal)
    return goal

@router.get("/{goal_id}/logs", response_model=List[SavingsLogResponse])
async def get_goal_logs(
    goal_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    # Verify ownership
    result = await db.execute(select(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id))
    if not result.scalars().first():
         raise HTTPException(status_code=404, detail="Savings Goal not found")

    # Fetch logs
    logs_res = await db.execute(select(SavingsLog).filter(SavingsLog.goal_id == goal_id).order_by(SavingsLog.created_at.desc()))
    return logs_res.scalars().all()
