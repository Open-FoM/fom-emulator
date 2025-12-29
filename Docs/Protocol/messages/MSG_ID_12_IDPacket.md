# Message ID 12 - ID Packet

## Overview

Client/connection identification packet. Assigns a client ID to the connection.

## Message ID

- LithTech ID: `12` (0x0C)
- Handler Table Offset: `0x30` from `0x006FAB50`

## Handler Function

- Address: `0x0049E690`
- Name: `LithTech_HandleIDPacket` (suggested)

## Structure

```c
struct MSG_IDPacket {
    uint16_t client_id;     // 16 bits - Assigned client ID
    uint8_t  flags;         // 8 bits - Boolean flag
};
```

## Fields

| Field | Bits | Type | Description |
|-------|------|------|-------------|
| client_id | 16 | uint16_t | Unique client identifier |
| flags | 8 | bool | Unknown flag (stored as bool) |

## Handler Decompiled

```c
// FUN_0049e690
int HandleIDPacket(int clientState) {
    uint16_t clientId = CLTMessage_ReadBits(16);
    bool flag = CLTMessage_ReadBits(8) != 0;
    
    // Store in client state
    *(uint16_t*)(clientState + 0x38) = clientId;
    *(bool*)(clientState + 0x3A) = flag;
    
    // Debug log
    Log(0xff6464fa, 1, "Got ID packet (%d)", clientId);
    
    return 0; // Success
}
```

## Usage

- Sent by server after connection established
- Client stores ID for future communication
- ID used in subsequent packets to identify sender

## Debug Output

```
"Got ID packet (%d)"
```

## Notes

- One of the first messages sent after connection
- Client ID is 16-bit (max 65535 clients)
- The flag purpose is unknown - possibly admin/special status

---

*Last updated: December 27, 2025*
