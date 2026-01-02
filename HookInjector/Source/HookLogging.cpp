/** Logging and capture utilities implementation. */
#include "HookLogging.h"

#include <stdarg.h>
#include <string>
#include <unordered_map>

static CRITICAL_SECTION LogLock;
static bool bLogInit = false;
static bool bConsoleEnabled = false;
static ULONGLONG GLastPacketLogMs = 0;

struct FRepeatState
{
    ULONGLONG LastLoggedMs = 0;
    int Suppressed = 0;
};

static std::unordered_map<std::string, FRepeatState> GRepeatState;

extern "C" IMAGE_DOS_HEADER __ImageBase;

static volatile LONG GLogFrame = 0;

static void FormatHeader(char* Out, size_t OutLen, const char* FuncName, LONG Frame, const SYSTEMTIME& Time)
{
    _snprintf_s(Out, OutLen, _TRUNCATE,
                "[%04u.%02u.%02u-%02u.%02u.%02u:%03u][%s] ",
                Time.wYear, Time.wMonth, Time.wDay,
                Time.wHour, Time.wMinute, Time.wSecond, Time.wMilliseconds,
                (FuncName && *FuncName) ? FuncName : "Log");
}

static int GetEffectivePacketId(const uint8_t* Bytes, int Length)
{
    if (!Bytes || Length <= 0)
    {
        return -1;
    }
    const uint8_t FirstByte = Bytes[0];
    if ((FirstByte & 0x40) == 0x40 && (FirstByte & 0x80) == 0 && Length >= 18)
    {
        return Bytes[17];
    }
    return FirstByte;
}

static bool ShouldSuppressPacket(const char* Tag, const uint8_t* Bytes, int Length,
                                 const char* Address, int Port, int* OutSuppressed, std::string* OutSignature)
{
    if (!GConfig.bSuppressRepeats || GConfig.LogRepeatSuppressMs <= 0)
    {
        return false;
    }
    if (Tag && _strnicmp(Tag, "Lith]", 5) == 0)
    {
        return false;
    }
    const ULONGLONG Now = GetTickCount64();
    if (GConfig.LogMinIntervalMs > 0 && (Now - GLastPacketLogMs) < static_cast<ULONGLONG>(GConfig.LogMinIntervalMs))
    {
        return true;
    }
    char Sig[256] = {0};
    const int EffectiveId = GetEffectivePacketId(Bytes, Length);
    _snprintf_s(Sig, sizeof(Sig), _TRUNCATE, "%s|%s:%d|len=%d|id=%d",
                Tag ? Tag : "Net", Address ? Address : "unknown", Port, Length, EffectiveId);
    std::string Signature(Sig);
    FRepeatState& State = GRepeatState[Signature];
    if (State.LastLoggedMs != 0 &&
        (Now - State.LastLoggedMs) < static_cast<ULONGLONG>(GConfig.LogRepeatSuppressMs))
    {
        State.Suppressed += 1;
        return true;
    }
    if (OutSuppressed)
    {
        *OutSuppressed = State.Suppressed;
    }
    if (OutSignature)
    {
        *OutSignature = Signature;
    }
    State.Suppressed = 0;
    State.LastLoggedMs = Now;
    GLastPacketLogMs = Now;
    return false;
}

void LogInit()
{
    if (bLogInit)
    {
        return;
    }
    InitializeCriticalSection(&LogLock);
    bLogInit = true;
}

void LogShutdown()
{
    if (bLogInit)
    {
        DeleteCriticalSection(&LogLock);
        bLogInit = false;
    }
}

void InitLogPath()
{
    if (GConfig.LogPath[0])
    {
        return;
    }
    char ExePath[MAX_PATH] = {0};
    HMODULE SelfModule = reinterpret_cast<HMODULE>(&__ImageBase);
    DWORD Length = GetModuleFileNameA(SelfModule, ExePath, MAX_PATH);
    if (Length == 0 || Length >= MAX_PATH)
    {
        lstrcpyA(GConfig.LogPath, "FoM_recv.log");
        return;
    }
    char* Slash = strrchr(ExePath, '\\');
    if (Slash)
    {
        Slash[1] = '\0';
        lstrcatA(ExePath, "fom_hook.log");
        lstrcpyA(GConfig.LogPath, ExePath);
    } else
    {
        lstrcpyA(GConfig.LogPath, "fom_hook.log");
    }
}

