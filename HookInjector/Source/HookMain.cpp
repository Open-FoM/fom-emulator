#include "HookCommon.h"
#include "HookConfig.h"
#include "HookD3D9.h"
#include "HookLogging.h"
#include "HookWinsock.h"
/** DLL entrypoint and startup threading. */
#include "HookFoMProtocol.h"
#include "HookItemOverrides.h"
#include "HookOverlay.h"
#include "HookRakNet.h"
#include "HookSharedMem.h"
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
    LOG("[Hook] DInput8 proxy loaded (pid=%lu)", GetCurrentProcessId());
    LOG("[Hook] log=%s ini=%s", GConfig.LogPath[0] ? GConfig.LogPath : "(default)", "fom_hook.ini");
    WinsockInit();

    GExeBase = reinterpret_cast<uint8_t*>(GetModuleHandleA(nullptr));
    EnsureD3D9Hooks();
    EnsureFoMProtocolHooks();
    EnsureItemOverrideHooks();
    EnsureSharedMemHooks();
    InstallWinsockHooks();
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
    WinsockShutdown();
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
