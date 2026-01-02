/** FoM protocol (engine-level) hooks. */
#include "HookFoMProtocol.h"
#include "HookDecode.h"
#include "HookLogging.h"
#include <string>
#include <intrin.h>

using FNetSendToFn = int (__fastcall *)(void* ThisPtr, void* Edx, SOCKET Socket, char* Buffer, int Length, int Ip, int Port);
using FNetSendFn = int (__fastcall *)(void* ThisPtr, void* Edx, char* Buffer, int Length);
using FNetRecvFn = int (__fastcall *)(void* ThisPtr, void* Edx, char* Buffer, int Length);
using FPacketProcFn = bool (__thiscall *)(void* ThisPtr, int TravelDir, void* OutPacket, void* OutSender);
using FGetPacketIdFn = uint8_t (__fastcall *)(void* Packet, void* Edx, int Size);
using FLoginRequestWriteFn = char (__thiscall *)(void* ThisPtr);
using FLoginButtonOnClickFn = char (__thiscall *)(void* ThisPtr, char* Source, char* a3, __int16 a4, int a5, char* a6, char a7, int a8, int a9);
using FHuffmanGenFn = int (__thiscall *)(void* ThisPtr, void* FreqTable);
using FHuffmanEncodeFn = void* (__thiscall *)(void* ThisPtr, int a2, unsigned int a3, void* a4);
using FLogin6DHandlerFn = char (__thiscall *)(void* ThisPtr, void* NetAddr, void* Packet);
using FLogin6DReadFn = char (__thiscall *)(void* ThisPtr, void* Packet);
using FLogin6DReturnFn = char (__thiscall *)(void* ThisPtr, void* Packet);
using FLoginSerializeFn = char (__thiscall *)(void* ThisPtr);
using FClientSendPacketFn = char (__thiscall *)(void* ThisPtr, void* Packet, int a3, int a4, int a5, int a6);
using FClientDispatchFn = char (__thiscall *)(void* ThisPtr, char MsgId, void* Packet);
using FClientHandlePacketFn = char (__thiscall *)(void* ThisPtr, int MsgId, int Packet);
using FClientLogFormatFn = int (__cdecl *)(void* OutString, const char* Format);
using FClientLogDebugFn = int (__cdecl *)(void* Message);
using FFomLogPrintfFn = void* (__cdecl *)(const char* Format, ...);
using FFomLogWriteFn = void* (__cdecl *)(const char* Message);

static FNetSendToFn NetSendToFn = nullptr;
static FNetSendFn NetSendFn = nullptr;
static FNetRecvFn NetRecvFn = nullptr;
static FPacketProcFn PacketProcFn = nullptr;
static FLoginRequestWriteFn LoginRequestWriteFn = nullptr;
static FLoginButtonOnClickFn LoginButtonOnClickFn = nullptr;
static FGetPacketIdFn GetPacketIdFn = nullptr;
static FHuffmanGenFn HuffmanGenFn = nullptr;
static FHuffmanEncodeFn HuffmanEncodeFn = nullptr;
static FLogin6DHandlerFn Login6DHandlerFn = nullptr;
static FLogin6DReadFn Login6DReadFn = nullptr;
static FLogin6DReturnFn Login6DReturnFn = nullptr;
static FLoginSerializeFn LoginSerializeFn = nullptr;
static FClientSendPacketFn ClientSendPacketFn = nullptr;
static FClientDispatchFn ClientDispatchFn = nullptr;
static FClientHandlePacketFn ClientHandlePacketFn = nullptr;
static FClientLogFormatFn ClientLogFormatFn = nullptr;
static FClientLogDebugFn ClientLogDebugFn = nullptr;
static FFomLogPrintfFn FomLogPrintfFn = nullptr;
static FFomLogWriteFn FomLogWriteFn = nullptr;

static volatile LONG FoMHooksInstalled = 0;
// Huffman hook path disabled; runtime table lives on server.
static thread_local int g_Login6DDepth = 0;

static int __fastcall HookNetSendTo(void* ThisPtr, void* Edx, SOCKET Socket, char* Buffer, int Length, int Ip, int Port);
static int __fastcall HookNetSend(void* ThisPtr, void* Edx, char* Buffer, int Length);
static int __fastcall HookNetRecv(void* ThisPtr, void* Edx, char* Buffer, int Length);
static bool __fastcall HookPacketProc(void* ThisPtr, void* Edx, int TravelDir, void* OutPacket, void* OutSender);
static char __fastcall HookLoginRequestWrite(void* ThisPtr, void* Edx);
static char __fastcall HookLoginButtonOnClick(void* ThisPtr, void* Edx, char* Source, char* a3, __int16 a4, int a5, char* a6, char a7, int a8, int a9);
static int __fastcall HookHuffmanGenerate(void* ThisPtr, void* Edx, void* FreqTable);
static void* __fastcall HookHuffmanEncode(void* ThisPtr, void* Edx, int a2, unsigned int a3, void* a4);
static char __fastcall HookLogin6DHandler(void* ThisPtr, void* Edx, void* NetAddr, void* Packet);
static char __fastcall HookLogin6DRead(void* ThisPtr, void* Edx, void* Packet);
static char __fastcall HookLogin6DReturn(void* ThisPtr, void* Edx, void* Packet);
static char __fastcall HookLoginSerialize(void* ThisPtr, void* Edx);
static char __fastcall HookClientSendPacket(void* ThisPtr, void* Edx, void* Packet, int a3, int a4, int a5, int a6);
static char __fastcall HookClientDispatch(void* ThisPtr, void* Edx, char MsgId, void* Packet);
static char __fastcall HookClientHandlePacket(void* ThisPtr, void* Edx, int MsgId, int Packet);

struct HuffmanEncodingEntry
{
    uint8_t* Encoding;
    uint16_t BitLength;
    uint16_t Pad;
};

struct HuffmanEncodingTree
{
    void* Root;
    HuffmanEncodingEntry Table[256];
};