void Logf(const char* FuncName, const char* Format, ...)
{
    if (!bLogInit)
    {
        return;
    }
    EnterCriticalSection(&LogLock);
    InitLogPath();
    LONG Frame = InterlockedIncrement(&GLogFrame);
    SYSTEMTIME Time{};
    GetLocalTime(&Time);
    char Header[128] = {0};
    FormatHeader(Header, sizeof(Header), FuncName, Frame, Time);
    char Message[1024] = {0};
    if (Format)
    {
        va_list Args;
        va_start(Args, Format);
        _vsnprintf_s(Message, sizeof(Message), _TRUNCATE, Format, Args);
        va_end(Args);
    }
    FILE* File = nullptr;
    if (fopen_s(&File, GConfig.LogPath, "ab") == 0 && File)
    {
        fwrite(Header, 1, strlen(Header), File);
        fwrite(Message, 1, strlen(Message), File);
        fwrite("\r\n", 1, 2, File);
        fclose(File);
    }
    if (bConsoleEnabled)
    {
        fprintf(stdout, "%s%s\r\n", Header, Message);
    }
    LeaveCriticalSection(&LogLock);
}

bool ShouldCaptureNetwork()
{
    return true;
}

void LogHex(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength)
{
    LogHexEx(Tag, Data, Length, Address, AddressLength, nullptr);
}

void LogHexEx(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength, const char* Extra)
{
    LogHexExId(Tag, Data, Length, Address, AddressLength, Extra, -1);
}

void LogHexExId(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength, const char* Extra, int ForceId)
{
    if (!bLogInit || !Data || Length <= 0)
    {
        return;
    }
    EnterCriticalSection(&LogLock);
    InitLogPath();
    FILE* File = nullptr;
    if (fopen_s(&File, GConfig.LogPath, "ab") != 0 || !File)
    {
        LeaveCriticalSection(&LogLock);
        return;
    }

    SYSTEMTIME Time{};
    GetLocalTime(&Time);
    LONG Frame = InterlockedIncrement(&GLogFrame);
    char FuncName[128] = {0};
    _snprintf_s(FuncName, sizeof(FuncName), _TRUNCATE, "%s", Tag ? Tag : "Net");
    char Header[128] = {0};
    FormatHeader(Header, sizeof(Header), FuncName, Frame, Time);

    char AddressBuffer[64] = "unknown";
    int Port = -1;
    if (Address && AddressLength >= (int)sizeof(sockaddr_in) && Address->sa_family == AF_INET)
    {
        const sockaddr_in* SocketAddress = reinterpret_cast<const sockaddr_in*>(Address);
        const char* Ip = inet_ntoa(SocketAddress->sin_addr);
        if (Ip)
        {
            lstrcpynA(AddressBuffer, Ip, sizeof(AddressBuffer));
        }
        Port = ntohs(SocketAddress->sin_port);
    }

    int Suppressed = 0;
    std::string Signature;
    if (ShouldSuppressPacket(Tag, reinterpret_cast<const uint8_t*>(Data), Length, AddressBuffer, Port, &Suppressed, &Signature))
    {
        fclose(File);
        LeaveCriticalSection(&LogLock);
        return;
    }

    if (Suppressed > 0)
    {
        LONG SuppFrame = InterlockedIncrement(&GLogFrame);
        char SuppHeader[128] = {0};
        FormatHeader(SuppHeader, sizeof(SuppHeader), "PacketLogger", SuppFrame, Time);
        fprintf(File, "%sSuppressed %d repeats of %s\r\n", SuppHeader, Suppressed, Signature.c_str());
        if (bConsoleEnabled)
        {
            fprintf(stdout, "%sSuppressed %d repeats of %s\r\n", SuppHeader, Suppressed, Signature.c_str());
        }
    }

    int EffectiveId = ForceId;
    if (EffectiveId < 0)
    {
        EffectiveId = GetEffectivePacketId(reinterpret_cast<const uint8_t*>(Data), Length);
    }
    if (EffectiveId >= 0)
    {
        if (Extra && Extra[0])
        {
            fprintf(File, "%slen=%d from=%s:%d id=0x%02X %s\r\n", Header, Length, AddressBuffer, Port, EffectiveId & 0xFF, Extra);
        }
        else
        {
            fprintf(File, "%slen=%d from=%s:%d id=0x%02X\r\n", Header, Length, AddressBuffer, Port, EffectiveId & 0xFF);
        }
    }
    else
    {
        if (Extra && Extra[0])
        {
            fprintf(File, "%slen=%d from=%s:%d %s\r\n", Header, Length, AddressBuffer, Port, Extra);
        }
        else
        {
            fprintf(File, "%slen=%d from=%s:%d\r\n", Header, Length, AddressBuffer, Port);
        }
    }

    if (!GConfig.bLogHex)
    {
        fclose(File);
        LeaveCriticalSection(&LogLock);
        return;
    }

    int DumpLength = (Length > GConfig.MaxDump) ? GConfig.MaxDump : Length;
    const uint8_t* Bytes = reinterpret_cast<const uint8_t*>(Data);
    for (int Offset = 0; Offset < DumpLength; Offset += 16)
    {
        const int LineLength = (DumpLength - Offset < 16) ? (DumpLength - Offset) : 16;
        fprintf(File, "  %04x  ", Offset);
        for (int Index = 0; Index < LineLength; ++Index)
        {
            fprintf(File, "%02x ", Bytes[Offset + Index]);
        }
        for (int Index = LineLength; Index < 16; ++Index)
        {
            fprintf(File, "   ");
        }
        fprintf(File, " |");
        for (int Index = 0; Index < LineLength; ++Index)
        {
            const uint8_t Value = Bytes[Offset + Index];
            const char Printable = (Value >= 0x20 && Value <= 0x7e) ? static_cast<char>(Value) : '.';
            fprintf(File, "%c", Printable);
        }
        fprintf(File, "|\r\n");
    }
    if (DumpLength < Length)
    {
        fprintf(File, "  ... truncated %d bytes\r\n", Length - DumpLength);
    }
    fclose(File);
    if (bConsoleEnabled)
    {
        fprintf(stdout, "%slen=%d from=%s:%d\r\n", Header, Length, AddressBuffer, Port);
        for (int Offset = 0; Offset < DumpLength; Offset += 16)
        {
            const int LineLength = (DumpLength - Offset < 16) ? (DumpLength - Offset) : 16;
            fprintf(stdout, "  \x1b[36m%04x\x1b[0m  ", Offset);
            for (int Index = 0; Index < LineLength; ++Index)
            {
                const uint8_t Value = Bytes[Offset + Index];
                if (Value == 0x00)
                {
                    fprintf(stdout, "\x1b[90m%02x\x1b[0m ", Value);
                }
                else if (Value >= 0x20 && Value <= 0x7e)
                {
                    fprintf(stdout, "\x1b[33m%02x\x1b[0m ", Value);
                }
                else
                {
                    fprintf(stdout, "%02x ", Value);
                }
            }
            for (int Index = LineLength; Index < 16; ++Index)
            {
                fprintf(stdout, "   ");
            }
            fprintf(stdout, " |");
            for (int Index = 0; Index < LineLength; ++Index)
            {
                const uint8_t Value = Bytes[Offset + Index];
                if (Value == 0x00)
                {
                    fprintf(stdout, "\x1b[90m.\x1b[0m");
                }
                else if (Value >= 0x20 && Value <= 0x7e)
                {
                    fprintf(stdout, "\x1b[33m%c\x1b[0m", static_cast<char>(Value));
                }
                else
                {
                    fprintf(stdout, ".");
                }
            }
            fprintf(stdout, "|\r\n");
        }
        if (DumpLength < Length)
        {
            fprintf(stdout, "  ... truncated %d bytes\r\n", Length - DumpLength);
        }
    }
    LeaveCriticalSection(&LogLock);
}

