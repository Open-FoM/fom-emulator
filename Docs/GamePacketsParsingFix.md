# Movement Packet Samples (2026-01-16)

Source: server packet log provided in-thread.

Context
- These are **movement/rotation** updates because the payload contains LithTech ID **0x19 (CMSG_WORLD_UPDATE)**.
- Reference: `Docs/Packets/GamePackets/CMSG_WORLD_UPDATE.md` (movement stream layout)

Note on placement
- In these samples, the byte sequence `41 02 4b 0a 09 2c ...` appears.
- The `0x0A` byte at offset **0x43** is **data**, not the message id; the actual msgId is `0x19` after Rak unwrap.

Note: RakNet wraps/bit-packs Lith payloads, so **outer bytes can differ** between client/server
even when the **inner Lith payload bits decode identically**. Correlate connectstage by
decoded payload (LSB bit order), not raw byte equality.

GOAL
- Ensure the simulated packets below have the correct heuristics applied to correctly identify the packets
Log label: `[0x78][Rak][Net_SendTo]` should be Correct log label: `[0x19][Lith][Net_SendTo]`
- If a packet is solved and the heuristics are 100% accurate, then move to another packet and apply the same
- This goal will only be completed once all the packets below have been simulated with the client emulator and parsed correctly on the server.
- Once a set of packets have been processed properly, then move on to the next set of packets, until EVERY single packet in this document has been identified properly.

## Current PacketInspector implementation (as of 2026-01-18)
Keep this in sync with `PacketInspector/Source` to avoid regressions.
- **Rak unwrap uses `raknet_ffi.dll`** (MSB bit order). The DLL is loaded via:
  - Env: `FOM_RAKNET_FFI_PATH` (explicit path), or
  - Search from module dir / repo root / CWD for `Server\\packages\\networking\\native\\raknet_ffi.dll` or `raknet_ffi.dll`.
  - If FFI parse fails, we fall back to raw packet bytes.
- **Schema override first**, implemented in `PacketInspector/Source/FomSchema.cpp` (`SchemaTable`):
  - 0x06, 0x09, 0x0E, 0x19 (Lith) and 0x7E (Rak).
  - If direct schema parse fails, **bit-scan** inside the payload for a schema ID.
  - If still not found and `Length >= 17`, **bit-scan the raw frame** starting at **byte offset 0x10**.
- **Heuristic fallback only if allowed**: `BestGuessParsing=1` OR `StrictParsing=0`.
  - Uses `InspectPayloadIds` (LSB Lith) + validation; if internal Rak parse failed, it can also scan for a Lith payload.
- **Rak ID fallback is LAST** (only if still raw and payload head is a known Rak ID).
- **Dispatch status log** is emitted by PacketInspector when `DispatchStatus=1` (see plan doc for format).

---

# World Disconnect Packet 1? (Rak ID_PING / 0x01)
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x01][Rak][Send]` (ID_PING signature: byte[0x0B]=0x2E, byte[0x16]=0x01)
Length: 26 bytes
```
0000  40 00 00 00 00 74 92 3f c0 00 00 2e d0 00 00 00  |@....t.?........|
0010  90 00 00 00 00 00 01 d2 43 aa                    |........C.|
```

# World Disconnect Packet 2? (Rak ID_PING / 0x01)
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x01][Rak][Send]` (ID_PING signature: byte[0x0B]=0x2E, byte[0x16]=0x01)
Length: 26 bytes
```
0000  40 00 00 00 00 74 92 4f 80 00 00 2e d0 00 00 00  |@....t.O........|
0010  90 00 00 00 00 00 01 d2 43 aa                    |........C.|
```

# World Disconnect Packet 3? (Rak ID_PING / 0x01)
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x01][Rak][Send]` (ID_PING signature: byte[0x0B]=0x2E, byte[0x16]=0x01)
Length: 26 bytes
```
0000  40 00 00 00 00 74 92 5f 00 00 00 2e d0 00 00 00  |@....t._........|
0010  90 00 00 00 00 00 01 d2 43 aa                    |........C.|
```

---

# ConnectStage Packet Samples (previously mis-ID'd as ID_INTERNAL_PING)
These decode as **CMSG_CONNECTSTAGE stage=0** when read at bit offset 132 (LSB).

## ConnectStage Packet A
Timestamp: 2026.01.18-21.55.57:935
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x09][Lith][Send]` (CMSG_CONNECTSTAGE stage=0, bit-offset 132)
Length: 26 bytes
```
0000  40 00 00 00 00 5a 11 02 00 00 00 02 d0 00 00 00  |@....Z..........|
0010  90 00 00 00 00 00 01 68 44 08                    |.......hD.|
```

