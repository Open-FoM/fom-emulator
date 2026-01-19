#include "FomApi.h"

#include "FomConfig.h"
#include "FomHexDump.h"
#include "FomIdTables.h"
#include "FomInspect.h"
#include "FomPlatform.h"
#include "FomRakParse.h"
#include "FomSchema.h"

#include "raknet/MessageIdentifiers.h"

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <string>
#include <unordered_map>
#include <vector>

#ifdef _WIN32
#include <Windows.h>
#endif

static std::string FormatTimestamp()
{
#ifdef _WIN32
    SYSTEMTIME Time{};
    GetLocalTime(&Time);
    char Buffer[64] = {0};
    SnprintfS(Buffer, sizeof(Buffer), _TRUNCATE,
                "%04u.%02u.%02u-%02u.%02u.%02u:%03u",
                Time.wYear, Time.wMonth, Time.wDay,
                Time.wHour, Time.wMinute, Time.wSecond, Time.wMilliseconds);
    return std::string(Buffer);
#else
    using namespace std::chrono;
    const auto Now = system_clock::now();
    const auto TimeTNow = system_clock::to_time_t(Now);
    std::tm tm{};
    localtime_r(&TimeTNow, &tm);
    const auto Ms = duration_cast<milliseconds>(Now.time_since_epoch()) % 1000;
    char Buffer[64] = {0};
    std::snprintf(Buffer, sizeof(Buffer),
                  "%04d.%02d.%02d-%02d.%02d.%02d:%03d",
                  tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday,
                  tm.tm_hour, tm.tm_min, tm.tm_sec, static_cast<int>(Ms.count()));
    return std::string(Buffer);
#endif
}

static std::string FormatHexId(uint8_t Id)
{
    char Buffer[8] = {0};
    SnprintfS(Buffer, sizeof(Buffer), _TRUNCATE, "0x%02X", Id & 0XFF);
    return std::string(Buffer);
}

static bool IsDisconnectPingSignature(const FomLogEvent* Evt, const FomInspectResult& Inspect)
{
    if (!Evt || !Evt->Data || Evt->Length < 0x0D)
    {
        return false;
    }
    if (Inspect.Layer != FomLayerRak || Inspect.EffectiveId != 0x00)
    {
        return false;
    }
    return Evt->Data[0x0B] == 0x09 && Evt->Data[0x0C] == 0x90;
}

static std::string BuildIdLabel(const FomInspectResult& Inspect, const FomLogEvent* Evt, FomLogDirection Direction)
{
    if (!GConfig.NameOnlyLabels)
    {
        return FormatHexId(Inspect.EffectiveId);
    }

    if (IsDisconnectPingSignature(Evt, Inspect))
    {
        return std::string("DISCONNECT_PING");
    }

    if (Inspect.Layer == FomLayerLith && Inspect.OuterId == 0X0E)
    {
        const char* OuterName = GetLithIdName(Inspect.OuterId, Direction);
        const char* InnerName = GetLithIdName(Inspect.InnerId, Direction);
        std::string Label = OuterName ? OuterName : FormatHexId(Inspect.OuterId);
        if (Inspect.InnerId != 0 && Inspect.InnerId != Inspect.OuterId)
        {
            Label.append("(inner=");
            Label.append(InnerName ? InnerName : FormatHexId(Inspect.InnerId));
            Label.append(")");
        }
        return Label;
    }

    const char* Name = GetPacketIdName(Inspect.EffectiveId, Inspect.Layer, Direction);
    if (Name && Name[0])
    {
        return std::string(Name);
    }

    if (Inspect.InnerId != 0 && Inspect.InnerId != Inspect.EffectiveId)
    {
        const char* InnerName = GetPacketIdName(Inspect.InnerId, Inspect.Layer, Direction);
        if (InnerName && InnerName[0])
        {
            return std::string(InnerName);
        }
        return FormatHexId(Inspect.InnerId);
    }

    return FormatHexId(Inspect.EffectiveId);
}

static void FomLogInitImpl(const FomLogConfig* Config)
{
    std::lock_guard<std::mutex> Guard(GLock);
    if (TryLoadConfigFromFileLocked(nullptr))
    {
        return;
    }
    CopyConfig(Config);
}

