# Item Data Injection Notes (FoTD / CShell)

Purpose
- Provide all information needed to inject/override item base stats on the client.
- Focus is CShell.dll (client-side tooltip + stat evaluation path).

Scope
- Static base stats (g_ItemBaseStatTable)
- Armor base stats (generated, not table-backed)
- Variant deltas (per item variant entries)
- Quality scaling (per item instance)
- Display formatting and scaling (Item_FormatStatLine + g_StatScaleTable)

Key Tables and Formats (CShell.dll)

1) Base stat table (raw ints)
- Symbol: g_ItemBaseStatTable
- Address: 0x102E0E90
- Count: 0x19B entries (411)
- Entry size: 8 bytes
- Layout (per entry):
  - u16 item_id
  - u8  stat_id
  - u8  flags (unknown; used in ItemBaseStatTable_Init)
  - u32 value (raw integer)
- Init function:
  - ItemBaseStatTable_Init @ 0x1024E700
  - Uses entry[0] (item_id) and entry[2] (stat_id)
  - Special case: stat_id == 0x22 (34) uses ItemStatList_InsertEntries

Base stat list entry layout (post-init)
- Base list entries stored in g_ItemBaseStatListVecs are 8 bytes.
- ItemStatList_AddOrAccumulate expects:
  - byte 0: stat_id (copied from entry+2 of base table)
  - dword +4: value (copied from entry+4 of base table)
- The item_id is not retained in the per-item stat list entries.
- Evidence: ItemStatList_AddOrAccumulate @ 0x1024E7C0 compares *entry with *(a2+2) and accumulates *(a2+4).

2) Per-item stat list vectors
- Symbol: g_ItemBaseStatListVecs
- Address: 0x103D7278
- Per-item vector layout (stride 0x10):
  - +0x00 begin
  - +0x04 end
  - +0x08 capacity_end
  - +0x0C unused/flags
- Helper arrays (derived):
  - g_ItemBaseStatListBeginById @ 0x103D727C
  - g_ItemBaseStatListEndById   @ 0x103D7280
- Built by ItemBaseStatTable_Init

3) Stat scale table (display formatting)
- Symbol: g_StatScaleTable
- Address: 0x102E0CA8
- Used by Item_FormatStatLine
- This is not the base stat table. It is for percent/ratio display.

4) Variant list vector table
- Symbol: dword_103CAC58 (vector header array)
- Address: 0x103CAC58
- Per-item vector header (stride 0x10, like std::vector):
  - begin, end, capacity
- Variant entry size: 0x5C (92 bytes)
- Each entry contains 4 variant slots (12 bytes each) + header data.

Variant slot layout (12 bytes):
- byte 0: variant_type
- byte 1: stat_id_A
- byte 2: stat_id_B
- byte 3: roll (a2)
- byte 4: roll_center (a3)
- byte 5-7: padding
- float @ +8: scale

Variant application
- Item_ApplyQualityAndVariantToStat @ 0x102549F0
- ItemVariant_ComputeScalePair @ 0x1024B410
- ItemVariant_ApplyStatDelta @ 0x10254780
- Variant types apply to specific stat IDs. Example:
  - type 2 applies to stat_ids {0,2,3,12,13,14,15,16,29}
  - type 3 applies to stat_id 35
  - type 4 applies to stat_id 17 (inverted scale)
  - type 6 applies to stat_id 11 (inverted scale)
  - type 9 applies to stat_ids {22,23,24,25}
  - type 11 applies to {11,18,19,22}
  - type 12 applies to stat_id 32 (inverted scale)

Variant raw source
- Static variant entries are embedded in CShell.dll.
- Export: Docs/Exports/item_variants_raw_from_unk_102DD0F8.csv
- This CSV was extracted from a 0x5C-stride blob found in CShell.dll (file offset ~0x2DBCF8).
- Each row in CSV corresponds to one 0x5C entry (92 bytes).

5) Item template table (runtime)
- Symbol: g_ItemTemplateById
- Address: 0x103C3FA8
- This table is runtime-filled, not static in file.
- Known offsets (from getters):
  - +0x08: type (u8) -> ItemTemplate_GetType
  - +0x09: subtype (u8) -> ItemTemplate_GetSubType
  - +0x0A: equip slot (u8) -> ItemTemplate_GetEquipSlot
  - +0x30: ammo item id (u16) -> ItemTemplate_GetAmmoItemId

