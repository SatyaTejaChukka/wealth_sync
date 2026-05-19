import time

import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient) -> str:
    email = f"categories_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_category_rejects_duplicate_name_case_insensitive(
    client: AsyncClient,
):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    first_create = await client.post(
        "/api/v1/categories/",
        json={"name": "Dining", "color": "#ef4444"},
        headers=headers,
    )
    assert first_create.status_code == 201

    duplicate_create = await client.post(
        "/api/v1/categories/",
        json={"name": "  dining  ", "color": "#f97316"},
        headers=headers,
    )
    assert duplicate_create.status_code == 409
    assert "already exists" in duplicate_create.json()["detail"]


@pytest.mark.asyncio
async def test_delete_category_blocked_when_linked_items_exist(
    client: AsyncClient,
):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    category_create = await client.post(
        "/api/v1/categories/",
        json={"name": "Essentials", "color": "#22c55e"},
        headers=headers,
    )
    assert category_create.status_code == 201
    category = category_create.json()

    create_rule = await client.post(
        "/api/v1/budgets/rules",
        json={
            "category_id": category["id"],
            "allocation_type": "FIXED",
            "allocation_value": 500,
            "monthly_limit": 800,
        },
        headers=headers,
    )
    assert create_rule.status_code == 201

    create_bill = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Internet",
            "amount_estimated": 1200,
            "due_day": 8,
            "category_id": category["id"],
        },
        headers=headers,
    )
    assert create_bill.status_code == 201

    create_subscription = await client.post(
        "/api/v1/subscriptions/",
        json={
            "name": "Music Premium",
            "amount": 99,
            "billing_cycle": "monthly",
            "category_id": category["id"],
        },
        headers=headers,
    )
    assert create_subscription.status_code == 201

    create_pending_transaction = await client.post(
        "/api/v1/transactions/",
        json={
            "category_id": category["id"],
            "amount": 450,
            "type": "EXPENSE",
            "description": "Pending fuel payment",
            "status": "pending",
        },
        headers=headers,
    )
    assert create_pending_transaction.status_code == 201

    delete_res = await client.delete(
        f"/api/v1/categories/{category['id']}",
        headers=headers,
    )
    assert delete_res.status_code == 409
    detail = delete_res.json()["detail"]
    assert 'Cannot delete category "Essentials"' in detail
    assert "Bills:" in detail
    assert "Subscriptions:" in detail
    assert "Pending transactions:" in detail
    assert "Budget rules:" in detail

    categories_res = await client.get("/api/v1/categories/", headers=headers)
    assert categories_res.status_code == 200
    remaining_ids = {item["id"] for item in categories_res.json()}
    assert category["id"] in remaining_ids


@pytest.mark.asyncio
async def test_delete_category_succeeds_only_when_not_linked(
    client: AsyncClient,
):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    category_create = await client.post(
        "/api/v1/categories/",
        json={"name": "Temporary", "color": "#64748b"},
        headers=headers,
    )
    assert category_create.status_code == 201
    category = category_create.json()

    delete_res = await client.delete(
        f"/api/v1/categories/{category['id']}",
        headers=headers,
    )
    assert delete_res.status_code == 200

    categories_res = await client.get("/api/v1/categories/", headers=headers)
    assert categories_res.status_code == 200
    remaining_ids = {item["id"] for item in categories_res.json()}
    assert category["id"] not in remaining_ids
