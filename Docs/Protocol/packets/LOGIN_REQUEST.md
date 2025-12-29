# Packet_ID_LOGIN_REQUEST

## Overview

Login request packet sent from client to master server during authentication.

## Packet ID

- RakNet ID: Custom (part of game layer)
- Direction: Client → Master Server

## RTTI Class

```
.?AVPacket_ID_LOGIN_REQUEST@@
```

Address in .rdata: `0x006E3E10`

## Structure

```c
struct Packet_ID_LOGIN_REQUEST {
    uint8_t  packet_id;         // Packet type identifier
    char     username[64];      // Account username (null-terminated)
    char     password[64];      // Account password (possibly hashed)
    uint32_t client_version;    // Client version number (TBD)
    // Additional fields TBD - needs more RE
};
```

## Fields

| Field | Type | Size | Description |
|-------|------|------|-------------|
| packet_id | uint8_t | 1 | Packet type identifier |
| username | char[] | 64 | Account username |
| password | char[] | 64 | Account password |
| client_version | uint32_t | 4 | Client version (TBD) |

## Related Functions

- Handler: TBD (server-side)
- Sender: Part of login flow after `ID_CONNECTION_REQUEST_ACCEPTED`

## Notes

- Sent after successful RakNet connection to master server
- RSA encryption may be applied to sensitive fields
- Response is `Packet_ID_LOGIN_REQUEST_RETURN` (0x6D)

## TODO

- [ ] Determine exact field layout via packet capture or deeper RE
- [ ] Identify if password is hashed client-side
- [ ] Find the sending function in client

---

*Last updated: December 27, 2025*
