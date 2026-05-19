from datetime import datetime
import time

import pytest
from httpx import AsyncClient


def approx(value: float, expected: float, tolerance: float = 0.01) -> bool:
    return abs(value - expected) <= tolerance


async def signup_token(client: AsyncClient) -> str:
    email = f"autopilot_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_daily_safe_to_spend_contract(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    income_res = await client.post(
        "/api/v1/income/",
        json={
            "amount": 3000,
            "frequency": "monthly",
            "payday": "1st",
            "active": True,
        },
        headers=headers,
    )
    assert income_res.status_code == 201

    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Rent",
            "amount_estimated": 600,
            "due_day": 10,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert bill_res.status_code == 201

    expense_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 500,
            "type": "EXPENSE",
            "description": "Groceries",
            "occurred_at": datetime.utcnow().isoformat(),
        },
        headers=headers,
    )
    assert expense_res.status_code == 201

    response = await client.get("/api/v1/autopilot/safe-to-spend-daily", headers=headers)
    assert response.status_code == 200

    payload = response.json()
    assert payload["color_state"] in {"carefree", "mindful", "careful"}
    assert payload["days_left_in_month"] > 0
    assert approx(payload["monthly_safe_total"], 2400)
    assert payload["daily_limit"] >= 0

    breakdown = payload["breakdown"]
    assert {"income_today", "committed_today", "spent_today", "remaining_today"}.issubset(breakdown.keys())


@pytest.mark.asyncio
async def test_timeline_handles_due_day_31(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    income_res = await client.post(
        "/api/v1/income/",
        json={
            "amount": 5000,
            "frequency": "monthly",
            "payday": "31st",
            "active": True,
        },
        headers=headers,
    )
    assert income_res.status_code == 201

    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Internet",
            "amount_estimated": 80,
            "due_day": 31,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert bill_res.status_code == 201

    goal_res = await client.post(
        "/api/v1/goals/",
        json={
            "name": "Emergency Fund",
            "target_amount": 10000,
            "current_amount": 1000,
            "monthly_contribution": 500,
            "priority": 5,
        },
        headers=headers,
    )
    assert goal_res.status_code == 201

    timeline_res = await client.get(
        "/api/v1/autopilot/timeline",
        params={"days_past": 7, "days_future": 60},
        headers=headers,
    )
    assert timeline_res.status_code == 200

    payload = timeline_res.json()
    event_types = {event["type"] for event in payload["events"]}
    assert "SALARY" in event_types
    assert "BILL_DUE" in event_types

    salary_events = [event for event in payload["events"] if event["type"] == "SALARY"]
    assert salary_events
    salary_details = salary_events[0]["details"]
    assert "auto_prepared_payments" in salary_details
    assert isinstance(salary_details["auto_prepared_payments"], list)
    assert "remaining_after" in salary_details

    projection_events = [event for event in payload["events"] if event["type"] == "PROJECTION"]
    assert projection_events
    projection_details = projection_events[0]["details"]
    assert projection_details["confidence"] in {"high", "medium", "low"}
    assert isinstance(projection_details["confidence_score"], int)


@pytest.mark.asyncio
async def test_timeline_falls_back_when_autopilot_tables_are_unavailable(
    client: AsyncClient,
    monkeypatch,
):
    from app.services.autopilot import AutopilotService

    async def tables_unavailable(_session):
        return False

    monkeypatch.setattr(
        AutopilotService,
        "_autopilot_tables_available",
        staticmethod(tables_unavailable),
    )

    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    income_res = await client.post(
        "/api/v1/income/",
        json={
            "amount": 5000,
            "frequency": "monthly",
            "payday": "15th",
            "active": True,
        },
        headers=headers,
    )
    assert income_res.status_code == 201

    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Phone Bill",
            "amount_estimated": 120,
            "due_day": 20,
            "autopay_enabled": True,
        },
        headers=headers,
    )
    assert bill_res.status_code == 201

    timeline_res = await client.get(
        "/api/v1/autopilot/timeline",
        params={"days_past": 7, "days_future": 30},
        headers=headers,
    )
    assert timeline_res.status_code == 200

    payload = timeline_res.json()
    assert isinstance(payload["events"], list)
    bill_events = [event for event in payload["events"] if event["type"] == "BILL_DUE"]
    assert bill_events
    assert bill_events[0]["details"]["payment_order_id"] is None
    assert bill_events[0]["details"]["payment_status"] is None


