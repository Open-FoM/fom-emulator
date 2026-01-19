@echo off
setlocal

set ROOT=%~dp0
if not exist "%ROOT%BuildX64" mkdir "%ROOT%BuildX64"
if not exist "%ROOT%BuildWin32" mkdir "%ROOT%BuildWin32"

pushd "%ROOT%BuildX64"
cmake -G "Visual Studio 17 2022" -A x64 ..
popd

pushd "%ROOT%BuildWin32"
cmake -G "Visual Studio 17 2022" -A Win32 ..
popd

endlocal
