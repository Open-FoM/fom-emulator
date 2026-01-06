/** Packet decode helpers for logging. */
#include "HookDecode.h"
#include "HookBits.h"

static const int KLithSampleBytes = 32;

static bool ReadU8CompressedMsb(const uint8_t* Data, int TotalBits, int* BitPos, uint8_t* Out)
{
    if (!Out)
    {
        return false;
    }
    uint32_t Flag = 0;
    if (!ReadBitsMsb(Data, TotalBits, BitPos, 1, &Flag))
    {
        return false;
    }
    uint32_t Value = 0;
    if (Flag)
    {
        if (!ReadBitsMsb(Data, TotalBits, BitPos, 4, &Value))
        {
            return false;
        }
    }
    else
    {
        if (!ReadBitsMsb(Data, TotalBits, BitPos, 8, &Value))
        {
            return false;
        }
    }
    *Out = static_cast<uint8_t>(Value & 0xFF);
    return true;
}

static void FormatHexSample(const uint8_t* Data, int Bytes, char* Out, size_t OutSize)
{
    if (!Out || OutSize == 0)
    {
        return;
    }
    Out[0] = '\0';
    if (!Data || Bytes <= 0)
    {
        return;
    }
    int MaxBytes = Bytes > KLithSampleBytes ? KLithSampleBytes : Bytes;
    size_t Pos = 0;
    for (int Index = 0; Index < MaxBytes; ++Index)
    {
        int Written = _snprintf_s(Out + Pos, OutSize - Pos, _TRUNCATE, "%02X ", Data[Index]);
        if (Written <= 0)
        {
            break;
        }
        Pos += static_cast<size_t>(Written);
        if (Pos >= OutSize)
        {
            break;
        }
    }
}

static void DecodeMessageGroup(const uint8_t* Payload, int PayloadBits)
{
    if (!Payload || PayloadBits <= 0)
    {
        return;
    }
    int BitPos = 0;
    int TotalBits = PayloadBits;
    int Count = 0;
    while (BitPos + 8 <= TotalBits)
    {
        uint32_t LenBits = 0;
        if (!ReadBitsLsb(Payload, TotalBits, &BitPos, 8, &LenBits))
        {
            break;
        }
        if (LenBits == 0)
        {
            break;
        }
        if (BitPos + 8 > TotalBits)
        {
            break;
        }
        uint32_t MsgId = 0;
        if (!ReadBitsLsb(Payload, TotalBits, &BitPos, 8, &MsgId))
        {
            break;
        }
        if (BitPos + static_cast<int>(LenBits) > TotalBits)
        {
            break;
        }
        int PayloadBytes = static_cast<int>((LenBits + 7) / 8);
        std::vector<uint8_t> SubPayload(PayloadBytes);
        int BitsLeft = static_cast<int>(LenBits);
        for (int PayloadIndex = 0; PayloadIndex < PayloadBytes; ++PayloadIndex)
        {
            uint32_t Val = 0;
            int Take = BitsLeft > 8 ? 8 : BitsLeft;
            if (!ReadBitsLsb(Payload, TotalBits, &BitPos, Take, &Val))
            {
                BitsLeft = 0;
                break;
            }
            SubPayload[PayloadIndex] = static_cast<uint8_t>(Val & 0xFF);
            BitsLeft -= Take;
        }
        char Sample[256];
        FormatHexSample(SubPayload.data(), PayloadBytes, Sample, sizeof(Sample));
        char Line[512];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "[LithGrp] msg=0x%02X bits=%u Sample=%s", MsgId, LenBits, Sample);
        LOG("%s", Line);
        if (++Count >= 8)
        {
            break;
        }
    }
}

static void DecodeLogin6DAtBitPos(const uint8_t* Payload, int PayloadLength, int BitPosStart, const char* Label)
{
    if (!Payload || PayloadLength <= 0)
    {
        return;
    }
    int TotalBits = PayloadLength * 8;
    int BitPos = BitPosStart;
    if (BitPos < 0 || BitPos >= TotalBits)
    {
        return;
    }
    uint8_t Status = 0;
    if (!ReadU8CompressedMsb(Payload, TotalBits, &BitPos, &Status))
    {
        char Line[160] = {0};
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "[Login6D] %s Status decode failed (bitpos=%d TotalBits=%d)", Label, BitPosStart, TotalBits);
        LOG("%s", Line);
        return;
    }
    const char* StatusLabel = "OK/UNKNOWN";
    if (Status == 0)
    {
        StatusLabel = "ERROR msg=1711";
    }
    else if (Status == 2)
    {
        StatusLabel = "ERROR msg=1720";
    }
    else if (Status == 3)
    {
        StatusLabel = "ERROR msg=1710";
    }
    int Remaining = TotalBits - BitPos;
    int DumpBits = GConfig.LoginDumpBits > 0 ? GConfig.LoginDumpBits : Remaining;
    if (DumpBits > Remaining)
    {
        DumpBits = Remaining;
    }
    int DumpBytes = (DumpBits + 7) / 8;
    std::vector<uint8_t> Dump(static_cast<size_t>(DumpBytes), 0);
    for (int BitIndex = 0; BitIndex < DumpBits; ++BitIndex)
    {
        uint32_t Bit = 0;
        if (!ReadBitsMsb(Payload, TotalBits, &BitPos, 1, &Bit))
        {
            break;
        }
        int ByteIndex = BitIndex / 8;
        int BitInByte = BitIndex % 8;
        if (Bit)
        {
            Dump[ByteIndex] |= static_cast<uint8_t>(1 << (7 - BitInByte));
        }
    }
    char Sample[256] = {0};
    FormatHexSample(Dump.data(), DumpBytes, Sample, sizeof(Sample));

    char Line[512] = {0};
    _snprintf_s(Line, sizeof(Line), _TRUNCATE,
                "[Login6D] %s Status=%u (%s) DumpBits=%d DumpBytes=%d Sample=%s",
                Label, static_cast<unsigned>(Status), StatusLabel, DumpBits, DumpBytes, Sample);
    LOG("%s", Line);

    int NullPos = -1;
    for (int ByteIndex = 0; ByteIndex < DumpBytes; ++ByteIndex)
    {
        if (Dump[ByteIndex] == 0)
        {
            NullPos = ByteIndex;
            break;
        }
    }
    if (NullPos > 0)
    {
        char Text[260] = {0};
        int CopyLength = NullPos < 255 ? NullPos : 255;
        for (int CharIndex = 0; CharIndex < CopyLength; ++CharIndex)
        {
            char CharValue = static_cast<char>(Dump[CharIndex]);
            if (CharValue < 0x20 || CharValue > 0x7E)
            {
                CharValue = '.';
            }
            Text[CharIndex] = CharValue;
        }
        Text[CopyLength] = '\0';
        char Line2[512] = {0};
        _snprintf_s(Line2, sizeof(Line2), _TRUNCATE, "[Login6D] %s Text=%s", Label, Text);
        LOG("%s", Line2);
    }
}

