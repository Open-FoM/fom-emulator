# Login Flow (Client <-> Master <-> World)

## Overview (packet sequence)
CLIENT              MASTER SERVER           WORLD SERVER
   |                      |                       |
   |-- 0x6C LOGIN_REQ --->|                       |
   |<-- 0x6D LOGIN_RET ---|                       |
   |-- 0x6E LOGIN ------->|                       |
   |<-- 0x6F LOGIN_RET ---|                       |
   |-- 0x72 WORLD_LOGIN ->|                       |
   |<-- 0x73 (IP:Port) ---|                       |
   |                      |                       |
   |-- [RakNet Connect] ----------------------->|
   |<-- [RakNet Accept] ------------------------|
   |-- 0x72 WORLD_LOGIN ----------------------->|
   |<-- LithTech Burst (NO 0x73!) --------------|

CLIENT                                     WORLD SERVER
   |                                             |
   |-- [RakNet Connect w/ password] ----------->|
   |<-- [RakNet Accept] ------------------------|
   |                                             |
   |-- 0x72 WORLD_LOGIN ----------------------->|
   |                                             |
   |<-- LithTech Burst (SMSG_PACKETGROUP) ------|
   |       SMSG_NETPROTOCOLVERSION (4)           |
   |       SMSG_YOURID (12)                      |
   |       SMSG_CLIENTOBJECTID (7)               |
   |       SMSG_LOADWORLD (6)                    |
   |                                             |
   |-- MSG_ID 0x09 CONNECTSTAGE=0 ------------->|
   |                                             |
   |<-- SMSG_UPDATE (8) spawn packet -----------|
   |       GroupObjUpdate w/ CF_NEWOBJECT        |
   |       + POSITION + ROTATION + MODELINFO     |
   |                                             |
   |<-- SMSG_UNGUARANTEEDUPDATE (10) heartbeat -|
   |       (periodic, 10-20 Hz)                  |

ClientNetworking_HandleLoginRequestReturn_6D
  -> build 0x6E LOGIN (auth packet; session_str + client fields) ---------->
                                                     validate / route
  <------------------------------- 0x6F LOGIN_RETURN (status + playerId + apartment data)

HandlePacket_ID_LOGIN_RETURN (CShell)
  -> sets SharedMem[0x5B] = playerId
  -> if status==SUCCESS and hasCharacter:
       -> sets SharedMem[0x54] = 1 (triggers logout check in old flow)
       -> enters GameStateMgr menu state 3 (world selection UI)
  -> if noCharacter: enters menu state 2 (character creation)

WORLD SELECTION (two paths):

  PATH A: UI-driven (original game with world selection starmap)
  ---------------------------------------------------------------
  [User clicks world in UI]
    -> sets SharedMem[0x1EEC1] = worldId
    -> sets SharedMem[0x1EEC2] = worldInst
    -> sets SharedMem[0x1EEC0] = 1 (triggers state machine)

  PATH B: Server-triggered via 0x7B 
  ---------------------------------------------------------------------
  <------------------------------- 0x7B WORLD_SELECT (subId=4, worldId, worldInst)
    -> sets SharedMem[0x1EEC1] = worldId
    -> sets SharedMem[0x1EEC2] = worldInst
    -> sets SharedMem[0x1EEC0] = 1
    -> shows "Connecting..." UI (message 11)

### RESOLVED (2026-01-10): Auto 0x7B after 0x79 causes forced leave

Symptom:
- Client loads into world, then "Migrating servers..." and leaves ~2s later.
- Client sends 0x74 WORLD_LOGOUT shortly after entering world.

Root cause:
- World server sent 0x7B WORLD_SELECT immediately after 0x79 REGISTER_CLIENT_RETURN.
- 0x7B subId=4 triggers the travel state machine in object.lto.
- TravelMgr receives msgId 111 (0x6F) with msgType=0 stateId=11, which arms a 2s timer
  and then calls LeaveWorld.

