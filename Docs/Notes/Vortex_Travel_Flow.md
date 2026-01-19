# Vortex Travel & Ticket Flow

## Overview (packet sequence)

Vortex gate travel (mid-game world transition):
CLIENT                                     WORLD SERVER                    MASTER SERVER
   |                                             |                               |
   |-- 0x7B VORTEX_GATE (subId=1) -------------->|                               |
   |     (collision request; playerId)           |                               |
   |                                             |-- validate ticket/world ---->|
   |                                             |                               |
   |<-- 0x6B NOTIFY (subId=0xE1/0xE2) -----------|                               |
   |     (missing ticket / world offline)        |                               |
   |                                             |                               |
   |<-- 0x7B WORLD_SELECT (subId=4) -------------|                               |
   |     (worldId/worldInst)                     |                               |
   |                                             |                               |
   |-- 0x72 WORLD_LOGIN ------------------------>|------------------------------>|
   |<-- 0x73 WORLD_LOGIN_RETURN (ip:port) -------|<------------------------------|
   |                                             |                               |
   |-- [RakNet Connect] ----------------------->|                               |
   |<-- [RakNet Accept] ------------------------|                               |
   |-- 0x72 WORLD_LOGIN ----------------------->|                               |
   |<-- LithTech burst (NO 0x73) ----------------|                               |

Vortex ticket purchase (terminal UI):
CLIENT                                     WORLD SERVER
   |                                             |
   |-- [WorldService request] ------------------>|  (TODO: identify packet + subId)
   |                                             |
   |<-- 0x6B NOTIFY (subId=0xE3) ----------------|  success (sound + UI)
   |<-- 0x6B NOTIFY (subId=0xE4) ----------------|  failure / prisoner restriction

World select UI travel (menu -> world):
CLIENT                                     WORLD SERVER
   |                                             |
   |-- 0x7B WORLD_SELECT (subId=5) ------------->|  request list
   |<-- 0x7B WORLD_SELECT (subId=6) -------------|  world list payload
   |-- UI pick world + node ---------------------|
   |-- 0x7B WORLD_SELECT (subId=7) ------------->|  optA=worldId, optB=nodeId
   |<-- 0x7B WORLD_SELECT (subId=4) -------------|  worldId/worldInst -> login

## Key findings (latest)

- **0x7B is bidirectional**:
  - Client -> World: **Vortex gate collision request** (subId=1).
  - World -> Client: **World select** (subId=4/6) + optional payloads.
- **0x7B is RakNet-direct** (no LithTech wrapper).
- **SubId=4** triggers world login state machine (same as Login_Flow).
- **SubId=7** is the **client->world travel request** (optA=worldId, optB=nodeId); server->client subId=7 is ignored by CShell.
- **SubId=5** is the **client->world list request** (no payload).
- **SubId=2** uses ItemsAdded payload (Struct44List); **not** a skill tree list.
- **SubId=6** carries the world-select UI payload list.
- **Crash caveat**: 0x7B subId=4 can crash on pure client if `g_pLTServer` is NULL.
- **World class + node names**:
  - world names: CRes strings 3100+ (e.g., 3101 "NYC - Manhattan")
  - world class labels: 3140+ (SAFEZONE, CLASS I..V)
  - world description: 3200+ (long world blurbs)
  - node list: 3249 "Default Node", 3247 "Random Node", 3250 + (20*worldId) + (node-1)

## Client-side trigger: vortex gate collision

Object.lto:
- `VortexVolume_OnMessage_Client` @ `0x10084390`
  - On msgId=3 (touch) builds Packet_ID_VORTEX_GATE
  - Sets `playerId` and `subId=1`
  - Calls `Packet_ID_VORTEX_GATE_Write` and dispatches
- `Packet_ID_VORTEX_GATE_Write` @ `0x10082CB0`
- `Packet_ID_VORTEX_GATE_Read` @ `0x10084240`

This is the **only confirmed client-side travel request** path so far.

## 0x7B Packet (Vortex Gate / World Select)

Header layout (Object.lto + CShell):
- `+0x430` `playerId` (u32c)
- `+0x434` `subId` (u8c)
- `+0x435/+0x436` `optA/optB` (u8c each)
- `+0x438` `sub2_list` (Struct44List / ItemsAdded)
- `+0x45C` `sub3_u32` (u32c)
- `+0x460` `sub6_list` (Struct60List / world-select UI)

SubId payloads:
- `1`: no payload (vortex collision request)
- `2`: ItemsAdded list (CShell `ItemList_Read`)
- `3`: u32c + u8c + u8c (parsed, no handler side effects observed)
- `4`: `worldId` + `worldInst` (world->client travel response; triggers login)
- `5`: no payload (client->world list request)
- `6`: world-select UI list (world->client)
- `7`: `worldId` + `nodeId` (client->world travel request; nodeId 0=Default, 25=Random, 1..N=explicit)

## CShell handler: 0x7B world select

`HandlePacket_ID_WORLD_SELECT_7B` @ `0x65899270`:
- Validates `playerId` vs `g_pPlayerStats[0x5B]`
- `subId=4`: writes SharedMem `[0x1EEC1]=worldId`, `[0x1EEC2]=worldInst`, `[0x1EEC0]=1`
- `subId=6`: routes to `WorldSelect_HandleSubId6Payload` (window id 49)
- All other subIds (2/3/7/etc): **ignored** (handler returns success, no action)

