@echo on
setlocal

set "ROOT=%~dp0"
set "CONFIG=%~1"
if "%CONFIG%"=="" set "CONFIG=Release"
set "TARGET=FoMHook"
set "ARCH=Win32"
set "BUILD=BuildWin32"

pushd "%ROOT%Hook" || exit /b 1

if not exist "%BUILD%\\CMakeCache.txt" (
  cmake -S . -B "%BUILD%" -G "Visual Studio 17 2022" -A %ARCH% || exit /b 1
)

cmake --build "%BUILD%" --config "%CONFIG%" --target "%TARGET%" || exit /b 1

set "OUTDIR=%BUILD%\\%CONFIG%"
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
