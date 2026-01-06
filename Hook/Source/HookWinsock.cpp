
/** Network hook wiring and wrappers. */
#include "HookWinsock.h"
#include "HookDecode.h"

using FRecvFromFn = int (WSAAPI *)(SOCKET, char*, int, int, sockaddr*, int*);
using FRecvFn = int (WSAAPI *)(SOCKET, char*, int, int);
using FSendToFn = int (WSAAPI *)(SOCKET, const char*, int, int, const sockaddr*, int);
using FSendFn = int (WSAAPI *)(SOCKET, const char*, int, int);
using FWsaRecvFromFn = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, LPDWORD, sockaddr*, LPINT, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using FWsaRecvFn = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, LPDWORD, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using FWsaSendToFn = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, DWORD, const sockaddr*, int, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using FWsaSendFn = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, DWORD, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using FGetProcAddressFn = FARPROC (WINAPI *)(HMODULE, LPCSTR);
using FGetQueuedCompletionStatusFn = BOOL (WINAPI *)(HANDLE, LPDWORD, PULONG_PTR, LPOVERLAPPED*, DWORD);
using FGetQueuedCompletionStatusExFn = BOOL (WINAPI *)(HANDLE, LPOVERLAPPED_ENTRY, ULONG, PULONG, DWORD, BOOL);
using FWsaGetOverlappedResultFn = BOOL (WSAAPI *)(SOCKET, LPWSAOVERLAPPED, LPDWORD, BOOL, LPDWORD);
using FSelectFn = int (WSAAPI *)(int, fd_set*, fd_set*, fd_set*, const timeval*);
using FWsaPollFn = int (WSAAPI *)(LPWSAPOLLFD, ULONG, INT);
using FWsaWaitForMultipleEventsFn = DWORD (WSAAPI *)(DWORD, const WSAEVENT*, BOOL, DWORD, BOOL);
using FWsaEventSelectFn = int (WSAAPI *)(SOCKET, WSAEVENT, long);
using FWsaEnumNetworkEventsFn = int (WSAAPI *)(SOCKET, WSAEVENT, LPWSANETWORKEVENTS);
using FWsaAsyncSelectFn = int (WSAAPI *)(SOCKET, HWND, u_int, long);
using FIoctlSocketFn = int (WSAAPI *)(SOCKET, long, u_long*);

static FRecvFromFn RecvFromFn = nullptr;
static FRecvFn RecvFn = nullptr;
static FSendToFn SendToFn = nullptr;
static FSendFn SendFn = nullptr;
static FWsaRecvFromFn WsaRecvFromFn = nullptr;
static FWsaRecvFn WsaRecvFn = nullptr;
static FWsaSendToFn WsaSendToFn = nullptr;
static FWsaSendFn WsaSendFn = nullptr;
static FGetProcAddressFn GetProcAddressFn = nullptr;
static FGetQueuedCompletionStatusFn GetQueuedCompletionStatusFn = nullptr;
static FGetQueuedCompletionStatusExFn GetQueuedCompletionStatusExFn = nullptr;
static FWsaGetOverlappedResultFn WsaGetOverlappedResultFn = nullptr;
static FSelectFn SelectFn = nullptr;
static FWsaPollFn WsaPollFn = nullptr;
static FWsaWaitForMultipleEventsFn WsaWaitForMultipleEventsFn = nullptr;
static FWsaEventSelectFn WsaEventSelectFn = nullptr;
static FWsaEnumNetworkEventsFn WsaEnumNetworkEventsFn = nullptr;
static FWsaAsyncSelectFn WsaAsyncSelectFn = nullptr;
static FIoctlSocketFn IoctlSocketFn = nullptr;

struct FOverlappedInfo
{
    LPWSABUF Buffers = nullptr;
    DWORD Count = 0;
    sockaddr* From = nullptr;
    LPINT FromLength = nullptr;
    char Tag[24] = {0};
};

static CRITICAL_SECTION OverlappedLock;
static bool bOverlappedInit = false;
static std::unordered_map<LPWSAOVERLAPPED, FOverlappedInfo> OverlappedMap;

static int WSAAPI HookRecvFrom(SOCKET Socket, char* Buffer, int Length, int Flags, sockaddr* From, int* FromLength);
static int WSAAPI HookRecv(SOCKET Socket, char* Buffer, int Length, int Flags);
static int WSAAPI HookSendTo(SOCKET Socket, const char* Buffer, int Length, int Flags, const sockaddr* To, int ToLength);
static int WSAAPI HookSend(SOCKET Socket, const char* Buffer, int Length, int Flags);
static int WSAAPI HookWsaRecvFrom(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, LPDWORD Flags,
    sockaddr* From, LPINT FromLength, LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine);
static int WSAAPI HookWsaRecv(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, LPDWORD Flags,
    LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine);
static int WSAAPI HookWsaSendTo(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, DWORD Flags,
    const sockaddr* To, int ToLength, LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine);
static int WSAAPI HookWsaSend(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, DWORD Flags,
    LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine);
