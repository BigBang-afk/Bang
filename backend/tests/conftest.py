"""Shared pytest fixtures.

DB-backed tests require a reachable PostgreSQL instance (TEST_DATABASE_URL
env var, defaulting to a local `quotex_signals_test` database) and Redis
(REDIS_URL, defaulting to localhost). Pure-logic tests (features,
strategies, filters, countdown math, candle aggregation, backtest engine,
ML pipeline) never touch the database and always run.
"""

import os

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.redis as redis_module
from app.db.base import Base
from app.db.seed_data import STRATEGIES
from app.models.asset import Asset
from app.models.enums import AssetType
from app.models.strategy import Strategy

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/quotex_signals_test"
)


def _db_available() -> bool:
    return os.environ.get("SKIP_DB_TESTS") != "1"


requires_db = pytest.mark.skipif(not _db_available(), reason="SKIP_DB_TESTS=1")


@pytest.fixture(autouse=True)
def _reset_redis_singleton():
    """The global Redis client is bound to an event loop; pytest-asyncio
    gives each test its own loop, so a stale client from a previous test
    would crash cross-loop. Force a fresh client per test instead."""
    redis_module._redis = None
    yield
    redis_module._redis = None


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def eurusd_asset(db_session):
    asset = Asset(
        symbol="EUR/USD",
        provider_symbol="EUR/USD",
        display_name="Euro / US Dollar",
        asset_type=AssetType.FOREX,
        pip_precision=5,
        is_enabled=True,
    )
    db_session.add(asset)
    await db_session.commit()
    await db_session.refresh(asset)
    return asset


@pytest_asyncio.fixture
async def seeded_strategies(db_session):
    rows = []
    for s in STRATEGIES:
        data = {k: v for k, v in s.items() if k != "risk_level"}
        data["configuration_json"] = {**data["configuration_json"], "risk_level": s["risk_level"]}
        strategy = Strategy(**data)
        db_session.add(strategy)
        rows.append(strategy)
    await db_session.commit()
    for row in rows:
        await db_session.refresh(row)
    return {row.strategy_code: row for row in rows}
