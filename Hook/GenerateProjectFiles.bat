@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
pushd "%ROOT%" >nul

set "ARCH=Win32"

set "BUILD=%ROOT%\\Build"
if not exist "%BUILD%" mkdir "%BUILD%"
if exist "%BUILD%\\CMakeCache.txt" del /q "%BUILD%\\CMakeCache.txt"

cmake -S "%ROOT%" -B "%BUILD%" -G "Visual Studio 17 2022" -A %ARCH%

set "SLN=%BUILD%\\FoMHook.sln"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\\TrimSolution.ps1" -Solution "%SLN%"

if exist "%BUILD%\\ALL_BUILD.vcxproj" del /q "%BUILD%\\ALL_BUILD.vcxproj"
if exist "%BUILD%\\ALL_BUILD.vcxproj.filters" del /q "%BUILD%\\ALL_BUILD.vcxproj.filters"
if exist "%BUILD%\\ZERO_CHECK.vcxproj" del /q "%BUILD%\\ZERO_CHECK.vcxproj"
if exist "%BUILD%\\ZERO_CHECK.vcxproj.filters" del /q "%BUILD%\\ZERO_CHECK.vcxproj.filters"
if exist "%BUILD%\\fom_hook.vcxproj" del /q "%BUILD%\\fom_hook.vcxproj"
if exist "%BUILD%\\fom_hook.vcxproj.filters" del /q "%BUILD%\\fom_hook.vcxproj.filters"
if exist "%SLN%" copy /y "%SLN%" "%ROOT%\\FoMHook.sln" >nul
if exist "%ROOT%\\FoMHook.sln" powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = '%ROOT%\\FoMHook.sln'; if (Test-Path $p) { $raw = Get-Content -LiteralPath $p -Raw; $raw = $raw -replace '\"FoMHook.vcxproj\"', '\"Build\\FoMHook.vcxproj\"'; Set-Content -LiteralPath $p -Value $raw -Encoding ASCII }"

popd >nul
endlocal
