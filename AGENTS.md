# FoM Reverse Engineering - AGENTS

# Purpose
- We are reverse engineering this game, which no longer exists, for research/preservation; legal concerns are explicitly disregarded by project scope.
- Primary focus: FoM/FoTD client behavior, network flow, packet formats, and hook points used for server redirection and custom code injection.
- Item/catalog reverse engineering is in scope; treat CRes.dll as the likely item/resource handler until verified.
- Treat FoM artifacts as baseline only; re-locate/verify in FoTD before reuse.
- Stay read-only first; only rename/add comments/types after validating with xrefs or decomp.

# Deep Context (read before IDA Pro work)
- Docs\Protocol\ (server setup/flow, packet formats, handler addresses)
- Protocol_AddressWatch_FoTD.md (FoM-derived anchors to relocate in FoTD)
- ServerEmulator_Findings.md (TS emulator analysis, reliability formats, known mismatches)
- Docs\Specs\FoTD_Emulator.md (emulator plan + architecture)
- Docs\Projects\FoTD_Emulator.md (milestones + decision log)
- Docs\Logs\FoTD_Emulator.md (active task checklist)
- ServerEmulator\ (emulator codebase to align with FoTD)
- AddressMap.md (FoM baseline hooks/signatures; leave unchanged; create AddressMap_FoTD.md for FoTD)
- catalog\ (CRes_*_items.csv / CRes_*_categories.csv item tables; derived from CRes.dll)
- FoTD\Resources\ (CRes.dll/CShell.dll live here; catalog + client resource handling)

# Catalog / Items
- Item tables live under catalog\ (CRes_*_items.csv, CRes_*_categories.csv).
- FoTD\Resources\CRes.dll is the suspected item/resource driver; confirm with strings/xrefs before renames.

# AddressMap
- On session start, open `AddressMap.md` in repo root and `AddressMap_FoTD.md` when working FoTD.
- For FoTD work, continuously map/record confirmed addresses in `AddressMap_FoTD.md` (keep `AddressMap.md` unchanged baseline).

# Targets (local paths)
- C:\FoM_Decompilation\FoTD\fom_client.exe
- C:\FoM_Decompilation\FoTD\server.dll
- C:\FoM_Decompilation\FoTD\Resources\CRes.dll
- C:\FoM_Decompilation\FoTD\Resources\CShell.dll
- C:\FoM_Decompilation\FoM\empire_rising.exe
- C:\FoM_Decompilation\FoM\d3d9.dll

# IDA Pro (current setup)
- IDA Pro is the active disassembler/decompiler for this repo.
- Keep IDB/I64 databases alongside the target binaries unless a project layout says otherwise.

# MCP Server (IDA Pro MCP)
- Start/enable the MCP server from IDA Pro's Plugins menu (search for "MCP" if the entry name differs).
- Streamable endpoint (default):
  - http://127.0.0.1:13337/mcp
- If the port changes, update the Codex config and verify the listener.

# Codex MCP wiring
- Codex config: C:\Users\arol_\.codex\config.toml
- Ensure:
  - [features] rmcp_client = true
  - [mcp_servers.ida] url = "http://127.0.0.1:13337/mcp"
- Verify: `codex mcp list` and `/mcp` in Codex TUI.

# Git Integration (Always-On)
- Treat git as the default state tracker; run `git status -sb` before/after each work chunk and before reporting completion.
- Avoid redundant work: check `git log --oneline -n 5` (and open PRs/branches if relevant) before re-implementing.
- Keep deltas small: stage with `git add -p` or explicit paths; commit at logical checkpoints (<= 1–2 hours) with descriptive messages.
- Update `.gitignore` for generated artifacts (logs/builds) early; never delete user files; use `git rm` only with explicit request.
- When a remote exists, push at milestone end; never force-push unless explicitly asked.
- For risky changes, record the intended delta + rollback command in the working log entry.
