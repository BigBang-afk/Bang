"""Trade entry form with integrated journal, psychology, tags & screenshots."""
import os
import shutil
from datetime import datetime

import customtkinter as ctk
from tkinter import filedialog

from app.config import SCREENSHOTS_DIR
from app.services.risk import compute_net_pl, compute_rr, position_size
from app.ui import theme
from app.ui.widgets.common import BasePage, FormField, gold_button, ghost_button, show_toast

DIRECTIONS = ["Buy", "Sell"]
STATUSES = ["Open", "Closed", "Partial", "Breakeven"]
SESSIONS = ["London", "New York", "Asian", "Kill Zone"]
NEWS_IMPACT = ["None", "Low", "Medium", "High"]


class ScoreSlider(ctk.CTkFrame):
    def __init__(self, master, label, default=5):
        super().__init__(master, fg_color="transparent")
        top = ctk.CTkFrame(self, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text=label, font=theme.Fonts.get("small_bold"),
                     text_color=theme.TEXT_SECONDARY).pack(side="left")
        self.value_label = ctk.CTkLabel(top, text=str(default), font=theme.Fonts.get("small_bold"),
                                        text_color=theme.GOLD)
        self.value_label.pack(side="right")
        self.slider = ctk.CTkSlider(self, from_=1, to=10, number_of_steps=9, progress_color=theme.GOLD,
                                    button_color=theme.GOLD_BRIGHT, command=self._on_change)
        self.slider.set(default)
        self.slider.pack(fill="x", pady=(4, 0))

    def _on_change(self, v):
        self.value_label.configure(text=str(int(round(v))))

    def get(self):
        return int(round(self.slider.get()))

    def set(self, v):
        self.slider.set(v)
        self.value_label.configure(text=str(int(v)))


class TradeEntryPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        self.editing_trade_id = None
        self.screenshot_before_path = ""
        self.screenshot_after_path = ""
        super().__init__(master, "New Trade", "Log an XAUUSD execution with full journal context",
                         actions=[lambda m: ghost_button(m, "Clear Form", command=self._reset)])
        self._build()

    # -------------------------------------------------------------- build --
    def _build(self):
        self.tabs = ctk.CTkTabview(self.body, fg_color=theme.BG_CARD, segmented_button_selected_color=theme.GOLD,
                                   segmented_button_selected_hover_color=theme.GOLD_BRIGHT,
                                   segmented_button_unselected_color=theme.BG_INPUT,
                                   segmented_button_fg_color=theme.BG_INPUT,
                                   text_color="#0A0A0D", corner_radius=theme.RADIUS,
                                   border_width=1, border_color=theme.BORDER)
        self.tabs.pack(fill="both", expand=True)
        self.tabs.add("Trade Details")
        self.tabs.add("Journal & Psychology")
        self.tabs.add("Tags & Screenshots")

        self._build_details_tab(self.tabs.tab("Trade Details"))
        self._build_journal_tab(self.tabs.tab("Journal & Psychology"))
        self._build_tags_tab(self.tabs.tab("Tags & Screenshots"))

        bottom = ctk.CTkFrame(self.body, fg_color="transparent")
        bottom.pack(fill="x", pady=14)
        gold_button(bottom, "Save Trade", command=self._save, width=180, height=42).pack(side="left")
        ghost_button(bottom, "Recalculate RR / P&L", command=self._recalc, width=200, height=42).pack(
            side="left", padx=(10, 0))
        self.id_label = ctk.CTkLabel(bottom, text="", font=theme.Fonts.get("small"), text_color=theme.TEXT_MUTED)
        self.id_label.pack(side="right")

    def _build_details_tab(self, tab):
        scroll = ctk.CTkScrollableFrame(tab, fg_color="transparent")
        scroll.pack(fill="both", expand=True)

        today = datetime.now().strftime("%Y-%m-%d")
        nowtime = datetime.now().strftime("%H:%M")

        strategies = self.app.repos.strategies.all(order_by="name")
        strat_names = [s["name"] for s in strategies]
        self._strategy_lookup = {s["name"]: s["id"] for s in strategies}

        r1 = ctk.CTkFrame(scroll, fg_color="transparent")
        r1.pack(fill="x", padx=4, pady=6)
        for i in range(3):
            r1.grid_columnconfigure(i, weight=1)
        self.f_date = FormField(r1, "Date", default=today)
        self.f_date.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_time = FormField(r1, "Time", default=nowtime)
        self.f_time.grid(row=0, column=1, sticky="ew", padx=6)
        self.f_direction = FormField(r1, "Direction", kind="dropdown", values=DIRECTIONS, default="Buy")
        self.f_direction.grid(row=0, column=2, sticky="ew", padx=6)

        r2 = ctk.CTkFrame(scroll, fg_color="transparent")
        r2.pack(fill="x", padx=4, pady=6)
        for i in range(3):
            r2.grid_columnconfigure(i, weight=1)
        self.f_entry = FormField(r2, "Entry Price", default="")
        self.f_entry.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_sl = FormField(r2, "Stop Loss", default="")
        self.f_sl.grid(row=0, column=1, sticky="ew", padx=6)
        self.f_tp = FormField(r2, "Take Profit", default="")
        self.f_tp.grid(row=0, column=2, sticky="ew", padx=6)

        r3 = ctk.CTkFrame(scroll, fg_color="transparent")
        r3.pack(fill="x", padx=4, pady=6)
        for i in range(3):
            r3.grid_columnconfigure(i, weight=1)
        self.f_exit = FormField(r3, "Exit Price", default="")
        self.f_exit.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_lot = FormField(r3, "Lot Size", default="0.10")
        self.f_lot.grid(row=0, column=1, sticky="ew", padx=6)
        account = self.app.get_active_account()
        default_risk = account["risk_percent"] if account else 1.0
        self.f_risk = FormField(r3, "Risk %", default=default_risk)
        self.f_risk.grid(row=0, column=2, sticky="ew", padx=6)

        r4 = ctk.CTkFrame(scroll, fg_color="transparent")
        r4.pack(fill="x", padx=4, pady=6)
        for i in range(3):
            r4.grid_columnconfigure(i, weight=1)
        self.f_rr = FormField(r4, "RR Ratio", default="0")
        self.f_rr.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_pl = FormField(r4, "Profit / Loss", default="0")
        self.f_pl.grid(row=0, column=1, sticky="ew", padx=6)
        self.f_status = FormField(r4, "Trade Status", kind="dropdown", values=STATUSES, default="Open")
        self.f_status.grid(row=0, column=2, sticky="ew", padx=6)

        r5 = ctk.CTkFrame(scroll, fg_color="transparent")
        r5.pack(fill="x", padx=4, pady=6)
        for i in range(3):
            r5.grid_columnconfigure(i, weight=1)
        self.f_comm = FormField(r5, "Commission", default="0")
        self.f_comm.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_swap = FormField(r5, "Swap", default="0")
        self.f_swap.grid(row=0, column=1, sticky="ew", padx=6)
        self.f_spread = FormField(r5, "Spread (cost)", default="0")
        self.f_spread.grid(row=0, column=2, sticky="ew", padx=6)

        r6 = ctk.CTkFrame(scroll, fg_color="transparent")
        r6.pack(fill="x", padx=4, pady=6)
        for i in range(2):
            r6.grid_columnconfigure(i, weight=1)
        self.f_strategy = FormField(r6, "Strategy", kind="dropdown", values=strat_names or ["—"],
                                    default=strat_names[0] if strat_names else "")
        self.f_strategy.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_session = FormField(r6, "Session", kind="dropdown", values=SESSIONS, default="London")
        self.f_session.grid(row=0, column=1, sticky="ew", padx=6)

        pos_row = ctk.CTkFrame(scroll, fg_color="transparent")
        pos_row.pack(fill="x", padx=10, pady=(10, 4))
        ghost_button(pos_row, "Suggest Lot Size from Risk %", command=self._suggest_lot, width=260).pack(anchor="w")

        ctk.CTkLabel(scroll, text="Trade Notes", font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=10, pady=(14, 2))
        self.notes_box = ctk.CTkTextbox(scroll, height=90, fg_color=theme.BG_INPUT, border_color=theme.BORDER,
                                        border_width=1, text_color=theme.TEXT_PRIMARY, corner_radius=8)
        self.notes_box.pack(fill="x", padx=10, pady=(0, 16))

    def _build_journal_tab(self, tab):
        scroll = ctk.CTkScrollableFrame(tab, fg_color="transparent")
        scroll.pack(fill="both", expand=True)

        ctk.CTkLabel(scroll, text="Reason for Entry", font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=10, pady=(10, 2))
        self.reason_entry_box = ctk.CTkTextbox(scroll, height=70, fg_color=theme.BG_INPUT,
                                               border_color=theme.BORDER, border_width=1,
                                               text_color=theme.TEXT_PRIMARY, corner_radius=8)
        self.reason_entry_box.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkLabel(scroll, text="Reason for Exit", font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=10, pady=(0, 2))
        self.reason_exit_box = ctk.CTkTextbox(scroll, height=70, fg_color=theme.BG_INPUT,
                                              border_color=theme.BORDER, border_width=1,
                                              text_color=theme.TEXT_PRIMARY, corner_radius=8)
        self.reason_exit_box.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkLabel(scroll, text="Mistakes (comma separated)", font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=10, pady=(0, 2))
        self.mistakes_box = ctk.CTkTextbox(scroll, height=60, fg_color=theme.BG_INPUT, border_color=theme.BORDER,
                                           border_width=1, text_color=theme.TEXT_PRIMARY, corner_radius=8)
        self.mistakes_box.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkLabel(scroll, text="Lessons Learned", font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=10, pady=(0, 2))
        self.lessons_box = ctk.CTkTextbox(scroll, height=60, fg_color=theme.BG_INPUT, border_color=theme.BORDER,
                                          border_width=1, text_color=theme.TEXT_PRIMARY, corner_radius=8)
        self.lessons_box.pack(fill="x", padx=10, pady=(0, 14))

        emo_row = ctk.CTkFrame(scroll, fg_color="transparent")
        emo_row.pack(fill="x", padx=4, pady=6)
        for i in range(3):
            emo_row.grid_columnconfigure(i, weight=1)
        emotions = ["Calm", "Confident", "Excited", "Anxious", "Fearful", "Greedy", "FOMO", "Revenge", "Bored"]
        self.f_emo_before = FormField(emo_row, "Emotion Before", kind="dropdown", values=emotions, default="Calm")
        self.f_emo_before.grid(row=0, column=0, sticky="ew", padx=6)
        self.f_emo_during = FormField(emo_row, "Emotion During", kind="dropdown", values=emotions, default="Calm")
        self.f_emo_during.grid(row=0, column=1, sticky="ew", padx=6)
        self.f_emo_after = FormField(emo_row, "Emotion After", kind="dropdown", values=emotions, default="Calm")
        self.f_emo_after.grid(row=0, column=2, sticky="ew", padx=6)

        score_row = ctk.CTkFrame(scroll, fg_color="transparent")
        score_row.pack(fill="x", padx=10, pady=14)
        for i in range(3):
            score_row.grid_columnconfigure(i, weight=1)
        self.s_confidence = ScoreSlider(score_row, "Confidence Score")
        self.s_confidence.grid(row=0, column=0, sticky="ew", padx=8)
        self.s_patience = ScoreSlider(score_row, "Patience Score")
        self.s_patience.grid(row=0, column=1, sticky="ew", padx=8)
        self.s_discipline = ScoreSlider(score_row, "Discipline Score")
        self.s_discipline.grid(row=0, column=2, sticky="ew", padx=8)

        bottom_row = ctk.CTkFrame(scroll, fg_color="transparent")
        bottom_row.pack(fill="x", padx=4, pady=6)
        for i in range(2):
            bottom_row.grid_columnconfigure(i, weight=1)
        self.f_news = FormField(bottom_row, "News Impact", kind="dropdown", values=NEWS_IMPACT, default="None")
        self.f_news.grid(row=0, column=0, sticky="ew", padx=6)

        plan_frame = ctk.CTkFrame(bottom_row, fg_color="transparent")
        plan_frame.grid(row=0, column=1, sticky="ew", padx=6)
        ctk.CTkLabel(plan_frame, text="Followed Trading Plan", font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY).pack(anchor="w", pady=(0, 4))
        self.followed_plan_var = ctk.BooleanVar(value=True)
        ctk.CTkSwitch(plan_frame, text="", variable=self.followed_plan_var, progress_color=theme.GOLD,
                     button_color=theme.TEXT_PRIMARY).pack(anchor="w")

    def _build_tags_tab(self, tab):
        scroll = ctk.CTkScrollableFrame(tab, fg_color="transparent")
        scroll.pack(fill="both", expand=True)

        ctk.CTkLabel(scroll, text="Setup Tags", font=theme.Fonts.get("h3"),
                    text_color=theme.TEXT_PRIMARY, anchor="w").pack(fill="x", padx=10, pady=(10, 6))
        tags_frame = ctk.CTkFrame(scroll, fg_color="transparent")
        tags_frame.pack(fill="x", padx=10)
        self.tag_vars = {}
        all_tags = self.app.repos.tags.all(order_by="category, name")
        cols = 4
        for i, tag in enumerate(all_tags):
            var = ctk.BooleanVar(value=False)
            cb = ctk.CTkCheckBox(tags_frame, text=tag["name"], variable=var, fg_color=theme.GOLD,
                                 hover_color=theme.GOLD_BRIGHT, checkmark_color="#0A0A0D",
                                 text_color=theme.TEXT_SECONDARY, border_color=theme.BORDER)
            cb.grid(row=i // cols, column=i % cols, sticky="w", padx=8, pady=6)
            self.tag_vars[tag["id"]] = var

        ctk.CTkLabel(scroll, text="Screenshots", font=theme.Fonts.get("h3"),
                    text_color=theme.TEXT_PRIMARY, anchor="w").pack(fill="x", padx=10, pady=(24, 6))
        shot_row = ctk.CTkFrame(scroll, fg_color="transparent")
        shot_row.pack(fill="x", padx=10)
        shot_row.grid_columnconfigure((0, 1), weight=1)

        self.before_panel = self._screenshot_slot(shot_row, "Before Trade", "before")
        self.before_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self.after_panel = self._screenshot_slot(shot_row, "After Trade", "after")
        self.after_panel.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

    def _screenshot_slot(self, parent, title, kind):
        panel = ctk.CTkFrame(parent, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                             border_width=1, border_color=theme.BORDER)
        ctk.CTkLabel(panel, text=title, font=theme.Fonts.get("small_bold"),
                    text_color=theme.TEXT_SECONDARY).pack(padx=14, pady=(14, 4), anchor="w")
        image_label = ctk.CTkLabel(panel, text="No screenshot", height=200, fg_color=theme.BG_INPUT,
                                   text_color=theme.TEXT_MUTED, corner_radius=8)
        image_label.pack(fill="x", padx=14, pady=6)
        ghost_button(panel, "Attach Image", command=lambda: self._attach_screenshot(kind, image_label),
                    width=160).pack(padx=14, pady=(0, 14), anchor="w")
        if kind == "before":
            self._before_label = image_label
        else:
            self._after_label = image_label
        return panel

    def _attach_screenshot(self, kind, image_label):
        path = filedialog.askopenfilename(
            title="Select chart screenshot",
            filetypes=[("Images", "*.png *.jpg *.jpeg *.gif *.bmp"), ("All files", "*.*")],
        )
        if not path:
            return
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        dest_name = f"{kind}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.path.basename(path)}"
        dest_path = os.path.join(SCREENSHOTS_DIR, dest_name)
        try:
            shutil.copy2(path, dest_path)
        except OSError as e:
            show_toast(self.app, f"Could not attach image: {e}", "error")
            return
        if kind == "before":
            self.screenshot_before_path = dest_path
        else:
            self.screenshot_after_path = dest_path
        self._set_thumbnail(image_label, dest_path)

    def _set_thumbnail(self, label, path):
        try:
            from PIL import Image
            img = Image.open(path)
            img.thumbnail((360, 200))
            ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=img.size)
            label.configure(image=ctk_img, text="")
            label.image = ctk_img
        except Exception:
            label.configure(text=os.path.basename(path))

    # ------------------------------------------------------------- logic --
    def _suggest_lot(self):
        account = self.app.get_active_account()
        if not account:
            return
        try:
            entry = float(self.f_entry.get() or 0)
            sl = float(self.f_sl.get() or 0)
            risk_pct = float(self.f_risk.get() or 0)
        except ValueError:
            show_toast(self.app, "Enter valid entry/SL/risk% first.", "error")
            return
        lots = position_size(account["current_balance"], risk_pct, entry, sl)
        self.f_lot.set(lots)
        show_toast(self.app, f"Suggested lot size: {lots}", "info")

    def _recalc(self):
        try:
            entry = float(self.f_entry.get() or 0)
            sl = float(self.f_sl.get() or 0)
            tp = float(self.f_tp.get() or 0)
            exitp = float(self.f_exit.get() or 0)
            lot = float(self.f_lot.get() or 0)
            comm = float(self.f_comm.get() or 0)
            swap = float(self.f_swap.get() or 0)
            spread = float(self.f_spread.get() or 0)
        except ValueError:
            show_toast(self.app, "Fill numeric fields before recalculating.", "error")
            return
        direction = self.f_direction.get()
        rr = compute_rr(entry, sl, tp, direction)
        self.f_rr.set(rr)
        if exitp:
            pl = compute_net_pl(entry, exitp, lot, direction, comm, swap, spread)
            self.f_pl.set(pl)
        show_toast(self.app, "RR / P&L recalculated.", "success")

    def _collect_tag_ids(self):
        return [tid for tid, var in self.tag_vars.items() if var.get()]

    def _reset(self):
        self.editing_trade_id = None
        self.screenshot_before_path = ""
        self.screenshot_after_path = ""
        for f in (self.f_entry, self.f_sl, self.f_tp, self.f_exit):
            f.set("")
        self.f_lot.set("0.10")
        self.f_rr.set("0")
        self.f_pl.set("0")
        self.f_status.set("Open")
        self.notes_box.delete("1.0", "end")
        self.reason_entry_box.delete("1.0", "end")
        self.reason_exit_box.delete("1.0", "end")
        self.mistakes_box.delete("1.0", "end")
        self.lessons_box.delete("1.0", "end")
        self.followed_plan_var.set(True)
        for var in self.tag_vars.values():
            var.set(False)
        self._before_label.configure(image=None, text="No screenshot")
        self._after_label.configure(image=None, text="No screenshot")
        self.id_label.configure(text="")

    def _save(self):
        account = self.app.get_active_account()
        if not account:
            show_toast(self.app, "Create an account first.", "error")
            return
        try:
            entry = float(self.f_entry.get() or 0)
            lot = float(self.f_lot.get() or 0)
        except ValueError:
            show_toast(self.app, "Entry Price and Lot Size must be numeric.", "error")
            return

        def fnum(field):
            try:
                return float(field.get() or 0)
            except ValueError:
                return 0.0

        strategy_name = self.f_strategy.get()
        strategy_id = self._strategy_lookup.get(strategy_name)

        data = dict(
            account_id=account["id"], strategy_id=strategy_id,
            trade_date=self.f_date.get().strip(), trade_time=self.f_time.get().strip(),
            direction=self.f_direction.get(), entry_price=entry, stop_loss=fnum(self.f_sl),
            take_profit=fnum(self.f_tp), exit_price=fnum(self.f_exit), lot_size=lot,
            risk_percent=fnum(self.f_risk), rr_ratio=fnum(self.f_rr), commission=fnum(self.f_comm),
            swap=fnum(self.f_swap), spread=fnum(self.f_spread), profit_loss=fnum(self.f_pl),
            status=self.f_status.get(), screenshot_before=self.screenshot_before_path,
            screenshot_after=self.screenshot_after_path, notes=self.notes_box.get("1.0", "end").strip(),
            reason_entry=self.reason_entry_box.get("1.0", "end").strip(),
            reason_exit=self.reason_exit_box.get("1.0", "end").strip(),
            mistakes=self.mistakes_box.get("1.0", "end").strip(),
            lessons_learned=self.lessons_box.get("1.0", "end").strip(),
            emotion_before=self.f_emo_before.get(), emotion_during=self.f_emo_during.get(),
            emotion_after=self.f_emo_after.get(), confidence_score=self.s_confidence.get(),
            patience_score=self.s_patience.get(), discipline_score=self.s_discipline.get(),
            followed_plan=1 if self.followed_plan_var.get() else 0, news_impact=self.f_news.get(),
            session=self.f_session.get(),
        )

        if self.editing_trade_id:
            old = self.app.repos.trades.get(self.editing_trade_id)
            old_pl = old["profit_loss"] if old else 0
            self.app.repos.trades.update(self.editing_trade_id, data)
            self.app.repos.tags.set_trade_tags(self.editing_trade_id, self._collect_tag_ids())
            if data["status"] == "Closed":
                self.app.repos.accounts.adjust_balance(account["id"], data["profit_loss"] - (old_pl or 0))
            show_toast(self.app, "Trade updated.", "success")
        else:
            dupes = self.app.repos.trades.find(
                account_id=account["id"], date_from=data["trade_date"], date_to=data["trade_date"],
                direction=data["direction"],
            )
            if any(abs((d["entry_price"] or 0) - entry) < 1e-6 and d["trade_time"] == data["trade_time"]
                  for d in dupes):
                show_toast(self.app, "Duplicate trade detected (same date/time/entry) — not saved.", "error")
                return
            new_id = self.app.repos.trades.create(data)
            self.app.repos.tags.set_trade_tags(new_id, self._collect_tag_ids())
            if data["status"] == "Closed":
                self.app.repos.accounts.adjust_balance(account["id"], data["profit_loss"])
            show_toast(self.app, "Trade logged.", "success")

        from app.services.achievements import evaluate_achievements
        acc_fresh = self.app.repos.accounts.get(account["id"])
        all_trades = self.app.repos.trades.find(account_id=account["id"])
        evaluate_achievements(all_trades, acc_fresh["starting_balance"], acc_fresh["current_balance"])

        self._reset()
        self.app.refresh_current_page()

    def load_trade(self, trade_id):
        trade = self.app.repos.trades.get(trade_id)
        if not trade:
            return
        self.editing_trade_id = trade_id
        self.id_label.configure(text=f"Editing Trade #{trade_id} · UID {trade['trade_uid']}")
        self.f_date.set(trade["trade_date"]); self.f_time.set(trade["trade_time"])
        self.f_direction.set(trade["direction"]); self.f_entry.set(trade["entry_price"])
        self.f_sl.set(trade["stop_loss"]); self.f_tp.set(trade["take_profit"])
        self.f_exit.set(trade["exit_price"]); self.f_lot.set(trade["lot_size"])
        self.f_risk.set(trade["risk_percent"]); self.f_rr.set(trade["rr_ratio"])
        self.f_comm.set(trade["commission"]); self.f_swap.set(trade["swap"])
        self.f_spread.set(trade["spread"]); self.f_pl.set(trade["profit_loss"])
        self.f_status.set(trade["status"]); self.f_session.set(trade["session"])
        self.f_news.set(trade["news_impact"] or "None")
        if trade["strategy_id"]:
            name = next((n for n, i in self._strategy_lookup.items() if i == trade["strategy_id"]), None)
            if name:
                self.f_strategy.set(name)
        self.notes_box.delete("1.0", "end"); self.notes_box.insert("1.0", trade["notes"] or "")
        self.reason_entry_box.delete("1.0", "end"); self.reason_entry_box.insert("1.0", trade["reason_entry"] or "")
        self.reason_exit_box.delete("1.0", "end"); self.reason_exit_box.insert("1.0", trade["reason_exit"] or "")
        self.mistakes_box.delete("1.0", "end"); self.mistakes_box.insert("1.0", trade["mistakes"] or "")
        self.lessons_box.delete("1.0", "end"); self.lessons_box.insert("1.0", trade["lessons_learned"] or "")
        self.f_emo_before.set(trade["emotion_before"] or "Calm")
        self.f_emo_during.set(trade["emotion_during"] or "Calm")
        self.f_emo_after.set(trade["emotion_after"] or "Calm")
        self.s_confidence.set(trade["confidence_score"] or 5)
        self.s_patience.set(trade["patience_score"] or 5)
        self.s_discipline.set(trade["discipline_score"] or 5)
        self.followed_plan_var.set(bool(trade["followed_plan"]))

        selected_tags = {t["id"] for t in self.app.repos.tags.tags_for_trade(trade_id)}
        for tid, var in self.tag_vars.items():
            var.set(tid in selected_tags)

        self.screenshot_before_path = trade["screenshot_before"] or ""
        self.screenshot_after_path = trade["screenshot_after"] or ""
        if self.screenshot_before_path and os.path.exists(self.screenshot_before_path):
            self._set_thumbnail(self._before_label, self.screenshot_before_path)
        if self.screenshot_after_path and os.path.exists(self.screenshot_after_path):
            self._set_thumbnail(self._after_label, self.screenshot_after_path)

    def refresh(self, trade_id=None, **_):
        if trade_id:
            self.load_trade(trade_id)
