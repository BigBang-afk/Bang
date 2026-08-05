from fastapi import APIRouter

from app.risk.position_sizing import PositionSizeRequest, PositionSizeResult, calculate_position_size

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/position-size", response_model=PositionSizeResult)
async def position_size(payload: PositionSizeRequest) -> PositionSizeResult:
    return calculate_position_size(payload)
