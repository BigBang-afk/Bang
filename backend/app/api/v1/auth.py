"""Authentication endpoints: register, login, refresh, logout, me.

Security notes:
* Passwords are hashed with Argon2 (never logged, never returned).
* Refresh tokens rotate on every use and only their Argon2 hash is stored.
* Failed logins increment a counter and lock the account for 15 minutes
  after 5 consecutive failures.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
    verify_token_hash,
)
from app.db.session import get_db
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db)) -> User:
    existing = (await session.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        timezone=payload.timezone,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _issue_tokens(session: AsyncSession, user: User) -> TokenResponse:
    access_token = create_access_token(str(user.id), user.role.value)
    raw_refresh, jti, expires_at = create_refresh_token(str(user.id))
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            jti=jti,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = (await session.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        raise HTTPException(status.HTTP_423_LOCKED, "Account temporarily locked due to failed login attempts")

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    user.failed_login_attempts = 0
    user.locked_until = None
    await session.commit()
    return await _issue_tokens(session, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, session: AsyncSession = Depends(get_db)) -> TokenResponse:
    from app.core.security import decode_token

    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    token_row = (
        await session.execute(select(RefreshToken).where(RefreshToken.jti == decoded["jti"]))
    ).scalar_one_or_none()
    if (
        token_row is None
        or token_row.revoked_at is not None
        or token_row.expires_at < datetime.now(timezone.utc)
        or not verify_token_hash(payload.refresh_token, token_row.token_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid, expired, or revoked")

    # Rotate: revoke the used token and issue a brand new pair.
    token_row.revoked_at = datetime.now(timezone.utc)
    user = (await session.execute(select(User).where(User.id == token_row.user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    await session.commit()
    return await _issue_tokens(session, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def logout(payload: RefreshRequest, session: AsyncSession = Depends(get_db)) -> None:
    from app.core.security import decode_token

    decoded = decode_token(payload.refresh_token)
    if decoded and decoded.get("type") == "refresh":
        token_row = (
            await session.execute(select(RefreshToken).where(RefreshToken.jti == decoded["jti"]))
        ).scalar_one_or_none()
        if token_row is not None:
            token_row.revoked_at = datetime.now(timezone.utc)
            await session.commit()


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)) -> User:
    return user
