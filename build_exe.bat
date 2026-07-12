@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo Checking for a real Python installation...
set PY_OK=0
for /f "delims=" %%i in ('python --version 2^>^&1') do (
    echo %%i | findstr /B "Python " >nul && set PY_OK=1 && set PYVER=%%i
)
if "!PY_OK!"=="0" goto :no_python
echo Found !PYVER!

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo.
        echo Failed to create the virtual environment. See the error above.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate.bat

echo Installing build dependencies (this can take a few minutes the first time)...
python -m pip install --upgrade pip
if errorlevel 1 goto :fail_step

pip install -r requirements-build.txt
if errorlevel 1 goto :fail_step

echo.
echo Building AurumTerminal.exe with PyInstaller...
pyinstaller --noconfirm AurumTerminal.spec
if errorlevel 1 goto :fail_step

echo.
if exist dist\AurumTerminal.exe (
    echo ============================================================
    echo  Build complete: dist\AurumTerminal.exe
    echo ============================================================
) else (
    echo Build finished but dist\AurumTerminal.exe was not found - check the log above for errors.
)
pause
exit /b 0

:fail_step
echo.
echo ============================================================
echo  Build step failed - see the error output above for details.
echo ============================================================
pause
exit /b 1

:no_python
echo.
echo ============================================================
echo  Python is not installed on this machine.
echo.
echo  What you saw - py is not recognized, or Python was not found;
echo  run without arguments to install from the Microsoft Store -
echo  is Windows placeholder shortcut, not a real Python install.
echo  That is why every step after it failed too.
echo.
echo  Fix:
echo   1. Go to https://www.python.org/downloads/windows/
echo   2. Download and run the latest Python 3.x installer.
echo   3. On the FIRST installer screen, check the box at the
echo      bottom: Add python.exe to PATH - this is required.
echo   4. Click Install Now and let it finish.
echo   5. Close this window, then double-click build_exe.bat again.
echo.
echo  Optional cleanup: Settings, Apps, Advanced app settings,
echo  App execution aliases - turn OFF python.exe and python3.exe
echo  so Windows never shows that Store prompt again.
echo ============================================================
echo.
pause
exit /b 1
