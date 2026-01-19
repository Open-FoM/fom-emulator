#include "FomInspect.h"
#include "FomConfig.h"
#include "FomIdTables.h"
#include "FomRakParse.h"
#include "FomSchema.h"

#include "raknet/MessageIdentifiers.h"
#include "raknet/RakNetTime.h"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>

struct SchemaOffsetCandidate
{
    FomSchemaDispatchResult Result{};
    uint32_t OffsetBits = 0;
    uint32_t PayloadBits = 0;
    int Score = -1;
};

static bool IsSchemaMsgId(uint8_t Id)
{
    switch (Id)
    {
        case 0X06:
        case 0X09:
        case 0X0E:
        case 0X19:
        case 0X7E:
            return true;
        default:
            return false;
    }
}

static int ScoreSchemaMsgId(uint8_t Id)
{
    switch (Id)
    {
        case 0X0E: return 200;
        case 0X19: return 150;
        case 0X0A: return 120;
        case 0X06: return 110;
        case 0X09: return 90;
        case 0X0C: return 60;
        case 0X7E: return 50;
        default: return 0;
    }
}

static bool CopyLithBitsToBuffer(const uint8_t* Data, uint32_t BitCount, uint32_t BitOffset, std::vector<uint8_t>& Out)
{
    if (!Data || BitCount == 0 || BitOffset >= BitCount)
    {
        return false;
    }

    const uint32_t RemainingBits = BitCount - BitOffset;
    const uint32_t RemainingBytes = BitsToBytes(RemainingBits);
    Out.assign(RemainingBytes, 0);

    LithBitReader Reader(Data, BitsToBytes(BitCount));
    Reader.BitCount = BitCount;
    Reader.Offset = BitOffset;

    uint32_t BitsLeft = RemainingBits;
    for (uint32_t I = 0; I < RemainingBytes; ++I)
    {
        const uint32_t Take = (BitsLeft >= 8U) ? 8U : BitsLeft;
        uint32_t Value = 0;
        if (!Reader.ReadBitsToUnsigned(Take, Value))
        {
            return false;
        }
        Out[I] = static_cast<uint8_t>(Value & 0XFFu);
        BitsLeft -= Take;
    }

    return true;
}

static bool TrySchemaOverrideAtBitOffset(const uint8_t* Data,
                                         uint32_t BitCount,
                                         uint32_t BitOffset,
                                         SchemaOffsetCandidate* Out)
{
    if (!Data || BitCount < 8 || BitOffset + 8 > BitCount || !Out)
    {
        return false;
    }

    LithBitReader Peek(Data, BitsToBytes(BitCount));
    Peek.BitCount = BitCount;
    Peek.Offset = BitOffset;
    uint32_t MsgIdValue = 0;
    if (!Peek.ReadBitsToUnsigned(8, MsgIdValue))
    {
        return false;
    }
    const uint8_t MsgId = static_cast<uint8_t>(MsgIdValue & 0XFFu);
    if (!IsSchemaMsgId(MsgId))
    {
        return false;
    }

    std::vector<uint8_t> Buffer;
    if (!CopyLithBitsToBuffer(Data, BitCount, BitOffset, Buffer))
    {
        return false;
    }

    FomSchemaDispatchResult Result{};
    const uint32_t PayloadBits = BitCount - BitOffset;
    if (!TrySchemaOverride(Buffer.data(), PayloadBits, &Result))
    {
        return false;
    }

    Out->Result = Result;
    Out->OffsetBits = BitOffset;
    Out->PayloadBits = PayloadBits;
    const uint8_t ScoreId = (Result.EffectiveId != 0) ? Result.EffectiveId : MsgId;
    Out->Score = ScoreSchemaMsgId(ScoreId);
    return true;
}

