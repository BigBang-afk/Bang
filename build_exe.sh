#!/usr/bin/env bash
# Builds a native executable for the OS this script runs on (PyInstaller
# does not cross-compile: run this on macOS/Linux to get a macOS/Linux
# binary, or run build_exe.bat on Windows to get AurumTerminal.exe).
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-build.txt

echo
echo "Building with PyInstaller..."
pyinstaller --noconfirm AurumTerminal.spec

echo
if [ -f dist/AurumTerminal ]; then
    echo "Build complete: dist/AurumTerminal"
else
    echo "Build finished but dist/AurumTerminal was not found - check the log above for errors."
fi
