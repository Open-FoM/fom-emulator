# ID_WORLD_LOGIN_DATA (0x79)

## Summary
- Direction: world -> client
- Purpose: world login data (player profile, stats, appearance, spawn)
- Transport: RakNet payload decoded by `VariableSizedPacket`/BitStream; dispatched by `CGameServerShell::OnMessage`.
- Note: **not** the same as `ID_WORLD_LOGIN (0x72)` which is client -> master (CShell).

## On-wire encoding (source of truth)
```
ID_WORLD_LOGIN_DATA (0x79)
u8  msgId   = 0x79
payload     = VariableSizedPacket + LT BitStream compressed fields (u8c/u16c/u32c)
```
Key points:
- Uses LT BitStream compressed reads (not Huffman / not RakNet StringCompressor).
- Some u32/u16 fields are byte-swapped on big-endian clients.
- One blob is read via vtbl+56 (max 2048 bits) into `PlayerBlobH`.

## Field Table
| Offset | Field | Type | Encoding | Notes |
|---|---|---|---|---|
| 0x0430 | worldId | u8c | LT BitStream compressed | Gate: must match SharedMem[0x1EEC1]. |
| 0x0434 | worldInst | u32c | LT BitStream compressed | Gate: must match SharedMem[0x1EEC2]. |
| 0x0438 | returnCode | u8c | LT BitStream compressed | 1=success; 4/5 UI errors; else retry. |
| 0x043C | PlayerProfileA | block | see details | Skill trees + slot tables. |
| 0x0878 | PlayerProfileB | block | see details | 4x records; only u16c on-wire. |
| 0x08B8 | PlayerProfileC | block | bitfield | Appearance + ability IDs. |
| 0x08EC | PlayerProfileD | u32c[53] | LT BitStream compressed | Stat table. |
| 0x0CCC | PlayerStringsE | block | blob/string | SharedStringTable keys 11219/11224/126546. |
| 0x0F28 | profileFlag0 | u8c | LT BitStream compressed | Unknown. |
| 0x0F29 | profileFlag1 | u8c | LT BitStream compressed | Unknown. |
| 0x0F2A | profileEntryCount | u16c | LT BitStream compressed | Count for profileEntries. |
| 0x0F2C | profileEntries[] | block[] | ProfileC layout | count * 0x32 bytes. |
| 0x49C4 | flag2 | bit | BitStream bit | Unknown. |
| 0x49C8 | PlayerVecF | block | compact vec3 s16+yaw9 | Base spawn position. |
| 0x49D8 | currencyA_u32c (field_18904_u32c) | u32c | LT BitStream compressed | Also written to SharedMem key 125506. |
| 0x49DC | currencyB_u32c (field_18908_u32c) | u32c | LT BitStream compressed | Also written to SharedMem key 125508. |
| 0x49E0 | flag3 | bit | BitStream bit | Written to SharedMem key 125510. |
| 0x49E2 | valC_u16c | u16c | LT BitStream compressed | Written to SharedMem key 126514. |
| 0x49E4 | entryG_header_u32 | u32c | LT BitStream compressed | Header for EntryG block. |
| 0x49E8 | PlayerEntryG[10] | block[] | see details | 10 entries, 12 bytes each. |
| 0x4A60 | PlayerBlobH | blob | vtbl+56 (max 2048 bits) | Cache list; count at +0x01. |
| 0x0C9C | PlayerTableI | block | see details | Copied to slot index 4. |
| 0x4A80 | PlayerVecJ | block | compact vec3 s16+yaw9 | Override spawn position/rotation. |
| 0x4A90 | hasOverrideSpawn | bit | BitStream bit | Enables VecJ override. |
| 0x4A94 | PlayerListK | block | see details | Copied to slot index 5. |

Note: Offsets are struct offsets; read order follows `ID_WORLD_LOGIN_Read`.

## Field Details

