import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import AdminUser, DbSession
from app.core.redis import cache_get_json
from app.db.models.signal import Signal
from app.db.models.trade import JournalEntry
from app.db.models.user import User, UserRole
from app.scanner.service import SCANNER_CACHE_KEY, SIGNALS_CACHE_KEY

router = APIRouter(prefix="/admin", tags=["admin"])


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: UserRole


@router.get("/users", response_model=list[UserOut])
async def list_users(_admin: AdminUser, db: DbSession):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def update_role(user_id: uuid.UUID, payload: RoleUpdate, _admin: AdminUser, db: DbSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
async def deactivate_user(user_id: uuid.UUID, _admin: AdminUser, db: DbSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/health")
async def system_health(_admin: AdminUser, db: DbSession):
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    journal_count = (await db.execute(select(func.count(JournalEntry.id)))).scalar_one()
    tickers = await cache_get_json(SCANNER_CACHE_KEY) or []
    signals = await cache_get_json(SIGNALS_CACHE_KEY) or []
    return {
        "database": "ok",
        "users": user_count,
        "journal_entries": journal_count,
        "scanner_pairs_cached": len(tickers),
        "active_signals_cached": len(signals),
    }


@router.get("/signals")
async def review_signals(_admin: AdminUser, db: DbSession):
    result = await db.execute(select(Signal).order_by(Signal.created_at.desc()).limit(100))
    return result.scalars().all()
