"""Generates system notifications: reminders, risk warnings, target achievements."""
from datetime import date

from app.database.repository import NotificationRepo, SettingsRepo
from app.services.risk import RiskEngine


def push_daily_reminder_if_needed():
    settings = SettingsRepo()
    today = date.today().isoformat()
    last = settings.get("last_reminder_date", "")
    if last == today:
        return False
    NotificationRepo().create(
        "Journal Reminder", "Don't forget to log today's XAUUSD trades and pre-session plan.", ntype="reminder"
    )
    settings.set("last_reminder_date", today)
    return True


def push_risk_warnings(account, today_pl, week_pl, current_losing_streak):
    engine = RiskEngine(account, today_pl, week_pl, current_losing_streak)
    repo = NotificationRepo()
    for msg in engine.warnings():
        repo.create("Risk Warning", msg, ntype="risk")
    return engine.warnings()


def push_target_achieved(label, amount):
    NotificationRepo().create("Target Achieved", f"{label} target reached: {amount:.2f}", ntype="target")
