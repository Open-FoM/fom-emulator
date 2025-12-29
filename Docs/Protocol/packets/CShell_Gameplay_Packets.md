# CShell Gameplay Packets (Draft)

Scope: server->client packets decoded from CShell.dll (FoTD). This is a starting point for emulator-side
structs and parsers; exact offsets and helper names are in `AddressMap_FoTD.md`.

## Encoding notes
- bit: single bit, MSB-first within each byte.
- bits(N): raw bitfield read via BitStream_ReadBits (MSB-first). `bits(2048)` is a 2048-bit blob.
- u8c/u16c/u32c/u64c: compressed integer (see AddressMap bitstream section). Stream uses big-endian
  byte order for multi-byte values; byte-swap on little-endian hosts.
- list_u16count_u32c: `u16c count` then `count * u32c`.

## Packet_ID_A5 (0xA5 / -91)
```
struct Packet_A5 {
  u32c hdr;
  u8c  type;
  union {
    u32c u32_a;                 // types 1,4,6,7,10,13,15
    struct A5_Struct1 s1;        // type 5
    struct A5_Struct1 s1_s2;     // type 8 (plus A5_Struct2 + bit)
    struct A5_Struct3 s3;        // type 14 (plus bit for type 16)
  };
  // type-specific tails:
  // 2: none
  // 3: ItemsAdded payload
  // 8: A5_Struct1 + A5_Struct2 + bit
  // 9: u32c + 6*u16c
  // 11: u32c + u8c
  // 12/17: u32c + u32c
  // 14/16: A5_Struct3 (+ bit for type 16)
}
```
A5_Struct1, A5_Struct2, A5_Struct3 layouts are in AddressMap (`Packet_ID_A5` section).

## Packet_ID_A6 (0xA6 / -90)
```
struct Packet_A6 {
  u32c hdr;
  u32c u32_438;
  u8c  u8_440;
  u8c  type;
  u8c  u8_43c;
  // type-specific:
  // type 2: u16c @+0x43E
  // type 3: u64c @+0x448 + u16c @+0x43E
  // type 4: u16c @+0x43E
  // type 5: none
  // type 6: none
  // type 7: u16c @+0x43E
}
```

## Packet_ID_A8 (0xA8 / -88)
```
struct Packet_A8 {
  u32c hdr;
  u8c  flag;
  if (flag == 1) {
    u8c a,b,c,d,e,f;           // +0x435..+0x43A
    list_u16count_u32c list0;  // +0x43C
    list_u16count_u32c list1;  // +0x448
    list_u16count_u32c list2;  // +0x454
    list_u16count_u32c list3;  // +0x460
  }
}
```

## Packet_ID_A9 (0xA9 / -87)
```
struct Packet_A9 {
  u32c hdr;
  u8c  type;
  // type-specific:
  // 2: A9_StructA + A9_StructB + u32c + u32c
  // 3: A9_StructB + u32c + u32c
  // 4: A9_StructA
  // 5: none
  // 6: bits(2048)
  // 7: u32c + bits(2048)
  // 8: u32c
  // 9: bits(2048)
  // 10: bits(2048) + u32c
  // 11: u32c + Playerfile_FriendEntry
  // 12: none
  // 13: A9_StructC
  // 14: A9_StructA_List
  // 15/16: u32c
  // 17: u32c + u16c
  // 18: A9_StructD
  // 19: bits(2048)
  // 20: u16c
  // 21: A9_StructD_List + bit
  // 22/23: u32c + bit
}
```
A9_StructA/B/C/D and sublists are defined in AddressMap (`Packet_ID_A9` section).

