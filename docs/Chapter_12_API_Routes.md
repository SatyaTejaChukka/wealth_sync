# Chapter 12: API Routes - Complete Coverage

> **API Layer**: Every endpoint explained with CRUD patterns, dependencies, and database queries.

---

## Route Structure

```
backend/app/api/v1/
├── auth.py           # 3 endpoints (signup, login, me)
├── users.py          # 2 endpoints (update profile, change password)
├── transactions.py   # 5 endpoints ⭐
├── bills.py          # 6 endpoints
├──budgets.py        # 5 endpoints
├── categories.py     # 5 endpoints
├── subscriptions.py  # 6 endpoints
├── savings.py        # 7 endpoints
├── income.py         # 5 endpoints
├── dashboard.py      # 3 endpoints
├── notifications.py  # 4 endpoints
├── health.py         # 3 endpoints
└── autopilot.py      # 4 endpoints
```

**Total**: 13 modules, **58+ endpoints**

---

## Common Patterns

### 1. Router Creation

```python
from fastapi import APIRouter

router = APIRouter()
# ↑ Each file exports a router
# ↑ main.py imports and mounts with prefix
```

### 2. Dependencies

```python
from typing import Annotated
from fastapi import Depends
from app.api import deps
from app.core.database import get_db

@router.get("/")
async def list_items(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
# ↑ Annotated[Type, Depends(func)]: Dependency injection
# ↑ current_user: Authenticated user (raises 401 if no token)
# ↑ db: Database session (auto-closed after request)
```

### 3. CRUD Pattern

Every resource follows this pattern:

| Method | Endpoint | Purpose                  |
| ------ | -------- | ------------------------ |
| POST   | `/`      | Create (201 Created)     |
| GET    | `/`      | List (200 OK, paginated) |
| GET    | `/{id}`  | Read single (200 OK)     |
| PUT    | `/{id}`  | Update (200 OK)          |
| DELETE | `/{id}`  | Delete (200 OK)          |

---

## File 1: api/v1/transactions.py - Line by Line

### Lines 1-16: Imports & Router

```python
# Line 1-7: Core imports
from typing import Any, List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload  # ⭐ Eager loading
from uuid import uuid4
from datetime import datetime

# Line 9-14: App imports
from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.bill import Bill
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

# Line 16: Router
router = APIRouter()
```

---

### Lines 18-43: POST /transactions - Create Transaction

```python
# Line 18-22: Route decorator
@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_in: TransactionCreate,  # Request body (validated by Pydantic)
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """Create a new transaction."""

    # Line 27-29: Extract data & handle timezone
    transaction_data = transaction_in.model_dump()
    # ↑ Pydantic v2 method (was .dict() in v1)

    if transaction_data.get('occurred_at'):
        transaction_data['occurred_at'] = transaction_data['occurred_at'].replace(tzinfo=None)
    # ↑ Make datetime naive (PostgreSQL stores as UTC without tz info)

    # Line 31-35: Create model instance
    transaction = Transaction(
        id=str(uuid4()),            # Generate UUID
        user_id=current_user.id,     # Link to authenticated user
        **transaction_data           # Spread remaining fields
    )

    # Line 36-38: Default occurred_at to now
    if not transaction.occurred_at:
        transaction.occurred_at = datetime.utcnow()

    # Line 40-42: Save to database
    db.add(transaction)             # Add to session
    await db.commit()               # Execute INSERT
    await db.refresh(transaction, ['category'])
    # ↑ Reload from DB to get relationships
    # ↑ ['category']: Only refresh this relationship (optimization)

    return transaction
```

**Cascading Effects**:

1. Budget recalculation (not shown here, would be in service layer)
2. Health score update (async via Celery)
3. Dashboard stats refresh

---

### Lines 45-73: GET /transactions - List with Filtering

```python
# Line 45-54: Route with query params
@router.get("/", response_model=List[TransactionResponse])
async def read_transactions(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,                   # Pagination offset
    limit: int = 100,                # Max results (default 100)
    type: Optional[str] = None,      # Filter by INCOME/EXPENSE
    status: Optional[str] = None,    # Filter by status
    search: Optional[str] = None     # Search description
) -> Any:
    """Retrieve transactions with optional filtering."""

    # Line 58: Base query with eager loading
    query = select(Transaction).options(selectinload(Transaction.category)).filter(Transaction.user_id == current_user.id)
    # ↑ selectinload: Prevent N+1 queries (loads categories in one query)
    # ↑ filter by user_id: Authorization (users can only see their own)

    # Line 60-67: Apply filters
    if type:
        query = query.filter(Transaction.type == type)

    if status:
        query = query.filter(Transaction.status == status)

    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    # ↑ ilike: Case-insensitive LIKE (SQL: ILIKE '%search%')

    # Line 69: Pagination & sorting
    query = query.offset(skip).limit(limit).order_by(Transaction.occurred_at.desc())
    # ↑ offset/limit: Pagination
    # ↑ order_by desc: Newest first

    # Line 71-73: Execute query
    result = await db.execute(query)
    transactions = result.scalars().all()
    # ↑ scalars(): Extract objects (not rows)
    # ↑ all(): Return list

    return transactions
```

**Performance Optimization**: `selectinload` prevents N+1 queries

```sql
-- Without selectinload (N+1 problem):
SELECT * FROM transactions WHERE user_id = '...';  -- 1 query
SELECT * FROM categories WHERE id = '...';  -- N queries (one per transaction!)

-- With selectinload (2 queries total):
SELECT * FROM transactions WHERE user_id = '...';
SELECT * FROM categories WHERE id IN (...);  -- Single query for all categories
```

---

### Lines 75-102: PUT /transactions/{id} - Update

