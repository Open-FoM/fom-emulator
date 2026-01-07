/**
 * RakNet FFI Wrapper for Bun
 * 
 * This header defines the C API that wraps RakNet 3.611 (exact FoM version) for use with Bun's FFI.
 * All functions use extern "C" linkage to ensure compatibility with FFI.
 * 
 * Memory Management:
 * - Strings returned by the wrapper are owned by the caller and must be freed with rak_free_string()
 * - Packet data returned by rak_receive() must be freed with rak_deallocate_packet()
 * - The RakPeer handle is owned by the wrapper; call rak_destroy() to clean up
 */

#ifndef RAKNET_FFI_H
#define RAKNET_FFI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef _WIN32
    #ifdef RAKNET_FFI_EXPORTS
        #define RAK_FFI_API __declspec(dllexport)
    #else
        #define RAK_FFI_API __declspec(dllimport)
    #endif
#else
    #define RAK_FFI_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

// =============================================================================
// Types
// =============================================================================

/** Opaque handle to a RakPeer instance */
typedef void* RakPeerHandle;

/** Packet priority levels */
typedef enum {
    RAK_PRIORITY_IMMEDIATE = 0,
    RAK_PRIORITY_HIGH = 1,
    RAK_PRIORITY_MEDIUM = 2,
    RAK_PRIORITY_LOW = 3
} RakPriority;

/** Packet reliability modes */
typedef enum {
    RAK_UNRELIABLE = 0,
    RAK_UNRELIABLE_SEQUENCED = 1,
    RAK_RELIABLE = 2,
    RAK_RELIABLE_ORDERED = 3,
    RAK_RELIABLE_SEQUENCED = 4
} RakReliability;

/** System address (IP + port) */
typedef struct {
    uint32_t binary_address;  // Network byte order
    uint16_t port;
} RakSystemAddress;

/** Received packet data */
typedef struct {
    uint32_t length;              // Data length in bytes
    uint8_t* data;                // Packet data (owned by RakNet, freed with rak_deallocate_packet)
    RakSystemAddress system_address;
    uint32_t packet_number;       // Internal packet number
    void* internal_packet;        // Internal handle for deallocation
} RakPacket;

/** Connection statistics */
typedef struct {
    uint32_t messages_sent;
    uint32_t messages_received;
    uint32_t messages_resent;
    uint32_t messages_waiting;
    uint32_t bytes_sent;
    uint32_t bytes_received;
    uint32_t bytes_resent;
    uint32_t duplicate_messages_received;
    int32_t last_ping;
    int32_t average_ping;
    int32_t lowest_ping;
} RakStatistics;

// =============================================================================
// Lifecycle Functions
// =============================================================================

/**
 * Create a new RakPeer instance.
 * @return Handle to the RakPeer, or NULL on failure
 */
RAK_FFI_API RakPeerHandle rak_create(void);

/**
 * Destroy a RakPeer instance and free all resources.
 * @param peer Handle from rak_create()
 */
RAK_FFI_API void rak_destroy(RakPeerHandle peer);

/**
 * Start the RakPeer networking threads.
 * @param peer Handle from rak_create()
 * @param max_connections Maximum number of connections (1 for client, N for server)
 * @param local_port Port to listen on (0 for any available port)
 * @param thread_sleep_ms Sleep time per update cycle (0 recommended)
 * @return true on success, false on failure
 */
RAK_FFI_API bool rak_startup(RakPeerHandle peer, uint16_t max_connections, 
                              uint16_t local_port, int32_t thread_sleep_ms);

/**
 * Stop the RakPeer and close all connections.
 * @param peer Handle from rak_create()
 * @param block_duration_ms How long to wait for pending messages (0 for immediate)
 */
RAK_FFI_API void rak_shutdown(RakPeerHandle peer, uint32_t block_duration_ms);

/**
 * Check if the RakPeer is active.
 * @param peer Handle from rak_create()
 * @return true if active, false otherwise
 */
RAK_FFI_API bool rak_is_active(RakPeerHandle peer);

// =============================================================================
// Server Configuration
// =============================================================================

/**
 * Set the maximum number of incoming connections (server mode).
 * @param peer Handle from rak_create()
 * @param max_incoming Maximum incoming connections allowed
 */
