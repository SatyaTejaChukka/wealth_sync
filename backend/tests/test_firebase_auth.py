import base64
import json
import pytest
from unittest.mock import patch
from httpx import AsyncClient
from sqlalchemy.future import select

from app.models.user import User
from app.models.budget import BudgetCategory

def make_dummy_firebase_token(payload: dict) -> str:
    header = {"alg": "RS256", "typ": "JWT"}
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    s_b64 = base64.urlsafe_b64encode(b"signature").decode().rstrip("=")
    return f"{h_b64}.{p_b64}.{s_b64}"


@pytest.mark.asyncio
async def test_firebase_jit_user_provisioning(client: AsyncClient, db_session):
    """
    Test that a valid Firebase ID token JIT-provisions the user in PostgreSQL
    and seeds default budget categories.
    """
    mock_payload = {
        "uid": "fb-uid-new-user-123",
        "sub": "fb-uid-new-user-123",
        "iss": "https://securetoken.google.com/test-project",
        "email": "firebase_user@example.com",
        "name": "Firebase User",
        "picture": "https://example.com/avatar.jpg"
    }
    dummy_token = make_dummy_firebase_token(mock_payload)

    with patch("app.api.deps.verify_firebase_id_token", return_value=mock_payload):
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {dummy_token}"
        })
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["email"] == "firebase_user@example.com"
        assert data["full_name"] == "Firebase User"
        assert data["avatar_url"] == "https://example.com/avatar.jpg"

    # Verify user exists in database
    result = await db_session.execute(select(User).filter(User.firebase_uid == "fb-uid-new-user-123"))
    user = result.scalars().first()
    assert user is not None
    assert user.email == "firebase_user@example.com"

    # Verify default categories were seeded
    cat_result = await db_session.execute(select(BudgetCategory).filter(BudgetCategory.user_id == user.id))
    categories = cat_result.scalars().all()
    assert len(categories) >= 5
    cat_names = {c.name for c in categories}
    assert "Salary" in cat_names
    assert "Housing" in cat_names


@pytest.mark.asyncio
async def test_firebase_existing_user_linking(client: AsyncClient, db_session):
    """
    Test that an existing local user is automatically linked to their Firebase UID
    when logging in with the same email.
    """
    # 1. Create existing user with local password
    existing_user = User(
        id="local-uuid-existing-user",
        email="existing@example.com",
        password_hash="somehash",
        firebase_uid=None,
        is_active=True
    )
    db_session.add(existing_user)
    await db_session.commit()

    mock_payload = {
        "uid": "fb-uid-linked-999",
        "sub": "fb-uid-linked-999",
        "iss": "https://securetoken.google.com/test-project",
        "email": "existing@example.com",
        "name": "Linked Existing User",
        "picture": "https://example.com/linked.png"
    }
    dummy_token = make_dummy_firebase_token(mock_payload)

    with patch("app.api.deps.verify_firebase_id_token", return_value=mock_payload):
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {dummy_token}"
        })
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["id"] == "local-uuid-existing-user"
        assert data["email"] == "existing@example.com"

    # Verify the user record kept original ID and updated firebase_uid
    await db_session.refresh(existing_user)
    assert existing_user.id == "local-uuid-existing-user"
    assert existing_user.firebase_uid == "fb-uid-linked-999"
    assert existing_user.full_name == "Linked Existing User"


@pytest.mark.asyncio
async def test_firebase_account_linking_conflict_rejected(client: AsyncClient, db_session):
    """
    Test that attempting to link an account already linked to another Firebase UID is rejected with 409 Conflict.
    """
    existing_user = User(
        id="local-uuid-conflict-user",
        email="conflict@example.com",
        password_hash="somehash",
        firebase_uid="original-fb-uid-111",
        is_active=True
    )
    db_session.add(existing_user)
    await db_session.commit()

    mock_payload = {
        "uid": "new-intruder-fb-uid-222",
        "sub": "new-intruder-fb-uid-222",
        "iss": "https://securetoken.google.com/test-project",
        "email": "conflict@example.com",
        "name": "Intruder User",
        "email_verified": True
    }
    dummy_token = make_dummy_firebase_token(mock_payload)

    with patch("app.api.deps.verify_firebase_id_token", return_value=mock_payload):
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {dummy_token}"
        })
        assert response.status_code == 409
        assert "already linked" in response.json()["detail"]


@pytest.mark.asyncio
async def test_firebase_unverified_email_linking_rejected_in_prod(client: AsyncClient, db_session):
    """
    Test that in production, attempting to link an existing user with an unverified email is rejected with 400.
    """
    existing_user = User(
        id="local-uuid-unverified-user",
        email="unverified@example.com",
        password_hash="somehash",
        firebase_uid=None,
        is_active=True
    )
    db_session.add(existing_user)
    await db_session.commit()

    mock_payload = {
        "uid": "fb-uid-unverified-333",
        "sub": "fb-uid-unverified-333",
        "iss": "https://securetoken.google.com/test-project",
        "email": "unverified@example.com",
        "name": "Unverified User",
        "email_verified": False
    }
    dummy_token = make_dummy_firebase_token(mock_payload)

    with patch("app.api.deps.settings.ENVIRONMENT", "production"):
        with patch("app.api.deps.verify_firebase_id_token", return_value=mock_payload):
            response = await client.get("/api/v1/auth/me", headers={
                "Authorization": f"Bearer {dummy_token}"
            })
            assert response.status_code == 400
            assert "unverified email" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_firebase_token_rejected_when_project_id_unconfigured():
    """
    Test that verify_firebase_id_token fails closed and returns None if FIREBASE_PROJECT_ID is not configured.
    """
    from app.api.deps import verify_firebase_id_token
    with patch("app.api.deps.settings.FIREBASE_PROJECT_ID", None):
        result = verify_firebase_id_token("dummy.jwt.token")
        assert result is None