void LogBits(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength)
{
    if (!GConfig.bLogBits || !Data || Length <= 0)
    {
        return;
    }
    if (!bLogInit)
    {
        InitializeCriticalSection(&LogLock);
        bLogInit = true;
    }
    EnterCriticalSection(&LogLock);
    SYSTEMTIME Time;
    GetLocalTime(&Time);
    LONG Frame = InterlockedIncrement(&GLogFrame);
    char FuncName[128] = {0};
    _snprintf_s(FuncName, sizeof(FuncName), _TRUNCATE, "%s::Bits", Tag ? Tag : "Net");
    char Header[128] = {0};
    FormatHeader(Header, sizeof(Header), FuncName, Frame, Time);

    const uint8_t* Bytes = reinterpret_cast<const uint8_t*>(Data);
    int TotalBits = Length * 8;
    int MaxBits = GConfig.MaxBits > 0 ? GConfig.MaxBits : TotalBits;
    if (MaxBits > TotalBits)
    {
        MaxBits = TotalBits;
    }
    int BitsPerLine = GConfig.BitsPerLine > 0 ? GConfig.BitsPerLine : 128;

    char AddressBuffer[64] = {0};
    int Port = 0;
    if (Address && AddressLength >= static_cast<int>(sizeof(sockaddr_in)))
    {
        const sockaddr_in* SocketAddress = reinterpret_cast<const sockaddr_in*>(Address);
        inet_ntop(AF_INET, const_cast<in_addr*>(&SocketAddress->sin_addr), AddressBuffer, sizeof(AddressBuffer));
        Port = ntohs(SocketAddress->sin_port);
    }
    else
    {
        lstrcpyA(AddressBuffer, "n/a");
    }

    FILE* File = nullptr;
    if (fopen_s(&File, GConfig.LogPath, "ab") != 0 || !File)
    {
        LeaveCriticalSection(&LogLock);
        return;
    }
    fprintf(File, "%sbits=%d order=lsb0 from=%s:%d\r\n", Header, TotalBits, AddressBuffer, Port);
    for (int BitOffset = 0; BitOffset < MaxBits; BitOffset += BitsPerLine)
    {
        int LineBits = (MaxBits - BitOffset < BitsPerLine) ? (MaxBits - BitOffset) : BitsPerLine;
        fprintf(File, "  %04X  ", BitOffset);
        for (int LineBitIndex = 0; LineBitIndex < LineBits; ++LineBitIndex)
        {
            int Index = BitOffset + LineBitIndex;
            int ByteIndex = Index / 8;
            int BitIndex = Index % 8;
            int BitValue = (Bytes[ByteIndex] >> BitIndex) & 1;
            fputc(BitValue ? '1' : '0', File);
            if ((LineBitIndex & 7) == 7)
            {
                fputc(' ', File);
            }
        }
        fputc('\r', File);
        fputc('\n', File);
    }
    if (MaxBits < TotalBits)
    {
        fprintf(File, "  ... truncated %d bits\r\n", TotalBits - MaxBits);
    }
    fclose(File);

    if (bConsoleEnabled)
    {
        fprintf(stdout, "%sbits=%d order=lsb0 from=%s:%d\r\n", Header, TotalBits, AddressBuffer, Port);
        for (int BitOffset = 0; BitOffset < MaxBits; BitOffset += BitsPerLine)
        {
            int LineBits = (MaxBits - BitOffset < BitsPerLine) ? (MaxBits - BitOffset) : BitsPerLine;
            fprintf(stdout, "  %04X  ", BitOffset);
            for (int LineBitIndex = 0; LineBitIndex < LineBits; ++LineBitIndex)
            {
                int Index = BitOffset + LineBitIndex;
                int ByteIndex = Index / 8;
                int BitIndex = Index % 8;
                int BitValue = (Bytes[ByteIndex] >> BitIndex) & 1;
                fputc(BitValue ? '1' : '0', stdout);
                if ((LineBitIndex & 7) == 7)
                {
                    fputc(' ', stdout);
                }
            }
            fputc('\r', stdout);
            fputc('\n', stdout);
        }
        if (MaxBits < TotalBits)
        {
            fprintf(stdout, "  ... truncated %d bits\r\n", TotalBits - MaxBits);
        }
    }
    LeaveCriticalSection(&LogLock);
}

