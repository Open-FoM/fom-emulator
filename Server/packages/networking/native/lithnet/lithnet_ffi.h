/**
 * LithTech Packet FFI Wrapper for Bun
 * 
 * This header defines the C API that implements LithTech-style bit-level packet
 * read/write operations for use with Bun's FFI. The implementation matches the
 * behavior of the original LithTech Jupiter engine's CPacket_Read/CPacket_Write
 * classes as seen in the FoM client.
 * 
 * Key differences from RakNet BitStream:
 * - LithTech uses 32-bit word-aligned internal storage with bit accumulation
 * - Bit operations work on uint32 values directly (not byte arrays)
 * - Read position tracking includes sub-32-bit offsets
 * 
 * Memory Management:
 * - Packet handles must be freed with lith_packet_destroy()
 * - Data buffers returned are owned by the caller unless noted
 */

#ifndef LITHNET_FFI_H
#define LITHNET_FFI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef _WIN32
    #ifdef LITHNET_FFI_EXPORTS
        #define LITH_FFI_API __declspec(dllexport)
    #else
        #define LITH_FFI_API __declspec(dllimport)
    #endif
#else
    #define LITH_FFI_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

// =============================================================================
// Types
// =============================================================================

/** Opaque handle to a packet write buffer (analogous to CPacket_Write) */
typedef void* LithPacketWriteHandle;

/** Opaque handle to a packet read buffer (analogous to CPacket_Read) */
typedef void* LithPacketReadHandle;

// =============================================================================
// Packet Write Functions (CPacket_Write equivalent)
// =============================================================================

/**
 * Create a new packet for writing.
 * @return Handle to the packet, or NULL on failure
 */
LITH_FFI_API LithPacketWriteHandle lith_packet_write_create(void);

/**
 * Destroy a write packet and free all resources.
 * @param packet Handle from lith_packet_write_create()
 */
LITH_FFI_API void lith_packet_write_destroy(LithPacketWriteHandle packet);

/**
 * Reset the packet for reuse (clears all written data).
 * @param packet Handle from lith_packet_write_create()
 */
LITH_FFI_API void lith_packet_write_reset(LithPacketWriteHandle packet);

/**
 * Get the current size of the packet in bits.
 * @param packet Handle from lith_packet_write_create()
 * @return Size in bits
 */
LITH_FFI_API uint32_t lith_packet_write_size(LithPacketWriteHandle packet);

/**
 * Get the current size of the packet in bytes (rounded up).
 * @param packet Handle from lith_packet_write_create()
 * @return Size in bytes
 */
LITH_FFI_API uint32_t lith_packet_write_size_bytes(LithPacketWriteHandle packet);

/**
 * Check if the packet is empty.
 * @param packet Handle from lith_packet_write_create()
 * @return true if empty
 */
LITH_FFI_API bool lith_packet_write_empty(LithPacketWriteHandle packet);

/**
 * Write arbitrary bits (up to 32).
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write (only lower nBits are used)
 * @param num_bits Number of bits to write (1-32)
 */
LITH_FFI_API void lith_write_bits(LithPacketWriteHandle packet, uint32_t value, uint32_t num_bits);

/**
 * Write arbitrary bits (up to 64).
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write (only lower nBits are used)
 * @param num_bits Number of bits to write (1-64)
 */
LITH_FFI_API void lith_write_bits64(LithPacketWriteHandle packet, uint64_t value, uint32_t num_bits);

/**
 * Write raw data (bit-aligned).
 * @param packet Handle from lith_packet_write_create()
 * @param data Source data buffer
 * @param num_bits Number of bits to write
 */
LITH_FFI_API void lith_write_data(LithPacketWriteHandle packet, const void* data, uint32_t num_bits);

/**
 * Write a boolean (1 bit).
 * @param packet Handle from lith_packet_write_create()
 * @param value Boolean value
 */
LITH_FFI_API void lith_write_bool(LithPacketWriteHandle packet, bool value);

