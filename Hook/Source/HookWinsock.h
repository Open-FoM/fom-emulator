/** Winsock/Win32 hook wiring and wrappers. */
#pragma once

#include "HookDetours.h"

/** Initializes winsock hook state and threads. */
void WinsockInit();
/** Shuts down winsock hook state. */
void WinsockShutdown();
/** Installs winsock detours + rescan thread. */
void InstallWinsockHooks();