RAK_FFI_API void rak_set_max_incoming_connections(RakPeerHandle peer, uint16_t max_incoming);

/**
 * Set the password required for incoming connections.
 * @param peer Handle from rak_create()
 * @param password Password data (can be binary)
 * @param password_length Length of password in bytes
 */
RAK_FFI_API void rak_set_incoming_password(RakPeerHandle peer, 
                                            const char* password, int32_t password_length);

// =============================================================================
// Security (RSA)
// =============================================================================

/**
 * Initialize RSA security for encrypted connections.
 * @param peer Handle from rak_create()
 * @param pub_key_e Public exponent (hex string, typically "10001")
 * @param pub_key_n Public modulus (hex string)
 * @param priv_key_p Private key P (hex string, or NULL to generate)
 * @param priv_key_q Private key Q (hex string, or NULL to generate)
 */
RAK_FFI_API void rak_init_security(RakPeerHandle peer,
                                    const char* pub_key_e, const char* pub_key_n,
                                    const char* priv_key_p, const char* priv_key_q);

/**
 * Disable security for this peer.
 * @param peer Handle from rak_create()
 */
RAK_FFI_API void rak_disable_security(RakPeerHandle peer);

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Connect to a remote host.
 * @param peer Handle from rak_create()
 * @param host IP address or hostname
 * @param remote_port Port to connect to
 * @param password Connection password (or NULL for none)
 * @param password_length Length of password
 * @return true if connection initiated, false on error
 */
RAK_FFI_API bool rak_connect(RakPeerHandle peer, const char* host, uint16_t remote_port,
                              const char* password, int32_t password_length);

/**
 * Close a connection.
 * @param peer Handle from rak_create()
 * @param address System address to disconnect
 * @param send_notification true to send disconnect notification
 */
RAK_FFI_API void rak_close_connection(RakPeerHandle peer, RakSystemAddress address,
                                       bool send_notification);

/**
 * Check if connected to a specific system.
 * @param peer Handle from rak_create()
 * @param address System address to check
 * @return true if connected
 */
RAK_FFI_API bool rak_is_connected(RakPeerHandle peer, RakSystemAddress address);

/**
 * Get the number of active connections.
 * @param peer Handle from rak_create()
 * @return Number of connections
 */
RAK_FFI_API uint16_t rak_get_connection_count(RakPeerHandle peer);

// =============================================================================
// Send/Receive
// =============================================================================

/**
 * Send data to a remote system.
 * @param peer Handle from rak_create()
 * @param data Data to send
 * @param length Length of data in bytes
 * @param priority Packet priority
 * @param reliability Packet reliability mode
 * @param ordering_channel Ordering channel (0-31)
 * @param address Destination address (use rak_unassigned_address() for broadcast)
 * @param broadcast true to send to all connected systems
 * @return true on success
 */
RAK_FFI_API bool rak_send(RakPeerHandle peer, const uint8_t* data, int32_t length,
                           RakPriority priority, RakReliability reliability,
                           uint8_t ordering_channel, RakSystemAddress address, bool broadcast);

/**
 * Receive a packet from the queue.
 * @param peer Handle from rak_create()
 * @return Pointer to packet data, or NULL if no packets waiting.
 *         Must be freed with rak_deallocate_packet()
 */
RAK_FFI_API RakPacket* rak_receive(RakPeerHandle peer);

/**
 * Deallocate a packet returned by rak_receive().
 * @param peer Handle from rak_create()
 * @param packet Packet to free
 */
RAK_FFI_API void rak_deallocate_packet(RakPeerHandle peer, RakPacket* packet);

/**
 * Get packet length.
 * @param packet Packet from rak_receive()
 * @return Length in bytes
 */
RAK_FFI_API uint32_t rak_packet_get_length(RakPacket* packet);

/**
 * Get packet data pointer.
 * @param packet Packet from rak_receive()
 * @return Pointer to packet data
 */
RAK_FFI_API uint8_t* rak_packet_get_data(RakPacket* packet);

/**
 * Get packet sender address.
 * @param packet Packet from rak_receive()
 * @return System address (binary_address in high 32 bits, port in low 16 bits)
 */
RAK_FFI_API uint64_t rak_packet_get_address(RakPacket* packet);

