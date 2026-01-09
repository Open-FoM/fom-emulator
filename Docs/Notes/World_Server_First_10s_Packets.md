# World Server (Port 61015) - First 10 Seconds of Traffic

**Capture window**: 84.502s - 94.5s (relative to pcap start)
**Client port**: 59852
**Server port**: 61015

---

## RakNet Header Reference

| Header | Type | Description |
|--------|------|-------------|
| 0x01 | Raw | ID_PING / ID_OPEN_CONNECTION_REQUEST (offline) |
| 0x09 | Raw | ID_CONNECTION_REQUEST (secure handshake) |
| 0x0a | Raw | ID_CONNECTION_REQUEST_ACCEPTED |
| 0x1a | Raw | ID_OPEN_CONNECTION_REPLY / ID_PONG |
| 0x40 | Reliable | Reliable ordered packet (payload follows header) |
| 0x80 | ACK | Acknowledgment packet |

---

## Packet #1 - [0x01] ID_OPEN_CONNECTION_REQUEST | Client -> Server
**Frame 5623 @ 84.502313s**
RakNet offline ping / connection request broadcast (client probing multiple ports)
```
01 00 00 00 00 0d 53 98 b4 ff 00 ff 00 fe fe fe
fe fd fd fd fd 12 34 56 78
```

---

## Packet #2 - [0x1a] ID_OPEN_CONNECTION_REPLY | Server -> Client
**Frame 5632 @ 84.571664s**
RakNet offline pong / connection reply with server cookie
```
1a 00 00 00 00 d2 13 82 ea fc 47 df 10 a3 01 b0
1a 3c b0 41 94 2e 2a 4b 0f 62 02 bf 11 85 42 37
65 ff 00 ff 00 fe fe fe fe fd fd fd fd 12 34 56
78
```

---

## Packet #3 - [0x09] ID_CONNECTION_REQUEST | Client -> Server
**Frame 5638 @ 84.644325s**
RakNet secure connection request with client cookie + password hash
```
09 06 b1 c6 b3 08 10 97 50 69 fd 12 bc 37 3b 03
23 f1 80 2a 70 86 fc ca 4f 0f ff 00 ff 00 fe fe
fe fe fd fd fd fd 12 34 56 78 be 92 a2 85 ee 57
```

---

## Packet #4 - [0x0a] ID_CONNECTION_REQUEST_ACCEPTED | Server -> Client
**Frame 5640 @ 84.712177s**
RakNet connection accepted - handshake complete
```
0a ff 00 ff 00 fe fe fe fe fd fd fd fd 12 34 56
78 fc 47 df 10 a3 01 b0 1a 3c b0 41 94 2e 2a 4b
0f 62 02 bf 11 85 42 37 65 80 ff ff fe ee 49
```

---

## Packet #5 - [0x40][0x10] ID_NEW_INCOMING_CONNECTION | Client -> Server
**Frame 5641 @ 84.712280s**
RakNet reliable packet containing ID_NEW_INCOMING_CONNECTION (0x10)
```
40 00 00 00 03 54 e6 61 40 00 00 00 10 00 00 03
10 04 ff 00 ff 00 fe fe fe fe fd fd fd fd 12 34
                                          ^^ embedded 0x10 at offset ~14
56 78 b1 c6 b3 08 10 97 50 69 fd 12 bc 37 3b 03
23 f1 80 2a 70 86 fc ca 4f 0f 33 37 65 47 38 37
50 68
```

---

## Packet #6 - [0x80] ACK | Server -> Client
**Frame 5643 @ 84.777974s**
RakNet acknowledgment for client's reliable packet
```
80 00 00 00 69 09 c1 dd 80 00 80 00 60 00 00 00
00
```

---

## Packet #7 - [0x40][0x50] SMSG_PACKETGROUP (LithTech Burst) | Server -> Client
**Frame 5644 @ 84.813701s**
Server sends LithTech initial burst wrapped in SMSG_PACKETGROUP (0x50 = 80 decimal = SMSG_PACKETGROUP bit-shifted)
Contains: SMSG_NETPROTOCOLVERSION(4) + SMSG_YOURID(12) + SMSG_CLIENTOBJECTID(7) + SMSG_LOADWORLD(6)
```
40 00 00 00 34 84 e0 ee c0 00 00 00 10 00 00 04
50 0e 43 04 22 65 e9 cc 00 00 00 00 00 00 4a bc
^^ 0x50 shifted = SMSG_PACKETGROUP (ID 10 << 3)
00 00 00 00 4a bc 00 00 00 00 4a bc 00 00 00 00
4a bc 00 00 00 00 4a bc 00 00 00 00 4a bc 00 00
00 00 4a bc 00 00 00 00 4a bc 00 00 00 00 4a bc
00 00 00 00 4a bc
```