static bool FindSchemaOverrideByBitScan(const uint8_t* Data,
                                        uint32_t BitCount,
                                        SchemaOffsetCandidate* Out,
                                        uint32_t MinOffsetBits)
{
    if (!Data || BitCount < 8 || !Out)
    {
        return false;
    }

    SchemaOffsetCandidate Best{};
    Best.Score = -1;

    if (MinOffsetBits >= BitCount)
    {
        return false;
    }

    const uint32_t MaxOffset = BitCount - 8U;
    uint32_t StartOffset = MinOffsetBits;
    if (StartOffset > MaxOffset)
    {
        StartOffset = MaxOffset;
    }
    for (uint32_t BitOffset = StartOffset; BitOffset <= MaxOffset; ++BitOffset)
    {
        SchemaOffsetCandidate Candidate{};
        if (!TrySchemaOverrideAtBitOffset(Data, BitCount, BitOffset, &Candidate))
        {
            continue;
        }
        const int OffsetPenalty = static_cast<int>(Candidate.OffsetBits / 8U);
        const int ClampedPenalty = (OffsetPenalty > 32) ? 32 : OffsetPenalty;
        Candidate.Score -= ClampedPenalty;
        if (Candidate.Score > Best.Score || (Candidate.Score == Best.Score && Candidate.OffsetBits < Best.OffsetBits))
        {
            Best = Candidate;
        }
    }

    if (Best.Score < 0)
    {
        return false;
    }

    *Out = Best;
    return true;
}

void InspectPayloadIds(const uint8_t* Payload, uint32_t PayloadLength, FomInspectResult* Out)
{
    if (!Payload || PayloadLength == 0 || !Out) return;

    Out->InnerId = Payload[0];
    Out->EffectiveId = Out->InnerId;
    Out->LithId = 0;
    Out->Layer = FomLayerRak;

    if (Out->InnerId == ID_TIMESTAMP && !IsLithMessageId(Out->InnerId))
    {
        const uint32_t TsBytes = static_cast<uint32_t>(sizeof(RakNetTime));
        if (PayloadLength >= 1 + TsBytes + 1)
        {
            Out->HasTimestamp = 1;
            Out->TimestampBytes = static_cast<uint8_t>(TsBytes);
            uint64_t TsValue = 0;
            if (TsBytes == 8)
            {
                uint64_t Ts64 = 0;
                std::memcpy(&Ts64, Payload + 1, sizeof(uint64_t));
                TsValue = Ts64;
            }
            else if (TsBytes == 4)
            {
                uint32_t Ts32 = 0;
                std::memcpy(&Ts32, Payload + 1, sizeof(uint32_t));
                TsValue = Ts32;
            }
            Out->Timestamp = TsValue;
            Out->InnerId = Payload[1 + TsBytes];
            Out->EffectiveId = Out->InnerId;
        }
    }

    if (Out->InnerId == ID_USER_PACKET_ENUM && PayloadLength >= 2)
    {
        Out->LithId = Payload[1];
        if (IsLithMessageId(Out->LithId))
        {
            Out->EffectiveId = Out->LithId;
            Out->Layer = FomLayerLith;
            uint8_t InnerId = 0;
            if (TryDecodeLithInnerId(Payload + 1, PayloadLength - 1, &InnerId))
            {
                Out->InnerId = InnerId;
                Out->EffectiveId = InnerId;
            }
        }
        else
        {
            Out->EffectiveId = Out->InnerId;
            Out->Layer = FomLayerRak;
        }
    }
    else if (IsLithMessageId(Out->InnerId))
    {
        Out->Layer = FomLayerLith;
        Out->LithId = Out->InnerId;
        uint8_t InnerId = 0;
        if (TryDecodeLithInnerId(Payload, PayloadLength, &InnerId))
        {
            Out->InnerId = InnerId;
            Out->EffectiveId = InnerId;
        }
    }
    else
    {
        Out->Layer = FomLayerRak;
        Out->EffectiveId = Out->InnerId;
    }

    if (Out->Layer == FomLayerRak)
    {
        uint8_t GroupId = 0;
        if (TryScanLithPacketGroup(Payload, PayloadLength, &GroupId))
        {
            Out->Layer = FomLayerLith;
            Out->LithId = GroupId;
            Out->InnerId = GroupId;
            Out->EffectiveId = GroupId;
        }
    }

    if (Out->Layer == FomLayerLith)
    {
        const uint8_t* LithPayload = Payload;
        uint32_t LithLength = PayloadLength;
        if (PayloadLength > 1 && Payload[0] == ID_USER_PACKET_ENUM)
        {
            LithPayload = Payload + 1;
            LithLength = PayloadLength - 1;
        }

        if (Out->LithId == 0X0E)
        {
            uint32_t GroupOffset = 0;
            uint8_t InnerId = 0;
            if (FindLithPacketGroupOffset(LithPayload, LithLength, &GroupOffset, &InnerId))
            {
                Out->InnerId = InnerId;
                Out->EffectiveId = InnerId;
            }
        }

        const bool RequiresValidation =
            (Out->LithId == 0X09 || Out->LithId == 0X06 || Out->LithId == 0X0C || Out->LithId == 0X0A);
        if (RequiresValidation && !ValidateLithPayload(LithPayload, LithLength, Out->LithId))
        {
            Out->Layer = FomLayerRak;
            Out->LithId = 0;
            Out->EffectiveId = Out->InnerId;
        }
    }
}

