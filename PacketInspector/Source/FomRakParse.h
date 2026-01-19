#pragma once

#include "FomPacketInspector.h"

#include <cstdint>
#include <cstring>

/**
 * Bitstream length encoding type used by RakNet.
 */
typedef uint32_t BitstreamLengthEncoding;

/**
 * Convert a bit count to a byte count.
 * @param Bits Number of bits.
 * @return Number of bytes required.
 */
static inline uint32_t BitsToBytes(uint32_t Bits)
{
    return (Bits + 7U) / 8U;
}

/**
 * MSB-first bit reader for internal parsing.
 */
struct BitReader
{
    /** Data buffer. */
    const uint8_t* Data = nullptr;
    /** Total number of bits in the buffer. */
    uint32_t BitCount = 0;
    /** Current read offset in bits. */
    uint32_t Offset = 0;

    /**
     * Construct a reader over a byte buffer.
     * @param Data Buffer pointer.
     * @param LengthBytes Buffer length in bytes.
     */
    BitReader(const uint8_t* Buffer, uint32_t LengthBytes)
    {
        Data = Buffer;
        BitCount = LengthBytes * 8U;
        Offset = 0;
    }

    /**
     * Return number of unread bits.
     * @return Remaining bits.
     */
    uint32_t GetUnreadBits() const
    {
        return (Offset <= BitCount) ? (BitCount - Offset) : 0;
    }

    /**
     * Return current read offset in bits.
     * @return Current bit offset.
     */
    uint32_t GetReadOffsetBits() const
    {
        return Offset;
    }

    /**
     * Set read offset in bits, clamped to buffer length.
     * @param Bits New offset in bits.
     */
    void SetReadOffsetBits(uint32_t Bits)
    {
        Offset = (Bits <= BitCount) ? Bits : BitCount;
    }

    /**
     * Align to next byte boundary.
     */
    void AlignToByteBoundary()
    {
        const uint32_t Mod = Offset & 7U;
        if (Mod == 0)
        {
            return;
        }
        const uint32_t Skip = 8U - Mod;
        if (GetUnreadBits() >= Skip)
        {
            Offset += Skip;
        }
        else
        {
            Offset = BitCount;
        }
    }

    /**
     * Read a single bit.
     * @param OutBit Output bit value.
     * @return True on success.
     */
    bool ReadBit(bool& OutBit)
    {
        if (GetUnreadBits() < 1)
        {
            return false;
        }
        const uint8_t Byte = Data[Offset >> 3];
        const uint8_t Mask = static_cast<uint8_t>(0X80u >> (Offset & 7U));
        OutBit = (Byte & Mask) != 0;
        Offset += 1;
        return true;
    }

    /**
     * Read an unsigned integer from a bit count.
     * @param Bits Number of bits.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadBitsToUnsigned(uint32_t Bits, uint32_t& OutValue)
    {
        if (Bits > 32U)
        {
            return false;
        }
        if (GetUnreadBits() < Bits)
        {
            return false;
        }
        uint32_t Value = 0;
        for (uint32_t I = 0; I < Bits; ++I)
        {
            bool Bit = false;
            if (!ReadBit(Bit))
            {
                return false;
            }
            Value = (Value << 1) | (Bit ? 1U : 0U);
        }
        OutValue = Value;
        return true;
    }

    /**
     * Read a single byte.
     * @param OutByte Output byte.
     * @return True on success.
     */
    bool ReadByte(uint8_t& OutByte)
    {
        uint32_t Value = 0;
        if (!ReadBitsToUnsigned(8, Value))
        {
            return false;
        }
        OutByte = static_cast<uint8_t>(Value & 0XFFu);
        return true;
    }

