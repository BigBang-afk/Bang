@echo off
setlocal
cd /d "%~dp0"

if not exist .venv (
    echo Creating virtual environment...
    py -3 -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements-build.txt

echo.
echo Building AurumTerminal.exe with PyInstaller...
pyinstaller --noconfirm AurumTerminal.spec

echo.
if exist dist\AurumTerminal.exe (
    echo Build complete: dist\AurumTerminal.exe
) else (
    echo Build finished but dist\AurumTerminal.exe was not found - check the log above for errors.
)
pause
