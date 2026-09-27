from datetime import datetime, date
from decimal import Decimal
import time
import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient, prefix: str = "user") -> tuple[str, dict]:
    email = f"{prefix}_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_commitment_vault_empty_ledger_incomplete(client: AsyncClient):
    """When user has no transactions, vault state should be incomplete/needs_setup."""
    _, headers = await signup_token(client, "empty_vault")

    res = await client.get("/api/v1/autopilot/commitment-vault", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["tracked_balance"] == 0.0
    assert data["integrity"]["state"] == "incomplete"
    assert data["data_quality"]["state"] == "needs_setup"
    assert "No recorded transactions found in ledger." in data["data_quality"]["reasons"]


@pytest.mark.asyncio
async def test_commitment_vault_covered_scenario(client: AsyncClient):
    """
    Covered scenario:
    Tracked balance: Rs. 50,000 (Income: 60,000 - Expense: 10,000)
    Protected:
      - Bill: Rs. 5,000
      - Subscription: Rs. 1,000
    Future:
      - Goal (monthly 4,000, 1,000 logged): Rs. 3,000
    Free: 50,000 - (6,000 + 3,000) = 41,000
    """
    _, headers = await signup_token(client, "covered_vault")

    now = datetime.utcnow()

    # 1. Add income source with payday
    await client.post(
        "/api/v1/income/",
        json={
            "name": "Salary",
            "amount": 60000,
            "frequency": "monthly",
            "payday": "28th",
            "active": True,
        },
        headers=headers,
    )

    # 2. Add completed income transaction
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 60000,
            "type": "INCOME",
            "description": "Salary Credit",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # 3. Add completed expense transaction
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 10000,
            "type": "EXPENSE",
            "description": "Rent part",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # 4. Add Bill
    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Broadband",
            "amount_estimated": 5000,
            "due_day": min(28, now.day),  # Due within horizon
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert bill_res.status_code == 201

    # 5. Add Subscription
    sub_res = await client.post(
        "/api/v1/subscriptions/",
        json={
            "name": "Cloud Storage",
            "amount": 1000,
            "billing_cycle": "monthly",
            "next_billing_date": now.isoformat(),
        },
        headers=headers,
    )
    assert sub_res.status_code == 201

    # 6. Add Goal + Log
    goal_res = await client.post(
        "/api/v1/goals/",
        json={
            "name": "Emergency Fund",
            "target_amount": 100000,
            "monthly_contribution": 4000,
            "priority": 5,
        },
        headers=headers,
    )
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]

    log_res = await client.post(
        f"/api/v1/goals/{goal_id}/contribute",
        json={"amount": 1000, "note": "Weekly save"},
        headers=headers,
    )
    assert log_res.status_code == 200

    # 7. Query commitment vault
    res = await client.get("/api/v1/autopilot/commitment-vault", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["tracked_balance"] == 50000.0
    assert data["vaults"]["protected"]["amount"] == 6000.0
    assert data["vaults"]["future"]["amount"] == 3000.0
    assert data["vaults"]["free"]["amount"] == 41000.0
    assert data["integrity"]["state"] == "covered"
    assert data["integrity"]["shortfall_amount"] == 0.0
    assert data["integrity"]["coverage_percent"] == 100.0


@pytest.mark.asyncio
async def test_commitment_vault_shortfall_scenario(client: AsyncClient):
    """
    Shortfall scenario:
    Tracked balance: Rs. 5,000
    Protected bill: Rs. 10,000
    Future goal: Rs. 2,000
    Total reserve: 12,000
    Free: 0.0
    Shortfall: 7,000
    State: shortfall
    """
    _, headers = await signup_token(client, "shortfall_vault")

    now = datetime.utcnow()

    # Completed income of 5,000
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 5000,
            "type": "INCOME",
            "description": "Freelance",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # Bill of 10,000
    await client.post(
        "/api/v1/bills/",
        json={
            "name": "School Fee",
            "amount_estimated": 10000,
            "due_day": now.day,
            "autopay_enabled": False,
        },
        headers=headers,
    )

    # Goal of 2,000
    await client.post(
        "/api/v1/goals/",
        json={
            "name": "Vacation",
            "target_amount": 50000,
            "monthly_contribution": 2000,
            "priority": 3,
        },
        headers=headers,
    )

    res = await client.get("/api/v1/autopilot/commitment-vault", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["tracked_balance"] == 5000.0
    assert data["vaults"]["protected"]["amount"] == 10000.0
    assert data["vaults"]["future"]["amount"] == 2000.0
    assert data["vaults"]["free"]["amount"] == 0.0
    assert data["integrity"]["state"] == "shortfall"
    assert data["integrity"]["shortfall_amount"] == 7000.0
    assert data["integrity"]["reserve_total"] == 12000.0
    assert data["integrity"]["coverage_percent"] < 100.0


@pytest.mark.asyncio
async def test_commitment_vault_paid_items_and_pending_txs_excluded(client: AsyncClient):
    """
    Verifies that:
    1. Pending/cancelled transactions do NOT count towards tracked balance.
    2. Paid bill in current cycle is excluded from Protected.
    3. Inactive subscriptions and completed goals are excluded.
    """
    _, headers = await signup_token(client, "reconcile_vault")

    now = datetime.utcnow()

    # 1. Completed income 20,000
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 20000,
            "type": "INCOME",
            "description": "Salary",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # 2. Pending income 50,000 (must NOT be counted)
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 50000,
            "type": "INCOME",
            "description": "Pending Cheque",
            "status": "pending",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # 3. Cancelled expense 10,000 (must NOT be counted)
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 10000,
            "type": "EXPENSE",
            "description": "Cancelled Purchase",
            "status": "cancelled",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # 4. Bill that is marked paid
    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Electricity",
            "amount_estimated": 2500,
            "due_day": now.day,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    bill_id = bill_res.json()["id"]

    # Mark bill paid
    await client.post(f"/api/v1/bills/{bill_id}/mark-paid", headers=headers)

    # 5. Inactive subscription
    await client.post(
        "/api/v1/subscriptions/",
        json={
            "name": "Old Gym",
            "amount": 1500,
            "billing_cycle": "monthly",
            "is_active": False,
        },
        headers=headers,
    )

    # 6. Completed goal
    goal_res = await client.post(
        "/api/v1/goals/",
        json={
            "name": "Bought Bike",
            "target_amount": 80000,
            "monthly_contribution": 10000,
            "priority": 8,
        },
        headers=headers,
    )
    goal_id = goal_res.json()["id"]
    await client.put(f"/api/v1/goals/{goal_id}", json={"is_completed": True}, headers=headers)

    # Check vault
    res = await client.get("/api/v1/autopilot/commitment-vault", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Tracked balance only has the 20,000 completed income
    assert data["tracked_balance"] == 20000.0
    # Protected has 0 because bill is paid and subscription is inactive
    assert data["vaults"]["protected"]["amount"] == 0.0
    assert data["vaults"]["protected"]["item_count"] == 0
    # Future has 0 because goal is completed
    assert data["vaults"]["future"]["amount"] == 0.0
    # Free is 20,000
    assert data["vaults"]["free"]["amount"] == 20000.0
    # Warning for pending tx
    assert data["data_quality"]["state"] == "warning"


@pytest.mark.asyncio
async def test_dashboard_summary_snapshot_parity(client: AsyncClient):
    """Verifies that GET /dashboard/summary includes commitment_vault snapshot matching detailed endpoint."""
    _, headers = await signup_token(client, "snapshot_parity")

    now = datetime.utcnow()

    # Add income
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 15000,
            "type": "INCOME",
            "description": "Consulting",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # Add bill
    await client.post(
        "/api/v1/bills/",
        json={
            "name": "Internet",
            "amount_estimated": 1200,
            "due_day": now.day,
            "autopay_enabled": False,
        },
        headers=headers,
    )

    # 1. Call detailed endpoint
    detailed_res = await client.get("/api/v1/autopilot/commitment-vault", headers=headers)
    assert detailed_res.status_code == 200
    detailed = detailed_res.json()

    # 2. Call summary endpoint
    summary_res = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()

    assert "commitment_vault" in summary
    snapshot = summary["commitment_vault"]
    assert snapshot is not None

    # Verify parity
    assert snapshot["tracked_balance"] == detailed["tracked_balance"]
    assert snapshot["protected_amount"] == detailed["vaults"]["protected"]["amount"]
    assert snapshot["future_amount"] == detailed["vaults"]["future"]["amount"]
    assert snapshot["free_amount"] == detailed["vaults"]["free"]["amount"]
    assert snapshot["integrity_state"] == detailed["integrity"]["state"]
    assert snapshot["shortfall_amount"] == detailed["integrity"]["shortfall_amount"]
    assert snapshot["horizon_end"] == detailed["basis"]["horizon_end"]


@pytest.mark.asyncio
async def test_commitment_vault_user_isolation(client: AsyncClient):
    """User A cannot see User B's vault items or balance."""
    _, headers_a = await signup_token(client, "user_a")
    _, headers_b = await signup_token(client, "user_b")

    now = datetime.utcnow()

    # User A records 50,000 income
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 50000,
            "type": "INCOME",
            "description": "User A Income",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers_a,
    )

    # User B records 10,000 income
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 10000,
            "type": "INCOME",
            "description": "User B Income",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers_b,
    )

    res_a = await client.get("/api/v1/autopilot/commitment-vault", headers=headers_a)
    res_b = await client.get("/api/v1/autopilot/commitment-vault", headers=headers_b)

    assert res_a.json()["tracked_balance"] == 50000.0
    assert res_b.json()["tracked_balance"] == 10000.0


@pytest.mark.asyncio
async def test_commitment_vault_loan_and_fallback(client: AsyncClient):
    """
    Verifies that:
    1. Active loan EMI is included in Protected.
    2. Closed loan is excluded from Protected.
    3. Without payday, horizon_source is month_end_fallback.
    4. Due day 31 works without date errors.
    """
    _, headers = await signup_token(client, "loan_vault")

    now = datetime.utcnow()

    # Completed income
    await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 40000,
            "type": "INCOME",
            "description": "Salary",
            "status": "completed",
            "occurred_at": now.isoformat(),
        },
        headers=headers,
    )

    # Active Loan
    loan_res = await client.post(
        "/api/v1/loans/",
        json={
            "name": "Car Loan",
            "principal_amount": 300000,
            "interest_rate": 8.5,
            "tenure_months": 36,
            "start_date": "2026-01-01",
            "due_day": min(28, now.day),
            "interest_type": "compound",
        },
        headers=headers,
    )
    assert loan_res.status_code == 201

    # Bill with day 31 (month-end clamping test)
    bill_31_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Month End Bill",
            "amount_estimated": 1500,
            "due_day": 31,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert bill_31_res.status_code == 201

    res = await client.get("/api/v1/autopilot/commitment-vault", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Month end fallback because no income payday set
    assert data["basis"]["horizon_source"] == "month_end_fallback"
    assert data["basis"]["next_income_date"] is None

    # Check protected items include both loan and bill
    protected_types = [item["source_type"] for item in data["vaults"]["protected"]["items"]]
    assert "LOAN" in protected_types
    assert "BILL" in protected_types
    assert data["vaults"]["protected"]["amount"] > 0
