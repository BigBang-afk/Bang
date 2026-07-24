from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    verify_password,
    verify_totp,
)
from app.db.models.audit_log import AuditLog
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import (
    Enable2FAResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    Verify2FARequest,
)
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


async def _log_action(db: AsyncSession, user_id, action: str, request: Request):
    db.add(AuditLog(user_id=user_id, action=action, ip_address=request.client.host if request.client else None))
    await db.commit()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password), full_name=payload.full_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await _log_action(db, user.id, "user.register", request)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    invalid_credentials = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user or not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    if user.totp_enabled:
        if not payload.totp_code or not verify_totp(user.totp_secret, payload.totp_code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing 2FA code")

    await _log_action(db, user.id, "user.login", request)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    subject = data["sub"]
    return TokenResponse(
        access_token=create_access_token(subject),
        refresh_token=create_refresh_token(subject),
    )


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/2fa/enable", response_model=Enable2FAResponse)
async def enable_2fa(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    secret = generate_totp_secret()
    user.totp_secret = secret
    await db.commit()
    return Enable2FAResponse(secret=secret, otpauth_uri=get_totp_uri(secret, user.email))


@router.post("/2fa/verify")
async def verify_2fa(payload: Verify2FARequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.totp_secret or not verify_totp(user.totp_secret, payload.totp_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    user.totp_enabled = True
    await db.commit()
    return {"totp_enabled": True}


@router.post("/2fa/disable")
async def disable_2fa(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.totp_enabled = False
    user.totp_secret = None
    await db.commit()
    return {"totp_enabled": False}
