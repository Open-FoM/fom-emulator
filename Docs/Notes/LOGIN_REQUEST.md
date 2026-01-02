# Packet_ID_LOGIN_REQUEST (0x6B)

## Overview

Login request sent **client -> master** when the user presses Login.

> Note: current client exe also emits a **0x6C** login request (text/token form). See `Docs/Notes/LOGIN_REQUEST_6C.md`. This file documents the **0x6B** RSA‑blob variant; treat them as distinct until reconciled.

## Packet ID

- RakNet ID: `0x6B` (107)
- Direction: Client -> Master Server

## RTTI / Class (CShell)

```
Packet_Id107 (inferred)
```

Init sets id=107 at `CShell.dll` `0x1000C7E0`.

## Structure (Exact Wire Layout)

Bit order: **MSB-first** within each byte (RakNet BitStream).

```
[optional timestamp header][packet_id][payload]

optional timestamp header:
  [0x19][u64 timestamp]    // RakNet ID_TIMESTAMP, if present

payload for 0x6B:
  [field0:u16c]
  [bit][field1:u32c_alt]
  [bit][field2:u32c_alt]
  [bit][field3:u32c]
  [bit][field4:u32c]
  [blobA:2048 bits]
  [blobB:2048 bits]
  if field0 == 0x145:
    [blockC0]  // see below
```

Legend:
- `u16c/u32c` = RakNet compressed unsigned int (WriteBitsCompressed/ReadBitsCompressed).
- `u32c_alt` = alternate compressed u32 path (Read_u32c_alt).
- `bit` = single presence bit (0=absent, 1=present).
- `blobA/blobB` = 2048-bit (256-byte) opaque blocks.

## blockC0 (field0 == 0x145)

```
[u32c]
repeat 10 entries:
  [present_bit]
  if present_bit:
    [u16c]
    [u8c]
    [u8c]
    [7 bits]
    [7 bits]
    [9 bits]
    [u8c]
    [u8c]
    [u8c]
```

Presence bit is only set when entry bytes at offsets +4 and +5 are both non-zero.

## Encode/Decode Paths (CShell IDB)

- Serialize: `Packet_Id107_Serialize` @ `0x1000D9D0`
- Deserialize: `Packet_Id107_Read` @ `0x1000D8B0`
- Header write: `Packet_WriteHeader` @ `0x1000C770`
- Init (sets id=107): `Packet_Id107_Init` @ `0x1000C7E0`

Helpers:
- `BitStream_Write2048` @ `0x1000C870`
- `BitStream_Read2048` @ `0x1000C8A5`
- `blockC0 write` @ `0x1000D800`
- `Playerfile_BlockC0_WriteEntry` @ `0x1000D650`
- `Playerfile_read_blockC0` @ `0x1000D870`
- `Playerfile_read_blockC0_entry` @ `0x1000D730`

## Notes

- Header is optional: if the first byte is `0x19`, a u64 timestamp is read before packet_id.
- The two 2048-bit blobs are written via `g_LTClient` vtbl+0x34/0x38; treat as opaque until we map contents.
- Presence bits gate the optional u32s. If absent, the client zeroes the field.
- RSA public key is loaded from `FoTD\fom_public.key` (68 bytes: e + 64-byte modulus). Key rotation details in `Docs\Notes\ClientNetworking.md` (private key stored at `ServerEmulator\fom_private_key.env`).

---

*Last updated: December 30, 2025*