void DecodeLogin6D(const uint8_t* Data, int Length, const char* Tag)
{
    if (!GConfig.bDecodeLogin6D || !Data || Length <= 0)
    {
        return;
    }
    if (Tag && (_strnicmp(Tag, "Net_", 4) == 0 || _strnicmp(Tag, "Rak", 3) == 0))
    {
        return;
    }
    int LoginType = Data[0];
    if (LoginType == 0x6D)
    {
        char Label[128] = {0};
        _snprintf_s(Label, sizeof(Label), _TRUNCATE, "%s Length=%d", Tag ? Tag : "login", Length);
        DecodeLogin6DAtBitPos(Data, Length, 8, Label);
        return;
    }
    // Scan for embedded 0x6D inside RakNet payloads.
    int hits = 0;
    for (int i = 1; i < Length; ++i)
    {
        if (Data[i] != 0x6D)
        {
            continue;
        }
        char Label[128] = {0};
        _snprintf_s(Label, sizeof(Label), _TRUNCATE, "%s scan@%d/%d", Tag ? Tag : "login", i, Length);
        DecodeLogin6DAtBitPos(Data + i, Length - i, 8, Label);
        if (++hits >= 2)
        {
            break;
        }
    }
}

bool DecodeLogin6DStatus(const uint8_t* Data, int Length, uint8_t* OutStatus)
{
    if (!Data || Length <= 0 || !OutStatus)
    {
        return false;
    }
    if (Data[0] == 0x6D)
    {
        int BitPos = 8;
        int TotalBits = Length * 8;
        return ReadU8CompressedMsb(Data, TotalBits, &BitPos, OutStatus);
    }
    for (int i = 1; i < Length; ++i)
    {
        if (Data[i] != 0x6D)
        {
            continue;
        }
        int BitPos = 8;
        int TotalBits = (Length - i) * 8;
        if (ReadU8CompressedMsb(Data + i, TotalBits, &BitPos, OutStatus))
        {
            return true;
        }
    }
    return false;
}

bool DecodeLogin6DSuffixRaw(const uint8_t* Data, int Length, char* Out, int OutSize)
{
    if (!Data || Length <= 0 || !Out || OutSize <= 0)
    {
        return false;
    }
    Out[0] = '\0';
    int Start = 0;
    if (Data[0] == 0x6D)
    {
        Start = 0;
    }
    else
    {
        for (int i = 1; i < Length; ++i)
        {
            if (Data[i] == 0x6D)
            {
                Start = i;
                break;
            }
        }
    }
    int TotalBits = (Length - Start) * 8;
    int BitPos = 8;
    uint8_t Status = 0;
    if (!ReadU8CompressedMsb(Data + Start, TotalBits, &BitPos, &Status))
    {
        return false;
    }
    int MaxChars = OutSize - 1;
    int Count = 0;
    while (Count < MaxChars && BitPos + 8 <= TotalBits)
    {
        uint32_t Val = 0;
        if (!ReadBitsMsb(Data + Start, TotalBits, &BitPos, 8, &Val))
        {
            break;
        }
        char Ch = static_cast<char>(Val & 0xFF);
        if (Ch == '\0')
        {
            break;
        }
        if (Ch < 0x20 || Ch > 0x7E)
        {
            Ch = '.';
        }
        Out[Count++] = Ch;
    }
    Out[Count] = '\0';
    return true;
}

void DecodeLithPacket(const uint8_t* Data, int Length)
{
    if (!Data || Length <= 0)
    {
        return;
    }
    if (Length < 2)
    {
        return;
    }
    uint8_t MsgId = Data[1];
    if (MsgId != 0x6D)
    {
        return;
    }
    if (Length < 6)
    {
        return;
    }
    const uint8_t* Payload = Data + 6;
    int PayloadBits = (Length - 6) * 8;
    DecodeMessageGroup(Payload, PayloadBits);
}

