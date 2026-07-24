import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import encrypt_secret
from app.db.models.api_key import ExchangeApiKey
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import ApiKeyIn, ApiKeyOut

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExchangeApiKey).where(ExchangeApiKey.user_id == user.id))
    return result.scalars().all()


@router.post("/api-keys", response_model=ApiKeyOut, status_code=201)
async def add_api_key(payload: ApiKeyIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key = ExchangeApiKey(
        user_id=user.id,
        label=payload.label,
        encrypted_api_key=encrypt_secret(payload.api_key),
        encrypted_api_secret=encrypt_secret(payload.api_secret),
        read_only=payload.read_only,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key


@router.delete("/api-keys/{key_id}", status_code=204)
async def delete_api_key(key_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExchangeApiKey).where(ExchangeApiKey.id == key_id, ExchangeApiKey.user_id == user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    await db.execute(delete(ExchangeApiKey).where(ExchangeApiKey.id == key_id))
    await db.commit()
