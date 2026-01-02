/** Logging and capture utilities. */
#pragma once

#include "HookState.h"

/** Function name macro (ANSI). */
#ifndef ANSI_TO_TCHAR
#define ANSI_TO_TCHAR(x) x
#endif
#if _MSC_VER
#define FUNC_NAME    ANSI_TO_TCHAR(__FUNCTION__)
#else
#define FUNC_NAME    ANSI_TO_TCHAR(__func__)
#endif

/** Logs a formatted line with header (timestamp/frame/function). */
void Logf(const char* FuncName, const char* Format, ...);

/** Convenience macro for logging with current function. */
#define LOG(Format, ...) \
    Logf(FUNC_NAME, (Format), ##__VA_ARGS__)

/** Initializes logging state. */
void LogInit();
/** Shuts down logging resources. */
void LogShutdown();
/** Resolves the log file path. */
void InitLogPath();
/** Returns true when network logging should capture packets. */
bool ShouldCaptureNetwork();
/** Logs a buffer as hex. */
void LogHex(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength);
/** Logs a buffer as hex with extra metadata appended on the header line. */
void LogHexEx(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength, const char* Extra);
/** Logs a buffer as hex with extra metadata and an explicit packet id override (-1 to auto). */
void LogHexExId(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength, const char* Extra, int ForceId);
/** Logs a buffer as LSB-first bits. */
void LogBits(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength);
/** Logs a buffer as MSB-first bits. */
void LogBitsMsb(const char* Tag, const void* Data, int Length, const sockaddr* Address, int AddressLength);
/** Converts bytes to a hex string. */
void BytesToHex(const uint8_t* Data, size_t Length, char* Out, size_t OutLength);
/** Initializes a console for logging output. */
void InitConsole();
