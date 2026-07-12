"""Chart analysis: annotate stored XAUUSD chart screenshots with SMC/ICT drawing tools."""
import json
import os
from datetime import datetime

import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, simpledialog

from app.config import SCREENSHOTS_DIR
from app.ui import theme
from app.ui.widgets.common import BasePage, gold_button, ghost_button, danger_button, show_toast

TOOLS = {
    "Trendline": ("line", theme.GOLD),
    "Support": ("line", theme.GREEN),
    "Resistance": ("line", theme.RED),
    "Supply Zone": ("zone", theme.RED),
    "Demand Zone": ("zone", theme.GREEN),
    "Order Block": ("zone", theme.BLUE),
    "Fair Value Gap": ("zone", theme.PURPLE),
    "Liquidity": ("line", theme.AMBER),
    "Label": ("label", theme.TEXT_PRIMARY),
}


class ChartAnalysisPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Chart Analysis", "Annotate XAUUSD chart screenshots like a prop desk",
                         actions=[lambda m: gold_button(m, "New Chart", icon="＋", command=self._new_chart)])
        self.grid_holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.grid_holder.pack(fill="both", expand=True)
        for i in range(3):
            self.grid_holder.grid_columnconfigure(i, weight=1, uniform="chart")

    def refresh(self, **_):
        for w in self.grid_holder.winfo_children():
            w.destroy()
        charts = self.app.repos.chart_annotations.all(order_by="created_at DESC")
        if not charts:
            ctk.CTkLabel(self.grid_holder, text="No charts yet. Click 'New Chart' to attach a screenshot.",
                        font=theme.Fonts.get("body"), text_color=theme.TEXT_MUTED).grid(row=0, column=0, pady=40)
            return
        for i, chart in enumerate(charts):
            r, c = divmod(i, 3)
            self._chart_card(chart).grid(row=r, column=c, sticky="nsew", padx=8, pady=8)

    def _chart_card(self, chart):
        card = ctk.CTkFrame(self.grid_holder, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                            border_width=1, border_color=theme.BORDER)
        thumb = ctk.CTkLabel(card, text="", height=160, fg_color=theme.BG_INPUT, corner_radius=8)
        thumb.pack(fill="x", padx=14, pady=(14, 8))
        if chart["image_path"] and os.path.exists(chart["image_path"]):
            try:
                from PIL import Image
                img = Image.open(chart["image_path"])
                img.thumbnail((360, 160))
                ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=img.size)
                thumb.configure(image=ctk_img, text="")
                thumb.image = ctk_img
            except Exception:
                thumb.configure(text="Preview unavailable")
        ctk.CTkLabel(card, text=chart["title"], font=theme.Fonts.get("body_bold"),
                    text_color=theme.TEXT_PRIMARY, anchor="w").pack(fill="x", padx=14)
        ctk.CTkLabel(card, text=chart["created_at"], font=theme.Fonts.get("small"),
                    text_color=theme.TEXT_MUTED, anchor="w").pack(fill="x", padx=14, pady=(0, 8))
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.pack(fill="x", padx=14, pady=(0, 14))
        gold_button(actions, "Open Editor", width=120, height=30,
                   command=lambda: ChartEditorWindow(self.app, self, chart)).pack(side="left", padx=(0, 6))
        danger_button(actions, "Delete", width=80, height=30,
                     command=lambda: self._delete(chart)).pack(side="left")
        return card

    def _delete(self, chart):
        self.app.repos.chart_annotations.delete(chart["id"])
        show_toast(self.app, "Chart deleted.", "warning")
        self.refresh()

    def _new_chart(self):
        path = filedialog.askopenfilename(
            title="Select XAUUSD chart screenshot",
            filetypes=[("Images", "*.png *.jpg *.jpeg *.gif *.bmp"), ("All files", "*.*")],
        )
        if not path:
            return
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        import shutil
        dest_name = f"chart_{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.path.basename(path)}"
        dest_path = os.path.join(SCREENSHOTS_DIR, dest_name)
        shutil.copy2(path, dest_path)
        title = simpledialog.askstring("Chart Title", "Name this chart:", initialvalue="XAUUSD Setup") or "XAUUSD Setup"
        chart_id = self.app.repos.chart_annotations.create(title, dest_path)
        self.refresh()
        chart = self.app.repos.chart_annotations.get(chart_id)
        ChartEditorWindow(self.app, self, chart)