### World header gates
- `worldId` must match SharedMem[0x1EEC1] (via `SharedMem_ReadDword_Locked(this, 0)`).
- `worldInst` must match SharedMem[0x1EEC2] (via `SharedMem_ReadDword_Locked(dword_101B4508, 91)`).
- `returnCode`:
  - 1 => success path (cache/apply profile + spawn).
  - 4 => UI msg 1724, reset state.
  - 5 => UI msg 1721, reset state.
  - other => retry timer (+5s) until attempts >= 6, then UI msg 1722.

### PlayerProfileA (WorldLogin_ReadProfileBlockA)
- Core player profile blob (skills/trees + slot tables).
- Layout (from readers + WorldLogin_CopyProfileBlockA):
  - +0x00  SkillTreeListA (WorldLogin_ReadSkillTreeList)
           * header: u16c + u32c + u32c + u32c (unknown semantics)
           * entryCount: u16c
           * entries: WorldLogin_ReadSkillTree (SkillTreeEntry)
               - WorldLoginSkillEntry48 (see below)
               - skillIdCount: u16c
               - skillIds: skillIdCount * u32c
  - +0x24  SkillTable12 (12 * 48B slots)
           * per-slot: present bit; if 0 => slot zeroed; if 1 => u32c slotId + WorldLoginSkillEntry48
           * consumed in Handle_ID_WORLD_LOGIN: slots map to indices 5..16; if slotId != 0 then
             SkillEntry.abilityItemId is granted via WorldLogin_GrantAbilityIfAllowed.
  - +0x27C SkillTable3 (3 * 48B slots)
           * per-slot: present bit; if 0 => slot zeroed; if 1 => u32c slotId + WorldLoginSkillEntry48
  - +0x2F8 SkillTable6 (6 * 48B slots)
           * per-slot: present bit; if 0 => slot zeroed; if 1 => u32c slotId + WorldLoginSkillEntry48
  - +0x41C SkillTreeListB (same layout as A)
  - +0x42C u32
  - +0x430 u32
  - +0x434 u32
  - +0x438 u8
- WorldLoginSkillEntry48 layout (WorldLogin_ReadSkillEntry; within each 48B slot).
  NOTE: Not the same as Packet_ID_SKILLS ItemStatEntry (20B) in CShell_Gameplay_Packets.md.
  Defaults from WorldLogin_SkillTable{12,6,3}_Init.
  - +0x00 u16c abilityItemId (used by Handle_ID_WORLD_LOGIN to grant ability/accessory)
  - +0x02 u16c (default 0; no consumers found)
  - +0x04 u16c (default 0; no consumers found)
  - +0x06 u16c (default 0; no consumers found)
  - +0x08 u8 (default 100; no consumers found)
  - +0x09 u8 (default 0; no consumers found)
  - +0x0C u32c (default 0; no consumers found)
  - +0x10 u32c (default 0; no consumers found)
  - +0x14 u32c (default 0; no consumers found)
  - +0x18 u8 (default 0; no consumers found)
  - +0x19 u8 (default 0; no consumers found)
  - +0x1A u8 (default 0; no consumers found)
  - +0x1B..+0x1E u8[4] (default 0; no consumers found)
  - Slot tail (local-only): +0x20..+0x2F (12 bytes), zeroed in init, not on-wire.
    (two u32 + one u8 within SkillEntry at +0x20/+0x24/+0x28)

### PlayerProfileB (WorldLogin_ReadProfileBlockB)
- 4 records, each 16 bytes in memory.
- On-wire: only the first u16c of each record is sent/received.
  The remaining 14 bytes per record are local-only and stay zeroed.
- Handler copies 0x40 bytes into slot index 1 (vtbl+88, index 1).
- Consumer scan: only `Handle_ID_WORLD_LOGIN` calls slot index 1; no other object.lto call sites use index 1.

