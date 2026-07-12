"""Reusable layout primitives: page scaffolding, form fields, buttons, toasts."""
import customtkinter as ctk

from app.ui import theme


class BasePage(ctk.CTkFrame):
    """Scrollable content page with a consistent header."""

    def __init__(self, master, title="", subtitle="", actions=None):
        super().__init__(master, fg_color=theme.BG_APP)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=28, pady=(22, 10))
        header.grid_columnconfigure(0, weight=1)

        text_col = ctk.CTkFrame(header, fg_color="transparent")
        text_col.grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(text_col, text=title, font=theme.Fonts.get("h1"),
                     text_color=theme.TEXT_PRIMARY).pack(anchor="w")
        if subtitle:
            ctk.CTkLabel(text_col, text=subtitle, font=theme.Fonts.get("body"),
                        text_color=theme.TEXT_SECONDARY).pack(anchor="w", pady=(2, 0))

        if actions:
            action_col = ctk.CTkFrame(header, fg_color="transparent")
            action_col.grid(row=0, column=1, sticky="e")
            for widget_factory in actions:
                widget_factory(action_col).pack(side="left", padx=(8, 0))

        self.body = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.body.grid(row=1, column=0, sticky="nsew", padx=20, pady=(0, 20))
        self.body.grid_columnconfigure(0, weight=1)


def gold_button(master, text, command=None, icon="", width=140, fg=theme.GOLD, height=36, **kw):
    label = f"{icon}  {text}" if icon else text
    return ctk.CTkButton(
        master, text=label, command=command, width=width, height=height,
        fg_color=fg, hover_color=theme.GOLD_BRIGHT, text_color="#0A0A0D",
        font=theme.Fonts.get("body_bold"), corner_radius=theme.RADIUS_SM, **kw
    )


def ghost_button(master, text, command=None, icon="", width=140, height=36, **kw):
    label = f"{icon}  {text}" if icon else text
    return ctk.CTkButton(
        master, text=label, command=command, width=width, height=height,
        fg_color="transparent", hover_color=theme.BG_CARD_HOVER, text_color=theme.TEXT_PRIMARY,
        border_width=1, border_color=theme.BORDER, font=theme.Fonts.get("body"),
        corner_radius=theme.RADIUS_SM, **kw
    )


def danger_button(master, text, command=None, icon="", width=120, height=36, **kw):
    label = f"{icon}  {text}" if icon else text
    return ctk.CTkButton(
        master, text=label, command=command, width=width, height=height,
        fg_color=theme.RED_SOFT, hover_color=theme.RED, text_color=theme.RED,
        font=theme.Fonts.get("body_bold"), corner_radius=theme.RADIUS_SM, **kw
    )


class Card(ctk.CTkFrame):
    def __init__(self, master, title="", **kwargs):
        super().__init__(master, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                         border_width=1, border_color=theme.BORDER, **kwargs)
        if title:
            ctk.CTkLabel(self, text=title.upper(), font=theme.Fonts.get("small_bold"),
                        text_color=theme.TEXT_SECONDARY).pack(anchor="w", padx=18, pady=(14, 4))


class FormField(ctk.CTkFrame):
    """Label + input row, supports entry / dropdown / textbox / switch variants."""

    def __init__(self, master, label, kind="entry", values=None, default="", placeholder="",
                 width=220, height=34, **kwargs):
        super().__init__(master, fg_color="transparent")
        ctk.CTkLabel(self, text=label, font=theme.Fonts.get("small_bold"),
                     text_color=theme.TEXT_SECONDARY, anchor="w").pack(anchor="w", pady=(0, 4))
        self.kind = kind
        common = dict(fg_color=theme.BG_INPUT, border_color=theme.BORDER, border_width=1,
                     text_color=theme.TEXT_PRIMARY, corner_radius=theme.RADIUS_SM)
        if kind == "entry":
            self.var = ctk.StringVar(value=str(default))
            self.widget = ctk.CTkEntry(self, textvariable=self.var, width=width, height=height,
                                       placeholder_text=placeholder, **common)
        elif kind == "dropdown":
            self.var = ctk.StringVar(value=str(default) if default else (values[0] if values else ""))
            self.widget = ctk.CTkOptionMenu(self, values=values or [], variable=self.var, width=width,
                                            height=height, fg_color=theme.BG_INPUT,
                                            button_color=theme.BG_INPUT, button_hover_color=theme.BORDER_LIGHT,
                                            text_color=theme.TEXT_PRIMARY, dropdown_fg_color=theme.BG_CARD,
                                            dropdown_text_color=theme.TEXT_PRIMARY,
                                            dropdown_hover_color=theme.GOLD_SOFT_BG)
        elif kind == "textbox":
            self.widget = ctk.CTkTextbox(self, width=width, height=height, **common)
            if default:
                self.widget.insert("1.0", str(default))
        elif kind == "switch":
            self.var = ctk.BooleanVar(value=bool(default))
            self.widget = ctk.CTkSwitch(self, text="", variable=self.var, progress_color=theme.GOLD,
                                        button_color=theme.TEXT_PRIMARY)
        self.widget.pack(anchor="w", fill="x" if kind in ("entry", "dropdown", "textbox") else "none")

    def get(self):
        if self.kind == "textbox":
            return self.widget.get("1.0", "end").strip()
        if self.kind == "switch":
            return self.var.get()
        return self.var.get()

    def set(self, value):
        if self.kind == "textbox":
            self.widget.delete("1.0", "end")
            self.widget.insert("1.0", str(value) if value is not None else "")
        elif self.kind == "switch":
            self.var.set(bool(value))
        else:
            self.var.set(str(value) if value is not None else "")


