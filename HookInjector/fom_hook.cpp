#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <tlhelp32.h>
#include <d3d9.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <unordered_map>
#include <vector>

#include "imgui.h"
#include "imgui_impl_dx9.h"
#include "imgui_impl_win32.h"

extern "C" IMAGE_DOS_HEADER __ImageBase;
extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam);

struct HookConfig {
    bool log_recv = true;
    bool log_send = true;
    bool log_hex = true;
    int max_dump = 4096;
    DWORD delay_ms = 15000;
    DWORD rescan_ms = 5000;
    bool overlay = true;
    bool console_enable = true;
    int overlay_key = VK_F1;
    int log_toggle_key = VK_F2;
    bool wrapper_hooks = true;
    bool wrapper_packetproc = false;
    bool ws2_detours = true;
    bool log_events = true;
    bool peek_on_read = true;
    char log_path[MAX_PATH] = {0};
};

static HookConfig g_cfg;
static CRITICAL_SECTION g_logLock;
static bool g_logInit = false;
static bool g_consoleEnabled = false;
static CRITICAL_SECTION g_ovlLock;
static bool g_ovlInit = false;

static volatile LONG g_imguiInit = 0;
static bool g_showOverlay = true;
static WNDPROC g_origWndProc = nullptr;
static HWND g_hwnd = nullptr;
static IDirect3DDevice9* g_device = nullptr;

static uint64_t g_recvBytes = 0;
static uint64_t g_sendBytes = 0;
static uint64_t g_recvCount = 0;
static uint64_t g_sendCount = 0;
static int g_lastRecv = 0;
static int g_lastSend = 0;

using recvfrom_t = int (WSAAPI *)(SOCKET, char*, int, int, sockaddr*, int*);
using recv_t = int (WSAAPI *)(SOCKET, char*, int, int);
using sendto_t = int (WSAAPI *)(SOCKET, const char*, int, int, const sockaddr*, int);
using send_t = int (WSAAPI *)(SOCKET, const char*, int, int);
using wsarecvfrom_t = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, LPDWORD, sockaddr*, LPINT, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using wsarecv_t = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, LPDWORD, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using wsasendto_t = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, DWORD, const sockaddr*, int, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using wsasend_t = int (WSAAPI *)(SOCKET, LPWSABUF, DWORD, LPDWORD, DWORD, LPWSAOVERLAPPED, LPWSAOVERLAPPED_COMPLETION_ROUTINE);
using GetProcAddress_t = FARPROC (WINAPI *)(HMODULE, LPCSTR);
using GetQueuedCompletionStatus_t = BOOL (WINAPI *)(HANDLE, LPDWORD, PULONG_PTR, LPOVERLAPPED*, DWORD);
using GetQueuedCompletionStatusEx_t = BOOL (WINAPI *)(HANDLE, LPOVERLAPPED_ENTRY, ULONG, PULONG, DWORD, BOOL);
using WSAGetOverlappedResult_t = BOOL (WSAAPI *)(SOCKET, LPWSAOVERLAPPED, LPDWORD, BOOL, LPDWORD);
using select_t = int (WSAAPI *)(int, fd_set*, fd_set*, fd_set*, const timeval*);
using wsapoll_t = int (WSAAPI *)(LPWSAPOLLFD, ULONG, INT);
using wsawaitforme_t = DWORD (WSAAPI *)(DWORD, const WSAEVENT*, BOOL, DWORD, BOOL);
using WSAEventSelect_t = int (WSAAPI *)(SOCKET, WSAEVENT, long);
using WSAEnumNetworkEvents_t = int (WSAAPI *)(SOCKET, WSAEVENT, LPWSANETWORKEVENTS);
using WSAAsyncSelect_t = int (WSAAPI *)(SOCKET, HWND, u_int, long);
using ioctlsocket_t = int (WSAAPI *)(SOCKET, long, u_long*);

static recvfrom_t g_recvfrom = nullptr;
static recv_t g_recv = nullptr;
static sendto_t g_sendto = nullptr;
static send_t g_send = nullptr;
static wsarecvfrom_t g_wsarecvfrom = nullptr;
static wsarecv_t g_wsarecv = nullptr;
static wsasendto_t g_wsasendto = nullptr;
static wsasend_t g_wsasend = nullptr;
static GetProcAddress_t g_GetProcAddress = nullptr;
static GetQueuedCompletionStatus_t g_GetQueuedCompletionStatus = nullptr;
static GetQueuedCompletionStatusEx_t g_GetQueuedCompletionStatusEx = nullptr;
static WSAGetOverlappedResult_t g_WSAGetOverlappedResult = nullptr;
static select_t g_select = nullptr;
static wsapoll_t g_WSAPoll = nullptr;
static wsawaitforme_t g_WSAWaitForMultipleEvents = nullptr;
static WSAEventSelect_t g_WSAEventSelect = nullptr;
static WSAEnumNetworkEvents_t g_WSAEnumNetworkEvents = nullptr;
static WSAAsyncSelect_t g_WSAAsyncSelect = nullptr;
static ioctlsocket_t g_ioctlsocket = nullptr;

struct OverlappedInfo {
    LPWSABUF buffers = nullptr;
    DWORD count = 0;
    sockaddr* from = nullptr;
    LPINT fromlen = nullptr;
    char tag[24] = {0};
};

static std::unordered_map<LPWSAOVERLAPPED, OverlappedInfo> g_ovlMap;

using Net_SendTo_t = int (__fastcall *)(void* thisptr, void* edx, SOCKET s, char* buf, int len, int ip, int port);
using Net_Send_t = int (__fastcall *)(void* thisptr, void* edx, char* buf, int len);
using Net_Recv_t = int (__fastcall *)(void* thisptr, void* edx, char* buf, int len);
using PacketProc_t = int (__stdcall *)(int ip, int port, void* buf, int size, int arg4, int arg5);

static Net_SendTo_t g_NetSendTo = nullptr;
static Net_Send_t g_NetSend = nullptr;
static Net_Recv_t g_NetRecv = nullptr;
static PacketProc_t g_PacketProc = nullptr;

using Direct3DCreate9_t = IDirect3D9* (WINAPI *)(UINT);
using Direct3DCreate9Ex_t = HRESULT (WINAPI *)(UINT, IDirect3D9Ex**);
static Direct3DCreate9_t g_Direct3DCreate9 = nullptr;
static Direct3DCreate9Ex_t g_Direct3DCreate9Ex = nullptr;

using CreateDevice_t = HRESULT (WINAPI *)(IDirect3D9*, UINT, D3DDEVTYPE, HWND, DWORD, D3DPRESENT_PARAMETERS*, IDirect3DDevice9**);
static CreateDevice_t g_CreateDevice = nullptr;

using EndScene_t = HRESULT (WINAPI *)(IDirect3DDevice9*);
using Reset_t = HRESULT (WINAPI *)(IDirect3DDevice9*, D3DPRESENT_PARAMETERS*);
using Present_t = HRESULT (WINAPI *)(IDirect3DDevice9*, const RECT*, const RECT*, HWND, const RGNDATA*);
static EndScene_t g_EndScene = nullptr;
static Reset_t g_Reset = nullptr;
static Present_t g_Present = nullptr;
static bool g_loggedD3D9 = false;
static bool g_loggedCreateDevice = false;
static bool g_loggedEndScene = false;
static bool g_loggedPresent = false;
static volatile LONG g_netHooksInstalled = 0;
static uint8_t* g_exeBase = nullptr;

static IDirect3D9* WINAPI Hook_Direct3DCreate9(UINT sdk);
static HRESULT WINAPI Hook_Direct3DCreate9Ex(UINT sdk, IDirect3D9Ex** out);
static int WSAAPI Hook_recvfrom(SOCKET s, char* buf, int len, int flags, sockaddr* from, int* fromlen);
static int WSAAPI Hook_recv(SOCKET s, char* buf, int len, int flags);
static int WSAAPI Hook_sendto(SOCKET s, const char* buf, int len, int flags, const sockaddr* to, int tolen);
static int WSAAPI Hook_send(SOCKET s, const char* buf, int len, int flags);
static int WSAAPI Hook_WSARecvFrom(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, LPDWORD flags,
                                  sockaddr* from, LPINT fromlen, LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb);
static int WSAAPI Hook_WSARecv(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, LPDWORD flags,
                               LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb);
static int WSAAPI Hook_WSASendTo(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, DWORD flags,
                                 const sockaddr* to, int tolen, LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb);
static int WSAAPI Hook_WSASend(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, DWORD flags,
                               LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb);
