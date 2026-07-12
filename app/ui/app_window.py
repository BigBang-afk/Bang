"""Main application window: sidebar navigation + page router."""
import customtkinter as ctk

from app import APP_NAME
from app.database.repository import (
    AccountRepo, StrategyRepo, TagRepo, TradeRepo, GoalRepo, AchievementRepo,
    NotificationRepo, CalendarNoteRepo, ChartAnnotationRepo, SettingsRepo, SecurityRepo,
)
from app.ui import theme
from app.ui.icons import icon
from app.ui.widgets.common import show_toast

NAV_SECTIONS = [
    ("OVERVIEW", [("dashboard", "Dashboard", "dashboard")]),
    ("TRADING", [
        ("trade_entry", "New Trade", "trade_entry"),
        ("trade_log", "Trade Log", "trade_log"),
        ("strategies", "Strategies", "strategies"),
        ("tags", "Setup Tags", "tags"),
    ]),
    ("RISK & STATS", [
        ("risk", "Risk Manager", "risk"),
        ("statistics", "Statistics", "statistics"),
        ("chart", "Chart Analysis", "chart"),
    ]),
    ("PLANNING", [
        ("calendar", "Calendar", "calendar"),
        ("goals", "Goals", "goals"),
        ("reports", "Reports", "reports"),
    ]),
    ("INSIGHTS", [
        ("ai", "AI Analysis", "ai"),
        ("achievements", "Achievements", "achievements"),
        ("notifications", "Notifications", "notifications"),
    ]),
    ("SYSTEM", [
        ("accounts", "Accounts", "accounts"),
        ("backup", "Backup", "backup"),
        ("settings", "Settings", "settings"),
        ("security", "Security", "security"),
    ]),
]


class Repos:
    def __init__(self):
        self.accounts = AccountRepo()
        self.strategies = StrategyRepo()
        self.tags = TagRepo()
        self.trades = TradeRepo()
        self.goals = GoalRepo()
        self.achievements = AchievementRepo()
        self.notifications = NotificationRepo()
        self.calendar_notes = CalendarNoteRepo()
        self.chart_annotations = ChartAnnotationRepo()
        self.settings = SettingsRepo()
        self.security = SecurityRepo()


