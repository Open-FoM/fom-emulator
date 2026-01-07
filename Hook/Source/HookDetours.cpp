/** Detour and patch helper implementation. */
#include "HookDetours.h"

static void* CreateTrampoline(uint8_t* Target, size_t Length)
{
    uint8_t* Trampoline = reinterpret_cast<uint8_t*>(VirtualAlloc(nullptr, Length + 5, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE));
    if (!Trampoline)
    {
        return nullptr;
    }
    memcpy(Trampoline, Target, Length);
    intptr_t Rel = (Target + Length) - (Trampoline + Length + 5);
    Trampoline[Length] = 0xE9;
    *reinterpret_cast<int32_t*>(Trampoline + Length + 1) = static_cast<int32_t>(Rel);
    return Trampoline;
}

static void* CreateTrampolineRel32(uint8_t* Target, size_t Length, size_t RelOffset)
{
    uint8_t* Trampoline = reinterpret_cast<uint8_t*>(VirtualAlloc(nullptr, Length + 5, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE));
    if (!Trampoline)
    {
        return nullptr;
    }
    memcpy(Trampoline, Target, Length);
    if (RelOffset + 5 <= Length)
    {
        uint8_t Op = Target[RelOffset];
        if (Op == 0xE8 || Op == 0xE9)
        {
            int32_t OrigRel = *reinterpret_cast<int32_t*>(Target + RelOffset + 1);
            uint8_t* OrigTarget = Target + RelOffset + 5 + OrigRel;
            int32_t NewRel = static_cast<int32_t>(OrigTarget - (Trampoline + RelOffset + 5));
            *reinterpret_cast<int32_t*>(Trampoline + RelOffset + 1) = NewRel;
        }
    }
    intptr_t Rel = (Target + Length) - (Trampoline + Length + 5);
    Trampoline[Length] = 0xE9;
    *reinterpret_cast<int32_t*>(Trampoline + Length + 1) = static_cast<int32_t>(Rel);
    return Trampoline;
}

static void* CreateTrampolineSmart(uint8_t* Target, size_t Length)
{
    if (Length >= 5)
    {
        uint8_t Op = Target[0];
        if (Op == 0xE8 || Op == 0xE9)
        {
            return CreateTrampolineRel32(Target, Length, 0);
        }
    }
    return CreateTrampoline(Target, Length);
}

bool InstallDetour(uint32_t Rva, size_t Length, void* Hook, void** OriginalOut)
{
    if (!GExeBase)
    {
        return false;
    }
    uint8_t* Target = GExeBase + Rva;
    if (OriginalOut && *OriginalOut)
    {
        return true;
    }
    void* Trampoline = CreateTrampolineSmart(Target, Length);
    if (!Trampoline)
    {
        return false;
    }
    DWORD OldProt = 0;
    if (!VirtualProtect(Target, Length, PAGE_EXECUTE_READWRITE, &OldProt))
    {
        return false;
    }
    intptr_t Rel = (reinterpret_cast<uint8_t*>(Hook)) - (Target + 5);
    Target[0] = 0xE9;
    *reinterpret_cast<int32_t*>(Target + 1) = static_cast<int32_t>(Rel);
    for (size_t Index = 5; Index < Length; ++Index)
    {
        Target[Index] = 0x90;
    }
    VirtualProtect(Target, Length, OldProt, &OldProt);
    FlushInstructionCache(GetCurrentProcess(), Target, Length);
    if (OriginalOut)
    {
        *OriginalOut = Trampoline;
    }
    return true;
}