## ConnectStage Packet B
Timestamp: 2026.01.18-21.56.12:919
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x09][Lith][Recv]` (CMSG_CONNECTSTAGE stage=0, bit-offset 132)
Length: 26 bytes
```
0000  40 00 00 00 00 5a 1f a3 00 00 00 04 50 00 00 00  |@....Z......P...|
0010  90 00 00 00 00 00 01 68 7e 8c                    |.......h~.|
```

## ConnectStage Packet C
Timestamp: 2026.01.18-21.56.17:931
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x09][Lith][Send]` (CMSG_CONNECTSTAGE stage=0, bit-offset 132)
Length: 26 bytes
```
0000  40 00 00 00 00 5a 24 87 00 00 00 04 d0 00 00 00  |@....Z$.........|
0010  90 00 00 00 00 00 01 68 92 1c                    |.......h..|
```

---

# Internal Ping Payload (Rak ID_INTERNAL_PING / 0x00)
These are **Rak internal ping payloads** (payload id 0x00). They must **NOT** be classified as Lith.

## Internal Ping Packet 1
Timestamp: 2026.01.19-00.56.55:691
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 83 7c 48 40 00 00 02 50 00 00 00  |@.....|H@...P...|
0010  90 00 00 00 00 00 02 0d f1 21                    |.........!|
```

## Internal Ping Packet 2
Timestamp: 2026.01.19-00.56.58:376
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 83 7e e7 00 00 00 02 50 00 00 00  |@.....~.....P...|
0010  90 00 00 00 00 00 02 0d fb 9c                    |..........|
```

## Internal Ping Packet 3
Timestamp: 2026.01.19-00.56.58:437
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x00][Rak][Recv]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 83 7e f3 80 00 00 02 d0 00 00 00  |@.....~.........|
0010  90 00 00 00 00 00 02 0d fb ce                    |..........|
```

## Internal Ping Packet 4
Timestamp: 2026.01.19-01.00.42:989
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x00][Rak][Recv]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 5a 3f 80 00 00 06 d0 00 00 00  |@.....Z?........|
0010  90 00 00 00 00 00 02 11 68 fe                    |........h.|
```

## Internal Ping Packet 5
Timestamp: 2026.01.19-01.01.23:353
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 81 a9 40 00 00 09 90 00 00 00  |@.......@.......|
0010  90 00 00 00 00 00 02 11 ca d0                    |..........|
```

## Internal Ping Packet 6
Timestamp: 2026.01.19-01.01.24:073
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 82 5e 80 00 00 09 90 00 00 00  |@......^........|
0010  90 00 00 00 00 00 02 11 ca d0                    |..........|
```

## Internal Ping Packet 7
Timestamp: 2026.01.19-01.01.24:259
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 82 8b c0 00 00 09 90 00 00 00  |@...............|
0010  90 00 00 00 00 00 02 11 ca d0                    |..........|
```

## Internal Ping Packet 8
Timestamp: 2026.01.19-01.01.25:710
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 83 f6 40 00 00 09 90 00 00 00  |@.......@.......|
0010  90 00 00 00 00 00 02 11 ca d0                    |..........|
```