/**
 * Copy packet data to a buffer.
 * @param packet Packet from rak_receive()
 * @param buffer Destination buffer
 * @param buffer_size Size of destination buffer
 * @return Number of bytes copied
 */
RAK_FFI_API uint32_t rak_packet_copy_data(RakPacket* packet, uint8_t* buffer, uint32_t buffer_size);

// =============================================================================
// Statistics & Info
// =============================================================================

/**
 * Get statistics for a connection.
 * @param peer Handle from rak_create()
 * @param address System address to get stats for
 * @param stats Output statistics structure
 * @return true if stats retrieved, false if not connected
 */
RAK_FFI_API bool rak_get_statistics(RakPeerHandle peer, RakSystemAddress address,
                                     RakStatistics* stats);

/**
 * Get the last ping time for a connection.
 * @param peer Handle from rak_create()
 * @param address System address
 * @return Ping in ms, or -1 if unknown
 */
RAK_FFI_API int32_t rak_get_last_ping(RakPeerHandle peer, RakSystemAddress address);

/**
 * Get this peer's internal address.
 * @param peer Handle from rak_create()
 * @return Internal system address
 */
RAK_FFI_API RakSystemAddress rak_get_internal_id(RakPeerHandle peer);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get an unassigned system address (for broadcast).
 * @return Unassigned address constant
 */
RAK_FFI_API RakSystemAddress rak_unassigned_address(void);

/**
 * Convert an IP string to a system address.
 * @param ip IP address string (e.g., "127.0.0.1")
 * @param port Port number
 * @return System address
 */
RAK_FFI_API RakSystemAddress rak_address_from_string(const char* ip, uint16_t port);

/**
 * Convert a system address to an IP string.
 * @param address System address
 * @param buffer Output buffer for IP string
 * @param buffer_size Size of output buffer
 * @return true on success
 */
RAK_FFI_API bool rak_address_to_string(RakSystemAddress address, char* buffer, int32_t buffer_size);

/**
 * Free a string allocated by the wrapper.
 * @param str String to free
 */
RAK_FFI_API void rak_free_string(char* str);

/**
 * Get the RakNet version string.
 * @return Version string (do not free)
 */
RAK_FFI_API const char* rak_get_version(void);

// =============================================================================
// Message IDs (RakNet 3.611 - FoM exact version)
// =============================================================================

// Reserved internal types
#define RAK_ID_INTERNAL_PING                     0x00
#define RAK_ID_PING                              0x01
#define RAK_ID_PING_OPEN_CONNECTIONS             0x02
#define RAK_ID_CONNECTED_PONG                    0x03
#define RAK_ID_CONNECTION_REQUEST                0x04
#define RAK_ID_SECURED_CONNECTION_RESPONSE       0x05
#define RAK_ID_SECURED_CONNECTION_CONFIRMATION   0x06
#define RAK_ID_RPC_MAPPING                       0x07
#define RAK_ID_DETECT_LOST_CONNECTIONS           0x08
#define RAK_ID_OPEN_CONNECTION_REQUEST           0x09
#define RAK_ID_OPEN_CONNECTION_REPLY             0x0A
#define RAK_ID_RPC                               0x0B
#define RAK_ID_RPC_REPLY                         0x0C
#define RAK_ID_OUT_OF_BAND_INTERNAL              0x0D

// User types (returned to application)
#define RAK_ID_CONNECTION_REQUEST_ACCEPTED       0x0E
#define RAK_ID_CONNECTION_ATTEMPT_FAILED         0x0F
#define RAK_ID_ALREADY_CONNECTED                 0x10
#define RAK_ID_NEW_INCOMING_CONNECTION           0x11
#define RAK_ID_NO_FREE_INCOMING_CONNECTIONS      0x12
#define RAK_ID_DISCONNECTION_NOTIFICATION        0x13
#define RAK_ID_CONNECTION_LOST                   0x14
#define RAK_ID_RSA_PUBLIC_KEY_MISMATCH           0x15
#define RAK_ID_CONNECTION_BANNED                 0x16
#define RAK_ID_INVALID_PASSWORD                  0x17
#define RAK_ID_MODIFIED_PACKET                   0x18
#define RAK_ID_TIMESTAMP                         0x19
#define RAK_ID_PONG                              0x1A
#define RAK_ID_ADVERTISE_SYSTEM                  0x1B
#define RAK_ID_DOWNLOAD_PROGRESS                 0x1C

