/** Common platform includes and shared base definitions. */
#pragma once

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <tlhelp32.h>
#include <d3d9.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unordered_map>
#include <vector>

extern "C" IMAGE_DOS_HEADER __ImageBase;

static inline void BytesToHex(const uint8_t* Data, size_t Length, char* Out, size_t OutLength)
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

static inline bool ShouldCaptureNetwork()
{
    return true;
}

static inline void EnsureDirectoryForPath(const char* Path)
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
