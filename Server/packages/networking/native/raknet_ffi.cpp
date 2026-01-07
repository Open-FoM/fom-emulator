/**
 * RakNet FFI Wrapper Implementation
 * 
 * This file implements the C wrapper around RakNet 3.611 (exact FoM version) for Bun FFI.
 */

#define RAKNET_FFI_EXPORTS
#include "raknet_ffi.h"

// RakNet 3.611 headers (from Server/packagers/networking/native/raknet/include/raknet/)
#include "raknet/RakPeerInterface.h"
#include "raknet/RakNetworkFactory.h"
#include "raknet/RakNetTypes.h"
#include "raknet/RakNetStatistics.h"
#include "raknet/MessageIdentifiers.h"
#include "raknet/BitStream.h"
#include "raknet/StringCompressor.h"

#include <cstring>
#include <cstdlib>

using namespace RakNet;

// =============================================================================
// Lifecycle Functions
// =============================================================================

RAK_FFI_API RakPeerHandle rak_create(void) {
    RakPeerInterface* peer = RakNetworkFactory::GetRakPeerInterface();
    return static_cast<RakPeerHandle>(peer);
}

RAK_FFI_API void rak_destroy(RakPeerHandle handle) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    RakNetworkFactory::DestroyRakPeerInterface(peer);
}

RAK_FFI_API bool rak_startup(RakPeerHandle handle, uint16_t max_connections,
                              uint16_t local_port, int32_t thread_sleep_ms) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SocketDescriptor sd(local_port, 0);
    return peer->Startup(max_connections, thread_sleep_ms, &sd, 1);
}

RAK_FFI_API void rak_shutdown(RakPeerHandle handle, uint32_t block_duration_ms) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    peer->Shutdown(block_duration_ms);
}

RAK_FFI_API bool rak_is_active(RakPeerHandle handle) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    return peer->IsActive();
}

// =============================================================================
// Server Configuration
// =============================================================================

RAK_FFI_API void rak_set_max_incoming_connections(RakPeerHandle handle, uint16_t max_incoming) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    peer->SetMaximumIncomingConnections(max_incoming);
}

RAK_FFI_API void rak_set_incoming_password(RakPeerHandle handle,
                                            const char* password, int32_t password_length) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    peer->SetIncomingPassword(password, password_length);
}

// =============================================================================
// Security (RSA)
// =============================================================================

RAK_FFI_API void rak_init_security(RakPeerHandle handle,
                                    const char* pub_key_e, const char* pub_key_n,
                                    const char* priv_key_p, const char* priv_key_q) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    peer->InitializeSecurity(pub_key_e, pub_key_n, priv_key_p, priv_key_q);
}

RAK_FFI_API void rak_disable_security(RakPeerHandle handle) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    peer->DisableSecurity();
}

// =============================================================================
// Connection Management
// =============================================================================

RAK_FFI_API bool rak_connect(RakPeerHandle handle, const char* host, uint16_t remote_port,
                              const char* password, int32_t password_length) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    return peer->Connect(host, remote_port, password, password_length);
}

RAK_FFI_API void rak_close_connection(RakPeerHandle handle, RakSystemAddress address,
                                       bool send_notification) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = address.binary_address;
    sa.port = address.port;
    peer->CloseConnection(sa, send_notification);
}

RAK_FFI_API bool rak_is_connected(RakPeerHandle handle, RakSystemAddress address) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = address.binary_address;
    sa.port = address.port;
    return peer->IsConnected(sa);
}

RAK_FFI_API uint16_t rak_get_connection_count(RakPeerHandle handle) {
    if (!handle) return 0;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    return peer->NumberOfConnections();
}

// =============================================================================
// Send/Receive
// =============================================================================

RAK_FFI_API bool rak_send(RakPeerHandle handle, const uint8_t* data, int32_t length,
                           RakPriority priority, RakReliability reliability,
                           uint8_t ordering_channel, RakSystemAddress address, bool broadcast) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = address.binary_address;
    sa.port = address.port;
    
    return peer->Send(
        reinterpret_cast<const char*>(data),
        length,
        static_cast<PacketPriority>(priority),
        static_cast<PacketReliability>(reliability),
        ordering_channel,
        sa,
        broadcast
    );
}

