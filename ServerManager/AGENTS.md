# ServerManager - AGENTS

## Overview
Electron + Vite React app for managing FoM server profiles and launch workflows.

## Structure
- `electron/` - Electron main process + IPC bridge
- `renderer/` - Vite + React UI
- `resources/` - App assets (icons, images)
- `server_profiles/` - JSON profile presets
- `scripts/` - Dev scripts (packet template generation, helpers)

## Running
```bash
# From ServerManager/
 npm run dev
```

## Key Patterns
- Electron main is CommonJS (`electron/main.cjs`). Renderer is ESM TypeScript/React.
- Keep main/renderer boundaries explicit; use IPC for privileged actions.
- Prefer app-level logging through existing helpers; avoid ad-hoc console spam.

## Production TypeScript/JavaScript Best Practices (All Agents)
- Use strict typing: `unknown` + narrowing over `any`; avoid implicit `any`.
- Prefer `const` and immutable data; minimize shared mutable state.
- Validate external inputs at boundaries (IPC payloads, file IO, env); fail fast with clear errors.
- Keep wire formats explicit: sizes, offsets, endian, and limits documented in code.
- Separate concerns: parsing vs handling, UI vs data, IPC vs business logic.
- Design for testability: pure functions where possible; isolate side effects.
- Use small, focused helpers; avoid long functions and deep nesting.
- Handle errors consistently; never swallow exceptions silently.
- Logging: stable tags, no dynamic formats; include IDs and connection keys when relevant.
- Performance: avoid per-event allocations where possible; reuse buffers carefully.
- Security: never trust renderer input; clamp lengths and ranges before use.
- Concurrency: avoid races in shared maps; keep per-connection state localized.
- Config: read once at startup; use defaults; document env vars.
- Comments: explain "why" not "what"; keep them current or remove.

## Commenting Style (Production TS)
- Use JSDoc for all comments.
- Inline notes: `// ...` (short, local, single line).
- Block comments (`/* ... */`) only for large temporary disables; prefer deletion over dead code.
- Use `TODO:`/`FIXME:` tags with a short reason when leaving work behind.
- Comment hygiene: add descriptive comments for any non-obvious logic or constraints (explain why); avoid redundant narration.

## Lint + Format
- TypeScript compile checks: `npm run lint:tsc`.
- ESLint: `npm run lint:eslint` (or `npm run lint` for both).
- Prettier: `npm run format` / `npm run format:check`.
- Keep lint clean before committing; suppressions require a short reason.

## Change Safety
- Preserve proven-stable behavior; flag deltas and document rollback if behavior changes.
