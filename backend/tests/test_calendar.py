import time
import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient) -> str:
    email = f"calendar_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_calendar_events_endpoint(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a Category
    cat_res = await client.post(
        "/api/v1/categories/",
        json={"name": "Calendar Utilities", "color": "#22c55e"},
        headers=headers
    )
    assert cat_res.status_code == 201
    category_id = cat_res.json()["id"]

    # 2. Create a Bill due on day 10
    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Electricity Bill",
            "amount_estimated": 3500.0,
            "due_day": 10,
            "category_id": category_id
        },
        headers=headers
    )
    assert bill_res.status_code == 201

    # 3. Create a Loan due on day 15
    loan_res = await client.post(
        "/api/v1/loans/",
        json={
            "name": "Personal Loan",
            "principal_amount": 100000.0,
            "interest_rate": 10.0,
            "tenure_months": 12,
            "start_date": "2026-01-01",
            "due_day": 15,
            "category_id": category_id,
            "autopay_enabled": False
        },
        headers=headers
    )
    assert loan_res.status_code == 201

    # 4. Fetch Calendar Events for July 2026
    events_res = await client.get(
        "/api/v1/calendar/events?year=2026&month=7",
        headers=headers
    )
    assert events_res.status_code == 200
    events = events_res.json()

    # We should have at least 2 events: the Bill and the Loan EMI
    # Note: Default seeded categories might also produce events if linked (which they aren't yet)
    # We should also have subscription events if created
    bill_events = [e for e in events if e["type"] == "bill"]
    loan_events = [e for e in events if e["type"] == "loan"]

    assert len(bill_events) >= 1
    assert len(loan_events) >= 1

    # Check dates and details
    assert bill_events[0]["title"] == "Electricity Bill"
    assert bill_events[0]["due_date"] == "2026-07-10"
    assert bill_events[0]["amount"] == 3500.0
    assert bill_events[0]["status"] == "unpaid"

    assert "EMI: Personal Loan" in loan_events[0]["title"]
    assert loan_events[0]["due_date"] == "2026-07-15"
    assert loan_events[0]["status"] == "unpaid"

    # 5. Fetch Calendar Events for December 2025 (before Loan start date)
    before_res = await client.get(
        "/api/v1/calendar/events?year=2025&month=12",
        headers=headers
    )
    assert before_res.status_code == 200
    before_events = before_res.json()
    before_loan_events = [e for e in before_events if e["type"] == "loan"]
    assert len(before_loan_events) == 0
