import asyncio
import sys
from collections import defaultdict
from sqlalchemy.future import select
from sqlalchemy import delete

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.bill import Bill
from app.models.loan import Loan
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.autopilot_payment import AutopilotPayment

EMAIL = "sample@example.com"

async def cleanup():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).filter(User.email == EMAIL))
        user = res.scalars().first()
        if not user:
            print(f"User {EMAIL} not found.")
            return

        print(f"Found user {EMAIL} (id: {user.id})")

        # 1. Deduplicate Bills
        b_res = await db.execute(select(Bill).filter(Bill.user_id == user.id).order_by(Bill.id))
        all_bills = b_res.scalars().all()
        seen_bill_names = {}
        bills_to_delete = []

        for b in all_bills:
            name_key = b.name.strip().lower()
            if name_key in seen_bill_names:
                bills_to_delete.append(b)
            else:
                seen_bill_names[name_key] = b

        print(f"Total bills found: {len(all_bills)}, duplicate bills to delete: {len(bills_to_delete)}")
        for b in bills_to_delete:
            print(f"  Deleting duplicate bill: {b.name} (id: {b.id})")
            # Relink or delete any transactions tied to the duplicate bill
            original_bill = seen_bill_names[b.name.strip().lower()]
            tx_res = await db.execute(select(Transaction).filter(Transaction.bill_id == b.id))
            for tx in tx_res.scalars().all():
                tx.bill_id = original_bill.id
                db.add(tx)
            
            # Delete autopilot payments for duplicate bill
            await db.execute(delete(AutopilotPayment).where(AutopilotPayment.source_type == "BILL", AutopilotPayment.source_id == b.id))
            await db.delete(b)

        # 2. Deduplicate Loans
        l_res = await db.execute(select(Loan).filter(Loan.user_id == user.id).order_by(Loan.id))
        all_loans = l_res.scalars().all()
        seen_loan_names = {}
        loans_to_delete = []

        for l in all_loans:
            name_key = l.name.strip().lower()
            if name_key in seen_loan_names:
                loans_to_delete.append(l)
            else:
                seen_loan_names[name_key] = l

        print(f"Total loans found: {len(all_loans)}, duplicate loans to delete: {len(loans_to_delete)}")
        for l in loans_to_delete:
            print(f"  Deleting duplicate loan: {l.name} (id: {l.id})")
            original_loan = seen_loan_names[l.name.strip().lower()]
            tx_res = await db.execute(select(Transaction).filter(Transaction.loan_id == l.id))
            for tx in tx_res.scalars().all():
                tx.loan_id = original_loan.id
                db.add(tx)
            await db.execute(delete(AutopilotPayment).where(AutopilotPayment.source_type == "LOAN", AutopilotPayment.source_id == l.id))
            await db.delete(l)

        # 3. Deduplicate Transactions
        t_res = await db.execute(select(Transaction).filter(Transaction.user_id == user.id).order_by(Transaction.occurred_at.desc(), Transaction.id))
        all_txs = t_res.scalars().all()
        seen_txs = set()
        txs_to_delete = []

        for tx in all_txs:
            # Key based on description, amount, type, date
            tx_key = (
                (tx.description or "").strip().lower(),
                float(tx.amount),
                tx.type,
                tx.occurred_at.date() if tx.occurred_at else None
            )
            if tx_key in seen_txs:
                txs_to_delete.append(tx)
            else:
                seen_txs.add(tx_key)

        print(f"Total transactions found: {len(all_txs)}, duplicate transactions to delete: {len(txs_to_delete)}")
        for tx in txs_to_delete:
            print(f"  Deleting duplicate transaction: {tx.description} (amount: {tx.amount}, id: {tx.id})")
            await db.delete(tx)

        await db.commit()
        print("✓ Cleanup and deduplication committed successfully!")

if __name__ == "__main__":
    asyncio.run(cleanup())
