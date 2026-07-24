import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token, decrypt_secret
from app.db.models.api_key import ExchangeApiKey
from app.db.models.user import User, UserRole
from app.db.session import get_db
from app.services.mexc_client import MexcClient

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_error

    try:
        user_id = uuid.UUID(payload.get("sub"))
    except (ValueError, TypeError):
        raise credentials_error

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_error

    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def get_user_mexc_client(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MexcClient:
    """Builds a MexcClient authenticated with the caller's decrypted API credentials.
    Falls back to a public (unauthenticated) client if none are configured yet."""
    result = await db.execute(
        select(ExchangeApiKey).where(ExchangeApiKey.user_id == user.id, ExchangeApiKey.is_active.is_(True))
    )
    key = result.scalars().first()
    if not key:
        return MexcClient()
    return MexcClient(api_key=decrypt_secret(key.encrypted_api_key), api_secret=decrypt_secret(key.encrypted_api_secret))