static FARPROC WINAPI HookGetProcAddress(HMODULE Module, LPCSTR Name);
static BOOL WINAPI HookGetQueuedCompletionStatus(HANDLE Port, LPDWORD Bytes, PULONG_PTR Key, LPOVERLAPPED* Overlapped, DWORD TimeoutMs);
static BOOL WINAPI HookGetQueuedCompletionStatusEx(HANDLE Port, LPOVERLAPPED_ENTRY Entries, ULONG Count, PULONG Removed, DWORD TimeoutMs, BOOL bAlertable);
static BOOL WSAAPI HookWsaGetOverlappedResult(SOCKET Socket, LPWSAOVERLAPPED Overlapped, LPDWORD Bytes, BOOL bWait, LPDWORD Flags);
static int WSAAPI HookSelect(int NumFds, fd_set* ReadFds, fd_set* WriteFds, fd_set* ExceptFds, const timeval* Timeout);
static int WSAAPI HookWsaPoll(LPWSAPOLLFD Fds, ULONG NumFds, INT Timeout);
static DWORD WSAAPI HookWsaWaitForMultipleEvents(DWORD Count, const WSAEVENT* Events, BOOL bWaitAll, DWORD Timeout, BOOL bAlertable);
static int WSAAPI HookWsaEventSelect(SOCKET Socket, WSAEVENT EventHandle, long NetworkEvents);
static int WSAAPI HookWsaEnumNetworkEvents(SOCKET Socket, WSAEVENT EventHandle, LPWSANETWORKEVENTS NetworkEvents);
static int WSAAPI HookWsaAsyncSelect(SOCKET Socket, HWND Window, u_int Message, long Events);
static int WSAAPI HookIoctlsocket(SOCKET Socket, long Command, u_long* Argp);

void WinsockInit()
{
    if (bOverlappedInit)
    {
        return;
    }
    InitializeCriticalSection(&OverlappedLock);
    bOverlappedInit = true;
}

void WinsockShutdown()
{
    if (!bOverlappedInit)
    {
        return;
    }
    EnterCriticalSection(&OverlappedLock);
    OverlappedMap.clear();
    LeaveCriticalSection(&OverlappedLock);
    DeleteCriticalSection(&OverlappedLock);
    bOverlappedInit = false;
}

static void InstallWs2Detours()
{
    if (!GConfig.bWs2Detours)
    {
        LOG("ws2_32 detours disabled");
        return;
    }
    HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
    if (!Ws2Module)
    {
        LOG("ws2_32.dll not loaded (detours skipped)");
        return;
    }
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(Ws2Module, "recvfrom")), 5,
                    reinterpret_cast<void*>(&HookRecvFrom), reinterpret_cast<void**>(&RecvFromFn), "recvfrom");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(Ws2Module, "recv")), 5,
                    reinterpret_cast<void*>(&HookRecv), reinterpret_cast<void**>(&RecvFn), "recv");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(Ws2Module, "WSARecvFrom")), 5,
                    reinterpret_cast<void*>(&HookWsaRecvFrom), reinterpret_cast<void**>(&WsaRecvFromFn), "WSARecvFrom");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(Ws2Module, "WSARecv")), 5,
                    reinterpret_cast<void*>(&HookWsaRecv), reinterpret_cast<void**>(&WsaRecvFn), "WSARecv");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(Ws2Module, "sendto")), 5,
                    reinterpret_cast<void*>(&HookSendTo), reinterpret_cast<void**>(&SendToFn), "sendto");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(Ws2Module, "send")), 5,
                    reinterpret_cast<void*>(&HookSend), reinterpret_cast<void**>(&SendFn), "send");
}

static void PatchModuleImports(HMODULE Module)
{
    PatchIat(Module, "ws2_32.dll", "recvfrom", reinterpret_cast<void*>(&HookRecvFrom),
             reinterpret_cast<void**>(&RecvFromFn));
    PatchIat(Module, "ws2_32.dll", "recv", reinterpret_cast<void*>(&HookRecv),
             reinterpret_cast<void**>(&RecvFn));
    PatchIat(Module, "ws2_32.dll", "sendto", reinterpret_cast<void*>(&HookSendTo),
             reinterpret_cast<void**>(&SendToFn));
    PatchIat(Module, "ws2_32.dll", "send", reinterpret_cast<void*>(&HookSend),
             reinterpret_cast<void**>(&SendFn));
    PatchIat(Module, "ws2_32.dll", "WSARecvFrom", reinterpret_cast<void*>(&HookWsaRecvFrom),
             reinterpret_cast<void**>(&WsaRecvFromFn));
    PatchIat(Module, "ws2_32.dll", "WSARecv", reinterpret_cast<void*>(&HookWsaRecv),
             reinterpret_cast<void**>(&WsaRecvFn));
    PatchIat(Module, "ws2_32.dll", "WSASendTo", reinterpret_cast<void*>(&HookWsaSendTo),
             reinterpret_cast<void**>(&WsaSendToFn));
    PatchIat(Module, "ws2_32.dll", "WSASend", reinterpret_cast<void*>(&HookWsaSend),
             reinterpret_cast<void**>(&WsaSendFn));
    PatchIat(Module, "kernel32.dll", "GetProcAddress", reinterpret_cast<void*>(&HookGetProcAddress),
             reinterpret_cast<void**>(&GetProcAddressFn));
    PatchIat(Module, "kernel32.dll", "GetQueuedCompletionStatus", reinterpret_cast<void*>(&HookGetQueuedCompletionStatus),
             reinterpret_cast<void**>(&GetQueuedCompletionStatusFn));
    PatchIat(Module, "kernel32.dll", "GetQueuedCompletionStatusEx", reinterpret_cast<void*>(&HookGetQueuedCompletionStatusEx),
             reinterpret_cast<void**>(&GetQueuedCompletionStatusExFn));
    PatchIat(Module, "ws2_32.dll", "WSAGetOverlappedResult", reinterpret_cast<void*>(&HookWsaGetOverlappedResult),
             reinterpret_cast<void**>(&WsaGetOverlappedResultFn));
    PatchIat(Module, "ws2_32.dll", "select", reinterpret_cast<void*>(&HookSelect),
             reinterpret_cast<void**>(&SelectFn));
    PatchIat(Module, "ws2_32.dll", "WSAPoll", reinterpret_cast<void*>(&HookWsaPoll),
             reinterpret_cast<void**>(&WsaPollFn));
    PatchIat(Module, "ws2_32.dll", "WSAWaitForMultipleEvents", reinterpret_cast<void*>(&HookWsaWaitForMultipleEvents),
             reinterpret_cast<void**>(&WsaWaitForMultipleEventsFn));
    PatchIat(Module, "ws2_32.dll", "WSAEventSelect", reinterpret_cast<void*>(&HookWsaEventSelect),
             reinterpret_cast<void**>(&WsaEventSelectFn));
    PatchIat(Module, "ws2_32.dll", "WSAEnumNetworkEvents", reinterpret_cast<void*>(&HookWsaEnumNetworkEvents),
             reinterpret_cast<void**>(&WsaEnumNetworkEventsFn));
    PatchIat(Module, "ws2_32.dll", "WSAAsyncSelect", reinterpret_cast<void*>(&HookWsaAsyncSelect),
             reinterpret_cast<void**>(&WsaAsyncSelectFn));
    PatchIat(Module, "ws2_32.dll", "ioctlsocket", reinterpret_cast<void*>(&HookIoctlsocket),
        reinterpret_cast<void**>(&IoctlSocketFn));
}