static FARPROC WINAPI Hook_GetProcAddress(HMODULE module, LPCSTR name);
static HRESULT WINAPI Hook_Present(IDirect3DDevice9* device, const RECT* src, const RECT* dst, HWND hwnd, const RGNDATA* dirty);
static int __fastcall Hook_NetSendTo(void* thisptr, void* edx, SOCKET s, char* buf, int len, int ip, int port);
static int __fastcall Hook_NetSend(void* thisptr, void* edx, char* buf, int len);
static int __fastcall Hook_NetRecv(void* thisptr, void* edx, char* buf, int len);
static int __stdcall Hook_PacketProc(int ip, int port, void* buf, int size, int arg4, int arg5);
static BOOL WINAPI Hook_GetQueuedCompletionStatus(HANDLE port, LPDWORD bytes, PULONG_PTR key, LPOVERLAPPED* ov, DWORD ms);
static BOOL WINAPI Hook_GetQueuedCompletionStatusEx(HANDLE port, LPOVERLAPPED_ENTRY entries, ULONG count, PULONG removed, DWORD ms, BOOL alertable);
static BOOL WSAAPI Hook_WSAGetOverlappedResult(SOCKET s, LPWSAOVERLAPPED ov, LPDWORD bytes, BOOL wait, LPDWORD flags);
static int WSAAPI Hook_select(int nfds, fd_set* readfds, fd_set* writefds, fd_set* exceptfds, const timeval* timeout);
static int WSAAPI Hook_WSAPoll(LPWSAPOLLFD fds, ULONG nfds, INT timeout);
static DWORD WSAAPI Hook_WSAWaitForMultipleEvents(DWORD count, const WSAEVENT* events, BOOL waitAll, DWORD timeout, BOOL alertable);
static int WSAAPI Hook_WSAEventSelect(SOCKET s, WSAEVENT hEvent, long lNetworkEvents);
static int WSAAPI Hook_WSAEnumNetworkEvents(SOCKET s, WSAEVENT hEvent, LPWSANETWORKEVENTS lpNetworkEvents);
static int WSAAPI Hook_WSAAsyncSelect(SOCKET s, HWND hWnd, u_int wMsg, long lEvent);
static int WSAAPI Hook_ioctlsocket(SOCKET s, long cmd, u_long* argp);

static void InitLogPath() {
    if (g_cfg.log_path[0]) {
        return;
    }
    char exe_path[MAX_PATH] = {0};
    DWORD len = GetModuleFileNameA(nullptr, exe_path, MAX_PATH);
    if (len == 0 || len >= MAX_PATH) {
        lstrcpyA(g_cfg.log_path, "FoM_recv.log");
        return;
    }
    char* slash = strrchr(exe_path, '\\');
    if (slash) {
        slash[1] = '\0';
        lstrcatA(exe_path, "fom_hook.log");
        lstrcpyA(g_cfg.log_path, exe_path);
    } else {
        lstrcpyA(g_cfg.log_path, "fom_hook.log");
    }
}

static void LogLine(const char* line) {
    if (!g_logInit) {
        return;
    }
    EnterCriticalSection(&g_logLock);
    InitLogPath();
    FILE* f = nullptr;
    if (fopen_s(&f, g_cfg.log_path, "ab") == 0 && f) {
        SYSTEMTIME st{};
        GetLocalTime(&st);
        fprintf(f, "[%02u:%02u:%02u.%03u] ", st.wHour, st.wMinute, st.wSecond, st.wMilliseconds);
        fwrite(line, 1, strlen(line), f);
        fwrite("\r\n", 1, 2, f);
        fclose(f);
    }
    if (g_consoleEnabled) {
        SYSTEMTIME st{};
        GetLocalTime(&st);
        fprintf(stdout, "[%02u:%02u:%02u.%03u] %s\r\n", st.wHour, st.wMinute, st.wSecond, st.wMilliseconds, line);
    }
    LeaveCriticalSection(&g_logLock);
}

static void LogHex(const char* tag, const void* data, int len, const sockaddr* addr, int addrlen) {
    if (!g_logInit || !data || len <= 0) {
        return;
    }
    EnterCriticalSection(&g_logLock);
    InitLogPath();
    FILE* f = nullptr;
    if (fopen_s(&f, g_cfg.log_path, "ab") != 0 || !f) {
        LeaveCriticalSection(&g_logLock);
        return;
    }

    SYSTEMTIME st{};
    GetLocalTime(&st);

    char addrbuf[64] = "unknown";
    int port = -1;
    if (addr && addrlen >= (int)sizeof(sockaddr_in) && addr->sa_family == AF_INET) {
        const sockaddr_in* sin = reinterpret_cast<const sockaddr_in*>(addr);
        const char* ip = inet_ntoa(sin->sin_addr);
        if (ip) {
            lstrcpynA(addrbuf, ip, sizeof(addrbuf));
        }
        port = ntohs(sin->sin_port);
    }

    fprintf(f, "[%02u:%02u:%02u.%03u] %s len=%d from=%s:%d\r\n",
            st.wHour, st.wMinute, st.wSecond, st.wMilliseconds, tag, len, addrbuf, port);

    if (!g_cfg.log_hex) {
        fclose(f);
        LeaveCriticalSection(&g_logLock);
        return;
    }

    int dump_len = (len > g_cfg.max_dump) ? g_cfg.max_dump : len;
    const uint8_t* b = reinterpret_cast<const uint8_t*>(data);
    for (int i = 0; i < dump_len; i += 16) {
        fprintf(f, "  %04X  ", i);
        int line_len = (dump_len - i < 16) ? (dump_len - i) : 16;
        for (int j = 0; j < line_len; ++j) {
            fprintf(f, "%02X ", b[i + j]);
        }
        fprintf(f, "\r\n");
    }
    if (dump_len < len) {
        fprintf(f, "  ... truncated %d bytes\r\n", len - dump_len);
    }
    fclose(f);
    if (g_consoleEnabled) {
        fprintf(stdout, "[%02u:%02u:%02u.%03u] %s len=%d from=%s:%d\r\n",
                st.wHour, st.wMinute, st.wSecond, st.wMilliseconds, tag, len, addrbuf, port);
        for (int i = 0; i < dump_len; i += 16) {
            fprintf(stdout, "  %04X  ", i);
            int line_len = (dump_len - i < 16) ? (dump_len - i) : 16;
            for (int j = 0; j < line_len; ++j) {
                fprintf(stdout, "%02X ", b[i + j]);
            }
            fprintf(stdout, "\r\n");
        }
        if (dump_len < len) {
            fprintf(stdout, "  ... truncated %d bytes\r\n", len - dump_len);
        }
    }
    LeaveCriticalSection(&g_logLock);
}

static void BytesToHex(const uint8_t* data, size_t len, char* out, size_t out_len) {
    if (!out || out_len == 0) {
        return;
    }
    size_t pos = 0;
    for (size_t i = 0; i < len && pos + 3 < out_len; ++i) {
        int written = _snprintf_s(out + pos, out_len - pos, _TRUNCATE, "%02X", data[i]);
        if (written <= 0) {
            break;
        }
        pos += static_cast<size_t>(written);
        if (i + 1 < len && pos + 1 < out_len) {
            out[pos++] = ' ';
            out[pos] = '\0';
        }
    }
}

static void LoadConfig() {
    char exe_path[MAX_PATH] = {0};
    GetModuleFileNameA(nullptr, exe_path, MAX_PATH);
    char* slash = strrchr(exe_path, '\\');
    if (slash) {
        slash[1] = '\0';
    }
    char ini_path[MAX_PATH] = {0};
    lstrcpyA(ini_path, exe_path);
    lstrcatA(ini_path, "fom_hook.ini");

    g_cfg.log_recv = GetPrivateProfileIntA("Logging", "LogRecv", 1, ini_path) != 0;
    g_cfg.log_send = GetPrivateProfileIntA("Logging", "LogSend", 1, ini_path) != 0;
    g_cfg.log_hex = GetPrivateProfileIntA("Logging", "HexDump", 1, ini_path) != 0;
    g_cfg.max_dump = GetPrivateProfileIntA("Logging", "MaxDump", 4096, ini_path);
    g_cfg.delay_ms = GetPrivateProfileIntA("Hook", "DelayMs", 15000, ini_path);
    g_cfg.rescan_ms = GetPrivateProfileIntA("Hook", "RescanMs", 5000, ini_path);
    g_cfg.overlay = GetPrivateProfileIntA("Overlay", "Enable", 1, ini_path) != 0;
    g_cfg.console_enable = GetPrivateProfileIntA("Console", "Enable", 1, ini_path) != 0;
    g_cfg.overlay_key = GetPrivateProfileIntA("Overlay", "ToggleKey", VK_F1, ini_path);
    g_cfg.log_toggle_key = GetPrivateProfileIntA("Logging", "ToggleKey", VK_F2, ini_path);
    g_cfg.wrapper_hooks = GetPrivateProfileIntA("WrapperHooks", "Enable", 1, ini_path) != 0;
    g_cfg.wrapper_packetproc = GetPrivateProfileIntA("WrapperHooks", "PacketProc", 0, ini_path) != 0;
    g_cfg.ws2_detours = GetPrivateProfileIntA("Hook", "Ws2Detours", 1, ini_path) != 0;
    g_cfg.log_events = GetPrivateProfileIntA("Events", "Log", 1, ini_path) != 0;
    g_cfg.peek_on_read = GetPrivateProfileIntA("Events", "PeekOnRead", 1, ini_path) != 0;

    char log_path[MAX_PATH] = {0};
    GetPrivateProfileStringA("Logging", "LogPath", "", log_path, MAX_PATH, ini_path);
    if (log_path[0]) {
        lstrcpynA(g_cfg.log_path, log_path, MAX_PATH);
    }
}

static void InitConsole() {
    if (!g_cfg.console_enable || g_consoleEnabled) {
        return;
    }
    if (!AttachConsole(ATTACH_PARENT_PROCESS)) {
        AllocConsole();
    }
    FILE* f = nullptr;
    freopen_s(&f, "CONOUT$", "w", stdout);
    freopen_s(&f, "CONOUT$", "w", stderr);
    setvbuf(stdout, nullptr, _IONBF, 0);
    setvbuf(stderr, nullptr, _IONBF, 0);
    SetConsoleTitleA("FoM Hook Log");
    g_consoleEnabled = true;
}