Item instance offsets (for quality/variant)
- Item_ApplyQualityAndVariantToStat reads:
  - +0x1C: quality percent (u8)
  - +0x1E: variant index (u8)
  - +0x1F..+0x22: variant seed/roll bytes (used in per-slot scaling)
  - NOTE: these are offsets relative to `ItemEntryWithId` (u32 entryId + ItemStructA).  
    The same fields in `ItemStructA` are at +0x18, +0x1A, +0x1B..+0x1E.  
  - Quality tier (separate from quality percent):
    - Entry +0x0D (ItemStructA +0x09) is passed to Item_GetQualityScale and drives tier strings in tooltip.
  - Quality label index:
    - Entry +0x1D (ItemStructA +0x19) selects stringId 0x7527 + value for tooltip display.

Stat Collection and Display Pipeline

Tooltip path (authoritative for display values)
- BuildItemTooltip @ 0x1010C330
  - Item_CollectStatsForTooltip @ 0x1024E8A0
    - Item_AppendBaseStatsByType @ 0x1024EBE0
      - If type == 5 -> Item_AddArmorBaseStats @ 0x10239710
      - Else -> Item_AppendBaseStatsFromTable @ 0x1024E850
    - Item_CollectStatModifiers @ 0x1026FA20
    - Item_ApplyQualityAndVariantToStat @ 0x102549F0
  - Item_FormatStatLine @ 0x1024D800 (formats for display)

Order of operations (important)
1) Base stats (table or armor generator)
2) Stat modifiers (Item_CollectStatModifiers)
3) Quality scaling + variant deltas (Item_ApplyQualityAndVariantToStat)
4) Display formatting (Item_FormatStatLine)

Formatting rules (high-signal)
- Stat 0x0C..0x10,0x1D (damage/destruction):
  - If item type is 3/4 -> raw/10 (%.1f)
  - Else -> percent of g_StatScaleTable[stat]
- Stat 0x23 (Effective Range): meters = raw/100
- Stat 0x24 (Fire Delay): seconds = raw/1000
- Stat 0x11 (Weapon Recoil): percent of g_StatScaleTable[0x11]
- Stat 0x27 (Weight): grams = raw

Armor Base Stats (not table-backed)
- Item_AddArmorBaseStats @ 0x10239710
- Armor stats are computed from armor class index (derived from template)
- If you want custom armor base stats, you must hook this path.
- Notes:
  - Armor class index derived by sub_10232750(itemId) -> 0..46
  - Uses template byte at +0x0A to pick divisor (5 or 10)
  - Always adds stat_id 11 (penalty) + armor/shielding/resistance/reflection bands.

Injection Strategy (recommended)

A) Override non-armor base stats
1) Hook ItemBaseStatTable_Init (0x1024E700) or a call-site right after it.
2) Patch g_ItemBaseStatTable entries (8-byte struct) with your CSV values.
3) Reset byte_103D7270 to 0 (so Init will rebuild vectors).
4) Call ItemBaseStatTable_Init again to rebuild g_ItemBaseStatListVecs.

Why: Item_AppendBaseStatsFromTable reads the per-item vectors built by Init.
If you only patch g_ItemBaseStatTable without rebuilding, tooltips keep old values.

B) Override armor base stats
- Hook Item_AddArmorBaseStats (0x10239710) and supply your custom entries.
- Alternative: hook Item_AppendBaseStatsByType and intercept type==5.

C) Override variant effects (optional)
- Option 1: Patch per-item variant vector list (dword_103CAC58) with your custom 0x5C entries.
- Option 2: Hook ItemTemplate_CopyVariantByIndex (0x1024C940) and return your custom entry for the requested index.

D) Quality scaling (optional)
- Quality byte is at Item instance +0x1C (see Item_ApplyQualityAndVariantToStat).
- If you want to ignore quality effects, force it to 0 before stat collection.

E) Stat modifiers (optional)
- Modifiers are applied between base stats and quality/variants.
- Table access:
  - Item_CollectStatModifiers @ 0x1026FA20
  - ItemStatModifierTable_GetEntry @ 0x1026F510
  - ItemStatModifier_GetValue @ 0x1026F570
- If you want full control, bypass modifiers in Item_CollectStatsForTooltip or patch modifier table in memory.

Practical Hook Points

1) ItemBaseStatTable_Init (0x1024E700)
- Loops 0x19B entries from g_ItemBaseStatTable.
- Uses byte[+2] == 0x22 for special insert path.

2) Item_AppendBaseStatsByType (0x1024EBE0)
- Type 5 (armor) -> Item_AddArmorBaseStats
- Else -> Item_AppendBaseStatsFromTable