Evidence (client hook):
- OnMessagePacket bytes: 0D 6F 00 00 00 00 0B 00 00 00 ...
  -> msgId=0x6F (111), msgType=0, stateId=11
- Hook logs: [TravelMgr] msgType=0 stateId=11

Fix:
- Do not send 0x7B during initial login.
- Reserve 0x7B for explicit travel requests only.

STATE MACHINE (WorldLogin_StateMachineTick, state==1):
  -> builds 0x72 WORLD_LOGIN (worldId, worldInst, playerId, worldConst)
  -> sends to master  ----------------------------------------------------->
                                                     validates, looks up world
  <------------------------------- 0x73 WORLD_LOGIN_RETURN (code=1, worldIp, worldPort)

HandlePacket_ID_WORLD_LOGIN_RETURN_73 (CShell)
  -> WorldLoginReturn_HandleAddress(worldIp:port)
  -> g_LTClient->ConnectToWorld(addr)  (vtbl+0x18)
  -> sets SharedMem[0x1EEC0] = 2

STATE MACHINE (state==2):
  -> waits for g_LTClient->IsConnected()
  -> when connected: sets state = 3

STATE MACHINE (state==3):
  -> loads world assets from SharedMem[0x1EEC1] (worldId)
  -> clears SharedMem[0x1EEC0/1/2]

fom_client World_Connect
  -> RakPeer::Connect(host, port, "37eG87Ph", 8, 0, 7, 500, 0, 0)  (RakNet handshake)

World (post-connect) begins LithTech SMSG stream:
  - SMSG_NETPROTOCOLVERSION (ID 4, expects version==7)
  - SMSG_YOURID (ID 12) / SMSG_CLIENTOBJECTID (ID 7)
  - SMSG_LOADWORLD (ID 6) then SMSG_UPDATE / SMSG_MESSAGE / SMSG_PACKETGROUP
    - client sends MSG_ID 0x09 (CMSG_CONNECTSTAGE) with stage=0 after loadworld

## 0x7B Packet Handling (CONFIRMED)

**0x7B WORLD_SELECT is sent directly via RakNet - NO LithTech wrapping required.**

The packet is handled by `HandlePacket_ID_WORLD_SELECT_7B` @ CShell 0x65899270, which:
1. Reads playerId (u32c) and validates against g_pPlayerStats[0x5B]
2. Reads subId (u8c) and dispatches based on type
3. For subId=4: Sets worldId/worldInst/state and triggers world login

### Known Crash: 0x7B SubId=4 triggers g_pLTServer NULL dereference

**DO NOT SEND 0x7B SubId=4** - it crashes the client on pure client mode.

When 0x7B SubId=4 is received:
1. CShell sets SharedMem[0x1EEC1] = worldId and SharedMem[0x1EEC0] = 1
2. State machine enters state=3 (load world assets)
3. World loading triggers Object.lto code that dereferences g_pLTServer
4. g_pLTServer is NULL on pure client → **CRASH**

#### Why g_pLTServer is NULL

`g_pLTServer` is set in `ObjectDLLSetup` @ 0x10001304:
```c
g_pLTServer = pLTServer;  // Passed by LithTech engine on DLL load
```

On a **dedicated client** (connecting to remote server, no local server running), the engine
calls `ObjectDLLSetup` with `pLTServer = NULL` because there's no server instance.

#### Affected Functions (Object.lto)
| VA | Function | Crash Risk |
|----|----------|------------|
| 0x10013c90 | UpdateVortexActiveFx | HIGH - direct g_pLTServer deref |
| 0x10015240 | Actor_ActivateVortexFx | HIGH - calls UpdateVortexActiveFx |
| 0x10030420 | Play_VortexActive_Periodic | HIGH - direct g_pLTServer deref |
| 0x10079960 | Tick_VortexActiveState | HIGH - cases 8,9,11,13 crash |

See `Docs/AddressMaps/AddressMap_Object_lto.md` for full mapping.

