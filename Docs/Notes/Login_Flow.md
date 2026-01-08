# Login Flow (Client <-> Master <-> World)

## Overview (packet sequence)

CLIENT (fom_client.exe + CShell)          MASTER (Server)             WORLD (world server)
-----------------------------------------------------------------------------------------------
[UI] Login_OnSubmit
  -> build 0x6C LOGIN_REQUEST (user + token)  ------------------------------>
                                                     validate / parse
  <------------------------------- 0x6D LOGIN_REQUEST_RETURN (session_str w/ world=IP:PORT)

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

  PATH B: Server-triggered via 0x7B (requires LithTech wrapping)
  ---------------------------------------------------------------
  <------------------------------- 0x7B WORLD_SELECT (subId=4, worldId, worldInst)
    -> sets SharedMem[0x1EEC1] = worldId
    -> sets SharedMem[0x1EEC2] = worldInst
    -> sets SharedMem[0x1EEC0] = 1
    -> shows "Connecting..." UI (message 11)

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

## CRITICAL: 0x7B Crash Issue (SOLVED)

Sending 0x7B directly via RakNet crashes the client!

The crash occurs in VariableSizedPacket::Read (0x6570c6c0) which expects:
- a2+0x24 (36): payload length
- a2+0x2C (44): pointer to payload data

This structure is only present when packets come through the LithTech message layer
(wrapped in ID_USER 0x86 + LtGuaranteedPacket). Raw RakNet packets lack this wrapper.

### Solution: Send 0x7B via MSG_MESSAGE (MSG_ID 13)

The server must wrap 0x7B inside the LithTech message layer:

1. Create 0x7B payload (excluding packet ID byte)
2. Wrap in MsgMessage (MSG_ID 13) which adds the packet ID back
3. Wrap in LtGuaranteedPacket with sequence number
4. Wrap in IdUserPacket (0x86)
5. Send via RakNet reliable

```typescript
const worldSelectPacket = IdWorldSelectPacket.createWorldSelect(playerId, worldId, worldInst);
const worldSelectPayload = worldSelectPacket.encode().subarray(1); // Remove 0x7B byte

const msgMessage = MsgMessage.wrap(RakNetMessageId.ID_WORLD_SELECT, worldSelectPayload);
const lithPacket = LtGuaranteedPacket.fromMessages(seq, [msgMessage]);
const wrapped = IdUserPacket.wrap(lithPacket).encode();
sendReliable(wrapped, address);
```

This routes through:
1. Client receives ID_USER (0x86)
2. LithTech parses LtGuaranteedPacket
3. MSG_MESSAGE (ID 13) handler (`OnMessagePacket` @ 0x00426F50) parses payload
4. Builds MessagePacket wrapper with payload ptr at +0x2C, length at +0x24
5. Calls IClientShell_Default vtbl+0x58 → ClientShell_OnMessage_DispatchPacketId
6. Dispatcher routes 0x7B to HandlePacket_ID_WORLD_SELECT_7B
7. Handler sets SharedMem[0x1EEC1/0x1EEC2/0x1EEC0] (worldId/worldInst/state=1)

## CRITICAL: Version Without World Selection UI

Some versions of the client (e.g., Fall of the Dominion) do NOT have the world
selection starmap UI (menu state 3). In these versions:

1. 0x6F LOGIN_RETURN sets SharedMem[0x54]=1 and tries to enter menu state 3
2. Without the UI, worldId/worldInst are never set (remain 0)
3. State machine sends 0x72 with worldId=0, worldInst=0
4. WorldLogin_StateTick sees SharedMem[0x54]=1 and sends 0x71 (logout)
5. Client disconnects

To support these versions, the server MUST send 0x7B with proper LithTech wrapping
to set worldId/worldInst before the state machine runs, OR find an alternative
trigger mechanism

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
- CShell.dll (alternate path via Packet_Id107, unconfirmed):
  - Packet_Id107_DispatchSubId @ 0x101A3550
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

### 0x6C LOGIN_REQUEST (client -> master, fom_client)
Fields (high level):
- Huffman-compressed username string
- u16 token (raw u16 written by client)
- (timestamp header optional, RakNet)