See `Docs/Notes/Login_Flow.md` for the full state machine (0x72/0x73 and RakNet connect).

## Client send path: world select UI -> 0x7B

- `CWindowWorldSelect_OnCommand` @ `0x65877290`
  - case 5: sends **subId=5** (list request; playerId only)
  - case 9: sends **subId=7** (worldId + nodeId)
- `Packet_ID_WORLD_SELECT_Write` @ `0x65805D80`
- `RelationsUI_PopulateLevelDropdown` @ `0x65875DC0` (builds node list)

## SubId 6 payload (world-select UI list)

Parsing path:
- `Packet_ID_7B_ReadSubId6List` @ `0x6596F2E0`
- `WorldSelect_HandleSubId6Payload` @ `0x65877A40`
- UI helpers: `RelationsUI_BuildSkillModifiers` @ `0x65875430`, `RelationsUI_DrawConnectionLines` @ `0x658758C0`

Top-level list:
```
u8c entryCount
Sub6Entry entries[entryCount]   // each entry = 60 bytes
u32c field16
u32c field20
u32c field24
```
Notes:
- `field16/field20/field24` are copied into world-select UI state.
  - `field20` is used in the travel cost formula (passed into `sub_6596B470`).
  - `field16/field24` remain unused in CShell UI paths.

Sub6Entry layout (size 60 bytes):
**Stack layout from `Packet_ID_7B_ReadSubId6List` indicates:**
```
0x00 u8   key             // used for world lookup; also read as classId for UI
0x04 u32  mask_inv         // read, then inverted (~mask); usage unknown
0x08 u16  raw_u16          // read as direct bits
0x0C u16c comp_u16         // read via ReadCompressed
0x10 ListB (Packet_ID_FACTION listB entry)
0x24 ListC (Packet_ID_FACTION listC entry)
```
Notes:
- `key` is the lookup field for `Array60_FindByType` **and** is used by UI as a classId (0=SAFEZONE, 1..5=CLASS I..V). Verify live packet values if this ever diverges.
- `mask_inv` / `raw_u16` / `comp_u16` are **parsed but unused** by CShell UI paths.
- `ListB` drives **skill modifier UI**.
- `ListC` drives **faction relation %** gating.

Sub6Entry-derived UI tables:
- `byte_659E2954[60 * worldId]` is treated as **classId** and feeds:
  - class label (string id 3140 + classId)
  - travel fee tier table (classId -> {5000,10000,15000,20000,25000})
- `dword_659E2970[15 * worldId]` is treated as **nodeCount** (for node list UI).

ListB entry (`Packet_ID_FACTION_read_listB_entry` @ `0x657A9680`):
- `u8 key`
- `u32 count`
- `Struct88[]` (size 88 each; uses nested list of 52-byte entries)
- Used by `RelationsUI_BuildSkillModifiers` to populate UI widgets and % values.

ListC entry (`Packet_ID_FACTION_read_listC_entry` @ `0x657A6390`):
- `u8 key`
- `u32 field20`
- `u32 count`
- `pair<u32,u32>[]` (8 bytes each)
- Used by `Relations_CalcFactionPercent` to compute ratio of entries matching player faction id.

Travel gating in UI:
- `Relations_CalcFactionPercent((entry+36), playerFactionId) >= 0.75` => UI marks world as accessible.
- Otherwise uses `Travel_FindPathExists(currentWorldId, targetWorldId, stat5, blockedList)`.

## Ticket errors + UI notifications (0x6B / Packet_ID_NOTIFY_107)

Packet dispatcher:
- `Packet_Id107_DispatchSubId` @ `0x658A3550`
  - Note: switch uses `subId-1` (IDA case numbers are off by one).

Vortex-related subIds:
- `0xE1` (225): **Missing ticket**
  - Uses CRes string `5543` with param string **"Vortex Ticket"** (itemId 30985).
  - UI message path; calls `SharedMem_ReadDword_this` and `TravelMgr_HandleAction` in the branch.
  - Code region around `0x658A4C2B`.
- `0xE2` (226): **World offline**
  - Uses CRes string `5544`.
  - Code region around `0x658A4D2D`.
- `0xE3` (227): **Ticket purchased**
  - Uses CRes string `4421` (audio + UI).
- `0xE4` (228): **Purchase failed / prisoner restriction**
  - Uses CRes string `5545` (and `5681` for prisoner-specific message).
  - Uses `PlayerStats_GetStatValue` to choose 5681 vs 5545.
  - Code region around `0x658A58CD`.

These are **server->client notifications** only; they do not initiate travel by themselves.

## Travel state machine touchpoints (Object.lto)

- `TravelMgrSrv_OnMessage` @ `0x10079E10`
  - Handles object msg 111 (state machine / vortex travel).
- `Tick_VortexActiveState` @ `0x10079960`
  - Vortex travel state machine.
- **Crash risk**: `UpdateVortexActiveFx` / `Actor_ActivateVortexFx` deref `g_pLTServer`.

## Open questions / TODOs

- Identify the **ticket purchase request** packet (client -> world server).
  - Likely a WorldService/terminal command; suspect CShell `CWindowTerminalVortex`.
- Locate **server-side ticket validation** and item consumption logic.
- Decode `subId=3` payload (u32c + u8c + u8c) and map its semantics.
- Confirm `Sub6Entry.key` vs classId if server ever diverges from current UI assumptions.
