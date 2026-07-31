"""Authentication API: register/login/refresh/me, lockout, and permission
boundaries (regular users cannot reach admin endpoints)."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.main import app
from tests.conftest import TEST_DATABASE_URL, requires_db


@pytest.fixture(autouse=True)
async def _reset_schema():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


@pytest.fixture
def _override_db():
    from app.db.session import get_db

    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def _get_db_override():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db_override
    yield
    app.dependency_overrides.clear()


@requires_db
@pytest.mark.asyncio
async def test_register_login_me_flow(_override_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        register_response = await client.post(
            "/api/v1/auth/register",
            json={"full_name": "Test User", "email": "user@example.com", "password": "StrongPass123!"},
        )
        assert register_response.status_code == 201
        body = register_response.json()
        assert "password" not in body
        assert "password_hash" not in body

        login_response = await client.post(
            "/api/v1/auth/login", json={"email": "user@example.com", "password": "StrongPass123!"}
        )
        assert login_response.status_code == 200
        tokens = login_response.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens

        me_response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "user@example.com"


@requires_db
@pytest.mark.asyncio
async def test_wrong_password_is_rejected(_override_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={"full_name": "Test User", "email": "user2@example.com", "password": "StrongPass123!"},
        )
        response = await client.post(
            "/api/v1/auth/login", json={"email": "user2@example.com", "password": "WrongPassword!"}
        )
        assert response.status_code == 401


@requires_db
@pytest.mark.asyncio
async def test_account_locks_after_repeated_failed_logins(_override_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={"full_name": "Test User", "email": "user3@example.com", "password": "StrongPass123!"},
        )
        for _ in range(5):
            await client.post("/api/v1/auth/login", json={"email": "user3@example.com", "password": "WrongPassword!"})
        response = await client.post(
            "/api/v1/auth/login", json={"email": "user3@example.com", "password": "StrongPass123!"}
        )
        assert response.status_code == 423


@requires_db
@pytest.mark.asyncio
async def test_regular_user_cannot_access_admin_endpoints(_override_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={"full_name": "Regular User", "email": "regular@example.com", "password": "StrongPass123!"},
        )
        login_response = await client.post(
            "/api/v1/auth/login", json={"email": "regular@example.com", "password": "StrongPass123!"}
        )
        token = login_response.json()["access_token"]

        response = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_no_endpoint_requires_or_returns_a_quotex_password_or_session():
    """Structural guard: no request/response schema anywhere in the OpenAPI
    spec references a Quotex password, session id, or cookie - the platform
    must never ask for or store third-party trading-platform credentials."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/openapi.json")
        assert response.status_code == 200
        spec_text = response.text.lower()
        for forbidden in ("quotex_password", "quotex_session", "quotex_cookie", "trading_platform_password"):
            assert forbidden not in spec_text


@pytest.mark.asyncio
async def test_market_data_api_keys_never_appear_in_the_api_surface():
    """API keys must never reach the frontend: they must not appear in the
    OpenAPI schema, nor be returned by any documented response field."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/openapi.json")
        spec_text = response.text.lower()
        for forbidden in ("twelve_data_api_key", "api_key", "apikey"):
            assert forbidden not in spec_text
