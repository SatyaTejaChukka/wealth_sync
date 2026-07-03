from typing import Any, List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from uuid import uuid4
from datetime import datetime, date

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.loan import Loan
from app.models.transaction import Transaction
from app.schemas.loan import (
    LoanCreate,
    LoanUpdate,
    LoanResponse,
    LoanCalculateRequest,
    LoanCalculateResponse,
    LoanDetailsResponse,
    AmortizationPeriod
)
from app.schemas.transaction import TransactionResponse
from app.services.loan_service import LoanService

router = APIRouter()


@router.post("/calculate", response_model=LoanCalculateResponse)
def calculate_loan_emi(request: LoanCalculateRequest) -> Any:
    """
    Calculate EMI and generate amortization schedule.
    """
    emi = request.emi_amount
    if emi is None:
        emi = LoanService.calculate_emi(
            request.principal_amount,
            request.interest_rate,
            request.tenure_months,
            request.interest_type
        )

    schedule = LoanService.generate_amortization_schedule(
        request.principal_amount,
        request.interest_rate,
        request.tenure_months,
        emi,
        request.interest_type
    )

    total_amount = sum(p["emi_amount"] for p in schedule)
    total_interest = total_amount - request.principal_amount

    return {
        "emi_amount": emi,
        "total_interest": total_interest,
        "total_amount": total_amount,
        "amortization_schedule": [AmortizationPeriod(**p) for p in schedule]
    }


@router.get("/", response_model=List[LoanResponse])
async def list_loans(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Optional[str] = Query(default=None, pattern="^(active|closed)$")
) -> Any:
    """
    Retrieve all user loans.
    """
    query = select(Loan).options(selectinload(Loan.category)).filter(Loan.user_id == current_user.id)
    if status:
        query = query.filter(Loan.status == status)

    query = query.order_by(Loan.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def create_loan(
    loan_in: LoanCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create a new loan profile.
    """
    loan_data = loan_in.model_dump()
    
    # Calculate EMI if not provided
    if loan_data.get("emi_amount") is None:
        loan_data["emi_amount"] = LoanService.calculate_emi(
            loan_data["principal_amount"],
            loan_data["interest_rate"],
            loan_data["tenure_months"],
            loan_data.get("interest_type", "compound")
        )

    loan = Loan(
        id=str(uuid4()),
        user_id=current_user.id,
        **loan_data
    )

    db.add(loan)
    await db.commit()
    await db.refresh(loan, ["category"])
    return loan


@router.get("/{loan_id}", response_model=LoanDetailsResponse)
async def get_loan(
    loan_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Retrieve details, payment status, and amortization schedule for a specific loan.
    """
    result = await db.execute(
        select(Loan).options(selectinload(Loan.category)).filter(
            Loan.id == loan_id,
            Loan.user_id == current_user.id
        )
    )
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")

    # Count completed payment transactions
    payments_count_res = await db.execute(
        select(func.count(Transaction.id)).filter(
            Transaction.loan_id == loan.id,
            Transaction.status == "completed"
        )
    )
    payments_count = payments_count_res.scalar() or 0

    # Calculate status details
    status_details = LoanService.get_loan_status(loan, payments_count)

    # Next due date calculation
    from app.tasks.bill_automation import calculate_next_due_date
    next_due = calculate_next_due_date(loan.due_day, loan.last_paid_at)

    return {
        "loan": loan,
        "outstanding_principal": status_details["outstanding_principal"],
        "total_principal_paid": status_details["total_principal_paid"],
        "total_interest_paid": status_details["total_interest_paid"],
        "remaining_tenure_months": status_details["remaining_tenure_months"],
        "next_due_date": next_due,
        "amortization_schedule": [AmortizationPeriod(**p) for p in status_details["amortization_schedule"]]
    }


@router.put("/{loan_id}", response_model=LoanResponse)
async def update_loan(
    loan_id: str,
    loan_in: LoanUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Update loan parameters.
    """
    result = await db.execute(
        select(Loan).options(selectinload(Loan.category)).filter(
            Loan.id == loan_id,
            Loan.user_id == current_user.id
        )
    )
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")

    update_data = loan_in.model_dump(exclude_unset=True)

    # Re-calculate EMI if parameters changed
    recalc_needed = any(k in update_data for k in ["principal_amount", "interest_rate", "tenure_months"])
    
    for field, value in update_data.items():
        setattr(loan, field, value)

    if recalc_needed and "emi_amount" not in update_data:
        loan.emi_amount = LoanService.calculate_emi(
            loan.principal_amount,
            loan.interest_rate,
            loan.tenure_months
        )

    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


@router.delete("/{loan_id}", response_model=LoanResponse)
async def delete_loan(
    loan_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Remove a loan profile.
    """
    result = await db.execute(
        select(Loan).filter(
            Loan.id == loan_id,
            Loan.user_id == current_user.id
        )
    )
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")

    await db.delete(loan)
    await db.commit()
    return loan


@router.post("/{loan_id}/pay", response_model=TransactionResponse)
async def pay_loan_emi(
    loan_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Directly record a completed EMI payment transaction for the loan.
    """
    result = await db.execute(
        select(Loan).filter(
            Loan.id == loan_id,
            Loan.user_id == current_user.id
        )
    )
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan profile not found")

    if loan.status == "closed":
        raise HTTPException(status_code=400, detail="Loan is already fully repaid (closed)")

    # Count completed payment transactions BEFORE adding this one to the session
    payments_count_res = await db.execute(
        select(func.count(Transaction.id)).filter(
            Transaction.loan_id == loan.id,
            Transaction.status == "completed"
        )
    )
    payments_count = (payments_count_res.scalar() or 0) + 1

    # Create completed transaction
    transaction = Transaction(
        id=str(uuid4()),
        user_id=current_user.id,
        category_id=loan.category_id,
        amount=loan.emi_amount,
        type="EXPENSE",
        description=f"EMI Payment: {loan.name}",
        occurred_at=datetime.utcnow(),
        status="completed",
        loan_id=loan.id
    )
    db.add(transaction)

    # Update loan
    loan.last_paid_at = datetime.utcnow()
    
    if payments_count >= loan.tenure_months:
        loan.status = "closed"

    db.add(loan)
    await db.commit()
    await db.refresh(transaction, ["category"])
    return transaction