## Packet_ID_FACTION (0x9D / -99)
```
struct Packet_FACTION {
  u32c hdr;
  u8c  type;
  // switch on (type-2), 76 cases:
  // No extra fields: types 3, 6, 8, 11, 12, 20, 29, 32, 35, 53, 71
  // type 2:  BlockA @+0x858; if [0x0C92] != 0 -> Block_0D50 @+0x0D50; else ListA @+0x1008, ListB @+0x179C, ListC @+0x17AC
  // type 4:  bits(2048) @+0x436, then bits(2048) @+0x456
  // type 5:  bits(2048) @+0x456
  // type 7:  u32c @+0x1074
  // type 9:  bits(2048) @+0x0D64
  // type 10: u32c @+0x0D60, bit @+0x0F4C; if bit==0 -> bits(2048) @+0x0F4D
  // type 13: Block_0D78 @+0x0D78, ListA @+0x1008
  // type 14: u8c @+0x435
  // type 15: status list @+0x0D88 (Playerfile_blockC0)
  // type 16: u8c @+0x0E04, bits(2048) @+0x436
  // type 17: u8c @+0x0E04, u32c @+0x0D60
  // type 18: Block_0E08 @+0x0E08
  // type 19: Block_0D50 @+0x0D50
  // type 21: Block_0E2C @+0x0E2C; Block_0E3C @+0x0E3C; bits(2048) @+0x0E4C; bit @+0x0F4C; ListA @+0x1008
  // type 22: u32c @+0x0D60
  // type 23: bits(2048) @+0x0E4C; bit @+0x0F4C
  // type 24: u32c @+0x0D60
  // type 25: u32c @+0x0D60; bit @+0x0F4C; if bit==0 -> bits(2048) @+0x0F4D
  // type 26: u32c @+0x0FD0
  // type 27: u32c @+0x0FD0
  // type 28: u32c @+0x0D60
  // type 30: Block_0FD4 @+0x0FD4
  // type 31: u32c @+0x0FD0; bits(2048) @+0x0E4C
  // type 33: Block_0E3C @+0x0E3C
  // type 34: u32c @+0x0FD0
  // type 36: ListA @+0x1008; Block_1340 @+0x1340
  // type 37: bits(2048) @+0x0FE4
  // type 38: u8c @+0x1004
  // type 39: A9_StructB @+0x1030
  // type 40/41/59: u8c @+0x1004
  // type 42: u8c @+0x1078; u32c @+0x1074; u32c @+0x0D60; bits(2048) @+0x0F4D
  // type 43: u32c @+0x1074
  // type 44: Block_1090 @+0x1090; Block_107C @+0x107C; ListA @+0x1008; Block_1340 @+0x1340; BlockA_Struct_4C0 @+0x1710
  // type 45: Block_10A0 @+0x10A0; u32c @+0x1074
  // type 46: Block_10A0 @+0x10A0
  // type 47: u32c @+0x0D60; u32c @+0x1074
  // type 48: bit @+0x0F4C; Block_1170 @+0x1170
  // type 49: bit @+0x0F4C; Block_1160 @+0x1160; ListA @+0x1008
  // type 50: bit @+0x0F4C; bits(2048) @+0x436
  // type 51: Block_11A4 @+0x11A4
  // type 52: u32c @+0x0D60
  // type 54: Block_1318 @+0x1318; u8c @+0x435
  // type 55/56/57/60/66/70: u32c @+0x1074
  // type 58: u8c @+0x1004; bits(2048) @+0x436
  // type 61: u32c @+0x1074; Block_1738 @+0x1738
  // type 62: Block_1784 @+0x1784
  // type 63: bits(2048) @+0x436; u8c @+0x1798; u32c @+0x1074
  // type 64: u8c @+0x1798; u8c @+0x1799; u32c @+0x1074
  // type 65: bits(2048) @+0x0D64; u8c @+0x1798; u32c @+0x1074
  // type 67: u32c @+0x1074; u32c @+0x0D60
  // type 68: u32c @+0x1074; u32c @+0x0D60; u8c @+0x1798
  // type 69: bits(2048) @+0x0D64; u32c @+0x1074
  // type 72: Block_17BC @+0x17BC
  // type 73: bits(2048) @+0x436
  // type 74: u8c @+0x435
  // type 75: bits(2048) @+0x0D64; u8c @+0x435
  // type 76/77: u32c @+0x0D60; u8c @+0x435
}
```
Helper blocks (read order):
- BlockA:
  - string @+0x06, string @+0x3A, string @+0x1A
  - u32c @+0x00
  - bit @+0x43A
  - u8c @+0x05, u8c @+0x04
  - if bit@+0x43A != 0: u32c @+0x43C (sub_10246F10); else u32c @+0x440
  - Playerfile_blockC0 @+0x444
  - BlockA_Struct_4C0 @+0x4C0: 6x u32c; u8c count; u8c list
  - BlockA_List_4E8 @+0x4E8: u32c count; repeat u32c + u8c + string
- ListA:
  - u32c header
  - u32c count1; repeat A9_StructB
  - u32c count2; repeat u32c list
- A9_StructB:
  - u8c
  - string
  - u32c count1; repeat u8c + u32c
  - u32c count2; repeat u32c
- ListB:
  - u32c count; repeat ListB_Entry:
    - u8c header
    - u32c count; repeat A5_Struct2
- ListC:
  - u32c count; repeat ListC_Entry:
    - u8c header
    - u32c
    - u32c count; repeat u32c + u32c
- Block_107C:
  - u16c, u16c, u8c count
  - repeat Entry: u32c (sub_10246F10) + u8c + u32c + u32c + u32c + 4 strings
- Block_1090:
  - u8c count; repeat Block_10A0
