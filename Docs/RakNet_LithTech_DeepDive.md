# RakNet and LithTech Deep Dive (FoM context)

## Scope
This document captures how RakNet and LithTech handle session keys, encryption/decryption, and bitstreams, with FoM-specific anchors. The goal is to reliably reach plaintext payloads for packet analysis.

## Stack overview
There are two plausible stacks in FoM. Use this to determine which parser/decryptor to apply.

1) RakNet stack (client networking)
   - UDP -> RakNet reliability layer -> DataBlockEncryptor (AES) -> RakNet BitStream -> game message parser
2) LithTech CUDPDriver stack (engine native)
   - UDP -> CUDPConn (CRC32 fingerprint) -> CPacket (bit packing) -> ILTMessage_Read/Write

FoM evidence indicates RakNet is used for client networking (see ClientNetworking_Init), while LithTech CUDPDriver is still present in the engine codebase.

## How to decide which stack you are seeing
- RakNet signals:
  - First byte is a RakNet MessageID (see External/RakNet3.5/Source/MessageIdentifiers.h)
  - Secure connection IDs: 0x04/0x05 (ID_SECURED_CONNECTION_CONFIRMATION / ID_SECURED_CONNECTION_RESPONSE)
  - Reliability layer framing and AES block alignment (length mod 16 == 0 when encrypted)

- LithTech CUDPDriver signals:
  - Packet starts with an 8-bit fingerprint (CRC32-derived) followed by packed payload
  - Internal UDP command bits and size indicators (see udpdriver.cpp)
  - No AES path in the engine UDP driver

## RakNet 3.5 security and session key flow
Key sources:
- External/RakNet3.5/Source/RakPeer.cpp
- External/RakNet3.5/Source/RakPeer.h
- External/RakNet3.5/Source/DataBlockEncryptor.cpp
- External/RakNet3.5/Source/RSACrypt.h

### Handshake message flow
1) FoM sends ID_CONNECTION_REQUEST (unencrypted)
2) Server replies with ID_SECURED_CONNECTION_RESPONSE
   - Layout: [ID][20-byte syn-cookie][RSA public key: e (4 bytes) + n (RSA_BIT_SIZE)]
   - syn-cookie = SHA1(source_ip + source_port + server_random[20])
3) FoM verifies cookie, creates random[20], RSA-encrypts it using server public key
4) FoM replies with ID_SECURED_CONNECTION_CONFIRMATION
   - Layout: [ID][20-byte syn-cookie][RSA(random)]
5) Both sides derive AES session key:
   - AESKey[i] = syn_cookie[i] XOR random[i] for i in 0..15

### When encryption actually turns on
- RakNet delays encryption until it sees a 16-byte-aligned packet that decrypts correctly.
- `remoteSystem->connectMode` is set to SET_ENCRYPTION_ON_MULTIPLE_16_BYTE_PACKET.
- On first valid 16-byte packet, DataBlockEncryptor::Decrypt passes and RakPeer sets ReliabilityLayer::SetEncryptionKey.

### FoM-specific anchors (client)
From AddressMap.md:
- 0x004F1610 HandleSecureConnResponse_SetSessionKey: writes 16-byte session key at peer+0x1408, sets flag at peer+0x1418
- 0x004EF8E0 HandleSecureConnConfirm
- 0x004EFC10 PeerSetSecurityFlag: sets peer+0x1418 and connectMode=7 (SET_ENCRYPTION_ON_MULTIPLE_16_BYTE_PACKET)
- 0x004F4520 RakPeer_RecvDispatch: reads peer+0x1418 to gate encrypted path
- 0x004113C0 ReliabilityLayer_SetEncryptionKey (IDA: RakNet_SetEncryptionKey)
- 0x0041EFA0 DataBlockEncryptor_SetKey (IDA: RakNet_AESWrapper)
- 0x0041F000 DataBlockEncryptor_UnsetKey
- 0x00411370 RakPeer_GenerateSYNCookieRandomNumber (syn-cookie RNG refresh)
- 0x00499960 ClientNetworking_Init: loads fom_public.key (exp=0x00010001 + 64-byte modulus), creates RakPeer instances
Offsets (RemoteSystemStruct, FoM): AESKey +0x1408, security flag +0x1418, connectMode +0x144C.

## DataBlockEncryptor (RakNet AES path)
Key source: External/RakNet3.5/Source/DataBlockEncryptor.cpp

### Plaintext layout before encryption
The encryptor expands the plaintext and then encrypts in-place.

Layout (before AES):
- [0..3]  checksum (32-bit, CheckSum)
- [4]     randomChar (1 byte)
- [5]     encodedPad (high nibble random, low nibble = pad length)
- [6..]   padding bytes (random)
- [..]    original payload