    /**
     * Read a 16-bit unsigned value (little-endian bytes).
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadUInt16(uint16_t& OutValue)
    {
        uint8_t B0 = 0;
        uint8_t B1 = 0;
        if (!ReadByte(B0) || !ReadByte(B1))
        {
            return false;
        }
        OutValue = static_cast<uint16_t>(B0 | (static_cast<uint16_t>(B1) << 8));
        return true;
    }

    /**
     * Read a 32-bit unsigned value (little-endian bytes).
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadUInt32(uint32_t& OutValue)
    {
        uint8_t B0 = 0;
        uint8_t B1 = 0;
        uint8_t B2 = 0;
        uint8_t B3 = 0;
        if (!ReadByte(B0) || !ReadByte(B1) || !ReadByte(B2) || !ReadByte(B3))
        {
            return false;
        }
        OutValue = static_cast<uint32_t>(B0) |
            (static_cast<uint32_t>(B1) << 8) |
            (static_cast<uint32_t>(B2) << 16) |
            (static_cast<uint32_t>(B3) << 24);
        return true;
    }

    /**
     * Read a compressed unsigned integer.
     * @param SizeBytes Maximum size in bytes.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadCompressedUnsigned(uint32_t SizeBytes, uint32_t& OutValue)
    {
        if (SizeBytes == 0 || SizeBytes > 4)
        {
            return false;
        }
        uint8_t Buffer[4] = {0};
        int Current = static_cast<int>(SizeBytes) - 1;

        while (Current > 0)
        {
            bool Bit = false;
            if (!ReadBit(Bit))
            {
                return false;
            }
            if (Bit)
            {
                Buffer[Current] = 0;
                Current--;
            }
            else
            {
                for (int I = 0; I <= Current; ++I)
                {
                    if (!ReadByte(Buffer[I]))
                    {
                        return false;
                    }
                }
                OutValue = 0;
                for (uint32_t I = 0; I < SizeBytes; ++I)
                {
                    OutValue |= static_cast<uint32_t>(Buffer[I]) << (I * 8U);
                }
                return true;
            }
        }

        bool Bit = false;
        if (!ReadBit(Bit))
        {
            return false;
        }
        if (Bit)
        {
            uint32_t Nibble = 0;
            if (!ReadBitsToUnsigned(4, Nibble))
            {
                return false;
            }
            Buffer[Current] = static_cast<uint8_t>(Nibble & 0X0Fu);
        }
        else
        {
            if (!ReadByte(Buffer[Current]))
            {
                return false;
            }
        }

        OutValue = 0;
        for (uint32_t I = 0; I < SizeBytes; ++I)
        {
            OutValue |= static_cast<uint32_t>(Buffer[I]) << (I * 8U);
        }
        return true;
    }
};

/**
 * LSB-first bit reader for LithTech payloads.
 */
struct LithBitReader
{
    /** Data buffer. */
    const uint8_t* Data = nullptr;
    /** Total number of bits in the buffer. */
    uint32_t BitCount = 0;
    /** Current read offset in bits. */
    uint32_t Offset = 0;

    /**
     * Construct a reader over a byte buffer.
     * @param Data Buffer pointer.
     * @param LengthBytes Buffer length in bytes.
     */
    LithBitReader(const uint8_t* Buffer, uint32_t LengthBytes)
    {
        Data = Buffer;
        BitCount = LengthBytes * 8U;
        Offset = 0;
    }

    /**
     * Return number of unread bits.
     * @return Remaining bits.
     */
    uint32_t GetUnreadBits() const
    {
        return (Offset <= BitCount) ? (BitCount - Offset) : 0;
    }

    /**
     * Align to next byte boundary.
     */
    void AlignToByteBoundary()
    {
        const uint32_t Mod = Offset & 7U;
        if (Mod == 0)
        {
            return;
        }
        const uint32_t Skip = 8U - Mod;
        if (GetUnreadBits() >= Skip)
        {
            Offset += Skip;
        }
        else
        {
            Offset = BitCount;
        }
    }

    /**
     * Read a single bit (LSB-first).
     * @param OutBit Output bit value.
     * @return True on success.
     */
    bool ReadBit(bool& OutBit)
    {
        if (GetUnreadBits() < 1)
        {
            return false;
        }
        const uint8_t Byte = Data[Offset >> 3];
        const uint8_t Mask = static_cast<uint8_t>(1U << (Offset & 7U));
        OutBit = (Byte & Mask) != 0;
        Offset += 1;
        return true;
    }

    /**
     * Read an unsigned integer from a bit count (LSB-first).
     * @param Bits Number of bits.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadBitsToUnsigned(uint32_t Bits, uint32_t& OutValue)
    {
        if (Bits > 32U)
        {
            return false;
        }
        if (GetUnreadBits() < Bits)
        {
            return false;
        }
        uint32_t Value = 0;
        for (uint32_t I = 0; I < Bits; ++I)
        {
            bool Bit = false;
            if (!ReadBit(Bit))
            {
                return false;
            }
            if (Bit)
            {
                Value |= (1U << I);
            }
        }
        OutValue = Value;
        return true;
    }

    /**
     * Read a single byte.
     * @param OutByte Output byte.
     * @return True on success.
     */
    bool ReadByte(uint8_t& OutByte)
    {
        uint32_t Value = 0;
        if (!ReadBitsToUnsigned(8, Value))
        {
            return false;
        }
        OutByte = static_cast<uint8_t>(Value & 0XFFu);
        return true;
    }