---

## Packet #8 - [0x80] ACK | Client -> Server
**Frame 5645 @ 84.813773s**
```
80 00 00 00 69 09 c1 dd 80 00 80 00 60 00 00 00
00
```

---

## Packet #9 - [0x40][0x21] CMSG_CONNECTSTAGE (0x09) | Client -> Server
**Frame 5646 @ 84.814079s**
Client sends MSG_CONNECTSTAGE (LithTech ID 0x09) with stage=0 after receiving LOADWORLD
The 0x21 = (0x09 << 2) | flags = CMSG with ID 9
```
40 00 00 00 03 54 e6 7a c0 00 00 00 58 00 00 00
00 00 00 00 21 80 11 be 92 a2 85 ee 57 53 ea 3f
            ^^ 0x21 >> 2 = 0x08, but this is bit-packed LithTech CMSG
fe e9 cc f5 ff ff fa e9 cc 00 00 00 00 ff ff 00
00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff
ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00
00 ff ff 00 00 00 00 ff ff 00 00 00 02 40 00 00
02 40 00 00 00 00 0d 53 99 eb
```

---

## Packet #10 - [0x40][0x90] ID_INTERNAL_PING | Client -> Server
**Frame 5647 @ 84.815593s**
RakNet internal ping for connection keepalive (0x90 >> 4 = 0x09 internal timing)
```
40 00 00 00 03 54 e6 7b 40 00 00 00 d0 00 00 00
90 00 00 00 00 00 0d 53 99 eb
```

---

## Packet #11 - [0x80] ACK + Pong | Server -> Client
**Frame 5648 @ 84.881582s**
RakNet ACK with embedded pong data
```
80 00 00 00 69 09 c2 11 00 00 80 00 80 00 00 00
20 00 00 00 50 00 00 00 10
```

---

## Packet #12 - [0x80] ACK | Server -> Client
**Frame 5649 @ 84.881582s**
```
80 00 00 00 69 09 c2 11 00 00 80 00 60 00 00 00
60
```

---

## Packet #13 - [0x40][0x10] ID_CONNECTED_PONG (Timing Sync) | Server -> Client
**Frame 5650 @ 84.911792s**
RakNet timing synchronization packet
```
40 00 00 00 34 84 e1 08 80 00 00 00 40 00 00 01
10 03 00 00 00 00 0d 53 99 eb 00 00 00 00 d2 13
84 22
```

---

## Packet #14 - [0x40][0x10] ID_CONNECTED_PONG (Duplicate) | Server -> Client
**Frame 5651 @ 84.911792s**
Duplicate/retransmit of timing sync
```
40 00 00 00 34 84 e1 08 80 00 00 00 80 00 00 01
10 03 00 00 00 00 0d 53 99 eb 00 00 00 00 d2 13
84 22
```

---

## Packet #15 - [0x40][0x77] ID_WORLD_LOGIN (0x72) Related? | Client -> Server
**Frame 5658 @ 85.098112s**
Possibly 0x72-related or custom game packet (0x77 in payload area)
```
40 00 00 00 03 54 e6 c1 c0 00 00 01 18 00 00 00
00 40 00 00 04 f0 77 a0 00 00 06 9c fd 6b 17 60
                  ^^ 0x77 visible in stream
```

---

## Packet #16 - [0x80] ACK | Server -> Client
**Frame 5661 @ 85.165321s**
```
80 00 00 00 69 09 c2 9e 80 00 80 00 60 00 00 00
80
```

---

## Packet #17 - [0x40][0x53] SMSG_UPDATE (0x08) Spawn Packet | Server -> Client
**Frame 5670 @ 85.312643s**
188-byte LithTech SMSG_UPDATE - player spawn with CF_NEWOBJECT
0x53 >> 3 = 0x0A (10) = SMSG_UNGUARANTEEDUPDATE or shifted SMSG_UPDATE (8)
```
40 00 00 00 34 84 e1 62 80 00 00 00 d8 00 00 00
00 00 00 00 53 00 78 a0 00 00 06 9e 38 00 00 c3
            ^^ LithTech message header
0c 30 0b 10 6d 2d 82 f7 10 00 80 00 00 00 00 00
00 00 00 00 00 00 00 7d 00 00 00 3b 70 00 00 1f
40 00 00 0f a0 00 00 9c 41 e1 e1 e1 e1 e0 00 00
00 01 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0
f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0
f0 f0 f0 f0 f0 f0 f0 f0 f0 c0 00 00 08 06 69 8a
81 ea cb 02 41 5e 1e 10 84 70 83 c3 08 42 10 42
08 78 43 c3 08 42 10 42 08 78 43 c3 08 42 10 42
08 78 43 c3 08 42 10 42 08 78 43 0c 30 00 78 78
78 78 46 34 ad 25 29 21 5a e8 28 1e
```

