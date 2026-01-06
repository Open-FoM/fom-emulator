# ID_LOGIN (0x6E)

## Summary
- Direction: client -> master
- Purpose: auth payload following 0x6D (session hash + client fingerprints)

## On-wire encoding (source of truth)
```
ID_LOGIN (0x6E)
u8   msgId           = 0x6E
Huff username        = Huffman_WriteString
str  sessionHashHex  = BitStream_WriteBoundedString (max 64)
u32c clientInfoU32[3]= BitStream_WriteU32Array3
Huff macAddress      = Huffman_WriteString
4x (str 64, str 32)  = drive model + serial (bounded)
str  loginToken      = BitStream_WriteBoundedString (max 64)
Huff computerName    = Huffman_WriteString
bit  hasSteamTicket
if hasSteamTicket:
  0x400 bytes steamTicket (each byte compressed)
  u32 steamTicketLength (compressed, endian-swapped if needed)
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| username | char[64] | Huffman | LT Huffman path |
| sessionHashHex | char[64] | bounded string | From 0x6D session data |
| clientInfoU32[3] | u32[3] | compressed | Vector written by `BitStream_WriteU32Array3` |
| macAddress | char[32] | Huffman | |
| driveModels[4] | char[64] | bounded string | |
| driveSerials[4] | char[32] | bounded string | |
| loginToken | char[64] | bounded string | |
| computerName | char[32] | Huffman | |
| hasSteamTicket | bit | raw | |
| steamTicket | u8[1024] | compressed bytes | if flag set |
| steamTicketLength | u32 | compressed | if flag set |

## Read/Write (decomp)
- Write: `fom_client.exe` @ `0x0049B820` (Huffman + bounded strings + steam ticket)

## IDA Anchors
- ida: `Packet_ID_LOGIN_Write` `0x0049B820`
- ida2: n/a

## Validation
- ida: verified 01/05/26 (decompile)
- ida2: n/a

## Notes / Edge Cases
- This packet uses Huffman strings (not RakNet StringCompressor) for `username` and `computerName`.
- Steam ticket length is endian-swapped if platform endian requires it.
