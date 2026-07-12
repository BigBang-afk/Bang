"""End-to-end smoke test: seeds realistic data, renders every page, exercises
security/backup/export services. Run under Xvfb on headless machines:

    xvfb-run -a ./.venv/bin/python tests/smoke_test.py
"""
import os
import random
import sys
import traceback
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import init_db
from app.database.repository import SecurityRepo, TradeRepo
from app.services import backup as backup_service
from app.services.achievements import evaluate_achievements
from app.services.analytics import TradeStats
from app.services.export import export_csv, export_excel, export_pdf_report
from app.services.security import hash_secret, new_salt, verify_secret
from app.ui import theme
from app.ui.app_window import AppWindow, NAV_SECTIONS

errors = []


def check(label, fn):
    try:
        fn()
        print(f"[OK] {label}")
    except Exception:
        print(f"[FAIL] {label}")
        errors.append((label, traceback.format_exc()))


def run():
    init_db()
    theme.apply_appearance()

    def _security():
        salt = new_salt()
        h = hash_secret("1234", salt)
        assert verify_secret("1234", salt, h)
        assert not verify_secret("9999", salt, h)
    check("security hash roundtrip", _security)

    app = AppWindow()
    account = app.get_active_account()

    def _seed():
        strat_ids = [s["id"] for s in app.repos.strategies.all()]
        tag_ids = [t["id"] for t in app.repos.tags.all()]
        random.seed(7)
        for _ in range(30):
            d = date.today() - timedelta(days=random.randint(0, 60))
            direction = random.choice(["Buy", "Sell"])
            entry = round(random.uniform(2300, 2450), 2)
            sl = entry - 5 if direction == "Buy" else entry + 5
            tp = entry + 10 if direction == "Buy" else entry - 10
            won = random.random() < 0.55
            exitp = tp if won else sl
            lot = round(random.uniform(0.05, 0.5), 2)
            pl = (exitp - entry) * 100 * lot if direction == "Buy" else (entry - exitp) * 100 * lot
            trade_id = app.repos.trades.create(dict(
                account_id=account["id"], strategy_id=random.choice(strat_ids), trade_date=d.isoformat(),
                trade_time=f"{random.randint(0,23):02d}:{random.randint(0,59):02d}", direction=direction,
                entry_price=entry, stop_loss=sl, take_profit=tp, exit_price=exitp, lot_size=lot,
                risk_percent=1.0, rr_ratio=2.0, commission=1.5, swap=0.0, spread=0.3,
                profit_loss=round(pl, 2), status="Closed", session=random.choice(
                    ["London", "New York", "Asian", "Kill Zone"]), followed_plan=1,
            ))
            app.repos.tags.set_trade_tags(trade_id, random.sample(tag_ids, k=min(2, len(tag_ids))))
            app.repos.accounts.adjust_balance(account["id"], pl)
    check("seed 30 sample trades", _seed)

    def _pages():
        for _, items in NAV_SECTIONS:
            for key, _label, _icon in items:
                app.show_page(key)
                app.update()
    check("render every page with real data", _pages)

    def _edit():
        trades = app.repos.trades.find(account_id=account["id"])
        app.navigate_to_trade(trades[0]["id"])
        app.update()
    check("load a trade into the edit form", _edit)

    def _achievements():
        acc = app.repos.accounts.get(account["id"])
        trades = app.repos.trades.find(account_id=account["id"])
        evaluate_achievements(trades, acc["starting_balance"], acc["current_balance"])
    check("achievement evaluation", _achievements)

    def _exports():
        trades = TradeRepo().find()
        stats = TradeStats(trades, account["starting_balance"], account["current_balance"])
        export_csv(stats.closed, "/tmp/aurum_smoke.csv")
        export_excel(stats.closed, "/tmp/aurum_smoke.xlsx")
        export_pdf_report("/tmp/aurum_smoke.pdf", "Smoke Report", account["name"], stats, "smoke-test")
    check("CSV / Excel / PDF export", _exports)

    def _backup():
        plain = backup_service.create_backup()
        enc = backup_service.create_backup(encrypt_password="hunter2")
        backup_service.restore_backup(enc, decrypt_password="hunter2")
        result = backup_service.health_check()
        assert result["integrity"] == "ok"
    check("backup / encrypted backup / restore / health check", _backup)

    app.destroy()

    if errors:
        print(f"\n{len(errors)} FAILURE(S):")
        for label, tb in errors:
            print(f"\n=== {label} ===\n{tb}")
        sys.exit(1)
    print("\nALL SMOKE TESTS PASSED")


if __name__ == "__main__":
    run()
