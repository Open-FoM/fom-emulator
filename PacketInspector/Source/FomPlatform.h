#pragma once

#include <cstdarg>
#include <cstdio>
#include <cstring>

#if !defined(_WIN32)
#include <strings.h>
#endif

/**
 * Case-insensitive string compare.
 * @param A Left string.
 * @param B Right string.
 * @return Comparison result.
 */
inline int Stricmp(const char* A, const char* B)
{
#if defined(_WIN32)
    return _stricmp(A, B);
#else
    return strcasecmp(A, B);
#endif
}

/**
 * Case-insensitive string compare with length limit.
 * @param A Left string.
 * @param B Right string.
 * @param Count Max characters to compare.
 * @return Comparison result.
 */
inline int Strnicmp(const char* A, const char* B, size_t Count)
{
#if defined(_WIN32)
    return _strnicmp(A, B, Count);
#else
    return strncasecmp(A, B, Count);
#endif
}

/**
 * Safe snprintf wrapper.
 * @param Buffer Output buffer.
 * @param BufferSize Buffer size.
 * @param Count Max characters to write (use _TRUNCATE on Windows).
 * @param Format Format string.
 * @return Number of characters written.
 */
inline int SnprintfS(char* Buffer, size_t BufferSize, size_t Count, const char* Format, ...)
{
    va_list Args;
    va_start(Args, Format);
#if defined(_WIN32)
    const int Result = _vsnprintf_s(Buffer, BufferSize, Count, Format, Args);
#else
    (void)Count;
    const int Result = vsnprintf(Buffer, BufferSize, Format, Args);
#endif
    va_end(Args);
    return Result;
}