## SOLVED: worldId must be set via LOGIN_RETURN (0x6F)

The worldId is set through the `defaultWorldId` field (offset 0x8E0) in the LOGIN_RETURN packet:

1. **Master sends 0x6F LOGIN_RETURN** with `defaultWorldId` field set (e.g., 1)
2. `HandlePacket_ID_LOGIN_RETURN` @ 0x65896900 writes this to `SharedMem[1]`
3. Client enters menu state 3 (world selection UI)
4. **User clicks world in starmap** (or server triggers via other mechanism)
5. UI reads `SharedMem[1]` → writes to `SharedMem[0x1EEC1]` → sets `SharedMem[0x1EEC0]=1`
6. State machine sends 0x72 WORLD_LOGIN with valid worldId

**Key code path** (CShell @ 0x65896af6):
```asm
movzx   eax, [ebp+var_2B0]     ; defaultWorldId from packet offset 0x8E0
mov     ecx, g_pWorldMgr
push    eax
push    1                       ; SharedMem index 1
call    SharedMem_WriteDword_this
```

**Why 0x7B crashes**: The 0x7B WORLD_SELECT packet (SubId=4) is intended for **vortex travel** (mid-game world transitions), not initial login. It triggers Object.lto code that expects `g_pLTServer` to be valid.

## All World ID Write Paths (Comprehensive Analysis)

Only ONE packet can trigger world login - all other paths are UI-driven:

### Packet-Based (Server → Client)
| Packet | Handler | Action |
|--------|---------|--------|
| **0x7B SubId 4** | HandlePacket_ID_WORLD_SELECT_7B @ 0x65899270 | **ONLY** packet that sets worldId/worldInst and triggers login |
| 0x73 | HandlePacket_ID_WORLD_LOGIN_RETURN_73 @ 0x6588e340 | Sets state=2 (connecting) or state=1 (retry) |

### UI-Driven (No Packet - User Interaction)
| Class | Handler | Trigger | WorldId Source |
|-------|---------|---------|----------------|
| CWindowNodeSelection | 0x65822b50 | Starmap click (cmd=5) | SharedMem[1] from LOGIN_RETURN |
| CMenuPopup | 0x6578c3c0 | Menu select (cmd=7) | Field [esi+18EDh] |
| Unknown (Apartment) | 0x65805a50 | [esi+18E0h]==6 | Hardcoded worldId=4 |
| InputMgr | 0x658a3220 | Timer timeout | Hardcoded worldId=30 (auto-kick)

## Key call chain (addresses)

### 0x6C LOGIN_REQUEST (client -> master)
- fom_client.exe:
  - LoginButton_OnClick @ 0x0049D090
  - Packet_ID_LOGIN_REQUEST_Ctor @ 0x00499730
  - Packet_ID_LOGIN_REQUEST_WriteTokenU16 @ 0x0049B3A0
  - Packet_ID_LOGIN_REQUEST_Serialize @ 0x0049B720
  - SendPacket_LogMasterWorld @ 0x0049AF40

### 0x6D LOGIN_REQUEST_RETURN (master -> client)
- fom_client.exe:
  - ClientNetworking_DispatchPacket @ 0x0049D250 (routes 0x6D)
  - ClientNetworking_HandleLoginRequestReturn_6D @ 0x0049CA70 (builds 0x6E)
- CShell.dll (UI-only handler):
  - HandlePacket_ID_LOGIN_REQUEST_RETURN_6D @ 0x1018E1F0
  - Packet_ID_LOGIN_REQUEST_RETURN_Read @ 0x1018DCE0

## RakNet intake gate (client-side drop root cause)
Observed failure mode: client receives 0x6D on UDP but never reaches NetMgr/handler because
RakNet peer list is empty. Reliable frames from unknown peers are rejected before NetMgr.

### Client intake chain (fom_client.exe)
- recvfrom wrapper @ 0x009B5CF0
  - call recvfrom @ 0x009B5D03
  - call sub_9C41B0 @ 0x009B5D86 (passes buffer/len/address)