static void EnsureDirectoryForPath(const char* Path)
{
    if (!Path || !Path[0])
    {
        return;
    }
    char Buffer[MAX_PATH] = {0};
    lstrcpynA(Buffer, Path, MAX_PATH);
    for (char* p = Buffer + 1; *p; ++p)
    {
        if (*p == '\\' || *p == '/')
        {
            char Saved = *p;
            *p = '\0';
            CreateDirectoryA(Buffer, nullptr);
            *p = Saved;
        }
    }
}

static bool ExtractPacketBytes(void* Packet, const uint8_t** OutData, uint32_t* OutBytes, uint32_t* OutBits)
{
    if (!OutData || !OutBytes)
    {
        return false;
    }
    *OutData = nullptr;
    *OutBytes = 0;
    if (OutBits)
    {
        *OutBits = 0;
    }
    struct CPacketDataRef
    {
        uint8_t* Data;
        uint32_t ByteCount;
        volatile LONG RefCount;
    };
    struct CPacketView
    {
        CPacketDataRef* DataRef;
        uint32_t BitOffset;
        uint32_t BitCount;
        uint32_t BitLimit;
    };
    struct CBitStream
    {
        void* VTable;
        uint32_t Unknown04;
        uint32_t BitsUsed;
        uint32_t ReadOffset;
        uint32_t BitsAlloc;
        uint32_t Unknown14;
        uint8_t* Data;
    };
    const CPacketView* View = reinterpret_cast<const CPacketView*>(Packet);
    const CPacketDataRef* DataRef = nullptr;
    uint32_t BitCount = 0;
    uint32_t BitLimit = 0;
    uint32_t ByteCount = 0;
    const uint8_t* DataPtr = nullptr;
    __try
    {
        DataRef = View ? View->DataRef : nullptr;
        BitCount = View ? View->BitCount : 0;
        BitLimit = View ? View->BitLimit : 0;
        if (DataRef)
        {
            DataPtr = DataRef->Data;
            ByteCount = DataRef->ByteCount;
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        DataRef = nullptr;
    }
    if (BitLimit && BitCount > BitLimit)
    {
        BitCount = BitLimit;
    }
    uint32_t Bytes = 0;
    if (BitCount)
    {
        Bytes = (BitCount + 7u) / 8u;
    }
    if (ByteCount && (!Bytes || ByteCount > Bytes))
    {
        Bytes = ByteCount;
    }
    if (DataPtr && Bytes)
    {
        *OutData = DataPtr;
        *OutBytes = Bytes;
        if (OutBits)
        {
            *OutBits = BitCount;
        }
        return true;
    }
    const uint8_t* StreamData = nullptr;
    uint32_t StreamBits = 0;
    __try
    {
        const uint8_t* PacketBase = reinterpret_cast<const uint8_t*>(Packet);
        const CBitStream* Stream = *reinterpret_cast<const CBitStream* const*>(PacketBase + 0x0C);
        if (Stream)
        {
            StreamData = Stream->Data;
            StreamBits = Stream->BitsUsed ? Stream->BitsUsed : Stream->BitsAlloc;
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        StreamData = nullptr;
        StreamBits = 0;
    }
    if (StreamData && StreamBits)
    {
        *OutData = StreamData;
        *OutBytes = (StreamBits + 7u) / 8u;
        if (OutBits)
        {
            *OutBits = StreamBits;
        }
        return true;
    }
    return false;
}

static bool ExtractEmbeddedBitStream(const void* StreamBase, const uint8_t** OutData, uint32_t* OutBytes, uint32_t* OutBits)
{
    if (!StreamBase || !OutData || !OutBytes)
    {
        return false;
    }
    *OutData = nullptr;
    *OutBytes = 0;
    if (OutBits)
    {
        *OutBits = 0;
    }
    struct CBitStream
    {
        void* VTable;
        uint32_t Unknown04;
        uint32_t BitsUsed;
        uint32_t ReadOffset;
        uint32_t BitsAlloc;
        uint32_t Unknown14;
        uint8_t* Data;
    };
    const CBitStream* Stream = reinterpret_cast<const CBitStream*>(StreamBase);
    const uint8_t* Data = nullptr;
    uint32_t Bits = 0;
    __try
    {
        Bits = Stream->BitsUsed ? Stream->BitsUsed : Stream->BitsAlloc;
        Data = Stream->Data;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Data = nullptr;
        Bits = 0;
    }
    if (!Data || Bits == 0)
    {
        return false;
    }
    *OutData = Data;
    *OutBytes = (Bits + 7u) / 8u;
    if (OutBits)
    {
        *OutBits = Bits;
    }
    return true;
}

static void DumpHuffmanTable(const void* TreePtr)
{
    if (!TreePtr)
    {
        return;
    }
    const HuffmanEncodingTree* Tree = reinterpret_cast<const HuffmanEncodingTree*>(TreePtr);
    const char* OutPath = GConfig.HuffmanTablePath[0] ? GConfig.HuffmanTablePath : "huffman_table_runtime.json";
    EnsureDirectoryForPath(OutPath);
    FILE* File = nullptr;
    fopen_s(&File, OutPath, "wb");
    if (!File)
    {
        LOG("[Huffman] failed to open dump path %s", OutPath);
        return;
    }
    fprintf(File, "[\n");
    for (int Index = 0; Index < 256; ++Index)
    {
        const HuffmanEncodingEntry& Entry = Tree->Table[Index];
        const uint16_t BitLen = Entry.BitLength;
        const uint8_t* Enc = Entry.Encoding;
        std::string Bits;
        Bits.reserve(BitLen);
        for (uint16_t Bit = 0; Bit < BitLen; ++Bit)
        {
            uint8_t Byte = Enc ? Enc[Bit >> 3] : 0;
            uint8_t BitVal = (Byte >> (7 - (Bit & 7))) & 1;
            Bits.push_back(BitVal ? '1' : '0');
        }
        fprintf(File, "  {\"sym\":%d,\"bitlen\":%u,\"bits\":\"%s\"}%s\n",
                Index, BitLen, Bits.c_str(), (Index < 255) ? "," : "");
    }
    fprintf(File, "]\n");
    fclose(File);
    LOG("[Huffman] dumped table to %s", OutPath);
}

static int __fastcall HookHuffmanGenerate(void* ThisPtr, void* Edx, void* FreqTable)
{
    (void)Edx;
    int Result = HuffmanGenFn ? HuffmanGenFn(ThisPtr, FreqTable) : 0;
    if (!GConfig.bDumpHuffmanTable)
    {
        return Result;
    }
    if (!GExeBase)
    {
        return Result;
    }
    const uint8_t* DefaultFreq = GExeBase + 0x0031D6A0; // unk_119D6A0
    if (FreqTable == DefaultFreq)
    {
        DumpHuffmanTable(ThisPtr);
    }
    return Result;
}

static void* __fastcall HookHuffmanEncode(void* ThisPtr, void* Edx, int a2, unsigned int a3, void* a4)
{
    (void)Edx;
    return HuffmanEncodeFn ? HuffmanEncodeFn(ThisPtr, a2, a3, a4) : nullptr;
}

static void LogLoginRequest(const void* Packet)
{
    if (!Packet || !GConfig.bLogLogin6C || !ShouldCaptureNetwork())
    {
        return;
    }
    const uint8_t* Base = reinterpret_cast<const uint8_t*>(Packet);
    const char* Text = reinterpret_cast<const char*>(Base + 0x430);
    uint16_t Token = *reinterpret_cast<const uint16_t*>(Base + 0x470);
    const int MaxLen = 2048;
    int Length = 0;
    for (; Length < MaxLen && Text[Length]; ++Length)
    {
    }
    int ShowLen = Length < 256 ? Length : 256;
    char Ascii[260] = {0};
    for (int Index = 0; Index < ShowLen; ++Index)
    {
        char Ch = Text[Index];
        if (Ch < 0x20 || Ch > 0x7E)
        {
            Ch = '.';
        }
        Ascii[Index] = Ch;
    }
    Ascii[ShowLen] = '\0';
    char Line[512] = {0};
    _snprintf_s(Line, sizeof(Line), _TRUNCATE,
                "[Login6C] u16=0x%04X len=%d text=%s%s",
                Token, Length, Ascii, (Length > ShowLen) ? "..." : "");
    LOG("%s", Line);

    int HexLen = Length < 32 ? Length : 32;
    if (HexLen > 0)
    {
        char Hex[256] = {0};
        BytesToHex(reinterpret_cast<const uint8_t*>(Text), HexLen, Hex, sizeof(Hex));
        char Line2[512] = {0};
        _snprintf_s(Line2, sizeof(Line2), _TRUNCATE,
                    "[Login6C] hex=%s%s", Hex, (Length > HexLen) ? " ..." : "");
        LOG("%s", Line2);
    }
}

static void LogLoginUiString(const char* Label, const char* Text)
{
    if (!Label)
    {
        return;
    }
    if (!Text)
    {
        LOG("[LoginUI] %s=<null>", Label);
        return;
    }
    const int MaxLen = 256;
    int Length = 0;
    for (; Length < MaxLen && Text[Length]; ++Length)
    {
    }
    int ShowLen = Length < 128 ? Length : 128;
    char Ascii[132] = {0};
    for (int Index = 0; Index < ShowLen; ++Index)
    {
        char Ch = Text[Index];
        if (Ch < 0x20 || Ch > 0x7E)
        {
            Ch = '.';
        }
        Ascii[Index] = Ch;
    }
    Ascii[ShowLen] = '\0';
    LOG("[LoginUI] %s len=%d text=%s%s", Label, Length, Ascii, (Length > ShowLen) ? "..." : "");
}

static void ClientLogDebugShort(const char* Message);

static bool SafeReadStringField(void* Base, size_t Offset, char* Out, size_t OutSize)
{
    if (!Out || OutSize == 0)
    {
        return false;
    }
    Out[0] = '\0';
    if (!Base)
    {
        return false;
    }
    __try
    {
        const char* Src = reinterpret_cast<const char*>(reinterpret_cast<const uint8_t*>(Base) + Offset);
        strncpy_s(Out, OutSize, Src, _TRUNCATE);
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Out[0] = '\0';
        return false;
    }
}

static uint32_t SafeReadU32Field(void* Base, size_t Offset, uint32_t DefaultValue)
{
    if (!Base)
    {
        return DefaultValue;
    }
    __try
    {
        return *reinterpret_cast<const uint32_t*>(reinterpret_cast<const uint8_t*>(Base) + Offset);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return DefaultValue;
    }
}

static uint8_t SafeReadU8Field(void* Base, size_t Offset, uint8_t DefaultValue)
{
    if (!Base)
    {
        return DefaultValue;
    }
    __try
    {
        return *reinterpret_cast<const uint8_t*>(reinterpret_cast<const uint8_t*>(Base) + Offset);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return DefaultValue;
    }
}

static void ClientLogShortValue(const char* Prefix, const char* Value)
{
    if (!Prefix || !Value)
    {
        return;
    }
    char Msg[32] = {0};
    _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "%s%.12s", Prefix, Value);
    ClientLogDebugShort(Msg);
}

static void ClientLogDebugShort(const char* Message)
{
    if (!Message || !GConfig.bClientLog6D || !GExeBase)
    {
        return;
    }
    if (!FomLogPrintfFn)
    {
        FomLogPrintfFn = reinterpret_cast<FFomLogPrintfFn>(GExeBase + 0x0004FA20); // FomLog_Printf -> fom.log
    }
    if (FomLogPrintfFn)
    {
        FomLogPrintfFn("%s", Message);
    }
    if (!FomLogWriteFn)
    {
        FomLogWriteFn = reinterpret_cast<FFomLogWriteFn>(GExeBase + 0x0004FB00); // FomLog_Write -> fom.log
    }
    if (FomLogWriteFn)
    {
        FomLogWriteFn(Message);
    }
    if (!ClientLogFormatFn)
    {
        ClientLogFormatFn = reinterpret_cast<FClientLogFormatFn>(GExeBase + 0x00162090); // Log_FormatString
    }
    if (!ClientLogDebugFn)
    {
        ClientLogDebugFn = reinterpret_cast<FClientLogDebugFn>(GExeBase + 0x001642F0); // Log_Debug
    }
    if (!ClientLogFormatFn || !ClientLogDebugFn)
    {
        return;
    }
    // std::string is 28 bytes in this build (stack-sized in decomp). Keep messages short to avoid heap.
    uint8_t TmpString[28] = {};
    ClientLogFormatFn(TmpString, Message);
    ClientLogDebugFn(TmpString);
    // No destructor: short messages stay in SSO; avoids allocator mismatch risk.
}

static void EmitFomLogTestOnce()
{
    static bool Done = false;
    if (Done || !GExeBase)
    {
        return;
    }
    Done = true;
    if (!FomLogPrintfFn)
    {
        FomLogPrintfFn = reinterpret_cast<FFomLogPrintfFn>(GExeBase + 0x0004FA20); // FomLog_Printf -> fom.log
    }
    if (FomLogPrintfFn)
    {
        FomLogPrintfFn("HOOK TEST: fom.log sink ok");
    }
}

static uint8_t* ResolveLogin6DHandlerBase()
{
    if (GConfig.Login6DHandlerModule[0])
    {
        HMODULE Module = GetModuleHandleA(GConfig.Login6DHandlerModule);
        return reinterpret_cast<uint8_t*>(Module);
    }
    return GExeBase;
}

static size_t SelectDetourLength(const uint8_t* Code)
{
    if (!Code)
    {
        return 0;
    }
    // Packet_ID_LOGIN_REQUEST_RETURN_Read starts with:
    // C6 81 30 04 00 00 01 8D 81 31 04 00 00 ...
    // First two instructions are 7+6 bytes; we must not split the LEA.
    if (Code[0] == 0xC6 && Code[1] == 0x81 && Code[2] == 0x30 && Code[3] == 0x04 &&
        Code[4] == 0x00 && Code[5] == 0x00 && Code[6] == 0x01 &&
        Code[7] == 0x8D && Code[8] == 0x81 && Code[9] == 0x31 && Code[10] == 0x04 &&
        Code[11] == 0x00 && Code[12] == 0x00)
    {
        return 13;
    }
    if (Code[0] == 0x55 && Code[1] == 0x8B && Code[2] == 0xEC)
    {
        if (Code[3] == 0x6A && Code[4] == 0xFF && Code[5] == 0x68)
        {
            return 10; // push ebp; mov ebp, esp; push -1; push imm32 (SEH prologue)
        }
        if (Code[3] == 0x83 && Code[4] == 0xEC)
        {
            return 6; // push ebp; mov ebp, esp; sub esp, imm8
        }
        if (Code[3] == 0x56 && Code[4] == 0x8B && Code[5] == 0xF1)
        {
            return 6; // push ebp; mov ebp, esp; push esi; mov esi, ecx
        }
        if (Code[3] == 0x6A)
        {
            return 5; // push ebp; mov ebp, esp; push imm8
        }
        if (Code[3] == 0x81 && Code[4] == 0xEC)
        {
            return 9; // push ebp; mov ebp, esp; sub esp, imm32
        }
        return 5; // fallback to a safe minimum for common prologues
    }
    return 0;
}

static void TryDecodeLogin6DFromPacket(void* Packet, const char* Tag)
{
    if (!Packet || !Tag)
    {
        return;
    }
    const uint32_t MaxDump = (GConfig.MaxDump > 0) ? static_cast<uint32_t>(GConfig.MaxDump) : 256u;
    struct CBitStream
    {
        void* VTable;
        uint32_t Unknown04;
        uint32_t BitsUsed;
        uint32_t ReadOffset;
        uint32_t BitsAlloc;
        uint32_t Unknown14;
        uint8_t* Data;
    };
    struct CPacketDataRef
    {
        uint8_t* Data;
        uint32_t ByteCount;
        volatile LONG RefCount;
    };
    struct CPacketView
    {
        CPacketDataRef* DataRef;
        uint32_t BitOffset;
        uint32_t BitCount;
        uint32_t BitLimit;
    };
    const CPacketView* View = reinterpret_cast<const CPacketView*>(Packet);
    const CPacketDataRef* DataRef = nullptr;
    const uint8_t* DataPtr = nullptr;
    uint32_t BitCount = 0;
    uint32_t BitLimit = 0;
    __try
    {
        DataRef = View ? View->DataRef : nullptr;
        BitCount = View ? View->BitCount : 0;
        BitLimit = View ? View->BitLimit : 0;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        DataRef = nullptr;
        BitCount = 0;
        BitLimit = 0;
    }
    if (DataRef)
    {
        __try
        {
            DataPtr = DataRef->Data;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            DataPtr = nullptr;
        }
    }
    uint32_t Bytes = 0;
    if (BitLimit && BitCount > BitLimit)
    {
        BitCount = BitLimit;
    }
    if (BitCount)
    {
        Bytes = (BitCount + 7u) / 8u;
    }
    uint32_t ByteCount = 0;
    if (DataRef)
    {
        __try
        {
            ByteCount = DataRef->ByteCount;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            ByteCount = 0;
        }
    }
    if (ByteCount && (!Bytes || ByteCount > Bytes))
    {
        Bytes = ByteCount;
    }
    if (Bytes > MaxDump)
    {
        Bytes = MaxDump;
    }
    if (DataPtr && Bytes > 0)
    {
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(DataPtr), static_cast<int>(Bytes), Tag);
        return;
    }

    const uint8_t* StreamData = nullptr;
    uint32_t StreamBytes = 0;
    __try
    {
        const uint8_t* PacketBase = reinterpret_cast<const uint8_t*>(Packet);
        const CBitStream* Stream = *reinterpret_cast<const CBitStream* const*>(PacketBase + 0x0C);
        if (Stream)
        {
            StreamData = Stream->Data;
            if (Stream->BitsAlloc)
            {
                StreamBytes = (Stream->BitsAlloc + 7u) / 8u;
            }
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        StreamData = nullptr;
        StreamBytes = 0;
    }
    if (!StreamBytes || StreamBytes > MaxDump)
    {
        StreamBytes = MaxDump;
    }
    if (StreamData && StreamBytes > 0)
    {
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(StreamData), static_cast<int>(StreamBytes), Tag);
    }
}

