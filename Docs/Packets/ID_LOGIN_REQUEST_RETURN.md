# ID_LOGIN_REQUEST_RETURN (0x6D)

## Summary
- Direction: master -> client
- Purpose: status + username echo for login request

## On-wire encoding (source of truth)
```
ID_LOGIN_REQUEST_RETURN (0x6D)
u8   msgId           = 0x6D
u8   status          = BitStream_WriteByteArrayCompressed (bitLength=8)
u32  huffmanBitCount = BitStream_WriteCompressed_U32 (byte-array compressed)
bits huffmanBits     = Huffman(username), bit-aligned, length = bitCount
```
Key points:
- The client write path uses `BitStream_WriteByteArrayCompressed` for `status`.
- CShell read path uses `RakNet::BitStream::ReadCompressed` for 8 bits (matches 8-bit value but naming differs).

## Field Table
| Offset | Field | Type | Encoding | Notes |
|---|---|---|---|---|
| 0x00 | msgId | u8 | raw | 0x6D |
| 0x01 | status | u8 | LT BitStream byte-array compressed | See note above |
| 0x.. | huffmanBitCount | u32 | LT BitStream compressed | |
| 0x.. | huffmanBits | bits | Huffman | Bit-aligned |

## Read/Write (decomp)
- Write: `fom_client.exe` @ `0x0049B7C0` (WriteByteArrayCompressed + Huffman_WriteString)
- Read: `CShell.dll` @ `0x6588DCE0` (ReadCompressed(8) + LTClient DecodeString)

## IDA Anchors
- ida: `Packet_ID_LOGIN_REQUEST_RETURN_Write` `0x0049B7C0`
- ida2: `Packet_ID_LOGIN_REQUEST_RETURN_Read` `0x6588DCE0` (base-adjusted)

## Validation
- ida: verified 01/05/26 (decompile)
- ida2: verified 01/05/26 (decompile)

## Notes / Edge Cases
- Mixed naming (`WriteByteArrayCompressed` vs `ReadCompressed`) suggests a thin wrapper; keep server encoding aligned to client write path.

## Status Enum
| Name | Value |
|---|---|
| LOGIN_REQUEST_RETURN_INVALID_INFO | 0 |
| LOGIN_REQUEST_RETURN_SUCCESS | 1 |
| LOGIN_REQUEST_RETURN_OUTDATED_CLIENT | 2 |
| LOGIN_REQUEST_RETURN_ALREADY_LOGGED_IN | 3 |