// First user-defined packet ID (after RakNet internal IDs)
#define RAK_ID_USER_PACKET_ENUM                  0x4B  // ID_USER_PACKET_ENUM in 3.611

// =============================================================================
// BitStream Functions
// =============================================================================

/** Opaque handle to a BitStream instance */
typedef void* RakBitStreamHandle;

/**
 * Create a new BitStream for writing.
 * @return Handle to the BitStream, or NULL on failure
 */
RAK_FFI_API RakBitStreamHandle rak_bs_create(void);

/**
 * Create a BitStream from existing data for reading.
 * @param data Source data
 * @param length Length in bytes
 * @param copy_data true to copy data, false to reference it
 * @return Handle to the BitStream, or NULL on failure
 */
RAK_FFI_API RakBitStreamHandle rak_bs_create_from_data(const uint8_t* data, uint32_t length, bool copy_data);

/**
 * Destroy a BitStream and free resources.
 * @param bs Handle from rak_bs_create()
 */
RAK_FFI_API void rak_bs_destroy(RakBitStreamHandle bs);

/**
 * Reset the BitStream for reuse.
 * @param bs Handle from rak_bs_create()
 */
RAK_FFI_API void rak_bs_reset(RakBitStreamHandle bs);

/**
 * Get the number of bytes used in the BitStream.
 * @param bs Handle from rak_bs_create()
 * @return Number of bytes
 */
RAK_FFI_API uint32_t rak_bs_get_number_of_bytes_used(RakBitStreamHandle bs);

/**
 * Get the number of bits used in the BitStream.
 * @param bs Handle from rak_bs_create()
 * @return Number of bits
 */
RAK_FFI_API uint32_t rak_bs_get_number_of_bits_used(RakBitStreamHandle bs);

/**
 * Get pointer to the BitStream data.
 * @param bs Handle from rak_bs_create()
 * @return Pointer to internal data buffer
 */
RAK_FFI_API uint8_t* rak_bs_get_data(RakBitStreamHandle bs);

/**
 * Copy BitStream data to a buffer.
 * @param bs Handle from rak_bs_create()
 * @param buffer Destination buffer
 * @param buffer_size Size of destination buffer
 * @return Number of bytes copied
 */
RAK_FFI_API uint32_t rak_bs_copy_data(RakBitStreamHandle bs, uint8_t* buffer, uint32_t buffer_size);

// --- Write functions ---

/**
 * Write a single bit.
 * @param bs Handle from rak_bs_create()
 * @param value Bit value (true = 1, false = 0)
 */
RAK_FFI_API void rak_bs_write_bit(RakBitStreamHandle bs, bool value);

/**
 * Write an unsigned 8-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Value to write
 */
RAK_FFI_API void rak_bs_write_u8(RakBitStreamHandle bs, uint8_t value);

/**
 * Write an unsigned 16-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Value to write
 */
RAK_FFI_API void rak_bs_write_u16(RakBitStreamHandle bs, uint16_t value);

/**
 * Write an unsigned 32-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Value to write
 */
RAK_FFI_API void rak_bs_write_u32(RakBitStreamHandle bs, uint32_t value);

/**
 * Write a compressed unsigned 8-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Value to write
 */
RAK_FFI_API void rak_bs_write_compressed_u8(RakBitStreamHandle bs, uint8_t value);

/**
 * Write a compressed unsigned 16-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Value to write
 */
RAK_FFI_API void rak_bs_write_compressed_u16(RakBitStreamHandle bs, uint16_t value);

/**
 * Write a compressed unsigned 32-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Value to write
 */
RAK_FFI_API void rak_bs_write_compressed_u32(RakBitStreamHandle bs, uint32_t value);

/**
 * Write raw bits.
 * @param bs Handle from rak_bs_create()
 * @param data Source data
 * @param number_of_bits Number of bits to write
 * @param right_aligned_bits true if bits are right-aligned in partial bytes
 */
RAK_FFI_API void rak_bs_write_bits(RakBitStreamHandle bs, const uint8_t* data, 
                                    uint32_t number_of_bits, bool right_aligned_bits);

/**
 * Write raw bytes.
 * @param bs Handle from rak_bs_create()
 * @param data Source data
 * @param length Number of bytes to write
 */