class ChartEditorWindow(ctk.CTkToplevel):
    """Full drawing tool: trendlines, S/R, supply/demand, FVG, order blocks, liquidity, labels."""

    def __init__(self, app, parent_page, chart_row):
        super().__init__(app)
        self.app = app
        self.parent_page = parent_page
        self.chart_row = chart_row
        self.title(f"Chart Analysis — {chart_row['title']}")
        self.geometry("1200x760")
        self.configure(fg_color=theme.BG_APP)
        self.transient(app)

        self.annotations = json.loads(chart_row["annotation_json"] or "[]")
        self.current_tool = "Trendline"
        self.zoom = 1.0
        self.start_pt = None
        self.tk_image = None
        self.pil_image = None
        self.is_fullscreen = False

        self._build_toolbar()
        self._build_canvas()
        self._load_image()
        self._redraw()

        self.bind("<F11>", lambda e: self._toggle_fullscreen())
        self.bind("<Escape>", lambda e: self._exit_fullscreen())

    def _build_toolbar(self):
        bar = ctk.CTkFrame(self, fg_color=theme.BG_PANEL, corner_radius=0)
        bar.pack(fill="x")
        tool_bar = ctk.CTkFrame(bar, fg_color="transparent")
        tool_bar.pack(side="left", padx=10, pady=8)
        self.tool_var = ctk.StringVar(value=self.current_tool)
        for name in TOOLS:
            btn = ctk.CTkRadioButton(tool_bar, text=name, variable=self.tool_var, value=name,
                                     command=lambda n=name: self._set_tool(n), fg_color=theme.GOLD,
                                     border_color=theme.BORDER, text_color=theme.TEXT_SECONDARY)
            btn.pack(side="left", padx=6)

        action_bar = ctk.CTkFrame(bar, fg_color="transparent")
        action_bar.pack(side="right", padx=10, pady=8)
        ghost_button(action_bar, "Zoom -", command=lambda: self._adjust_zoom(-0.1), width=80, height=30).pack(
            side="left", padx=3)
        ghost_button(action_bar, "Zoom +", command=lambda: self._adjust_zoom(0.1), width=80, height=30).pack(
            side="left", padx=3)
        ghost_button(action_bar, "Undo", command=self._undo, width=80, height=30).pack(side="left", padx=3)
        danger_button(action_bar, "Clear", command=self._clear, width=80, height=30).pack(side="left", padx=3)
        ghost_button(action_bar, "Fullscreen", command=self._toggle_fullscreen, width=100, height=30).pack(
            side="left", padx=3)
        gold_button(action_bar, "Save", command=self._save, width=90, height=30).pack(side="left", padx=3)

    def _build_canvas(self):
        wrap = ctk.CTkFrame(self, fg_color=theme.BG_APP)
        wrap.pack(fill="both", expand=True)
        self.canvas = tk.Canvas(wrap, bg="#050506", highlightthickness=0)
        hbar = tk.Scrollbar(wrap, orient="horizontal", command=self.canvas.xview)
        vbar = tk.Scrollbar(wrap, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(xscrollcommand=hbar.set, yscrollcommand=vbar.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        vbar.grid(row=0, column=1, sticky="ns")
        hbar.grid(row=1, column=0, sticky="ew")
        wrap.grid_rowconfigure(0, weight=1)
        wrap.grid_columnconfigure(0, weight=1)

        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)

    def _load_image(self):
        path = self.chart_row["image_path"]
        if path and os.path.exists(path):
            from PIL import Image
            self.pil_image = Image.open(path)
        else:
            from PIL import Image
            self.pil_image = Image.new("RGB", (1000, 600), "#111116")

    def _set_tool(self, name):
        self.current_tool = name

    def _adjust_zoom(self, delta):
        self.zoom = max(0.3, min(3.0, self.zoom + delta))
        self._redraw()

    def _img_coords(self, event):
        x = self.canvas.canvasx(event.x) / self.zoom
        y = self.canvas.canvasy(event.y) / self.zoom
        return x, y

    def _on_press(self, event):
        x, y = self._img_coords(event)
        if self.current_tool == "Label":
            text = simpledialog.askstring("Label", "Enter label text:", parent=self)
            if text:
                self.annotations.append({"type": "label", "x": x, "y": y, "text": text, "color": TOOLS["Label"][1]})
                self._redraw()
            return
        self.start_pt = (x, y)

    def _on_drag(self, event):
        pass  # live preview omitted for simplicity/performance; shape confirmed on release

    def _on_release(self, event):
        if self.current_tool == "Label" or self.start_pt is None:
            return
        x, y = self._img_coords(event)
        kind, color = TOOLS[self.current_tool]
        shape = {"type": kind, "tool": self.current_tool, "x1": self.start_pt[0], "y1": self.start_pt[1],
                "x2": x, "y2": y, "color": color}
        self.annotations.append(shape)
        self.start_pt = None
        self._redraw()

    def _undo(self):
        if self.annotations:
            self.annotations.pop()
            self._redraw()

    def _clear(self):
        self.annotations = []
        self._redraw()

    def _redraw(self):
        self.canvas.delete("all")
        w, h = self.pil_image.size
        disp_size = (max(1, int(w * self.zoom)), max(1, int(h * self.zoom)))
        from PIL import Image
        resized = self.pil_image.resize(disp_size)
        self.tk_image = ImageTk_PhotoImage(resized)
        self.canvas.create_image(0, 0, anchor="nw", image=self.tk_image)
        self.canvas.configure(scrollregion=(0, 0, disp_size[0], disp_size[1]))

        for ann in self.annotations:
            z = self.zoom
            if ann["type"] == "line":
                self.canvas.create_line(ann["x1"] * z, ann["y1"] * z, ann["x2"] * z, ann["y2"] * z,
                                        fill=ann["color"], width=2)
            elif ann["type"] == "zone":
                self.canvas.create_rectangle(ann["x1"] * z, ann["y1"] * z, ann["x2"] * z, ann["y2"] * z,
                                             outline=ann["color"], width=2, stipple="gray25", fill=ann["color"])
            elif ann["type"] == "label":
                self.canvas.create_text(ann["x"] * z, ann["y"] * z, text=ann["text"], fill=ann["color"],
                                        anchor="nw", font=(theme.FONT_FAMILY, 12, "bold"))

    def _toggle_fullscreen(self):
        self.is_fullscreen = not self.is_fullscreen
        self.attributes("-fullscreen", self.is_fullscreen)

    def _exit_fullscreen(self):
        self.is_fullscreen = False
        self.attributes("-fullscreen", False)

    def _save(self):
        self.app.repos.chart_annotations.update_annotations(self.chart_row["id"], json.dumps(self.annotations))
        show_toast(self.app, "Chart annotations saved.", "success")
        self.parent_page.refresh()


def ImageTk_PhotoImage(pil_image):
    from PIL import ImageTk
    return ImageTk.PhotoImage(pil_image)