@pytest.mark.asyncio
async def test_autopilot_table_check_rejects_partial_schema(monkeypatch):
    from app.models.autopilot_payment import (
        AutopilotPayment,
        AutopilotPaymentStateHistory,
    )
    from app.services import autopilot as autopilot_module
    from app.services.autopilot import AutopilotService

    payment_columns = set(AutopilotPayment.__table__.columns.keys()) - {
        "execution_idempotency_key"
    }
    history_columns = set(AutopilotPaymentStateHistory.__table__.columns.keys())

    class FakeInspector:
        def has_table(self, _table_name):
            return True

        def get_columns(self, table_name):
            columns = payment_columns if table_name == "autopilot_payments" else history_columns
            return [{"name": column_name} for column_name in columns]

    class FakeConnection:
        async def run_sync(self, fn):
            return fn(object())

    class FakeSession:
        async def connection(self):
            return FakeConnection()

    monkeypatch.setattr(autopilot_module, "inspect", lambda _conn: FakeInspector())

    assert await AutopilotService._autopilot_tables_available(FakeSession()) is False


@pytest.mark.asyncio
async def test_salary_rule_engine_priority_split(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    income_res = await client.post(
        "/api/v1/income/",
        json={
            "amount": 10000,
            "frequency": "monthly",
            "payday": "1st",
            "active": True,
        },
        headers=headers,
    )
    assert income_res.status_code == 201

    bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Rent",
            "amount_estimated": 3000,
            "due_day": 5,
            "autopay_enabled": False,
        },
        headers=headers,
    )
    assert bill_res.status_code == 201

    goal_high_res = await client.post(
        "/api/v1/goals/",
        json={
            "name": "Emergency Fund",
            "target_amount": 50000,
            "current_amount": 5000,
            "monthly_contribution": 4000,
            "priority": 10,
        },
        headers=headers,
    )
    assert goal_high_res.status_code == 201

    goal_low_res = await client.post(
        "/api/v1/goals/",
        json={
            "name": "Vacation",
            "target_amount": 30000,
            "current_amount": 1000,
            "monthly_contribution": 4000,
            "priority": 2,
        },
        headers=headers,
    )
    assert goal_low_res.status_code == 201

    response = await client.get("/api/v1/autopilot/salary-rule-engine", headers=headers)
    assert response.status_code == 200

    payload = response.json()
    assert payload["rules_config"]["commitments_first"] is True
    assert payload["rules_config"]["goal_strategy"] == "priority_desc"
    assert approx(payload["salary_considered"], 10000)
    assert approx(payload["allocation"]["commitments"], 3000)
    assert approx(payload["allocation"]["free_money_floor_target"], 2000)
    assert approx(payload["allocation"]["goals"], 5000)
    assert approx(payload["allocation"]["free_money"], 2000)
    assert payload["allocation"]["free_money_floor_met"] is True
    assert payload["confidence"]["label"] in {"high", "medium", "low"}
    assert payload["status"]["primary_constraint"] == "goals"
    assert approx(payload["money_flow"]["remaining_safe_to_spend"], 2000)
    assert isinstance(payload["warning_details"], list)

    goals = {item["goal_name"]: item for item in payload["buckets"]["goals"]}
    assert approx(goals["Emergency Fund"]["allocated"], 4000)
    assert approx(goals["Vacation"]["allocated"], 1000)
    assert goals["Vacation"]["shortfall"] > 0

    summary_res = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary_res.status_code == 200
    summary_payload = summary_res.json()
    assert "salary_rule_engine" in summary_payload["safe_to_spend_stats"]


