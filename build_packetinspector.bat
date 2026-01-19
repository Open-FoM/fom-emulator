@echo on
setlocal

set "ROOT=%~dp0"
set "CONFIG=%~1"
if "%CONFIG%"=="" set "CONFIG=Release"

set "TARGET=PacketInspector"
set "BUILD_X64=PacketInspector\\BuildX64"
set "BUILD_X86=PacketInspector\\BuildWin32"

pushd "%ROOT%PacketInspector" || exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs=@(); Get-Process -ErrorAction SilentlyContinue | ForEach-Object { $p=$_; try { if ($p.Modules | Where-Object { $_.ModuleName -ieq 'PacketInspector.dll' }) { $procs += $p } } catch {} }; if ($procs.Count -gt 0) { $procs | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } }"

if not exist "%BUILD_X64%\\CMakeCache.txt" (
  cmake -S . -B "%BUILD_X64%" -G "Visual Studio 17 2022" -A x64 || exit /b 1
)
if not exist "%BUILD_X86%\\CMakeCache.txt" (
  cmake -S . -B "%BUILD_X86%" -G "Visual Studio 17 2022" -A Win32 || exit /b 1
)

cmake --build "%BUILD_X64%" --config "%CONFIG%" --target "%TARGET%" || exit /b 1
cmake --build "%BUILD_X86%" --config "%CONFIG%" --target "%TARGET%" || exit /b 1

set "SRC_X64=%ROOT%PacketInspector\\Build\\x64\\%CONFIG%\\PacketInspector.dll"
set "SRC_X86=%ROOT%PacketInspector\\Build\\Win32\\%CONFIG%\\PacketInspector.dll"
set "DST_X86=%ROOT%Client\\Client_FoM\\PacketInspector.dll"

if exist "%SRC_X86%" (
  copy /y "%SRC_X86%" "%DST_X86%" || exit /b 1
) else (
  echo ERROR: Missing output "%SRC_X86%"
  exit /b 1
)

if not exist "%SRC_X64%" (
  echo ERROR: Missing output "%SRC_X64%"
  exit /b 1
)

popd
endlocal