FOM_PI_API void FomLogInit(const FomLogConfig* Config)
{
#ifdef _WIN32
    __try
    {
        FomLogInitImpl(Config);
    }
    __except(EXCEPTION_EXECUTE_HANDLER)
    {
        return;
    }
#else
    FomLogInitImpl(Config);
#endif
}

static void FomLogInitSimpleImpl(int32_t Enabled, int32_t LogRecv, int32_t LogSend, int32_t LogHex, int32_t IncludeAddr, int32_t IncludeConn, int32_t SuppressRepeats, int32_t SuppressRepeatsInFile, int32_t EmitSuppressedLine, int32_t EmitAnsiConsole, int32_t StrictParsing, int32_t BestGuessParsing, uint32_t MaxDumpBytes, int32_t MinIntervalMs, int32_t RepeatSuppressMs)
{
    {
        std::lock_guard<std::mutex> Guard(GLock);
        if (TryLoadConfigFromFileLocked(nullptr))
        {
            return;
        }
    }
    FomLogConfig Cfg{};
    Cfg.StructSize = sizeof(FomLogConfig);
    Cfg.Enabled = Enabled != 0;
    Cfg.LogRecv = LogRecv != 0;
    Cfg.LogSend = LogSend != 0;
    Cfg.LogHex = LogHex != 0;
    Cfg.IncludeAddr = IncludeAddr != 0;
    Cfg.IncludeConn = IncludeConn != 0;
    Cfg.SuppressRepeats = SuppressRepeats != 0;
    Cfg.SuppressRepeatsInFile = SuppressRepeatsInFile != 0;
    Cfg.EmitSuppressedLine = EmitSuppressedLine != 0;
    Cfg.EmitAnsiConsole = EmitAnsiConsole != 0;
    Cfg.StrictParsing = StrictParsing != 0;
    Cfg.BestGuessParsing = BestGuessParsing != 0;
    Cfg.MaxDumpBytes = MaxDumpBytes;
    Cfg.MinIntervalMs = MinIntervalMs;
    Cfg.RepeatSuppressMs = RepeatSuppressMs;
    FomLogInitImpl(&Cfg);
}

FOM_PI_API void FomLogInitSimple(int32_t Enabled, int32_t LogRecv, int32_t LogSend, int32_t LogHex, int32_t IncludeAddr, int32_t IncludeConn, int32_t SuppressRepeats, int32_t SuppressRepeatsInFile, int32_t EmitSuppressedLine, int32_t EmitAnsiConsole, int32_t StrictParsing, int32_t BestGuessParsing, uint32_t MaxDumpBytes, int32_t MinIntervalMs, int32_t RepeatSuppressMs)
{
#ifdef _WIN32
    __try
    {
        FomLogInitSimpleImpl(Enabled, LogRecv, LogSend, LogHex, IncludeAddr, IncludeConn, SuppressRepeats, SuppressRepeatsInFile, EmitSuppressedLine, EmitAnsiConsole, StrictParsing, BestGuessParsing, MaxDumpBytes, MinIntervalMs, RepeatSuppressMs);
    }
    __except(EXCEPTION_EXECUTE_HANDLER)
    {
        return;
    }
#else
    FomLogInitSimpleImpl(Enabled, LogRecv, LogSend, LogHex, IncludeAddr, IncludeConn, SuppressRepeats, SuppressRepeatsInFile, EmitSuppressedLine, EmitAnsiConsole, StrictParsing, BestGuessParsing, MaxDumpBytes, MinIntervalMs, RepeatSuppressMs);
#endif
}

FOM_PI_API void FomLogShutdown(void)
{
    std::lock_guard<std::mutex> Guard(GLock);
    GRules.clear();
    GAllowConsoleIds.clear();
    GAllowFileIds.clear();
    GIgnoreIds.clear();
    GRepeatConsole.clear();
    GRepeatFile.clear();
    GProfile = {};
    GConfig = {};
}

FOM_PI_API void FomLogClearRules(void)
{
    std::lock_guard<std::mutex> Guard(GLock);
    GRules.clear();
}