Padding length is chosen so total size is multiple of 16.

### AES mode (not standard CBC)
- AES-128 ECB is used, but with a custom reverse chaining scheme.
- Encryption steps (simplified):
  1) Encrypt block 0 (bytes 0..15).
  2) For each block from end -> block 1:
     - XOR block[i] with previous encrypted block (starting with block 0)
     - AES encrypt block[i]

### Decryption steps (simplified)
- Decrypt block[1..n] forward, then XOR with the next ciphertext block (or block 0 for the last block).
- Decrypt block 0 last.
- Validate checksum; if it fails, the decrypt is rejected.

### CheckSum behavior
- CheckSum is not CRC; it is a rolling additive cipher (External/RakNet3.5/Source/CheckSum.cpp).
- If checksum fails, the packet is treated as modified or corrupt.

## RakNet reliability layer and plaintext taps
Key source: External/RakNet3.5/Source/ReliabilityLayer.cpp

Receive path:
- ReliabilityLayer::HandleSocketReceiveFromConnectedPlayer
  - If encryptor key is set, decrypts buffer in-place
  - Builds BitStream over plaintext buffer and parses ACKs and payload

Send path:
- ReliabilityLayer::SendBitStream
  - Encrypts BitStream payload before UDP send

Best plaintext tap points:
1) After `encryptor.Decrypt` in HandleSocketReceiveFromConnectedPlayer
2) Before `encryptor.Encrypt` in SendBitStream
3) When SetEncryptionKey is called to record AES key

## RakNet BitStream details
Key source: External/RakNet3.5/Source/BitStream.cpp

- Bit order: WriteBits/ReadBits are bit-level and NOT byte-aligned by default.
- Right-aligned bits: if `rightAlignedBits` is true for partial bytes, the bits are aligned from the right (bit 0), otherwise aligned to the left.
- Alignment helpers:
  - AlignWriteToByteBoundary
  - AlignReadToByteBoundary
- Compressed integers:
  - WriteCompressed/ReadCompressed emits 1-bit prefixes for leading 0x00 or 0xFF bytes.
  - Final byte may use only 4 bits if high nibble is 0x0 (unsigned) or 0xF (signed).

## LithTech message and packet bitstreams
Key sources:
- External/LithTech/engine/runtime/kernel/net/src/packet.h
- External/LithTech/engine/runtime/kernel/net/src/packet.cpp
- External/LithTech/engine/runtime/shared/src/ltmessage.h
- External/LithTech/engine/runtime/shared/src/ltmessage.cpp

### CPacket bit packing
- CPacket_Write packs bits LSB-first into 32-bit chunks (m_nBitAccumulator).
- CPacket_Read mirrors this and tracks offsets in bits.
- This is the canonical bit order when decoding LithTech messages.

### ILTMessage wrappers
- ILTMessage_Write/Read wrap CPacket to provide typed reads/writes.
- WriteMessage prepends a uint16 bit-length, then raw bit payload.
- Strings are zero-terminated (WriteString), HString uses uint16 length or 0xFFFF for null.

### Compressed types
Key sources: External/LithTech/engine/runtime/shared/src/compress.cpp
- CompVector: 9 bytes (fA + packed B/C + order/sign bits)
- CompRot: 3 or 6 bytes depending on sign (see WriteCompLTRotation in ltmessage.cpp)
- CompWorldPos: 3x uint16 plus optional extra byte (POSITION_EXTRA_BYTE)

World positions depend on world bounds:
- Client/Server versions call IWorldClientBSP::EncodeCompressWorldPosition / DecodeCompressWorldPosition
- Without world bounds, CompWorldPos cannot be decoded correctly

## LithTech UDP driver (CUDPDriver)
Key sources:
- External/LithTech/engine/runtime/kernel/net/src/sys/win/udpdriver.cpp
- External/LithTech/engine/runtime/kernel/net/src/sys/win/udpdriver.h

### Fingerprint (integrity only)
- An 8-bit fingerprint is written at the front of each UDP packet:
  - Fingerprint = fold of CRC32 over packet contents
- On receive, the fingerprint is verified before any parsing.
- This is not encryption; it is integrity only.

### Size indicators and internal commands
- Variable-length size indicators in WriteSizeIndicator/ReadSizeIndicator
- Internal UDP commands (heartbeat, disconnect) are bit-packed into the stream

## FoM-specific deobfuscation playbook
Goal: retrieve plaintext bitstream for game message parsing.

