# Packet_ID_LOGIN_REQUEST (0x6C)

## Overview

Login request sent **client -> master** when the user presses Login (text/token form).

This is **Packet_ID_LOGIN_REQUEST** in the client executable. It carries a Huffman-compressed string (username) plus a 16-bit token.

## Packet ID

- RakNet ID: `0x6C` (108)
- Direction: Client -> Master Server

## RTTI / Class

```
.?AVPacket_ID_LOGIN_REQUEST@@
```

## Structure (Exact Wire Layout)

Bit order: **MSB-first** within each byte (RakNet BitStream).

```
[optional timestamp header][packet_id][payload]

optional timestamp header:
  [0x19][u64 timestamp]    // RakNet ID_TIMESTAMP if enabled on packet

payload for 0x6C:
  [bit:preFlag]            // observed 0 (alignment/flags)
  [strA:huffman(<=2048)]   // username text (Huffman string; raw u32 bit-count)
  [bit:postFlag]           // observed 0 (alignment/flags)
  [u16]                    // token/field at +0x470 (after postFlag)
```

Legend:
- `huffman(<=2048)` = RakNet StringCompressor, max 2048 bytes. Length is a **raw u32 bit-count (big-endian)** followed by Huffman bits.
- `u16` = 16 bits written via bitstream (WriteBits 16, MSB-first).
- `preFlag/postFlag` = single bits observed in live traffic; both are `0` in current captures. These shift the Huffman length and token by 1 bit if not consumed.

## Encode/Decode Paths (FoM client exe, base 0x00E80000)

- Constructor: `Packet_ID_LOGIN_REQUEST::ctor` @ `0x00F19730`
  - Sets packet id byte to `0x6C` at `this+0x428` (offset 1064).
- Header write: `sub_F1A7F0` @ `0x00F1A7F0`
  - If `this+8 == 0x19`, writes `0x19` + u64 timestamp.
  - Writes packet id byte (`0x6C`) to bitstream.
- Serialize: `sub_F1B720` @ `0x00F1B720`
  - Writes Huffman string from `this+0x430` (offset 1072), max 2048.
  - Writes u16 token from `this+0x470` (offset 1136) via `sub_F1B3A0`.
- Token write: `sub_F1B3A0` @ `0x00F1B3A0`
  - Writes 16 bits (u16) via bitstream.
- String length write: `sub_F1A420` @ `0x00F1A420`
  - Writes raw u32 bit-count (big-endian) for StringCompressor output.

Caller:
- `LoginButton_OnClick` @ `0x00F1D090` builds packet + calls `SendPacket_LogMasterWorld`.

## Notes

- HookInjector reads the same fields:
  - username at `+0x430`
  - token at `+0x470`
- On wire this packet is typically **embedded inside a reliable (0x40) frame** and may sit inside a higher-level container; `0x6C` is not always at byte 0 of the reliable payload.
- If the timestamp header is enabled, the first byte will be `0x19` before `0x6C`.
- Observed login reliable packets have 0x6C at **inner byte offset 5**; LithTech guaranteed scan alignment that yields coherent IDs is **startBit=22 (LSB)**.
- Observed raw length bytes on wire appear as `00 00 00 5C` because the **preFlag bit** is written before the u32 bit-count (`0xB8`), shifting it right by 1.

---

*Last updated: December 30, 2025*
