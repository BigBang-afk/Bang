from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.strategy import Strategy
from app.models.user import User
from app.models.user_preference import UserStrategyPreference
from app.schemas.strategy import StrategyPreferenceRequest, StrategyPreferenceResponse, StrategyResponse

router = APIRouter(tags=["strategies"])


@router.get("/strategies", response_model=list[StrategyResponse])
async def list_strategies(session: AsyncSession = Depends(get_db)) -> list[Strategy]:
    result = await session.execute(select(Strategy).order_by(Strategy.name))
    return list(result.scalars().all())


@router.get("/strategies/{strategy_code}", response_model=StrategyResponse)
async def get_strategy(strategy_code: str, session: AsyncSession = Depends(get_db)) -> Strategy:
    result = await session.execute(select(Strategy).where(Strategy.strategy_code == strategy_code))
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    return strategy


@router.post("/users/me/strategy-preference", response_model=StrategyPreferenceResponse)
async def set_strategy_preference(
    payload: StrategyPreferenceRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> UserStrategyPreference:
    result = await session.execute(select(UserStrategyPreference).where(UserStrategyPreference.user_id == user.id))
    pref = result.scalar_one_or_none()
    if pref is None:
        pref = UserStrategyPreference(user_id=user.id, updated_at=datetime.now(timezone.utc))
        session.add(pref)

    pref.selected_strategy_id = payload.selected_strategy_id
    pref.ai_auto_enabled = payload.ai_auto_enabled
    pref.selected_asset_id = payload.selected_asset_id
    pref.selected_timeframe = payload.selected_timeframe
    pref.selected_expiry_seconds = payload.selected_expiry_seconds
    pref.sound_enabled = payload.sound_enabled
    pref.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(pref)
    return pref