### PlayerProfileC (WorldLogin_ReadProfileBlockC)
- Bitfield/packed stats blob (0x32 bytes).
- Bit layout (in order, bits): 1,1,5,5,32,5,6,4,12,12,12,
  then if bit(flag) set: 9x12, then 1,1,1,1.
- Writer sets the extra 9x12 block only if any word[11..19] is nonzero.
  If all word[11..19] are zero, the flag bit is 0 and the block is omitted.
- `WorldLogin_ApplyProfileCToPlayer` treats word indices 11..18 (offsets 0x16..0x24) as ability IDs (u16 each); zeros are safe.
- Field mapping (word index = byteOffset/2; see AppearanceCache_BuildFromProfileC @ 0x10006F50):

  | word idx | bits | name | notes |
  | --- | --- | --- | --- |
  | 0 | 1 | isFemale | 1 = female, 0 = male. |
  | 1 | 1 | skinTone | 0 = White, 1 = Black (used for torso/hands/legs textures). |
  | 2 | 5 | headTexA | index 0..0x1B -> off_10142B98/off_10142A48. |
  | 3 | 5 | headTexB | index 0..0x16 -> off_10142E08/off_10142CE8. |
  | 4 | 32 | unknown_u32 | no consumers found; overlaps bytes used by idx 5..7. |
  | 5 | 5 | unknown_5bit | no consumers found (only read/write). |
  | 6 | 6 | unknown_6bit | no consumers found (only read/write). |
  | 7 | 4 | unknown_4bit | no consumers found (only read/write). |
  | 8 | 12 | torsoModelId | AppearanceTable type 11/13; default 797(f)/611(m). |
  | 9 | 12 | legsModelId | AppearanceTable type 12/14; default 907(f)/760(m). |
  | 10 | 12 | modelId_type15 | AppearanceTable type 15; stored to appearance slot @ +5068. |
  | 11 | 12 | slot_type5_A | AppearanceTable type 5; slot @ +5196. |
  | 12 | 12 | abilityId_0 | part of ability ID block (only present if flag set). |
  | 13 | 12 | slot_type7_B | AppearanceTable type 7; slot @ +5324. |
  | 14 | 12 | slot_type5_C | AppearanceTable type 5; slot @ +5452. |
  | 15 | 12 | slot_type5_D | AppearanceTable type 5; slot @ +5580. |
  | 16 | 12 | slot_type5_E | AppearanceTable type 5; slot @ +5708. |
  | 17 | 12 | abilityId_1 | part of ability ID block (only present if flag set). |
  | 18 | 12 | slot_type5_F | AppearanceTable type 5; slot @ +5836. |
  | 19 | 12 | handsModelId | AppearanceTable type 5; fallback Hands1 if 0/invalid. |
  | 20 | 1 | flag0 | no consumers found (only read/write). |
  | 21 | 1 | flag1 | no consumers found (only read/write). |
  | 22 | 1 | flag2 | no consumers found (only read/write). |
  | 23 | 1 | flag3 | no consumers found (only read/write). |

- AppearanceTable lookup entries are runtime-loaded (dword_101B9710 is -1 in static IDB),
  so exact slot names require a live dump after resources are initialized.
- Consumers (object.lto):
  - `AppearanceCache_BuildFromProfileC` @ 0x10006F50 (builds skin/model paths).
  - `sub_100077B0` @ 0x100077B0 (applies model attachments to an object using the appearance table).
  - `WorldLogin_ApplyProfileCToPlayer` @ 0x10017DE0 (copies profile + grants abilities).
- Head texture arrays (static, used as `off_*[3*idx]`):
  - `off_10142B98` / `off_10142A48` (headTexA, female/male, 0x1C entries)
  - `off_10142E08` / `off_10142CE8` (headTexB, female/male, 0x17 entries)
- AppearanceTable type codes (entry->type at +0x08):
  - 11/13: torso models
  - 12/14: legs models
  - 15: modelId_type15
  - 5/7: appearance slots
  - 6/23: ability IDs (granted in ApplyProfileCToPlayer)

