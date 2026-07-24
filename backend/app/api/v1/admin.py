import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.models.audit_log import AuditLog
from app.db.models.signal import Signal
from app.db.models.subscription import Subscription
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
async def list_users(limit: int = 100, _: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(limit))
    return result.scalars().all()


@router.patch("/users/{user_id}/toggle-active", response_model=UserOut)
async def toggle_user_active(user_id: uuid.UUID, _: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/subscriptions")
async def list_subscriptions(_: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subscription).order_by(Subscription.started_at.desc()).limit(200))
    return result.scalars().all()


@router.get("/signals/stats")
async def signal_stats(_: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Signal).order_by(Signal.created_at.desc()).limit(500))
    signals = result.scalars().all()
    return {
        "total": len(signals),
        "average_confidence": round(sum(float(s.confidence_score) for s in signals) / len(signals), 2) if signals else 0,
        "by_status": {status.value: sum(1 for s in signals if s.status == status) for status in {s.status for s in signals}},
    }


@router.get("/audit-logs")
async def list_audit_logs(limit: int = 200, _: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
    return result.scalars().all()
