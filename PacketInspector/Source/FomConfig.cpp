#include "FomConfig.h"
#include "FomPlatform.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstddef>

#ifdef _WIN32
#include <Windows.h>
#endif

std::mutex GLock;
FomLogConfig GConfig = {};
std::vector<RuleEntry> GRules;
std::vector<uint8_t> GAllowConsoleIds;
std::vector<uint8_t> GAllowFileIds;
std::vector<uint8_t> GIgnoreIds;
std::unordered_map<std::string, RepeatState> GRepeatConsole;
std::unordered_map<std::string, RepeatState> GRepeatFile;
ProfileEntry GProfile;
bool GConfigFileAttempted = false;
bool GConfigFileLoaded = false;
std::string GConfigFilePath;
uint8_t GTraceOffsets = 0;
uint8_t GTraceRakParse = 0;
uint8_t GTraceRakParseVerbose = 0;

void CopyConfig(const FomLogConfig* Config);

static void TrimInPlace(std::string& Text)
{
    const char* White = " \t\r\n";
    size_t Start = Text.find_first_not_of(White);
    if (Start == std::string::npos)
    {
        Text.clear();
        return;
    }
    size_t End = Text.find_last_not_of(White);
    Text = Text.substr(Start, End - Start + 1);
}

static std::string NormalizeRuleTag(const std::string& InTag)
{
    std::string Tag = InTag;
    TrimInPlace(Tag);
    if (Tag.empty())
    {
        return Tag;
    }
    if (Stricmp(Tag.c_str(), "*") == 0 ||
        Stricmp(Tag.c_str(), "All") == 0 ||
        Stricmp(Tag.c_str(), "Any") == 0)
    {
        return "*";
    }
    if (Stricmp(Tag.c_str(), "RakRecv") == 0 || Stricmp(Tag.c_str(), "RakNetRecv") == 0)
    {
        return "Rak][Net_Recv";
    }
    if (Stricmp(Tag.c_str(), "RakSend") == 0 || Stricmp(Tag.c_str(), "RakSendTo") == 0)
    {
        return "Rak][Net_SendTo";
    }
    if (Stricmp(Tag.c_str(), "LithRecv") == 0 || Stricmp(Tag.c_str(), "LithNetRecv") == 0)
    {
        return "Lith][Net_Recv";
    }
    if (Stricmp(Tag.c_str(), "LithSend") == 0 || Stricmp(Tag.c_str(), "LithSendTo") == 0)
    {
        return "Lith][Net_SendTo";
    }
    return Tag;
}

static void ParseIdList(const std::string& Text, std::vector<uint8_t>& Out)
{
    Out.clear();
    std::string Work = Text;
    TrimInPlace(Work);
    if (Work.empty())
    {
        return;
    }
    if (Stricmp(Work.c_str(), "*") == 0 ||
        Stricmp(Work.c_str(), "All") == 0 ||
        Stricmp(Work.c_str(), "Any") == 0)
    {
        for (uint32_t I = 0; I < 256; ++I)
        {
            Out.push_back(static_cast<uint8_t>(I));
        }
        return;
    }

    size_t Pos = 0;
    while (Pos < Work.size())
    {
        size_t Comma = Work.find(',', Pos);
        std::string Token = (Comma == std::string::npos) ? Work.substr(Pos) : Work.substr(Pos, Comma - Pos);
        TrimInPlace(Token);
        if (!Token.empty())
        {
            int Value = static_cast<int>(strtol(Token.c_str(), nullptr, 0));
            if (Value < 0) Value = 0;
            if (Value > 255) Value = 255;
            Out.push_back(static_cast<uint8_t>(Value));
        }
        if (Comma == std::string::npos)
        {
            break;
        }
        Pos = Comma + 1;
    }
}

static void ApplyAliasValue(RuleEntry& Rule, const char* Value)
{
    if (!Value || !Value[0])
    {
        return;
    }
    std::string Work = Value;
    TrimInPlace(Work);
    if (Work.empty())
    {
        return;
    }
    if (Stricmp(Work.c_str(), "Off") == 0 || Stricmp(Work.c_str(), "None") == 0)
    {
        Rule.Suppress = true;
        return;
    }
    if (Stricmp(Work.c_str(), "On") == 0 || Stricmp(Work.c_str(), "All") == 0)
    {
        return;
    }
    ParseIdList(Work, Rule.Ids);
}

