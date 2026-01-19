#pragma once

#include <cstdint>
#include <string>

/**
 * Highlight mask for hex dump rendering.
 */
enum FomHexHighlight : uint8_t
{
    /** No highlight. */
    FomHexHighlightNone = 0,
    /** Highlight outer id byte. */
    FomHexHighlightOuter = 1 << 0,
    /** Highlight inner id byte. */
    FomHexHighlightInner = 1 << 1,
    /** Highlight Lith id byte. */
    FomHexHighlightLith = 1 << 2,
    /** Highlight timestamp bytes. */
    FomHexHighlightTimestamp = 1 << 3,
    /** Highlight scan-derived bytes. */
    FomHexHighlightScan = 1 << 4
};

/**
 * Append a plain hex dump.
 * @param Data Input buffer.
 * @param Length Buffer length.
 * @param MaxDump Maximum bytes to dump.
 * @param Out Output string to append to.
 */
void AppendHexDump(const uint8_t* Data, uint32_t Length, uint32_t MaxDump, std::string& Out);

/**
 * Append an ANSI-colored hex dump with a highlight mask.
 * @param Data Input buffer.
 * @param Length Buffer length.
 * @param MaxDump Maximum bytes to dump.
 * @param Mask Highlight mask buffer.
 * @param MaskLength Mask length.
 * @param Out Output string to append to.
 */
void AppendHexDumpAnsiMasked(const uint8_t* Data, uint32_t Length, uint32_t MaxDump, const uint8_t* Mask, uint32_t MaskLength, std::string& Out);

/**
 * Append an ANSI-colored hex dump with built-in highlights.
 * @param Data Input buffer.
 * @param Length Buffer length.
 * @param MaxDump Maximum bytes to dump.
 * @param Out Output string to append to.
 */
void AppendHexDumpAnsi(const uint8_t* Data, uint32_t Length, uint32_t MaxDump, std::string& Out);
