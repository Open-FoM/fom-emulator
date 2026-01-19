#include "FomSchema.h"

#include "FomIdTables.h"
#include "FomRakParse.h"

#include <cstring>

struct SchemaEntry
{
    uint8_t Id = 0;
    const char* Name = nullptr;
    FomPacketLayer Layer = FomLayerUnknown;
    bool (*Parser)(LithBitReader& Reader, FomSchemaDispatchResult* Out) = nullptr;
};

static bool ReadBitsLE(LithBitReader& Reader, uint32_t Bits, uint32_t& OutValue)
{
    return Reader.ReadBitsToUnsigned(Bits, OutValue);
}

static bool ReadCompressed(LithBitReader& Reader, uint32_t SizeBytes, uint32_t& OutValue)
{
    return Reader.ReadCompressedUnsigned(SizeBytes, OutValue);
}

static bool ReadCompressedU8(LithBitReader& Reader, uint32_t& OutValue)
{
    return ReadCompressed(Reader, 1, OutValue);
}

static bool ReadCompressedU16(LithBitReader& Reader, uint32_t& OutValue)
{
    return ReadCompressed(Reader, 2, OutValue);
}

static bool ReadCompressedU32(LithBitReader& Reader, uint32_t& OutValue)
{
    return ReadCompressed(Reader, 4, OutValue);
}

static bool ReadFloatLSB(LithBitReader& Reader, float& OutValue)
{
    uint32_t Raw = 0;
    if (!ReadBitsLE(Reader, 32, Raw))
    {
        return false;
    }
    std::memcpy(&OutValue, &Raw, sizeof(float));
    return true;
}

static bool ReadCompactVec3S16(LithBitReader& Reader)
{
    uint32_t Raw = 0;
    if (!ReadCompressedU16(Reader, Raw)) return false;
    if (!ReadCompressedU16(Reader, Raw)) return false;
    if (!ReadCompressedU16(Reader, Raw)) return false;
    if (!ReadBitsLE(Reader, 9, Raw)) return false;
    return true;
}

static bool ReadAppearance(LithBitReader& Reader, bool* OutHasExtraSlots)
{
    uint32_t Dummy = 0;
    if (!ReadBitsLE(Reader, 1, Dummy)) return false; // isFemale
    if (!ReadBitsLE(Reader, 1, Dummy)) return false; // skinTone
    if (!ReadBitsLE(Reader, 5, Dummy)) return false; // headTexA
    if (!ReadBitsLE(Reader, 5, Dummy)) return false; // headTexB
    if (!ReadBitsLE(Reader, 32, Dummy)) return false; // unkU32
    if (!ReadBitsLE(Reader, 5, Dummy)) return false; // unk5bit
    if (!ReadBitsLE(Reader, 6, Dummy)) return false; // unk6bit
    if (!ReadBitsLE(Reader, 4, Dummy)) return false; // unk4bit
    if (!ReadBitsLE(Reader, 12, Dummy)) return false; // torso
    if (!ReadBitsLE(Reader, 12, Dummy)) return false; // legs
    if (!ReadBitsLE(Reader, 12, Dummy)) return false; // shoes

    bool HasExtra = false;
    if (!Reader.ReadBit(HasExtra)) return false;
    if (HasExtra)
    {
        for (int i = 0; i < 9; ++i)
        {
            if (!ReadBitsLE(Reader, 12, Dummy)) return false;
        }
    }

    for (int i = 0; i < 4; ++i)
    {
        if (!ReadBitsLE(Reader, 1, Dummy)) return false;
    }

    if (OutHasExtraSlots) *OutHasExtraSlots = HasExtra;
    return true;
}

static bool ReadString(LithBitReader& Reader, uint32_t MaxLen)
{
    if (MaxLen <= 1)
    {
        return true;
    }
    uint32_t Bits = 0;
    uint32_t Limit = MaxLen;
    while (Limit > 0)
    {
        Bits += 1;
        Limit >>= 1;
    }
    if (Bits == 0) return false;

    uint32_t Len = 0;
    if (!ReadBitsLE(Reader, Bits, Len)) return false;
    if (Len == 0) return true;
    if (Len > MaxLen) Len = MaxLen;

    uint32_t Dummy = 0;
    for (uint32_t i = 0; i < Len; ++i)
    {
        if (!ReadBitsLE(Reader, 8, Dummy)) return false;
    }
    return true;
}

