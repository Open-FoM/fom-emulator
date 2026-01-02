# CUDPDriver Class

## Overview

Low-level UDP driver handling packet transmission, reliability, and flow control.

## RTTI

Part of LithTech engine networking layer.

## Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| DEFAULT_PORT | 0x6CF0 (27888) | Default server port |
| CONNECTION_MAGIC | 0x9919D9C7 | Connection handshake magic |
| SEQUENCE_MASK | 0x1FFF | 13-bit sequence numbers |
| MAX_OUT_OF_ORDER | 8 | Out-of-order packet buffer size |
| CONNECTION_TIMEOUT | 10000 | Timeout in ms |
| RETRY_INTERVAL | 300 | Retry interval in ms |

## Key Members (Estimated)

| Offset | Type | Name | Description |
|--------|------|------|-------------|
| 0x1B | sockaddr_in | localAddr | Local socket address |
| 0x71 | SOCKET | socket | UDP socket handle |
| 0x79 | bool | isHost | Hosting flag |
| 0x7B | void* | sessionData | Session data pointer |
| 0x7C | bool | connected | Connection status |
| 0x84 | CriticalSection | lock | Thread synchronization |
| 0xC8 | uint32_t | currentSeq | Current sequence number |
| 0xD0 | bool | seqValid | Sequence validity flag |

## Key Methods

### CUDPDriver_JoinSession (0x004B67B0)

```c
void JoinSession(bool param, SystemAddress* serverAddr);
```

**Connection Handshake:**
1. Build connection request packet:
   - Magic: `0x9919D9C7` (32 bits)
   - Type: `2` (3 bits)
   - GUID: 128 bits
   - Additional data
2. Send to server address
3. Wait for response (up to 10 seconds)
4. Verify acceptance packet
5. Create connection object

**Response Codes:**
- Accept: Connection successful
- Reject (LT_REJECTED): Server refused
- GUID mismatch (LT_NOTSAMEGUID): Wrong game version

### CUDPDriver_HostSession (0x004B7310)

```c
void HostSession(SessionInfo* info);
```

- Binds to specified port (default 27888)
- Creates listen thread
- Accepts incoming connections
- Logs: `"UDP: Hosting on %d.%d.%d.%d:%d"`

### CUDPDriver_HandleGuaranteedPacket (0x004B2DB0)

```c
void HandleGuaranteedPacket(Connection* conn, Packet* packet, bool flag);
```

**Guaranteed Delivery Logic:**
1. Read 13-bit sequence number
2. Check if expected sequence (currentSeq + 1)
3. If in order: process immediately
4. If out of order: buffer (up to 8 packets)
5. Send ACK/NAK as needed
6. Handle packet reassembly

**Debug output:**
```
"UDP: Received guaranteed packet (%d/%d) %d sub %s %s"
```

### CUDPDriver_SendUnguaranteed (0x004AF640)

```c
void SendUnguaranteed(Connection* conn, Message* msg);
```

- Flow control check
- Build packet with header
- Send without reliability
- Debug: `"UDP: Sending unguaranteed (%d packets, %d)"`

## Packet Header Format

### Connection Request
```
┌─────────────────┬─────────┬──────────────┬─────────────┐
│ Magic (32 bits) │ Type(3) │ GUID (128)   │ Data...     │
│ 0x9919D9C7      │ 2       │              │             │
└─────────────────┴─────────┴──────────────┴─────────────┘
```

### Guaranteed Packet
```
┌─────────────────┬───────────────┬─────────────────────┐
│ Flags (8 bits)  │ Seq (13 bits) │ Payload...          │
└─────────────────┴───────────────┴─────────────────────┘
```

## Flow Control

- Tracks bytes in flight
- Adjusts send rate based on loss
- Pauses guaranteed messages when congested
- Debug: `"UDP: Flow control blocked (%d/%d of %d, %d)"`

## Debug Strings

```c
"UDP: Sending conn request to %d.%d.%d.%d:%d"
"UDP: Connection to %d.%d.%d.%d:%d accepted"
"UDP: Hosting on %d.%d.%d.%d:%d"
"UDP: Received guaranteed packet (%d/%d) %d sub %s %s"
"UDP: Sending unguaranteed (%d packets, %d)"
"UDP: Sending heartbeat %d %s"
"UDP: Ping update %3.2f (%d)"
"UDP: Sending disconnect"
```

---

*Last updated: December 27, 2025*
