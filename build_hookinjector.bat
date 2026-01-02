@echo off
setlocal

set "ROOT=%~dp0"
set "CONFIG=%~1"
if "%CONFIG%"=="" set "CONFIG=Release"

pushd "%ROOT%HookInjector" || exit /b 1

if not exist "Build\\CMakeCache.txt" (
  cmake -S . -B Build || exit /b 1
)

cmake --build Build --config "%CONFIG%" || exit /b 1

popd
endlocal
