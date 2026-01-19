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
#include "raknet/InternalPacket.h"
#include "raknet/DS_RangeList.h"
#include "raknet/FoMRawLogger.h"

#include <cctype>
#include <cstdio>
#include <cstring>
#include <cstdlib>

using namespace RakNet;

typedef uint32_t BitstreamLengthEncoding;

// =============================================================================
// Native recv logging (env-driven)
// =============================================================================

static bool g_rak_log_inited = false;
static bool g_rak_log_enabled = false;
static int g_rak_log_max = 32;
static int g_rak_log_id = -1;
static bool g_rak_parse_trace_inited = false;
static bool g_rak_parse_trace = false;

static bool rak_is_falsey(const char* v) {
    if (!v) return true;
    while (*v == ' ' || *v == '\t') v++;
    if (*v == '\0') return true;
    if ((v[0] == '0') && (v[1] == '\0')) return true;
    if ((v[0] == 'f' || v[0] == 'F') &&
        (v[1] == 'a' || v[1] == 'A') &&
        (v[2] == 'l' || v[2] == 'L') &&
        (v[3] == 's' || v[3] == 'S') &&
        (v[4] == 'e' || v[4] == 'E') &&
        (v[5] == '\0')) return true;
    if ((v[0] == 'o' || v[0] == 'O') &&
        (v[1] == 'f' || v[1] == 'F') &&
        (v[2] == 'f' || v[2] == 'F') &&
        (v[3] == '\0')) return true;
    if ((v[0] == 'n' || v[0] == 'N') &&
        (v[1] == 'o' || v[1] == 'O') &&
        (v[2] == '\0')) return true;
    return false;
}

static int rak_parse_int_env(const char* v, int fallback) {
    if (!v) return fallback;
    char* end = nullptr;
    long val = std::strtol(v, &end, 0);
    if (end == v) return fallback;
    if (val < 0) return fallback;
    return static_cast<int>(val);
}

static void rak_log_init_once() {
    if (g_rak_log_inited) return;
    g_rak_log_inited = true;

    const char* log_env = std::getenv("FOM_RAKNET_NATIVE_LOG");
    g_rak_log_enabled = !rak_is_falsey(log_env);

    const char* max_env = std::getenv("FOM_RAKNET_NATIVE_LOG_MAX");
    g_rak_log_max = rak_parse_int_env(max_env, 32);
    if (g_rak_log_max < 1) g_rak_log_max = 1;
    if (g_rak_log_max > 512) g_rak_log_max = 512;

    const char* id_env = std::getenv("FOM_RAKNET_NATIVE_LOG_ID");
    g_rak_log_id = rak_parse_int_env(id_env, -1);
}

static void rak_parse_trace_init_once() {
    if (g_rak_parse_trace_inited) return;
    g_rak_parse_trace_inited = true;
    const char* trace_env = std::getenv("FOM_RAKNET_PARSE_TRACE");
    g_rak_parse_trace = !rak_is_falsey(trace_env);
}

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

RAK_FFI_API void rak_close_connection(RakPeerHandle handle, uint32_t binary_address, uint32_t port,
                                       uint32_t send_notification) {
    if (!handle) return;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = binary_address;
    sa.port = static_cast<unsigned short>(port);
    peer->CloseConnection(sa, send_notification != 0);
}

RAK_FFI_API bool rak_is_connected(RakPeerHandle handle, uint32_t binary_address, uint32_t port) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = binary_address;
    sa.port = static_cast<unsigned short>(port);
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
                           uint8_t ordering_channel, uint32_t binary_address, uint32_t port, uint32_t broadcast) {
    if (!handle) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = binary_address;
    sa.port = static_cast<unsigned short>(port);
    
    return peer->Send(
        reinterpret_cast<const char*>(data),
        length,
        static_cast<PacketPriority>(priority),
        static_cast<PacketReliability>(reliability),
        ordering_channel,
        sa,
        broadcast != 0
    );
}

RAK_FFI_API void rak_raw_log_config(uint32_t enable_recv, uint32_t enable_send,
                                    uint32_t max_queue, uint32_t max_packet_bytes)
{
    FomRawLoggerConfigure(enable_recv ? 1 : 0,
                          enable_send ? 1 : 0,
                          max_queue,
                          max_packet_bytes);
}

