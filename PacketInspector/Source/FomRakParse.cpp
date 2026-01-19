#include "FomRakParse.h"

#include "FomConfig.h"
#include "raknet/InternalPacket.h"
#include "raknet/PacketPriority.h"
#include "raknet/RakNetDefines.h"

#include <cstdio>
#include <cstdlib>
#include <cstddef>
#include <mutex>
#include <string>

#ifdef _WIN32
#include <Windows.h>
#endif

#ifdef _WIN32
typedef int32_t (__cdecl *RakParseReliablePayloadFn)(const uint8_t* Data,
                                                     uint32_t Length,
                                                     uint32_t* OutPayloadOffset,
                                                     uint32_t* OutPayloadLength,
                                                     uint32_t* OutPayloadBits,
                                                     uint8_t* OutReliability);
typedef int32_t (__cdecl *RakParseReliablePayloadBitsFn)(const uint8_t* Data,
                                                         uint32_t Length,
                                                         uint32_t* OutPayloadOffset,
                                                         uint32_t* OutPayloadOffsetBits,
                                                         uint32_t* OutPayloadLength,
                                                         uint32_t* OutPayloadBits,
                                                         uint8_t* OutReliability);
#else
typedef int32_t (*RakParseReliablePayloadFn)(const uint8_t* Data,
                                             uint32_t Length,
                                             uint32_t* OutPayloadOffset,
                                             uint32_t* OutPayloadLength,
                                             uint32_t* OutPayloadBits,
                                             uint8_t* OutReliability);
typedef int32_t (*RakParseReliablePayloadBitsFn)(const uint8_t* Data,
                                                 uint32_t Length,
                                                 uint32_t* OutPayloadOffset,
                                                 uint32_t* OutPayloadOffsetBits,
                                                 uint32_t* OutPayloadLength,
                                                 uint32_t* OutPayloadBits,
                                                 uint8_t* OutReliability);
#endif

static std::once_flag GRakFfiOnce;
static RakParseReliablePayloadFn GRakParseReliablePayload = nullptr;
static RakParseReliablePayloadBitsFn GRakParseReliablePayloadBits = nullptr;
static void* GRakFfiModule = nullptr;

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
    if (!GetModuleHandleExA(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                            reinterpret_cast<LPCSTR>(&GetModuleDirectory),
                            &Module))
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

static bool TryLoadRakNetFfiModule(const char* Path)
{
#ifdef _WIN32
    if (!Path || !Path[0])
    {
        return false;
    }
    HMODULE Module = LoadLibraryA(Path);
    if (!Module)
    {
        return false;
    }
    auto ParseBitsFn = reinterpret_cast<RakParseReliablePayloadBitsFn>(GetProcAddress(Module, "rak_parse_reliable_payload_bits"));
    auto ParseFn = reinterpret_cast<RakParseReliablePayloadFn>(GetProcAddress(Module, "rak_parse_reliable_payload"));
    if (!ParseBitsFn && !ParseFn)
    {
        FreeLibrary(Module);
        return false;
    }
    GRakFfiModule = Module;
    GRakParseReliablePayloadBits = ParseBitsFn;
    GRakParseReliablePayload = ParseFn;
    return true;
#else
    (void)Path;
    return false;
#endif
}

static void InitRakNetFfi()
{
#ifdef _WIN32
    const char* EnvPath = std::getenv("FOM_RAKNET_FFI_PATH");
    if (EnvPath && EnvPath[0] && FileExists(EnvPath))
    {
        if (TryLoadRakNetFfiModule(EnvPath))
        {
            return;
        }
    }

    std::string ModuleDir;
    if (GetModuleDirectory(ModuleDir))
    {
        std::string Current = ModuleDir;
        for (int Depth = 0; Depth < 6; ++Depth)
        {
            std::string Candidate = JoinPath(Current, "Server\\packages\\networking\\native\\raknet_ffi.dll");
            if (FileExists(Candidate.c_str()) && TryLoadRakNetFfiModule(Candidate.c_str()))
            {
                return;
            }
            Candidate = JoinPath(Current, "raknet_ffi.dll");
            if (FileExists(Candidate.c_str()) && TryLoadRakNetFfiModule(Candidate.c_str()))
            {
                return;
            }
            size_t Slash = Current.find_last_of("\\/");
            if (Slash == std::string::npos)
            {
                break;
            }
            Current = Current.substr(0, Slash);
        }
    }

    char Cwd[MAX_PATH] = {0};
    if (GetCurrentDirectoryA(MAX_PATH, Cwd) > 0)
    {
        std::string CwdPath = JoinPath(Cwd, "Server\\packages\\networking\\native\\raknet_ffi.dll");
        if (FileExists(CwdPath.c_str()) && TryLoadRakNetFfiModule(CwdPath.c_str()))
        {
            return;
        }
        CwdPath = JoinPath(Cwd, "raknet_ffi.dll");
        if (FileExists(CwdPath.c_str()) && TryLoadRakNetFfiModule(CwdPath.c_str()))
        {
            return;
        }
    }

    TryLoadRakNetFfiModule("raknet_ffi.dll");
#endif
}

