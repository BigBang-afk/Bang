"""Outbound notification delivery: email (SMTP), Telegram bot API, Discord webhook.

All senders are best-effort and swallow individual delivery failures (logged) so one broken
channel never blocks the others or the signal pipeline.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_telegram_message(chat_id: str, text: str) -> bool:
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram not configured; skipping notification")
        return False
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
            return resp.status_code == 200
    except httpx.HTTPError:
        logger.exception("Failed to send Telegram notification")
        return False


async def send_discord_message(content: str, webhook_url: str | None = None) -> bool:
    url = webhook_url or settings.DISCORD_WEBHOOK_URL
    if not url:
        logger.warning("Discord webhook not configured; skipping notification")
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"content": content})
            return resp.status_code in (200, 204)
    except httpx.HTTPError:
        logger.exception("Failed to send Discord notification")
        return False


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured; skipping notification")
        return False
    try:
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except smtplib.SMTPException:
        logger.exception("Failed to send email notification")
        return False


def format_signal_message(signal) -> str:
    return (
        f"*{signal.symbol}* — {signal.direction.upper()} signal ({signal.confidence_score:.0f}% confidence)\n"
        f"Entry: {signal.entry_price} | SL: {signal.stop_loss}\n"
        f"TP1: {signal.take_profit_1} | TP2: {signal.take_profit_2} | TP3: {signal.take_profit_3}\n"
        f"R/R: {signal.risk_reward_ratio:.2f} | Timeframe: {signal.timeframe}\n"
        f"Reasons: {'; '.join(signal.reasons[:3])}"
    )