RAK_FFI_API uint32_t rak_raw_log_pop(uint8_t* buffer, uint32_t buffer_size,
                                     uint32_t* out_binary_address, uint16_t* out_port,
                                     uint32_t* out_direction)
{
    return FomRawLoggerPop(buffer, buffer_size, out_binary_address, out_port, out_direction);
}

RAK_FFI_API RakPacket* rak_receive(RakPeerHandle handle) {
    if (!handle) return nullptr;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    Packet* p = peer->Receive();
    if (!p) return nullptr;

    rak_log_init_once();
    if (g_rak_log_enabled && p->length > 0) {
        const uint8_t msg_id = p->data[0];
        if (g_rak_log_id < 0 || msg_id == static_cast<uint8_t>(g_rak_log_id)) {
            char addr_buf[64] = {0};
            p->systemAddress.ToString(true, addr_buf);
            std::fprintf(stderr, "[RakNet FFI][recv] len=%u id=0x%02X addr=%s data=",
                         static_cast<unsigned>(p->length),
                         static_cast<unsigned>(msg_id),
                         addr_buf);
            const unsigned max_bytes = static_cast<unsigned>(g_rak_log_max);
            const unsigned to_dump = p->length < max_bytes ? p->length : max_bytes;
            for (unsigned i = 0; i < to_dump; ++i) {
                std::fprintf(stderr, "%02X", p->data[i]);
                if (i + 1 != to_dump) std::fprintf(stderr, " ");
            }
            if (p->length > to_dump) {
                std::fprintf(stderr, " ...(+%u)", static_cast<unsigned>(p->length - to_dump));
            }
            std::fprintf(stderr, "\n");
        }
    }
    
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

RAK_FFI_API bool rak_get_statistics(RakPeerHandle handle, uint32_t binary_address, uint32_t port,
                                     RakStatistics* stats) {
    if (!handle || !stats) return false;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = binary_address;
    sa.port = static_cast<unsigned short>(port);
    
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

RAK_FFI_API int32_t rak_get_last_ping(RakPeerHandle handle, uint32_t binary_address, uint32_t port) {
    if (!handle) return -1;
    RakPeerInterface* peer = static_cast<RakPeerInterface*>(handle);
    
    SystemAddress sa;
    sa.binaryAddress = binary_address;
    sa.port = static_cast<unsigned short>(port);
    
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

RAK_FFI_API uint32_t rak_get_raknet_time_bytes(void) {
    return static_cast<uint32_t>(sizeof(RakNetTime));
}

static int32_t rak_parse_reliable_payload_common(const uint8_t* data, uint32_t length,
                                                 uint32_t* out_payload_offset,
                                                 uint32_t* out_payload_offset_bits,
                                                 uint32_t* out_payload_length,
                                                 uint32_t* out_payload_bits,
                                                 uint8_t* out_reliability)
{
    if (!data || length == 0 || !out_payload_offset || !out_payload_length)
    {
        return 0;
    }

    *out_payload_offset = 0;
    *out_payload_length = 0;
    if (out_payload_offset_bits) *out_payload_offset_bits = 0;
    if (out_payload_bits) *out_payload_bits = 0;
    if (out_reliability) *out_reliability = 0;

    rak_parse_trace_init_once();
    const bool trace = g_rak_parse_trace;

    RakNet::BitStream bs(reinterpret_cast<unsigned char*>(const_cast<uint8_t*>(data)), length, false);

    auto trace_stage = [&](const char* stage) {
        if (!trace) return;
        std::fprintf(stderr,
                     "[RakParse] stage=%s len=%u off=%u unread=%u\n",
                     stage,
                     static_cast<unsigned>(length),
                     static_cast<unsigned>(bs.GetReadOffset()),
                     static_cast<unsigned>(bs.GetNumberOfUnreadBits()));
    };
    auto trace_val_u64 = [&](const char* label, unsigned long long value) {
        if (!trace) return;
        std::fprintf(stderr,
                     "[RakParse] %s=%llu off=%u\n",
                     label,
                     value,
                     static_cast<unsigned>(bs.GetReadOffset()));
    };
    auto trace_val_u32 = [&](const char* label, uint32_t value) {
        if (!trace) return;
        std::fprintf(stderr,
                     "[RakParse] %s=%u off=%u\n",
                     label,
                     static_cast<unsigned>(value),
                     static_cast<unsigned>(bs.GetReadOffset()));
    };
    auto trace_val_u8 = [&](const char* label, uint8_t value) {
        if (!trace) return;
        std::fprintf(stderr,
                     "[RakParse] %s=%u off=%u\n",
                     label,
                     static_cast<unsigned>(value),
                     static_cast<unsigned>(bs.GetReadOffset()));
    };

    trace_stage("start");

#ifdef _USE_RAKNET_FLOW_CONTROL
    bool hasAcks = false;
    if (!bs.Read(hasAcks))
    {
        trace_stage("fail_has_acks");
        return 0;
    }
    trace_val_u8("has_acks", hasAcks ? 1 : 0);
    if (hasAcks)
    {
        RemoteSystemTimeType ourSystemTime = 0;
        unsigned short remoteElapsedMS = 0;
        if (!bs.Read(ourSystemTime)) { trace_stage("fail_our_time"); return 0; }
        if (!bs.Read(remoteElapsedMS)) { trace_stage("fail_remote_elapsed"); return 0; }
        DataStructures::RangeList<MessageNumberType> incomingAcks;
        if (!incomingAcks.Deserialize(&bs)) { trace_stage("fail_ack_ranges"); return 0; }
        trace_val_u64("our_time", static_cast<unsigned long long>(ourSystemTime));
        trace_val_u32("remote_elapsed", static_cast<uint32_t>(remoteElapsedMS));
    }

    bool hasRemoteSystemTime = false;
    if (!bs.Read(hasRemoteSystemTime))
    {
        trace_stage("fail_has_remote_time");
        return 0;
    }
    trace_val_u8("has_remote_time", hasRemoteSystemTime ? 1 : 0);
    if (hasRemoteSystemTime)
    {
        RemoteSystemTimeType remoteSystemTime = 0;
        if (!bs.Read(remoteSystemTime)) { trace_stage("fail_remote_time"); return 0; }
        trace_val_u64("remote_time", static_cast<unsigned long long>(remoteSystemTime));
    }
#endif

    if (bs.GetNumberOfUnreadBits() < (int)sizeof(MessageNumberType) * 8)
    {
        trace_stage("fail_message_bits");
        return 0;
    }

    MessageNumberType messageNumber = 0;
    if (!bs.Read(messageNumber))
    {
        trace_stage("fail_message_number");
        return 0;
    }
    trace_val_u32("message_number", static_cast<uint32_t>(messageNumber));

    unsigned char reliability = 0;
    if (!bs.ReadBits(&reliability, 3))
    {
        trace_stage("fail_reliability_bits");
        return 0;
    }
    trace_val_u8("reliability_bits", reliability);
    if (out_reliability) *out_reliability = reliability;

    if (reliability == UNRELIABLE_SEQUENCED || reliability == RELIABLE_SEQUENCED || reliability == RELIABLE_ORDERED)
    {
        unsigned char orderingChannel = 0;
        if (!bs.ReadBits(&orderingChannel, 5)) { trace_stage("fail_ordering_channel"); return 0; }
        OrderingIndexType orderingIndex = 0;
        if (!bs.Read(orderingIndex)) { trace_stage("fail_ordering_index"); return 0; }
        trace_val_u8("ordering_channel", orderingChannel);
        trace_val_u32("ordering_index", static_cast<uint32_t>(orderingIndex));
    }

    bool isSplitPacket = false;
    if (!bs.Read(isSplitPacket))
    {
        trace_stage("fail_split_flag");
        return 0;
    }
    trace_val_u8("split_flag", isSplitPacket ? 1 : 0);
    if (isSplitPacket)
    {
        SplitPacketIdType splitPacketId = 0;
        SplitPacketIndexType splitPacketIndex = 0;
        SplitPacketIndexType splitPacketCount = 0;
        if (!bs.Read(splitPacketId)) { trace_stage("fail_split_id"); return 0; }
        if (!bs.ReadCompressed(splitPacketIndex)) { trace_stage("fail_split_index"); return 0; }
        if (!bs.ReadCompressed(splitPacketCount)) { trace_stage("fail_split_count"); return 0; }
        trace_val_u32("split_id", static_cast<uint32_t>(splitPacketId));
        trace_val_u32("split_index", static_cast<uint32_t>(splitPacketIndex));
        trace_val_u32("split_count", static_cast<uint32_t>(splitPacketCount));
    }

    BitstreamLengthEncoding dataBitLength = 0;
    if (!bs.ReadCompressed(dataBitLength))
    {
        trace_stage("fail_data_bit_length");
        return 0;
    }
    if (dataBitLength == 0)
    {
        trace_stage("fail_data_bit_length_zero");
        return 0;
    }
    trace_val_u32("data_bit_length", static_cast<uint32_t>(dataBitLength));

    bs.AlignReadToByteBoundary();
    const BitSize_t payloadBitOffset = bs.GetReadOffset();
    const uint32_t payloadOffsetBytes = static_cast<uint32_t>(payloadBitOffset / 8u);
    const uint32_t payloadBytes = static_cast<uint32_t>(BITS_TO_BYTES(dataBitLength));
    trace_val_u32("payload_offset_bits", static_cast<uint32_t>(payloadBitOffset));
    trace_val_u32("payload_offset_bytes", payloadOffsetBytes);
    trace_val_u32("payload_bytes", payloadBytes);

    const uint32_t totalBits = length * 8u;
    if (payloadBitOffset + dataBitLength > totalBits)
    {
        trace_stage("fail_payload_bits_bounds");
        return 0;
    }

    if (payloadOffsetBytes + payloadBytes > length)
    {
        trace_stage("fail_payload_bounds");
        return 0;
    }

    *out_payload_offset = payloadOffsetBytes;
    if (out_payload_offset_bits) *out_payload_offset_bits = static_cast<uint32_t>(payloadBitOffset);
    *out_payload_length = payloadBytes;
    if (out_payload_bits) *out_payload_bits = static_cast<uint32_t>(dataBitLength);
    trace_stage("ok");
    return 1;
}

RAK_FFI_API int32_t rak_parse_reliable_payload(const uint8_t* data, uint32_t length,
                                               uint32_t* out_payload_offset,
                                               uint32_t* out_payload_length,
                                               uint32_t* out_payload_bits,
                                               uint8_t* out_reliability)
{
    return rak_parse_reliable_payload_common(data,
                                             length,
                                             out_payload_offset,
                                             nullptr,
                                             out_payload_length,
                                             out_payload_bits,
                                             out_reliability);
}

RAK_FFI_API int32_t rak_parse_reliable_payload_bits(const uint8_t* data, uint32_t length,
                                                    uint32_t* out_payload_offset,
                                                    uint32_t* out_payload_offset_bits,
                                                    uint32_t* out_payload_length,
                                                    uint32_t* out_payload_bits,
                                                    uint8_t* out_reliability)
{
    return rak_parse_reliable_payload_common(data,
                                             length,
                                             out_payload_offset,
                                             out_payload_offset_bits,
                                             out_payload_length,
                                             out_payload_bits,
                                             out_reliability);
}

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

// Debug version that returns detailed error code
// Returns:
//   0 = success
//   1 = null output buffer
//   2 = null bitstream
//   3 = max_chars is 0
//   4 = language_id not found in huffman trees
//   5 = failed to read stringBitLength (ReadCompressed failed)
//   6 = not enough bits remaining in stream
//   7 = decode succeeded
RAK_FFI_API int32_t rak_string_compressor_decode_debug(char* output, uint32_t max_chars,
                                                        RakBitStreamHandle bs, uint8_t language_id,
                                                        uint32_t* out_bit_length, uint32_t* out_unread_bits) {
    if (!output) return 1;
    if (!bs) return 2;
    if (max_chars == 0) return 3;
    
    BitStream* stream = static_cast<BitStream*>(bs);
    StringCompressor* sc = StringCompressor::Instance();
    if (!sc) return 4;
    
    // Manually replicate DecodeString logic to get detailed error info
    output[0] = 0;
    
    unsigned int stringBitLength;
    if (stream->ReadCompressed(stringBitLength) == false) {
        if (out_bit_length) *out_bit_length = 0;
        if (out_unread_bits) *out_unread_bits = stream->GetNumberOfUnreadBits();
        return 5;
    }
    
    if (out_bit_length) *out_bit_length = stringBitLength;
    if (out_unread_bits) *out_unread_bits = stream->GetNumberOfUnreadBits();
    
    if ((unsigned)stream->GetNumberOfUnreadBits() < stringBitLength) {
        return 6;
    }
    
    // If we got here, the standard decode should work
    // Reset read position and call the real function
    // Actually, we can't easily reset - so just return success indicator
    // The caller should re-create the stream and call the real decode
    return 0; // Would succeed if called
}
