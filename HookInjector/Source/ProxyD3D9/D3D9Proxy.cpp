/** D3D9 proxy DLL that embeds the FoM hook. */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

struct IDirect3D9;
struct IDirect3D9Ex;

static HMODULE gRealModule = nullptr;

using Direct3DCreate9Fn = IDirect3D9* (WINAPI *)(UINT);
using Direct3DCreate9ExFn = HRESULT (WINAPI *)(UINT, IDirect3D9Ex**);
using Direct3DCreate9On12Fn = IDirect3D9* (WINAPI *)(UINT, void*, UINT);
using Direct3DCreate9On12ExFn = HRESULT (WINAPI *)(UINT, void*, UINT, IDirect3D9Ex**);
using Direct3DShaderValidatorCreate9Fn = void* (WINAPI *)(void);
using Direct3D9EnableMaximizedWindowedModeShimFn = HRESULT (WINAPI *)(BOOL);
using D3DPERF_BeginEventFn = int (WINAPI *)(DWORD, LPCWSTR);
using D3DPERF_EndEventFn = int (WINAPI *)(void);
using D3DPERF_SetMarkerFn = void (WINAPI *)(DWORD, LPCWSTR);
using D3DPERF_SetRegionFn = void (WINAPI *)(DWORD, LPCWSTR);
using D3DPERF_SetOptionsFn = void (WINAPI *)(DWORD);
using D3DPERF_QueryRepeatFrameFn = BOOL (WINAPI *)(void);
using D3DPERF_GetStatusFn = BOOL (WINAPI *)(void);
using DebugSetLevelFn = void (WINAPI *)(DWORD);
using DebugSetMuteFn = void (WINAPI *)(BOOL);
using PSGPErrorFn = void (WINAPI *)(void*, unsigned int, unsigned int);
using PSGPSampleTextureFn = void (WINAPI *)(void*, unsigned int, const float*, unsigned int);

static Direct3DCreate9Fn RealDirect3DCreate9 = nullptr;
static Direct3DCreate9ExFn RealDirect3DCreate9Ex = nullptr;
static Direct3DCreate9On12Fn RealDirect3DCreate9On12 = nullptr;
static Direct3DCreate9On12ExFn RealDirect3DCreate9On12Ex = nullptr;
static Direct3DShaderValidatorCreate9Fn RealDirect3DShaderValidatorCreate9 = nullptr;
static Direct3D9EnableMaximizedWindowedModeShimFn RealDirect3D9EnableMaximizedWindowedModeShim = nullptr;
static D3DPERF_BeginEventFn RealD3DPERF_BeginEvent = nullptr;
static D3DPERF_EndEventFn RealD3DPERF_EndEvent = nullptr;
static D3DPERF_SetMarkerFn RealD3DPERF_SetMarker = nullptr;
static D3DPERF_SetRegionFn RealD3DPERF_SetRegion = nullptr;
static D3DPERF_SetOptionsFn RealD3DPERF_SetOptions = nullptr;
static D3DPERF_QueryRepeatFrameFn RealD3DPERF_QueryRepeatFrame = nullptr;
static D3DPERF_GetStatusFn RealD3DPERF_GetStatus = nullptr;
static DebugSetLevelFn RealDebugSetLevel = nullptr;
static DebugSetMuteFn RealDebugSetMute = nullptr;
static PSGPErrorFn RealPSGPError = nullptr;
static PSGPSampleTextureFn RealPSGPSampleTexture = nullptr;

