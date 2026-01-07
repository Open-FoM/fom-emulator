# ID_CONNECTION_REQUEST (0x04)

## Summary
- Direction: client -> server
- Purpose: RakNet connection request (offline handshake)

## On-wire encoding (source of truth)
```
ID_CONNECTION_REQUEST (0x04)
u8   msgId          = 0x04
u8[16] offlineId    = OFFLINE_MESSAGE_DATA_ID (FF 00 FF 00 FE FE FE FE FD FD FD FD 12 34 56 78)
u8[16] rakNetGuid   = RakNetGUID (client)
bytes password      = optional, raw bytes (length = outgoingPasswordLength)
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| offlineId | u8[16] | raw | Constant per RakNet 3.611 |
| rakNetGuid | u8[16] | raw | From client |
| password | bytes | raw | `RakPeer::Connect` password |

## Read/Write (decomp)
- Write: RakNet 3.611 `RakPeer::Connect` send path (`Server\\packagers\\networking\\native\\raknet\\src\\RakPeer.cpp`)
- Read: RakNet 3.611 `ParseConnectionRequestPacket`

## IDA Anchors
- ida: pending (RakNet in `fom_client.exe` not yet mapped)
- ida2: n/a

## Validation
- ida: pending
- ida2: n/a
- Source of truth: `Server\\packagers\\networking\\native\\raknet\\src\\RakPeer.cpp`

## Notes / Edge Cases
- In FoM, world connect uses password `37eG87Ph`.
