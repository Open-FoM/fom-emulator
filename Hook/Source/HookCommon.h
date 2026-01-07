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
