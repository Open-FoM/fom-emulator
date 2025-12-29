@echo off
setlocal
cd /d "%~dp0ServerEmulator"

if not exist node_modules (
  echo [ServerEmulator] Installing dependencies...
  npm install
)

if "%~1"=="" (
  set PORT=61000
) else (
  set PORT=%~1
)

if "%~2"=="" (
  set MODE=normal
) else (
  set MODE=%~2
)

if /I "%MODE%"=="login" (
  set FAST_LOGIN=1
  set PACKET_LOG=full
  set PACKET_LOG_IDS=0x6D
  set PACKET_LOG_INTERVAL_MS=0
  set PACKET_LOG_REPEAT_SUPPRESS_MS=0
  set PACKET_LOG_ANALYSIS=1
  set PACKET_HANDLER_VERBOSE=0
) else (
  set PACKET_LOG=summary
  set PACKET_LOG_IDS=0x40
  set PACKET_LOG_INTERVAL_MS=5000
  set PACKET_LOG_REPEAT_SUPPRESS_MS=2000
  set PACKET_LOG_ANALYSIS=1
  set PACKET_HANDLER_VERBOSE=0
)

set PACKET_HANDLER_LOG_THROTTLE_MS=0
set WORLD_IP=127.0.0.1
set WORLD_PORT=61000

echo [ServerEmulator] Starting server on UDP port %PORT%...
echo [ServerEmulator] Mode=%MODE%
echo [ServerEmulator] Packet log: %PACKET_LOG% interval=%PACKET_LOG_INTERVAL_MS% ids=%PACKET_LOG_IDS%
echo [ServerEmulator] FAST_LOGIN=%FAST_LOGIN% WORLD=%WORLD_IP%:%WORLD_PORT%
npm run dev