class Toast(ctk.CTkToplevel):
    """Transient, animated slide-in notification bubble."""

    def __init__(self, master, message, kind="info", duration=2600):
        super().__init__(master)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        try:
            self.attributes("-alpha", 0.0)
        except Exception:
            pass

        colors = {
            "info": (theme.BG_CARD, theme.GOLD),
            "success": (theme.GREEN_SOFT, theme.GREEN),
            "warning": (theme.GOLD_SOFT_BG, theme.AMBER),
            "error": (theme.RED_SOFT, theme.RED),
        }
        bg, accent = colors.get(kind, colors["info"])

        frame = ctk.CTkFrame(self, fg_color=bg, corner_radius=theme.RADIUS_SM,
                             border_width=1, border_color=accent)
        frame.pack(fill="both", expand=True)
        ctk.CTkLabel(frame, text=message, font=theme.Fonts.get("body"), text_color=theme.TEXT_PRIMARY,
                     wraplength=320).pack(padx=18, pady=12)

        self.update_idletasks()
        master.update_idletasks()
        mx, my = master.winfo_rootx(), master.winfo_rooty()
        mw = master.winfo_width()
        w, h = self.winfo_reqwidth(), self.winfo_reqheight()
        self.geometry(f"{w}x{h}+{mx + mw - w - 30}+{my + 50}")

        self._fade_in()
        self.after(duration, self._fade_out)

    def _fade_in(self, alpha=0.0):
        try:
            alpha = min(1.0, alpha + 0.12)
            self.attributes("-alpha", alpha)
            if alpha < 1.0:
                self.after(15, lambda: self._fade_in(alpha))
        except Exception:
            pass

    def _fade_out(self, alpha=1.0):
        try:
            alpha = max(0.0, alpha - 0.12)
            self.attributes("-alpha", alpha)
            if alpha > 0.0:
                self.after(15, lambda: self._fade_out(alpha))
            else:
                self.destroy()
        except Exception:
            self.destroy()


def show_toast(master, message, kind="info"):
    try:
        Toast(master, message, kind)
    except Exception:
        pass


class ProgressBarRow(ctk.CTkFrame):
    def __init__(self, master, label, value_pct=0, subtitle="", color=None, **kwargs):
        super().__init__(master, fg_color="transparent", **kwargs)
        top = ctk.CTkFrame(self, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text=label, font=theme.Fonts.get("body_bold"),
                     text_color=theme.TEXT_PRIMARY).pack(side="left")
        self.pct_label = ctk.CTkLabel(top, text=f"{value_pct:.0f}%", font=theme.Fonts.get("body"),
                                      text_color=theme.GOLD)
        self.pct_label.pack(side="right")
        self.bar = ctk.CTkProgressBar(self, progress_color=color or theme.GOLD, fg_color=theme.BG_INPUT,
                                      height=10, corner_radius=6)
        self.bar.pack(fill="x", pady=(6, 2))
        self.bar.set(max(0.0, min(1.0, value_pct / 100.0)))
        self.sub = ctk.CTkLabel(self, text=subtitle, font=theme.Fonts.get("small"),
                                text_color=theme.TEXT_MUTED, anchor="w")
        self.sub.pack(fill="x")

    def set_progress(self, value_pct, subtitle=None):
        self.bar.set(max(0.0, min(1.0, value_pct / 100.0)))
        self.pct_label.configure(text=f"{value_pct:.0f}%")
        if subtitle is not None:
            self.sub.configure(text=subtitle)
