#include "HookLithTech.h"
#include "HookLogging.h"
#include <intrin.h>

using FLithTechMsgHandler = int(__cdecl*)(int ClientCtx, void* Packet);

static FLithTechMsgHandler OrigOnNetProtocolVersion = nullptr;
static FLithTechMsgHandler OrigOnLoadWorld = nullptr;
static FLithTechMsgHandler OrigOnYourId = nullptr;
static FLithTechMsgHandler OrigOnClientObjectId = nullptr;
static FLithTechMsgHandler OrigOnMessageGroup = nullptr;
static FLithTechMsgHandler OrigOnMessage = nullptr;
static FLithTechMsgHandler OrigOnUnguaranteedUpdate = nullptr;

static bool TryReadPacketBytes(void* Packet, const uint8_t** OutData, uint32_t* OutLen)
{
    if (!Packet || !OutData || !OutLen)
        return false;
    
    *OutData = nullptr;
    *OutLen = 0;
    
    __try
    {
        struct CPacketView
        {
            void* DataRef;
            uint32_t BitOffset;
            uint32_t BitCount;
            uint32_t BitLimit;
        };
        
        struct CPacketDataRef
        {
            uint8_t* Data;
            uint32_t ByteCount;
        };
        
        const CPacketView* View = reinterpret_cast<const CPacketView*>(Packet);
        if (View && View->DataRef)
        {
            const CPacketDataRef* Ref = reinterpret_cast<const CPacketDataRef*>(View->DataRef);
            if (Ref && Ref->Data && Ref->ByteCount > 0)
            {
                *OutData = Ref->Data;
                *OutLen = Ref->ByteCount;
                return true;
            }
        }
        
        uint32_t BitCount = View ? View->BitCount : 0;
        if (BitCount > 0)
        {
            *OutLen = (BitCount + 7) / 8;
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }
    
    return *OutLen > 0;
}

static void LogLithTechMsg(const char* HandlerName, int MsgId, void* Packet)
{
    const uint8_t* Data = nullptr;
    uint32_t Len = 0;
    
    char Extra[128] = {0};
    if (TryReadPacketBytes(Packet, &Data, &Len) && Data && Len > 0)
    {
        int PreviewLen = (Len > 16) ? 16 : Len;
        char HexPreview[64] = {0};
        for (int i = 0; i < PreviewLen; i++)
        {
            char Byte[4];
            _snprintf_s(Byte, sizeof(Byte), _TRUNCATE, "%02X ", Data[i]);
            strcat_s(HexPreview, sizeof(HexPreview), Byte);
        }
        _snprintf_s(Extra, sizeof(Extra), _TRUNCATE, "len=%u data=[%s%s]", 
                    Len, HexPreview, (Len > 16) ? "..." : "");
    }
    
    LOG("[LithTech] %s (ID %d) called %s", HandlerName, MsgId, Extra);
}

static int __cdecl HookOnNetProtocolVersion(int ClientCtx, void* Packet)
{
    LogLithTechMsg("OnNetProtocolVersionPacket", 4, Packet);
    return OrigOnNetProtocolVersion ? OrigOnNetProtocolVersion(ClientCtx, Packet) : 0;
}

static int __cdecl HookOnLoadWorld(int ClientCtx, void* Packet)
{
    LogLithTechMsg("OnLoadWorldPacket", 6, Packet);
    int result = OrigOnLoadWorld ? OrigOnLoadWorld(ClientCtx, Packet) : 0;
    LOG("[LithTech] OnLoadWorldPacket returned %d (0=OK, 41=MISSINGWORLD, 42=INVALIDWORLD, 43=BINDERROR)", result);
    return result;
}

static int __cdecl HookOnYourId(int ClientCtx, void* Packet)
{
    LogLithTechMsg("OnYourIDPacket", 12, Packet);
    return OrigOnYourId ? OrigOnYourId(ClientCtx, Packet) : 0;
}

static int __cdecl HookOnClientObjectId(int ClientCtx, void* Packet)
{
    LogLithTechMsg("OnClientObjectID", 7, Packet);
    return OrigOnClientObjectId ? OrigOnClientObjectId(ClientCtx, Packet) : 0;
}

static int __cdecl HookOnMessageGroup(int ClientCtx, void* Packet)
{
    LogLithTechMsg("OnMessageGroupPacket", 14, Packet);
    return OrigOnMessageGroup ? OrigOnMessageGroup(ClientCtx, Packet) : 0;
}

static int __cdecl HookOnMessage(int ClientCtx, void* Packet)
{
    LogLithTechMsg("OnMessagePacket", 13, Packet);
    return OrigOnMessage ? OrigOnMessage(ClientCtx, Packet) : 0;
}

static int __cdecl HookOnUnguaranteedUpdate(int ClientCtx, void* Packet)
{
    // No logging - this is spammy (10-20 Hz heartbeat)
    return OrigOnUnguaranteedUpdate ? OrigOnUnguaranteedUpdate(ClientCtx, Packet) : 0;
}

void InstallLithTechMessageHooks()
{
    if (!GExeBase)
    {
        LOG("[LithTech] GExeBase not set, skipping hooks");
        return;
    }
    
    LOG("[LithTech] Installing message handler hooks...");
    
    // Prologue lengths verified via IDA disasm - must not split instructions
    // ID4  @ 0x425060: 55 8B EC 56 8B 75 0C = 7 bytes
    // ID6  @ 0x4266C0: 55 8B EC 6A FF 68 xx xx xx xx = 10 bytes
    // ID7  @ 0x425040: 55 8B EC 8B 4D 0C = 6 bytes
    // ID10 @ 0x4260D0: 55 8B EC 81 EC 84 00 00 00 = 9 bytes
    // ID12 @ 0x424EF0: 55 8B EC 56 8B 75 08 = 7 bytes
    // ID13 @ 0x426F50: 55 8B EC 6A FF 68 xx xx xx xx = 10 bytes
    // ID14 @ 0x426C00: 55 8B EC 6A FF 68 xx xx xx xx = 10 bytes
    
    bool Ok4 = InstallDetour(0x00025060, 7, reinterpret_cast<void*>(&HookOnNetProtocolVersion),
                              reinterpret_cast<void**>(&OrigOnNetProtocolVersion));
    
    bool Ok6 = InstallDetour(0x000266C0, 10, reinterpret_cast<void*>(&HookOnLoadWorld),
                              reinterpret_cast<void**>(&OrigOnLoadWorld));
    
    bool Ok7 = InstallDetour(0x00025040, 6, reinterpret_cast<void*>(&HookOnClientObjectId),
                              reinterpret_cast<void**>(&OrigOnClientObjectId));
    
    bool Ok10 = InstallDetour(0x000260D0, 9, reinterpret_cast<void*>(&HookOnUnguaranteedUpdate),
                               reinterpret_cast<void**>(&OrigOnUnguaranteedUpdate));
    
    bool Ok12 = InstallDetour(0x00024EF0, 7, reinterpret_cast<void*>(&HookOnYourId),
                               reinterpret_cast<void**>(&OrigOnYourId));
    
    bool Ok13 = InstallDetour(0x00026F50, 10, reinterpret_cast<void*>(&HookOnMessage),
                               reinterpret_cast<void**>(&OrigOnMessage));
    
    bool Ok14 = InstallDetour(0x00026C00, 10, reinterpret_cast<void*>(&HookOnMessageGroup),
                               reinterpret_cast<void**>(&OrigOnMessageGroup));
    
    LOG("[LithTech] Hooks: ID4=%s ID6=%s ID7=%s ID10=%s ID12=%s ID13=%s ID14=%s",
        Ok4 ? "ok" : "fail", Ok6 ? "ok" : "fail", Ok7 ? "ok" : "fail",
        Ok10 ? "ok" : "fail", Ok12 ? "ok" : "fail", Ok13 ? "ok" : "fail", Ok14 ? "ok" : "fail");
}
