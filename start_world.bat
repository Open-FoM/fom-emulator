@echo off
setlocal
cd /d "%~dp0Server"

set BUN_EXE=
if exist "%USERPROFILE%\\.bun\\bin\\bun.exe" set BUN_EXE=%USERPROFILE%\\.bun\\bin\\bun.exe
if "%BUN_EXE%"=="" set BUN_EXE=bun

if not exist node_modules (
  echo [Server] Installing dependencies...
  "%BUN_EXE%" install
)

if "%PORT%"=="" set PORT=62000
call :kill_udp_port %PORT%
echo [Server] Starting world app on UDP port %PORT%...
"%BUN_EXE%" run --cwd apps\\world start
goto :eof

:kill_udp_port
set TARGET_PORT=%~1
if "%TARGET_PORT%"=="" exit /b 0
echo [Server] Closing UDP port %TARGET_PORT% if in use...
set PS_ARGS=-NoProfile
if "%FOM_HIDE_PS%"=="1" set PS_ARGS=-NoProfile -WindowStyle Hidden
powershell %PS_ARGS% -Command "$udpPids=Get-NetUDPEndpoint -LocalPort %TARGET_PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if($udpPids){foreach($procId in $udpPids){Write-Host ('[Server] Closing UDP %TARGET_PORT% (PID ' + $procId + ')...'); Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue}} else {Write-Host ('[Server] No UDP listeners on %TARGET_PORT%.')}"
exit /b 0
