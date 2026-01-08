# ID_REGISTER_CLIENT (0x78)

## Summary
- Direction: client -> world
- Purpose: register client on world (prelude to world login data reply)
- Transport: RakNet payload decoded by `VariableSizedPacket`/BitStream; dispatched via game-message path (Object.lto)

## On-wire encoding (source of truth)
```
ID_REGISTER_CLIENT (0x78)
u8  msgId   = 0x78
u8c worldId
u32c playerId
u32c slot6
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| worldId | u8 | compressed bits | Written from SharedMem index 0 (world id gate). |
| playerId | u32 | compressed | SharedMem[0x5B] (playerId). |
| slot6 | u32 | compressed | SharedMem slot 6 (written by `SendWorldDataCheck`). |

## Read/Write (decomp)
- Read: `Object.lto` @ `0x10078CC0` (`Packet_Read_U8_U32_U32`)
- Write: `Object.lto` @ `0x10078D20` (`Packet_Write_U8_U32_U32`)
- Ctor: `Object.lto` @ `0x100782B0` (`Packet_ID_REGISTER_CLIENT_Ctor`, msgId=0x78)

## IDA Anchors
- ida3:
  - `Packet_ID_REGISTER_CLIENT_Ctor` `0x100782B0`
  - `Packet_Read_U8_U32_U32` `0x10078CC0`
  - `Packet_Write_U8_U32_U32` `0x10078D20`
  - `RegisterClientOnWorld` `0x100795EE`

## Validation
- ida3: verified 01/08/26 (decompile)

## Notes / Edge Cases
- Send path: `RegisterClientOnWorld` sets SharedMem[0x90]=2, fills fields from SharedMem, then sends via `Dispatch_ToMgrIfValid(pkt, 2, 1, 3, 0)`.
- Response: 0x79 `WORLD_LOGIN_DATA` is the matching return packet in Object.lto (ctor `Packet_ID_WORLD_LOGIN_DATA_Ctor` @ `0x1007A850` sets msgId=0x79 and uses vftable labeled `Packet_ID_REGISTER_CLIENT_RETURN`) and is handled in `DispatchGameMsg` case 121.
