@echo off
REM Build RakNet FFI DLL for Windows
REM Requires: Visual Studio 2022 with C++ workload, CMake

setlocal enabledelayedexpansion

echo ============================================================
echo  RakNet FFI DLL Builder
echo ============================================================
echo.

REM Try to find CMake
set CMAKE_EXE=
for %%p in (
    "C:\Program Files\CMake\bin\cmake.exe"
    "C:\Program Files (x86)\CMake\bin\cmake.exe"
    "%ProgramFiles%\CMake\bin\cmake.exe"
    "%ProgramFiles(x86)%\CMake\bin\cmake.exe"
) do (
    if exist %%p (
        set CMAKE_EXE=%%p
        goto :found_cmake
    )
)

REM Try PATH
where cmake.exe >nul 2>&1
if %errorlevel% equ 0 (
    set CMAKE_EXE=cmake.exe
    goto :found_cmake
)

echo ERROR: CMake not found!
echo.
echo Please install CMake from: https://cmake.org/download/
echo Or install via winget: winget install Kitware.CMake
echo.
exit /b 1

:found_cmake
echo Found CMake: %CMAKE_EXE%
echo.

REM Try to find Visual Studio
set VS_PATH=
for %%v in (
    "C:\Program Files\Microsoft Visual Studio\2022\Community"
    "C:\Program Files\Microsoft Visual Studio\2022\Professional"
    "C:\Program Files\Microsoft Visual Studio\2022\Enterprise"
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
) do (
    if exist "%%~v\VC\Auxiliary\Build\vcvarsall.bat" (
        set VS_PATH=%%~v
        goto :found_vs
    )
)

echo WARNING: Visual Studio 2022 not found in standard locations.
echo          CMake will try to detect it automatically.
echo.
goto :skip_vcvars

:found_vs
echo Found Visual Studio: %VS_PATH%
echo.

:skip_vcvars

REM Create and enter build directory
if not exist Build mkdir Build
cd Build

REM Configure
echo Configuring with CMake...
%CMAKE_EXE% -G "Visual Studio 17 2022" -A x64 ..
if errorlevel 1 (
    echo.
    echo CMake configuration failed!
    echo.
    echo Possible fixes:
    echo   1. Install Visual Studio 2022 with "Desktop development with C++" workload
    echo   2. Run this script from a Developer Command Prompt
    echo.
    cd ..
    exit /b 1
)

REM Build
echo.
echo Building Release configuration...
%CMAKE_EXE% --build . --config Release
if errorlevel 1 (
    echo.
    echo Build failed!
    cd ..
    exit /b 1
)

echo.
echo ============================================================
echo  Build Successful!
echo ============================================================
echo.
echo Output: Server\\Master_TS\\raknet_ffi.dll
echo.
echo To use with the emulator:
echo   cd Server
echo   bun install
echo   bun run dev
echo.

cd ..
endlocal
