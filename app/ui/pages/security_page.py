"""Security: PIN lock, password login, auto-logout & encrypted backups."""
import customtkinter as ctk

from app.services.security import hash_secret, new_salt
from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, gold_button, show_toast


class SecurityPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Security", "PIN lock, password login & session protection")
        self._build()

    def _build(self):
        card = Card(self.body, title="Access Control")
        card.pack(fill="x", pady=(0, 14))

        self.enabled_switch = ctk.CTkSwitch(card, text="Require PIN / password on launch",
                                            progress_color=theme.GOLD, button_color=theme.TEXT_PRIMARY)
        self.enabled_switch.pack(anchor="w", padx=18, pady=(6, 14))

        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill="x", padx=18, pady=(0, 8))
        self.pin_field = FormField(row, "Set PIN (4-8 digits)")
        self.pin_field.pack(side="left", padx=(0, 12))
        self.pin_field.widget.configure(show="●")
        self.pw_field = FormField(row, "Set Password (alternative)")
        self.pw_field.pack(side="left", padx=12)
        self.pw_field.widget.configure(show="●")

        self.logout_field = FormField(card, "Auto-logout after (minutes of inactivity)", default="15")
        self.logout_field.pack(fill="x", padx=18, pady=(8, 8))

        gold_button(card, "Save Security Settings", command=self._save, width=220).pack(
            anchor="w", padx=18, pady=(4, 18))

        info = Card(self.body, title="Database Protection")
        info.pack(fill="x")
        ctk.CTkLabel(info, text="Your XAUUSD trade database lives locally on this device only — it is never "
                               "transmitted anywhere. Enable 'Encrypt backup' on the Backup page to protect "
                               "exported backup files with AES (Fernet) encryption tied to a password you choose.",
                    font=theme.Fonts.get("small"), text_color=theme.TEXT_SECONDARY, wraplength=800,
                    justify="left").pack(anchor="w", padx=18, pady=(4, 18))

    def refresh(self, **_):
        sec = self.app.repos.security.get()
        if sec and sec["security_enabled"]:
            self.enabled_switch.select()
        else:
            self.enabled_switch.deselect()
        self.logout_field.set(sec["auto_logout_minutes"] if sec else 15)

    def _save(self):
        pin = self.pin_field.get().strip()
        pw = self.pw_field.get().strip()
        enabled = self.enabled_switch.get()

        if enabled and not pin and not pw:
            sec = self.app.repos.security.get()
            has_existing = sec and (sec["pin_hash"] or sec["password_hash"])
            if not has_existing:
                show_toast(self.app, "Set a PIN or password before enabling security.", "error")
                return

        update = {"security_enabled": 1 if enabled else 0}
        try:
            update["auto_logout_minutes"] = int(self.logout_field.get() or 15)
        except ValueError:
            update["auto_logout_minutes"] = 15

        if pin or pw:
            sec = self.app.repos.security.get()
            salt = (sec["salt"] if sec and sec["salt"] else None) or new_salt()
            update["salt"] = salt
            if pin:
                update["pin_hash"] = hash_secret(pin, salt)
            if pw:
                update["password_hash"] = hash_secret(pw, salt)

        self.app.repos.security.update(**update)
        self.pin_field.set("")
        self.pw_field.set("")
        show_toast(self.app, "Security settings saved.", "success")
