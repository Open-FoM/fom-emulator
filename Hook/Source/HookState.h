/** Shared hook configuration and global state. */
#pragma once

#include "HookCommon.h"

struct IDirect3DDevice9;

/** Runtime configuration values for the hook. */
struct FHookConfig
{
    /** Master enable for hook installation. */
    bool bEnableHooks = true;
    /** Log receive packets. */
    bool bLogRecv = true;
    /** Log send packets. */
    bool bLogSend = true;
    /** Log packet data as hex. */
    bool bLogHex = true;
    /** Log packet data as bits. */
    bool bLogBits = true;
    /** Log packet bits MSB-first. */
    bool bLogBitsMsb = false;
    /** Suppress repeated packet logs. */
    bool bSuppressRepeats = true;
    /** Minimum interval between packet logs (ms). */
    int LogMinIntervalMs = 0;
    /** Repeat suppression window (ms). */
    int LogRepeatSuppressMs = 2000;
    /** Decode login 0x6D packets. */
    bool bDecodeLogin6D = true;
    /** Maximum bytes to dump. */
    int MaxDump = 4096;
    /** Maximum bits to dump. */
    int MaxBits = 0;
    /** Bit dump limit for login packets. */
    int LoginDumpBits = 2048;
    /** Bits per line when dumping bits. */
    int BitsPerLine = 128;
    /** Module rescan interval, in milliseconds. */
    DWORD RescanMs = 5000;
    /** Enable the overlay. */
    bool bOverlay = true;
    /** Enable console logging. */
    bool bConsoleEnable = true;
    /** Overlay toggle key. */
    int OverlayKey = VK_F1;
    /** Log toggle key. */
    int LogToggleKey = VK_F2;
    /** Enable wrapper hooks. */
    bool bWrapperHooks = true;
    /** Log network events. */
    bool bLogEvents = true;
    /** Enable peek on read events. */
    bool bPeekOnRead = true;
    /** Log RakNet decrypt output (off by default). */
    bool bLogRakNetDecrypt = false;
    /** Enable RakNet detours. */
    bool bRakNetHooks = true;
    /** Dump runtime Huffman encoding table. */
    bool bDumpHuffmanTable = false;
    /** Enable item override hooks. */
    bool bItemOverrides = false;
    /** Override base stat table in memory (ItemBaseStatTable). */
    bool bItemOverrideBase = false;
    /** Override runtime stat entries read from packets. */
    bool bItemOverrideRuntime = true;
    /** Dump item template entries as they are read. */
    bool bItemTemplateDump = false;
    /** Override log file path. */
    char LogPath[MAX_PATH] = {0};
    /** Resolved ini path for logging and diagnostics. */
    char IniPath[MAX_PATH] = {0};
    /** True if the ini file exists on disk. */
    bool bIniFound = false;
    /** Output path for Huffman table dump. */
    char HuffmanTablePath[MAX_PATH] = {0};
    /** Item override CSV path. */
    char ItemOverridesPath[MAX_PATH] = {0};
    /** Item template dump CSV path. */
    char ItemTemplateDumpPath[MAX_PATH] = {0};
};

/** Global configuration values. */
extern FHookConfig GConfig;

/** Total received bytes. */
extern uint64_t GRecvBytes;
/** Total sent bytes. */
extern uint64_t GSendBytes;
/** Total receive calls. */
extern uint64_t GRecvCount;
/** Total send calls. */
extern uint64_t GSendCount;
/** Last recv length. */
extern int GLastRecv;
/** Last send length. */
extern int GLastSend;
/** Base address of the client module. */
extern uint8_t* GExeBase;
/** Latest D3D9 device pointer (captured on CreateDevice). */
extern IDirect3DDevice9* GD3D9Device;




