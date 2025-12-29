# Packet_ID_LOGIN

## Overview

General login packet (distinct from LOGIN_REQUEST). Exact purpose TBD.

## Packet ID

- RakNet ID: TBD
- Direction: TBD

## RTTI Class

```
.?AVPacket_ID_LOGIN@@
```

Address in .rdata: `0x006E3E68`

## Structure

```c
struct Packet_ID_LOGIN {
    // Structure TBD - needs more reverse engineering
};
```

## Notes

- Separate from `Packet_ID_LOGIN_REQUEST`
- May be used for world server authentication or session validation
- Needs further investigation

## TODO

- [ ] Find handler function
- [ ] Determine packet structure
- [ ] Identify when this packet is used vs LOGIN_REQUEST

---

*Last updated: December 27, 2025*
