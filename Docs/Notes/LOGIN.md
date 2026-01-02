# Packet_ID_LOGIN (0x6E)

## Overview

World-auth packet sent **client → world server** after a successful 0x6D response.

## Packet ID

- RakNet ID: `0x6E` (110)
- Direction: Client → World Server

## RTTI Class

```
.?AVPacket_ID_LOGIN@@
```

Address in .rdata: `0x006E3E68` (FoM build)

## Structure (Exact Wire Layout)

Bit order: **MSB-first** within each byte (RakNet BitStream).

```
[optional timestamp header][packet_id][payload]

optional timestamp header:
  [0x19][u64 timestamp]

payload for 0x6E:
  [strA:huffman(<=2048)]
  [strB:lenbits(max=64) + raw bytes]
  [u32 x3]
  [strC:huffman(<=2048)]
  repeat 4x:
    [strD:lenbits(max=64) + raw bytes]
    [strE:lenbits(max=32) + raw bytes]
  [strF:lenbits(max=64) + raw bytes]
  [strG:huffman(<=2048)]
  [flag:1 bit]
  if flag:
    [0x400 bytes: u8c each]
    [u32c]
```

Legend:
- `u8c`/`u32c` = RakNet compressed unsigned int.
- `lenbits(max=N)` = length encoded in `ceil(log2(N))+1` bits, then **raw bytes** (not null-terminated).
- `huffman(<=2048)` = RakNet StringCompressor Huffman string, max 2048 bytes. Length is a **raw u32 bit-count (big-endian)**.

## Encode/Decode Paths (Client IDB)

- Deserialize: `sub_F1C3B0` @ `0xF1C3B0`
- Serialize: `sub_F1B820` @ `0xF1B820`

Helpers:
- `str huffman (read)` = `sub_F63B30` @ `0xF63B30`
- `str huffman (write)` = `sub_F63A10` @ `0xF63A10`
- `str huffman len (write raw u32)` = `sub_F1A420` @ `0xF1A420`
- `str huffman len (read raw u32)` = `sub_F1C280` @ `0xF1C280`
- `lenbits string read` = `sub_F1C2E0` @ `0xF1C2E0`
- `lenbits string write` = `sub_F1A860` @ `0xF1A860`
- `u32[3] block read` = `sub_FE49D0` @ `0xFE49D0`
- `u32[3] block write` = `sub_FE4950` @ `0xFE4950`

## Notes

- Header is optional: if the first byte is `0x19`, a u64 timestamp is read before packet_id.
- This packet is built from `ClientNetworking.sessionData` (session string from 0x6D) plus local machine/user fields.
- Required by world server auth. If not parsed/accepted, the client drops the world connection.

---

*Last updated: December 30, 2025*
