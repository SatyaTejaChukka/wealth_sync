from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.electricity_account import ElectricityAccount, ElectricityBill
from app.schemas.electricity import (
    ElectricityAccountCreate,
    ElectricityAccountResponse,
    ElectricityAccountUpdate,
    ElectricityBillResponse,
    ElectricityFetchPreview,
    ElectricityPayRequest,
    ElectricityProviderInfo,
)
from app.services.electricity_service import ElectricityService

router = APIRouter()


@router.get("/providers", response_model=List[ElectricityProviderInfo])
async def get_providers(
    current_user: User = Depends(deps.get_current_user),
):
    """
    List all supported electricity providers (APSPDCL, BESCOM, etc.).
    """
    return ElectricityService.get_supported_providers()


@router.post("/preview", response_model=ElectricityFetchPreview)
async def preview_bill_fetch(
    provider_code: str,
    consumer_number: str,
    mobile: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Fetch a live preview of the bill for a consumer number without saving it.
    """
    provider = ElectricityService.get_provider(provider_code)
    bill_data = await provider.fetch_bill(consumer_number=consumer_number, mobile=mobile)
    if not bill_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not retrieve bill for the given consumer number.",
        )
    return ElectricityFetchPreview(
        provider_code=provider_code.upper(),
        consumer_number=consumer_number,
        consumer_name=bill_data.get("consumer_name", "Consumer"),
        bill_number=bill_data["bill_number"],
        bill_date=bill_data["bill_date"],
        due_date=bill_data["due_date"],
        amount=bill_data["amount"],
        units_consumed=bill_data.get("units_consumed"),
    )


@router.get("/accounts", response_model=List[ElectricityAccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    List all linked electricity accounts for the current user with bill history.
    """
    res = await db.execute(
        select(ElectricityAccount)
        .filter(ElectricityAccount.user_id == current_user.id)
        .options(selectinload(ElectricityAccount.bills))
        .order_by(ElectricityAccount.created_at.desc())
    )
    accounts = res.scalars().all()

    response_list = []
    for acc in accounts:
        latest = acc.bills[0] if acc.bills else None
        response_list.append(
            ElectricityAccountResponse(
                id=acc.id,
                user_id=acc.user_id,
                provider_code=acc.provider_code,
                consumer_number=acc.consumer_number,
                consumer_name=acc.consumer_name,
                registered_mobile=acc.registered_mobile,
                nickname=acc.nickname,
                category_id=acc.category_id,
                is_active=acc.is_active,
                autopay_enabled=acc.autopay_enabled,
                last_checked_at=acc.last_checked_at,
                created_at=acc.created_at,
                bills=[ElectricityBillResponse.model_validate(b) for b in acc.bills],
                latest_bill=ElectricityBillResponse.model_validate(latest) if latest else None,
            )
        )
    return response_list


@router.post("/accounts", response_model=ElectricityAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_in: ElectricityAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Link a new electricity account and trigger an instant bill fetch.
    """
    # Check if duplicate
    existing = await db.execute(
        select(ElectricityAccount).filter(
            ElectricityAccount.user_id == current_user.id,
            ElectricityAccount.provider_code == account_in.provider_code.upper(),
            ElectricityAccount.consumer_number == account_in.consumer_number.strip(),
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This electricity connection is already linked to your account.",
        )

    account = ElectricityAccount(
        user_id=current_user.id,
        provider_code=account_in.provider_code.upper(),
        consumer_number=account_in.consumer_number.strip(),
        registered_mobile=account_in.registered_mobile.strip() if account_in.registered_mobile else None,
        nickname=account_in.nickname.strip() if account_in.nickname else None,
        category_id=account_in.category_id,
        autopay_enabled=account_in.autopay_enabled,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)

    # Perform initial sync
    await ElectricityService.fetch_and_sync_latest_bill(db, account, send_notifications=True)

    # Re-fetch with bills loaded
    res = await db.execute(
        select(ElectricityAccount)
        .filter(ElectricityAccount.id == account.id)
        .options(selectinload(ElectricityAccount.bills))
    )
    account = res.scalars().first()
    latest = account.bills[0] if account.bills else None

    return ElectricityAccountResponse(
        id=account.id,
        user_id=account.user_id,
        provider_code=account.provider_code,
        consumer_number=account.consumer_number,
        consumer_name=account.consumer_name,
        registered_mobile=account.registered_mobile,
        nickname=account.nickname,
        category_id=account.category_id,
        is_active=account.is_active,
        autopay_enabled=account.autopay_enabled,
        last_checked_at=account.last_checked_at,
        created_at=account.created_at,
        bills=[ElectricityBillResponse.model_validate(b) for b in account.bills],
        latest_bill=ElectricityBillResponse.model_validate(latest) if latest else None,
    )


@router.get("/accounts/{account_id}", response_model=ElectricityAccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get a single electricity account by ID.
    """
    res = await db.execute(
        select(ElectricityAccount)
        .filter(
            ElectricityAccount.id == account_id,
            ElectricityAccount.user_id == current_user.id,
        )
        .options(selectinload(ElectricityAccount.bills))
    )
    account = res.scalars().first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    latest = account.bills[0] if account.bills else None
    return ElectricityAccountResponse(
        id=account.id,
        user_id=account.user_id,
        provider_code=account.provider_code,
        consumer_number=account.consumer_number,
        consumer_name=account.consumer_name,
        registered_mobile=account.registered_mobile,
        nickname=account.nickname,
        category_id=account.category_id,
        is_active=account.is_active,
        autopay_enabled=account.autopay_enabled,
        last_checked_at=account.last_checked_at,
        created_at=account.created_at,
        bills=[ElectricityBillResponse.model_validate(b) for b in account.bills],
        latest_bill=ElectricityBillResponse.model_validate(latest) if latest else None,
    )


@router.put("/accounts/{account_id}", response_model=ElectricityAccountResponse)
async def update_account(
    account_id: str,
    account_update: ElectricityAccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update nickname, autopay, or status of an electricity connection.
    """
    res = await db.execute(
        select(ElectricityAccount)
        .filter(
            ElectricityAccount.id == account_id,
            ElectricityAccount.user_id == current_user.id,
        )
        .options(selectinload(ElectricityAccount.bills))
    )
    account = res.scalars().first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    if account_update.nickname is not None:
        account.nickname = account_update.nickname
    if account_update.category_id is not None:
        account.category_id = account_update.category_id
    if account_update.autopay_enabled is not None:
        account.autopay_enabled = account_update.autopay_enabled
    if account_update.is_active is not None:
        account.is_active = account_update.is_active

    await db.commit()
    await db.refresh(account)

    latest = account.bills[0] if account.bills else None
    return ElectricityAccountResponse(
        id=account.id,
        user_id=account.user_id,
        provider_code=account.provider_code,
        consumer_number=account.consumer_number,
        consumer_name=account.consumer_name,
        registered_mobile=account.registered_mobile,
        nickname=account.nickname,
        category_id=account.category_id,
        is_active=account.is_active,
        autopay_enabled=account.autopay_enabled,
        last_checked_at=account.last_checked_at,
        created_at=account.created_at,
        bills=[ElectricityBillResponse.model_validate(b) for b in account.bills],
        latest_bill=ElectricityBillResponse.model_validate(latest) if latest else None,
    )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete / unlink an electricity account and its bill records.
    """
    res = await db.execute(
        select(ElectricityAccount).filter(
            ElectricityAccount.id == account_id,
            ElectricityAccount.user_id == current_user.id,
        )
    )
    account = res.scalars().first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    await db.delete(account)
    await db.commit()
    return None


@router.post("/accounts/{account_id}/fetch", response_model=ElectricityBillResponse)
async def fetch_account_bill(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Force an on-demand bill fetch / refresh from the provider.
    """
    res = await db.execute(
        select(ElectricityAccount).filter(
            ElectricityAccount.id == account_id,
            ElectricityAccount.user_id == current_user.id,
        )
    )
    account = res.scalars().first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    bill, _ = await ElectricityService.fetch_and_sync_latest_bill(db, account, send_notifications=True)
    if not bill:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Provider did not return a bill.")

    return ElectricityBillResponse.model_validate(bill)


@router.post("/bills/{bill_id}/pay", response_model=ElectricityBillResponse)
async def pay_electricity_bill(
    bill_id: str,
    pay_in: ElectricityPayRequest = ElectricityPayRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Record payment for an electricity bill and automatically log an expense transaction.
    """
    try:
        bill = await ElectricityService.pay_bill(
            db=db,
            bill_id=bill_id,
            user_id=current_user.id,
            amount=pay_in.amount,
        )
        return ElectricityBillResponse.model_validate(bill)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
