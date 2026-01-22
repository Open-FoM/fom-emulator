# FoM Reverse Engineering - AGENTS

# Purpose
- We are reverse engineering this game, which no longer exists, for `research/preservation`; legal concerns are explicitly disregarded by project scope.
- Primary focus: `Client/Client_FoM` behavior, network flow, packet formats, and hook points used for server redirection and custom code injection.
- Item/catalog reverse engineering is in scope; treat `CRes.dll` as the likely item/resource handler until verified.
- Stay read-only first; only rename/add comments/types after validating with `xrefs` or decomp.

# Deep Context
- `Docs\Notes\` (protocol notes live here; server setup/flow, packet formats, handler addresses; start here)
- `Docs\Packets\` (canonical packet specs; use `PACKET_TEMPLATE.md` + `GamePackets/` for schema-first parsing)
- Protocol drill-downs live flat in `Docs\Notes\` (files: `LOGIN*.md`, `CShell_Gameplay_Packets.md`, `CUDPDriver.md`, `ClientNetworking.md`, `MSG_ID_*`).
- `Login_Request.md`, `Docs\Login_Request.md`, `Docs\Login_Request_*.md` (login handshake notes and captures; use newest dated file)
- `RakNet_LithTech_DeepDive.md` (RakNet/LithTech integration notes and assumptions)
- `Docs\Projects\Emulator.md` (milestones + decision log)
- `Docs\Logs\Emulator.md` (active task checklist; update with progress)
- `Server\apps\master\` (active server emulator)
- `Hook\` (DLL injector + hook points + packet decode/logging helpers)
- `Docs\Logs\FoM Reverse Engineering.md` (active RE task log for packet/layout work)
- `Docs/AddressMaps/AddressMap.md` (working FoM map; add confirmed addresses continuously)
- `catalog\` (`CRes_*_items.csv` / `CRes_*_categories.csv` item tables; derived from `CRes.dll`)
- `Docs\Notes\cvar_bind_table.csv` (console variable bindings)
- `Docs\Notes\huffman_freq_table.json`, `Docs\Notes\huffman_table_runtime.json` (string compression tables)
- `Client\Client_FoM\Resources\` (`CRes.dll`/`CShell.dll` live here; FoM client resource handling)

# Catalog / Items
- Item tables live under `catalog\` (`CRes_*_items.csv`, `CRes_*_categories.csv`).
- `Client\Client_FoM\Resources\CRes.dll` is the suspected item/resource driver; confirm with strings/`xrefs` before renames.

# String Encoding
- Treat decoded strings as null-terminated; clamp outgoing strings to `maxLen-1` before encoding (client decode paths often use 0x800 buffers).

# External References
- `External\LithTech\` (`LithTech` source used by the binaries; use for struct names, class layouts, and behavior baselines).
- `Server\packagers\networking\native\raknet` (`RakNet` 3.5 source used by the binaries; use for reliability, packet layout, and net layer flow).
- `Docs\External\LithTech\README.md` (Markdown API docs + guides for LithTech; start here for external reference context).
- `Server\packagers\networking\native\raknet` (RakNet 3.611 source root; start here for external reference context).

# AddressMap
- On session start, open `Docs/AddressMaps/AddressMap.md`.
- Continuously map/record confirmed addresses in `Docs/AddressMaps/AddressMap.md`.

# Targets
- `Client\Client_FoM\fom_client.exe` (FoM client binaries; see for the current executable filename)
- `Client\Client_FoM\Resources\CRes.dll` (resource/item tables and catalog helpers)
- `Client\Client_FoM\Resources\CShell.dll` (network bitstream parsing + packet read/write)

# Runtime Artifacts
- Server logs: `Server\apps\master\logs\` (authoritative emulator output)
- Client logs: repo root `fom_hook.log` (hook/injector output)
- Client dumps: `Client\Client_FoM\` (crash dumps for `fom_client.exe`)
- Config: both client and server use `.ini` files for env vars + quick behavior toggles
- Validation/launch: `start_server.bat` (server) and `launch_fom_with_log.bat` (client)

# PacketInspector ANSI Hex Highlighting
- Config: `PacketInspector\PacketInspector.ini` -> `[Logging] EmitAnsiConsole=1` and `HexDump=1`.
- Fallback (if ini not found): `Server\packages\networking\src\logging\PacketInspector.ts` uses `FomLogInitSimple` with `EmitAnsiConsole=1`.
- Legend (console only):
  - Magenta: outer ID byte (`payload[0]` before unwrap)
  - Green: inner ID / payload offset chosen by inspector
  - Red: scan-based ID hit (fallback evidence)
  - Cyan: timestamp bytes (ID_TIMESTAMP unwrap)
  - Blue: Lith inner ID within 0x86 or MSG_MESSAGE (0x0D)
  - Yellow: printable ASCII (existing hex dump highlight)
- File logs remain plain (no ANSI).

# Mandatory Read (Packet Parsing)
- Before any packet parsing or override work, read `Docs\RakNet_LithTech_Parse_Pipeline.md` and follow its MSB RakNet + LSB LithTech unwrapping rules.

# IDA Pro
- IDA Pro is the active disassembler/decompiler for this repo.
- Keep IDB/I64 databases alongside the target binaries unless a project layout says otherwise.

# Codex MCP wiring
- Codex config: .codex\config.toml
- Ensure:
  - [features] rmcp_client = true
  - [mcp_servers.ida1] url = "http://127.0.0.1:13337/mcp?ext=dbg" (enables dbg_* tools)
  - [mcp_servers.ida2] url = "http://127.0.0.1:13338/mcp?ext=dbg"
  - [mcp_servers.ida3] url = "http://127.0.0.1:13339/mcp?ext=dbg"
- Verify: `codex mcp list` and `/mcp` in Codex TUI.

# Debugger (IDA MCP)
- dbg_* tools are available when using `?ext=dbg` (start/attach, breakpoints, step/run, regs, memory).
- It is acceptable to run the server emulator locally and start/attach the client process from IDA for debugging.

# Git Integration (Always-On)
- Treat git as the default state tracker; run `git status -sb` before/after each work chunk and before reporting completion.
- Avoid redundant work: check `git log --oneline -n 5` (and open PRs/branches if relevant) before re-implementing.
- Keep deltas small: stage with `git add -p` or explicit paths; commit at logical checkpoints (<= 1–2 hours) with descriptive messages.
- Update `.gitignore` for generated artifacts (logs/builds) early; never delete user files; use `git rm` only with explicit request.
- When a remote exists, push at milestone end; never force-push unless explicitly asked.
- For risky changes, record the intended delta + rollback command in the working log entry.

# Sub-Agents
- `Hook\AGENTS.md` — C++ hook/proxy standards: Allman braces, PascalCase, Unreal-leaning conventions, detour safety, PacketInspector logging.
- `Server\AGENTS.md` — Server emulator standards: Bun/TypeScript conventions, packet handling patterns, logging rules.
- `ServerManager\AGENTS.md` — ServerManager tooling conventions and workflow specifics.