---

## Packet #18 - [0x40][0x09] Server Timing/State Message | Server -> Client
**Frame 5671 @ 85.312643s**
41-byte reliable packet - timing or state sync
```
40 00 00 00 34 84 e1 62 80 00 00 01 18 00 00 00
00 40 00 00 09 80 19 00 00 00 00 d2 13 85 8a 86
            ^^ 0x09 - possibly timing related
00 3f c6 44 00 05 02 55 00
```

---

## Packet #19 - [0x40][0x01] Minimal State Packet | Server -> Client
**Frame 5672 @ 85.312643s**
24-byte reliable packet
```
40 00 00 00 34 84 e1 62 c0 00 00 01 58 00 00 00
00 80 00 00 01 00 d3 60
            ^^ 0x01
```

---

## Packet #20 - [0x40][0x09] Game State Packet | Server -> Client
**Frame 5673 @ 85.312850s**
40-byte reliable packet with game state data
```
40 00 00 00 34 84 e1 63 40 00 00 01 98 00 00 00
00 c0 00 00 09 00 8a 98 44 00 00 07 d0 23 00 00
            ^^ 0x09
00 0a 09 40 00 00 03 20
```

---

## Packet #21 - [0x80] ACK (Multi-Range) | Client -> Server
**Frame 5674 @ 85.312862s**
ACK covering multiple sequence numbers
```
80 00 00 00 69 09 c2 c5 80 00 00 00 40 00 00 00
60 00 00 00 a0
```

---

## Packet #22 - [0x80] ACK | Client -> Server
**Frame 5675 @ 85.312880s**
```
80 00 00 00 69 09 c2 c6 80 00 00 00 60 00 00 00
c0
```

---

## Packet #23 - [0x40][0x10] CMSG_UNGUARANTEEDUPDATE (Player Position) | Client -> Server
**Frame 5680 @ 85.379102s**
55-byte client position/state update - sent at ~15-20 Hz
```
40 00 00 00 03 54 e7 08 00 00 00 01 58 80 00 00
00 00 00 00 10 50 7d 88 00 00 0d df c2 00 00 00
            ^^ 0x10 - player update message
03 4e 02 5c 7b f7 be 10 2c c0 00 00 00 00 00 00
00 00 01 68 03 20 80
```

---

## Packet #24 - [0x40][0x03] Server Acknowledgment/State | Server -> Client
**Frame 5682 @ 85.411629s**
29-byte reliable packet
```
40 00 00 00 34 84 e1 7b 40 00 00 01 d8 00 00 00
01 00 00 00 03 80 8a 88 88 00 00 00 0e
            ^^ 0x03
```

---

## Packet #25 - [0x80] ACK | Client -> Server
**Frame 5683 @ 85.411682s**
```
80 00 00 00 69 09 c2 f6 80 00 00 00 60 00 00 00
e0
```

---

## Packet #26 - [0x80] ACK | Server -> Client
**Frame 5687 @ 85.444070s**
```
80 00 00 00 69 09 c3 2a 00 00 80 00 60 00 00 00
a0
```

---

## Packet #27 - [0x40][0x10] CMSG_UNGUARANTEEDUPDATE | Client -> Server
**Frame 5691 @ 85.445360s**
55-byte player position update
```
40 00 00 00 03 54 e7 18 c0 00 00 01 98 80 00 00
00 40 00 00 10 50 7d 88 00 00 0d df c2 00 00 00
            ^^ 0x10
03 4e 02 5c 7b f7 be 10 2b 00 00 00 00 00 00 00
00 00 01 54 03 20 80
```

---

## Packet #28 - [0x80] ACK | Server -> Client
**Frame 5696 @ 85.510164s**
```
80 00 00 00 69 09 c3 4b 00 00 80 00 60 00 00 00
c0
```

---

## Packet #29-37 - [0x40][0x10] CMSG_UNGUARANTEEDUPDATE Stream | Client -> Server
**Frames 5697-5751 @ 85.5s-86.4s**
Continuous 55-byte player position updates at ~15-20 Hz

