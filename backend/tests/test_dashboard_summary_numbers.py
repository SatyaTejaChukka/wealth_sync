from datetime import datetime, timedelta
import time

import pytest
from httpx import AsyncClient


def approx(value: float, expected: float, tolerance: float = 0.01) -> bool:
    return abs(value - expected) <= tolerance


async def signup_token(client: AsyncClient) -> str:
    email = f"dashboard_numbers_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


async def create_transaction(
    client: AsyncClient,
    headers: dict,
    *,
    amount: float,
    tx_type: str,
    occurred_at: datetime,
    status: str = "completed",
    description: str = "txn",
):
    response = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": amount,
            "type": tx_type,
            "description": description,
            "occurred_at": occurred_at.isoformat(),
            "status": status,
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_dashboard_summary_uses_only_completed_non_future_transactions(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.utcnow()

    await create_transaction(
        client,
        headers,
        amount=5000,
        tx_type="INCOME",
        occurred_at=now - timedelta(hours=1),
        description="Salary",
    )

    await create_transaction(
        client,
        headers,
        amount=1000,
        tx_type="EXPENSE",
        occurred_at=now - timedelta(minutes=20),
        description="Groceries",
    )

    await create_transaction(
        client,
        headers,
        amount=300,
        tx_type="EXPENSE",
        occurred_at=now - timedelta(minutes=15),
        status="pending",
        description="Pending card hold",
    )

    await create_transaction(
        client,
        headers,
        amount=200,
        tx_type="EXPENSE",
        occurred_at=now - timedelta(minutes=10),
        status="cancelled",
        description="Cancelled purchase",
    )

    await create_transaction(
        client,
        headers,
        amount=400,
        tx_type="EXPENSE",
        occurred_at=now + timedelta(hours=2),
        status="pending",
        description="Future scheduled expense",
    )

    summary_res = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary_res.status_code == 200
    payload = summary_res.json()

    assert payload["monthly_income"] == "5000.00"
    assert payload["monthly_expenses"] == "1000.00"
    assert payload["total_balance"] == "4000.00"

    safe = payload["safe_to_spend_stats"]
    assert approx(safe["total_income"], 5000)
    assert approx(safe["total_spent_month"], 1000)
    assert approx(safe["monthly_free_budget"], 5000)
    assert approx(safe["safe_to_spend"], 4000)

    recent = payload["recent_transactions"]
    assert len(recent) == 2
    amounts = sorted(item["amount"] for item in recent)
    assert amounts == ["-1000.00", "5000.00"]

    spending_total = sum(point["amount"] for point in payload["spending_chart"])
    assert approx(spending_total, 1000)
