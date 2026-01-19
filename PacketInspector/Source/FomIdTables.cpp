#include "FomIdTables.h"
#include "FomRakParse.h"

#include "raknet/MessageIdentifiers.h"

#include <cstring>
#include <string>

struct IdNameEntry
{
    uint8_t Id;
    const char* Name;
};

static const IdNameEntry kRakIdNames[] = {
    {0x00, "ID_INTERNAL_PING"},
    {0x01, "ID_PING"},
    {0x02, "ID_PING_OPEN_CONNECTIONS"},
    {0x03, "ID_CONNECTED_PONG"},
    {0x04, "ID_CONNECTION_REQUEST"},
    {0x05, "ID_SECURED_CONNECTION_RESPONSE"},
    {0x06, "ID_SECURED_CONNECTION_CONFIRMATION"},
    {0x07, "ID_RPC_MAPPING"},
    {0x08, "ID_DETECT_LOST_CONNECTIONS"},
    {0x09, "ID_OPEN_CONNECTION_REQUEST"},
    {0x0A, "ID_OPEN_CONNECTION_REPLY"},
    {0x0B, "ID_RPC"},
    {0x0C, "ID_RPC_REPLY"},
    {0x0D, "ID_OUT_OF_BAND_INTERNAL"},
    {0x0E, "ID_CONNECTION_REQUEST_ACCEPTED"},
    {0x0F, "ID_CONNECTION_ATTEMPT_FAILED"},
    {0x10, "ID_ALREADY_CONNECTED"},
    {0x11, "ID_NEW_INCOMING_CONNECTION"},
    {0x12, "ID_NO_FREE_INCOMING_CONNECTIONS"},
    {0x13, "ID_DISCONNECTION_NOTIFICATION"},
    {0x14, "ID_CONNECTION_LOST"},
    {0x15, "ID_RSA_PUBLIC_KEY_MISMATCH"},
    {0x16, "ID_CONNECTION_BANNED"},
    {0x17, "ID_INVALID_PASSWORD"},
    {0x18, "ID_MODIFIED_PACKET"},
    {0x19, "ID_TIMESTAMP"},
    {0x1A, "ID_PONG"},
    {0x1B, "ID_ADVERTISE_SYSTEM"},
    {0x32, "ID_FILE_LIST_TRANSFER_HEADER"},
    {0x36, "ID_FILE_LIST_TRANSFER_RESPONSE"},
    {0x6B, "ID_WORLD_LOGIN_REQUEST"},
    {0x6C, "ID_LOGIN_REQUEST"},
    {0x6D, "ID_LOGIN_REQUEST_RETURN"},
    {0x6E, "ID_LOGIN"},
    {0x6F, "ID_LOGIN_RETURN"},
    {0x70, "ID_LOGIN_TOKEN_CHECK"},
    {0x72, "ID_WORLD_LOGIN"},
    {0x73, "ID_WORLD_LOGIN_RETURN"},
    {0x78, "ID_REGISTER_CLIENT"},
    {0x79, "ID_REGISTER_CLIENT_RETURN"},
    {0x7B, "ID_WORLD_SELECT"},
    {0x80, "ID_ACK"},
    {0x86, "ID_USER_PACKET_ENUM"},
    {0xA5, "ID_WORLDSERVICE"},
    {0xFE, "ID_WORLD_QUERY"},
    {0xFF, "ID_WORLD_INFO"},
    {0xFD, "ID_WORLD_HEARTBEAT"},
};