- Block_10A0:
  - u32c @+0x00
  - u8c  @+0x04
  - u8c  @+0x25
  - u8c  @+0x27
  - u32c @+0xA8
  - u8c  @+0x26
  - string @+0x05
  - string @+0x28
  - string @+0xAC
- Block_0D50:
  - u16c count; repeat Playerfile_FriendEntry
- Block_0D78:
  - u32c count; repeat Entry:
    - u32c @+0x30
    - u8c  @+0x38
    - u32c @+0x00
    - u32c @+0x2C
    - u32c @+0x34
    - string @+0x04
    - string @+0x18
- Block_0E08:
  - bit @+0x00
  - u8c @+0x01
  - u32c_alt @+0x04
  - u32c_alt @+0x08
  - u8c @+0x20
  - string @+0x0C
- Block_0E2C:
  - u32c count; repeat u32c + u32c + string + string + string
- Block_0E3C:
  - u32c count; repeat Entry:
    - u32c @+0x00
    - u32c @+0x18
    - string @+0x04
    - string @+0x1C
    - u32c @+0x11C
    - if u32c@+0x11C != 0: Playerfile_blockC0 @+0x120 + string @+0x19C
- Block_0FD4:
  - u32c count; repeat Entry:
    - u32c @+0x00
    - string @+0x04
    - string @+0x18
    - string @+0x38
    - u32c @+0x1B4
    - Playerfile_blockC0 @+0x138
- Block_1784:
  - u16c, u16c, u8c count
  - repeat Entry: u8c + u32c_alt + u8c + u32c + string + string + u32c
- Block_1160:
  - u32c count; repeat Block_11A4
- Block_11A4:
  - u32c @+0x00
  - u16c @+0x04
  - bit  @+0x0C4
  - u32c @+0x164
  - u32c @+0x168
  - u32c @+0x08
  - u8c  @+0x0C5
  - string @+0x0C
  - string @+0x20
  - string @+0x24
  - string @+0x44
  - string @+0x144
  - u32c @+0x170
  - u32c @+0x16C
  - Playerfile_blockC0 @+0x0C8
- Block_1170:
  - bit @+0x00
  - string @+0x01
  - string @+0x15
  - string @+0x29
  - u16c @+0x2E
  - u8c @+0x30
- Block_1318:
  - u32c @+0x00
  - u32c @+0x04 (sub_10246F10)
  - u32c count; repeat u16c + u8c + bit
- Block_1340:
  - u32c @+0x3C0
  - bit  @+0x3C4
  - u32c @+0x3C8 (sub_10246F10)
  - u16c @+0x3CC
  - 0x1E entries (size 0x20):
    - presence bit
    - if 0: u8=0, string empty, u32=0
    - if 1: u8c @+0x00, u32c @+0x1C, if u8c>0x0A then string @+0x01
- Block_1738:
  - u8c @+0x00
  - u32c_alt @+0x04
  - u8c @+0x08, @+0x09, @+0x0A
  - bit @+0x48
  - string @+0x0B
  - string @+0x1F
  - u32c @+0x40 (sub_10246F10)
  - u32c @+0x44 (sub_10246F10)
- Block_17BC:
  - u8c count; repeat u8c + string + u32c + Block_0D50
- A5_Struct2 (Packet_ID_A5_read_struct2):
  - u32c @+0x14
  - u8c  @+0x18
  - u16c @+0x10
  - u32c @+0x1C
  - u32c @+0x28
  - u32c @+0x2C
  - u32c count; repeat Entry:
    - u32c
    - string (max 0x800)
    - u32c
    - u16c
    - u32c
  - u32c @+0x20
  - u32c @+0x24

## Packet_ID_SKILLS (0xA3 / -93)
```
struct Packet_SKILLS {
  u32c hdr;
  u8c  type;
  // type 2/7: SkillsList
  // type 3/4/5/6: u32c @+0x468
  // other types: no extra fields observed
}
```
SkillsList (Packet_ID_SKILLS_read_list):
- u32c @+0x20
- u8c @+0x24, @+0x25, @+0x26, @+0x27
- u32c count
- repeat count:
  - u32c (BitStream_ReadBitsCompressed 32 with endian swap)
  - u8c
  - u32c (BitStream_ReadBitsCompressed 32 with endian swap)
  - u8c
  - u8c
  - u8c
  - insert via Packet_ID_SKILLS_read_list_insert