static char __fastcall HookLoginRequestWrite(void* ThisPtr, void* Edx)
{
    (void)Edx;
    LogLoginRequest(ThisPtr);
    return LoginRequestWriteFn ? LoginRequestWriteFn(ThisPtr) : 0;
}

static char __fastcall HookLoginButtonOnClick(void* ThisPtr, void* Edx, char* Source, char* a3, __int16 a4, int a5, char* a6, char a7, int a8, int a9)
{
    (void)Edx;
    (void)a5;
    (void)a7;
    (void)a8;
    (void)a9;
    if (GConfig.bLogLogin6C)
    {
        LogLoginUiString("source", Source);
        LogLoginUiString("arg2", a3);
        LogLoginUiString("arg5", a6);
        LOG("[LoginUI] token=0x%04X", static_cast<unsigned short>(a4));
    }
    return LoginButtonOnClickFn ? LoginButtonOnClickFn(ThisPtr, Source, a3, a4, a5, a6, a7, a8, a9) : 0;
}

static char __fastcall HookLogin6DHandler(void* ThisPtr, void* Edx, void* NetAddr, void* Packet)
{
    (void)Edx;
    ClientLogDebugShort("L6D enter");
    if (GConfig.bClientLog6D)
    {
        char Msg[64] = {0};
        _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "L6D net=%p pkt=%p", NetAddr, Packet);
        ClientLogDebugShort(Msg);
    }
    char Result = Login6DHandlerFn ? Login6DHandlerFn(ThisPtr, NetAddr, Packet) : 0;
    LOG("[Login6DHandler] called netAddr=%p packet=%p ret=%d", NetAddr, Packet, Result);
    if (Packet)
    {
        uint8_t Status = 0xFF;
        __try
        {
            Status = *reinterpret_cast<uint8_t*>(reinterpret_cast<uint8_t*>(Packet) + 1072);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            Status = 0xFF;
        }
        char Msg[16] = {0};
        _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "L6D st=%u", Status);
        ClientLogDebugShort(Msg);
    }
    ClientLogDebugShort(Result ? "L6D ok" : "L6D bad");
    TryDecodeLogin6DFromPacket(Packet, "Login6DHandler");
    return Result;
}

