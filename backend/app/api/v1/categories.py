from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import uuid4

from app.api import deps
from app.core.database import get_db
from app.models.autopilot_payment import AutopilotPayment
from app.models.bill import Bill
from app.models.user import User
from app.models.budget import BudgetCategory, BudgetRule
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.schemas.budget import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter()


async def _table_has_column(
    session: AsyncSession,
    table_name: str,
    column_name: str,
) -> bool:
    connection = await session.connection()

    def check(sync_connection) -> bool:
        inspector = inspect(sync_connection)
        if not inspector.has_table(table_name):
            return False
        return any(
            column["name"] == column_name for column in inspector.get_columns(table_name)
        )

    return await connection.run_sync(check)


def _normalize_category_name(value: str) -> str:
    return " ".join((value or "").split()).strip()


def _preview_names(values: list[str], limit: int = 3) -> str:
    shown = [value for value in values if value][:limit]
    hidden_count = max(0, len(values) - len(shown))
    if hidden_count > 0:
        shown.append(f"+{hidden_count} more")
    return ", ".join(shown)


async def _ensure_no_duplicate_category_name(
    db: AsyncSession,
    *,
    user_id: str,
    category_name: str,
    excluding_category_id: str | None = None,
) -> None:
    normalized_name = _normalize_category_name(category_name)
    if not normalized_name:
        raise HTTPException(status_code=422, detail="Category name cannot be empty")

    existing_categories = (
        await db.execute(select(BudgetCategory).filter(BudgetCategory.user_id == user_id))
    ).scalars().all()
    for existing in existing_categories:
        if excluding_category_id and existing.id == excluding_category_id:
            continue
        if _normalize_category_name(existing.name).lower() == normalized_name.lower():
            raise HTTPException(
                status_code=409,
                detail=f'Category "{normalized_name}" already exists. Try a different name.',
            )


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create a new budget category.
    """
    normalized_name = _normalize_category_name(category_in.name)
    await _ensure_no_duplicate_category_name(
        db,
        user_id=current_user.id,
        category_name=normalized_name,
    )

    category = BudgetCategory(
        id=str(uuid4()),
        user_id=current_user.id,
        **{
            **category_in.model_dump(),
            "name": normalized_name,
        }
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Retrieve all categories for the current user.
    """
    result = await db.execute(select(BudgetCategory).filter(BudgetCategory.user_id == current_user.id))
    categories = result.scalars().all()
    return categories

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_in: CategoryUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Update a category.
    """
    result = await db.execute(
        select(BudgetCategory).filter(BudgetCategory.id == category_id, BudgetCategory.user_id == current_user.id)
    )
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_in.model_dump(exclude_unset=True)
    if "name" in update_data:
        update_data["name"] = _normalize_category_name(update_data["name"])
        await _ensure_no_duplicate_category_name(
            db,
            user_id=current_user.id,
            category_name=update_data["name"],
            excluding_category_id=category_id,
        )

    for field, value in update_data.items():
        setattr(category, field, value)

    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/{category_id}", response_model=CategoryResponse)
async def delete_category(
    category_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Delete a category.
    """
    result = await db.execute(
        select(BudgetCategory).filter(BudgetCategory.id == category_id, BudgetCategory.user_id == current_user.id)
    )
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    bills = (
        await db.execute(
            select(Bill).filter(
                Bill.user_id == current_user.id,
                Bill.category_id == category_id,
            )
        )
    ).scalars().all()
    subscriptions = (
        await db.execute(
            select(Subscription).filter(
                Subscription.user_id == current_user.id,
                Subscription.category_id == category_id,
            )
        )
    ).scalars().all()
    pending_transactions = (
        await db.execute(
            select(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == category_id,
                Transaction.status == "pending",
            )
        )
    ).scalars().all()
    linked_rules_count = (
        await db.execute(
            select(func.count(BudgetRule.id)).filter(
                BudgetRule.user_id == current_user.id,
                BudgetRule.category_id == category_id,
            )
        )
    ).scalar_one()

    blocking_reasons: list[str] = []
    if bills:
        bill_names = [bill.name for bill in bills]
        blocking_reasons.append(f"Bills: {_preview_names(bill_names)}")
    if subscriptions:
        subscription_names = [sub.name for sub in subscriptions]
        blocking_reasons.append(
            f"Subscriptions: {_preview_names(subscription_names)}"
        )
    if pending_transactions:
        pending_names = [
            txn.description or f"Pending transaction {txn.id[:8]}"
            for txn in pending_transactions
        ]
        blocking_reasons.append(
            f"Pending transactions: {_preview_names(pending_names)}"
        )
    if linked_rules_count:
        blocking_reasons.append(f"Budget rules: {linked_rules_count}")

    autopilot_table_ready = await _table_has_column(
        db, "autopilot_payments", "category_id"
    ) and await _table_has_column(db, "autopilot_payments", "status")
    if autopilot_table_ready:
        active_autopilot_count = (
            await db.execute(
                select(func.count(AutopilotPayment.id)).filter(
                    AutopilotPayment.user_id == current_user.id,
                    AutopilotPayment.category_id == category_id,
                    AutopilotPayment.status.in_(
                        ["approval_required", "approved", "processing"]
                    ),
                )
            )
        ).scalar_one()
        if active_autopilot_count:
            blocking_reasons.append(
                f"Active autopilot payments: {active_autopilot_count}"
            )

    if blocking_reasons:
        reason_text = " | ".join(blocking_reasons)
        raise HTTPException(
            status_code=409,
            detail=(
                f'Cannot delete category "{category.name}" because it is still in active use. '
                f"{reason_text}"
            ),
        )

    try:
        await db.delete(category)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        linked_transaction_count = (
            await db.execute(
                select(func.count(Transaction.id)).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id == category_id,
                )
            )
        ).scalar_one()
        if linked_transaction_count:
            raise HTTPException(
                status_code=409,
                detail=(
                    f'Cannot delete category "{category.name}" because it is linked to '
                    f"{linked_transaction_count} historical transaction(s)."
                ),
            )
        raise HTTPException(
            status_code=409,
            detail=(
                f'Cannot delete category "{category.name}" because linked records still exist.'
            ),
        )

    return category