### 0x6D LOGIN_REQUEST_RETURN (master -> client, CShell)
Read order:
- u8c status
- session_str (LTClient read string, max 2048 bytes)

### 0x6E LOGIN (client -> master, fom_client)
Built in ClientNetworking_HandleLoginRequestReturn_6D:
- Huffman string: username (ClientNetworking +0x91)
- bounded string (max 64): sessionHashHex (MD5 hex chain from HandleLoginRequestReturn_6D)
- u32 x3: clientInfoU32[3] (std::vector<uint32_t> from ClientNetworking +0x59C)
- Huffman string: macAddress ("xx-xx-xx-xx-xx-xx", GetAdaptersInfo)
- 4x pairs: bounded string(64) + bounded string(32) [currently empty in build path]
- bounded string (max 64): hostName (ClientNetworking +0x111)
- Huffman string: computerName (GetComputerNameA, 32 bytes)
- blobFlag bit; if set: 0x400 blob bytes (ClientNetworking +0x191) + u32 blobU32 (ClientNetworking +0x594)

### 0x72 WORLD_LOGIN (client -> world, CShell)
Write order:
- u8c worldId
- u8c worldInst
- u32c playerId
- u32c worldConst (= 0x13BC52)

### 0x7B WORLD_SELECT (server -> client, CShell)
Read order:
- u32c playerId
- u8c  subId (type)
Type-specific payload:
- subId=2 -> ItemsAdded payload (inventory list)
- subId=3 -> u32c + u8c + u8c
- subId=4 -> u8c worldId, u8c worldInst (triggers SharedMem[0x1EEC1/0x1EEC2] + state=1)
- subId=5 -> no extra
- subId=6 -> list payload at +0x460 (Packet_ID_7B_ReadSubId6List); routed to WorldSelect_HandleSubId6Payload
- subId=7 -> u8c worldId, u8c worldInst

### 0x73 WORLD_LOGIN_RETURN (server -> client, CShell)
Read order:
- u8c code
- u8c flag
- u32c worldIp
- u16c worldPort
Code handling (HandlePacket_ID_WORLD_LOGIN_RETURN_73):
- code==1: LoginUI_SetMessageText(1725, "D2D2D200"), then WorldLoginReturn_HandleAddress(worldIp, worldPort).
- code in {2,3,4,6,7}: LoginUI_SetMessageText(1723/1734/1724/1735/1739, "FF000000"), then LoginUI_ShowMessage(5).
- code==8: schedules retry (WorldLoginReturn_ScheduleRetry now+5s).
- default: LoginUI_SetMessageText(1722, "FF000000") + logs unknown return code.
Notes:
- worldIp is read as u32c from big-endian bitstream; encode IP as 0x7F000001 for 127.0.0.1.
- Emulator note: current master implementation sends 0x73 only after receiving 0x72 (world login), not immediately after 0x6E/0x7B.

## World login state machine (CShell WorldLogin_StateMachineTick)
SharedMem[0x1EEC0] values:
- 0: idle
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

## 0x7B Packet Structure Requirements

The 0x7B packet handler (HandlePacket_ID_WORLD_SELECT_7B @ 0x65899270) receives a LithTech
message wrapper structure, NOT raw packet data:

```
LithTech Message Wrapper (passed as 'payload' to handler):
  +0x00: vtable pointer
  +0x08: message type
  +0x24 (36): payload length (DWORD)
  +0x2C (44): pointer to payload data (void*)
  ...
```

The packet reader VariableSizedPacket::Read (@ 0x6570c6c0) does:
```c
BitStream_InitFromBuffer(v5, *(void**)(a2 + 44), *(DWORD*)(a2 + 36), 0);
```

This expects the wrapper structure. Raw RakNet packet data does NOT have this layout,
which causes a crash when trying to dereference invalid pointers.

To send 0x7B properly, it must go through the LithTech guaranteed message layer,
wrapped in ID_USER (0x86). Implementation requires understanding how LithTech 
messages encapsulate RakNet-style packet IDs (not typical MSG_* IDs)
