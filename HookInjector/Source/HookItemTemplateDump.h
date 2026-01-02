/** Item template dump helpers (CShell.dll). */
#pragma once

#include "HookCommon.h"

/** Called after ItemEntryWithId_read fills the entry. */
void OnItemEntryRead(const void* ItemEntryWithId);

/** Attempts a static item template dump from the runtime table (no server needed). */
void EnsureStaticItemTemplateDump(uint8_t* CShellBase);
