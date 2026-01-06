@echo on
setlocal

set "ROOT=%~dp0"
set "CONFIG=%~1"
if "%CONFIG%"=="" set "CONFIG=Release"
set "TARGET=FoMHook"

pushd "%ROOT%Hook" || exit /b 1

if not exist "Build\\CMakeCache.txt" (
  cmake -S . -B Build || exit /b 1
)

cmake --build Build --config "%CONFIG%" --target "%TARGET%" || exit /b 1

set "OUTDIR=Build\%CONFIG%"
set "SRC=%OUTDIR%\dinput8.dll"
set "DST=%ROOT%Client\\Client_FoM\\dinput8.dll"
if exist "%SRC%" (
  copy /y "%SRC%" "%DST%" || exit /b 1
) else (
  echo ERROR: Missing output "%SRC%"
  exit /b 1
)

popd
endlocal
