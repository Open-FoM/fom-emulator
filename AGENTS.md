# FoM Reverse Engineering - AGENTS

# Purpose
- We are reverse engineering this game, which no longer exists, for `research/preservation`; legal concerns are explicitly disregarded by project scope.
- Primary focus: `FoM` behavior, network flow, packet formats, and hook points used for server redirection and custom code injection.
- Item/catalog reverse engineering is in scope; treat `CRes.dll` as the likely item/resource handler until verified.
- Treat legacy artifacts as baseline only; re-locate/verify in `FoM` before reuse.
- Stay read-only first; only rename/add comments/types after validating with `xrefs` or decomp.

# Deep Context
- `Docs\Notes\` (protocol notes live here; server setup/flow, packet formats, handler addresses; start here)
- Protocol drill-downs live flat in `Docs\Notes\` (files: `LOGIN*.md`, `CShell_Gameplay_Packets.md`, `CUDPDriver.md`, `ClientNetworking.md`, `MSG_ID_*`).
- `Login_Request.md`, `Docs\Login_Request.md`, `Docs\Login_Request_*.md` (login handshake notes and captures; use newest dated file)
- `RakNet_LithTech_DeepDive.md` (RakNet/LithTech integration notes and assumptions)
- `Protocol_AddressWatch.md` (legacy-derived anchors to relocate in `FoM`; verify before reuse)
- `ServerEmulator_Findings.md` (TS emulator analysis, reliability formats, known mismatches)
- `Docs\Projects\Emulator.md` (milestones + decision log)
- `Docs\Logs\Emulator.md` (active task checklist; update with progress)
- `ServerEmulator\` (emulator codebase to align with `FoM`)
- `HookInjector\` (DLL injector + hook points + packet decode/logging helpers)
- `Docs\Logs\FoM Reverse Engineering.md` (active RE task log for packet/layout work)
- `AddressMap.md` (working FoM map; add confirmed addresses continuously)
- `catalog\` (`CRes_*_items.csv` / `CRes_*_categories.csv` item tables; derived from `CRes.dll`)
- `Docs\Notes\cvar_bind_table.csv` (console variable bindings)
- `Docs\Notes\huffman_freq_table.json`, `Docs\Notes\huffman_table_runtime.json` (string compression tables)
- `Client\Resources\` (`CRes.dll`/`CShell.dll` live here; FoM client resource handling)

# Catalog / Items
- Item tables live under `catalog\` (`CRes_*_items.csv`, `CRes_*_categories.csv`).
- `Client\Resources\CRes.dll` is the suspected item/resource driver; confirm with strings/`xrefs` before renames.

# External References
- `External\LithTech\` (`LithTech` source used by the binaries; use for struct names, class layouts, and behavior baselines).
- `External\RakNet3.5\` (`RakNet` 3.5 source used by the binaries; use for reliability, packet layout, and net layer flow).
- `Docs\External\LithTech\README.md` (Markdown API docs + guides for LithTech; start here for external reference context).
- `Docs\External\RakNet3.5\README.md` (Markdown API docs + guides for RakNet 3.5; start here for external reference context).

# AddressMap
- On session start, open `AddressMap.md`.
- Continuously map/record confirmed addresses in `AddressMap.md`.

# Targets
- `Client\` (FoM client binaries; see for the current executable filename)
- `Client\server.dll` (dedicated server binary; packet handlers, session flow, and world behavior)
- `Client\Resources\CRes.dll` (resource/item tables and catalog helpers)
- `Client\Resources\CShell.dll` (network bitstream parsing + packet read/write)

# Runtime Artifacts
- Server logs: `ServerEmulator\logs\` (authoritative emulator output)
- Client logs: repo root `fom_hook.log` (hook/injector output)
- Client dumps: `FoTD\` or `Client\` (crash dumps for `fom_client.exe`)
- Config: both client and server use `.ini` files for env vars + quick behavior toggles
- Validation/launch: `start_server.bat` (server) and `launch_fom_with_log.bat` (client)

# IDA Pro
- IDA Pro is the active disassembler/decompiler for this repo.
- Keep IDB/I64 databases alongside the target binaries unless a project layout says otherwise.

# Codex MCP wiring
- Codex config: .codex\config.toml
- Ensure:
  - [features] rmcp_client = true
  - [mcp_servers.ida] url = "http://127.0.0.1:13337/mcp"
  - [mcp_servers.ida2] url = "http://127.0.0.1:13338/mcp"
  - [mcp_servers.ida3] url = "http://127.0.0.1:13339/mcp"
- Verify: `codex mcp list` and `/mcp` in Codex TUI.

# Git Integration (Always-On)
- Treat git as the default state tracker; run `git status -sb` before/after each work chunk and before reporting completion.
- Avoid redundant work: check `git log --oneline -n 5` (and open PRs/branches if relevant) before re-implementing.
- Keep deltas small: stage with `git add -p` or explicit paths; commit at logical checkpoints (<= 1–2 hours) with descriptive messages.
- Update `.gitignore` for generated artifacts (logs/builds) early; never delete user files; use `git rm` only with explicit request.
- When a remote exists, push at milestone end; never force-push unless explicitly asked.
- For risky changes, record the intended delta + rollback command in the working log entry.
