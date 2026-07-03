import time
import pytest
from httpx import AsyncClient


async def signup_token(client: AsyncClient) -> str:
    email = f"loans_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_calculate_loans_endpoint(client: AsyncClient):
    # Test standard EMI calculation
    response = await client.post(
        "/api/v1/loans/calculate",
        json={
            "principal_amount": 100000.0,
            "interest_rate": 12.0,
            "tenure_months": 12
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["emi_amount"]) == 8884.88
    assert len(data["amortization_schedule"]) == 12
    # Ensure remaining principal decreases to 0
    assert float(data["amortization_schedule"][-1]["remaining_principal"]) == 0.0


@pytest.mark.asyncio
async def test_loan_crud_flow(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create category for loan mapping
    cat_res = await client.post(
        "/api/v1/categories/",
        json={"name": "Housing Loan Category", "color": "#8b5cf6"},
        headers=headers
    )
    assert cat_res.status_code == 201
    category_id = cat_res.json()["id"]

    # 2. Create Loan Profile
    loan_payload = {
        "name": "Home Loan",
        "principal_amount": 500000.0,
        "interest_rate": 8.5,
        "tenure_months": 24,
        "start_date": "2026-01-01",
        "due_day": 5,
        "category_id": category_id,
        "autopay_enabled": False
    }
    create_res = await client.post(
        "/api/v1/loans/",
        json=loan_payload,
        headers=headers
    )
    assert create_res.status_code == 201
    loan = create_res.json()
    assert loan["name"] == "Home Loan"
    assert loan["status"] == "active"
    assert float(loan["emi_amount"]) > 0

    # 3. List Loans
    list_res = await client.get("/api/v1/loans/", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. Get Loan Details (with amortization schedule and paid stats)
    details_res = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert details_res.status_code == 200
    details = details_res.json()
    assert details["loan"]["name"] == "Home Loan"
    assert float(details["outstanding_principal"]) == 500000.0  # no payments yet
    assert float(details["total_principal_paid"]) == 0.0
    assert len(details["amortization_schedule"]) == 24


@pytest.mark.asyncio
async def test_pay_emi_updates_loan_status(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a short-tenure loan
    loan_payload = {
        "name": "Short Loan",
        "principal_amount": 10000.0,
        "interest_rate": 12.0,
        "tenure_months": 2,
        "start_date": "2026-01-01",
        "due_day": 5
    }
    create_res = await client.post(
        "/api/v1/loans/",
        json=loan_payload,
        headers=headers
    )
    assert create_res.status_code == 201
    loan = create_res.json()

    # 2. Pay first EMI
    pay1_res = await client.post(
        f"/api/v1/loans/{loan['id']}/pay",
        headers=headers
    )
    assert pay1_res.status_code == 200
    tx1 = pay1_res.json()
    assert tx1["status"] == "completed"
    assert tx1["loan_id"] == loan["id"]

    # Check updated loan details
    details_res = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert details_res.json()["remaining_tenure_months"] == 1
    assert details_res.json()["loan"]["status"] == "active"

    # 3. Pay second/final EMI
    pay2_res = await client.post(
        f"/api/v1/loans/{loan['id']}/pay",
        headers=headers
    )
    assert pay2_res.status_code == 200

    # Loan should automatically switch status to 'closed'
    details2_res = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert details2_res.json()["remaining_tenure_months"] == 0
    assert details2_res.json()["loan"]["status"] == "closed"


@pytest.mark.asyncio
async def test_transaction_completion_cascading_loan_status(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a loan
    create_res = await client.post(
        "/api/v1/loans/",
        json={
            "name": "Car Loan",
            "principal_amount": 20000.0,
            "interest_rate": 6.0,
            "tenure_months": 5,
            "start_date": "2026-01-01",
            "due_day": 5
        },
        headers=headers
    )
    assert create_res.status_code == 201
    loan = create_res.json()

    # 2. Create a PENDING transaction linked to the loan (representing upcoming EMI)
    tx_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": loan["emi_amount"],
            "type": "EXPENSE",
            "description": f"EMI Payment for {loan['name']}",
            "status": "pending",
            "loan_id": loan["id"]
        },
        headers=headers
    )
    assert tx_res.status_code == 201
    tx = tx_res.json()
    assert tx["status"] == "pending"

    # 3. Complete the transaction
    complete_res = await client.post(
        f"/api/v1/transactions/{tx['id']}/complete",
        headers=headers
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # 4. Verify loan.last_paid_at was updated
    loan_res = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert loan_res.json()["loan"]["last_paid_at"] is not None


@pytest.mark.asyncio
async def test_calculate_loans_simple_interest(client: AsyncClient):
    # Test simple interest EMI calculation (flat rate)
    # principal: 120,000, rate: 10% simple p.a., tenure: 12 months
    # total interest = 120,000 * 10% * 1 = 12,000
    # total amount = 132,000
    # expected EMI = 132,000 / 12 = 11,000
    response = await client.post(
        "/api/v1/loans/calculate",
        json={
            "principal_amount": 120000.0,
            "interest_rate": 10.0,
            "tenure_months": 12,
            "interest_type": "simple"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["emi_amount"]) == 11000.0
    assert float(data["total_interest"]) == 12000.0
    assert float(data["total_amount"]) == 132000.0
    assert len(data["amortization_schedule"]) == 12
    # Ensure remaining principal decreases to 0.0
    assert float(data["amortization_schedule"][-1]["remaining_principal"]) == 0.0
