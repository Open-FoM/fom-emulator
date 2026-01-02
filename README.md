# Face of Mankind Reverse Engineering Toolkit

## Disclaimer (Read First)

This repo is intentionally **AI-first** and currently **messy**. Most notes, labels, and mappings are
raw captures or machine-generated scaffolding meant to be queried, clustered, and sanity-checked with
an AI assistant. Expect gaps, contradictions, and unverified assumptions.

Many addresses, packet layouts, symbol names, and flow notes are provisional and **likely wrong** in
places. Treat everything here as hypotheses until confirmed in IDA, logs, or live behavior. If you are
reading this without AI support, plan on extra friction and double-check every claim.

This is not a definitive server/client emulator. Treat it as a **starting point** and feel free to
fork, modify, and rework it to fit your own goals.

## Overview

This repo is a working reverse-engineering + emulation sandbox for **Face of Mankind** (FoM).
It includes a TypeScript server emulator, a TypeScript client emulator, hook/inject tooling, and
reverse-engineering notes/mappings.

## Quick Start

### 1) Server Emulator (master + world)
From repo root:
```bat
start_server.bat
```
Optional world server:
```bat
start_world.bat
```

### 2) Client Emulator (test client)
From repo root:
```bat
start_client.bat
```
World‑only test client:
```bat
start_client_world.bat
```

### 3) Real FoM Client (Steam -> Client/)
Place the **Fall of the Dominion** Steam install into:
```
Client\
```
Expected contents include the FoM client EXE + resources (the real game install layout).

To run the game client with hook logging:
```bat
launch_fom_with_log.bat
```


### 4) DInput8 Proxy Hook (real client)
The hook uses a **dinput8.dll proxy** placed beside the game EXE:

How it works (short):
- `Client\dinput8.dll` is loaded first by the game (DLL search order).
- The proxy loads the real system `dinput8.dll` and forwards exports.
- On `DLL_PROCESS_ATTACH`, it starts the hook thread (`HookAttach`) that installs detours/logging.

Build + deploy:
```bat
build_hookinjector.bat
```
This builds `dinput8.dll` in the repo root. Copy it (and the config) into the game folder:
```bat
copy dinput8.dll Client\
copy Client\fom_hook.ini Client\
```
Then launch:
```bat
launch_fom_with_log.bat
```

## Emulator Status (as of 2026-01-02)

**Works / in place**
- Master + world server processes boot and accept connections (`start_server.bat` + `start_world.bat`).
- Login chain is mapped end-to-end: `0x6C -> 0x6D -> 0x6E -> 0x7B -> 0x72 -> 0x73`. Master emits `0x7B` and waits for `0x72` before sending `0x73`; the client emulator follows this chain and auto-connects to world.
- World side accepts `0x72` and sends initial LithTech SMSGs (`NETPROTOCOLVERSION`/`YOURID`/`CLIENTOBJECTID`/`LOADWORLD`), parses `CMSG_CONNECTSTAGE` (`0x09`), and emits a minimal spawn + periodic `SMSG_UNGUARANTEEDUPDATE` heartbeats.
- Client emulator mirrors `fom_client` packet cadence for automated testing/validation and keeps a dedicated world connection/log.
- AddressMap coverage is deep: LithTech handler table + `SMSG_UPDATE`/`SMSG_PACKETGROUP` layouts and many CShell packet reads are mapped.
- Spawn path is mapped in `AddressMap.md` (SMSG_UPDATE GroupObjUpdate -> `Update_ReadObjectDefBlock` -> `World_AddObjectFromUpdate`/`CreateObjectFromDef`, plus CF_* flags like `MODELINFO`/`RENDERINFO`/`ATTACHMENTS`/`DIMS`).
- RSA key swap is in place so the emulator can decrypt login blobs (`Client/fom_public.key` must match `ServerEmulator/fom_private_key.env`).

