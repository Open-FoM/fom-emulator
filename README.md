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
It includes a TypeScript server emulator (with native RakNet via FFI), a TypeScript client emulator,
hook tooling, and reverse-engineering notes/mappings. 

This work is being done to preserve Face of Mankind and to help keep its community alive. The goal is to give players the tools, 
documentation, and practical guidance they need to run their own Face of Mankind private servers with the least amount of friction. 
By making it possible for others easily to spin up servers, test changes, and share improvements, the project supports long-term preservation 
and puts the game’s future in the hands of the community, we’ll also be using this project to further explore AI-driven development.

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
World-only test client:
```bat
start_client_world.bat
```

### 3) Real FoM Client (Steam -> Client/Client_FoM/)
Download **Fall of the Dominion** from Steam, then place the install into:
```
Client\Client_FoM\
```
Expected contents include the FoM client EXE + resources (the real game install layout).

To point the client at the emulator, place `master.cfg` and `fom_public.key` **beside the game EXE**.
`master.cfg` controls the master server IP/port (default here: `127.0.0.1:61000`).

To run the game client with hook logging:
```bat
launch_fom_with_log.bat
```

### 4) DInput8 Proxy Hook (real client)
The hook uses a **dinput8.dll proxy** placed beside the game EXE:

How it works (short):
- `Client\Client_FoM\dinput8.dll` is loaded first by the game (DLL search order).
- The proxy loads the real system `dinput8.dll` and forwards exports.
- On `DLL_PROCESS_ATTACH`, it starts the hook thread (`HookAttach`) that installs detours/logging.

This proxy is optional and is used for logging + code injection.

Build + deploy:
```bat
build_hook.bat
```
This builds `Hook\Build\<Config>\dinput8.dll` and auto-copies it to `Client\Client_FoM\`.
If you need to adjust logging/filters, edit `Client\Client_FoM\fom_hook.ini`.
Then launch:
```bat
launch_fom_with_log.bat
```

## Emulator Status (as of 2026-01-06)

**Works / in place**
- Master + world server processes boot and accept connections (`start_server.bat` + `start_world.bat`).
- Large portions of the client are deobfuscated.
- The full login handshake is solved through world connect: `0x6C -> 0x6D -> 0x6E -> 0x6F`, then `0x72 -> 0x73`. The client emulator follows this chain and auto-connects to world.
- World side accepts `0x72` and sends initial LithTech SMSGs (`NETPROTOCOLVERSION`/`YOURID`/`CLIENTOBJECTID`/`LOADWORLD`), parses `CMSG_CONNECTSTAGE` (`0x09`), and emits a minimal spawn + periodic `SMSG_UNGUARANTEEDUPDATE` heartbeats.
- Client emulator mirrors `fom_client` packet cadence for automated testing/validation and keeps a dedicated world connection/log.
- AddressMap coverage is deep: LithTech handler table + `SMSG_UPDATE`/`SMSG_PACKETGROUP` layouts and many CShell packet reads are mapped.
- Spawn path is mapped in `Docs/AddressMaps/AddressMap.md` (SMSG_UPDATE GroupObjUpdate -> `Update_ReadObjectDefBlock` -> `World_AddObjectFromUpdate`/`CreateObjectFromDef`, plus CF_* flags like `MODELINFO`/`RENDERINFO`/`ATTACHMENTS`/`DIMS`).
- RSA key swap is in place so the emulator can decrypt login blobs (`Client/Client_FoM/fom_public.key` must match `Server/apps/master/src/fom_private_key.json`).

<img width="1296" height="746" alt="image" src="https://github.com/user-attachments/assets/c7b53c71-b748-494b-b099-6985f450fc72" />

## Repo Layout

- `Server/`  
  Server implementations under `Server/apps/*` (e.g., `apps/master`, `apps/world`).

- `Server/apps/master/`  
  TypeScript server emulator (master + world) using native RakNet via Bun FFI.  
  Logs: `Server\apps\master\logs\`

- `Client/Client_TS/`  
  TypeScript client emulator for packet validation + fast iteration.  
  Logs: `Client\Client_TS\logs\`

- `Hook/`  
  DInput8 proxy hook + packet logging helpers.  
  Build: `build_hook.bat`

- `Docs/`  
  Reverse-engineering notes, packet layouts, and project logs.
  - `Docs/Notes/` protocol + packet notes
  - `Docs/Logs/` work logs / checklists
  - `Docs/Projects/` milestones & decisions

- `External/`  
  Reference **source code trees** (LithTech / RakNet 3.611) used for struct naming, message layout, and behavior baselines.

- `Docs/AddressMaps/AddressMap.md`  
  Canonical address map of named symbols and findings.

- `Client/Client_FoM/*.i64` (IDA databases)  
  IDA Pro 9.2 databases for `fom_client.exe`, `CShell.dll`, and `CRes.dll`. Open the `.i64` beside the matching binary to get all renames, types, and comments.

- `Scripts/`  
  Helper scripts for local tooling (may be project-specific).

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
- Bun (used by `Server/apps/master` and `Server/apps/world`)
- Node.js + npm (used by `Client/Client_TS`)
- `IDA Professional 9.2` for reverse-engineering (see `AGENTS.md` for MCP wiring)

## Notes

- Hook output: `fom_hook.log` in `Client\Client_FoM\` (or next to the DLL if `LogPath` is relative).
- Client/Server logs are the primary validation surface for packet parity.
- Most of `Client\Client_FoM\` is **intentionally ignored** by git (game install assets). Tracked exceptions are limited to `fom_hook.ini`, `fom_public.key`, `master.cfg`, `OpenAL32.dll`, and IDA databases (`*.i64`, `*.idb`).
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
  - `External/LithTech/` and `Server/packagers/networking/native/raknet` (full source trees for context)
  - `Docs/External/LithTech/README.md`
  - `Server/packagers/networking/native/raknet`
