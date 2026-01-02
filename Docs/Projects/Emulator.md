# FoM Emulator Project

## Problem
The FoM client is offline. We need a server emulator that can authenticate, transition to the world server, and provide enough world state for the client to render the player character.

## Scope
Phase 1: Login -> World -> Character visible. Focus on protocol correctness and minimum viable world state.

## Goals
- Authenticate via master and transition to world server without disconnects.
- Provide minimum world state so the client shows the character in-world.
- Align protocol framing to FoM behavior (bit order, compressed ints, reliable headers).
- Document packet layouts and handler anchors in `AddressMap.md`.

## Non-Goals
- Full gameplay systems, economy, AI, or content parity.
- Perfect correctness of all packet types in Phase 1.
- Reverse engineering server-side gameplay logic beyond what is required to render the character.

## Inputs / Facts (current)
- FoM bitstream is `MSB-first` within bytes; multi-byte values are `big-endian` on the wire.
- Compressed integer format is bit-gated `MSB->LSB` with nibble optimization (see `AddressMap.md`).
- Master/world split exists; world password is `37eG87Ph`.
- Default UDP port is `0x6CF0` (`27888`) unless FoM capture proves otherwise.
- Existing emulator `BitStream` is `LSB-first` and port defaults to `61000` (mismatch).
- Planned capture tool: `SharkMCP` (Wireshark/tshark MCP) for transport verification.

## Solution Sketch
1) Capture first login packets to confirm transport (RakNet vs `CUDPDriver`) and handshake framing.
2) Align emulator `BitStream` + compressed ints + port/constants to FoM.
3) Implement master login: parse `LOGIN_REQUEST`, reply `LOGIN_REQUEST_RETURN` (`0x6D`) with world IP/port + session data stub.
4) Implement world accept: validate password, send `ID` packet (msg `12`) and `MessageGroup` (msg `14`) scaffolding.
5) Add minimum world bootstrap packets until client renders character.
6) Iterate on packet decoding via IDA + `AddressMap.md`; lock each packet with validation.

## Capture Workflow (`SharkMCP`)
- Filter: UDP traffic to/from FoM client process, ports `27888` and any observed master/world ports.
- Trigger: click Login; capture the first `5` seconds of packets.
- Output: PCAP + decoded summaries (hex + first `4` bytes).
- Decision: if first dword is `0x9919D9C7` -> `CUDPDriver` path; else treat as `RakNet` and inspect IDs.

## Transport Decision Matrix
- `CUDPDriver` path: packet starts with `0x9919D9C7` (magic) and 3-bit type after.
- `RakNet` path: `packet[0]` is a RakNet ID; reliable headers follow `0x4x`/`0x8x` patterns.
- If unclear: compare bit order by attempting `MSB` vs `LSB` parse on the same capture.

## Success Metrics
- FoM client logs in, receives `0x6D`, connects to world, and stays connected for `60s`.
- `ID` packet (msg `12`) and at least one `MessageGroup` (msg `14`) processed without errors.
- Character is visible in-world (even if world state is minimal).

## Metrics / Validation
- Handshake success rate (master/world).
- Login response ACK latency (ms).
- Disconnects within `60s` of world connect.
- Bitstream parse error rate (per packet).

## Phase 1 Validation Plan (per milestone)
- M1: capture + confirm transport path; store PCAP + decision note.
- M2: decode one captured packet end-to-end without bit errors.
- M3: `LOGIN_REQUEST` parsed, `LOGIN_REQUEST_RETURN` ACKed.
- M4: world connect stable `60s`; `ID` packet (msg `12`) accepted.
- M5: character visible; document required packet IDs to render.

## Dependencies
- FoM client binaries and ability to run locally.
- Packet capture (Wireshark or emulator logging).
- `SharkMCP` (Wireshark/tshark MCP server) for repeatable capture workflows.
- IDA Pro + MCP for targeted reverse engineering.
- `ServerEmulator\` codebase.

## Architecture (Phase 1)
- Base: `ServerEmulator\`
- Transport: UDP server + `PacketHandler` pipeline.
- Protocol layer: `BitStream` (FoM-aligned), reliable wrapper, LithTech sub-message parser.
- Roles: master + world in one process (config-driven), split later if needed.
- Instrumentation: structured hex logging + login/ack timing.

## Timeline / Sequence
- M1 -> M2 -> M3 -> M4 -> M5 (see milestones). No fixed dates; sequence-driven.

## Milestones (linked to plan)
- M1 Transport Capture and Decision (Solution Sketch #1, Risks)
- M2 Protocol Framing Alignment (Inputs / Facts, Solution Sketch #2)
- M3 Master Login Path (Solution Sketch #3)
- M4 World Accept + ID/MessageGroup (Solution Sketch #4)
- M5 Minimum World State (Solution Sketch #5)

## Milestone Details
### M1 Transport Capture and Decision
- Goal: confirm RakNet vs `CUDPDriver` path from first login packets.
- Deliverables: PCAP + summary + recorded decision in log.

### M2 Protocol Framing Alignment
- Goal: `BitStream` `MSB-first` + big-endian multibytes + FoM compressed ints.
- Deliverables: emulator decodes one captured packet without bit errors; port/constants match FoM capture.

### M3 Master Login Path
- Goal: parse `LOGIN_REQUEST` and respond with `0x6D`.
- Deliverables: `LOGIN_REQUEST_RETURN` ACKed; client proceeds to world connect.

### M4 World Accept + ID/MessageGroup
- Goal: accept world connection and send minimal LithTech messages.
- Deliverables: client stays connected `60s`; `ID` packet (msg `12`) processed without error.

### M5 Minimum World State
- Goal: render character in-world with minimal packet set.
- Deliverables: list of required packet IDs + working handler stubs captured in log.

## Risks
- Wrong transport assumption blocks all progress; must confirm via capture.
- Incorrect bit order or compressed int handling corrupts all packets.
- `LOGIN_REQUEST` layout unknown; must derive from capture.
- Minimal world payload may still be insufficient; iterative decoding required.

## Alternatives
- Build a clean emulator from scratch (slower; higher risk).
- Patch client to accept simplified protocols (less authentic).
- Use RakNet-native stack only (may mismatch FoM custom framing).

## Rollout (Phase 1)
- M1: Transport capture + decision.
- M2: Emulator framing alignment (`BitStream` + constants + reliable header).
- M3: Master login response path.
- M4: World accept + `ID`/`MessageGroup` scaffolding.
- M5: Minimum world state for character rendering.

## Decision Log
- Use `ServerEmulator` as base to reduce lift and keep amplification of existing findings.
- Transport will be confirmed by capture before changing semantics.
- Protocol correctness takes priority over speed or feature breadth.

## Open Questions
- Exact `LOGIN_REQUEST` field layout.
- Reliable header byte layout for FoM.
- Minimum world packet set to render character.

## References
- `AddressMap.md`
- `Docs\Notes\CUDPDriver.md`
- `Docs\Notes\ClientNetworking.md`
- `Docs\Notes\LOGIN_REQUEST*.md`
- `ServerEmulator_Findings.md`
