"""Application preferences: theme, font size, currency, timezone, auto-save, language."""
import customtkinter as ctk

from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, gold_button, show_toast


class SettingsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Settings", "Personalize AURUM Terminal")
        self._build()

    def _build(self):
        card = Card(self.body, title="General Preferences")
        card.pack(fill="x", pady=(0, 14))

        row1 = ctk.CTkFrame(card, fg_color="transparent")
        row1.pack(fill="x", padx=18, pady=8)
        settings = self.app.repos.settings
        self.f_theme = FormField(row1, "Theme", kind="dropdown", values=["Dark", "Light"],
                                 default=settings.get("theme", "dark").capitalize())
        self.f_theme.pack(side="left", padx=(0, 12))
        self.f_font = FormField(row1, "Font Size", kind="dropdown", values=["11", "12", "13", "14", "16"],
                                default=settings.get("font_size", "13"))
        self.f_font.pack(side="left", padx=12)
        self.f_currency = FormField(row1, "Currency", kind="dropdown", values=["USD", "EUR", "GBP", "AUD", "CAD"],
                                    default=settings.get("currency", "USD"))
        self.f_currency.pack(side="left", padx=12)

        row2 = ctk.CTkFrame(card, fg_color="transparent")
        row2.pack(fill="x", padx=18, pady=8)
        self.f_tz = FormField(row2, "Time Zone", default=settings.get("timezone", "UTC"))
        self.f_tz.pack(side="left", padx=(0, 12))
        self.f_language = FormField(row2, "Language", kind="dropdown",
                                    values=["English", "Spanish", "French", "German", "Arabic"],
                                    default=settings.get("language", "English"))
        self.f_language.pack(side="left", padx=12)

        switch_row = ctk.CTkFrame(card, fg_color="transparent")
        switch_row.pack(fill="x", padx=18, pady=(4, 18))
        self.auto_save_switch = ctk.CTkSwitch(switch_row, text="Auto-save journal entries", progress_color=theme.GOLD,
                                              button_color=theme.TEXT_PRIMARY)
        if settings.get("auto_save", "1") == "1":
            self.auto_save_switch.select()
        self.auto_save_switch.pack(anchor="w")

        gold_button(card, "Save Settings", command=self._save, width=200).pack(anchor="w", padx=18, pady=(0, 18))

        note = Card(self.body, title="About")
        note.pack(fill="x")
        ctk.CTkLabel(note, text="AURUM Terminal is a local-only portfolio & journal tool for XAUUSD traders. "
                               "It is not a broker and does not execute live orders.",
                    font=theme.Fonts.get("small"), text_color=theme.TEXT_SECONDARY, wraplength=800,
                    justify="left").pack(anchor="w", padx=18, pady=(4, 18))

    def refresh(self, **_):
        pass

    def _save(self):
        settings = self.app.repos.settings
        settings.set("theme", self.f_theme.get().lower())
        settings.set("font_size", self.f_font.get())
        settings.set("currency", self.f_currency.get())
        settings.set("timezone", self.f_tz.get())
        settings.set("language", self.f_language.get())
        settings.set("auto_save", "1" if self.auto_save_switch.get() else "0")
        ctk.set_appearance_mode(self.f_theme.get().lower())
        show_toast(self.app, "Settings saved.", "success")
