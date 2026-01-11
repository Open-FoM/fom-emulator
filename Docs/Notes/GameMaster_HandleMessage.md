# GameMaster_HandleMessage

## Overview
- Function: `GameMaster_HandleMessage`
- Address: `0x5F611200` (IDA2)
- Module: `object.lto` (GameMaster object code)
- Signature (decomp): `void __userpurge GameMaster_HandleMessage(GameMaster *self, HOBJECT sender, ILTMessage_Read *msg)`
- Dispatch: reads `msg->ReadBits(8)` and switches on msgId.
- Notes: Some cases cause server-side side effects (SQL file writes).

## Dispatch Map (msgId -> behavior)

| MsgId | Behavior | Key calls / notes |
|---|---|---|
| 0x66 | Local player fire/mining event | Reads 2 vec3 + rotation + flags, calls `CPlayerObj_HandleFireItemAndMining`. |
| 0x6F | Travel manager message | `TravelMgrSrv_OnMessage` (vortex/migration state machine). |
| 0x71 | Pending update id | If id==1 sets last update time, stores id on local player. |
| 0x72 | Shared mem flags A/B | Selector byte chooses `CPlayerObj_HandleSharedMemFlags_A/B`. |
| 0x73 | Activate target | `CPlayerObj_Command_ActivateTarget`. |
| 0x74 | Arrest target | `CPlayerObj_Command_ArrestTarget`. |
| 0x78 | Obj message list | Reads count, then 3x 64-byte chunks per entry, calls `SendObjMessage105_ToObjectsFromList`. |
| 0x79 | Local player vtbl+120 | Unknown effect (likely UI/behavior toggled on local player). |
| 0x7A | Set vortex active | Reads u8, calls `SharedMem_SetVortexActive`. |
| 0x7B | Activate vortex FX | Reads netId, finds character, calls `Actor_ActivateVortexFx`. |
| 0x7C | NPC counters init | `NPC_EnsureCountersInitialized`. |
| 0x7D | NPC counters reset | `NPC_ResetCounters`. |
| 0x80 | Update player flags/appearance | Subtype 1/2 alters flags and invokes dword_5F7847DC vtbl+84. |
| 0x8B | Handle attack | `CPlayerObj_HandleAttack`. |
| 0x8D | Update object string | Temporarily sets flag `0x200000`, updates object string via LTServer, then clears. |
| 0x90 | Vortex active update | Reads rotation, updates sharedmem vec4 index `120480`, plays sound id 39. |
| 0x91 | Play sound on target | Reads soundId + netId; plays on target or local player. |
| 0x93 | Pending update id fallback | If target missing but id nonzero, builds temp msg and dispatches. |
| 0x96 | GM utility subcommands | SQL dump paths; see subtable below. |
| 0x98 | Use target action | Worldservice/territory deploy based on template id (508/515). |
| 0x99 | Spawn selection | Aggregates `GameStartPoint*` lists, picks spawn point; rejects if within 250 units of player. |
| 0x9C | Territory props | Reads territory props for object list; uses `CNPC_ReadProps`. |
| 0x9E | GM packet type 20 | Builds `Packet_ID_GAMEMASTER` with target info (static/character/enemy). |
| 0x9F | GM packet type 21 | Builds `Packet_ID_GAMEMASTER` with target info (static/character/enemy). |
| default | Unknown | Logs "Server: Received Unknown message". |

## GM Utility Subcommands (msgId 0x96)

| SubId | Behavior | Output |
|---|---|---|
| 0x01 | World services export | Writes `world_{id}_worldservices.sql` to CWD. |
| 0x02 | Visibility areas export | Writes `world_{id}.sql` to CWD. |
| 0x03 | Mineral spawns export | Writes `world_{id}_minerals.sql` to CWD. |
| 0x04 | Alien spawners export | Writes `world_{id}_aliens.sql` to CWD. |

## Notable Constants / Side Effects
- SQL dumps write files in the process CWD (not the game data directory).
- Spawn selection rejects points within 250 units of the player.
- Temporary object flag used during 0x8D string update: `0x200000`.
- SharedMem vec4 index updated in 0x90: `120480`.
- Deploy path uses template ids: 508 (worldservice), 515 (territory).

## Unknowns / Follow-ups
- 0x79: vtbl+120 call on local player (needs IDA jump to vtbl).
- 0x80: meaning of subtype 1/2 and the flag mask produced.
- 0x90: exact semantics of vec4 index 120480 (likely vortex active FX state).

## Related Functions
- `TravelMgrSrv_OnMessage`
- `CPlayerObj_HandleFireItemAndMining`
- `CPlayerObj_HandleAttack`
- `Dispatch_ToMgrIfValid`
- `Packet_ID_GAMEMASTER_Ctor` / `Packet_WriteTypeF`

## Evidence
- Decompiled in IDA2 from `object.lto` at `0x5F611200`.
