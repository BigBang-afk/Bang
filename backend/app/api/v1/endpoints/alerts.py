import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.alerts.senders import send_discord, send_email, send_telegram
from app.api.deps import CurrentUser, DbSession
from app.db.models.alert import AlertCondition, AlertRule

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertRuleCreate(BaseModel):
    symbol: str | None = None
    condition: AlertCondition
    threshold: float | None = None
    channels: list[str] = ["website"]


class AlertRuleOut(BaseModel):
    id: uuid.UUID
    symbol: str | None
    condition: AlertCondition
    threshold: float | None
    channels: list
    is_active: bool

    class Config:
        from_attributes = True


class TestAlertRequest(BaseModel):
    channel: str
    destination: str
    message: str = "This is a test alert from your AI trading platform."


@router.get("/rules", response_model=list[AlertRuleOut])
async def list_rules(user: CurrentUser, db: DbSession):
    result = await db.execute(select(AlertRule).where(AlertRule.user_id == user.id))
    return result.scalars().all()


@router.post("/rules", response_model=AlertRuleOut, status_code=201)
async def create_rule(payload: AlertRuleCreate, user: CurrentUser, db: DbSession):
    rule = AlertRule(user_id=user.id, **payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: uuid.UUID, user: CurrentUser, db: DbSession):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id, AlertRule.user_id == user.id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    await db.delete(rule)
    await db.commit()


@router.post("/test")
async def test_alert(payload: TestAlertRequest, user: CurrentUser):
    sent = False
    if payload.channel == "email":
        sent = send_email(payload.destination, "Test Alert", payload.message)
    elif payload.channel == "telegram":
        sent = await send_telegram(payload.destination, payload.message)
    elif payload.channel == "discord":
        sent = await send_discord(payload.destination, payload.message)
    else:
        raise HTTPException(status_code=400, detail="Unsupported channel for direct test (use website/push in-app)")
    return {"sent": sent}
