/** RakNet detour implementation. */
#include "HookRakNet.h"

static void* RakDecryptTrampoline = nullptr;

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
    /** RVA 0x004F41B0 RakNet_DecryptEntry. */
    const uint32_t RvaDecrypt = 0x0F41B0;
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