RAK_FFI_API RakPacket* rak_receive(RakPeerHandle handle) {
    if (!handle) return nullptr;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    Packet* p = peer->Receive();
    if (!p) return nullptr;
    
    // Allocate our wrapper packet
    RakPacket* packet = static_cast<RakPacket*>(malloc(sizeof(RakPacket)));
    if (!packet) {
        peer->DeallocatePacket(p);
        return nullptr;
    }
    
    packet->length = p->length;
    packet->data = p->data;
    packet->system_address.binary_address = p->systemAddress.binaryAddress;
    packet->system_address.port = p->systemAddress.port;
    packet->packet_number = 0;  // Not available in RakNet 3.25 Packet struct
    packet->internal_packet = p;  // Store for deallocation
    
    return packet;
}

RAK_FFI_API void rak_deallocate_packet(RakPeerHandle handle, RakPacket* packet) {
    if (!handle || !packet) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    if (packet->internal_packet) {
        peer->DeallocatePacket(static_cast<Packet*>(packet->internal_packet));
    }
    free(packet);
}

RAK_FFI_API uint32_t rak_packet_get_length(RakPacket* packet) {
    if (!packet) return 0;
    return packet->length;
}

RAK_FFI_API uint8_t* rak_packet_get_data(RakPacket* packet) {
    if (!packet) return nullptr;
    return packet->data;
}

RAK_FFI_API uint64_t rak_packet_get_address(RakPacket* packet) {
    if (!packet) return 0;
    // Pack address into uint64: high 32 bits = binary_address, low 16 bits = port
    return ((uint64_t)packet->system_address.binary_address << 16) | packet->system_address.port;
}

RAK_FFI_API uint32_t rak_packet_copy_data(RakPacket* packet, uint8_t* buffer, uint32_t buffer_size) {
    if (!packet || !buffer || buffer_size == 0) return 0;
    uint32_t copy_size = packet->length < buffer_size ? packet->length : buffer_size;
    memcpy(buffer, packet->data, copy_size);
    return copy_size;
}

// =============================================================================
// Statistics & Info
// =============================================================================

RAK_FFI_API bool rak_get_statistics(RakPeerHandle handle, RakSystemAddress address,
                                     RakStatistics* stats) {
    if (!handle || !stats) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = address.binary_address;
    sa.port = address.port;
    
    RakNetStatistics* rns = peer->GetStatistics(sa);
    if (!rns) return false;
    
    // messagesSent is an array per priority level - sum all priorities
    stats->messages_sent = rns->messagesSent[0] + rns->messagesSent[1] + rns->messagesSent[2];
    stats->messages_received = rns->messagesReceived;
    stats->messages_resent = rns->messageResends;
    stats->messages_waiting = rns->messagesWaitingForReassembly;
    stats->bytes_sent = static_cast<uint32_t>(rns->totalBitsSent / 8);
    stats->bytes_received = static_cast<uint32_t>(rns->bitsReceived / 8);
    stats->bytes_resent = static_cast<uint32_t>(rns->messagesTotalBitsResent / 8);
    stats->duplicate_messages_received = rns->duplicateMessagesReceived;
    stats->last_ping = peer->GetLastPing(sa);
    stats->average_ping = peer->GetAveragePing(sa);
    stats->lowest_ping = peer->GetLowestPing(sa);
    
    return true;
}

RAK_FFI_API int32_t rak_get_last_ping(RakPeerHandle handle, RakSystemAddress address) {
    if (!handle) return -1;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = address.binary_address;
    sa.port = address.port;
    
    return peer->GetLastPing(sa);
}