static bool InstallDetourRel32(uint32_t Rva, size_t Length, void* Hook, void** OriginalOut, size_t RelOffset)
{
    if (!GExeBase)
    {
        return false;
    }
    uint8_t* Target = GExeBase + Rva;
    if (OriginalOut && *OriginalOut)
    {
        return true;
    }
    void* Trampoline = CreateTrampolineRel32(Target, Length, RelOffset);
    if (!Trampoline)
    {
        return false;
    }
    DWORD OldProt = 0;
    if (!VirtualProtect(Target, Length, PAGE_EXECUTE_READWRITE, &OldProt))
    {
        return false;
    }
    intptr_t Rel = (reinterpret_cast<uint8_t*>(Hook)) - (Target + 5);
    Target[0] = 0xE9;
    *reinterpret_cast<int32_t*>(Target + 1) = static_cast<int32_t>(Rel);
    for (size_t Index = 5; Index < Length; ++Index)
    {
        Target[Index] = 0x90;
    }
    VirtualProtect(Target, Length, OldProt, &OldProt);
    FlushInstructionCache(GetCurrentProcess(), Target, Length);
    if (OriginalOut)
    {
        *OriginalOut = Trampoline;
    }
    return true;
}

bool InstallDetourAt(void* TargetPtr, size_t Length, void* Hook, void** OriginalOut, const char* Name)
{
    if (!TargetPtr || Length < 5 || !Hook)
    {
        return false;
    }
    uint8_t* Target = reinterpret_cast<uint8_t*>(TargetPtr);
    if (OriginalOut && *OriginalOut)
    {
        return true;
    }
    void* Trampoline = CreateTrampolineSmart(Target, Length);
    if (!Trampoline)
    {
        return false;
    }
    DWORD OldProt = 0;
    if (!VirtualProtect(Target, Length, PAGE_EXECUTE_READWRITE, &OldProt))
    {
        return false;
    }
    intptr_t Rel = (reinterpret_cast<uint8_t*>(Hook)) - (Target + 5);
    Target[0] = 0xE9;
    *reinterpret_cast<int32_t*>(Target + 1) = static_cast<int32_t>(Rel);
    for (size_t Index = 5; Index < Length; ++Index)
    {
        Target[Index] = 0x90;
    }
    VirtualProtect(Target, Length, OldProt, &OldProt);
    FlushInstructionCache(GetCurrentProcess(), Target, Length);
    if (OriginalOut)
    {
        *OriginalOut = Trampoline;
    }
    (void)Name;
    return true;
}

static bool CheckPrologue(uint32_t Rva, const uint8_t* Expected, size_t Length, const char* Name)
{
    if (!GExeBase || !Expected || Length == 0 || !Name)
    {
        return false;
    }
    uint8_t* Target = GExeBase + Rva;
    if (memcmp(Target, Expected, Length) == 0)
    {
        return true;
    }
    char ExpectedHex[128] = {0};
    char ActualHex[128] = {0};
    BytesToHex(Expected, Length, ExpectedHex, sizeof(ExpectedHex));
    BytesToHex(Target, Length, ActualHex, sizeof(ActualHex));
    char Line[256] = {0};
    _snprintf_s(Line, sizeof(Line), _TRUNCATE,
                "%s prologue mismatch (exp: %s, got: %s) - skipping",
                Name, ExpectedHex, ActualHex);
    LOG("%s", Line);
    return false;
}

static bool CheckPrologueAt(void* TargetPtr, const uint8_t* Expected, size_t Length, const char* Name)
{
    if (!TargetPtr || !Expected || Length == 0 || !Name)
    {
        return false;
    }
    if (memcmp(TargetPtr, Expected, Length) == 0)
    {
        return true;
    }
    char ExpectedHex[128] = {0};
    char ActualHex[128] = {0};
    BytesToHex(Expected, Length, ExpectedHex, sizeof(ExpectedHex));
    BytesToHex(reinterpret_cast<const uint8_t*>(TargetPtr), Length, ActualHex, sizeof(ActualHex));
    char Line[256] = {0};
    _snprintf_s(Line, sizeof(Line), _TRUNCATE,
                "%s prologue mismatch (exp: %s, got: %s) - skipping",
                Name, ExpectedHex, ActualHex);
    LOG("%s", Line);
    return false;
}

bool InstallDetourChecked(const char* Name, uint32_t Rva, size_t Length, const uint8_t* Expected,
                          void* Hook, void** OriginalOut)
{
    if (!CheckPrologue(Rva, Expected, Length, Name))
    {
        return false;
    }
    bool bOk = InstallDetour(Rva, Length, Hook, OriginalOut);
    if (!bOk && Name)
    {
        LOG("%s detour install failed", Name);
    }
    return bOk;
}

