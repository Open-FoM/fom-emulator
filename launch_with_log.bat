@echo off
setlocal
>nul 2>&1 net session
if not %errorlevel%==0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
  exit /b
)
set ROOT=%~dp0
set FOTD=%ROOT%FoTD
set LOG=%ROOT%launch_with_log.out.txt

> "%LOG%" echo [launch_with_log] %date% %time%

if not exist "%FOTD%\injector.exe" (
  echo Missing injector: "%FOTD%\injector.exe" >> "%LOG%"
  type "%LOG%"
  exit /b 1
)
if not exist "%FOTD%\fom_client.exe" (
  echo Missing client: "%FOTD%\fom_client.exe" >> "%LOG%"
  type "%LOG%"
  exit /b 1
)

cd /d "%FOTD%"
"%FOTD%\injector.exe" --launch "%FOTD%\fom_client.exe" -rez Resources -config master.cfg -dpsmagic 1234 +windowed 0 +EnableTripBuf 1 +ScreenWidth 1920 +ScreenHeight 1080 +ConsoleEnable 1 +windowed 1 >> "%LOG%" 2>&1

echo ExitCode=%errorlevel% >> "%LOG%"

findstr /C:"CreateProcess failed (740)" "%LOG%" >nul
if not errorlevel 1 (
  echo.
  echo ERROR: fom_client.exe requires elevation. >> "%LOG%"
  echo Run this batch as Administrator. >> "%LOG%"
)

type "%LOG%"