int InspectPacketPipeline(const uint8_t* Data, uint32_t Length, const FomLogEvent* Evt, FomInspectResult* OutResult)
{
    if (!OutResult) return 0;
    *OutResult = {};
    FomInspectResult Inspect{};
    if (!Data || Length == 0)
    {
        OutResult->Error = FomInspectEmpty;
        return 0;
    }

    // Phase 0: initialize a conservative Rak view using the outer byte only.
    OutResult->OuterId = Data[0];
    OutResult->EffectiveId = Data[0];
    OutResult->Layer = FomLayerRak;
    OutResult->DispatchMode = FomDispatchRaw;
    OutResult->DispatchReason = FomDispatchReasonOk;
    OutResult->DispatchOk = 0;

    const uint8_t OuterId = OutResult->OuterId;
    const uint8_t OuterTop = static_cast<uint8_t>(OuterId & 0xC0);
    const bool IsReliabilityFrame = (OuterTop == 0x40 || OuterTop == 0x80 || OuterTop == 0xC0);
    const bool IsAckPacket = (OuterId == 0x80);
    const bool IsRawOffline = ((!IsReliabilityFrame && OuterId < ID_USER_PACKET_ENUM) || IsAckPacket);
    const bool IsRak01Pattern =
        (Length == 26 && OuterId == 0x40 && Data[0x0B] == 0x2E && Data[0x16] == 0x01);
    uint32_t PayloadOffsetBits = 0;
    uint32_t PayloadBitLength = 0;
    bool InternalOk = false;
    bool InternalPayloadValid = false;
    std::vector<uint8_t> PayloadBuffer;
    const uint8_t* PayloadPtr = Data;
    uint32_t PayloadBytes = Length;
    uint32_t RawPayloadOffsetBits = 0;
    uint32_t RawPayloadBitLength = Length * 8U;
    uint32_t InnerOffsetBytes = 0;
    const uint8_t* InnerPayload = Data;
    uint32_t InnerPayloadBits = Length * 8U;

    if (IsRak01Pattern)
    {
        OutResult->InnerId = 0x01;
        OutResult->EffectiveId = 0x01;
        OutResult->Layer = FomLayerRak;
        OutResult->DispatchMode = FomDispatchOverride;
        OutResult->DispatchReason = FomDispatchReasonOk;
        OutResult->DispatchOk = 1;
        OutResult->PayloadOffsetBits = 0;
        OutResult->PayloadBitLength = Length * 8U;
        OutResult->PayloadOffset = 0;
        OutResult->PayloadLength = Length;
    }

    if (!IsRak01Pattern && IsRawOffline)
    {
        OutResult->InnerId = OuterId;
        OutResult->EffectiveId = OuterId;
        OutResult->Layer = FomLayerRak;
        OutResult->DispatchMode = FomDispatchRaw;
        OutResult->DispatchReason = FomDispatchReasonOk;
        OutResult->DispatchOk = 1;
        OutResult->PayloadOffsetBits = 0;
        OutResult->PayloadBitLength = Length * 8U;
        OutResult->PayloadOffset = 0;
        OutResult->PayloadLength = Length;
    }

    if (!IsRak01Pattern && !IsRawOffline)
    {
        // Phase 1: attempt Rak internal parse to find the real payload offset/length.
        InternalOk = ParseRakInternalPayloadBits(Data, Length, OutResult, &PayloadOffsetBits, &PayloadBitLength);

        if (InternalOk)
        {
            InternalPayloadValid = PayloadBitLength > 0 && (PayloadOffsetBits + PayloadBitLength) <= (Length * 8U);
            if (InternalPayloadValid)
            {
                PayloadBytes = BitsToBytes(PayloadBitLength);
                PayloadBuffer.resize(PayloadBytes);
                RakBitReader Reader(Data, Length);
                Reader.Offset = PayloadOffsetBits;
                if (!Reader.ReadBits(PayloadBuffer.data(), PayloadBitLength, true))
                {
                    InternalPayloadValid = false;
                }
                else
                {
                    PayloadPtr = PayloadBuffer.data();
                    RawPayloadOffsetBits = PayloadOffsetBits;
                    RawPayloadBitLength = PayloadBitLength;
                }
            }
        }

        // If internal parse failed, fall back to raw payload view.
        if (!InternalPayloadValid)
        {
            PayloadPtr = Data;
            PayloadBytes = Length;
            RawPayloadOffsetBits = 0;
            RawPayloadBitLength = Length * 8U;
        }

        // Phase 2: unwrap timestamp and user-packet wrapper to find payload-relative msg id.
        if (PayloadBytes >= 1 && PayloadPtr[0] == ID_TIMESTAMP && !IsLithMessageId(PayloadPtr[0]))
        {
            const uint32_t TsBytes = static_cast<uint32_t>(sizeof(RakNetTime));
            if (PayloadBytes >= 1 + TsBytes + 1)
            {
                OutResult->HasTimestamp = 1;
                OutResult->TimestampBytes = static_cast<uint8_t>(TsBytes);
                uint64_t TsValue = 0;
                if (TsBytes == 8)
                {
                    uint64_t Ts64 = 0;
                    std::memcpy(&Ts64, PayloadPtr + 1, sizeof(uint64_t));
                    TsValue = Ts64;
                }
                else if (TsBytes == 4)
                {
                    uint32_t Ts32 = 0;
                    std::memcpy(&Ts32, PayloadPtr + 1, sizeof(uint32_t));
                    TsValue = Ts32;
                }
                OutResult->Timestamp = TsValue;
                InnerOffsetBytes = 1 + TsBytes;
            }
        }

        const bool IsInternalPingPayload =
            (InternalPayloadValid && PayloadBytes == (1u + sizeof(RakNetTime)) && PayloadPtr &&
             PayloadPtr[0] == ID_INTERNAL_PING);

        if (PayloadBytes >= InnerOffsetBytes + 2 && PayloadPtr[InnerOffsetBytes] == ID_USER_PACKET_ENUM && IsLithMessageId(PayloadPtr[InnerOffsetBytes + 1]))
        {
            InnerOffsetBytes += 1;
        }

        InnerPayload = (InnerOffsetBytes < PayloadBytes) ? (PayloadPtr + InnerOffsetBytes) : PayloadPtr;
        InnerPayloadBits = (RawPayloadBitLength > InnerOffsetBytes * 8U) ? (RawPayloadBitLength - InnerOffsetBytes * 8U) : 0;

        OutResult->PayloadOffsetBits = RawPayloadOffsetBits + InnerOffsetBytes * 8U;
        OutResult->PayloadBitLength = InnerPayloadBits;
        OutResult->PayloadOffset = OutResult->PayloadOffsetBits / 8U;
        OutResult->PayloadLength = BitsToBytes(InnerPayloadBits);

        // Phase 3: schema-first override dispatch (Lith-only).
        const uint8_t PayloadHead = (PayloadBytes > 0 && PayloadPtr) ? PayloadPtr[0] : 0;
        const bool PayloadIsRak = IsRakKnownId(PayloadHead);
        bool AllowSchema = false;
        if (InnerPayloadBits >= 8)
        {
            const uint8_t InnerHead = InnerPayload ? InnerPayload[0] : 0;
            if (IsLithMessageId(InnerHead))
            {
                AllowSchema = true;
            }
            else if (InnerHead == ID_USER_PACKET_ENUM && InnerPayloadBits >= 16 && InnerPayload)
            {
                if (IsLithMessageId(InnerPayload[1]))
                {
                    AllowSchema = true;
                }
            }
            else if (!IsRakKnownId(InnerHead))
            {
                // Unknown head (common in bit-packed Lith payloads) still allows schema scan.
                AllowSchema = true;
            }
        }

        FomSchemaDispatchResult SchemaResult{};
        bool SchemaOk = false;
        uint32_t SchemaBaseBits = OutResult->PayloadOffsetBits;
        uint32_t SchemaOffsetBits = 0;
        uint32_t SchemaPayloadBits = InnerPayloadBits;
        if (AllowSchema && InnerPayloadBits >= 8)
        {
            SchemaOk = TrySchemaOverride(InnerPayload, InnerPayloadBits, &SchemaResult);
            if (!SchemaOk)
            {
                SchemaOffsetCandidate Candidate{};
                if (FindSchemaOverrideByBitScan(InnerPayload, InnerPayloadBits, &Candidate, 0))
                {
                    SchemaOk = true;
                    SchemaResult = Candidate.Result;
                    SchemaOffsetBits = Candidate.OffsetBits;
                    SchemaPayloadBits = Candidate.PayloadBits;
                }
            }
        }
        const bool AllowRawSchemaScan =
            AllowSchema || (IsReliabilityFrame && PayloadHead == ID_INTERNAL_PING && !IsInternalPingPayload);
        if (!SchemaOk && AllowRawSchemaScan && Length >= 26)
        {
            SchemaOffsetCandidate Candidate{};
            const uint32_t RawBits = Length * 8U;
            const uint32_t MinRawOffsetBits = 0x10u * 8u;
            if (FindSchemaOverrideByBitScan(Data, RawBits, &Candidate, MinRawOffsetBits))
            {
                SchemaOk = true;
                SchemaResult = Candidate.Result;
                SchemaBaseBits = 0;
                SchemaOffsetBits = Candidate.OffsetBits;
                SchemaPayloadBits = Candidate.PayloadBits;
            }
        }

        Inspect = *OutResult;
        const bool SchemaAllowed = AllowSchema || SchemaOk;
        if (!SchemaAllowed)
        {
            Inspect.DispatchMode = FomDispatchRaw;
            Inspect.DispatchReason = FomDispatchReasonOk;
            Inspect.DispatchOk = 1;
        }
        else if (SchemaOk)
        {
            Inspect.Layer = SchemaResult.Layer;
            Inspect.EffectiveId = SchemaResult.EffectiveId;
            Inspect.InnerId = SchemaResult.InnerId != 0 ? SchemaResult.InnerId : SchemaResult.EffectiveId;
            Inspect.LithId = (SchemaResult.Layer == FomLayerLith) ? SchemaResult.OuterId : 0;
            Inspect.DispatchMode = static_cast<uint8_t>(SchemaResult.Mode);
            Inspect.DispatchReason = static_cast<uint8_t>(SchemaResult.Reason);
            Inspect.DispatchOk = SchemaResult.Ok ? 1 : 0;
            Inspect.PayloadOffsetBits = SchemaBaseBits + SchemaOffsetBits;
            Inspect.PayloadBitLength = SchemaPayloadBits;
            Inspect.PayloadOffset = Inspect.PayloadOffsetBits / 8U;
            Inspect.PayloadLength = BitsToBytes(Inspect.PayloadBitLength);
        }
        else
        {
            Inspect.DispatchMode = FomDispatchRaw;
            Inspect.DispatchReason = SchemaResult.Reason;
            Inspect.DispatchOk = 0;

            const bool AllowHeuristics = (GConfig.BestGuessParsing != 0) || (GConfig.StrictParsing == 0);
            if (AllowHeuristics)
            {
                InspectPayloadIds(PayloadPtr, PayloadBytes, &Inspect);
                Inspect.DispatchMode = FomDispatchHeuristic;
                Inspect.DispatchReason = (SchemaResult.Reason != FomDispatchReasonOk) ? SchemaResult.Reason : FomDispatchReasonOk;
                Inspect.DispatchOk = 1;
            }
            else
            {
                Inspect.DispatchReason = FomDispatchReasonHeuristicDisabled;
            }

            // Heuristic-only bit-scan for Lith payloads when internal parse failed.
            if (!InternalPayloadValid && AllowHeuristics)
            {
                const uint8_t OuterTop = static_cast<uint8_t>(OutResult->OuterId & 0XC0);
                if ((OuterTop == 0X40 || OuterTop == 0XC0))
                {
                    uint8_t OuterId = 0;
                    uint8_t InnerId = 0;
                    if (ScanForLithPayloadBits(Data, Length, &OuterId, &InnerId))
                    {
                        Inspect.Layer = FomLayerLith;
                        Inspect.LithId = OuterId;
                        Inspect.InnerId = InnerId != 0 ? InnerId : OuterId;
                        Inspect.EffectiveId = Inspect.InnerId;
                        Inspect.DispatchMode = FomDispatchHeuristic;
                        Inspect.DispatchReason = (SchemaResult.Reason != FomDispatchReasonOk) ? SchemaResult.Reason : FomDispatchReasonOk;
                        Inspect.DispatchOk = 1;
                    }
                }
            }
        }

        // Final fallback: if nothing claimed the packet, resolve to a Rak message id.
        if (PayloadIsRak && Inspect.Layer == FomLayerRak && Inspect.DispatchMode == FomDispatchRaw)
        {
            Inspect.InnerId = PayloadHead;
            Inspect.EffectiveId = PayloadHead;
        }
    }
    else
    {
        Inspect = *OutResult;
    }

    if (!Evt)
    {
        *OutResult = Inspect;
        return 1;
    }

    const bool Trace = IsTraceOffsetsEnabled();
    if (Trace && (Length == 26U || Length == 88U || Length == 89U || Length == 90U || Length == 91U || Length == 134U))
    {
        const uint8_t PayloadHead = (PayloadBytes > 0 && PayloadPtr) ? PayloadPtr[0] : 0;
        const uint8_t InnerHead = (InnerPayloadBits >= 8 && InnerPayload) ? InnerPayload[0] : 0;
        std::fprintf(stderr,
            "[FOM_PI_TRACE] len=%u internal_ok=%d payload_offset_bits=%u payload_bits=%u payload0=0x%02X inner0=0x%02X inner_off_bytes=%u effective=0x%02X layer=%s mode=%s\n",
            Length,
            InternalPayloadValid ? 1 : 0,
            RawPayloadOffsetBits,
            RawPayloadBitLength,
            PayloadHead,
            InnerHead,
            InnerOffsetBytes,
            Inspect.EffectiveId,
            Inspect.Layer == FomLayerLith ? "Lith" : "Rak",
            DispatchModeToString(Inspect.DispatchMode));
    }

    // Phase 4: emit the final selected inspect result.
    *OutResult = Inspect;
    return 1;
}