static void* CreateTrampoline(uint8_t* target, size_t len) {
    uint8_t* tramp = reinterpret_cast<uint8_t*>(VirtualAlloc(nullptr, len + 5, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE));
    if (!tramp) {
        return nullptr;
    }
    memcpy(tramp, target, len);
    intptr_t rel = (target + len) - (tramp + len + 5);
    tramp[len] = 0xE9;
    *reinterpret_cast<int32_t*>(tramp + len + 1) = static_cast<int32_t>(rel);
    return tramp;
}

static bool InstallDetour(uint32_t rva, size_t len, void* hook, void** origOut) {
    if (!g_exeBase) {
        return false;
    }
    uint8_t* target = g_exeBase + rva;
    if (origOut && *origOut) {
        return true;
    }
    void* tramp = CreateTrampoline(target, len);
    if (!tramp) {
        return false;
    }
    DWORD oldProt = 0;
    if (!VirtualProtect(target, len, PAGE_EXECUTE_READWRITE, &oldProt)) {
        return false;
    }
    intptr_t rel = (reinterpret_cast<uint8_t*>(hook)) - (target + 5);
    target[0] = 0xE9;
    *reinterpret_cast<int32_t*>(target + 1) = static_cast<int32_t>(rel);
    for (size_t i = 5; i < len; ++i) {
        target[i] = 0x90;
    }
    VirtualProtect(target, len, oldProt, &oldProt);
    FlushInstructionCache(GetCurrentProcess(), target, len);
    if (origOut) {
        *origOut = tramp;
    }
    return true;
}

static bool InstallDetourAt(void* targetPtr, size_t len, void* hook, void** origOut, const char* name) {
    if (!targetPtr || len < 5 || !hook) {
        return false;
    }
    uint8_t* target = reinterpret_cast<uint8_t*>(targetPtr);
    if (origOut && *origOut) {
        return true;
    }
    void* tramp = CreateTrampoline(target, len);
    if (!tramp) {
        return false;
    }
    DWORD oldProt = 0;
    if (!VirtualProtect(target, len, PAGE_EXECUTE_READWRITE, &oldProt)) {
        return false;
    }
    intptr_t rel = (reinterpret_cast<uint8_t*>(hook)) - (target + 5);
    target[0] = 0xE9;
    *reinterpret_cast<int32_t*>(target + 1) = static_cast<int32_t>(rel);
    for (size_t i = 5; i < len; ++i) {
        target[i] = 0x90;
    }
    VirtualProtect(target, len, oldProt, &oldProt);
    FlushInstructionCache(GetCurrentProcess(), target, len);
    if (origOut) {
        *origOut = tramp;
    }
    if (name) {
        char line[128] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "[hook] ws2_32 detour installed: %s", name);
        LogLine(line);
    }
    return true;
}

static void InstallWs2Detours() {
    if (!g_cfg.ws2_detours) {
        LogLine("[hook] ws2_32 detours disabled");
        return;
    }
    HMODULE ws = GetModuleHandleA("ws2_32.dll");
    if (!ws) {
        LogLine("[hook] ws2_32.dll not loaded (detours skipped)");
        return;
    }
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(ws, "recvfrom")), 5,
                    reinterpret_cast<void*>(&Hook_recvfrom), reinterpret_cast<void**>(&g_recvfrom), "recvfrom");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(ws, "recv")), 5,
                    reinterpret_cast<void*>(&Hook_recv), reinterpret_cast<void**>(&g_recv), "recv");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(ws, "WSARecvFrom")), 5,
                    reinterpret_cast<void*>(&Hook_WSARecvFrom), reinterpret_cast<void**>(&g_wsarecvfrom), "WSARecvFrom");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(ws, "WSARecv")), 5,
                    reinterpret_cast<void*>(&Hook_WSARecv), reinterpret_cast<void**>(&g_wsarecv), "WSARecv");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(ws, "sendto")), 5,
                    reinterpret_cast<void*>(&Hook_sendto), reinterpret_cast<void**>(&g_sendto), "sendto");
    InstallDetourAt(reinterpret_cast<void*>(GetProcAddress(ws, "send")), 5,
                    reinterpret_cast<void*>(&Hook_send), reinterpret_cast<void**>(&g_send), "send");
}

static bool CheckPrologue(uint32_t rva, const uint8_t* expected, size_t len, const char* name) {
    if (!g_exeBase || !expected || len == 0 || !name) {
        return false;
    }
    uint8_t* target = g_exeBase + rva;
    if (memcmp(target, expected, len) == 0) {
        return true;
    }
    char expected_hex[128] = {0};
    char actual_hex[128] = {0};
    BytesToHex(expected, len, expected_hex, sizeof(expected_hex));
    BytesToHex(target, len, actual_hex, sizeof(actual_hex));
    char line[256] = {0};
    _snprintf_s(line, sizeof(line), _TRUNCATE,
                "[hook] %s prologue mismatch (exp: %s, got: %s) - skipping",
                name, expected_hex, actual_hex);
    LogLine(line);
    return false;
}

static bool InstallDetourChecked(const char* name, uint32_t rva, size_t len, const uint8_t* expected,
                                 void* hook, void** origOut) {
    if (!CheckPrologue(rva, expected, len, name)) {
        return false;
    }
    bool ok = InstallDetour(rva, len, hook, origOut);
    if (ok) {
        char line[128] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "[hook] %s detour installed", name);
        LogLine(line);
    }
    return ok;
}

static bool PatchIAT(HMODULE module, const char* dllName, const char* funcName, void* newFunc, void** origOut) {
    if (!module || !dllName || !funcName || !newFunc) {
        return false;
    }
    uint8_t* base = reinterpret_cast<uint8_t*>(module);
    auto* dos = reinterpret_cast<PIMAGE_DOS_HEADER>(base);
    if (dos->e_magic != IMAGE_DOS_SIGNATURE) {
        return false;
    }
    auto* nt = reinterpret_cast<PIMAGE_NT_HEADERS>(base + dos->e_lfanew);
    if (nt->Signature != IMAGE_NT_SIGNATURE) {
        return false;
    }
    auto& dir = nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
    if (!dir.VirtualAddress) {
        return false;
    }
    auto* imp = reinterpret_cast<PIMAGE_IMPORT_DESCRIPTOR>(base + dir.VirtualAddress);
    for (; imp->Name; ++imp) {
        const char* name = reinterpret_cast<const char*>(base + imp->Name);
        if (_stricmp(name, dllName) != 0) {
            continue;
        }
        auto* thunk = reinterpret_cast<PIMAGE_THUNK_DATA>(base + imp->FirstThunk);
        auto* origThunk = imp->OriginalFirstThunk
            ? reinterpret_cast<PIMAGE_THUNK_DATA>(base + imp->OriginalFirstThunk)
            : thunk;
        for (; origThunk->u1.AddressOfData; ++origThunk, ++thunk) {
            if (origThunk->u1.Ordinal & IMAGE_ORDINAL_FLAG) {
                continue;
            }
            auto* ibn = reinterpret_cast<PIMAGE_IMPORT_BY_NAME>(base + origThunk->u1.AddressOfData);
            if (strcmp(reinterpret_cast<const char*>(ibn->Name), funcName) != 0) {
                continue;
            }
            DWORD oldProt = 0;
            if (!VirtualProtect(&thunk->u1.Function, sizeof(void*), PAGE_READWRITE, &oldProt)) {
                return false;
            }
            if (origOut && *origOut == nullptr) {
                *origOut = reinterpret_cast<void*>(static_cast<uintptr_t>(thunk->u1.Function));
            }
            thunk->u1.Function = reinterpret_cast<uintptr_t>(newFunc);
            VirtualProtect(&thunk->u1.Function, sizeof(void*), oldProt, &oldProt);
            FlushInstructionCache(GetCurrentProcess(), &thunk->u1.Function, sizeof(void*));
            return true;
        }
    }
    return false;
}