static char __fastcall HookLogin6DRead(void* ThisPtr, void* Edx, void* Packet)
{
    (void)Edx;
    char Result = 0;
    bool Crashed = false;
    if (GConfig.bClientLog6D)
    {
        char Msg[64] = {0};
        _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "L6D rd net=%p", Packet);
        ClientLogDebugShort(Msg);
    }
    __try
    {
        Result = Login6DReadFn ? Login6DReadFn(ThisPtr, Packet) : 0;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Crashed = true;
        Result = 0;
        LOG("[Login6DRead] EXCEPTION code=0x%08X packet=%p", GetExceptionCode(), Packet);
    }
    if (Crashed)
    {
        return Result;
    }
    if (GConfig.bClientLog6D)
    {
        uint8_t LoginId = SafeReadU8Field(ThisPtr, 0x428, 0xFF);
        uint8_t Status = SafeReadU8Field(ThisPtr, 0x430, 0xFF);
        char Suffix[24] = {0};
        SafeReadStringField(ThisPtr, 0x431, Suffix, sizeof(Suffix));
        char Msg[32] = {0};
        _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "L6D rd=%d", Result);
        ClientLogDebugShort(Msg);
        char Msg2[32] = {0};
        _snprintf_s(Msg2, sizeof(Msg2), _TRUNCATE, "L6D id=%u", LoginId);
        ClientLogDebugShort(Msg2);
        char Msg3[32] = {0};
        _snprintf_s(Msg3, sizeof(Msg3), _TRUNCATE, "L6D st=%u", Status);
        ClientLogDebugShort(Msg3);
        ClientLogShortValue("L6D suf=", Suffix);
        LOG("[Login6DRead] ret=%d id=%u status=%u suffix=%s", Result, LoginId, Status, Suffix);
    }
    return Result;
}