## Packet_ID_PLAYERFILE (0x9F / -97)
```
struct Packet_PLAYERFILE {
  u32c hdr;
  bit  flag;
  if (flag == 1) {
    FriendEntry friend0;
    Faction_ListA listA;
    string name;
  } else {
    u32c value;
  }
}
```
FriendEntry (Packet_ID_PLAYERFILE_read_structA):
- u32c
- u8c
- u32c
- u8c
- string (max 0x800)
- u32c_alt (Read_u32c_alt)
- u8c
- string (max 0x800)
- string (max 0x800) + lowercase copy of first 0x14 bytes
- string (max 0x800)
- Playerfile_blockC0
- u8c
Playerfile_blockC0:
- u32c header
- 10 x entry (each guarded by present bit):
  - u16c, u8c, u8c, bits(7), bits(7), bits(9), u8c, u8c, u8c

## Packet_ID_PLAYER2PLAYER (0xAA / -86)
```
struct Packet_PLAYER2PLAYER {
  u32c hdr0;
  u32c hdr1;
  u8c  type;
  // type 2: bits(2048), u32c
  // type 3/4/5/6: bits(2048)
  // type 7/8/9/10: ItemsAdded_entry
  // type 11: u32c
  // type 14: bit
  // types 12/13: no extra fields observed
}
```
Notes: handler uses window ids (0x2E, 0x30, 0x13) for types 3/4/8/13/15; see AddressMap.

## Packet_ID_AC (0xAC / -84)
```
struct Packet_AC {
  u32c hdr;
  u8c  type;
  u32c value;
  // type 0: Read_QuantVec3_9bit
  // type 1/2: u16c
  // type 3: u16c opcode -> sub-switch:
  //   510: A5_Struct1 + A5_Struct2 + u32c,u32c,u32c
  //   511: u32c
  //   512: u32c,u32c + u16c + ItemEntryWithId
  //   516: u32c,u32c + bit
  //   501: u16c + bit + Read_6x4BitFlags
  // type 4: u16c opcode -> sub-switch:
  //   510: bit; if 0 -> u32c
  //   511/516: bit
  //   512: bit + bit + u32c
}
```

## Packet_ID_AF (0xAF / -81)
```
struct Packet_AF {
  u32c hdr;
  u8c  type;
  // type 3/4: AF_B0_ListA
  // type 5: u8c + bit
  // type 6: u32c + bits(2048)
  // type 7/10/14/16: u32c
  // type 8: AF_B0_EntryA + bits(2048) + Faction ListA
  // type 9: AF_B0_EntryA + bits(2048)
  // type 11: u32c + bits(2048)
  // type 12/13: AF_StructA
  // type 15: ItemsAdded payload + bit
}
```
AF_StructA: u32c + string (max 0x800).

## Packet_ID_B0 (0xB0 / -80)
```
struct Packet_B0 {
  u32c hdr;
  u8c  type;
  // type 1/2: u32c
  // type 3: bit
  // type 4: AF_B0_ListA
  // type 5: u32c; if zero -> bits(2048)
  // type 6: u32c + bits(2048)
  // type 8: u32c
  // type 9: B0_ListB
  // type 7: no extra fields observed
}
```

## Packet_ID_B1 (0xB1 / -79)
```
struct Packet_B1 {
  u32c hdr;
  u8c  type;
  // type 1: u16c + bits(2048) + bits(2048)
  // type 2: u16c + u16c + B1_ListA
  // type 3: u32c + bits(2048)
  // type 5/9: B1_ListA
  // type 6/7/12: u32c
  // type 10/11: u32c + u32c
  // type 13: u32c + u32c + u8c
  // type 15/17: B1_ListB
  // type 18: u32c
  // types 4/8/14/16: no extra fields observed
}
```

## Packet_ID_B2 (0xB2 / -78)
```
struct Packet_B2 {
  u32c hdr;
  u8c  type;
  // type 1: u32c
  // type 2: u32c + u32c
  // type 3: u32c
  // type 4: u32c + u8c
}
```

AF/B0 helper layouts:
- AF_B0_ListA:
  - u8c count; repeat AF_B0_EntryA
- AF_B0_EntryA:
  - u32c
  - u8c
  - u32c
  - u32c
  - ListA (u8c count; repeat u8c + bit)
  - bit
  - string (max 0x800)
  - string (max 0x800)
  - ItemsAdded payload
  - bit
  - u32c
  - string (max 0x800)
  - string (max 0x800)
  - ListB (u32c count; repeat u32c + string)
  - bit
  - bit
  - u32c
- B0_ListB:
  - u32c, u32c, u32c count
  - repeat entry: u32c + bit + u16c + ItemStructA + string

B1 helper layouts:
- B1_ListA:
  - u32c, u32c, u32c count; repeat B1_EntryA
- B1_EntryA:
  - u32c, u32c
  - string
  - u32c
  - string
  - u32c
  - string
  - u32c
  - string
  - u32c
  - B1_EntryA_List
- B1_EntryA_List:
  - u32c count; repeat B1_EntryB