static RakParseReliablePayloadFn GetRakNetFfiParse()
{
    std::call_once(GRakFfiOnce, InitRakNetFfi);
    return GRakParseReliablePayload;
}

static RakParseReliablePayloadBitsFn GetRakNetFfiParseBits()
{
    std::call_once(GRakFfiOnce, InitRakNetFfi);
    return GRakParseReliablePayloadBits;
}

static bool SkipAckRanges(BitReader& Reader)
{
    uint32_t Count = 0;
    if (!Reader.ReadCompressedUnsigned(2, Count))
    {
        return false;
    }
    for (uint32_t I = 0; I < Count; ++I)
    {
        bool MaxEqual = false;
        if (!Reader.ReadBit(MaxEqual))
        {
            return false;
        }
        uint32_t MinValue = 0;
        if (!Reader.ReadUInt32(MinValue))
        {
            return false;
        }
        if (!MaxEqual)
        {
            uint32_t MaxValue = 0;
            if (!Reader.ReadUInt32(MaxValue))
            {
                return false;
            }
            if (MaxValue < MinValue)
            {
                return false;
            }
        }
    }
    return true;
}

static bool SkipAckRangesRak(RakBitReader& Reader)
{
    uint32_t Count = 0;
    if (!Reader.ReadCompressedUnsigned(2, Count))
    {
        return false;
    }
    for (uint32_t I = 0; I < Count; ++I)
    {
        bool MaxEqual = false;
        if (!Reader.ReadBit(MaxEqual))
        {
            return false;
        }
        uint32_t MinValue = 0;
        if (!Reader.ReadUInt32(MinValue))
        {
            return false;
        }
        if (!MaxEqual)
        {
            uint32_t MaxValue = 0;
            if (!Reader.ReadUInt32(MaxValue))
            {
                return false;
            }
            if (MaxValue < MinValue)
            {
                return false;
            }
        }
    }
    return true;
}

static bool ParseRakInternalPayloadImplFfi(const uint8_t* Data, uint32_t Length, FomInspectResult* Out, uint32_t* OutPayloadOffsetBits, uint32_t* OutPayloadBitLength)
{
    if (!Data || Length == 0 || !Out) return false;

    const bool TraceOffsets = IsTraceOffsetsEnabled();
    const bool TraceParse = IsTraceRakParseEnabled() || TraceOffsets;

    auto TraceFail = [&](const char* Stage)
    {
        if (TraceParse)
        {
            std::fprintf(stderr,
                         "[FOM_PI_TRACE_FAIL] reader=ffi stage=%s len=%u\n",
                         Stage,
                         Length);
        }
    };

    RakParseReliablePayloadBitsFn ParseBitsFn = GetRakNetFfiParseBits();
    RakParseReliablePayloadFn ParseFn = GetRakNetFfiParse();
    if (!ParseBitsFn && !ParseFn)
    {
        Out->Error = FomInspectParseFailed;
        TraceFail("ffi_not_loaded");
        return false;
    }

    uint32_t PayloadOffset = 0;
    uint32_t PayloadLength = 0;
    uint32_t PayloadBits = 0;
    uint8_t Reliability = 0;

    uint32_t PayloadOffsetBits = 0;
    bool ParseOk = false;
    if (ParseBitsFn)
    {
        ParseOk = ParseBitsFn(Data,
                              Length,
                              &PayloadOffset,
                              &PayloadOffsetBits,
                              &PayloadLength,
                              &PayloadBits,
                              &Reliability) != 0;
    }
    else
    {
        ParseOk = ParseFn && (ParseFn(Data, Length, &PayloadOffset, &PayloadLength, &PayloadBits, &Reliability) != 0);
        PayloadOffsetBits = PayloadOffset * 8U;
    }
    if (!ParseOk)
    {
        Out->Error = FomInspectParseFailed;
        TraceFail("ffi_parse");
        return false;
    }

    if (PayloadOffset + PayloadLength > Length)
    {
        Out->Error = FomInspectParseFailed;
        TraceFail("ffi_bounds");
        return false;
    }

    Out->PayloadOffset = PayloadOffset;
    Out->PayloadLength = PayloadLength;
    Out->IsReliable = (Reliability == RELIABLE || Reliability == RELIABLE_ORDERED || Reliability == RELIABLE_SEQUENCED) ? 1 : 0;

    if (OutPayloadOffsetBits)
    {
        *OutPayloadOffsetBits = PayloadOffsetBits;
    }
    if (OutPayloadBitLength)
    {
        *OutPayloadBitLength = PayloadBits;
    }
    return true;
}