3) Item_CollectStatsForTooltip (0x1024E8A0)
- Central entry for tooltip stat list. Inject here if you want fully controlled stats.

CSV Mapping Guidance

Raw injection CSV (best for hook):
- Columns: item_id, stat_id, value, flags
- For each row, write:
  - u16 item_id
  - u8  stat_id
  - u8  flags (0 unless needed)
  - u32 value

Display CSV (for humans):
- Use item_stats_client_display.csv for readable values.
- Use a converter to map back to raw integers (reverse of Item_FormatStatLine).

Known display mismatch example (FoTD vs FoM wiki)
- Linner PP7 raw base in CShell:
  - Energy Damage 159 -> 15.9
  - Xeno Damage 111 -> 11.1
  - Destruction 67 -> 6.7
  - Weapon Recoil 1000 -> 33.3%
  - Range 2000 -> 20m
  - Fire Delay 800 -> 0.80s
- This is not a scaling bug; the FoTD binaries contain different raw values.

Existing exports
- Docs/Exports/item_base_stats_raw.csv (authoritative raw table)
- Docs/Exports/item_stats_client_base.csv (wide raw view)
- Docs/Exports/item_stats_client_display.csv (formatted display values)
- Docs/Exports/item_stats_client_display_variants.csv (variant-adjusted display values)
- Docs/Exports/item_variants_raw_from_unk_102DD0F8.csv (raw 0x5C entries)
- Docs/Exports/item_templates_raw.csv (static template array dump; runtime g_ItemTemplateById is built at init)

Risk / gotchas
- g_ItemBaseStatTable is in .rdata: patching requires memory protection changes or hooking around it.
- Armor stats are computed, not table-backed.
- Variants and quality can shift values after base stats are applied.
- Item type/subtype is runtime (g_ItemTemplateById); for correct formatting of damage stats, get type at +8.
- Stat modifiers can change values after base stats; if you inject without controlling modifiers, outputs may drift.

Minimal Injection Plan (working hook)
1) Load custom CSV (raw values).
2) Hook ItemBaseStatTable_Init:
   - Copy CSV into a heap buffer of 8-byte entries.
   - Patch the function to use your buffer instead of g_ItemBaseStatTable (or overwrite g_ItemBaseStatTable in-place).
   - Set byte_103D7270 = 0.
   - Call ItemBaseStatTable_Init to rebuild vectors.
3) Hook Item_AddArmorBaseStats if you want armor overrides.

Rollback
- Restore original g_ItemBaseStatTable bytes or revert hook patch.

References (addresses)
- ItemBaseStatTable_Init @ 0x1024E700
- g_ItemBaseStatTable @ 0x102E0E90
- g_ItemBaseStatListVecs @ 0x103D7278
- Item_AppendBaseStatsByType @ 0x1024EBE0
- Item_AddArmorBaseStats @ 0x10239710
- Item_AppendBaseStatsFromTable @ 0x1024E850
- Item_CollectStatsForTooltip @ 0x1024E8A0
- Item_FormatStatLine @ 0x1024D800
- g_StatScaleTable @ 0x102E0CA8
- Item_ApplyQualityAndVariantToStat @ 0x102549F0
- ItemVariant_ComputeScalePair @ 0x1024B410
- ItemVariant_ApplyStatDelta @ 0x10254780
- ItemTemplate_CopyVariantByIndex @ 0x1024C940
- g_ItemTemplateById @ 0x103C3FA8
- Item_AppendBaseStatsFromTable @ 0x1024E850
- ItemStatList_AddOrAccumulate @ 0x1024E7C0
- ItemStatModifierTable_GetEntry @ 0x1026F510
- ItemStatModifier_GetValue @ 0x1026F570

---

# Handoff Report (2025-12-31)

Current Goal
- Document everything needed to inject custom item data into FoTD client (CShell.dll), including raw table formats, variant handling, quality scaling, stat modifiers, and display formatting rules. The doc should be complete so a new session can implement hooks without re?reverse?engineering.

Tasks Completed (this session)
1) Confirmed CShell.dll is loaded in IDA MCP (13337).
2) Mapped critical stat pipeline functions and tables, and validated display formatting rules:
   - BuildItemTooltip @ 0x1010C330 (calls stat collection and formatting)
   - Item_CollectStatsForTooltip @ 0x1024E8A0
   - Item_AppendBaseStatsByType @ 0x1024EBE0
   - Item_AppendBaseStatsFromTable @ 0x1024E850
   - Item_AddArmorBaseStats @ 0x10239710
   - Item_CollectStatModifiers @ 0x1026FA20
   - Item_ApplyQualityAndVariantToStat @ 0x102549F0
   - Item_FormatStatLine @ 0x1024D800
