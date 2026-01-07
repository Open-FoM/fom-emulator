# FoM MMO Server Engineering Plan (High‑End, Scalable, Current‑Tools)

## Scope & Constraints
- Scope: Master + World emulation for FoM client to login, enter world, move, and receive core updates.
- Protocol constraints: RakNet 3.611 + LithTech message layout; strict bit-length accounting.
- Current tools: Node/TS server emulator, BitStream/PacketHandler, IDA‑derived packet layouts, local assets only.

## Goals
- Correctness: exact client‑expected packet structure (bit lengths, ordering, ids).
- Scalability: per‑connection budgets, interest management, prioritized replication.
- Extensibility: leave room for DB auth, shard routing, and full gameplay state.

## System Architecture (Layered)
1) Transport & Reliability
   - RakNet datagram parsing (existing).
   - Reliable wrappers for guaranteed flows.
   - ACK handling + connection lifecycle.
2) Session/Auth
   - Master: 0x6C/0x6D/0x6E, 0x7B world select, 0x73 world login return.
   - World: 0x72 world login accept; binds to worldId/worldInst.
   - Shard assignment (apartment inst) via worldInst allocator.
3) World Runtime
   - Authoritative simulation loop (fixed tick, e.g., 20–30 Hz).
   - Replication loop (10–20 Hz) decoupled from sim; budgeted per client.
4) Replication Layer (LithTech‑style)
   - Guaranteed: spawns/despawns/critical state via SMSG_UPDATE, SMSG_MESSAGE.
   - Unguaranteed: movement/rotation via SMSG_UNGUARANTEEDUPDATE.
   - Packet grouping: SMSG_PACKETGROUP for multiple SMSGs in one datagram.
5) Interest Management (AOI)
   - Spatial grid/quadtree; per‑client visible set.
   - Enter/exit AOI triggers construct/destruct packets.

## Protocol‑Accurate Flow (World Side)
- On 0x72 WORLD_LOGIN:
  1) SMSG_NETPROTOCOLVERSION (ID 4, version=7)
  2) SMSG_YOURID (ID 12)
  3) SMSG_CLIENTOBJECTID (ID 7)
  4) SMSG_LOADWORLD (ID 6: float gameTime + u16 worldId)
  5) Expect MSG_ID 0x09 (CONNECTSTAGE=0) from client; accept/log.
- Then send:
  - Spawn packet (SMSG_UPDATE w/ CF_NEWOBJECT + POSITION + ROTATION + MODELINFO + RENDERINFO)
  - Heartbeat tick: SMSG_UNGUARANTEEDUPDATE w/ movement deltas and 0xFFFF terminator + time

## Data Model (Server)
- WorldState
  - Object registry (id -> object)
  - Player registry (playerId -> object)
  - AOI index (cell -> object ids)
- ConnectionState
  - Auth phase, worldId/worldInst, last sent seq, per‑client budget
  - Visible set + dirty queues

## Replication Strategy
- Per‑object dirty flags (pos/rot/model/render/attachments/etc).
- Per‑connection update budget (bytes/tick) with prioritization:
  - High: local player, nearby entities
  - Mid: mid‑range NPCs/players
  - Low: far objects
- Send construction on AOI entry; send destruction on exit.
- Drop low‑priority deltas when budget exceeded.

## Implementation Phases
Phase 1 – Correctness Path (MVP)
- Ensure 0x7B world select + 0x73 world login return are sent.
- Implement world initial SMSGs (4/12/7/6) + CONNECTSTAGE handler.
- Implement minimal spawn packet and periodic unguaranteed updates.

Phase 2 – Scalability
- Add AOI grid and per‑connection budgeted replication loop.
- Packet grouping for multiple SMSGs per tick.
- Distinguish guaranteed vs unguaranteed channels.

Phase 3 – Gameplay Expansion
- Add inventory, equipment, combat state via MSG groups.
- Introduce DB‑backed auth, persistent world state.
- Expand world instancing and sharding policies.

## Engineering Details (Aligned to Client Code)
- SMSG_UPDATE: **per-block bit length** (u32) + updateFlags (u8 or u16 if lo8 & 0x80).  
  - If updateFlags != 0: read u16 objectId then UpdateHandle_GroupObjUpdate(objectId, updateFlags).  
  - If updateFlags == 0: read groupTag u8 (0/1/3) -> Group0/Group1/Group3.  
  - Client validates consumed bits == bitlen; mismatch => LT_INVALIDSERVERPACKET (44).
- SMSG_UNGUARANTEEDUPDATE: loop of (u16 objectId + 4-bit flags); if objectId==0xFFFF then read float gameTime and end.  
  - flags: 0x4 position(+optional velocity), 0x8 alt-rot, 0x2 compressed quat, 0x1 modelinfo.
- World select (0x7B):
  - subId=4 payload: [u32c playerId, u8c worldId, u8c worldInst]. If playerId matches, client sets SharedMem[0x1EEC1/0x1EEC2], sets 0x1EEC0=1 (triggers 0x72 send).
  - subId=6 payload: list block used by world-select UI (count + per-entry fields; see AddressMap 0x1026F2E0).
- World login request (0x72) fields are fixed: u8c worldId, u8c worldInst, u32c playerId, u32c worldConst=0x13BC52.

## Hard Limits / Protocol Constraints
- SMSG_PACKETGROUP submessage length is **u8 bits** (bit-count, not bytes) and includes the submessage ID. Max 255 bits (~31.875 bytes).
- SMSG_UPDATE uses declared bit length; any mismatch triggers LT_INVALIDSERVERPACKET.
- Object IDs are u16 (0xFFFF terminator) ⇒ max object id = 65534.
- worldId/worldInst are u8 in 0x7B ⇒ 0–255 only.
- RakNet MTU ~ 0x578 (client config) ⇒ keep datagrams under ~1400 bytes; avoid fragmentation unless implemented.
- Movement should stay in unguaranteed updates; reliable resend queues will choke under high‑rate movement.

## Scaling Hooks
- World instance routing via worldInst and port map.
- Shard assignment policy (least‑loaded, sticky per player).
- Future: multi‑process shards, shared state via message bus.

## Validation
- Client log should show world connect + loadworld + spawn + movement updates.
- Packet logs: exact formats match fom_client expectations (bit lengths/ids).
- Regression: replay hooks from fom_hook.log to validate byte‑level similarity.