static bool ParseRakInternalPayloadImpl(const uint8_t* Data, uint32_t Length, bool UseFlowControl, FomInspectResult* Out, uint32_t* OutPayloadOffsetBits, uint32_t* OutPayloadBitLength)
{
    if (!Data || Length == 0 || !Out) return false;

    BitReader Reader(Data, Length);
    const bool TraceOffsets = IsTraceOffsetsEnabled();
    const bool TraceParse = IsTraceRakParseEnabled() || TraceOffsets;
    const bool TraceVerbose = IsTraceRakParseVerboseEnabled();
    auto TraceFail = [&](const char* Stage)
    {
        if (TraceParse)
        {
            std::fprintf(stderr,
                         "[FOM_PI_TRACE_FAIL] reader=msb stage=%s len=%u flow=%d off=%u unread=%u\n",
                         Stage,
                         Length,
                         UseFlowControl ? 1 : 0,
                         Reader.GetReadOffsetBits(),
                         Reader.GetUnreadBits());
        }
    };
    auto TraceStep = [&](const char* Stage)
    {
        if (!TraceVerbose)
        {
            return;
        }
        std::fprintf(stderr,
                     "[FOM_PI_TRACE_STEP] reader=msb stage=%s len=%u flow=%d off=%u unread=%u\n",
                     Stage,
                     Length,
                     UseFlowControl ? 1 : 0,
                     Reader.GetReadOffsetBits(),
                     Reader.GetUnreadBits());
    };
    auto TraceValue = [&](const char* Stage, const char* Label, uint32_t Value)
    {
        if (!TraceVerbose)
        {
            return;
        }
        std::fprintf(stderr,
                     "[FOM_PI_TRACE_VAL] reader=msb stage=%s %s=%u len=%u flow=%d off=%u unread=%u\n",
                     Stage,
                     Label,
                     Value,
                     Length,
                     UseFlowControl ? 1 : 0,
                     Reader.GetReadOffsetBits(),
                     Reader.GetUnreadBits());
    };
    TraceStep("start");

    if (UseFlowControl)
    {
        bool HasAcks = false;
        if (!Reader.ReadBit(HasAcks))
        {
            TraceFail("flow_has_acks");
            return false;
        }
        TraceValue("flow_has_acks", "acks", HasAcks ? 1U : 0U);
        if (HasAcks)
        {
            uint32_t OurSystemTime = 0;
            uint16_t RemoteElapsedMs = 0;
            if (!Reader.ReadUInt32(OurSystemTime)) { TraceFail("flow_our_time"); return false; }
            if (!Reader.ReadUInt16(RemoteElapsedMs)) { TraceFail("flow_remote_elapsed"); return false; }
            if (!SkipAckRanges(Reader)) { TraceFail("flow_ack_ranges"); return false; }
            TraceValue("flow_acks", "our_time", OurSystemTime);
            TraceValue("flow_acks", "remote_elapsed", RemoteElapsedMs);
        }
        bool HasRemoteTime = false;
        if (!Reader.ReadBit(HasRemoteTime))
        {
            TraceFail("flow_has_remote_time");
            return false;
        }
        TraceValue("flow_has_remote_time", "remote_time", HasRemoteTime ? 1U : 0U);
        if (HasRemoteTime)
        {
            uint32_t RemoteTimeLow = 0;
            uint32_t RemoteTimeHigh = 0;
            if (!Reader.ReadUInt32(RemoteTimeLow)) { TraceFail("flow_remote_time_low"); return false; }
            if (!Reader.ReadUInt32(RemoteTimeHigh)) { TraceFail("flow_remote_time_high"); return false; }
            TraceValue("flow_remote_time", "low", RemoteTimeLow);
            TraceValue("flow_remote_time", "high", RemoteTimeHigh);
        }
    }

    if (Reader.GetUnreadBits() < sizeof(MessageNumberType) * 8U)
    {
        Out->Error = FomInspectAckOnly;
        TraceFail("message_number_bits");
        return false;
    }

    uint32_t MessageNumber = 0;
    if (!Reader.ReadUInt32(MessageNumber))
    {
        TraceFail("message_number");
        return false;
    }
    TraceValue("message_number", "value", MessageNumber);

    uint32_t ReliabilityBits = 0;
    if (!Reader.ReadBitsToUnsigned(3, ReliabilityBits))
    {
        TraceFail("reliability");
        return false;
    }
    TraceValue("reliability", "bits", ReliabilityBits);

    uint32_t ReliabilityFixed = ReliabilityBits;
    if (ReliabilityFixed >= NUMBER_OF_RELIABILITIES)
    {
        const uint32_t Reversed = ((ReliabilityBits & 1U) << 2) | (ReliabilityBits & 2U) | ((ReliabilityBits & 4U) >> 2);
        if (Reversed < NUMBER_OF_RELIABILITIES)
        {
            ReliabilityFixed = Reversed;
        }
        else
        {
            ReliabilityFixed &= 0X7u;
        }
    }
    const PacketReliability Reliability = static_cast<PacketReliability>(ReliabilityFixed);

    if (Reliability == UNRELIABLE_SEQUENCED || Reliability == RELIABLE_SEQUENCED || Reliability == RELIABLE_ORDERED)
    {
        uint32_t OrderingChannel = 0;
        if (!Reader.ReadBitsToUnsigned(5, OrderingChannel))
        {
            TraceFail("ordering_channel");
            return false;
        }
        uint32_t OrderingIndex = 0;
        if (!Reader.ReadUInt32(OrderingIndex))
        {
            TraceFail("ordering_index");
            return false;
        }
        TraceValue("ordering_channel", "channel", OrderingChannel);
        TraceValue("ordering_index", "index", OrderingIndex);
        (void)OrderingChannel;
        (void)OrderingIndex;
    }

    bool IsSplit = false;
    if (!Reader.ReadBit(IsSplit))
    {
        TraceFail("split_flag");
        return false;
    }
    TraceValue("split_flag", "split", IsSplit ? 1U : 0U);

    if (IsSplit)
    {
        uint16_t SplitPacketId = 0;
        uint32_t SplitIndex = 0;
        uint32_t SplitCount = 0;
        if (!Reader.ReadUInt16(SplitPacketId)) { TraceFail("split_id"); return false; }
        if (!Reader.ReadCompressedUnsigned(4, SplitIndex)) { TraceFail("split_index"); return false; }
        if (!Reader.ReadCompressedUnsigned(4, SplitCount)) { TraceFail("split_count"); return false; }
        TraceValue("split_id", "id", SplitPacketId);
        TraceValue("split_index", "index", SplitIndex);
        TraceValue("split_count", "count", SplitCount);
    }

    uint32_t DataBitLength = 0;
    const BitReader LengthReader = Reader;
    if (!Reader.ReadCompressedUnsigned(4, DataBitLength))
    {
        TraceFail("data_bit_length");
        return false;
    }
    if (DataBitLength == 0)
    {
        TraceFail("data_bit_length_zero");
        return false;
    }
    TraceValue("data_bit_length", "bits", DataBitLength);

    Reader.AlignToByteBoundary();
    const uint32_t PayloadOffsetBits = Reader.GetReadOffsetBits();
    const uint32_t PayloadEndBits = PayloadOffsetBits + DataBitLength;
    if (PayloadEndBits > Length * 8U)
    {
        BitReader FallbackReader = LengthReader;
        uint32_t FallbackDataBits = 0;
        if (FallbackReader.ReadCompressedUnsigned(2, FallbackDataBits))
        {
            FallbackReader.AlignToByteBoundary();
            const uint32_t FallbackOffsetBits = FallbackReader.GetReadOffsetBits();
            const uint32_t FallbackEndBits = FallbackOffsetBits + FallbackDataBits;
            if (FallbackDataBits > 0 && FallbackEndBits <= Length * 8U)
            {
                if (TraceParse)
                {
                    std::fprintf(stderr,
                        "[FOM_PI_TRACE_FALLBACK] reader=msb len=%u msg=%u rel=%u split=%u data_bits=%u payload_offset_bits=%u bitcount=%u flow=%d\n",
                        Length,
                        MessageNumber,
                        ReliabilityBits,
                        IsSplit ? 1U : 0U,
                        FallbackDataBits,
                        FallbackOffsetBits,
                        Length * 8U,
                        UseFlowControl ? 1 : 0);
                }
                Reader = FallbackReader;
                DataBitLength = FallbackDataBits;
            }
        }
    }

    const uint32_t FinalPayloadOffsetBits = Reader.GetReadOffsetBits();
    const uint32_t FinalPayloadEndBits = FinalPayloadOffsetBits + DataBitLength;
    if (FinalPayloadEndBits > Length * 8U)
    {
        if (TraceParse)
        {
            std::fprintf(stderr,
                "[FOM_PI_TRACE_BOUNDS] reader=msb len=%u msg=%u rel=%u split=%u data_bits=%u payload_offset_bits=%u bitcount=%u flow=%d\n",
                Length,
                MessageNumber,
                ReliabilityBits,
                IsSplit ? 1U : 0U,
                DataBitLength,
                FinalPayloadOffsetBits,
                Length * 8U,
                UseFlowControl ? 1 : 0);
        }
        TraceFail("payload_bounds");
        return false;
    }

    const uint32_t PayloadOffsetBytes = FinalPayloadOffsetBits / 8U;
    const uint32_t PayloadBytes = BitsToBytes((FinalPayloadOffsetBits & 7U) + DataBitLength);

    Out->PayloadOffset = PayloadOffsetBytes;
    Out->PayloadLength = PayloadBytes;
    Out->IsReliable = (Reliability == RELIABLE || Reliability == RELIABLE_ORDERED || Reliability == RELIABLE_SEQUENCED) ? 1 : 0;
    if (OutPayloadOffsetBits)
    {
        *OutPayloadOffsetBits = PayloadOffsetBits;
    }
    if (OutPayloadBitLength)
    {
        *OutPayloadBitLength = DataBitLength;
    }
    return true;
}

