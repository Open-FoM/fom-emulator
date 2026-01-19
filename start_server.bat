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

set MODE=
set PORT=
set WORLD_PORT=
set WORLD_IP=
set PROFILE=
set PROFILE_MODE=
set PROFILE_PORT=
set PROFILE_ADMIN_PORT=
set PROFILE_ADMIN_TOKEN=

:parseargs
if "%~1"=="" goto parsedargs
set ARG=%~1

if /I "%ARG:~0,6%"=="-mode=" set MODE=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--mode=" set MODE=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-mode" goto :read_mode
if /I "%ARG%"=="--mode" goto :read_mode

if /I "%ARG:~0,9%"=="-profile=" set PROFILE=%ARG:~9%& shift & goto parseargs
if /I "%ARG:~0,10%"=="--profile=" set PROFILE=%ARG:~10%& shift & goto parseargs
if /I "%ARG%"=="-profile" goto :read_profile
if /I "%ARG%"=="--profile" goto :read_profile

if /I "%ARG:~0,6%"=="-port=" set PORT=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--port=" set PORT=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-port" goto :read_port
if /I "%ARG%"=="--port" goto :read_port

if /I "%ARG:~0,12%"=="-world-port=" set WORLD_PORT=%ARG:~12%& shift & goto parseargs
if /I "%ARG:~0,13%"=="--world-port=" set WORLD_PORT=%ARG:~13%& shift & goto parseargs
if /I "%ARG%"=="-world-port" goto :read_world_port
if /I "%ARG%"=="--world-port" goto :read_world_port

if /I "%ARG:~0,10%"=="-world-ip=" set WORLD_IP=%ARG:~10%& shift & goto parseargs
if /I "%ARG:~0,11%"=="--world-ip=" set WORLD_IP=%ARG:~11%& shift & goto parseargs
if /I "%ARG%"=="-world-ip" goto :read_world_ip
if /I "%ARG%"=="--world-ip" goto :read_world_ip

shift
goto parseargs

:read_mode
shift
set MODE=%~1
shift
goto parseargs

:read_port
shift
set PORT=%~1
shift
goto parseargs

:read_world_port
shift
set WORLD_PORT=%~1
shift
goto parseargs

:read_world_ip
shift
set WORLD_IP=%~1
shift
goto parseargs

:read_profile
shift
set PROFILE=%~1
shift
goto parseargs

:parsedargs

if "%PROFILE%"=="" set PROFILE=master

set PROFILE_PATH=%~dp0ServerManager\\server_profiles\\%PROFILE%.json
if exist "%PROFILE_PATH%" (
  for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$j=Get-Content -Raw '%PROFILE_PATH%' | ConvertFrom-Json; $lines=@(); if($j.serverType){$lines+='PROFILE_MODE='+$j.serverType}; if($j.port){$lines+='PROFILE_PORT='+$j.port}; if($j.adminPort){$lines+='PROFILE_ADMIN_PORT='+$j.adminPort}; if($j.adminToken){$lines+='PROFILE_ADMIN_TOKEN='+$j.adminToken}; if($j.envText){($j.envText -split \"`n\") | ForEach-Object { $t=$_.Trim(); if($t){$lines+=$t} } }; $lines | ForEach-Object { $_ }"`) do set "%%L"
)

if "%MODE%"=="" if not "%PROFILE_MODE%"=="" set MODE=%PROFILE_MODE%

if "%MODE%"=="" set MODE=master
if "%PORT%"=="" if not "%PROFILE_PORT%"=="" set PORT=%PROFILE_PORT%
if "%PORT%"=="" if /I "%MODE%"=="world" if not "%WORLD_PORT%"=="" set PORT=%WORLD_PORT%
if "%PORT%"=="" (
  if /I "%MODE%"=="world" (
    set PORT=62000
  ) else (
    set PORT=61000
  )
)

set SERVER_MODE=%MODE%

if "%ADMIN_PORT%"=="" if not "%PROFILE_ADMIN_PORT%"=="" set ADMIN_PORT=%PROFILE_ADMIN_PORT%
if "%ADMIN_TOKEN%"=="" if not "%PROFILE_ADMIN_TOKEN%"=="" set ADMIN_TOKEN=%PROFILE_ADMIN_TOKEN%

if "%WORLD_SERVERS%"=="" if not "%WORLD_IP%"=="" if not "%WORLD_PORT%"=="" set WORLD_SERVERS=%WORLD_IP%:%WORLD_PORT%

if not defined FOM_INI (
  if /I "%MODE%"=="world" (
    set FOM_INI=%CD%\\apps\\world\\fom_world.ini
  ) else (
    set FOM_INI=%CD%\\apps\\master\\fom_server.ini
  )
)

set APP_DIR=apps\\master
if /I "%MODE%"=="world" set APP_DIR=apps\\world

call :kill_udp_port %PORT%
echo [Server] Starting server mode=%SERVER_MODE% on UDP port %PORT%...
if not "%WORLD_SERVERS%"=="" echo [Server] WorldServers: %WORLD_SERVERS%
echo [Server] Config: %FOM_INI%
"%BUN_EXE%" run --cwd %APP_DIR% start
goto :eof

:kill_udp_port
set TARGET_PORT=%~1
if "%TARGET_PORT%"=="" exit /b 0
echo [Server] Closing UDP port %TARGET_PORT% if in use...
set PS_ARGS=-NoProfile
if "%FOM_HIDE_PS%"=="1" set PS_ARGS=-NoProfile -WindowStyle Hidden
powershell %PS_ARGS% -Command "$udpPids=Get-NetUDPEndpoint -LocalPort %TARGET_PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if($udpPids){foreach($procId in $udpPids){Write-Host ('[Server] Closing UDP %TARGET_PORT% (PID ' + $procId + ')...'); Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue}} else {Write-Host ('[Server] No UDP listeners on %TARGET_PORT%.')}"
exit /b 0
