# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller build spec for AURUM Terminal.

Run on the target OS (PyInstaller does not cross-compile):
    pip install -r requirements-build.txt
    pyinstaller --noconfirm AurumTerminal.spec

Output: dist/AurumTerminal.exe (Windows) or dist/AurumTerminal (macOS/Linux).
"""
from PyInstaller.utils.hooks import collect_all

datas = [("app/database/schema.sql", "app/database")]
binaries = []
hiddenimports = []

for pkg in ("customtkinter", "tkcalendar", "babel"):
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

block_cipher = None

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    cipher=block_cipher,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="AurumTerminal",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