static void PatchAllModules()
{
    DWORD ProcessId = GetCurrentProcessId();
    HANDLE Snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, ProcessId);
    if (Snapshot == INVALID_HANDLE_VALUE)
    {
        return;
    }
    MODULEENTRY32 ModuleEntry{};
    ModuleEntry.dwSize = sizeof(ModuleEntry);
    HMODULE SelfModule = reinterpret_cast<HMODULE>(&__ImageBase);
    if (Module32First(Snapshot, &ModuleEntry))
    {
        do
        {
            if (ModuleEntry.hModule != SelfModule)
            {
                PatchModuleImports(ModuleEntry.hModule);
            }
        } while (Module32Next(Snapshot, &ModuleEntry));
    }
    CloseHandle(Snapshot);
}

static DWORD WINAPI RescanThread(LPVOID)
{
    DWORD DelayMs = GConfig.RescanMs ? GConfig.RescanMs : 5000;
    for (;;)
    {
        Sleep(DelayMs);
        PatchAllModules();
    }
    return 0;
}

void InstallWinsockHooks()
{
    PatchAllModules();
    InstallWs2Detours();
    CreateThread(nullptr, 0, RescanThread, nullptr, 0, nullptr);
}

static void TrackOverlapped(LPWSAOVERLAPPED Overlapped, LPWSABUF Buffers, DWORD Count, sockaddr* From, LPINT FromLength, const char* Tag)
{
    if (!Overlapped || !Buffers || Count == 0)
    {
        return;
    }
    if (!bOverlappedInit)
    {
        return;
    }
    EnterCriticalSection(&OverlappedLock);
    FOverlappedInfo Info{};
    Info.Buffers = Buffers;
    Info.Count = Count;
    Info.From = From;
    Info.FromLength = FromLength;
    if (Tag)
    {
        lstrcpynA(Info.Tag, Tag, sizeof(Info.Tag));
    }
    OverlappedMap[Overlapped] = Info;
    LeaveCriticalSection(&OverlappedLock);
}

static bool ConsumeOverlapped(LPWSAOVERLAPPED Overlapped, FOverlappedInfo* OutInfo)
{
    if (!Overlapped || !OutInfo || !bOverlappedInit)
    {
        return false;
    }
    EnterCriticalSection(&OverlappedLock);
    auto Iter = OverlappedMap.find(Overlapped);
    if (Iter == OverlappedMap.end())
    {
        LeaveCriticalSection(&OverlappedLock);
        return false;
    }
    *OutInfo = Iter->second;
    OverlappedMap.erase(Iter);
    LeaveCriticalSection(&OverlappedLock);
    return true;
}

static int WSAAPI HookRecvFrom(SOCKET Socket, char* Buffer, int Length, int Flags, sockaddr* From, int* FromLength)
{
    if (!RecvFromFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        RecvFromFn = Ws2Module ? reinterpret_cast<FRecvFromFn>(GetProcAddress(Ws2Module, "recvfrom")) : nullptr;
    }
    if (!RecvFromFn)
    {
        return SOCKET_ERROR;
    }
    int Result = RecvFromFn(Socket, Buffer, Length, Flags, From, FromLength);
    int Error = (Result == SOCKET_ERROR) ? WSAGetLastError() : 0;
    const bool bAllow = ShouldCaptureNetwork();
    (void)Error;
    if (bAllow && Result > 0 && GConfig.bWs2Detours && GConfig.bLogRecv)
    {
        GRecvBytes += static_cast<uint64_t>(Result);
        GRecvCount++;
        GLastRecv = Result;
        int FromLengthValue = FromLength ? *FromLength : 0;
        LogHexEx("Rak][Net_Recv", Buffer, Result, From, FromLengthValue, "src=recvfrom");
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(Buffer), Result, "Net_Recv");
    }
    return Result;
}

