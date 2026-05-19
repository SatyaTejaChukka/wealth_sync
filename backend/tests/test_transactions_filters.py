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

