# ServerEmulator src Analysis (2025-12-28)

Scope: C:\FoM_Decompilation\ServerEmulator\src
Purpose: preserve findings for FoM Ghidra work and protocol alignment.

## Architecture Map
- src/index.ts: FoMServer entrypoint (UDPServer + ConnectionManager + PacketHandler + PacketLogger)
- src/network/UDPServer.ts: dgram wrapper, MAX_PACKET_SIZE, message/error/close events
- src/network/Connection.ts: per-remote state, seq numbers, timeouts, auth flags
- src/protocol/BitStream.ts: LSB-first bitstream (CLTMessage_ReadBits/WriteBits analog)
- src/handlers/PacketHandler.ts: protocol brain (magic, RakNet basics, FoM reliable wrapper, LithTech guaranteed parsing, login response)
- src/utils/PacketLogger.ts: console + file hex logging with heuristic decoding

## Protocol Flow (as implemented)
- Connection request: magic 0x9919D9C7 + 3-bit type (QUERY/CONNECT). CONNECT expects 128-byte password + optional timestamp.
- Reliable packets: byte-aligned 17-byte header (0x40...) with inner data at offset 17; ACK uses 0x80 format.
- LithTech guaranteed: 13-bit sequence + 1-bit continuation, parses sub-messages, then sends protocol version + ID packet.
- Login: heuristic parse for packetId >= 0x80, responds with ID_LOGIN_REQUEST_RETURN (0x6D) + world IP/port.

## raknet-js Submodule (separate stack)
- src/raknet-js/* is a bit-aligned RakNet implementation, not wired into FoMServer.
- FomReliabilityLayer.ts implements FoM byte-aligned reliable format but is unused by index.ts.
- RakClient/RakServer use ReliabilityLayer (bit-level), not FoM custom format.

## High-Risk Mismatches / Bugs
- Port mismatch: DEFAULT_PORT = 61000 (Constants.ts) vs docs default 0x6CF0 (27888). Index prints 61000.
- TestClient mismatch: src/tools/TestClient.ts sends magic+3-bit type+GUID only; PacketHandler expects 128-byte password + timestamp.
- Reliable header ambiguity: FomReliabilityLayer comments say msg# at bytes 1?3; code reads bytes 9?12 (same as PacketHandler). If msg# lives at 1?3, ACKs are wrong.
- Reliable type mask: PacketHandler only treats 0x40?0x4F as reliable (packetId & 0xF0 == 0x40). If FoM uses 0x60 (RELIABLE_ORDERED), packets bypass reliable path.
- LithTech submessage parse likely wrong: length likely includes msgId (per docs), but parser reads msgId then consumes lengthBits as payload and also reads an extra hasMore bit.
- Bitstream incompatibility risk: protocol/BitStream.ts is LSB-first; raknet-js/structures/BitStream.ts is MSB-first. Mixing will corrupt packets.
- Login parsing is heuristic: accepts any ASCII username, ignores version/RSA.

## Ghidra Anchors From Comments
- CLTMessage_ReadBits @ 0x0047C7F0, CLTMessage_WriteBits @ 0x0047CB20 (protocol/BitStream.ts comment)
- CUDPDriver_JoinSession @ 0x004B67B0 (handlers/PacketHandler.ts comment)

## Cross-Ref With Protocol Docs
- DEFAULT_PORT (docs): 0x6CF0 (27888)
- CONNECTION_MAGIC: 0x9919D9C7
- SEQUENCE_MASK: 0x1FFF (13-bit)
- Handler table (docs): g_MessageHandlers @ 0x006FAB50 (FoM build)
- Login response handler (docs): ClientNetworking_HandleLoginResponse @ 0x004DF570 (FoM build)

## Suggested Next Checks (FoM)
- Re-locate RTTI strings (.?AVClientNetworking@@, packet RTTI) in FoM.
- Validate reliable header layout + msg# location via live packets or FoM decomp.
- Verify LithTech message group format vs parser and adjust length semantics.
- Align connection request structure to client?s actual JoinSession format.