FOM_PI_API void FomLogAddRule(const FomLogRule* Rule)
{
    if (!Rule || !Rule->Tag) return;
    std::lock_guard<std::mutex> Guard(GLock);
    RuleEntry Entry;
    Entry.Tag = Rule->Tag;
    Entry.RepeatMs = Rule->RepeatMs;
    Entry.MinIntervalMs = Rule->MinIntervalMs;
    Entry.Suppress = Rule->Suppress != 0;
    if (Rule->Ids && Rule->IdCount > 0)
    {
        Entry.Ids.assign(Rule->Ids, Rule->Ids + Rule->IdCount);
    }
    GRules.push_back(Entry);
}

FOM_PI_API void FomLogSetProfile(const FomLogProfile* Profile)
{
    if (!Profile) return;
    std::lock_guard<std::mutex> Guard(GLock);
    GProfile.Name = Profile->Name ? Profile->Name : "";
    GProfile.RepeatMs = Profile->RepeatMs;
    GProfile.MinIntervalMs = Profile->MinIntervalMs;
    if (Profile->Rules && Profile->RuleCount > 0)
    {
        GRules.clear();
        for (uint32_t I = 0; I < Profile->RuleCount; ++I)
        {
            const FomLogRule& Rule = Profile->Rules[I];
            RuleEntry Entry;
            Entry.Tag = Rule.Tag ? Rule.Tag : "";
            Entry.RepeatMs = Rule.RepeatMs;
            Entry.MinIntervalMs = Rule.MinIntervalMs;
            Entry.Suppress = Rule.Suppress != 0;
            if (Rule.Ids && Rule.IdCount > 0)
            {
                Entry.Ids.assign(Rule.Ids, Rule.Ids + Rule.IdCount);
            }
            GRules.push_back(Entry);
        }
    }
}

FOM_PI_API void FomLogSetProfileSimple(const char* Name, int32_t RepeatMs, int32_t MinIntervalMs)
{
    FomLogProfile Profile{};
    Profile.Name = Name;
    Profile.RepeatMs = RepeatMs;
    Profile.MinIntervalMs = MinIntervalMs;
    Profile.Rules = nullptr;
    Profile.RuleCount = 0;
    FomLogSetProfile(&Profile);
}

FOM_PI_API void FomLogAddRuleSimple(const char* Tag, const uint8_t* Ids, uint32_t IdCount, int32_t RepeatMs, int32_t MinIntervalMs, int32_t Suppress)
{
    FomLogRule Rule{};
    Rule.Tag = Tag;
    Rule.Ids = Ids;
    Rule.IdCount = IdCount;
    Rule.RepeatMs = RepeatMs;
    Rule.MinIntervalMs = MinIntervalMs;
    Rule.Suppress = Suppress != 0;
    FomLogAddRule(&Rule);
}

FOM_PI_API void FomLogSetAllowConsoleIds(const uint8_t* Ids, uint32_t Count)
{
    std::lock_guard<std::mutex> Guard(GLock);
    GAllowConsoleIds.clear();
    if (Ids && Count > 0)
    {
        GAllowConsoleIds.assign(Ids, Ids + Count);
    }
}

FOM_PI_API void FomLogSetAllowFileIds(const uint8_t* Ids, uint32_t Count)
{
    std::lock_guard<std::mutex> Guard(GLock);
    GAllowFileIds.clear();
    if (Ids && Count > 0)
    {
        GAllowFileIds.assign(Ids, Ids + Count);
    }
}

FOM_PI_API void FomLogSetIgnoreIds(const uint8_t* Ids, uint32_t Count)
{
    std::lock_guard<std::mutex> Guard(GLock);
    GIgnoreIds.clear();
    if (Ids && Count > 0)
    {
        GIgnoreIds.assign(Ids, Ids + Count);
    }
}

static int FomLogLoadConfigFileImpl(const char* Path)
{
    std::lock_guard<std::mutex> Guard(GLock);
    GConfigFileAttempted = true;
    const std::string ResolvedPath = ResolveConfigPath(Path);
    if (ResolvedPath.empty())
    {
        return 0;
    }
    return LoadConfigFromIniPathLocked(ResolvedPath.c_str()) ? 1 : 0;
}

FOM_PI_API int FomLogLoadConfigFile(const char* Path)
{
#ifdef _WIN32
    __try
    {
        return FomLogLoadConfigFileImpl(Path);
    }
    __except(EXCEPTION_EXECUTE_HANDLER)
    {
        return 0;
    }
#else
    return FomLogLoadConfigFileImpl(Path);
#endif
}

