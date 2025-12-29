# Login Request 0x80 Payload Report (Merged)

Merged: 2025-12-29 08:04:40

## Source: C:\FoM_Decompilation\Docs\Protocol\Login_0x80_Payload.md

# Login Request 0x80 Payload (Observed)

Source: `C:\FoM_Decompilation\ServerEmulator\logs\lithdebug.log`
Extracted: 2025-12-29 07:58:38
Length: 160 bytes

## Raw Hex (continuous)
`80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 06 40 00 00 02 40 00 00 00 00 00 03 dc 8e 10 00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00 02 40 00 00 00 00 00 03 dc 7a 87 00 00 00 01 60 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02`

## Hexdump (offsets)
| Offset | Bytes |
|---:|---|
0x0000 | 80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00
0x0010 | 00 00 06 40 00 00 02 40 00 00 00 00 00 03 dc 8e
0x0020 | 10 00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c
0x0030 | 00 00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00
0x0040 | 02 40 00 00 00 00 00 03 dc 7a 87 00 00 00 01 60
0x0050 | 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48
0x0060 | 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00
0x0070 | ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00
0x0080 | 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff
0x0090 | 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02

## Notable Patterns (observed)
- Pattern `6c 00 00 00 08 4e aa 81 cf` at offset `0x0005`
- Pattern `6c 00 00 00 08 4e aa 81 cf` at offset `0x002F`
- Repeated `ff ff 00 00` blocks dominate the tail (possible bitmask/flags or padding).
- `80 6c` sequence appears twice in the payload (likely nested frames).

## Segments (raw boundaries, unknown semantics)
- 0x0000..0x002B: `80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 06 40 00 00 02 40 00 00 00 00 00 03 dc 8e 10`
- 0x002C..0x003F: `00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c 00`
- 0x0040..0x0063: `00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00 02 40 00 00 00 00 00 03 dc 7a 87`
- 0x0064..0x0073: `00 00 00 01 60 00 00 00 00 00 00 00 86 00 11 80`
- 0x0074..0x009F: `ff ff fe ee 48 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00`
- 0x00A0..0x009F tail continues with repeated `ff ff 00 00` pairs, ending with `ff ff 00 00 00 02`.

### Notes
- Offsets and boundaries above are observational (not decoded).
- To decode, we likely need to align a nested frame start before the `0x6c` bytes and then apply a length+msgId parser.

## Source: C:\FoM_Decompilation\Docs\Protocol\Login_0x80_Payloads_All.md

# Login Request 0x80 Payloads (All Unique Variants)

Source: C:\\FoM_Decompilation\\ServerEmulator\\logs\\lithdebug.log
Extracted: 2025-12-29 08:03:12
Total payloads: 37, Unique: 5

## Variant 1
- Count: 17
- Bytes: 160

### Raw Hex (continuous)
80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 06 40 00 00 02 40 00 00 00 00 00 03 cd ac 5b 00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00 02 40 00 00 00 00 00 03 cd 98 d2 00 00 00 01 60 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02

### Hexdump (offsets)
| Offset | Bytes |
|---:|---|
0x0000 | 80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00
0x0010 | 00 00 06 40 00 00 02 40 00 00 00 00 00 03 cd ac
0x0020 | 5b 00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c
0x0030 | 00 00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00
0x0040 | 02 40 00 00 00 00 00 03 cd 98 d2 00 00 00 01 60
0x0050 | 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48
0x0060 | 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00
0x0070 | ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00
0x0080 | 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff
0x0090 | 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02

## Variant 2
- Count: 14
- Bytes: 160

### Raw Hex (continuous)
80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 06 40 00 00 02 40 00 00 00 00 00 03 dc 8e 10 00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00 02 40 00 00 00 00 00 03 dc 7a 87 00 00 00 01 60 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02

### Hexdump (offsets)
| Offset | Bytes |
|---:|---|
0x0000 | 80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00
0x0010 | 00 00 06 40 00 00 02 40 00 00 00 00 00 03 dc 8e
0x0020 | 10 00 00 00 05 60 00 00 00 01 00 00 00 12 80 6c
0x0030 | 00 00 00 08 4e aa 81 cf 40 00 00 00 04 40 00 00
0x0040 | 02 40 00 00 00 00 00 03 dc 7a 87 00 00 00 01 60
0x0050 | 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48
0x0060 | 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00
0x0070 | ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00
0x0080 | 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff
0x0090 | 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02