class AppWindow(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} — XAUUSD Portfolio & Risk Terminal")
        self.geometry("1440x900")
        self.minsize(1180, 720)
        self.configure(fg_color=theme.BG_APP)

        self.repos = Repos()
        self.active_account_id = self._resolve_active_account()

        self.pages = {}
        self.nav_buttons = {}
        self.current_key = None

        self._build_layout()
        self._bind_shortcuts()
        self.show_page("dashboard")
        self.after(400, self._startup_checks)

    # -------------------------------------------------------- account ctx --
    def _resolve_active_account(self):
        saved = self.repos.settings.get("active_account_id", "")
        accounts = self.repos.accounts.active_accounts()
        if not accounts:
            return None
        ids = [a["id"] for a in accounts]
        if saved and int(saved) in ids:
            return int(saved)
        return ids[0]

    def get_active_account(self):
        if self.active_account_id is None:
            return None
        return self.repos.accounts.get(self.active_account_id)

    def set_active_account(self, account_id):
        self.active_account_id = account_id
        self.repos.settings.set("active_account_id", account_id)
        self.refresh_current_page()
        self._refresh_account_switcher()

    # ------------------------------------------------------------ layout --
    def _build_layout(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.sidebar = ctk.CTkFrame(self, fg_color=theme.BG_SIDEBAR, width=250, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsw")
        self.sidebar.grid_propagate(False)
        self._build_sidebar()

        self.content = ctk.CTkFrame(self, fg_color=theme.BG_APP, corner_radius=0)
        self.content.grid(row=0, column=1, sticky="nsew")
        self.content.grid_columnconfigure(0, weight=1)
        self.content.grid_rowconfigure(0, weight=1)

    def _build_sidebar(self):
        brand = ctk.CTkFrame(self.sidebar, fg_color="transparent", height=80)
        brand.pack(fill="x", padx=20, pady=(22, 10))
        ctk.CTkLabel(brand, text="◆ AURUM", font=theme.Fonts.get("h2"),
                     text_color=theme.GOLD).pack(anchor="w")
        ctk.CTkLabel(brand, text="XAUUSD PORTFOLIO TERMINAL", font=theme.Fonts.get("small"),
                     text_color=theme.TEXT_MUTED).pack(anchor="w")

        switcher = ctk.CTkFrame(self.sidebar, fg_color=theme.BG_PANEL, corner_radius=theme.RADIUS_SM,
                                border_width=1, border_color=theme.BORDER)
        switcher.pack(fill="x", padx=16, pady=(4, 14))
        ctk.CTkLabel(switcher, text="ACTIVE ACCOUNT", font=theme.Fonts.get("small_bold"),
                     text_color=theme.TEXT_MUTED).pack(anchor="w", padx=12, pady=(8, 0))
        self.account_var = ctk.StringVar()
        self.account_menu = ctk.CTkOptionMenu(
            switcher, values=["—"], variable=self.account_var, command=self._on_account_selected,
            fg_color=theme.BG_INPUT, button_color=theme.BG_INPUT, button_hover_color=theme.BORDER_LIGHT,
            text_color=theme.GOLD, dropdown_fg_color=theme.BG_CARD, dropdown_hover_color=theme.GOLD_SOFT_BG,
            font=theme.Fonts.get("body_bold"), height=32,
        )
        self.account_menu.pack(fill="x", padx=12, pady=(4, 10))
        self._refresh_account_switcher()

        nav_scroll = ctk.CTkScrollableFrame(self.sidebar, fg_color="transparent")
        nav_scroll.pack(fill="both", expand=True, padx=8)

        for section_title, items in NAV_SECTIONS:
            ctk.CTkLabel(nav_scroll, text=section_title, font=theme.Fonts.get("small_bold"),
                        text_color=theme.TEXT_MUTED, anchor="w").pack(fill="x", padx=12, pady=(14, 4))
            for key, label, icon_key in items:
                self._add_nav_button(nav_scroll, key, label, icon_key)

        footer = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        footer.pack(fill="x", padx=16, pady=14, side="bottom")
        ctk.CTkLabel(footer, text="Institutional-grade gold desk", font=theme.Fonts.get("small"),
                     text_color=theme.TEXT_MUTED).pack(anchor="w")

    def _add_nav_button(self, parent, key, label, icon_key):
        btn = ctk.CTkButton(
            parent, text=f"  {icon(icon_key)}   {label}", anchor="w", height=38,
            fg_color="transparent", hover_color=theme.BG_CARD_HOVER, text_color=theme.TEXT_SECONDARY,
            font=theme.Fonts.get("nav"), corner_radius=theme.RADIUS_SM,
            command=lambda k=key: self.show_page(k),
        )
        btn.pack(fill="x", pady=1)
        self.nav_buttons[key] = btn

    def _refresh_account_switcher(self):
        accounts = self.repos.accounts.active_accounts()
        names = [f"{a['name']} ({a['currency']})" for a in accounts]
        self._account_lookup = {f"{a['name']} ({a['currency']})": a["id"] for a in accounts}
        if not names:
            names = ["No accounts"]
        self.account_menu.configure(values=names)
        current = self.get_active_account()
        if current:
            self.account_var.set(f"{current['name']} ({current['currency']})")
        elif names:
            self.account_var.set(names[0])

    def _on_account_selected(self, choice):
        acc_id = self._account_lookup.get(choice)
        if acc_id:
            self.set_active_account(acc_id)

    # -------------------------------------------------------------- pages --
    def _page_class(self, key):
        from app.ui.pages import (
            dashboard, accounts, trade_entry, trade_log, strategies, tags, risk,
            statistics, chart_analysis, calendar_page, reports, backup_page,
            settings_page, security_page, ai_analysis_page, achievements_page,
            goals_page, notifications_page,
        )
        mapping = {
            "dashboard": dashboard.DashboardPage,
            "accounts": accounts.AccountsPage,
            "trade_entry": trade_entry.TradeEntryPage,
            "trade_log": trade_log.TradeLogPage,
            "strategies": strategies.StrategiesPage,
            "tags": tags.TagsPage,
            "risk": risk.RiskPage,
            "statistics": statistics.StatisticsPage,
            "chart": chart_analysis.ChartAnalysisPage,
            "calendar": calendar_page.CalendarPage,
            "reports": reports.ReportsPage,
            "backup": backup_page.BackupPage,
            "settings": settings_page.SettingsPage,
            "security": security_page.SecurityPage,
            "ai": ai_analysis_page.AIAnalysisPage,
            "achievements": achievements_page.AchievementsPage,
            "goals": goals_page.GoalsPage,
            "notifications": notifications_page.NotificationsPage,
        }
        return mapping[key]

    def show_page(self, key, **kwargs):
        for k, btn in self.nav_buttons.items():
            btn.configure(fg_color=theme.GOLD_SOFT_BG if k == key else "transparent",
                         text_color=theme.GOLD if k == key else theme.TEXT_SECONDARY)

        if key not in self.pages:
            page_cls = self._page_class(key)
            page = page_cls(self.content, self)
            page.grid(row=0, column=0, sticky="nsew")
            self.pages[key] = page

        page = self.pages[key]
        page.tkraise()
        self.current_key = key
        if hasattr(page, "refresh"):
            try:
                page.refresh(**kwargs)
            except TypeError:
                page.refresh()

    def refresh_current_page(self):
        if self.current_key and self.current_key in self.pages:
            page = self.pages[self.current_key]
            if hasattr(page, "refresh"):
                page.refresh()

    def navigate_to_trade(self, trade_id):
        self.show_page("trade_entry", trade_id=trade_id)

    # ---------------------------------------------------------- shortcuts --
    def _bind_shortcuts(self):
        self.bind("<Control-n>", lambda e: self.show_page("trade_entry"))
        self.bind("<Control-d>", lambda e: self.show_page("dashboard"))
        self.bind("<Control-l>", lambda e: self.show_page("trade_log"))
        self.bind("<Control-r>", lambda e: self.show_page("risk"))
        self.bind("<Control-s>", lambda e: self.show_page("statistics"))
        self.bind("<Control-q>", lambda e: self.destroy())

    def toast(self, message, kind="info"):
        show_toast(self, message, kind)

    # ------------------------------------------------------------- startup --
    def _startup_checks(self):
        from app.services.notifications import push_daily_reminder_if_needed
        from app.services.achievements import evaluate_achievements

        push_daily_reminder_if_needed()

        account = self.get_active_account()
        if account:
            all_trades = self.repos.trades.find(account_id=account["id"])
            unlocked = evaluate_achievements(all_trades, account["starting_balance"], account["current_balance"])
            for key in unlocked:
                self.toast(f"🏆 Achievement unlocked!", kind="success")
        if "notifications" in self.pages:
            self.pages["notifications"].refresh()