- B1_EntryB:
  - u32c
  - string
  - u32c
  - string
  - u8c, u8c, u8c
  - u32c
  - u32c
  - u8c
- B1_ListB:
  - u8c count; repeat B1_EntryC
- B1_EntryC:
  - u32c
  - string
  - bit
  - u32c
  - bit
  - u32c
  - bit

## Packet_ID_FRIENDS (0x97 / -105)
```
struct Packet_FRIENDS {
  u8c type;
  if (type == 3 || type == 7) {
    u16c count;
    FriendEntry[count];      // via Packet_ID_FACTION_read_block_0D50
  } else {
    u32c u0;
    u32c u1;
    bits(2048) string;
  }
}
```
FriendEntry here is the same layout as Playerfile FriendEntry but strings are read as raw bits(2048) blocks.

## Packet_ID_STORAGE (0x99 / -103)
```
struct Packet_STORAGE {
  u32c hdr;
  u32c op;
  switch (op) {
    case 2: ItemsAdded + ItemsAdded + bit;
    case 3: u32c;
    case 5:
    case 7: ItemsAdded;
    case 9: struct {         // Packet_ID_STORAGE_read_structA @ 0x1023C1E0
      ItemsAdded;
      blockA_12: 12x { bit + ItemEntryWithId } (stride 0x30);
      blockB_3:  3x { bit + ItemEntryWithId } (stride 0x30);
      blockC_6:  6x { bit + ItemEntryWithId } (stride 0x30);
      ItemsAdded;
    };
  }
}
```

## Packet_ID_MINING (0x9A / -102)
```
struct Packet_MINING {
  u32c hdr;
  u8c  type;
  switch (type) {
    case 0:
    case 2: u16c;
    case 1: u32c count; list(u16c,u16c,u32c) + u16c;
    case 3: u32c;
  }
}
```

## Packet_ID_PRODUCTION (0x9B / -101)
```
struct Packet_PRODUCTION {
  u32c hdr;
  u8c  type;
  if (type == 0) {
    bit;
    u32c;
    u8c;
    u32c;
    bit;
    u32c[4];
    list10: (u16c count + count*u32c);
  } else if (type == 2) {
    list: u32c + u8c + u32c + ItemEntryWithId + u32c;
  }
}
```

## Packet_ID_MARKET (0x9C / -100)
```
struct Packet_MARKET {
  u32c hdr;
  u8c  type;
  // type 0: u8c,u8c, structB
  // type 1: u8c,u8c, listA
  // type 2: structA + u8c,u8c, structB
  // type 3: u8c,u8c, listC + block6
  // type 4: none
  // type 5: listB
  // type 6: structA
  // type 7: u32c,u16c,u8c, structA
  // type 8: u32c + list(sub_1023D7B0)
  // type 9: none
  // type 10: block6 + bit
  // type 11: block6
  // type 12: u8c + structC
  // type 13: u8c,u8c + listD
  // type 14: u16c,u8c,u16c
  // type 15/16/17: none
  // type 18: u8c + structC2
  // type 19: u8c,u8c + listE
  // type 20: u16c,u16c
  // type 21: u8c,u8c, structB
  // type 22: u8c,u8c, listA
  // type 23: structA + u8c,u8c, structB
  // type 24: u8c,u8c, listC
  // type 25: none
  // type 26: structA
  // type 27: u32c,u16c,u8c, structA
  // type 28: u32c + list(sub_1023D7B0)
  // type 29: u16c,u16c
}
```
Market helpers:
- structA: ItemStructA (same as ItemEntry)
- structB: u8c; u16c; u32c,u32c; u16c x4; bit; u8c,u8c; bit
- structC: u8c,u8c,u16c,bit,u8c
- structC2: u8c,u8c,u16c,bit
- listA: u8c count; repeat structA + u32c + u32c + u32c
- listB: u8c count; repeat structA + u32c + u16c + u32c
- listC: structA + u8c count; repeat u32c,u32c,u16c,u16c,u32c,string
- listD: u32c count; repeat u16c,u8c,u16c
- listE: u32c count; repeat u16c,u32c
- block: u32c count; repeat u16c + 5x bits(9)
- block6: 6x block

## Items / Inventory packets

Shared helpers:
- ItemStructA (aka ItemEntry): see AddressMap ItemEntry/ItemStructA.
- ItemEntryWithId: u32c entryId + ItemStructA.
- ItemsAdded payload: u16c + 3x u32c + u16c count + [ItemStructA + u16c attachCount + attachCount*u32c].
- list_u16count_u32c: u16c count, then count*u32c.

