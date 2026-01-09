@echo off
setlocal
cd /d "%~dp0Client\\Client_TS"

if not exist node_modules (
  echo [Client_TS] Installing dependencies...
  npm install
)

set HOST=
set PORT=
set WORLD_ID=1
set WORLD_INST=1
set PLAYER_ID=1
set WORLD_CONST=0x13bc52

:parseargs
if "%~1"=="" goto parsedargs
set ARG=%~1

if /I "%ARG:~0,6%"=="-host=" set HOST=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--host=" set HOST=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-host" goto :read_host
if /I "%ARG%"=="--host" goto :read_host

if /I "%ARG:~0,6%"=="-port=" set PORT=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--port=" set PORT=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-port" goto :read_port
if /I "%ARG%"=="--port" goto :read_port

if /I "%ARG:~0,10%"=="-world-id=" set WORLD_ID=%ARG:~10%& shift & goto parseargs
if /I "%ARG:~0,11%"=="--world-id=" set WORLD_ID=%ARG:~11%& shift & goto parseargs
if /I "%ARG%"=="-world-id" goto :read_world_id
if /I "%ARG%"=="--world-id" goto :read_world_id

if /I "%ARG:~0,12%"=="-world-inst=" set WORLD_INST=%ARG:~12%& shift & goto parseargs
if /I "%ARG:~0,13%"=="--world-inst=" set WORLD_INST=%ARG:~13%& shift & goto parseargs
if /I "%ARG%"=="-world-inst" goto :read_world_inst
if /I "%ARG%"=="--world-inst" goto :read_world_inst

if /I "%ARG:~0,14%"=="-world-player=" set PLAYER_ID=%ARG:~14%& shift & goto parseargs
if /I "%ARG:~0,15%"=="--world-player=" set PLAYER_ID=%ARG:~15%& shift & goto parseargs
if /I "%ARG%"=="-world-player" goto :read_world_player
if /I "%ARG%"=="--world-player" goto :read_world_player

if /I "%ARG:~0,13%"=="-world-const=" set WORLD_CONST=%ARG:~13%& shift & goto parseargs
if /I "%ARG:~0,14%"=="--world-const=" set WORLD_CONST=%ARG:~14%& shift & goto parseargs
if /I "%ARG%"=="-world-const" goto :read_world_const
if /I "%ARG%"=="--world-const" goto :read_world_const

shift
goto parseargs

:read_host
shift
set HOST=%~1
shift
goto parseargs

:read_port
shift
set PORT=%~1
shift
goto parseargs

:read_world_id
shift
set WORLD_ID=%~1
shift
goto parseargs

:read_world_inst
shift
set WORLD_INST=%~1
shift
goto parseargs

:read_world_player
shift
set PLAYER_ID=%~1
shift
goto parseargs

:read_world_const
shift
set WORLD_CONST=%~1
shift
goto parseargs

:parsedargs

if "%HOST%"=="" set HOST=127.0.0.1
if "%PORT%"=="" set PORT=62000

echo [Client_TS] Starting world client: %HOST%:%PORT% worldId=%WORLD_ID% inst=%WORLD_INST% player=%PLAYER_ID%

set FOM_LOGIN_AUTH=false
set WORLD_IP=%HOST%
set WORLD_PORT=%PORT%
set WORLD_ID=%WORLD_ID%
set WORLD_INST=%WORLD_INST%
set FOM_PLAYER_ID=%PLAYER_ID%
set WORLD_CONST=%WORLD_CONST%

npx tsx src\tools\TestClient.ts world %HOST% %PORT% --world-id=%WORLD_ID% --world-inst=%WORLD_INST% --world-player=%PLAYER_ID% --world-const=%WORLD_CONST%
if errorlevel 1 (
  echo Usage: start_client_world.bat [-host=IP] [-port=PORT] [-world-id=N] [-world-inst=N] [-world-player=N] [-world-const=N]
  exit /b 1
)