### PlayerProfileD (WorldLogin_ReadProfileBlockD)
- u32c[53] (53 x 32-bit compressed values).
- ProfileD has larger defaulted structure (see ctor):
  - ctor sets 53-byte array at +0x27D to 53
  - ctor sets u32[53] at +0x2B4 to 0
  - ctor copies default u32[53] tables at +0x00 and +0xD4
- On-wire: exactly 53 u32c values (no extra headers/flags).
- Stat index map (0x00..0x34) - names from `Docs/Exports/item_stats_client_display.csv` header,
  plus cshell call-site inference for 0x31..0x34 (notes below).

  | idx | name | stringId | notes |
  | --- | ---- | ----- | ----- |
  | 0x00 | Health | 6300 | |
  | 0x01 | Stamina | 6301 | |
  | 0x02 | Bio Energy | 6302 | |
  | 0x03 | Aura | 6303 | |
  | 0x04 | Universal Credits | 6304 | index 4 used as currency delta (currencyA - currencyB). |
  | 0x05 | Faction Credits | 22103 | |
  | 0x06 | Penalty | 6306 | |
  | 0x07 | Prisoner Status | 6307 | used to block item 'j' (error msg 5668). |
  | 0x08 | Highest Penalty | 6308 | |
  | 0x09 | Most-Wanted Status | 6309 | |
  | 0x0A | Wanted Status | 6310 | |
  | 0x0B | Agility | 6311 | movement factor uses stat 11; ItemOverride confirms 11=Agility. |
  | 0x0C | Ballistic Damage | 6312 | |
  | 0x0D | Energy Damage | 6313 | |
  | 0x0E | Bio Damage | 6314 | |
  | 0x0F | Aura Damage | 6315 | |
  | 0x10 | Destruction | 6316 | |
  | 0x11 | Weapon Recoil | 6317 | |
  | 0x12 | Armor | 29905 | |
  | 0x13 | Shielding | 6319 | |
  | 0x14 | Resistance | 6320 | |
  | 0x15 | Reflection | 6321 | |
  | 0x16 | Health Regeneration | 6322 | |
  | 0x17 | Stamina Regeneration | 6323 | |
  | 0x18 | Bio Regeneration | 6324 | |
  | 0x19 | Aura Regeneration | 6325 | |
  | 0x1A | Coins | 6326 | terminal uses stat 0x1A as coins. |
  | 0x1B | Healing Cooldown | 6427 | |
  | 0x1C | Food Cooldown | 6428 | |
  | 0x1D | Xeno Damage | 6329 | |
  | 0x1E | Health Drain | 6330 | |
  | 0x1F | Stamina Drain | 6331 | |
  | 0x20 | Bio Energy Drain | 6332 | |
  | 0x21 | Aura Drain | 6333 | |
  | 0x22 | Protection Bypass | 6334 | |
  | 0x23 | Effective Range | 6335 | |
  | 0x24 | Weapon Fire Delay | 6336 | |
  | 0x25 | Blank 1 | 6337 | unnamed in export; no semantics found yet. |
  | 0x26 | Blank 2 | 6338 | unnamed in export; no semantics found yet. |
  | 0x27 | Weight | 6339 | used by inventory/weight UI update (stat 0x27). |
  | 0x28 | Jump Velocity Multiplier | 6340 | |
  | 0x29 | Fall Damage Multiplier | 6341 | |
  | 0x2A | Nightvision | 6342 | |
  | 0x2B | Soundless Movement | 6343 | |
  | 0x2C | Activation Distance | 6344 | |
  | 0x2D | Sprint Speed Multiplier | 6345 | |
  | 0x2E | Max Stamina | 6346 | terminal uses stat 0x2E as max stamina. |
  | 0x2F | Bio Energy Replenishing Cooldown | 6347 | |
  | 0x30 | Aura Healing Cooldown | 6348 | labeled `stat_0x30` in exports; stringId from `CRes_strings.csv`. |
  | 0x31 | ShieldSettingOverrideFlag | n/a | if nonzero, client uses fixed 0.4 shield setting instead of config (cshell @ 0x658BCE47). Safe default = 0. |
  | 0x32 | Unknown | n/a | no direct cshell/object logic xrefs; only generic stat display loops (StatGroup_Read). Safe default = 0. |
  | 0x33 | VortexEmitterCooldownFlag | n/a | nonzero blocks item 'j' use; paired w/ 0x34 in msg 5661. Safe default = 0. |
  | 0x34 | VortexEmitterCooldownSeconds | n/a | value passed into msg 5661 ("Portable Vortex Particle Emitter ... %1 seconds"). Safe default = 0 (ignored if 0x33=0). |