static int WSAAPI HookRecv(SOCKET Socket, char* Buffer, int Length, int Flags)
{
    if (!RecvFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        RecvFn = Ws2Module ? reinterpret_cast<FRecvFn>(GetProcAddress(Ws2Module, "recv")) : nullptr;
    }
    if (!RecvFn)
    {
        return SOCKET_ERROR;
    }
    int Result = RecvFn(Socket, Buffer, Length, Flags);
    int Error = (Result == SOCKET_ERROR) ? WSAGetLastError() : 0;
    const bool bAllow = ShouldCaptureNetwork();
    (void)Error;
    if (bAllow && Result > 0 && GConfig.bWs2Detours && GConfig.bLogRecv)
    {
        GRecvBytes += static_cast<uint64_t>(Result);
        GRecvCount++;
        GLastRecv = Result;
        LogHexEx("Rak][Net_Recv", Buffer, Result, nullptr, 0, "src=recv");
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(Buffer), Result, "Net_Recv");
    }
    return Result;
}

static int WSAAPI HookSendTo(SOCKET Socket, const char* Buffer, int Length, int Flags, const sockaddr* To, int ToLength)
{
    if (!SendToFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        SendToFn = Ws2Module ? reinterpret_cast<FSendToFn>(GetProcAddress(Ws2Module, "sendto")) : nullptr;
    }
    if (!SendToFn)
    {
        return SOCKET_ERROR;
    }
    int Result = SendToFn(Socket, Buffer, Length, Flags, To, ToLength);
    int Error = (Result == SOCKET_ERROR) ? WSAGetLastError() : 0;
    const bool bAllow = ShouldCaptureNetwork();
    (void)Error;
    if (bAllow && Result > 0 && GConfig.bWs2Detours && GConfig.bLogSend && !GConfig.bWrapperHooks)
    {
        GSendBytes += static_cast<uint64_t>(Result);
        GSendCount++;
        GLastSend = Result;
        LogHex("sendto", Buffer, Result, To, ToLength);
    }
    return Result;
}

static int WSAAPI HookSend(SOCKET Socket, const char* Buffer, int Length, int Flags)
{
    if (!SendFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        SendFn = Ws2Module ? reinterpret_cast<FSendFn>(GetProcAddress(Ws2Module, "send")) : nullptr;
    }
    if (!SendFn)
    {
        return SOCKET_ERROR;
    }
    int Result = SendFn(Socket, Buffer, Length, Flags);
    int Error = (Result == SOCKET_ERROR) ? WSAGetLastError() : 0;
    const bool bAllow = ShouldCaptureNetwork();
    (void)Error;
    if (bAllow && Result > 0 && GConfig.bWs2Detours && GConfig.bLogSend && !GConfig.bWrapperHooks)
    {
        GSendBytes += static_cast<uint64_t>(Result);
        GSendCount++;
        GLastSend = Result;
        LogHex("send", Buffer, Result, nullptr, 0);
    }
    return Result;
}

static void LogWsabuf(const char* Tag, LPWSABUF Buffers, DWORD Count, DWORD Bytes, const sockaddr* Address, int AddressLength)
{
    if (!Buffers || Count == 0 || Bytes == 0)
    {
        return;
    }
    DWORD Remaining = Bytes;
    for (DWORD Index = 0; Index < Count && Remaining > 0; ++Index)
    {
        DWORD Chunk = Buffers[Index].len < Remaining ? Buffers[Index].len : Remaining;
        if (Chunk == 0 || !Buffers[Index].buf)
        {
            Remaining -= Chunk;
            continue;
        }
        LogHex(Tag, Buffers[Index].buf, static_cast<int>(Chunk), Address, AddressLength);
        Remaining -= Chunk;
    }
}

static void LogWsabufRecv(const char* Source, LPWSABUF Buffers, DWORD Count, DWORD Bytes, const sockaddr* Address, int AddressLength)
{
    if (!Buffers || Count == 0 || Bytes == 0)
    {
        return;
    }
    char Extra[64] = {0};
    _snprintf_s(Extra, sizeof(Extra), _TRUNCATE, "src=%s", Source ? Source : "WSARecv");
    DWORD Remaining = Bytes;
    for (DWORD Index = 0; Index < Count && Remaining > 0; ++Index)
    {
        DWORD Chunk = Buffers[Index].len < Remaining ? Buffers[Index].len : Remaining;
        if (Chunk == 0 || !Buffers[Index].buf)
        {
            Remaining -= Chunk;
            continue;
        }
        LogHexEx("Rak][Net_Recv", Buffers[Index].buf, static_cast<int>(Chunk), Address, AddressLength, Extra);
        DecodeLogin6D(reinterpret_cast<const uint8_t*>(Buffers[Index].buf), static_cast<int>(Chunk), "Net_Recv");
        Remaining -= Chunk;
    }
}

