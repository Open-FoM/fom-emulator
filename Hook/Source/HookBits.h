/** Shared bit-reading helpers. */
#pragma once

#include "HookCommon.h"

inline bool ReadBitsLsb(const uint8_t* Data, int TotalBits, int* BitPos, int NumBits, uint32_t* Out)
{
    if (!Data || !BitPos || !Out || NumBits <= 0)
    {
        return false;
    }
    if (*BitPos + NumBits > TotalBits)
    {
        return false;
    }
    uint32_t Value = 0;
    for (int BitOffset = 0; BitOffset < NumBits; ++BitOffset)
    {
        int Index = *BitPos + BitOffset;
        int ByteIndex = Index / 8;
        int BitInByte = Index % 8;
        uint8_t Bit = (Data[ByteIndex] >> BitInByte) & 1;
        Value |= (static_cast<uint32_t>(Bit) << BitOffset);
    }
    *BitPos += NumBits;
    *Out = Value;
    return true;
}

inline bool ReadBitsMsb(const uint8_t* Data, int TotalBits, int* BitPos, int NumBits, uint32_t* Out)
{
    if (!Data || !BitPos || !Out || NumBits <= 0)
    {
        return false;
    }
    if (*BitPos + NumBits > TotalBits)
    {
        return false;
    }
    uint32_t Value = 0;
    for (int BitOffset = 0; BitOffset < NumBits; ++BitOffset)
    {
        int Index = *BitPos + BitOffset;
        int ByteIndex = Index / 8;
        int BitInByte = Index % 8;
        uint8_t Bit = (Data[ByteIndex] >> (7 - BitInByte)) & 1;
        Value = (Value << 1) | Bit;
    }
    *BitPos += NumBits;
    *Out = Value;
    return true;
}