static std::string BuildTag(const FomInspectResult& Inspect, const FomLogEvent* Evt)
{
    const char* Layer = (Inspect.Layer == FomLayerLith) ? "Lith" : "Rak";
    const char* Dir = nullptr;
    if (Evt && Evt->TagOverride && Evt->TagOverride[0])
    {
        if (Stricmp(Evt->TagOverride, "Raw_SendTo") == 0)
        {
            Dir = "Send";
        }
        else if (Stricmp(Evt->TagOverride, "Raw_Recv") == 0)
        {
            Dir = "Recv";
        }
        else
        {
            Dir = Evt->TagOverride;
        }
    }
    else
    {
        Dir = (Evt && Evt->Direction == FomLogDirSend) ? "Net_SendTo" : "Net_Recv";
    }
    std::string Tag;
    Tag.reserve(32);
    Tag.append(Layer);
    Tag.append("][");
    Tag.append(Dir);
    return Tag;
}

static std::string BuildSignature(const std::string& Tag, const FomLogEvent* Evt, uint8_t EffectiveId)
{
    const char* Addr = (Evt && Evt->Address && Evt->Address[0]) ? Evt->Address : "unknown";
    const uint16_t Port = Evt ? Evt->Port : 0;
    const int32_t Conn = Evt ? Evt->ConnectionId : -1;
    const uint32_t Length = Evt ? Evt->Length : 0;

    char ConnBuf[32] = {0};
    const char* ConnTag = "no-conn";
    if (Conn >= 0)
    {
        SnprintfS(ConnBuf, sizeof(ConnBuf), _TRUNCATE, "#%d", Conn);
        ConnTag = ConnBuf;
    }

    char Sig[256] = {0};
    SnprintfS(Sig, sizeof(Sig), _TRUNCATE, "%s|%s:%u|%s|len=%u|id=0x%02X",
                Tag.c_str(), Addr, Port, ConnTag, Length, EffectiveId & 0XFF);
    return std::string(Sig);
}