### Receive pipeline
1) Identify stack (RakNet vs CUDPDriver)
2) If RakNet:
   - Ensure AES key exists (peer+0x1408) and flag is set (peer+0x1418)
   - If encrypted (length % 16 == 0), run DataBlockEncryptor::Decrypt
   - Parse RakNet reliability headers (ACKs, timestamp, message IDs)
   - Extract payload BitStream for game messages
3) If CUDPDriver:
   - Verify fingerprint (CRC32 fold)
   - Use CPacket_Read to parse bit-packed fields

### Send pipeline
1) Build BitStream payload (game message)
2) Wrap with RakNet reliability
3) If encryption is enabled, encrypt using DataBlockEncryptor
4) Send UDP datagram

### Pseudocode (RakNet receive)
```
if (peer.securityFlag && (len % 16 == 0)) {
  if (!DecryptAES(buffer, len, outBuf, &outLen)) drop;
  buffer = outBuf; len = outLen;
}
RakNetBitStream bs(buffer, len);
parseAckAndReliability(bs);
payload = extractPayload(bs);
parseGameMessage(payload);
```

## Common failure modes
- Wrong RSA size: RakNet default RSA_BIT_SIZE is u256 (32 bytes). FoM uses 64-byte modulus; confirm RSA size used in build.
- Decrypting too early: encryption only turns on after 16-byte aligned packet validates.
- Bit alignment errors: RakNet BitStream and LithTech CPacket are both bit-level; byte assumptions will corrupt parsing.
- Missing world bounds: CompWorldPos decode requires the world min/max/inv diff values.

## Mapping checklist (documented targets, do not map yet)
The items below are the high-value mapping targets to resolve plaintext extraction and packet decoding. They are listed here for completeness only; no mapping work is executed in this doc.

### RakNet (FoM runtime)
- Key lifecycle + enable switch: exact offsets for AES key + security flag + connectMode in FoM structs; map all call sites to SetEncryptionKey and the "16-byte aligned packet enables AES" gate.
- Handshake structs: layout of secured response/confirm packets in FoM build (RSA size + cookie + random); mismatch here = wrong key and garbage decrypts.
- Reliability header layout: ACK flags, message number encoding, ordering channels; you cannot reach payload without this.
- BitStream compressors: FoM's BitStream_WriteU16C/ReadU16C, plus any custom compressed-int helpers; these change bitstream shape.
- String compression/Huffman: if FoM uses RakNet StringCompressor, map table init and encode/decode calls.
- Network time / timestamp transforms: FoM uses RakNet ID_TIMESTAMP in some flows; map where it is applied to avoid mis-parsing payload.

### LithTech engine (if CUDPDriver path ever appears)
- CPacket bit order: map read/write bit orientation and size indicators (already in source, confirm in FoM binaries).
- UDP fingerprint: CRC32 fold (8-bit); needed to validate input before parsing.
- Message dispatch: CGameClientShell_OnMessage plus SMSG_* and subpacket handlers; this is where payload schemas live.
- World bounds for CompWorldPos: decode needs world min/max/inv diff or results are garbage.

### FoM-specific glue
- LTClient vtable slots: send/receive paths (LTClient_SendPacket_BuildIfNeeded, BitStream_Write2048/Read2048, etc.) so you can hook at the right boundary.
- Packet header tokens: the 0x19 header + 64-bit token; map token source and semantics.
- Master/world routing: map where master vs world RakPeer instances live and how packet IDs split between them.

## Recommended next steps
1) Confirm RSA key size in FoM by inspecting fom_public.key and verifying RSA_BIT_SIZE at runtime.
2) Add instrumentation around SetEncryptionKey and ReliabilityLayer::{SendBitStream, HandleSocketReceiveFromConnectedPlayer}.
3) Build a small parser tool that accepts plaintext payloads and decodes ILTMessage/CPacket fields.

```
Files referenced:
- External/RakNet3.5/Source/RakPeer.cpp
- External/RakNet3.5/Source/RakPeer.h
- External/RakNet3.5/Source/DataBlockEncryptor.cpp
- External/RakNet3.5/Source/BitStream.cpp
- External/RakNet3.5/Source/MessageIdentifiers.h
- External/LithTech/engine/runtime/kernel/net/src/packet.h
- External/LithTech/engine/runtime/kernel/net/src/packet.cpp
- External/LithTech/engine/runtime/shared/src/ltmessage.h
- External/LithTech/engine/runtime/shared/src/ltmessage.cpp
- External/LithTech/engine/runtime/shared/src/compress.cpp
- External/LithTech/engine/runtime/kernel/net/src/sys/win/udpdriver.cpp
- AddressMap.md
```
