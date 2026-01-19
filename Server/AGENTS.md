# Server - AGENTS

## Overview
Bun-based server emulator for Face of Mankind. Monorepo with apps and shared packages.

## Structure
- `apps/master/` - Master server (login, session routing)
- `apps/world/` - World server (gameplay, replication)
- `packages/packets/` - LithTech packet definitions (encode/decode)
- `packages/networking/` - Network layer (RakNet FFI, LithNet FFI, BitStream)

## Native Code (MUST COMPILE BEFORE USE)

### LithNet FFI (LithTech packet serialization)
```bash
cd packages/networking/native/lithnet && ./build.sh
```

### RakNet FFI (transport layer)
```bash
cd packages/networking/native/raknet && ./build.sh
```

## Running
```bash
# From repo root
./start_server.bat      # Master server
./start_world.bat       # World server
```

## Key Patterns
- Packets use `LithPacketWrite`/`LithPacketRead` from `@openfom/networking` (native FFI)
- `using` keyword for automatic resource cleanup (Disposable pattern)
- `encode()` includes message ID; `decode()` validates message ID

## House Coding Standards
- Prefer explicit, narrow types; avoid `any`.
- Keep message IDs, offsets, and wire sizes explicit (named constants, comments when non-obvious).
- Avoid hidden heuristics on live traffic; log raw and parsed data separately.
- Keep raw UDP handling separate from app payload handling.
- Favor small pure helpers over large inlined blocks; reuse via shared helpers.
- Log with clear prefixes (`[Master]`, `[World]`, `[Admin]`) and stable wording.
- Use early returns for guard clauses; avoid deep nesting.
- Keep section banners consistent with `// =============================================================================`.

## Commenting Style (Production TS)
- Use JSDoc for all comments.
- Inline notes: `// ...` (short, local, single line).
- Block comments (`/* ... */`) only for large temporary disables; prefer deletion over dead code.
- Use `TODO:`/`FIXME:` tags with a short reason when leaving work behind.
- Comment hygiene: add descriptive comments for any non-obvious logic or constraints (explain why); avoid redundant narration.

## Reliability + Logging Rules
- App receive loop must treat payload[0] as the message ID (after timestamp unwrap).
- Reliable frame parsing only on raw capture (`drainRawLog`) and never mutates app dispatch.
- PacketInspector is the source of log formatting; avoid custom reclassification on app logs.

## Change Safety
- Preserve proven-stable behavior; flag deltas in logs and document rollback if behavior changes.

## Production TypeScript Best Practices (All Agents)
- Use strict typing: `unknown` + narrowing over `any`; avoid implicit `any`.
- Prefer `const` and immutable data; minimize shared mutable state.
- Validate external inputs at boundaries (network, file, env); fail fast with clear errors.
- Keep wire formats explicit: sizes, offsets, endian, and limits documented in code.
- Separate concerns: parsing vs handling, raw vs app payload, logging vs behavior.
- Design for testability: pure functions where possible; isolate side effects.
- Use small, focused helpers; avoid long functions and deep nesting.
- Handle errors consistently; never swallow exceptions silently.
- Logging: stable tags, no dynamic formats; include IDs and connection keys.
- Performance: avoid per-packet allocations when possible; reuse buffers carefully.
- Security: never trust client data; clamp lengths and ranges before use.
- Concurrency: avoid races in shared maps; keep per-connection state localized.
- Config: read once at startup; use defaults; document env vars.
- Comments: explain “why” not “what”; keep them current or remove.

## Lint + Format
- ESLint + Prettier are the standard tools for consistent production TS style.
- Use `bun run lint` / `bun run lint:fix` and `bun run format` / `bun run format:check` from `Server/`.
- Keep lint clean before committing; suppressions require a short reason.
