# ID_WORLD_SELECT (0x7B)

## Summary
- Direction: server -> client
- Purpose: world selection + payloads (items list, selection result, etc.)

## On-wire encoding (source of truth)
```
ID_WORLD_SELECT (0x7B)
u32c playerId
u8c  subId
switch (subId):
  2 -> ItemsAdded payload
  3 -> u32c + u8c + u8c
  4 -> u8c worldId + u8c worldInst
  5 -> (no extra)
  6 -> subId6 list payload
  7 -> u8c worldId + u8c worldInst
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| playerId | u32 | compressed | First field |
| subId | u8 | compressed | Dispatch type |
| worldId/worldInst | u8/u8 | compressed | subId 4 or 7 |

## Read/Write (decomp)
- Read: `CShell.dll` @ `0x65806590`
- Ctor: `CShell.dll` @ `0x658064C0`

## IDA Anchors
- ida: n/a
- ida2: `Packet_ID_7B_Read` `0x65806590`, `Packet_ID_7B_Ctor` `0x658064C0`

## Validation
- ida: n/a
- ida2: verified 01/05/26 (decompile)

## Notes / Edge Cases
- subId 4/7 sets SharedMem[0x1EEC1/0x1EEC2] and flips world login state=1.