/**
 * Write an unsigned 8-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_uint8(LithPacketWriteHandle packet, uint8_t value);

/**
 * Write an unsigned 16-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_uint16(LithPacketWriteHandle packet, uint16_t value);

/**
 * Write an unsigned 32-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_uint32(LithPacketWriteHandle packet, uint32_t value);

/**
 * Write an unsigned 64-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_uint64(LithPacketWriteHandle packet, uint64_t value);

/**
 * Write a signed 8-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_int8(LithPacketWriteHandle packet, int8_t value);

/**
 * Write a signed 16-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_int16(LithPacketWriteHandle packet, int16_t value);

/**
 * Write a signed 32-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_int32(LithPacketWriteHandle packet, int32_t value);

/**
 * Write a signed 64-bit value.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_int64(LithPacketWriteHandle packet, int64_t value);

/**
 * Write a 32-bit float.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_float(LithPacketWriteHandle packet, float value);

/**
 * Write a 64-bit double.
 * @param packet Handle from lith_packet_write_create()
 * @param value Value to write
 */
LITH_FFI_API void lith_write_double(LithPacketWriteHandle packet, double value);

/**
 * Write a null-terminated string.
 * @param packet Handle from lith_packet_write_create()
 * @param str String to write (null-terminated)
 */
LITH_FFI_API void lith_write_string(LithPacketWriteHandle packet, const char* str);

/**
 * Get the packet data as a contiguous byte buffer.
 * @param packet Handle from lith_packet_write_create()
 * @param out_size Output: size in bytes
 * @return Pointer to internal data (valid until next write or destroy)
 */
LITH_FFI_API const uint8_t* lith_packet_write_get_data(LithPacketWriteHandle packet, uint32_t* out_size);

/**
 * Copy packet data to a user-provided buffer.
 * @param packet Handle from lith_packet_write_create()
 * @param buffer Destination buffer
 * @param buffer_size Size of destination buffer
 * @return Number of bytes copied
 */
LITH_FFI_API uint32_t lith_packet_write_copy_data(LithPacketWriteHandle packet, uint8_t* buffer, uint32_t buffer_size);

// =============================================================================
// Packet Read Functions (CPacket_Read equivalent)
// =============================================================================

/**
 * Create a packet reader from raw data.
 * @param data Source data buffer
 * @param size_bits Size of data in bits
 * @return Handle to the packet, or NULL on failure
 */
LITH_FFI_API LithPacketReadHandle lith_packet_read_create(const uint8_t* data, uint32_t size_bits);

/**
 * Create a packet reader from raw data (byte size).
 * @param data Source data buffer
 * @param size_bytes Size of data in bytes
 * @return Handle to the packet, or NULL on failure
 */
LITH_FFI_API LithPacketReadHandle lith_packet_read_create_bytes(const uint8_t* data, uint32_t size_bytes);

/**
 * Create a packet reader from a write packet.
 * @param write_packet Handle from lith_packet_write_create()
 * @return Handle to the packet, or NULL on failure
 */
LITH_FFI_API LithPacketReadHandle lith_packet_read_from_write(LithPacketWriteHandle write_packet);

/**
 * Destroy a read packet and free all resources.
 * @param packet Handle from lith_packet_read_create*()
 */
LITH_FFI_API void lith_packet_read_destroy(LithPacketReadHandle packet);

/**
 * Get the total size of the packet in bits.
 * @param packet Handle from lith_packet_read_create*()
 * @return Size in bits
 */
LITH_FFI_API uint32_t lith_packet_read_size(LithPacketReadHandle packet);

/**
 * Get the current read position in bits.
 * @param packet Handle from lith_packet_read_create*()
 * @return Position in bits (0-based)
 */
LITH_FFI_API uint32_t lith_packet_read_tell(LithPacketReadHandle packet);

/**
 * Get the number of remaining bits to read.
 * @param packet Handle from lith_packet_read_create*()
 * @return Number of unread bits
 */
LITH_FFI_API uint32_t lith_packet_read_tell_end(LithPacketReadHandle packet);

/**
 * Check if at end of packet.
 * @param packet Handle from lith_packet_read_create*()
 * @return true if at or past end
 */
LITH_FFI_API bool lith_packet_read_eop(LithPacketReadHandle packet);

/**
 * Seek relative to current position.
 * @param packet Handle from lith_packet_read_create*()
 * @param offset_bits Offset in bits (can be negative)
 */
LITH_FFI_API void lith_packet_read_seek(LithPacketReadHandle packet, int32_t offset_bits);

/**
 * Seek to absolute position.
 * @param packet Handle from lith_packet_read_create*()
 * @param position_bits Position in bits (0-based)
 */
LITH_FFI_API void lith_packet_read_seek_to(LithPacketReadHandle packet, uint32_t position_bits);

/**
 * Read arbitrary bits (up to 32).
 * @param packet Handle from lith_packet_read_create*()
 * @param num_bits Number of bits to read (1-32)
 * @return Read value (lower num_bits are valid)
 */
