/** Detour and patch helper declarations. */
#pragma once

#include "HookLogging.h"

/** Installs a detour at the given RVA. */
bool InstallDetour(uint32_t Rva, size_t Length, void* Hook, void** OriginalOut);
/** Installs a detour at the given address. */
bool InstallDetourAt(void* TargetPtr, size_t Length, void* Hook, void** OriginalOut, const char* Name);
/** Installs a detour after verifying the expected prologue bytes. */
bool InstallDetourChecked(const char* Name, uint32_t Rva, size_t Length, const uint8_t* Expected, void* Hook, void** OriginalOut);
/** Installs a detour and fixes a single rel32 CALL/JMP inside the copied prologue. */
bool InstallDetourCheckedRel32(const char* Name, uint32_t Rva, size_t Length, const uint8_t* Expected,
                               void* Hook, void** OriginalOut, size_t RelOffset);
/** Patches an IAT entry and returns the original function. */
bool PatchIat(HMODULE Module, const char* DllName, const char* FuncName, void* NewFunc, void** OriginalOut);