static bool ParseRuleText(const char* Text, RuleEntry& OutRule)
{
    if (!Text || !Text[0])
    {
        return false;
    }
    std::string Work = Text;
    TrimInPlace(Work);
    if (Work.empty())
    {
        return false;
    }

    OutRule = {};

    size_t Pos = 0;
    while (Pos < Work.size())
    {
        size_t Comma = Work.find(',', Pos);
        std::string Token = (Comma == std::string::npos) ? Work.substr(Pos) : Work.substr(Pos, Comma - Pos);
        TrimInPlace(Token);
        if (!Token.empty())
        {
            size_t Eq = Token.find('=');
            std::string Key = Token;
            std::string Value;
            if (Eq != std::string::npos)
            {
                Key = Token.substr(0, Eq);
                Value = Token.substr(Eq + 1);
                TrimInPlace(Key);
                TrimInPlace(Value);
            }

            if (Stricmp(Key.c_str(), "Tag") == 0)
            {
                OutRule.Tag = NormalizeRuleTag(Value);
            }
            else if (Stricmp(Key.c_str(), "Ids") == 0 || Stricmp(Key.c_str(), "Id") == 0)
            {
                ParseIdList(Value, OutRule.Ids);
            }
            else if (Stricmp(Key.c_str(), "RepeatMs") == 0)
            {
                OutRule.RepeatMs = atoi(Value.c_str());
            }
            else if (Stricmp(Key.c_str(), "MinIntervalMs") == 0)
            {
                OutRule.MinIntervalMs = atoi(Value.c_str());
            }
            else if (Stricmp(Key.c_str(), "Suppress") == 0)
            {
                OutRule.Suppress = atoi(Value.c_str()) != 0;
            }
            else if (Stricmp(Key.c_str(), "Name") == 0)
            {
                OutRule.Tag = NormalizeRuleTag(Value);
            }
            else if (OutRule.Tag.empty())
            {
                OutRule.Tag = NormalizeRuleTag(Key);
                if (!Value.empty())
                {
                    ParseIdList(Value, OutRule.Ids);
                }
                else
                {
                    ApplyAliasValue(OutRule, Key.c_str());
                }
            }
        }
        if (Comma == std::string::npos)
        {
            break;
        }
        Pos = Comma + 1;
    }
    return true;
}

static bool ParseAliasKey(const std::string& Key, std::string& OutTag, std::string& OutSuffix)
{
    if (Stricmp(Key.c_str(), "All") == 0 || Stricmp(Key.c_str(), "Any") == 0)
    {
        OutTag = "*";
        OutSuffix.clear();
        return true;
    }
    const char* Prefixes[] = {"RakRecv", "RakSend", "LithRecv", "LithSend"};
    for (const char* Prefix : Prefixes)
    {
        const size_t PrefixLen = strlen(Prefix);
        if (Key.size() < PrefixLen)
        {
            continue;
        }
        if (Strnicmp(Key.c_str(), Prefix, PrefixLen) != 0)
        {
            continue;
        }
        std::string Tag = NormalizeRuleTag(Prefix);
        std::string Suffix = Key.substr(PrefixLen);
        if (!Suffix.empty() && (Suffix[0] == '.' || Suffix[0] == '_'))
        {
            Suffix.erase(0, 1);
        }
        TrimInPlace(Suffix);
        OutTag = Tag;
        OutSuffix = Suffix;
        return true;
    }
    return false;
}

static bool ReadIniString(const char* Section, const char* Key, std::string& Out, const char* Path)
{
#ifdef _WIN32
    char Buffer[1024] = {0};
    DWORD Length = GetPrivateProfileStringA(Section, Key, "", Buffer, sizeof(Buffer), Path);
    if (Length == 0)
    {
        return false;
    }
    Out.assign(Buffer, Length);
    TrimInPlace(Out);
    return true;
#else
    (void)Section;
    (void)Key;
    (void)Path;
    Out.clear();
    return false;
#endif
}

static bool ReadIniInt(const char* Section, const char* Key, int32_t* Out, const char* Path)
{
    std::string Value;
    if (!ReadIniString(Section, Key, Value, Path))
    {
        return false;
    }
    if (Value.empty())
    {
        return false;
    }
    *Out = static_cast<int32_t>(strtol(Value.c_str(), nullptr, 0));
    return true;
}

