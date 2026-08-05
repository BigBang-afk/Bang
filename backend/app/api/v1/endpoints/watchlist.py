import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select

from app.api.deps import CurrentUser, DbSession
from app.db.models.watchlist import WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchlistItemCreate(BaseModel):
    symbol: str
    list_name: str = "default"
    pinned: bool = False


class WatchlistItemOut(BaseModel):
    id: uuid.UUID
    symbol: str
    list_name: str
    pinned: bool

    class Config:
        from_attributes = True


@router.get("", response_model=list[WatchlistItemOut])
async def get_watchlist(user: CurrentUser, db: DbSession):
    result = await db.execute(select(WatchlistItem).where(WatchlistItem.user_id == user.id))
    return result.scalars().all()


@router.post("", response_model=WatchlistItemOut, status_code=201)
async def add_to_watchlist(payload: WatchlistItemCreate, user: CurrentUser, db: DbSession):
    item = WatchlistItem(user_id=user.id, **payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}/pin", response_model=WatchlistItemOut)
async def toggle_pin(item_id: uuid.UUID, user: CurrentUser, db: DbSession):
    result = await db.execute(select(WatchlistItem).where(WatchlistItem.id == item_id, WatchlistItem.user_id == user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    item.pinned = not item.pinned
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def remove_from_watchlist(item_id: uuid.UUID, user: CurrentUser, db: DbSession):
    await db.execute(delete(WatchlistItem).where(WatchlistItem.id == item_id, WatchlistItem.user_id == user.id))
    await db.commit()