static void PatchModuleImports(HMODULE mod) {
    PatchIAT(mod, "ws2_32.dll", "recvfrom", reinterpret_cast<void*>(&Hook_recvfrom),
             reinterpret_cast<void**>(&g_recvfrom));
    PatchIAT(mod, "ws2_32.dll", "recv", reinterpret_cast<void*>(&Hook_recv),
             reinterpret_cast<void**>(&g_recv));
    PatchIAT(mod, "ws2_32.dll", "sendto", reinterpret_cast<void*>(&Hook_sendto),
             reinterpret_cast<void**>(&g_sendto));
    PatchIAT(mod, "ws2_32.dll", "send", reinterpret_cast<void*>(&Hook_send),
             reinterpret_cast<void**>(&g_send));
    PatchIAT(mod, "ws2_32.dll", "WSARecvFrom", reinterpret_cast<void*>(&Hook_WSARecvFrom),
             reinterpret_cast<void**>(&g_wsarecvfrom));
    PatchIAT(mod, "ws2_32.dll", "WSARecv", reinterpret_cast<void*>(&Hook_WSARecv),
             reinterpret_cast<void**>(&g_wsarecv));
    PatchIAT(mod, "ws2_32.dll", "WSASendTo", reinterpret_cast<void*>(&Hook_WSASendTo),
             reinterpret_cast<void**>(&g_wsasendto));
    PatchIAT(mod, "ws2_32.dll", "WSASend", reinterpret_cast<void*>(&Hook_WSASend),
             reinterpret_cast<void**>(&g_wsasend));
    PatchIAT(mod, "kernel32.dll", "GetProcAddress", reinterpret_cast<void*>(&Hook_GetProcAddress),
             reinterpret_cast<void**>(&g_GetProcAddress));
    PatchIAT(mod, "kernel32.dll", "GetQueuedCompletionStatus", reinterpret_cast<void*>(&Hook_GetQueuedCompletionStatus),
             reinterpret_cast<void**>(&g_GetQueuedCompletionStatus));
    PatchIAT(mod, "kernel32.dll", "GetQueuedCompletionStatusEx", reinterpret_cast<void*>(&Hook_GetQueuedCompletionStatusEx),
             reinterpret_cast<void**>(&g_GetQueuedCompletionStatusEx));
    PatchIAT(mod, "ws2_32.dll", "WSAGetOverlappedResult", reinterpret_cast<void*>(&Hook_WSAGetOverlappedResult),
             reinterpret_cast<void**>(&g_WSAGetOverlappedResult));
    PatchIAT(mod, "ws2_32.dll", "select", reinterpret_cast<void*>(&Hook_select),
             reinterpret_cast<void**>(&g_select));
    PatchIAT(mod, "ws2_32.dll", "WSAPoll", reinterpret_cast<void*>(&Hook_WSAPoll),
             reinterpret_cast<void**>(&g_WSAPoll));
    PatchIAT(mod, "ws2_32.dll", "WSAWaitForMultipleEvents", reinterpret_cast<void*>(&Hook_WSAWaitForMultipleEvents),
             reinterpret_cast<void**>(&g_WSAWaitForMultipleEvents));
    PatchIAT(mod, "ws2_32.dll", "WSAEventSelect", reinterpret_cast<void*>(&Hook_WSAEventSelect),
             reinterpret_cast<void**>(&g_WSAEventSelect));
    PatchIAT(mod, "ws2_32.dll", "WSAEnumNetworkEvents", reinterpret_cast<void*>(&Hook_WSAEnumNetworkEvents),
             reinterpret_cast<void**>(&g_WSAEnumNetworkEvents));
    PatchIAT(mod, "ws2_32.dll", "WSAAsyncSelect", reinterpret_cast<void*>(&Hook_WSAAsyncSelect),
             reinterpret_cast<void**>(&g_WSAAsyncSelect));
    PatchIAT(mod, "ws2_32.dll", "ioctlsocket", reinterpret_cast<void*>(&Hook_ioctlsocket),
             reinterpret_cast<void**>(&g_ioctlsocket));
}

static void PatchAllModules() {
    DWORD pid = GetCurrentProcessId();
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, pid);
    if (snap == INVALID_HANDLE_VALUE) {
        return;
    }
    MODULEENTRY32 me{};
    me.dwSize = sizeof(me);
    HMODULE selfMod = reinterpret_cast<HMODULE>(&__ImageBase);
    if (Module32First(snap, &me)) {
        do {
            if (me.hModule != selfMod) {
                PatchModuleImports(me.hModule);
            }
        } while (Module32Next(snap, &me));
    }
    CloseHandle(snap);
}

static DWORD WINAPI RescanThread(LPVOID) {
    DWORD delay = g_cfg.rescan_ms ? g_cfg.rescan_ms : 5000;
    for (;;) {
        Sleep(delay);
        PatchAllModules();
    }
    return 0;
}

static void TrackOverlapped(LPWSAOVERLAPPED ov, LPWSABUF buffers, DWORD count, sockaddr* from, LPINT fromlen, const char* tag) {
    if (!ov || !buffers || count == 0) {
        return;
    }
    if (!g_ovlInit) {
        return;
    }
    EnterCriticalSection(&g_ovlLock);
    OverlappedInfo info{};
    info.buffers = buffers;
    info.count = count;
    info.from = from;
    info.fromlen = fromlen;
    if (tag) {
        lstrcpynA(info.tag, tag, sizeof(info.tag));
    }
    g_ovlMap[ov] = info;
    LeaveCriticalSection(&g_ovlLock);
}

static bool ConsumeOverlapped(LPWSAOVERLAPPED ov, OverlappedInfo* out) {
    if (!ov || !out || !g_ovlInit) {
        return false;
    }
    EnterCriticalSection(&g_ovlLock);
    auto it = g_ovlMap.find(ov);
    if (it == g_ovlMap.end()) {
        LeaveCriticalSection(&g_ovlLock);
        return false;
    }
    *out = it->second;
    g_ovlMap.erase(it);
    LeaveCriticalSection(&g_ovlLock);
    return true;
}

static void InstallWrapperHooks() {
    if (!g_exeBase) {
        return;
    }
    if (!g_cfg.wrapper_hooks) {
        LogLine("[hook] wrapper hooks disabled");
        return;
    }
    // RVA values based on IDA base 0x00E80000
    const uint8_t kNetSendToPrologue[6] = {0x55, 0x8B, 0xEC, 0x83, 0xEC, 0x18};
    const uint8_t kNetSendPrologue[7] = {0x55, 0x8B, 0xEC, 0x51, 0x89, 0x4D, 0xFC};
    const uint8_t kNetRecvPrologue[7] = {0x55, 0x8B, 0xEC, 0x51, 0x89, 0x4D, 0xFC};
    const uint8_t kPacketProcPrologue[10] = {0x55, 0x8B, 0xEC, 0x6A, 0xFF, 0x68, 0x66, 0xC8, 0x0F, 0x01};

    InstallDetourChecked("Net_SendTo", 0x000E5E30, sizeof(kNetSendToPrologue),
                         kNetSendToPrologue, reinterpret_cast<void*>(&Hook_NetSendTo),
                         reinterpret_cast<void**>(&g_NetSendTo));
    InstallDetourChecked("Net_Send", 0x001230F0, sizeof(kNetSendPrologue),
                         kNetSendPrologue, reinterpret_cast<void*>(&Hook_NetSend),
                         reinterpret_cast<void**>(&g_NetSend));
    InstallDetourChecked("Net_Recv", 0x00123120, sizeof(kNetRecvPrologue),
                         kNetRecvPrologue, reinterpret_cast<void*>(&Hook_NetRecv),
                         reinterpret_cast<void**>(&g_NetRecv));
    if (g_cfg.wrapper_packetproc) {
        InstallDetourChecked("PacketProc", 0x000F41B0, sizeof(kPacketProcPrologue),
                             kPacketProcPrologue, reinterpret_cast<void*>(&Hook_PacketProc),
                             reinterpret_cast<void**>(&g_PacketProc));
    } else {
        LogLine("[hook] PacketProc detour disabled");
    }
    LogLine("[hook] wrapper hooks installed");
}

static DWORD WINAPI NetHookThread(LPVOID) {
    if (g_cfg.delay_ms) {
        Sleep(g_cfg.delay_ms);
    }
    PatchAllModules();
    InstallWrapperHooks();
    LogLine("[hook] wrapper hooks installed");
    InterlockedExchange(&g_netHooksInstalled, 2);
    return 0;
}

static void EnsureNetworkHooks() {
    if (InterlockedCompareExchange(&g_netHooksInstalled, 1, 0) != 0) {
        return;
    }
    CreateThread(nullptr, 0, NetHookThread, nullptr, 0, nullptr);
    LogLine("[hook] network hooks scheduled");
}

static int WSAAPI Hook_recvfrom(SOCKET s, char* buf, int len, int flags, sockaddr* from, int* fromlen) {
    if (!g_recvfrom) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_recvfrom = ws ? reinterpret_cast<recvfrom_t>(GetProcAddress(ws, "recvfrom")) : nullptr;
    }
    if (!g_recvfrom) {
        return SOCKET_ERROR;
    }
    int ret = g_recvfrom(s, buf, len, flags, from, fromlen);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_recv) {
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "recvfrom call ret=%d err=%d len=%d flags=0x%x fromlen=%d",
                    ret, err, len, flags, fromlen ? *fromlen : 0);
        LogLine(line);
    }
    if (ret > 0 && g_cfg.log_recv) {
        g_recvBytes += static_cast<uint64_t>(ret);
        g_recvCount++;
        g_lastRecv = ret;
        int flen = fromlen ? *fromlen : 0;
        LogHex("recvfrom", buf, ret, from, flen);
    }
    return ret;
}

static int WSAAPI Hook_recv(SOCKET s, char* buf, int len, int flags) {
    if (!g_recv) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_recv = ws ? reinterpret_cast<recv_t>(GetProcAddress(ws, "recv")) : nullptr;
    }
    if (!g_recv) {
        return SOCKET_ERROR;
    }
    int ret = g_recv(s, buf, len, flags);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_recv) {
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "recv call ret=%d err=%d len=%d flags=0x%x",
                    ret, err, len, flags);
        LogLine(line);
    }
    if (ret > 0 && g_cfg.log_recv) {
        g_recvBytes += static_cast<uint64_t>(ret);
        g_recvCount++;
        g_lastRecv = ret;
        LogHex("recv", buf, ret, nullptr, 0);
    }
    return ret;
}

static int WSAAPI Hook_sendto(SOCKET s, const char* buf, int len, int flags, const sockaddr* to, int tolen) {
    if (!g_sendto) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_sendto = ws ? reinterpret_cast<sendto_t>(GetProcAddress(ws, "sendto")) : nullptr;
    }
    if (!g_sendto) {
        return SOCKET_ERROR;
    }
    int ret = g_sendto(s, buf, len, flags, to, tolen);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_send) {
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "sendto call ret=%d err=%d len=%d flags=0x%x tolen=%d",
                    ret, err, len, flags, tolen);
        LogLine(line);
    }
    if (ret > 0 && g_cfg.log_send) {
        g_sendBytes += static_cast<uint64_t>(ret);
        g_sendCount++;
        g_lastSend = ret;
        LogHex("sendto", buf, ret, to, tolen);
    }
    return ret;
}

