/** Hook configuration loader implementation. */
#include "HookConfig.h"
#include "HookLogging.h"

namespace
{
bool IsAbsolutePath(const char* Path)
{
    return Path && ((Path[1] == ':' && (Path[2] == '\\' || Path[2] == '/')) ||
                    (Path[0] == '\\' && Path[1] == '\\'));
}

void CopyModuleDir(char* Out, size_t OutSize)
{
    if (!Out || OutSize == 0)
    {
        return;
    }
    Out[0] = '\0';
    char ModulePath[MAX_PATH] = {0};
    HMODULE SelfModule = reinterpret_cast<HMODULE>(&__ImageBase);
    DWORD Length = GetModuleFileNameA(SelfModule, ModulePath, MAX_PATH);
    if (Length == 0 || Length >= MAX_PATH)
    {
        return;
    }
    char* Slash = strrchr(ModulePath, '\\');
    if (!Slash)
    {
        return;
    }
    Slash[1] = '\0';
    lstrcpynA(Out, ModulePath, static_cast<int>(OutSize));
}

void ResolvePathRelativeTo(const char* InPath, const char* BaseDir, char* OutPath, size_t OutSize)
{
    if (!InPath || !InPath[0] || !OutPath || OutSize == 0)
    {
        return;
    }
    if (IsAbsolutePath(InPath) || !BaseDir || !BaseDir[0])
    {
        lstrcpynA(OutPath, InPath, static_cast<int>(OutSize));
        return;
    }
    _snprintf_s(OutPath, OutSize, _TRUNCATE, "%s%s", BaseDir, InPath);
}

int ClampConfigInt(const char* Name, int Value, int MinValue, int MaxValue)
{
    if (Value < MinValue)
    {
        LOG("[Config] %s=%d < %d, clamping", Name, Value, MinValue);
        return MinValue;
    }
    if (Value > MaxValue)
    {
        LOG("[Config] %s=%d > %d, clamping", Name, Value, MaxValue);
        return MaxValue;
    }
    return Value;
}
} // namespace