static int FomLogProcessEventImpl(const FomLogEvent* Evt, FomLogTarget Target, FomLogMode Mode, char* OutBuffer, uint32_t OutBufferSize, FomLogDecision* OutDecision)
{
    std::lock_guard<std::mutex> Guard(GLock);
    if (!GConfig.Enabled) return 0;

    if (Evt->Direction == FomLogDirRecv && !GConfig.LogRecv) return 0;
    if (Evt->Direction == FomLogDirSend && !GConfig.LogSend) return 0;

    FomInspectResult Inspect{};
    InspectPacketPipeline(Evt->Data, Evt->Length, Evt, &Inspect);

    if (Evt->ForceId >= 0)
    {
        Inspect.EffectiveId = static_cast<uint8_t>(Evt->ForceId & 0XFF);
    }
    if (Evt->LayerOverride >= 0)
    {
        Inspect.Layer = static_cast<FomPacketLayer>(Evt->LayerOverride);
    }

    const uint8_t EffectiveId = Inspect.EffectiveId;

    if (!GIgnoreIds.empty() && IdInList(EffectiveId, GIgnoreIds))
    {
        return 0;
    }

    if (Target == FomLogTargetConsole && !GAllowConsoleIds.empty())
    {
        if (!IdInList(EffectiveId, GAllowConsoleIds)) return 0;
    }
    if (Target == FomLogTargetFile && !GAllowFileIds.empty())
    {
        if (!IdInList(EffectiveId, GAllowFileIds)) return 0;
    }

    const std::string Tag = BuildTag(Inspect, Evt);
    bool ForceSuppress = false;
    int MinInterval = GConfig.MinIntervalMs;
    int RepeatMs = GConfig.RepeatSuppressMs;
    GetProfileOverrides(Tag, EffectiveId, &MinInterval, &RepeatMs, &ForceSuppress);
    if (ForceSuppress)
    {
        return 0;
    }

    const bool Suppress = (Target == FomLogTargetConsole)
        ? (GConfig.SuppressRepeats != 0)
        : (GConfig.SuppressRepeatsInFile != 0);

    uint32_t Suppressed = 0;
    if (Suppress)
    {
        const std::string Sig = BuildSignature(Tag, Evt, EffectiveId);
        const uint64_t Now = NowMs();
        std::unordered_map<std::string, RepeatState>& StateMap =
            (Target == FomLogTargetConsole) ? GRepeatConsole : GRepeatFile;
        RepeatState& State = StateMap[Sig];
        if (State.LastLoggedMs != 0)
        {
            if (MinInterval > 0 && (Now - State.LastLoggedMs) < static_cast<uint64_t>(MinInterval))
            {
                State.Suppressed += 1;
                return 0;
            }
            if (RepeatMs > 0 && (Now - State.LastLoggedMs) < static_cast<uint64_t>(RepeatMs))
            {
                State.Suppressed += 1;
                return 0;
            }
        }
        Suppressed = State.Suppressed;
        State.Suppressed = 0;
        State.LastLoggedMs = Now;
    }

    if (OutDecision)
    {
        OutDecision->ShouldLog = 1;
        OutDecision->Suppressed = Suppressed;
        OutDecision->Inspect = Inspect;
    }

    if (!OutBuffer || OutBufferSize == 0) return 1;

    std::string Line;
    Line.reserve(512);
    const std::string Time = FormatTimestamp();
    const std::string IdLabel = BuildIdLabel(Inspect, Evt, Evt->Direction);
    char Header[256] = {0};
    const char* Addr = (Evt->Address && Evt->Address[0]) ? Evt->Address : "unknown";
    const uint16_t Port = Evt->Port;
    const int32_t Conn = Evt->ConnectionId;
    char ConnBuf[32] = {0};
    const char* ConnTag = "none";
    if (Conn >= 0)
    {
        SnprintfS(ConnBuf, sizeof(ConnBuf), _TRUNCATE, "%d", Conn);
        ConnTag = ConnBuf;
    }

    if (GConfig.DispatchStatus)
    {
        char Status[256] = {0};
        const char* ModeLabel = DispatchModeToString(Inspect.DispatchMode);
        const char* ReasonLabel = DispatchReasonToString(Inspect.DispatchReason);
        const char* LayerLabel = (Inspect.Layer == FomLayerLith) ? "Lith" : "Rak";
        SnprintfS(Status, sizeof(Status), _TRUNCATE,
                    "[%s][Dispatch] mode=%s ok=%u id=0x%02X inner=0x%02X layer=%s offBits=%u bits=%u reason=%s",
                    Time.c_str(),
                    ModeLabel ? ModeLabel : "unknown",
                    Inspect.DispatchOk ? 1U : 0U,
                    Inspect.EffectiveId & 0XFF,
                    Inspect.InnerId & 0XFF,
                    LayerLabel,
                    Inspect.PayloadOffsetBits,
                    Inspect.PayloadBitLength,
                    ReasonLabel ? ReasonLabel : "unknown");
        Line.append(Status);
        Line.append("\n");
    }

    if (GConfig.IncludeAddr || GConfig.IncludeConn)
    {
        if (GConfig.IncludeAddr && GConfig.IncludeConn)
        {
            SnprintfS(Header, sizeof(Header), _TRUNCATE,
                        "[%s][%s][%s] len=%u addr=%s:%u conn=%s",
                        Time.c_str(), IdLabel.c_str(), Tag.c_str(), Evt->Length, Addr, Port, ConnTag);
        }
        else if (GConfig.IncludeAddr)
        {
            SnprintfS(Header, sizeof(Header), _TRUNCATE,
                        "[%s][%s][%s] len=%u addr=%s:%u",
                        Time.c_str(), IdLabel.c_str(), Tag.c_str(), Evt->Length, Addr, Port);
        }
        else
        {
            SnprintfS(Header, sizeof(Header), _TRUNCATE,
                        "[%s][%s][%s] len=%u conn=%s",
                        Time.c_str(), IdLabel.c_str(), Tag.c_str(), Evt->Length, ConnTag);
        }
    }
    else
    {
        SnprintfS(Header, sizeof(Header), _TRUNCATE,
                    "[%s][%s][%s] len=%u",
                    Time.c_str(), IdLabel.c_str(), Tag.c_str(), Evt->Length);
    }

    if (Target == FomLogTargetConsole && GConfig.EmitAnsiConsole)
    {
        const char* Reset = "\x1b[0m";
        const char* Dim = "\x1b[90m";
        const char* Cyan = "\x1b[36m";
        const char* Yellow = "\x1b[33m";
        std::string Layer = Tag;
        std::string Dir = "";
        size_t Sep = Tag.find("][");
        if (Sep != std::string::npos)
        {
            Layer = Tag.substr(0, Sep);
            Dir = Tag.substr(Sep + 2);
        }
        char IdBuf[256] = {0};
        SnprintfS(IdBuf, sizeof(IdBuf), _TRUNCATE, "%s", IdLabel.c_str());
        std::string LineHeader;
        LineHeader.reserve(256);
        LineHeader.append("[");
        LineHeader.append(Dim).append(Time).append(Reset);
        LineHeader.append("][");
        LineHeader.append(Yellow).append(IdBuf).append(Reset);
        LineHeader.append("][");
        LineHeader.append(Cyan).append(Layer).append(Reset);
        LineHeader.append("]");
        if (!Dir.empty())
        {
            LineHeader.append("[");
            LineHeader.append(Cyan).append(Dir).append(Reset);
            LineHeader.append("]");
        }
        LineHeader.push_back(' ');
        if (GConfig.IncludeAddr || GConfig.IncludeConn)
        {
            char AddrBuf[128] = {0};
            if (GConfig.IncludeAddr && GConfig.IncludeConn)
            {
                SnprintfS(AddrBuf, sizeof(AddrBuf), _TRUNCATE,
                            "len=%u addr=%s:%u conn=%s", Evt->Length, Addr, Port, ConnTag);
            }
            else if (GConfig.IncludeAddr)
            {
                SnprintfS(AddrBuf, sizeof(AddrBuf), _TRUNCATE,
                            "len=%u addr=%s:%u", Evt->Length, Addr, Port);
            }
            else
            {
                SnprintfS(AddrBuf, sizeof(AddrBuf), _TRUNCATE,
                            "len=%u conn=%s", Evt->Length, ConnTag);
            }
            std::string AddrStr(AddrBuf);
            size_t AddrPos = AddrStr.find("addr=");
            if (AddrPos != std::string::npos)
            {
                const size_t ValueStart = AddrPos + 5;
                const size_t ValueEnd = AddrStr.find(' ', ValueStart);
                if (ValueEnd == std::string::npos)
                {
                    AddrStr.insert(ValueStart, Dim);
                    AddrStr.append(Reset);
                }
                else
                {
                    AddrStr.insert(ValueStart, Dim);
                    AddrStr.insert(ValueEnd + strlen(Dim), Reset);
                }
            }
            LineHeader.append(AddrStr);
        }
        else
        {
            char LenBuf[64] = {0};
            SnprintfS(LenBuf, sizeof(LenBuf), _TRUNCATE, "len=%u", Evt->Length);
            LineHeader.append(LenBuf);
        }
        Line.append(LineHeader);
    }
    else
    {
        Line.append(Header);
    }
    Line.append("\n");

    std::vector<uint8_t> HighlightMask;
    if (Mode == FomLogModeFull && GConfig.LogHex &&
        Target == FomLogTargetConsole && GConfig.EmitAnsiConsole)
    {
        const uint32_t MaskLength = (GConfig.MaxDumpBytes > 0 && Evt->Length > GConfig.MaxDumpBytes)
                                         ? GConfig.MaxDumpBytes
                                         : Evt->Length;
        if (MaskLength > 0)
        {
            HighlightMask.assign(MaskLength, 0);
            auto Mark = [&HighlightMask](uint32_t Index, uint8_t Flag)
            {
                if (Index < HighlightMask.size())
                {
                    HighlightMask[Index] |= Flag;
                }
            };

            Mark(0, FomHexHighlightOuter);

            if (Inspect.HasTimestamp)
            {
                const uint32_t TsBytes = Inspect.TimestampBytes;
                for (uint32_t I = 0; I < TsBytes; ++I)
                {
                    Mark(1 + I, FomHexHighlightTimestamp);
                }
                Mark(1 + TsBytes, FomHexHighlightInner);
            }

            if (Inspect.PayloadOffset < MaskLength)
            {
                Mark(Inspect.PayloadOffset, FomHexHighlightInner);
            }

            if (Inspect.InnerId == ID_USER_PACKET_ENUM && Inspect.PayloadOffset + 1 < MaskLength)
            {
                Mark(Inspect.PayloadOffset + 1, FomHexHighlightLith);
            }

            if (Inspect.InnerId == 0X0D && Inspect.PayloadOffset + 1 < MaskLength)
            {
                Mark(Inspect.PayloadOffset + 1, FomHexHighlightLith);
            }

            if (Inspect.EffectiveId == 0X0E)
            {
                uint32_t GroupOffset = 0;
                uint8_t SubId = 0;
                if (FindLithPacketGroupOffset(Evt->Data, MaskLength, &GroupOffset, &SubId))
                {
                    Mark(GroupOffset, FomHexHighlightScan);
                    if (GroupOffset + 2 < MaskLength)
                    {
                        Mark(GroupOffset + 2, FomHexHighlightScan);
                    }
                }
            }

            if (IsRakGameId(Inspect.EffectiveId))
            {
                uint8_t FoundId = 0;
                const int32_t Offset = FindRakGameIdOffset(Evt->Data, MaskLength, 0, &FoundId);
                if (Offset >= 0 && FoundId == Inspect.EffectiveId)
                {
                    Mark(static_cast<uint32_t>(Offset), FomHexHighlightScan);
                }
            }
        }
    }

    if (Mode == FomLogModeFull && GConfig.LogHex)
    {
        if (Target == FomLogTargetConsole && GConfig.EmitAnsiConsole)
        {
            if (!HighlightMask.empty())
            {
                AppendHexDumpAnsiMasked(Evt->Data, Evt->Length, GConfig.MaxDumpBytes,
                                        HighlightMask.data(),
                                        static_cast<uint32_t>(HighlightMask.size()),
                                        Line);
            }
            else
            {
                AppendHexDumpAnsi(Evt->Data, Evt->Length, GConfig.MaxDumpBytes, Line);
            }
        }
        else
        {
            AppendHexDump(Evt->Data, Evt->Length, GConfig.MaxDumpBytes, Line);
        }
    }

    const uint32_t CopyLen = static_cast<uint32_t>(std::min<size_t>(Line.size(), OutBufferSize - 1));
    std::memcpy(OutBuffer, Line.c_str(), CopyLen);
    OutBuffer[CopyLen] = '\0';
    return 1;
}