## Packet_ID_MOVE_ITEMS (0x8A / -118)
```
struct Packet_MOVE_ITEMS {
  u32c magic;           // expects 91
  list_u16count_u32c list; // item ids
  u8c op1;
  u8c op2;
  u8c op3;
  u8c op4;
}
```
Notes: op1/op2 typically 1..17; many branches require list_count==1. See AddressMap for op dispatch.

## Packet_ID_ITEMS_CHANGED (0x82 / -126)
```
struct Packet_ITEMS_CHANGED {
  u32c magic;        // expects 91
  u8c  count;
  ItemEntryWithId entries[count];
}
```

## Packet_ID_ITEMS_REMOVED (0x81 / -127)
```
struct Packet_ITEMS_REMOVED {
  u32c magic;        // expects 91
  u8c  reason;
  list_u16count_u32c ids;
}
```

## Packet_ID_ITEMS_ADDED (0x93 / -109)
```
struct Packet_ITEMS_ADDED {
  u32c magic;        // expects 91
  u8c  type;
  if (type == 3) u8c subtype;
  ItemsAdded payload;
}
```

## Packet_ID_ITEM_REMOVED (0x88 / -120)
```
struct Packet_ITEM_REMOVED {
  u32c magic;        // expects 91
  u8c  reason;       // handler uses 1/2/3
  u32c itemId;
  bit  flag;
}
```

## Packet_ID_USE_ITEM (0xA4 / -92)
```
struct Packet_USE_ITEM {
  u32c magic;        // expects 91
  u32c itemKey;      // lookup key in inventory helper
  bit  flag;
  u8c  action;       // handler accepts 0x17..0x1C
}
```

## Packet_ID_UNLOAD_WEAPON (0x8F / -113)
```
struct Packet_UNLOAD_WEAPON {
  u32c magic;        // expects 91
  u8c  mode;         // handler uses 2/3
  if (mode == 2) ItemEntryWithId item;
  if (mode == 1 || mode == 2) u32c u0;
}
```
Note: read order in CShell is magic -> mode -> (item) -> u0.

## Packet_ID_MERGE_ITEMS (0x90 / -112)
```
struct Packet_MERGE_ITEMS {
  u32c magic;        // expects 91
  bit  flag;
  if (flag) {
    ItemEntryWithId a;
    ItemEntryWithId b;
  } else {
    u32c a;
    u32c b;
  }
}
```

## Packet_ID_SPLIT_CONTAINER (0xA2 / -94)
```
struct Packet_SPLIT_CONTAINER {
  u32c a;
  u32c b;
  u16c count;
  ItemEntryWithId item;
  u8c  tail;         // read after ItemEntryWithId
}
```

## Packet_ID_REPAIR_ITEM (0xAD / -83)
```
struct Packet_REPAIR_ITEM {
  u32c a;
  u32c b;
  bit  flag;
}
```

## Packet_ID_RECYCLE_ITEM (0xAE / -82)
```
struct Packet_RECYCLE_ITEM {
  u32c magic;        // expects 91
  u32c itemId;
}
```

## Packet_ID_NAME_CHANGE (0x8E / -114)
```
struct Packet_NAME_CHANGE {
  u32c magic;        // expects 91
  bits(2048) block;  // raw 256-byte block
}
```
Notes: bytes[0x00..0x1F] are name string; byte[0x20] is a flag; one extra bit read after block.

## Packet_ID_BACKPACK_CONTENTS (0x92 / -110)
```
struct Packet_BACKPACK_CONTENTS {
  u32c magic;
  u8c  type;
  u32c a;
  u32c b;
  ItemsAdded payload;
  list_u16count_u32c list;
}
```

## Packet_ID_MAIL (0x8C / -116)
```
struct Packet_MAIL {
  u32c magic;
  u8c  count;                 // BitStream_ReadBitsCompressed(8)
  MailEntry entries[count];
  bit  hasIdList;
  if (hasIdList) {
    u8c count;
    u32c ids[count];
  }
}
```
Write path (client->server; Packet_ID_MAIL_write @ 0x1013D2E0):
- write u32c magic via sub_10031AB0 (value from sub_100079B0(0x5B)).
- write entries via Packet_ID_MAIL_write_entries (u8c count + Packet_ID_MAIL_write_entry).
- write bit hasIdList; if set, Packet_ID_MAIL_write_idlist (u8c count + u32 list).
SendMail UI path (CWindowSendMail handler @ ~0x1013E040):
- Builds Packet_ID_MAIL via ctor (ID -116), fills a single entry with Packet_ID_MAIL_entry_fill.
- Entry numeric fields set to 0 (u32/u8/u32); recipient/subject/body strings copied into @+0x0C/@+0x20/@+0x48.
- hasIdList is unset in this path (no id list written).
- Validation rules: recipient len >= 4, subject len >= 5, body len >= 10; rejects self‑send (case‑insensitive); sub_10248020 filter on each string.
- Send call: LTClient_SendPacket_BuildIfNeeded(packet, 2, 1, 3, 1).