static const IdNameEntry kLithIdNames[] = {
    {0x04, "SMSG_NETPROTOCOLVERSION"},
    {0x05, "SMSG_UNLOADWORLD"},
    {0x06, "SMSG_LOADWORLD"},
    {0x07, "SMSG_CLIENTOBJECTID"},
    {0x08, "SMSG_UPDATE"},
    {0x0A, "SMSG_UNGUARANTEEDUPDATE"},
    {0x0C, "SMSG_YOURID"},
    {0x0D, "SMSG_MESSAGE"},
    {0x0E, "SMSG_PACKETGROUP"},
    {0x0F, "SMSG_CONSOLEVAR"},
    {0x10, "SMSG_SKYDEF"},
    {0x11, "SMSG_INSTANTSPECIALEFFECT"},
    {0x13, "SMSG_PRELOADLIST"},
    {0x14, "SMSG_THREADLOAD"},
    {0x15, "SMSG_UNLOAD"},
    {0x16, "SMSG_GLOBALLIGHT"},
    {0x17, "SMSG_CHANGE_CHILDMODEL"},
    {0x05, "CMSG_HELLO"},
    {0x06, "CMSG_GOODBYE"},
    {0x07, "CMSG_UPDATE"},
    {0x08, "CMSG_SOUNDUPDATE"},
    {0x09, "CMSG_CONNECTSTAGE"},
    {0x0A, "CMSG_COMMANDSTRING"},
    {0x0B, "CMSG_MESSAGE"},
    {0x0C, "CMSG_TEST"},
    {0x04, "MSG_CYCLECHECK"},
    {0x04, "MSG_NETPROTOCOLVERSION"},
    {0x06, "MSG_PROTOCOL_VERSION"},
    {0x06, "MSG_LOADWORLD"},
    {0x07, "MSG_CLIENTOBJECTID"},
    {0x08, "MSG_UPDATE"},
    {0x0A, "MSG_UNGUARANTEEDUPDATE"},
    {0x0C, "MSG_YOURID"},
    {0x0D, "MSG_MESSAGE"},
    {0x0E, "MSG_MESSAGE_GROUP"},
    {0x10, "MSG_SKYDEF"},
    {0x13, "MSG_PRELOADLIST"},
    {0x09, "MSG_CONNECTSTAGE"},
    {0x19, "MSG_ID_WORLD_UPDATE"},
};

static bool StartsWith(const char* Text, const char* Prefix)
{
    if (!Text || !Prefix) return false;
    const size_t PrefixLen = std::strlen(Prefix);
    return std::strncmp(Text, Prefix, PrefixLen) == 0;
}

const char* GetRakIdName(uint8_t Id)
{
    for (const auto& Entry : kRakIdNames)
    {
        if (Entry.Id == Id)
        {
            return Entry.Name;
        }
    }
    return nullptr;
}

const char* GetLithIdName(uint8_t Id, FomLogDirection)
{
    thread_local std::string Combined;
    Combined.clear();
    for (const auto& Entry : kLithIdNames)
    {
        if (Entry.Id != Id) continue;
        if (!Combined.empty())
        {
            Combined.push_back('/');
        }
        Combined.append(Entry.Name);
    }
    if (Combined.empty())
    {
        return nullptr;
    }
    return Combined.c_str();
}

const char* GetPacketIdName(uint8_t Id, FomPacketLayer Layer, FomLogDirection Direction)
{
    if (Layer == FomLayerLith)
    {
        return GetLithIdName(Id, Direction);
    }
    if (Layer == FomLayerRak)
    {
        return GetRakIdName(Id);
    }
    return nullptr;
}

static bool ReadFloatLSB(LithBitReader& Reader, float& OutValue)
{
    uint32_t Raw = 0;
    if (!Reader.ReadBitsToUnsigned(32, Raw))
    {
        return false;
    }
    std::memcpy(&OutValue, &Raw, sizeof(float));
    return true;
}

static bool ValidateLithPayloadBits(LithBitReader& Reader, uint8_t MsgId, uint32_t PayloadBits);

