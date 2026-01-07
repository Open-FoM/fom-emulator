/** Hook configuration loader. */
#pragma once

#include "HookState.h"

/** Loads configuration from fom_hook.ini into GConfig. */
void LoadConfig();
/** Validates and clamps configuration values; logs warnings when defaults are applied. */
void ValidateConfig();