static void LoadLogProfileFromIni(const char* IniPath)
{
    GProfile = {};
    GRules.clear();
    if (!IniPath || !IniPath[0])
    {
        return;
    }

    std::string ActiveName = "Default";
    std::string ActiveValue;
    if (ReadIniString("LoggingProfiles", "ActiveProfile", ActiveValue, IniPath) && !ActiveValue.empty())
    {
        ActiveName = ActiveValue;
    }
    GProfile.Name = ActiveName;

    std::string Section = "LogProfile.";
    Section.append(ActiveName);

    int32_t Value = -1;
    if (ReadIniInt(Section.c_str(), "RepeatSuppressMs", &Value, IniPath))
    {
        GProfile.RepeatMs = Value;
    }
    if (ReadIniInt(Section.c_str(), "MinIntervalMs", &Value, IniPath))
    {
        GProfile.MinIntervalMs = Value;
    }
    for (int Index = 1; Index <= 32; ++Index)
    {
        char Key[16] = {0};
        SnprintfS(Key, sizeof(Key), _TRUNCATE, "Rule%d", Index);
        std::string RuleText;
        if (!ReadIniString(Section.c_str(), Key, RuleText, IniPath))
        {
            continue;
        }
        RuleEntry Rule;
        if (ParseRuleText(RuleText.c_str(), Rule))
        {
            GRules.push_back(Rule);
        }
    }

#ifdef _WIN32
    char KeyNames[4096] = {0};
    GetPrivateProfileStringA(Section.c_str(), nullptr, "", KeyNames, sizeof(KeyNames), IniPath);
    std::unordered_map<std::string, RuleEntry> AliasRules;
    std::vector<std::string> AliasOrder;
    for (const char* KeyPtr = KeyNames; KeyPtr && *KeyPtr; KeyPtr += strlen(KeyPtr) + 1)
    {
        std::string Key(KeyPtr);
        if (Strnicmp(Key.c_str(), "Rule", 4) == 0)
        {
            continue;
        }
        if (Stricmp(Key.c_str(), "RepeatSuppressMs") == 0 ||
            Stricmp(Key.c_str(), "MinIntervalMs") == 0)
        {
            continue;
        }
        std::string AliasTag;
        std::string Suffix;
        if (!ParseAliasKey(Key, AliasTag, Suffix))
        {
            continue;
        }
        std::string ValueText;
        if (!ReadIniString(Section.c_str(), Key.c_str(), ValueText, IniPath) && Suffix.empty())
        {
            continue;
        }
        auto It = AliasRules.find(AliasTag);
        if (It == AliasRules.end())
        {
            RuleEntry Rule;
            Rule.Tag = AliasTag;
            AliasRules.emplace(AliasTag, Rule);
            AliasOrder.push_back(AliasTag);
        }
        RuleEntry& Rule = AliasRules[AliasTag];
        if (Suffix.empty())
        {
            ApplyAliasValue(Rule, ValueText.c_str());
            continue;
        }
        if (Stricmp(Suffix.c_str(), "Ids") == 0 || Stricmp(Suffix.c_str(), "Id") == 0)
        {
            ParseIdList(ValueText, Rule.Ids);
        }
        else if (Stricmp(Suffix.c_str(), "RepeatMs") == 0)
        {
            Rule.RepeatMs = atoi(ValueText.c_str());
        }
        else if (Stricmp(Suffix.c_str(), "MinIntervalMs") == 0)
        {
            Rule.MinIntervalMs = atoi(ValueText.c_str());
        }
        else if (Stricmp(Suffix.c_str(), "Suppress") == 0)
        {
            Rule.Suppress = atoi(ValueText.c_str()) != 0;
        }
    }
    for (const std::string& Tag : AliasOrder)
    {
        auto It = AliasRules.find(Tag);
        if (It != AliasRules.end())
        {
            GRules.push_back(It->second);
        }
    }
#endif
}

static bool FileExists(const char* Path)
{
#ifdef _WIN32
    if (!Path || !Path[0])
    {
        return false;
    }
    DWORD Attr = GetFileAttributesA(Path);
    return (Attr != INVALID_FILE_ATTRIBUTES) && ((Attr & FILE_ATTRIBUTE_DIRECTORY) == 0);
#else
    (void)Path;
    return false;
#endif
}

static std::string JoinPath(const std::string& Base, const char* Leaf)
{
    if (Base.empty())
    {
        return Leaf ? std::string(Leaf) : std::string();
    }
    std::string Result = Base;
    const char Last = Result.back();
    if (Last != '\\' && Last != '/')
    {
        Result.push_back('\\');
    }
    if (Leaf)
    {
        Result.append(Leaf);
    }
    return Result;
}