@pytest.mark.asyncio
async def test_salary_rule_engine_prefers_income_transactions(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    income_res = await client.post(
        "/api/v1/income/",
        json={
            "amount": 5000,
            "frequency": "monthly",
            "payday": "1st",
            "active": True,
        },
        headers=headers,
    )
    assert income_res.status_code == 201

    income_txn_res = await client.post(
        "/api/v1/transactions/",
        json={
            "amount": 12000,
            "type": "INCOME",
            "description": "Salary",
            "occurred_at": datetime.utcnow().isoformat(),
        },
        headers=headers,
    )
    assert income_txn_res.status_code == 201

    response = await client.get("/api/v1/autopilot/salary-rule-engine", headers=headers)
    assert response.status_code == 200

    payload = response.json()
    assert payload["salary_source"] == "income_transactions"
    assert approx(payload["salary_candidates"]["from_income_transactions"], 12000)
    assert approx(payload["salary_candidates"]["from_income_sources"], 5000)
    assert approx(payload["salary_considered"], 12000)


@pytest.mark.asyncio
async def test_autopilot_payment_order_approval_and_execution(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.utcnow()
    create_bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Electricity",
            "amount_estimated": 1200,
            "due_day": now.day,
            "autopay_enabled": True,
        },
        headers=headers,
    )
    assert create_bill_res.status_code == 201
    bill_id = create_bill_res.json()["id"]

    prepare_res = await client.post(
        "/api/v1/autopilot/payments/prepare",
        params={"days_ahead": 1},
        headers=headers,
    )
    assert prepare_res.status_code == 200
    prepare_payload = prepare_res.json()
    assert prepare_payload["created_count"] >= 1

    order = next(
        (
            item
            for item in prepare_payload["items"]
            if item["source_type"] == "BILL" and item["source_id"] == bill_id
        ),
        None,
    )
    assert order is not None
    assert order["status"] == "approval_required"

    timeline_res = await client.get(
        "/api/v1/autopilot/timeline",
        params={"days_past": 1, "days_future": 7},
        headers=headers,
    )
    assert timeline_res.status_code == 200
    bill_events = [
        event
        for event in timeline_res.json()["events"]
        if event["type"] == "BILL_DUE" and event["details"]["bill_name"] == "Electricity"
    ]
    assert bill_events
    assert bill_events[0]["details"]["payment_order_id"] == order["id"]
    assert bill_events[0]["details"]["payment_status"] == "approval_required"

    approve_res = await client.post(
        f"/api/v1/autopilot/payments/{order['id']}/approve",
        json={"execute_now": True},
        headers=headers,
    )
    assert approve_res.status_code == 200
    approved_item = approve_res.json()["item"]
    assert approved_item["status"] == "succeeded"
    assert approved_item["transaction_id"] is not None

    payments_res = await client.get(
        "/api/v1/autopilot/payments",
        params={"status": "succeeded"},
        headers=headers,
    )
    assert payments_res.status_code == 200
    succeeded_ids = {item["id"] for item in payments_res.json()["items"]}
    assert order["id"] in succeeded_ids

    bills_res = await client.get("/api/v1/bills/", headers=headers)
    assert bills_res.status_code == 200
    paid_bill = next((bill for bill in bills_res.json() if bill["id"] == bill_id), None)
    assert paid_bill is not None
    assert paid_bill["last_paid_at"] is not None


@pytest.mark.asyncio
async def test_autopilot_execution_idempotency_and_history(client: AsyncClient):
    token = await signup_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.utcnow()
    create_bill_res = await client.post(
        "/api/v1/bills/",
        json={
            "name": "Water",
            "amount_estimated": 600,
            "due_day": now.day,
            "autopay_enabled": True,
        },
        headers=headers,
    )
    assert create_bill_res.status_code == 201

    prepare_res = await client.post(
        "/api/v1/autopilot/payments/prepare",
        params={"days_ahead": 1},
        headers=headers,
    )
    assert prepare_res.status_code == 200
    order = prepare_res.json()["items"][0]

    approve_res = await client.post(
        f"/api/v1/autopilot/payments/{order['id']}/approve",
        json={"execute_now": False},
        headers=headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["item"]["status"] == "approved"

    idempotency_key = "idem-water-order-001"
    execute_once_res = await client.post(
        f"/api/v1/autopilot/payments/{order['id']}/execute",
        params={"idempotency_key": idempotency_key},
        headers=headers,
    )
    assert execute_once_res.status_code == 200
    execute_once_item = execute_once_res.json()["item"]
    assert execute_once_item["status"] == "succeeded"
    assert execute_once_item["transaction_id"] is not None

    execute_twice_res = await client.post(
        f"/api/v1/autopilot/payments/{order['id']}/execute",
        params={"idempotency_key": idempotency_key},
        headers=headers,
    )
    assert execute_twice_res.status_code == 200
    execute_twice_item = execute_twice_res.json()["item"]
    assert execute_twice_item["status"] == "succeeded"
    assert execute_twice_item["transaction_id"] == execute_once_item["transaction_id"]

    history_res = await client.get(
        f"/api/v1/autopilot/payments/{order['id']}/history",
        headers=headers,
    )
    assert history_res.status_code == 200
    event_types = {event["event_type"] for event in history_res.json()["items"]}
    assert {"payment_approved", "execution_started", "execution_succeeded"}.issubset(event_types)
