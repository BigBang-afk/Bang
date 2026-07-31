"""Idempotent seed script for assets and strategies.

Usage:
    python -m scripts.seed
"""

import asyncio

from sqlalchemy import select

from app.db.seed_data import ASSETS, STRATEGIES
from app.db.session import AsyncSessionLocal
from app.models.asset import Asset
from app.models.strategy import Strategy


async def seed_assets() -> None:
    async with AsyncSessionLocal() as session:
        for row in ASSETS:
            existing = (await session.execute(select(Asset).where(Asset.symbol == row["symbol"]))).scalar_one_or_none()
            if existing:
                existing.provider_symbol = row["provider_symbol"]
                existing.display_name = row["display_name"]
                existing.asset_type = row["asset_type"]
                existing.pip_precision = row["pip_precision"]
            else:
                session.add(Asset(**row))
        await session.commit()
        print(f"Seeded {len(ASSETS)} assets.")


async def seed_strategies() -> None:
    async with AsyncSessionLocal() as session:
        for row in STRATEGIES:
            data = {k: v for k, v in row.items() if k != "risk_level"}
            data["configuration_json"] = {**data["configuration_json"], "risk_level": row["risk_level"]}
            existing = (
                await session.execute(select(Strategy).where(Strategy.strategy_code == row["strategy_code"]))
            ).scalar_one_or_none()
            if existing:
                for key, value in data.items():
                    if key != "strategy_code":
                        setattr(existing, key, value)
            else:
                session.add(Strategy(**data))
        await session.commit()
        print(f"Seeded {len(STRATEGIES)} strategies.")


async def main() -> None:
    await seed_assets()
    await seed_strategies()


if __name__ == "__main__":
    asyncio.run(main())
