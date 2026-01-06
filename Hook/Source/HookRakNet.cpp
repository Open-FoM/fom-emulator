/** RakNet detour implementation. */
#include "HookRakNet.h"

static void* RakDecryptTrampoline = nullptr;

static void LogRakNetKey(void* Self, const void* Key)
{
    if (!GConfig.bLogRakNetKey)
    {
        return;
    }
    const uint8_t* KeyBytes = nullptr;
    if (Key)
    {
        KeyBytes = reinterpret_cast<const uint8_t*>(Key);
    }
    else if (Self)
    {
        KeyBytes = reinterpret_cast<const uint8_t*>(Self) + 0x1408;
    }
    if (!KeyBytes)
    {
        return;
    }
    char Hex[33] = {0};
    __try
    {
        for (int Index = 0; Index < 16; ++Index)
        {
            _snprintf_s(Hex + Index * 2, sizeof(Hex) - Index * 2, _TRUNCATE, "%02X", KeyBytes[Index]);
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        LOG("RakNet SetEncryptionKey key unreadable self=%p key=%p", Self, Key);
        return;
    }
    char Line[256];
    _snprintf_s(Line, sizeof(Line), _TRUNCATE, "RakNet SetEncryptionKey self=%p key=%s", Self, Hex);
    LOG("%s", Line);
}

static void LogRakNetDecrypt(const void* Peer, const uint8_t* Buffer, int Length, const uint8_t* Plain, int PlainLength)
{
    if (!GConfig.bLogRakNetDecrypt)
    {
        return;
    }
    if (!GConfig.LogPath[0])
    {
        return;
    }
    char Path[MAX_PATH];
    _snprintf_s(Path, sizeof(Path), _TRUNCATE, "%s.raknet", GConfig.LogPath);
    HANDLE FileHandle = CreateFileA(Path, GENERIC_WRITE, FILE_SHARE_READ, nullptr, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (FileHandle == INVALID_HANDLE_VALUE)
    {
        return;
    }
    SetFilePointer(FileHandle, 0, nullptr, FILE_END);
    DWORD Written = 0;
    SYSTEMTIME Time; GetLocalTime(&Time);
    char Header[256];
    int HeaderLength = _snprintf_s(Header, sizeof(Header), _TRUNCATE,
        "[%02u:%02u:%02u.%03u] peer=%p len=%d plainLen=%d\r\n",
        Time.wHour, Time.wMinute, Time.wSecond, Time.wMilliseconds, Peer, Length, PlainLength);
    WriteFile(FileHandle, Header, HeaderLength, &Written, nullptr);
    if (Buffer && Length > 0)
    {
        WriteFile(FileHandle, "cipher: ", 8, &Written, nullptr);
        for (int Index = 0; Index < Length; ++Index)
        {
            char ByteHex[4];
            int WrittenHex = _snprintf_s(ByteHex, sizeof(ByteHex), _TRUNCATE, "%02X", Buffer[Index] & 0xFF);
            WriteFile(FileHandle, ByteHex, WrittenHex, &Written, nullptr);
        }
        WriteFile(FileHandle, "\r\n", 2, &Written, nullptr);
    }
    if (Plain && PlainLength > 0)
    {
        WriteFile(FileHandle, "plain: ", 7, &Written, nullptr);
        for (int Index = 0; Index < PlainLength; ++Index)
        {
            char ByteHex[4];
            int WrittenHex = _snprintf_s(ByteHex, sizeof(ByteHex), _TRUNCATE, "%02X", Plain[Index] & 0xFF);
            WriteFile(FileHandle, ByteHex, WrittenHex, &Written, nullptr);
        }
        WriteFile(FileHandle, "\r\n", 2, &Written, nullptr);
    }
    WriteFile(FileHandle, "\r\n", 2, &Written, nullptr);
    CloseHandle(FileHandle);
}

/** RakNet detours. */
typedef void(__thiscall* FRakSetKeyFn)(void* Self, const void* Key);
static FRakSetKeyFn RakSetKeyFn = nullptr;

static void __fastcall HookRakSetEncryptionKeyCall(void* Self, void* Edx, const void* Key)
{
    (void)Edx;
    LogRakNetKey(Self, Key);
    if (RakSetKeyFn)
    {
        RakSetKeyFn(Self, Key);
    }
}

typedef int(__thiscall* FRakDecryptFn)(void* Self, uint8_t* Buffer, int Length, void* Arg4, void* Arg5);
static FRakDecryptFn RakDecryptFn = nullptr;

int __fastcall HookRakDecryptEntry(void* Self, void* Edx, uint8_t* Buffer, int Length, void* Arg4, void* Arg5)
{
    (void)Edx;
    std::vector<uint8_t> Cipher;
    if (Buffer && Length > 0)
    {
        Cipher.assign(Buffer, Buffer + Length);
    }
    int Result = RakDecryptFn ? RakDecryptFn(Self, Buffer, Length, Arg4, Arg5) : 0;
    LogRakNetDecrypt(Self, Cipher.data(), (int)Cipher.size(), Buffer, Length);
    return Result;
}

void InstallRakNetDetours()
{
    if (!GConfig.bRakNetHooks)
    {
        LOG("RakNet hooks disabled");
        return;
    }
    /** RVA 0x004113C0 ReliabilityLayer_SetEncryptionKey (client base assumed 0x400000). */
    const uint32_t RvaSetKey = 0x0113C0;
    /** RVA 0x004F41B0 RakNet_DecryptEntry. */
    const uint32_t RvaDecrypt = 0x0F41B0;
    if (GConfig.bLogRakNetKey)
    {
        RakSetKeyFn = reinterpret_cast<FRakSetKeyFn>(GExeBase + RvaSetKey);
        if (!RakSetKeyFn)
        {
            LOG("RakNet_SetEncryptionKey address missing");
        }
        else
        {
            int Patched = 0;
            uint8_t* Base = GExeBase;
            auto* Dos = reinterpret_cast<PIMAGE_DOS_HEADER>(Base);
            auto* Nt = reinterpret_cast<PIMAGE_NT_HEADERS>(Base + Dos->e_lfanew);
            auto* Section = IMAGE_FIRST_SECTION(Nt);
            for (unsigned int Index = 0; Index < Nt->FileHeader.NumberOfSections; ++Index, ++Section)
            {
                if (memcmp(Section->Name, ".text", 5) != 0)
                {
                    continue;
                }
                uint8_t* Start = Base + Section->VirtualAddress;
                uint8_t* End = Start + Section->Misc.VirtualSize;
                for (uint8_t* Cursor = Start; Cursor + 5 <= End; ++Cursor)
                {
                    if (Cursor[0] != 0xE8)
                    {
                        continue;
                    }
                    int32_t Rel = *reinterpret_cast<int32_t*>(Cursor + 1);
                    uint8_t* Target = Cursor + 5 + Rel;
                    if (Target != Base + RvaSetKey)
                    {
                        continue;
                    }
                    DWORD OldProt = 0;
                    if (!VirtualProtect(Cursor + 1, sizeof(int32_t), PAGE_EXECUTE_READWRITE, &OldProt))
                    {
                        continue;
                    }
                    int32_t NewRel = static_cast<int32_t>(reinterpret_cast<uint8_t*>(&HookRakSetEncryptionKeyCall) - (Cursor + 5));
                    *reinterpret_cast<int32_t*>(Cursor + 1) = NewRel;
                    VirtualProtect(Cursor + 1, sizeof(int32_t), OldProt, &OldProt);
                    FlushInstructionCache(GetCurrentProcess(), Cursor, 5);
                    Patched++;
                }
                break;
            }
            if (Patched > 0)
            {
                LOG("RakNet_SetEncryptionKey callsites patched=%d", Patched);
            }
            else
            {
                LOG("RakNet_SetEncryptionKey callsites NOT patched");
            }
        }
    }
    if (GConfig.bLogRakNetDecrypt)
    {
        if (InstallDetour(RvaDecrypt, 5, reinterpret_cast<void*>(&HookRakDecryptEntry), &RakDecryptTrampoline))
        {
            RakDecryptFn = reinterpret_cast<FRakDecryptFn>(RakDecryptTrampoline);
            LOG("RakNet_DecryptEntry detoured");
        }
        else
        {
            LOG("RakNet_DecryptEntry detour FAILED");
        }
    }
}

