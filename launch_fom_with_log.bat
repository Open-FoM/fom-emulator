@echo off
setlocal
>nul 2>&1 net session
if not %errorlevel%==0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
  exit /b
)
set ROOT=%~dp0
set CLIENT=%ROOT%FoTD

if not exist "%CLIENT%\fom_client.exe" (
  echo Missing client: "%CLIENT%\fom_client.exe"
  exit /b 1
)

cd /d "%CLIENT%"
"%CLIENT%\fom_client.exe" -rez Resources -config master.cfg -dpsmagic 1234 +windowed 0 +EnableTripBuf 1 +ScreenWidth 1024 +ScreenHeight 768 +ConsoleEnable 1 +windowed 1 +LoginToken 1234

if not %errorlevel%==0 (
  echo.
  echo Launch failed (ExitCode=%errorlevel%). If this is 740, run as Administrator.
)
