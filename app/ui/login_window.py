"""PIN / password lock screen shown at startup when security is enabled."""
import customtkinter as ctk

from app import APP_NAME
from app.database.repository import SecurityRepo
from app.services.security import verify_secret
from app.ui import theme


class LoginWindow(ctk.CTk):
    def __init__(self, on_success):
        super().__init__()
        self.on_success = on_success
        self.title(APP_NAME)
        self.geometry("440x520")
        self.resizable(False, False)
        self.configure(fg_color=theme.BG_APP)

        self.security = SecurityRepo().get()

        container = ctk.CTkFrame(self, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                                 border_width=1, border_color=theme.GOLD_DIM)
        container.pack(expand=True, fill="both", padx=40, pady=60)

        ctk.CTkLabel(container, text="◆", font=("Segoe UI", 40), text_color=theme.GOLD).pack(pady=(36, 0))
        ctk.CTkLabel(container, text="AURUM TERMINAL", font=theme.Fonts.get("h2"),
                     text_color=theme.TEXT_PRIMARY).pack(pady=(6, 0))
        ctk.CTkLabel(container, text="XAUUSD Portfolio & Risk Terminal — Locked", font=theme.Fonts.get("small"),
                     text_color=theme.TEXT_SECONDARY).pack(pady=(2, 26))

        self.entry_var = ctk.StringVar()
        self.entry = ctk.CTkEntry(container, textvariable=self.entry_var, show="●", width=240, height=42,
                                  placeholder_text="Enter PIN / Password", justify="center",
                                  fg_color=theme.BG_INPUT, border_color=theme.BORDER,
                                  text_color=theme.TEXT_PRIMARY, font=theme.Fonts.get("h3"))
        self.entry.pack(pady=6)
        self.entry.bind("<Return>", lambda e: self._attempt())

        self.error_label = ctk.CTkLabel(container, text="", font=theme.Fonts.get("small"), text_color=theme.RED)
        self.error_label.pack(pady=(4, 10))

        ctk.CTkButton(container, text="UNLOCK", command=self._attempt, width=240, height=42,
                     fg_color=theme.GOLD, hover_color=theme.GOLD_BRIGHT, text_color="#0A0A0D",
                     font=theme.Fonts.get("body_bold"), corner_radius=theme.RADIUS_SM).pack(pady=6)

        self.entry.focus_set()

    def _attempt(self):
        value = self.entry_var.get()
        salt = self.security["salt"] if self.security else ""
        pin_hash = self.security["pin_hash"] if self.security else ""
        pw_hash = self.security["password_hash"] if self.security else ""

        ok = False
        if pin_hash and verify_secret(value, salt, pin_hash):
            ok = True
        if not ok and pw_hash and verify_secret(value, salt, pw_hash):
            ok = True

        if ok:
            self.destroy()
            self.on_success()
        else:
            self.error_label.configure(text="Incorrect PIN or password.")
            self.entry_var.set("")