    /**
     * Read a 16-bit unsigned value (little-endian bytes).
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadUInt16(uint16_t& OutValue)
    {
        uint8_t B0 = 0;
        uint8_t B1 = 0;
        if (!ReadByte(B0) || !ReadByte(B1))
        {
            return false;
        }
        OutValue = static_cast<uint16_t>(B0 | (static_cast<uint16_t>(B1) << 8));
        return true;
    }

    /**
     * Read a 32-bit unsigned value (little-endian bytes).
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadUInt32(uint32_t& OutValue)
    {
        uint8_t B0 = 0;
        uint8_t B1 = 0;
        uint8_t B2 = 0;
        uint8_t B3 = 0;
        if (!ReadByte(B0) || !ReadByte(B1) || !ReadByte(B2) || !ReadByte(B3))
        {
            return false;
        }
        OutValue = static_cast<uint32_t>(B0) |
            (static_cast<uint32_t>(B1) << 8) |
            (static_cast<uint32_t>(B2) << 16) |
            (static_cast<uint32_t>(B3) << 24);
        return true;
    }

    /**
     * Read a compressed unsigned integer (LSB-first).
     * @param SizeBytes Maximum size in bytes.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadCompressedUnsigned(uint32_t SizeBytes, uint32_t& OutValue)
    {
        if (SizeBytes == 0 || SizeBytes > 4)
        {
            return false;
        }
        uint8_t Buffer[4] = {0};
        int Current = static_cast<int>(SizeBytes) - 1;

        while (Current > 0)
        {
            bool Bit = false;
            if (!ReadBit(Bit))
            {
                return false;
            }
            if (Bit)
            {
                Buffer[Current] = 0;
                Current--;
            }
            else
            {
                for (int I = 0; I <= Current; ++I)
                {
                    if (!ReadByte(Buffer[I]))
                    {
                        return false;
                    }
                }
                OutValue = 0;
                for (uint32_t I = 0; I < SizeBytes; ++I)
                {
                    OutValue |= static_cast<uint32_t>(Buffer[I]) << (I * 8U);
                }
                return true;
            }
        }

        bool Bit = false;
        if (!ReadBit(Bit))
        {
            return false;
        }
        if (Bit)
        {
            uint32_t Nibble = 0;
            if (!ReadBitsToUnsigned(4, Nibble))
            {
                return false;
            }
            Buffer[Current] = static_cast<uint8_t>(Nibble & 0X0Fu);
        }
        else
        {
            if (!ReadByte(Buffer[Current]))
            {
                return false;
            }
        }

        OutValue = 0;
        for (uint32_t I = 0; I < SizeBytes; ++I)
        {
            OutValue |= static_cast<uint32_t>(Buffer[I]) << (I * 8U);
        }
        return true;
    }
};

/**
 * RakNet bit reader that mirrors RakNet bit packing.
 */
struct RakBitReader
{
    /** Data buffer. */
    const uint8_t* Data = nullptr;
    /** Total number of bits in the buffer. */
    uint32_t BitCount = 0;
    /** Current read offset in bits. */
    uint32_t Offset = 0;

    /**
     * Construct a reader over a byte buffer.
     * @param Data Buffer pointer.
     * @param LengthBytes Buffer length in bytes.
     */
    RakBitReader(const uint8_t* Buffer, uint32_t LengthBytes)
    {
        Data = Buffer;
        BitCount = LengthBytes * 8U;
        Offset = 0;
    }

    /**
     * Return number of unread bits.
     * @return Remaining bits.
     */
    uint32_t GetUnreadBits() const
    {
        return (Offset <= BitCount) ? (BitCount - Offset) : 0;
    }

    /**
     * Align to next byte boundary.
     */
    void AlignToByteBoundary()
    {
        const uint32_t Mod = Offset & 7U;
        if (Mod == 0)
        {
            return;
        }
        const uint32_t Skip = 8U - Mod;
        if (GetUnreadBits() >= Skip)
        {
            Offset += Skip;
        }
        else
        {
            Offset = BitCount;
        }
    }

    /**
     * Read an arbitrary bit count into a buffer.
     * @param Output Output buffer.
     * @param NumberOfBitsToRead Number of bits to read.
     * @param AlignBitsToRight True to right-align bits.
     * @return True on success.
     */
    bool ReadBits(uint8_t* Output, uint32_t NumberOfBitsToRead, bool AlignBitsToRight)
    {
        if (!Output || GetUnreadBits() < NumberOfBitsToRead)
        {
            return false;
        }

        std::memset(Output, 0, BitsToBytes(NumberOfBitsToRead));
        uint32_t ReadOffsetMod8 = Offset & 7U;
        uint32_t OutOffset = 0;
        int BitsToRead = static_cast<int>(NumberOfBitsToRead);

        while (BitsToRead > 0)
        {
            Output[OutOffset] |= Data[Offset >> 3] << ReadOffsetMod8;

            if (ReadOffsetMod8 > 0 && BitsToRead > static_cast<int>(8U - ReadOffsetMod8))
            {
                Output[OutOffset] |= Data[(Offset >> 3) + 1] >> (8U - ReadOffsetMod8);
            }

            BitsToRead -= 8;
            if (BitsToRead < 0)
            {
                if (AlignBitsToRight)
                {
                    Output[OutOffset] >>= static_cast<uint32_t>(-BitsToRead);
                }
                Offset += static_cast<uint32_t>(8 + BitsToRead);
            }
            else
            {
                Offset += 8U;
            }
            OutOffset += 1U;
        }

        return true;
    }

