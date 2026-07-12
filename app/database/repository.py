"""Repository layer: typed CRUD helpers over SQLite for every entity in the schema."""
import hashlib
import json
import time
from datetime import datetime

from app.database.db import get_connection


def _now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def make_trade_uid(account_id, trade_date, trade_time, direction, entry_price):
    raw = f"{account_id}|{trade_date}|{trade_time}|{direction}|{entry_price}|{time.time_ns()}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


class BaseRepo:
    table = ""

    def _conn(self):
        return get_connection()

    def all(self, order_by=None):
        q = f"SELECT * FROM {self.table}"
        if order_by:
            q += f" ORDER BY {order_by}"
        return self._conn().execute(q).fetchall()

    def get(self, row_id):
        return self._conn().execute(f"SELECT * FROM {self.table} WHERE id = ?", (row_id,)).fetchone()

    def delete(self, row_id):
        conn = self._conn()
        conn.execute(f"DELETE FROM {self.table} WHERE id = ?", (row_id,))
        conn.commit()


class AccountRepo(BaseRepo):
    table = "accounts"

    def create(self, **kw):
        conn = self._conn()
        cur = conn.execute(
            """INSERT INTO accounts (name, broker, starting_balance, current_balance, currency,
               leverage, target, max_daily_loss, max_overall_loss, risk_percent, is_active)
               VALUES (:name, :broker, :starting_balance, :current_balance, :currency,
               :leverage, :target, :max_daily_loss, :max_overall_loss, :risk_percent, 1)""",
            kw,
        )
        conn.commit()
        return cur.lastrowid

    def update(self, row_id, **kw):
        conn = self._conn()
        fields = ", ".join(f"{k} = :{k}" for k in kw)
        kw["id"] = row_id
        conn.execute(f"UPDATE accounts SET {fields} WHERE id = :id", kw)
        conn.commit()

    def adjust_balance(self, row_id, delta):
        conn = self._conn()
        conn.execute("UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?", (delta, row_id))
        conn.commit()

    def active_accounts(self):
        return self._conn().execute("SELECT * FROM accounts WHERE is_active = 1 ORDER BY name").fetchall()


class StrategyRepo(BaseRepo):
    table = "strategies"

    def create(self, name, description=""):
        conn = self._conn()
        cur = conn.execute("INSERT INTO strategies (name, description) VALUES (?, ?)", (name, description))
        conn.commit()
        return cur.lastrowid

    def update(self, row_id, name, description=""):
        conn = self._conn()
        conn.execute("UPDATE strategies SET name = ?, description = ? WHERE id = ?", (name, description, row_id))
        conn.commit()


class TagRepo(BaseRepo):
    table = "tags"

    def create(self, name, category="General"):
        conn = self._conn()
        cur = conn.execute("INSERT INTO tags (name, category) VALUES (?, ?)", (name, category))
        conn.commit()
        return cur.lastrowid

    def tags_for_trade(self, trade_id):
        return self._conn().execute(
            """SELECT t.* FROM tags t JOIN trade_tags tt ON tt.tag_id = t.id
               WHERE tt.trade_id = ? ORDER BY t.name""",
            (trade_id,),
        ).fetchall()

    def set_trade_tags(self, trade_id, tag_ids):
        conn = self._conn()
        conn.execute("DELETE FROM trade_tags WHERE trade_id = ?", (trade_id,))
        conn.executemany(
            "INSERT OR IGNORE INTO trade_tags (trade_id, tag_id) VALUES (?, ?)",
            [(trade_id, tid) for tid in tag_ids],
        )
        conn.commit()


TRADE_FIELDS = [
    "account_id", "strategy_id", "trade_date", "trade_time", "direction", "entry_price",
    "stop_loss", "take_profit", "exit_price", "lot_size", "risk_percent", "rr_ratio",
    "commission", "swap", "spread", "profit_loss", "status", "open_time", "close_time",
    "screenshot_before", "screenshot_after", "notes", "reason_entry", "reason_exit",
    "mistakes", "lessons_learned", "emotion_before", "emotion_during", "emotion_after",
    "confidence_score", "patience_score", "discipline_score", "followed_plan",
    "news_impact", "session",
]


class TradeRepo(BaseRepo):
    table = "trades"

    def create(self, data: dict):
        conn = self._conn()
        data = dict(data)
        data["trade_uid"] = make_trade_uid(
            data.get("account_id"), data.get("trade_date"), data.get("trade_time"),
            data.get("direction"), data.get("entry_price"),
        )
        cols = ["trade_uid"] + TRADE_FIELDS
        placeholders = ", ".join(f":{c}" for c in cols)
        for f in TRADE_FIELDS:
            data.setdefault(f, None)
        cur = conn.execute(
            f"INSERT INTO trades ({', '.join(cols)}) VALUES ({placeholders})", data
        )
        conn.commit()
        return cur.lastrowid

    def update(self, row_id, data: dict):
        conn = self._conn()
        data = dict(data)
        data["id"] = row_id
        data["updated_at"] = _now()
        fields = [f for f in TRADE_FIELDS if f in data] + ["updated_at"]
        set_clause = ", ".join(f"{f} = :{f}" for f in fields)
        conn.execute(f"UPDATE trades SET {set_clause} WHERE id = :id", data)
        conn.commit()

    def find(self, account_id=None, date_from=None, date_to=None, status=None, direction=None,
              strategy_id=None, session=None, tag_id=None, keyword=None, order_by="trade_date DESC, trade_time DESC"):
        q = ["SELECT DISTINCT t.* FROM trades t"]
        joins = []
        where = []
        params = {}
        if tag_id:
            joins.append("JOIN trade_tags tt ON tt.trade_id = t.id")
            where.append("tt.tag_id = :tag_id")
            params["tag_id"] = tag_id
        if account_id:
            where.append("t.account_id = :account_id")
            params["account_id"] = account_id
        if date_from:
            where.append("t.trade_date >= :date_from")
            params["date_from"] = date_from
        if date_to:
            where.append("t.trade_date <= :date_to")
            params["date_to"] = date_to
        if status:
            where.append("t.status = :status")
            params["status"] = status
        if direction:
            where.append("t.direction = :direction")
            params["direction"] = direction
        if strategy_id:
            where.append("t.strategy_id = :strategy_id")
            params["strategy_id"] = strategy_id
        if session:
            where.append("t.session = :session")
            params["session"] = session
        if keyword:
            where.append(
                "(t.notes LIKE :kw OR t.reason_entry LIKE :kw OR t.reason_exit LIKE :kw "
                "OR t.mistakes LIKE :kw OR t.lessons_learned LIKE :kw OR CAST(t.id AS TEXT) LIKE :kw)"
            )
            params["kw"] = f"%{keyword}%"
        q.extend(joins)
        if where:
            q.append("WHERE " + " AND ".join(where))
        q.append(f"ORDER BY {order_by}")
        return self._conn().execute(" ".join(q), params).fetchall()

    def closed_trades(self, account_id=None):
        return self.find(account_id=account_id, status="Closed")


