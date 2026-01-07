#include "HookCommon.h"
#include "HookConfig.h"
#include "HookD3D9.h"
#include "HookLogging.h"
/** DLL entrypoint and startup threading. */
#include "HookFoMProtocol.h"
#include "HookItemOverrides.h"
#include "HookOverlay.h"
#include "HookRakNet.h"
#include "HookState.h"
#include "HookMain.h"

static DWORD WINAPI InitThread(LPVOID Parameter)
{
    (void)Parameter;

    LoadConfig();
    LogInit();
    InitLogPath();

    if (GConfig.LogPath[0])
    {
        DeleteFileA(GConfig.LogPath);
    }

    InitConsole();
    ValidateConfig();
    char ModulePath[MAX_PATH] = {0};
    GetModuleFileNameA(reinterpret_cast<HMODULE>(&__ImageBase), ModulePath, MAX_PATH);
    LOG("[Hook] DInput8 proxy loaded (pid=%lu)", GetCurrentProcessId());

    GExeBase = reinterpret_cast<uint8_t*>(GetModuleHandleA(nullptr));
    EnsureD3D9Hooks();
    EnsureFoMProtocolHooks();
    //EnsureItemOverrideHooks();
    InstallRakNetDetours();

    return 0;
}

void HookAttach()
{
    CreateThread(nullptr, 0, InitThread, nullptr, 0, nullptr);
}

void HookDetach()
{
    OverlayShutdown();
    LogShutdown();
}

#ifndef FOM_PROXY
BOOL APIENTRY DllMain(HMODULE Module, DWORD Reason, LPVOID Reserved)
{
    (void)Reserved;

    switch (Reason)
    {
    case DLL_PROCESS_ATTACH:
        DisableThreadLibraryCalls(Module);
        HookAttach();
        break;
    case DLL_PROCESS_DETACH:
        HookDetach();
        break;
    default:
        break;
    }

    return TRUE;
}
#endif
