"""Admin panel backend: dashboard, users, strategies, models, backtests,
provider/system health, signal engine pause/resume, audit logs.

Every mutating admin action that changes durable state records an
AuditLog row so corrections are traceable and never silent.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.dynamic_config import (
    get_confidence_thresholds,
    is_signal_engine_paused,
    set_confidence_thresholds,
    set_signal_engine_paused,
)
from app.db.session import AsyncSessionLocal, get_db
from app.models.asset import Asset
from app.models.backtest import BacktestRun
from app.models.enums import BacktestStatus, SignalResult, SignalStatus
from app.models.model_version import ModelVersion
from app.models.signal import Signal
from app.models.strategy import Strategy
from app.models.system import AuditLog
from app.models.user import User
from app.schemas.admin import (
    AdminStrategyUpdateRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
    AuditLogResponse,
    ConfidenceThresholdsRequest,
    DashboardResponse,
    ModelTrainRequest,
    ModelVersionResponse,
    ProviderHealthResponse,
)
from app.schemas.backtest import BacktestCreateRequest, BacktestResponse
from app.schemas.strategy import StrategyResponse
from app.services.backtest.runner import execute_backtest_run
from app.services.market_data.manager import market_data_manager
from app.services.ml.runner import train_model_for

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(
    session: AsyncSession,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str,
    previous: dict | None,
    new: dict | None,
) -> None:
    session.add(
        AuditLog(
            user_id=user.id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            previous_value_json=previous,
            new_value_json=new,
            created_at=datetime.now(timezone.utc),
        )
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)) -> DashboardResponse:
    total_users = (await session.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await session.execute(select(func.count(User.id)).where(User.is_active.is_(True)))).scalar_one()
    total_signals = (await session.execute(select(func.count(Signal.id)))).scalar_one()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    signals_today = (
        await session.execute(select(func.count(Signal.id)).where(Signal.generated_at >= today_start))
    ).scalar_one()

    completed = (
        (await session.execute(select(Signal.result).where(Signal.status == SignalStatus.COMPLETED))).scalars().all()
    )
    wins = sum(1 for r in completed if r == SignalResult.WIN)
    win_rate = round(wins / len(completed) * 100, 2) if completed else 0.0

    provider = market_data_manager.active
    return DashboardResponse(
        total_users=total_users,
        active_users=active_users,
        total_signals=total_signals,
        signals_today=signals_today,
        win_rate=win_rate,
        signal_engine_paused=await is_signal_engine_paused(),
        active_provider=provider.name,
        provider_connected=provider.health.connected,
    )


@router.get("/system-health")
async def system_health(admin: User = Depends(require_admin)) -> dict:
    provider = market_data_manager.active
    return {
        "provider": provider.name,
        "using_fallback": market_data_manager.using_fallback,
        "connected": provider.health.connected,
        "latency_ms": provider.health.latency_ms,
        "reconnect_count": provider.health.reconnect_count,
        "signal_engine_paused": await is_signal_engine_paused(),
    }


@router.get("/provider-health", response_model=ProviderHealthResponse)
async def provider_health(admin: User = Depends(require_admin)) -> ProviderHealthResponse:
    provider = market_data_manager.active
    return ProviderHealthResponse(
        active_provider=provider.name,
        using_fallback=market_data_manager.using_fallback,
        connected=provider.health.connected,
        latency_ms=provider.health.latency_ms,
        last_tick_at=provider.health.last_tick_at,
        reconnect_count=provider.health.reconnect_count,
        is_delayed=provider.health.is_delayed,
        last_error=provider.health.last_error,
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    page: int = 1, page_size: int = 25, admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> list[User]:
    result = await session.execute(
        select(User).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all())


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> User:
    target = await session.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    previous = {
        "is_active": target.is_active,
        "role": target.role.value,
        "subscription_plan": target.subscription_plan.value,
    }
    if payload.is_active is not None:
        target.is_active = payload.is_active
    if payload.role is not None:
        target.role = payload.role
    if payload.subscription_plan is not None:
        target.subscription_plan = payload.subscription_plan
    new = {
        "is_active": target.is_active,
        "role": target.role.value,
        "subscription_plan": target.subscription_plan.value,
    }
    _audit(session, admin, "update_user", "user", str(target.id), previous, new)
    await session.commit()
    await session.refresh(target)
    return target


@router.get("/strategies", response_model=list[StrategyResponse])
async def admin_list_strategies(
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> list[Strategy]:
    result = await session.execute(select(Strategy).order_by(Strategy.name))
    return list(result.scalars().all())


@router.patch("/strategies/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: str,
    payload: AdminStrategyUpdateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> Strategy:
    strategy = await session.get(Strategy, strategy_id)
    if strategy is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    previous = {"is_enabled": strategy.is_enabled, "configuration_json": strategy.configuration_json}
    if payload.is_enabled is not None:
        strategy.is_enabled = payload.is_enabled
    if payload.configuration_json is not None:
        strategy.configuration_json = {**strategy.configuration_json, **payload.configuration_json}
    new = {"is_enabled": strategy.is_enabled, "configuration_json": strategy.configuration_json}
    _audit(session, admin, "update_strategy", "strategy", str(strategy.id), previous, new)
    await session.commit()
    await session.refresh(strategy)
    return strategy


@router.post("/strategies/{strategy_id}/activate", response_model=StrategyResponse)
async def activate_strategy(
    strategy_id: str, admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> Strategy:
    strategy = await session.get(Strategy, strategy_id)
    if strategy is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    _audit(
        session,
        admin,
        "activate_strategy",
        "strategy",
        str(strategy.id),
        {"is_enabled": strategy.is_enabled},
        {"is_enabled": True},
    )
    strategy.is_enabled = True
    await session.commit()
    await session.refresh(strategy)
    return strategy


@router.post("/strategies/{strategy_id}/deactivate", response_model=StrategyResponse)
async def deactivate_strategy(
    strategy_id: str, admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> Strategy:
    strategy = await session.get(Strategy, strategy_id)
    if strategy is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    _audit(
        session,
        admin,
        "deactivate_strategy",
        "strategy",
        str(strategy.id),
        {"is_enabled": strategy.is_enabled},
        {"is_enabled": False},
    )
    strategy.is_enabled = False
    await session.commit()
    await session.refresh(strategy)
    return strategy


@router.patch("/settings/confidence-thresholds")
async def update_confidence_thresholds(
    payload: ConfidenceThresholdsRequest, admin: User = Depends(require_admin)
) -> dict:
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    return await set_confidence_thresholds(updates)


@router.get("/settings/confidence-thresholds")
async def get_thresholds(admin: User = Depends(require_admin)) -> dict:
    return await get_confidence_thresholds()


async def _run_backtest_in_background(backtest_id) -> None:
    async with AsyncSessionLocal() as session:
        await execute_backtest_run(session, backtest_id)


@router.post("/backtests", response_model=BacktestResponse, status_code=status.HTTP_202_ACCEPTED)
async def admin_create_backtest(
    payload: BacktestCreateRequest,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
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
    background_tasks.add_task(_run_backtest_in_background, run.id)
    return run


@router.get("/models", response_model=list[ModelVersionResponse])
async def list_models(
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> list[ModelVersion]:
    result = await session.execute(select(ModelVersion).order_by(ModelVersion.created_at.desc()))
    return list(result.scalars().all())


async def _train_model_in_background(asset_id, strategy_id, timeframe: str, expiry_seconds: int) -> None:
    async with AsyncSessionLocal() as session:
        await train_model_for(session, asset_id, strategy_id, timeframe, expiry_seconds)


@router.post("/models/train", status_code=status.HTTP_202_ACCEPTED)
async def train_model(
    payload: ModelTrainRequest, background_tasks: BackgroundTasks, admin: User = Depends(require_admin)
) -> dict:
    background_tasks.add_task(
        _train_model_in_background, payload.asset_id, payload.strategy_id, payload.timeframe, payload.expiry_seconds
    )
    return {"status": "training_started"}


@router.post("/models/{model_id}/activate", response_model=ModelVersionResponse)
async def activate_model(
    model_id: str, admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> ModelVersion:
    model = await session.get(ModelVersion, model_id)
    if model is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Model not found")
    others = await session.execute(
        select(ModelVersion).where(
            ModelVersion.asset_id == model.asset_id,
            ModelVersion.strategy_id == model.strategy_id,
            ModelVersion.is_active.is_(True),
        )
    )
    for other in others.scalars().all():
        other.is_active = False
    model.is_active = True
    _audit(session, admin, "activate_model", "model_version", str(model.id), None, {"is_active": True})
    await session.commit()
    await session.refresh(model)
    return model


@router.post("/models/{model_id}/deactivate", response_model=ModelVersionResponse)
async def deactivate_model(
    model_id: str, admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> ModelVersion:
    model = await session.get(ModelVersion, model_id)
    if model is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Model not found")
    model.is_active = False
    _audit(session, admin, "deactivate_model", "model_version", str(model.id), None, {"is_active": False})
    await session.commit()
    await session.refresh(model)
    return model


@router.post("/signals/pause")
async def pause_signals(admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)) -> dict:
    await set_signal_engine_paused(True)
    _audit(session, admin, "pause_signal_engine", "system", "signal_engine", None, {"paused": True})
    await session.commit()
    return {"signal_engine_paused": True}


@router.post("/signals/resume")
async def resume_signals(admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)) -> dict:
    await set_signal_engine_paused(False)
    _audit(session, admin, "resume_signal_engine", "system", "signal_engine", None, {"paused": False})
    await session.commit()
    return {"signal_engine_paused": False}


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def audit_logs(
    page: int = 1, page_size: int = 50, admin: User = Depends(require_admin), session: AsyncSession = Depends(get_db)
) -> list[AuditLog]:
    result = await session.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all())