FOM_PI_API int FomInspectPacket(const uint8_t* Data, uint32_t Length, FomInspectResult* OutResult)
{
    return InspectPacketPipeline(Data, Length, nullptr, OutResult);
}

FOM_PI_API int FomClassifyPacketSimple(const uint8_t* Data,
                                       uint32_t Length,
                                       int32_t* OutEffectiveId,
                                       int32_t* OutLayer,
                                       int32_t* OutInnerId,
                                       uint32_t* OutPayloadOffset,
                                       uint32_t* OutPayloadLength,
                                       uint32_t* OutPayloadOffsetBits,
                                       uint32_t* OutPayloadBitLength,
                                       int32_t* OutDispatchMode,
                                       int32_t* OutDispatchReason)
{
    FomInspectResult Inspect{};
    if (!InspectPacketPipeline(Data, Length, nullptr, &Inspect))
    {
        return 0;
    }
    if (OutEffectiveId) *OutEffectiveId = static_cast<int32_t>(Inspect.EffectiveId);
    if (OutLayer) *OutLayer = static_cast<int32_t>(Inspect.Layer);
    if (OutInnerId) *OutInnerId = static_cast<int32_t>(Inspect.InnerId);
    if (OutPayloadOffset) *OutPayloadOffset = Inspect.PayloadOffset;
    if (OutPayloadLength) *OutPayloadLength = Inspect.PayloadLength;
    if (OutPayloadOffsetBits) *OutPayloadOffsetBits = Inspect.PayloadOffsetBits;
    if (OutPayloadBitLength) *OutPayloadBitLength = Inspect.PayloadBitLength;
    if (OutDispatchMode) *OutDispatchMode = static_cast<int32_t>(Inspect.DispatchMode);
    if (OutDispatchReason) *OutDispatchReason = static_cast<int32_t>(Inspect.DispatchReason);
    return 1;
}
