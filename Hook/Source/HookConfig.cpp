/** Hook configuration loader implementation. */
#include "HookConfig.h"

void LoadConfig()
{
    char ExePath[MAX_PATH] = {0};
    HMODULE SelfModule = reinterpret_cast<HMODULE>(&__ImageBase);
    GetModuleFileNameA(SelfModule, ExePath, MAX_PATH);
    char* Slash = strrchr(ExePath, '\\');
    if (Slash)
    {
        Slash[1] = '\0';
    }
    char IniPath[MAX_PATH] = {0};
    lstrcpyA(IniPath, ExePath);
    lstrcatA(IniPath, "fom_hook.ini");

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
    GConfig.bWrapperPacketProc = GetPrivateProfileIntA("WrapperHooks", "PacketProc", 1, IniPath) != 0;
    GConfig.bWs2Detours = GetPrivateProfileIntA("Hook", "Ws2Detours", 1, IniPath) != 0;
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
        const bool IsAbs = ((LogPath[1] == ':' && (LogPath[2] == '\\' || LogPath[2] == '/')) ||
                            (LogPath[0] == '\\' && LogPath[1] == '\\'));
        if (IsAbs)
        {
            lstrcpynA(GConfig.LogPath, LogPath, MAX_PATH);
        }
        else
        {
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
                _snprintf_s(GConfig.LogPath, MAX_PATH, _TRUNCATE, "%s%s", ModulePath, LogPath);
            }
            else
            {
                lstrcpynA(GConfig.LogPath, LogPath, MAX_PATH);
            }
        }
    }

    char HuffmanPath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Huffman", "TablePath", "..\\Server\\Master_TS\\huffman_table_runtime.json", HuffmanPath, MAX_PATH, IniPath);
    if (HuffmanPath[0])
    {
        const bool IsAbs = ((HuffmanPath[1] == ':' && (HuffmanPath[2] == '\\' || HuffmanPath[2] == '/')) ||
                            (HuffmanPath[0] == '\\' && HuffmanPath[1] == '\\'));
        if (IsAbs)
        {
            lstrcpynA(GConfig.HuffmanTablePath, HuffmanPath, MAX_PATH);
        }
        else
        {
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
                _snprintf_s(GConfig.HuffmanTablePath, MAX_PATH, _TRUNCATE, "%s%s", ModulePath, HuffmanPath);
            }
            else
            {
                lstrcpynA(GConfig.HuffmanTablePath, HuffmanPath, MAX_PATH);
            }
        }
    }

    char ItemPath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Items", "OverridesPath", "item_overrides.csv", ItemPath, MAX_PATH, IniPath);
    if (ItemPath[0])
    {
        const bool IsAbs = ((ItemPath[1] == ':' && (ItemPath[2] == '\\' || ItemPath[2] == '/')) ||
                            (ItemPath[0] == '\\' && ItemPath[1] == '\\'));
        if (IsAbs)
        {
            lstrcpynA(GConfig.ItemOverridesPath, ItemPath, MAX_PATH);
        }
        else
        {
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
                _snprintf_s(GConfig.ItemOverridesPath, MAX_PATH, _TRUNCATE, "%s%s", ModulePath, ItemPath);
            }
            else
            {
                lstrcpynA(GConfig.ItemOverridesPath, ItemPath, MAX_PATH);
            }
        }
    }

    char ItemTemplatePath[MAX_PATH] = {0};
    GetPrivateProfileStringA("Items", "TemplateDumpPath", "..\\Docs\\Exports\\item_templates_raw.csv",
                             ItemTemplatePath, MAX_PATH, IniPath);
    if (ItemTemplatePath[0])
    {
        const bool IsAbs = ((ItemTemplatePath[1] == ':' && (ItemTemplatePath[2] == '\\' || ItemTemplatePath[2] == '/')) ||
                            (ItemTemplatePath[0] == '\\' && ItemTemplatePath[1] == '\\'));
        if (IsAbs)
        {
            lstrcpynA(GConfig.ItemTemplateDumpPath, ItemTemplatePath, MAX_PATH);
        }
        else
        {
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
                _snprintf_s(GConfig.ItemTemplateDumpPath, MAX_PATH, _TRUNCATE, "%s%s", ModulePath, ItemTemplatePath);
            }
            else
            {
                lstrcpynA(GConfig.ItemTemplateDumpPath, ItemTemplatePath, MAX_PATH);
            }
        }
    }
}



