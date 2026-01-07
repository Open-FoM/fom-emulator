/** FoM protocol (engine-level) hooks. */
#pragma once

#include "HookDetours.h"
#include "HookDecode.h"

/** Schedules FoM protocol hooks (Net_Send/Recv/SendTo, Login6C). */
void EnsureFoMProtocolHooks();
