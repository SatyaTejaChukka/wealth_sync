from datetime import datetime
import time

import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient) -> str:
    email = f"triage_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_dashboard_triage_returns_prioritized_actions(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    category_res = await client.post(
        "/api/v1/categories/",
        json={"name": "Groceries", "color": "#22c55e"},
        headers=headers,
    )
    assert category_res.status_code == 201
    category_id = category_res.json()["id"]

    budget_rule_res = await client.post(
        "/api/v1/budgets/rules",
        json={
            "category_id": category_id,
            "allocation_type": "FIXED",
            "allocation_value": 80,
            "monthly_limit": 80,
        },
        headers=headers,
    )
    assert budget_rule_res.status_code == 201

    occurred_at = datetime.utcnow().isoformat()

    income_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 1000,
            "type": "INCOME",
            "description": "Salary",
            "occurred_at": occurred_at,
        },
        headers=headers,
    )
    assert income_res.status_code == 201

    expense_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 140,
            "type": "EXPENSE",
            "description": "Weekly groceries",
            "category_id": category_id,
            "occurred_at": occurred_at,
        },
        headers=headers,
    )
    assert expense_res.status_code == 201

    uncategorized_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 45,
            "type": "EXPENSE",
            "description": "Cash spend",
            "occurred_at": occurred_at,
        },
        headers=headers,
    )
    assert uncategorized_res.status_code == 201

    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Rent",
            "amount_estimated": 200,
            "due_day": 1,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert bill_res.status_code == 201

    loan_res = await client.post(
        "/api/v1/loans/",
        json={
            "name": "Car Loan",
            "principal_amount": 10000,
            "interest_rate": 8.5,
            "tenure_months": 24,
            "start_date": "2025-01-01",
            "due_day": 1,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert loan_res.status_code == 201

    triage_res = await client.get("/api/v1/dashboard/triage", headers=headers)
    assert triage_res.status_code == 200
    triage = triage_res.json()

    assert isinstance(triage["stress_score"], int)
    assert triage["stress_level"] in {"low", "moderate", "high", "critical"}
    assert triage["monthly_income"] == "1000.00"
    assert triage["monthly_expenses"] == "185.00"
    assert len(triage["actions"]) > 0

    action_areas = {action["area"] for action in triage["actions"]}
    assert "bills" in action_areas
    assert "budget" in action_areas
    assert "transactions" in action_areas
    assert "loans" in action_areas