static bool ParseLoadWorld(LithBitReader& Reader, FomSchemaDispatchResult* Out)
{
    uint32_t MsgId = 0;
    if (!ReadBitsLE(Reader, 8, MsgId) || MsgId != 0x06) return false;
    float GameTime = 0.0f;
    if (!ReadFloatLSB(Reader, GameTime)) return false;
    uint32_t WorldId = 0;
    if (!ReadBitsLE(Reader, 16, WorldId)) return false;
    if (Out)
    {
        Out->EffectiveId = 0x06;
        Out->InnerId = 0x06;
        Out->Layer = FomLayerLith;
    }
    return true;
}

static bool ParseConnectStage(LithBitReader& Reader, FomSchemaDispatchResult* Out)
{
    uint32_t MsgId = 0;
    if (!ReadBitsLE(Reader, 8, MsgId) || MsgId != 0x09) return false;
    uint32_t Stage = 0;
    if (!ReadBitsLE(Reader, 8, Stage)) return false;
    if (Stage > 1) return false;
    if (Out)
    {
        Out->EffectiveId = 0x09;
        Out->InnerId = 0x09;
        Out->Layer = FomLayerLith;
    }
    return true;
}

static int ScorePacketGroupInner(uint8_t Id)
{
    switch (Id)
    {
        case 0x06: return 100;
        case 0x0C: return 90;
        case 0x04: return 80;
        default: return 10;
    }
}

static bool ParsePacketGroup(LithBitReader& Reader, FomSchemaDispatchResult* Out)
{
    uint32_t MsgId = 0;
    if (!ReadBitsLE(Reader, 8, MsgId) || MsgId != 0x0E) return false;

    uint8_t BestInner = 0;
    int BestScore = -1;
    bool Found = false;

    while (Reader.GetUnreadBits() >= 8)
    {
        uint32_t SubBitsValue = 0;
        if (!ReadBitsLE(Reader, 8, SubBitsValue)) return false;
        const uint8_t SubBits = static_cast<uint8_t>(SubBitsValue & 0xFF);
        if (SubBits == 0)
        {
            break;
        }
        if (SubBits == 0xFF)
        {
            uint32_t Skip = 0;
            if (!ReadCompressed(Reader, sizeof(BitstreamLengthEncoding), Skip)) return false;
            const uint32_t SkipBits = Skip * 8U;
            if (Reader.GetUnreadBits() < SkipBits) return false;
            Reader.Offset += SkipBits;
            continue;
        }
        if (SubBits < 8)
        {
            continue;
        }
        uint32_t SubIdValue = 0;
        if (!ReadBitsLE(Reader, 8, SubIdValue)) return false;
        const uint8_t SubId = static_cast<uint8_t>(SubIdValue & 0xFF);
        const uint32_t RemainingBits = static_cast<uint32_t>(SubBits - 8);
        if (Reader.GetUnreadBits() < RemainingBits) return false;

        const int Score = ScorePacketGroupInner(SubId);
        if (Score > BestScore)
        {
            BestScore = Score;
            BestInner = SubId;
            Found = true;
        }
        Reader.Offset += RemainingBits;
    }

    if (!Found) return false;
    if (Out)
    {
        Out->EffectiveId = BestInner;
        Out->InnerId = BestInner;
        Out->Layer = FomLayerLith;
    }
    return true;
}

static bool ReadWorldUpdateOptionalTail(LithBitReader& Reader)
{
    uint32_t Dummy = 0;
    if (!ReadBitsLE(Reader, 8, Dummy)) return false;  // opt_u8_162
    if (!ReadBitsLE(Reader, 3, Dummy)) return false;  // opt_3bits_176
    bool Bit = false;
    if (!Reader.ReadBit(Bit)) return false;           // opt_flag184
    if (!ReadBitsLE(Reader, 10, Dummy)) return false; // opt_10bits_188
    if (!ReadBitsLE(Reader, 10, Dummy)) return false; // opt_10bits_192
    if (!Reader.ReadBit(Bit)) return false;           // opt_flag164
    return true;
}