MailEntry (Packet_ID_MAIL_read_entry @ 0x1013DA40; read order):
- u32c
- u8c (BitStream_ReadBitsCompressed 8)
- u32c
- bits(2048) string @+0x0C (vtbl+0x38, max 0x800)
- bits(2048) string @+0x48 (vtbl+0x38, max 0x800)
- if u8c@+0x04 == 0: bits(2048) string @+0x20 (vtbl+0x38, max 0x800)
Note: entries are stored in a vector/list with stride 0x848 bytes (Packet_ID_MAIL_entry_list_insert @ 0x1013DC60).

MailEntry write (Packet_ID_MAIL_write_entry @ 0x1013D0F0; write order):
- u32c (BitStream_WriteBitsCompressed 32; endian swap if Net_IsBigEndian)
- u8c  (BitStream_WriteBitsCompressed 8)
- u32c (BitStream_WriteBitsCompressed 32; endian swap if Net_IsBigEndian)
- bits(2048) string @+0x0C (vtbl+0x34)
- bits(2048) string @+0x48 (vtbl+0x34)
- if u8c@+0x04 == 0: bits(2048) string @+0x20 (vtbl+0x34)

MailEntry UI fill helper (Packet_ID_MAIL_entry_fill @ 0x1013C970):
- u32 @+0x00, u8 @+0x04, u32 @+0x08
- strncpy_s @+0x0C (len 0x14), @+0x20 (len 0x28), @+0x48 (len 0x800)

Mail id list (Packet_ID_MAIL_read_idlist @ 0x1013DB60):
- u8c count (BitStream_ReadBitsCompressed 8)
- repeat count:
  - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)

## Packet_ID_WEAPONFIRE (0x87 / -121) client->server
```
struct Packet_WEAPONFIRE {
  u32c a;
  u16c b;
  u32c c;
}
```

## Packet_ID_RELOAD (0x91 / -111) client->server
```
struct Packet_RELOAD {
  u32c magic;        // expects 91
  bit  flag;
  if (flag == 0) {
    u32c a;
    u32c b;
  }
}
```

## Packet_ID_UPDATE (0x7E / -130) client->server
```
struct Packet_UPDATE {
  // read() only calls Packet_InitBitStreamFromPayload (no field parsing).
  // payload layout below mirrors the write() side (WeaponFireEntry list).
  // Packet_ID_UPDATE_write only writes the terminating zero type byte (no explicit count).
}
```
WeaponFireEntry (bit order; type byte written first by WeaponFireEntry_write):
- type1 (WeaponFireEntry_type1_write @ 0x101A1310):
  - u32c @+0x18
  - u32c @+0x1C
  - u8c  @+0x20
  - bit: if u32@+0x9C > 0 then write u32 (uses Write_u32_raw helper; appears non-compressed)
  - bit: if u8@+0x98 > 0 then write 3 bits @+0x98
  - u32c @+0xB4
  - then type2 payload (same entry object)
- type2 (WeaponFireEntry_type2_write @ 0x101A00B0):
  - u32c @+0x04
  - Write_QuantVec3_And9 @+0x08
  - Write_BitfieldBlock_0x30 @+0x22
  - bit: flag @+0x84; if flag==1, stop here
  - u8 (8 bits) from (u32@+0x64 + 0x5A)
  - bit: if u32@+0x68 != 0x10 then write 12 bits @+0x68
  - bit: if u32@+0x6C != 0 then write 5 bits @+0x6C
  - bit: if u16@+0x86 > 0 then write u16c @+0x86
  - bit @+0x74
  - bit: if u32@+0x78 > 0 then write 7 bits @+0x78
  - if u32@+0x78 > 0: Write_QuantVec3 @+0x88
  - bit @+0x7C; if set, write 4 bits @+0x94 and 4 bits @+0x95
  - bit: if u32@+0x80 > 0 then write 6 bits @+0x80
  - if BitfieldBlock_0x30_HasExtra(@+0x22):
    - bit: if u16@+0x96 > 0 then write u16c @+0x96
    - optional 7 bits @+0xA3 if sub_102323C0(...) returns true
  - 8 bits @+0xA2
  - 3 bits @+0xB0
  - bit @+0xB8
  - 10 bits @+0xBC
  - 10 bits @+0xC0
  - bit @+0xA4
