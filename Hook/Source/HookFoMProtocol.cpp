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
using FHuffmanGenFn = int (__thiscall *)(void* ThisPtr, void* FreqTable);
using FHuffmanEncodeFn = void* (__thiscall *)(void* ThisPtr, int a2, unsigned int a3, void* a4);
using FFomLogPrintfFn = void* (__cdecl *)(const char* Format, ...);

static FNetSendToFn NetSendToFn = nullptr;
static FNetSendFn NetSendFn = nullptr;
static FNetRecvFn NetRecvFn = nullptr;
static FPacketProcFn PacketProcFn = nullptr;
static FGetPacketIdFn GetPacketIdFn = nullptr;
static FHuffmanGenFn HuffmanGenFn = nullptr;
static FHuffmanEncodeFn HuffmanEncodeFn = nullptr;
static FFomLogPrintfFn FomLogPrintfFn = nullptr;

static volatile LONG FoMHooksInstalled = 0;
// Huffman hook path disabled; runtime table lives on server.

static int __fastcall HookNetSendTo(void* ThisPtr, void* Edx, SOCKET Socket, char* Buffer, int Length, int Ip, int Port);
static int __fastcall HookNetSend(void* ThisPtr, void* Edx, char* Buffer, int Length);
static int __fastcall HookNetRecv(void* ThisPtr, void* Edx, char* Buffer, int Length);
static bool __fastcall HookPacketProc(void* ThisPtr, void* Edx, int TravelDir, void* OutPacket, void* OutSender);
static int __fastcall HookHuffmanGenerate(void* ThisPtr, void* Edx, void* FreqTable);
static void* __fastcall HookHuffmanEncode(void* ThisPtr, void* Edx, int a2, unsigned int a3, void* a4);

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
