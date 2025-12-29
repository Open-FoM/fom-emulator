# Packet_ID_LOGIN_REQUEST_RETURN

## Overview

Login response packet sent from master server to client after login attempt.

## Packet ID

- RakNet ID: `0x6D` (109)
- Direction: Master Server → Client

## RTTI Class

```
.?AVPacket_ID_LOGIN_REQUEST_RETURN@@
```

Address in .rdata: `0x006E3E38`

## Structure

```c
struct Packet_ID_LOGIN_REQUEST_RETURN : VariableSizedPacket {
    uint8_t  packet_id;         // 0x6D
    uint8_t  success;           // 0x00 = fail, 0x01 = success
    char     session_data[...]; // Variable - world/session info on success
    // Additional fields populated on success
};
```

## Fields

| Field | Type | Size | Description |
|-------|------|------|-------------|
| packet_id | uint8_t | 1 | Always 0x6D (109) |
| success | uint8_t | 1 | Login result: 0=fail, 1=success |
| session_data | char[] | Variable | Session info (on success) |

## Handler Function

- Address: `0x004DF570`
- Name: `ClientNetworking_HandleLoginResponse`

## Handler Logic (Decompiled)

```c
// Simplified from FUN_004df570
void ClientNetworking_HandleLoginResponse(int param_1) {
    Packet_ID_LOGIN_REQUEST_RETURN packet;
    packet.packet_id = 0x6D;
    
    if (Deserialize(&packet) && packet.success == 0x01) {
        // Success path - extract world server info
        // Connect to world server
        // Store session data
    } else {
        // Failure - log error
        Log("ClientNetworking::HandleLoginRequestReturn: Line {0}");
    }
}
```

## Success Response Contains

On successful login (success = 0x01):
- World server IP/port
- Session token
- Character data (TBD)

## Failure Codes

| Code | Meaning |
|------|---------|
| 0x00 | Generic failure |
| TBD | Other codes need investigation |

## Related Packets

- Request: `Packet_ID_LOGIN_REQUEST`
- Next: RakNet connection to World Server

## Notes

- Handled in switch case 'm' (0x6D) in `CNetworkManager_HandleRakNetMessage`
- On success, client proceeds to connect to world server with password `37eG87Ph`

---

*Last updated: December 27, 2025*