FOM_PI_API int FomLogProcessEvent(const FomLogEvent* Evt, FomLogTarget Target, FomLogMode Mode, char* OutBuffer, uint32_t OutBufferSize, FomLogDecision* OutDecision)
{
    if (OutBuffer && OutBufferSize > 0)
    {
        OutBuffer[0] = '\0';
    }
    if (OutDecision)
    {
        *OutDecision = {};
    }
    if (!Evt || !Evt->Data || Evt->Length == 0) return 0;

#ifdef _WIN32
    __try
    {
        return FomLogProcessEventImpl(Evt, Target, Mode, OutBuffer, OutBufferSize, OutDecision);
    }
    __except(EXCEPTION_EXECUTE_HANDLER)
    {
        return 0;
    }
#else
    return FomLogProcessEventImpl(Evt, Target, Mode, OutBuffer, OutBufferSize, OutDecision);
#endif
}

FOM_PI_API int FomLogProcessEventSimple(const uint8_t* Data, uint32_t Length, uint32_t BitLength, int32_t Direction, const char* TagOverride, const char* Address, uint16_t Port, int32_t ConnectionId, int32_t ForceId, int32_t LayerOverride, int32_t Target, int32_t Mode, char* OutBuffer, uint32_t OutBufferSize, FomLogDecision* OutDecision)
{
    FomLogEvent Evt{};
    Evt.Data = Data;
    Evt.Length = Length;
    Evt.BitLength = BitLength;
    Evt.Direction = (Direction == FomLogDirSend) ? FomLogDirSend : FomLogDirRecv;
    Evt.TagOverride = TagOverride;
    Evt.Address = Address;
    Evt.Port = Port;
    Evt.ConnectionId = ConnectionId;
    Evt.ForceId = ForceId;
    Evt.LayerOverride = LayerOverride;
    return FomLogProcessEvent(&Evt,
                              (Target == FomLogTargetFile) ? FomLogTargetFile : FomLogTargetConsole,
                              (Mode == FomLogModeSummary) ? FomLogModeSummary : FomLogModeFull,
                              OutBuffer,
                              OutBufferSize,
                              OutDecision);
}