    /**
     * Read a single bit.
     * @param OutBit Output bit value.
     * @return True on success.
     */
    bool ReadBit(bool& OutBit)
    {
        uint8_t Byte = 0;
        if (!ReadBits(&Byte, 1, true))
        {
            return false;
        }
        OutBit = (Byte & 1U) != 0;
        return true;
    }

    /**
     * Read an unsigned integer from a bit count.
     * @param Bits Number of bits.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadBitsToUnsigned(uint32_t Bits, uint32_t& OutValue)
    {
        if (Bits > 32U)
        {
            return false;
        }
        uint8_t Buffer[4] = {0};
        if (!ReadBits(Buffer, Bits, true))
        {
            return false;
        }
        OutValue = static_cast<uint32_t>(Buffer[0]) |
            (static_cast<uint32_t>(Buffer[1]) << 8) |
            (static_cast<uint32_t>(Buffer[2]) << 16) |
            (static_cast<uint32_t>(Buffer[3]) << 24);
        return true;
    }

    /**
     * Read a 16-bit unsigned value.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadUInt16(uint16_t& OutValue)
    {
        uint32_t Value = 0;
        if (!ReadBitsToUnsigned(16U, Value))
        {
            return false;
        }
        OutValue = static_cast<uint16_t>(Value & 0XFFFFu);
        return true;
    }

    /**
     * Read a 32-bit unsigned value.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadUInt32(uint32_t& OutValue)
    {
        uint32_t Value = 0;
        if (!ReadBitsToUnsigned(32U, Value))
        {
            return false;
        }
        OutValue = Value;
        return true;
    }

    /**
     * Read a compressed unsigned integer.
     * @param SizeBytes Maximum size in bytes.
     * @param OutValue Output value.
     * @return True on success.
     */
    bool ReadCompressedUnsigned(uint32_t SizeBytes, uint32_t& OutValue)
    {
        if (SizeBytes == 0 || SizeBytes > 4U)
        {
            return false;
        }

        uint8_t Output[4] = {0};
        uint32_t CurrentByte = SizeBytes - 1U;

        while (CurrentByte > 0U)
        {
            bool Bit = false;
            if (!ReadBit(Bit))
            {
                return false;
            }

            if (Bit)
            {
                Output[CurrentByte] = 0;
                CurrentByte--;
            }
            else
            {
                if (!ReadBits(Output, (CurrentByte + 1U) << 3, true))
                {
                    return false;
                }
                OutValue = static_cast<uint32_t>(Output[0]) |
                    (static_cast<uint32_t>(Output[1]) << 8) |
                    (static_cast<uint32_t>(Output[2]) << 16) |
                    (static_cast<uint32_t>(Output[3]) << 24);
                return true;
            }
        }

        bool Bit = false;
        if (!ReadBit(Bit))
        {
            return false;
        }

        if (Bit)
        {
            if (!ReadBits(Output + CurrentByte, 4, true))
            {
                return false;
            }
        }
        else
        {
            if (!ReadBits(Output + CurrentByte, 8, true))
            {
                return false;
            }
        }

        OutValue = static_cast<uint32_t>(Output[0]) |
            (static_cast<uint32_t>(Output[1]) << 8) |
            (static_cast<uint32_t>(Output[2]) << 16) |
            (static_cast<uint32_t>(Output[3]) << 24);
        return true;
    }
};

/**
 * Parse a RakNet internal payload and populate inspect data.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param Out Output inspect result.
 * @return True if a payload was parsed.
 */
bool ParseRakInternalPayload(const uint8_t* Data, uint32_t Length, FomInspectResult* Out);

/**
 * Parse a RakNet internal payload and return bit offsets.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param Out Output inspect result.
 * @param OutPayloadOffsetBits Output payload start bit offset.
 * @param OutPayloadBitLength Output payload length in bits.
 * @return True if a payload was parsed.
 */
bool ParseRakInternalPayloadBits(const uint8_t* Data, uint32_t Length, FomInspectResult* Out, uint32_t* OutPayloadOffsetBits, uint32_t* OutPayloadBitLength);