## Variant 3
- Count: 4
- Bytes: 15

### Raw Hex (continuous)
80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40

### Hexdump (offsets)
| Offset | Bytes |
|---:|---|
0x0000 | 80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40

## Variant 4
- Count: 1
- Bytes: 147

### Raw Hex (continuous)
80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 08 40 00 00 02 40 00 00 00 00 00 03 c3 5e 72 00 00 00 07 60 00 00 00 01 00 00 00 12 80 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 06 40 00 00 02 40 00 00 00 00 00 03 c3 4a e9 00 00 00 05 40 00 00 02 40 00 00 00 00 00 03 c3 37 60 00 00 00 04 40 00 00 02 40 00 00 00 00 00 03 c3 23 d7 00 00 00 02 40 00 00 02 40 00 00 00 00 00 03 c3 10 4e 00 00 00 03 40 00 00 02 40 00 00 00 00 00 03 c3 10 4e

### Hexdump (offsets)
| Offset | Bytes |
|---:|---|
0x0000 | 80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00
0x0010 | 00 00 08 40 00 00 02 40 00 00 00 00 00 03 c3 5e
0x0020 | 72 00 00 00 07 60 00 00 00 01 00 00 00 12 80 6c
0x0030 | 00 00 00 08 4e aa 81 cf 40 00 00 00 06 40 00 00
0x0040 | 02 40 00 00 00 00 00 03 c3 4a e9 00 00 00 05 40
0x0050 | 00 00 02 40 00 00 00 00 00 03 c3 37 60 00 00 00
0x0060 | 04 40 00 00 02 40 00 00 00 00 00 03 c3 23 d7 00
0x0070 | 00 00 02 40 00 00 02 40 00 00 00 00 00 03 c3 10
0x0080 | 4e 00 00 00 03 40 00 00 02 40 00 00 00 00 00 03
0x0090 | c3 10 4e

## Variant 5
- Count: 1
- Bytes: 160

### Raw Hex (continuous)
80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 05 40 00 00 02 40 00 00 00 00 00 03 d9 94 dd 00 00 00 04 60 00 00 00 01 00 00 00 12 80 6c 00 00 00 08 4e aa 81 cf 40 00 00 00 01 60 00 00 00 00 00 00 00 86 00 11 80 ff ff fe ee 48 3f 57 bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02 40 00 00 02 40 00 00 00 00 00 03 d9 81 54 00 00 00 03

### Hexdump (offsets)
| Offset | Bytes |
|---:|---|
0x0000 | 80 00 00 04 a0 6c 00 00 00 08 4e aa 81 cf 40 00
0x0010 | 00 00 05 40 00 00 02 40 00 00 00 00 00 03 d9 94
0x0020 | dd 00 00 00 04 60 00 00 00 01 00 00 00 12 80 6c
0x0030 | 00 00 00 08 4e aa 81 cf 40 00 00 00 01 60 00 00
0x0040 | 00 00 00 00 00 86 00 11 80 ff ff fe ee 48 3f 57
0x0050 | bb cd e9 cb 00 00 00 00 ff ff 00 00 00 00 ff ff
0x0060 | 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00 00 00
0x0070 | ff ff 00 00 00 00 ff ff 00 00 00 00 ff ff 00 00
0x0080 | 00 00 ff ff 00 00 00 00 ff ff 00 00 00 02 40 00
0x0090 | 00 02 40 00 00 00 00 00 03 d9 81 54 00 00 00 03


## Source: C:\FoM_Decompilation\Docs\Protocol\Login_0x80_Payload_Diff.md

# Login Request 0x80 Payload Diff (Top 2 variants)

Source: C:\\FoM_Decompilation\\ServerEmulator\\logs\\lithdebug.log
Extracted: 2025-12-29 08:03:50
Variant A count: 17
Variant B count: 14
Length: 160 bytes

## Byte diffs
| Offset | A | B |
|---:|:--:|:--:|
0x001E | cd | dc
0x001F | ac | 8e
0x0020 | 5b | 10
0x0048 | cd | dc
0x0049 | 98 | 7a
0x004A | d2 | 87

Total differing bytes: 6

## Constant ranges
- 0x0000..0x001D
- 0x0021..0x0047
- 0x004B..0x009F