- sub_9C41B0 @ 0x009C41B0
  - calls sub_9C28A0 @ 0x009C4208
- sub_9C28A0 @ 0x009C28A0 (renamed RakNet_ProcessIncomingDatagram)
  - calls vtbl+0xA4 (addr 0x009BD380) to find peer by address
  - if AL==0, returns 0 and packet is dropped before NetMgr
  - peer list vector at this+0x674 (start/end/cap). When empty: start=end=cap=0.

### Evidence (live)
- Reliable 0x6D frame present in recv buffer:
  - byte[0]=0x40, byte[17]=0x6D (inner ID), byte[0x10] varies (a0/b0/c0/d0)
  - example: `40 00 00 00 03 45 68 ed c0 00 00 00 30 00 00 01 d0 6d ...`
- vtbl+0xA4 returns 0, peer list count=0 -> drop before NetMgr.

### Implication for server emulator
- Server currently sends ID_CONNECTION_REQUEST_ACCEPTED (0x0E) wrapped in reliable (0x40)
  when it receives ID_CONNECTION_REQUEST (0x04) inside a reliable frame.
- Client rejects that reliable 0x0E because the peer list is empty (catch-22).
- Fix: send **unwrapped 0x0E** for the reliable 0x04 case (or send both unwrapped + reliable)
  so the client registers the peer before accepting reliable 0x6D/0x7B/0x73.

### Where to watch in IDA
- NetMgr_GetPacketId @ 0x0043A580 (break on AL==0x6D)
- Packet_ID_LOGIN_REQUEST_RETURN_Read @ 0x0049B760
- ClientNetworking_HandleLoginRequestReturn_6D @ 0x0049CA70

### 0x6E LOGIN (client -> master)
- fom_client.exe:
  - Packet_ID_LOGIN_Ctor @ 0x0049C090
  - Packet_ID_LOGIN_Serialize @ 0x0049B820
  - SendPacket_LogMasterWorld @ 0x0049AF40

### World selection trigger (server -> client)
- CShell.dll:
  - HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270 (type=4 sets worldId/worldInst; sets SharedMem[0x1EEC0]=1)
  - Packet_ID_7B_Read @ 0x10106590
- CShell.dll (alternate path via Packet_ID_NOTIFY_107, unconfirmed):
  - Packet_ID_NOTIFY_107_DispatchSubId @ 0x101A3550
    - subId 231/270: worldId=4 (apartments) + SharedMem[0x77]/[0x78], set 0x1EEC0=1
    - subId 269: worldId=optA (non-apartment), set 0x1EEC0=1

### 0x73 WORLD_LOGIN_RETURN (master/world -> client)
- CShell.dll:
  - HandlePacket_ID_WORLD_LOGIN_RETURN_73 @ 0x1018E340
  - Packet_ID_WORLD_LOGIN_RETURN_Read @ 0x1018DDA0
  - WorldLoginReturn_HandleAddress @ 0x101C0D60 (calls g_LTClient->Connect)
  - WorldLoginReturn_ScheduleRetry @ 0x1018C570 (code==8)

### 0x7B WORLD_SELECT (master -> client)
- CShell.dll:
  - HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270
  - Packet_ID_7B_Read @ 0x10106590
  - Packet_ID_7B_Ctor @ 0x101064C0

### World connect (client -> world)
- fom_client.exe:
  - World_Connect @ 0x0049AB70 (RakPeer::Connect w/ "37eG87Ph")

### 0x72 WORLD_LOGIN (client -> world)
- CShell.dll:
  - WorldLogin_StateMachineTick @ 0x101C0E10 (builds + sends 0x72)
  - Packet_ID_WORLD_LOGIN_Ctor @ 0x101BFE00
  - Packet_ID_WORLD_LOGIN_Write @ 0x101C09F0
  - LTClient_SendPacket_BuildIfNeeded @ 0x1018D9C0 (send path)