static bool GetModuleDirectory(std::string& OutDir)
{
#ifdef _WIN32
    HMODULE Module = nullptr;
    if (!GetModuleHandleExA(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT, reinterpret_cast<LPCSTR>(&GetModuleDirectory), &Module))
    {
        return false;
    }
    char Path[MAX_PATH] = {0};
    DWORD Length = GetModuleFileNameA(Module, Path, MAX_PATH);
    if (Length == 0 || Length >= MAX_PATH)
    {
        return false;
    }
    std::string Dir(Path);
    size_t Slash = Dir.find_last_of("\\/");
    if (Slash != std::string::npos)
    {
        Dir = Dir.substr(0, Slash);
    }
    OutDir = Dir;
    return true;
#else
    OutDir.clear();
    return false;
#endif
}

std::string ResolveConfigPath(const char* OverridePath)
{
    if (OverridePath && OverridePath[0] && FileExists(OverridePath))
    {
        return std::string(OverridePath);
    }

    const char* EnvPath = std::getenv("FOM_PACKETINSPECTOR_CONFIG");
    if (!EnvPath || !EnvPath[0])
    {
        EnvPath = std::getenv("PACKETINSPECTOR_CONFIG");
    }
    if (EnvPath && EnvPath[0] && FileExists(EnvPath))
    {
        return std::string(EnvPath);
    }

#ifdef _WIN32
    char Cwd[MAX_PATH] = {0};
    if (GetCurrentDirectoryA(MAX_PATH, Cwd) > 0)
    {
        std::string CwdPath = JoinPath(Cwd, "PacketInspector.ini");
        if (FileExists(CwdPath.c_str()))
        {
            return CwdPath;
        }
    }
#endif

    std::string ModuleDir;
    if (GetModuleDirectory(ModuleDir))
    {
        std::string Candidate = JoinPath(ModuleDir, "PacketInspector.ini");
        if (FileExists(Candidate.c_str()))
        {
            return Candidate;
        }
        Candidate = JoinPath(ModuleDir, "Config\\PacketInspector.ini");
        if (FileExists(Candidate.c_str()))
        {
            return Candidate;
        }
        Candidate = JoinPath(ModuleDir, "PacketInspector\\PacketInspector.ini");
        if (FileExists(Candidate.c_str()))
        {
            return Candidate;
        }
        Candidate = JoinPath(ModuleDir, "PacketInspector\\Config\\PacketInspector.ini");
        if (FileExists(Candidate.c_str()))
        {
            return Candidate;
        }

        std::string Current = ModuleDir;
        for (int Depth = 0; Depth < 4; ++Depth)
        {
            size_t Slash = Current.find_last_of("\\/");
            if (Slash == std::string::npos)
            {
                break;
            }
            Current = Current.substr(0, Slash);
            Candidate = JoinPath(Current, "PacketInspector.ini");
            if (FileExists(Candidate.c_str()))
            {
                return Candidate;
            }
            Candidate = JoinPath(Current, "Config\\PacketInspector.ini");
            if (FileExists(Candidate.c_str()))
            {
                return Candidate;
            }
            Candidate = JoinPath(Current, "PacketInspector\\PacketInspector.ini");
            if (FileExists(Candidate.c_str()))
            {
                return Candidate;
            }
            Candidate = JoinPath(Current, "PacketInspector\\Config\\PacketInspector.ini");
            if (FileExists(Candidate.c_str()))
            {
                return Candidate;
            }
        }
    }

    return std::string();
}

static bool EnvFlagEnabled(const char* Name)
{
    const char* Value = std::getenv(Name);
    if (!Value || !Value[0])
    {
        return false;
    }
    return Value[0] != '0';
}

bool IsTraceOffsetsEnabled()
{
    return GTraceOffsets != 0 || EnvFlagEnabled("FOM_PI_TRACE_OFFSETS");
}

bool IsTraceRakParseEnabled()
{
    return GTraceRakParse != 0 || EnvFlagEnabled("FOM_PI_TRACE_RAKPARSE");
}

bool IsTraceRakParseVerboseEnabled()
{
    return GTraceRakParseVerbose != 0 || EnvFlagEnabled("FOM_PI_TRACE_RAKPARSE_VERBOSE");
}