static int WSAAPI HookWsaRecvFrom(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, LPDWORD Flags,
    sockaddr* From, LPINT FromLength, LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine)
{
    if (!WsaRecvFromFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaRecvFromFn = Ws2Module ? reinterpret_cast<FWsaRecvFromFn>(GetProcAddress(Ws2Module, "WSARecvFrom")) : nullptr;
    }
    if (!WsaRecvFromFn)
    {
        return SOCKET_ERROR;
    }
    TrackOverlapped(Overlapped, Buffers, Count, From, FromLength, "WSARecvFrom");
    int Result = WsaRecvFromFn(Socket, Buffers, Count, Bytes, Flags, From, FromLength, Overlapped, CompletionRoutine);
    if (Result == 0 && Bytes && *Bytes > 0 && ShouldCaptureNetwork() && GConfig.bWs2Detours && GConfig.bLogRecv)
    {
        GRecvBytes += *Bytes;
        GRecvCount++;
        GLastRecv = static_cast<int>(*Bytes);
        LogWsabufRecv("WSARecvFrom", Buffers, Count, *Bytes, From, FromLength ? *FromLength : 0);
    }
    return Result;
}

static int WSAAPI HookWsaRecv(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, LPDWORD Flags,
    LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine)
{
    if (!WsaRecvFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaRecvFn = Ws2Module ? reinterpret_cast<FWsaRecvFn>(GetProcAddress(Ws2Module, "WSARecv")) : nullptr;
    }
    if (!WsaRecvFn)
    {
        return SOCKET_ERROR;
    }
    TrackOverlapped(Overlapped, Buffers, Count, nullptr, nullptr, "WSARecv");
    int Result = WsaRecvFn(Socket, Buffers, Count, Bytes, Flags, Overlapped, CompletionRoutine);
    if (Result == 0 && Bytes && *Bytes > 0 && ShouldCaptureNetwork() && GConfig.bWs2Detours && GConfig.bLogRecv)
    {
        GRecvBytes += *Bytes;
        GRecvCount++;
        GLastRecv = static_cast<int>(*Bytes);
        LogWsabufRecv("WSARecv", Buffers, Count, *Bytes, nullptr, 0);
    }
    return Result;
}

static int WSAAPI HookWsaSendTo(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, DWORD Flags,
    const sockaddr* To, int ToLength, LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine)
{
    if (!WsaSendToFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaSendToFn = Ws2Module ? reinterpret_cast<FWsaSendToFn>(GetProcAddress(Ws2Module, "WSASendTo")) : nullptr;
    }
    if (!WsaSendToFn)
    {
        return SOCKET_ERROR;
    }
    TrackOverlapped(Overlapped, Buffers, Count, const_cast<sockaddr*>(To), &ToLength, "WSASendTo");
    int Result = WsaSendToFn(Socket, Buffers, Count, Bytes, Flags, To, ToLength, Overlapped, CompletionRoutine);
    if (Result == 0 && Bytes && *Bytes > 0 && ShouldCaptureNetwork() && GConfig.bWs2Detours && GConfig.bLogSend && !GConfig.bWrapperHooks)
    {
        GSendBytes += *Bytes;
        GSendCount++;
        GLastSend = static_cast<int>(*Bytes);
        LogWsabuf("WSASendTo", Buffers, Count, *Bytes, To, ToLength);
    }
    return Result;
}

static int WSAAPI HookWsaSend(SOCKET Socket, LPWSABUF Buffers, DWORD Count, LPDWORD Bytes, DWORD Flags,
    LPWSAOVERLAPPED Overlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE CompletionRoutine)
{
    if (!WsaSendFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaSendFn = Ws2Module ? reinterpret_cast<FWsaSendFn>(GetProcAddress(Ws2Module, "WSASend")) : nullptr;
    }
    if (!WsaSendFn)
    {
        return SOCKET_ERROR;
    }
    TrackOverlapped(Overlapped, Buffers, Count, nullptr, nullptr, "WSASend");
    int Result = WsaSendFn(Socket, Buffers, Count, Bytes, Flags, Overlapped, CompletionRoutine);
    if (Result == 0 && Bytes && *Bytes > 0 && ShouldCaptureNetwork() && GConfig.bWs2Detours && GConfig.bLogSend && !GConfig.bWrapperHooks)
    {
        GSendBytes += *Bytes;
        GSendCount++;
        GLastSend = static_cast<int>(*Bytes);
        LogWsabuf("WSASend", Buffers, Count, *Bytes, nullptr, 0);
    }
    return Result;
}

static void LogOverlappedCompletion(const char* Tag, const FOverlappedInfo& Info, DWORD Bytes)
{
    if (!Tag || Bytes == 0)
    {
        return;
    }
    if (GConfig.bLogEvents)
    {
        char Line[160] = {0};
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "%s completion Bytes=%lu", Tag, Bytes);
        LOG("%s", Line);
    }
    if (GConfig.bWs2Detours && GConfig.bLogRecv && _stricmp(Tag, "WSARecv") == 0)
    {
        GRecvBytes += Bytes;
        GRecvCount++;
        GLastRecv = static_cast<int>(Bytes);
        LogWsabufRecv("WSARecv.complete", Info.Buffers, Info.Count, Bytes, Info.From, Info.FromLength ? *Info.FromLength : 0);
    }
    else if (GConfig.bWs2Detours && GConfig.bLogRecv && _stricmp(Tag, "WSARecvFrom") == 0)
    {
        GRecvBytes += Bytes;
        GRecvCount++;
        GLastRecv = static_cast<int>(Bytes);
        LogWsabufRecv("WSARecvFrom.complete", Info.Buffers, Info.Count, Bytes, Info.From, Info.FromLength ? *Info.FromLength : 0);
    }
    else if (GConfig.bWs2Detours && GConfig.bLogSend && !GConfig.bWrapperHooks && _stricmp(Tag, "WSASend") == 0)
    {
        GSendBytes += Bytes;
        GSendCount++;
        GLastSend = static_cast<int>(Bytes);
        LogWsabuf("WSASend.complete", Info.Buffers, Info.Count, Bytes, Info.From, Info.FromLength ? *Info.FromLength : 0);
    }
    else if (GConfig.bWs2Detours && GConfig.bLogSend && !GConfig.bWrapperHooks && _stricmp(Tag, "WSASendTo") == 0)
    {
        GSendBytes += Bytes;
        GSendCount++;
        GLastSend = static_cast<int>(Bytes);
        LogWsabuf("WSASendTo.complete", Info.Buffers, Info.Count, Bytes, Info.From, Info.FromLength ? *Info.FromLength : 0);
    }
}

