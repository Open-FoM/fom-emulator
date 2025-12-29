# FoTD Emulator - Phase 1 (Login -> World -> Character Visible)

## Problem
The FoTD client is offline. We need a server emulator that can authenticate, transition to the world server, and provide enough world state for the client to render the player character.

## Goals
- Authenticate via master and transition to world server without disconnects.
- Provide minimum world state so the client shows the character in-world.
- Align protocol framing to FoTD behavior (bit order, compressed ints, reliable headers).
- Document packet layouts and handler anchors in AddressMap_FoTD.md.

## Non-Goals
- Full gameplay systems, economy, AI, or content parity.
- Perfect correctness of all packet types in Phase 1.
- Reverse engineering server-side gameplay logic beyond what is required to render the character.

## Inputs / Facts (current)
- FoTD bitstream is MSB-first within bytes; multi-byte values are big-endian on the wire.
- Compressed integer format is bit-gated MSB->LSB with nibble optimization (see AddressMap_FoTD.md).
- Master/world split exists; world password is "37eG87Ph".
- Default UDP port is 0x6CF0 (27888) unless FoTD capture proves otherwise.
- Existing emulator BitStream is LSB-first and port defaults to 61000 (mismatch).
- Planned capture tool: SharkMCP (Wireshark/tshark MCP) for transport verification.

## Solution Sketch
1) Capture first login packets to confirm transport (RakNet vs CUDPDriver) and handshake framing.
2) Align emulator BitStream + compressed ints + port/constants to FoTD.
3) Implement master login: parse LOGIN_REQUEST, reply LOGIN_REQUEST_RETURN (0x6D) with world IP/port + session data stub.
4) Implement world accept: validate password, send ID packet (msg 12) and MessageGroup (msg 14) scaffolding.
5) Add minimum world bootstrap packets until client renders character.
6) Iterate on packet decoding via IDA + AddressMap_FoTD.md; lock each packet with validation.

## Capture Workflow (SharkMCP)
- Filter: UDP traffic to/from FoTD client process, ports 27888 and any observed master/world ports.
- Trigger: click Login; capture the first 5 seconds of packets.
- Output: PCAP + decoded summaries (hex + first 4 bytes).
- Decision: if first dword is 0x9919D9C7 -> CUDPDriver path; else treat as RakNet and inspect IDs.

## Transport Decision Matrix
- CUDPDriver path: packet starts with 0x9919D9C7 (magic) and 3-bit type after.
- RakNet path: packet[0] is a RakNet ID; reliable headers follow 0x4x/0x8x patterns.
- If unclear: compare bit order by attempting MSB vs LSB parse on the same capture.

## Phase 1 Validation Plan (per milestone)
- M1: capture + confirm transport path; store PCAP + decision note.
- M2: decode one captured packet end-to-end without bit errors.
- M3: LOGIN_REQUEST parsed, LOGIN_REQUEST_RETURN ACKed.
- M4: world connect stable 60s; ID packet (msg 12) accepted.
- M5: character visible; document required packet IDs to render.

## Architecture (Phase 1)
- Base: C:\FoM_Decompilation\ServerEmulator
- Transport: UDP server + PacketHandler pipeline.
- Protocol layer: BitStream (FoTD-aligned), reliable wrapper, LithTech sub-message parser.
- Roles: master + world in one process (config-driven), split later if needed.
- Instrumentation: structured hex logging + login/ack timing.

## Risks
- Wrong transport assumption blocks all progress; must confirm via capture.
- Incorrect bit order or compressed int handling corrupts all packets.
- LOGIN_REQUEST layout unknown; must derive from capture.
- Minimal world payload may still be insufficient; iterative decoding required.

## Alternatives
- Build a clean emulator from scratch (slower; higher risk).
- Patch client to accept simplified protocols (less authentic).
- Use RakNet-native stack only (may mismatch FoTD custom framing).

## Rollout (Phase 1)
- M1: Transport capture + decision.
- M2: Emulator framing alignment (BitStream + constants + reliable header).
- M3: Master login response path.
- M4: World accept + ID/MessageGroup scaffolding.
- M5: Minimum world state for character rendering.

## Metrics / Validation
- Handshake success rate (master/world).
- Login response ACK latency (ms).
- Disconnects within 60s of world connect.
- Bitstream parse error rate (per packet).

## Open Questions
- Exact LOGIN_REQUEST field layout.
- Reliable header byte layout for FoTD.
- Minimum world packet set to render character.

## References
- AddressMap_FoTD.md
- Docs\Protocol\classes\CUDPDriver.md
- Docs\Protocol\classes\ClientNetworking.md
- Docs\Protocol\packets\LOGIN_REQUEST*.md
- ServerEmulator_Findings.md