bool LoadConfigFromIniPathLocked(const char* IniPath)
{
    if (!IniPath || !IniPath[0])
    {
        return false;
    }
    if (!FileExists(IniPath))
    {
        return false;
    }

    CopyConfig(nullptr);

    int32_t Value = 0;
    if (ReadIniInt("Logging", "Enabled", &Value, IniPath))
    {
        GConfig.Enabled = Value != 0;
    }
    if (ReadIniInt("Logging", "LogRecv", &Value, IniPath))
    {
        GConfig.LogRecv = Value != 0;
    }
    if (ReadIniInt("Logging", "LogSend", &Value, IniPath))
    {
        GConfig.LogSend = Value != 0;
    }
    if (ReadIniInt("Logging", "LogHex", &Value, IniPath))
    {
        GConfig.LogHex = Value != 0;
    }
    if (ReadIniInt("Logging", "IncludeAddr", &Value, IniPath))
    {
        GConfig.IncludeAddr = Value != 0;
    }
    if (ReadIniInt("Logging", "IncludeConn", &Value, IniPath))
    {
        GConfig.IncludeConn = Value != 0;
    }
    if (ReadIniInt("Logging", "EmitAnsiConsole", &Value, IniPath))
    {
        GConfig.EmitAnsiConsole = Value != 0;
    }
    if (ReadIniInt("Logging", "EmitSuppressedLine", &Value, IniPath))
    {
        GConfig.EmitSuppressedLine = Value != 0;
    }
    if (ReadIniInt("Logging", "SuppressRepeats", &Value, IniPath))
    {
        GConfig.SuppressRepeats = Value != 0;
    }
    if (ReadIniInt("Logging", "SuppressRepeatsInFile", &Value, IniPath))
    {
        GConfig.SuppressRepeatsInFile = Value != 0;
    }
    if (ReadIniInt("Logging", "StrictParsing", &Value, IniPath))
    {
        GConfig.StrictParsing = Value != 0;
    }
    if (ReadIniInt("Logging", "BestGuessParsing", &Value, IniPath))
    {
        GConfig.BestGuessParsing = Value != 0;
    }
    if (ReadIniInt("Logging", "DispatchStatus", &Value, IniPath))
    {
        GConfig.DispatchStatus = Value != 0;
    }
    if (ReadIniInt("Logging", "NameOnlyLabels", &Value, IniPath))
    {
        GConfig.NameOnlyLabels = Value != 0;
    }
    if (ReadIniInt("Logging", "MaxDump", &Value, IniPath) && Value > 0)
    {
        GConfig.MaxDumpBytes = static_cast<uint32_t>(Value);
    }
    if (ReadIniInt("Logging", "MaxBits", &Value, IniPath) && Value > 0)
    {
        GConfig.MaxDumpBits = static_cast<uint32_t>(Value);
    }
    if (ReadIniInt("Logging", "BitsPerLine", &Value, IniPath) && Value > 0)
    {
        GConfig.BitsPerLine = static_cast<uint32_t>(Value);
    }
    if (ReadIniInt("Logging", "MinIntervalMs", &Value, IniPath))
    {
        GConfig.MinIntervalMs = Value;
    }
    if (ReadIniInt("Logging", "RepeatSuppressMs", &Value, IniPath))
    {
        GConfig.RepeatSuppressMs = Value;
    }
    if (ReadIniInt("Logging", "TraceOffsets", &Value, IniPath))
    {
        GTraceOffsets = Value != 0;
    }
    if (ReadIniInt("Logging", "TraceRakParse", &Value, IniPath))
    {
        GTraceRakParse = Value != 0;
    }
    if (ReadIniInt("Logging", "TraceRakParseVerbose", &Value, IniPath))
    {
        GTraceRakParseVerbose = Value != 0;
    }

    std::string ListValue;
    if (ReadIniString("Logging", "AllowConsoleIds", ListValue, IniPath))
    {
        ParseIdList(ListValue, GAllowConsoleIds);
    }
    if (ReadIniString("Logging", "AllowFileIds", ListValue, IniPath))
    {
        ParseIdList(ListValue, GAllowFileIds);
    }
    if (ReadIniString("Logging", "IgnoreIds", ListValue, IniPath))
    {
        ParseIdList(ListValue, GIgnoreIds);
    }

    LoadLogProfileFromIni(IniPath);
    GConfigFileLoaded = true;
    GConfigFilePath = IniPath;
    return true;
}

bool TryLoadConfigFromFileLocked(const char* OverridePath)
{
    if (GConfigFileAttempted)
    {
        return GConfigFileLoaded;
    }
    GConfigFileAttempted = true;
    const std::string ResolvedPath = ResolveConfigPath(OverridePath);
    if (ResolvedPath.empty())
    {
        return false;
    }
    return LoadConfigFromIniPathLocked(ResolvedPath.c_str());
}