static BOOL WINAPI HookGetQueuedCompletionStatus(HANDLE Port, LPDWORD Bytes, PULONG_PTR Key, LPOVERLAPPED* Overlapped, DWORD TimeoutMs)
{
    if (!GetQueuedCompletionStatusFn)
    {
        HMODULE Kernel32 = GetModuleHandleA("kernel32.dll");
        GetQueuedCompletionStatusFn = Kernel32 ? reinterpret_cast<FGetQueuedCompletionStatusFn>(GetProcAddress(Kernel32, "GetQueuedCompletionStatus")) : nullptr;
    }
    BOOL Result = GetQueuedCompletionStatusFn ? GetQueuedCompletionStatusFn(Port, Bytes, Key, Overlapped, TimeoutMs) : FALSE;
    if (Result && Overlapped && *Overlapped && Bytes && *Bytes > 0)
    {
        FOverlappedInfo Info{};
        if (ConsumeOverlapped(*Overlapped, &Info))
        {
            LogOverlappedCompletion(Info.Tag, Info, *Bytes);
        }
    }
    return Result;
}

static BOOL WINAPI HookGetQueuedCompletionStatusEx(HANDLE Port, LPOVERLAPPED_ENTRY Entries, ULONG Count, PULONG Removed, DWORD TimeoutMs, BOOL bAlertable)
{
    if (!GetQueuedCompletionStatusExFn)
    {
        HMODULE Kernel32 = GetModuleHandleA("kernel32.dll");
        GetQueuedCompletionStatusExFn = Kernel32 ? reinterpret_cast<FGetQueuedCompletionStatusExFn>(GetProcAddress(Kernel32, "GetQueuedCompletionStatusEx")) : nullptr;
    }
    BOOL Result = GetQueuedCompletionStatusExFn ? GetQueuedCompletionStatusExFn(Port, Entries, Count, Removed, TimeoutMs, bAlertable) : FALSE;
    if (Result && Entries && Removed)
    {
        for (ULONG Index = 0; Index < *Removed; ++Index)
        {
            if (!Entries[Index].lpOverlapped || Entries[Index].dwNumberOfBytesTransferred == 0)
            {
                continue;
            }
            FOverlappedInfo Info{};
            if (ConsumeOverlapped(Entries[Index].lpOverlapped, &Info))
            {
                LogOverlappedCompletion(Info.Tag, Info, Entries[Index].dwNumberOfBytesTransferred);
            }
        }
    }
    return Result;
}

static BOOL WSAAPI HookWsaGetOverlappedResult(SOCKET Socket, LPWSAOVERLAPPED Overlapped, LPDWORD Bytes, BOOL bWait, LPDWORD Flags)
{
    if (!WsaGetOverlappedResultFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaGetOverlappedResultFn = Ws2Module ? reinterpret_cast<FWsaGetOverlappedResultFn>(GetProcAddress(Ws2Module, "WSAGetOverlappedResult")) : nullptr;
    }
    BOOL Result = WsaGetOverlappedResultFn ? WsaGetOverlappedResultFn(Socket, Overlapped, Bytes, bWait, Flags) : FALSE;
    if (Result && Overlapped && Bytes && *Bytes > 0)
    {
        FOverlappedInfo Info{};
        if (ConsumeOverlapped(Overlapped, &Info))
        {
            LogOverlappedCompletion(Info.Tag, Info, *Bytes);
        }
    }
    return Result;
}

static int WSAAPI HookSelect(int NumFds, fd_set* ReadFds, fd_set* WriteFds, fd_set* ExceptFds, const timeval* Timeout)
{
    if (!SelectFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        SelectFn = Ws2Module ? reinterpret_cast<FSelectFn>(GetProcAddress(Ws2Module, "select")) : nullptr;
    }
    int Result = SelectFn ? SelectFn(NumFds, ReadFds, WriteFds, ExceptFds, Timeout) : SOCKET_ERROR;
    if (Result > 0 && GConfig.bLogEvents)
    {
        char Line[128];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "select ret=%d", Result);
        LOG("%s", Line);
    }
    return Result;
}

