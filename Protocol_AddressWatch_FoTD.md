# Protocol Address Watchlist (FoTD target)

Source: Docs\Protocol (FoM build notes). These VAs are **not validated** for FoTD; re-locate in FoTD via RTTI strings/xrefs.

## Server/Client Flow Anchors
- ClientNetworking_Init: 0x004DE220 (loads fom_public.key; creates RakPeers; MTU 1400)
- ClientNetworking_InitMasterConnection: 0x004E03C0 (connects to fom1.fomportal.com)
- ClientNetworking_HandleLoginResponse: 0x004DF570 (Packet_ID_LOGIN_REQUEST_RETURN)
- ClientNetworking_ConnectToWorld: 0x004DE5F0 (world connect)
- ClientNetworking_TryConnectWorld: 0x004DE710 (uses password 37eG87Ph)

## RTTI Strings (.rdata)
- .?AVPacket_ID_LOGIN_REQUEST@@ @ 0x006E3E10
- .?AVPacket_ID_LOGIN_REQUEST_RETURN@@ @ 0x006E3E38
- .?AVPacket_ID_LOGIN@@ @ 0x006E3E68
- .?AVClientNetworking@@ @ 0x006E3E88

## Message Handler Table
- g_MessageHandlers @ 0x006FAB50
- ID 12 handler (offset +0x30): 0x0049E690 (ID packet)
- ID 14 handler (offset +0x38): 0x004A0460 (MessageGroup)

## ID Packet State Offsets
- clientState+0x38 = client_id (u16)
- clientState+0x3A = flags (u8/bool)

## CUDPDriver Anchors
- JoinSession: 0x004B67B0
- HostSession: 0x004B7310
- HandleGuaranteedPacket: 0x004B2DB0
- SendUnguaranteed: 0x004AF640

## CUDPDriver Constants
- DEFAULT_PORT: 0x6CF0 (27888)
- CONNECTION_MAGIC: 0x9919D9C7
- SEQUENCE_MASK: 0x1FFF
- MAX_OUT_OF_ORDER: 8
- CONNECTION_TIMEOUT_MS: 10000
- RETRY_INTERVAL_MS: 300