bool InstallDetourCheckedRel32(const char* Name, uint32_t Rva, size_t Length, const uint8_t* Expected,
                               void* Hook, void** OriginalOut, size_t RelOffset)
{
    if (!CheckPrologue(Rva, Expected, Length, Name))
    {
        return false;
    }
    bool bOk = InstallDetourRel32(Rva, Length, Hook, OriginalOut, RelOffset);
    if (!bOk && Name)
    {
        LOG("%s detour install failed", Name);
    }
    return bOk;
}

bool InstallDetourCheckedAt(const char* Name, void* TargetPtr, size_t Length, const uint8_t* Expected,
                            void* Hook, void** OriginalOut)
{
    if (!CheckPrologueAt(TargetPtr, Expected, Length, Name))
    {
        return false;
    }
    bool bOk = InstallDetourAt(TargetPtr, Length, Hook, OriginalOut, Name);
    if (!bOk && Name)
    {
        LOG("%s detour install failed", Name);
    }
    return bOk;
}

bool PatchIat(HMODULE Module, const char* DllName, const char* FuncName, void* NewFunc, void** OriginalOut)
{
    if (!Module || !DllName || !FuncName || !NewFunc)
    {
        return false;
    }
    uint8_t* Base = reinterpret_cast<uint8_t*>(Module);
    auto* Dos = reinterpret_cast<PIMAGE_DOS_HEADER>(Base);
    if (Dos->e_magic != IMAGE_DOS_SIGNATURE)
    {
        return false;
    }
    auto* Nt = reinterpret_cast<PIMAGE_NT_HEADERS>(Base + Dos->e_lfanew);
    if (Nt->Signature != IMAGE_NT_SIGNATURE)
    {
        return false;
    }
    auto& Dir = Nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
    if (!Dir.VirtualAddress)
    {
        return false;
    }
    auto* ImportDesc = reinterpret_cast<PIMAGE_IMPORT_DESCRIPTOR>(Base + Dir.VirtualAddress);
    for (; ImportDesc->Name; ++ImportDesc)
    {
        const char* ImportName = reinterpret_cast<const char*>(Base + ImportDesc->Name);
        if (_stricmp(ImportName, DllName) != 0)
        {
            continue;
        }
        auto* Thunk = reinterpret_cast<PIMAGE_THUNK_DATA>(Base + ImportDesc->FirstThunk);
        auto* OriginalThunk = ImportDesc->OriginalFirstThunk
            ? reinterpret_cast<PIMAGE_THUNK_DATA>(Base + ImportDesc->OriginalFirstThunk)
            : Thunk;
        for (; OriginalThunk->u1.AddressOfData; ++OriginalThunk, ++Thunk)
        {
            if (OriginalThunk->u1.Ordinal & IMAGE_ORDINAL_FLAG)
            {
                continue;
            }
            auto* ImportByName = reinterpret_cast<PIMAGE_IMPORT_BY_NAME>(Base + OriginalThunk->u1.AddressOfData);
            if (strcmp(reinterpret_cast<const char*>(ImportByName->Name), FuncName) != 0)
            {
                continue;
            }
            DWORD OldProt = 0;
            if (!VirtualProtect(&Thunk->u1.Function, sizeof(void*), PAGE_READWRITE, &OldProt))
            {
                return false;
            }
            if (OriginalOut && *OriginalOut == nullptr)
            {
                *OriginalOut = reinterpret_cast<void*>(static_cast<uintptr_t>(Thunk->u1.Function));
            }
            Thunk->u1.Function = reinterpret_cast<uintptr_t>(NewFunc);
            VirtualProtect(&Thunk->u1.Function, sizeof(void*), OldProt, &OldProt);
            FlushInstructionCache(GetCurrentProcess(), &Thunk->u1.Function, sizeof(void*));
            return true;
        }
    }
    return false;
}