```python
# Line 75-80: Route & params
@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,             # Path parameter
    transaction_in: TransactionUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """Update a transaction."""

    # Line 85-88: Fetch transaction
    result = await db.execute(
        select(Transaction).options(selectinload(Transaction.category)).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id  # ⭐ Authorization check
        )
    )
    transaction = result.scalars().first()

    # Line 89-90: Not found check
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # ↑ Either doesn't exist OR doesn't belong to user (both = 404)

    # Line 92-94: Extract update data
    update_data = transaction_in.model_dump(exclude_unset=True)
    # ↑ exclude_unset: Only fields provided in request
    # ↑ Allows partial updates (PATCH-like behavior in PUT)

    if update_data.get('occurred_at'):
        update_data['occurred_at'] = update_data['occurred_at'].replace(tzinfo=None)

    # Line 96-97: Apply updates
    for field, value in update_data.items():
        setattr(transaction, field, value)
    # ↑ setattr: Dynamically set attributes

    # Line 99-102: Save
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction
```

**Authorization Pattern**: Always filter by `user_id` to prevent unauthorized access

```python
# ❌ Bad: User could access any transaction by ID
select(Transaction).filter(Transaction.id == transaction_id)

# ✅ Good: User can only access their own
select(Transaction).filter(
    Transaction.id == transaction_id,
    Transaction.user_id == current_user.id
)
```

---

### Lines 104-122: DELETE /transactions/{id}

```python
@router.delete("/{transaction_id}", response_model=TransactionResponse)
async def delete_transaction(
    transaction_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """Delete a transaction."""

    # Fetch with authorization
    result = await db.execute(
        select(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalars().first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    await db.delete(transaction)  # Mark for deletion
    await db.commit()             # Execute DELETE
    return transaction            # Return deleted object
```

---

### Lines 124-174: POST /transactions/{id}/complete - Mark as Paid

```python
@router.post("/{transaction_id}/complete", response_model=TransactionResponse)
async def complete_transaction(
    transaction_id: str,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """Mark a pending transaction as completed (paid)."""

    # Fetch transaction
    result = await db.execute(
        select(Transaction).options(selectinload(Transaction.category)).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalars().first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Validate status
    if transaction.status != "pending":
        raise HTTPException(status_code=400, detail="Transaction is not pending")

    # Update status
    transaction.status = "completed"
    transaction.occurred_at = datetime.utcnow()  # Update to actual payment time
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Cascading side effect: Update linked bill/subscription
    if transaction.bill_id:
        bill_result = await db.execute(select(Bill).filter(Bill.id == transaction.bill_id))
        bill = bill_result.scalars().first()
        if bill:
            bill.last_paid_at = datetime.utcnow()  # ⭐ Mark bill as paid
            db.add(bill)
            await db.commit()

    elif transaction.subscription_id:
        from app.models.subscription import Subscription
        from dateutil.relativedelta import relativedelta

        sub_result = await db.execute(select(Subscription).filter(Subscription.id == transaction.subscription_id))
        sub = sub_result.scalars().first()
        if sub:
            # Update next billing date
            if sub.billing_cycle == "monthly":
                sub.next_billing_date = datetime.utcnow() + relativedelta(months=1)
            elif sub.billing_cycle == "yearly":
                sub.next_billing_date = datetime.utcnow() + relativedelta(years=1)
            db.add(sub)
            await db.commit()

    return transaction
```

**Cascading Effects**: Completing a transaction updates:

1. Transaction status: `pending` → `completed`
2. Bill: `last_paid_at` timestamp
3. Subscription: `next_billing_date` advances

---

## Other Route Files (Summary)

### api/v1/auth.py

```python
POST /signup       # Create user + return JWT
POST /login        # Verify credentials + return JWT
GET /me            # Return current user info
```

### api/v1/budgets.py

```python
GET /               # List budget rules
POST /              # Create budget rule
PUT /{id}           # Update rule
DELETE /{id}        # Delete rule
GET /overview       # Calculate monthly overview (calls BudgetEngine)
```

### api/v1/dashboard.py

```python
GET /summary        # Aggregate data: income, expenses, safe-to-spend
GET /triage         # Financial triage actions
GET /recent-activity # Last 10 transactions
```

---

## Key Patterns Across All Routes

### 1. Authorization via User Filter

```python
# Always filter by current_user.id
.filter(Model.user_id == current_user.id)
```

### 2. Eager Loading to Prevent N+1

```python
# Load relationships upfront
.options(selectinload(Transaction.category))
```

### 3. Pagination

```python
skip: int = 0
limit: int = 100
query.offset(skip).limit(limit)
```

### 4. Error Handling

```python
if not resource:
    raise HTTPException(status_code=404, detail="Not found")
```

### 5. Partial Updates

```python
update_data = schema.model_dump(exclude_unset=True)
# Only update fields provided in request
```

---

## Key Takeaways

1. **58+ endpoints** across 13 route modules
2. **Dependency injection**: `Depends(get_current_user)`, `Depends(get_db)`
3. **Authorization**: Always filter by `user_id`
4. **N+1 prevention**: `selectinload()` for relationships
5. **CRUD pattern**: POST/GET/PUT/DELETE consistency
6. **Cascading effects**: Completing transaction updates bills/subscriptions
7. **Timezone handling**: Strip tzinfo for PostgreSQL
8. **Pagination**: `offset()` + `limit()`

---

## Navigation

**Previous Chapter**: [← Chapter 11: Authentication](./Chapter_11_Authentication.md)

**Next Chapter**: [→ Chapter 13: API Flow & Communication](./Chapter_13_API_Flow_Communication.md)

**Back to Index**: [📚 Tutorial Home](./README.md)