**Not yet / fragile**
- Real-client login still needs full `0x6C` + `0x6E` auth handling. If login is bypassed, the world-connect path can be exercised, but the full auth chain is not robust.
- Protocol framing alignment is still in progress (MSB/LSB boundaries, compressed ints, default ports); expect occasional bit/length mismatches.
- Visible-character spawn is still incomplete in the emulator: we need a proper `SMSG_UPDATE` object-update with `CF_NEWOBJECT` + `POSITION` + `ROTATION` + `MODELINFO` + `RENDERINFO` (and likely `FLAGS`/`SCALE`/`ATTACHMENTS`/`DIMS`) plus a valid object-def block (objType + file-id lists / sub-block) and model-info delta list.
- Connection-accept handling is still being tuned (legacy `0x0E` wrapper/reliable peer seeding).


## Repo Layout

- `ServerEmulator/`  
  TypeScript server emulator (master + world).  
  Logs: `ServerEmulator\logs\`

- `ClientEmulator/`  
  TypeScript client emulator for packet validation + fast iteration.  
  Logs: `ClientEmulator\logs\`

- `HookInjector/`  
  DInput8 proxy hook + packet logging helpers.  
  Build: `build_hookinjector.bat`

- `Docs/`  
  Reverse-engineering notes, packet layouts, and project logs.
  - `Docs/Notes/` protocol + packet notes
  - `Docs/Logs/` work logs / checklists
  - `Docs/Projects/` milestones & decisions

- `External/`  
  Reference **source code trees** (LithTech / RakNet 3.5) used for struct naming, message layout, and behavior baselines.

- `AddressMap.md`  
  Canonical address map of named symbols and findings.

- `Client/*.i64` (IDA databases)  
  IDA Pro databases for `fom_client.exe`, `CShell.dll`, and `CRes.dll`. Open the `.i64` beside the matching binary to get all renames, types, and comments.

## Common Tasks

### Run server emulator in world mode
```bat
start_server.bat -mode world -port 62000
```

### Run client emulator with a login delay (seconds)
```bat
start_client.bat -mode open -host 127.0.0.1 -port 61000 -login=3
```

### Run world test client with explicit IDs
```bat
start_client_world.bat -host 127.0.0.1 -port 62000 -world-id 1 -world-inst 1 -world-player 1
```

## Requirements

- Windows (batch scripts are provided)
- Node.js + npm (used by `ServerEmulator` and `ClientEmulator`)
- IDA Pro for reverse‑engineering (see `AGENTS.md` for MCP wiring)

## Notes

- Hook output: `fom_hook.log` in `Client\` (or next to the DLL if `LogPath` is relative).
- Client/Server logs are the primary validation surface for packet parity.
- See `Docs/Notes/Login_Flow.md` and `Docs/Notes/ClientNetworking.md` for flow diagrams.

## Docs Tour (high‑signal starting points)

- **Protocol & login flow**
  - `Docs/Notes/LOGIN*.md` (newest dated file first)
  - `Docs/Notes/Login_Flow.md`
  - `Docs/Notes/ClientNetworking.md`
  - `Docs/Notes/CUDPDriver.md`
  - `Docs/Notes/CShell_Gameplay_Packets.md`
  - `Docs/Notes/MSG_ID_*`
  - `Docs/Notes/BitOrder.md`
  - `Docs/Notes/PacketContracts.md`

- **Project tracking**
  - `Docs/Projects/Emulator.md` (milestones + decisions)
  - `Docs/Logs/Emulator.md` (current state + validation history)

- **Architecture & replication**
  - `Docs/Notes/Server_MMO_Engineering_Plan.md` (master/world architecture + replication strategy)
  - `Docs/Notes/Server_Movement_Net.md` (movement cadence + unguaranteed update details)
  - `Docs/RakNet_LithTech_DeepDive.md` (integration quirks + security offsets)

- **Tables & compression**
  - `Docs/Notes/cvar_bind_table.csv`
  - `Docs/Notes/huffman_freq_table.json`
  - `Docs/Notes/huffman_table_runtime.json`

- **External references**
  - `External/LithTech/` and `External/RakNet3.5/` (full source trees for context)
  - `Docs/External/LithTech/README.md`
  - `Docs/External/RakNet3.5/README.md`