void LogBitsMsb(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength)
{
    if (!GConfig.bLogBitsMsb || !Data || Length <= 0)
    {
        return;
    }
    if (!bLogInit)
    {
        InitializeCriticalSection(&LogLock);
        bLogInit = true;
    }
    EnterCriticalSection(&LogLock);
    SYSTEMTIME Time;
    GetLocalTime(&Time);
    LONG Frame = InterlockedIncrement(&GLogFrame);
    char FuncName[128] = {0};
    _snprintf_s(FuncName, sizeof(FuncName), _TRUNCATE, "%s::BitsMsb", Tag ? Tag : "Net");
    char Header[128] = {0};
    FormatHeader(Header, sizeof(Header), FuncName, Frame, Time);

    const uint8_t* Bytes = reinterpret_cast<const uint8_t*>(Data);
    int TotalBits = Length * 8;
    int MaxBits = GConfig.MaxBits > 0 ? GConfig.MaxBits : TotalBits;
    if (MaxBits > TotalBits)
    {
        MaxBits = TotalBits;
    }
    int BitsPerLine = GConfig.BitsPerLine > 0 ? GConfig.BitsPerLine : 128;

    char AddressBuffer[64] = {0};
    int Port = 0;
    if (Address && AddressLength >= static_cast<int>(sizeof(sockaddr_in)))
    {
        const sockaddr_in* SocketAddress = reinterpret_cast<const sockaddr_in*>(Address);
        inet_ntop(AF_INET, const_cast<in_addr*>(&SocketAddress->sin_addr), AddressBuffer, sizeof(AddressBuffer));
        Port = ntohs(SocketAddress->sin_port);
    }
    else
    {
        lstrcpyA(AddressBuffer, "n/a");
    }

    FILE* File = nullptr;
    if (fopen_s(&File, GConfig.LogPath, "ab") != 0 || !File)
    {
        LeaveCriticalSection(&LogLock);
        return;
    }
    fprintf(File, "%sbits=%d order=msb0 from=%s:%d\r\n", Header, TotalBits, AddressBuffer, Port);
    for (int BitOffset = 0; BitOffset < MaxBits; BitOffset += BitsPerLine)
    {
        int LineBits = (MaxBits - BitOffset < BitsPerLine) ? (MaxBits - BitOffset) : BitsPerLine;
        fprintf(File, "  %04X  ", BitOffset);
        for (int LineBitIndex = 0; LineBitIndex < LineBits; ++LineBitIndex)
        {
            int Index = BitOffset + LineBitIndex;
            int ByteIndex = Index / 8;
            int BitIndex = Index % 8;
            int BitValue = (Bytes[ByteIndex] >> (7 - BitIndex)) & 1;
            fputc(BitValue ? '1' : '0', File);
            if ((LineBitIndex & 7) == 7)
            {
                fputc(' ', File);
            }
        }
        fputc('\r', File);
        fputc('\n', File);
    }
    if (MaxBits < TotalBits)
    {
        fprintf(File, "  ... truncated %d bits\r\n", TotalBits - MaxBits);
    }
    fclose(File);

    if (bConsoleEnabled)
    {
        fprintf(stdout, "%sbits=%d order=msb0 from=%s:%d\r\n", Header, TotalBits, AddressBuffer, Port);
        for (int BitOffset = 0; BitOffset < MaxBits; BitOffset += BitsPerLine)
        {
            int LineBits = (MaxBits - BitOffset < BitsPerLine) ? (MaxBits - BitOffset) : BitsPerLine;
            fprintf(stdout, "  %04X  ", BitOffset);
            for (int LineBitIndex = 0; LineBitIndex < LineBits; ++LineBitIndex)
            {
                int Index = BitOffset + LineBitIndex;
                int ByteIndex = Index / 8;
                int BitIndex = Index % 8;
                int BitValue = (Bytes[ByteIndex] >> (7 - BitIndex)) & 1;
                fputc(BitValue ? '1' : '0', stdout);
                if ((LineBitIndex & 7) == 7)
                {
                    fputc(' ', stdout);
                }
            }
            fputc('\r', stdout);
            fputc('\n', stdout);
        }
        if (MaxBits < TotalBits)
        {
            fprintf(stdout, "  ... truncated %d bits\r\n", TotalBits - MaxBits);
        }
    }
    LeaveCriticalSection(&LogLock);
}

