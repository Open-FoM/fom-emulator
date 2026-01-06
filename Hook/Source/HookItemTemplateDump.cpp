/** Item template dump helpers (CShell.dll). */
#include "HookItemTemplateDump.h"
#include "HookLogging.h"
#include "HookState.h"

#include <cstdio>
#include <cstring>
#include <mutex>
#include <unordered_set>

namespace
{
std::mutex GDumpMutex;
std::unordered_set<uint16_t> GDumpedItems;
FILE* GDumpFile = nullptr;
bool GHeaderWritten = false;
std::atomic<bool> GStaticDumpStarted{false};

constexpr uint32_t kRva_ItemTablePtr = 0x003C3FAC; // unk_103C3FAC
constexpr uint32_t kVtableIndex_A = 16; // +0x40
constexpr uint32_t kVtableIndex_B = 22; // +0x58
constexpr uint32_t kMaxItemScan = 5000;

static void ResolvePath(const char* InPath, char* OutPath, size_t OutSize)
{
    if (!InPath || !InPath[0])
    {
        return;
    }
    const bool IsAbs = ((InPath[1] == ':' && (InPath[2] == '\\' || InPath[2] == '/')) ||
                        (InPath[0] == '\\' && InPath[1] == '\\'));
    if (IsAbs)
    {
        lstrcpynA(OutPath, InPath, static_cast<int>(OutSize));
        return;
    }
    char ModulePath[MAX_PATH] = {0};
    HMODULE SelfModule = reinterpret_cast<HMODULE>(&__ImageBase);
    DWORD Length = GetModuleFileNameA(SelfModule, ModulePath, MAX_PATH);
    if (Length > 0 && Length < MAX_PATH)
    {
        char* Slash = strrchr(ModulePath, '\\');
        if (Slash)
        {
            Slash[1] = '\0';
        }
        _snprintf_s(OutPath, OutSize, _TRUNCATE, "%s%s", ModulePath, InPath);
    }
    else
    {
        lstrcpynA(OutPath, InPath, static_cast<int>(OutSize));
    }
}

static uint16_t ReadU16(const uint8_t* Ptr)
{
    uint16_t Value = 0;
    memcpy(&Value, Ptr, sizeof(Value));
    return Value;
}

static uint32_t ReadU32(const uint8_t* Ptr)
{
    uint32_t Value = 0;
    memcpy(&Value, Ptr, sizeof(Value));
    return Value;
}

static FILE* OpenDumpFile()
{
    if (GDumpFile)
    {
        return GDumpFile;
    }
    char Resolved[MAX_PATH] = {0};
    ResolvePath(GConfig.ItemTemplateDumpPath, Resolved, sizeof(Resolved));
    if (!Resolved[0])
    {
        return nullptr;
    }
    FILE* File = nullptr;
    fopen_s(&File, Resolved, "ab+");
    if (!File)
    {
        LOG("[Items] template dump open failed: %s", Resolved);
        return nullptr;
    }
    fseek(File, 0, SEEK_END);
    long Size = ftell(File);
    if (Size <= 0 && !GHeaderWritten)
    {
        fprintf(File,
                "entry_id,item_id,u16_00,u16_02,u16_06,u8_08,u8_09,u8_0A,u8_0B,u32_0C,u32_10,u32_14,"
                "u8_18,u8_19,u8_1A,u8_1B,u8_1C,u8_1D,u8_1E,u8_1F\n");
        fflush(File);
        GHeaderWritten = true;
    }
    GDumpFile = File;
    LOG("[Items] template dump path: %s", Resolved);
    return File;
}

static bool IsReadablePointer(const void* Ptr, size_t Size)
{
    if (!Ptr || Size == 0)
    {
        return false;
    }
    MEMORY_BASIC_INFORMATION Info{};
    if (!VirtualQuery(Ptr, &Info, sizeof(Info)))
    {
        return false;
    }
    if (Info.State != MEM_COMMIT)
    {
        return false;
    }
    const DWORD Protect = Info.Protect & 0xff;
    const bool Readable = (Protect == PAGE_READONLY || Protect == PAGE_READWRITE ||
                           Protect == PAGE_EXECUTE_READ || Protect == PAGE_EXECUTE_READWRITE);
    if (!Readable)
    {
        return false;
    }
    const uintptr_t Start = reinterpret_cast<uintptr_t>(Info.BaseAddress);
    const uintptr_t End = Start + Info.RegionSize;
    const uintptr_t P = reinterpret_cast<uintptr_t>(Ptr);
    return (P >= Start && (P + Size) <= End);
}

static bool IsPlausibleItemId(uint16_t ItemId)
{
    return ItemId > 0 && ItemId < 10000;
}

static bool IsValidItemEntryPtr(void* ItemPtr)
{
    if (!ItemPtr || !IsReadablePointer(ItemPtr, 12))
    {
        return false;
    }
    const uint8_t* Base = reinterpret_cast<const uint8_t*>(ItemPtr);
    const uint16_t ItemId = ReadU16(Base + 8);
    return IsPlausibleItemId(ItemId);
}

static int TryGetCount(void* Table, void* Fn)
{
    if (!Table || !Fn)
    {
        return -1;
    }
    using GetCountFn = int(__thiscall*)(void*);
    __try
    {
        return reinterpret_cast<GetCountFn>(Fn)(Table);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return -1;
    }
}

static void* TryGetByIndex(void* Table, void* Fn, int Index)
{
    if (!Table || !Fn)
    {
        return nullptr;
    }
    using GetByIndexFn = void*(__thiscall*)(void*, int);
    __try
    {
        return reinterpret_cast<GetByIndexFn>(Fn)(Table, Index);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return nullptr;
    }
}

static bool IsPlausibleCount(int Count)
{
    return Count > 0 && Count < 10000;
}

static bool LooksLikeEntrySequence(uint8_t* Base, size_t Stride)
{
    if (!Base || Stride < 12)
    {
        return false;
    }
    int Ok = 0;
    for (int i = 0; i < 8; ++i)
    {
        uint8_t* Ptr = Base + i * Stride;
        if (!IsReadablePointer(Ptr, 12))
        {
            return false;
        }
        uint16_t ItemId = ReadU16(Ptr + 8);
        if (IsPlausibleItemId(ItemId))
        {
            ++Ok;
        }
    }
    return Ok >= 6;
}

static void DumpFromEntryArray(uint8_t* Base, size_t Stride)
{
    for (uint32_t i = 0; i < kMaxItemScan; ++i)
    {
        uint8_t* Ptr = Base + i * Stride;
        if (!IsReadablePointer(Ptr, 12))
        {
            break;
        }
        uint16_t ItemId = ReadU16(Ptr + 8);
        if (!IsPlausibleItemId(ItemId))
        {
            if (i > 100)
            {
                break;
            }
            continue;
        }
        OnItemEntryRead(Ptr);
    }
}

static bool LooksLikePointerArray(uint8_t* Base)
{
    if (!Base || !IsReadablePointer(Base, 12))
    {
        return false;
    }
    void* Ptr = nullptr;
    memcpy(&Ptr, Base, sizeof(void*));
    return IsValidItemEntryPtr(Ptr);
}

static void DumpFromPointerArray(uint8_t* Base)
{
    for (uint32_t i = 0; i < kMaxItemScan; ++i)
    {
        void* Ptr = nullptr;
        if (!IsReadablePointer(Base + i * sizeof(void*), sizeof(void*)))
        {
            break;
        }
        memcpy(&Ptr, Base + i * sizeof(void*), sizeof(void*));
        if (!Ptr)
        {
            if (i > 100)
            {
                break;
            }
            continue;
        }
        if (!IsValidItemEntryPtr(Ptr))
        {
            continue;
        }
        OnItemEntryRead(Ptr);
    }
}

static void DumpFromItemTable(uint8_t* CShellBase)
{
    if (!CShellBase)
    {
        return;
    }
    static int LogEvery = 0;
    uint8_t* TablePtrAddr = CShellBase + kRva_ItemTablePtr;
    if (!IsReadablePointer(TablePtrAddr, sizeof(void*)))
    {
        return;
    }
    void* Table = *reinterpret_cast<void**>(TablePtrAddr);
    if (!Table)
    {
        return;
    }
    void** Vtable = *reinterpret_cast<void***>(Table);
    if (!Vtable || !IsReadablePointer(Vtable, (kVtableIndex_B + 1) * sizeof(void*)))
    {
        if ((LogEvery++ % 10) == 0)
        {
            LOG("[Items] item table vtable unreadable (table=0x%p, vtbl=0x%p)", Table, Vtable);
        }
        // Fallback: try as raw entry array or pointer array.
        uint8_t* Base = reinterpret_cast<uint8_t*>(Table);
        if (LooksLikeEntrySequence(Base, 0x24))
        {
            DumpFromEntryArray(Base, 0x24);
            return;
        }
        if (LooksLikeEntrySequence(Base, 0x28))
        {
            DumpFromEntryArray(Base, 0x28);
            return;
        }
        if (LooksLikePointerArray(Base))
        {
            DumpFromPointerArray(Base);
            return;
        }
        return;
    }

    void* FnA = Vtable[kVtableIndex_A];
    void* FnB = Vtable[kVtableIndex_B];

    int CountA = TryGetCount(Table, FnA);
    int CountB = TryGetCount(Table, FnB);

    void* GetCountFn = nullptr;
    void* GetByIndexFn = nullptr;

    if (IsPlausibleCount(CountA))
    {
        void* First = TryGetByIndex(Table, FnB, 0);
        if (IsValidItemEntryPtr(First))
        {
            GetCountFn = FnA;
            GetByIndexFn = FnB;
        }
    }
    if (!GetCountFn && IsPlausibleCount(CountB))
    {
        void* First = TryGetByIndex(Table, FnA, 0);
        if (IsValidItemEntryPtr(First))
        {
            GetCountFn = FnB;
            GetByIndexFn = FnA;
        }
    }

    if (!GetCountFn || !GetByIndexFn)
    {
        LOG("[Items] item table methods not resolved (countA=%d, countB=%d)", CountA, CountB);
        return;
    }

    const int Count = TryGetCount(Table, GetCountFn);
    if (!IsPlausibleCount(Count))
    {
        LOG("[Items] item table count invalid: %d", Count);
        return;
    }

    for (int i = 0; i < Count; ++i)
    {
        void* ItemPtr = TryGetByIndex(Table, GetByIndexFn, i);
        if (!IsValidItemEntryPtr(ItemPtr))
        {
            continue;
        }
        OnItemEntryRead(ItemPtr);
    }
    LOG("[Items] template dump completed from item table, count=%d", Count);
}

static DWORD WINAPI StaticDumpThread(LPVOID Param)
{
    uint8_t* CShellBase = reinterpret_cast<uint8_t*>(Param);
    if (!CShellBase)
    {
        return 0;
    }
    for (int Attempts = 0; Attempts < 120; ++Attempts)
    {
        DumpFromItemTable(CShellBase);
        if (!GDumpedItems.empty())
        {
            return 0;
        }
        Sleep(1000);
    }
    LOG("[Items] template dump timed out waiting for item table");
    return 0;
}
} // namespace

