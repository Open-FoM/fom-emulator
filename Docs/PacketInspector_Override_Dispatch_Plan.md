# PacketInspector Schema Override Dispatch Plan
Date: 2026-01-17
Owner: PITI (Codex)

## Context and current usage (verified)
- PacketInspector.dll is used by both Server (Bun FFI) and Hook (client injector).
- Both call FomLogLoadConfigFile(nullptr) inside the DLL.
- Config resolution in the DLL checks, in order:
  1) Env: FOM_PACKETINSPECTOR_CONFIG
  2) Env: PACKETINSPECTOR_CONFIG
  3) PacketInspector.ini in CWD
  4) PacketInspector.ini in module dir (and nearby subfolders)
- Server currently only toggles PacketInspector on/off via env (FOM_DISABLE_PACKETINSPECTOR*); it does NOT pass a config path.
- Hook also relies on the DLL resolver (module dir/cwd/env) and does not pass an explicit config path.

Implication: any new config flag must be added to PacketInspector.ini and will affect both server and hook; env override remains available.

## Goals
1) Schema-first dispatch: every packet ID with a schema must be parsed by its override parser first.
2) Heuristic fallback: only run the heuristics from Docs/GamePacketsParsingFix.md if schema parsing fails or is disabled.
3) Dispatch status log: emit a one-line status ABOVE each packet log, gated by config, to show where routing landed (override/heuristic/raw).
4) Keep existing packet log output (colors/labels/format) unchanged.

## Non-goals
- No change to handler behavior beyond the effective message ID used for routing.
- No change to packet log formatting (except the new status line above it).
- No changes to RakNet receive flow; we only operate after peer.receive().

## Sources of truth
- Heuristics: Docs/GamePacketsParsingFix.md
- Schemas: Docs/Packets (including Docs/Packets/GamePackets)
- Existing packet decode helpers in Server/packages/packets and PacketInspector/Source

## High-level architecture
  ### A) Schema registry (C++)
  - PacketInspector.dll will own a schema registry keyed by message ID.
  - Each schema entry has:
    - id (u8)
    - name (const char*)
    - layer (Rak/Lith)
    - parserFn (override parser pointer)
    - flags (optional: strict-only, allow-heuristic-fallback)

  ### B) Override parser interface (C++)
  - Every schema ID must have an override parser.
  - Parser signature (example):
    - bool ParseOverride(const uint8_t* data, uint32_t bitLen, SchemaParseResult* out)
  - Output should contain:
    - ok (bool)
    - effectiveId (u8)
    - innerId (u8; for packetgroup)
    - layer (Rak/Lith)
    - payloadOffsetBits / payloadBits (for logging/trace)
    - failureReason (enum or string tag, for status log)

  ### C) Dispatch entry point (DLL)
  - `FomClassifyPacketSimple` is exported and returns classification for server dispatch.
  - Logging uses the same InspectPacketPipeline logic.

  ### D) Server integration
  - After peer.receive(), and after Buffer.from(packet.data):
    - Call the DLL classifier (`FomClassifyPacketSimple`) to get effectiveId (and innerId if needed).
    - Use that ID for handler dispatch.
    - Keep PacketInspector logging unchanged (it will already use the same classifier internally).

## Pipeline (authoritative order, current code)
1) Rak unwrap via `raknet_ffi.dll` (MSB) to get payload offset + bit length.
2) Unwrap timestamp + `ID_USER_PACKET_ENUM` to find payload‑relative msg id.
3) Schema‑first override:
   - Try payload start, then **bit‑scan inside payload**.
   - If still not found and `Length >= 17`, **bit‑scan raw frame from byte 0x10**.
4) If schema fails and heuristics are allowed, run heuristics from Docs/GamePacketsParsingFix.md.
5) If heuristics fail, keep raw; **Rak ID fallback is last** (payload head only if known Rak ID).

## Override parsers to implement (all required)
- 0x06 SMSG_LOADWORLD (implemented)
  - Validate: u8 msgId, f32 gameTime, u16 worldId (LSB)
- 0x09 CMSG_CONNECTSTAGE (implemented)
  - Validate: u8 msgId, u8 stage in {0,1} (LSB, bit-aligned)
  - **Offset rule:** offsets are payload-relative (post-Rak unwrap); do not use raw-frame byte offsets
