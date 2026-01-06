@echo off
cd /d "%~dp0Client\\Client_FoM"

echo === FoM Launcher ===
echo.
echo Using same command line as FOMLauncher.exe...
echo.

REM This is the EXACT command line from FOMLauncher.exe
start "" "fom_client.exe" -rez Resources -config master.cfg -dpsmagic 1234 +windowed 0 +EnableTripBuf 1 +ScreenWidth 1920 +ScreenHeight 1080 +ConsoleEnable 1 +windowed 1

exit /b
