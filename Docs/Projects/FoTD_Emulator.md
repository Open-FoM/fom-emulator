# FoTD Emulator Project

## Scope
Phase 1: Login -> World -> Character visible. Focus on protocol correctness and minimum viable world state.

## Success Metrics
- Client logs in, receives 0x6D, connects to world, and stays connected for 60s.
- ID packet (msg 12) and at least one MessageGroup (msg 14) processed without errors.
- Character is visible in-world (even if world state is minimal).

## Dependencies
- FoTD client binaries and ability to run locally.
- Packet capture (Wireshark or emulator logging).
- SharkMCP (Wireshark/tshark MCP server) for repeatable capture workflows.
- IDA Pro + MCP for targeted reverse engineering.
- ServerEmulator codebase in C:\FoM_Decompilation\ServerEmulator.

## Timeline / Sequence
- M1 -> M2 -> M3 -> M4 -> M5 (see milestones). No fixed dates; sequence-driven.

## Milestones (linked to Spec)
- M1 Transport Capture and Decision (Spec: Solution Sketch #1, Risks)
- M2 Protocol Framing Alignment (Spec: Inputs / Facts, Solution Sketch #2)
- M3 Master Login Path (Spec: Solution Sketch #3)
- M4 World Accept + ID/MessageGroup (Spec: Solution Sketch #4)
- M5 Minimum World State (Spec: Solution Sketch #5)

## Milestone Details
### M1 Transport Capture and Decision
- Goal: confirm RakNet vs CUDPDriver path from first login packets.
- Deliverables: PCAP + summary + recorded decision in log.

### M2 Protocol Framing Alignment
- Goal: BitStream MSB-first + big-endian multibytes + FoTD compressed ints.
- Deliverables: emulator decodes one captured packet without bit errors; port/constants match FoTD capture.

### M3 Master Login Path
- Goal: parse LOGIN_REQUEST and respond with 0x6D.
- Deliverables: LOGIN_REQUEST_RETURN ACKed; client proceeds to world connect.

### M4 World Accept + ID/MessageGroup
- Goal: accept world connection and send minimal LithTech messages.
- Deliverables: client stays connected 60s; ID packet (msg 12) processed without error.

### M5 Minimum World State
- Goal: render character in-world with minimal packet set.
- Deliverables: list of required packet IDs + working handler stubs captured in log.

## Decision Log
- Use ServerEmulator as base to reduce lift and keep amplification of existing findings.
- Transport will be confirmed by capture before changing semantics.
- Protocol correctness takes priority over speed or feature breadth.

## References
- Docs\Specs\FoTD_Emulator.md
- AddressMap_FoTD.md
- ServerEmulator_Findings.md
