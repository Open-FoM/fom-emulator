@echo off
setlocal
cd /d "%~dp0Client\\Client_TS"

if not exist node_modules (
  echo [Client_TS] Installing dependencies...
  npm install
)

set BUN_EXE=
if exist "%USERPROFILE%\\.bun\\bin\\bun.exe" set BUN_EXE=%USERPROFILE%\\.bun\\bin\\bun.exe
if "%BUN_EXE%"=="" set BUN_EXE=bun

set MODE=
set HOST=
set PORT=
set INTERVAL=
set COUNT=
set LOGIN_DELAY=

:parseargs
if "%~1"=="" goto parsedargs
set ARG=%~1

if /I "%ARG:~0,6%"=="-mode=" set MODE=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--mode=" set MODE=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-mode" goto :read_mode
if /I "%ARG%"=="--mode" goto :read_mode

if /I "%ARG:~0,6%"=="-host=" set HOST=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--host=" set HOST=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-host" goto :read_host
if /I "%ARG%"=="--host" goto :read_host

if /I "%ARG:~0,6%"=="-port=" set PORT=%ARG:~6%& shift & goto parseargs
if /I "%ARG:~0,7%"=="--port=" set PORT=%ARG:~7%& shift & goto parseargs
if /I "%ARG%"=="-port" goto :read_port
if /I "%ARG%"=="--port" goto :read_port


if /I "%ARG:~0,7%"=="-login=" set LOGIN_DELAY=%ARG:~7%& shift & goto parseargs
if /I "%ARG:~0,8%"=="--login=" set LOGIN_DELAY=%ARG:~8%& shift & goto parseargs
if /I "%ARG%"=="-login" goto :read_login
if /I "%ARG%"=="--login" goto :read_login

shift
goto parseargs

:read_mode
shift
set MODE=%~1
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


:read_login
shift
set LOGIN_DELAY=%~1
shift
goto parseargs

:parsedargs

if "%MODE%"=="" set MODE=connect
if "%HOST%"=="" set HOST=127.0.0.1
if "%PORT%"=="" set PORT=61000
if "%LOGIN_DELAY%"=="" set LOGIN_DELAY=3

if /I "%MODE%"=="open" set MODE=connect
if /I "%MODE%"=="query" set MODE=connect
if /I "%MODE%"=="login6c" set MODE=login6e

if not "%LOGIN_DELAY%"=="" (
  set LOGIN_ARG=--login=%LOGIN_DELAY%
) else (
  set LOGIN_ARG=
)

if /I "%MODE%"=="connect" (
  "%BUN_EXE%" --cwd "%CD%" src\tools\TestClient.ts connect %HOST% %PORT% %LOGIN_ARG%
  goto :eof
)
if /I "%MODE%"=="login" (
  "%BUN_EXE%" --cwd "%CD%" src\tools\TestClient.ts login %HOST% %PORT% %LOGIN_ARG%
  goto :eof
)
if /I "%MODE%"=="login6e" (
  "%BUN_EXE%" --cwd "%CD%" src\tools\TestClient.ts login6e %HOST% %PORT%
  goto :eof
)

if /I "%MODE%"=="world" (
  "%BUN_EXE%" --cwd "%CD%" src\tools\TestClient.ts world %HOST% %PORT%
  goto :eof
)
if /I "%MODE%"=="world-connect" (
  "%BUN_EXE%" --cwd "%CD%" src\tools\TestClient.ts world-connect %HOST% %PORT%
  goto :eof
)

echo Usage: start_client.bat [-mode=connect^|login^|login6e^|world^|world-connect] [-host=IP] [-port=PORT] [-login=SECONDS]
exit /b 1