static bool DecodeLithPacketGroupFromReader(LithBitReader& Reader, uint8_t* OutInnerId)
{
    auto ScoreInner = [](uint8_t Id) -> int
    {
        switch (Id)
        {
            case 0X06: return 100;
            case 0X0C: return 90;
            case 0X04: return 80;
            default: return 10;
        }
    };

    uint8_t BestInner = 0;
    int BestScore = -1;
    bool Found = false;
    while (Reader.GetUnreadBits() >= 8)
    {
        uint32_t SubBitsValue = 0;
        if (!Reader.ReadBitsToUnsigned(8, SubBitsValue))
        {
            return false;
        }
        const uint8_t SubBits = static_cast<uint8_t>(SubBitsValue);
        if (SubBits == 0)
        {
            break;
        }
        if (SubBits == 0XFF)
        {
            uint32_t Skip = 0;
            if (!Reader.ReadCompressedUnsigned(sizeof(BitstreamLengthEncoding), Skip))
            {
                return false;
            }
            const uint32_t SkipBits = Skip * 8U;
            if (Reader.GetUnreadBits() < SkipBits)
            {
                return false;
            }
            Reader.Offset += SkipBits;
            continue;
        }
        if (SubBits < 8)
        {
            continue;
        }

        uint32_t SubIdValue = 0;
        if (!Reader.ReadBitsToUnsigned(8, SubIdValue))
        {
            return false;
        }
        const uint8_t SubId = static_cast<uint8_t>(SubIdValue);
        const uint32_t RemainingBits = static_cast<uint32_t>(SubBits - 8);
        if (Reader.GetUnreadBits() < RemainingBits)
        {
            return false;
        }

        LithBitReader SubReader = Reader;
        if (SubReader.Offset + RemainingBits < SubReader.BitCount)
        {
            SubReader.BitCount = SubReader.Offset + RemainingBits;
        }
        if (ValidateLithPayloadBits(SubReader, SubId, RemainingBits))
        {
            const int Score = ScoreInner(SubId);
            if (Score > BestScore)
            {
                BestScore = Score;
                BestInner = SubId;
                Found = true;
            }
        }
        Reader.Offset += RemainingBits;
    }

    if (Found && OutInnerId)
    {
        *OutInnerId = BestInner;
    }
    return Found;
}

static bool ValidateLithPayloadBits(LithBitReader& Reader, uint8_t MsgId, uint32_t PayloadBits)
{
    (void)PayloadBits;
    switch (MsgId)
    {
        case 0X09:
        {
            uint32_t Stage = 0;
            if (!Reader.ReadBitsToUnsigned(8, Stage))
            {
                return false;
            }
            return Stage <= 1;
        }
        case 0X06:
        {
            float Dummy = 0.0f;
            if (!ReadFloatLSB(Reader, Dummy))
            {
                return false;
            }
            uint32_t WorldId = 0;
            if (!Reader.ReadBitsToUnsigned(16, WorldId))
            {
                return false;
            }
            (void)WorldId;
            return true;
        }
        case 0X0C:
        {
            uint32_t Dummy = 0;
            if (!Reader.ReadBitsToUnsigned(16, Dummy))
            {
                return false;
            }
            if (!Reader.ReadBitsToUnsigned(8, Dummy))
            {
                return false;
            }
            return true;
        }
        case 0X0A:
        {
            uint32_t ObjectId = 0;
            if (!Reader.ReadBitsToUnsigned(16, ObjectId))
            {
                return false;
            }
            uint32_t Flags = 0;
            if (!Reader.ReadBitsToUnsigned(4, Flags))
            {
                return false;
            }
            (void)Flags;
            if (ObjectId == 0XFFFF)
            {
                float GameTime = 0.0f;
                return ReadFloatLSB(Reader, GameTime);
            }
            return true;
        }
        case 0X0E:
        {
            return DecodeLithPacketGroupFromReader(Reader, nullptr);
        }
        default:
            return false;
    }
}