void OnItemEntryRead(const void* ItemEntryWithId)
{
    if (!GConfig.bItemTemplateDump || !ItemEntryWithId)
    {
        return;
    }
    const uint8_t* Base = reinterpret_cast<const uint8_t*>(ItemEntryWithId);
    const uint32_t EntryId = ReadU32(Base + 0);
    const uint8_t* TemplatePtr = Base + 4;
    const uint16_t ItemId = ReadU16(TemplatePtr + 4);
    if (!ItemId)
    {
        return;
    }

    std::lock_guard<std::mutex> Lock(GDumpMutex);
    if (GDumpedItems.find(ItemId) != GDumpedItems.end())
    {
        return;
    }
    FILE* File = OpenDumpFile();
    if (!File)
    {
        return;
    }
    GDumpedItems.insert(ItemId);

    const uint16_t u16_00 = ReadU16(TemplatePtr + 0x00);
    const uint16_t u16_02 = ReadU16(TemplatePtr + 0x02);
    const uint16_t u16_06 = ReadU16(TemplatePtr + 0x06);
    const uint8_t u8_08 = TemplatePtr[0x08];
    const uint8_t u8_09 = TemplatePtr[0x09];
    const uint8_t u8_0A = TemplatePtr[0x0A];
    const uint8_t u8_0B = TemplatePtr[0x0B];
    const uint32_t u32_0C = ReadU32(TemplatePtr + 0x0C);
    const uint32_t u32_10 = ReadU32(TemplatePtr + 0x10);
    const uint32_t u32_14 = ReadU32(TemplatePtr + 0x14);
    const uint8_t u8_18 = TemplatePtr[0x18];
    const uint8_t u8_19 = TemplatePtr[0x19];
    const uint8_t u8_1A = TemplatePtr[0x1A];
    const uint8_t u8_1B = TemplatePtr[0x1B];
    const uint8_t u8_1C = TemplatePtr[0x1C];
    const uint8_t u8_1D = TemplatePtr[0x1D];
    const uint8_t u8_1E = TemplatePtr[0x1E];
    const uint8_t u8_1F = TemplatePtr[0x1F];

    fprintf(File,
            "%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
            EntryId,
            ItemId,
            u16_00,
            u16_02,
            u16_06,
            u8_08,
            u8_09,
            u8_0A,
            u8_0B,
            u32_0C,
            u32_10,
            u32_14,
            u8_18,
            u8_19,
            u8_1A,
            u8_1B,
            u8_1C,
            u8_1D,
            u8_1E,
            u8_1F);
    fflush(File);
}

void EnsureStaticItemTemplateDump(uint8_t* CShellBase)
{
    if (!GConfig.bItemTemplateDump || !CShellBase)
    {
        return;
    }
    if (GStaticDumpStarted.exchange(true))
    {
        return;
    }
    CreateThread(nullptr, 0, StaticDumpThread, CShellBase, 0, nullptr);
}