static void LoadRealD3D9()
{
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
    wcscat_s(SysDir, L"d3d9.dll");
    gRealModule = LoadLibraryW(SysDir);
    if (!gRealModule)
    {
        return;
    }
    RealDirect3DCreate9 = reinterpret_cast<Direct3DCreate9Fn>(GetProcAddress(gRealModule, "Direct3DCreate9"));
    RealDirect3DCreate9Ex = reinterpret_cast<Direct3DCreate9ExFn>(GetProcAddress(gRealModule, "Direct3DCreate9Ex"));
    RealDirect3DCreate9On12 = reinterpret_cast<Direct3DCreate9On12Fn>(GetProcAddress(gRealModule, "Direct3DCreate9On12"));
    RealDirect3DCreate9On12Ex = reinterpret_cast<Direct3DCreate9On12ExFn>(GetProcAddress(gRealModule, "Direct3DCreate9On12Ex"));
    RealDirect3DShaderValidatorCreate9 =
        reinterpret_cast<Direct3DShaderValidatorCreate9Fn>(GetProcAddress(gRealModule, "Direct3DShaderValidatorCreate9"));
    RealDirect3D9EnableMaximizedWindowedModeShim = reinterpret_cast<Direct3D9EnableMaximizedWindowedModeShimFn>(
        GetProcAddress(gRealModule, "Direct3D9EnableMaximizedWindowedModeShim"));
    RealD3DPERF_BeginEvent = reinterpret_cast<D3DPERF_BeginEventFn>(GetProcAddress(gRealModule, "D3DPERF_BeginEvent"));
    RealD3DPERF_EndEvent = reinterpret_cast<D3DPERF_EndEventFn>(GetProcAddress(gRealModule, "D3DPERF_EndEvent"));
    RealD3DPERF_SetMarker = reinterpret_cast<D3DPERF_SetMarkerFn>(GetProcAddress(gRealModule, "D3DPERF_SetMarker"));
    RealD3DPERF_SetRegion = reinterpret_cast<D3DPERF_SetRegionFn>(GetProcAddress(gRealModule, "D3DPERF_SetRegion"));
    RealD3DPERF_SetOptions = reinterpret_cast<D3DPERF_SetOptionsFn>(GetProcAddress(gRealModule, "D3DPERF_SetOptions"));
    RealD3DPERF_QueryRepeatFrame =
        reinterpret_cast<D3DPERF_QueryRepeatFrameFn>(GetProcAddress(gRealModule, "D3DPERF_QueryRepeatFrame"));
    RealD3DPERF_GetStatus = reinterpret_cast<D3DPERF_GetStatusFn>(GetProcAddress(gRealModule, "D3DPERF_GetStatus"));
    RealDebugSetLevel = reinterpret_cast<DebugSetLevelFn>(GetProcAddress(gRealModule, "DebugSetLevel"));
    RealDebugSetMute = reinterpret_cast<DebugSetMuteFn>(GetProcAddress(gRealModule, "DebugSetMute"));
    RealPSGPError = reinterpret_cast<PSGPErrorFn>(GetProcAddress(gRealModule, "PSGPError"));
    RealPSGPSampleTexture = reinterpret_cast<PSGPSampleTextureFn>(GetProcAddress(gRealModule, "PSGPSampleTexture"));
}

extern "C" IDirect3D9* WINAPI Direct3DCreate9(UINT SdkVersion)
{
    LoadRealD3D9();
    return RealDirect3DCreate9 ? RealDirect3DCreate9(SdkVersion) : nullptr;
}

extern "C" HRESULT WINAPI Direct3DCreate9Ex(UINT SdkVersion, IDirect3D9Ex** OutDevice)
{
    LoadRealD3D9();
    return RealDirect3DCreate9Ex ? RealDirect3DCreate9Ex(SdkVersion, OutDevice) : E_FAIL;
}

extern "C" IDirect3D9* WINAPI Direct3DCreate9On12(UINT SdkVersion, void* OverrideList, UINT NumOverrideEntries)
{
    LoadRealD3D9();
    return RealDirect3DCreate9On12 ? RealDirect3DCreate9On12(SdkVersion, OverrideList, NumOverrideEntries) : nullptr;
}

extern "C" HRESULT WINAPI Direct3DCreate9On12Ex(UINT SdkVersion,
                                                void* OverrideList,
                                                UINT NumOverrideEntries,
                                                IDirect3D9Ex** OutDevice)
{
    LoadRealD3D9();
    return RealDirect3DCreate9On12Ex ? RealDirect3DCreate9On12Ex(SdkVersion, OverrideList, NumOverrideEntries, OutDevice)
                                     : E_FAIL;
}