bool IsLithMessageId(uint8_t Id)
{
    switch (Id)
    {
        case 0X04: // SMSG_NETPROTOCOLVERSION / MSG_NETPROTOCOLVERSION
        case 0X05: // SMSG_UNLOADWORLD / CMSG_HELLO
        case 0X06: // SMSG_LOADWORLD / MSG_LOADWORLD / CMSG_GOODBYE
        case 0X07: // SMSG_CLIENTOBJECTID / CMSG_UPDATE
        case 0X08: // SMSG_UPDATE / CMSG_SOUNDUPDATE
        case 0X09: // CMSG_CONNECTSTAGE
        case 0X0A: // SMSG_UNGUARANTEEDUPDATE / MSG_UNGUARANTEEDUPDATE / CMSG_COMMANDSTRING
        case 0X0B: // CMSG_MESSAGE
        case 0X0C: // SMSG_YOURID / MSG_YOURID / CMSG_TEST
        case 0X0D: // SMSG_MESSAGE / MSG_MESSAGE
        case 0X0E: // SMSG_PACKETGROUP / MSG_MESSAGE_GROUP
        case 0X0F: // SMSG_CONSOLEVAR
        case 0X10: // SMSG_SKYDEF / MSG_SKYDEF
        case 0X11: // SMSG_INSTANTSPECIALEFFECT
        case 0X13: // SMSG_PRELOADLIST / MSG_PRELOADLIST
        case 0X14: // SMSG_THREADLOAD
        case 0X15: // SMSG_UNLOAD
        case 0X16: // SMSG_GLOBALLIGHT
        case 0X17: // SMSG_CHANGE_CHILDMODEL
        case 0X19: // MSG_ID_WORLD_UPDATE (FoM)
            return true;
        default:
            return false;
    }
}

bool IsRakGameId(uint8_t Id)
{
    switch (Id)
    {
        case 0X6B: // ID_WORLD_LOGIN_REQUEST
        case 0X6C: // ID_LOGIN_REQUEST
        case 0X6D: // ID_LOGIN_REQUEST_RETURN
        case 0X6E: // ID_LOGIN
        case 0X6F: // ID_LOGIN_RETURN
        case 0X70: // ID_LOGIN_TOKEN_CHECK
        case 0X72: // ID_WORLD_LOGIN
        case 0X73: // ID_WORLD_LOGIN_RETURN
        case 0X78: // ID_REGISTER_CLIENT
        case 0X79: // ID_REGISTER_CLIENT_RETURN
        case 0X7B: // ID_WORLD_SELECT
        case 0X7E: // PACKET_ID_UPDATE
        case 0X86: // ID_USER_PACKET_ENUM
        case 0XA5: // ID_WORLDSERVICE
        case 0XFD: // ID_WORLD_HEARTBEAT
        case 0XFE: // ID_WORLD_QUERY
        case 0XFF: // ID_WORLD_INFO
            return true;
        default:
            return false;
    }
}

bool IsRakKnownId(uint8_t Id)
{
    if (Id <= ID_USER_PACKET_ENUM)
    {
        return true;
    }
    return IsRakGameId(Id);
}