static bool ReadWorldUpdateOptionalFields(LithBitReader& Reader, bool HasProfileExtras)
{
    uint32_t Dummy = 0;
    bool Bit = false;

    if (!ReadBitsLE(Reader, 8, Dummy)) return false; // pitch

    if (!Reader.ReadBit(Bit)) return false; // opt12_present
    if (Bit && !ReadBitsLE(Reader, 12, Dummy)) return false;

    if (!Reader.ReadBit(Bit)) return false; // opt5_present
    if (Bit && !ReadBitsLE(Reader, 5, Dummy)) return false;

    if (!Reader.ReadBit(Bit)) return false; // group134_present
    if (Bit)
    {
        if (!ReadCompressedU16(Reader, Dummy)) return false;
        if (!Reader.ReadBit(Bit)) return false; // opt_flag116
        if (!Reader.ReadBit(Bit)) return false; // opt7_present
        if (Bit)
        {
            if (!ReadBitsLE(Reader, 7, Dummy)) return false;
            if (Dummy != 0)
            {
                if (!ReadCompactVec3S16(Reader)) return false;
            }
        }
    }

    if (!Reader.ReadBit(Bit)) return false; // nibbles_present
    if (Bit)
    {
        if (!ReadBitsLE(Reader, 4, Dummy)) return false;
        if (!ReadBitsLE(Reader, 4, Dummy)) return false;
    }

    if (!Reader.ReadBit(Bit)) return false; // opt6_present
    if (Bit && !ReadBitsLE(Reader, 6, Dummy)) return false;

    if (HasProfileExtras)
    {
        if (!Reader.ReadBit(Bit)) return false; // hasSlotItem
        if (Bit)
        {
            if (!ReadCompressedU16(Reader, Dummy)) return false;
            LithBitReader WithOpt = Reader;
            bool OkWith = false;
            if (ReadBitsLE(WithOpt, 7, Dummy))
            {
                OkWith = ReadWorldUpdateOptionalTail(WithOpt);
            }
            LithBitReader WithoutOpt = Reader;
            bool OkWithout = ReadWorldUpdateOptionalTail(WithoutOpt);
            if (OkWith)
            {
                Reader = WithOpt;
                return true;
            }
            if (OkWithout)
            {
                Reader = WithoutOpt;
                return true;
            }
            return false;
        }
    }

    return ReadWorldUpdateOptionalTail(Reader);
}

static bool ParseWorldUpdate(LithBitReader& Reader, FomSchemaDispatchResult* Out)
{
    uint32_t MsgId = 0;
    if (!ReadBitsLE(Reader, 8, MsgId) || MsgId != 0x19) return false;

    auto ReadU32Flexible = [](LithBitReader& R, uint32_t& OutValue) -> bool
    {
        LithBitReader Probe = R;
        if (ReadCompressedU32(Probe, OutValue))
        {
            R = Probe;
            return true;
        }
        Probe = R;
        if (ReadBitsLE(Probe, 32, OutValue))
        {
            R = Probe;
            return true;
        }
        return false;
    };

    uint32_t WorldInst = 0;
    if (!ReadU32Flexible(Reader, WorldInst)) return false;
    uint32_t Sequence = 0;
    if (!ReadU32Flexible(Reader, Sequence)) return false;

    if (Out)
    {
        Out->EffectiveId = 0x19;
        Out->InnerId = 0x19;
        Out->Layer = FomLayerLith;
    }
    return true;
}

