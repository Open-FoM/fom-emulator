# ID_WORLD_LOGIN_RETURN (0x73)

## Summary
- Direction: server -> client
- Purpose: instruct client which world address to connect to

## On-wire encoding (source of truth)
```
ID_WORLD_LOGIN_RETURN (0x73)
u8c  code
u8c  flag
u32c worldIp
u16c worldPort
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| code | u8 | compressed | Login return status (1 = success) |
| flag | u8 | compressed | Typically 0xFF in ctor |
| worldIp | u32 | compressed | Encode 127.0.0.1 as 0x7F000001 |
| worldPort | u16 | compressed | |

## Read/Write (decomp)
- Read: `CShell.dll` @ `0x6588DDA0`
- Ctor: `CShell.dll` @ `0x6588C320`

## IDA Anchors
- ida: n/a
- ida2: `Packet_ID_WORLD_LOGIN_RETURN_Read` `0x6588DDA0`, `Packet_ID_WORLD_LOGIN_RETURN_Ctor` `0x6588C320`

## Validation
- ida: n/a
- ida2: verified 01/05/26 (decompile)

## Notes / Edge Cases
- On code==1, handler calls `WorldLoginReturn_HandleAddress` -> `g_LTClient->Connect`.
- `WorldLoginReturn_HandleAddress` rejects unassigned SystemAddress and shows msg 1722.
- `g_LTClient->Connect` nonzero return logs "Failed to connect to world!" (success appears to be 0).
- On success path, handler sets world login state `SharedMem[0x1EEC0]=2` (wait-for-connect).
- Code==8 schedules retry; other codes display UI error.

## Client UI Message Mapping (CRes strings)
| Code | Msg ID | Text |
|---|---|---|
| 2 | 1723 | World login failed: Server unavailable! |
| 3 | 1734 | This world is not available to your faction! |
| 4 | 1724 | World login failed: World is full! |
| 6 | 1735 | As your faction privileges have been revoked, access to this world is not granted to you at this moment! |
| 7 | 1739 | World outside the range of this world's Vortex Gate connection! |
