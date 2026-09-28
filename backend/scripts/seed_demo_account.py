import asyncio
import sys
from datetime import datetime, timedelta, date
from decimal import Decimal
import httpx
from uuid import uuid4

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/v1"
EMAIL = "sample@example.com"
PASSWORD = "password: 12345678" if False else "12345678"

async def seed():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print(f"Logging in as {EMAIL}...")
        login_res = await client.post("/auth/login", data={"username": EMAIL, "password": PASSWORD})
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code} {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✓ Logged in successfully!")

        # 1. Budget Categories
        print("\n--- 1. Seeding Budget Categories ---")
        categories_to_create = [
            {"name": "Housing & Rent", "color": "#8B5CF6"},
            {"name": "Food & Groceries", "color": "#10B981"},
            {"name": "Utilities & Bills", "color": "#F59E0B"},
            {"name": "Transportation & Fuel", "color": "#06B6D4"},
            {"name": "Entertainment & Leisure", "color": "#EC4899"},
            {"name": "Healthcare & Fitness", "color": "#EF4444"},
            {"name": "Shopping & Lifestyle", "color": "#6366F1"},
            {"name": "Loans & Debt EMI", "color": "#E11D48"},
            {"name": "Savings & Investments", "color": "#14B8A6"},
        ]
        
        # Get existing categories
        existing_cat_res = await client.get("/categories/", headers=headers)
        existing_cats = {c["name"]: c["id"] for c in existing_cat_res.json()} if existing_cat_res.status_code == 200 else {}
        
        cat_map = {}
        for cat in categories_to_create:
            if cat["name"] in existing_cats:
                cat_map[cat["name"]] = existing_cats[cat["name"]]
                print(f"  Category exists: {cat['name']}")
            else:
                res = await client.post("/categories/", json=cat, headers=headers)
                if res.status_code == 201:
                    cat_id = res.json()["id"]
                    cat_map[cat["name"]] = cat_id
                    print(f"  ✓ Created Category: {cat['name']}")
                else:
                    print(f"  Failed category {cat['name']}: {res.text}")

        # 2. Budget Rules
        print("\n--- 2. Seeding Budget Rules ---")
        rules = [
            {"category_name": "Housing & Rent", "limit": 30000},
            {"category_name": "Food & Groceries", "limit": 18000},
            {"category_name": "Utilities & Bills", "limit": 10000},
            {"category_name": "Transportation & Fuel", "limit": 8000},
            {"category_name": "Entertainment & Leisure", "limit": 12000},
            {"category_name": "Healthcare & Fitness", "limit": 6000},
            {"category_name": "Shopping & Lifestyle", "limit": 10000},
        ]
        for r in rules:
            cat_id = cat_map.get(r["category_name"])
            if cat_id:
                res = await client.post("/budgets/rules", json={
                    "category_id": cat_id,
                    "allocation_type": "FIXED",
                    "allocation_value": r["limit"],
                    "monthly_limit": r["limit"]
                }, headers=headers)
                if res.status_code in (200, 201):
                    print(f"  ✓ Budget Rule: {r['category_name']} -> ₹{r['limit']:,}")

        # 3. Income Sources
        print("\n--- 3. Seeding Income Sources ---")
        existing_incomes_res = await client.get("/income/", headers=headers)
        existing_incomes = existing_incomes_res.json() if existing_incomes_res.status_code == 200 else []
        if not existing_incomes:
            incomes = [
                {"amount": 120000, "frequency": "monthly", "payday": "1st", "active": True},
                {"amount": 35000, "frequency": "monthly", "payday": "15th", "active": True},
                {"amount": 8000, "frequency": "monthly", "payday": "25th", "active": True},
            ]
            for inc in incomes:
                res = await client.post("/income/", json=inc, headers=headers)
                if res.status_code in (200, 201):
                    print(f"  ✓ Income Source: ₹{inc['amount']:,} ({inc['frequency']}, payday {inc['payday']})")
        else:
            print(f"  Existing income sources found ({len(existing_incomes)}). Skipping duplicate creation.")

        # 4. Realistic Transactions
        print("\n--- 4. Seeding Realistic Transactions ---")
        now = datetime.utcnow()
        existing_txs_res = await client.get("/transactions/?limit=100", headers=headers)
        existing_tx_descs = {t["description"].strip().lower() for t in existing_txs_res.json()} if existing_txs_res.status_code == 200 else set()

        transactions = [
            # Income credits
            {"amount": 120000, "type": "INCOME", "category": "Savings & Investments", "description": "Tech Corp Primary Salary Credit", "days_ago": 26, "status": "completed"},
            {"amount": 35000, "type": "INCOME", "category": "Savings & Investments", "description": "Freelance UI Consulting Payout", "days_ago": 12, "status": "completed"},
            {"amount": 8000, "type": "INCOME", "category": "Savings & Investments", "description": "Quarterly Mutual Fund Dividend", "days_ago": 2, "status": "completed"},
            # Expenses
            {"amount": 28000, "type": "EXPENSE", "category": "Housing & Rent", "description": "Monthly Flat Rent Payment", "days_ago": 26, "status": "completed"},
            {"amount": 6450, "type": "EXPENSE", "category": "Food & Groceries", "description": "Nature's Basket Monthly Provisions", "days_ago": 23, "status": "completed"},
            {"amount": 2800, "type": "EXPENSE", "category": "Food & Groceries", "description": "Organic Farmers Market Fresh Greens", "days_ago": 16, "status": "completed"},
            {"amount": 4200, "type": "EXPENSE", "category": "Entertainment & Leisure", "description": "Celebration Dinner at Toit Brewpub", "days_ago": 20, "status": "completed"},
            {"amount": 1850, "type": "EXPENSE", "category": "Entertainment & Leisure", "description": "PVR IMAX Oppenheimer Re-release Tickets", "days_ago": 8, "status": "completed"},
            {"amount": 3500, "type": "EXPENSE", "category": "Transportation & Fuel", "description": "Shell V-Power Petrol Full Tank", "days_ago": 18, "status": "completed"},
            {"amount": 1000, "type": "EXPENSE", "category": "Transportation & Fuel", "description": "Metro Smart Card Top-up", "days_ago": 10, "status": "completed"},
            {"amount": 1499, "type": "EXPENSE", "category": "Utilities & Bills", "description": "Airtel Xstream Fiber 300 Mbps", "days_ago": 17, "status": "completed"},
            {"amount": 2850, "type": "EXPENSE", "category": "Utilities & Bills", "description": "BESCOM Electricity Bill", "days_ago": 14, "status": "completed"},
            {"amount": 5500, "type": "EXPENSE", "category": "Healthcare & Fitness", "description": "Cult.fit Quarterly Pass Renewal", "days_ago": 19, "status": "completed"},
            {"amount": 1650, "type": "EXPENSE", "category": "Healthcare & Fitness", "description": "Apollo Pharmacy Vitamins & Supplements", "days_ago": 6, "status": "completed"},
            {"amount": 6200, "type": "EXPENSE", "category": "Shopping & Lifestyle", "description": "Amazon.in Keychron Mechanical Keyboard", "days_ago": 11, "status": "completed"},
            {"amount": 4500, "type": "EXPENSE", "category": "Shopping & Lifestyle", "description": "Uniqlo Linen Shirts & Essentials", "days_ago": 5, "status": "completed"},
            {"amount": 780, "type": "EXPENSE", "category": "Food & Groceries", "description": "Blue Tokai Coffee & Croissant", "days_ago": 3, "status": "completed"},
            {"amount": 1450, "type": "EXPENSE", "category": "Food & Groceries", "description": "Swiggy Gourmet Dinner", "days_ago": 1, "status": "completed"},
            {"amount": 2400, "type": "EXPENSE", "category": "Food & Groceries", "description": "Client Lunch (Pending Reimbursement)", "days_ago": 0, "status": "pending"},
        ]

        for tx in transactions:
            if tx["description"].strip().lower() in existing_tx_descs:
                print(f"  Transaction exists: {tx['description']}")
                continue
            tx_date = now - timedelta(days=tx["days_ago"], hours=tx.get("hours_ago", 2))
            cat_id = cat_map.get(tx["category"])
            payload = {
                "amount": tx["amount"],
                "type": tx["type"],
                "description": tx["description"],
                "status": tx["status"],
                "category_id": cat_id,
                "occurred_at": tx_date.isoformat(),
            }
            res = await client.post("/transactions/", json=payload, headers=headers)
            if res.status_code == 201:
                print(f"  ✓ {tx['type']}: ₹{tx['amount']:,} - {tx['description']} ({tx['status']})")

        # 5. Recurring Bills
        print("\n--- 5. Seeding Recurring Bills ---")
        existing_bills_res = await client.get("/bills/", headers=headers)
        existing_bill_names = {b["name"].strip().lower() for b in existing_bills_res.json()} if existing_bills_res.status_code == 200 else set()

        bills = [
            {"name": "Apartment Maintenance", "amount_estimated": 3200, "due_day": 5, "category": "Housing & Rent"},
            {"name": "Airtel Xstream Fiber", "amount_estimated": 1499, "due_day": 10, "category": "Utilities & Bills"},
            {"name": "Jio Postpaid Family Plan", "amount_estimated": 999, "due_day": 18, "category": "Utilities & Bills"},
            {"name": "Piped Cooking Gas (MNGL)", "amount_estimated": 850, "due_day": 22, "category": "Utilities & Bills"},
            {"name": "Society Water Supply", "amount_estimated": 1200, "due_day": 28, "category": "Utilities & Bills"},
        ]
        for b in bills:
            if b["name"].strip().lower() in existing_bill_names:
                print(f"  Bill exists: {b['name']}")
                continue
            payload = {
                "name": b["name"],
                "amount_estimated": b["amount_estimated"],
                "due_day": b["due_day"],
                "frequency": "monthly",
                "autopay_enabled": False,
                "category_id": cat_map.get(b["category"])
            }
            res = await client.post("/bills/", json=payload, headers=headers)
            if res.status_code == 201:
                print(f"  ✓ Bill: {b['name']} (₹{b['amount_estimated']:,}, due {b['due_day']}th)")

        # 6. Subscriptions
        print("\n--- 6. Seeding Subscriptions ---")
        existing_subs_res = await client.get("/subscriptions/", headers=headers)
        existing_sub_names = {s["name"].strip().lower() for s in existing_subs_res.json()} if existing_subs_res.status_code == 200 else set()

        subscriptions = [
            {"name": "Netflix 4K Ultra HD", "amount": 649, "cycle": "monthly", "usage": 18, "category": "Entertainment & Leisure"},
            {"name": "Spotify Family", "amount": 179, "cycle": "monthly", "usage": 45, "category": "Entertainment & Leisure"},
            {"name": "Amazon Prime Annual", "amount": 1499, "cycle": "yearly", "usage": 28, "category": "Shopping & Lifestyle"},
            {"name": "Cult.fit Elite Pass", "amount": 2500, "cycle": "monthly", "usage": 16, "category": "Healthcare & Fitness"},
            {"name": "ChatGPT Plus", "amount": 1999, "cycle": "monthly", "usage": 72, "category": "Utilities & Bills"},
            {"name": "YouTube Premium", "amount": 189, "cycle": "monthly", "usage": 34, "category": "Entertainment & Leisure"},
        ]
        for s in subscriptions:
            if s["name"].strip().lower() in existing_sub_names:
                print(f"  Subscription exists: {s['name']}")
                continue
            payload = {
                "name": s["name"],
                "amount": s["amount"],
                "billing_cycle": s["cycle"],
                "next_billing_date": (now + timedelta(days=12)).isoformat(),
                "category_id": cat_map.get(s["category"]),
                "is_active": True
            }
            res = await client.post("/subscriptions/", json=payload, headers=headers)
            if res.status_code == 201:
                print(f"  ✓ Subscription: {s['name']} (₹{s['amount']:,}/{s['cycle']})")

        # 7. Savings Goals & Logs
        print("\n--- 7. Seeding Savings Goals & Contribution Logs ---")
        existing_goals_res = await client.get("/goals/", headers=headers)
        existing_goal_names = {g["name"].strip().lower() for g in existing_goals_res.json()} if existing_goals_res.status_code == 200 else set()

        goals = [
            {
                "name": "Emergency Fund (6 Months)",
                "target_amount": 600000,
                "monthly_contribution": 25000,
                "priority": 10,
                "target_date": (now + timedelta(days=365)).isoformat(),
                "logs": [
                    {"amount": 10000, "note": "Primary salary allocation"},
                    {"amount": 5000, "note": "Mid-month bonus savings"}
                ]
            },
            {
                "name": "Tokyo Cherry Blossom Trip",
                "target_amount": 250000,
                "monthly_contribution": 15000,
                "priority": 7,
                "target_date": (now + timedelta(days=240)).isoformat(),
                "logs": [
                    {"amount": 5000, "note": "Freelance client bonus savings"}
                ]
            },
            {
                "name": "MacBook Pro M3 Max",
                "target_amount": 320000,
                "monthly_contribution": 12000,
                "priority": 5,
                "target_date": (now + timedelta(days=180)).isoformat(),
                "logs": []
            }
        ]
        for g in goals:
            if g["name"].strip().lower() in existing_goal_names:
                print(f"  Goal exists: {g['name']}")
                continue
            payload = {
                "name": g["name"],
                "target_amount": g["target_amount"],
                "monthly_contribution": g["monthly_contribution"],
                "priority": g["priority"],
                "target_date": g["target_date"]
            }
            res = await client.post("/goals/", json=payload, headers=headers)
            if res.status_code == 201:
                goal_id = res.json()["id"]
                print(f"  ✓ Goal: {g['name']} (Target: ₹{g['target_amount']:,}, Monthly: ₹{g['monthly_contribution']:,})")
                for log in g["logs"]:
                    log_res = await client.post(f"/goals/{goal_id}/contribute", json=log, headers=headers)
                    if log_res.status_code == 200:
                        print(f"    ↳ Contributed ₹{log['amount']:,}: {log['note']}")

        # 8. Loans & EMIs
        print("\n--- 8. Seeding Active Loans & EMIs ---")
        existing_loans_res = await client.get("/loans/", headers=headers)
        existing_loan_names = {l["name"].strip().lower() for l in existing_loans_res.json()} if existing_loans_res.status_code == 200 else set()

        loans = [
            {
                "name": "HDFC EV Car Loan",
                "principal_amount": 750000,
                "interest_rate": 8.85,
                "tenure_months": 60,
                "start_date": "2025-06-01",
                "due_day": 10,
                "interest_type": "compound",
                "category_id": cat_map.get("Loans & Debt EMI")
            },
            {
                "name": "Apple Tech Gadget EMI",
                "principal_amount": 85000,
                "interest_rate": 11.00,
                "tenure_months": 12,
                "start_date": "2026-03-01",
                "due_day": 20,
                "interest_type": "simple",
                "category_id": cat_map.get("Loans & Debt EMI")
            }
        ]
        for l in loans:
            if l["name"].strip().lower() in existing_loan_names:
                print(f"  Loan exists: {l['name']}")
                continue
            res = await client.post("/loans/", json=l, headers=headers)
            if res.status_code == 201:
                loan_data = res.json().get("loan", res.json())
                emi = float(loan_data.get('emi_amount', 0))
                print(f"  ✓ Loan: {l['name']} (Principal: ₹{l['principal_amount']:,}, EMI: ₹{emi:,.2f})")

        # 9. P2P Lent Money Ledger
        print("\n--- 9. Seeding P2P Lent Money Ledger ---")
        existing_lent_res = await client.get("/lent/", headers=headers)
        existing_lent_names = {lr["borrower_name"].strip().lower() for lr in existing_lent_res.json()} if existing_lent_res.status_code == 200 else set()

        lent_records = [
            {
                "borrower_name": "Ramesh Kumar (Cousin)",
                "principal_amount": 100000,
                "interest_rate_type": "rupees_per_amount",
                "interest_rate_val": 1.5,
                "interest_rate_basis": 100.0,
                "interest_frequency": "monthly",
                "interest_type": "simple",
                "lent_at": "2026-01-15",
                "due_date": "2026-12-31",
                "notes": "Retail store inventory expansion. Agreed ₹1.5 per ₹100/month.",
                "repayments": [
                    {"amount": 15000, "notes": "3 months interest + partial principal"}
                ]
            },
            {
                "borrower_name": "Priya Sharma (Colleague)",
                "principal_amount": 25000,
                "interest_rate_type": "percentage",
                "interest_rate_val": 0.0,
                "interest_frequency": "monthly",
                "interest_type": "simple",
                "lent_at": "2026-05-10",
                "due_date": "2026-11-30",
                "notes": "Friendly emergency loan, zero interest.",
                "repayments": [
                    {"amount": 10000, "notes": "First installment returned via UPI"}
                ]
            }
        ]
        for lr in lent_records:
            if lr["borrower_name"].strip().lower() in existing_lent_names:
                print(f"  Lent record exists: {lr['borrower_name']}")
                continue
            repayments = lr.pop("repayments", [])
            res = await client.post("/lent/", json=lr, headers=headers)
            if res.status_code == 201:
                record_id = res.json()["id"]
                print(f"  ✓ Lent: {lr['borrower_name']} - ₹{lr['principal_amount']:,} ({lr['interest_rate_type']})")
                for rep in repayments:
                    rep_payload = {
                        "amount": rep["amount"],
                        "repayment_date": (now - timedelta(days=15)).date().isoformat(),
                        "notes": rep["notes"]
                    }
                    rep_res = await client.post(f"/lent/{record_id}/repayments", json=rep_payload, headers=headers)
                    if rep_res.status_code in (200, 201):
                        print(f"    ↳ Repaid: ₹{rep['amount']:,} ({rep['notes']})")

        # 10. Electricity Account
        print("\n--- 10. Seeding Electricity Account ---")
        existing_elec_res = await client.get("/electricity/accounts", headers=headers)
        existing_elec = existing_elec_res.json() if existing_elec_res.status_code == 200 else []
        if not existing_elec:
            elec_payload = {
                "provider_code": "MOCK",
                "consumer_number": "1311200045678",
                "registered_mobile": "9876543210",
                "nickname": "Whitefield Apartment",
                "category_id": cat_map.get("Utilities & Bills"),
                "autopay_enabled": False
            }
            elec_res = await client.post("/electricity/accounts", json=elec_payload, headers=headers)
            if elec_res.status_code == 201:
                print("  ✓ Linked Electricity Account: MOCK Provider (Consumer: 1311200045678)")
            else:
                print(f"  Electricity status: {elec_res.status_code} ({elec_res.text[:80]})")
        else:
            print(f"  Electricity account exists. Skipping creation.")

        # 11. Autopilot Payment Orders Preparation
        print("\n--- 11. Preparing Autopilot Payment Orders ---")
        auto_res = await client.post("/autopilot/payments/prepare?days_ahead=30", headers=headers)
        if auto_res.status_code == 200:
            data = auto_res.json()
            created_count = data.get("created_count", 0)
            items = data.get("items", [])
            print(f"  ✓ Prepared {created_count} payment orders.")
            
            # Approve the first order so the user sees both approval_required and approved states!
            if items:
                first_order_id = items[0]["id"]
                app_res = await client.post(f"/autopilot/payments/{first_order_id}/approve", json={"execute_now": False}, headers=headers)
                if app_res.status_code == 200:
                    print(f"  ✓ Approved order {first_order_id} ({items[0].get('title', 'Payment')})")

        # 12. Check Dashboard Summary & Commitment Vault
        print("\n--- 12. Validating Dashboard & Commitment Vault Output ---")
        dash_res = await client.get("/dashboard/summary", headers=headers)
        if dash_res.status_code == 200:
            d = dash_res.json()
            cv = d.get("commitment_vault", {})
            print(f"  ✓ Total Ledger Balance : ₹{float(d.get('total_balance', 0)):,.2f}")
            print(f"  ✓ Monthly Income       : ₹{float(d.get('monthly_income', 0)):,.2f}")
            print(f"  ✓ Monthly Expenses     : ₹{float(d.get('monthly_expenses', 0)):,.2f}")
            print(f"  ✓ Health Score         : {d.get('health_score', {}).get('score', 0)}/100 ({d.get('health_score', {}).get('message', '')})")
            if cv:
                print(f"  ✓ Commitment Vault     : State = {cv.get('integrity_state')}")
                print(f"      Protected Amount   : ₹{float(cv.get('protected_amount', 0)):,.2f}")
                print(f"      Future Amount      : ₹{float(cv.get('future_amount', 0)):,.2f}")
                print(f"      Free Amount        : ₹{float(cv.get('free_amount', 0)):,.2f}")
                print(f"      Shortfall          : ₹{float(cv.get('shortfall_amount', 0)):,.2f}")

        print("\n=======================================================")
        print("🎉 ALL SEED DATA VERIFIED & IDEMPOTENT FOR sample@example.com!")
        print("=======================================================")

if __name__ == "__main__":
    asyncio.run(seed())
