/** DInput8 proxy DLL. */
#include <windows.h>
#include <unknwn.h>

#include "HookMain.h"

static HMODULE gRealModule = nullptr;

using DirectInput8CreateFn = HRESULT (WINAPI *)(HINSTANCE, DWORD, REFIID, LPVOID*, LPUNKNOWN);
using DllCanUnloadNowFn = HRESULT (WINAPI *)(void);
using DllGetClassObjectFn = HRESULT (WINAPI *)(REFCLSID, REFIID, LPVOID*);
using DllRegisterServerFn = HRESULT (WINAPI *)(void);
using DllUnregisterServerFn = HRESULT (WINAPI *)(void);
using GetdfDIJoystickFn = const void* (WINAPI *)(void);

static DirectInput8CreateFn RealDirectInput8Create = nullptr;
static DllCanUnloadNowFn RealDllCanUnloadNow = nullptr;
static DllGetClassObjectFn RealDllGetClassObject = nullptr;
static DllRegisterServerFn RealDllRegisterServer = nullptr;
static DllUnregisterServerFn RealDllUnregisterServer = nullptr;
static GetdfDIJoystickFn RealGetdfDIJoystick = nullptr;

static void LoadRealDInput8()
{
    // Load the system dinput8.dll once so we can forward exports safely.
    if (gRealModule)
    {
        return;
    }
    wchar_t SysDir[MAX_PATH] = {0};
    UINT Len = GetSystemDirectoryW(SysDir, MAX_PATH);
    if (Len == 0 || Len >= MAX_PATH)
    {
        return;
    }
    if (SysDir[Len - 1] != L'\\')
    {
        wcscat_s(SysDir, L"\\");
    }
    wcscat_s(SysDir, L"dinput8.dll");
    gRealModule = LoadLibraryW(SysDir);
    if (!gRealModule)
    {
        return;
    }
    RealDirectInput8Create = reinterpret_cast<DirectInput8CreateFn>(GetProcAddress(gRealModule, "DirectInput8Create"));
    RealDllCanUnloadNow = reinterpret_cast<DllCanUnloadNowFn>(GetProcAddress(gRealModule, "DllCanUnloadNow"));
    RealDllGetClassObject = reinterpret_cast<DllGetClassObjectFn>(GetProcAddress(gRealModule, "DllGetClassObject"));
    RealDllRegisterServer = reinterpret_cast<DllRegisterServerFn>(GetProcAddress(gRealModule, "DllRegisterServer"));
    RealDllUnregisterServer = reinterpret_cast<DllUnregisterServerFn>(GetProcAddress(gRealModule, "DllUnregisterServer"));
    RealGetdfDIJoystick = reinterpret_cast<GetdfDIJoystickFn>(GetProcAddress(gRealModule, "GetdfDIJoystick"));
}

extern "C" HRESULT WINAPI DirectInput8Create(HINSTANCE hinst, DWORD dwVersion, REFIID riid, LPVOID* ppvOut, LPUNKNOWN punkOuter)
{
    LoadRealDInput8();
    return RealDirectInput8Create ? RealDirectInput8Create(hinst, dwVersion, riid, ppvOut, punkOuter) : E_FAIL;
}

extern "C" HRESULT WINAPI DllCanUnloadNow(void)
{
    LoadRealDInput8();
    return RealDllCanUnloadNow ? RealDllCanUnloadNow() : S_FALSE;
}

extern "C" HRESULT WINAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID* ppv)
{
    LoadRealDInput8();
    return RealDllGetClassObject ? RealDllGetClassObject(rclsid, riid, ppv) : E_FAIL;
}

extern "C" HRESULT WINAPI DllRegisterServer(void)
{
    LoadRealDInput8();
    return RealDllRegisterServer ? RealDllRegisterServer() : E_FAIL;
}

extern "C" HRESULT WINAPI DllUnregisterServer(void)
{
    LoadRealDInput8();
    return RealDllUnregisterServer ? RealDllUnregisterServer() : E_FAIL;
}

extern "C" const void* WINAPI GetdfDIJoystick(void)
{
    LoadRealDInput8();
    return RealGetdfDIJoystick ? RealGetdfDIJoystick() : nullptr;
}

BOOL APIENTRY DllMain(HMODULE Module, DWORD Reason, LPVOID Reserved)
{
    (void)Reserved;
    if (Reason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(Module);
        HookAttach();
    }
    else if (Reason == DLL_PROCESS_DETACH)
    {
        HookDetach();
        if (gRealModule)
        {
            FreeLibrary(gRealModule);
            gRealModule = nullptr;
        }
    }
    return TRUE;
}