static int WSAAPI Hook_send(SOCKET s, const char* buf, int len, int flags) {
    if (!g_send) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_send = ws ? reinterpret_cast<send_t>(GetProcAddress(ws, "send")) : nullptr;
    }
    if (!g_send) {
        return SOCKET_ERROR;
    }
    int ret = g_send(s, buf, len, flags);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_send) {
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "send call ret=%d err=%d len=%d flags=0x%x",
                    ret, err, len, flags);
        LogLine(line);
    }
    if (ret > 0 && g_cfg.log_send) {
        g_sendBytes += static_cast<uint64_t>(ret);
        g_sendCount++;
        g_lastSend = ret;
        LogHex("send", buf, ret, nullptr, 0);
    }
    return ret;
}

static void LogWsabuf(const char* tag, LPWSABUF buffers, DWORD count, DWORD bytes, const sockaddr* addr, int addrlen) {
    if (!buffers || count == 0 || bytes == 0) {
        return;
    }
    DWORD to_log = bytes;
    if (buffers[0].len < to_log) {
        to_log = buffers[0].len;
    }
    if (to_log > 0 && buffers[0].buf) {
        LogHex(tag, buffers[0].buf, static_cast<int>(to_log), addr, addrlen);
    }
}

static int WSAAPI Hook_WSARecvFrom(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, LPDWORD flags,
                                  sockaddr* from, LPINT fromlen, LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb) {
    if (!g_wsarecvfrom) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_wsarecvfrom = ws ? reinterpret_cast<wsarecvfrom_t>(GetProcAddress(ws, "WSARecvFrom")) : nullptr;
    }
    if (!g_wsarecvfrom) {
        return SOCKET_ERROR;
    }
    int ret = g_wsarecvfrom(s, buffers, count, bytes, flags, from, fromlen, ov, cb);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_recv) {
        char line[200] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE,
                    "WSARecvFrom call ret=%d err=%d bytes=%lu count=%lu ov=%p flags=0x%lx",
                    ret, err, bytes ? *bytes : 0, count, ov, flags ? *flags : 0);
        LogLine(line);
    }
    if (ret == 0 && bytes && *bytes > 0 && g_cfg.log_recv) {
        g_recvBytes += *bytes;
        g_recvCount++;
        g_lastRecv = static_cast<int>(*bytes);
        LogWsabuf("WSARecvFrom", buffers, count, *bytes, from, fromlen ? *fromlen : 0);
    } else if (ret == SOCKET_ERROR && ov && WSAGetLastError() == WSA_IO_PENDING) {
        TrackOverlapped(ov, buffers, count, from, fromlen, "WSARecvFrom(IOCP)");
    }
    return ret;
}

static int WSAAPI Hook_WSARecv(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, LPDWORD flags,
                               LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb) {
    if (!g_wsarecv) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_wsarecv = ws ? reinterpret_cast<wsarecv_t>(GetProcAddress(ws, "WSARecv")) : nullptr;
    }
    if (!g_wsarecv) {
        return SOCKET_ERROR;
    }
    int ret = g_wsarecv(s, buffers, count, bytes, flags, ov, cb);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_recv) {
        char line[200] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE,
                    "WSARecv call ret=%d err=%d bytes=%lu count=%lu ov=%p flags=0x%lx",
                    ret, err, bytes ? *bytes : 0, count, ov, flags ? *flags : 0);
        LogLine(line);
    }
    if (ret == 0 && bytes && *bytes > 0 && g_cfg.log_recv) {
        g_recvBytes += *bytes;
        g_recvCount++;
        g_lastRecv = static_cast<int>(*bytes);
        LogWsabuf("WSARecv", buffers, count, *bytes, nullptr, 0);
    } else if (ret == SOCKET_ERROR && ov && WSAGetLastError() == WSA_IO_PENDING) {
        TrackOverlapped(ov, buffers, count, nullptr, nullptr, "WSARecv(IOCP)");
    }
    return ret;
}

static int WSAAPI Hook_WSASendTo(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, DWORD flags,
                                 const sockaddr* to, int tolen, LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb) {
    if (!g_wsasendto) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_wsasendto = ws ? reinterpret_cast<wsasendto_t>(GetProcAddress(ws, "WSASendTo")) : nullptr;
    }
    if (!g_wsasendto) {
        return SOCKET_ERROR;
    }
    int ret = g_wsasendto(s, buffers, count, bytes, flags, to, tolen, ov, cb);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_send) {
        char line[200] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE,
                    "WSASendTo call ret=%d err=%d bytes=%lu count=%lu ov=%p flags=0x%lx",
                    ret, err, bytes ? *bytes : 0, count, ov, flags);
        LogLine(line);
    }
    if (ret == 0 && bytes && *bytes > 0 && g_cfg.log_send) {
        g_sendBytes += *bytes;
        g_sendCount++;
        g_lastSend = static_cast<int>(*bytes);
        LogWsabuf("WSASendTo", buffers, count, *bytes, to, tolen);
    }
    return ret;
}

static int WSAAPI Hook_WSASend(SOCKET s, LPWSABUF buffers, DWORD count, LPDWORD bytes, DWORD flags,
                               LPWSAOVERLAPPED ov, LPWSAOVERLAPPED_COMPLETION_ROUTINE cb) {
    if (!g_wsasend) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_wsasend = ws ? reinterpret_cast<wsasend_t>(GetProcAddress(ws, "WSASend")) : nullptr;
    }
    if (!g_wsasend) {
        return SOCKET_ERROR;
    }
    int ret = g_wsasend(s, buffers, count, bytes, flags, ov, cb);
    int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (g_cfg.log_send) {
        char line[200] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE,
                    "WSASend call ret=%d err=%d bytes=%lu count=%lu ov=%p flags=0x%lx",
                    ret, err, bytes ? *bytes : 0, count, ov, flags);
        LogLine(line);
    }
    if (ret == 0 && bytes && *bytes > 0 && g_cfg.log_send) {
        g_sendBytes += *bytes;
        g_sendCount++;
        g_lastSend = static_cast<int>(*bytes);
        LogWsabuf("WSASend", buffers, count, *bytes, nullptr, 0);
    }
    return ret;
}

static void LogOverlappedCompletion(const char* tag, const OverlappedInfo& info, DWORD bytes) {
    if (!g_cfg.log_recv || bytes == 0 || !info.buffers || info.count == 0) {
        return;
    }
    DWORD to_log = bytes;
    if (info.buffers[0].len < to_log) {
        to_log = info.buffers[0].len;
    }
    if (to_log > 0 && info.buffers[0].buf) {
        int addrlen = (info.fromlen && info.from) ? *info.fromlen : 0;
        LogHex(tag, info.buffers[0].buf, static_cast<int>(to_log), info.from, addrlen);
    }
}

static BOOL WINAPI Hook_GetQueuedCompletionStatus(HANDLE port, LPDWORD bytes, PULONG_PTR key, LPOVERLAPPED* ov, DWORD ms) {
    if (!g_GetQueuedCompletionStatus) {
        HMODULE k32 = GetModuleHandleA("kernel32.dll");
        g_GetQueuedCompletionStatus = k32 ? reinterpret_cast<GetQueuedCompletionStatus_t>(GetProcAddress(k32, "GetQueuedCompletionStatus")) : nullptr;
    }
    BOOL ok = g_GetQueuedCompletionStatus ? g_GetQueuedCompletionStatus(port, bytes, key, ov, ms) : FALSE;
    if (ok && ov && *ov && bytes && *bytes > 0) {
        OverlappedInfo info{};
        if (ConsumeOverlapped(reinterpret_cast<LPWSAOVERLAPPED>(*ov), &info)) {
            LogOverlappedCompletion(info.tag[0] ? info.tag : "IOCP", info, *bytes);
        } else if (g_cfg.log_recv) {
            char line[160] = {0};
            _snprintf_s(line, sizeof(line), _TRUNCATE, "IOCP completion bytes=%lu ov=%p (untracked)",
                        *bytes, *ov);
            LogLine(line);
        }
    } else if (!ok && g_cfg.log_recv) {
        DWORD err = GetLastError();
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "GetQueuedCompletionStatus failed err=%lu", err);
        LogLine(line);
    }
    return ok;
}

