# ID_CONNECTION_REQUEST_ACCEPTED (0x0E)

## Summary
- Direction: server -> client
- Purpose: RakNet connection accept (promotes to CONNECTED)

## On-wire encoding (source of truth)
```
ID_CONNECTION_REQUEST_ACCEPTED (0x0E)
u8   msgId          = 0x0E
SystemAddress externalId
SystemIndex   systemIndex
SystemAddress internalIds[]  (count = sizeof(mySystemAddress)/sizeof(SystemAddress))
```

## Field Table
| Field | Type | Encoding | Notes |
|---|---|---|---|
| externalId | SystemAddress | raw | Server-reported external addr |
| systemIndex | SystemIndex | raw | |
| internalIds | SystemAddress[] | raw | Array length from RakNet |

## Read/Write (decomp)
- Write: RakNet 3.611 `SendConnectionRequestAccepted` (`Server\\packagers\\networking\\native\\raknet\\src\\RakPeer.cpp`)
- Read: RakNet 3.611 parse path (reads externalId + systemIndex + internalIds)

## IDA Anchors
- ida: parse path disasm around `0x004F63FE` (reads SystemAddress, then systemIndex, then internal IDs); connectMode=CONNECTED write at `0x004F6419`
- ida2: n/a

## Validation
- ida: partial 01/05/26 (disasm)
- ida2: n/a
- Source of truth: `Server\\packagers\\networking\\native\\raknet\\src\\RakPeer.cpp`

## Notes / Edge Cases
- Client connectMode flips to CONNECTED after acceptance.