extern "C" void* WINAPI Direct3DShaderValidatorCreate9(void)
{
    LoadRealD3D9();
    return RealDirect3DShaderValidatorCreate9 ? RealDirect3DShaderValidatorCreate9() : nullptr;
}

extern "C" HRESULT WINAPI Direct3D9EnableMaximizedWindowedModeShim(BOOL Enable)
{
    LoadRealD3D9();
    return RealDirect3D9EnableMaximizedWindowedModeShim ? RealDirect3D9EnableMaximizedWindowedModeShim(Enable)
                                                        : E_NOTIMPL;
}

extern "C" int WINAPI D3DPERF_BeginEvent(DWORD Color, LPCWSTR Name)
{
    LoadRealD3D9();
    return RealD3DPERF_BeginEvent ? RealD3DPERF_BeginEvent(Color, Name) : 0;
}

extern "C" int WINAPI D3DPERF_EndEvent(void)
{
    LoadRealD3D9();
    return RealD3DPERF_EndEvent ? RealD3DPERF_EndEvent() : 0;
}

extern "C" void WINAPI D3DPERF_SetMarker(DWORD Color, LPCWSTR Name)
{
    LoadRealD3D9();
    if (RealD3DPERF_SetMarker)
    {
        RealD3DPERF_SetMarker(Color, Name);
    }
}

extern "C" void WINAPI D3DPERF_SetRegion(DWORD Color, LPCWSTR Name)
{
    LoadRealD3D9();
    if (RealD3DPERF_SetRegion)
    {
        RealD3DPERF_SetRegion(Color, Name);
    }
}

extern "C" void WINAPI D3DPERF_SetOptions(DWORD Options)
{
    LoadRealD3D9();
    if (RealD3DPERF_SetOptions)
    {
        RealD3DPERF_SetOptions(Options);
    }
}

extern "C" BOOL WINAPI D3DPERF_QueryRepeatFrame(void)
{
    LoadRealD3D9();
    return RealD3DPERF_QueryRepeatFrame ? RealD3DPERF_QueryRepeatFrame() : FALSE;
}

extern "C" BOOL WINAPI D3DPERF_GetStatus(void)
{
    LoadRealD3D9();
    return RealD3DPERF_GetStatus ? RealD3DPERF_GetStatus() : FALSE;
}

extern "C" void WINAPI DebugSetLevel(DWORD Level)
{
    LoadRealD3D9();
    if (RealDebugSetLevel)
    {
        RealDebugSetLevel(Level);
    }
}

extern "C" void WINAPI DebugSetMute(BOOL Mute)
{
    LoadRealD3D9();
    if (RealDebugSetMute)
    {
        RealDebugSetMute(Mute);
    }
}

extern "C" void WINAPI PSGPError(void* ProcessVertices, unsigned int ErrorId, unsigned int Value)
{
    LoadRealD3D9();
    if (RealPSGPError)
    {
        RealPSGPError(ProcessVertices, ErrorId, Value);
    }
}

extern "C" void WINAPI PSGPSampleTexture(void* ProcessVertices,
                                          unsigned int Stage,
                                          const float* Transform,
                                          unsigned int Flags)
{
    LoadRealD3D9();
    if (RealPSGPSampleTexture)
    {
        RealPSGPSampleTexture(ProcessVertices, Stage, Transform, Flags);
    }
}

extern "C" int WINAPI GetDLLVersion(void)
{
    return 0x63F;
}

BOOL APIENTRY DllMain(HMODULE Module, DWORD Reason, LPVOID Reserved)
{
    (void)Module;
    (void)Reserved;
    if (Reason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(Module);
    }
    else if (Reason == DLL_PROCESS_DETACH)
    {
        if (gRealModule)
        {
            FreeLibrary(gRealModule);
            gRealModule = nullptr;
        }
    }
    return TRUE;
}