static BOOL WINAPI Hook_GetQueuedCompletionStatusEx(HANDLE port, LPOVERLAPPED_ENTRY entries, ULONG count, PULONG removed, DWORD ms, BOOL alertable) {
    if (!g_GetQueuedCompletionStatusEx) {
        HMODULE k32 = GetModuleHandleA("kernel32.dll");
        g_GetQueuedCompletionStatusEx = k32 ? reinterpret_cast<GetQueuedCompletionStatusEx_t>(GetProcAddress(k32, "GetQueuedCompletionStatusEx")) : nullptr;
    }
    BOOL ok = g_GetQueuedCompletionStatusEx ? g_GetQueuedCompletionStatusEx(port, entries, count, removed, ms, alertable) : FALSE;
    if (ok && entries && removed && *removed > 0) {
        ULONG n = *removed;
        for (ULONG i = 0; i < n; ++i) {
            if (!entries[i].lpOverlapped || entries[i].dwNumberOfBytesTransferred == 0) {
                continue;
            }
            OverlappedInfo info{};
            if (ConsumeOverlapped(reinterpret_cast<LPWSAOVERLAPPED>(entries[i].lpOverlapped), &info)) {
                LogOverlappedCompletion(info.tag[0] ? info.tag : "IOCPEx", info, entries[i].dwNumberOfBytesTransferred);
            } else if (g_cfg.log_recv) {
                char line[160] = {0};
                _snprintf_s(line, sizeof(line), _TRUNCATE, "IOCPEx completion bytes=%lu ov=%p (untracked)",
                            entries[i].dwNumberOfBytesTransferred, entries[i].lpOverlapped);
                LogLine(line);
            }
        }
    } else if (!ok && g_cfg.log_recv) {
        DWORD err = GetLastError();
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "GetQueuedCompletionStatusEx failed err=%lu", err);
        LogLine(line);
    }
    return ok;
}

static BOOL WSAAPI Hook_WSAGetOverlappedResult(SOCKET s, LPWSAOVERLAPPED ov, LPDWORD bytes, BOOL wait, LPDWORD flags) {
    if (!g_WSAGetOverlappedResult) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_WSAGetOverlappedResult = ws ? reinterpret_cast<WSAGetOverlappedResult_t>(GetProcAddress(ws, "WSAGetOverlappedResult")) : nullptr;
    }
    BOOL ok = g_WSAGetOverlappedResult ? g_WSAGetOverlappedResult(s, ov, bytes, wait, flags) : FALSE;
    if (ok && ov && bytes && *bytes > 0) {
        OverlappedInfo info{};
        if (ConsumeOverlapped(ov, &info)) {
            LogOverlappedCompletion(info.tag[0] ? info.tag : "WSAGetOverlappedResult", info, *bytes);
        } else if (g_cfg.log_recv) {
            char line[160] = {0};
            _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAGetOverlappedResult bytes=%lu ov=%p (untracked)",
                        *bytes, ov);
            LogLine(line);
        }
    } else if (!ok && g_cfg.log_recv) {
        int err = WSAGetLastError();
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAGetOverlappedResult failed err=%d", err);
        LogLine(line);
    }
    return ok;
}

static int WSAAPI Hook_select(int nfds, fd_set* readfds, fd_set* writefds, fd_set* exceptfds, const timeval* timeout) {
    if (!g_select) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_select = ws ? reinterpret_cast<select_t>(GetProcAddress(ws, "select")) : nullptr;
    }
    int ret = g_select ? g_select(nfds, readfds, writefds, exceptfds, timeout) : SOCKET_ERROR;
    if (g_cfg.log_recv) {
        int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "select ret=%d err=%d nfds=%d", ret, err, nfds);
        LogLine(line);
    }
    return ret;
}

static int WSAAPI Hook_WSAPoll(LPWSAPOLLFD fds, ULONG nfds, INT timeout) {
    if (!g_WSAPoll) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_WSAPoll = ws ? reinterpret_cast<wsapoll_t>(GetProcAddress(ws, "WSAPoll")) : nullptr;
    }
    int ret = g_WSAPoll ? g_WSAPoll(fds, nfds, timeout) : SOCKET_ERROR;
    if (g_cfg.log_recv) {
        int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
        char line[160] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAPoll ret=%d err=%d nfds=%lu timeout=%d", ret, err, nfds, timeout);
        LogLine(line);
    }
    return ret;
}

static DWORD WSAAPI Hook_WSAWaitForMultipleEvents(DWORD count, const WSAEVENT* events, BOOL waitAll, DWORD timeout, BOOL alertable) {
    if (!g_WSAWaitForMultipleEvents) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_WSAWaitForMultipleEvents = ws ? reinterpret_cast<wsawaitforme_t>(GetProcAddress(ws, "WSAWaitForMultipleEvents")) : nullptr;
    }
    DWORD ret = g_WSAWaitForMultipleEvents ? g_WSAWaitForMultipleEvents(count, events, waitAll, timeout, alertable) : WSA_WAIT_FAILED;
    if (g_cfg.log_recv) {
        int err = (ret == WSA_WAIT_FAILED) ? WSAGetLastError() : 0;
        char line[180] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAWaitForMultipleEvents ret=%lu err=%d count=%lu timeout=%lu",
                    ret, err, count, timeout);
        LogLine(line);
    }
    return ret;
}

static void PeekSocket(SOCKET s) {
    if (!g_cfg.peek_on_read || s == INVALID_SOCKET) {
        return;
    }
    if (!g_ioctlsocket) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_ioctlsocket = ws ? reinterpret_cast<ioctlsocket_t>(GetProcAddress(ws, "ioctlsocket")) : nullptr;
    }
    if (!g_ioctlsocket) {
        return;
    }
    u_long avail = 0;
    if (g_ioctlsocket(s, FIONREAD, &avail) != 0 || avail == 0) {
        return;
    }
    int cap = g_cfg.max_dump > 0 ? g_cfg.max_dump : 1024;
    int to_read = static_cast<int>(avail > static_cast<u_long>(cap) ? cap : avail);
    if (to_read <= 0) {
        return;
    }
    std::vector<char> buf;
    buf.resize(static_cast<size_t>(to_read));
    sockaddr_in from{};
    int fromlen = sizeof(from);
    if (!g_recvfrom) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_recvfrom = ws ? reinterpret_cast<recvfrom_t>(GetProcAddress(ws, "recvfrom")) : nullptr;
    }
    if (!g_recvfrom) {
        return;
    }
    int ret = g_recvfrom(s, buf.data(), to_read, MSG_PEEK, reinterpret_cast<sockaddr*>(&from), &fromlen);
    if (ret > 0) {
        LogHex("FD_READ_PEEK", buf.data(), ret, reinterpret_cast<sockaddr*>(&from), fromlen);
    }
}

static int WSAAPI Hook_WSAEventSelect(SOCKET s, WSAEVENT hEvent, long lNetworkEvents) {
    if (!g_WSAEventSelect) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_WSAEventSelect = ws ? reinterpret_cast<WSAEventSelect_t>(GetProcAddress(ws, "WSAEventSelect")) : nullptr;
    }
    int ret = g_WSAEventSelect ? g_WSAEventSelect(s, hEvent, lNetworkEvents) : SOCKET_ERROR;
    if (g_cfg.log_events) {
        int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
        char line[200] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAEventSelect ret=%d err=%d sock=0x%p events=0x%lx",
                    ret, err, reinterpret_cast<void*>(s), lNetworkEvents);
        LogLine(line);
    }
    return ret;
}

static int WSAAPI Hook_WSAEnumNetworkEvents(SOCKET s, WSAEVENT hEvent, LPWSANETWORKEVENTS lpNetworkEvents) {
    if (!g_WSAEnumNetworkEvents) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_WSAEnumNetworkEvents = ws ? reinterpret_cast<WSAEnumNetworkEvents_t>(GetProcAddress(ws, "WSAEnumNetworkEvents")) : nullptr;
    }
    int ret = g_WSAEnumNetworkEvents ? g_WSAEnumNetworkEvents(s, hEvent, lpNetworkEvents) : SOCKET_ERROR;
    if (g_cfg.log_events && lpNetworkEvents) {
        char line[256] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAEnumNetworkEvents ret=%d sock=0x%p events=0x%lx errRead=%d errWrite=%d errClose=%d",
                    ret, reinterpret_cast<void*>(s), lpNetworkEvents->lNetworkEvents,
                    lpNetworkEvents->iErrorCode[FD_READ_BIT],
                    lpNetworkEvents->iErrorCode[FD_WRITE_BIT],
                    lpNetworkEvents->iErrorCode[FD_CLOSE_BIT]);
        LogLine(line);
        if (lpNetworkEvents->lNetworkEvents & FD_READ) {
            PeekSocket(s);
        }
    }
    return ret;
}

static int WSAAPI Hook_WSAAsyncSelect(SOCKET s, HWND hWnd, u_int wMsg, long lEvent) {
    if (!g_WSAAsyncSelect) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_WSAAsyncSelect = ws ? reinterpret_cast<WSAAsyncSelect_t>(GetProcAddress(ws, "WSAAsyncSelect")) : nullptr;
    }
    int ret = g_WSAAsyncSelect ? g_WSAAsyncSelect(s, hWnd, wMsg, lEvent) : SOCKET_ERROR;
    if (g_cfg.log_events) {
        int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
        char line[200] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "WSAAsyncSelect ret=%d err=%d sock=0x%p events=0x%lx msg=0x%x",
                    ret, err, reinterpret_cast<void*>(s), lEvent, wMsg);
        LogLine(line);
    }
    return ret;
}

static int WSAAPI Hook_ioctlsocket(SOCKET s, long cmd, u_long* argp) {
    if (!g_ioctlsocket) {
        HMODULE ws = GetModuleHandleA("ws2_32.dll");
        g_ioctlsocket = ws ? reinterpret_cast<ioctlsocket_t>(GetProcAddress(ws, "ioctlsocket")) : nullptr;
    }
    int ret = g_ioctlsocket ? g_ioctlsocket(s, cmd, argp) : SOCKET_ERROR;
    if (g_cfg.log_events) {
        int err = (ret == SOCKET_ERROR) ? WSAGetLastError() : 0;
        char line[180] = {0};
        _snprintf_s(line, sizeof(line), _TRUNCATE, "ioctlsocket ret=%d err=%d sock=0x%p cmd=0x%lx arg=%lu",
                    ret, err, reinterpret_cast<void*>(s), cmd, argp ? *argp : 0);
        LogLine(line);
    }
    return ret;
}