- 0x0E SMSG_PACKETGROUP (implemented)
  - Parse subLenBits + subMsgId + subPayload
  - Select inner ID by current priority rules (0x06 > 0x0C > 0x04 > others)
  - **Offset rule:** msgId and subLenBits are read from payload bits (LSB); do not use raw-frame offsets
- 0x19 CMSG_WORLD_UPDATE (implemented)
  - Use server writer order in Server/packages/packets and docs
  - Current parser validates msgId + flexible `worldInst/sequence` only (tighten if false positives appear)
- 0x7E PACKET_ID_UPDATE (implemented, Rak layer)
  - Use WeaponFireEntry layout and write order from server/IDA notes
  - Validate entry list and termination to avoid false positives

## Heuristic fallback rules (from Docs/GamePacketsParsingFix.md)
- Only run when override fails and BestGuessParsing is enabled.
- Rak unwrap must be attempted first.
- Lith decode is LSB order.
- Packetgroup selection uses inner ID priority.
- Validation gates for 0x09/0x06/0x0C/0x0A must hold or fallback fails.
- If internal parse fails, an additional Lith bit‑scan may still select a valid payload.

## Dispatch status log (new)
  ### Behavior
  - One line printed ABOVE each packet log line.
  - Emitted to both console and file.
  - Config gated; default OFF.

  ### Suggested format
  [YYYY.MM.DD-HH.MM.SS:ms][Dispatch] mode=override id=0x0E inner=0x06 ok=1 offBits=132 reason=ok

  ### Config keys (PacketInspector.ini)
  [Logging]
  DispatchStatus=0               ; 0/1

  Notes:
  - The DLL config resolver applies to both server and hook.
  - The status line respects existing suppression rules (if the packet log is suppressed, status is suppressed too).

## Implementation status (as of 2026-01-18)
- Schema registry lives in `PacketInspector/Source/FomSchema.cpp` (`SchemaTable`).
- Overrides for 0x06/0x09/0x0E/0x19/0x7E are implemented.
- Schema‑first dispatch + raw bit‑scan fallback are wired into `InspectPacketPipeline`.
- Heuristic fallback is wired and gated by `StrictParsing` / `BestGuessParsing`.
- Dispatch status log is emitted in `FomApi.cpp` when `DispatchStatus=1`.
- Server calls `FomClassifyPacketSimple` via `PacketInspectorBridge.classify`.

## Validation
- Replay movement/loadworld/connectstage hex samples from Docs/GamePacketsParsingFix.md
- Confirm server logs show correct IDs and dispatch status mode=override
- Confirm heuristics still resolve when override fails (toggle to verify)
- Verify console+file both show status line when enabled

## Test Harness (Required)
Source of packets: Docs/GamePacketsParsingFix.md
Harness script: Scripts/run_world_replay.bat
  ### Goal
  Replay **every packet listed in Docs/GamePacketsParsingFix.md** and confirm 100% correct classification.

  ### Harness Rules
  - All packet blocks in Docs/GamePacketsParsingFix.md must be replayed.
  - A packet only “passes” if the log label matches the “Correct log label” for that block.
  - The harness is not complete until **every** packet in that document passes.
  - If any packet fails, fix parsing and rerun the entire replay set (no partial passes).
  - The harness must run in the current shell (no external terminals) and enforce a fixed duration; the server/client processes must be terminated at the end of the run.
  - After **every** harness run, produce a **summary result** (pass/fail per packet block) so we do not have to scan full logs manually.

  ### Recommended Flow
  1) Build and deploy PacketInspector (see Validation section).
  2) Run the harness:
    - `Scripts\\run_world_replay.bat run1 15 62000 63000`
  3) Produce a **summary result** for this run (pass/fail per packet block) and include it in your response.
  4) Verify logs for **each packet block**:
    - `Server\\apps\\world\\logs\\pi_run_run1_*.out`
    - Confirm each block’s “Correct log label” is present for its timestamp/length.
  5) Cross-check the packet blocks and labels against Docs/GamePacketsParsingFix.md.

  ### Pass/Fail Criteria
  - Pass: every listed packet resolves to its correct label (100% of entries).
  - Fail: any single packet is mislabeled, missing, or ambiguous.

## Rollback
- Record intended delta + rollback command in Docs/Logs before enabling defaults.
- Rollback command (git):
  - git checkout -- PacketInspector/ Server/packages/networking/
  - or revert specific commit once created

## Dispatch Status Logging Decision
- Emit dispatch status for all dispatched packets; suppress the status line whenever the packet log is suppressed.
