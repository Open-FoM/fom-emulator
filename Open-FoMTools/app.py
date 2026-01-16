#!/usr/bin/env python3
import os
import sys
import subprocess
import threading
import queue
import time
import tkinter as tk
from tkinter import filedialog, messagebox, font


ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
REPO_ROOT = os.path.abspath(os.path.join(ROOT_DIR, ".."))
TOOLS_DIR = ROOT_DIR
REL_ROOT = os.path.relpath(ROOT_DIR, REPO_ROOT)
DEFAULT_OUT = os.path.join(REL_ROOT, "Output")

SCRIPT_LTB = os.path.join(TOOLS_DIR, "ltb_exporter.py")
SCRIPT_LTB_TO_LTA = os.path.join(TOOLS_DIR, "ltb_to_lta.py")
SCRIPT_DAT = os.path.join(TOOLS_DIR, "fom_dat_tool.py")
SCRIPT_DAT_DUMP = os.path.join(TOOLS_DIR, "fom_dat_dump.py")
SCRIPT_DTX = os.path.join(TOOLS_DIR, "fom_dtx_to_png.py")
SCRIPT_OBJ = os.path.join(TOOLS_DIR, "obj_triangulate_gltf.py")


PALETTE = {
    "bg": "#0b0d12",
    "panel": "#151923",
    "panel_2": "#1c2230",
    "panel_3": "#11151d",
    "accent": "#f8b547",
    "accent_2": "#49d6c8",
    "text": "#e6edf3",
    "muted": "#9aa4b2",
    "danger": "#ff6b6b",
    "border": "#222836",
}

def format_cmd(cmd):
    def quote(arg):
        if any(ch in arg for ch in (" ", "\t")):
            return f"\"{arg}\""
        return arg
    return " ".join(quote(part) for part in cmd)

def resolve_font(preferred, fallback):
    try:
        families = set(font.families())
    except tk.TclError:
        return fallback
    return preferred if preferred in families else fallback


def abs_from_repo(path):
    if os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(REPO_ROOT, path))


class Job:
    def __init__(self, job_id, title, cmd, workdir):
        self.job_id = job_id
        self.title = title
        self.cmd = cmd
        self.workdir = workdir
        self.process = None
        self.status = "queued"
        self.exit_code = None
        self.started_at = None


class Tooltip:
    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tip = None
        widget.bind("<Enter>", self.show)
        widget.bind("<Leave>", self.hide)

    def show(self, _event=None):
        if not self.text or self.tip:
            return
        x = self.widget.winfo_rootx() + 10
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 6
        self.tip = tk.Toplevel(self.widget)
        self.tip.wm_overrideredirect(True)
        self.tip.wm_geometry(f"+{x}+{y}")
        label = tk.Label(
            self.tip,
            text=self.text,
            bg=PALETTE["panel_2"],
            fg=PALETTE["text"],
            padx=8,
            pady=4,
            font=("Segoe UI", 9),
            relief="solid",
            borderwidth=1,
        )
        label.pack()

    def hide(self, _event=None):
        if self.tip:
            self.tip.destroy()
            self.tip = None


class FoMToolsApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Open-FoM Tools")
        self.root.configure(bg=PALETTE["bg"])
        self.root.geometry("1180x760")
        self.root.minsize(1080, 700)

        base_font = resolve_font("Space Grotesk", "Segoe UI")
        mono_font = resolve_font("Space Mono", "Consolas")

        self.font_base = (base_font, 11)
        self.font_bold = (base_font, 11, "bold")
        self.font_title = (base_font, 16, "bold")
        self.font_sub = (base_font, 9)
        self.font_subtle = (base_font, 9)
        self.font_mono = (mono_font, 9)

        self.nav_buttons = {}
        self.pages = {}
        self.active_page = None

        self.jobs = []
        self.job_counter = 1
        self.log_queue = queue.Queue()
        self.current_job = None
        self.active_nav = None
        self.page_help = {
            "Extract World": "Convert .dat worlds into LTA + manifest for DEdit and optional asset copy.",
            "Dump World": "Render OBJ dump with UVs + optional texture conversion.",
            "Export LTB": "Export LTB models to OBJ/MTL. Optional glTF if enabled.",
            "LTB → LTA": "Batch convert LTB models to LTA for DEdit.",
            "Convert Textures": "Batch convert .dtx textures to PNG.",
            "OBJ → glTF": "Triangulate OBJ and emit glTF for easier imports.",
        }

        self._build_layout()
        self._build_pages()
        self._select_page("Extract World")
        self._poll_log_queue()

    def _build_layout(self):
        self.app_shell = tk.Frame(self.root, bg=PALETTE["bg"])
        self.app_shell.pack(fill="both", expand=True)

        self.sidebar = tk.Frame(self.app_shell, bg="#0f121a", width=240)
        self.sidebar.pack(side="left", fill="y")

        brand = tk.Frame(self.sidebar, bg="#0f121a")
        brand.pack(fill="x", padx=20, pady=(24, 20))

        brand_row = tk.Frame(brand, bg="#0f121a")
        brand_row.pack(fill="x")

        logo_path = os.path.join(ROOT_DIR, "logo.png")
        self.brand_logo = None
        if os.path.exists(logo_path):
            try:
                self.brand_logo = tk.PhotoImage(file=logo_path)
            except tk.TclError:
                self.brand_logo = None
        if self.brand_logo:
            self.root.iconphoto(True, self.brand_logo)
        if self.brand_logo:
            tk.Label(brand_row, image=self.brand_logo, bg="#0f121a").pack(side="left", padx=(0, 10))

        title_block = tk.Frame(brand_row, bg="#0f121a")
        title_block.pack(side="left", fill="x", expand=True)
        tk.Label(title_block, text="Open-FoM Tools", fg=PALETTE["text"], bg="#0f121a", font=self.font_title).pack(anchor="w")
        tk.Label(title_block, text="LithTech Utility Suite", fg=PALETTE["muted"], bg="#0f121a", font=self.font_sub).pack(anchor="w")

        nav = tk.Frame(self.sidebar, bg="#0f121a")
        nav.pack(fill="x", padx=12)
        self._add_nav_button(nav, "Extract World")
        self._add_nav_button(nav, "Dump World")
        self._add_nav_button(nav, "Export LTB")
        self._add_nav_button(nav, "LTB → LTA")
        self._add_nav_button(nav, "Convert Textures")
        self._add_nav_button(nav, "OBJ → glTF")

        self.content = tk.Frame(self.app_shell, bg=PALETTE["bg"])
        self.content.pack(side="left", fill="both", expand=True)

        self.topbar = tk.Frame(self.content, bg="#141822", height=72)
        self.topbar.pack(fill="x")
        self.topbar.pack_propagate(False)
        self.topbar_title = tk.Label(self.topbar, text="", fg=PALETTE["text"], bg="#141822", font=self.font_bold)
        self.topbar_title.pack(anchor="w", padx=24, pady=(12, 0))
        self.topbar_sub = tk.Label(self.topbar, text="", fg=PALETTE["muted"], bg="#141822", font=self.font_subtle)
        self.topbar_sub.pack(anchor="w", padx=24)

        self.body = tk.Frame(self.content, bg=PALETTE["bg"])
        self.body.pack(fill="both", expand=True)
        self.body.grid_columnconfigure(0, weight=1)
        self.body.grid_columnconfigure(1, weight=0, minsize=340)
        self.body.grid_rowconfigure(0, weight=1)

        self.page_container = tk.Frame(self.body, bg=PALETTE["bg"])
        self.page_container.grid(row=0, column=0, sticky="nsew")

        self.log_panel = tk.Frame(self.body, bg=PALETTE["panel"], highlightbackground=PALETTE["border"], highlightthickness=1)
        self.log_panel.grid(row=0, column=1, sticky="nsew", padx=(0, 20), pady=18)

        header = tk.Frame(self.log_panel, bg=PALETTE["panel"])
        header.pack(fill="x", padx=14, pady=(10, 6))
        tk.Label(header, text="Jobs + Logs", fg=PALETTE["text"], bg=PALETTE["panel"], font=self.font_bold).pack(side="left")
        self.job_status_label = tk.Label(header, text="Idle", fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub)
        self.job_status_label.pack(side="left", padx=12)
        cancel_btn = tk.Button(header, text="Cancel Current", command=self._cancel_current_job,
                               bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat",
                               activebackground=PALETTE["danger"], activeforeground=PALETTE["text"])
        cancel_btn.pack(side="right")
        self._apply_hover(cancel_btn, PALETTE["panel_2"], PALETTE["danger"])

        body = tk.Frame(self.log_panel, bg=PALETTE["panel"])
        body.pack(fill="both", expand=True, padx=12, pady=(0, 10))

        self.jobs_list = tk.Listbox(
            body,
            bg=PALETTE["panel_2"],
            fg=PALETTE["text"],
            selectbackground=PALETTE["accent"],
            selectforeground="#141414",
            relief="flat",
            height=5,
            font=self.font_sub,
        )
        self.jobs_list.pack(fill="x", pady=(0, 8))

        self.log_text = tk.Text(
            body,
            bg=PALETTE["panel_3"],
            fg=PALETTE["text"],
            insertbackground=PALETTE["text"],
            relief="flat",
            height=10,
            font=self.font_mono,
            wrap="word",
        )
        self.log_text.pack(fill="both", expand=True)
        self.log_text.tag_configure("stderr", foreground=PALETTE["danger"])
        self.log_text.tag_configure("info", foreground=PALETTE["accent_2"])

    def _add_nav_button(self, parent, label):
        btn = tk.Button(
            parent,
            text=label,
            anchor="w",
            bg="#0f121a",
            fg=PALETTE["text"],
            activebackground=PALETTE["panel_2"],
            activeforeground=PALETTE["text"],
            relief="flat",
            padx=12,
            pady=8,
            font=self.font_bold,
            command=lambda name=label: self._select_page(name),
        )
        btn.pack(fill="x", pady=4)
        Tooltip(btn, self.page_help.get(label, ""))
        btn.bind("<Enter>", lambda _e, b=btn, name=label: self._nav_hover_enter(b, name))
        btn.bind("<Leave>", lambda _e, b=btn, name=label: self._nav_hover_leave(b, name))
        self.nav_buttons[label] = btn

    def _set_nav_active(self, name):
        self.active_nav = name
        for label, btn in self.nav_buttons.items():
            if label == name:
                btn.configure(bg="#232a37")
            else:
                btn.configure(bg="#0f121a")

    def _panel(self, parent, title, subtitle=""):
        wrapper = tk.Frame(parent, bg=PALETTE["panel"], highlightbackground=PALETTE["border"], highlightthickness=1)
        header = tk.Frame(wrapper, bg=PALETTE["panel"])
        header.pack(fill="x", padx=16, pady=(14, 10))
        tk.Label(header, text=title, fg=PALETTE["text"], bg=PALETTE["panel"], font=self.font_bold).pack(side="left")
        if subtitle:
            tk.Label(header, text=subtitle, fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(side="right")
        body = tk.Frame(wrapper, bg=PALETTE["panel"])
        body.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        return wrapper, body

    def _build_pages(self):
        self.pages["Extract World"] = self._page_extract_world()
        self.pages["Dump World"] = self._page_dump_world()
        self.pages["Export LTB"] = self._page_export_ltb()
        self.pages["LTB → LTA"] = self._page_ltb_to_lta()
        self.pages["Convert Textures"] = self._page_convert_textures()
        self.pages["OBJ → glTF"] = self._page_obj_gltf()

    def _select_page(self, name):
        if self.active_page:
            self.active_page.pack_forget()
        page = self.pages.get(name)
        if page:
            page.pack(fill="both", expand=True)
            self.active_page = page
            self.topbar_title.configure(text=name)
            self.topbar_sub.configure(text=self.page_help.get(name, ""))
            self._set_nav_active(name)

    def _nav_hover_enter(self, btn, label):
        if label != self.active_nav:
            btn.configure(bg=PALETTE["panel_2"])

    def _nav_hover_leave(self, btn, label):
        if label != self.active_nav:
            btn.configure(bg="#0f121a")

    def _page_jobs_only(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "Job Monitor", "stdout/stderr streaming")
        panel.pack(fill="both", expand=True, padx=24, pady=18)
        tk.Label(body, text="Use the tool panels to start jobs. Output will stream below.", fg=PALETTE["muted"], bg=PALETTE["panel"]).pack(anchor="w")
        return frame

    def _page_export_ltb(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "LTB → OBJ + glTF", "ltb_exporter.py")
        panel.pack(fill="both", expand=True, padx=24, pady=18)

        inputs = []
        textures = []
        out_dir = tk.StringVar(value=DEFAULT_OUT)
        lod_var = tk.StringVar()
        skip_anims = tk.IntVar(value=0)
        export_gltf = tk.IntVar(value=0)
        cmd_preview = tk.StringVar()
        cmd_list = []

        list_frame = tk.Frame(body, bg=PALETTE["panel"])
        list_frame.pack(fill="x", pady=6)
        tk.Label(list_frame, text="Inputs (.ltb)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        listbox = tk.Listbox(list_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=4)
        listbox.pack(fill="x", pady=4)

        buttons = tk.Frame(list_frame, bg=PALETTE["panel"])
        buttons.pack(fill="x")

        def add_files():
            files = filedialog.askopenfilenames(title="Select LTB files", filetypes=[("LTB files", "*.ltb")])
            for item in files:
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def add_dir():
            folder = filedialog.askdirectory(title="Select folder with LTB files")
            if not folder:
                return
            for fname in os.listdir(folder):
                if not fname.lower().endswith(".ltb"):
                    continue
                item = os.path.join(folder, fname)
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def remove_selected():
            sel = list(listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = listbox.get(index)
                if value in inputs:
                    inputs.remove(value)
                listbox.delete(index)
            update_cmd()

        btn = tk.Button(buttons, text="Add Files", command=add_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Add Folder", command=add_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Remove Selected", command=remove_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        tex_frame = tk.Frame(body, bg=PALETTE["panel"])
        tex_frame.pack(fill="x", pady=(10, 6))
        tk.Label(tex_frame, text="Textures (optional .dtx/.png)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        tex_listbox = tk.Listbox(tex_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=3)
        tex_listbox.pack(fill="x", pady=4)

        tex_buttons = tk.Frame(tex_frame, bg=PALETTE["panel"])
        tex_buttons.pack(fill="x")

        def add_tex_files():
            files = filedialog.askopenfilenames(title="Select texture files", filetypes=[("Texture files", "*.dtx *.png")])
            for item in files:
                if item not in textures:
                    textures.append(item)
                    tex_listbox.insert("end", item)
            update_cmd()

        def add_tex_dir():
            folder = filedialog.askdirectory(title="Select folder with textures")
            if not folder:
                return
            for fname in os.listdir(folder):
                if not fname.lower().endswith((".dtx", ".png")):
                    continue
                item = os.path.join(folder, fname)
                if item not in textures:
                    textures.append(item)
                    tex_listbox.insert("end", item)
            update_cmd()

        def remove_tex_selected():
            sel = list(tex_listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = tex_listbox.get(index)
                if value in textures:
                    textures.remove(value)
                tex_listbox.delete(index)
            update_cmd()

        btn = tk.Button(tex_buttons, text="Add Files", command=add_tex_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(tex_buttons, text="Add Folder", command=add_tex_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(tex_buttons, text="Remove Selected", command=remove_tex_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        tk.Label(body, text="Manual textures map to materials in order. Leave empty to auto-detect from Resources/Skins.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)

        self._dir_row(body, "Output Dir", out_dir)

        row = tk.Frame(body, bg=PALETTE["panel"])
        row.pack(fill="x", pady=6)
        tk.Label(row, text="LOD (optional)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(side="left")
        lod_entry = tk.Entry(row, textvariable=lod_var, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", width=8)
        lod_entry.pack(side="left", padx=8)
        tk.Checkbutton(row, text="Skip anims", variable=skip_anims, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=8)
        tk.Checkbutton(row, text="Export glTF", variable=export_gltf, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=8)
        tk.Label(body, text="UVs are flipped for Blender by default. Enable glTF only when you need it.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)

        cmd_entry = self._command_preview(body, cmd_preview)

        def update_cmd(*_args):
            if not inputs:
                cmd_preview.set("")
                cmd_list[:] = []
                return
            commands = []
            for item in inputs:
                cmd = [sys.executable, SCRIPT_LTB, "--ltb", item, "--out", out_dir.get()]
                if lod_var.get().strip():
                    cmd += ["--lod", lod_var.get().strip()]
                if skip_anims.get():
                    cmd += ["--no-anims"]
                if export_gltf.get():
                    cmd += ["--gltf"]
                for tex in textures:
                    cmd += ["--textures", tex]
                commands.append(cmd)
            cmd_list[:] = commands
            if len(commands) == 1:
                cmd_preview.set(format_cmd(commands[0]))
            else:
                cmd_preview.set(f"{len(commands)} jobs. First: {format_cmd(commands[0])}")

        out_dir.trace_add("write", update_cmd)
        lod_var.trace_add("write", update_cmd)
        skip_anims.trace_add("write", update_cmd)
        export_gltf.trace_add("write", update_cmd)
        update_cmd()

        self._action_row(body, cmd_list, cmd_preview, "Export LTB",
                         lambda: self._run_tool("Export LTB", cmd_list, out_dir.get()))
        return frame


    def _page_ltb_to_lta(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "LTB -> LTA (DEdit)", "ltb_to_lta.py")
        panel.pack(fill="both", expand=True, padx=24, pady=18)

        inputs = []
        textures = []
        out_dir = tk.StringVar(value=DEFAULT_OUT)
        resources_root = tk.StringVar()
        no_recursive = tk.IntVar(value=0)
        output_next_to = tk.IntVar(value=0)
        cmd_preview = tk.StringVar()
        cmd_list = []

        list_frame = tk.Frame(body, bg=PALETTE["panel"])
        list_frame.pack(fill="x", pady=6)
        tk.Label(list_frame, text="Inputs (.ltb or folder)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        listbox = tk.Listbox(list_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=4)
        listbox.pack(fill="x", pady=4)

        buttons = tk.Frame(list_frame, bg=PALETTE["panel"])
        buttons.pack(fill="x")

        def add_files():
            files = filedialog.askopenfilenames(title="Select LTB files", filetypes=[("LTB files", "*.ltb")])
            for item in files:
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def add_dir():
            folder = filedialog.askdirectory(title="Select folder with LTB files")
            if not folder:
                return
            if folder not in inputs:
                inputs.append(folder)
                listbox.insert("end", folder)
            update_cmd()

        def remove_selected():
            sel = list(listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = listbox.get(index)
                if value in inputs:
                    inputs.remove(value)
                listbox.delete(index)
            update_cmd()

        btn = tk.Button(buttons, text="Add Files", command=add_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Add Folder", command=add_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Remove Selected", command=remove_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        tex_frame = tk.Frame(body, bg=PALETTE["panel"])
        tex_frame.pack(fill="x", pady=(10, 6))
        tk.Label(tex_frame, text="Textures (optional .dtx/.png)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        tex_listbox = tk.Listbox(tex_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=3)
        tex_listbox.pack(fill="x", pady=4)

        tex_buttons = tk.Frame(tex_frame, bg=PALETTE["panel"])
        tex_buttons.pack(fill="x")

        def add_tex_files():
            files = filedialog.askopenfilenames(title="Select texture files", filetypes=[("Texture files", "*.dtx *.png")])
            for item in files:
                if item not in textures:
                    textures.append(item)
                    tex_listbox.insert("end", item)
            update_cmd()

        def add_tex_dir():
            folder = filedialog.askdirectory(title="Select folder with textures")
            if not folder:
                return
            for fname in os.listdir(folder):
                if not fname.lower().endswith((".dtx", ".png")):
                    continue
                item = os.path.join(folder, fname)
                if item not in textures:
                    textures.append(item)
                    tex_listbox.insert("end", item)
            update_cmd()

        def remove_tex_selected():
            sel = list(tex_listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = tex_listbox.get(index)
                if value in textures:
                    textures.remove(value)
                tex_listbox.delete(index)
            update_cmd()

        btn = tk.Button(tex_buttons, text="Add Files", command=add_tex_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(tex_buttons, text="Add Folder", command=add_tex_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(tex_buttons, text="Remove Selected", command=remove_tex_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        tk.Label(body, text="Manual textures map to bindings in order. Leave empty to auto-detect from Resources/Skins.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)

        self._dir_row(body, "Output Root", out_dir)
        self._dir_row(body, "Resources Root (optional)", resources_root)

        self._checkbox_with_desc(
            body,
            "Output next to each LTB",
            output_next_to,
            "Writes .lta beside the .ltb instead of mirroring into Output Root.",
        )
        self._checkbox_with_desc(
            body,
            "No recursive folder scan",
            no_recursive,
            "Only scan the top-level of any input folder.",
        )

        cmd_entry = self._command_preview(body, cmd_preview)

        def update_cmd(*_args):
            if not inputs:
                cmd_preview.set("")
                cmd_list[:] = []
                return
            cmd = [sys.executable, SCRIPT_LTB_TO_LTA]
            cmd += inputs
            if not output_next_to.get():
                cmd += ["--out-root", out_dir.get()]
            if resources_root.get().strip():
                cmd += ["--resources-root", resources_root.get().strip()]
            for tex in textures:
                cmd += ["--textures", tex]
            if no_recursive.get():
                cmd.append("--no-recursive")
            cmd_list[:] = cmd
            cmd_preview.set(format_cmd(cmd))

        out_dir.trace_add("write", update_cmd)
        resources_root.trace_add("write", update_cmd)
        output_next_to.trace_add("write", update_cmd)
        no_recursive.trace_add("write", update_cmd)
        update_cmd()

        self._action_row(body, cmd_list, cmd_preview, "LTB -> LTA",
                         lambda: self._run_tool("LTB -> LTA", cmd_list, out_dir.get()))
        return frame


    def _page_extract_world(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "DAT → LTA + Manifest", "fom_dat_tool.py")
        panel.pack(fill="both", expand=True, padx=24, pady=18)

        inputs = []
        out_dir = tk.StringVar(value=DEFAULT_OUT)
        recursive = tk.IntVar(value=0)
        do_lta = tk.IntVar(value=1)
        do_manifest = tk.IntVar(value=1)
        copy_assets = tk.IntVar(value=0)
        copy_all = tk.IntVar(value=0)
        skip_render = tk.IntVar(value=0)
        cmd_preview = tk.StringVar()
        cmd_list = []

        list_frame = tk.Frame(body, bg=PALETTE["panel"])
        list_frame.pack(fill="x", pady=6)
        tk.Label(list_frame, text="Inputs (.dat or directory)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        listbox = tk.Listbox(list_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=4)
        listbox.pack(fill="x", pady=4)

        buttons = tk.Frame(list_frame, bg=PALETTE["panel"])
        buttons.pack(fill="x")

        def add_files():
            files = filedialog.askopenfilenames(title="Select DAT files", filetypes=[("DAT files", "*.dat")])
            for item in files:
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def add_dir():
            folder = filedialog.askdirectory(title="Select directory")
            if folder and folder not in inputs:
                inputs.append(folder)
                listbox.insert("end", folder)
                update_cmd()

        def remove_selected():
            sel = list(listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = listbox.get(index)
                if value in inputs:
                    inputs.remove(value)
                listbox.delete(index)
            update_cmd()

        btn = tk.Button(buttons, text="Add Files", command=add_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Add Folder", command=add_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Remove Selected", command=remove_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        self._dir_row(body, "Output Dir", out_dir)

        flags = tk.Frame(body, bg=PALETTE["panel"])
        flags.pack(fill="x", pady=6)
        self._checkbox_with_desc(flags, "Write LTA", do_lta, "Exports world geometry + objects to .lta for DEdit.")
        self._checkbox_with_desc(flags, "Write manifest", do_manifest, "Lists textures/assets referenced by the world.")
        self._checkbox_with_desc(flags, "Copy assets", copy_assets, "Copies only referenced assets into output/Resources.")
        self._checkbox_with_desc(flags, "Copy all Resources", copy_all, "Copies full Resources tree (skips DLL/IDA files).")
        self._checkbox_with_desc(flags, "Skip render data", skip_render, "Faster; ignores render blocks and UV helpers.")
        self._checkbox_with_desc(flags, "Recursive (folders)", recursive, "Include .dat files inside subfolders.")

        cmd_entry = self._command_preview(body, cmd_preview)

        def update_cmd(*_args):
            if not inputs:
                cmd_preview.set("")
                cmd_list[:] = []
                return
            cmd = [sys.executable, SCRIPT_DAT]
            cmd += inputs
            cmd += ["--out", out_dir.get()]
            if do_lta.get():
                cmd.append("--lta")
            if do_manifest.get():
                cmd.append("--manifest")
            if copy_assets.get():
                cmd.append("--copy-assets")
            if copy_all.get():
                cmd.append("--copy-all-resources")
            if skip_render.get():
                cmd.append("--skip-render-data")
            if recursive.get():
                cmd.append("--recursive")
            cmd_list[:] = cmd
            cmd_preview.set(format_cmd(cmd))

        out_dir.trace_add("write", update_cmd)
        do_lta.trace_add("write", update_cmd)
        do_manifest.trace_add("write", update_cmd)
        copy_assets.trace_add("write", update_cmd)
        copy_all.trace_add("write", update_cmd)
        skip_render.trace_add("write", update_cmd)
        recursive.trace_add("write", update_cmd)
        update_cmd()

        self._action_row(body, cmd_list, cmd_preview, "Extract World",
                         lambda: self._run_tool("Extract World", cmd_list, out_dir.get()))
        return frame

    def _page_dump_world(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "DAT Dump + OBJ", "fom_dat_dump.py")
        panel.pack(fill="both", expand=True, padx=24, pady=18)

        dat_path = tk.StringVar()
        out_dir = tk.StringVar(value=DEFAULT_OUT)
        res_root = tk.StringVar()
        png_root = tk.StringVar()
        include_bsp = tk.IntVar(value=0)
        convert_textures = tk.IntVar(value=1)
        cmd_preview = tk.StringVar()
        cmd_list = []

        self._file_row(body, "DAT File", dat_path, filetypes=[("DAT files", "*.dat")])
        self._dir_row(body, "Output Dir", out_dir)
        self._dir_row(body, "Resources Root (optional)", res_root)
        self._dir_row(body, "PNG Root (optional)", png_root)
        tk.Label(body, text="Resources root helps resolve texture names. PNG root links OBJ/MTL to PNGs.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)
        self._checkbox_with_desc(
            body,
            "Convert textures to PNG",
            convert_textures,
            "Writes PNGs under Output/Resources by default and maps MTL to them.",
        )
        self._checkbox_with_desc(
            body,
            "Include BSP OBJ (no UVs)",
            include_bsp,
            "Adds raw BSP OBJ export (untextured). Render OBJ is always exported when available.",
        )

        cmd_entry = self._command_preview(body, cmd_preview)

        def update_cmd(*_args):
            if not dat_path.get():
                cmd_preview.set("")
                cmd_list[:] = []
                return
            cmd = [sys.executable, SCRIPT_DAT_DUMP, "--dat", dat_path.get(), "--out", out_dir.get()]
            if res_root.get().strip():
                cmd += ["--resources", res_root.get().strip()]
            if png_root.get().strip():
                cmd += ["--png-root", png_root.get().strip()]
            if include_bsp.get():
                cmd.append("--include-bsp")
            if not convert_textures.get():
                cmd.append("--no-textures")
            cmd_list[:] = cmd
            cmd_preview.set(format_cmd(cmd))

        dat_path.trace_add("write", update_cmd)
        out_dir.trace_add("write", update_cmd)
        res_root.trace_add("write", update_cmd)
        png_root.trace_add("write", update_cmd)
        include_bsp.trace_add("write", update_cmd)
        convert_textures.trace_add("write", update_cmd)
        update_cmd()

        self._action_row(body, cmd_list, cmd_preview, "Dump World",
                         lambda: self._run_tool("Dump World", cmd_list, out_dir.get()))
        return frame

    def _page_convert_textures(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "DTX → PNG", "fom_dtx_to_png.py")
        panel.pack(fill="both", expand=True, padx=24, pady=18)

        inputs = []
        out_dir = tk.StringVar(value=DEFAULT_OUT)
        root_map = tk.StringVar()
        mip = tk.StringVar()
        allow_cubemap = tk.IntVar(value=0)
        skip_existing = tk.IntVar(value=1)
        quiet = tk.IntVar(value=0)
        cmd_preview = tk.StringVar()
        cmd_list = []

        list_frame = tk.Frame(body, bg=PALETTE["panel"])
        list_frame.pack(fill="x", pady=6)
        tk.Label(list_frame, text="Inputs (.dtx or folder)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        listbox = tk.Listbox(list_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=4)
        listbox.pack(fill="x", pady=4)

        buttons = tk.Frame(list_frame, bg=PALETTE["panel"])
        buttons.pack(fill="x")

        def add_files():
            files = filedialog.askopenfilenames(title="Select DTX files", filetypes=[("DTX files", "*.dtx")])
            for item in files:
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def add_dir():
            folder = filedialog.askdirectory(title="Select DTX folder")
            if folder and folder not in inputs:
                inputs.append(folder)
                listbox.insert("end", folder)
                update_cmd()

        def remove_selected():
            sel = list(listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = listbox.get(index)
                if value in inputs:
                    inputs.remove(value)
                listbox.delete(index)
            update_cmd()

        btn = tk.Button(buttons, text="Add Files", command=add_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Add Folder", command=add_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Remove Selected", command=remove_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        self._dir_row(body, "Output Dir", out_dir)
        self._dir_row(body, "Root mapping (optional)", root_map)
        tk.Label(body, text="Root mapping keeps relative paths when converting a whole tree.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)

        row = tk.Frame(body, bg=PALETTE["panel"])
        row.pack(fill="x", pady=6)
        tk.Label(row, text="Mip (optional)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(side="left")
        mip_entry = tk.Entry(row, textvariable=mip, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", width=8)
        mip_entry.pack(side="left", padx=8)
        tk.Checkbutton(row, text="Allow cubemap", variable=allow_cubemap, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=6)
        tk.Checkbutton(row, text="Skip existing", variable=skip_existing, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=6)
        tk.Checkbutton(row, text="Quiet", variable=quiet, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=6)
        tk.Label(body, text="Mip selects a specific mip level. Quiet hides per-file logs.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)

        cmd_entry = self._command_preview(body, cmd_preview)

        def update_cmd(*_args):
            if not inputs:
                cmd_preview.set("")
                cmd_list[:] = []
                return
            commands = []
            for item in inputs:
                cmd = [sys.executable, SCRIPT_DTX, item, "--out", out_dir.get()]
                if root_map.get().strip():
                    cmd += ["--root", root_map.get().strip()]
                if mip.get().strip():
                    cmd += ["--mip", mip.get().strip()]
                if allow_cubemap.get():
                    cmd.append("--allow-cubemap")
                if skip_existing.get():
                    cmd.append("--skip-existing")
                if quiet.get():
                    cmd.append("--quiet")
                commands.append(cmd)
            cmd_list[:] = commands
            if len(commands) == 1:
                cmd_preview.set(format_cmd(commands[0]))
            else:
                cmd_preview.set(f"{len(commands)} jobs. First: {format_cmd(commands[0])}")

        out_dir.trace_add("write", update_cmd)
        root_map.trace_add("write", update_cmd)
        mip.trace_add("write", update_cmd)
        allow_cubemap.trace_add("write", update_cmd)
        skip_existing.trace_add("write", update_cmd)
        quiet.trace_add("write", update_cmd)
        update_cmd()

        self._action_row(body, cmd_list, cmd_preview, "Convert Textures",
                         lambda: self._run_tool("Convert Textures", cmd_list, out_dir.get()))
        return frame

    def _page_obj_gltf(self):
        frame = tk.Frame(self.page_container, bg=PALETTE["bg"])
        panel, body = self._panel(frame, "OBJ → glTF", "obj_triangulate_gltf.py")
        panel.pack(fill="both", expand=True, padx=24, pady=18)

        inputs = []
        out_dir = tk.StringVar(value=DEFAULT_OUT)
        write_obj = tk.IntVar(value=1)
        write_gltf = tk.IntVar(value=1)
        cmd_preview = tk.StringVar()
        cmd_list = []

        list_frame = tk.Frame(body, bg=PALETTE["panel"])
        list_frame.pack(fill="x", pady=6)
        tk.Label(list_frame, text="Inputs (.obj)", fg=PALETTE["text"], bg=PALETTE["panel"]).pack(anchor="w")
        listbox = tk.Listbox(list_frame, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", height=4)
        listbox.pack(fill="x", pady=4)

        buttons = tk.Frame(list_frame, bg=PALETTE["panel"])
        buttons.pack(fill="x")

        def add_files():
            files = filedialog.askopenfilenames(title="Select OBJ files", filetypes=[("OBJ files", "*.obj")])
            for item in files:
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def add_dir():
            folder = filedialog.askdirectory(title="Select folder with OBJ files")
            if not folder:
                return
            for fname in os.listdir(folder):
                if not fname.lower().endswith(".obj"):
                    continue
                item = os.path.join(folder, fname)
                if item not in inputs:
                    inputs.append(item)
                    listbox.insert("end", item)
            update_cmd()

        def remove_selected():
            sel = list(listbox.curselection())
            if not sel:
                return
            for index in reversed(sel):
                value = listbox.get(index)
                if value in inputs:
                    inputs.remove(value)
                listbox.delete(index)
            update_cmd()

        btn = tk.Button(buttons, text="Add Files", command=add_files,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Add Folder", command=add_dir,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=(0, 8))
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(buttons, text="Remove Selected", command=remove_selected,
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

        self._dir_row(body, "Output Dir", out_dir)

        row = tk.Frame(body, bg=PALETTE["panel"])
        row.pack(fill="x", pady=6)
        tk.Checkbutton(row, text="Write OBJ", variable=write_obj, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=6)
        tk.Checkbutton(row, text="Write glTF", variable=write_gltf, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(side="left", padx=6)
        tk.Label(body, text="Outputs are written to Output Dir using the input basename.",
                 fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=6)

        cmd_entry = self._command_preview(body, cmd_preview)

        def update_cmd(*_args):
            if not inputs:
                cmd_preview.set("")
                cmd_list[:] = []
                return
            commands = []
            for item in inputs:
                base = os.path.splitext(os.path.basename(item))[0]
                cmd = [sys.executable, SCRIPT_OBJ, "--obj", item]
                if write_obj.get():
                    cmd += ["--out-obj", os.path.join(out_dir.get(), f"{base}_tri.obj")]
                if write_gltf.get():
                    cmd += ["--out-gltf", os.path.join(out_dir.get(), f"{base}.gltf")]
                commands.append(cmd)
            cmd_list[:] = commands
            if len(commands) == 1:
                cmd_preview.set(format_cmd(commands[0]))
            else:
                cmd_preview.set(f"{len(commands)} jobs. First: {format_cmd(commands[0])}")

        out_dir.trace_add("write", update_cmd)
        write_obj.trace_add("write", update_cmd)
        write_gltf.trace_add("write", update_cmd)
        update_cmd()

        self._action_row(body, cmd_list, cmd_preview, "OBJ → glTF",
                         lambda: self._run_tool("OBJ → glTF", cmd_list, out_dir.get()))
        return frame

    def _file_row(self, parent, label, var, filetypes=None, save=False, defaultextension=None):
        row = tk.Frame(parent, bg=PALETTE["panel"])
        row.pack(fill="x", pady=6)
        tk.Label(row, text=label, fg=PALETTE["text"], bg=PALETTE["panel"], width=22, anchor="w").pack(side="left")
        entry = tk.Entry(row, textvariable=var, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat")
        entry.pack(side="left", fill="x", expand=True, padx=6)

        def browse():
            if save:
                path = filedialog.asksaveasfilename(defaultextension=defaultextension, filetypes=filetypes)
            else:
                path = filedialog.askopenfilename(filetypes=filetypes)
            if path:
                var.set(path)

        btn = tk.Button(row, text="Browse", command=browse, bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        return entry

    def _file_or_dir_row(self, parent, label, var, filetypes=None):
        row = tk.Frame(parent, bg=PALETTE["panel"])
        row.pack(fill="x", pady=6)
        tk.Label(row, text=label, fg=PALETTE["text"], bg=PALETTE["panel"], width=22, anchor="w").pack(side="left")
        entry = tk.Entry(row, textvariable=var, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat")
        entry.pack(side="left", fill="x", expand=True, padx=6)

        def browse_file():
            path = filedialog.askopenfilename(filetypes=filetypes)
            if path:
                var.set(path)

        def browse_dir():
            path = filedialog.askdirectory()
            if path:
                var.set(path)

        btn = tk.Button(row, text="File", command=browse_file, bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        btn = tk.Button(row, text="Folder", command=browse_dir, bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=4)
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        return entry

    def _dir_row(self, parent, label, var):
        row = tk.Frame(parent, bg=PALETTE["panel"])
        row.pack(fill="x", pady=6)
        tk.Label(row, text=label, fg=PALETTE["text"], bg=PALETTE["panel"], width=22, anchor="w").pack(side="left")
        entry = tk.Entry(row, textvariable=var, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat")
        entry.pack(side="left", fill="x", expand=True, padx=6)
        btn = tk.Button(row, text="Browse", command=lambda: self._choose_dir(var),
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])
        return entry

    def _choose_dir(self, var):
        path = filedialog.askdirectory()
        if path:
            var.set(path)

    def _command_preview(self, parent, var):
        row = tk.Frame(parent, bg=PALETTE["panel"])
        row.pack(fill="x", pady=(10, 6))
        tk.Label(row, text="Command Preview", fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w")
        entry = tk.Entry(row, textvariable=var, bg=PALETTE["panel_3"], fg=PALETTE["text"], relief="flat", font=self.font_mono)
        entry.pack(fill="x", pady=4)
        return entry

    def _checkbox_with_desc(self, parent, text, var, desc):
        wrapper = tk.Frame(parent, bg=PALETTE["panel"])
        wrapper.pack(fill="x", pady=4)
        tk.Checkbutton(wrapper, text=text, variable=var, fg=PALETTE["text"], bg=PALETTE["panel"],
                       activebackground=PALETTE["panel"], selectcolor=PALETTE["panel_2"]).pack(anchor="w")
        tk.Label(wrapper, text=desc, fg=PALETTE["muted"], bg=PALETTE["panel"], font=self.font_sub).pack(anchor="w", padx=22)
        return wrapper

    def _apply_hover(self, btn, base, hover):
        btn.bind("<Enter>", lambda _e: btn.configure(bg=hover))
        btn.bind("<Leave>", lambda _e: btn.configure(bg=base))

    def _action_row(self, parent, cmd_list, cmd_var, label, on_run):
        row = tk.Frame(parent, bg=PALETTE["panel"])
        row.pack(fill="x", pady=(8, 2))
        btn = tk.Button(row, text=label, command=on_run, bg=PALETTE["accent"], fg="#1b1f28",
                        activebackground=PALETTE["accent_2"], relief="flat")
        btn.pack(side="left")
        self._apply_hover(btn, PALETTE["accent"], PALETTE["accent_2"])
        btn = tk.Button(row, text="Open Output Folder", command=lambda: self._open_output_from_cmd(cmd_list),
                        bg=PALETTE["panel_2"], fg=PALETTE["text"], relief="flat")
        btn.pack(side="left", padx=8)
        self._apply_hover(btn, PALETTE["panel_2"], PALETTE["panel_3"])

    def _open_output_from_cmd(self, cmd_list):
        cmd = cmd_list
        if cmd_list and isinstance(cmd_list[0], list):
            cmd = cmd_list[0]
        if not cmd:
            default_dir = abs_from_repo(DEFAULT_OUT)
            os.makedirs(default_dir, exist_ok=True)
            if os.path.isdir(default_dir):
                os.startfile(default_dir)
                return
        for flag in ("--out", "--out-root"):
            if flag in cmd:
                idx = cmd.index(flag)
                if idx + 1 < len(cmd):
                    out_dir = abs_from_repo(cmd[idx + 1])
                    if os.path.isdir(out_dir):
                        os.startfile(out_dir)
                        return
        default_dir = abs_from_repo(DEFAULT_OUT)
        os.makedirs(default_dir, exist_ok=True)
        if os.path.isdir(default_dir):
            os.startfile(default_dir)
            return
        messagebox.showinfo("Open Output", "Output folder not detected in the command.")

    def _run_tool(self, title, cmd_list, out_dir):
        if not cmd_list:
            messagebox.showwarning("Missing command", "Set inputs before running.")
            return
        commands = cmd_list if (cmd_list and isinstance(cmd_list[0], list)) else [cmd_list]
        for cmd in commands:
            job_title = self._job_title_from_cmd(title, cmd)
            job = Job(self.job_counter, job_title, cmd, REPO_ROOT)
            self.job_counter += 1
            self.jobs.append(job)
            self._add_job_line(job)
            self._enqueue_job(job)

    def _enqueue_job(self, job):
        if self.current_job and self.current_job.status == "running":
            job.status = "queued"
            self._refresh_jobs_list()
            return
        self._start_job(job)

    def _kick_queue(self):
        if self.current_job and self.current_job.status == "running":
            return
        for job in self.jobs:
            if job.status == "queued":
                self._start_job(job)
                break

    def _job_title_from_cmd(self, title, cmd):
        path = None
        if "--ltb" in cmd:
            path = cmd[cmd.index("--ltb") + 1]
        elif "--obj" in cmd:
            path = cmd[cmd.index("--obj") + 1]
        elif "--dat" in cmd:
            path = cmd[cmd.index("--dat") + 1]
        else:
            for item in cmd[1:]:
                if item.lower().endswith((".dtx", ".obj", ".ltb", ".dat")):
                    path = item
                    break
        if path:
            return f"{title} - {os.path.basename(path)}"
        return title

    def _add_job_line(self, job):
        self.jobs_list.insert("end", f"#{job.job_id} {job.title} [{job.status}]")
        self.jobs_list.yview_moveto(1)

    def _refresh_jobs_list(self):
        self.jobs_list.delete(0, "end")
        for job in self.jobs:
            status = job.status
            if job.exit_code is not None:
                status = f"{status} ({job.exit_code})"
            self.jobs_list.insert("end", f"#{job.job_id} {job.title} [{status}]")

    def _start_job(self, job):
        job.status = "running"
        job.started_at = time.time()
        self.current_job = job
        self._refresh_jobs_list()
        self._append_log(f"[job #{job.job_id}] {job.title} started\n", tag="info")
        self.job_status_label.configure(text=f"Running #{job.job_id}: {job.title}")

        try:
            proc = subprocess.Popen(
                job.cmd,
                cwd=job.workdir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
        except Exception as exc:
            job.status = "error"
            job.exit_code = -1
            self._append_log(f"[job #{job.job_id}] failed to start: {exc}\n", tag="stderr")
            self.job_status_label.configure(text="Idle")
            self._refresh_jobs_list()
            return

        job.process = proc

        threading.Thread(target=self._read_stream, args=(job, proc.stdout, False), daemon=True).start()
        threading.Thread(target=self._read_stream, args=(job, proc.stderr, True), daemon=True).start()
        threading.Thread(target=self._watch_job, args=(job,), daemon=True).start()

    def _read_stream(self, job, stream, is_err):
        if not stream:
            return
        for line in stream:
            self.log_queue.put((job.job_id, line, is_err))

    def _watch_job(self, job):
        if not job.process:
            return
        exit_code = job.process.wait()
        job.exit_code = exit_code
        job.status = "done" if exit_code == 0 else "failed"
        self.log_queue.put((job.job_id, f"[job #{job.job_id}] exited with code {exit_code}\n", exit_code != 0))
        self.log_queue.put(("__refresh__", None, None))
        self.log_queue.put(("__kick__", None, None))

    def _poll_log_queue(self):
        try:
            while True:
                job_id, line, is_err = self.log_queue.get_nowait()
                if job_id == "__refresh__":
                    self._refresh_jobs_list()
                    self.job_status_label.configure(text="Idle")
                    self.current_job = None
                    continue
                if job_id == "__kick__":
                    self._kick_queue()
                    continue
                tag = "stderr" if is_err else None
                self._append_log(line, tag=tag)
        except queue.Empty:
            pass
        self.root.after(100, self._poll_log_queue)

    def _append_log(self, text, tag=None):
        self.log_text.insert("end", text, tag)
        self.log_text.see("end")

    def _cancel_current_job(self):
        job = self.current_job
        if not job or not job.process:
            return
        try:
            job.process.terminate()
            self._append_log(f"[job #{job.job_id}] cancel requested\n", tag="stderr")
        except Exception as exc:
            self._append_log(f"[job #{job.job_id}] cancel failed: {exc}\n", tag="stderr")


def main():
    root = tk.Tk()
    app = FoMToolsApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