void LoadConfig()
{
    char ModuleDir[MAX_PATH] = {0};
    CopyModuleDir(ModuleDir, sizeof(ModuleDir));
    if (ModuleDir[0])
    {
        _snprintf_s(GConfig.IniPath, MAX_PATH, _TRUNCATE, "%sfom_hook.ini", ModuleDir);
    }
    else
    {
        lstrcpyA(GConfig.IniPath, "fom_hook.ini");
    }
    GConfig.bIniFound = GetFileAttributesA(GConfig.IniPath) != INVALID_FILE_ATTRIBUTES;

    const char* IniPath = GConfig.IniPath;
    GConfig.bLogRecv = GetPrivateProfileIntA("Logging", "LogRecv", 1, IniPath) != 0;
    GConfig.bLogSend = GetPrivateProfileIntA("Logging", "LogSend", 1, IniPath) != 0;
    GConfig.bLogHex = GetPrivateProfileIntA("Logging", "HexDump", 1, IniPath) != 0;
    GConfig.MaxDump = GetPrivateProfileIntA("Logging", "MaxDump", 4096, IniPath);
    GConfig.bLogBits = GetPrivateProfileIntA("Logging", "BitDump", 1, IniPath) != 0;
    GConfig.MaxBits = GetPrivateProfileIntA("Logging", "MaxBits", 0, IniPath);
    GConfig.BitsPerLine = GetPrivateProfileIntA("Logging", "BitsPerLine", 128, IniPath);
    GConfig.bLogBitsMsb = GetPrivateProfileIntA("Logging", "BitDumpMSB", 1, IniPath) != 0;
    GConfig.bSuppressRepeats = GetPrivateProfileIntA("Logging", "SuppressRepeats", 1, IniPath) != 0;
    GConfig.LogMinIntervalMs = GetPrivateProfileIntA("Logging", "MinIntervalMs", 0, IniPath);
    GConfig.LogRepeatSuppressMs = GetPrivateProfileIntA("Logging", "RepeatSuppressMs", 2000, IniPath);
    GConfig.bDecodeLogin6D = GetPrivateProfileIntA("Logging", "DecodeLogin6D", 1, IniPath) != 0;
    GConfig.LoginDumpBits = GetPrivateProfileIntA("Logging", "LoginDumpBits", 2048, IniPath);
    GConfig.RescanMs = GetPrivateProfileIntA("Hook", "RescanMs", 5000, IniPath);
    GConfig.bOverlay = GetPrivateProfileIntA("Overlay", "Enable", 1, IniPath) != 0;
    GConfig.bConsoleEnable = GetPrivateProfileIntA("Console", "Enable", 1, IniPath) != 0;
    GConfig.OverlayKey = GetPrivateProfileIntA("Overlay", "ToggleKey", VK_F1, IniPath);
    GConfig.LogToggleKey = GetPrivateProfileIntA("Logging", "ToggleKey", VK_F2, IniPath);
    GConfig.bWrapperHooks = GetPrivateProfileIntA("WrapperHooks", "Enable", 1, IniPath) != 0;
    GConfig.bLogEvents = GetPrivateProfileIntA("Events", "Log", 1, IniPath) != 0;
    GConfig.bPeekOnRead = GetPrivateProfileIntA("Events", "PeekOnRead", 1, IniPath) != 0;
    GConfig.bRakNetHooks = GetPrivateProfileIntA("RakNet", "Enable", 1, IniPath) != 0;
    GConfig.bDumpHuffmanTable = GetPrivateProfileIntA("Huffman", "DumpTable", 0, IniPath) != 0;
    GConfig.bItemOverrides = GetPrivateProfileIntA("Items", "Enable", 0, IniPath) != 0;
    GConfig.bItemOverrideBase = GetPrivateProfileIntA("Items", "OverrideBase", 0, IniPath) != 0;
    GConfig.bItemOverrideRuntime = GetPrivateProfileIntA("Items", "OverrideRuntime", 1, IniPath) != 0;
    GConfig.bItemTemplateDump = GetPrivateProfileIntA("Items", "TemplateDump", 0, IniPath) != 0;

    char LogPath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Logging", "LogPath", "", LogPath, MAX_PATH, IniPath);
    if (LogPath[0])
    {
        ResolvePathRelativeTo(LogPath, ModuleDir, GConfig.LogPath, MAX_PATH);
    }

    char HuffmanPath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Huffman", "TablePath", "..\\Server\\apps\\master\\huffman_table_runtime.json", HuffmanPath, MAX_PATH, IniPath);
    ResolvePathRelativeTo(HuffmanPath, ModuleDir, GConfig.HuffmanTablePath, MAX_PATH);

    char ItemPath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Items", "OverridesPath", "item_overrides.csv", ItemPath, MAX_PATH, IniPath);
    ResolvePathRelativeTo(ItemPath, ModuleDir, GConfig.ItemOverridesPath, MAX_PATH);

    char ItemTemplatePath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Items", "TemplateDumpPath", "..\\Docs\\Exports\\item_templates_raw.csv",
                             ItemTemplatePath, MAX_PATH, IniPath);
    ResolvePathRelativeTo(ItemTemplatePath, ModuleDir, GConfig.ItemTemplateDumpPath, MAX_PATH);
}

void ValidateConfig()
{
    if (!GConfig.bIniFound)
    {
        LOG("[Config] ini missing: %s (defaults active)", GConfig.IniPath);
    }
    GConfig.MaxDump = ClampConfigInt("MaxDump", GConfig.MaxDump, 0, 65535);
    GConfig.MaxBits = ClampConfigInt("MaxBits", GConfig.MaxBits, 0, 262144);
    GConfig.BitsPerLine = ClampConfigInt("BitsPerLine", GConfig.BitsPerLine, 32, 512);
    GConfig.LoginDumpBits = ClampConfigInt("LoginDumpBits", GConfig.LoginDumpBits, 0, 65535);
    GConfig.LogMinIntervalMs = ClampConfigInt("MinIntervalMs", GConfig.LogMinIntervalMs, 0, 60000);
    GConfig.LogRepeatSuppressMs = ClampConfigInt("RepeatSuppressMs", GConfig.LogRepeatSuppressMs, 0, 60000);
    GConfig.RescanMs = ClampConfigInt("RescanMs", static_cast<int>(GConfig.RescanMs), 250, 60000);
    if (!GConfig.LogPath[0])
    {
        InitLogPath();
    }
}