bool TryDecodeLithInnerId(const uint8_t* Payload, uint32_t PayloadLength, uint8_t* OutInnerId)
{
    if (!Payload || PayloadLength < 2 || !OutInnerId)
    {
        return false;
    }

    const uint8_t MsgId = Payload[0];
    if (MsgId == 0X0D) // MSG_MESSAGE
    {
        *OutInnerId = Payload[1];
        return true;
    }

    if (MsgId != 0X0E) // MSG_MESSAGE_GROUP
    {
        return false;
    }

    LithBitReader Reader(Payload, PayloadLength);
    uint32_t OuterValue = 0;
    if (!Reader.ReadBitsToUnsigned(8, OuterValue) || static_cast<uint8_t>(OuterValue) != MsgId)
    {
        return false;
    }

    while (Reader.GetUnreadBits() >= 8)
    {
        uint32_t SubBitsValue = 0;
        if (!Reader.ReadBitsToUnsigned(8, SubBitsValue))
        {
            return false;
        }
        const uint8_t SubBits = static_cast<uint8_t>(SubBitsValue);

        if (SubBits == 0)
        {
            continue;
        }

        if (SubBits == 0XFF)
        {
            uint32_t Skip = 0;
            if (!Reader.ReadCompressedUnsigned(sizeof(BitstreamLengthEncoding), Skip))
            {
                return false;
            }
            const uint32_t SkipBits = Skip * 8U;
            if (Reader.GetUnreadBits() < SkipBits)
            {
                return false;
            }
            Reader.Offset += SkipBits;
            continue;
        }

        if (SubBits < 8)
        {
            continue;
        }

        uint32_t SubIdValue = 0;
        if (!Reader.ReadBitsToUnsigned(8, SubIdValue))
        {
            return false;
        }
        const uint8_t SubId = static_cast<uint8_t>(SubIdValue);

        const uint32_t RemainingBits = static_cast<uint32_t>(SubBits - 8);
        if (Reader.GetUnreadBits() < RemainingBits)
        {
            return false;
        }
        LithBitReader PayloadReader = Reader;
        const uint32_t PayloadBits = RemainingBits;
        if (PayloadReader.Offset + PayloadBits < PayloadReader.BitCount)
        {
            PayloadReader.BitCount = PayloadReader.Offset + PayloadBits;
        }
        if (IsLithMessageId(SubId) || IsRakGameId(SubId) || SubId == 0X7E)
        {
            if (ValidateLithPayloadBits(PayloadReader, SubId, PayloadBits))
            {
                *OutInnerId = SubId;
                return true;
            }
        }
        Reader.Offset += RemainingBits;
    }

    return false;
}

bool ValidateLithPayload(const uint8_t* Payload, uint32_t PayloadLength, uint8_t ExpectedId)
{
    if (!Payload || PayloadLength == 0)
    {
        return false;
    }

    LithBitReader Reader(Payload, PayloadLength);
    uint32_t MsgIdValue = 0;
    if (!Reader.ReadBitsToUnsigned(8, MsgIdValue))
    {
        return false;
    }
    const uint8_t MsgId = static_cast<uint8_t>(MsgIdValue);
    if (ExpectedId != 0 && MsgId != ExpectedId)
    {
        return false;
    }

    if (MsgId == 0X0E)
    {
        while (Reader.GetUnreadBits() >= 8)
        {
            uint32_t SubBitsValue = 0;
            if (!Reader.ReadBitsToUnsigned(8, SubBitsValue))
            {
                return false;
            }
            const uint8_t SubBits = static_cast<uint8_t>(SubBitsValue);
            if (SubBits == 0)
            {
                continue;
            }
            if (SubBits == 0XFF)
            {
                uint32_t Skip = 0;
                if (!Reader.ReadCompressedUnsigned(sizeof(BitstreamLengthEncoding), Skip))
                {
                    return false;
                }
                const uint32_t SkipBits = Skip * 8U;
                if (Reader.GetUnreadBits() < SkipBits)
                {
                    return false;
                }
                Reader.Offset += SkipBits;
                continue;
            }
            if (SubBits < 8)
            {
                continue;
            }

        uint32_t SubIdValue = 0;
        if (!Reader.ReadBitsToUnsigned(8, SubIdValue))
        {
            return false;
        }
        const uint8_t SubId = static_cast<uint8_t>(SubIdValue);
        const uint32_t RemainingBits = static_cast<uint32_t>(SubBits - 8);
        if (!IsLithMessageId(SubId))
        {
            Reader.Offset += RemainingBits;
            continue;
        }
        if (Reader.GetUnreadBits() < RemainingBits)
        {
            return false;
        }
            LithBitReader SubReader = Reader;
            if (SubReader.Offset + RemainingBits < SubReader.BitCount)
            {
                SubReader.BitCount = SubReader.Offset + RemainingBits;
            }
            if (ValidateLithPayloadBits(SubReader, SubId, RemainingBits))
            {
                return true;
            }
            Reader.Offset += RemainingBits;
        }

        return false;
    }

    return ValidateLithPayloadBits(Reader, MsgId, Reader.GetUnreadBits());
}