### PlayerStringsE (WorldLogin_ReadStringBundleE)
- +0x00  u32c (id?)
- +0x04  flag bit
- +0x05  strA (string/blob; max 2048 bits)
- +0x19  strB (string/blob; max 2048 bits)
- +0x39  strC (string/blob; max 2048 bits)
- +0x239 strD (string/blob; max 2048 bits)
- Handler uses SharedStringTable_WriteAt with keys:
  - 11219 <- strA
  - 11224 <- strB+strC
  - 126546 <- strD
- cshell.dll usage:
  - key 11219 is written by name-change and read by UI (send mail / name fields).
  - key 11224 is written by name-change and read by UI field text (likely secondary name/title).
  - key 126546 is only stored in cshell (no read found yet).

### profileEntryCount / profileEntries
- profileEntries use the same ProfileC bit layout (0x32 bytes each).
- Handler only uses these to seed `AppearanceCache_BuildFromProfileC` (no other consumers).
- Safe default: count=0 (skip appearance loop).

### PlayerVecF / PlayerVecJ / hasOverrideSpawn
- PlayerVecF is the base spawn position (compact vec3 s16 + yaw9).
- PlayerVecJ is the override spawn position (compact vec3 s16 + yaw9).
- `hasOverrideSpawn` selects override spawn/rotation.
- override yaw is converted: `radians = yawDeg * 0.017453292 - pi`.

### Currency + flags
- currencyA/currencyB feed stat index 0x04 as max(0, currencyA - currencyB).
- currencyA_u32c (field_18904_u32c) is also written to SharedMem key 125506.
- currencyB_u32c (field_18908_u32c) is also written to SharedMem key 125508.
- flag3 is written to SharedMem key 125510.
- valC_u16c is forwarded to SharedMem key 126514.

### PlayerEntryG (WorldLogin_ReadEntryG)
- Per-entry (on-wire):
  - present bit
  - u16c field0
  - u8  field1
  - u8  field2
  - 7b  field3
  - 7b  field4
  - 9b  field5
  - u8  field6
  - u8  field7
  - u8  field8
- Writer only sets present bit if both 7-bit fields (field3/field4) are nonzero.
- If present bit is 0, the entry is zeroed.
- No observed consumers in object.lto beyond `ID_WORLD_LOGIN_Read` and `ID_WORLD_LOGIN_DATA_Write`.

### PlayerBlobH (vtbl+56 read)
- Used as a cache list in handler:
  - count = u16 at +0x01
  - entries = 0x32 bytes each starting at +0x03 (ProfileC layout)
  - each entry fed into `AppearanceCache_BuildFromProfileC`
- Safe default: count=0 (skip cache warmup).

### PlayerTableI (WorldLogin_ReadTableI)
- Header: u8 + u8 + u8 + u8 + u32c
- Count: u32c
- Entry (20B in memory; on-wire fields shown):
  - u32 id
  - u8  type
  - u32 value
  - u8  flag1
  - u8  flag2
  - u8  flag3
  - remaining bytes are zeroed by default (unknown/unused)
