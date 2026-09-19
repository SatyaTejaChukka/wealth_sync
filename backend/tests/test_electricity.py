import time
from datetime import date
import pytest
from httpx import AsyncClient


async def get_auth_token(client: AsyncClient) -> str:
    email = f"elec_{int(time.time() * 1000)}@example.com"
    password = "password123"
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_electricity_flow(client: AsyncClient):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get supported providers
    providers_res = await client.get("/api/v1/electricity/providers", headers=headers)
    assert providers_res.status_code == 200
    providers = providers_res.json()
    provider_codes = [p["code"] for p in providers]
    assert "APSPDCL" in provider_codes
    assert "BESCOM" in provider_codes
    assert "MOCK" in provider_codes

    # 2. Preview bill fetch
    preview_res = await client.post(
        "/api/v1/electricity/preview",
        params={"provider_code": "APSPDCL", "consumer_number": "1311200045678", "mobile": "9876543210"},
        headers=headers,
    )
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["provider_code"] == "APSPDCL"
    assert preview_data["consumer_number"] == "1311200045678"
    assert preview_data["amount"] > 0
    assert "bill_number" in preview_data

    # 3. Link electricity connection
    account_payload = {
        "provider_code": "APSPDCL",
        "consumer_number": "1311200045678",
        "registered_mobile": "9876543210",
        "nickname": "Home Electricity",
        "autopay_enabled": False,
    }
    create_res = await client.post(
        "/api/v1/electricity/accounts",
        json=account_payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    account_data = create_res.json()
    account_id = account_data["id"]
    assert account_data["nickname"] == "Home Electricity"
    assert account_data["latest_bill"] is not None
    assert account_data["latest_bill"]["amount"] > 0
    bill_id = account_data["latest_bill"]["id"]

    # 4. List linked accounts
    list_res = await client.get("/api/v1/electricity/accounts", headers=headers)
    assert list_res.status_code == 200
    accounts_list = list_res.json()
    assert len(accounts_list) == 1
    assert accounts_list[0]["id"] == account_id

    # 5. On-demand refresh / fetch
    fetch_res = await client.post(f"/api/v1/electricity/accounts/{account_id}/fetch", headers=headers)
    assert fetch_res.status_code == 200
    fetched_bill = fetch_res.json()
    assert fetched_bill["id"] == bill_id

    # 6. Check calendar includes the electricity bill
    today = date.today()
    calendar_res = await client.get(
        f"/api/v1/calendar/events?year={today.year}&month={today.month}",
        headers=headers,
    )
    assert calendar_res.status_code == 200
    events = calendar_res.json()
    elec_events = [e for e in events if e["type"] == "electricity"]
    assert len(elec_events) >= 1
    assert "Home Electricity" in elec_events[0]["title"] or "APSPDCL" in elec_events[0]["title"]

    # 7. Pay the electricity bill
    pay_res = await client.post(f"/api/v1/electricity/bills/{bill_id}/pay", json={}, headers=headers)
    assert pay_res.status_code == 200
    paid_bill = pay_res.json()
    assert paid_bill["status"] == "paid"
    assert paid_bill["paid_at"] is not None
    assert paid_bill["transaction_id"] is not None

    # 8. Check transaction was created in transactions feed
    tx_res = await client.get("/api/v1/transactions/", headers=headers)
    assert tx_res.status_code == 200
    tx_list = tx_res.json()
    assert len(tx_list) >= 1
    matching_tx = [t for t in tx_list if t["id"] == paid_bill["transaction_id"]]
    assert len(matching_tx) == 1
    assert "Electricity Bill" in matching_tx[0]["description"]

    # 9. Delete the electricity account
    delete_res = await client.delete(f"/api/v1/electricity/accounts/{account_id}", headers=headers)
    assert delete_res.status_code == 204


@pytest.mark.asyncio
async def test_adaptive_polling_rules(db_session):
    from datetime import date, datetime, timedelta
    from uuid import uuid4
    from app.models.electricity_account import ElectricityAccount, ElectricityBill
    from app.services.electricity_service import ElectricityService

    user_id = str(uuid4())
    account = ElectricityAccount(
        id=str(uuid4()),
        user_id=user_id,
        provider_code="APSPDCL",
        consumer_number="1311200099999",
        nickname="Test Adaptive Account",
        last_checked_at=datetime.utcnow() - timedelta(days=2),
    )
    db_session.add(account)
    await db_session.commit()

    # Rule 1: No bill exists, day is 5 (between 1-18) -> should poll
    should_poll, reason = await ElectricityService.should_poll_account(
        db_session, account, target_date=date(2026, 9, 5)
    )
    assert should_poll is True
    assert reason == "active_generation_window"

    # Rule 2: Bill already exists for current month -> skip polling
    bill = ElectricityBill(
        id=str(uuid4()),
        account_id=account.id,
        bill_number="AP-202609-9999",
        bill_date=date(2026, 9, 8),
        due_date=date(2026, 9, 23),
        amount=850.0,
        status="unpaid",
    )
    db_session.add(bill)
    await db_session.commit()

    should_poll, reason = await ElectricityService.should_poll_account(
        db_session, account, target_date=date(2026, 9, 5)
    )
    assert should_poll is False
    assert reason == "current_month_bill_already_fetched"

    # Rule 3: Off-cycle day 25, no bill for next month (Oct), checked 2 days ago -> throttled
    should_poll, reason = await ElectricityService.should_poll_account(
        db_session, account, target_date=date(2026, 10, 25)
    )
    assert should_poll is False
    assert reason == "off_cycle_throttled"

    # Rule 4: Off-cycle day 25, checked 10 days ago -> weekly retry
    account.last_checked_at = datetime.utcnow() - timedelta(days=10)
    db_session.add(account)
    await db_session.commit()

    should_poll, reason = await ElectricityService.should_poll_account(
        db_session, account, target_date=date(2026, 10, 25)
    )
    assert should_poll is True
    assert reason == "off_cycle_weekly_retry"


@pytest.mark.asyncio
async def test_due_reminders_and_deduplication(db_session):
    from datetime import date, timedelta
    from uuid import uuid4
    from app.models.electricity_account import ElectricityAccount, ElectricityBill
    from app.services.electricity_service import ElectricityService

    user_id = str(uuid4())
    account = ElectricityAccount(
        id=str(uuid4()),
        user_id=user_id,
        provider_code="BESCOM",
        consumer_number="5432109999",
        nickname="Bangalore Flat",
    )
    db_session.add(account)
    await db_session.commit()

    today = date(2026, 9, 20)
    bill = ElectricityBill(
        id=str(uuid4()),
        account_id=account.id,
        bill_number="KA-202609-9999",
        bill_date=date(2026, 9, 5),
        due_date=today + timedelta(days=3),  # Due in 3 days
        amount=1250.0,
        status="unpaid",
    )
    db_session.add(bill)
    await db_session.commit()

    # 1. 3-day reminder created
    notif1 = await ElectricityService.process_due_reminders(
        db_session, bill, account, today=today
    )
    assert notif1 is not None
    assert "Due in 3 Days" in notif1.title
    assert notif1.related_id == bill.id

    # 2. Deduplication: running again does not duplicate
    notif1_dup = await ElectricityService.process_due_reminders(
        db_session, bill, account, today=today
    )
    assert notif1_dup is None

    # 3. Due today reminder
    bill.due_date = today
    db_session.add(bill)
    await db_session.commit()

    notif_today = await ElectricityService.process_due_reminders(
        db_session, bill, account, today=today
    )
    assert notif_today is not None
    assert "Due Today" in notif_today.title

    # 4. Overdue reminder
    bill.due_date = today - timedelta(days=1)
    db_session.add(bill)
    await db_session.commit()

    notif_overdue = await ElectricityService.process_due_reminders(
        db_session, bill, account, today=today
    )
    assert notif_overdue is not None
    assert "Overdue" in notif_overdue.title
    assert notif_overdue.type == "bill_overdue"