bool ScanForLithPayloadBits(const uint8_t* Data, uint32_t Length, uint8_t* OutOuterId, uint8_t* OutInnerId)
{
    if (!Data || Length == 0 || !OutOuterId)
    {
        return false;
    }

    struct Candidate
    {
        uint32_t BitOffset = 0;
        uint8_t OuterId = 0;
        uint8_t InnerId = 0;
        int Score = -1;
    };

    auto ScoreId = [](uint8_t Id) -> int
    {
        switch (Id)
        {
            case 0X0E: return 100;
            case 0X0A: return 90;
            case 0X09: return 80;
            case 0X06: return 70;
            case 0X0C: return 60;
            default: return 0;
        }
    };

    Candidate Best;
    uint32_t GroupOffset = 0;
    uint8_t GroupInner = 0;
    if (FindLithPacketGroupOffset(Data, Length, &GroupOffset, &GroupInner))
    {
        Best.BitOffset = GroupOffset * 8U;
        Best.OuterId = 0X0E;
        Best.InnerId = GroupInner;
        Best.Score = ScoreId(0X0E) - 5;
    }
    const uint32_t TotalBits = Length * 8U;
    for (uint32_t BitOffset = 0; BitOffset + 8 <= TotalBits; ++BitOffset)
    {
        LithBitReader Reader(Data, Length);
        Reader.Offset = BitOffset;
        uint32_t MsgIdValue = 0;
        if (!Reader.ReadBitsToUnsigned(8, MsgIdValue))
        {
            return false;
        }
        const uint8_t MsgId = static_cast<uint8_t>(MsgIdValue);
        if (MsgId != 0X0E && MsgId != 0X09 && MsgId != 0X06 && MsgId != 0X0C && MsgId != 0X0A)
        {
            continue;
        }

        if (MsgId == 0X0E)
        {
            uint8_t InnerId = 0;
            LithBitReader GroupReader = Reader;
            if (DecodeLithPacketGroupFromReader(GroupReader, &InnerId))
            {
                const int Score = ScoreId(0X0E);
                if (Score > Best.Score)
                {
                    Best.BitOffset = BitOffset;
                    Best.OuterId = 0X0E;
                    Best.InnerId = InnerId;
                    Best.Score = Score;
                }
            }
            continue;
        }

        LithBitReader PayloadReader = Reader;
        if (ValidateLithPayloadBits(PayloadReader, MsgId, PayloadReader.GetUnreadBits()))
        {
            const int Score = ScoreId(MsgId);
            if (Score > Best.Score)
            {
                Best.BitOffset = BitOffset;
                Best.OuterId = MsgId;
                Best.InnerId = MsgId;
                Best.Score = Score;
            }
        }
    }

    if (Best.Score >= 0)
    {
        *OutOuterId = Best.OuterId;
        if (OutInnerId)
        {
            *OutInnerId = Best.InnerId;
        }
        return true;
    }

    return false;
}

bool TryScanLithPacketGroup(const uint8_t* Payload, uint32_t PayloadLength, uint8_t* OutOuterId)
{
    if (!Payload || PayloadLength < 3 || !OutOuterId)
    {
        return false;
    }

    for (uint32_t I = 0; I + 2 < PayloadLength; ++I)
    {
        if (Payload[I] != 0X0E)
        {
            continue;
        }
        const uint8_t SubBits = Payload[I + 1];
        if (SubBits == 0 || SubBits < 8)
        {
            continue;
        }
        const uint8_t SubId = Payload[I + 2];
        if (!IsLithMessageId(SubId) && !IsRakGameId(SubId) && SubId != 0X7E)
        {
            continue;
        }
        *OutOuterId = 0X0E;
        return true;
    }
    return false;
}