static int WSAAPI HookWsaPoll(LPWSAPOLLFD Fds, ULONG NumFds, INT Timeout)
{
    if (!WsaPollFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaPollFn = Ws2Module ? reinterpret_cast<FWsaPollFn>(GetProcAddress(Ws2Module, "WSAPoll")) : nullptr;
    }
    int Result = WsaPollFn ? WsaPollFn(Fds, NumFds, Timeout) : SOCKET_ERROR;
    if (Result > 0 && GConfig.bLogEvents)
    {
        char Line[128];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "WSAPoll ret=%d", Result);
        LOG("%s", Line);
    }
    return Result;
}

static DWORD WSAAPI HookWsaWaitForMultipleEvents(DWORD Count, const WSAEVENT* Events, BOOL bWaitAll, DWORD Timeout, BOOL bAlertable)
{
    if (!WsaWaitForMultipleEventsFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaWaitForMultipleEventsFn = Ws2Module ? reinterpret_cast<FWsaWaitForMultipleEventsFn>(GetProcAddress(Ws2Module, "WSAWaitForMultipleEvents")) : nullptr;
    }
    DWORD Result = WsaWaitForMultipleEventsFn ? WsaWaitForMultipleEventsFn(Count, Events, bWaitAll, Timeout, bAlertable) : WSA_WAIT_FAILED;
    if (GConfig.bLogEvents)
    {
        if (Result == WSA_WAIT_TIMEOUT)
        {
            return Result;
        }
        char Line[128];
        if (Result == WSA_WAIT_FAILED)
        {
            int Err = WSAGetLastError();
            _snprintf_s(Line, sizeof(Line), _TRUNCATE, "WSAWaitForMultipleEvents failed err=%d", Err);
        }
        else
        {
            _snprintf_s(Line, sizeof(Line), _TRUNCATE, "WSAWaitForMultipleEvents ret=%lu", Result);
        }
        LOG("%s", Line);
    }
    return Result;
}

static void PeekSocket(SOCKET Socket)
{
    if (!GConfig.bPeekOnRead)
    {
        return;
    }
    char Buffer[2048];
    sockaddr From{};
    int FromLength = sizeof(From);
    int Result = recvfrom(Socket, Buffer, sizeof(Buffer), MSG_PEEK, &From, &FromLength);
    if (Result <= 0)
    {
        return;
    }
    LogHex("peek", Buffer, Result, &From, FromLength);
}

static int WSAAPI HookWsaEventSelect(SOCKET Socket, WSAEVENT EventHandle, long NetworkEvents)
{
    if (!WsaEventSelectFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaEventSelectFn = Ws2Module ? reinterpret_cast<FWsaEventSelectFn>(GetProcAddress(Ws2Module, "WSAEventSelect")) : nullptr;
    }
    int Result = WsaEventSelectFn ? WsaEventSelectFn(Socket, EventHandle, NetworkEvents) : SOCKET_ERROR;
    if (GConfig.bLogEvents)
    {
        char Line[160];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "WSAEventSelect ret=%d Events=0x%lx", Result, NetworkEvents);
        LOG("%s", Line);
    }
    return Result;
}

static int WSAAPI HookWsaEnumNetworkEvents(SOCKET Socket, WSAEVENT EventHandle, LPWSANETWORKEVENTS NetworkEvents)
{
    if (!WsaEnumNetworkEventsFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaEnumNetworkEventsFn = Ws2Module ? reinterpret_cast<FWsaEnumNetworkEventsFn>(GetProcAddress(Ws2Module, "WSAEnumNetworkEvents")) : nullptr;
    }
    int Result = WsaEnumNetworkEventsFn ? WsaEnumNetworkEventsFn(Socket, EventHandle, NetworkEvents) : SOCKET_ERROR;
    if (Result == 0 && NetworkEvents && GConfig.bLogEvents)
    {
        char Line[160];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "WSAEnumNetworkEvents Events=0x%lx", NetworkEvents->lNetworkEvents);
        LOG("%s", Line);
        if (NetworkEvents->lNetworkEvents & FD_READ)
        {
            PeekSocket(Socket);
        }
    }
    return Result;
}

static int WSAAPI HookWsaAsyncSelect(SOCKET Socket, HWND Window, u_int Message, long Events)
{
    if (!WsaAsyncSelectFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        WsaAsyncSelectFn = Ws2Module ? reinterpret_cast<FWsaAsyncSelectFn>(GetProcAddress(Ws2Module, "WSAAsyncSelect")) : nullptr;
    }
    int Result = WsaAsyncSelectFn ? WsaAsyncSelectFn(Socket, Window, Message, Events) : SOCKET_ERROR;
    if (GConfig.bLogEvents)
    {
        char Line[160];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "WSAAsyncSelect ret=%d msg=0x%x Events=0x%lx", Result, Message, Events);
        LOG("%s", Line);
    }
    return Result;
}

static int WSAAPI HookIoctlsocket(SOCKET Socket, long Command, u_long* Argp)
{
    if (!IoctlSocketFn)
    {
        HMODULE Ws2Module = GetModuleHandleA("ws2_32.dll");
        IoctlSocketFn = Ws2Module ? reinterpret_cast<FIoctlSocketFn>(GetProcAddress(Ws2Module, "ioctlsocket")) : nullptr;
    }
    int Result = IoctlSocketFn ? IoctlSocketFn(Socket, Command, Argp) : SOCKET_ERROR;
    if (GConfig.bLogEvents)
    {
        char Line[160];
        _snprintf_s(Line, sizeof(Line), _TRUNCATE, "ioctlsocket ret=%d cmd=0x%lx", Result, Command);
        LOG("%s", Line);
    }
    return Result;
}