static bool ParsePacketIdUpdate(LithBitReader& Reader, FomSchemaDispatchResult* Out)
{
    uint32_t Dummy = 0;
    uint32_t MsgId = 0;
    if (!ReadBitsLE(Reader, 8, MsgId) || MsgId != 0x7E) return false;
    while (Reader.GetUnreadBits() >= 8)
    {
        uint32_t Type = 0;
        if (!ReadCompressedU8(Reader, Type))
        {
            if (!ReadBitsLE(Reader, 8, Type)) return false;
        }
        if (Type == 0)
        {
            break;
        }
        if (Type == 1)
        {
            if (!ReadCompressedU32(Reader, Dummy)) return false;
            if (!ReadCompressedU32(Reader, Dummy)) return false;
            if (!ReadCompressedU8(Reader, Dummy)) return false;
            bool Bit = false;
            if (!Reader.ReadBit(Bit)) return false;
            if (Bit && !ReadCompressedU32(Reader, Dummy)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (Bit && !ReadBitsLE(Reader, 3, Dummy)) return false;
            if (!ReadCompressedU32(Reader, Dummy)) return false;
            Type = 2;
        }
        if (Type == 2)
        {
            if (!ReadCompressedU32(Reader, Dummy)) return false; // playerId
            if (!ReadCompactVec3S16(Reader)) return false;

            // Read_BitfieldBlock_0x30
            if (!ReadBitsLE(Reader, 1, Dummy)) return false;
            if (!ReadBitsLE(Reader, 1, Dummy)) return false;
            if (!ReadBitsLE(Reader, 5, Dummy)) return false;
            if (!ReadBitsLE(Reader, 5, Dummy)) return false;
            if (!ReadBitsLE(Reader, 32, Dummy)) return false;
            if (!ReadBitsLE(Reader, 5, Dummy)) return false;
            if (!ReadBitsLE(Reader, 6, Dummy)) return false;
            if (!ReadBitsLE(Reader, 4, Dummy)) return false;
            if (!ReadBitsLE(Reader, 12, Dummy)) return false;
            if (!ReadBitsLE(Reader, 12, Dummy)) return false;
            if (!ReadBitsLE(Reader, 12, Dummy)) return false;
            bool BitfieldHasExtra = false;
            if (!Reader.ReadBit(BitfieldHasExtra)) return false;
            if (BitfieldHasExtra)
            {
                for (int i = 0; i < 9; ++i)
                {
                    if (!ReadBitsLE(Reader, 12, Dummy)) return false;
                }
            }
            if (!ReadBitsLE(Reader, 1, Dummy)) return false;
            if (!ReadBitsLE(Reader, 1, Dummy)) return false;
            if (!ReadBitsLE(Reader, 1, Dummy)) return false;
            if (!ReadBitsLE(Reader, 1, Dummy)) return false;

            bool Flag84 = false;
            if (!Reader.ReadBit(Flag84)) return false;
            if (!Flag84)
            {
                if (!ReadBitsLE(Reader, 8, Dummy)) return false;
                uint32_t InputFlags = 0x10;
                bool Bit = false;
                if (!Reader.ReadBit(Bit)) return false;
                if (Bit)
                {
                    if (!ReadBitsLE(Reader, 12, InputFlags)) return false;
                }

                if (!Reader.ReadBit(Bit)) return false;
                if (Bit && !ReadBitsLE(Reader, 5, Dummy)) return false;

                if (!Reader.ReadBit(Bit)) return false;
                if (Bit)
                {
                    if (!ReadCompressedU16(Reader, Dummy)) return false;
                    if (!Reader.ReadBit(Bit)) return false;
                    bool HasField120 = false;
                    if (!Reader.ReadBit(HasField120)) return false;
                    if (HasField120)
                    {
                        if (!ReadBitsLE(Reader, 7, Dummy)) return false;
                        if (!ReadCompressedU16(Reader, Dummy)) return false;
                        if (!ReadCompressedU16(Reader, Dummy)) return false;
                        if (!ReadCompressedU16(Reader, Dummy)) return false;
                    }
                }

                bool HasField124 = false;
                if (!Reader.ReadBit(HasField124)) return false;
                if (HasField124)
                {
                    if (!ReadBitsLE(Reader, 4, Dummy)) return false;
                    if (!ReadBitsLE(Reader, 4, Dummy)) return false;
                }

                if (!Reader.ReadBit(Bit)) return false;
                if (Bit && !ReadBitsLE(Reader, 6, Dummy)) return false;

                if (BitfieldHasExtra)
                {
                    if (!Reader.ReadBit(Bit)) return false;
                    if (Bit && !ReadCompressedU16(Reader, Dummy)) return false;
                    if (!ReadBitsLE(Reader, 7, Dummy)) return false;
                }

                if (!ReadBitsLE(Reader, 8, Dummy)) return false;
                if (!ReadBitsLE(Reader, 3, Dummy)) return false;
                if (!Reader.ReadBit(Bit)) return false;
                if (!ReadBitsLE(Reader, 10, Dummy)) return false;
                if (!ReadBitsLE(Reader, 10, Dummy)) return false;
                if (!Reader.ReadBit(Bit)) return false;
            }
            continue;
        }
        if (Type == 3)
        {
            if (!ReadCompressedU32(Reader, Dummy)) return false;
            if (!ReadCompressedU16(Reader, Dummy)) return false;
            if (!ReadBitsLE(Reader, 3, Dummy)) return false;
            if (!ReadCompressedU8(Reader, Dummy)) return false;
            if (!ReadCompactVec3S16(Reader)) return false;
            if (!ReadBitsLE(Reader, 8, Dummy)) return false;
            if (Dummy == 0)
            {
                bool Bit = false;
                if (!Reader.ReadBit(Bit)) return false;
                if (!ReadBitsLE(Reader, 5, Dummy)) return false;
                if (!ReadBitsLE(Reader, 4, Dummy)) return false;
                uint32_t Field128 = 0;
                if (!Reader.ReadBit(Bit)) return false;
                if (Bit && !ReadBitsLE(Reader, 6, Field128)) return false;
                if (Field128 >= 2 && Field128 <= 4)
                {
                    if (!ReadCompressedU32(Reader, Dummy)) return false;
                }
                if (!ReadBitsLE(Reader, 14, Dummy)) return false;
            }
            continue;
        }
        if (Type == 4)
        {
            if (!ReadCompressedU32(Reader, Dummy)) return false;
            if (!ReadCompressedU16(Reader, Dummy)) return false;
            bool Bit = false;
            if (!Reader.ReadBit(Bit)) return false;
            if (!ReadBitsLE(Reader, 14, Dummy)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (!ReadCompactVec3S16(Reader)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (Bit && !ReadCompressedU32(Reader, Dummy)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (Bit && !ReadCompressedU32(Reader, Dummy)) return false;
            if (!Reader.ReadBit(Bit)) return false;
            if (Bit && !ReadCompressedU32(Reader, Dummy)) return false;
            if (!ReadString(Reader, 2048)) return false;
            continue;
        }
        return false;
    }

    if (Out)
    {
        Out->EffectiveId = 0x7E;
        Out->InnerId = 0x7E;
        Out->Layer = FomLayerRak;
    }
    return true;
}

static const SchemaEntry SchemaTable[] = {
    {0x06, "SMSG_LOADWORLD", FomLayerLith, ParseLoadWorld},
    {0x09, "CMSG_CONNECTSTAGE", FomLayerLith, ParseConnectStage},
    {0x0E, "SMSG_PACKETGROUP", FomLayerLith, ParsePacketGroup},
    {0x19, "CMSG_WORLD_UPDATE", FomLayerLith, ParseWorldUpdate},
    {0x7E, "PACKET_ID_UPDATE", FomLayerRak, ParsePacketIdUpdate},
};

static const SchemaEntry* FindSchema(uint8_t Id)
{
    for (const auto& Entry : SchemaTable)
    {
        if (Entry.Id == Id)
        {
            return &Entry;
        }
    }
    return nullptr;
}

bool TrySchemaOverride(const uint8_t* Payload, uint32_t PayloadBitLength, FomSchemaDispatchResult* Out)
{
    if (!Payload || PayloadBitLength < 8 || !Out)
    {
        if (Out) Out->Reason = FomDispatchReasonParseFailed;
        return false;
    }

    const uint32_t PayloadBytes = BitsToBytes(PayloadBitLength);
    LithBitReader Reader(Payload, PayloadBytes);
    Reader.BitCount = PayloadBitLength;

    uint32_t MsgIdValue = 0;
    if (!ReadBitsLE(Reader, 8, MsgIdValue))
    {
        Out->Reason = FomDispatchReasonParseFailed;
        return false;
    }
    const uint8_t MsgId = static_cast<uint8_t>(MsgIdValue & 0xFF);
    const SchemaEntry* Entry = FindSchema(MsgId);
    if (!Entry)
    {
        Out->Reason = FomDispatchReasonNoSchema;
        return false;
    }

    LithBitReader ParseReader(Payload, PayloadBytes);
    ParseReader.BitCount = PayloadBitLength;

    if (!Entry->Parser(ParseReader, Out))
    {
        Out->Reason = FomDispatchReasonOverrideFailed;
        return false;
    }

    Out->Ok = true;
    Out->Mode = FomDispatchOverride;
    Out->Reason = FomDispatchReasonOk;
    Out->OuterId = MsgId;
    if (Out->EffectiveId == 0) Out->EffectiveId = MsgId;
    if (Out->InnerId == 0) Out->InnerId = Out->EffectiveId;
    if (Out->Layer == FomLayerUnknown) Out->Layer = Entry->Layer;
    Out->ConsumedBits = ParseReader.Offset;
    return true;
}

const char* DispatchModeToString(uint8_t Mode)
{
    switch (Mode)
    {
        case FomDispatchOverride: return "override";
        case FomDispatchHeuristic: return "heuristic";
        case FomDispatchRaw: return "raw";
        default: return "unknown";
    }
}

const char* DispatchReasonToString(uint8_t Reason)
{
    switch (Reason)
    {
        case FomDispatchReasonOk: return "ok";
        case FomDispatchReasonNoSchema: return "no_schema";
        case FomDispatchReasonOverrideFailed: return "override_fail";
        case FomDispatchReasonHeuristicFailed: return "heuristic_fail";
        case FomDispatchReasonHeuristicDisabled: return "heuristic_disabled";
        case FomDispatchReasonParseFailed: return "parse_failed";
        default: return "unknown";
    }
}