bool ScanForLithWrapped(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, FomInspectResult* Out)
{
    if (!Data || Length < 2 || !Out) return false;
    const uint32_t begin = (StartOffset < Length) ? StartOffset : 0;
    for (uint32_t I = begin; I + 1 < Length; ++I)
    {
        if (Data[I] == ID_USER_PACKET_ENUM && IsLithMessageId(Data[I + 1]))
        {
            Out->InnerId = ID_USER_PACKET_ENUM;
            Out->LithId = Data[I + 1];
            Out->EffectiveId = Out->LithId;
            Out->Layer = FomLayerLith;
            Out->PayloadOffset = I;
            Out->PayloadLength = Length - I;
            return true;
        }
    }
    return false;
}

bool ScanForLithDirect(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, FomInspectResult* Out)
{
    (void)Data;
    (void)Length;
    (void)StartOffset;
    (void)Out;
    return false;
}

bool ScanForRakId(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, FomInspectResult* Out)
{
    if (!Data || Length == 0 || !Out) return false;
    const uint32_t begin = (StartOffset < Length) ? StartOffset : 0;
    for (uint32_t I = begin; I < Length; ++I)
    {
        if (IsRakKnownId(Data[I]))
        {
            Out->InnerId = Data[I];
            Out->EffectiveId = Data[I];
            Out->Layer = FomLayerRak;
            Out->PayloadOffset = I;
            Out->PayloadLength = Length - I;
            return true;
        }
    }
    return false;
}

bool ScanForRakGameIdOnly(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, uint8_t* OutId)
{
    if (!Data || Length == 0 || !OutId) return false;
    const uint32_t begin = (StartOffset < Length) ? StartOffset : 0;
    for (uint32_t I = begin; I < Length; ++I)
    {
        if (IsRakGameId(Data[I]))
        {
            *OutId = Data[I];
            return true;
        }
    }
    return false;
}

bool FindLithPacketGroupOffset(const uint8_t* Payload, uint32_t PayloadLength, uint32_t* OutOffset, uint8_t* OutInnerId)
{
    if (!Payload || PayloadLength < 3 || !OutOffset || !OutInnerId)
    {
        return false;
    }

    auto ScoreInner = [](uint8_t Id) -> int
    {
        switch (Id)
        {
            case 0X06: return 100;
            case 0X0C: return 90;
            case 0X04: return 80;
            default: return 10;
        }
    };

    bool Found = false;
    uint32_t BestOffset = 0;
    uint8_t BestInner = 0;
    int BestScore = -1;

    for (uint32_t I = 0; I + 2 < PayloadLength; ++I)
    {
        if (Payload[I] != 0X0E)
        {
            continue;
        }
        const uint8_t SubBits = Payload[I + 1];
        if (SubBits == 0 || SubBits < 8)
        {
            continue;
        }
        const uint8_t SubId = Payload[I + 2];
        if (!IsLithMessageId(SubId) && !IsRakGameId(SubId) && SubId != 0X7E)
        {
            continue;
        }
        LithBitReader GroupReader(Payload + I, PayloadLength - I);
        uint32_t MsgIdValue = 0;
        if (!GroupReader.ReadBitsToUnsigned(8, MsgIdValue) || static_cast<uint8_t>(MsgIdValue) != 0X0E)
        {
            continue;
        }
        if (!ValidateLithPayloadBits(GroupReader, 0X0E, GroupReader.GetUnreadBits()))
        {
            continue;
        }
        const int Score = ScoreInner(SubId);
        if (Score > BestScore)
        {
            BestScore = Score;
            BestOffset = I;
            BestInner = SubId;
            Found = true;
        }
    }

    if (Found)
    {
        *OutOffset = BestOffset;
        *OutInnerId = BestInner;
        return true;
    }

    return false;
}

int32_t FindRakGameIdOffset(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, uint8_t* OutId)
{
    if (!Data || Length == 0 || !OutId) return -1;
    const uint32_t begin = (StartOffset < Length) ? StartOffset : 0;
    for (uint32_t I = begin; I < Length; ++I)
    {
        if (IsRakGameId(Data[I]))
        {
            *OutId = Data[I];
            return static_cast<int32_t>(I);
        }
    }
    return -1;
}

