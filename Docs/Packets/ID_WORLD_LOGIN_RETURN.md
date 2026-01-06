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
- Code==8 schedules retry; other codes display UI error.
