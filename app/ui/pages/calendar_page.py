"""Trading calendar: profit/loss heatmap, daily notes, economic news & holidays."""
import customtkinter as ctk

from app.services.analytics import TradeStats
from app.ui import theme
from app.ui.widgets.calendar_heatmap import CalendarHeatmap
from app.ui.widgets.common import BasePage, Card, FormField, gold_button, show_toast


class CalendarPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Trading Calendar", "Profit/loss heatmap with daily notes, news & holidays")
        self._build()

    def _build(self):
        row = ctk.CTkFrame(self.body, fg_color="transparent")
        row.pack(fill="both", expand=True)
        row.grid_columnconfigure(0, weight=2)
        row.grid_columnconfigure(1, weight=1)

        self.heatmap = CalendarHeatmap(row, on_day_click=self._open_day)
        self.heatmap.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        self.notes_card = Card(row, title="Upcoming Notes & News")
        self.notes_card.grid(row=0, column=1, sticky="nsew", padx=(8, 0))
        self.notes_holder = ctk.CTkFrame(self.notes_card, fg_color="transparent")
        self.notes_holder.pack(fill="both", expand=True, padx=14, pady=(4, 14))
        gold_button(self.notes_card, "Add Note", command=lambda: self._open_day(None), width=160).pack(
            anchor="w", padx=14, pady=(0, 12))

    def refresh(self, date_str=None, **_):
        account = self.app.get_active_account()
        if account:
            trades = self.app.repos.trades.find(account_id=account["id"])
            stats = TradeStats(trades, account["starting_balance"], account["current_balance"])
            self.heatmap.set_data(stats.by_date())

        for w in self.notes_holder.winfo_children():
            w.destroy()
        year, month = self.heatmap.year, self.heatmap.month
        date_from = f"{year:04d}-{month:02d}-01"
        date_to = f"{year:04d}-{month:02d}-31"
        notes = self.app.repos.calendar_notes.in_range(date_from, date_to)
        if not notes:
            ctk.CTkLabel(self.notes_holder, text="No notes this month.", font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED).pack(anchor="w", pady=8)
        for note in notes:
            tag_color = {"News": theme.AMBER, "Holiday": theme.PURPLE, "General": theme.GOLD}.get(
                note["note_type"], theme.GOLD)
            row = ctk.CTkFrame(self.notes_holder, fg_color=theme.BG_INPUT, corner_radius=theme.RADIUS_SM)
            row.pack(fill="x", pady=4)
            top = ctk.CTkFrame(row, fg_color="transparent")
            top.pack(fill="x", padx=10, pady=(6, 0))
            ctk.CTkLabel(top, text=note["note_date"], font=theme.Fonts.get("small_bold"),
                        text_color=theme.TEXT_PRIMARY).pack(side="left")
            ctk.CTkLabel(top, text=note["note_type"], font=theme.Fonts.get("small"),
                        text_color=tag_color).pack(side="right")
            ctk.CTkLabel(row, text=note["note"], font=theme.Fonts.get("small"), text_color=theme.TEXT_SECONDARY,
                        anchor="w", wraplength=260, justify="left").pack(fill="x", padx=10, pady=(2, 8))

        if date_str:
            self._open_day(date_str)

    def _open_day(self, date_str):
        dialog = ctk.CTkToplevel(self.app)
        dialog.title(date_str or "New Note")
        dialog.geometry("420x480")
        dialog.configure(fg_color=theme.BG_APP)
        dialog.transient(self.app)
        dialog.grab_set()

        form = ctk.CTkFrame(dialog, fg_color="transparent")
        form.pack(fill="both", expand=True, padx=20, pady=20)

        f_date = FormField(form, "Date (YYYY-MM-DD)", default=date_str or "")
        f_date.pack(fill="x", pady=6)
        f_type = FormField(form, "Type", kind="dropdown", values=["General", "News", "Holiday"], default="General")
        f_type.pack(fill="x", pady=6)
        f_note = FormField(form, "Note", kind="textbox", height=140, default="")
        f_note.pack(fill="x", pady=6)

        if date_str:
            account = self.app.get_active_account()
            day_trades = self.app.repos.trades.find(
                account_id=account["id"] if account else None, date_from=date_str, date_to=date_str
            )
            if day_trades:
                total = sum((t["profit_loss"] or 0) for t in day_trades)
                ctk.CTkLabel(form, text=f"{len(day_trades)} trades this day · Net {total:+.2f}",
                            font=theme.Fonts.get("small"), text_color=theme.pl_color(total)).pack(anchor="w", pady=4)

            existing = self.app.repos.calendar_notes.for_date(date_str)
            if existing:
                ctk.CTkLabel(form, text="Existing notes:", font=theme.Fonts.get("small_bold"),
                            text_color=theme.TEXT_SECONDARY).pack(anchor="w", pady=(10, 2))
                for n in existing:
                    ctk.CTkLabel(form, text=f"• [{n['note_type']}] {n['note']}", font=theme.Fonts.get("small"),
                                text_color=theme.TEXT_MUTED, wraplength=360, justify="left").pack(anchor="w")

        def save():
            d = f_date.get().strip()
            note_text = f_note.get()
            if not d or not note_text:
                show_toast(self.app, "Date and note text are required.", "error")
                return
            self.app.repos.calendar_notes.create(d, f_type.get(), note_text)
            dialog.destroy()
            self.refresh()

        gold_button(form, "Save Note", command=save, width=380).pack(pady=14)