## Internal Ping Packet 9
Timestamp: 2026.01.19-01.01.26:602
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 84 d8 c0 00 00 09 90 00 00 00  |@...............|
0010  90 00 00 00 00 00 02 11 ca d0                    |..........|
```

## Internal Ping Packet 10
Timestamp: 2026.01.19-01.01.27:523
Log label: `[0x00][Rak][Send]`
Correct log label: `[0x00][Rak][Send]` (ID_INTERNAL_PING payload, do not promote to Lith)
Length: 26 bytes
```
0000  40 00 00 00 00 84 85 bb 40 00 00 09 90 00 00 00  |@.......@.......|
0010  90 00 00 00 00 00 02 11 ca d0                    |..........|
```

## Movement Packet 1
Timestamp: 2026.01.16-23.43.43:426
Log label: `[0x78][Rak][Net_SendTo]`
Correct log label: `[0x19][Lith][Net_SendTo]`
Length: 89 bytes
```
0000  40 00 00 00 00 7d 1a 3e 80 00 00 29 58 80 00 00  |@....}.>...)X...|
0010  1f 40 00 00 21 10 19 00 00 00 00 01 f4 68 fa 7e  |.@..!........h.~|
0020  88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20  |.x.J.;...$<.... |
0030  6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51  |k.....:........Q|
0040  41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62  |A.K..,.. 6)....b|
0050  20 66 44 0c 80 00 00 08 00                       | fD......|
```

## Movement Packet 2
Timestamp: 2026.01.16-23.43.43:494
Log label: `[0x78][Rak][Net_SendTo]`
Correct log label: `[0x19][Lith][Net_SendTo]`
Length: 88 bytes
```
0000  40 00 00 00 00 7d 1a 4f 80 00 00 29 98 80 00 00  |@....}.O...)....|
0010  1f 80 00 00 20 c0 19 00 00 00 00 01 f4 69 3d 7e  |.... ........i=~|
0020  88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20  |.x.J.;...$<.... |
0030  6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51  |k.....:........Q|
0040  41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62  |A.K..,.. 6)....b|
0050  20 66 01 90 00 00 01 00                          | f......|
```

## Movement Packet 3
Timestamp: 2026.01.16-23.43.44:167
Log label: `[0x6B][Rak][Net_SendTo]`
Correct log label: `[0x19][Lith][Net_SendTo]`
Length: 88 bytes
```
0000  40 00 00 00 00 7d 1a f7 c0 00 00 2a 18 80 00 00  |@....}.....*....|
0010  1f c0 00 00 20 c0 19 00 00 00 00 01 f4 6b df 7e  |.... ........k.~|
0020  88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20  |.x.J.;...$<.... |
0030  6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51  |k.....:........Q|
0040  41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62  |A.K..,.. 6)....b|
0050  20 66 01 90 00 00 01 00                          | f......|
```

## Movement Packet 4
Timestamp: 2026.01.16-23.43.44:832
Log label: `[0x6E][Rak][Net_SendTo]`
Correct log label: `[0x19][Lith][Net_SendTo]`
Length: 88 bytes
```
0000  40 00 00 00 00 7d 1b 9e 40 00 00 2a 58 80 00 00  |@....}..@..*X...|
0010  20 00 00 00 20 c0 19 00 00 00 00 01 f4 6e 79 7e  | ... ........ny~|
0020  88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20  |.x.J.;...$<.... |
0030  6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51  |k.....:........Q|
0040  41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62  |A.K..,.. 6)....b|
0050  20 66 01 90 00 00 01 00                          | f......|
```

## Movement Packet 5
Timestamp: 2026.01.16-23.43.46:165
Log label: `[0x73][Rak][Net_SendTo]`
Correct log label: `[0x19][Lith][Net_SendTo]`
Length: 88 bytes
```
0000  40 00 00 00 00 7d 1c eb 40 00 00 2b 58 80 00 00  |@....}..@..+X...|
0010  20 80 00 00 20 c0 19 00 00 00 00 01 f4 73 ad 7e  | ... ........s.~|
0020  88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20  |.x.J.;...$<.... |
0030  6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51  |k.....:........Q|
0040  41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62  |A.K..,.. 6)....b|
0050  20 66 01 90 00 00 01 00                          | f......|
```

---

## LoadWorld Packet 1 (SMSG_LOADWORLD inside SMSG_PACKETGROUP)
Timestamp: 2026.01.16-23.41.53:445
Log label: `[0x0E][Lith][Send]`
Correct log label: `[0x06][Lith][Send]` (SMSG_LOADWORLD submessage inside packet group)
Length: 134 bytes
```
0000  40 00 00 00 00 7c ae d5 c0 00 00 00 50 00 00 00  |@....|......P...|
0010  90 00 00 00 00 00 01 f2 bb 4d 00 00 00 02 40 00  |.........M....@.|
0020  00 04 40 03 00 00 00 00 01 f2 bb 43 00 00 00 00  |..@........C....|
0030  01 f2 bb 4d 00 00 00 03 40 00 00 04 40 03 00 00  |...M....@...@...|
0040  00 00 01 f2 bb 43 00 00 00 00 01 f2 bb 4e 00 00  |.....C.......N..|
0050  00 04 40 00 00 02 40 00 00 00 00 00 01 f2 bb 4e  |..@...@........N|
0060  00 00 00 05 40 00 00 07 40 0e 48 04 07 00 00 00  |....@...@.H.....|
0070  00 00 00 00 20 0c 00 00 00 18 07 00 00 38 06 00  |.... ........8..|
0080  00 00 00 10 00 00                                |......|
```

## LoadWorld Packet 2 (SMSG_LOADWORLD inside SMSG_PACKETGROUP)
Timestamp: 2026.01.17-19.04.21:789
Log label: `[0x06][Lith][Send]`
Correct log label: `[0x06][Lith][Send]` (SMSG_LOADWORLD submessage inside packet group)
Length: 134 bytes
```
0000  40 00 00 00 00 39 9a 51 40 00 00 00 50 00 00 00  |@....9.Q@...P...|
0010  90 00 00 00 00 00 00 e6 69 3b 00 00 00 02 40 00  |........i;....@.|
0020  00 04 40 03 00 00 00 00 00 e6 69 31 00 00 00 00  |..@.......i1....|
0030  00 e6 69 3b 00 00 00 03 40 00 00 04 40 03 00 00  |..i;....@...@...|
0040  00 00 00 e6 69 31 00 00 00 00 00 e6 69 3b 00 00  |....i1......i;..|
0050  00 04 40 00 00 02 40 00 00 00 00 00 00 e6 69 3b  |..@...@.......i;|
0060  00 00 00 05 40 00 00 07 40 0e 48 04 07 00 00 00  |....@...@.H.....|
0070  00 00 00 00 20 0c 00 00 00 18 07 00 00 38 06 00  |.... ........8..|
0080  00 00 00 01 00 00                                |......|
```

## RegisterClient Packet 1 (REGISTER_CLIENT_RETURN mis-ID)
Timestamp: 2026.01.17-19.05.49:624
Log label: `[0x19][Lith][Send]`
Correct log label: `[0x79][Rak][Send]` (REGISTER_CLIENT_RETURN)
Length: 183 bytes
```
0000  40 00 00 00 00 39 f0 13 c0 00 00 02 10 00 00 0a  |@....9..........|
0010  60 79 88 00 00 00 06 38 78 78 78 60 00 00 0c 3c  |`y.....8xxx`...<|
0020  3c 3c 30 c3 0c 30 0e c0 00 00 00 00 00 00 a8 a0  |<<0..0..........|
0030  81 25 85 04 96 00 0e 90 1b 14 d1 00 07 f1 b1 10  |.%..............|
0040  00 00 01 f4 00 00 09 c4 00 00 00 7d 00 00 00 3e  |...........}...>|
0050  80 00 01 38 87 87 87 87 87 87 80 00 00 0c 83 c3  |...8............|
0060  c3 c3 c3 c3 c3 c3 c3 c3 c0 00 00 00 07 e1 e0 00  |................|
0070  00 00 2b 00 00 00 32 78 78 78 78 78 78 78 78 78  |..+...2xxxxxxxxx|
0080  78 78 78 78 00 00 01 13 3c 3c 3c 3c 00 00 00 96  |xxxx....<<<<....|
0090  00 00 02 71 0f 0f 0f 0f 0f 0f 0f 07 87 87 87 84  |...q............|
00a0  e1 87 0c 30 00 78 78 30 f0 00 3c 21 08 43 c3 c3  |...0.xx0..<!.C..|
00b0  0c 30 00 3c 3c 3c 00                             |.0.<<<.|
```

## CONNECTSTAGE Packet 3 (CMSG_CONNECTSTAGE, bit-packed)
Timestamp: 2026.01.17-03.31.31:783
Log label: `[0x00][Rak][Net_SendTo]`
Correct log label: `[0x09][Lith][Net_SendTo]` (CMSG_CONNECTSTAGE stage=0, bit-offset 132)
Length: 26 bytes
```
0000  40 00 00 00 00 b1 3e 40 00 00 00 02 d0 00 00 00  |@.....>@........|
0010  90 00 00 00 00 00 02 c4 f9 00                    |..........|
```

## CONNECTSTAGE Packet 4 (CMSG_CONNECTSTAGE, bit-packed)
Timestamp: 2026.01.17-03.31.31:810
Log label: `[0x00][Rak][Net_SendTo]`
Correct log label: `[0x09][Lith][Net_SendTo]` (CMSG_CONNECTSTAGE stage=0, bit-offset 132)
Length: 26 bytes
```
0000  40 00 00 00 00 b1 3e 46 40 00 00 01 d0 00 00 00  |@.....>F@.......|
0010  90 00 00 00 00 00 02 c4 f9 19                    |..........|
```

## CONNECTSTAGE Packet 5 (CMSG_CONNECTSTAGE, bit-packed)
Timestamp: 2026.01.17-03.47.15:590
Log label: `[0x00][Rak][Net_SendTo]`
Correct log label: `[0x09][Lith][Net_SendTo]` (CMSG_CONNECTSTAGE stage=0, bit-offset 132)
Length: 26 bytes
```
0000  40 00 00 00 00 b4 d7 ee 80 00 00 02 d0 00 00 00  |@...............|
0010  90 00 00 00 00 00 02 d3 5f ba                    |........_.|
```

## CONNECTSTAGE Packet 6 (CMSG_CONNECTSTAGE, bit-packed)
Timestamp: 2026.01.17-03.47.15:632
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x09][Lith][Recv]` (CMSG_CONNECTSTAGE stage=0, bit-offset 100)
Length: 26 bytes
```
0000  40 00 00 00 00 b4 d7 f8 00 00 00 01 90 00 00 00  |@...............|
0010  90 00 00 00 00 00 02 d3 5f e0                    |........_.|
```