- type3 (WeaponFireEntry_type3_write @ 0x101A0360):
  - u32c @+0x04
  - u16c @+0x60
  - 3 bits @+0xA0
  - u8c  @+0xA1
  - Write_QuantVec3_And9 @+0x08
  - u8 (8 bits) @+0x85; if nonzero, stop here
  - bit @+0x7C
  - 5 bits @+0x6C
  - 4 bits @+0x70
  - bit: if u32@+0x80 > 0 then write 6 bits @+0x80
  - if 2 <= u32@+0x80 <= 4: write u32c @+0x78
  - 14 bits @+0xBC
- type4 (WeaponFireEntry_type4_write @ 0x101A04D0):
  - u32c @+0x04
  - u16c @+0x86
  - bit @+0x84
  - 14 bits @+0xBC
  - sub_1019F280 @+0xC4: 4 bits (bytes +0..+3, one bit each)
  - Write_QuantVec3_And9 @+0x08
  - bit: if u32@+0x54 > 0 then write u32c @+0x54
  - bit: if u32@+0x58 > 0 then write u32c @+0x58
  - bit: if u32@+0x5C > 0 then write u32c @+0x5C
  - string @+0xC8 (vtbl+0x34, max 0x800)

## Packet_ID_B5 (0xB5 / -75)
```
struct Packet_B5 {
  u32c hdr;
  u8c  type;
  // type-specific:
  // 1: B5_List
  // 2: B5_Entry
  // 3/7/13: B5_Entry_List
  // 4: B5_Entry2
  // 6/8/9: u32c
  // 11: B5_Entry_List + B5_ExtraList
  // 12: u32c + u8c
  // default: none
}
```
B5_List:
- u16c count; repeat B5_Entry.

B5_Entry (read order):
- u32c
- u8c  (BitStream_ReadBitsCompressed 8)
- u32c
- u16c
- Read_QuantVec3_9bit
- Read_BitfieldBlock_0x30
- u8c  (BitStream_ReadBitsCompressed 8)
- u16c
- u8c  (BitStream_ReadBitsCompressed 8)
- bits(2048)
- bit
- bit
- bit
- u32c
- bits(2048)
- B5_Entry_List

B5_Entry_List:
- u16c count; repeat B5_Entry2.

B5_Entry2 (read order):
- u32c
- bits(2048)
- B5_Entry2SubA
- u16c
- u16c
- bit
- u32c
- bits(2048)
- u32c
- bits(2048)
- bit
- bit
- bits(2048)
- B5_Entry2Map
- u32c count; repeat:
  - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
  - Read_Substruct_10249E10
  - ItemEntryWithId
  - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)

B5_Entry2SubA:
- u8c
- u8c
- u8c
- u16c
- u8c
- u32c
- bits(2048)

B5_Entry2Map:
- u32c count
- repeat count:
  - u32c key (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
  - bits(2048) string

B5_ExtraList:
- u32c count
- repeat count: B5_ExtraEntry

B5_ExtraEntry:
- u32c
- bit
- bit

## Packet_ID_B6 (0xB6 / -74)
```
struct Packet_B6 {
  u32c hdr;
  u8c  type;
  // type-specific:
  // 1/3: u32c
  // 2: B6_StructB + bit; if structB.u16 == 0x3E0 -> B6_StructD + B6_StructA; if == 0x3E2 -> B6_StructA
  // 4: B6_StructB + bit + B6_StructC
  // 5: B6_StructB
  // 6/7/8: u32c + u32c
}
```
B6_StructA (read order):
- u32c
- u32c
- u32c
- u32c
- Playerfile_read_blockC0
- bits(2048)
- u32c
- u32c
- sub_10246F10 (string-like)

B6_StructB (read order):
- u32c
- u16c
- bits(2048)
- u8c  (BitStream_ReadBitsCompressed 8)
- 6x u16c (Read_u16c_x6)
- 6 bit flags (Read_6BitFlags)

B6_StructC (read order):
- u32c
- u32c
- u32c
- u32c
- sub_10246F10
- u32c count; repeat:
  - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
  - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
  - bit
  - bits(2048)
  - sub_10246F10
  - insert (sub_10148650)

B6_StructD (read order):
- u32c countA; repeat: u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
- u32c countB; repeat: B6_StructD_Entry

B6_StructD_Entry (read order):
- u32c
- bits(2048)
- u32c count; repeat: u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)

## Packet_ID_TRANSFER_ITEMS (status)
- RTTI only in CShell: TypeDescriptor @ 0x1035465C, COL @ 0x10329F90, vtable slot @ 0x10329FC8 (null).
- Only RTTI/vftable list reference found (no handlers or packet dispatch use in FoTD/FoM binaries).

## Notes
- This draft is intentionally conservative: it mirrors the decoded read order and type switches.
- Use AddressMap offsets for strict field placement and for any nested helper reads.
- Next step: transcribe these into emulator-side parsing structs/classes and bind to handler IDs.
