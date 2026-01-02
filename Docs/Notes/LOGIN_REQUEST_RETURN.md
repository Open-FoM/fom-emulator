# Packet_ID_LOGIN_REQUEST_RETURN

## Overview

Login response packet sent from master server to client after login attempt.

## Packet ID

- RakNet ID: `0x6D` (109)
- Direction: Master Server → FoM

## RTTI Class

```
.?AVPacket_ID_LOGIN_REQUEST_RETURN@@
```

Address in .rdata: `0x006E3E38`

## Structure (Exact Wire Layout)

Bit order: **LSB-first** within each byte (RakNet BitStream).

```
[optional timestamp header][packet_id][payload]

optional timestamp header:
  [0x19][u64 timestamp]    // RakNet ID_TIMESTAMP, if present

payload for 0x6D:
  [success:u8c][session_str:compressed huffman(<=2048)]
```

Legend:
- `u8c` = RakNet compressed unsigned byte (WriteCompressed/ReadCompressed).
- `compressed huffman(<=2048)` = RakNet StringCompressor Huffman string, max 2048 bytes.
  Length is **WriteCompressed(bitCount)**, followed by Huffman bitstream (StringCompressor::EncodeString).

## Fields (Decoded)

| Field | Type | Size | Description |
|-------|------|------|-------------|
| packet_id | uint8_t | 1 | Always 0x6D (109) |
| success | u8c | compressed | 0=fail, 1=success |
| session_str | huffman | <=2048 | Session blob used for world auth (client appends to sessionData) |

## Handler Function

- Address (FoTD IDB): `0x00F1CA70`
- Name: `ClientNetworking_HandleLoginRequestReturn_6D`

## Handler Logic (Decompiled)

Behavior (FoTD IDB, `ClientNetworking_HandleLoginRequestReturn_6D` @ 0x00F1CA70):
- Deserializes 0x6D; **requires success==1** or it logs and returns.
- Appends `session_str` into `ClientNetworking.sessionData`, then builds `Packet_ID_LOGIN` (0x6E) for world auth.

## Success Response Contains

On success (success == 1), the client **only requires**:
- `session_str` (Huffman string) for later world auth.

World IP/port are not parsed from 0x6D here; they are resolved earlier in the login flow.

## Failure Codes

| Code | Meaning |
|------|---------|
| 0x00 | Generic failure |
| TBD | Other codes need investigation |

## Related Packets

- Request: `Packet_ID_LOGIN_REQUEST`
- Next: RakNet connection to World Server

## Notes

- Header is optional: if the first byte is `0x19`, a u64 timestamp is read before packet_id.
- LSB-first bit order (RakNet BitStream).
- String compressor uses RakNet Huffman tables (External/RakNet3.5).
- StringCompressor length is **WriteCompressed(bitCount)** (see RakNet `StringCompressor::EncodeString` / `DecodeString`).
- ServerEmulator: set `LOGIN_RESPONSE_TIMESTAMP=1` to include the optional `0x19` timestamp header.

---

*Last updated: December 30, 2025*
