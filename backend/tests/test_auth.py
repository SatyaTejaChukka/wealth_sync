import pytest
from httpx import AsyncClient

from app.core.config import settings

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == settings.PROJECT_NAME
    assert data["env"] == settings.ENVIRONMENT

@pytest.mark.asyncio
async def test_signup_flow(client: AsyncClient):
    # random email to avoid conflict
    import time
    email = f"test_{int(time.time())}@example.com"
    password = "password123"
    
    # 1. Signup
    response = await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": password
    })
    assert response.status_code == 201
    signup_data = response.json()
    assert "access_token" in signup_data
    assert signup_data["token_type"] == "bearer"

    # 2. Login
    login_response = await client.post("/api/v1/auth/login", data={
        "username": email,
        "password": password
    })
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 3. Get Me
    me_response = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == email
