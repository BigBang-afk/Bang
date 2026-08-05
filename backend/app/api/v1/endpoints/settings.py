from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.core.security import encrypt_secret

router = APIRouter(prefix="/settings", tags=["settings"])


class ApiKeyUpdate(BaseModel):
    mexc_api_key: str
    mexc_api_secret: str


@router.put("/mexc-api-key")
async def set_mexc_api_key(payload: ApiKeyUpdate, user: CurrentUser, db: DbSession):
    """Stores the user's MEXC API credentials encrypted at rest (Fernet/AES).
    Required only for private trading endpoints -- all market data, scanning,
    and signal generation works with zero API keys via public endpoints."""
    user.mexc_api_key_encrypted = encrypt_secret(payload.mexc_api_key)
    user.mexc_api_secret_encrypted = encrypt_secret(payload.mexc_api_secret)
    await db.commit()
    return {"status": "saved"}


@router.get("/profile")
async def profile(user: CurrentUser):
    return {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_2fa_enabled": user.is_2fa_enabled,
        "has_mexc_keys": bool(user.mexc_api_key_encrypted),
    }
