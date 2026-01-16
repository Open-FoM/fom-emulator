@echo off
setlocal
cd /d "%~dp0Open-FoMTools"
where pythonw >nul 2>&1
if %errorlevel%==0 (
  start "" /b pythonw app.py
  exit /b 0
)
python app.py
if errorlevel 1 (
  echo.
  echo Failed to launch FoM Tools GUI.
  pause
)