static void LogIpPort(const char* tag, const void* buf, int len, int ip, int port) {
    sockaddr_in sin{};
    sin.sin_family = AF_INET;
    sin.sin_addr.s_addr = static_cast<u_long>(ip);
    sin.sin_port = htons(static_cast<u_short>(port));
    LogHex(tag, buf, len, reinterpret_cast<sockaddr*>(&sin), sizeof(sin));
}

static int __fastcall Hook_NetSendTo(void* thisptr, void* edx, SOCKET s, char* buf, int len, int ip, int port) {
    if (g_cfg.log_send && buf && len > 0) {
        LogIpPort("Net_SendTo", buf, len, ip, port);
    }
    return g_NetSendTo ? g_NetSendTo(thisptr, edx, s, buf, len, ip, port) : SOCKET_ERROR;
}

static int __fastcall Hook_NetSend(void* thisptr, void* edx, char* buf, int len) {
    if (g_cfg.log_send && buf && len > 0) {
        LogHex("Net_Send", buf, len, nullptr, 0);
    }
    return g_NetSend ? g_NetSend(thisptr, edx, buf, len) : SOCKET_ERROR;
}

static int __fastcall Hook_NetRecv(void* thisptr, void* edx, char* buf, int len) {
    int ret = g_NetRecv ? g_NetRecv(thisptr, edx, buf, len) : SOCKET_ERROR;
    if (ret > 0 && g_cfg.log_recv && buf) {
        LogHex("Net_Recv", buf, ret, nullptr, 0);
    }
    return ret;
}

static int __stdcall Hook_PacketProc(int ip, int port, void* buf, int size, int arg4, int arg5) {
    if (size > 0 && g_cfg.log_recv && buf) {
        LogIpPort("PacketProc", buf, size, ip, port);
    }
    return g_PacketProc ? g_PacketProc(ip, port, buf, size, arg4, arg5) : 0;
}

static FARPROC WINAPI Hook_GetProcAddress(HMODULE module, LPCSTR name) {
    if (!g_GetProcAddress) {
        HMODULE k32 = GetModuleHandleA("kernel32.dll");
        g_GetProcAddress = k32 ? reinterpret_cast<GetProcAddress_t>(GetProcAddress(k32, "GetProcAddress")) : nullptr;
    }
    FARPROC ret = g_GetProcAddress ? g_GetProcAddress(module, name) : nullptr;
    if (!module || !name) {
        return ret;
    }
    char modName[MAX_PATH] = {0};
    GetModuleFileNameA(module, modName, sizeof(modName));
    const char* base = strrchr(modName, '\\');
    base = base ? base + 1 : modName;
    if (_stricmp(base, "d3d9.dll") == 0) {
        if (_stricmp(name, "Direct3DCreate9") == 0) {
            if (!g_Direct3DCreate9) {
                g_Direct3DCreate9 = reinterpret_cast<Direct3DCreate9_t>(ret);
            }
            LogLine("[hook] GetProcAddress intercepted Direct3DCreate9");
            return reinterpret_cast<FARPROC>(&Hook_Direct3DCreate9);
        }
        if (_stricmp(name, "Direct3DCreate9Ex") == 0) {
            if (!g_Direct3DCreate9Ex) {
                g_Direct3DCreate9Ex = reinterpret_cast<Direct3DCreate9Ex_t>(ret);
            }
            LogLine("[hook] GetProcAddress intercepted Direct3DCreate9Ex");
            return reinterpret_cast<FARPROC>(&Hook_Direct3DCreate9Ex);
        }
        return ret;
    }
    if (_stricmp(base, "kernel32.dll") == 0) {
        if (_stricmp(name, "GetQueuedCompletionStatus") == 0) {
            if (!g_GetQueuedCompletionStatus) {
                g_GetQueuedCompletionStatus = reinterpret_cast<GetQueuedCompletionStatus_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_GetQueuedCompletionStatus);
        }
        if (_stricmp(name, "GetQueuedCompletionStatusEx") == 0) {
            if (!g_GetQueuedCompletionStatusEx) {
                g_GetQueuedCompletionStatusEx = reinterpret_cast<GetQueuedCompletionStatusEx_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_GetQueuedCompletionStatusEx);
        }
    }
    if (_stricmp(base, "ws2_32.dll") == 0) {
        if (_stricmp(name, "recvfrom") == 0) {
            if (!g_recvfrom) {
                g_recvfrom = reinterpret_cast<recvfrom_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_recvfrom);
        }
        if (_stricmp(name, "recv") == 0) {
            if (!g_recv) {
                g_recv = reinterpret_cast<recv_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_recv);
        }
        if (_stricmp(name, "sendto") == 0) {
            if (!g_sendto) {
                g_sendto = reinterpret_cast<sendto_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_sendto);
        }
        if (_stricmp(name, "send") == 0) {
            if (!g_send) {
                g_send = reinterpret_cast<send_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_send);
        }
        if (_stricmp(name, "WSARecvFrom") == 0) {
            if (!g_wsarecvfrom) {
                g_wsarecvfrom = reinterpret_cast<wsarecvfrom_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSARecvFrom);
        }
        if (_stricmp(name, "WSARecv") == 0) {
            if (!g_wsarecv) {
                g_wsarecv = reinterpret_cast<wsarecv_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSARecv);
        }
        if (_stricmp(name, "WSASendTo") == 0) {
            if (!g_wsasendto) {
                g_wsasendto = reinterpret_cast<wsasendto_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSASendTo);
        }
        if (_stricmp(name, "WSASend") == 0) {
            if (!g_wsasend) {
                g_wsasend = reinterpret_cast<wsasend_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSASend);
        }
        if (_stricmp(name, "WSAGetOverlappedResult") == 0) {
            if (!g_WSAGetOverlappedResult) {
                g_WSAGetOverlappedResult = reinterpret_cast<WSAGetOverlappedResult_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSAGetOverlappedResult);
        }
        if (_stricmp(name, "select") == 0) {
            if (!g_select) {
                g_select = reinterpret_cast<select_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_select);
        }
        if (_stricmp(name, "WSAPoll") == 0) {
            if (!g_WSAPoll) {
                g_WSAPoll = reinterpret_cast<wsapoll_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSAPoll);
        }
        if (_stricmp(name, "WSAWaitForMultipleEvents") == 0) {
            if (!g_WSAWaitForMultipleEvents) {
                g_WSAWaitForMultipleEvents = reinterpret_cast<wsawaitforme_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSAWaitForMultipleEvents);
        }
        if (_stricmp(name, "WSAEventSelect") == 0) {
            if (!g_WSAEventSelect) {
                g_WSAEventSelect = reinterpret_cast<WSAEventSelect_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSAEventSelect);
        }
        if (_stricmp(name, "WSAEnumNetworkEvents") == 0) {
            if (!g_WSAEnumNetworkEvents) {
                g_WSAEnumNetworkEvents = reinterpret_cast<WSAEnumNetworkEvents_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSAEnumNetworkEvents);
        }
        if (_stricmp(name, "WSAAsyncSelect") == 0) {
            if (!g_WSAAsyncSelect) {
                g_WSAAsyncSelect = reinterpret_cast<WSAAsyncSelect_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_WSAAsyncSelect);
        }
        if (_stricmp(name, "ioctlsocket") == 0) {
            if (!g_ioctlsocket) {
                g_ioctlsocket = reinterpret_cast<ioctlsocket_t>(ret);
            }
            return reinterpret_cast<FARPROC>(&Hook_ioctlsocket);
        }
    }
    return ret;
}

static LRESULT CALLBACK Hook_WndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    if (g_showOverlay && ImGui_ImplWin32_WndProcHandler(hWnd, msg, wParam, lParam)) {
        return 1;
    }
    return CallWindowProcA(g_origWndProc, hWnd, msg, wParam, lParam);
}

static void InitImGui(IDirect3DDevice9* device) {
    if (InterlockedCompareExchange(&g_imguiInit, 1, 0) != 0) {
        return;
    }
    D3DDEVICE_CREATION_PARAMETERS params{};
    if (device->GetCreationParameters(&params) == D3D_OK) {
        g_hwnd = params.hFocusWindow;
    }
    if (!g_hwnd) {
        g_hwnd = GetForegroundWindow();
    }
    if (!g_hwnd) {
        LogLine("[hook] ImGui init failed (no HWND)");
        return;
    }
    ImGui::CreateContext();
    ImGui_ImplWin32_Init(g_hwnd);
    ImGui_ImplDX9_Init(device);
    g_origWndProc = reinterpret_cast<WNDPROC>(SetWindowLongPtrA(g_hwnd, GWLP_WNDPROC, reinterpret_cast<LONG_PTR>(Hook_WndProc)));
    LogLine("[hook] ImGui initialized");
}