class GoalRepo(BaseRepo):
    table = "goals"

    def create(self, account_id, period, target_amount, start_date, end_date):
        conn = self._conn()
        cur = conn.execute(
            "INSERT INTO goals (account_id, period, target_amount, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
            (account_id, period, target_amount, start_date, end_date),
        )
        conn.commit()
        return cur.lastrowid

    def for_account(self, account_id):
        return self._conn().execute(
            "SELECT * FROM goals WHERE account_id = ? ORDER BY start_date DESC", (account_id,)
        ).fetchall()


class AchievementRepo(BaseRepo):
    table = "achievements"

    def unlock(self, key):
        conn = self._conn()
        row = conn.execute("SELECT unlocked FROM achievements WHERE key = ?", (key,)).fetchone()
        if row and not row["unlocked"]:
            conn.execute(
                "UPDATE achievements SET unlocked = 1, unlocked_at = ? WHERE key = ?", (_now(), key)
            )
            conn.commit()
            return True
        return False


class NotificationRepo(BaseRepo):
    table = "notifications"

    def create(self, title, message="", ntype="info"):
        conn = self._conn()
        cur = conn.execute(
            "INSERT INTO notifications (ntype, title, message) VALUES (?, ?, ?)", (ntype, title, message)
        )
        conn.commit()
        return cur.lastrowid

    def unread_count(self):
        return self._conn().execute("SELECT COUNT(*) c FROM notifications WHERE is_read = 0").fetchone()["c"]

    def mark_all_read(self):
        conn = self._conn()
        conn.execute("UPDATE notifications SET is_read = 1")
        conn.commit()

    def mark_read(self, row_id):
        conn = self._conn()
        conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (row_id,))
        conn.commit()


class CalendarNoteRepo(BaseRepo):
    table = "calendar_notes"

    def create(self, note_date, note_type, note):
        conn = self._conn()
        cur = conn.execute(
            "INSERT INTO calendar_notes (note_date, note_type, note) VALUES (?, ?, ?)",
            (note_date, note_type, note),
        )
        conn.commit()
        return cur.lastrowid

    def for_date(self, note_date):
        return self._conn().execute(
            "SELECT * FROM calendar_notes WHERE note_date = ? ORDER BY id", (note_date,)
        ).fetchall()

    def in_range(self, date_from, date_to):
        return self._conn().execute(
            "SELECT * FROM calendar_notes WHERE note_date BETWEEN ? AND ? ORDER BY note_date",
            (date_from, date_to),
        ).fetchall()


class ChartAnnotationRepo(BaseRepo):
    table = "chart_annotations"

    def create(self, title, image_path, trade_id=None, annotation_json="[]"):
        conn = self._conn()
        cur = conn.execute(
            "INSERT INTO chart_annotations (trade_id, title, image_path, annotation_json) VALUES (?, ?, ?, ?)",
            (trade_id, title, image_path, annotation_json),
        )
        conn.commit()
        return cur.lastrowid

    def update_annotations(self, row_id, annotation_json):
        conn = self._conn()
        conn.execute(
            "UPDATE chart_annotations SET annotation_json = ?, updated_at = ? WHERE id = ?",
            (annotation_json, _now(), row_id),
        )
        conn.commit()


class SettingsRepo:
    def _conn(self):
        return get_connection()

    def get(self, key, default=""):
        row = self._conn().execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default

    def set(self, key, value):
        conn = self._conn()
        conn.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
                     (key, str(value), str(value)))
        conn.commit()

    def all(self):
        rows = self._conn().execute("SELECT key, value FROM settings").fetchall()
        return {r["key"]: r["value"] for r in rows}


class SecurityRepo:
    def _conn(self):
        return get_connection()

    def get(self):
        return self._conn().execute("SELECT * FROM security WHERE id = 1").fetchone()

    def update(self, **kw):
        conn = self._conn()
        fields = ", ".join(f"{k} = :{k}" for k in kw)
        conn.execute(f"UPDATE security SET {fields} WHERE id = 1", kw)
        conn.commit()


class BackupRepo(BaseRepo):
    table = "backups"

    def create(self, file_path, size_bytes):
        conn = self._conn()
        cur = conn.execute("INSERT INTO backups (file_path, size_bytes) VALUES (?, ?)", (file_path, size_bytes))
        conn.commit()
        return cur.lastrowid

    def recent(self, limit=20):
        return self._conn().execute(
            "SELECT * FROM backups ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