static char __fastcall HookLogin6DReturn(void* ThisPtr, void* Edx, void* Packet)
{
    (void)Edx;
    if (GConfig.bHookLogin6DReturn)
    {
        LOG("[Login6DReturn] enter this=%p packet=%p", ThisPtr, Packet);
    }
    g_Login6DDepth += 1;
    char Result = Login6DReturnFn ? Login6DReturnFn(ThisPtr, Packet) : 0;
    if (g_Login6DDepth > 0)
    {
        g_Login6DDepth -= 1;
    }
    if (GConfig.bHookLogin6DReturn)
    {
        LOG("[Login6DReturn] exit ret=%d", Result);
    }
    return Result;
}

static void LogLoginSerialized(const char* Tag, void* Packet)
{
    if (!Packet || !Tag)
    {
        return;
    }
    const uint8_t* Data = nullptr;
    uint32_t Bytes = 0;
    uint32_t Bits = 0;
    const uint8_t* StreamBase = reinterpret_cast<const uint8_t*>(Packet) + 0x0C;
    bool Ok = ExtractEmbeddedBitStream(StreamBase, &Data, &Bytes, &Bits);
    if (!Ok)
    {
        Ok = ExtractPacketBytes(Packet, &Data, &Bytes, &Bits);
    }
    if (!Ok || !Data || Bytes == 0)
    {
        LOG("[LoginSerialize] no data (packet=%p)", Packet);
        return;
    }
    int MsgId = -1;
    __try
    {
        MsgId = Data[0];
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        MsgId = -1;
    }
    char Extra[96] = {0};
    _snprintf_s(Extra, sizeof(Extra), _TRUNCATE, "bits=%u bytes=%u", Bits, Bytes);
    uint32_t Dump = Bytes;
    if (GConfig.MaxDump > 0 && Dump > static_cast<uint32_t>(GConfig.MaxDump))
    {
        Dump = static_cast<uint32_t>(GConfig.MaxDump);
    }
    LogHexExId(Tag, Data, static_cast<int>(Dump), nullptr, 0, Extra, MsgId);
}

static char __fastcall HookLoginSerialize(void* ThisPtr, void* Edx)
{
    (void)Edx;
    char Result = LoginSerializeFn ? LoginSerializeFn(ThisPtr) : 0;
    if (Result && GConfig.bHookLoginSerialize && g_Login6DDepth > 0)
    {
        LogLoginSerialized("LoginSerialize", ThisPtr);
    }
    return Result;
}

