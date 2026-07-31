from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import AsyncSessionLocal, get_db
from app.models.asset import Asset
from app.models.backtest import BacktestRun
from app.models.enums import BacktestStatus
from app.models.strategy import Strategy
from app.models.user import User
from app.schemas.backtest import BacktestCreateRequest, BacktestResponse
from app.services.backtest.runner import execute_backtest_run

router = APIRouter(prefix="/backtests", tags=["backtests"])


async def _run_in_background(backtest_id) -> None:
    async with AsyncSessionLocal() as session:
        await execute_backtest_run(session, backtest_id)


@router.post("", response_model=BacktestResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_backtest(
    payload: BacktestCreateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> BacktestRun:
    strategy = await session.get(Strategy, payload.strategy_id)
    asset = await session.get(Asset, payload.asset_id)
    if strategy is None or asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy or asset not found")

    run = BacktestRun(
        strategy_id=strategy.id,
        asset_id=asset.id,
        timeframe=payload.timeframe,
        expiry_seconds=payload.expiry_seconds,
        configuration_json={
            "start": payload.start.isoformat(),
            "end": payload.end.isoformat(),
            "payout_ratio": payload.payout_ratio,
        },
        metrics_json={},
        status=BacktestStatus.PENDING,
        created_at=datetime.now(timezone.utc),
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)

    background_tasks.add_task(_run_in_background, run.id)
    return run


@router.get("", response_model=list[BacktestResponse])
async def list_backtests(
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> list[BacktestRun]:
    result = await session.execute(select(BacktestRun).order_by(BacktestRun.created_at.desc()).limit(100))
    return list(result.scalars().all())


@router.get("/{backtest_id}", response_model=BacktestResponse)
async def get_backtest(
    backtest_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> BacktestRun:
    run = await session.get(BacktestRun, backtest_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Backtest run not found")
    return run
