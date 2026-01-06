/** Item override hooks (CShell.dll). */
#include "HookItemOverrides.h"
#include "HookLogging.h"
#include "HookState.h"
#include "HookItemTemplateDump.h"
#include <atomic>

namespace
{
// CShell.dll RVAs (base 0x10000000 in IDA).
constexpr uint32_t kRva_ItemEntryWithId_read = 0x002550A0;
constexpr uint32_t kRva_ItemStatEntry_Read = 0x00249E10;
constexpr uint32_t kRva_ItemBaseStatTable_Init = 0x0024E700;
constexpr uint32_t kRva_ItemBaseStatTable = 0x002E0E90;
constexpr uint32_t kRva_ItemAddArmorBaseStats = 0x00239710;
constexpr uint32_t kRva_ItemStatList_AddOrAccumulate = 0x00239640;
constexpr uint32_t kItemBaseStatCount = 411;
constexpr uint32_t kItemBaseStatEntrySize = 8;

struct ItemStatEntry
{
    uint32_t StatId;
    uint8_t Type;
    uint8_t Pad5[3];
    uint32_t Value;
    uint8_t Level;
    uint8_t Pct13;
    uint8_t Pct14;
    uint8_t Pad15;
};

static_assert(sizeof(ItemStatEntry) == 0x10, "ItemStatEntry size mismatch");

struct StatOverride
{
    bool HasValue = false;
    int32_t Value = 0;
    bool HasType = false;
    int32_t Type = 0;
    bool HasLevel = false;
    int32_t Level = 0;
    bool HasPct13 = false;
    int32_t Pct13 = 0;
    bool HasPct14 = false;
    int32_t Pct14 = 0;
};

using StatOverrideMap = std::unordered_map<uint32_t, StatOverride>;
static std::unordered_map<uint16_t, StatOverrideMap> GStatOverrides;
static bool GOverridesLoaded = false;

static thread_local uint16_t GTlsItemId = 0;
static thread_local ItemStatEntry* GTlsPendingStat = nullptr;

using ItemEntryWithIdReadFn = bool(__thiscall*)(void* ThisPtr, unsigned int* BitStream);
using ItemStatEntryReadFn = bool(__thiscall*)(void* ThisPtr, unsigned int* BitStream);
using ItemBaseStatInitFn = void(__cdecl*)();
using ItemAddArmorBaseStatsFn = char(__stdcall*)(int ItemId, void* StatList);
using ItemStatListAddFn = int(__thiscall*)(void* StatList, int StatId, int Value);

static ItemEntryWithIdReadFn ItemEntryWithIdRead_Orig = nullptr;
static ItemStatEntryReadFn ItemStatEntryRead_Orig = nullptr;
static ItemBaseStatInitFn ItemBaseStatInit_Orig = nullptr;
static ItemAddArmorBaseStatsFn ItemAddArmorBaseStats_Orig = nullptr;
static ItemStatListAddFn ItemStatListAdd_Orig = nullptr;

static std::atomic<bool> GItemHooksInstalled{false};
static uint8_t* GCShellBase = nullptr;

static HMODULE GetCShellModule()
{
    return GetModuleHandleA("CShell.dll");
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

static bool InstallDetourCheckedAt(const char* Name, void* TargetPtr, size_t Length, const uint8_t* Expected,
                                   void* Hook, void** OriginalOut)
{
    if (!CheckPrologueAt(TargetPtr, Expected, Length, Name))
    {
        return false;
    }
    bool bOk = InstallDetourAt(TargetPtr, Length, Hook, OriginalOut, Name);
    if (bOk && Name)
    {
        char Line[128] = {0};
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "%s detour installed", Name);
        LOG("%s", Line);
    }
    return bOk;
}

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

static bool ParseInt(const char* Text, int32_t* OutValue)
{
    if (!Text || !Text[0] || !OutValue)
    {
        return false;
    }
    char* End = nullptr;
    long Value = strtol(Text, &End, 0);
    if (End == Text)
    {
        return false;
    }
    *OutValue = static_cast<int32_t>(Value);
    return true;
}

static void LoadStatOverridesCsv(const char* Path)
{
    GStatOverrides.clear();
    if (!Path || !Path[0])
    {
        return;
    }
    FILE* File = nullptr;
    fopen_s(&File, Path, "rb");
    if (!File)
    {
        LOG("[Items] override file missing: %s", Path);
        return;
    }
    char Line[512] = {0};
    while (fgets(Line, sizeof(Line), File))
    {
        if (Line[0] == '#' || Line[0] == '\n' || Line[0] == '\r')
        {
            continue;
        }
        char* Fields[7] = {0};
        int Count = 0;
        char* Cur = Line;
        while (Cur && Count < 7)
        {
            char* Comma = strchr(Cur, ',');
            if (Comma)
            {
                *Comma = '\0';
            }
            Fields[Count++] = Cur;
            Cur = Comma ? (Comma + 1) : nullptr;
        }
        if (Count < 3)
        {
            continue;
        }
        int32_t ItemId = 0;
        int32_t StatId = 0;
        int32_t Value = 0;
        if (!ParseInt(Fields[0], &ItemId) || !ParseInt(Fields[1], &StatId) || !ParseInt(Fields[2], &Value))
        {
            continue;
        }
        StatOverride Override{};
        Override.HasValue = true;
        Override.Value = Value;
        int32_t Tmp = 0;
        if (Count > 3 && ParseInt(Fields[3], &Tmp))
        {
            Override.HasType = true;
            Override.Type = Tmp;
        }
        if (Count > 4 && ParseInt(Fields[4], &Tmp))
        {
            Override.HasLevel = true;
            Override.Level = Tmp;
        }
        if (Count > 5 && ParseInt(Fields[5], &Tmp))
        {
            Override.HasPct13 = true;
            Override.Pct13 = Tmp;
        }
        if (Count > 6 && ParseInt(Fields[6], &Tmp))
        {
            Override.HasPct14 = true;
            Override.Pct14 = Tmp;
        }
        GStatOverrides[static_cast<uint16_t>(ItemId)][static_cast<uint32_t>(StatId)] = Override;
    }
    fclose(File);
    LOG("[Items] loaded %zu item override groups from %s", GStatOverrides.size(), Path);
}

static void LoadOverridesIfNeeded()
{
    if (GOverridesLoaded)
    {
        return;
    }
    char Resolved[MAX_PATH] = {0};
    ResolvePath(GConfig.ItemOverridesPath, Resolved, sizeof(Resolved));
    LoadStatOverridesCsv(Resolved);
    GOverridesLoaded = true;
}

static uint16_t ReadItemIdFromEntry(const void* ItemEntryWithId)
{
    if (!ItemEntryWithId)
    {
        return 0;
    }
    const uint8_t* Base = reinterpret_cast<const uint8_t*>(ItemEntryWithId);
    return *reinterpret_cast<const uint16_t*>(Base + 8);
}

static void ApplyOverrideToStat(uint16_t ItemId, ItemStatEntry* Entry)
{
    if (!Entry || !ItemId)
    {
        return;
    }
    auto ItemIt = GStatOverrides.find(ItemId);
    if (ItemIt == GStatOverrides.end())
    {
        return;
    }
    auto StatIt = ItemIt->second.find(Entry->StatId);
    if (StatIt == ItemIt->second.end())
    {
        return;
    }
    const StatOverride& Override = StatIt->second;
    if (Override.HasType)
    {
        Entry->Type = static_cast<uint8_t>(Override.Type);
    }
    if (Override.HasValue)
    {
        Entry->Value = static_cast<uint32_t>(Override.Value);
    }
    if (Override.HasLevel)
    {
        Entry->Level = static_cast<uint8_t>(Override.Level);
    }
    if (Override.HasPct13)
    {
        Entry->Pct13 = static_cast<uint8_t>(Override.Pct13);
    }
    if (Override.HasPct14)
    {
        Entry->Pct14 = static_cast<uint8_t>(Override.Pct14);
    }
}

static void ApplyArmorOverrides(int ItemId, void* StatList)
{
    if (!StatList)
    {
        return;
    }
    auto ItemIt = GStatOverrides.find(static_cast<uint16_t>(ItemId));
    if (ItemIt == GStatOverrides.end())
    {
        return;
    }
    uint8_t** List = reinterpret_cast<uint8_t**>(StatList);
    uint8_t* Begin = List[1];
    uint8_t* End = List[2];
    for (const auto& Pair : ItemIt->second)
    {
        const uint32_t StatId = Pair.first;
        const StatOverride& Override = Pair.second;
        if (!Override.HasValue)
        {
            continue;
        }
        bool Found = false;
        if (Begin && End && Begin < End)
        {
            for (uint8_t* Ptr = Begin; Ptr < End; Ptr += 8)
            {
                if (Ptr[0] == static_cast<uint8_t>(StatId))
                {
                    *reinterpret_cast<int32_t*>(Ptr + 4) = static_cast<int32_t>(Override.Value);
                    Found = true;
                    break;
                }
            }
        }
        if (!Found && ItemStatListAdd_Orig)
        {
            ItemStatListAdd_Orig(StatList, static_cast<int>(StatId), static_cast<int>(Override.Value));
        }
    }
}

static void ApplyBaseTableOverrides(uint8_t* ModuleBase)
{
    if (!ModuleBase || GStatOverrides.empty())
    {
        return;
    }
    uint8_t* Table = ModuleBase + kRva_ItemBaseStatTable;
    DWORD OldProt = 0;
    if (!VirtualProtect(Table, kItemBaseStatCount * kItemBaseStatEntrySize, PAGE_EXECUTE_READWRITE, &OldProt))
    {
        LOG("[Items] base table VirtualProtect failed");
        return;
    }
    size_t Patched = 0;
    for (uint32_t Index = 0; Index < kItemBaseStatCount; ++Index)
    {
        uint8_t* Entry = Table + Index * kItemBaseStatEntrySize;
        uint16_t ItemId = *reinterpret_cast<uint16_t*>(Entry);
        uint8_t StatId = *(Entry + 2);
        auto ItemIt = GStatOverrides.find(ItemId);
        if (ItemIt == GStatOverrides.end())
        {
            continue;
        }
        auto StatIt = ItemIt->second.find(static_cast<uint32_t>(StatId));
        if (StatIt == ItemIt->second.end())
        {
            continue;
        }
        const StatOverride& Override = StatIt->second;
        if (Override.HasValue)
        {
            *reinterpret_cast<uint32_t*>(Entry + 4) = static_cast<uint32_t>(Override.Value);
            ++Patched;
        }
        if (Override.HasType)
        {
            *(Entry + 2) = static_cast<uint8_t>(Override.Type);
        }
    }
    VirtualProtect(Table, kItemBaseStatCount * kItemBaseStatEntrySize, OldProt, &OldProt);
    LOG("[Items] base table overrides applied: %zu entries", Patched);
}

static bool __fastcall HookItemEntryWithIdRead(void* ThisPtr, void* Edx, unsigned int* BitStream)
{
    (void)Edx;
    bool Result = ItemEntryWithIdRead_Orig ? ItemEntryWithIdRead_Orig(ThisPtr, BitStream) : false;
    const uint16_t ItemId = ReadItemIdFromEntry(ThisPtr);
    GTlsItemId = ItemId;
    OnItemEntryRead(ThisPtr);
    if (GTlsPendingStat)
    {
        ApplyOverrideToStat(ItemId, GTlsPendingStat);
        GTlsPendingStat = nullptr;
    }
    return Result;
}

static bool __fastcall HookItemStatEntryRead(void* ThisPtr, void* Edx, unsigned int* BitStream)
{
    (void)Edx;
    bool Result = ItemStatEntryRead_Orig ? ItemStatEntryRead_Orig(ThisPtr, BitStream) : false;
    ItemStatEntry* Entry = reinterpret_cast<ItemStatEntry*>(ThisPtr);
    if (GTlsItemId)
    {
        ApplyOverrideToStat(GTlsItemId, Entry);
        return Result;
    }
    GTlsPendingStat = Entry;
    return Result;
}

static char __stdcall HookItemAddArmorBaseStats(int ItemId, void* StatList)
{
    char Result = ItemAddArmorBaseStats_Orig ? ItemAddArmorBaseStats_Orig(ItemId, StatList) : 0;
    if (!GConfig.bItemOverrideBase)
    {
        return Result;
    }
    LoadOverridesIfNeeded();
    ApplyArmorOverrides(ItemId, StatList);
    return Result;
}

static void __cdecl HookItemBaseStatInit()
{
    if (GConfig.bItemOverrideBase && GCShellBase)
    {
        ApplyBaseTableOverrides(GCShellBase);
    }
    if (ItemBaseStatInit_Orig)
    {
        ItemBaseStatInit_Orig();
    }
}

static void InstallItemDetours(HMODULE CShell)
{
    if (!CShell)
    {
        return;
    }
    uint8_t* Base = reinterpret_cast<uint8_t*>(CShell);
    GCShellBase = Base;

    if (GConfig.bItemOverrideRuntime || GConfig.bItemTemplateDump)
    {
        const uint8_t kPrologueStd[8] = {0x55, 0x8B, 0xEC, 0x56, 0x57, 0x8B, 0x7D, 0x08};
        void* ItemEntryTarget = Base + kRva_ItemEntryWithId_read;
        void* ItemStatTarget = Base + kRva_ItemStatEntry_Read;

        InstallDetourCheckedAt("ItemEntryWithId_read", ItemEntryTarget, sizeof(kPrologueStd), kPrologueStd,
                               reinterpret_cast<void*>(&HookItemEntryWithIdRead),
                               reinterpret_cast<void**>(&ItemEntryWithIdRead_Orig));
        InstallDetourCheckedAt("ItemStatEntry_ReadFromBitStream", ItemStatTarget, sizeof(kPrologueStd), kPrologueStd,
                               reinterpret_cast<void*>(&HookItemStatEntryRead),
                               reinterpret_cast<void**>(&ItemStatEntryRead_Orig));
    }

    if (GConfig.bItemOverrideBase)
    {
        const uint8_t kPrologueBase[7] = {0x80, 0x3D, 0x70, 0x72, 0x3D, 0x10, 0x00};
        void* BaseInitTarget = Base + kRva_ItemBaseStatTable_Init;
        InstallDetourCheckedAt("ItemBaseStatTable_Init", BaseInitTarget, sizeof(kPrologueBase), kPrologueBase,
                               reinterpret_cast<void*>(&HookItemBaseStatInit),
                               reinterpret_cast<void**>(&ItemBaseStatInit_Orig));
        ApplyBaseTableOverrides(Base);
        uint8_t* Guard = Base + 0x003D7270;
        if (*Guard && ItemBaseStatInit_Orig)
        {
            *Guard = 0;
            ItemBaseStatInit_Orig();
        }

        const uint8_t kArmorPrologue[8] = {0x55, 0x8B, 0xEC, 0x8B, 0x55, 0x08, 0x57, 0x52};
        void* ArmorTarget = Base + kRva_ItemAddArmorBaseStats;
        ItemStatListAdd_Orig = reinterpret_cast<ItemStatListAddFn>(Base + kRva_ItemStatList_AddOrAccumulate);
        InstallDetourCheckedAt("Item_AddArmorBaseStats", ArmorTarget, sizeof(kArmorPrologue), kArmorPrologue,
                               reinterpret_cast<void*>(&HookItemAddArmorBaseStats),
                               reinterpret_cast<void**>(&ItemAddArmorBaseStats_Orig));
    }

    if (GConfig.bItemTemplateDump)
    {
        EnsureStaticItemTemplateDump(Base);
    }
}

static DWORD WINAPI ItemHookRescanThread(LPVOID)
{
    DWORD DelayMs = GConfig.RescanMs ? GConfig.RescanMs : 5000;
    for (;;)
    {
        if (GItemHooksInstalled.load())
        {
            return 0;
        }
        HMODULE CShell = GetCShellModule();
        if (CShell)
        {
            LoadOverridesIfNeeded();
            InstallItemDetours(CShell);
            GItemHooksInstalled.store(true);
            return 0;
        }
        Sleep(DelayMs);
    }
}
} // namespace

void EnsureItemOverrideHooks()
{
    if (!GConfig.bItemOverrides && !GConfig.bItemTemplateDump)
    {
        LOG("[Items] item hooks disabled");
        return;
    }
    if (GItemHooksInstalled.load())
    {
        return;
    }
    HMODULE CShell = GetCShellModule();
    if (!CShell)
    {
        LOG("[Items] CShell.dll not loaded yet; deferring hooks");
        CreateThread(nullptr, 0, ItemHookRescanThread, nullptr, 0, nullptr);
        return;
    }
    LoadOverridesIfNeeded();
    InstallItemDetours(CShell);
    GItemHooksInstalled.store(true);
}