static void RenderOverlay() {
    if (!g_cfg.overlay) {
        return;
    }
    if (GetAsyncKeyState(g_cfg.overlay_key) & 1) {
        g_showOverlay = !g_showOverlay;
    }
    if (GetAsyncKeyState(g_cfg.log_toggle_key) & 1) {
        g_cfg.log_recv = !g_cfg.log_recv;
        g_cfg.log_send = !g_cfg.log_send;
    }
    if (!g_showOverlay) {
        return;
    }

    ImGui_ImplDX9_NewFrame();
    ImGui_ImplWin32_NewFrame();
    ImGui::NewFrame();

    ImGui::Begin("FoM Hook");
    ImGui::Text("Recv: %llu packets, %llu bytes (last=%d)", g_recvCount, g_recvBytes, g_lastRecv);
    ImGui::Text("Send: %llu packets, %llu bytes (last=%d)", g_sendCount, g_sendBytes, g_lastSend);
    ImGui::Checkbox("Log Recv", &g_cfg.log_recv);
    ImGui::Checkbox("Log Send", &g_cfg.log_send);
    ImGui::Checkbox("Hex Dump", &g_cfg.log_hex);
    ImGui::Text("Log: %s", g_cfg.log_path[0] ? g_cfg.log_path : "(default)");
    ImGui::End();

    ImGui::EndFrame();
    ImGui::Render();
    ImGui_ImplDX9_RenderDrawData(ImGui::GetDrawData());
}

static HRESULT WINAPI Hook_Reset(IDirect3DDevice9* device, D3DPRESENT_PARAMETERS* params) {
    ImGui_ImplDX9_InvalidateDeviceObjects();
    HRESULT hr = g_Reset ? g_Reset(device, params) : D3DERR_INVALIDCALL;
    ImGui_ImplDX9_CreateDeviceObjects();
    return hr;
}

static HRESULT WINAPI Hook_EndScene(IDirect3DDevice9* device) {
    if (!g_loggedEndScene) {
        LogLine("[hook] EndScene intercepted");
        g_loggedEndScene = true;
    }
    if (g_cfg.overlay) {
        InitImGui(device);
        if (!g_Present) {
            RenderOverlay();
        }
    }
    return g_EndScene ? g_EndScene(device) : D3D_OK;
}

static HRESULT WINAPI Hook_Present(IDirect3DDevice9* device, const RECT* src, const RECT* dst, HWND hwnd, const RGNDATA* dirty) {
    if (!g_loggedPresent) {
        LogLine("[hook] Present intercepted");
        g_loggedPresent = true;
    }
    if (g_cfg.overlay) {
        InitImGui(device);
        RenderOverlay();
    }
    return g_Present ? g_Present(device, src, dst, hwnd, dirty) : D3D_OK;
}

static void InstallDeviceHooks(IDirect3DDevice9* device) {
    if (!device) {
        return;
    }
    void** vtbl = *reinterpret_cast<void***>(device);
    if (!g_EndScene) {
        g_EndScene = reinterpret_cast<EndScene_t>(vtbl[42]);
        DWORD oldProt = 0;
        if (VirtualProtect(&vtbl[42], sizeof(void*), PAGE_READWRITE, &oldProt)) {
            vtbl[42] = reinterpret_cast<void*>(&Hook_EndScene);
            VirtualProtect(&vtbl[42], sizeof(void*), oldProt, &oldProt);
        }
    }
    if (!g_Reset) {
        g_Reset = reinterpret_cast<Reset_t>(vtbl[16]);
        DWORD oldProt = 0;
        if (VirtualProtect(&vtbl[16], sizeof(void*), PAGE_READWRITE, &oldProt)) {
            vtbl[16] = reinterpret_cast<void*>(&Hook_Reset);
            VirtualProtect(&vtbl[16], sizeof(void*), oldProt, &oldProt);
        }
    }
    if (!g_Present) {
        g_Present = reinterpret_cast<Present_t>(vtbl[17]);
        DWORD oldProt = 0;
        if (VirtualProtect(&vtbl[17], sizeof(void*), PAGE_READWRITE, &oldProt)) {
            vtbl[17] = reinterpret_cast<void*>(&Hook_Present);
            VirtualProtect(&vtbl[17], sizeof(void*), oldProt, &oldProt);
        }
    }
    g_device = device;
}

static HRESULT WINAPI Hook_CreateDevice(IDirect3D9* self, UINT adapter, D3DDEVTYPE type, HWND hwnd,
                                        DWORD behavior, D3DPRESENT_PARAMETERS* params, IDirect3DDevice9** out) {
    HRESULT hr = g_CreateDevice ? g_CreateDevice(self, adapter, type, hwnd, behavior, params, out) : E_FAIL;
    if (SUCCEEDED(hr) && out && *out) {
        if (!g_loggedCreateDevice) {
            LogLine("[hook] CreateDevice intercepted");
            g_loggedCreateDevice = true;
        }
        InstallDeviceHooks(*out);
        EnsureNetworkHooks();
    }
    return hr;
}

static void InstallD3D9Hooks() {
    HMODULE exe = GetModuleHandleA(nullptr);
    if (!exe) {
        return;
    }
    PatchIAT(exe, "d3d9.dll", "Direct3DCreate9", reinterpret_cast<void*>(&Hook_Direct3DCreate9),
             reinterpret_cast<void**>(&g_Direct3DCreate9));
    PatchIAT(exe, "d3d9.dll", "Direct3DCreate9Ex", reinterpret_cast<void*>(&Hook_Direct3DCreate9Ex),
             reinterpret_cast<void**>(&g_Direct3DCreate9Ex));
}

static IDirect3D9* WINAPI Hook_Direct3DCreate9(UINT sdk) {
    if (!g_Direct3DCreate9) {
        HMODULE d3d9 = GetModuleHandleA("d3d9.dll");
        g_Direct3DCreate9 = d3d9 ? reinterpret_cast<Direct3DCreate9_t>(GetProcAddress(d3d9, "Direct3DCreate9")) : nullptr;
    }
    IDirect3D9* d3d9 = g_Direct3DCreate9 ? g_Direct3DCreate9(sdk) : nullptr;
    if (d3d9 && !g_loggedD3D9) {
        LogLine("[hook] Direct3DCreate9 intercepted");
        g_loggedD3D9 = true;
    }
    if (d3d9 && !g_CreateDevice) {
        void** vtbl = *reinterpret_cast<void***>(d3d9);
        g_CreateDevice = reinterpret_cast<CreateDevice_t>(vtbl[16]);
        DWORD oldProt = 0;
        if (VirtualProtect(&vtbl[16], sizeof(void*), PAGE_READWRITE, &oldProt)) {
            vtbl[16] = reinterpret_cast<void*>(&Hook_CreateDevice);
            VirtualProtect(&vtbl[16], sizeof(void*), oldProt, &oldProt);
        }
    }
    return d3d9;
}

static HRESULT WINAPI Hook_Direct3DCreate9Ex(UINT sdk, IDirect3D9Ex** out) {
    if (!g_Direct3DCreate9Ex) {
        HMODULE d3d9 = GetModuleHandleA("d3d9.dll");
        g_Direct3DCreate9Ex = d3d9 ? reinterpret_cast<Direct3DCreate9Ex_t>(GetProcAddress(d3d9, "Direct3DCreate9Ex")) : nullptr;
    }
    HRESULT hr = g_Direct3DCreate9Ex ? g_Direct3DCreate9Ex(sdk, out) : E_FAIL;
    if (SUCCEEDED(hr) && out && *out && !g_loggedD3D9) {
        LogLine("[hook] Direct3DCreate9Ex intercepted");
        g_loggedD3D9 = true;
    }
    if (SUCCEEDED(hr) && out && *out && !g_CreateDevice) {
        IDirect3D9* d3d9 = *reinterpret_cast<IDirect3D9**>(out);
        void** vtbl = *reinterpret_cast<void***>(d3d9);
        g_CreateDevice = reinterpret_cast<CreateDevice_t>(vtbl[16]);
        DWORD oldProt = 0;
        if (VirtualProtect(&vtbl[16], sizeof(void*), PAGE_READWRITE, &oldProt)) {
            vtbl[16] = reinterpret_cast<void*>(&Hook_CreateDevice);
            VirtualProtect(&vtbl[16], sizeof(void*), oldProt, &oldProt);
        }
    }
    return hr;
}

static DWORD WINAPI InitThread(LPVOID) {
    LoadConfig();
    InitializeCriticalSection(&g_logLock);
    g_logInit = true;
    InitLogPath();
    if (g_cfg.log_path[0]) {
        DeleteFileA(g_cfg.log_path);
    }
    InitConsole();
    InitializeCriticalSection(&g_ovlLock);
    g_ovlInit = true;

    g_exeBase = reinterpret_cast<uint8_t*>(GetModuleHandleA(nullptr));
    PatchAllModules();
    LogLine("[hook] ws2_32 hooks installed (early)");
    InstallWs2Detours();
    CreateThread(nullptr, 0, RescanThread, nullptr, 0, nullptr);
    InstallD3D9Hooks();

    return 0;
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID) {
    switch (reason) {
    case DLL_PROCESS_ATTACH:
        DisableThreadLibraryCalls(hModule);
        CreateThread(nullptr, 0, InitThread, nullptr, 0, nullptr);
        break;
    case DLL_PROCESS_DETACH:
        if (g_imguiInit) {
            ImGui_ImplDX9_Shutdown();
            ImGui_ImplWin32_Shutdown();
            ImGui::DestroyContext();
        }
        if (g_logInit) {
            DeleteCriticalSection(&g_logLock);
            g_logInit = false;
        }
        if (g_ovlInit) {
            DeleteCriticalSection(&g_ovlLock);
            g_ovlInit = false;
        }
        break;
    default:
        break;
    }
    return TRUE;
}