Example (Frame 5717 @ 85.710423s):
```
40 00 00 00 03 54 e7 5b 00 00 00 02 98 80 00 00
01 40 00 00 10 50 7d 88 00 00 0d df c2 00 00 00
            ^^ 0x10 - consistent player update ID
03 4e 02 5c 7b f7 be 10 27 c0 00 00 00 00 00 00
00 00 01 24 03 20 80
```

---

## Packet #38 - [0x40][0x08] Server State Update | Server -> Client
**Frame 5752 @ 86.413687s**
39-byte reliable packet with game state
```
40 00 00 00 34 84 e2 75 40 00 00 02 18 00 00 00
01 40 00 00 08 80 8a 9c 40 00 00 79 62 30 00 00
            ^^ 0x08
00 a0 94 00 00 00 32
```

---

## Packet #39 - [0x80] ACK | Client -> Server
**Frame 5753 @ 86.413756s**
```
80 00 00 00 69 09 c4 ea 80 00 00 00 60 00 00 01
00
```

---

## Packet #40 - [0x80] ACK | Server -> Client
**Frame 5756 @ 86.444972s**
```
80 00 00 00 69 09 c5 1e 00 00 80 00 60 00 00 01
60
```

---

## Packet #41 - [0x40][0x03] Server State Update | Server -> Client
**Frame 5825 @ 87.412809s**
29-byte reliable packet
```
40 00 00 00 34 84 e3 6f 80 00 00 02 58 00 00 00
01 80 00 00 03 80 8a 8c 40 00 00 7b e0
            ^^ 0x03
```

---

## Packet #42 - [0x40][0x03] Server State Update | Server -> Client
**Frame 5846 @ 88.416075s**
29-byte reliable packet
```
40 00 00 00 34 84 e4 69 40 00 00 02 98 00 00 00
01 c0 00 00 03 80 8a 8c 40 00 00 7d 00
            ^^ 0x03
```

---

# Summary

## Connection Sequence (84.5s - 85.0s)

| Step | Packet ID | Direction | Description |
|------|-----------|-----------|-------------|
| 1 | 0x01 | C->S | ID_OPEN_CONNECTION_REQUEST |
| 2 | 0x1a | S->C | ID_OPEN_CONNECTION_REPLY |
| 3 | 0x09 | C->S | ID_CONNECTION_REQUEST |
| 4 | 0x0a | S->C | ID_CONNECTION_REQUEST_ACCEPTED |
| 5 | 0x10 | C->S | ID_NEW_INCOMING_CONNECTION (reliable) |
| 6 | 0x50 | S->C | SMSG_PACKETGROUP (LithTech burst) |
| 7 | 0x21 | C->S | CMSG_CONNECTSTAGE (stage=0) |

## Steady State (85.0s+)

| Packet Type | ID | Direction | Frequency | Size |
|-------------|-----|-----------|-----------|------|
| Player Update | 0x10 | C->S | 15-20 Hz | 55 bytes |
| Server State | 0x03/0x08/0x09 | S->C | ~1 Hz | 29-41 bytes |
| Spawn Data | 0x53 | S->C | Once | 188 bytes |
| ACK | 0x80 | Both | Per reliable | 17-21 bytes |
| Timing Sync | 0x10 | S->C | Periodic | 34 bytes |

## Packet ID Reference (Embedded in Reliable 0x40)

| Byte Value | Meaning | Notes |
|------------|---------|-------|
| 0x01 | Minimal state | Server -> Client |
| 0x03 | State acknowledgment | Server -> Client, periodic |
| 0x08 | Game state update | Server -> Client |
| 0x09 | Timing/connectstage | Both directions |
| 0x10 | Player position update | Client -> Server, high frequency |
| 0x21 | CMSG (LithTech shifted) | Client -> Server |
| 0x50 | SMSG_PACKETGROUP | Server -> Client, initial burst |
| 0x53 | SMSG_UPDATE | Server -> Client, spawn packet |

## RakNet Frame Structure

**Reliable (0x40):**
```
40 00 00 00 [4-byte timing] [sequence bytes] [payload with embedded msg ID]
```

**ACK (0x80):**
```
80 00 00 00 [timing] [ack range data]
```

## LithTech Message ID Encoding

**CORRECTED (2026-01-08)**: Based on IDA analysis of fom_client.exe:
- LithTech message IDs are **RAW 8-bit values** (NO bit-shifting)
- Handler dispatch at `0x00427598` reads 8 bits and uses directly as `g_MessageHandlers` index
- SMSG_PACKETGROUP is ID 14 (0x0E), SMSG_UNGUARANTEEDUPDATE is ID 10 (0x0A)

The `0x50` byte seen in pcap is likely part of the RakNet reliability layer framing,
NOT the LithTech message ID. The actual LithTech payload starts after RakNet headers.
