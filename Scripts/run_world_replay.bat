@echo off
setlocal

set "ROOT=%~dp0"
set "RUN_LABEL=%~1"
set "DURATION=%~2"
set "WORLD_PORT=%~3"
set "CLIENT_PORT=%~4"

if "%RUN_LABEL%"=="" set "RUN_LABEL=run"
if "%DURATION%"=="" set "DURATION=15"
if "%WORLD_PORT%"=="" set "WORLD_PORT=62000"
if "%CLIENT_PORT%"=="" set "CLIENT_PORT=63000"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = Resolve-Path (Join-Path '%ROOT%' '..');" ^
  "$run = '%RUN_LABEL%';" ^
  "$duration = [int]('%DURATION%');" ^
  "$worldPort = [int]('%WORLD_PORT%');" ^
  "$clientPort = [int]('%CLIENT_PORT%');" ^
  "$logDir = Join-Path $root 'Server\\apps\\world\\logs';" ^
  "$env:FOM_RAKNET_FFI_PATH = Join-Path $root 'Server\\packages\\networking\\native\\raknet_ffi.dll';" ^
  "if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null };" ^
  "$ts = Get-Date -Format 'yyyy.MM.dd-HH.mm.ss.fff';" ^
  "$serverOut = Join-Path $logDir ('pi_run_' + $run + '_' + $ts + '.out');" ^
  "$serverErr = Join-Path $logDir ('pi_run_' + $run + '_' + $ts + '.err');" ^
  "$clientOut = Join-Path $logDir ('pi_run_' + $run + '_' + $ts + '_client.out');" ^
  "$clientErr = Join-Path $logDir ('pi_run_' + $run + '_' + $ts + '_client.err');" ^
  "$env:PORT = $worldPort;" ^
  "$server = Start-Process -FilePath (Join-Path $root 'start_world.bat') -WorkingDirectory $root -PassThru -NoNewWindow -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr;" ^
  "Start-Sleep -Seconds 2;" ^
  "$bun = \"$env:USERPROFILE\\.bun\\bin\\bun.exe\";" ^
  "if (!(Test-Path $bun)) { $bun = 'bun' };" ^
  "$clientArgs = @('src/tools/TestClient.ts','world','127.0.0.1',$worldPort,'--world-replay=1','--world-replay-ms=0',('--world-replay-port=' + $clientPort));" ^
  "$client = Start-Process -FilePath $bun -ArgumentList $clientArgs -WorkingDirectory (Join-Path $root 'Client\\Client_TS') -PassThru -NoNewWindow -RedirectStandardOutput $clientOut -RedirectStandardError $clientErr;" ^
  "Start-Sleep -Seconds $duration;" ^
  "if (!$client.HasExited) { Stop-Process -Id $client.Id -Force -ErrorAction SilentlyContinue };" ^
  "if (!$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue };" ^
  "$validator = Join-Path $root 'Scripts\\validate_world_replay.py';" ^
  "if (Test-Path $validator) { $python = 'python'; & $python $validator --doc (Join-Path $root 'Docs\\GamePacketsParsingFix.md') --server $serverOut --client $clientOut; }" ^
  "Write-Output ('ServerOut=' + $serverOut);" ^
  "Write-Output ('ServerErr=' + $serverErr);" ^
  "Write-Output ('ClientOut=' + $clientOut);" ^
  "Write-Output ('ClientErr=' + $clientErr);"

endlocal
