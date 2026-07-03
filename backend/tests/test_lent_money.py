import time
from datetime import date, timedelta
import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient) -> str:
    email = f"lent_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_lent_money_crud_and_custom_rate(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a category for mapping
    cat_res = await client.post(
        "/api/v1/categories/",
        json={"name": "Investment", "color": "#10b981"},
        headers=headers
    )
    assert cat_res.status_code == 201
    category_id = cat_res.json()["id"]

    # 2. Create Lent Record (borrower: John Doe, 2 rs for 100 rs per month)
    lent_payload = {
        "borrower_name": "John Doe",
        "principal_amount": 50000.0,
        "interest_rate_type": "rupees_per_amount",
        "interest_rate_val": 2.0,
        "interest_rate_basis": 100.0,
        "interest_frequency": "monthly",
        "lent_at": (date.today() - timedelta(days=30)).isoformat(), # exactly 30 days ago
        "category_id": category_id,
        "notes": "Lent for short term business support"
    }

    create_res = await client.post(
        "/api/v1/lent/",
        json=lent_payload,
        headers=headers
    )
    assert create_res.status_code == 201
    lent = create_res.json()
    assert lent["borrower_name"] == "John Doe"
    assert lent["status"] == "active"

    # 3. Retrieve lending details with calculations
    details_res = await client.get(f"/api/v1/lent/{lent['id']}", headers=headers)
    assert details_res.status_code == 200
    details = details_res.json()

    # Interest calculation verify:
    # Principal: 50,000
    # Rate: 2 rs per 100 per month = 2% per month
    # Duration: exactly 30 days = 1 month
    # Expected simple interest: 50,000 * (2/100) * 1 = 1,000
    # Expected outstanding balance: 50,000 + 1,000 = 51,000
    assert float(details["accrued_interest"]) == 1000.0
    assert float(details["outstanding_balance"]) == 51000.0
    assert details["elapsed_duration"]["months"] == 1 or (details["elapsed_duration"]["months"] == 0 and details["elapsed_duration"]["days"] == 30)


@pytest.mark.asyncio
async def test_lent_money_repayment_flow(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Lent Record (simple interest 12% p.a., lent 365 days ago)
    lent_payload = {
        "borrower_name": "Alice Smith",
        "principal_amount": 10000.0,
        "interest_rate_type": "percentage",
        "interest_rate_val": 12.0,
        "interest_frequency": "yearly",
        "lent_at": (date.today() - timedelta(days=365)).isoformat()
    }
    create_res = await client.post(
        "/api/v1/lent/",
        json=lent_payload,
        headers=headers
    )
    assert create_res.status_code == 201
    lent = create_res.json()

    # Accrued interest: 10,000 * 12% * 1 year = 1,200
    # Balance: 11,200

    # 2. Record part payment/repayment
    repay_res = await client.post(
        f"/api/v1/lent/{lent['id']}/repay",
        params={"amount": 5000.0, "notes": "Alice repaid part via GPay"},
        headers=headers
    )
    assert repay_res.status_code == 200
    tx = repay_res.json()
    assert tx["status"] == "completed"
    assert tx["type"] == "INCOME"

    # 3. Retrieve details to check new balance
    # Remaining: 11,200 - 5,000 = 6,200
    details_res = await client.get(f"/api/v1/lent/{lent['id']}", headers=headers)
    details = details_res.json()
    assert float(details["total_repayments"]) == 5000.0
    assert float(details["outstanding_balance"]) == 6200.0
    assert details["lent_record"]["status"] == "active"

    # 4. Final payment to fully settle
    repay_final = await client.post(
        f"/api/v1/lent/{lent['id']}/repay",
        params={"amount": 6200.0, "notes": "Final settlement paid"},
        headers=headers
    )
    assert repay_final.status_code == 200

    # Lending profile should automatically switch to settled/closed
    details_settled_res = await client.get(f"/api/v1/lent/{lent['id']}", headers=headers)
    details_settled = details_settled_res.json()
    assert float(details_settled["outstanding_balance"]) == 0.0
    assert details_settled["lent_record"]["status"] == "settled"


@pytest.mark.asyncio
async def test_lent_money_compound_interest(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create Lent Record (borrower: Bob, 10% monthly compounding interest, lent 60 days ago)
    # principal: 10,000, 10% per month compounding
    # delta_days = 60 days = 2 months
    # Formula: 10,000 * ((1 + 0.1) ^ 2) - 10,000 = 10,000 * (1.21 - 1) = 2,100 accrued interest.
    lent_payload = {
        "borrower_name": "Bob Compounding",
        "principal_amount": 10000.0,
        "interest_rate_type": "percentage",
        "interest_rate_val": 10.0,
        "interest_frequency": "monthly",
        "interest_type": "compound",
        "lent_at": (date.today() - timedelta(days=60)).isoformat()
    }

    create_res = await client.post(
        "/api/v1/lent/",
        json=lent_payload,
        headers=headers
    )
    assert create_res.status_code == 201
    lent = create_res.json()
    assert lent["interest_type"] == "compound"

    details_res = await client.get(f"/api/v1/lent/{lent['id']}", headers=headers)
    assert details_res.status_code == 200
    details = details_res.json()

    assert float(details["accrued_interest"]) == 2100.0
    assert float(details["outstanding_balance"]) == 12100.0