RAK_FFI_API void rak_bs_write_bytes(RakBitStreamHandle bs, const uint8_t* data, uint32_t length);

/**
 * Align write position to byte boundary.
 * @param bs Handle from rak_bs_create()
 */
RAK_FFI_API void rak_bs_align_write_to_byte_boundary(RakBitStreamHandle bs);

// --- Read functions ---

/**
 * Read a single bit.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_bit(RakBitStreamHandle bs, bool* value);

/**
 * Read an unsigned 8-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_u8(RakBitStreamHandle bs, uint8_t* value);

/**
 * Read an unsigned 16-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_u16(RakBitStreamHandle bs, uint16_t* value);

/**
 * Read an unsigned 32-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_u32(RakBitStreamHandle bs, uint32_t* value);

/**
 * Read a compressed unsigned 8-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_compressed_u8(RakBitStreamHandle bs, uint8_t* value);

/**
 * Read a compressed unsigned 16-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_compressed_u16(RakBitStreamHandle bs, uint16_t* value);

/**
 * Read a compressed unsigned 32-bit value.
 * @param bs Handle from rak_bs_create()
 * @param value Output value
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_compressed_u32(RakBitStreamHandle bs, uint32_t* value);

/**
 * Read raw bits.
 * @param bs Handle from rak_bs_create()
 * @param data Destination buffer
 * @param number_of_bits Number of bits to read
 * @param right_aligned_bits true if bits should be right-aligned in partial bytes
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_bits(RakBitStreamHandle bs, uint8_t* data,
                                   uint32_t number_of_bits, bool right_aligned_bits);

/**
 * Read raw bytes.
 * @param bs Handle from rak_bs_create()
 * @param data Destination buffer
 * @param length Number of bytes to read
 * @return true on success
 */
RAK_FFI_API bool rak_bs_read_bytes(RakBitStreamHandle bs, uint8_t* data, uint32_t length);

/**
 * Align read position to byte boundary.
 * @param bs Handle from rak_bs_create()
 */
RAK_FFI_API void rak_bs_align_read_to_byte_boundary(RakBitStreamHandle bs);

// =============================================================================
// StringCompressor Functions
// =============================================================================

/**
 * Initialize the StringCompressor singleton.
 * Must be called before using string compression functions.
 * RakPeer::Startup() calls this automatically.
 */
RAK_FFI_API void rak_string_compressor_init(void);

/**
 * Encode a string using Huffman compression into a BitStream.
 * @param input Null-terminated string to encode
 * @param max_chars Maximum characters to encode
 * @param bs BitStream to write to
 * @param language_id Language ID (usually 0)
 */
RAK_FFI_API void rak_string_compressor_encode(const char* input, uint32_t max_chars,
                                               RakBitStreamHandle bs, uint8_t language_id);

/**
 * Decode a Huffman-compressed string from a BitStream.
 * @param output Output buffer for decoded string
 * @param max_chars Maximum characters to decode (buffer size)
 * @param bs BitStream to read from
 * @param language_id Language ID (usually 0)
 * @return true on success
 */
RAK_FFI_API bool rak_string_compressor_decode(char* output, uint32_t max_chars,
                                               RakBitStreamHandle bs, uint8_t language_id);

/**
 * Debug version of decode that returns detailed error codes.
 * @param output Output buffer for decoded string
 * @param max_chars Maximum characters to decode (buffer size)
 * @param bs BitStream to read from
 * @param language_id Language ID (usually 0)
 * @param out_bit_length Output: the stringBitLength read from stream (if successful)
 * @param out_unread_bits Output: number of unread bits remaining in stream
 * @return Error code:
 *         0 = would succeed (passed all checks)
 *         1 = null output buffer
 *         2 = null bitstream
 *         3 = max_chars is 0
 *         4 = StringCompressor instance is null
 *         5 = failed to read stringBitLength (ReadCompressed failed)
 *         6 = not enough bits remaining in stream
 */
RAK_FFI_API int32_t rak_string_compressor_decode_debug(char* output, uint32_t max_chars,
                                                        RakBitStreamHandle bs, uint8_t language_id,
                                                        uint32_t* out_bit_length, uint32_t* out_unread_bits);

#ifdef __cplusplus
}
#endif

#endif // RAKNET_FFI_H