---

## Missing Connection Packet 1 (observed)
Timestamp: 2026.01.18-15.53.36:605
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x09][Lith][Recv]` (CMSG_CONNECTSTAGE stage=0, bit-offset 100)
Length: 26 bytes
```
0000  40 00 00 00 00 07 21 3d 40 00 00 02 10 00 00 00  |@.|
```
Note: the log snippet only shows the first 16 bytes; the full 26‑byte payload wasn’t captured in this excerpt.

## Missing Connection Packet 2 (observed)
Timestamp: 2026.01.18-15.53.36:687
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x09][Lith][Recv]` (CMSG_CONNECTSTAGE stage=0, bit-offset 100)
Length: 26 bytes
```
0000  40 00 00 00 00 07 21 52 00 00 00 02 10 00 00 00  |@.|
```
Note: the log snippet only shows the first 16 bytes; the full 26‑byte payload wasn’t captured in this excerpt.

## Missing Connection Packet 3 (synthetic variation)
Timestamp: synthetic
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x09][Lith][Recv]` (CMSG_CONNECTSTAGE stage=0, bit-offset 100)
Length: 26 bytes
```
0000  40 00 00 00 00 07 22 3d 40 00 00 02 10 00 00 00  |@.|
```

## Missing Connection Packet 4 (synthetic variation)
Timestamp: synthetic
Log label: `[0x00][Rak][Recv]`
Correct log label: `[0x09][Lith][Recv]` (CMSG_CONNECTSTAGE stage=0, bit-offset 100)
Length: 26 bytes
```
0000  40 00 00 00 00 07 23 3d 40 00 00 02 10 00 00 00  |@.|
```

---

## ACK Packet Samples (Rak ACK / ID 0x80)
These are Rak ACK frames (not Lith). Keep them classified as **[0x80][Rak]**.

### ACK Packet 1
Timestamp: 2026.01.18-21.55.38:522
Log label: `[0x80][Rak][Recv]`
Correct log label: `[0x80][Rak][Recv]` (ACK)
Length: 17 bytes
```
0000  80 00 00 00 00 b3 fc 15 80 00 00 00 60 00 00 00  |............`...|
0010  00                                               |.|
```