void BytesToHex(const uint8_t* Data, size_t Length, char* Out, size_t OutLength)
{
    if (!Out || OutLength == 0)
    {
        return;
    }
    size_t Pos = 0;
    for (size_t Index = 0; Index < Length && Pos + 3 < OutLength; ++Index)
    {
        int Written = _snprintf_s(Out + Pos, OutLength - Pos, _TRUNCATE, "%02X", Data[Index]);
        if (Written <= 0)
        {
            break;
        }
        Pos += static_cast<size_t>(Written);
        if (Index + 1 < Length && Pos + 1 < OutLength)
        {
            Out[Pos++] = ' ';
            Out[Pos] = '\0';
        }
    }
}

void InitConsole()
{
    if (!GConfig.bConsoleEnable || bConsoleEnabled)
    {
        return;
    }
    if (!AttachConsole(ATTACH_PARENT_PROCESS))
    {
        AllocConsole();
    }
    FILE* File = nullptr;
    freopen_s(&File, "CONOUT$", "w", stdout);
    freopen_s(&File, "CONOUT$", "w", stderr);
    setvbuf(stdout, nullptr, _IONBF, 0);
    setvbuf(stderr, nullptr, _IONBF, 0);
    const HANDLE StdOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (StdOut && StdOut != INVALID_HANDLE_VALUE)
    {
        DWORD Mode = 0;
        if (GetConsoleMode(StdOut, &Mode))
        {
            SetConsoleMode(StdOut, Mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
        }
    }
    const HANDLE StdErr = GetStdHandle(STD_ERROR_HANDLE);
    if (StdErr && StdErr != INVALID_HANDLE_VALUE)
    {
        DWORD Mode = 0;
        if (GetConsoleMode(StdErr, &Mode))
        {
            SetConsoleMode(StdErr, Mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
        }
    }
    SetConsoleTitleA("FoM Hook Log");
    bConsoleEnabled = true;
}

