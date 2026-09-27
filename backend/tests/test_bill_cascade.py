import pytest
from httpx import AsyncClient
from datetime import datetime, date

@pytest.mark.asyncio
async def test_delete_bill_cascades_to_transactions_and_calendar(client: AsyncClient):
    # 1. Register & login user
    email = f"cascade_bill_{datetime.utcnow().timestamp()}@example.com"
    pwd = "password123"
    await client.post("/api/v1/auth/signup", json={"email": email, "password": pwd})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": pwd})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create category
    cat_res = await client.post("/api/v1/categories/", json={"name": "Utilities", "color": "#123456"}, headers=headers)
    cat_id = cat_res.json()["id"]

    # 3. Create a bill
    bill_res = await client.post("/api/v1/bills/", json={
        "name": "Fiber Internet Bill",
        "amount_estimated": 1299.0,
        "due_day": 15,
        "frequency": "monthly",
        "autopay_enabled": False,
        "category_id": cat_id
    }, headers=headers)
    assert bill_res.status_code == 201
    bill_id = bill_res.json()["id"]

    # 4. Create a transaction linked to this bill
    tx_res = await client.post("/api/v1/transactions/", json={
        "amount": 1299.0,
        "type": "EXPENSE",
        "description": "Fiber Internet Bill Sept",
        "category_id": cat_id,
        "bill_id": bill_id,
        "occurred_at": datetime.utcnow().isoformat()
    }, headers=headers)
    assert tx_res.status_code == 201
    tx_id = tx_res.json()["id"]

    # 5. Verify transaction exists and is linked
    get_tx_res = await client.get("/api/v1/transactions/", headers=headers)
    tx_list = get_tx_res.json()
    assert any(t["id"] == tx_id and t["bill_id"] == bill_id for t in tx_list)

    # 6. Verify calendar events contain this bill
    now = datetime.utcnow()
    cal_res = await client.get(f"/api/v1/calendar/events?year={now.year}&month={now.month}", headers=headers)
    assert cal_res.status_code == 200
    events = cal_res.json()
    assert any(e["linked_id"] == bill_id and e["type"] == "bill" for e in events)

    # 7. Delete the bill
    del_res = await client.delete(f"/api/v1/bills/{bill_id}", headers=headers)
    assert del_res.status_code == 200

    # 8. Verify bill is gone
    bills_res = await client.get("/api/v1/bills/", headers=headers)
    assert not any(b["id"] == bill_id for b in bills_res.json())

    # 9. Verify linked transaction is deleted
    get_tx_res_after = await client.get("/api/v1/transactions/", headers=headers)
    tx_list_after = get_tx_res_after.json()
    assert not any(t["id"] == tx_id for t in tx_list_after)

    # 10. Verify calendar events no longer contain this bill
    cal_res_after = await client.get(f"/api/v1/calendar/events?year={now.year}&month={now.month}", headers=headers)
    assert cal_res_after.status_code == 200
    events_after = cal_res_after.json()
    assert not any(e["linked_id"] == bill_id for e in events_after)
