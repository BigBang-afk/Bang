from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.db.models.user import User
from app.schemas.risk import PositionSizeRequest, PositionSizeResponse
from app.services.risk_manager import calculate_position_size, RiskProfile

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/position-size", response_model=PositionSizeResponse)
async def position_size(payload: PositionSizeRequest, _: User = Depends(get_current_user)):
    profile = RiskProfile(
        account_size=payload.account_size,
        risk_per_trade_pct=payload.risk_per_trade_pct,
        max_daily_loss_pct=0,
        max_weekly_loss_pct=0,
        max_drawdown_pct=0,
        max_simultaneous_trades=0,
    )
    try:
        result = calculate_position_size(profile, payload.entry_price, payload.stop_loss_price, payload.take_profit_price)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PositionSizeResponse(
        risk_amount=result.risk_amount,
        stop_loss_distance=result.stop_loss_distance,
        quantity=result.quantity,
        position_value=result.position_value,
        risk_reward_ratio=result.risk_reward_ratio,
    )