### ACK Packet 2
Timestamp: 2026.01.18-21.55.38:549
Log label: `[0x80][Rak][Recv]`
Correct log label: `[0x80][Rak][Recv]` (ACK)
Length: 21 bytes
```
0000  80 00 00 00 00 b3 fc 1f 80 00 00 00 40 00 00 00  |............@...|
0010  20 00 00 00 80
```

### ACK Packet 3
Timestamp: 2026.01.18-21.55.39:063
Log label: `[0x80][Rak][Send]`
Correct log label: `[0x80][Rak][Send]` (ACK)
Length: 17 bytes
```
0000  80 00 00 00 00 b3 fd 23 80 00 00 00 60 00 00 00  |.......#....`...|
0010  c0
```

---

## ConnectStage Detection Heuristic (Log Parsing)
Used to locate bit-packed CMSG_CONNECTSTAGE in raw packet logs:
1) Anchor on `[LithTech] OnLoadWorldPacket returned 0`.
2) For each packet block after the anchor, scan **LSB bit order** for `0x09` followed immediately by `0x00/0x01` (stage).
3) Pick the **first** candidate within **5 seconds** of the anchor.
Typical hit: `bit_offset=132` (byte 16, bit 4) inside a `[0x00][Rak][Net_SendTo] len=26` block.

## General Lith Payload Heuristic (Reliable Classification)
Apply consistently to all Lith messages (movement, loadworld, connectstage, etc.):
1) **Rak unwrap (mandatory)**  
   - If packet starts with `0x40/0xC0`, parse Rak internal payload using Rak bit‑packing to get `payload_offset` + `payload_bits`.  
   - Do **not** scan raw bytes unless Rak parse fails.
2) **Lith decode (LSB bit order)**  
   - Read the first 8 bits of the payload as `msg_id`.  
   - If `msg_id == 0x0E` (packetgroup), iterate sub‑messages:  
     `[len(8 bits) | id(8 bits) | payload(len bits)]` until `len==0`.
3) **Structure validation (promote only if valid)**  
   - `0x09` CONNECTSTAGE: stage byte ∈ {0,1}.  
   - `0x06` LOADWORLD: 32‑bit float + u16 worldId.  
   - `0x19` WORLD_UPDATE: parse `worldInst`, `sequence`, then entry loop (type 1/2) with `Appearance` and optional tail; obey bit bounds.  
   - `0x0C` YOURID: u16 + u8.  
   - If validation fails, keep outer ID (do not promote).
4) **Fallback only if Rak parse fails**  
   - Allow shallow Rak ID recovery only at offset 0 (or immediately after ID_TIMESTAMP).  
   - Lith scan is only allowed post‑LoadWorld and must still pass structure validation.

## PacketInspector behavior (current code)
This summarizes how the **current** implementation behaves; keep it accurate to avoid regressions:
1) **Rak unwrap first (FFI)**  
   - Uses `raknet_ffi.dll` to find payload offset + bit length (MSB bit order).
2) **Payload-relative decode**  
   - Timestamp + `ID_USER_PACKET_ENUM` are unwrapped before schema/heuristics.
3) **Schema‑first overrides**  
   - Attempt direct parse at payload start, then **bit‑scan** inside payload.
   - If still not found, **bit‑scan raw frame from byte 0x10** (to catch short bit‑packed frames).
4) **Heuristic fallback** (only if allowed)  
   - Uses `InspectPayloadIds` (LSB) + validation.
   - If internal parse failed, it can still scan for a Lith payload (LSB) before giving up.
5) **Rak fallback last**  
   - Only if still raw and payload head is a known Rak ID.

## Replay Validation (Required)
Do **not** claim this is complete unless you run the harness and verify every block in this document.

## Regression Guard: 0x7B mis‑ID for movement (0x19)
If movement regresses to Rak IDs:
1) Confirm `raknet_ffi.dll` is loading (otherwise unwrap fails and we fall back to raw).
2) Verify schema override is hitting 0x19 (check `DispatchStatus=1`).
3) Ensure Rak fallback remains **last** (only when still raw).

---

## Validation Steps (PacketInspector)
1) Build PacketInspector (x64 + x86) and deploy:
   - `build_packetinspector.bat`
   - Copy outputs if needed:
     - `PacketInspector\\Build\\x64\\Release\\PacketInspector.dll` → `Server\\packages\\networking\\native\\PacketInspector.dll`
     - `PacketInspector\\Build\\Win32\\Release\\PacketInspector.dll` → `Hook\\Build\\Release\\PacketInspector.dll` + `Hook\\BuildWin32\\Release\\PacketInspector.dll`
2) Run the **required harness** (same shell, fixed duration):
   - `Scripts\\run_world_replay.bat run1 15 62000 63000`
   - The script keeps everything in this shell and force‑stops server/client after duration.
3) Verify logs:
   - `Server\\apps\\world\\logs\\pi_run_run1_*.out`
   - Confirm every block in this document appears with the **Correct log label**.

Notes:
- If labels remain Rak, confirm `raknet_ffi.dll` is present and PacketInspector.dll is the one loaded by the server.
- If PacketInspector build fails with LNK1104, stop processes using PacketInspector.dll and rebuild.