static FARPROC WINAPI HookGetProcAddress(HMODULE Module, LPCSTR Name)
{
    if (!GetProcAddressFn)
    {
        HMODULE Kernel32 = GetModuleHandleA("kernel32.dll");
        GetProcAddressFn = Kernel32 ? reinterpret_cast<FGetProcAddressFn>(GetProcAddress(Kernel32, "GetProcAddress")) : nullptr;
    }
    FARPROC Result = GetProcAddressFn ? GetProcAddressFn(Module, Name) : nullptr;
    if (!Module || !Name)
    {
        return Result;
    }

    char ModuleName[MAX_PATH] = {0};
    GetModuleFileNameA(Module, ModuleName, sizeof(ModuleName));
    const char* BaseName = strrchr(ModuleName, '\\');
    BaseName = BaseName ? BaseName + 1 : ModuleName;
    if (_stricmp(BaseName, "kernel32.dll") == 0)
    {
        if (_stricmp(Name, "GetQueuedCompletionStatus") == 0)
        {
            if (!GetQueuedCompletionStatusFn)
            {
                GetQueuedCompletionStatusFn = reinterpret_cast<FGetQueuedCompletionStatusFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookGetQueuedCompletionStatus);
        }
        if (_stricmp(Name, "GetQueuedCompletionStatusEx") == 0)
        {
            if (!GetQueuedCompletionStatusExFn)
            {
                GetQueuedCompletionStatusExFn = reinterpret_cast<FGetQueuedCompletionStatusExFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookGetQueuedCompletionStatusEx);
        }
    }
    if (_stricmp(BaseName, "ws2_32.dll") == 0)
    {
        if (_stricmp(Name, "recvfrom") == 0)
        {
            if (!RecvFromFn)
            {
                RecvFromFn = reinterpret_cast<FRecvFromFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookRecvFrom);
        }
        if (_stricmp(Name, "recv") == 0)
        {
            if (!RecvFn)
            {
                RecvFn = reinterpret_cast<FRecvFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookRecv);
        }
        if (_stricmp(Name, "sendto") == 0)
        {
            if (!SendToFn)
            {
                SendToFn = reinterpret_cast<FSendToFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookSendTo);
        }
        if (_stricmp(Name, "send") == 0)
        {
            if (!SendFn)
            {
                SendFn = reinterpret_cast<FSendFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookSend);
        }
        if (_stricmp(Name, "WSARecvFrom") == 0)
        {
            if (!WsaRecvFromFn)
            {
                WsaRecvFromFn = reinterpret_cast<FWsaRecvFromFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaRecvFrom);
        }
        if (_stricmp(Name, "WSARecv") == 0)
        {
            if (!WsaRecvFn)
            {
                WsaRecvFn = reinterpret_cast<FWsaRecvFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaRecv);
        }
        if (_stricmp(Name, "WSASendTo") == 0)
        {
            if (!WsaSendToFn)
            {
                WsaSendToFn = reinterpret_cast<FWsaSendToFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaSendTo);
        }
        if (_stricmp(Name, "WSASend") == 0)
        {
            if (!WsaSendFn)
            {
                WsaSendFn = reinterpret_cast<FWsaSendFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaSend);
        }
        if (_stricmp(Name, "WSAGetOverlappedResult") == 0)
        {
            if (!WsaGetOverlappedResultFn)
            {
                WsaGetOverlappedResultFn = reinterpret_cast<FWsaGetOverlappedResultFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaGetOverlappedResult);
        }
        if (_stricmp(Name, "select") == 0)
        {
            if (!SelectFn)
            {
                SelectFn = reinterpret_cast<FSelectFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookSelect);
        }
        if (_stricmp(Name, "WSAPoll") == 0)
        {
            if (!WsaPollFn)
            {
                WsaPollFn = reinterpret_cast<FWsaPollFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaPoll);
        }
        if (_stricmp(Name, "WSAWaitForMultipleEvents") == 0)
        {
            if (!WsaWaitForMultipleEventsFn)
            {
                WsaWaitForMultipleEventsFn = reinterpret_cast<FWsaWaitForMultipleEventsFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaWaitForMultipleEvents);
        }
        if (_stricmp(Name, "WSAEventSelect") == 0)
        {
            if (!WsaEventSelectFn)
            {
                WsaEventSelectFn = reinterpret_cast<FWsaEventSelectFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaEventSelect);
        }
        if (_stricmp(Name, "WSAEnumNetworkEvents") == 0)
        {
            if (!WsaEnumNetworkEventsFn)
            {
                WsaEnumNetworkEventsFn = reinterpret_cast<FWsaEnumNetworkEventsFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaEnumNetworkEvents);
        }
        if (_stricmp(Name, "WSAAsyncSelect") == 0)
        {
            if (!WsaAsyncSelectFn)
            {
                WsaAsyncSelectFn = reinterpret_cast<FWsaAsyncSelectFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookWsaAsyncSelect);
        }
        if (_stricmp(Name, "ioctlsocket") == 0)
        {
            if (!IoctlSocketFn)
            {
                IoctlSocketFn = reinterpret_cast<FIoctlSocketFn>(Result);
            }
            return reinterpret_cast<FARPROC>(&HookIoctlsocket);
        }
    }
    return Result;
}


