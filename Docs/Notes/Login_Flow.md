# Login Flow (Client <-> Master <-> World)

## Overview (packet sequence)

CLIENT (fom_client.exe + CShell)          MASTER (ServerEmulator)             WORLD (world server)
-----------------------------------------------------------------------------------------------
[UI] Login_OnSubmit
  -> build 0x6C LOGIN_REQUEST (user + token)  ------------------------------>
                                                     validate / parse
  <------------------------------- 0x6D LOGIN_REQUEST_RETURN (session_str w/ world=IP:PORT)

ClientNetworking_HandleLoginRequestReturn_6D
  -> build 0x6E LOGIN (auth packet; session_str + client fields) ---------->
                                                     validate / route
  <------------------------------- 0x7B WORLD_SELECT (type=4 worldId/worldInst)
  <------------------------------- 0x6B Packet_Id107 subId (world select alt path)
  <------------------------------- 0x73 WORLD_LOGIN_RETURN (code + worldIp + worldPort)

CShell HandlePacket_ID_WORLD_LOGIN_RETURN_73
  -> WorldLoginReturn_HandleAddress(worldIp:port)
  -> g_LTClient->Connect(world addr)  (CShell)
  -> rejects unassigned address (SystemAddress == 0xFFFFFFFFFFFF) with UI message 1722

fom_client World_Connect
  -> RakPeer::Connect(host, port, "37eG87Ph", 8, 0, 7, 500, 0, 0)  (RakNet handshake)

CShell WorldLogin_StateMachineTick
  -> build/send 0x72 WORLD_LOGIN (worldId, worldInst, playerId, worldConst) ------->

World (post-connect) begins LithTech SMSG stream:
  - SMSG_NETPROTOCOLVERSION (ID 4, expects version==7)
  - SMSG_YOURID (ID 12) / SMSG_CLIENTOBJECTID (ID 7)
  - SMSG_LOADWORLD (ID 6) then SMSG_UPDATE / SMSG_MESSAGE / SMSG_PACKETGROUP
    - client sends MSG_ID 0x09 (CMSG_CONNECTSTAGE) with stage=0 after loadworld

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
- CShell.dll (alternate path via 0x6B):
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
- In emulator traces, 0x73 arrives from master immediately after 0x6D/0x6E; treat it as the world-connect instruction.

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
- 0x1EEC0: world login state gate
- 0x1EEC1: worldId
- 0x1EEC2: worldInst
- 0x54: apartment login gate (bool)
- 0x78: apartmentId selector (1..24)
- 0x74: apartment flag set to 1 before load
