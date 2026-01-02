# Bit Order (RakNet vs LithTech)

## Summary

- **RakNet BitStream** uses **MSB-first** within each byte.
- **LithTech bitstream** uses **LSB-first** within each byte.

These are *not* compatible; LithTech payloads must be repacked before parsing with RakNet-style readers.

## RakNet (MSB-first)

Evidence:
- `BitStream` in `ServerEmulator/src/raknet-js/structures/BitStream.ts` reads bits by masking `0x80 >> bitIndex`.
- Client disasm (`sub_F62890`) shifts 0x80 for bit reads (MSB-first).

Implication:
- Any RakNet packet parse assumes MSB-first ordering.

## LithTech (LSB-first)

Evidence:
- `BitStreamReader` in `ServerEmulator/src/protocol/BitStream.ts` shifts out bits from least-significant positions.
- Client CLTMessage_ReadBits (`0x0047C7F0`) is LSB-first.

Implication:
- LithTech guaranteed sub-messages are LSB-packed and must be parsed with LithTech reader.
- If you want to scan LithTech payload for RakNet IDs (0x6B/0x6C/0x6D), **repack** LSB bits into MSB order first.

## Observed Alignment (Login Packets)

- Login reliable payloads show **0x6C at inner byte offset 5**.
- LithTech guaranteed sub-message alignment that yields coherent IDs is **startBit=22 (LSB)**.

---

*Last updated: December 30, 2025*
