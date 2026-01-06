/** Shared memory hooks (CShell.dll). */
#include "HookSharedMem.h"
#include "HookDetours.h"
#include "HookState.h"
#include <atomic>

namespace
{
// CShell.dll RVAs (base 0x10000000 in IDA).
constexpr uint32_t kRva_SharedMem_GetPtr = 0x00007FA0;
constexpr uint32_t kRva_SharedMem_ReadBlock = 0x00008030;
constexpr uint32_t kRva_SharedMem_WriteBlock = 0x00008920;
constexpr uint32_t kRva_SharedMem_WriteStringStd = 0x00008A00;
constexpr uint32_t kRva_SharedMem_WriteBlockStd = 0x00008A70;

using SharedMemWriteStringFn = unsigned int(__stdcall*)(int FieldId, char* Source);
using SharedMemWriteBlockFn = unsigned int(__stdcall*)(int FieldId, void* Source, size_t Size);
using SharedMemWriteBlockThisFn = long(__thiscall*)(void* ThisPtr, unsigned int FieldId, void* Source, size_t Size);
using SharedMemGetPtrFn = char* (__thiscall*)(void* ThisPtr, unsigned int FieldId);
using SharedMemReadBlockFn = int(__thiscall*)(void* ThisPtr, unsigned int FieldId, void* Dest, size_t Size);

static SharedMemWriteStringFn SharedMemWriteString_Orig = nullptr;
static SharedMemWriteBlockFn SharedMemWriteBlock_Orig = nullptr;
static SharedMemWriteBlockThisFn SharedMemWriteBlockThis_Orig = nullptr;
static SharedMemGetPtrFn SharedMemGetPtr_Orig = nullptr;
static SharedMemReadBlockFn SharedMemReadBlock_Orig = nullptr;

static std::atomic<bool> GSharedMemHooksInstalled{false};

static HMODULE GetCShellModule()
{
    return GetModuleHandleA("CShell.dll");
}

static unsigned int __stdcall HookSharedMemWriteString(int FieldId, char* Source)
{
    return SharedMemWriteString_Orig ? SharedMemWriteString_Orig(FieldId, Source) : 0u;
}

static unsigned int __stdcall HookSharedMemWriteBlock(int FieldId, void* Source, size_t Size)
{
    return SharedMemWriteBlock_Orig ? SharedMemWriteBlock_Orig(FieldId, Source, Size) : 0u;
}

static long __fastcall HookSharedMemWriteBlockThis(void* ThisPtr, void* Edx, unsigned int FieldId,
                                                  void* Source, size_t Size)
{
    (void)Edx;
    return SharedMemWriteBlockThis_Orig ? SharedMemWriteBlockThis_Orig(ThisPtr, FieldId, Source, Size) : 0;
}

static char* __fastcall HookSharedMemGetPtr(void* ThisPtr, void* Edx, unsigned int FieldId)
{
    (void)Edx;
    return SharedMemGetPtr_Orig ? SharedMemGetPtr_Orig(ThisPtr, FieldId) : nullptr;
}

static int __fastcall HookSharedMemReadBlock(void* ThisPtr, void* Edx, unsigned int FieldId, void* Dest, size_t Size)
{
    (void)Edx;
    return SharedMemReadBlock_Orig ? SharedMemReadBlock_Orig(ThisPtr, FieldId, Dest, Size) : 0;
}

static void InstallSharedMemDetours(HMODULE CShell)
{
    if (!CShell)
    {
        return;
    }
    uint8_t* Base = reinterpret_cast<uint8_t*>(CShell);
    void* WriteStringTarget = Base + kRva_SharedMem_WriteStringStd;
    void* WriteBlockTarget = Base + kRva_SharedMem_WriteBlockStd;
    void* WriteBlockThisTarget = Base + kRva_SharedMem_WriteBlock;
    void* GetPtrTarget = Base + kRva_SharedMem_GetPtr;
    void* ReadBlockTarget = Base + kRva_SharedMem_ReadBlock;

    // Prologue lengths are instruction-aligned based on CShell.dll prologues.
    constexpr size_t kLen_WriteString = 5; // push ebp; mov ebp,esp; push ebx; push esi
    constexpr size_t kLen_WriteBlock = 7;  // ... push ebx; mov ebx,[ebp+8]
    constexpr size_t kLen_WriteBlockThis = 5; // push ebp; mov ebp,esp; push esi; push edi
    constexpr size_t kLen_GetPtr = 5;      // push ebp; mov ebp,esp; push esi; push edi
    constexpr size_t kLen_ReadBlock = 5;   // push ebp; mov ebp,esp; push esi; push edi

    InstallDetourAt(WriteStringTarget, kLen_WriteString, reinterpret_cast<void*>(&HookSharedMemWriteString),
                    reinterpret_cast<void**>(&SharedMemWriteString_Orig), "SharedMem_WriteString_std");
    InstallDetourAt(WriteBlockTarget, kLen_WriteBlock, reinterpret_cast<void*>(&HookSharedMemWriteBlock),
                    reinterpret_cast<void**>(&SharedMemWriteBlock_Orig), "SharedMem_WriteBlock_std");
    InstallDetourAt(WriteBlockThisTarget, kLen_WriteBlockThis, reinterpret_cast<void*>(&HookSharedMemWriteBlockThis),
                    reinterpret_cast<void**>(&SharedMemWriteBlockThis_Orig), "SharedMem_WriteBlock");
    InstallDetourAt(GetPtrTarget, kLen_GetPtr, reinterpret_cast<void*>(&HookSharedMemGetPtr),
                    reinterpret_cast<void**>(&SharedMemGetPtr_Orig), "SharedMem_GetPtr");
    InstallDetourAt(ReadBlockTarget, kLen_ReadBlock, reinterpret_cast<void*>(&HookSharedMemReadBlock),
                    reinterpret_cast<void**>(&SharedMemReadBlock_Orig), "SharedMem_ReadBlock");
}

static DWORD WINAPI SharedMemHookRescanThread(LPVOID)
{
    DWORD DelayMs = GConfig.RescanMs ? GConfig.RescanMs : 5000;
    for (;;)
    {
        if (GSharedMemHooksInstalled.load())
        {
            return 0;
        }
        HMODULE CShell = GetCShellModule();
        if (CShell)
        {
            InstallSharedMemDetours(CShell);
            GSharedMemHooksInstalled.store(true);
            return 0;
        }
        Sleep(DelayMs);
    }
}
} // namespace

void EnsureSharedMemHooks()
{
    if (GSharedMemHooksInstalled.load())
    {
        return;
    }
    HMODULE CShell = GetCShellModule();
    if (!CShell)
    {
        CreateThread(nullptr, 0, SharedMemHookRescanThread, nullptr, 0, nullptr);
        return;
    }
    InstallSharedMemDetours(CShell);
    GSharedMemHooksInstalled.store(true);
}
