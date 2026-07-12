"""Automatic/manual backup, restore, and database health checks."""
import os
from datetime import datetime

import customtkinter as ctk

from app.services import backup as backup_service
from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, gold_button, ghost_button, danger_button, show_toast


class BackupPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Backup & Restore", "Protect your XAUUSD trading history")
        self._build()

    def _build(self):
        top = ctk.CTkFrame(self.body, fg_color="transparent")
        top.pack(fill="x", pady=(0, 14))
        top.grid_columnconfigure((0, 1), weight=1)

        auto_card = Card(top, title="Automatic Backup")
        auto_card.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        row = ctk.CTkFrame(auto_card, fg_color="transparent")
        row.pack(fill="x", padx=18, pady=(4, 6))
        self.auto_switch = ctk.CTkSwitch(row, text="Enable auto backup on launch", progress_color=theme.GOLD,
                                         button_color=theme.TEXT_PRIMARY, command=self._save_auto_setting)
        self.auto_switch.pack(anchor="w")
        self.interval_field = FormField(auto_card, "Backup interval (hours)", default="24")
        self.interval_field.pack(fill="x", padx=18, pady=(6, 6))
        ghost_button(auto_card, "Save Setting", command=self._save_auto_setting, width=160).pack(
            anchor="w", padx=18, pady=(0, 18))

        manual_card = Card(top, title="Manual Backup")
        manual_card.grid(row=0, column=1, sticky="nsew", padx=(8, 0))
        self.encrypt_switch = ctk.CTkSwitch(manual_card, text="Encrypt backup (password protected)",
                                            progress_color=theme.GOLD, button_color=theme.TEXT_PRIMARY)
        self.encrypt_switch.pack(anchor="w", padx=18, pady=(4, 8))
        self.pw_field = FormField(manual_card, "Backup Password (if encrypting)", default="")
        self.pw_field.pack(fill="x", padx=18, pady=(0, 10))
        self.pw_field.widget.configure(show="●")
        gold_button(manual_card, "Create Backup Now", command=self._create_backup, width=200).pack(
            anchor="w", padx=18, pady=(0, 10))
        ghost_button(manual_card, "Run Database Health Check", command=self._health_check, width=240).pack(
            anchor="w", padx=18, pady=(0, 18))

        self.health_label = ctk.CTkLabel(self.body, text="", font=theme.Fonts.get("small"),
                                         text_color=theme.TEXT_SECONDARY, anchor="w")
        self.health_label.pack(fill="x", pady=(0, 10))

        self.list_card = Card(self.body, title="Backup History")
        self.list_card.pack(fill="both", expand=True)
        self.list_holder = ctk.CTkFrame(self.list_card, fg_color="transparent")
        self.list_holder.pack(fill="both", expand=True, padx=18, pady=(4, 18))

    def refresh(self, **_):
        self.auto_switch.select() if self.app.repos.settings.get("auto_backup_enabled", "0") == "1" \
            else self.auto_switch.deselect()
        self.interval_field.set(self.app.repos.settings.get("auto_backup_interval_hours", "24"))

        for w in self.list_holder.winfo_children():
            w.destroy()
        backups = backup_service.list_backups()
        if not backups:
            ctk.CTkLabel(self.list_holder, text="No backups yet.", font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED).pack(anchor="w")
            return
        for b in backups:
            row = ctk.CTkFrame(self.list_holder, fg_color=theme.BG_INPUT, corner_radius=theme.RADIUS_SM)
            row.pack(fill="x", pady=4)
            info = ctk.CTkFrame(row, fg_color="transparent")
            info.pack(side="left", padx=12, pady=8, fill="x", expand=True)
            name = os.path.basename(b["file_path"])
            ctk.CTkLabel(info, text=name, font=theme.Fonts.get("small_bold"),
                        text_color=theme.TEXT_PRIMARY, anchor="w").pack(anchor="w")
            size_kb = (b["size_bytes"] or 0) / 1024
            ctk.CTkLabel(info, text=f"{b['created_at']} · {size_kb:.1f} KB", font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED, anchor="w").pack(anchor="w")
            danger_button(row, "Restore", width=90, height=28,
                         command=lambda b=b: self._restore(b)).pack(side="right", padx=10)

    def _save_auto_setting(self):
        self.app.repos.settings.set("auto_backup_enabled", "1" if self.auto_switch.get() else "0")
        self.app.repos.settings.set("auto_backup_interval_hours", self.interval_field.get() or "24")
        show_toast(self.app, "Backup setting saved.", "success")

    def _create_backup(self):
        password = None
        if self.encrypt_switch.get():
            password = self.pw_field.get()
            if not password:
                show_toast(self.app, "Enter a password to encrypt the backup.", "error")
                return
        try:
            path = backup_service.create_backup(encrypt_password=password)
        except Exception as e:
            show_toast(self.app, f"Backup failed: {e}", "error")
            return
        self.app.repos.settings.set("last_backup_at", datetime.now().isoformat())
        show_toast(self.app, f"Backup created: {os.path.basename(path)}", "success")
        self.refresh()

    def _restore(self, backup_row):
        path = backup_row["file_path"]
        password = None
        if path.endswith(".enc"):
            password = self.pw_field.get()
            if not password:
                show_toast(self.app, "Enter the backup password before restoring.", "error")
                return
        try:
            backup_service.restore_backup(path, decrypt_password=password)
        except Exception as e:
            show_toast(self.app, f"Restore failed: {e}", "error")
            return
        show_toast(self.app, "Restored. Please restart AURUM Terminal.", "success")

    def _health_check(self):
        result = backup_service.health_check()
        color = theme.GREEN if result["integrity"] == "ok" and result["foreign_key_violations"] == 0 else theme.RED
        self.health_label.configure(
            text=f"Integrity: {result['integrity']}  ·  FK violations: {result['foreign_key_violations']}  ·  "
                f"DB size: {result['db_size_bytes'] / 1024:.1f} KB",
            text_color=color,
        )
