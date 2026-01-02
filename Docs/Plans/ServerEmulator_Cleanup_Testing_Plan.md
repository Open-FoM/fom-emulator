# ServerEmulator Cleanup + Unit Testing Plan

Date: 2025-12-30
Owner: ServerEmulator maintainer

## Mission
Deliver cleaner boundaries between RakNet/LithTech parsing, deterministic login parsing, stable logging, and
testable decoding paths without behavior regressions for handshake/login or logging output.

## Scope (In)
- Non-destructive refactors only: move or extract helpers, keep logic intact.
- Deterministic login parsing for 0x6C and 0x6B paths.
- Stable packet logging format and timestamp string format.
- Unit tests driven by offline fixtures and brute-force alignment sweeps.

## Out of Scope
- Gameplay packets/world simulation.
- Encryption/key generation changes.
- Large rewrites of RakNet/LithTech internals.
- CI/coverage requirements.

## Hard Constraints
- Live FoM client testing must keep working.
- Keep env/ini compatibility (fom_server.ini and FOM_* env vars).
- Logging output format must not change. Content may be reduced (e.g., remove PathTrace/trace_raw/lithdebug) only with explicit approval.
- Raknet-js treated as vendor drop: touch only if unavoidable.

## Known-Good Invariants (Must Not Regress)
- PacketHandler login decode of 0x6C (username/token) and 0x6B (blob decode path).
- RakStringCompressor Huffman decoding with runtime table.
- PacketLogger packet hex dump format and timestamp format.
- Reliable response path uses PacketHandler.wrapReliable.

## Key Protocol Truths
- 0x6C login decode succeeds via LSB-first scan of reliable inner payload, then LSB->MSB repack + Huffman decode.
- MSB-only path on the same payload produces garbage; treat as negative case for 0x6C.
- 53-byte login packet with 0x6C at inner offset 5 is a golden fixture.
- Huffman table runtime truth: ServerEmulator/huffman_table_runtime.json.
 - fom_server.log must continue writing through the login packet (no log-stop regression).

## Architecture Target (Boundaries)
- login/: 0x6B + 0x6C parsing helpers and shared login decoding utilities.
- lithtech/: sub-packet parsing and alignment heuristics.
- reliable/: wrapReliable + ACK construction.
- config/: env/ini parsing and config snapshot logic.
- handlers/: coordinator only (orchestration, no heavy parsing).

## Testing Strategy (Offline + Deterministic)
### Core Design
- Fixtures are source of truth for decoded values.
- Decoders are pure functions (no logging side-effects).
- Brute-force alignment scan returns deterministic, ranked candidates.
- Negative cases assert misalignment yields low score or mismatch.

### Fixture Schema (Verified vs Explore)
- Verified fixtures must assert expected decoded fields.
- Explore fixtures only assert deterministic decode + structural validity.
- Suggested fields:
  - name, msg_id, wrapper, bit_order, hex, source_log, source_timestamp
  - expected: { ... } (verified)
  - negative: { bit_order, maxScore } (optional)

### Decode Pipeline (Shared)
1) Unwrap reliable header (if wrapper=reliable).
2) Sweep bit offsets to locate candidate msg_id.
3) Parse length/flags.
4) Decode fields using schema (Huffman for strings).
5) Score candidates (msg_id match, length bounds, printable ratio, known flags).
6) Return best candidate (deterministic ordering: score, offset, bitOffset).

### Packet Schemas (Minimal + Hooks)
- Supported field types:
  - u8/u16/u32
  - bits(n)
  - huffman_string_rawlen_be(maxLen)
  - raw_bytes(len) / len_prefixed_bytes(lenType)
  - skip_bits(n)
- Optional per-schema hooks: preDecode/postDecode for oddities (login, Lith subframes).

### Unit Test Targets
- login_decode.test.ts (golden 0x6C fixture)
- huffman_runtime_table.test.ts (runtime table path, deterministic output)
- packet_logger_format.test.ts (timestamp + hex dump formatting, suppression behavior)
- reliable_wrap_ack.test.ts (wrapReliable + buildAck stable output)

## Phased Plan
### Phase 0: Baseline Tests (No Behavior Change)
Goal: lock known-good behavior before any refactor.
- Add test harness runner (tsx + assert) that runs all *.test.ts.
- Convert login_decode.test.ts to fixture-driven (or add fixture-driven wrapper).
- Add Huffman runtime table test.
- Add PacketLogger format test (use fixed timestamps).
Acceptance:
- npm run test:unit passes with current behavior.

### Phase 1: Extract Pure Helpers (Non-Destructive)
Goal: isolate fragile parsing logic into pure functions.
- Move login parsing helpers into login/ (keep signatures; no logic change).
- Move reliable wrapper + ack builder into reliable/ (exported functions).
- Move env/ini parsing into config/ (reuse from index.ts).
- PacketHandler becomes an orchestrator calling helpers.
Acceptance:
- All Phase 0 tests still pass.
- Live FoM client login still works (manual smoke).

### Phase 2: Generic Decode Harness
Goal: reusable brute-force decode pipeline for offline testing.
- Implement shared scan/decode pipeline in src/tests/_support.
- Add packet schema definitions for login and connection handshake.
- Add negative tests for misalignment (0x6C MSB path should fail/low score).
Acceptance:
- Deterministic decode ranking and stable output across runs.

### Phase 3: Optional Integration Tests (Deferred)
Goal: validate UDP reliability path offline without FoM client.
- Add loopback UDP tests with TestClient.
- Keep behind explicit npm script (test:udp).
Acceptance:
- Optional; not required for baseline cleanup.

## Risk Control
- No wire format changes; move-only or pure-helper extraction.
- Freeze logging format; any changes require explicit approval.
- Avoid touching vendor-like directories.
- Add negative tests to detect alignment regressions.

## Rollback
- Git rollback only (no extra mechanism).
- Record behavior deltas in Docs/Notes or working log if any decode path changes.

## Immediate Next Steps (Proposed)
1) Add test runner (test:unit).
2) Create fixtures directory + login fixture.
3) Add Huffman + logger format tests.
4) Convert login decode test to fixture-driven path.