static char __fastcall HookClientSendPacket(void* ThisPtr, void* Edx, void* Packet, int a3, int a4, int a5, int a6)
{
    (void)Edx;
    char Result = ClientSendPacketFn ? ClientSendPacketFn(ThisPtr, Packet, a3, a4, a5, a6) : 0;
    if (!GConfig.bHookLoginSend)
    {
        return Result;
    }
    if (g_Login6DDepth > 0)
    {
        LOG("[LoginSend] packet=%p a6=%d result=%d", Packet, a6, Result);
        LogLoginSerialized("LoginSend", Packet);
    }
    return Result;
}

static char __fastcall HookClientDispatch(void* ThisPtr, void* Edx, char MsgId, void* Packet)
{
    (void)Edx;
    if (GConfig.bClientLog6D)
    {
        static uint8_t LastMsgId = 0xFF;
        static ULONGLONG LastLogMs = 0;
        ULONGLONG Now = GetTickCount64();
        bool ShouldLog = (static_cast<uint8_t>(MsgId) == 0x6D) || (MsgId != LastMsgId) || (Now - LastLogMs > 1000);
        if (ShouldLog)
        {
            LOG("[Dispatch] msg=0x%02X packet=%p", static_cast<uint8_t>(MsgId), Packet);
            LastMsgId = static_cast<uint8_t>(MsgId);
            LastLogMs = Now;
        }
        if (static_cast<uint8_t>(MsgId) == 0x6D)
        {
            ClientLogDebugShort("DISP 6D enter");
        }
    }
    char Result = ClientDispatchFn ? ClientDispatchFn(ThisPtr, MsgId, Packet) : 0;
    if (GConfig.bClientLog6D && MsgId == 0x6D)
    {
        char Msg[32] = {0};
        _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "DISP 6D ret=%d", Result);
        ClientLogDebugShort(Msg);
    }
    return Result;
}

static char __fastcall HookClientHandlePacket(void* ThisPtr, void* Edx, int MsgId, int Packet)
{
    (void)Edx;
    if (GConfig.bClientLog6D)
    {
        static uint8_t LastMsgId = 0xFF;
        static ULONGLONG LastLogMs = 0;
        ULONGLONG Now = GetTickCount64();
        uint8_t Msg = static_cast<uint8_t>(MsgId);
        bool ShouldLog = (Msg == 0x6D) || (Msg != LastMsgId) || (Now - LastLogMs > 1000);
        if (ShouldLog)
        {
            LOG("[HandlePacket] msg=0x%02X packet=%p", Msg, reinterpret_cast<void*>(Packet));
            LastMsgId = Msg;
            LastLogMs = Now;
        }
        if (Msg == 0x6D)
        {
            ClientLogDebugShort("HP 6D enter");
        }
    }
    char Result = ClientHandlePacketFn ? ClientHandlePacketFn(ThisPtr, MsgId, Packet) : 0;
    if (GConfig.bClientLog6D && static_cast<uint8_t>(MsgId) == 0x6D)
    {
        char Msg[32] = {0};
        _snprintf_s(Msg, sizeof(Msg), _TRUNCATE, "HP 6D ret=%d", Result);
        ClientLogDebugShort(Msg);
    }
    return Result;
}

static void LogIpPort(const char* Tag, const void* Buffer, int Length, int Ip, int Port)
{
    if (!Tag || !Buffer || Length <= 0)
    {
        return;
    }
    sockaddr_in SockAddr{};
    SockAddr.sin_family = AF_INET;
    SockAddr.sin_addr.s_addr = Ip;
    SockAddr.sin_port = htons(static_cast<u_short>(Port));
    LogHex(Tag, Buffer, Length, reinterpret_cast<const sockaddr*>(&SockAddr), sizeof(SockAddr));
}

static int __fastcall HookNetSendTo(void* ThisPtr, void* Edx, SOCKET Socket, char* Buffer, int Length, int Ip, int Port)
{
    int Result = NetSendToFn ? NetSendToFn(ThisPtr, Edx, Socket, Buffer, Length, Ip, Port) : 0;
    if (Length > 0 && ShouldCaptureNetwork() && GConfig.bLogSend)
    {
        LogIpPort("Rak][Net_SendTo", Buffer, Length, Ip, Port);
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(Buffer), Length, "Net_SendTo");
    }
    return Result;
}

static int __fastcall HookNetSend(void* ThisPtr, void* Edx, char* Buffer, int Length)
{
    int Result = NetSendFn ? NetSendFn(ThisPtr, Edx, Buffer, Length) : 0;
    if (Length > 0 && ShouldCaptureNetwork() && GConfig.bLogSend)
    {
        LogHex("Rak][Net_Send", Buffer, Length, nullptr, 0);
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(Buffer), Length, "Net_Send");
    }
    return Result;
}

static int __fastcall HookNetRecv(void* ThisPtr, void* Edx, char* Buffer, int Length)
{
    int Result = NetRecvFn ? NetRecvFn(ThisPtr, Edx, Buffer, Length) : 0;
    if (Result > 0 && ShouldCaptureNetwork() && GConfig.bLogRecv)
    {
        LogHex("Rak][Net_Recv", Buffer, Result, nullptr, 0);
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(Buffer), Result, "Net_Recv");
    }
    return Result;
}