uint64_t NowMs()
{
#ifdef _WIN32
    return static_cast<uint64_t>(GetTickCount64());
#else
    using namespace std::chrono;
    return static_cast<uint64_t>(duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count());
#endif
}

void CopyConfig(const FomLogConfig* Config)
{
    GConfig = {};
    GProfile = {};
    GRules.clear();
    GAllowConsoleIds.clear();
    GAllowFileIds.clear();
    GIgnoreIds.clear();
    GRepeatConsole.clear();
    GRepeatFile.clear();
    GTraceOffsets = 0;
    GTraceRakParse = 0;
    GTraceRakParseVerbose = 0;

    if (!Config)
    {
        GConfig.StructSize = sizeof(FomLogConfig);
        GConfig.Enabled = 1;
        GConfig.LogRecv = 1;
        GConfig.LogSend = 1;
        GConfig.LogHex = 1;
        GConfig.IncludeAddr = 1;
        GConfig.IncludeConn = 1;
        GConfig.SuppressRepeats = 1;
        GConfig.StrictParsing = 1;
        GConfig.EmitAnsiConsole = 1;
        GConfig.DispatchStatus = 0;
        GConfig.NameOnlyLabels = 0;
        GConfig.MaxDumpBytes = 4096;
        GConfig.BitsPerLine = 128;
        GConfig.MinIntervalMs = 0;
        GConfig.RepeatSuppressMs = 2000;
        return;
    }

    const uint32_t size = Config->StructSize;
    if (size >= sizeof(FomLogConfig))
    {
        GConfig = *Config;
    }
    else
    {
        GConfig = {};
        std::memcpy(&GConfig, Config, size);
        GConfig.StructSize = sizeof(FomLogConfig);
    }

    if (size < offsetof(FomLogConfig, EmitAnsiConsole) + sizeof(uint8_t))
    {
        GConfig.EmitAnsiConsole = 1;
    }
    if (size < offsetof(FomLogConfig, DispatchStatus) + sizeof(uint8_t))
    {
        GConfig.DispatchStatus = 0;
    }
    if (size < offsetof(FomLogConfig, NameOnlyLabels) + sizeof(uint8_t))
    {
        GConfig.NameOnlyLabels = 0;
    }

    if (GConfig.MaxDumpBytes == 0)
    {
        GConfig.MaxDumpBytes = 4096;
    }
    if (GConfig.BitsPerLine == 0)
    {
        GConfig.BitsPerLine = 128;
    }
}

bool IdInList(uint8_t Id, const std::vector<uint8_t>& List)
{
    for (uint8_t Entry : List)
    {
        if ((Entry & 0XFF) == (Id & 0XFF)) return true;
    }
    return false;
}

static bool RuleMatches(const RuleEntry& Rule, const std::string& Tag, int EffectiveId)
{
    if (!Rule.Tag.empty() && Rule.Tag != "*" && Stricmp(Rule.Tag.c_str(), Tag.c_str()) != 0)
    {
        return false;
    }
    if (Rule.Ids.empty())
    {
        return true;
    }
    for (uint8_t Id : Rule.Ids)
    {
        if (Id == static_cast<uint8_t>(EffectiveId & 0XFF))
        {
            return true;
        }
    }
    return false;
}

void GetProfileOverrides(const std::string& Tag, int EffectiveId, int* OutMinInterval, int* OutRepeat, bool* OutForceSuppress)
{
    int MinInterval = (GProfile.MinIntervalMs >= 0) ? GProfile.MinIntervalMs : GConfig.MinIntervalMs;
    int RepeatMs = (GProfile.RepeatMs >= 0) ? GProfile.RepeatMs : GConfig.RepeatSuppressMs;
    bool Suppress = false;

    for (const RuleEntry& Rule : GRules)
    {
        if (!RuleMatches(Rule, Tag, EffectiveId))
        {
            continue;
        }
        if (Rule.Suppress)
        {
            Suppress = true;
        }
        if (Rule.MinIntervalMs >= 0)
        {
            MinInterval = Rule.MinIntervalMs;
        }
        if (Rule.RepeatMs >= 0)
        {
            RepeatMs = Rule.RepeatMs;
        }
    }

    if (OutMinInterval) *OutMinInterval = MinInterval;
    if (OutRepeat) *OutRepeat = RepeatMs;
    if (OutForceSuppress) *OutForceSuppress = Suppress;
}