3) Confirmed base stat table layout and per?item stat list entry layout:
   - Base table (g_ItemBaseStatTable @ 0x102E0E90) entries are 8 bytes: u16 item_id, u8 stat_id, u8 flags, u32 value.
   - Per?item list entries (built by ItemBaseStatTable_Init) are 8 bytes: [stat_id][pad][pad][pad][value dword].
   - Verified in ItemStatList_AddOrAccumulate (0x1024E7C0) it compares entry[0] to *(a2+2) and accumulates *(a2+4).
4) Extracted the stat scale table:
   - g_StatScaleTable @ 0x102E0CA8 used by Item_FormatStatLine.
5) Confirmed variant table is static in CShell and documented how it?s used:
   - Variant vector headers at 0x103CAC58
   - Variant entry size 0x5C (92 bytes), 4 slots ? 12 bytes each
   - Export used: Docs/Exports/item_variants_raw_from_unk_102DD0F8.csv
   - Found blob at file offset 0x2DBCF8
6) Documented quality/variant offsets in the item instance:
   - Item_ApplyQualityAndVariantToStat reads:
     - +0x1C: quality (u8)
     - +0x1E: variant index (u8)
     - +0x1F..+0x22: per?slot roll bytes
7) Documented item template getters and offsets:
   - ItemTemplate_GetType @ 0x102330F0 -> offset +0x08
   - ItemTemplate_GetSubType @ 0x102343B0 -> offset +0x09
   - ItemTemplate_GetEquipSlot @ 0x10233120 -> offset +0x0A
   - ItemTemplate_GetAmmoItemId @ 0x102330C0 -> offset +0x30
   - g_ItemTemplateById @ 0x103C3FA8 is runtime?filled (not static in file)
8) Documented armor generation specifics:
   - Item_AddArmorBaseStats computes armor stats from armor class index (0..46)
   - Uses template byte at +0x0A to select divisor (5 or 10)
   - Always adds stat_id 11 (penalty) plus armor/shielding/resistance/reflection bands
9) Produced display CSVs from actual base table + formatter:
   - Docs/Exports/item_stats_client_display.csv
   - Docs/Exports/item_stats_client_display_variants.csv
   - Confirms mismatch vs FoM wiki is due to different raw base values in FoTD binaries, not scaling error.

Files Edited / Created
- Updated: Docs/Notes/ItemData_Injection.md
  - Added missing details: per?entry layout, variant source/offset, item instance offsets, stat modifier notes, armor generator notes, PP7 mismatch explanation, and extra references.
- Created earlier this session:
  - Docs/Exports/item_stats_client_display.csv
  - Docs/Exports/item_stats_client_display_variants.csv

Key Evidence / Facts (for next agent)
- Stat collection pipeline order:
  1) Base stats (table or armor generator)
  2) Stat modifiers
  3) Quality + variant deltas
  4) Display formatting
- Raw base table is authoritative for injection; display formatting is only for UI.
- Item_FormatStatLine shows exactly how raw ints are displayed:
  - Damage stats (0x0C..0x10, 0x1D) -> raw/10 for type3/4; else % of scale table
  - Range (0x23) -> meters = raw/100
  - Fire Delay (0x24) -> seconds = raw/1000
  - Recoil (0x11) -> % of scale table[0x11] (3000)
  - Weight (0x27) -> grams = raw
- Example mismatch: PP7 raw base values in FoTD are different than FoM wiki; the formatter makes them 15.9, 11.1, 6.7, 33.3%, etc.

What I Was Going To Do Next
- If asked to implement hooks:
  1) Hook ItemBaseStatTable_Init (0x1024E700) to redirect to custom base table buffer or overwrite g_ItemBaseStatTable and force re-init.
  2) Optionally hook Item_AddArmorBaseStats (0x10239710) to override armor stats (since armor isn?t table?backed).
  3) Optionally patch variant table at 0x103CAC58 or hook ItemTemplate_CopyVariantByIndex (0x1024C940) for variant overrides.
  4) If you want to bypass modifiers, hook Item_CollectStatModifiers or Item_CollectStatsForTooltip.
- If asked to extend the doc further:
  - Add raw CSV -> table injection mapping examples (struct packing)
  - Add rollback steps + byte patch safety notes.

Current Doc Location
- Docs/Notes/ItemData_Injection.md (this is the complete injection guide as requested).

Stop State
- No further actions pending. All required documentation is already written and updated.