LITH_FFI_API uint32_t lith_read_bits(LithPacketReadHandle packet, uint32_t num_bits);

/**
 * Read arbitrary bits (up to 64).
 * @param packet Handle from lith_packet_read_create*()
 * @param num_bits Number of bits to read (1-64)
 * @return Read value (lower num_bits are valid)
 */
LITH_FFI_API uint64_t lith_read_bits64(LithPacketReadHandle packet, uint32_t num_bits);

/**
 * Read raw data (bit-aligned).
 * @param packet Handle from lith_packet_read_create*()
 * @param data Destination buffer
 * @param num_bits Number of bits to read
 */
LITH_FFI_API void lith_read_data(LithPacketReadHandle packet, void* data, uint32_t num_bits);

/**
 * Read a boolean (1 bit).
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API bool lith_read_bool(LithPacketReadHandle packet);

/**
 * Read an unsigned 8-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API uint8_t lith_read_uint8(LithPacketReadHandle packet);

/**
 * Read an unsigned 16-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API uint16_t lith_read_uint16(LithPacketReadHandle packet);

/**
 * Read an unsigned 32-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API uint32_t lith_read_uint32(LithPacketReadHandle packet);

/**
 * Read an unsigned 64-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API uint64_t lith_read_uint64(LithPacketReadHandle packet);

/**
 * Read a signed 8-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API int8_t lith_read_int8(LithPacketReadHandle packet);

/**
 * Read a signed 16-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API int16_t lith_read_int16(LithPacketReadHandle packet);

/**
 * Read a signed 32-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API int32_t lith_read_int32(LithPacketReadHandle packet);

/**
 * Read a signed 64-bit value.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API int64_t lith_read_int64(LithPacketReadHandle packet);

/**
 * Read a 32-bit float.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API float lith_read_float(LithPacketReadHandle packet);

/**
 * Read a 64-bit double.
 * @param packet Handle from lith_packet_read_create*()
 * @return Read value
 */
LITH_FFI_API double lith_read_double(LithPacketReadHandle packet);

/**
 * Read a null-terminated string.
 * @param packet Handle from lith_packet_read_create*()
 * @param buffer Destination buffer
 * @param max_len Maximum length (including null terminator)
 * @return Length of string (excluding null terminator)
 */
LITH_FFI_API uint32_t lith_read_string(LithPacketReadHandle packet, char* buffer, uint32_t max_len);

// =============================================================================
// Peek Functions (read without advancing position)
// =============================================================================

/**
 * Peek arbitrary bits (up to 32) without advancing position.
 * @param packet Handle from lith_packet_read_create*()
 * @param num_bits Number of bits to peek (1-32)
 * @return Peeked value (lower num_bits are valid)
 */
LITH_FFI_API uint32_t lith_peek_bits(LithPacketReadHandle packet, uint32_t num_bits);

/**
 * Peek arbitrary bits (up to 64) without advancing position.
 * @param packet Handle from lith_packet_read_create*()
 * @param num_bits Number of bits to peek (1-64)
 * @return Peeked value (lower num_bits are valid)
 */
LITH_FFI_API uint64_t lith_peek_bits64(LithPacketReadHandle packet, uint32_t num_bits);

/**
 * Peek an unsigned 8-bit value without advancing position.
 * @param packet Handle from lith_packet_read_create*()
 * @return Peeked value
 */
LITH_FFI_API uint8_t lith_peek_uint8(LithPacketReadHandle packet);

/**
 * Peek an unsigned 16-bit value without advancing position.
 * @param packet Handle from lith_packet_read_create*()
 * @return Peeked value
 */
LITH_FFI_API uint16_t lith_peek_uint16(LithPacketReadHandle packet);

/**
 * Peek an unsigned 32-bit value without advancing position.
 * @param packet Handle from lith_packet_read_create*()
 * @return Peeked value
 */
LITH_FFI_API uint32_t lith_peek_uint32(LithPacketReadHandle packet);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate CRC32 checksum of packet data.
 * @param packet Handle from lith_packet_read_create*()
 * @return CRC32 checksum
 */
LITH_FFI_API uint32_t lith_packet_calc_checksum(LithPacketReadHandle packet);

/**
 * Get the library version string.
 * @return Version string (do not free)
 */
LITH_FFI_API const char* lith_get_version(void);

#ifdef __cplusplus
}
#endif

#endif // LITHNET_FFI_H
