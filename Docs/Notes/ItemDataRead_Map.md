# Item Data Read Map (CShell.dll)

Goal: enumerate all item-read entry points and the shared readers so custom item data can be fed through the same client path.

## Core readers (shared)
- `ItemEntryWithId_read` @ `0x102550A0`  
  - Reads: `u32 entryId` + `ItemStructA_read` (item instance fields).  
  - TemplateId lives at `ItemStructA + 0x00` (so `ItemEntryWithId + 0x04`).  
- `ItemStructA_read` @ `0x10254F80`  
  - Reads: `u16 @+0x00,+0x02,+0x04,+0x06`, `u8 @+0x08,+0x09`, `u32 @+0x0C,+0x10,+0x14`, `u8 @+0x18,+0x19,+0x1A`, `u8 @+0x1B..+0x1E`.  
  - Known semantics (from tooltip + helpers):  
    - `+0x00` templateId (g_ItemTemplateById index)  
    - `+0x02` stackCount / qty (used in tooltip; repurposed as sub‑id/icon index for some items)  
    - `+0x04` ammoOverrideId (0 => use template ammo)  
    - `+0x06` durabilityCur (used by Item_GetDurabilityPercent; also formatted as duration/level in tooltip for some items)  
    - `+0x08` durabilityLossPct (tooltip divides by 100.0)  
    - `+0x09` qualityTier (passed to Item_GetQualityScale; tooltip selects tier strings for >=2/3)  
    - `+0x0A..+0x0B` padding/unused (not serialized by ItemStructA_read/write)  
    - `+0x10` u32_tooltipValue (displayed via String_FromU32 with label string id 0x278)  
    - `+0x18` qualityPct (entry+0x1C)  
    - `+0x19` qualityLabelIndex (used as string table index: stringId = 0x7527 + value)  
    - `+0x1A` variantIndex (entry+0x1E)  
    - `+0x1B..+0x1E` variantRoll[4] (entry+0x1F..0x22)  
    - `+0x0C` / `+0x14` (identityKeyA/identityKeyB): serialized + compared in ItemStructA_Equals; no clear UI use yet.  
  - NOTE: many helpers expect `ItemEntryWithId*` (u32 entryId + ItemStructA), so add +0x04 to ItemStructA offsets when reading via entry pointer.  
- `ItemStatEntry_ReadFromBitStream` @ `0x10249E10`  
  - Reads runtime stat entry: `u32 stat_id`, `u8 type`, `u32 value`, `u8 level`, `u8 pct13`, `u8 pct14`.

## Item instance read call sites (ItemEntryWithId_read xrefs)
- `Packet_ID_UNLOAD_WEAPON_read` @ `0x1008FDE0` (call @ `0x1008FE29`)
- `Packet_ID_DEPLOY_ITEM_read` @ `0x100D4960` (call @ `0x100D4A9C`)
- `Packet_ID_B5_read_entry2` @ `0x100FD880` (call @ `0x100FDA46`)
- `Packet_ID_MERGE_ITEMS_read` @ `0x1010AC90` (call @ `0x1010ACF5` + `0x1010AD01`)
- `Packet_ID_SPLIT_CONTAINER_read` @ `0x1010ADC0` (call @ `0x1010AE0D`)
- `Packet_ID_PRODUCTION_read_entries` @ `0x101648E0` (call @ `0x101649A7`)
- `Packet_ID_ITEMS_CHANGED_read` @ `0x10190990` (call @ `0x10190A7A`)
- `Packet_ID_STORAGE_structA_read_blockB_3` @ `0x10275480` (call @ `0x1027549E`)
- `Packet_ID_STORAGE_structA_read_blockA_12` @ `0x10275730` (call @ `0x1027574E`)
- `Packet_ID_STORAGE_structA_read_blockC_6` @ `0x10275960` (call @ `0x1027597E`)

## Runtime stat read call sites (ItemStatEntry_ReadFromBitStream xrefs)
- `Packet_ID_B5_read_entry2` @ `0x100FD880` (call @ `0x100FDA3D`)
- **Unnamed wrapper** @ `0x100FCB00` (call @ `0x100FCB16`)  
  - Layout inferred from disasm:  
    - `+0x00` u32  
    - `+0x04` ItemStatEntry  
    - `+0x18` ItemEntryWithId  
    - `+0x48` u32

## ItemsAdded payload / entry (shared list format)
- `ItemsAddedPayload_Read` @ `0x102404E0` / `ItemsAddedPayload_Write` @ `0x1023D2C0`  
  - `u16 baseUsedCount` @ `+0x00` (adds into used-count; see helpers below)  
  - `ItemsAddedEntryVec` @ `+0x04` (vec header size 0x10)  
    - `+0x08` begin, `+0x0C` end, `+0x10` capacity (entry size 0x2C)  
  - `u32 capacity` @ `+0x14`, `u32 unk24` @ `+0x18`, `u32 unk28` @ `+0x1C`  
  - Entry count is written as `(end - begin) / 44` and read as `u16` from stream.  
  - Note: `baseUsedCount` + `capacity` are used by helpers (remaining capacity, etc.); `unk24/unk28` still serialize-only in CShell.  
- Helpers (CShell):  
  - `ItemsAddedPayload_GetUsedCount` @ `0x1023CEE0` = `baseUsedCount + sum(entry.variantIdSet.nodeCount)`  
  - `ItemsAddedPayload_GetRemainingCapacity` @ `0x1023D120` = `capacity - used` (clamped to 0)  
  - `ItemsAddedPayload_GetVariantCountByItemType` @ `0x1023CF40`  
  - `ItemsAddedPayload_GetVariantCountByTemplateId` @ `0x1023D020`  
  - `ItemsAddedPayload_FindEntryByItemStructA` @ `0x1023D1A0`  
  - `ItemsAddedPayload_FindEntryByVariantId` @ `0x1023DE50`  
- `ItemsAddedEntry_Read` @ `0x1023E3B0` / `ItemsAddedEntry_Write` @ `0x1023CDF0`  
  - `ItemsAddedEntry` size = `0x2C`  
  - Layout: `ItemStructA item` @ `+0x00` (0x20 bytes) + `VariantIdSetHeader` @ `+0x20`  
  - `VariantIdSetHeader` @ `+0x20`: `u32 comp`, `u32 head`, `u32 nodeCount`  
  - Variant IDs are stored in an RB-tree (std::set-style). Serialized count is `u16`, inserted via `ItemsAddedEntry_InsertVariantId` @ `0x100649E0`.  

## Static base stats (compiled into CShell)
- `g_ItemBaseStatTable` @ `0x102E0E90`  
  - 411 entries, 8 bytes each: `u16 itemId, u8 statId, u8 flags, i32 value`.  
- `ItemBaseStatTable_Init` @ `0x1024E700`  
  - Builds per‑item vectors from `g_ItemBaseStatTable` on startup.
- `Item_AddArmorBaseStats` @ `0x10239710`  
  - Armor base stats are computed in code (stat ids 11, 39, 18–21).  

## Minimal hook coverage (same as client path)
1) `ItemEntryWithId_read` (item instance data)  
2) `ItemStatEntry_ReadFromBitStream` (runtime stat data)  
3) `ItemBaseStatTable_Init` (optional, in‑memory base table override)
4) `Item_AddArmorBaseStats` (optional, armor base stats override)

These three points cover *all* item data reads without chasing every packet handler.