## Packet layouts (summary)

### 0x6C LOGIN_REQUEST (client -> master)
- username (Huffman)
- u16 token
- optional timestamp header (RakNet)

### 0x6D LOGIN_REQUEST_RETURN (master -> client)
- u8c status
- session_str (LTClient read string, max 2048)

### 0x6E LOGIN (client -> master)
- username (Huffman)
- sessionHashHex (bounded string, max 64)
- clientInfoU32[3]
- macAddress (Huffman, "xx-xx-xx-xx-xx-xx")
- 4x pairs: bounded string(64) + bounded string(32)
- hostName (bounded string, max 64)
- computerName (Huffman, max 32)
- blobFlag bit; if set: 0x400 blob bytes + u32 blobU32

### 0x72 WORLD_LOGIN (client -> master/world)
- u8c worldId
- u8c worldInst
- u32c playerId
- u32c worldConst (= 0x13BC52)

### 0x7B WORLD_SELECT (master -> client)
Read order:
- u32c playerId
- u8c  subId
Type payload:
- subId=2 -> ItemsAdded payload
- subId=3 -> u32c + u8c + u8c
- subId=4 -> u8c worldId, u8c worldInst (sets SharedMem 0x1EEC1/0x1EEC2, state=1)
- subId=6 -> list payload (WorldSelect_HandleSubId6Payload)
- subId=7 -> u8c worldId, u8c worldInst

### 0x73 WORLD_LOGIN_RETURN (master -> client)
Read order:
- u8c code
- u8c flag
- u32c worldIp
- u16c worldPort
Code handling (CShell):
- code==1: UI msg 1725, then Connect(worldIp, worldPort)
- code in {2,3,4,6,7}: UI msg 1723/1734/1724/1735/1739, then ShowMessage(5)
- code==8: retry after 5s
- default: UI msg 1722
Note: encode IP as u32c big-endian (127.0.0.1 => 0x7F000001).

## World login state machine (CShell WorldLogin_StateMachineTick)
SharedMem[0x1EEC0] values:
- 1: pending send (wait until not connected, not blocked, and retry time elapsed)
- 2: waiting for g_LTClient->IsConnected() -> then set state=3
- 3: load world assets, then clear state and worldId/worldInst

Flow (state==1 path):
- if g_LTClient already connected, SharedMem_ReadBool_std(0x55) is true, or retryAtTime > now -> skip.
- else SharedMem_WriteWorldLoginState_0x1EEC0(2), build 0x72 WORLD_LOGIN:
  - playerId = SharedMem[0x5B]
  - worldId = SharedMem[0x1EEC1]
  - worldInst = SharedMem[0x1EEC2]
  - worldConst = 0x13BC52
  - send via LTClient_SendPacket_BuildIfNeeded
Load step (state==3 path):
- worldId == 4 -> WorldLogin_LoadApartmentWorld:
  - gated by SharedMem_ReadBool_std(0x54)
  - apartmentId = SharedMem[0x78] (1..24)
  - path = "worlds\\apartments\\" + g_ApartmentWorldTable[6*apartmentId]
  - display name = stringId (apartmentId + 10500)
- else -> path = "worlds\\" + g_WorldTable[15*worldId].folder
  - display name = g_WorldTable[15*worldId].display
- WorldLogin_LoadWorldFromPath writes SharedMem string index 19 = path, then calls g_pILTClient vtbl+0x144 (load world)

## World login state flags (SharedMem)
- 0x1EEC0: world login state gate (0=idle, 1=pending, 2=connecting, 3=loading)
- 0x1EEC1: worldId
- 0x1EEC2: worldInst
- 0x54: login complete flag (triggers logout in WorldLogin_StateTick if world not entered)
- 0x5A: no character flag
- 0x5B: playerId (set by 0x6F handler)
- 0x78: apartmentId selector (1..24)
- 0x74: apartment flag set to 1 before load

