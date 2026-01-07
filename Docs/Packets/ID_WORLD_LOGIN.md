# ID_WORLD_LOGIN (0x72)

## Summary
- Direction: client -> master
- Purpose: finalize world login after `ID_WORLD_LOGIN_RETURN` (world address/slot selection)

## On-wire encoding (source of truth)
```
ID_WORLD_LOGIN (0x72)
u8c  worldId
u8c  worldInst
u32c playerId
u32c worldConst (= 0x13BC52)
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| worldId | u8 | compressed bits | `BitStream_WriteBitsCompressed(8)` |
| worldInst | u8 | compressed bits | `BitStream_WriteBitsCompressed(8)` |
| playerId | u32 | compressed | `BitStream_Write_u32c` |
| worldConst | u32 | compressed | Constant 0x13BC52 |

## Read/Write (decomp)
- Write: `CShell.dll` @ `0x658C09F0`
- Ctor: `CShell.dll` @ `0x658BFE00`

## IDA Anchors
- ida: n/a
- ida2: `Packet_ID_WORLD_LOGIN_Write` `0x658C09F0`, `Packet_ID_WORLD_LOGIN_Ctor` `0x658BFE00`

## Validation
- ida: n/a
- ida2: verified 01/05/26 (decompile)

## Notes / Edge Cases
- Built and sent by `WorldLogin_StateMachineTick` when SharedMem[0x1EEC0]==1.
- Tick sets SharedMem[0x1EEC0]=2 before send; fields sourced from SharedMem[0x1EEC1/0x1EEC2] and `g_pPlayerStats[0x5B]`.
- Send path uses `LTClient_SendPacket_BuildIfNeeded(pkt, 1, 1, 3, 0)` (queued if not yet connected).
