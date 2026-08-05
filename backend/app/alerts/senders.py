"""Outbound alert delivery: email (SMTP), Telegram bot, Discord webhook.
Website/push/sound alerts are delivered via the existing WebSocket channel
(see app/ws) rather than an outbound sender."""

from __future__ import annotations

import smtplib
from email.mime.text import MIMEText

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def send_email(to_address: str, subject: str, body: str) -> bool:
    if not settings.SMTP_HOST:
        logger.info("email_alert_skipped_not_configured", to=to_address)
        return False
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_address
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to_address], msg.as_string())
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("email_alert_failed", error=str(exc))
        return False


async def send_telegram(chat_id: str, text: str) -> bool:
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("telegram_alert_skipped_not_configured")
        return False
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(url, json={"chat_id": chat_id, "text": text})
            return resp.status_code == 200
        except httpx.HTTPError as exc:
            logger.warning("telegram_alert_failed", error=str(exc))
            return False


async def send_discord(webhook_url: str | None, content: str) -> bool:
    url = webhook_url or settings.DISCORD_WEBHOOK_URL
    if not url:
        logger.info("discord_alert_skipped_not_configured")
        return False
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(url, json={"content": content})
            return resp.status_code in (200, 204)
        except httpx.HTTPError as exc:
            logger.warning("discord_alert_failed", error=str(exc))
            return False
