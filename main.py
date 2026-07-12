#!/usr/bin/env python3
"""AURUM Terminal — institutional XAUUSD portfolio, journal & risk management desk.

Not a broker. Local-only portfolio management, trade journaling, analytics,
psychology tracking and risk management for gold (XAUUSD) traders.
"""
import customtkinter as ctk

from app.database.db import init_db
from app.database.repository import SecurityRepo
from app.ui import theme
from app.ui.app_window import AppWindow
from app.ui.login_window import LoginWindow


def launch_main_app():
    app = AppWindow()
    app.mainloop()


def main():
    init_db()
    theme.apply_appearance()

    security = SecurityRepo().get()
    if security and security["security_enabled"]:
        LoginWindow(on_success=launch_main_app).mainloop()
    else:
        launch_main_app()


if __name__ == "__main__":
    main()
