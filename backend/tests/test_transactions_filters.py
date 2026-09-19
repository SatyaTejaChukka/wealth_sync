from datetime import datetime
import time

import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient) -> str:
    email = f"tx_filter_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_transaction_status_filter(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 45,
            "type": "EXPENSE",
            "description": "Coffee",
            "occurred_at": datetime.utcnow().isoformat(),
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    assert create_response.json()["status"] == "completed"

    completed_res = await client.get(
        "/api/v1/transactions/",
        params={"status": "completed"},
        headers=headers,
    )
    assert completed_res.status_code == 200
    assert len(completed_res.json()) == 1
    assert completed_res.json()[0]["status"] == "completed"

    pending_res = await client.get(
        "/api/v1/transactions/",
        params={"status": "pending"},
        headers=headers,
    )
    assert pending_res.status_code == 200
    assert pending_res.json() == []


@pytest.mark.asyncio
async def test_delete_transaction(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 100,
            "type": "EXPENSE",
            "description": "Lunch to delete",
            "occurred_at": datetime.utcnow().isoformat(),
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    tx_id = create_res.json()["id"]

    delete_res = await client.delete(
        f"/api/v1/transactions/{tx_id}",
        headers=headers,
    )
    assert delete_res.status_code == 200
    assert delete_res.json()["id"] == tx_id

    # Confirm it is no longer found
    get_res = await client.get(
        "/api/v1/transactions/",
        headers=headers,
    )
    assert get_res.status_code == 200
    assert all(t["id"] != tx_id for t in get_res.json())