- Handler copies into slot index 4 via `WorldLogin_CopyTableI`.
- No downstream consumers found in object.lto yet (only read + rank adjust helpers).

### PlayerListK (WorldLogin_ReadListK)
- Header: u32c + u32c
- Count: u32c
- Entry: u16c id, u8 value, 1-bit flag (stored as u8 at +3)
- Handler copies into slot index 5 via `WorldLogin_CopyListK`.
- Used: `WorldLogin_ListK_IsFlagSet(slot5, 0x25)` toggles takeover icons.

## Read/Write (decomp)
- Read: `ID_WORLD_LOGIN_Read` (object.lto) @ 0x10078D80
- Write: `ID_WORLD_LOGIN_DATA_Write` (object.lto) @ 0x1007ACF0
- Handler: `Handle_ID_WORLD_LOGIN` (object.lto) @ 0x1007AD90
- Helpers: `WorldLogin_ReadProfileBlockA/B/C/D`, `WorldLogin_ReadStringBundleE`,
  `WorldLogin_ReadCompactVec3S16Yaw`, `WorldLogin_ReadEntryG`, `WorldLogin_ReadTableI`,
  `WorldLogin_ReadListK`, vtbl+56 ReadBlob2048.

## IDA Anchors
- ida3 (object.lto):
  - Handle_ID_WORLD_LOGIN @ 0x1007AD90
  - ID_WORLD_LOGIN_Read @ 0x10078D80
  - ID_WORLD_LOGIN_DATA_Write @ 0x1007ACF0
  - WorldLogin_ReadProfileBlockA @ 0x1000DB00
  - WorldLogin_ReadProfileBlockB @ 0x1000E560
  - WorldLogin_ReadProfileBlockC @ 0x1000E6B0
  - WorldLogin_ReadProfileBlockD @ 0x100E34A0
  - WorldLogin_ReadStringBundleE @ 0x1000EE90
  - WorldLogin_ReadCompactVec3S16Yaw @ 0x1000E0B0
  - WorldLogin_ReadEntryG @ 0x100172C0
  - WorldLogin_ReadTableI @ 0x100DDE70
  - WorldLogin_ReadListK @ 0x100E63C0
  - AppearanceCache_BuildFromProfileC @ 0x10006F50

## Validation
- ida3: verified 01/07/26 (decompile + disasm)
- ida2: n/a

## Notes / Edge Cases
- Min-viable packet checklist (safe defaults):
  - Must match world gates: `worldId/worldInst` must equal SharedMem keys 0x1EEC1/0x1EEC2.
  - `returnCode` must be 1 to reach success path (anything else triggers retry or UI error).
  - ProfileD: set all 53 u32c to 0 (safe). Indices 0x31..0x34: keep 0.
  - ProfileC: required; all-zero accepted (default appearance path).
  - ProfileB: 4x u16c values; can be zero.
  - StringsE: all strings can be empty (max sizes still apply).
  - ProfileEntries/BlobH: set count=0 (skips cache build).
  - EntryG: set present bits=0 (entries zeroed).
  - VecF/VecJ: may be zero; spawn uses u16s (0,0,0) unless you override.
- Handler usage highlights:
  - On success, spawn/rot is applied to `g_pLocalPlayerObj`.
  - `profileEntryCount/profileEntries` and `PlayerBlobH` only seed appearance cache.
  - `PlayerProfileD` updates stat table; index 4 uses (currencyA - currencyB).
- Known unknowns (static-only):
  - `sharedMem_126515_block` (124B) is written by `sub_1005B120` (SharedMem key 126515); no downstream readers found in object.lto.
  - `sharedKey11224_block` (36B) is passed into `SharedStringTable_WriteKey11224`; no consumers beyond the shared-string write are known here.
  - `PlayerTableI` and `PlayerListK` are fully read/copied but show no clear post-login consumers in object.lto; likely UI/inventory metadata.
