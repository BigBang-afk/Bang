"""Setup tag manager: liquidity sweeps, BOS, CHOCH, OB, FVG and more."""
import customtkinter as ctk

from app.ui import theme
from app.ui.widgets.common import BasePage, FormField, gold_button, danger_button, show_toast


class TagsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Setup Tags", "Tag every trade by structure, zone and style",
                         actions=[lambda m: gold_button(m, "New Tag", icon="＋", command=self._new_tag)])
        self.grid_holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.grid_holder.pack(fill="both", expand=True)
        for i in range(4):
            self.grid_holder.grid_columnconfigure(i, weight=1, uniform="tag")

    def refresh(self, **_):
        for w in self.grid_holder.winfo_children():
            w.destroy()
        tags = self.app.repos.tags.all(order_by="category, name")
        account = self.app.get_active_account()
        usage = {}
        if account:
            for t in self.app.repos.trades.find(account_id=account["id"]):
                for tag in self.app.repos.tags.tags_for_trade(t["id"]):
                    usage[tag["id"]] = usage.get(tag["id"], 0) + 1

        for i, tag in enumerate(tags):
            r, c = divmod(i, 4)
            card = ctk.CTkFrame(self.grid_holder, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                                border_width=1, border_color=theme.BORDER)
            card.grid(row=r, column=c, sticky="nsew", padx=6, pady=6)
            ctk.CTkLabel(card, text=tag["name"], font=theme.Fonts.get("body_bold"),
                        text_color=theme.GOLD).pack(anchor="w", padx=14, pady=(12, 0))
            ctk.CTkLabel(card, text=tag["category"], font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_SECONDARY).pack(anchor="w", padx=14)
            ctk.CTkLabel(card, text=f"Used in {usage.get(tag['id'], 0)} trades", font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED).pack(anchor="w", padx=14, pady=(2, 8))
            danger_button(card, "Delete", width=90, height=26,
                         command=lambda t=tag: self._delete(t)).pack(anchor="w", padx=14, pady=(0, 12))

    def _delete(self, tag):
        self.app.repos.tags.delete(tag["id"])
        show_toast(self.app, f"Tag '{tag['name']}' deleted.", "warning")
        self.refresh()

    def _new_tag(self):
        dialog = ctk.CTkToplevel(self.app)
        dialog.title("New Tag")
        dialog.geometry("340x260")
        dialog.configure(fg_color=theme.BG_APP)
        dialog.transient(self.app)
        dialog.grab_set()

        form = ctk.CTkFrame(dialog, fg_color="transparent")
        form.pack(fill="both", expand=True, padx=20, pady=20)
        f_name = FormField(form, "Tag Name")
        f_name.pack(fill="x", pady=6)
        f_cat = FormField(form, "Category", kind="dropdown",
                          values=["Price Action", "Structure", "Zone", "Liquidity", "Technical",
                                  "Market Type", "Style", "General"], default="General")
        f_cat.pack(fill="x", pady=6)

        def save():
            name = f_name.get().strip()
            if not name:
                show_toast(self.app, "Tag name is required.", "error")
                return
            self.app.repos.tags.create(name, f_cat.get())
            dialog.destroy()
            self.refresh()

        gold_button(form, "Save Tag", command=save, width=300).pack(pady=10)
