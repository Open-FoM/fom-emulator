#include "FomHexDump.h"
#include "FomPlatform.h"

#include <cstdio>
#include <cstring>

void AppendHexDump(const uint8_t* Data, uint32_t Length, uint32_t MaxDump, std::string& Out)
{
    if (!Data || Length == 0) return;
    const uint32_t DumpLength = (MaxDump > 0 && Length > MaxDump) ? MaxDump : Length;
    for (uint32_t Offset = 0; Offset < DumpLength; Offset += 16)
    {
        const uint32_t LineLen = (DumpLength - Offset < 16) ? (DumpLength - Offset) : 16;
        char Line[128] = {0};
        int Cursor = 0;
        Cursor += SnprintfS(Line + Cursor, sizeof(Line) - Cursor, _TRUNCATE, "  %04x  ", Offset);
        for (uint32_t I = 0; I < LineLen; ++I)
        {
            Cursor += SnprintfS(Line + Cursor, sizeof(Line) - Cursor, _TRUNCATE, "%02x ", Data[Offset + I]);
        }
        for (uint32_t I = LineLen; I < 16; ++I)
        {
            Cursor += SnprintfS(Line + Cursor, sizeof(Line) - Cursor, _TRUNCATE, "   ");
        }
        Cursor += SnprintfS(Line + Cursor, sizeof(Line) - Cursor, _TRUNCATE, " |");
        for (uint32_t I = 0; I < LineLen; ++I)
        {
            const uint8_t Value = Data[Offset + I];
            const char Printable = (Value >= 0X20 && Value <= 0X7e) ? static_cast<char>(Value) : '.';
            Cursor += SnprintfS(Line + Cursor, sizeof(Line) - Cursor, _TRUNCATE, "%c", Printable);
        }
        Cursor += SnprintfS(Line + Cursor, sizeof(Line) - Cursor, _TRUNCATE, "|\n");
        Out.append(Line);
    }
    if (DumpLength < Length)
    {
        char Tail[64] = {0};
        SnprintfS(Tail, sizeof(Tail), _TRUNCATE, "  ... truncated %u bytes\n", (Length - DumpLength));
        Out.append(Tail);
    }
}

void AppendHexDumpAnsiMasked(const uint8_t* Data, uint32_t Length, uint32_t MaxDump, const uint8_t* Mask, uint32_t MaskLength, std::string& Out)
{
    if (!Data || Length == 0) return;
    const uint32_t DumpLength = (MaxDump > 0 && Length > MaxDump) ? MaxDump : Length;
    const char* Reset = "\x1b[0m";
    const char* Dim = "\x1b[90m";
    const char* Cyan = "\x1b[36m";
    const char* Yellow = "\x1b[33m";
    const char* BrightMagenta = "\x1b[95m";
    const char* BrightGreen = "\x1b[92m";
    const char* BrightBlue = "\x1b[94m";
    const char* BrightCyan = "\x1b[96m";
    const char* BrightRed = "\x1b[91m";

    for (uint32_t Offset = 0; Offset < DumpLength; Offset += 16)
    {
        const uint32_t LineLen = (DumpLength - Offset < 16) ? (DumpLength - Offset) : 16;
        std::string Hex;
        std::string Ascii;
        Hex.reserve(16 * 4);
        Ascii.reserve(16 * 4);
        for (uint32_t I = 0; I < LineLen; ++I)
        {
            const uint8_t Value = Data[Offset + I];
            const uint32_t MaskIndex = Offset + I;
            const uint8_t MaskValue = (Mask && MaskIndex < MaskLength) ? Mask[MaskIndex] : 0;
            const char* Highlight = nullptr;
            if (MaskValue & FomHexHighlightScan)
            {
                Highlight = BrightRed;
            }
            else if (MaskValue & FomHexHighlightInner)
            {
                Highlight = BrightGreen;
            }
            else if (MaskValue & FomHexHighlightLith)
            {
                Highlight = BrightBlue;
            }
            else if (MaskValue & FomHexHighlightOuter)
            {
                Highlight = BrightMagenta;
            }
            else if (MaskValue & FomHexHighlightTimestamp)
            {
                Highlight = BrightCyan;
            }
            char ByteBuf[8] = {0};
            SnprintfS(ByteBuf, sizeof(ByteBuf), _TRUNCATE, "%02x", Value);
            if (Highlight)
            {
                Hex.append(Highlight).append(ByteBuf).append(Reset);
                const char Printable = (Value >= 0X20 && Value <= 0X7e) ? static_cast<char>(Value) : '.';
                Ascii.append(Highlight);
                Ascii.push_back(Printable);
                Ascii.append(Reset);
            }
            else if (Value == 0X00)
            {
                Hex.append(Dim).append(ByteBuf).append(Reset);
                Ascii.append(Dim).append(".").append(Reset);
            }
            else if (Value >= 0X20 && Value <= 0X7e)
            {
                Hex.append(Yellow).append(ByteBuf).append(Reset);
                Ascii.append(Yellow);
                Ascii.push_back(static_cast<char>(Value));
                Ascii.append(Reset);
            }
            else
            {
                Hex.append(ByteBuf);
                Ascii.push_back('.');
            }
            if (I + 1 < LineLen)
            {
                Hex.push_back(' ');
            }
        }

        const uint32_t PaddingNeeded = 16 - LineLen;
        if (PaddingNeeded > 0)
        {
            for (uint32_t I = 0; I < PaddingNeeded; ++I)
            {
                Hex.append("   ");
            }
        }

        char OffsetBuf[32] = {0};
        SnprintfS(OffsetBuf, sizeof(OffsetBuf), _TRUNCATE, "%04x", Offset);
        Out.append("  ");
        Out.append(Cyan).append(OffsetBuf).append(Reset);
        Out.append("  ");
        Out.append(Hex);
        Out.append("  |");
        Out.append(Ascii);
        Out.append("|\n");
    }

    if (DumpLength < Length)
    {
        char Tail[64] = {0};
        SnprintfS(Tail, sizeof(Tail), _TRUNCATE, "  ... truncated %u bytes\n", (Length - DumpLength));
        Out.append(Tail);
    }
}

void AppendHexDumpAnsi(const uint8_t* Data, uint32_t Length, uint32_t MaxDump, std::string& Out)
{
    AppendHexDumpAnsiMasked(Data, Length, MaxDump, nullptr, 0, Out);
}
