"""
Utility script to manually link an existing WealthSync user to a Firebase UID.
Usage:
    python backend/scripts/link_firebase_user.py sample@example.com <FIREBASE_UID>
"""

import sys
import asyncio
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def link_user(email: str, firebase_uid: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).filter(User.email == email))
        user = result.scalars().first()
        if not user:
            print(f"[ERROR] User with email '{email}' not found in database.")
            return False

        user.firebase_uid = firebase_uid
        await db.commit()
        await db.refresh(user)
        print(f"[SUCCESS] Linked user '{user.email}' (ID: {user.id}) to Firebase UID '{user.firebase_uid}'.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python backend/scripts/link_firebase_user.py <email> <firebase_uid>")
        sys.exit(1)
    
    email_arg = sys.argv[1].strip()
    uid_arg = sys.argv[2].strip()
    success = asyncio.run(link_user(email_arg, uid_arg))
    sys.exit(0 if success else 1)