static bool __fastcall HookPacketProc(void* ThisPtr, void* Edx, int TravelDir, void* OutPacket, void* OutSender)
{
    (void)Edx;
    bool Result = PacketProcFn ? PacketProcFn(ThisPtr, TravelDir, OutPacket, OutSender) : false;
    if (!Result || !ShouldCaptureNetwork() || !GConfig.bLogRecv || !OutPacket)
    {
        return Result;
    }
    void* Packet = nullptr;
    __try
    {
        Packet = *reinterpret_cast<void**>(OutPacket);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Packet = nullptr;
    }
    if (!Packet)
    {
        return Result;
    }
    struct CPacketDataRef
    {
        uint8_t* Data;
        uint32_t ByteCount;
        volatile LONG RefCount;
    };
    // Packet layout from sub_EBA580: [0]=DataRef, [4]=BitOffset, [8]=BitCount, [0xC]=BitLimit
    struct CPacketView
    {
        CPacketDataRef* DataRef;
        uint32_t BitOffset;
        uint32_t BitCount;
        uint32_t BitLimit;
    };
    const CPacketView* View = reinterpret_cast<const CPacketView*>(Packet);
    const CPacketDataRef* DataRef = nullptr;
    const uint8_t* DataPtr = nullptr;
    uint32_t BitOffset = 0;
    uint32_t BitCount = 0;
    uint32_t BitLimit = 0;
    __try
    {
        DataRef = View ? View->DataRef : nullptr;
        BitOffset = View ? View->BitOffset : 0;
        BitCount = View ? View->BitCount : 0;
        BitLimit = View ? View->BitLimit : 0;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        DataRef = nullptr;
        BitOffset = 0;
        BitCount = 0;
        BitLimit = 0;
    }
    if (DataRef)
    {
        __try
        {
            DataPtr = DataRef->Data;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            DataPtr = nullptr;
        }
    }
    uint32_t BytesFromBits = 0;
    if (BitLimit && BitCount > BitLimit)
    {
        BitCount = BitLimit;
    }
    if (BitCount)
    {
        BytesFromBits = (BitCount + 7u) / 8u;
    }
    uint32_t Bytes = BytesFromBits;
    uint32_t ByteCount = 0;
    if (DataRef)
    {
        __try
        {
            ByteCount = DataRef->ByteCount;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            ByteCount = 0;
        }
    }
    if (ByteCount && (!Bytes || ByteCount > Bytes))
    {
        Bytes = ByteCount;
    }
    if (Bytes > static_cast<uint32_t>(GConfig.MaxDump) && GConfig.MaxDump > 0)
    {
        Bytes = static_cast<uint32_t>(GConfig.MaxDump);
    }
    char Extra[160] = {0};
    _snprintf_s(Extra, sizeof(Extra), _TRUNCATE, "src=PacketProc bits=%u bytes=%u dir=%d", BitCount, Bytes, TravelDir);
    int PacketId = -1;
    if (DataPtr)
    {
        __try
        {
            PacketId = DataPtr[0];
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            PacketId = -1;
        }
    }
    const char* LithTag = "Lith][Net_Recv";
    if (TravelDir == 2)
    {
        LithTag = "Lith][Net_SendTo";
    }
    if (DataPtr && Bytes > 0 && PacketId >= 0)
    {
        volatile uint8_t Probe = 0;
        bool bReadable = false;
        __try
        {
            Probe = DataPtr[0];
            bReadable = true;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            bReadable = false;
        }
        if (bReadable)
        {
            LogHexExId(LithTag, DataPtr, static_cast<int>(Bytes), nullptr, 0, Extra, PacketId);
        }
        else
        {
            Logf(LithTag, "skip dump: invalid data ptr=0x%p", DataPtr);
        }
    }
    return Result;
}