RAK_FFI_API RakSystemAddress rak_get_internal_id(RakPeerHandle handle) {
    RakSystemAddress result = {0, 0};
    if (!handle) return result;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa = peer->GetInternalID();
    result.binary_address = sa.binaryAddress;
    result.port = sa.port;
    
    return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

RAK_FFI_API RakSystemAddress rak_unassigned_address(void) {
    RakSystemAddress result;
    result.binary_address = UNASSIGNED_SYSTEM_ADDRESS.binaryAddress;
    result.port = UNASSIGNED_SYSTEM_ADDRESS.port;
    return result;
}

RAK_FFI_API RakSystemAddress rak_address_from_string(const char* ip, uint16_t port) {
    RakSystemAddress result;
    SystemAddress sa;
    sa.SetBinaryAddress(ip);
    sa.port = port;
    result.binary_address = sa.binaryAddress;
    result.port = sa.port;
    return result;
}

RAK_FFI_API bool rak_address_to_string(RakSystemAddress address, char* buffer, int32_t buffer_size) {
    if (!buffer || buffer_size < 22) return false;  // "255.255.255.255:65535" = 21 chars + null
    
    SystemAddress sa;
    sa.binaryAddress = address.binary_address;
    sa.port = address.port;
    
    // Convert to dotted notation
    unsigned char* parts = reinterpret_cast<unsigned char*>(&address.binary_address);
    snprintf(buffer, buffer_size, "%u.%u.%u.%u:%u",
             parts[0], parts[1], parts[2], parts[3], address.port);
    
    return true;
}

RAK_FFI_API void rak_free_string(char* str) {
    free(str);
}

RAK_FFI_API const char* rak_get_version(void) {
    return "RakNet 3.611 FFI Wrapper v1.1 (FoM exact version + BitStream/StringCompressor)";
}

// =============================================================================
// BitStream Functions
// =============================================================================

RAK_FFI_API RakBitStreamHandle rak_bs_create(void) {
    return static_cast<RakBitStreamHandle>(new BitStream());
}

RAK_FFI_API RakBitStreamHandle rak_bs_create_from_data(const uint8_t* data, uint32_t length, bool copy_data) {
    if (!data || length == 0) return nullptr;
    return static_cast<RakBitStreamHandle>(
        new BitStream(const_cast<unsigned char*>(data), length, copy_data)
    );
}

RAK_FFI_API void rak_bs_destroy(RakBitStreamHandle bs) {
    if (!bs) return;
    delete static_cast<BitStream*>(bs);
}

RAK_FFI_API void rak_bs_reset(RakBitStreamHandle bs) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->Reset();
}

RAK_FFI_API uint32_t rak_bs_get_number_of_bytes_used(RakBitStreamHandle bs) {
    if (!bs) return 0;
    return static_cast<BitStream*>(bs)->GetNumberOfBytesUsed();
}

RAK_FFI_API uint32_t rak_bs_get_number_of_bits_used(RakBitStreamHandle bs) {
    if (!bs) return 0;
    return static_cast<BitStream*>(bs)->GetNumberOfBitsUsed();
}

RAK_FFI_API uint8_t* rak_bs_get_data(RakBitStreamHandle bs) {
    if (!bs) return nullptr;
    return static_cast<BitStream*>(bs)->GetData();
}

RAK_FFI_API uint32_t rak_bs_copy_data(RakBitStreamHandle bs, uint8_t* buffer, uint32_t buffer_size) {
    if (!bs || !buffer || buffer_size == 0) return 0;
    BitStream* stream = static_cast<BitStream*>(bs);
    uint32_t bytes_used = stream->GetNumberOfBytesUsed();
    uint32_t copy_size = bytes_used < buffer_size ? bytes_used : buffer_size;
    memcpy(buffer, stream->GetData(), copy_size);
    return copy_size;
}

// --- Write functions ---

RAK_FFI_API void rak_bs_write_bit(RakBitStreamHandle bs, bool value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->Write(value);
}

RAK_FFI_API void rak_bs_write_u8(RakBitStreamHandle bs, uint8_t value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->Write(value);
}

RAK_FFI_API void rak_bs_write_u16(RakBitStreamHandle bs, uint16_t value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->Write(value);
}

RAK_FFI_API void rak_bs_write_u32(RakBitStreamHandle bs, uint32_t value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->Write(value);
}

