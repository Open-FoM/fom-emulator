/** D3D9 manager/CreateDevice hook. */
#include "HookD3D9.h"
#include "HookDetours.h"
#include "HookLogging.h"
#include "HookState.h"

#include <atomic>
#include <d3d9.h>

namespace
{
// RVA uses the PE image base (0x00400000).
constexpr uint32_t kRva_D3D9Mgr_Init = 0x0020AE90;
constexpr uint32_t kRva_D3D9Mgr_Ptr = 0x00342970;
constexpr uint8_t kD3D9MgrInitPrologue[] = {0x56, 0x8B, 0xF1, 0x8B, 0x06};
constexpr size_t kD3D9MgrInitLen = sizeof(kD3D9MgrInitPrologue);
constexpr size_t kD3D9CreateDeviceIndex = 16; // IDirect3D9::CreateDevice

using D3D9MgrInitFn = char(__thiscall*)(void* ThisPtr);
using Direct3DCreate9Fn = IDirect3D9* (WINAPI *)(UINT);
using D3D9CreateDeviceFn = HRESULT(WINAPI *)(IDirect3D9* Self, UINT Adapter, D3DDEVTYPE DeviceType,
                                            HWND FocusWindow, DWORD BehaviorFlags,
                                            D3DPRESENT_PARAMETERS* Params,
                                            IDirect3DDevice9** OutDevice);

static D3D9MgrInitFn D3D9MgrInit_Orig = nullptr;
static D3D9CreateDeviceFn D3D9CreateDevice_Orig = nullptr;
static Direct3DCreate9Fn Direct3DCreate9_Orig = nullptr;

static std::atomic<bool> GD3D9MgrHookInstalled{false};
static std::atomic<bool> GD3D9VtableHooked{false};
static std::atomic<bool> GD3D9DeviceLogged{false};
static std::atomic<bool> GD3D9RescanStarted{false};

static HRESULT WINAPI HookD3D9CreateDevice(IDirect3D9* Self, UINT Adapter, D3DDEVTYPE DeviceType,
                                          HWND FocusWindow, DWORD BehaviorFlags,
                                          D3DPRESENT_PARAMETERS* Params,
                                          IDirect3DDevice9** OutDevice)
{
    HRESULT Result = D3D9CreateDevice_Orig
        ? D3D9CreateDevice_Orig(Self, Adapter, DeviceType, FocusWindow, BehaviorFlags, Params, OutDevice)
        : E_FAIL;
    if (SUCCEEDED(Result) && OutDevice && *OutDevice)
    {
        GD3D9Device = *OutDevice;
        if (!GD3D9DeviceLogged.exchange(true))
        {
            LOG("[Hook] D3D9 CreateDevice -> %p (behavior=0x%lx)", *OutDevice, static_cast<unsigned long>(BehaviorFlags));
        }
    }
    return Result;
}

static void HookD3D9Vtable(IDirect3D9* D3D9)
{
    if (!D3D9 || GD3D9VtableHooked.load())
    {
        return;
    }
    void** Vtbl = *reinterpret_cast<void***>(D3D9);
    if (!Vtbl)
    {
        return;
    }
    void* Target = Vtbl[kD3D9CreateDeviceIndex];
    if (!Target)
    {
        return;
    }
    DWORD OldProt = 0;
    if (!VirtualProtect(&Vtbl[kD3D9CreateDeviceIndex], sizeof(void*), PAGE_EXECUTE_READWRITE, &OldProt))
    {
        return;
    }
    if (!D3D9CreateDevice_Orig)
    {
        D3D9CreateDevice_Orig = reinterpret_cast<D3D9CreateDeviceFn>(Target);
    }
    Vtbl[kD3D9CreateDeviceIndex] = reinterpret_cast<void*>(&HookD3D9CreateDevice);
    VirtualProtect(&Vtbl[kD3D9CreateDeviceIndex], sizeof(void*), OldProt, &OldProt);
    FlushInstructionCache(GetCurrentProcess(), &Vtbl[kD3D9CreateDeviceIndex], sizeof(void*));
    GD3D9VtableHooked.store(true);
    LOG("[Hook] D3D9 CreateDevice vtbl patched");
}

static IDirect3D9* WINAPI HookDirect3DCreate9(UINT SdkVersion)
{
    IDirect3D9* D3D9 = Direct3DCreate9_Orig ? Direct3DCreate9_Orig(SdkVersion) : nullptr;
    HookD3D9Vtable(D3D9);
    return D3D9;
}

static char __fastcall HookD3D9Mgr_Init(void* ThisPtr, void* Edx)
{
    (void)Edx;
    char Result = D3D9MgrInit_Orig ? D3D9MgrInit_Orig(ThisPtr) : 0;
    IDirect3D9* D3D9 = nullptr;
    if (ThisPtr)
    {
        D3D9 = *reinterpret_cast<IDirect3D9**>(ThisPtr);
    }
    HookD3D9Vtable(D3D9);
    return Result;
}

static DWORD WINAPI D3D9RescanThread(LPVOID)
{
    DWORD DelayMs = GConfig.RescanMs ? GConfig.RescanMs : 1000;
    for (;;)
    {
        if (GD3D9VtableHooked.load())
        {
            return 0;
        }
        IDirect3D9* D3D9 = nullptr;
        if (GExeBase)
        {
            __try
            {
                auto Slot = reinterpret_cast<IDirect3D9**>(GExeBase + kRva_D3D9Mgr_Ptr);
                D3D9 = Slot ? *Slot : nullptr;
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
                D3D9 = nullptr;
            }
        }
        if (D3D9)
        {
            HookD3D9Vtable(D3D9);
        }
        Sleep(DelayMs);
    }
}
} // namespace

void EnsureD3D9Hooks()
{
    if (GD3D9MgrHookInstalled.load() && GD3D9RescanStarted.load())
    {
        return;
    }
    if (!GExeBase)
    {
        return;
    }
    bool DetourOk = InstallDetourChecked("D3D9Mgr_Init", kRva_D3D9Mgr_Init, kD3D9MgrInitLen,
                                         kD3D9MgrInitPrologue, reinterpret_cast<void*>(&HookD3D9Mgr_Init),
                                         reinterpret_cast<void**>(&D3D9MgrInit_Orig));
    if (DetourOk)
    {
        GD3D9MgrHookInstalled.store(true);
        LOG("[Hook] D3D9Mgr_Init detoured");
    }

    if (PatchIat(GetModuleHandleA(nullptr), "d3d9.dll", "Direct3DCreate9",
                 reinterpret_cast<void*>(&HookDirect3DCreate9),
                 reinterpret_cast<void**>(&Direct3DCreate9_Orig)))
    {
        LOG("[Hook] Direct3DCreate9 IAT hooked");
    }

    if (!GD3D9RescanStarted.exchange(true))
    {
        CreateThread(nullptr, 0, D3D9RescanThread, nullptr, 0, nullptr);
    }
}
