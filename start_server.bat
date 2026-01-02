@echo off
setlocal
cd /d "%~dp0ServerEmulator"

if not exist node_modules (
  echo [ServerEmulator] Installing dependencies...
  npm install
)

set MODE=
set PORT=
set WORLD_PORT=
set WORLD_IP=

:parseargs
if "%~1"=="" goto parsedargs
set ARG=%~1

if /I "%ARG:~0,6%"=="-mode=" set MODE=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--mode=" set MODE=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-mode" goto :read_mode
if /I "%ARG%"=="--mode" goto :read_mode

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

:parsedargs

if "%PORT%"=="" set PORT=61000
if "%MODE%"=="" set MODE=master

set SERVER_MODE=%MODE%
if not "%WORLD_PORT%"=="" set WORLD_PORT=%WORLD_PORT%
if not "%WORLD_IP%"=="" set WORLD_IP=%WORLD_IP%

echo [ServerEmulator] Starting server mode=%SERVER_MODE% on UDP port %PORT%...
echo [ServerEmulator] Config: ServerEmulator\fom_server.ini (or FOM_INI override)
npm run dev