RAK_FFI_API void rak_bs_write_compressed_u8(RakBitStreamHandle bs, uint8_t value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->WriteCompressed(value);
}

RAK_FFI_API void rak_bs_write_compressed_u16(RakBitStreamHandle bs, uint16_t value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->WriteCompressed(value);
}

RAK_FFI_API void rak_bs_write_compressed_u32(RakBitStreamHandle bs, uint32_t value) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->WriteCompressed(value);
}

RAK_FFI_API void rak_bs_write_bits(RakBitStreamHandle bs, const uint8_t* data, 
                                    uint32_t number_of_bits, bool right_aligned_bits) {
    if (!bs || !data) return;
    static_cast<BitStream*>(bs)->WriteBits(data, number_of_bits, right_aligned_bits);
}

RAK_FFI_API void rak_bs_write_bytes(RakBitStreamHandle bs, const uint8_t* data, uint32_t length) {
    if (!bs || !data) return;
    static_cast<BitStream*>(bs)->Write(reinterpret_cast<const char*>(data), length);
}

RAK_FFI_API void rak_bs_align_write_to_byte_boundary(RakBitStreamHandle bs) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->AlignWriteToByteBoundary();
}

// --- Read functions ---

RAK_FFI_API bool rak_bs_read_bit(RakBitStreamHandle bs, bool* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->Read(*value);
}

RAK_FFI_API bool rak_bs_read_u8(RakBitStreamHandle bs, uint8_t* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->Read(*value);
}

RAK_FFI_API bool rak_bs_read_u16(RakBitStreamHandle bs, uint16_t* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->Read(*value);
}

RAK_FFI_API bool rak_bs_read_u32(RakBitStreamHandle bs, uint32_t* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->Read(*value);
}

RAK_FFI_API bool rak_bs_read_compressed_u8(RakBitStreamHandle bs, uint8_t* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->ReadCompressed(*value);
}

RAK_FFI_API bool rak_bs_read_compressed_u16(RakBitStreamHandle bs, uint16_t* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->ReadCompressed(*value);
}

RAK_FFI_API bool rak_bs_read_compressed_u32(RakBitStreamHandle bs, uint32_t* value) {
    if (!bs || !value) return false;
    return static_cast<BitStream*>(bs)->ReadCompressed(*value);
}

RAK_FFI_API bool rak_bs_read_bits(RakBitStreamHandle bs, uint8_t* data,
                                   uint32_t number_of_bits, bool right_aligned_bits) {
    if (!bs || !data) return false;
    return static_cast<BitStream*>(bs)->ReadBits(data, number_of_bits, right_aligned_bits);
}

RAK_FFI_API bool rak_bs_read_bytes(RakBitStreamHandle bs, uint8_t* data, uint32_t length) {
    if (!bs || !data) return false;
    return static_cast<BitStream*>(bs)->Read(reinterpret_cast<char*>(data), length);
}

RAK_FFI_API void rak_bs_align_read_to_byte_boundary(RakBitStreamHandle bs) {
    if (!bs) return;
    static_cast<BitStream*>(bs)->AlignReadToByteBoundary();
}

// =============================================================================
// StringCompressor Functions
// =============================================================================

RAK_FFI_API void rak_string_compressor_init(void) {
    // StringCompressor is a singleton, AddReference ensures it's initialized
    StringCompressor::AddReference();
}

RAK_FFI_API void rak_string_compressor_encode(const char* input, uint32_t max_chars,
                                               RakBitStreamHandle bs, uint8_t language_id) {
    if (!input || !bs) return;
    BitStream* stream = static_cast<BitStream*>(bs);
    StringCompressor::Instance()->EncodeString(input, max_chars, stream, language_id);
}

RAK_FFI_API bool rak_string_compressor_decode(char* output, uint32_t max_chars,
                                               RakBitStreamHandle bs, uint8_t language_id) {
    if (!output || !bs || max_chars == 0) return false;
    BitStream* stream = static_cast<BitStream*>(bs);
    return StringCompressor::Instance()->DecodeString(output, max_chars, stream, language_id);
}