static void InstallFoMProtocolHooks()
{
    if (!GExeBase)
    {
        return;
    }
    EmitFomLogTestOnce();
    if (!GConfig.bWrapperHooks)
    {
        LOG("FoM protocol hooks disabled");
        return;
    }
    /** RVA values based on IDA base 0x00E80000. */
    const uint8_t NetSendToPrologue[6] = {0x55, 0x8B, 0xEC, 0x83, 0xEC, 0x18};
    const uint8_t NetSendPrologue[7] = {0x55, 0x8B, 0xEC, 0x51, 0x89, 0x4D, 0xFC};
    const uint8_t NetRecvPrologue[7] = {0x55, 0x8B, 0xEC, 0x51, 0x89, 0x4D, 0xFC};
    const uint8_t PacketProcPrologue[10] = {0x55, 0x8B, 0xEC, 0x6A, 0xFF, 0x68, 0xF8, 0x74, 0xB4, 0x00};

    InstallDetourChecked("Net_SendTo", 0x000E5E30, sizeof(NetSendToPrologue),
                         NetSendToPrologue, reinterpret_cast<void*>(&HookNetSendTo),
                         reinterpret_cast<void**>(&NetSendToFn));
    InstallDetourChecked("Net_Send", 0x001230F0, sizeof(NetSendPrologue),
                         NetSendPrologue, reinterpret_cast<void*>(&HookNetSend),
                         reinterpret_cast<void**>(&NetSendFn));
    InstallDetourChecked("Net_Recv", 0x00123120, sizeof(NetRecvPrologue),
                         NetRecvPrologue, reinterpret_cast<void*>(&HookNetRecv),
                         reinterpret_cast<void**>(&NetRecvFn));
    if (GConfig.bWrapperPacketProc)
    {
        GetPacketIdFn = reinterpret_cast<FGetPacketIdFn>(GExeBase + 0x0003A580);
        InstallDetourChecked("PacketProc", 0x0003AFD0, sizeof(PacketProcPrologue),
                             PacketProcPrologue, reinterpret_cast<void*>(&HookPacketProc),
                             reinterpret_cast<void**>(&PacketProcFn));
    }
    else
    {
        LOG("PacketProc detour disabled");
    }
    if (GConfig.bLogLogin6C)
    {
        const uint8_t LoginWritePrologue[8] = {0x56, 0x8B, 0xF1, 0xE8, 0xC8, 0xF0, 0xFF, 0xFF};
        InstallDetourCheckedRel32("LoginRequest_Write", 0x0009B720, sizeof(LoginWritePrologue),
                                  LoginWritePrologue, reinterpret_cast<void*>(&HookLoginRequestWrite),
                                  reinterpret_cast<void**>(&LoginRequestWriteFn), 3);
        uint8_t* LoginButtonTarget = GExeBase + 0x0009D090;
        size_t LoginButtonLen = SelectDetourLength(LoginButtonTarget);
        if (LoginButtonLen >= 5)
        {
            InstallDetourAt(LoginButtonTarget, LoginButtonLen, reinterpret_cast<void*>(&HookLoginButtonOnClick),
                            reinterpret_cast<void**>(&LoginButtonOnClickFn), "LoginButton_OnClick");
        }
        else
        {
            char Bytes[32] = {0};
            if (LoginButtonTarget)
            {
                BytesToHex(LoginButtonTarget, 8, Bytes, sizeof(Bytes));
            }
            (void)LoginButtonTarget;
            (void)Bytes;
        }
    }
    else
    {
        LOG("LoginRequest logging disabled");
    }
    if (GConfig.bHookLogin6DHandler && GConfig.Login6DHandlerRva)
    {
        uint8_t* Base = ResolveLogin6DHandlerBase();
        if (!Base)
        {
            LOG("[Login6DHandler] module not loaded (module=%s)", GConfig.Login6DHandlerModule[0] ? GConfig.Login6DHandlerModule : "<exe>");
        }
        else
        {
            uint8_t* Target = Base + GConfig.Login6DHandlerRva;
            size_t Len = SelectDetourLength(Target);
            if (Len >= 5)
            {
                InstallDetourAt(Target, Len, reinterpret_cast<void*>(&HookLogin6DHandler),
                                reinterpret_cast<void**>(&Login6DHandlerFn), "Login6DHandler");
            }
            else
            {
                char Bytes[32] = {0};
                if (Target)
                {
                    BytesToHex(Target, 8, Bytes, sizeof(Bytes));
                }
                (void)Target;
                (void)Bytes;
            }
        }
    }
    if (GConfig.bHookLogin6DReturn && GConfig.Login6DHandlerRva)
    {
        if (GConfig.bHookLogin6DHandler)
        {
            (void)0;
        }
        else
        {
            uint8_t* Base = ResolveLogin6DHandlerBase();
            if (!Base)
            {
                LOG("[Login6DReturn] module not loaded (module=%s)", GConfig.Login6DHandlerModule[0] ? GConfig.Login6DHandlerModule : "<exe>");
            }
            else
            {
                uint8_t* Target = Base + GConfig.Login6DHandlerRva;
                size_t Len = SelectDetourLength(Target);
                if (Len >= 5)
                {
                    InstallDetourAt(Target, Len, reinterpret_cast<void*>(&HookLogin6DReturn),
                                    reinterpret_cast<void**>(&Login6DReturnFn), "Login6DReturn");
                }
                else
                {
                    char Bytes[32] = {0};
                    if (Target)
                    {
                        BytesToHex(Target, 8, Bytes, sizeof(Bytes));
                    }
                    (void)Target;
                    (void)Bytes;
                }
            }
        }
    }
    if (GConfig.bHookLoginSerialize && GConfig.LoginSerializeRva)
    {
        uint8_t* Target = GExeBase + GConfig.LoginSerializeRva;
        size_t Len = SelectDetourLength(Target);
        if (Len >= 5)
        {
            InstallDetourAt(Target, Len, reinterpret_cast<void*>(&HookLoginSerialize),
                            reinterpret_cast<void**>(&LoginSerializeFn), "LoginSerialize");
        }
        else
        {
            char Bytes[32] = {0};
            if (Target)
            {
                BytesToHex(Target, 8, Bytes, sizeof(Bytes));
            }
            (void)Target;
            (void)Bytes;
        }
    }
    if (GConfig.bHookLoginSend && GConfig.LoginSendRva)
    {
        uint8_t* Target = GExeBase + GConfig.LoginSendRva;
        size_t Len = SelectDetourLength(Target);
        if (Len >= 5)
        {
            InstallDetourAt(Target, Len, reinterpret_cast<void*>(&HookClientSendPacket),
                            reinterpret_cast<void**>(&ClientSendPacketFn), "LoginSendPacket");
        }
        else
        {
            char Bytes[32] = {0};
            if (Target)
            {
                BytesToHex(Target, 8, Bytes, sizeof(Bytes));
            }
            (void)Target;
            (void)Bytes;
        }
    }
    if (GConfig.bClientLog6D)
    {
        uint8_t* ReadTarget = GExeBase + 0x0009B760; // Packet_ID_LOGIN_REQUEST_RETURN_Read
        size_t ReadLen = SelectDetourLength(ReadTarget);
        if (ReadLen >= 5)
        {
            InstallDetourAt(ReadTarget, ReadLen, reinterpret_cast<void*>(&HookLogin6DRead),
                            reinterpret_cast<void**>(&Login6DReadFn), "Login6DRead");
        }
        else
        {
            char Bytes[32] = {0};
            if (ReadTarget)
            {
                BytesToHex(ReadTarget, 8, Bytes, sizeof(Bytes));
            }
            (void)ReadTarget;
            (void)Bytes;
        }
    }
    if (GConfig.bClientLog6D)
    {
        uint8_t* DispatchTarget = GExeBase + 0x0009D250; // dispatcher (MsgId switch)
        size_t DispatchLen = SelectDetourLength(DispatchTarget);
        if (DispatchLen >= 5)
        {
            InstallDetourAt(DispatchTarget, DispatchLen, reinterpret_cast<void*>(&HookClientDispatch),
                            reinterpret_cast<void**>(&ClientDispatchFn), "ClientDispatch");
        }
        else
        {
            char Bytes[32] = {0};
            if (DispatchTarget)
            {
                BytesToHex(DispatchTarget, 8, Bytes, sizeof(Bytes));
            }
            (void)DispatchTarget;
            (void)Bytes;
        }
    }
    if (GConfig.bClientLog6D)
    {
        uint8_t* HandleTarget = GExeBase + 0x000B8290; // outer handler (calls dispatcher)
        size_t HandleLen = SelectDetourLength(HandleTarget);
        if (HandleLen >= 5)
        {
            InstallDetourAt(HandleTarget, HandleLen, reinterpret_cast<void*>(&HookClientHandlePacket),
                            reinterpret_cast<void**>(&ClientHandlePacketFn), "ClientHandlePacket");
        }
        else
        {
            char Bytes[32] = {0};
            if (HandleTarget)
            {
                BytesToHex(HandleTarget, 8, Bytes, sizeof(Bytes));
            }
            (void)HandleTarget;
            (void)Bytes;
        }
    }
    LOG("FoM protocol hooks installed");
}

void EnsureFoMProtocolHooks()
{
    if (InterlockedCompareExchange(&FoMHooksInstalled, 1, 0) != 0)
    {
        return;
    }
    InstallFoMProtocolHooks();
    InterlockedExchange(&FoMHooksInstalled, 2);
}
