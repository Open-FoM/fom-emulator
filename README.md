# Face of Mankind Reverse Engineering Toolkit

This repo is a working reverse‑engineering + emulation sandbox for **Face of Mankind** (FoM).
It includes a TypeScript server emulator, a TypeScript client emulator, hook/inject tooling, and
reverse‑engineering notes/mappings.

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
  Reverse‑engineering notes, packet layouts, and project logs.
  - `Docs/Notes/` protocol + packet notes
  - `Docs/Logs/` work logs / checklists
  - `Docs/Projects/` milestones & decisions

- `External/`  
  Reference source trees (LithTech / RakNet) used for struct naming and behavior baselines.

- `AddressMap.md`  
  Canonical address map of named symbols and findings.

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

- **Project tracking**
  - `Docs/Projects/Emulator.md` (milestones + decisions)

- **Tables & compression**
  - `Docs/Notes/cvar_bind_table.csv`
  - `Docs/Notes/huffman_freq_table.json`
  - `Docs/Notes/huffman_table_runtime.json`

- **External references**
  - `Docs/External/LithTech/README.md`
  - `Docs/External/RakNet3.5/README.md`
