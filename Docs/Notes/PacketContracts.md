# Packet Contracts & Encoder Detection

This doc defines a repeatable workflow to determine **bit order** and **encoder** for FoM packets before we send them.

## Why this exists

The client will crash if we pick the wrong encoder (e.g., `WriteCompressed` vs raw u32 bit length). We must lock the
packet contract up-front using IDA + RakNet/LithTech source and enforce invariants during decoding.

## Packet Contract Template

```
Packet ID: 0x??
Direction: client → server | server → client
Bit order: MSB (RakNet BitStream) | LSB (LithTech BitStream)
Wrapper: raw | reliable | LithTech guaranteed (inner)

Field map:
  - field_name: type, size, encoder/decoder
  - ...

Encoder markers:
  - WriteCompressed / ReadCompressed
  - StringCompressor::EncodeString / DecodeString
  - raw u32 bitcount (BE)
  - WriteBits / ReadBits

Max sizes & invariants:
  - buffer limits (e.g., char[64])
  - expected flags (0/1)
  - valid ranges (ports, tokens)
```

## Detection Workflow (repeatable)

1) **Find the serializer/handler in IDA**
   - Follow calls to `RakNet::BitStream::*` and `StringCompressor::*`.
   - Record every encoder used per field.

2) **Confirm bit order**
   - RakNet BitStream = **MSB-first** per byte.
   - LithTech payloads are **LSB-first**; repack to MSB before Rak decode.

3) **Match encoder to field**
   - `WriteCompressed` ↔ `ReadCompressed`
   - `StringCompressor::EncodeString` ↔ `ReadCompressed(bitLength)` + Huffman
   - `WriteBits` ↔ `ReadBits`
   - raw u32 length only if the client writes a raw u32

4) **Enforce invariants**
   - Validate length bounds and ranges.
   - Reject decodes that violate constraints (no “garbage but decodes”).

5) **Only then implement the server encoder**
   - Never guess: the encoder is defined by the client writer.

## Example: 0x6D (LOGIN_REQUEST_RETURN)

- **Bit order**: MSB (RakNet BitStream)
- **Encoder**: `StringCompressor::EncodeString` → `WriteCompressed(bitCount)`
- **Failure mode**: using raw u32 bit count corrupts length → client overreads and crashes.

## Preflight Decoder (tests)

Use the decoder harness to try:
- MSB + compressed length
- MSB + raw u32 length
- LSB + repack + compressed
- LSB + repack + raw

The correct variant must pass invariants and score highest; all others are rejected.