static bool ParseRakInternalPayloadImplRak(const uint8_t* Data, uint32_t Length, bool UseFlowControl, FomInspectResult* Out, uint32_t* OutPayloadOffsetBits, uint32_t* OutPayloadBitLength)
{
    if (!Data || Length == 0 || !Out) return false;

    RakBitReader Reader(Data, Length);
    const bool TraceOffsets = IsTraceOffsetsEnabled();
    const bool TraceParse = IsTraceRakParseEnabled() || TraceOffsets;
    const bool TraceVerbose = IsTraceRakParseVerboseEnabled();
    auto TraceFail = [&](const char* Stage)
    {
        if (TraceParse)
        {
            std::fprintf(stderr,
                         "[FOM_PI_TRACE_FAIL] reader=rak stage=%s len=%u flow=%d off=%u unread=%u\n",
                         Stage,
                         Length,
                         UseFlowControl ? 1 : 0,
                         Reader.Offset,
                         Reader.GetUnreadBits());
        }
    };
    auto TraceStep = [&](const char* Stage)
    {
        if (!TraceVerbose)
        {
            return;
        }
        std::fprintf(stderr,
                     "[FOM_PI_TRACE_STEP] reader=rak stage=%s len=%u flow=%d off=%u unread=%u\n",
                     Stage,
                     Length,
                     UseFlowControl ? 1 : 0,
                     Reader.Offset,
                     Reader.GetUnreadBits());
    };
    auto TraceValue = [&](const char* Stage, const char* Label, uint32_t Value)
    {
        if (!TraceVerbose)
        {
            return;
        }
        std::fprintf(stderr,
                     "[FOM_PI_TRACE_VAL] reader=rak stage=%s %s=%u len=%u flow=%d off=%u unread=%u\n",
                     Stage,
                     Label,
                     Value,
                     Length,
                     UseFlowControl ? 1 : 0,
                     Reader.Offset,
                     Reader.GetUnreadBits());
    };
    TraceStep("start");

    if (UseFlowControl)
    {
        bool HasAcks = false;
        if (!Reader.ReadBit(HasAcks))
        {
            TraceFail("flow_has_acks");
            return false;
        }
        TraceValue("flow_has_acks", "acks", HasAcks ? 1U : 0U);
        if (HasAcks)
        {
            uint32_t OurSystemTime = 0;
            uint16_t RemoteElapsedMs = 0;
            if (!Reader.ReadUInt32(OurSystemTime)) { TraceFail("flow_our_time"); return false; }
            if (!Reader.ReadUInt16(RemoteElapsedMs)) { TraceFail("flow_remote_elapsed"); return false; }
            if (!SkipAckRangesRak(Reader)) { TraceFail("flow_ack_ranges"); return false; }
            TraceValue("flow_acks", "our_time", OurSystemTime);
            TraceValue("flow_acks", "remote_elapsed", RemoteElapsedMs);
        }
        bool HasRemoteTime = false;
        if (!Reader.ReadBit(HasRemoteTime))
        {
            TraceFail("flow_has_remote_time");
            return false;
        }
        TraceValue("flow_has_remote_time", "remote_time", HasRemoteTime ? 1U : 0U);
        if (HasRemoteTime)
        {
            uint32_t RemoteTimeLow = 0;
            uint32_t RemoteTimeHigh = 0;
            if (!Reader.ReadUInt32(RemoteTimeLow)) { TraceFail("flow_remote_time_low"); return false; }
            if (!Reader.ReadUInt32(RemoteTimeHigh)) { TraceFail("flow_remote_time_high"); return false; }
            TraceValue("flow_remote_time", "low", RemoteTimeLow);
            TraceValue("flow_remote_time", "high", RemoteTimeHigh);
        }
    }

    if (Reader.GetUnreadBits() < sizeof(MessageNumberType) * 8U)
    {
        Out->Error = FomInspectAckOnly;
        TraceFail("message_number_bits");
        return false;
    }

    uint32_t MessageNumber = 0;
    if (!Reader.ReadUInt32(MessageNumber))
    {
        TraceFail("message_number");
        return false;
    }
    TraceValue("message_number", "value", MessageNumber);

    uint32_t ReliabilityBits = 0;
    if (!Reader.ReadBitsToUnsigned(3, ReliabilityBits))
    {
        TraceFail("reliability");
        return false;
    }
    TraceValue("reliability", "bits", ReliabilityBits);

    uint32_t ReliabilityFixed = ReliabilityBits;
    if (ReliabilityFixed >= NUMBER_OF_RELIABILITIES)
    {
        const uint32_t Reversed = ((ReliabilityBits & 1U) << 2) | (ReliabilityBits & 2U) | ((ReliabilityBits & 4U) >> 2);
        if (Reversed < NUMBER_OF_RELIABILITIES)
        {
            ReliabilityFixed = Reversed;
        }
        else
        {
            ReliabilityFixed &= 0X7u;
        }
    }
    const PacketReliability Reliability = static_cast<PacketReliability>(ReliabilityFixed);

    if (Reliability == UNRELIABLE_SEQUENCED || Reliability == RELIABLE_SEQUENCED || Reliability == RELIABLE_ORDERED)
    {
        uint32_t OrderingChannel = 0;
        if (!Reader.ReadBitsToUnsigned(5, OrderingChannel))
        {
            TraceFail("ordering_channel");
            return false;
        }
        uint32_t OrderingIndex = 0;
        if (!Reader.ReadUInt32(OrderingIndex))
        {
            TraceFail("ordering_index");
            return false;
        }
        TraceValue("ordering_channel", "channel", OrderingChannel);
        TraceValue("ordering_index", "index", OrderingIndex);
        (void)OrderingChannel;
        (void)OrderingIndex;
    }

    bool IsSplit = false;
    if (!Reader.ReadBit(IsSplit))
    {
        TraceFail("split_flag");
        return false;
    }
    TraceValue("split_flag", "split", IsSplit ? 1U : 0U);

    if (IsSplit)
    {
        uint16_t SplitPacketId = 0;
        uint32_t SplitIndex = 0;
        uint32_t SplitCount = 0;
        if (!Reader.ReadUInt16(SplitPacketId)) { TraceFail("split_id"); return false; }
        if (!Reader.ReadCompressedUnsigned(4, SplitIndex)) { TraceFail("split_index"); return false; }
        if (!Reader.ReadCompressedUnsigned(4, SplitCount)) { TraceFail("split_count"); return false; }
        TraceValue("split_id", "id", SplitPacketId);
        TraceValue("split_index", "index", SplitIndex);
        TraceValue("split_count", "count", SplitCount);
    }

    uint32_t DataBitLength = 0;
    const RakBitReader LengthReader = Reader;
    if (!Reader.ReadCompressedUnsigned(4, DataBitLength))
    {
        TraceFail("data_bit_length");
        return false;
    }
    if (DataBitLength == 0)
    {
        TraceFail("data_bit_length_zero");
        return false;
    }
    TraceValue("data_bit_length", "bits", DataBitLength);

    Reader.AlignToByteBoundary();
    const uint32_t PayloadOffsetBits = Reader.Offset;
    const uint32_t PayloadEndBits = PayloadOffsetBits + DataBitLength;
    if (PayloadEndBits > Length * 8U)
    {
        RakBitReader FallbackReader = LengthReader;
        uint32_t FallbackDataBits = 0;
        if (FallbackReader.ReadCompressedUnsigned(2, FallbackDataBits))
        {
            FallbackReader.AlignToByteBoundary();
            const uint32_t FallbackOffsetBits = FallbackReader.Offset;
            const uint32_t FallbackEndBits = FallbackOffsetBits + FallbackDataBits;
            if (FallbackDataBits > 0 && FallbackEndBits <= Length * 8U)
            {
                if (TraceParse)
                {
                    std::fprintf(stderr,
                        "[FOM_PI_TRACE_FALLBACK] reader=rak len=%u msg=%u rel=%u split=%u data_bits=%u payload_offset_bits=%u bitcount=%u flow=%d\n",
                        Length,
                        MessageNumber,
                        ReliabilityBits,
                        IsSplit ? 1U : 0U,
                        FallbackDataBits,
                        FallbackOffsetBits,
                        Length * 8U,
                        UseFlowControl ? 1 : 0);
                }
                Reader = FallbackReader;
                DataBitLength = FallbackDataBits;
            }
        }
    }

    const uint32_t FinalPayloadOffsetBits = Reader.Offset;
    const uint32_t FinalPayloadEndBits = FinalPayloadOffsetBits + DataBitLength;
    if (FinalPayloadEndBits > Length * 8U)
    {
        if (TraceParse)
        {
            std::fprintf(stderr,
                "[FOM_PI_TRACE_BOUNDS] reader=rak len=%u msg=%u rel=%u split=%u data_bits=%u payload_offset_bits=%u bitcount=%u flow=%d\n",
                Length,
                MessageNumber,
                ReliabilityBits,
                IsSplit ? 1U : 0U,
                DataBitLength,
                FinalPayloadOffsetBits,
                Length * 8U,
                UseFlowControl ? 1 : 0);
        }
        TraceFail("payload_bounds");
        return false;
    }

    const uint32_t PayloadOffsetBytes = FinalPayloadOffsetBits / 8U;
    const uint32_t PayloadBytes = BitsToBytes((FinalPayloadOffsetBits & 7U) + DataBitLength);

    Out->PayloadOffset = PayloadOffsetBytes;
    Out->PayloadLength = PayloadBytes;
    Out->IsReliable = (Reliability == RELIABLE || Reliability == RELIABLE_ORDERED || Reliability == RELIABLE_SEQUENCED) ? 1 : 0;
    if (OutPayloadOffsetBits)
    {
        *OutPayloadOffsetBits = PayloadOffsetBits;
    }
    if (OutPayloadBitLength)
    {
        *OutPayloadBitLength = DataBitLength;
    }
    return true;
}

bool ParseRakInternalPayload(const uint8_t* Data, uint32_t Length, FomInspectResult* Out)
{
    if (!Data || Length == 0 || !Out) return false;

    return ParseRakInternalPayloadImplFfi(Data, Length, Out, nullptr, nullptr);
}

bool ParseRakInternalPayloadBits(const uint8_t* Data, uint32_t Length, FomInspectResult* Out, uint32_t* OutPayloadOffsetBits, uint32_t* OutPayloadBitLength)
{
    if (!Data || Length == 0 || !Out) return false;

    return ParseRakInternalPayloadImplFfi(Data, Length, Out, OutPayloadOffsetBits, OutPayloadBitLength);
}
