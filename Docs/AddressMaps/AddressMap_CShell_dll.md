# AddressMap - CShell.dll

All CShell.dll addresses extracted from AddressMap.md.

## CShell.dll (image base 0x10000000)

### Code (IClientShell registration + core handlers)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102A52F0 | 0x002A52F0 | Register_IClientShell_Default | Initializes CGameClientShell instance + registers IClientShell.Default | disasm + strings | high |
| 0x102A5310 | 0x002A5310 | IClientShell_Default_Register | Calls class registry for "IClientShell.Default" | decomp + strings | high |
| 0x10038A60 | 0x00038A60 | CGameClientShell_ctor | Sets vftable, initializes members, stores g_pGameClientShell | decomp | high |
| 0x10038110 | 0x00038110 | IClientShell_vtbl_0x14 | Vtable slot +0x14 used by client; touches local object | vtable +0x14 + decomp | med |
| 0x10038B10 | 0x00038B10 | CGameClientShell_OnMessage | Vtable slot +0x58; main message dispatcher (switch on msg id) | vtable +0x58 + decomp | high |
| 0x10037E70 | 0x00037E70 | CGameClientShell_OnMessage2 | Vtable slot +0x64; secondary message handler | vtable +0x64 + decomp | med |

### MSG_ID dispatch (CShell.dll)
| MSG_ID | Handler | VA | Notes |
|---|---|---|---|
| 0x68 | Msg2_Id68_Handler | 0x1019F740 | CGameClientShell_OnMessage2 path |
| 0x6A | MsgId_6A_Handler | 0x101852D0 | Shared by OnMessage/OnMessage2 |
| 0x6B | MsgId_6B_Handler | 0x101B8040 | OnMessage case |
| 0x6C | MsgId_6C_Handler | 0x101B3000 | OnMessage case |
| 0x6E | CrosshairMgr_OnMessage | (named) | OnMessage case |
| 0x6F | MsgId_6F_Handler | 0x101C18A0 | OnMessage case |
| 0x70 | MsgId_70_Handler | 0x1019E9E0 | Pre-read via MsgId_70_ReadVecOrStruct @ 0x10037320 |
| 0x75 | Msg2_75_Sub0..Sub4 | 0x1002ADC0..0x1002AE30 | OnMessage2 sub-id 0..4 |
| 0x76 | MsgId_76_Handler | 0x10028010 | OnMessage case |
| 0x77 | MsgId_77_WithPayload/NoPayload | 0x101A1F80 / 0x101A1B30 | OnMessage case |
| 0x7E | MsgId_7E_Handler | 0x1004CCF0 | OnMessage case |
| 0x81 | CameraShake_Add + Recoil_ApplyStatGroup2 | (named) | OnMessage case |
| 0x83 | MsgId_83_Handler | 0x10028180 | OnMessage case; local-player gate @ 0x101A0BC0 |
| 0x84 | MsgId_84_Handler | 0x10028070 | OnMessage case |
| 0x85 | MsgId_85_Handler | 0x10035840 | OnMessage case |
| 0x86 | MsgId_86_WindowClose | 0x100F82A0 | OnMessage case |
| 0x88 | MsgId_88_WindowClose | 0x100F2E30 | OnMessage case |
| 0x8C | MsgId_8C_Handler | 0x10028100 | OnMessage case |
| 0x8E | MsgId_8E_Handler | 0x100383B0 | OnMessage case |
| 0x8F | MsgId_8F_Handler | 0x101C2460 | OnMessage case |
| 0x9A | MsgId_9A_Handler | 0x10028140 | OnMessage case |
| 0x9D | MsgId_9D_Handler | 0x100280B0 | OnMessage case |

## Client (CShell.dll, image base 0x10000000)

### Item stats / tooltip pipeline (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1010C3A2 | 0x0010C3A2 | BuildItemTooltip | Builds tooltip: calls Item_CollectStatsForTooltip + Item_AppendBaseStatsByType, formats deltas via Item_FormatStatLine | decomp | high |
| 0x1024E8A0 | 0x0024E8A0 | Item_CollectStatsForTooltip | Builds stat list: base stats -> modifiers -> quality/variant; scales stat 39 if quality<1; merges into output list | decomp | high |
| 0x102549F0 | 0x002549F0 | Item_ApplyQualityAndVariantToStat | Applies quality% to select stat ids by item type (type1: 0x16..0x19; type3/4: 0x0C..0x10,0x1D; type5: 0x12..0x15; type6: 0x20/0x27) and variant deltas | decomp | med |
| 0x1024EFE0 | 0x0024EFE0 | Item_CollectStatList | Collects specific base stats (0x0B,0x11..0x15,0x23), applies modifiers + quality/variant, merges into list | decomp | med |
| 0x1024E700 | 0x0024E700 | ItemBaseStatTable_Init | Initializes per-item base stat vectors from raw table (unk_102E0E90); sets byte_103D7270 | decomp | high |
| 0x1024E770 | 0x0024E770 | ItemBaseStatList_Copy | Copies base stat entries into dest list (pushes 8-byte entries) | decomp | med |
| 0x1024E850 | 0x0024E850 | Item_AppendBaseStatsFromTable | Adds base stat entries from per-item stat tables | decomp | high |
| 0x1024EBE0 | 0x0024EBE0 | Item_AppendBaseStatsByType | Dispatches to armor vs base-table stats (type 5 vs others) | decomp | med |
| 0x10239710 | 0x00239710 | Item_AddArmorBaseStats | Adds armor base stats for template type 5 | decomp | med |
| 0x1026FA20 | 0x0026FA20 | Item_CollectStatModifiers | Applies g_ItemStatModifierTable entries (match itemId/type/subtype) into stat list | decomp | med |
| 0x1024EE40 | 0x0024EE40 | Item_CollectStatById | Collects/filters a single stat id from base+mods+quality (scales stat 39 if quality<1) | decomp | med |
| 0x1024EC30 | 0x0024EC30 | Item_CollectResistanceAmpStats | Special stat collector for itemId 104 (Resistance Amp); iterates g_ResistanceAmpStatListBegin/End | decomp | low |
| 0x102324C0 | 0x002324C0 | Item_GetQualityScale | Returns quality-based stat scale | decomp | med |
| 0x1024D800 | 0x0024D800 | Item_FormatStatLine | Formats one stat line (units, percent, color) | decomp | high |
| 0x1024D620 | 0x0024D620 | StdVector_ThrowLengthError | Throws std::length_error(\"vector<T> too long\") | decomp | low |
| 0x1024D6E0 | 0x0024D6E0 | StdVector_Alloc8 | Allocates vector buffer (8 * count), throws bad_alloc on overflow | decomp | low |
| 0x1024CFF0 | 0x0024CFF0 | Item_FormatStatValue | Formats single stat value (no base/delta) + color bands | decomp | med |
| 0x100046F0 | 0x000046F0 | ItemTemplateById_Get | Returns item template ptr if id in [1..0xBC0], else 0 | decomp (Item_FormatStatLine) | med |
| 0x102330F0 | 0x002330F0 | ItemTemplate_GetType | Returns template type byte (@+0x08) | decomp | med |
| 0x10234120 | 0x00234120 | ItemTemplate_IsType3or4 | True if item template type byte (offset +8) is 3 or 4 | decomp (Item_FormatStatLine) | med |
| 0x102343B0 | 0x002343B0 | ItemTemplate_GetSubType | Returns subtype (@+0x09); type 5 uses ItemId->group mapping | decomp | low |
| 0x10233120 | 0x00233120 | ItemTemplate_GetEquipSlot | Returns equip slot/group byte (@+0x0A) | decomp | low |
| 0x10233030 | 0x00233030 | ItemTemplate_IsFireableTypeAllowlist | Allowlist by type/subtype (type3/4 except 18/20/22/38; subtype 15; itemId 993) | decomp | low |
| 0x102332F0 | 0x002332F0 | ItemTemplate_IsNotFireableTypeAllowlist | Negates ItemTemplate_IsFireableTypeAllowlist | decomp | low |
| 0x102323C0 | 0x002323C0 | EquipSlotMask_HasSlot | Checks slot bit (a1 5..16) in mask | decomp | low |
| 0x10036B30 | 0x00036B30 | SharedMem_EquipSlotMask_HasSlot | Reads SharedMem[120479] u16 mask and tests slot | decomp | low |
| 0x1023CB30 | 0x0023CB30 | ItemList_HasFireableTypeAllowlist | Scans 44-byte item list for any entry matching fireable allowlist | decomp | low |
| 0x1019E180 | 0x0019E180 | ItemSlots_HasFireableTypeAllowlist | Checks 3-slot array for any fireable allowlist item | decomp | low |
| 0x10234400 | 0x00234400 | ItemTemplate_CanUse | Validates item use gating (cooldowns/flags/class checks) | decomp | med |
| 0x10234840 | 0x00234840 | ItemId_IsUsable | True if id in usable ranges or template type in {1,8,9} | decomp | low |
| 0x1024E7C0 | 0x0024E7C0 | ItemStatList_AddOrAccumulate | Merges stat entries by id | decomp | high |
| 0x1024E690 | 0x0024E690 | ItemStatList_PushEntry | Pushes 8-byte stat entry into vector | decomp | med |
| 0x1024E410 | 0x0024E410 | ItemStatList_InsertEntries | Vector insert/reserve helper for stat list entries | decomp | low |
| 0x100AE130 | 0x000AE130 | ItemStatList_FindById | Finds stat entry by id in stat list (8-byte entries) | decomp | low |
| 0x100AE100 | 0x000AE100 | ItemStatList_GetByIndex | Returns stat entry ptr by index (8-byte entries) | decomp | low |
| 0x1024E090 | 0x0024E090 | StatEntry_FillRange | Fills 8-byte stat entry range with a single entry | decomp | low |
| 0x1024E120 | 0x0024E120 | StatEntry_CopyRange | Copies 8-byte entries forward | decomp | low |
| 0x1024E1E0 | 0x0024E1E0 | StatEntry_MoveBackward | Backward move/copy of 8-byte entries (memmove) | decomp | low |
| 0x1024E210 | 0x0024E210 | StatEntry_FillN | Fills N 8-byte entries with a single entry | decomp | low |
| 0x1024E300 | 0x0024E300 | StatEntry_FillN_ReturnEnd | Fills N entries and returns end pointer | decomp | low |
| 0x1024E3B0 | 0x0024E3B0 | StatEntry_CopyRange2 | Copies 8-byte entries forward (alt instantiation) | decomp | low |
| 0x102485E0 | 0x002485E0 | ItemStatEntry_UndoPct13 | Removes pct modifier stored at +13 (divides by 1 - pct/100, clears byte) | decomp | low |
| 0x10248640 | 0x00248640 | ItemStatEntry_UndoPct14 | Removes pct modifier stored at +14 (divides by 1 - pct/100, clears byte) | decomp | low |
| 0x102486A0 | 0x002486A0 | ItemStatEntry_GetValue_NoPct | Returns value with pct13/pct14 removed (no clearing) | decomp | low |
| 0x10248B10 | 0x00248B10 | ItemStatEntry_ApplyPct13 | Applies pct (byte) to value and stores at +13 (undoes prior first) | decomp | low |
| 0x10248B80 | 0x00248B80 | ItemStatEntry_ApplyPct14 | Applies pct (byte) to value and stores at +14 (undoes prior first) | decomp | low |
| 0x10248750 | 0x00248750 | ItemStatModifierTable_CountByGroup | Counts modifier table entries with Entry[74] and group==a1 | decomp | low |
| 0x10248790 | 0x00248790 | ItemStatModifierTable_GetBaseValueWithListPct | Fetches base modifier value and applies list pct buckets (+36/+37/+38/+39) by group | decomp | low |
| 0x10248920 | 0x00248920 | ItemTemplate_GetType_ById | Returns item template type by id (calls ItemTemplate_GetType) | decomp | low |
| 0x102489A0 | 0x002489A0 | ModifierEntry_CountFromPtrs | Returns count of 20-byte entries between ptrs | decomp | low |
| 0x102489C0 | 0x002489C0 | ModifierEntry_AdvancePtr | Advances 20-byte entry pointer by N | decomp | low |
| 0x102489E0 | 0x002489E0 | ModifierEntry_FillRange | Fills 20-byte entry range with a single entry | decomp | low |
| 0x10248A30 | 0x00248A30 | ModifierEntry_MoveBackward | Backward move/copy of 20-byte entries (memmove) | decomp | low |
| 0x10248EB0 | 0x00248EB0 | ItemStatList_SetPct13All | Applies pct13 to all stat entries in list and caches at list+36 | decomp | low |
| 0x10248FC0 | 0x00248FC0 | ItemStatList_ClearPct13All | Clears pct13 on all stat entries and list+36 | decomp | low |
| 0x10249080 | 0x00249080 | ItemStatList_ClearPct14All | Clears pct14 on all stat entries; zeroes list+37..+39 | decomp | low |
| 0x10248BF0 | 0x00248BF0 | ItemStatModifier_FindById | Finds modifier entry by id in modifier table | decomp | low |
| 0x10248C40 | 0x00248C40 | ItemStatModifier_HasMinLevel | True if modifier id exists and level >= threshold | decomp | low |
| 0x10248C70 | 0x00248C70 | ItemStatModifier_MeetsRequiredLevel | True if modifier level >= entry requirement (Entry[9]) | decomp | low |
| 0x10248CF0 | 0x00248CF0 | ItemStatModifier_CountByGroup | Counts modifiers whose table entry has Entry[74] and group==a2 | decomp | low |
| 0x10248D80 | 0x00248D80 | ItemStatModifier_HasLevelAbove | True if any modifier level > a2 | decomp | low |
| 0x10248E10 | 0x00248E10 | ItemStatModifier_GetMaxLevel | Returns max modifier level (byte +12) across list | decomp | low |
| 0x1026F510 | 0x0026F510 | ItemStatModifierTable_GetEntry | Returns modifier entry ptr by id (range 1..0x72) | decomp | low |
| 0x1026F570 | 0x0026F570 | ItemStatModifier_GetValue | Maps modifier+subtype to value (lookup table) | decomp | low |
| 0x1026F530 | 0x0026F530 | ItemStatModifierTable_GetLevelValue | Returns modifier table value by level (Entry+116) | decomp | low |
| 0x10249140 | 0x00249140 | ItemStatModifier_CalcAggregateValue | Sums per-level values from modifier table into base value | decomp | low |
| 0x10249260 | 0x00249260 | ItemStatModifier_DecrementLevel | Decrements modifier level (rebalances neighbors) | decomp | low |
| 0x102492F0 | 0x002492F0 | ItemStatModifier_IncrementLevel | Increments modifier level up to max (rebalances neighbors) | decomp | low |
| 0x102493A0 | 0x002493A0 | ItemStatModifier_ResetLevelAndReindex | Zeroes modifier level and shifts higher levels down; marks list dirty | decomp | low |
| 0x102494C0 | 0x002494C0 | ItemStatModifier_ProcessValue | Applies skill/modifier effects to a value; logs unknown skills | decomp | med |
| 0x10249710 | 0x00249710 | ItemStatModifier_ProcessValue_ByItemTemplate | Maps item type/subtype to skill ids (60..111) and applies ItemStatModifier_ProcessValue | decomp | med |
| 0x10249AB0 | 0x00249AB0 | ItemStatModifier_AdjustAmmoItemId | For subtype 23/24, resolves ammo item id then applies skill 68/69; writes back to entry | decomp | low |
| 0x10249B40 | 0x00249B40 | ItemStatModifier_MeetsReqFromDisplayName | Checks required modifier/level from ItemId_GetDisplayName struct | decomp | low |
| 0x10249B90 | 0x00249B90 | ItemStatModifier_MeetsReqFromTemplateTable | Checks required modifier/level via sub_1026F990 table | decomp | low |
| 0x10249BD0 | 0x00249BD0 | ItemStatModifier_MeetsPrereqs | Validates up to 5 prereq entries (id+level) from modifier table entry | decomp | low |
| 0x10249C70 | 0x00249C70 | ModifierEntry_AdvancePtr2 | Advances 20-byte entry pointer by N (alt instantiation) | decomp | low |
| 0x10249C90 | 0x00249C90 | ModifierEntry_FillRange2 | Fills 20-byte entry range (alt instantiation) | decomp | low |
| 0x10249CA0 | 0x00249CA0 | ModifierEntry_MoveBackward2 | Backward move/copy of 20-byte entries (alt instantiation) | decomp | low |
| 0x10249CD0 | 0x00249CD0 | ItemStatEntry_RecalcValue | Recomputes entry value from table, re-applies pct13/14 | decomp | low |
| 0x10249D30 | 0x00249D30 | ItemStatEntry_WriteToBitStream | Writes 0x10-byte entry to bitstream (id, type, value, level, pct13/14) | decomp | low |
| 0x10249E10 | 0x00249E10 | ItemStatEntry_ReadFromBitStream | Reads 0x10-byte entry from bitstream | decomp | low |
| 0x10249E70 | 0x00249E70 | ItemStatEntry_UpdateProgress | Updates progress/cooldown, increments level and recalcs when consumed | decomp | low |
| 0x10249F00 | 0x00249F00 | ItemStatEntry_ConsumeProgress | Consumes points toward next level and recalcs; returns 1 on level-up | decomp | low |
| 0x10249F50 | 0x00249F50 | ItemStatList_WriteToBitStream | Serializes list pct buckets, seed, count, and entries | decomp | low |
| 0x1024A070 | 0x0024A070 | SkillList_UpdateProgress | Ticks entries via ItemStatEntry_UpdateProgress; marks dirty; returns entry id | decomp | low |
| 0x1024A100 | 0x0024A100 | ItemStatModifier_ProcessValue_Indirect | Loads value pointer, applies ItemStatModifier_ProcessValue, writes back | decomp | low |
| 0x1024A130 | 0x0024A130 | ItemStatModifier_MeetsReqFromItemId | Checks required modifier/level via ItemStatReqTable_FindEntry | decomp | low |
| 0x1024A180 | 0x0024A180 | SkillList_RecalcPctBucketsAndApply | Builds pct buckets (bytes +37/+38/+39) from skill list, applies pct14 by group | decomp | med |
| 0x1026C410 | 0x0026C410 | SkillDefTable_CopyEntry | Copies 0x54-byte skill def from table (ids 1..0x27) | decomp | low |
| 0x1026C0F0 | 0x0026C0F0 | SkillDef_InitDefaults | Initializes skill def struct (size/fields reset) | decomp | low |
| 0x1024A380 | 0x0024A380 | ModifierEntry_AdvancePtr3 | Advances 20-byte entry pointer by N (alt instantiation) | decomp | low |
| 0x1024A3A0 | 0x0024A3A0 | ModifierEntry_MoveBackward3 | Backward move/copy of 20-byte entries (alt instantiation) | decomp | low |
| 0x1024A3D0 | 0x0024A3D0 | ModifierEntry_FillN | Fills N 20-byte entries with a single entry | decomp | low |
| 0x1024A420 | 0x0024A420 | ModifierEntry_FillN2 | Wrapper around ModifierEntry_FillN | decomp | low |
| 0x1024A450 | 0x0024A450 | ModifierEntry_FillN_ReturnEnd | Fills N entries and returns end pointer | decomp | low |
| 0x1024A490 | 0x0024A490 | ModifierEntry_CopyRange | Range copy helper (sub_10140170) | decomp | low |
| 0x1024A4C0 | 0x0024A4C0 | ModifierEntry_EraseAt | Erases one 20-byte entry at position; shifts tail | decomp | low |
| 0x1024A500 | 0x0024A500 | ModifierEntry_CopyRange2 | Range copy helper (sub_10140170) | decomp | low |
| 0x1024A530 | 0x0024A530 | ModifierEntry_CopyRange3 | Range copy helper (sub_10140170) | decomp | low |
| 0x1024A560 | 0x0024A560 | SkillList_ResetState | Clears list state/flags/buckets and trims list | decomp | low |
| 0x1024A5F0 | 0x0024A5F0 | SkillList_InsertRange | Vector insert/reserve for 20-byte entries (uses ModifierEntry_* helpers) | decomp | low |
| 0x1024A8A0 | 0x0024A8A0 | SkillList_Init | Zeroes struct fields + SkillList_ResetState | decomp | low |
| 0x1024A900 | 0x0024A900 | SkillList_RemoveInvalidAndRefund | Removes invalid entries, accumulates refund value, pushes ids to list | decomp | low |
| 0x1024AAE0 | 0x0024AAE0 | SkillList_ConsumePointsAndLevel | Consumes points across levelable entries, levels up, recalc, marks dirty | decomp | low |
| 0x10248E50 | 0x00248E50 | SkillList_DecrementPendingLevels | Decrements byte+12 on each entry (pending level counter) | decomp | low |
| 0x1024AC30 | 0x0024AC30 | SkillList_InsertAt | Returns insert ptr after shifting via SkillList_InsertRange | decomp | low |
| 0x1024ACA0 | 0x0024ACA0 | Packet_ID_SKILLS_read_list_insert | Inserts 20-byte skill entry into list | decomp | low |
| 0x1024AD30 | 0x0024AD30 | Packet_ID_SKILLS_read_list | Reads skill list from bitstream; fills list entries | decomp | low |
| 0x1024AE80 | 0x0024AE80 | SkillList_GetOrAddEntry | Finds entry by id; if missing, builds from table + list pct and inserts | decomp | low |
| 0x1024AF30 | 0x0024AF30 | SkillList_AddEntryIfMissing | Adds entry if id valid and not present | decomp | low |
| 0x1024AF70 | 0x0024AF70 | SkillList_MergeFromList | Merges external list into this (max level/value); inserts missing | decomp | low |
| 0x1024B0A0 | 0x0024B0A0 | SkillList_QueueLevelIncrease | Validates prereqs + caps; sets pending level (+12) to max+1 | decomp | low |
| 0x1024B6A0 | 0x0024B6A0 | SkillEntry_ApplyPctToByte12 | Applies percent scaling to entry byte+12 | decomp | low |
| 0x1024B6F0 | 0x0024B6F0 | ItemStatEntry_ScaleField3 | Scales u16 field at +6 by factor (a2) | decomp | low |
| 0x1024B410 | 0x0024B410 | ItemVariant_ComputeScalePair | Computes +/- scale pair for variant deltas | decomp | low |
| 0x10254780 | 0x00254780 | ItemVariant_ApplyStatDelta | Applies variant delta to stat entry based on variant type | decomp | low |
| 0x1023E9B0 | 0x0023E9B0 | ItemStatList_AddOrAccumulate2 | Merges stat entries by id (alt list/struct layout) | decomp | med |
| 0x1023EA20 | 0x0023EA20 | ItemStatList_AddFromList2 | Adds each 8-byte entry from list into ItemStatList_AddOrAccumulate2 | decomp | low |
| 0x1023EA70 | 0x0023EA70 | ItemList_AccumulateStat39Lists | Scans 44-byte item list; collects statId 39 lists into dest if value>0 | decomp | low |
| 0x10249440 | 0x00249440 | ItemStatEntry_ApplyModifier | Applies modifier scaling for stat entry (type/subtype gating) | decomp | low |
| 0x10248A70 | 0x00248A70 | ItemStatEntry_ScaleByFloatCeil | Scales stat value by float factor + ceil | decomp | low |
| 0x100AF840 | 0x000AF840 | Float_Ceil | Returns ceilf(a1) | decomp | low |
| 0x1024F470 | 0x0024F470 | Log_Write | Writes timestamped log line to file/console (opens log/%y_%m_%d.log) | decomp | low |
| 0x1024F710 | 0x0024F710 | Log_WriteErrorIfEnabled | If logging enabled, logs ERROR via Log_Write | decomp | low |
| 0x1024F180 | 0x0024F180 | Log_Init | Initializes log object (default.log, clears handles) | decomp | low |
| 0x1024F1F0 | 0x0024F1F0 | Log_Open | Sets log filename and opens file (append) | decomp | low |
| 0x1024F960 | 0x0024F960 | Color_GetARGBHexByCode | Returns ARGB hex string for code 1/2/3 | decomp | low |
| 0x1010DA8D | 0x0010DA8D | BuildItemTooltip_StatNameLookup | Uses stat_id + 0x189C as localization msg id; g_pILTClient vtbl+0x40 (FormatString) -> HSTRING, vtbl+0x58 (GetStringData), vtbl+0x4C (FreeString) | disasm | high |
| 0x10109330 | 0x00109330 | Item_GetAmmoItemIdOrTemplate | Uses item instance ammo override (u16 @+0x08) else template ammo id (@+0x30) | decomp | high |
| 0x102330C0 | 0x002330C0 | ItemTemplate_GetAmmoItemId | Returns ammo item id from template (u16 @+0x30) | decomp | high |
| 0x1010CA74 | 0x0010CA74 | BuildItemTooltip_ammoCountLine | Uses template u16 @+0x64 to look up ammo item name and format string 0x1798 | disasm | med |

Item_FormatStatLine notes (stat_id -> display):
- 0x0C..0x10,0x1D: if item type 3/4 ? raw value (0.1 scaling); else percent of g_StatScaleTable[stat].
- 0x23 Effective Range: meters = value/100 (delta uses same scaling).
- 0x24 Weapon Fire Delay: seconds = value/1000 (2 decimals).
- 0x27 Weight: grams = value (delta as %d).
- 0x2C Activation Distance: meters = value/100.
- 0x17/0x2D/0x2E: seconds = value/1000 (0x17 uses 3 decimals; 0x2D/0x2E use 1 decimal).
- 0x28/0x29: value/1000 (1 decimal).

### Item stat tables / globals (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x103C3FA8 | 0x003C3FA8 | g_ItemTemplateById | Runtime item template pointer table | xrefs + decomp | high |
| 0x102E0E90 | 0x002E0E90 | g_ItemBaseStatTable | Raw base stat entries (0x19B * 8 bytes): u16 itemId, u8 statId, u32 value | disasm (ItemBaseStatTable_Init) | high |
| 0x103D7278 | 0x003D7278 | g_ItemBaseStatListVecs | Per-item base stat vector array (stride 0x10); begin/end at +0/+4 | disasm (ItemBaseStatTable_Init) | med |
| 0x103D727C | 0x003D727C | g_ItemBaseStatListBeginById | Per-item base stat list begin pointer | decomp | med |
| 0x103D7280 | 0x003D7280 | g_ItemBaseStatListEndById | Per-item base stat list end pointer | decomp | med |
| 0x102E0CA8 | 0x002E0CA8 | g_StatScaleTable | Stat base value/scale table used for percent/ratio formatting | decomp | med |
| 0x102E8AF2 | 0x002E8AF2 | g_ItemStatModifierTable | 14x entries: {u16 itemId,u8 type,u8 subtype,u32 statId} (matches itemId OR type OR subtype) | decomp + bytes | med |
| 0x1026F990 | 0x0026F990 | ItemStatReqTable_FindEntry | Finds requirement entry by itemId/type/subtype in word_102E89A8/byte_102E89AA/AB tables | decomp | low |
| 0x103D78FC | 0x003D78FC | g_ResistanceAmpStatListBegin | Stat list begin ptr used by Item_CollectResistanceAmpStats (itemId 104) | xrefs | low |
| 0x103D7900 | 0x003D7900 | g_ResistanceAmpStatListEnd | Stat list end ptr used by Item_CollectResistanceAmpStats (itemId 104) | xrefs | low |

### Misc tables / personality helpers (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1026FB00 | 0x0026FB00 | EntryTable_GetCount45 | Returns hard-coded entry count (45) | decomp | low |
| 0x1026FB10 | 0x0026FB10 | EntryTable_GetByTypeIndex | Returns table entry by type/index from off_102E9E88; validates type | decomp | low |
| 0x1026FC10 | 0x0026FC10 | Personality_GetName | Maps personality enum to name string (Rude/Paranoid/Funny/Sarcastic/Neutral) | decomp | low |
| 0x1026FEA0 | 0x0026FEA0 | U16Entry12_FindById | Finds 12-byte entry by u16 id | decomp | low |
| 0x10270590 | 0x00270590 | U16Entry12_SetValueById | Sets entry value by id (u16) | decomp | low |
| 0x10270690 | 0x00270690 | U16Entry12_SetValueForItemType | Sets entry value for matching item type | decomp | low |
| 0x102707B0 | 0x002707B0 | U16Entry12_SetValueForAllItems | Sets entry value across all entries | decomp | low |
| 0x10270890 | 0x00270890 | U16Entry12_ApplyToGroup | Applies value across a group of entries | decomp | low |
| 0x10270930 | 0x00270930 | PersonalityTable_GetEntry | Returns personality entry ptr (stride 84) | decomp | low |
| 0x10270950 | 0x00270950 | PersonalityTable_GetVariantEntry | Returns personality variant entry ptr (stride 84, +12/+28 offsets) | decomp | low |
| 0x10270990 | 0x00270990 | Personality_GetWeight | Returns weight factor (0.1/0.25/0.3/0.5/0.6/0.7) | decomp | low |
| 0x10270AE0 | 0x00270AE0 | Thread_StartWithPriority | Wraps _beginthreadex + ResumeThread (optional priority) | decomp | low |
| 0x10270C50 | 0x00270C50 | Timer_InitHighRes | Initializes hi-res timer using QueryPerformanceFrequency | decomp | low |

### Client API holder (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102A5290 | 0x002A5290 | Init_ILTClient_APIHolder | Registers "ILTClient.Default" holder for g_pILTClient | disasm | med |
| 0x10036600 | 0x00036600 | CAPIHolder_ILTClient_Ctor | CAPIHolder<ILTClient> ctor (sets holder + registers) | disasm | low |
| 0x10036680 | 0x00036680 | CAPIHolder_ILTClient_Dtor | CAPIHolder<ILTClient> dtor (clears holder) | disasm | low |
| 0x100366F0 | 0x000366F0 | CAPIHolder_ILTClient_APIRemoved | Clears g_pILTClient | disasm | low |
| 0x10036700 | 0x00036700 | CAPIHolder_ILTClient_APIFound | Assigns g_pILTClient | disasm | low |
| 0x10036710 | 0x00036710 | CAPIHolder_ILTClient_Interface | Returns g_pILTClient | disasm | low |
| 0x1035C108 | 0x0035C108 | g_pILTClient | ILTClient interface pointer ("ILTClient.Default") | init stub + xrefs | med |

### Item stat formatting hints (Item_FormatStatLine)

- Stat IDs 0x00/0x02/0x03/0x16/0x18/0x19/0x22: percent of g_StatScaleTable[stat] (color by sign).
- Stat IDs 0x06/0x11: percent of base, but sign color inverted vs 0x00-group.
- Stat ID 0x0B: percent shown as value*0.1 (e.g., 123 => 12.3%).
- Stat IDs 0x0C..0x10,0x1D: if ItemTemplate_IsType3or4 -> raw 0.1 units ("%.1f"), else percent-of-base.
- Stat IDs 0x12..0x15: integer counts ("%d").
- Stat ID 0x17: seconds with 3 decimals (ms/1000, "%.3fs").
- Stat IDs 0x1E/0x20/0x21: percent of base (float).
- Stat IDs 0x1F/0x2D/0x2E/0x01: seconds with 1 decimal (ms/1000, "%.1fs").
- Stat ID 0x23: meters (value/100, "%dm"), thresholds 200/500 influence color.
- Stat ID 0x24: seconds with 2 decimals (ms/1000, "%.2f Seconds").
- Stat ID 0x27: grams ("%ig").
- Stat IDs 0x28/0x29: float with 1 decimal (value/1000, no unit suffix).
- Stat IDs 0x2A/0x2B: boolean -> "On".
- Stat ID 0x2C: meters (value/100, "%im").
- Stat ID 0x2F: has name string ("Bio Energy Replenishing Cooldown") but not handled in Item_FormatStatLine (switch <= 0x2E).

### Inventory UI (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CB294 | 0x002CB294 | CWindowInventory_vtbl | RTTI vtable for CWindowInventory | RTTI (CWindowInventory) | med |
| 0x10100230 | 0x00100230 | CWindowInventory_dtor | Destructor (calls base dtor + delete) | decomp | med |
| 0x10100CC0 | 0x00100CC0 | CWindowInventory_OnCommand | Handles inventory actions (use, move, quickbar, drop, equip/unequip); builds Packet_ID_MOVE_ITEMS | decomp | high |
| 0x10101CF0 | 0x00101CF0 | CWindowInventory_InitUI | Builds inventory UI elements + color blocks | decomp | med |
| 0x10101640 | 0x00101640 | CWindowInventory_OnOpen | Reads UI fields and refreshes inventory state | decomp | low |
| 0x10046530 | 0x00046530 | CWindow_HitTestChild | Hit-test child widgets; returns widget ptr under cursor | decomp | med |
| 0x10046810 | 0x00046810 | CWindowInventory_OnLButtonDown | Selects/activates item under cursor; sets drag state | decomp | med |
| 0x100469A0 | 0x000469A0 | CWindowInventory_OnLButtonUp | Finalizes click; calls item vtbl+0x40 | decomp | low |
| 0x1004A1A0 | 0x0004A1A0 | CWindowInventory_OnMouseMove | Hover/selection update + tooltip call | decomp | low |
| 0x10046B70 | 0x00046B70 | CWindowInventory_OnKeyDown | Handles Enter/Esc and forwards to selected item | decomp | low |
| 0x10046C00 | 0x00046C00 | CWindowInventory_OnChar | Forwards char input to selected item (vtbl+0x1C) | decomp | low |
| 0x10046A90 | 0x00046A90 | CWindowInventory_ResetSelection | Clears selection, hover, and per-slot flags | decomp | low |
| 0x10046AF0 | 0x00046AF0 | CWindowInventory_ClearHover | Clears hover item + hover timer | decomp | low |
| 0x10046A50 | 0x00046A50 | CWindowInventory_SelectedItem_CallVfn3C | Calls selected item vtbl+0x3C | decomp | low |
| 0x10046A70 | 0x00046A70 | CWindowInventory_SelectedItem_CallVfn48 | Calls selected item vtbl+0x48 | decomp | low |
| 0x10046B30 | 0x00046B30 | CWindowInventory_SetDragItem | Sets/clears drag item; plays UI sound | decomp | low |

### Mining UI (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CBA44 | 0x002CBA44 | CWindowMineralScanner_vtbl | RTTI vtable for CWindowMineralScanner | RTTI | med |
| 0x1010ED80 | 0x0010ED80 | CWindowMineralScanner_dtor | Destructor | decomp | low |
| 0x1010EEC0 | 0x0010EEC0 | CWindowMineralScanner_InitUI | Builds mineral scanner UI, label id 437, list widget | decomp | med |
| 0x1010FE70 | 0x0010FE70 | CWindowMineralScanner_OnCommand | Handles scan actions; writes SharedMem[0x1EEBF]; sends Packet_ID_MINING | decomp | med |
| 0x1010EAD0 | 0x0010EAD0 | CWindowMineralScanner_PositionRelative | Positions window relative to Window id 1 | decomp | low |
| 0x1010EB30 | 0x0010EB30 | CWindowMineralScanner_OnUpdate | Delegates to CWindow_UpdateChildren | decomp | low |

| 0x102CD5F4 | 0x002CD5F4 | CWindowTerminalPrisonMineralCollector_vtbl | RTTI vtable for CWindowTerminalPrisonMineralCollector | RTTI | med |
| 0x1015F5B0 | 0x0015F5B0 | CWindowTerminalPrisonMineralCollector_dtor | Destructor | decomp | low |
| 0x1015F4B0 | 0x0015F4B0 | CWindowTerminalPrisonMineralCollector_InitUI | Builds collector UI (button id 75) | decomp | low |
| 0x1015F5E0 | 0x0015F5E0 | CWindowTerminalPrisonMineralCollector_OnCommand | Handles deposit; requires item ids 973/974/975; sends Packet_ID_A5 | decomp | med |

### Terminal UI (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CD09C | 0x002CD09C | CWindowTerminalChemicalLab_vtbl | RTTI vtable for CWindowTerminalChemicalLab | RTTI | med |
| 0x1014A4C0 | 0x0014A4C0 | CWindowTerminalChemicalLab_dtor | Destructor | disasm | low |
| 0x1014B960 | 0x0014B960 | CWindowTerminalChemicalLab_OnCommand | Command handler (switch on action id) | disasm | med |
| 0x1014C340 | 0x0014C340 | CWindowTerminalChemicalLab_InitUI | Builds Chemical Lab UI (loads string ids, creates widgets) | disasm | low |
| 0x1014A3B0 | 0x0014A3B0 | CWindowTerminalChemicalLab_OnOpen | Activates lab UI element (calls sub_100721D0) | disasm | low |
| 0x1014B400 | 0x0014B400 | CWindowTerminalChemicalLab_OnUpdate | Per-frame update/draw logic | disasm | low |
| 0x102CD194 | 0x002CD194 | CWindowTerminalMarket_vtbl | RTTI vtable for CWindowTerminalMarket | RTTI | med |
| 0x1014EB20 | 0x0014EB20 | CWindowTerminalMarket_dtor | Destructor | disasm | low |
| 0x10150840 | 0x00150840 | CWindowTerminalMarket_OnCommand | Command handler (switch on action id) | disasm | med |
| 0x1014EB50 | 0x0014EB50 | CWindowTerminalMarket_InitUI | Builds Market UI (loads string ids, creates widgets) | disasm | low |
| 0x1014DA30 | 0x0014DA30 | CWindowTerminalMarket_OnUpdate | Per-frame update/validation (price/qty checks) | disasm | low |
| 0x102CD69C | 0x002CD69C | CWindowTerminalProduction_vtbl | RTTI vtable for CWindowTerminalProduction | RTTI | med |
| 0x10163130 | 0x00163130 | CWindowTerminalProduction_dtor | Destructor | decomp | low |
| 0x101629B0 | 0x001629B0 | CWindowTerminalProduction_DtorInternal | Dtor helper (frees list + base window) | decomp | low |
| 0x10163160 | 0x00163160 | CWindowTerminalProduction_PopulateItemList | Populates production item list (type 17 templates) | decomp | low |
| 0x10161D10 | 0x00161D10 | CWindowTerminalProduction_ResetUI | Clears production UI + repopulates requirement widgets | decomp | low |
| 0x10165340 | 0x00165340 | CWindowTerminalProduction_OnCommand | Command handler; builds Packet_ID_PRODUCTION and sends | decomp | med |
| 0x10163B50 | 0x00163B50 | CWindowTerminalProduction_InitUI | Builds Production terminal UI | decomp | med |
| 0x10161A00 | 0x00161A00 | CWindowTerminalProduction_OnUpdate | Per-frame update; reads StatGroup1 + variant/qty checks | decomp | med |
| 0x1015F8C0 | 0x0015F8C0 | CWindowTerminalProduction_UpdateTabs | Updates production tab/button visibility based on selection | decomp | low |
| 0x10160A30 | 0x00160A30 | CWindowTerminalProduction_UpdateSelection | Rebuilds selection details/costs UI | decomp | low |
| 0x101612C0 | 0x001612C0 | CWindowTerminalProduction_CalcMaxCraftCount | Computes max craft count from inputs/variant requirements | decomp | low |
| 0x101079E0 | 0x001079E0 | CWindowMgr_GetCachedWindowById | Returns cached window if id matches (fast path) | decomp | low |
| 0x1024CB00 | 0x0024CB00 | ProductionRecipe_BuildFromVariant | Builds production recipe struct from item+variant + modifiers | decomp | low |
| 0x10160630 | 0x00160630 | ProductionReq_AccumulateCosts | Accumulates production costs based on requirement codes | decomp | low |
| 0x1026AC60 | 0x0026AC60 | ProductionCalcA | Computes production cost/outputs for recipe struct (type-dependent) | decomp | low |
| 0x1026B550 | 0x0026B550 | ProductionCalcB | Computes production time/quantity for recipe struct (type-dependent) | decomp | low |
| 0x10257F50 | 0x00257F50 | Production_GetSkillMultiplier | Returns skill/quality multiplier from table | decomp | low |
| 0x10257A10 | 0x00257A10 | Production_GetRequirementValue | Returns requirement value for a given slot/type | decomp | low |
| 0x10257E30 | 0x00257E30 | Production_ApplySkillModifiers | Applies requirement + skill multipliers to value | decomp | low |
| 0x10256150 | 0x00256150 | Production_IsValidTypeCombo | Validates (type,subtype,slot) combos via allowlist | decomp | low |
| 0x10255D60 | 0x00255D60 | SkillType_UsesMultiplier | Returns false for skill types {2,6,9,11,15} | decomp | low |
| 0x10255D10 | 0x00255D10 | ScaleFactor_ByTypeAndMode | Returns scale (a2=7 -> 1.2, a2=11 -> 0.5); if a1==2 subtract 0.5 | decomp | low |
| 0x10255FE0 | 0x00255FE0 | Type14_ValidateIdRange | For type 14: ids 135..140 require a3>=10; ids 141..154 invalid | decomp | low |
| 0x10255DA0 | 0x00255DA0 | TypeHashMatchesTable | Validates a2 against per-type hash table; default true | decomp | low |
| 0x10257920 | 0x00257920 | U16Array20_Equals | Returns true if 20x u16 entries match | decomp | low |
| 0x100604C0 | 0x000604C0 | ItemStructA_Equals | Compares ItemStructA fields (u16x4, u8x2, u32x3, u8x3, u32 @+0x1B) | decomp | low |
| 0x10064980 | 0x00064980 | ItemStructA_Clear | Zeroes ItemStructA; sets durabilityLossPct=100; clears quality/variant/identity | decomp | med |
| 0x10064D00 | 0x00064D00 | ItemStructA_UpdateFrom | Copies ItemStructA fields from src | decomp | low |
| 0x10254750 | 0x00254750 | ItemStructA_IsValid | templateId valid and u16 @+0x06 nonzero | decomp | low |
| 0x10065320 | 0x00065320 | UiItemSlot_SetItem | Updates item slot from ItemStructA + tooltip | decomp | low |
| 0x10063F00 | 0x00063F00 | UiItemSlot_SetItemAndTooltip | Sets slot data + builds tooltip | decomp | low |
| 0x10067650 | 0x00067650 | UiList_SetSelectionText | Updates list UI entry text/formatting | decomp | low |
| 0x10099CB0 | 0x00099CB0 | UiList_AddEntry | Allocates entry and appends to UI list | decomp | low |
| 0x10073980 | 0x00073980 | RangeBar_SetMinMax | Sets range min/max and refreshes | decomp | low |
| 0x1006C1C0 | 0x0006C1C0 | PtrVector_FreeAll | Frees vector elements and resets length | decomp | low |
| 0x1006C240 | 0x0006C240 | PtrVector_FreeAll_thunk | Thunk to PtrVector_FreeAll | decomp | low |

### Mining packets (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CBAB8 | 0x002CBAB8 | Packet_ID_MINING_vtbl | RTTI vtable for Packet_ID_MINING | RTTI | med |
| 0x1010F670 | 0x0010F670 | Packet_ID_MINING_ctor | Initializes packet (id -102); clears fields | decomp | med |
| 0x1010F190 | 0x0010F190 | Packet_ID_MINING_write | Writes mining payload; branches by subtype | decomp | med |
| 0x101101A0 | 0x001101A0 | Packet_ID_MINING_read | Reads mining payload; branches by subtype | decomp | med |
| 0x1010F450 | 0x0010F450 | Packet_ID_MINING_free | Clears/owns buffer without delete | decomp | low |
| 0x1010FDA0 | 0x0010FDA0 | Packet_ID_MINING_dtor | Destructor (frees buffer + delete) | disasm | low |

### Terminal packets (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CD154 | 0x002CD154 | Packet_ID_CHEMICAL_LAB_vtbl | RTTI vtable for Packet_ID_CHEMICAL_LAB | RTTI | med |
| 0x1014B810 | 0x0014B810 | Packet_ID_CHEMICAL_LAB_read | Reads chemical lab payload; uses compressed bitstream | disasm | med |
| 0x1014AD40 | 0x0014AD40 | Packet_ID_CHEMICAL_LAB_write | Writes chemical lab payload; uses compressed bitstream | disasm | med |
| 0x1014C0B0 | 0x0014C0B0 | Packet_ID_CHEMICAL_LAB_dtor | Destructor (frees packet + delete) | disasm | low |
| 0x102CD710 | 0x002CD710 | Packet_ID_PRODUCTION_vtbl | RTTI vtable for Packet_ID_PRODUCTION | RTTI | med |
| 0x10164A30 | 0x00164A30 | Packet_ID_PRODUCTION_read | Reads production payload (bitstream, subtype branches) | decomp | med |
| 0x101617B0 | 0x001617B0 | Packet_ID_PRODUCTION_write | Writes production payload (bitstream, subtype branches) | decomp | med |
| 0x10161730 | 0x00161730 | ProductionEntryList_Write | Writes list length + entries (0x40 bytes each) | decomp | med |
| 0x10161680 | 0x00161680 | ProductionEntry_Write | Writes entry fields + ItemStructA + u32 list | decomp | med |
| 0x10160990 | 0x00160990 | Packet_WriteU32_Compressed | Writes u32 to packet bitstream (endian aware) | decomp | low |
| 0x1023D4F0 | 0x0023D4F0 | U16AndU32List_Write | Writes u16 then list of u32 ids to bitstream | decomp | low |
| 0x10255040 | 0x00255040 | ItemStructAPlus_u32_write | Writes u32 then ItemStructA_write | decomp | low |
| 0x10275DB0 | 0x00275DB0 | BitStream_WriteU32_Compressed | Bitstream write u32 (endian aware) | decomp | low |
| 0x10246F00 | 0x00246F00 | BitStream_WriteU32_Compressed_thunk | Thunk to BitStream_WriteU32_Compressed | decomp | low |
| 0x1023DC30 | 0x0023DC30 | List_CopyEntriesLimited | Copies RB-tree/list nodes into list with optional count limit | decomp | low |
| 0x100877C0 | 0x000877C0 | IntVector_PushN | Pushes N ints into vector (grows as needed) | decomp | low |
| 0x1008FFA0 | 0x0008FFA0 | ListNode_Create3 | Allocates 12-byte node {a1,a2,*a3} | decomp | low |
| 0x1008F620 | 0x0008F620 | List_IncSizeChecked | Increments list size with overflow guard | decomp | low |
| 0x10163A60 | 0x00163A60 | Packet_ID_PRODUCTION_dtor | Destructor (frees packet + delete) | decomp | low |
| 0x10162900 | 0x00162900 | Packet_ID_PRODUCTION_cleanup | Dtor helper (frees packet lists + bitstream) | decomp | low |

### Weapon packets (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CEDA0 | 0x002CEDA0 | Packet_ID_WEAPONFIRE_vtbl | RTTI vtable for Packet_ID_WEAPONFIRE | RTTI | med |
| 0x101A0680 | 0x001A0680 | Packet_ID_WEAPONFIRE_read | Reads weapon fire payload (u32 + u16 + u32) | disasm | med |
| 0x101A06D0 | 0x001A06D0 | Packet_ID_WEAPONFIRE_write | Writes weapon fire payload (u32 + u16 + u32) | disasm | med |
| 0x1019E3F0 | 0x0019E3F0 | Packet_ID_WEAPONFIRE_ctor | Initializes packet id=0x87, clears fields | disasm | med |
| 0x1019E440 | 0x0019E440 | Packet_ID_WEAPONFIRE_free | Frees owned bitstream buffer (no delete) | disasm | low |
| 0x1019F5D0 | 0x0019F5D0 | Packet_ID_WEAPONFIRE_dtor | Destructor (frees packet + delete) | disasm | low |
| 0x102C8FD4 | 0x002C8FD4 | Packet_ID_UNLOAD_WEAPON_vtbl | RTTI vtable for Packet_ID_UNLOAD_WEAPON | RTTI | med |
| 0x1008FDE0 | 0x0008FDE0 | Packet_ID_UNLOAD_WEAPON_read | Reads unload-weapon payload (bitstream) | disasm | med |
| 0x1008FE50 | 0x0008FE50 | Packet_ID_UNLOAD_WEAPON_write | Writes unload-weapon payload (bitstream) | disasm | med |
| 0x1008F5C0 | 0x0008F5C0 | Packet_ID_UNLOAD_WEAPON_dtor | Destructor (frees packet + delete) | disasm | low |

### Weapon fire / recoil (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101C5F40 | 0x001C5F40 | WeaponFire_TryFire | Validates weapon + ammo, LOS checks; drives fire flow; calls SendPacket_WEAPONFIRE | decomp | med |
| 0x101C6460 | 0x001C6460 | WeaponFire_Update | Rate-limited fire/update path; calls SendPacket_WEAPONFIRE + updates timers | decomp | low |
| 0x101C67C0 | 0x001C67C0 | WeaponFire_HandleState | Fire state machine; calls WeaponFire_Update/TryFire and state transitions | decomp | med |
| 0x101C48A0 | 0x001C48A0 | WeaponZoom_Reset | Resets zoom factor to 1.0, plays SFX 104, clears EncVar9/state | decomp | low |
| 0x101C4900 | 0x001C4900 | WeaponZoom_Reset_Thunk | Thunk to WeaponZoom_Reset | disasm | low |
| 0x101C4A90 | 0x001C4A90 | WeaponZoom_IsActive | EncVarMgr_GetInt(slot 9) == 1 | decomp | low |
| 0x101C49A0 | 0x001C49A0 | WeaponZoom_ResetIfActive | If EncVar9 set: resets zoom factor, plays SFX 104, clears EncVar9/state | decomp | low |
| 0x101C4930 | 0x001C4930 | WeaponZoom_Update | Increments zoom factor by frame time*20, clamps to target, applies via sub_10019A90 | decomp | low |
| 0x101C4910 | 0x001C4910 | WeaponFire_SetState | Writes weapon-fire state to SharedMem index 0x3041 | decomp | low |
| 0x101C4EA0 | 0x001C4EA0 | WeaponFire_QueueState | Queues state change via SharedMem 0x3040/0x3042; optional delay | decomp | low |
| 0x101C4FB0 | 0x001C4FB0 | WeaponFire_PlayEquipSfxAndQueueState4 | Reads SharedMem[0x303E] weapon id; plays equip SFX (template+0x70), queues state 4 | decomp | low |
| 0x101C4E60 | 0x001C4E60 | WeaponFire_ResetStateAndAim | Clears SharedMem[0x3040] pending + sets state 0 + SharedMem[0x3042]=-1; zeros aim vec | decomp | low |
| 0x101C4B50 | 0x001C4B50 | WeaponFire_SetNextFireTimePlus20 | Sets timer field to (ILTClient_GetTime + 20.0) | decomp | low |
| 0x101C5030 | 0x001C5030 | WeaponFire_GetAimVectors | Copies 2 vec3s from dword_103BF6FC (+0x40/+0x4C) | decomp | low |
| 0x101C51B0 | 0x001C51B0 | WeaponFire_IsDistanceSqBelowThreshold | Compares distance^2 vs SharedMem[0x1EA42] | decomp | low |
| 0x101C5120 | 0x001C5120 | WeaponFire_SetCurrentWeaponId | Writes SharedMem[0x303E]; if nonzero plays equip SFX + queue state 4 else resets zoom/state/aim | decomp | low |
| 0x101C5170 | 0x001C5170 | WeaponFire_SetCurrentWeaponIdAndFlag | Calls SetCurrentWeaponId; on success writes SharedMem[0x3045]=weaponId and sets 0x3043=1 | decomp | low |
| 0x101C4850 | 0x001C4850 | SharedMem_WriteU8_0xA6 | Writes u8 to SharedMem index 0xA6 | decomp | low |
| 0x1023D590 | 0x0023D590 | ItemList_FindEntryById_CopyEntry | Finds 44-byte entry by itemId; copies 0x20 bytes into struct | decomp | low |
| 0x101A0900 | 0x001A0900 | SendPacket_WEAPONFIRE | Builds Packet_ID_WEAPONFIRE on stack, writes u32/u16/u32, sends | disasm | med |
| 0x101C5F40 | 0x001C5F40 | ItemTemplate+0x34 (u16) | Used as clip/max?ammo threshold vs current ammo (dx from sub_100368B0) | disasm | med |
| 0x101C5F40 | 0x001C5F40 | ItemTemplate+0x58 (u8) | Auto/continuous-fire flag? In TryFire it bypasses ammo gate; WeaponFire_Update returns 0 if flag is 0 | disasm | med |
| 0x101C5F40 | 0x001C5F40 | ItemTemplate+0x64 (u16) | Ammo item id; validated range 1..0xBC0 before allowing fire | disasm | med |
| 0x101C60EE | 0x001C60EE | ItemTemplate+0x74 (u16) | "Out of ammo"/no-fire SFX id (passed to sub_101BDB80) | disasm | med |
| 0x101C5A50 | 0x001C5A50 | Item_GetWeaponFireDelayStat | Returns stat_id 0x24 (Weapon Fire Delay) for an item; default 10000 | decomp | low |
| 0x101C5B40 | 0x001C5B40 | Player_GetCurrentWeaponFireDelayStat | Uses current weapon slot to fetch stat_id 0x24 via Item_GetWeaponFireDelayStat | decomp | low |
| 0x10255CF0 | 0x00255CF0 | IsValue2Or30_NotEqual | Returns (a1!=a2 && (a1==2 || a1==30)) | decomp | low |

### Weapon fire entry snapshot (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1019F2F0 | 0x0019F2F0 | WeaponFireEntry_Init | Zero/init weapon-fire snapshot struct | decomp | low |
| 0x1019F380 | 0x0019F380 | WeaponFireEntry_Equals | Compares two fire snapshots for delta send | decomp | low |
| 0x101A2390 | 0x001A2390 | WeaponFireEntry_build_from_state | Builds snapshot: reads StatGroup 8+2, SharedMem flags, player/camera info | decomp | med |
| 0x101A1440 | 0x001A1440 | WeaponFireEntry_write | Writes snapshot by type (1..4) to bitstream | decomp | med |
| 0x101A1310 | 0x001A1310 | WeaponFireEntry_type1_write | Writes fire entry type1 fields to bitstream | decomp | low |
| 0x101A00B0 | 0x001A00B0 | WeaponFireEntry_type2_write | Writes fire entry type2 fields to bitstream | decomp | low |
| 0x101A0360 | 0x001A0360 | WeaponFireEntry_type3_write | Writes fire entry type3 fields to bitstream | decomp | low |
| 0x101A04D0 | 0x001A04D0 | WeaponFireEntry_type4_write | Writes fire entry type4 fields to bitstream | decomp | low |
| 0x10256590 | 0x00256590 | PackVec3i16_ToPacked1000 | Packs 3x int16 at +4/+6/+8 into encoded 0..999^3 int (scale type 1/2) | decomp | low |
| 0x10255F40 | 0x00255F40 | PackVec3_ToPacked1000 | Packs 3 floats to encoded 0..999^3 int (scale 1/512 or 1/1024) | decomp | low |

### Update packets (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CED90 | 0x002CED90 | Packet_ID_UPDATE_vtbl | RTTI vtable for Packet_ID_UPDATE | RTTI | med |
| 0x1019F570 | 0x0019F570 | Packet_ID_UPDATE_read | Init bitstream from payload | decomp | low |
| 0x101A0630 | 0x001A0630 | Packet_ID_UPDATE_write | Writes type marker (compressed 0) | decomp | low |
| 0x1019F5A0 | 0x0019F5A0 | Packet_ID_UPDATE_dtor | Destructor (frees packet + delete) | disasm | low |
| 0x101A27A0 | 0x001A27A0 | SendPacket_UPDATE | Builds WeaponFireEntry snapshot + sends Packet_ID_UPDATE | decomp | med |

### Deployable packets (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CA530 | 0x002CA530 | Packet_ID_DEPLOY_ITEM_vtbl | RTTI vtable for Packet_ID_DEPLOY_ITEM | RTTI | med |
| 0x100D4000 | 0x000D4000 | Packet_ID_DEPLOY_ITEM_write | Writes deploy-item payload; subtype branches | decomp | med |
| 0x100D4960 | 0x000D4960 | Packet_ID_DEPLOY_ITEM_read | Reads deploy-item payload; subtype branches | decomp | med |
| 0x100D46F0 | 0x000D46F0 | Packet_ID_DEPLOY_ITEM_dtor | Destructor (frees buffer + delete) | decomp | low |

### Base window helpers (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100464B0 | 0x000464B0 | CWindow_SetVisibleFlag | Sets visible flags and forces a refresh call | disasm | low |
| 0x1004ABA0 | 0x0004ABA0 | CWindow_CenterOnScreen | Centers window using global screen size | decomp | low |
| 0x1004ABE0 | 0x0004ABE0 | CWindow_ClampToScreen | Clamps window position to screen bounds | decomp | low |
| 0x100480B0 | 0x000480B0 | CWindow_UpdateChildren | Updates child widgets and tooltip timers | decomp | low |

### Inventory / stats glue (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102CDEAC | 0x002CDEAC | CInventoryClient_vtbl | RTTI vtable for CInventoryClient (single entry) | RTTI (COL @ 0x1032BED8) | low |
| 0x10182C90 | 0x00182C90 | CInventoryClient_dtor | Destructor (calls sub_101828B0 + delete) | disasm | low |
| 0x101828B0 | 0x001828B0 | CInventoryClient_Clear | Clears inventory map/tree, frees handles, resets strings | decomp | med |
| 0x100850A0 | 0x000850A0 | SharedMem2BD3_WriteString | Writes string to SharedMem index 0x2BD3 (inventory status text) | disasm | low |
| 0x100850C0 | 0x000850C0 | SharedMem2BD0_ReadBlock12 | Reads 12-byte block at SharedMem index 0x2BD0 | disasm | low |
| 0x100850E0 | 0x000850E0 | SharedMem2BD0_WriteBlock12 | Writes 12-byte block at SharedMem index 0x2BD0 | disasm | low |
| 0x10036B30 | 0x00036B30 | SharedMem_EquipSlotMask_HasSlot | Reads SharedMem[0x1D69F] equip-slot mask (u16) and tests slot | decomp | med |
| 0x102323C0 | 0x002323C0 | EquipSlotMask_HasSlot | Returns true if slot in 5..16 and mask bit (slot-4) is set | decomp | med |

### Interface resources (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1005DE10 | 0x0005DE10 | CInterfaceResMgr_Init | Loads window/HUD textures incl. mining_production.tga | strings + call from CShell_InitManagers | med |
| 0x1005DDA0 | 0x0005DDA0 | CInterfaceResMgr_AddTexture | Registers texture handle (LoadTexture + flags) into resource list | decomp | low |
| 0x1005D680 | 0x0005D680 | CInterfaceMgr_AddTexture | Adds texture handle into interface texture table | decomp | low |
| 0x1006F5E0 | 0x0006F5E0 | CInterfaceMgr_Init | Loads interface element textures incl. productionicon.tga | strings + call from CShell_InitManagers | low |

### Message read helpers (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10006AD0 | 0x00006AD0 | Msg_ReadVector3f | Message read: reads 3x u16 + decompress via g_pICompressWorld | decomp | low |
| 0x10006840 | 0x00006840 | Msg_ReadFloat | Message read: reads 32-bit float | decomp | low |

### Crosshair / recoil (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1004DEC0 | 0x0004DEC0 | CrosshairMgr_Init | Creates crosshair manager objects, loads string id 4307 | decomp | med |
| 0x10050430 | 0x00050430 | CrosshairMgr_Ctor | Initializes crosshair manager state | decomp | low |
| 0x100502D0 | 0x000502D0 | CrosshairMgr_LoadTextures | Loads XHAIR1/2/dot textures + sets quads | decomp | med |
| 0x1004E710 | 0x0004E710 | CrosshairMgr_OnMessage | Handles message 0x6E; builds crosshair UI/strings | decomp | low |
| 0x10056350 | 0x00056350 | CrosshairMgr_Update | Updates crosshair spread/target gate; emits Packet_ID_B0 subId 5/8 on threshold | decomp | low |
| 0x1004DB00 | 0x0004DB00 | Recoil_ApplyStatGroup2 | Adds scaled delta to StatGroup2 (v1[1] += a1/70*40) | decomp | low |
| 0x10014BC0 | 0x00014BC0 | CameraDistance_GetCVar | Reads CameraDistance cvar; returns default 150.0 if missing | decomp | low |
| 0x10014D70 | 0x00014D70 | CameraDistance_ApplyDeltaScaled | Applies camera distance delta scaled by g_pGameClientShell->recoilScale; clamps 60..300 and writes +CameraDistance | decomp | low |
| 0x10038A60 | 0x00038A60 | CGameClientShell_Ctor | CGameClientShell ctor; sets g_pGameClientShell | decomp | low |
| 0x10035A20 | 0x00035A20 | CGameClientShell_Dtor | CGameClientShell dtor; clears g_pGameClientShell | decomp | low |

### CrosshairMgr struct (CShell)
- CrosshairMgr::spreadCooldownMs @ 0x1A8 (float) ? set to 500.0 when target mode active.
- CrosshairMgr::spreadLastTime @ 0x1AC (float) ? last tick time for 1s gate.
- CrosshairMgr::targetMode @ 0x1B0 (int) ? current target mode (0/1/other).
- CrosshairMgr::lastTargetMode @ 0x1B4 (int) ? previous target mode (prevents repeats).
- CrosshairMgr::targetModeIsSpecial @ 0x1B8 (u8) ? forces Packet_ID_B0 subId 8.

### CShell globals (CShell)
- g_pGameClientShell @ 0x103BF6F0 (CGameClientShell*) ? set in CGameClientShell_Ctor, cleared in CGameClientShell_Dtor.
  - recoilScale (float @ +0x24) used in CrosshairMgr_Update and CameraDistance_ApplyDeltaScaled; initialized to 0 in ctor (writer beyond ctor not yet located).

### Markup tokenizer (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10256D30 | 0x00256D30 | MarkupTokenizer_NextNonWhitespace | Reads next non-whitespace char (uses cached byte) | decomp | low |
| 0x10256D80 | 0x00256D80 | MarkupTokenizer_NextToken | Tokenizer state machine for markup/quoted text | decomp | low |

### Math helpers (Client / CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10256050 | 0x00256050 | Vec3s_GetX_A | Returns int16 field +4 as double | decomp | low |
| 0x10256070 | 0x00256070 | Vec3s_GetY_A | Returns int16 field +6 as double | decomp | low |
| 0x10256090 | 0x00256090 | Vec3s_GetZ_A | Returns int16 field +8 as double | decomp | low |
| 0x102560B0 | 0x002560B0 | Vec3s_GetX_B | Returns int16 field +4 as double (alt instantiation) | decomp | low |
| 0x102560D0 | 0x002560D0 | Vec3s_GetY_B | Returns int16 field +6 as double (alt instantiation) | decomp | low |
| 0x102560F0 | 0x002560F0 | Vec3s_GetZ_B | Returns int16 field +8 as double (alt instantiation) | decomp | low |
| 0x10256110 | 0x00256110 | RoundFloatToInt2 | Rounds float to nearest int (?0.5) | decomp | low |
| 0x101C4A20 | 0x001C4A20 | Vec3_IsWithinBounds_511 | True if vec3 components are within [-511,511] | decomp | low |
| 0x10013750 | 0x00013750 | Vec3_ScaleToLength | Normalizes vec3 and scales to length | decomp | low |
| 0x1001A010 | 0x0001A010 | CameraShake_Add | Adds camera shake; clamps by ShakeMaxAmount | decomp | med |
| 0x10018810 | 0x00018810 | CameraVars_Init | Registers 3rd-person/Zoom/Shake client vars | disasm | low |
| 0x10038D8A | 0x00038D8A | CGameClientShell_OnMessage (case 0x81) | Reads vector + float from message; CameraShake_Add + Recoil_ApplyStatGroup2 | decomp | med |

### Player stats (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101876C0 | 0x001876C0 | CShell_InitManagers | Initializes UI/manager stack incl. playerstats | decomp (error strings) | med |
| 0x101A9E30 | 0x001A9E30 | PlayerStats_Init | Initializes player stats table (0x35 entries) | decomp | high |
| 0x101A9D80 | 0x001A9D80 | PlayerStats_SetStatValue | Updates one stat id, clamps to base, writes delta blob | decomp | high |
| 0x10033950 | 0x00033950 | PlayerStats_GetStatValue | Reads current stat value from stat blob | decomp | high |
| 0x10100460 | 0x00100460 | PlayerStatsUi_UpdateStatText | Loops 0x35 stats, formats via Item_FormatStatValue, updates UI text | decomp | med |
| 0x103BF710 | 0x003BF710 | g_pPlayerStats | PlayerStats manager singleton | xrefs (CShell_InitManagers) | med |

### Player stats storage / StatGroup shared memory (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10007720 | 0x00007720 | SharedMem_Map_Init | Creates file mapping "WhatAreULookingAt?" size 0x7BCA4 (0x1EF29 dwords), maps to lpBaseAddress; zeroes first init | decomp | high |
| 0x1035A6FC | 0x0035A6FC | lpBaseAddress | Shared-memory base pointer for stat/value store | xrefs | high |
| 0x10007900 | 0x00007900 | SharedMem_Lock | Enters shared memory lock (thunk to 0x10007850) | decomp | med |
| 0x10007910 | 0x00007910 | SharedMem_Unlock | Leaves lock; InterlockedExchange when refcount hits 0 | decomp | med |
| 0x100079B0 | 0x000079B0 | SharedMem_ReadDword_this | Reads dword at index with lock | decomp | med |
| 0x10007F60 | 0x00007F60 | SharedMem_ReadDword_std | Stdcall read dword at index with lock | decomp | med |
| 0x10007ED0 | 0x00007ED0 | SharedMem_ReadFloat_std | Stdcall read float at index with lock | decomp | low |
| 0x10007E90 | 0x00007E90 | SharedMem_ReadBool_std | Stdcall read bool (nonzero dword) at index with lock | decomp | low |
| 0x10007970 | 0x00007970 | SharedMem_ReadU16_std | Stdcall read u16 at index with lock | decomp | low |
| 0x1000A650 | 0x0000A650 | SharedMem_IsFlagSet | Reads dword at index and returns nonzero (bounds check vs 0x1EF29) | decomp | low |
| 0x1000A0C0 | 0x0000A0C0 | SharedMem_Lock | Thread-local lock (reentrant) for shared mem access | disasm | med |
| 0x1000A0D0 | 0x0000A0D0 | SharedMem_Unlock | Decrements lock refcount; releases when hits 0 | disasm | med |
| 0x1000A170 | 0x0000A170 | SharedMem_ReadDword_Locked | Read dword with SharedMem_Lock/Unlock | decomp | low |
| 0x1000A9D0 | 0x0000A9D0 | SharedMem_ReadBlock_Locked | memcpy out of shared mem with lock | decomp | low |
| 0x1000B000 | 0x0000B000 | SharedMem_WriteU8_Locked | Writes u8 into shared mem with lock | decomp | low |
| 0x1000AB60 | 0x0000AB60 | SharedMem_WriteDword_Locked | Writes dword into shared mem with lock | decomp | low |
| 0x1000B230 | 0x0000B230 | SharedMem_WriteBlock_Locked | memcpy into shared mem with lock | decomp | low |
| 0x1000B0B0 | 0x0000B0B0 | SharedMem_WriteDword_Locked_Global | Writes dword into shared mem (no ctx param) | decomp | low |
| 0x100083A0 | 0x000083A0 | SharedMem_WriteDword_this | Writes dword at index with lock | decomp | med |
| 0x100088F0 | 0x000088F0 | SharedMem_WriteDword_std | Stdcall write dword at index with lock | decomp | med |
| 0x10008360 | 0x00008360 | SharedMem_WriteU16_std | Stdcall write u16 at index with lock | decomp | med |
| 0x10008840 | 0x00008840 | SharedMem_WriteU8_std | Stdcall write u8 at index with lock | decomp | med |
| 0x10008030 | 0x00008030 | SharedMem_ReadBlock | memcpy out of shared mem (index*4) | decomp | med |
| 0x10008920 | 0x00008920 | SharedMem_WriteBlock | memcpy into shared mem (index*4) | decomp | med |
| 0x10007FE0 | 0x00007FE0 | SharedMem_Memset | memset in shared mem (index*4) | decomp | med |
| 0x10008210 | 0x00008210 | SharedMem_ReadBlock_std | Stdcall read block from shared mem (index*4, size) | disasm | low |
| 0x103BF76C | 0x003BF76C | g_pEncVarMgr | EncVar/stat-group manager used by StatGroup_Read/Write | xrefs | med |
| 0x10007FA0 | 0x00007FA0 | SharedMem_GetPtr | Returns pointer into shared mem (index*4) | decomp | med |
| 0x10008A00 | 0x00008A00 | SharedMem_WriteString_std | strncpy into shared mem (index*4) | decomp | low |
| 0x10008A70 | 0x00008A70 | SharedMem_WriteBlock_std | memcpy into shared mem (index*4, size) | decomp | low |
| 0x101C3E50 | 0x001C3E50 | StatGroupMgr_InitGroups | Creates StatGroups 0..8. Group 1: id 12359, count 106, size 424 (0x35 stat blob). | decomp | high |
| 0x101C2DF0 | 0x001C2DF0 | StatGroup_Init | Initializes stat group (id,count,size), seeds slot, zeroes + encodes | decomp | high |
| 0x101C3A20 | 0x001C3A20 | StatGroup_Write | Writes/encodes blob to shared mem (two copies) | decomp | high |
| 0x101C32F0 | 0x001C32F0 | StatGroup_Read | Reads/decodes blob from shared mem | decomp | high |
| 0x101C32C0 | 0x001C32C0 | StatGroup_GetPtr | Returns pointer to decoded group buffer | decomp | med |
| 0x101C3160 | 0x001C3160 | StatGroup_WriteGroup | Writes group blob by index (calls StatBlob_WriteEncoded) | decomp | med |
| 0x101C2C00 | 0x001C2C00 | StatBlob_WriteEncoded | Copies 0x3C bytes and encodes; used by group 2 recoil blob | decomp | low |
| 0x101C2F50 | 0x001C2F50 | StatGroup_ValidateCopies | Compares primary/secondary copies for integrity | decomp | med |
| 0x101C3BD0 | 0x001C3BD0 | StatGroup_WriteByIndex | Dispatches to StatGroup_Write by group index | decomp | high |
| 0x102726E0 | 0x002726E0 | StatBlob_Encode | Bytewise obfuscation used by StatGroup | decomp | high |
| 0x10272620 | 0x00272620 | StatBlob_Decode | Decode counterpart to StatBlob_Encode | decomp | high |

### Encoded var groups (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101C3650 | 0x001C3650 | EncVarSlot_InitByType | Initializes encoded var slot by type (0=int,1=float,2=vec4,3=0x4C,4=vec3,5=0xE8,6=0x3C) | decomp | med |
| 0x101C3040 | 0x001C3040 | EncVarMgr_SetInt | Sets encoded int in slot (a2<0x16) | decomp | med |
| 0x101C3090 | 0x001C3090 | EncVarMgr_SetFloat | Sets encoded float in slot (a2<0x16) | decomp | med |
| 0x101C30E0 | 0x001C30E0 | EncVarMgr_SetVec4 | Sets encoded vec4 in slot (a2<0x16) | decomp | med |
| 0x101C3180 | 0x001C3180 | EncVarMgr_GetInt | Gets encoded int from slot (a2<0x16) | decomp | med |
| 0x101C31C0 | 0x001C31C0 | EncVarMgr_GetFloat | Gets encoded float from slot (a2<0x16) | decomp | med |
| 0x101C3290 | 0x001C3290 | EncVarMgr_GetStructE8 | Gets encoded 0xE8 blob from slot | decomp | low |
| 0x101C29D0 | 0x001C29D0 | EncVarSlot_SetVec4 | Writes vec4 into slot buffer + encode | decomp | low |
| 0x101C2B80 | 0x001C2B80 | EncVarSlot_SetStructE8 | Writes 0xE8 blob into slot buffer + encode | decomp | low |
| 0x101C2C70 | 0x001C2C70 | EncVarSlot_ValidateCopies | Validates encoded copy against backup | decomp | low |
| 0x101C3420 | 0x001C3420 | EncVarMgr_ValidateOrBumpCounter | Validates slot, bumps counter slot 0 on mismatch | decomp | low |

### Player stats usage (UI, Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1008F760 | 0x0008F760 | CWindowStatusBar_UpdateStats | Reads player stat group (index 1) and updates HUD bars + percent texts (6020?6022) | decomp | med |
| 0x10033B40 | 0x00033B40 | HandleFlashlightToggle | Gated by PlayerStats_GetStatValue(2); shows error + plays Flashlight2on.wav | decomp | low |
| 0x10039380 | 0x00039380 | HandleQuickbarItemUse | Quickbar item use gating; checks PlayerStats_GetStatValue(2,7,0x33,0x34) | decomp | low |
| 0x1003A470 | 0x0003A470 | ClientGame_Update | Per-tick update: reads stat group 1, gates warnings on stat 0/3, clears flags | decomp | low |
| 0x10181570 | 0x00181570 | HandleItemUseRequest | Item-use gating: checks PlayerStats_GetStatValue(0/2/3) vs thresholds and shows UI errors | decomp | med |
| 0x1019E840 | 0x0019E840 | PlayerInput_UpdateAimVectors | Updates view/aim vectors from ILTClient; writes EncVar vec4 idx 1 and updates playerstats (offset 120480) | decomp | med |
| 0x1019EA30 | 0x0019EA30 | PlayerInput_UpdatePitchFromMouse | Mouse Y delta -> pitch update (SharedMem 0x1D6A5) w/ invert; clamps ?50; clears pitch on movement key flags | decomp | med |
| 0x101A2CE0 | 0x001A2CE0 | PlayerInput_UpdateAndSend | Builds movement/input flags (0x1/2/4/8 move, 0x10 run-lock, 0x20 crouch toggle, 0x40 jump/use, 0x80/0x100/0x200/0x400 from SharedMem 0x1D698-0x1D69B, 0x800 action-5, 0x4000/0x8000 actions 15/16); speed from stat 0xB (clamped 0.05..1.5); writes StatGroup idx 2 (flags) + idx 4 (speed); calls PlayerInput_UpdateAimVectors + PlayerInput_UpdatePitchFromMouse; may send Packet_ID_UPDATE when jump/use set | decomp | med |
| 0x10159880 | 0x00159880 | CWindowTerminalMedical_Update | Uses stat ids 0,1,2,3,4,0x2E to gate UI state | decomp | med |
| 0x10159A40 | 0x00159A40 | CWindowTerminalMedical_OnCommand | Uses stat ids 0,1,2,3,4,0x2E for command validation | decomp | med |

### Observed player stat IDs (Client, inferred by usage)
| Stat ID | Usage | Evidence |
|---|---|---|
| 0x00 | Compared to g_StatScaleTable[0]; gates item use + warnings | HandleItemUseRequest, ClientGame_Update |
| 0x01 | Compared vs stat 0x2E; gating for movement flags | CWindowTerminalMedical_*, PlayerInput_UpdateAndSend |
| 0x02 | Threshold >= 1000; gates flashlight/medical/item use | CWindowTerminalMedical_*, HandleFlashlightToggle, HandleItemUseRequest |
| 0x03 | Threshold >= 1000; gates medical + warnings | CWindowTerminalMedical_*, ClientGame_Update |
| 0x04 | Threshold >= 0x0C; medical action requirement | CWindowTerminalMedical_OnCommand |
| 0x07 | Gating for quickbar item use branch | HandleQuickbarItemUse |
| 0x0B | Used as float scale (stat/1000, clamp 0.05?1.5) | PlayerInput_UpdateAndSend |
| 0x2E | Cost/requirement compared against stat 1 | CWindowTerminalMedical_* |
| 0x33/0x34 | Used in quickbar item use message 5661; 0x34 value displayed | HandleQuickbarItemUse |

### SharedMem flag indices (Client, observed usage)
| Index | Usage | Evidence |
|---|---|---|
| 0x1D698-0x1D69B | Read by PlayerInput_UpdateAndSend to set input flags (0x80/0x100/0x200/0x400); cleared by login/reset flows | decomp |
| 0x1D6A7 | XOR key for stat blob entries; PlayerStats_SetStatValue uses SharedMem_ReadDword_std(0x1D6A7); init clears it | decomp |
| 0x1D6A8 | Gates camera/look update path in sub_1019E840/EA30 | decomp |
| 0x1D6A9 | Toggled in quickbar/item flows and cleared in ClientGame_Update | decomp |
| 0x1D69F | Equip slot mask (u16); SharedMem_EquipSlotMask_HasSlot tests slots 5..16 via bit (slot-4) | decomp |

### StatGroup 5 (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10032D40 | 0x00032D40 | StatGroup5_GetValue | Reads StatGroup index 5 (1x4 bytes), returns value | decomp | low |

### Playerfile packet parsing (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10198F30 | 0x00198F30 | HandlePacket_ID_PLAYERFILE | Reads Packet_ID_PLAYERFILE; updates UI windows; no stat writes seen | decomp | med |
| 0x1013C6F0 | 0x0013C6F0 | Packet_ID_PLAYERFILE_read | Parses playerfile payload; branches on presence flag; reads structA + faction list | decomp | med |
| 0x100A0C90 | 0x000A0C90 | Packet_ID_PLAYERFILE_read_structA | Reads core playerfile fields + BlockC0 entries | decomp | med |
| 0x1000D870 | 0x0000D870 | Playerfile_read_blockC0 | Reads 10x blockC0 entries from bitstream | decomp | low |
| 0x1000D730 | 0x0000D730 | Playerfile_read_blockC0_entry | Reads one blockC0 entry (bitfield + u16c + u8c) | decomp | low |

Packet_ID_HIT (msgId 0x84) layout (observed):
- u32c targetId
- u8 hitType? (compressed)
- u8 hitSubType? (compressed)

Helper:
- 0x1004F1B0 Packet_ID_HIT_Read

### Data (item template globals)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10147CC6 | (abs) | g_ItemVariantTable? | Packed 0x12?byte record table used by ItemVariant_FindMatchingRecord | disasm | low |

### Code (login request / Packet_ID_NOTIFY_107 build)
Note: renamed from Packet_Id107; IDA names may still use the old prefix.
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101C1072 | 0x001C1072 | Login_OnSubmit | Login UI submit handler; reads user/pass fields and queues updates | decomp (user) | high |
| 0x10008110 | 0x00008110 | Ui_ReadFieldTextById | Reads UI field text by ID into buffer (lpBaseAddress + 4*id) | decomp (user) | med |
| 0x10108F70 | 0x00108F70 | LoginField_QueueUpdate | Stores field ids/values into login window object + triggers apply/send | decomp (user) | med |
| 0x101055C0 | 0x001055C0 | LoginField_ApplyString | Resolves string via engine interface; sets UI text + flags | decomp (user) | med |
| 0x10077540 | 0x00077540 | UiText_SetValueIfChanged | Copies new string, triggers validation/callbacks | decomp (user) | low |
| 0x101C04B0 | 0x001C04B0 | Login_SendRequest_Throttled | Builds Packet_ID_NOTIFY_107 and calls LTClient_SendPacket_BuildIfNeeded | decomp (user) | med |
| 0x101C0820 | 0x001C0820 | AntiCheat_PeriodicCheck | Periodic VM-detection ping (interval=300s); if triggered sends Packet_ID_NOTIFY_107 subId=1 (optA=21, optC=playerId) | decomp (user) | med |
| 0x1000C7E0 | 0x0000C7E0 | Packet_ID_NOTIFY_107_Init | Initializes packet object; sets msg id byte = 107 | decomp (user) | med |
| 0x1000C770 | 0x0000C770 | Packet_WriteHeader | Initializes bitstream; writes optional header byte 0x19 + 64-bit token; writes msg id byte | decomp (user) | med |
| 0x1000D9D0 | 0x0000D9D0 | Packet_ID_NOTIFY_107_Serialize | Builds bitstream; writes flags + optional ints + 2x2048-bit blocks | decomp (user) | med |
| 0x1000D8B0 | 0x0000D8B0 | Packet_ID_NOTIFY_107_Read | Reads bitstream; mirrors serialize + 2x2048-bit blocks | decomp (user) | med |
| 0x1000D650 | 0x0000D650 | Playerfile_BlockC0_WriteEntry | Writes one entry in Playerfile blockC0 (bitflag + u16c + 5x u8c + bitfields) | decomp (user) | low |
| 0x1000CBF0 | 0x0000CBF0 | BitStream_WriteU16C | Writes u16 compressed to bitstream | inferred from usage | low |
| 0x1000C870 | 0x0000C870 | BitStream_Write2048 | Wrapper: g_LTClient vtbl+0x34 (write 2048 bits) | decomp (user) | low |
| 0x1000C8A5 | 0x0000C8A5 | BitStream_Read2048 | Wrapper: g_LTClient vtbl+0x38 (read 2048 bits) | decomp (user) | low |
| 0x1000CB60 | 0x0000CB60 | Packet_ID_NOTIFY_107_Vtbl0 | Vtable slot +0x00 (unknown role) | vtable xref | low |
| 0x100065D9 | 0x000065D9 | Registry_SetUsernameValue | Writes registry value "username" (persistence) | decomp (user) | low |
| 0x1008A0C0 | 0x0008A0C0 | LoginToken_Process | Reads LoginToken + passes to engine (pre-login flow) | decomp (user) | low |
| 0x1008F1A0 | 0x0008F1A0 | CharacterSelectUI_SetupDisplay | Sets up character select display (window id 0) using optC + strA/strB; called by Packet_ID_NOTIFY_107 subId=325 | decomp (user) | med |
| 0x102A64A0 | 0x002A64A0 | Ensure_BitstreamTables_Init | Wrapper; calls Init_BitstreamTables once | xrefs | low |
| 0x10272AD0 | 0x00272AD0 | Init_BitstreamTables | Initializes large bit/lookup tables (0x102FE000+) | disasm (user) | low |

#### Packet_ID_NOTIFY_107 bitstream construction (observed)

- Packet_ID_NOTIFY_107_Serialize writes a series of presence bits for 4 optional fields: +1076, +1080, +1084, +1088; if present it writes the value (u32 for last two; compressed for first two).
- Two fixed 2048-bit blocks are appended from packet offsets +1216 and +1344 via g_LTClient vtbl+0x34 (size=2048 bits).
- If word at +1072 == 325, an extra block is emitted via sub_1000D800(this+1092, this+12).
- Packet_ID_NOTIFY_107_Read mirrors the serialize path: reads u16c into +1072, then 4 presence bits + fields, then reads two 2048-bit blocks via g_LTClient vtbl+0x38.
- If +1072 == 325, Packet_ID_NOTIFY_107_Read calls Playerfile_read_blockC0(this+1092, this+12).
- Packet_ID_NOTIFY_107_Read layout: +1072=u16 subId, +1076=u32 optA (Read_u32c_alt), +1080=u32 optB (Read_u32c_alt), +1084=u32 optC (Read_u32c), +1088=u32 optD (Read_u32c), +1216/+1344=two LTClient strings (2048 bytes each).
- Packet_ID_NOTIFY_107_DispatchSubId (selected):
- subId 1: Network_OnConnectionLost(msgId 5585).
- subId 2: Player_OnDeath.
- subId 3: ChatNotify (string 5316).
- subId 4: ChatNotify "Cloning complete." + SharedMem_WriteFlag_0x94(0).
- subId 5: ChatNotify (string 5340).
- subId 6: Player_HasFaction -> Player_CheckSpawnState + ChatNotify (string 4321).
- subId 7: ChatNotify (string 5336) + g_LTClient vtbl+0x4C(0x1000000).
- subId 8: ChatNotify (string 1850).
- subId 9: ChatNotify (string 5341/5342/5343/5344 by optA).
- subId 0xA: ChatNotify (string 1846) + WriteLoginDataToFile("Mails\\<user>\\Outbox\\%u.fml").
- subId 0xB/0xC/0xD: ChatNotify (string 1847/1848/1899) + g_LTClient vtbl+0x4C(0x4000).
- subId 0xE: g_LTClient vtbl+0x4C(0x4000000).
- subId 0xF: ChatNotify (string 1849) + g_LTClient vtbl+0x4C(1) + Sound_PlayAtPosition(60).
- subId 0x10: Action_SendPickupPacket(optC).
- subId 0x12: EncVar_WriteStatGroup5(optA byte2).
- subId 0x13/0x14/0x15/0x16/0x18/0x1A/0x1C: ChatNotify (string 5347/5515/5514/5348/5349/5615/5616).
- subId 0x17/0x19: ChatNotify (string 4324/4323) + UIWidget_InvokeVirtual5(window id 17).
- subId 0x1B/0x1D: ChatNotify (string 4461/4462) + InventoryMgr_InvokeCommand5(window id 18).
- subId 0x1E: ChatNotify (string 5355).
- subId 0x1F: ChatNotify (string 4326 w/arg 30 or 4463) + g_LTClient vtbl+0x4C(64) + Data_SerializeHelper(window id 19).
- subId 0x24: ChatNotify (string 4328) + g_LTClient vtbl+0x4C(64) + Data_SerializeHelper(window id 19).
- subId 0x2C: ChatNotify (string 5367) + g_LTClient vtbl+0x4C(16) + HandlePacket_ID_6B_SubId44_InventoryUiRefresh(window id 21).
- subId 0x37: ChatNotify (string 4330) + g_LTClient vtbl+0x4C(2) + MarketUI_RefreshInventory(window id 19); if window id 23 && flag at +6241 -> vtbl+4(4).
- subId 0x3C: ChatNotify (string 4331) + g_LTClient vtbl+0x4C(2); optA==1 -> CWindowTerminalMarket_SendSearchRequest(window id 22); optB==2 -> Market_BuildSearchPacket(window id 70).
- subId 0x3F: g_LTClient vtbl+0x4C(4096) + CharacterUI_InvokeCommand5(window id 24) + ChatNotify (string 4338).
- subId 0x40: g_LTClient vtbl+0x4C(4096) + CharacterUI_InvokeCommand5(window id 24) + clear SharedMem strings + PlayerData_ClearEquipment + SharedMem_WritePlayerFile + set LTClient(2) flags + ChatNotify (string 4339).
- subId 0x42: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4340) + FriendsList_HandleSelection(window id 24, optC).
- subId 0x46: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4341) + UI_ClearTwoTextFields (window id 24).
- subId 0x4C: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4343) + PlayerData_ClearEquipment + CharacterUI_SetupPaperdoll(window id 24; copies window id 25 data).
- subId 0x52: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4345) + window id 24 vtbl+4(5).
- subId 0x53: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4346).
- subId 0x54/0x55/0x56/0x57/0x58/0x59/0x5A: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 5397/5398/5399/5400/5401/5404/5403).
- subId 0x5B: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4347) + FriendsList_ClearSelection(window id 24).
- subId 0x64: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4348) + FriendsList_ResetNetState(window id 24).
- subId 0x66: ChatNotify (string 5411) + g_LTClient vtbl+0x4C(0x8000).
- subId 0x68: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4351) + FriendsList_ToggleSortOrder(window id 24, optC, optA==0).
- subId 0x6E: ChatNotify (string 5416) + SetFlag6408(window id 28, 0) + g_LTClient vtbl+0x4C(8).
- subId 0x6F: g_LTClient vtbl+0x4C(8) + SetFlag6408(window id 28, 1).
- subId 0x70: g_LTClient vtbl+0x4C(8) + ChatNotify (string 5415) + SetFlag6408(window id 28, 0).
- subId 0x73: g_LTClient vtbl+0x4C(8) + ChatNotify (string 4362) + FriendsList_SelectById(window id 24, optC).
- subId 0x7C: FactionUI_OnCommand(window id 29, optC).
- subId 44: inventory/production UI refresh (slot/tooltips).
- String ID texts resolved in the Packet_ID_6B tables below (from CRes_strings.csv, lang_id=0).
- subId 231/270: worldId=4 (apartments) + SharedMem[0x77]=optC + SharedMem[0x78]=optB + set 0x1EEC0=1.
- subId 269: if optA != 0 then worldId=optA + set 0x1EEC0=1 (non-apartment world selection).
- subId 0x145 (325): CharacterSelectUI_SetupDisplay(window id 0, optC + strA/strB).
- subId 0x14C/0x14D: localized ChatNotify (string 4467/4468, arg from string 14000+optC, float optD).
- subId 0x153: UIWidget_SetSelectionState(window id 72) + GameStateMgr_EnterPausedState(72).
- subId 0x15D: SharedMem_WriteString11224(strA).
- subId 0x161/0x162: UIWidget_SetLabelText / UIWidget_ResetLabel (window id 77).
- subId 0x163: HudNotify_ShowPPChangeMessage(window id 64, optC + optA byte2).
- World selection can also be triggered by packet ID 0x7B (HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270), which sets SharedMem[0x1EEC1/0x1EEC2] and 0x1EEC0=1.
- Packet_WriteHeader is called before serialize: it resets/initializes the bitstream, optionally writes header byte 0x19 plus a 64-bit token (Packet_GetHeaderTokenU64 via BitStream_WriteU64) when *(this+8)==0x19, then writes msg id byte from *(this+1064).
- Playerfile_BlockC0_WriteEntry layout (called 10x by sub_1000D800): if *(this+4)==0 or *(this+5)==0 => write bit0. Else write bit1, then u16c, then u8c for bytes +2/+3/+8/+9/+10, plus raw bitfields from +4 (7 bits), +5 (7 bits), +6 (9 bits).

### Packet_ID_6B SubId Map (raw extract)
| SubId | StrId(s) | LTFlag(s) | WindowId(s) | Calls |
|---|---|---|---|---|
| 1 (0x1) | 5585 |  |  | Network_OnConnectionLost |
| 2 (0x2) |  |  |  | Player_OnDeath |
| 3 (0x3) | 5316 |  |  |  |
| 4 (0x4) | 15 |  |  | SharedMem_WriteFlag_0x94 |
| 5 (0x5) | 5340 |  |  |  |
| 6 (0x6) | 4321 |  |  | Player_HasFaction,Player_CheckSpawnState |
| 7 (0x7) | 5336 | 0x1000000 |  |  |
| 8 (0x8) | 1850 |  |  |  |
| 9 (0x9) | 5341,5342,5343,5344 |  |  |  |
| 10 (0xA) | 1846 | 0x4000 |  | SharedMem_ReadAndCallFunc,WriteLoginDataToFile |
| 11 (0xB) | 1847 |  |  |  |
| 12 (0xC) | 1848 |  |  |  |
| 13 (0xD) | 1899 | 0x4000 |  |  |
| 14 (0xE) |  | 0x4000000 |  |  |
| 15 (0xF) | 1849 | 1 |  | Sound_PlayAtPosition |
| 16 (0x10) |  |  |  | Action_SendPickupPacket |
| 18 (0x12) |  |  |  | EncVar_WriteStatGroup5 |
| 19 (0x13) | 5347 |  |  |  |
| 20 (0x14) | 5515 |  |  |  |
| 21 (0x15) | 5514 |  |  |  |
| 22 (0x16) | 5348 |  |  |  |
| 23 (0x17) | 4324 |  |  |  |
| 24 (0x18) | 5349 |  |  |  |
| 25 (0x19) | 4323 |  | 17 | UIWidget_InvokeVirtual5 |
| 26 (0x1A) | 5615 |  |  |  |
| 27 (0x1B) | 4461 |  |  |  |
| 28 (0x1C) | 5616 |  |  |  |
| 29 (0x1D) | 4462 |  | 18 | InventoryMgr_InvokeCommand5 |
| 30 (0x1E) | 5355 |  |  |  |
| 31 (0x1F) | 4326,4463 | 64 | 19 |  |
| 32 (0x20) | 5356 |  |  |  |
| 33 (0x21) | 5352 | 64,2 |  |  |
| 34 (0x22) | 5361 |  |  |  |
| 35 (0x23) | 5362 | 64 |  |  |
| 36 (0x24) | 4328 | 64 | 19 | Data_SerializeHelper |
| 37 (0x25) |  |  |  |  |
| 38 (0x26) | 5363 |  |  |  |
| 39 (0x27) | 5430 | 16 |  |  |
| 40 (0x28) | 5431 | 16 |  |  |
| 41 (0x29) | 5364 | 16 |  |  |
| 42 (0x2A) | 5365 | 16 |  |  |
| 43 (0x2B) | 5366 | 16 |  |  |
| 44 (0x2C) | 5367 | 16 | 21 | HandlePacket_ID_6B_SubId44_InventoryUiRefresh |
| 45 (0x2D) | 5428 | 16 |  |  |
| 46 (0x2E) | 5377 |  |  |  |
| 47 (0x2F) | 5357 |  |  |  |
| 48 (0x30) | 5370 |  |  |  |
| 49 (0x31) | 5371 |  |  |  |
| 50 (0x32) | 5468 |  |  |  |
| 51 (0x33) | 5466 |  |  |  |
| 52 (0x34) | 5467 |  |  |  |
| 53 (0x35) | 5372 |  |  |  |
| 54 (0x36) | 5621 |  |  |  |
| 55 (0x37) | 4330 | 2 | 23,19 | MarketUI_RefreshInventory |
| 56 (0x38) |  |  |  |  |
| 57 (0x39) | 5369 |  |  |  |
| 58 (0x3A) | 5613 |  |  |  |
| 59 (0x3B) | 5516 |  |  |  |
| 60 (0x3C) | 4331 | 2 | 22,70 | CWindowTerminalMarket_SendSearchRequest,Market_BuildSearchPacket |
| 61 (0x3D) | 5378,5379,5380,5381,5382,5383 |  |  |  |
| 62 (0x3E) | 5665 |  |  |  |
| 63 (0x3F) | 4338 | 4096 | 24 | CharacterUI_InvokeCommand5 |
| 64 (0x40) | 4339 | 4096 | 24 | CharacterUI_InvokeCommand5,SharedMem_WriteString11224,SharedMem_WriteString126546,PlayerData_ClearEquipment,SharedMem_WritePlayerFile |
| 65 (0x41) | 5385 | 4096 |  |  |
| 66 (0x42) | 4340 | 4096 | 24 | FriendsList_HandleSelection |
| 67 (0x43) | 5387 | 4096 |  |  |
| 68 (0x44) | 5388 | 4096 |  |  |
| 69 (0x45) | 5402 | 4096 |  |  |
| 70 (0x46) | 4341 | 4096 | 24 | UI_ClearTwoTextFields |
| 71 (0x47) | 5389 | 4096 |  |  |
| 72 (0x48) | 5390 | 4096 |  |  |
| 73 (0x49) | 5391 | 4096 |  |  |
| 74 (0x4A) | 4342 | 4096 |  |  |
| 75 (0x4B) | 5392 | 4096 |  |  |
| 76 (0x4C) | 4343 | 4096 | 25,24 | PlayerData_ClearEquipment,CharacterUI_SetupPaperdoll |
| 77 (0x4D) | 5393 | 4096 |  |  |
| 78 (0x4E) | 5394 | 4096 |  |  |
| 79 (0x4F) | 5395 | 4096 |  |  |
| 80 (0x50) | 4344 | 4096 |  |  |
| 81 (0x51) | 5396 | 4096 |  |  |
| 82 (0x52) | 24,4345 | 4096 |  |  |
| 83 (0x53) | 4346 | 4096 |  |  |
| 84 (0x54) | 5397 | 4096 |  |  |
| 85 (0x55) | 5398 | 4096 |  |  |
| 86 (0x56) | 5399 | 4096 |  |  |
| 87 (0x57) | 5400 | 4096 |  |  |
| 88 (0x58) | 5401 | 4096 |  |  |
| 89 (0x59) | 5404 | 4096 |  |  |
| 90 (0x5A) | 5403 | 4096 |  |  |
| 91 (0x5B) | 4347 | 4096 | 24 | FriendsList_ClearSelection |
| 92 (0x5C) | 5405 | 4096 |  |  |
| 93 (0x5D) |  | 4096,0x8000 |  |  |
| 94 (0x5E) | 5520 | 4096 |  |  |
| 95 (0x5F) | 5521 | 0x200000 |  |  |
| 96 (0x60) | 5658 | 0x200000 |  |  |
| 97 (0x61) | 5408 | 4096 |  |  |
| 98 (0x62) | 5409 | 4096 |  |  |
| 99 (0x63) | 5410 | 4096 |  |  |
| 100 (0x64) | 4348 | 4096 | 24 | FriendsList_ResetNetState |
| 101 (0x65) | 4349 | 4096 |  |  |
| 102 (0x66) | 5411 | 0x8000 |  |  |
| 103 (0x67) | 4350 | 0x8000 |  |  |
| 104 (0x68) | 4351 | 4096 | 24 | FriendsList_ToggleSortOrder |
| 105 (0x69) | 5412 | 4096 |  |  |
| 106 (0x6A) | 5413 | 0x200000 |  |  |
| 107 (0x6B) | 4359 | 0x200000 |  |  |
| 108 (0x6C) | 4360 | 0x200000 |  |  |
| 109 (0x6D) | 5414 | 0x200000 |  |  |
| 110 (0x6E) | 5416 | 8 | 28 | SetFlag6408 |
| 111 (0x6F) |  | 8 | 28 | SetFlag6408 |
| 112 (0x70) | 5415 | 8 | 28 | SetFlag6408 |
| 113 (0x71) | 4361 | 8 |  |  |
| 114 (0x72) | 5417 | 8 |  |  |
| 115 (0x73) | 4362 | 8 | 24 | FriendsList_SelectById |
| 116 (0x74) | 5423 | 8 |  |  |
| 117 (0x75) | 5432 |  |  |  |
| 118 (0x76) |  |  |  |  |
| 119 (0x77) |  |  |  |  |
| 120 (0x78) |  |  |  |  |
| 121 (0x79) |  |  |  |  |
| 122 (0x7A) |  |  |  |  |
| 123 (0x7B) |  |  |  |  |
| 124 (0x7C) |  |  | 29 | FactionUI_OnCommand |
| 125 (0x7D) | 5436 |  |  |  |
| 126 (0x7E) | 5687 |  |  |  |
| 127 (0x7F) | 5437 |  |  |  |
| 128 (0x80) | 5445 |  |  |  |
| 129 (0x81) | 5440 |  |  |  |
| 130 (0x82) | 5439 |  |  |  |
| 131 (0x83) | 5438 |  |  |  |
| 132 (0x84) |  |  |  |  |
| 133 (0x85) | 5454,5645 | 2048 |  |  |
| 134 (0x86) | 5589 | 2048 |  |  |
| 135 (0x87) | 33,5455 | 4096 |  |  |
| 136 (0x88) | 4368 | 4096 | 33,24 | FriendsList_AddOrUpdateEntry |
| 137 (0x89) | 5509 | 4096 |  |  |
| 138 (0x8A) |  | 4096 | 24 | FriendsList_RemoveEntry |
| 139 (0x8B) | 5458 | 4096 |  |  |
| 140 (0x8C) | 5459 | 4096 |  |  |
| 141 (0x8D) |  | 4096 | 33 | UIWidget_OnConfirmSelection |
| 142 (0x8E) | 5508 | 4096 |  |  |
| 143 (0x8F) | 4399 | 4096 | 24 | FriendsList_UpdateCounter |
| 144 (0x90) | 4369 | 32 |  |  |
| 145 (0x91) | 5462 | 32 |  |  |
| 146 (0x92) | 4370 | 2048 | 32 | SharedMem_ReadDword_this |
| 147 (0x93) |  |  |  |  |
| 148 (0x94) |  |  |  |  |
| 149 (0x95) |  |  |  |  |
| 150 (0x96) |  | 0x2000000 | 35 |  |
| 151 (0x97) |  |  | 35 | CWindowTerminalChemicalLab_StartProduction |
| 152 (0x98) |  |  | 35 |  |
| 153 (0x99) | 5482 | 1024 |  |  |
| 154 (0x9A) | 5483 |  |  |  |
| 155 (0x9B) | 5484 | 1024 |  |  |
| 156 (0x9C) | 5485 | 1024 |  |  |
| 157 (0x9D) | 5486 | 1024 |  |  |
| 158 (0x9E) | 5487 | 1024 |  |  |
| 159 (0x9F) | 4385 | 1024 |  |  |
| 160 (0xA0) | 4386 | 1024 |  |  |
| 161 (0xA1) | 4387 | 1024 |  |  |
| 162 (0xA2) | 5490 | 1024 |  |  |
| 163 (0xA3) | 5492 | 1024 |  |  |
| 164 (0xA4) | 5496 | 1024 |  |  |
| 165 (0xA5) | 5497 | 1024 |  |  |
| 166 (0xA6) | 4389 | 1024 | 36 | SharedMem_WriteCharStateFlag |
| 167 (0xA7) | 5498 | 1024 |  |  |
| 168 (0xA8) | 4390 | 1024 | 36 |  |
| 169 (0xA9) | 4391 | 1024 | 36 | SharedMem_WriteCharStateFlag,UICmd_InvokeCommand5 |
| 170 (0xAA) | 4392 | 1024 | 36 |  |
| 171 (0xAB) | 5499 | 1024 |  |  |
| 172 (0xAC) | 5500 | 1024 | 36 | SharedMem_WriteCharStateFlag |
| 173 (0xAD) | 4393 | 1024 | 36 | UICmd_InvokeCommand6,SharedMem_WriteCharStateFlag |
| 174 (0xAE) | 5501 | 1024 |  |  |
| 175 (0xAF) | 37,4394 | 1024 |  |  |
| 176 (0xB0) | 36,4395 | 1024 |  |  |
| 177 (0xB1) |  |  |  |  |
| 178 (0xB2) |  |  |  |  |
| 179 (0xB3) | 4398 |  |  |  |
| 180 (0xB4) | 5502 | 0x200000 |  |  |
| 181 (0xB5) |  | 0x200000 | 27 |  |
| 182 (0xB6) | 5503 | 0x200000 |  |  |
| 183 (0xB7) | 5504 | 0x200000 |  |  |
| 184 (0xB8) | 5506 | 1024 |  |  |
| 185 (0xB9) | 4402 | 4096 |  |  |
| 186 (0xBA) | 5456 | 4096 |  |  |
| 187 (0xBB) | 5511 | 4096 |  |  |
| 188 (0xBC) | 5512 | 4096 |  |  |
| 189 (0xBD) | 5513 | 4096 |  |  |
| 190 (0xBE) | 1876,1877 | 4096 |  |  |
| 191 (0xBF) | 4403 | 4096 |  |  |
| 192 (0xC0) | 4404 | 2 | 38 | CWindowProductionRecycle_CopySkillsFromMarket |
| 193 (0xC1) | 5407 | 2 |  |  |
| 194 (0xC2) | 5407 |  |  |  |
| 195 (0xC3) | 5518 |  |  |  |
| 196 (0xC4) |  |  |  | SharedMem_WriteString126546 |
| 197 (0xC5) |  |  |  |  |
| 198 (0xC6) | 5524 |  |  |  |
| 199 (0xC7) | 4406 |  |  |  |
| 200 (0xC8) | 5454 |  |  |  |
| 201 (0xC9) | 5595 |  |  |  |
| 202 (0xCA) | 4407 | 8 |  |  |
| 203 (0xCB) | 4469 | 8 | 41 |  |
| 204 (0xCC) | 41,42,43,68,5454 | 8 |  |  |
| 205 (0xCD) | 41,42,43,68,79,4408,4409 | 8 |  |  |
| 206 (0xCE) | 5442,5525 |  |  |  |
| 207 (0xCF) | 4409 | 8 | 42 |  |
| 208 (0xD0) | 5530 |  |  |  |
| 209 (0xD1) | 5532,5666,5667,50000 | 8 |  |  |
| 210 (0xD2) | 46,4416 | 0x20000 |  |  |
| 211 (0xD3) | 5533 |  |  |  |
| 212 (0xD4) | 5650 |  |  |  |
| 213 (0xD5) | 5651 |  |  |  |
| 214 (0xD6) | 5534,5535 |  |  |  |
| 215 (0xD7) |  | 0x20000 |  | SharedMem_WriteDword_0x77,SharedMem_WriteDword_0x78,LoginUI_ShowMessage |
| 216 (0xD8) | 5536 |  |  |  |
| 217 (0xD9) | 5537 |  |  |  |
| 218 (0xDA) | 4417 | 0x20000 | 48 | CWindowFactionMgmt_CopyEditedToState |
| 219 (0xDB) | 4418 | 0x20000 |  | SharedMem_ReadBool_std,SharedMem_ResetAuctionState,SharedMem_WriteWorldInst_0x1EEC2,SharedMem_ReadDword_this,SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldLoginState_0x1EEC0,LoginUI_ShowMessage |
| 220 (0xDC) | 5539 |  |  |  |
| 221 (0xDD) | 5664 |  |  |  |
| 222 (0xDE) | 48,4419 | 0x20000 |  |  |
| 223 (0xDF) | 5540 |  |  |  |
| 224 (0xE0) | 5542 | 0x20000 |  |  |
| 225 (0xE1) | 5543,30985 | 0x400000 |  | SharedMem_ReadDword_this |
| 226 (0xE2) | 5544 | 0x400000 |  |  |
| 227 (0xE3) | 4421 | 0x400000 | 49 | Sound_PlayAtPosition |
| 228 (0xE4) | 5545,5681 | 0x400000 |  | PlayerStats_GetStatValue |
| 229 (0xE5) | 5546 |  |  |  |
| 230 (0xE6) | 4422 |  |  |  |
| 231 (0xE7) |  |  |  | SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldLoginState_0x1EEC0,SharedMem_WriteDword_0x77,SharedMem_WriteDword_0x78,LoginUI_ShowMessage |
| 232 (0xE8) | 5550 |  |  |  |
| 233 (0xE9) | 5551 |  |  |  |
| 234 (0xEA) | 5552 |  |  |  |
| 235 (0xEB) | 5553 |  |  |  |
| 236 (0xEC) | 4425 |  |  |  |
| 237 (0xED) | 5554 |  |  |  |
| 238 (0xEE) | 5556 |  |  |  |
| 239 (0xEF) | 4426 |  |  |  |
| 240 (0xF0) | 5557 |  |  |  |
| 241 (0xF1) | 5559,18030,18031,18032,18033 | 0x8000000 |  |  |
| 242 (0xF2) | 4427 |  |  |  |
| 243 (0xF3) | 5560 |  |  |  |
| 244 (0xF4) | 4428 |  |  |  |
| 245 (0xF5) | 5561 |  |  |  |
| 246 (0xF6) | 4429 |  |  |  |
| 247 (0xF7) | 5562 |  |  |  |
| 248 (0xF8) | 4430 |  |  |  |
| 249 (0xF9) | 5563 |  |  |  |
| 250 (0xFA) | 51,4431 | 0x8000000 |  |  |
| 251 (0xFB) | 5564 |  |  |  |
| 252 (0xFC) | 5565 |  |  |  |
| 253 (0xFD) | 5566 |  |  |  |
| 254 (0xFE) | 5567 |  |  |  |
| 255 (0xFF) |  |  |  |  |
| 256 (0x100) | 5568 |  |  |  |
| 257 (0x101) | 5447 | 2048 |  |  |
| 258 (0x102) | 4433 | 2048 |  |  |
| 259 (0x103) | 5570 |  |  |  |
| 260 (0x104) | 5571 |  |  |  |
| 261 (0x105) | 5572 | 0x40000 | 53 |  |
| 262 (0x106) | 5573 |  |  |  |
| 263 (0x107) | 5574 | 0x40000 | 53 |  |
| 264 (0x108) | 5581 |  |  |  |
| 265 (0x109) |  |  |  | SharedMem_ReadBool_std,LoginField_QueueUpdate,GameStateMgr_EnterPausedState |
| 266 (0x10A) | 4464 |  |  |  |
| 267 (0x10B) | 4465 |  |  |  |
| 268 (0x10C) | 4436 |  |  |  |
| 269 (0x10D) |  |  |  | SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldInst_0x1EEC2,SharedMem_WriteWorldLoginState_0x1EEC0,LoginUI_ShowMessage |
| 270 (0x10E) |  |  |  | SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldInst_0x1EEC2,SharedMem_WriteWorldLoginState_0x1EEC0,SharedMem_WriteDword_0x77,SharedMem_WriteDword_0x78,LoginUI_ShowMessage |
| 271 (0x10F) | 2000 |  |  |  |
| 272 (0x110) |  | 2048 | 55 |  |
| 273 (0x111) | 5586 |  |  |  |
| 274 (0x112) | 5588 |  |  |  |
| 275 (0x113) | 5587 |  |  |  |
| 276 (0x114) |  |  |  |  |
| 277 (0x115) | 4444 | 2048 | 56 |  |
| 278 (0x116) | 4445 |  |  |  |
| 279 (0x117) | 5590 |  |  |  |
| 280 (0x118) | 18009 |  |  |  |
| 281 (0x119) | 5663 |  |  |  |
| 282 (0x11A) | 5680 |  |  |  |
| 283 (0x11B) | 18009 |  |  |  |
| 284 (0x11C) | 5594 |  |  |  |
| 285 (0x11D) | 5596 |  |  |  |
| 286 (0x11E) | 5597 |  |  |  |
| 287 (0x11F) | 5598 | 2048 |  |  |
| 288 (0x120) | 57,4446 | 2048 |  |  |
| 289 (0x121) | 4447 |  |  |  |
| 290 (0x122) | 4488 |  |  |  |
| 291 (0x123) | 5599 |  |  |  |
| 292 (0x124) | 5617 |  |  |  |
| 293 (0x125) | 58,4448 | 2048 |  |  |
| 294 (0x126) | 4449 |  |  |  |
| 295 (0x127) | 5601 |  |  |  |
| 296 (0x128) | 5682 | 0x2000 |  |  |
| 297 (0x129) | 5602 | 0x2000 | 59 |  |
| 298 (0x12A) | 5603 | 4096 |  |  |
| 299 (0x12B) | 4450 |  |  |  |
| 300 (0x12C) | 5634,5635 |  |  |  |
| 301 (0x12D) | 24,4471,4472 | 4096 |  |  |
| 302 (0x12E) |  |  |  | FactionPerks_ActivatePerk |
| 303 (0x12F) |  |  | 64 | HudNotify_ShowArrestMessage |
| 304 (0x130) | 5604 |  |  |  |
| 305 (0x131) | 5605 |  |  |  |
| 306 (0x132) | 4453 |  | 62 |  |
| 307 (0x133) | 4454 |  |  |  |
| 308 (0x134) | 5606 |  |  |  |
| 309 (0x135) | 5607 |  |  |  |
| 310 (0x136) | 4455 |  | 62 |  |
| 311 (0x137) | 4456 |  |  |  |
| 312 (0x138) | 5608 |  |  |  |
| 313 (0x139) | 5619 |  |  |  |
| 314 (0x13A) | 4457 |  |  |  |
| 315 (0x13B) | 4458 |  |  |  |
| 316 (0x13C) | 4459 |  |  |  |
| 317 (0x13D) | 62,4460 |  |  |  |
| 318 (0x13E) |  |  | 62 |  |
| 319 (0x13F) |  |  | 62 | CWindowArmory_AddLoadout |
| 320 (0x140) | 5609 |  |  |  |
| 321 (0x141) | 5610 | 0x10000000 |  |  |
| 322 (0x142) | 5614 | 1024 |  |  |
| 324 (0x144) | 5618 | 1024 |  |  |
| 325 (0x145) |  |  | 0 | CharacterSelectUI_SetupDisplay |
| 326 (0x146) | 5624 | 8 |  |  |
| 327 (0x147) | 5625 | 8 |  |  |
| 328 (0x148) | 5626 | 8 |  |  |
| 329 (0x149) | 5627 | 8 |  |  |
| 330 (0x14A) | 5628 | 8 |  |  |
| 331 (0x14B) | 5657 | 8 |  |  |
| 332 (0x14C) |  |  |  |  |
| 333 (0x14D) |  |  |  |  |
| 334 (0x14E) | 5629 | 2048 |  |  |
| 335 (0x14F) | 4470 | 2048 |  |  |
| 336 (0x150) | 5631 | 2048 |  |  |
| 337 (0x151) | 5637 | 2048 |  |  |
| 338 (0x152) | 5647 | 2048 |  |  |
| 339 (0x153) |  |  | 72 | UIWidget_SetSelectionState,GameStateMgr_EnterPausedState |
| 340 (0x154) | 5640 |  |  |  |
| 341 (0x155) | 5641 |  |  |  |
| 342 (0x156) | 4474 |  |  |  |
| 343 (0x157) | 4475 |  |  |  |
| 344 (0x158) | 5644 |  |  |  |
| 345 (0x159) | 4476 | 2048 |  |  |
| 346 (0x15A) | 5646 | 2048 |  |  |
| 347 (0x15B) | 5648 | 2048 |  |  |
| 348 (0x15C) | 5649 | 2048 |  |  |
| 349 (0x15D) |  |  |  | SharedMem_WriteString11224 |
| 350 (0x15E) | 5654 | 0x8000000 |  |  |
| 351 (0x15F) | 4477 | 0x8000000 |  |  |
| 352 (0x160) | 4478 |  |  |  |
| 353 (0x161) |  |  | 77 | UIWidget_SetLabelText |
| 354 (0x162) |  |  | 77 | UIWidget_ResetLabel |
| 355 (0x163) |  |  | 64 | HudNotify_ShowPPChangeMessage |
| 356 (0x164) | 5669 | 4096 |  |  |
| 357 (0x165) | 5670 | 4096 |  |  |
| 358 (0x166) | 4482 | 4096 |  |  |
| 359 (0x167) | 5671 | 4096 |  |  |
| 360 (0x168) | 4483 | 4096 |  |  |
| 361 (0x169) | 5672 | 4096 |  |  |
| 362 (0x16A) | 4484 | 4096 |  |  |
| 363 (0x16B) | 5673 | 4096 |  |  |
| 364 (0x16C) | 5674 | 4096 |  |  |
| 365 (0x16D) | 5675 | 4096 |  |  |
| 366 (0x16E) | 5678 | 4096 |  |  |
| 367 (0x16F) | 4485 |  |  |  |
| 368 (0x170) | 4486,4487 |  |  |  |
| 369 (0x171) | 5677 |  |  |  |
| 370 (0x172) |  |  |  |  |
| 371 (0x173) | 5683 |  |  |  |
| 372 (0x174) | 5684 |  |  |  |
| 373 (0x175) | 5685 |  |  |  |
| 374 (0x176) | 5686 |  |  |  |
| 375 (0x177) |  |  |  | SkillList_ResetState |

### Packet_ID_6B SubId Map (resolved strings, CRes_strings.csv lang_id=0)
| SubId | StrId(s) | StringText(s) | Category | LTFlag(s) | WindowId(s) | Calls |
|---|---|---|---|---|---|---|
| 1 (0x1) | 5585 | Hack Detected! | UI/System |  |  | Network_OnConnectionLost |
| 2 (0x2) |  |  | UI/System |  |  | Player_OnDeath |
| 3 (0x3) | 5316 | Failed: Using this item requires a full biocell in your inventory! | UI Message |  |  |  |
| 4 (0x4) | 15 |  | UI/System |  |  | SharedMem_WriteFlag_0x94 |
| 5 (0x5) | 5340 | Failed to change character! Item not found! | UI Message |  |  |  |
| 6 (0x6) | 4321 | Weapon reloaded. | Faction |  |  | Player_HasFaction,Player_CheckSpawnState |
| 7 (0x7) | 5336 | Reload failed! | UI Message | 0x1000000 |  |  |
| 8 (0x8) | 1850 | Error: Failed to merge the two items! | UI Message |  |  |  |
| 9 (0x9) | 5341,5342,5343,5344 | Error: Failed to change name! | Error: That name is taken! | Error: You do not have a name change interface! | Error: You must be the leader of a faction to use this item! | UI Message |  |  |  |
| 10 (0xA) | 1846 | Mail sent successfully. | Login | 0x4000 |  | SharedMem_ReadAndCallFunc,WriteLoginDataToFile |
| 11 (0xB) | 1847 | Could not deliver mail! User not found! |  |  |  |  |
| 12 (0xC) | 1848 | Could not deliver mail! |  |  |  |  |
| 13 (0xD) | 1899 | This mail could not be sent, as the target has blocked you! |  | 0x4000 |  |  |
| 14 (0xE) |  |  |  | 0x4000000 |  |  |
| 15 (0xF) | 1849 | Error: Failed to move the item to the new position! | Audio | 1 |  | Sound_PlayAtPosition |
| 16 (0x10) |  |  | UI/System |  |  | Action_SendPickupPacket |
| 18 (0x12) |  |  | UI/System |  |  | EncVar_WriteStatGroup5 |
| 19 (0x13) | 5347 | Failed to transmit chat message! | UI Message |  |  |  |
| 20 (0x14) | 5515 | Error: The target is not an accepted friend! You can only send private messages to accepted friends. | UI Message |  |  |  |
| 21 (0x15) | 5514 | Error: The target is not online! | UI Message |  |  |  |
| 22 (0x16) | 5348 | Error: Player could not be removed from your friend list! | UI Message |  |  |  |
| 23 (0x17) | 4324 | The player has been removed from your friend list. |  |  |  |  |
| 24 (0x18) | 5349 | Error: Player could not be added to your friend list! | UI Message |  |  |  |
| 25 (0x19) | 4323 | The player has been added to your friend list. | UI/System |  | 17 | UIWidget_InvokeVirtual5 |
| 26 (0x1A) | 5615 | Error: Player could not be removed from your block list! | UI Message |  |  |  |
| 27 (0x1B) | 4461 | The player has been removed from your block list! |  |  |  |  |
| 28 (0x1C) | 5616 | Error: Player could not be added to your block list! | UI Message |  |  |  |
| 29 (0x1D) | 4462 | The player has been added to your block list! | Inventory |  | 18 | InventoryMgr_InvokeCommand5 |
| 30 (0x1E) | 5355 | Item transfer failed! | UI Message |  |  |  |
| 31 (0x1F) | 4326,4463 | The items have been successfully transported! If you do not move them to proper storage within %1!u! minutes, they will be deleted! | The items have been successfully transported! | UI Message | 64 | 19 |  |
| 32 (0x20) | 5356 | Item transfer failed: There is not enough space left in your storage at this destination (only %1!u! left)! | UI Message |  |  |  |
| 33 (0x21) | 5352 | You don't have enough credits left! |  | 64,2 |  |  |
| 34 (0x22) | 5361 | Item transfer failed: Recipient is unknown! | UI Message |  |  |  |
| 35 (0x23) | 5362 | Item transfer failed: Recipient has not enough space left in storage (only %1!u! left)! | UI Message | 64 |  |  |
| 36 (0x24) | 4328 | The items have been successfully transferred to the recipient. | UI Message | 64 | 19 | Data_SerializeHelper |
| 37 (0x25) |  |  |  |  |  |  |
| 38 (0x26) | 5363 | Items can only be transferred to other players on worlds that have a storage world service! |  |  |  |  |
| 39 (0x27) | 5430 | Error: Failed to start production! | UI Message | 16 |  |  |
| 40 (0x28) | 5431 | Error: You do not have enough space left in your transport storage to start this production! Items on the market and currently in-production are included in this limitataion! | UI Message | 16 |  |  |
| 41 (0x29) | 5364 | Error: Schematic does not have enough uses for this quantity! | UI Message | 16 |  |  |
| 42 (0x2A) | 5365 | Error: You do not have enough funds for this production! | UI Message | 16 |  |  |
| 43 (0x2B) | 5366 | Error: You do not have the ingredients for this production! | UI Message | 16 |  |  |
| 44 (0x2C) | 5367 | Successfully created production task! | Inventory | 16 | 21 | HandlePacket_ID_6B_SubId44_InventoryUiRefresh |
| 45 (0x2D) | 5428 | Error: Maximum number of concurrent processes reached! Please wait until a process finishes! | UI Message | 16 |  |  |
| 46 (0x2E) | 5377 | There has been a market error (%1!u!). Please try again later! | UI Message |  |  |  |
| 47 (0x2F) | 5357 | Error: Buying the item failed! | UI Message |  |  |  |
| 48 (0x30) | 5370 | The market offer could not be posted! | Market |  |  |  |
| 49 (0x31) | 5371 | Failed! Free accounts are limited to 200 items offered on the market for sale. You can upgrade your account to a premium account to lift this limitation. | Market |  |  |  |
| 50 (0x32) | 5468 | Error: Your duration is invalid. | UI Message |  |  |  |
| 51 (0x33) | 5466 | Failed! You do not have enough coins to do this! | UI Message |  |  |  |
| 52 (0x34) | 5467 | Failed! You do not have enough credits to do this! | UI Message |  |  |  |
| 53 (0x35) | 5372 | You can't offer the same item twice on the market! | Market |  |  |  |
| 54 (0x36) | 5621 | Error: Items of this class cannot be sold on this world! | UI Message |  |  |  |
| 55 (0x37) | 4330 | Market offer created successfully. | Market | 2 | 23,19 | MarketUI_RefreshInventory |
| 56 (0x38) |  |  |  |  |  |  |
| 57 (0x39) | 5369 | No market offers found for your search criteria! | Market |  |  |  |
| 58 (0x3A) | 5613 | Error: There is not enough space left in the destination to do this! | UI Message |  |  |  |
| 59 (0x3B) | 5516 | Failed: There is not enough space left in your inventory! | UI Message |  |  |  |
| 60 (0x3C) | 4331 | Transaction successful. | Market | 2 | 22,70 | CWindowTerminalMarket_SendSearchRequest,Market_BuildSearchPacket |
| 61 (0x3D) | 5378,5379,5380,5381,5382,5383 | Your faction name must be a minimum of five characters! | Your faction name cannot begin or end with a space! | Consecutive spaces are not allowed in your faction name! | An unknown faction error has occured! | Players who are already part of a faction cannot create a faction! | The faction name chosen is already in use! | UI Message |  |  |  |
| 62 (0x3E) | 5665 | Error: You must purchase the game to found a faction! | UI Message |  |  |  |
| 63 (0x3F) | 4338 | Your faction has changed! | Character | 4096 | 24 | CharacterUI_InvokeCommand5 |
| 64 (0x40) | 4339 | Your faction has been disbanded! | Character | 4096 | 24 | CharacterUI_InvokeCommand5,SharedMem_WriteString11224,SharedMem_WriteString126546,PlayerData_ClearEquipment,SharedMem_WritePlayerFile |
| 65 (0x41) | 5385 | Failed to remove member! | Guild/Friends | 4096 |  |  |
| 66 (0x42) | 4340 | Successfully removed member! | Guild/Friends | 4096 | 24 | FriendsList_HandleSelection |
| 67 (0x43) | 5387 | Error: Player not found! | UI Message | 4096 |  |  |
| 68 (0x44) | 5388 | Error: Player is already a member of another faction! | Guild/Friends | 4096 |  |  |
| 69 (0x45) | 5402 | Error: Cannot invite blacklisted members to the faction! | Guild/Friends | 4096 |  |  |
| 70 (0x46) | 4341 | Successfully invited member! | Guild/Friends | 4096 | 24 | UI_ClearTwoTextFields |
| 71 (0x47) | 5389 | Error: Player already has a pending invitation to this faction! | UI Message | 4096 |  |  |
| 72 (0x48) | 5390 | Error: Faction does not need to be founded! | UI Message | 4096 |  |  |
| 73 (0x49) | 5391 | Error: Faction does not have enough members to be founded! | Guild/Friends | 4096 |  |  |
| 74 (0x4A) | 4342 | Faction has been successfully founded! | UI Message | 4096 |  |  |
| 75 (0x4B) | 5392 | An error has occured saving the emblem! | Guild/Friends | 4096 |  |  |
| 76 (0x4C) | 4343 | Successfully saved emblem! | Guild/Friends | 4096 | 25,24 | PlayerData_ClearEquipment,CharacterUI_SetupPaperdoll |
| 77 (0x4D) | 5393 | Error: Failed to add faction relation! | UI Message | 4096 |  |  |
| 78 (0x4E) | 5394 | Error: Target faction not found! | UI Message | 4096 |  |  |
| 79 (0x4F) | 5395 | Error: Cannot change relation with own faction! | UI Message | 4096 |  |  |
| 80 (0x50) | 4344 | Successfully added relation! | UI Message | 4096 |  |  |
| 81 (0x51) | 5396 | Error: Faction is already on the list! | UI Message | 4096 |  |  |
| 82 (0x52) | 24,4345 | Successfully changed relation! | UI Message | 4096 |  |  |
| 83 (0x53) | 4346 | Successfully changed description! | UI Message | 4096 |  |  |
| 84 (0x54) | 5397 | Error: Failed to reject application! | Guild/Friends | 4096 |  |  |
| 85 (0x55) | 5398 | Error: Failed to accept application! | Guild/Friends | 4096 |  |  |
| 86 (0x56) | 5399 | Error: Failed to delete invitation! | UI Message | 4096 |  |  |
| 87 (0x57) | 5400 | Error: Failed to accept invitation! | UI Message | 4096 |  |  |
| 88 (0x58) | 5401 | Error: Failed to reject invitation! | UI Message | 4096 |  |  |
| 89 (0x59) | 5404 | Error: You cannot apply to a faction if you are blacklisted from it! | UI Message | 4096 |  |  |
| 90 (0x5A) | 5403 | Error: Failed to create application! | Guild/Friends | 4096 |  |  |
| 91 (0x5B) | 4347 | Successfully created application! | Guild/Friends | 4096 | 24 | FriendsList_ClearSelection |
| 92 (0x5C) | 5405 | Error: Failed to delete application! | Guild/Friends | 4096 |  |  |
| 93 (0x5D) |  |  |  | 4096,0x8000 |  |  |
| 94 (0x5E) | 5520 | Error: The leader's skills do not allow for any more members to be added to the faction! | Guild/Friends | 4096 |  |  |
| 95 (0x5F) | 5521 | Error: The faction's perks do not allow for any more world services to be owned! | UI Message | 0x200000 |  |  |
| 96 (0x60) | 5658 | Error: Your faction's perks do not allow you to capture services of this type! | UI Message | 0x200000 |  |  |
| 97 (0x61) | 5408 | Error: Failed to create rank! | Guild/Friends | 4096 |  |  |
| 98 (0x62) | 5409 | Error: Failed to delete rank! | Guild/Friends | 4096 |  |  |
| 99 (0x63) | 5410 | Error: Failed to update rank! | Guild/Friends | 4096 |  |  |
| 100 (0x64) | 4348 | Successfully updated rank! | Guild/Friends | 4096 | 24 | FriendsList_ResetNetState |
| 101 (0x65) | 4349 | Successfully updated faction message! | UI Message | 4096 |  |  |
| 102 (0x66) | 5411 | Error: Failed to retrieve player details! | UI Message | 0x8000 |  |  |
| 103 (0x67) | 4350 | Successfully performed action! | UI Message | 0x8000 |  |  |
| 104 (0x68) | 4351 | Successfully moved rank! | Guild/Friends | 4096 | 24 | FriendsList_ToggleSortOrder |
| 105 (0x69) | 5412 | Error: Failed to move rank! | Guild/Friends | 4096 |  |  |
| 106 (0x6A) | 5413 | Error: Failed to create goal! | UI Message | 0x200000 |  |  |
| 107 (0x6B) | 4359 | Successfully created goal! | UI Message | 0x200000 |  |  |
| 108 (0x6C) | 4360 | Successfully deleted goal! | UI Message | 0x200000 |  |  |
| 109 (0x6D) | 5414 | Error: Failed to delete goal! | UI Message | 0x200000 |  |  |
| 110 (0x6E) | 5416 | Target already has a warrant placed upon them by your faction! | Faction | 8 | 28 | SetFlag6408 |
| 111 (0x6F) |  |  | UI/System | 8 | 28 | SetFlag6408 |
| 112 (0x70) | 5415 | Target not found! | UI/System | 8 | 28 | SetFlag6408 |
| 113 (0x71) | 4361 | Successfully created warrant! | Faction | 8 |  |  |
| 114 (0x72) | 5417 | Error: Failed to create warrant! | Faction | 8 |  |  |
| 115 (0x73) | 4362 | Successfully deleted warrant! | Guild/Friends | 8 | 24 | FriendsList_SelectById |
| 116 (0x74) | 5423 | Error: Failed to delete warrant! | Faction | 8 |  |  |
| 117 (0x75) | 5432 | Error: Failed to split container! | UI Message |  |  |  |
| 118 (0x76) |  |  |  |  |  |  |
| 119 (0x77) |  |  |  |  |  |  |
| 120 (0x78) |  |  |  |  |  |  |
| 121 (0x79) |  |  |  |  |  |  |
| 122 (0x7A) |  |  |  |  |  |  |
| 123 (0x7B) |  |  |  |  |  |  |
| 124 (0x7C) |  |  | Faction |  | 29 | FactionUI_OnCommand |
| 125 (0x7D) | 5436 | Using the item has failed! | UI Message |  |  |  |
| 126 (0x7E) | 5687 | Error: Opening this box requires a Keycard of the same color! Keycards can be purchased from the marketplace at http://www.faceofmankind.com/marketplace/store, or purchased from other players either through trades or the marketing system. | UI Message |  |  |  |
| 127 (0x7F) | 5437 | This item can be used by premium accounts only! |  |  |  |  |
| 128 (0x80) | 5445 | Error: You do not have the necessary skills to use this item! | UI Message |  |  |  |
| 129 (0x81) | 5440 | Currently there is no free slot available to use this item. You can only use 3 items at a time. |  |  |  |  |
| 130 (0x82) | 5439 | You have to wait %1!d! seconds before you can use this item! |  |  |  |  |
| 131 (0x83) | 5438 | You are already using an item of this kind! |  |  |  |  |
| 132 (0x84) |  |  |  |  |  |  |
| 133 (0x85) | 5454,5645 | Access Denied! | Error: This object is currently initializing and will be inaccessible for %1!u! second(s). | UI Message | 2048 |  |  |
| 134 (0x86) | 5589 | Access Denied: Your faction has not given you permission to use this! |  | 2048 |  |  |
| 135 (0x87) | 33,5455 | Transport | Error: Failed to edit account! | UI Message | 4096 |  |  |
| 136 (0x88) | 4368 | Successfully edited account! | Guild/Friends | 4096 | 33,24 | FriendsList_AddOrUpdateEntry |
| 137 (0x89) | 5509 | Error: Failed to change payout factor! | UI Message | 4096 |  |  |
| 138 (0x8A) |  |  | Guild/Friends | 4096 | 24 | FriendsList_RemoveEntry |
| 139 (0x8B) | 5458 | Error: Failed to find target! | UI Message | 4096 |  |  |
| 140 (0x8C) | 5459 | Error: Failed to transfer funds! | UI Message | 4096 |  |  |
| 141 (0x8D) |  |  | UI/System | 4096 | 33 | UIWidget_OnConfirmSelection |
| 142 (0x8E) | 5508 | Error: Failed to deposit faction funds! | UI Message | 4096 |  |  |
| 143 (0x8F) | 4399 | Successfully deposited faction funds! | Guild/Friends | 4096 | 24 | FriendsList_UpdateCounter |
| 144 (0x90) | 4369 | Successfully changed storage rental units! | UI Message | 32 |  |  |
| 145 (0x91) | 5462 | Error: Failed to change storage rental units! | UI Message | 32 |  |  |
| 146 (0x92) | 4370 | The owner of the '%1!s!' world service on this world has changed the relation taxes! | UI/System | 2048 | 32 | SharedMem_ReadDword_this |
| 147 (0x93) |  |  |  |  |  |  |
| 148 (0x94) |  |  |  |  |  |  |
| 149 (0x95) |  |  |  |  |  |  |
| 150 (0x96) |  |  |  | 0x2000000 | 35 |  |
| 151 (0x97) |  |  | UI/System |  | 35 | CWindowTerminalChemicalLab_StartProduction |
| 152 (0x98) |  |  |  |  | 35 |  |
| 153 (0x99) | 5482 | Error: The mission could not be created! | UI Message | 1024 |  |  |
| 154 (0x9A) | 5483 | Error: Invalid target! | UI Message |  |  |  |
| 155 (0x9B) | 5484 | Error: Invalid Mission! | UI Message | 1024 |  |  |
| 156 (0x9C) | 5485 | Error: Target not found! | UI Message | 1024 |  |  |
| 157 (0x9D) | 5486 | Error: Target is offline! | UI Message | 1024 |  |  |
| 158 (0x9E) | 5487 | Error: Target is already in a mission! | UI Message | 1024 |  |  |
| 159 (0x9F) | 4385 | Successfully invited target to mission! | UI Message | 1024 |  |  |
| 160 (0xA0) | 4386 | You have denied the invitation. |  | 1024 |  |  |
| 161 (0xA1) | 4387 | You have accepted the invitation. |  | 1024 |  |  |
| 162 (0xA2) | 5490 | Error: You cannot invite yourself! | UI Message | 1024 |  |  |
| 163 (0xA3) | 5492 | Error: You cannot edit this value. You must recreate the mission with different settings! | UI Message | 1024 |  |  |
| 164 (0xA4) | 5496 | Error: You must be the mission leader to do this! | UI Message | 1024 |  |  |
| 165 (0xA5) | 5497 | Error: Failed to disband the mission! | UI Message | 1024 |  |  |
| 166 (0xA6) | 4389 | Your mission has been disbanded! | UI/System | 1024 | 36 | SharedMem_WriteCharStateFlag |
| 167 (0xA7) | 5498 | Error: You must have at least %1!u! members to start the mission! | Guild/Friends | 1024 |  |  |
| 168 (0xA8) | 4390 | Your mission has been started! |  | 1024 | 36 |  |
| 169 (0xA9) | 4391 | Your mission has been completed! | UI/System | 1024 | 36 | SharedMem_WriteCharStateFlag,UICmd_InvokeCommand5 |
| 170 (0xAA) | 4392 | Successfully removed member! | Guild/Friends | 1024 | 36 |  |
| 171 (0xAB) | 5499 | Error: Failed to remove member! | Guild/Friends | 1024 |  |  |
| 172 (0xAC) | 5500 | You have been removed from the mission! | UI/System | 1024 | 36 | SharedMem_WriteCharStateFlag |
| 173 (0xAD) | 4393 | Successfully joined mission! | UI Message | 1024 | 36 | UICmd_InvokeCommand6,SharedMem_WriteCharStateFlag |
| 174 (0xAE) | 5501 | Error: You cannot join a mission again after you have been kicked from it! The leader must invite you! | UI Message | 1024 |  |  |
| 175 (0xAF) | 37,4394 | Buy Items | Successfully added event! | UI Message | 1024 |  |  |
| 176 (0xB0) | 36,4395 | Faction Production | Successfully filed review! | UI Message | 1024 |  |  |
| 177 (0xB1) |  |  |  |  |  |  |
| 178 (0xB2) |  |  |  |  |  |  |
| 179 (0xB3) | 4398 | The takeover battle for the %1!s! world service of %2!s! has concluded. %3!s! has control of the world service. |  |  |  |  |
| 180 (0xB4) | 5502 | Error: This goal cannot be created for a world service you own! | UI Message | 0x200000 |  |  |
| 181 (0xB5) |  |  |  | 0x200000 | 27 |  |
| 182 (0xB6) | 5503 | Error: Your faction does not have the funds to create this goal! | UI Message | 0x200000 |  |  |
| 183 (0xB7) | 5504 | Error: Your faction cannot have duplicate occupation goals! | UI Message | 0x200000 |  |  |
| 184 (0xB8) | 5506 | To create a takeover mission, you must either have a goal on the world service, or a mutual ally with a goal on the world service. |  | 1024 |  |  |
| 185 (0xB9) | 4402 | Successfully changed payout factor! | UI Message | 4096 |  |  |
| 186 (0xBA) | 5456 | Error: Failed to delete account! | UI Message | 4096 |  |  |
| 187 (0xBB) | 5511 | Error: Failed to perform rank payment! | Guild/Friends | 4096 |  |  |
| 188 (0xBC) | 5512 | Error: You do not have the funds necessary to pay this many members! %1!u! UC is required for %2!u! members! | Guild/Friends | 4096 |  |  |
| 189 (0xBD) | 5513 | Error: The select rank(s) have no members! | Guild/Friends | 4096 |  |  |
| 190 (0xBE) | 1876,1877 | This rank payment will cost a total of %1!u! UC, and will pay %2!u! member(s). Are you sure you would like to pay this? | This rank payment will cost a total of %1!u! UC, and will pay %2!u! member(s). Please note that the system account has insufficient funds, and the capital account will be used as well. Are you sure you would like to pay this? | Guild/Friends | 4096 |  |  |
| 191 (0xBF) | 4403 | Successfully paid members! | Guild/Friends | 4096 |  |  |
| 192 (0xC0) | 4404 | Successfully updated taxes! | Market | 2 | 38 | CWindowProductionRecycle_CopySkillsFromMarket |
| 193 (0xC1) | 5407 | Error: You do not have permission to perform this action! | UI Message | 2 |  |  |
| 194 (0xC2) | 5407 | Error: You do not have permission to perform this action! | UI Message |  |  |  |
| 195 (0xC3) | 5518 | Error: You do not have room in your inventory! | UI Message |  |  |  |
| 196 (0xC4) |  |  | UI/System |  |  | SharedMem_WriteString126546 |
| 197 (0xC5) |  |  |  |  |  |  |
| 198 (0xC6) | 5524 | Error: Failed to deploy item! | UI Message |  |  |  |
| 199 (0xC7) | 4406 | Successfully deployed item! | UI Message |  |  |  |
| 200 (0xC8) | 5454 | Access Denied! |  |  |  |  |
| 201 (0xC9) | 5595 | Error: You do not have enough inventory space! | UI Message |  |  |  |
| 202 (0xCA) | 4407 | Successfully picked up item! | UI Message | 8 |  |  |
| 203 (0xCB) | 4469 | Successfully removed item! | UI Message | 8 | 41 |  |
| 204 (0xCC) | 41,42,43,68,5454 | Finish | Transfer | Cancel | Edit | Access Denied! |  | 8 |  |  |
| 205 (0xCD) | 41,42,43,68,79,4408,4409 | Finish | Transfer | Cancel | Edit | Recharge Mining Tool | Successfully changed object! | Healing stopped! | UI Message | 8 |  |  |
| 206 (0xCE) | 5442,5525 | Healing is not required. | Error: No world service within range! | UI Message |  |  |  |
| 207 (0xCF) | 4409 | Healing stopped! |  | 8 | 42 |  |
| 208 (0xD0) | 5530 | Error: Failed to repair item! | UI Message |  |  |  |
| 209 (0xD1) | 5532,5666,5667,50000 | Error: Failed to recycle item! | Error: Safezones have a maximum of %1!u! UC from raw materials per day! Upgrade to a Premium account to enjoy an increased maximum of %2!u! UC! | Error: Safezones have a maximum of %1!u! UC from raw materials per day! | UI Message | 8 |  |  |
| 210 (0xD2) | 46,4416 | Exit | Successfully purchased apartment! | UI Message | 0x20000 |  |  |
| 211 (0xD3) | 5533 | Error: Failed to purchase apartment! | UI Message |  |  |  |
| 212 (0xD4) | 5650 | Error: You have reached the maximum number of apartments you may purchase! Please delete or transfer an apartment to purchase another! | UI Message |  |  |  |
| 213 (0xD5) | 5651 | Error: You have reached the maximum number of apartments you may purchase! Please upgrade to a premium account to purchase another! | UI Message |  |  |  |
| 214 (0xD6) | 5534,5535 | Error: The apartment ID you have entered is invalid! | Error: The apartment entrance code you have entered is incorrect! | UI Message |  |  |  |
| 215 (0xD7) |  |  | Login | 0x20000 |  | SharedMem_WriteDword_0x77,SharedMem_WriteDword_0x78,LoginUI_ShowMessage |
| 216 (0xD8) | 5536 | Error: Failed to get apartment information! | UI Message |  |  |  |
| 217 (0xD9) | 5537 | You do not have access to this information! |  |  |  |  |
| 218 (0xDA) | 4417 | Successfully applied changes! | Faction | 0x20000 | 48 | CWindowFactionMgmt_CopyEditedToState |
| 219 (0xDB) | 4418 | The apartment you are in has been deleted! | Login | 0x20000 |  | SharedMem_ReadBool_std,SharedMem_ResetAuctionState,SharedMem_WriteWorldInst_0x1EEC2,SharedMem_ReadDword_this,SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldLoginState_0x1EEC0,LoginUI_ShowMessage |
| 220 (0xDC) | 5539 | Error: Invalid recipient entered! | UI Message |  |  |  |
| 221 (0xDD) | 5664 | Error: You must remove bound items from your safe before transferring the apartment! | UI Message |  |  |  |
| 222 (0xDE) | 48,4419 | Close | Successfully transfered apartment ownership! | UI Message | 0x20000 |  |  |
| 223 (0xDF) | 5540 | Error: Cannot transfer apartment to yourself! | UI Message |  |  |  |
| 224 (0xE0) | 5542 | Error: The specified faction does not exist! | UI Message | 0x20000 |  |  |
| 225 (0xE1) | 5543,30985 | You must have a valid %1!s! in your inventory to use the Vortex Gate! | Vortex Ticket | UI/System | 0x400000 |  | SharedMem_ReadDword_this |
| 226 (0xE2) | 5544 | Error: Cannot use Vortex Gate, target world is offline! | UI Message | 0x400000 |  |  |
| 227 (0xE3) | 4421 | Successfully purchased vortex ticket! | Audio | 0x400000 | 49 | Sound_PlayAtPosition |
| 228 (0xE4) | 5545,5681 | Error: Failed to purchase vortex ticket! | Error: As a prisoner you may only access %1!s!! | UI Message | 0x400000 |  | PlayerStats_GetStatValue |
| 229 (0xE5) | 5546 | Error: Failed to scan target! | UI Message |  |  |  |
| 230 (0xE6) | 4422 | Successfully obtained apartment identification! | UI Message |  |  |  |
| 231 (0xE7) |  |  | Login |  |  | SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldLoginState_0x1EEC0,SharedMem_WriteDword_0x77,SharedMem_WriteDword_0x78,LoginUI_ShowMessage |
| 232 (0xE8) | 5550 | Error: You have already created the maximum number of bounties! To place another bounty, please delete an existing one! | UI Message |  |  |  |
| 233 (0xE9) | 5551 | Error: You do not have enough credits to create this bounty! | UI Message |  |  |  |
| 234 (0xEA) | 5552 | Error: The target you have entered does not exist! | UI Message |  |  |  |
| 235 (0xEB) | 5553 | Error: Failed to create bounty! | UI Message |  |  |  |
| 236 (0xEC) | 4425 | Successfully created bounty! | UI Message |  |  |  |
| 237 (0xED) | 5554 | Error: You cannot place a bounty on yourself! | UI Message |  |  |  |
| 238 (0xEE) | 5556 | Error: Failed to delete bounty! | UI Message |  |  |  |
| 239 (0xEF) | 4426 | Successfully deleted bounty! | UI Message |  |  |  |
| 240 (0xF0) | 5557 | Error: Failed to apply for bounty! | UI Message |  |  |  |
| 241 (0xF1) | 5559,18030,18031,18032,18033 | Error: You have applied to the maximum number of bounties! | Bounty Collection | Advanced Tracking | Contractual Efficiency | License To Kill | UI Message | 0x8000000 |  |  |
| 242 (0xF2) | 4427 | Successfully applied for bounty! | UI Message |  |  |  |
| 243 (0xF3) | 5560 | Error: Failed to approve hunter! | UI Message |  |  |  |
| 244 (0xF4) | 4428 | Successfully approved hunter! | UI Message |  |  |  |
| 245 (0xF5) | 5561 | Error: Failed to reject hunter! | UI Message |  |  |  |
| 246 (0xF6) | 4429 | Successfully rejected hunter! | UI Message |  |  |  |
| 247 (0xF7) | 5562 | Error: Failed to abandon bounty! | UI Message |  |  |  |
| 248 (0xF8) | 4430 | Successfully abandoned bounty! | UI Message |  |  |  |
| 249 (0xF9) | 5563 | Error: Failed to rate hunter! | UI Message |  |  |  |
| 250 (0xFA) | 51,4431 | Produce | Successfully rated hunter! | UI Message | 0x8000000 |  |  |
| 251 (0xFB) | 5564 | Error: Failed to arrest target! | UI Message |  |  |  |
| 252 (0xFC) | 5565 | Error: The arrest target is invalid! | UI Message |  |  |  |
| 253 (0xFD) | 5566 | Error: The target does not have any penalty points and cannot be arrested! | UI Message |  |  |  |
| 254 (0xFE) | 5567 | Error: Your faction must own a prison world service to arrest citizens! | UI Message |  |  |  |
| 255 (0xFF) |  |  |  |  |  |  |
| 256 (0x100) | 5568 | Error: Your faction's prison is full and cannot hold more prisoners! | UI Message |  |  |  |
| 257 (0x101) | 5447 | Error: Failed to open terminal! | UI Message | 2048 |  |  |
| 258 (0x102) | 4433 | You have successfully unloaded your Mineral Rocks and %1!u! PP has been removed! | UI Message | 2048 |  |  |
| 259 (0x103) | 5570 | Error: An unknown trade error has occured! | UI Message |  |  |  |
| 260 (0x104) | 5571 | Error: Failed to move items! They do not have enough items in their inventory for this! | UI Message |  |  |  |
| 261 (0x105) | 5572 | Error: Failed to complete trade! The number of items traded cannot exceed the available inventory space! | UI Message | 0x40000 | 53 |  |
| 262 (0x106) | 5573 | Error: Failed to move Items! | UI Message |  |  |  |
| 263 (0x107) | 5574 | Error: You do not have the amount of credits you want to trade! | UI Message | 0x40000 | 53 |  |
| 264 (0x108) | 5581 | Error: Target is unknown or offline! | UI Message |  |  |  |
| 265 (0x109) |  |  | Login |  |  | SharedMem_ReadBool_std,LoginField_QueueUpdate,GameStateMgr_EnterPausedState |
| 266 (0x10A) | 4464 | The player has been kicked from the game! |  |  |  |  |
| 267 (0x10B) | 4465 | The player has been kicked from the game and banned! |  |  |  |  |
| 268 (0x10C) | 4436 | Target is currently logged in at: %1!s! |  |  |  |  |
| 269 (0x10D) |  |  | Login |  |  | SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldInst_0x1EEC2,SharedMem_WriteWorldLoginState_0x1EEC0,LoginUI_ShowMessage |
| 270 (0x10E) |  |  | Login |  |  | SharedMem_WriteWorldId_0x1EEC1,SharedMem_WriteWorldInst_0x1EEC2,SharedMem_WriteWorldLoginState_0x1EEC0,SharedMem_WriteDword_0x77,SharedMem_WriteDword_0x78,LoginUI_ShowMessage |
| 271 (0x10F) | 2000 |  |  |  |  |  |
| 272 (0x110) |  |  |  | 2048 | 55 |  |
| 273 (0x111) | 5586 | Error: You do not have enough credits! | UI Message |  |  |  |
| 274 (0x112) | 5588 | Error: This territory object cannot be used as there is no owner! | UI Message |  |  |  |
| 275 (0x113) | 5587 | Error: The owning faction does not have enough funds to supply this territory object! | UI Message |  |  |  |
| 276 (0x114) |  |  |  |  |  |  |
| 277 (0x115) | 4444 | Successfully set transfer target! | UI Message | 2048 | 56 |  |
| 278 (0x116) | 4445 | %1!s! has rolled two dice and landed on %2!u! and %3!u! |  |  |  |  |
| 279 (0x117) | 5590 | You must wait %1!u! seconds to roll the dice again. |  |  |  |  |
| 280 (0x118) | 18009 | Drilling Operations |  |  |  |  |
| 281 (0x119) | 5663 | Error: You cannot deploy aliens on this world! | UI Message |  |  |  |
| 282 (0x11A) | 5680 | Error: This world must have a World Market service to deploy objects of this type! | UI Message |  |  |  |
| 283 (0x11B) | 18009 | Drilling Operations |  |  |  |  |
| 284 (0x11C) | 5594 | Error: You cannot place any more mining rigs! | UI Message |  |  |  |
| 285 (0x11D) | 5596 | Error: Enemies cannot be spawned on this world! | UI Message |  |  |  |
| 286 (0x11E) | 5597 | Error: Player is not a prisoner! | UI Message |  |  |  |
| 287 (0x11F) | 5598 | Error: You do not have enough credits to do this! | UI Message | 2048 |  |  |
| 288 (0x120) | 57,4446 | Next | Successully paid the target's bail! | UI Message | 2048 |  |  |
| 289 (0x121) | 4447 | You are now free to leave the prison! |  |  |  |  |
| 290 (0x122) | 4488 | You have escaped from prison! |  |  |  |  |
| 291 (0x123) | 5599 | Error: Prisoners cannot trade! | UI Message |  |  |  |
| 292 (0x124) | 5617 | Error: Cannot trade players that have blocked you! | UI Message |  |  |  |
| 293 (0x125) | 58,4448 | Start Search | Successfully freed the target from prison! | UI Message | 2048 |  |  |
| 294 (0x126) | 4449 | You have escaped from prison! |  |  |  |  |
| 295 (0x127) | 5601 | Error: You must have a valid target to search! | UI Message |  |  |  |
| 296 (0x128) | 5682 | Error: Target is offline! | UI Message | 0x2000 |  |  |
| 297 (0x129) | 5602 | Failed to locate target! | UI Message | 0x2000 | 59 |  |
| 298 (0x12A) | 5603 | Error: Failed to unlock perk! | UI Message | 4096 |  |  |
| 299 (0x12B) | 4450 | Successfully unlocked faction perk! | UI Message |  |  |  |
| 300 (0x12C) | 5634,5635 | Error: Failed to activate perk! | Error: Failed to deactivate perk! | UI Message |  |  |  |
| 301 (0x12D) | 24,4471,4472 | Successfully activated perk! | Successfully deactivated perk! | UI Message | 4096 |  |  |
| 302 (0x12E) |  |  | Faction |  |  | FactionPerks_ActivatePerk |
| 303 (0x12F) |  |  | UI/System |  | 64 | HudNotify_ShowArrestMessage |
| 304 (0x130) | 5604 | Error: An NPC error has occured! | UI Message |  |  |  |
| 305 (0x131) | 5605 | Error: Cannot edit published NPCs! | UI Message |  |  |  |
| 306 (0x132) | 4453 | Successfully created NPC! | UI Message |  | 62 |  |
| 307 (0x133) | 4454 | Successfully edited NPC! | UI Message |  |  |  |
| 308 (0x134) | 5606 | Error: Cannot add any more NPCs to the world! | UI Message |  |  |  |
| 309 (0x135) | 5607 | Error: Cannot create any more objectives! | UI Message |  |  |  |
| 310 (0x136) | 4455 | Successfully created NPC objective! | UI Message |  | 62 |  |
| 311 (0x137) | 4456 | Successfully edited NPC objective! | UI Message |  |  |  |
| 312 (0x138) | 5608 | Error: Cannot modify NPCs that are not on the same world! | UI Message |  |  |  |
| 313 (0x139) | 5619 | Error: Cannot edit NPCs that are locked to the last editor! | UI Message |  |  |  |
| 314 (0x13A) | 4457 | Successfully deleted NPC and all related objectives! | UI Message |  |  |  |
| 315 (0x13B) | 4458 | Successfully deleted objective! | UI Message |  |  |  |
| 316 (0x13C) | 4459 | Successfully changed NPC status | UI Message |  |  |  |
| 317 (0x13D) | 62,4460 | Promote | Successfully changed objective status | UI Message |  |  |  |
| 318 (0x13E) |  |  |  |  | 62 |  |
| 319 (0x13F) |  |  | UI/System |  | 62 | CWindowArmory_AddLoadout |
| 320 (0x140) | 5609 | Error: Cannot find objective! | UI Message |  |  |  |
| 321 (0x141) | 5610 | Error: You have accepted the maximum number of objectives! | UI Message | 0x10000000 |  |  |
| 322 (0x142) | 5614 | Error: Players of a different faction cannot join missions which reward faction credits! | UI Message | 1024 |  |  |
| 324 (0x144) | 5618 | Error: Mission is full! | UI Message | 1024 |  |  |
| 325 (0x145) |  |  | Character |  | 0 | CharacterSelectUI_SetupDisplay |
| 326 (0x146) | 5624 | Error: Items of this type must be deployed in a capturable territory! | UI Message | 8 |  |  |
| 327 (0x147) | 5625 | Error: Items of this type can only be deployed in territory owned by your faction! | UI Message | 8 |  |  |
| 328 (0x148) | 5626 | Error: You must be in a faction and have the correct rank permission to deploy items of this type! | Guild/Friends | 8 |  |  |
| 329 (0x149) | 5627 | Error: This territory is unowned! | UI Message | 8 |  |  |
| 330 (0x14A) | 5628 | Error: Items of this type cannot be deployed in territory that is already owned! | UI Message | 8 |  |  |
| 331 (0x14B) | 5657 | Error: Your faction's perks do not allow you to capture more territory on this world! | UI Message | 8 |  |  |
| 332 (0x14C) |  |  |  |  |  |  |
| 333 (0x14D) |  |  |  |  |  |  |
| 334 (0x14E) | 5629 | Error: This territory is not generating enough electricity to power this object and it is offline! | UI Message | 2048 |  |  |
| 335 (0x14F) | 4470 | Successfully updated information! | UI Message | 2048 |  |  |
| 336 (0x150) | 5631 | Error: You do not have permission to do this! | UI Message | 2048 |  |  |
| 337 (0x151) | 5637 | Error: Your faction does not own enough territory on this world to deploy more objects! | UI Message | 2048 |  |  |
| 338 (0x152) | 5647 | Error: Cannot deploy objects in a territory that has been locked down! | UI Message | 2048 |  |  |
| 339 (0x153) |  |  | UI/System |  | 72 | UIWidget_SetSelectionState,GameStateMgr_EnterPausedState |
| 340 (0x154) | 5640 | Error: Cannot create faction on an offline player! | UI Message |  |  |  |
| 341 (0x155) | 5641 | Your access to help chat has been revoked for %1!u! hour(s)! | UI Message |  |  |  |
| 342 (0x156) | 4474 | Your access to help-chat has been restored! | UI Message |  |  |  |
| 343 (0x157) | 4475 | Successfully set player's help mute status! | UI Message |  |  |  |
| 344 (0x158) | 5644 | Error: You must wait %1!u! second(s) before sending another message in help chat! | UI Message |  |  |  |
| 345 (0x159) | 4476 | Successfully locked object down! | UI Message | 2048 |  |  |
| 346 (0x15A) | 5646 | Error: Failed to lock object down! | UI Message | 2048 |  |  |
| 347 (0x15B) | 5648 | Error: This territory is currently locked down and cannot be accessed until %1!s!! | UI Message | 2048 |  |  |
| 348 (0x15C) | 5649 | Error: Your faction does not have enough credits to lock this territory down! | UI Message | 2048 |  |  |
| 349 (0x15D) |  |  | UI/System |  |  | SharedMem_WriteString11224 |
| 350 (0x15E) | 5654 | Error: Failed to register murder! | UI Message | 0x8000000 |  |  |
| 351 (0x15F) | 4477 | %1!s! has been given %2!u! PP for this murder! |  | 0x8000000 |  |  |
| 352 (0x160) | 4478 | %1!s! has called for backup at %2!s! - %3!s!! |  |  |  |  |
| 353 (0x161) |  |  | UI/System |  | 77 | UIWidget_SetLabelText |
| 354 (0x162) |  |  | UI/System |  | 77 | UIWidget_ResetLabel |
| 355 (0x163) |  |  | UI/System |  | 64 | HudNotify_ShowPPChangeMessage |
| 356 (0x164) | 5669 | Error: Failed to create department! | UI Message | 4096 |  |  |
| 357 (0x165) | 5670 | Error: Failed to delete department! | UI Message | 4096 |  |  |
| 358 (0x166) | 4482 | You have successfully added a player to the department! | UI Message | 4096 |  |  |
| 359 (0x167) | 5671 | Error: Failed to add member to department! | Guild/Friends | 4096 |  |  |
| 360 (0x168) | 4483 | You have successfully removed a player from the department! | UI Message | 4096 |  |  |
| 361 (0x169) | 5672 | Error: Failed to remove member from department! | Guild/Friends | 4096 |  |  |
| 362 (0x16A) | 4484 | You have successfully set a new department leader! | UI Message | 4096 |  |  |
| 363 (0x16B) | 5673 | Error: Failed to set member to department leader! | Guild/Friends | 4096 |  |  |
| 364 (0x16C) | 5674 | Error: Failed to find player! | UI Message | 4096 |  |  |
| 365 (0x16D) | 5675 | Error: Players of different factions cannot be added to departments! | UI Message | 4096 |  |  |
| 366 (0x16E) | 5678 | Error: This player is already in a department! | UI Message | 4096 |  |  |
| 367 (0x16F) | 4485 | Your department has been disbanded! |  |  |  |  |
| 368 (0x170) | 4486,4487 | You have been added to a department! | You have been removed from your department! |  |  |  |  |
| 369 (0x171) | 5677 | Error: An error has occurred | UI Message |  |  |  |
| 370 (0x172) |  |  |  |  |  |  |
| 371 (0x173) | 5683 | Error: Turret is initializing! It will become active in %1!u! seconds! | UI Message |  |  |  |
| 372 (0x174) | 5684 | Error: This location is too close to another turret of the same type! | UI Message |  |  |  |
| 373 (0x175) | 5685 | Error: Turret is offline due to insufficient electricity! | UI Message |  |  |  |
| 374 (0x176) | 5686 | Error: You cannot place more than 3 personal turrets per world! | UI Message |  |  |  |
| 375 (0x177) |  |  | UI/System |  |  | SkillList_ResetState |

### Code (Packet_ID_NOTIFY_107 subId helpers)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101A0D70 | 0x001A0D70 | Action_SendPickupPacket | Sends pickup packet; used by subId 0x10 | decomp (user) | med |
| 0x1018C480 | 0x0018C480 | EncVar_WriteStatGroup5 | Writes StatGroup 5 value; used by subId 0x12 | decomp (user) | low |
| 0x1018AD10 | 0x0018AD10 | SharedMem_WriteString11224 | Writes SharedMem string; used by subId 0x15D | decomp (user) | low |
| 0x1018AD30 | 0x0018AD30 | SharedMem_WriteString126546 | Writes SharedMem string; used by subId 0x40 | decomp (user) | low |
| 0x100EF500 | 0x000EF500 | UIWidget_SetSelectionState | Updates selection state (window id 72); subId 0x153 | decomp (user) | low |
| 0x100EFBC0 | 0x000EFBC0 | UIWidget_InvokeVirtual5 | Invokes widget virtual #5 (window id 17); subId 0x19 | decomp (user) | low |
| 0x100F0640 | 0x000F0640 | UIWidget_SetLabelText | Sets label text (window id 77); subId 0x161 | decomp (user) | low |
| 0x100F0A90 | 0x000F0A90 | UIWidget_ResetLabel | Resets label (window id 77); subId 0x162 | decomp (user) | low |
| 0x100D5B50 | 0x000D5B50 | CharacterUI_InvokeCommand5 | Invokes character UI cmd #5 (window id 24); subId 0x3F/0x40 | decomp (user) | low |
| 0x100D5510 | 0x000D5510 | UI_ClearTwoTextFields | Clears two UI text fields; subId 0x46 | decomp (user) | low |
| 0x100DDB90 | 0x000DDB90 | CharacterUI_SetupPaperdoll | Refreshes character paperdoll; subId 0x4C | decomp (user) | low |
| 0x100E1430 | 0x000E1430 | FriendsList_HandleSelection | Friends UI selection handler; subId 0x42 | decomp (user) | low |
| 0x100E04F0 | 0x000E04F0 | FriendsList_ClearSelection | Clears friends selection; subId 0x5B | decomp (user) | low |
| 0x100E1410 | 0x000E1410 | FriendsList_ResetNetState | Resets friends net state; subId 0x64 | decomp (user) | low |
| 0x100E0080 | 0x000E0080 | FriendsList_ToggleSortOrder | Toggles friends sort order; subId 0x68 | decomp (user) | low |
| 0x100E0570 | 0x000E0570 | FriendsList_SelectById | Selects friend by id; subId 0x73 | decomp (user) | low |
| 0x100D60B0 | 0x000D60B0 | SharedMem_WritePlayerFile | Writes playerfile blob to SharedMem; subId 0x40 | decomp (user) | low |
| 0x100ACD80 | 0x000ACD80 | InventoryMgr_InvokeCommand5 | Invokes inventory mgr cmd #5 (window id 18); subId 0x1D | decomp (user) | low |
| 0x10132E50 | 0x00132E50 | HudNotify_ShowPPChangeMessage | Shows PP change HUD message (window id 64); subId 0x163 | decomp (user) | med |
| 0x1005A570 | 0x0005A570 | GameStateMgr_EnterPausedState | Enter paused state (window id 72); subId 0x153 | decomp (user) | low |
| 0x100357B0 | 0x000357B0 | Player_HasFaction | Checks player faction; subId 0x6 | decomp (user) | low |
| 0x101C21B0 | 0x001C21B0 | Player_CheckSpawnState | Checks spawn state; subId 0x6 | decomp (user) | low |
| 0x1000C580 | 0x0000C580 | PlayerData_ClearEquipment | Clears equipment block; subId 0x40 | decomp (user) | low |
| 0x100C0880 | 0x000C0880 | SharedMem_WriteFlag_0x94 | Clears flag 0x94; subId 0x4 | decomp (user) | low |
| 0x100C1470 | 0x000C1470 | WriteLoginDataToFile | Writes login data to .fml file; subId 0xA | decomp (user) | low |
| 0x10169130 | 0x00169130 | Data_SerializeHelper | Serializes window data (window id 19); subId 0x1F/0x24 | decomp (user) | low |
| 0x1016B5F0 | 0x0016B5F0 | MarketUI_RefreshInventory | Refreshes market inventory UI (window id 19); subId 0x37 | decomp (user) | low |
| 0x10150540 | 0x00150540 | CWindowTerminalMarket_SendSearchRequest | Sends terminal market search; subId 0x3C | decomp (user) | low |
| 0x10173320 | 0x00173320 | Market_BuildSearchPacket | Builds market search packet; subId 0x3C | decomp (user) | low |
| 0x10121760 | 0x00121760 | SetFlag6408 | Sets flag at offset 0x6408; subId 0x6E/0x6F/0x70 | decomp (user) | low |
| 0x101413E0 | 0x001413E0 | FactionUI_OnCommand | Faction UI command dispatch (window id 29); subId 0x7C | decomp (user) | low |

### Data (login packet globals)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102BFDA8 | 0x002BFDA8 | vtbl_Packet_ID_NOTIFY_107 | Vtable for Packet_ID_NOTIFY_107_* funcs | vtable xref | low |
| 0x102BFD98 | 0x002BFD98 | vtbl_Packet_Unknown0 | Prior vtable used during Packet_ID_NOTIFY_107_Init | decomp (user) | low |
| 0x1035AA4C | 0x0035AA4C | g_LTClient | LTClient interface used for packet serialization/send; observed vtbl+0x28=SendPacket, vtbl+0x18=ConnectToWorld(SystemAddress*), vtbl+0x08=IsConnected? | xrefs | low |

### Data (world tables)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102E2178 | 0x002E2178 | g_ApartmentWorldTable | 6-dword/entry table indexed by apartmentId (SharedMem[0x78], 1..24); entry[0]=folder name; entry[1]=interface\\hqs\\NN.pcx; used by WorldLogin_LoadApartmentWorld | decomp + strings | high |
| 0x102E2980 | 0x002E2980 | g_WorldTable | 15-dword/entry table; entry[0]=folder name (NY_Manhattan, tokyo, apartments, etc), entry[1]=display name (NYC - Manhattan, etc); used by WorldLogin_StateMachineTick for \"worlds\\\\<folder>\" | py_eval + strings | high |

### Data (system address constants)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x103C0F50 | 0x003C0F50 | g_SystemAddress_Unassigned | 6-byte SystemAddress sentinel (all 0xFF) used as ?unassigned? | bytes + xrefs | high |
| 0x103C0DE8 | 0x003C0DE8 | g_SystemAddress_Unassigned2 | Duplicate unassigned sentinel (all 0xFF); used in WorldLoginReturn_HandleAddress | bytes + xrefs | high |

### Code (items/inventory + handlers)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10190D70 | 0x00190D70 | CNetworkMgrClient_HandlePacket_ID_MOVE_ITEMS | Handles move-items packet; deep inventory mutation | string + decomp | high |
| 0x1018F110 | 0x0018F110 | HandlePacket_ID_USE_ITEM | Use-item packet handling (ID -92) | dispatch + decomp | high |
| 0x10199A40 | 0x00199A40 | ClientShell_OnMessage_DispatchPacketId | CShell packet-id switch (signed char); dispatches 0x6B -> Packet_ID_NOTIFY_107_DispatchSubId; handles login IDs 0x6D/0x6F/0x70/0x73 plus inventory/world packets | decomp | high |
| 0x1018E1F0 | 0x0018E1F0 | HandlePacket_ID_LOGIN_REQUEST_RETURN | Login request-return handler (packet ID 0x6D) | dispatch + decomp | high |
| 0x1018DCE0 | 0x0018DCE0 | Packet_ID_LOGIN_REQUEST_RETURN_Read | Login response parse (u8 status + session_str via LTClient) | disasm | high |

| 0x10196900 | 0x00196900 | HandlePacket_ID_LOGIN_RETURN | Login return handler (packet ID 0x6F); drives UI + world select flow | decomp | high |

| 0x101935F0 | 0x001935F0 | Packet_ID_LOGIN_RETURN_Read | Parses ID_LOGIN_RETURN per Docs/Packets/ID_LOGIN_RETURN.md | decomp | high |

| 0x10196400 | 0x00196400 | Packet_ID_LOGIN_RETURN_Write | Serializes ID_LOGIN_RETURN (client rarely uses) | disasm | low |

| 0x1008A890 | 0x0008A890 | VariableSizedPacket_WriteString | Writes string (len bytes) to packet bitstream; used by ID_LOGIN_TOKEN_CHECK | disasm | med |

| 0x1008A950 | 0x0008A950 | VariableSizedPacket_ReadString | Reads string (len bytes) from packet bitstream; used by ID_LOGIN_TOKEN_CHECK | disasm | med |

| 0x1008AA10 | 0x0008AA10 | Packet_ID_LOGIN_TOKEN_CHECK_Read | Parses ID_LOGIN_TOKEN_CHECK (flag + token/username) | decomp | med |

| 0x1008AAA0 | 0x0008AAA0 | Packet_ID_LOGIN_TOKEN_CHECK_Write | Writes ID_LOGIN_TOKEN_CHECK (flag + token/username) | decomp | med |
| 0x1018DA20 | 0x0018DA20 | HandlePacket_ID_LOGIN_TOKEN_CHECK | Login token check handler (packet ID 0x70); reads flag + token/username and updates Login UI | decomp | low |

| 0x1008B6D0 | 0x0008B6D0 | LoginUI_Update_SendLoginTokenCheck | Login UI update; sends ID_LOGIN_TOKEN_CHECK using LoginToken string (requestToken) | decomp | med |
| 0x1018E340 | 0x0018E340 | HandlePacket_ID_WORLD_LOGIN_RETURN_73 | World login return handler (packet ID 0x73) | dispatch + decomp | high |
| 0x1018DDA0 | 0x0018DDA0 | Packet_ID_WORLD_LOGIN_RETURN_Read | World login return parse (u8 code/u8 flag/u32 worldIp/u16 worldPort) | disasm | high |
| 0x10038B10 | 0x00038B10 | CGameClientShell_OnMessage | IClientShell vtbl+0x58; dispatches MSG_ID (u8) to subsystems (0x6A,0x6B,0x6C,0x6E,0x6F,0x70,0x76,0x77,0x7E,0x81,0x83,0x84,0x85,0x86,0x88,0x8C,0x8E,0x8F,0x9A,0x9B,0x9D); routes packet-id switch via ClientShell_OnMessage_DispatchPacketId | decomp | med |
| 0x10037E70 | 0x00037E70 | CGameClientShell_OnMessage2 | IClientShell vtbl+0x14; dispatches MSG_ID stream (0x68,0x6A,0x75 sub?id 0..4) and routes to UI/gameplay handlers | decomp | med |
| 0x101C0D60 | 0x001C0D60 | WorldLoginReturn_HandleAddress | Validates world addr; calls g_LTClient->Connect; sets 0x1EEC0=2 | decomp + disasm | high |
| 0x10199270 | 0x00199270 | HandlePacket_ID_WORLD_SELECT_7B | Packet ID 0x7B; validates playerId; subId=4 sets SharedMem[0x1EEC1/0x1EEC2]=worldId/inst + 0x1EEC0=1 (LoginUI msg 0x0B); subId=6 routes payload to UI handler | disasm | high |
| 0x101064C0 | 0x001064C0 | Packet_ID_7B_Ctor | Packet ID = 0x7B; initializes payload blocks | disasm | med |
| 0x10106590 | 0x00106590 | Packet_ID_7B_Read | Parses 0x7B (u32c playerId + u8c type + type payload) | disasm | med |
| 0x10105D80 | 0x00105D80 | Packet_ID_WORLD_SELECT_Write | Writes 0x7B (u32c playerId + u8c subId + subId payload) | decomp | med |
| 0x101063B0 | 0x001063B0 | Packet_ID_7B_Dtor | Frees 0x7B payload buffers; BitStream_FreeOwnedBuffer | disasm | low |
| 0x10106470 | 0x00106470 | Packet_ID_7B_Sub6List_Init | Initializes subId=6 list header at +0x460 | disasm | low |
| 0x10177A40 | 0x00177A40 | WorldSelect_HandleSubId6Payload | SubId=6 handler; applies parsed +0x460 payload to UI (window id 0x31) | disasm | med |
| 0x10176FC0 | 0x00176FC0 | CWindowWorldSelect_Ctor | World select UI ctor; inits sub6 list + state | decomp | med |
| 0x10177260 | 0x00177260 | CWindowWorldSelect_Dtor | World select UI dtor | disasm | low |
| 0x10177290 | 0x00177290 | CWindowWorldSelect_OnCommand | World select UI command handler; sends 0x7B subId=5/7 | decomp | high |
| 0x10177D50 | 0x00177D50 | WorldSelect_GetBaseCostByClass | Maps classId (from world list entry) -> base cost {5000,10000,15000,20000,25000} | disasm | low |
| 0x1026F2E0 | 0x0026F2E0 | Packet_ID_7B_ReadSubId6List | SubId=6 payload parser for 0x7B (fills list @+0x460) | disasm | med |
| 0x10181A00 | 0x00181A00 | HandlePacket_ID_7D_WriteSharedMem_0x2BD0 | Packet ID 0x7D; reads u32c and writes SharedMem block 0x2BD0 (12 bytes) | decomp | low |
| 0x10164D40 | 0x00164D40 | HandlePacket_ID_6B_SubId44_InventoryUiRefresh | Packet 0x6B subId=44; updates inventory/production UI slots + tooltips | dispatch + decomp | med |
| 0x102404E0 | 0x002404E0 | ItemList_Read | Type=2 payload for 0x7B; reads item list | decomp | med |
| 0x101056B0 | 0x001056B0 | SystemAddress_Copy | Copies 6-byte SystemAddress (ip+port) | decomp | low |
| 0x101CA5D0 | 0x001CA5D0 | SystemAddress_SetUnassigned | Sets SystemAddress to 0xFFFFFFFFFFFF (unassigned) | decomp + bytes | low |
| 0x1018C570 | 0x0018C570 | WorldLoginReturn_ScheduleRetry | Schedules retry (SharedMem 0x1EEC0=1 + time) | decomp | med |
| 0x1018C320 | 0x0018C320 | Packet_ID_WORLD_LOGIN_RETURN_Ctor | Packet ID = 0x73; initializes worldAddr to unassigned; code=0, flag=0xFF | decomp | med |
| 0x1018D9C0 | 0x0018D9C0 | LTClient_SendPacket_BuildIfNeeded | If packet already built (a1[3]) or packet->Serialize() succeeds, calls g_LTClient vtbl+0x28 to send | decomp | med |
| 0x101C0E10 | 0x001C0E10 | WorldLogin_StateMachineTick | Drives world login state (0x1EEC0=1 send 0x72 -> 2 wait connect -> 3 load world); builds/sends 0x72 | decomp | high |
| 0x1008C310 | 0x0008C310 | SharedMem_WriteWorldLoginState_0x1EEC0 | Writes world login state (SharedMem 0x1EEC0) | decomp | low |
| 0x1005AE30 | 0x0005AE30 | WorldLogin_LoadWorldFromPath | Loads world from path + display name; writes SharedMem[19]=path; uses g_pILTClient vtbl+0x144 | decomp | med |
| 0x101C0340 | 0x001C0340 | WorldLogin_LoadApartmentWorld | If SharedMem[0x54] and apartmentId in SharedMem[0x78] (1..24), loads \"worlds\\\\apartments\\\\<name>\" via g_ApartmentWorldTable | decomp + strings | high |
| 0x1008C2B0 | 0x0008C2B0 | SharedMem_WriteDword_0x78 | Writes dword to SharedMem index 0x78 (apartment world selection) | decomp | low |
| 0x1008C2F0 | 0x0008C2F0 | SharedMem_WriteWorldId_0x1EEC1 | Writes worldId to SharedMem index 0x1EEC1 | decomp | low |
| 0x10122920 | 0x00122920 | SharedMem_WriteWorldInst_0x1EEC2 | Writes worldInst (u8) to SharedMem index 0x1EEC2 | disasm | low |
| 0x101BFEA0 | 0x001BFEA0 | SharedMem_ReadApartmentIndex_0x78 | Reads apartment index (SharedMem 0x78) | disasm | low |
| 0x101BFF60 | 0x001BFF60 | SharedMem_ReadWorldInst_0x1EEC2 | Reads world instance (SharedMem 0x1EEC2) | disasm | low |
| 0x101BFF70 | 0x001BFF70 | SharedMem_ReadWorldId_0x1EEC1 | Reads worldId (SharedMem 0x1EEC1) | disasm | low |
| 0x1008C670 | 0x0008C670 | WorldSelect_ApplyApartmentInfo | Writes SharedMem[0x77]/[0x78] from selection struct (dword + u8) and updates timer | decomp | med |
| 0x101A3550 | 0x001A3550 | Packet_ID_NOTIFY_107_DispatchSubId | Packet_ID_NOTIFY_107 (ID 0x6B) sub-id switch; subId 44 inventory UI refresh; subId 231/270 force worldId=4 (apartments) + set SharedMem[0x77]/[0x78], subId 269 sets worldId from field | decomp + disasm | high |
| 0x10089460 | 0x00089460 | LoginUI_SetMessageText | Sets login UI message text by string id + color; throttled by time | decomp | med |
| 0x1008BB60 | 0x0008BB60 | UiWidget_GetSlot | Returns widget pointer from UI array slot (0..3) | decomp | low |
| 0x101BFE00 | 0x001BFE00 | Packet_ID_WORLD_LOGIN_Ctor | Packet ID = 0x72 (WORLD_LOGIN) | disasm | high |
| 0x101C0980 | 0x001C0980 | Packet_ID_WORLD_LOGIN_Read | Parses 0x72 (u8/u8/u32c/u32c) | disasm | med |
| 0x101C09F0 | 0x001C09F0 | Packet_ID_WORLD_LOGIN_Write | Writes 0x72 (u8/u8/u32c/u32c) | disasm | med |
| 0x10190B90 | 0x00190B90 | HandlePacket_ID_ITEMS_CHANGED | Handler for Packet_ID_ITEMS_CHANGED (ID -126) | dispatch + decomp | high |
| 0x10192D40 | 0x00192D40 | HandlePacket_ID_ITEMS_REMOVED | Handler for Packet_ID_ITEMS_REMOVED (ID -127) | dispatch + decomp | high |
| 0x10197030 | 0x00197030 | HandlePacket_ID_ITEMS_ADDED | Handler for Packet_ID_ITEMS_ADDED (ID -109) | dispatch + decomp | high |
| 0x1018EA20 | 0x0018EA20 | HandlePacket_ID_UNLOAD_WEAPON | Handler for Packet_ID_UNLOAD_WEAPON (ID -113) | dispatch + decomp | med |
| 0x1018EC20 | 0x0018EC20 | HandlePacket_ID_MERGE_ITEMS | Handler for Packet_ID_MERGE_ITEMS (ID -112) | dispatch + decomp | high |
| 0x1018E550 | 0x0018E550 | HandlePacket_ID_ITEM_REMOVED | Handler for Packet_ID_ITEM_REMOVED (ID -120) | dispatch + decomp | high |
| 0x1018EF60 | 0x0018EF60 | HandlePacket_ID_SPLIT_CONTAINER | Handler for Packet_ID_SPLIT_CONTAINER (ID -94) | dispatch + decomp | high |
| 0x1018FD60 | 0x0018FD60 | HandlePacket_ID_REPAIR_ITEM | Handler for Packet_ID_REPAIR_ITEM (ID -83) | dispatch + decomp | high |
| 0x1018FFC0 | 0x0018FFC0 | HandlePacket_ID_RECYCLE_ITEM | Handler for Packet_ID_RECYCLE_ITEM (ID -82) | dispatch + decomp | high |
| 0x1018E8F0 | 0x0018E8F0 | HandlePacket_ID_NAME_CHANGE | Handler for Packet_ID_NAME_CHANGE (ID -114) | dispatch + decomp | med |
| 0x10196CE0 | 0x00196CE0 | HandlePacket_ID_BACKPACK_CONTENTS | Handler for Packet_ID_BACKPACK_CONTENTS (ID -110) | dispatch + decomp | med |
| 0x10193740 | 0x00193740 | HandlePacket_ID_MAIL | Handler for Packet_ID_MAIL (ID -116) | dispatch + decomp | med |
| 0x1013DE40 | 0x0013DE40 | CWindowSendMail_OnCommand | Send?mail UI handler; validates recipient/subject/body then builds + sends Packet_ID_MAIL | decomp | med |
| 0x10182CC0 | 0x00182CC0 | HandlePacket_ID_FRIENDS | Handler for Packet_ID_FRIENDS (ID -105) | dispatch + decomp | med |
| 0x10197F90 | 0x00197F90 | HandlePacket_ID_STORAGE | Handler for Packet_ID_STORAGE (ID -103) | dispatch + decomp | med |
| 0x10195DA0 | 0x00195DA0 | HandlePacket_ID_MINING | Handler for Packet_ID_MINING (ID -102) | dispatch + decomp | med |
| 0x10195A00 | 0x00195A00 | HandlePacket_ID_PRODUCTION | Handler for Packet_ID_PRODUCTION (ID -101) | dispatch + decomp | med |
| 0x10195AF0 | 0x00195AF0 | HandlePacket_ID_MARKET | Handler for Packet_ID_MARKET (ID -100) | dispatch + decomp | med |
| 0x101993B0 | 0x001993B0 | HandlePacket_ID_FACTION | Handler for Packet_ID_FACTION (ID -99) | dispatch + decomp | med |
| 0x10198F30 | 0x00198F30 | HandlePacket_ID_PLAYERFILE | Handler for Packet_ID_PLAYERFILE (ID -97) | dispatch + decomp | med |
| 0x101931E0 | 0x001931E0 | HandlePacket_ID_SKILLS | Handler for Packet_ID_SKILLS (ID -93) | dispatch + decomp | med |
| 0x10197580 | 0x00197580 | HandlePacket_ID_A5 | Handler for Packet_ID_A5 (ID -91; name TBD) | dispatch + disasm | med |
| 0x1018F480 | 0x0018F480 | HandlePacket_ID_A6 | Handler for Packet_ID_A6 (ID -90; name TBD) | dispatch + disasm | med |
| 0x10192690 | 0x00192690 | HandlePacket_ID_A8 | Handler for Packet_ID_A8 (ID -88; name TBD) | dispatch + disasm | med |
| 0x10199050 | 0x00199050 | HandlePacket_ID_A9 | Handler for Packet_ID_A9 (ID -87; name TBD) | dispatch + disasm | med |
| 0x10198840 | 0x00198840 | HandlePacket_ID_PLAYER2PLAYER | Handler for Packet_ID_PLAYER2PLAYER (ID -86) | dispatch + disasm + RTTI | med |
| 0x10195EE0 | 0x00195EE0 | HandlePacket_ID_AC | Handler for Packet_ID_AC (ID -84; name TBD) | dispatch + disasm | med |
| 0x101994B0 | 0x001994B0 | HandlePacket_ID_AF | Handler for Packet_ID_AF (ID -81; name TBD) | dispatch + disasm | med |
| 0x101996D0 | 0x001996D0 | HandlePacket_ID_B0 | Handler for Packet_ID_B0 (ID -80; name TBD) | dispatch + disasm | med |
| 0x10198D70 | 0x00198D70 | HandlePacket_ID_B1 | Handler for Packet_ID_B1 (ID -79; name TBD) | dispatch + disasm | med |
| 0x101901F0 | 0x001901F0 | HandlePacket_ID_B2 | Handler for Packet_ID_B2 (ID -78; name TBD) | dispatch + disasm | med |
| 0x10199820 | 0x00199820 | HandlePacket_ID_B5 | Handler for Packet_ID_B5 (ID -75; name TBD) | dispatch + disasm | med |
| 0x101981F0 | 0x001981F0 | HandlePacket_ID_B6 | Handler for Packet_ID_B6 (ID -74; name TBD) | dispatch + disasm | med |
| 0x10003760 | 0x00003760 | MapItemId_ToAssets | Maps item id -> model/skin assets | decomp + strings | high |
| 0x101281D0 | 0x001281D0 | BuildItemPreview_FromItemId | Builds item preview using MapItemId_ToAssets | xrefs + decomp | med |
| 0x101A0900 | 0x001A0900 | SendPacket_WEAPONFIRE | Builds Packet_ID_WEAPONFIRE and sends to server | decomp | high |
| 0x101A0680 | 0x001A0680 | Packet_ID_WEAPONFIRE_read | Packet_ID_WEAPONFIRE read (vtable) | decomp | med |
| 0x101A06D0 | 0x001A06D0 | Packet_ID_WEAPONFIRE_write | Packet_ID_WEAPONFIRE write (vtable) | disasm | med |
| 0x101C5350 | 0x001C5350 | SendPacket_RELOAD | Builds Packet_ID_RELOAD and sends to server | decomp | high |
| 0x101C5BA0 | 0x001C5BA0 | SendPacket_RELOAD_Alt | Alternate reload send path | decomp | med |
| 0x101A27A0 | 0x001A27A0 | SendPacket_UPDATE | Builds Packet_ID_UPDATE and sends WeaponFireEntry list | disasm | high |
| 0x1018D9C0 | 0x0018D9C0 | LTClient_SendPacket_BuildIfNeeded | Sends packet via LTClient vtbl+0x28; builds packet if needed | decomp | med |
| 0x1019F570 | 0x0019F570 | Packet_ID_UPDATE_read | Packet_ID_UPDATE read (vtable) | decomp | med |
| 0x101A0630 | 0x001A0630 | Packet_ID_UPDATE_write | Packet_ID_UPDATE write (vtable) | decomp | med |
| 0x101A1440 | 0x001A1440 | WeaponFireEntry_write | Writes WeaponFireEntry by type into bitstream | decomp | med |

### Code (admin/debug utilities + item list)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10039A80 | 0x00039A80 | Cmd_Admin | Handles "admin" command; `itemlist` writes ItemList.txt from runtime item table | decomp | high |
| 0x10246140 | 0x00246140 | FormatString_Args | Formats string with varargs (used by itemlist output) | decomp | med |
| 0x10246080 | 0x00246080 | FormatString | Variadic format into std::string (wrapper around FormatString_Args helpers) | decomp | med |
| 0x10241A10 | 0x00241A10 | String_AssignFromPtr | std::string assign helper | decomp | low |
| 0x10241530 | 0x00241530 | String_FromU16 | Converts u16 to string (item id formatting) | decomp | low |
| 0x102415C0 | 0x002415C0 | String_FromU8 | Converts u8 to string | decomp | low |
| 0x102414A0 | 0x002414A0 | String_FromU32 | Converts u32 to string | decomp | low |
| 0x101A14C0 | 0x001A14C0 | WeaponFireEntry_add | Adds entry to list; cap 10 | disasm | med |
| 0x101A2390 | 0x001A2390 | WeaponFireEntry_build_from_state | Builds entry from game state | decomp | med |
| 0x101A21A0 | 0x001A21A0 | WeaponFireEntry_pick_list_entry | Builds candidate list from RB-tree + filters, picks random id | decomp | med |
| 0x101A1310 | 0x001A1310 | WeaponFireEntry_type1_write | Type1 payload writer | decomp | med |
| 0x101A00B0 | 0x001A00B0 | WeaponFireEntry_type2_write | Type2 payload writer | decomp | med |
| 0x101A0360 | 0x001A0360 | WeaponFireEntry_type3_write | Type3 payload writer | decomp | med |
| 0x101A04D0 | 0x001A04D0 | WeaponFireEntry_type4_write | Type4 payload writer | decomp | med |
| 0x1010C330 | 0x0010C330 | BuildItemTooltip | Builds item tooltip text from runtime ItemStructA fields + template lookup | disasm | high |
| 0x101093A0 | 0x001093A0 | Item_GetDurabilityPercent | Computes durability% from ItemStructA (+0x0A) and ItemTemplate_GetMaxDurability | disasm | high |
| 0x101676F0 | 0x001676F0 | Item_CalcRepairCosts | Computes repair costs from ItemStructA durability (outputs 2 values); used by repair UI | decomp | med |
| 0x101676B0 | 0x001676B0 | RoundFloatToInt | Rounds float to nearest int (?0.5) | decomp | low |
| 0x10109330 | 0x00109330 | Item_GetAmmoItemIdOrTemplate | Returns ammo item id (runtime override or template) | disasm | high |
| 0x1024C940 | 0x0024C940 | ItemTemplate_CopyVariantByIndex | Copies 0x5C variant record by index from template | decomp | high |
| 0x1024C7B0 | 0x0024C7B0 | ItemVariantList_CopyByItemId | Copies per-item variant list (92-byte entries) from global table | decomp | low |
| 0x1024C5A0 | 0x0024C5A0 | VariantList_Assign | Assigns/copies 92-byte entries from another list | decomp | low |
| 0x1024C410 | 0x0024C410 | ByteVector_Insert | Vector insert for byte buffer (memmove + realloc) | decomp | low |
| 0x10247DF0 | 0x00247DF0 | FormatDuration_MinSec | Formats seconds to ?Xm? when divisible by 60 | decomp | high |
| 0x102330C0 | 0x002330C0 | ItemTemplate_GetAmmoItemId | Returns ammo item id from template (word @+0x30) | decomp | high |
| 0x10232300 | 0x00232300 | ItemTemplate_GetMaxDurability | Returns max durability by hardcoded item-id rules (not template field) | decomp | high |
| 0x1026F900 | 0x0026F900 | ItemId_GetDisplayName | Resolves item display name from id | disasm | med |

### Code (packet read helpers: B5/B6)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101273D0 | 0x001273D0 | Packet_ID_B5_read | Packet_ID_B5 read/parse entry point (type switch) | decomp | high |
| 0x101272E0 | 0x001272E0 | Packet_ID_B5_read_list | Reads list of Packet_ID_B5_read_entry | decomp | med |
| 0x100FF8D0 | 0x000FF8D0 | Packet_ID_B5_read_entry | Packet_ID_B5 complex entry (bitfields + nested lists) | decomp | med |
| 0x100FF800 | 0x000FF800 | Packet_ID_B5_read_entry_list | Reads list of Packet_ID_B5_read_entry2 | decomp | med |
| 0x100FD880 | 0x000FD880 | Packet_ID_B5_read_entry2 | Packet_ID_B5 nested entry (large) | decomp | med |
| 0x100FCA80 | 0x000FCA80 | Packet_ID_B5_read_entry2_subA | Packet_ID_B5 entry2 sub-struct (u8/u16/u32 + 2048 bits) | decomp | med |
| 0x100FD370 | 0x000FD370 | Packet_ID_B5_read_entry2_map | Packet_ID_B5 entry2 map (u32 key + 2048-bit string) | decomp | med |
| 0x100FD1A0 | 0x000FD1A0 | Packet_ID_B5_entry2_map_get_or_insert | Map lookup/insert for entry2 map | decomp | low |
| 0x101261D0 | 0x001261D0 | Packet_ID_B5_read_extra_list | Packet_ID_B5 extra list (u32c count + entry) | decomp | med |
| 0x10125E90 | 0x00125E90 | Packet_ID_B5_read_extra_list_entry | Extra list entry (u32c + 2 bits) | decomp | low |
| 0x101491E0 | 0x001491E0 | Packet_ID_B6_read | Packet_ID_B6 read/parse entry point (type switch) | decomp | high |
| 0x10147C70 | 0x00147C70 | Packet_ID_B6_read_structA | Packet_ID_B6 struct A read | decomp | med |
| 0x10147CF0 | 0x00147CF0 | Packet_ID_B6_read_structB | Packet_ID_B6 struct B read | decomp | med |
| 0x10147A90 | 0x00147A90 | Read_6BitFlags | Reads 6 single-bit flags into consecutive bytes | disasm | med |
| 0x101487A0 | 0x001487A0 | Packet_ID_B6_read_structC | Packet_ID_B6 struct C read (list) | decomp | med |
| 0x10149050 | 0x00149050 | Packet_ID_B6_read_structD | Packet_ID_B6 struct D read (lists) | decomp | med |
| 0x10148570 | 0x00148570 | Packet_ID_B6_read_structD_entry | StructD entry read (u32 + 2048 bits + list) | decomp | med |
| 0x1026BE70 | 0x0026BE70 | Read_QuantVec3_9bit | Reads quantized vec3 + 9-bit value | disasm | med |
| 0x10272500 | 0x00272500 | Read_QuantVec3 | Reads quantized vec3 (bit-width + sign bits) | disasm | med |
| 0x10257770 | 0x00257770 | Read_BitfieldBlock_0x30 | Reads packed bitfield block (variable layout) | disasm | med |
| 0x100312C0 | 0x000312C0 | BitStream_WriteBit | Writes single bit (bitstream) | disasm | med |
| 0x101C92D0 | 0x001C92D0 | BitStream_WriteBit0 | Writes 0 bit | disasm | med |
| 0x101C9310 | 0x001C9310 | BitStream_WriteBit1 | Writes 1 bit | disasm | med |
| 0x101C96C0 | 0x001C96C0 | BitStream_WriteBits | Core bitstream WriteBits | disasm | med |
| 0x101C9810 | 0x001C9810 | BitStream_WriteBitsCompressed | Compressed integer writer | disasm | high |
| 0x10031AB0 | 0x00031AB0 | BitStream_Write_u32c | Writes compressed u32 (endian swap if Net_IsBigEndian) | decomp | high |
| 0x1000C6C0 | 0x0000C6C0 | Packet_InitBitStreamFromPayload | Init BitStream from packet payload (header byte 0x19 branch) | decomp | high |
| 0x101C8DA0 | 0x001C8DA0 | BitStream_InitFromBuffer | Init BitStream from buffer (copy/own) | decomp | high |
| 0x101C8E80 | 0x001C8E80 | BitStream_FreeOwnedBuffer | Frees owned BitStream buffer | decomp | high |
| 0x101CA120 | 0x001CA120 | Net_IsBigEndian | Endianness check | disasm | high |
| 0x101CA080 | 0x001CA080 | ByteSwapCopy | Byte swap helper | disasm | high |
| 0x10272420 | 0x00272420 | Write_QuantVec3 | Writes quantized vec3 | disasm | med |
| 0x1026BE40 | 0x0026BE40 | Write_QuantVec3_And9 | Writes quantized vec3 + 9 bits | disasm | med |
| 0x102575D0 | 0x002575D0 | Write_BitfieldBlock_0x30 | Writes packed bitfield block | disasm | med |
| 0x102575B0 | 0x002575B0 | BitfieldBlock_0x30_HasExtra | Checks block extra-flag | disasm | low |
| 0x10249E10 | 0x00249E10 | Read_Substruct_10249E10 | Small packed struct (u32/u8/u32/u8/u8/u8) | disasm | med |
| 0x102550A0 | 0x002550A0 | ItemEntryWithId_read | u32c entryId + ItemStructA_read | disasm | med |
| 0x101C9930 | 0x001C9930 | BitStream_ReadBits | Core bitstream ReadBits (bitCount + sign flag) | disasm | high |
| 0x101C9AA0 | 0x001C9AA0 | BitStream_ReadBitsCompressed | Bitstream compressed read (byte-skip/lead-flag scheme) | disasm | high |
| 0x101C9390 | 0x001C9390 | BitStream_ReadBit | Core bitstream ReadBit (1 bit) | disasm | high |

### Code (packet read helpers: mail)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1013DA40 | 0x0013DA40 | Packet_ID_MAIL_read_entry | Mail entry bitstream read (size 0x848) | decomp | med |
| 0x1013DC60 | 0x0013DC60 | Packet_ID_MAIL_entry_list_insert | Inserts mail entry into vector/list | decomp | low |
| 0x1013DCF0 | 0x0013DCF0 | Packet_ID_MAIL_entry_list_insert_unique | Inserts mail entry if not already present | decomp | low |
| 0x1013CF40 | 0x0013CF40 | Packet_ID_MAIL_entry_list_contains | Checks list for entry id match | decomp | low |
| 0x1013C970 | 0x0013C970 | Packet_ID_MAIL_entry_fill | Fills mail entry strings from UI | decomp | low |
| 0x1013D0F0 | 0x0013D0F0 | Packet_ID_MAIL_write_entry | Mail entry bitstream write | decomp | med |
| 0x1013D1E0 | 0x0013D1E0 | Packet_ID_MAIL_write_entries | Writes mail entry list (u8 count + entries) | decomp | med |
| 0x1013D250 | 0x0013D250 | Packet_ID_MAIL_write_idlist | Writes mail id list (u8 count + u32 list) | decomp | med |
| 0x1013D2E0 | 0x0013D2E0 | Packet_ID_MAIL_write | Mail packet write (entries + optional id list) | decomp | med |

### Code (packet read helpers: market/faction/playerfile)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D730 | 0x0000D730 | Playerfile_read_blockC0_entry | Playerfile blockC0 entry read (presence bit + bitfields) | disasm | med |
| 0x1000D870 | 0x0000D870 | Playerfile_read_blockC0 | Playerfile blockC0 read (u32c header + 10 entries) | disasm | med |
| 0x100A0C90 | 0x000A0C90 | Packet_ID_PLAYERFILE_read_structA | FriendEntry read for Packet_ID_PLAYERFILE | disasm | med |
| 0x1013C6F0 | 0x0013C6F0 | Packet_ID_PLAYERFILE_read | Playerfile packet main read/dispatch | decomp | med |
| 0x100AAD00 | 0x000AAD00 | Packet_ID_FACTION_read | Faction packet main read/dispatch (type switch) | decomp + disasm | high |
| 0x100A7720 | 0x000A7720 | Packet_ID_FACTION_read_blockA | Faction blockA read (strings/flags/lists) | decomp | med |
| 0x100A9D00 | 0x000A9D00 | Packet_ID_FACTION_read_listA | Faction listA read (header + structB + u32 list) | decomp | med |
| 0x100A6E70 | 0x000A6E70 | Packet_ID_A9_read_structB | listA entry read (u8+string+lists) | decomp | med |
| 0x100AAC20 | 0x000AAC20 | Packet_ID_FACTION_read_listB | Faction listB read (count + entries) | decomp | med |
| 0x100A9680 | 0x000A9680 | Packet_ID_FACTION_read_listB_entry | Faction listB entry (u8c + list of Packet_ID_A5_read_struct2) | decomp | med |
| 0x100A99F0 | 0x000A99F0 | Packet_ID_FACTION_read_listC | Faction listC read (count + entries) | decomp | med |
| 0x100A6390 | 0x000A6390 | Packet_ID_FACTION_read_listC_entry | Faction listC entry (u8c + u32c list of pairs) | decomp | med |
| 0x100A74F0 | 0x000A74F0 | Packet_ID_FACTION_read_block_107C | Faction block_107C read (u16/u16 + entries) | decomp | med |
| 0x1009F9A0 | 0x0009F9A0 | Packet_ID_FACTION_read_block_107C_entry | block_107C entry read (u32/u8/u32s + 4 strings) | decomp | med |
| 0x100A7060 | 0x000A7060 | Packet_ID_FACTION_read_block_1090 | Faction block_1090 read (u8 count + block_10A0 entries) | decomp | med |
| 0x1009EE50 | 0x0009EE50 | Packet_ID_FACTION_read_block_10A0 | block_10A0 entry read (u32/u8s + 3 strings) | decomp | med |
| 0x100A75F0 | 0x000A75F0 | Packet_ID_FACTION_read_block_1160 | Faction block_1160 read (count + block_11A4 entries) | decomp | med |
| 0x1009FDA0 | 0x0009FDA0 | Packet_ID_FACTION_read_block_11A4 | block_11A4 entry read (u32/u16/bit/u8 + strings + blockC0) | decomp | med |
| 0x1009FF90 | 0x0009FF90 | Packet_ID_FACTION_read_block_1170 | block_1170 read (bit + 3 strings + u16/u8) | decomp | med |
| 0x10252B70 | 0x00252B70 | Packet_ID_FACTION_read_block_1318 | block_1318 read (u32/u32 + list of u16/u8/bit) | decomp | med |
| 0x100A02E0 | 0x000A02E0 | Packet_ID_FACTION_read_block_1340 | block_1340 read (u32/bit/u32/u16 + 0x1E entries) | decomp | med |
| 0x100A06F0 | 0x000A06F0 | Packet_ID_FACTION_read_block_1738 | block_1738 read (u8/u32/u8s/bit + strings + u32s) | decomp | med |
| 0x100A9EB0 | 0x000A9EB0 | Packet_ID_FACTION_read_block_17BC | block_17BC read (u8 count + entry w/ block_0D50) | decomp | med |
| 0x1011AD30 | 0x0011AD30 | Packet_ID_A9_read | Packet_ID_A9 main read/dispatch (type switch) | decomp | high |
| 0x10119210 | 0x00119210 | Packet_ID_A9_read_structA | Packet_ID_A9 structA read | decomp | med |
| 0x1011A5E0 | 0x0011A5E0 | Packet_ID_A9_read_structA_list | Packet_ID_A9 structA list read | decomp | med |
| 0x101181E0 | 0x001181E0 | Packet_ID_A9_read_structC | Packet_ID_A9 structC read (4x u8) | decomp | med |
| 0x10118230 | 0x00118230 | Packet_ID_A9_read_structC2 | Packet_ID_A9 structC2 read (u8/u32/string + conditional tail) | decomp | med |
| 0x101182F0 | 0x001182F0 | Packet_ID_A9_read_structC3 | Packet_ID_A9 structC3 read (u32/strings/u32s + bit + u8) | decomp | med |
| 0x10119030 | 0x00119030 | Packet_ID_A9_read_structD | Packet_ID_A9 structD read (u32/u8/strings + sublists) | decomp | med |
| 0x10118B00 | 0x00118B00 | Packet_ID_A9_read_structD_sub_B8 | structD sublist (u32 count + structC2) | decomp | med |
| 0x10118DE0 | 0x00118DE0 | Packet_ID_A9_read_structD_sub_F8 | structD sublist (u16/u16 + u8 count + structC2) | decomp | med |
| 0x10118F50 | 0x00118F50 | Packet_ID_A9_read_structD_sub_10C | structD sublist (u32 count + structC3) | decomp | med |
| 0x1011AC50 | 0x0011AC50 | Packet_ID_A9_read_structD_list | Packet_ID_A9 structD list read | decomp | med |
| 0x100A7950 | 0x000A7950 | Packet_ID_FACTION_read_block_0D50 | Faction block_0D50 read (u16 count + FriendEntry list) | decomp | med |
| 0x100A72D0 | 0x000A72D0 | Packet_ID_FACTION_read_block_0D78 | Faction block_0D78 read (count + entries) | decomp | med |
| 0x1009F580 | 0x0009F580 | Packet_ID_FACTION_read_block_0D78_entry | block_0D78 entry read (u32/u8/strings) | decomp | med |
| 0x1009F050 | 0x0009F050 | Packet_ID_FACTION_read_block_0E08 | Faction block_0E08 read | decomp | med |
| 0x100A7350 | 0x000A7350 | Packet_ID_FACTION_read_block_0E2C | Faction block_0E2C read (count + 2x u32 + 3x string) | decomp | med |
| 0x100A71E0 | 0x000A71E0 | Packet_ID_FACTION_read_block_0E3C | Faction block_0E3C read (count + entries) | decomp | med |
| 0x1009F350 | 0x0009F350 | Packet_ID_FACTION_read_block_0E3C_entry | block_0E3C entry read (u32s/strings + optional blockC0) | decomp | med |
| 0x100A7810 | 0x000A7810 | Packet_ID_FACTION_read_block_0FD4 | Faction block_0FD4 read (count + entries) | disasm | med |
| 0x100A05E0 | 0x000A05E0 | Packet_ID_FACTION_read_block_0FD4_entry | block_0FD4 entry read (u32 + 3x string + blockC0) | disasm | med |
| 0x100A78B0 | 0x000A78B0 | Packet_ID_FACTION_read_block_1784 | Faction block_1784 read (u16/u16 + entries) | decomp | med |
| 0x100A08B0 | 0x000A08B0 | Packet_ID_FACTION_read_block_1784_entry | block_1784 entry read (u8/u32/u8/u32 + strings + u32) | decomp | med |
| 0x10251DA0 | 0x00251DA0 | Packet_ID_FACTION_read_blockA_struct_4C0 | blockA sub-struct (6x u32 + u8 list) | decomp | med |
| 0x100A7110 | 0x000A7110 | Packet_ID_FACTION_read_blockA_list_4E8 | blockA list (u32 + u8 + string) | decomp | med |
| 0x100C87E0 | 0x000C87E0 | Packet_ID_MARKET_read_structB | Market structB read (u8/u16/u32s/bit/u8s/bit) | disasm | med |
| 0x100C89A0 | 0x000C89A0 | Packet_ID_MARKET_read_structC | Market structC read (u8/u8/u16/bit/u8) | disasm | med |
| 0x100C8A10 | 0x000C8A10 | Packet_ID_MARKET_read_structC2 | Market structC2 read (u8/u8/u16/bit) | disasm | med |
| 0x100C9CE0 | 0x000C9CE0 | Packet_ID_MARKET_read_listC | Market listC read (structA + entries + string) | disasm | med |
| 0x100C9EC0 | 0x000C9EC0 | Packet_ID_MARKET_read_listB | Market listB read (ItemStructA + u32c/u16c/u32c) | disasm | med |
| 0x100CA060 | 0x000CA060 | Packet_ID_MARKET_read_block | Market block read (u16 + 5x 9-bit values) | disasm | med |
| 0x100CA150 | 0x000CA150 | Packet_ID_MARKET_read_block6 | Market block6 read (6x block) | disasm | med |
| 0x100CA180 | 0x000CA180 | Packet_ID_MARKET_read | Market packet main read/dispatch | decomp | med |
| 0x1025C7B0 | 0x0025C7B0 | Packet_ID_MARKET_read_listD | Market listD read (u16/u8/u16) | disasm | med |
| 0x1025C720 | 0x0025C720 | MarketListD_Insert | Inserts 6-byte market listD entry | decomp | low |
| 0x1025B1D0 | 0x0025B1D0 | Packet_ID_MARKET_read_listE | Market listE read (u16/u32) | disasm | med |
| 0x1025AE90 | 0x0025AE90 | U32PairList_InsertRange | Vector insert/reserve for 8-byte entries | decomp | low |
| 0x1025A990 | 0x0025A990 | U32Pair_FillN | Fills N 8-byte entries with a single entry | decomp | low |
| 0x1025B880 | 0x0025B880 | MarketFilter_MatchesItem | Applies type/id/req flags to item; returns match | decomp | low |
| 0x10267840 | 0x00267840 | Packet_ID_MARKET_read_listA | Market listA read (structA + 3x u32c) | disasm | med |

### Code (packet read helpers: skills)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10141890 | 0x00141890 | Packet_ID_SKILLS_read | Skills packet main read/dispatch | decomp | high |
| 0x1024AD30 | 0x0024AD30 | Packet_ID_SKILLS_read_list | Skills list read (header + entries) | decomp | med |
| 0x1024ACA0 | 0x0024ACA0 | Packet_ID_SKILLS_read_list_insert | Skills list insert helper | disasm | med |

### Code (packet ctors / IDs)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10090870 | 0x00090870 | Packet_ID_MOVE_ITEMS_ctor | Packet ID = -118 (0x8A) | decomp | high |
| 0x10190890 | 0x00190890 | Packet_ID_ITEMS_CHANGED_ctor | Packet ID = -126 (0x82) | decomp | high |
| 0x10192AB0 | 0x00192AB0 | Packet_ID_ITEMS_REMOVED_ctor | Packet ID = -127 (0x81) | decomp | high |
| 0x10196600 | 0x00196600 | Packet_ID_ITEMS_ADDED_ctor | Packet ID = -109 (0x93) | decomp | high |
| 0x10180740 | 0x00180740 | Packet_ID_USE_ITEM_ctor | Packet ID = -92 (0xA4) | decomp | high |
| 0x1008F500 | 0x0008F500 | Packet_ID_UNLOAD_WEAPON_ctor | Packet ID = -113 (0x8F) | decomp | high |
| 0x1018C3C0 | 0x0018C3C0 | Packet_ID_ITEM_REMOVED_ctor | Packet ID = -120 (0x88) | decomp | high |
| 0x1010A540 | 0x0010A540 | Packet_ID_MERGE_ITEMS_ctor | Packet ID = -112 (0x90) | decomp | high |
| 0x100AC5F0 | 0x000AC5F0 | Packet_ID_BACKPACK_CONTENTS_ctor | Packet ID = -110 (0x92) | decomp | high |
| 0x1019E3F0 | 0x0019E3F0 | Packet_ID_WEAPONFIRE_ctor | Packet ID = -121 (0x87) | decomp | high |
| 0x101C4AF0 | 0x001C4AF0 | Packet_ID_RELOAD_ctor | Packet ID = -111 (0x91) | decomp | high |
| 0x1013D9A0 | 0x0013D9A0 | Packet_ID_MAIL_ctor | Packet ID = -116 (0x8C) | decomp | high |
| 0x1010A6A0 | 0x0010A6A0 | Packet_ID_SPLIT_CONTAINER_ctor | Packet ID = -94 (0xA2) | decomp | high |
| 0x101677F0 | 0x001677F0 | Packet_ID_REPAIR_ITEM_ctor | Packet ID = -83 (0xAD) | decomp | high |
| 0x10166A90 | 0x00166A90 | Packet_ID_RECYCLE_ITEM_ctor | Packet ID = -82 (0xAE) | decomp | high |
| 0x101806E0 | 0x001806E0 | Packet_ID_NAME_CHANGE_ctor | Packet ID = -114 (0x8E) | decomp | high |
| 0x100AD1C0 | 0x000AD1C0 | Packet_ID_FRIENDS_ctor | Packet ID = -105 (0x97) | decomp | high |
| 0x10032740 | 0x00032740 | Packet_ID_STORAGE_ctor | Packet ID = -103 (0x99) | decomp | high |
| 0x1010F670 | 0x0010F670 | Packet_ID_MINING_ctor | Packet ID = -102 (0x9A) | decomp | high |
| 0x10163320 | 0x00163320 | Packet_ID_PRODUCTION_ctor | Packet ID = -101 (0x9B) | decomp | high |
| 0x100C7DC0 | 0x000C7DC0 | Packet_ID_MARKET_ctor | Packet ID = -100 (0x9C) | decomp | high |
| 0x1009C390 | 0x0009C390 | Packet_ID_FACTION_ctor | Packet ID = -99 (0x9D) | decomp | high |
| 0x1013C110 | 0x0013C110 | Packet_ID_PLAYERFILE_ctor | Packet ID = -97 (0x9F) | decomp | high |
| 0x10141800 | 0x00141800 | Packet_ID_SKILLS_ctor | Packet ID = -93 (0xA3) | decomp | high |
| 0x1015DE50 | 0x0015DE50 | Packet_ID_A5_ctor | Packet ID = -91 (0xA5; name TBD) | disasm | med |
| 0x100CC840 | 0x000CC840 | Packet_ID_PLAYER2PLAYER_ctor | Packet ID = -86 (0xAA) | disasm + RTTI | med |
| 0x1018C2E0 | 0x0018C2E0 | Packet_ID_LOGIN_REQUEST_RETURN_Ctor | Packet ID = 0x6D (LOGIN_REQUEST_RETURN) | disasm | high |

| 0x10196320 | 0x00196320 | Packet_ID_LOGIN_RETURN_Ctor | Packet ID = 0x6F (LOGIN_RETURN) | decomp | high |

| 0x100897E0 | 0x000897E0 | Packet_ID_LOGIN_TOKEN_CHECK_Ctor | Packet ID = 0x70 (LOGIN_TOKEN_CHECK) | disasm | med |
| 0x101BFE00 | 0x001BFE00 | Packet_ID_WORLD_LOGIN_Ctor | Packet ID = 0x72 (WORLD_LOGIN) | disasm | high |

### Packet layouts (CShell.dll)

Notes:
- Bitstream read helpers: sub_1000C990 = ReadCompressed<u32>, sub_1000C9F0 = ReadCompressed<u16>, sub_101C9AA0 = ReadCompressed<N bits>, sub_1023D7B0 = u16 count + count*u32 list, sub_102550A0 = u32 + ItemEntry.
- u64c helper: sub_100AB5D0 = ReadCompressed<u64>; sub_100AB660 = WriteCompressed<u64>.
- UI helper: CWindowMgr_GetWindowById @ 0x10107540 (id < 0x5D) => *(this + 0x30 + id*4), else 0.
- ItemEntry read helper: sub_10254F80 (details below).
- Offsets are relative to the packet object base (VariableSizedPacket-derived).

#### Bitstream encoding (exact bit order)

Bit order:
- sub_10032840 reads one bit: MSB-first within each byte (mask = 0x80 >> (bitpos & 7)).
- sub_101C9930 reads raw bits; for the last partial byte (a4=1), it right-shifts so bits are LSB-aligned.
- sub_101C96C0 writes raw bits; for partial byte (a4=1), it left-shifts so bits are written MSB-first.

Byte order / endian:
- sub_101CA120 returns true on little-endian hosts (uses htonl check).
- When true, sub_101CA080 reverses byte order for 16/32/64-bit values.
- Stream representation is big-endian byte order for multi-byte values.

Compressed integer format (sub_101C9AA0 / sub_101C9810, a4=1 unsigned):
- For each high-order byte (MSB?LSB, excluding the lowest byte):
  - Read/Write 1 control bit.
  - 1 = byte omitted (implicitly 0x00). 0 = remaining bytes are stored raw and decoding stops.
- Lowest byte:
  - Read/Write 1 control bit.
  - 1 = only low nibble stored (4 bits); high nibble implicitly 0x0.
  - 0 = full 8 bits stored.
- For signed (a4=0), the implicit byte is 0xFF and high nibble 0xF (sign-extend).

Convenience legend:
- u8c/u16c/u32c = compressed unsigned (per above).
- bits(N) = raw bitfield via sub_101C9930/sub_101C96C0 (MSB-first stream order).

#### Packet_ID_LOGIN_REQUEST_RETURN (ID 0x6D) - master->client

Read: Packet_ID_LOGIN_REQUEST_RETURN_Read @ 0x1018DCE0; handler: HandlePacket_ID_LOGIN_REQUEST_RETURN @ 0x1018E1F0.

Fields (read order):
- u8c @+0x430 (status/result via BitStream_ReadBitsCompressed).
- string @+0x431 (session_str) via LTClient string read (max 2048 bytes).

Notes:

#### Packet_ID_LOGIN_RETURN (ID 0x6F) - master->client

Read: Packet_ID_LOGIN_RETURN_Read @ 0x101935F0; handler: HandlePacket_ID_LOGIN_RETURN @ 0x10196900.

Notes:
- See Docs/Packets/ID_LOGIN_RETURN.md for full wire order + structs.
- Success/NO CHARACTER paths gate on `clientVersion` (u16) <= `0x073D`; if higher, handler shows UI msg 1720 (outdated client) and aborts the flow.

Notes:
- When fromServer=false: requestToken string (max 32). When true: success bit + username string (max 32).

#### Packet_ID_LOGIN_TOKEN_CHECK (ID 0x70) - bidirectional

Read: Packet_ID_LOGIN_TOKEN_CHECK_Read @ 0x1008AA10; handler: HandlePacket_ID_LOGIN_TOKEN_CHECK @ 0x1018DA20.

Write: Packet_ID_LOGIN_TOKEN_CHECK_Write @ 0x1008AAA0; send path: LoginUI_Update_SendLoginTokenCheck @ 0x1008B6D0 (requestToken from "LoginToken").

Fields (read order):

-- String helpers: VariableSizedPacket_ReadString @ 0x1008A950, VariableSizedPacket_WriteString @ 0x1008A890.

- bit fromServer @+0x430.
- if fromServer: bit success @+0x431; username string @+0x452 (max 32).
- else: requestToken string @+0x432 (max 32).

Handler behavior:
- If UI slot exists and flag set, calls sub_10089620(flag, buffer) -> UiText_SetValueIfChanged + LoginToken UI toggle.

Notes:
- When fromServer=false: requestToken string (max 32). When true: success bit + username string (max 32).

Login packet dependency chains (CShell.dll):
- ID 0x6D: CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_LOGIN_REQUEST_RETURN -> Packet_ID_LOGIN_REQUEST_RETURN_Read -> Packet_InitBitStreamFromPayload -> BitStream_ReadBitsCompressed + LTClient DecodeString.
- ID 0x6F: CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_LOGIN_RETURN -> Packet_ID_LOGIN_RETURN_Read -> Packet_InitBitStreamFromPayload -> ReadBitsCompressed + Read_u32c + Read_u16c + LTClient DecodeString + Read_Vector_U32c + Apartment_Read.
- ID 0x70 (recv): CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_LOGIN_TOKEN_CHECK -> Packet_ID_LOGIN_TOKEN_CHECK_Read -> Packet_InitBitStreamFromPayload -> BitStream_ReadBit_u8 + ReadString(0x20).
- ID 0x70 (send): LoginUI_Update_SendLoginTokenCheck -> Packet_ID_LOGIN_TOKEN_CHECK_Ctor -> Packet_ID_LOGIN_TOKEN_CHECK_Write -> LTClient_SendPacket_BuildIfNeeded (requestToken from "LoginToken").
- ID 0x73: CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_WORLD_LOGIN_RETURN_73 -> Packet_ID_WORLD_LOGIN_RETURN_Read -> Packet_InitBitStreamFromPayload -> ReadBitsCompressed + Read_u32c + Read_u16c.

#### Packet_ID_WORLD_LOGIN (ID 0x72) - client->world

Write: Packet_ID_WORLD_LOGIN_Write @ 0x101C09F0; send via WorldLogin_StateMachineTick @ 0x101C0E10.

Fields (write order):
- u8c @+0x430 (worldId).
- u8c @+0x431 (worldInst).
- u32c @+0x434 (playerId, from SharedMem g_pPlayerStats[0x5B]).
- u32c @+0x438 (worldConst = 0x13BC52).

State machine (SharedMem[0x1EEC0]):
- 0 -> idle.
- 1 -> send 0x72; WorldLogin_StateMachineTick sets state=2 before send.
- 2 -> wait for g_LTClient vtbl+0x08 (connected gate); when true -> state=3.
- 3 -> load world (WorldLogin_LoadWorldFromPath / WorldLogin_LoadApartmentWorld), then clears 0x1EEC0/0x1EEC1/0x1EEC2.

#### Packet_ID_WORLD_LOGIN_RETURN (ID 0x73) - world->client

Read: Packet_ID_WORLD_LOGIN_RETURN_Read @ 0x1018DDA0; handler: HandlePacket_ID_WORLD_LOGIN_RETURN_73 @ 0x1018E340.

Fields (read order):
- u8c @+0x430 (code).
- u8c @+0x431 (flag).
- u32c @+0x434 (worldIp).
- u16c @+0x438 (worldPort).

Notes:
- code==1 -> WorldLoginReturn_HandleAddress @ 0x101C0D60 (calls g_LTClient->Connect).
- WorldLoginReturn_HandleAddress rejects unassigned SystemAddress (g_SystemAddress_Unassigned2 = 0xFFFFFFFFFFFF) and shows msg 1722.
- code==8 -> WorldLoginReturn_ScheduleRetry @ 0x1018C570.
- code in {2,3,4,6,7} -> LoginUI_SetMessageText (msg ids 1723/1734/1724/1735/1739) + LoginUI_ShowMessage(5).
- code unknown -> LoginUI_SetMessageText(1722) + logs unknown return code.

Client interface calls observed:
- g_LTClient vtbl+0x18: ConnectToWorld(SystemAddress*). Called from WorldLoginReturn_HandleAddress with stack SystemAddress (worldIp+worldPort).
- g_LTClient vtbl+0x08: IsConnected? gate in WorldLogin_StateMachineTick before advancing to state=3.

#### Packet_ID_7B (ID 0x7B) - server->client (world select + other subtypes)

Read: Packet_ID_7B_Read @ 0x10106590; handler: HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270.

Fields (read order):
- u32c @+0x430 (playerId).
- u8c  @+0x434 (type).

Type-specific payload:
- type=2 -> ItemList_Read @ 0x102404E0 into +0x438.
- type=3 -> u32c @+0x45C, u8c @+0x435, u8c @+0x436.
- type=4 -> u8c @+0x435, u8c @+0x436. (worldId, worldInst)
- type=5 -> no extra (client->world list request).
- type=6 -> Packet_ID_7B_ReadSubId6List @ 0x1026F2E0 on +0x460 (list payload).
- type=7 -> u8c @+0x435, u8c @+0x436. (client->world travel request: worldId, nodeId)

Handler behavior:
- if type==4 and playerId matches g_pPlayerStats[0x5B], sets SharedMem[0x1EEC1/0x1EEC2]=worldId/inst, sets 0x1EEC0=1, shows LoginUI msg 0x0B.
- if type==6, routes +0x460 payload to WorldSelect_HandleSubId6Payload (window id 0x31).
- type==7 is parsed but ignored by CShell handler (client->world only).

SubId=6 payload (Packet_ID_7B_ReadSubId6List @ 0x1026F2E0):
- entry_count (u8c), then per-entry: u8 key, u32 mask (read then bitwise inverted), u16a, u16b, listB entry, listC entry.
- trailing 3x u32c stored at +0x10/+0x14/+0x18 of the sub6 payload struct (meta_a/meta_b/meta_c).
- entry struct size is 0x3C (60 bytes). Init/reset helpers: sub_101231B0 / sub_10123100; copy helper: sub_10176BA0.
- UI usage:
  - byte_659E2954[60 * worldId] is treated as classId (3140+ string ids, base cost tier).
  - dword_659E2970[15 * worldId] is treated as nodeCount (node list entries).

#### Packet_ID_7D (ID 0x7D) - server->client (SharedMem update)

Read/handler: HandlePacket_ID_7D_WriteSharedMem_0x2BD0 @ 0x10181A00; parse via Packet_InitBitStreamFromPayload + Read_u32c.

Behavior:
- Reads u32c into temp, reads 12-byte block from SharedMem[0x2BD0] (SharedMem_ReadBlock_std), writes back block {dword0=temp, dword1=0, dword2=1}.

Notes:
- 0x2BD0 block is consumed by an inventory/production UI update path (uses dword2 as ?dirty? flag; when set and dword1==0, it updates UI text, then clears dword2 via SharedMem2BD0_WriteBlock12).
- UI text uses SharedMem[0x2BD3] string; if dword0>0 it clears 0x2BD3 and shows string id 0x14BC; else it writes the window?s string into 0x2BD3 and shows it.

#### Packet_ID_USE_ITEM (ID -92) - server?client

Read: Packet_ID_USE_ITEM_read @ 0x10181200 (decomp); handler: 0x1018F110.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u32c @+0x434 (sub_1000C990); item lookup key in sub_1023F010/sub_1023DE50.
- bit @+0x438 (flag; direct bit read).
- u8c  @+0x439 (compressed u8; handler accepts 0x17-0x1C).

Handler behavior (HandlePacket_ID_USE_ITEM @ 0x1018F110):
- playerId must match SharedMem[0x5B], else returns early.
- itemKey resolves via sub_1023F010(list, key, itemEntry) when useItemKey=1; else via ItemsAddedPayload_FindEntryByVariantId.
- if slotIndex != 0 and in 23..28, uses sub_1018BA80(list+760, slotIndex, itemEntry) to place into slot (fails => abort).
- marks list dirty on success.
- UI message: if itemId not in {1802, 1805}, builds item name (string id itemId+30000) and displays message 4363 via sub_10180D40.

#### Packet_ID_MOVE_ITEMS (ID -118) ? server?client

Read: Packet_ID_MOVE_ITEMS_read @ 0x10090910 (decomp); handler: 0x10190D70.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- list @+0x434 via sub_1023D7B0: u16c count + count*u32c entries.
- u8c @+0x440 (op1).
- u8c @+0x441 (op2).
- u8c @+0x442 (op3).
- u8c @+0x443 (op4).

MoveItems op dispatch (observed in handler; op1/op2 are 1..17):
- list_count at +0x43C (from sub_1023D7B0); many branches require list_count == 1.
- op1=1: op2=2 -> InvSlots_5_16_Add/Remove using op4; op2=3 -> InvSlots_1_3_Add/Remove using op4; op2=4 -> InvSlots_23_28_Add with auto slot via InvSlots_26_29_FindFree; op2=5 -> InvSlots_18_21_Set using op4; op2=6/8/13 -> list-based ops (sub_1023DF00/sub_1023F120/sub_10240180).
- op1=2: op2 in {1,6,8,13} -> InvSlots_5_16_Get/Remove using op3 (list_count==1).
- op1=3: op2 in {1,6,8,13} -> InvSlots_1_3_Get/Remove using op3 (list_count==1); op2=3 -> InvSlots_1_3_Swap(op3, op4).
- op1=4: op2=1 -> InvSlots_23_28_Get/Remove using op3 (list_count==1).
- op1=5: op2=5 -> InvSlots_18_21_Swap(op3, op4); else clears slot state.
- op1=6: op2=2 -> InvSlots_5_16_Add using op4; op2=3 -> InvSlots_1_3_Add using op4; op2=1/8/13 -> list-based ops.
- op1=11: op2=2 -> InvSlots_5_16_Add using op4; op2=3 -> InvSlots_1_3_Add using op4; op2=1/6/8/13 -> list-based ops.
- op1=13: op2 in {1,6,8} -> list-based ops (op2=6 path uses sub_1023FE50 + sub_1023F120).
- op1=17: op2 in {8,13} -> list-based ops (sub_1023F120 or sub_10240180).

MoveItems slot helpers (slot ranges from bounds checks):
- 0x1018BBA0 InvSlots_5_16_Add (slots 5..16; 48-byte ItemEntry).
- 0x1018BBF0 InvSlots_5_16_Get (slots 5..16; by item id).
- 0x1018BC40 InvSlots_5_16_Remove (slots 5..16; by item id).
- 0x1018BD10 InvSlots_1_3_Add (slots 1..3).
- 0x1018BE10 InvSlots_1_3_Get (slots 1..3; by item id).
- 0x1018BE60 InvSlots_1_3_Remove (slots 1..3; by item id).
- 0x1018BD60 InvSlots_1_3_Swap (swap 1..3).
- 0x1018BA80 InvSlots_23_28_Add (slots 23..28).
- 0x1018BAE0 InvSlots_23_28_Get (slots 23..28; by item id).
- 0x1018BB30 InvSlots_23_28_Remove (slots 23..28; by item id).
- 0x1018BB80 InvSlots_26_29_FindFree (returns 26..29; 29 if full).
- 0x1018BFC0 InvSlots_18_21_Set (slots 18..21; writes 16-bit field).
- 0x1018BFF0 InvSlots_18_21_Swap (swap 18..21).
- Equip slot mask only tracks slots 5..16 (SharedMem[0x1D69F], bit = slot-4).

MoveItems list helpers:
- sub_1023DF00: validate list of item IDs; optional output list build (used before list-based ops).
- sub_1023F120: remove listed items from inventory list (returns 0 on missing).
- ItemList_MoveFromList @ 0x1023FFE0: move items listed in a3 from list a2 into this (uses sub_1023F010 + sub_1023FBB0; optional per-item notify).
- ItemList_MoveFromList_Param @ 0x10240180: same as above but sets extra param (a4) on each entry before insert.
- ItemList_AddList @ 0x1023FE50: insert all entries from list a2 into this via sub_1023FBB0.
- sub_1023FD50: merge/stack list entries into inventory (uses sub_1023E450 / sub_1023D1A0).

#### Packet_ID_ITEMS_CHANGED (ID -126) ? server?client

Read: Packet_ID_ITEMS_CHANGED_read @ 0x10190990 (decomp); handler: 0x10190B90.

Write: Packet_ID_ITEMS_CHANGED_write @ 0x10190920 (list walk over +0x438, count @+0x43C).

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c count (sub_101C9AA0) -> stored at +0x43C.
- repeat count times: ItemEntryWithId (ItemEntryWithId_read @ 0x102550A0).
  - u32c entryId (sub_1000C990).
  - ItemEntry (ItemStructA_read @ 0x10254F80; see below).

Handler behavior (HandlePacket_ID_ITEMS_CHANGED @ 0x10190B90):
- playerId must match SharedMem[0x5B], else returns early.
- for each ItemEntryWithId:
  - type=3: list = g_LTClient vtbl+88(arg0); sub_1018D3C0(list+0x264, entryId, entryPtr).
  - type=5/6: g_LTClient vtbl+88(arg0); sub_1018D320(entryId, entryPtr).
  - type=16/17/18/19: list = g_LTClient vtbl+88(arg0); if sub_1023F010(list, entryId, temp) then:
    - sub_1023FBB0(list, entryPtr); mark list dirty.
    - update window id 64 via sub_10133E70(window, templateId, countDelta).

#### Packet_ID_ITEMS_REMOVED (ID -127) ? server?client

Read: Packet_ID_ITEMS_REMOVED_read @ 0x1018DE80 (decomp); handler: 0x10192D40.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c  @+0x434 (sub_101C9AA0; reason/type).
- list @+0x438 via Read_u32c_list_u16count: u16c count + count*u32c entries.

Handler behavior (HandlePacket_ID_ITEMS_REMOVED @ 0x10192D40):
- playerId must match SharedMem[0x5B], else returns early.
- removeType=1: for each id in list, sub_1018D350(id, temp); if 1<=itemId<=0xBC0:
  - equipSlot = ItemTemplate_GetEquipSlot(itemId); sub_10035530(dword_103BF748, equipSlot).
  - shows UI msg (string id 4316) with item name string (id + 30000) via sub_10180D40.
- removeType=3: list = g_LTClient vtbl+88(arg0); sub_1023F120(list, idList); mark list dirty.
- removeType=6: list = g_LTClient vtbl+88(arg0); window id 35:
  - clears slots 47..0x32 via sub_1014C0E0, then sub_1023FE50(list, tempList) and sub_1023F120(list, idList); mark list dirty.

#### Packet_ID_ITEMS_ADDED (ID -109) ? server?client

Read: Packet_ID_ITEMS_ADDED_read @ 0x1018DFD0 (decomp); handler: 0x10197030.

Write: Packet_ID_ITEMS_ADDED_write @ 0x101966B0.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c @+0x434 (type).
- if type==3: u8c @+0x435 (subtype).
- payload @+0x438 via sub_102404E0 (see below).

Handler behavior (HandlePacket_ID_ITEMS_ADDED @ 0x10197030):
- playerId must match SharedMem[0x5B], else returns early.
- type=1: merges payload into list from g_LTClient vtbl+88(arg0) via sub_1023FD50; marks list dirty; updates window id 64 with item id/qty list.
- type=3: subtype=1 merges into list arg0; subtype=3 merges into list arg3; subtype=2 merges into window id 19 list at +0x1928 (offset 6440) and refreshes window.
- type=4: merges into window id 19 list at +0x1928; shows UI message string id 4337 (fallback byte_102A8B98), calls sub_1016B5F0 then refreshes window.
- type=5: merges into list arg3; type=6: merges into list arg0.
- type=7: merges into list arg0; if sub_1023CF40(payload,7) then sub_1018BC90(list+36,6,0); marks dirty.
- type=8: iterates payload list; for each item template, calls sub_1018BC90(list+36, equipSlot, 0) then sub_1018BBA0(list+36, equipSlot, entry+8); marks dirty.

#### Packet_ID_UNLOAD_WEAPON (ID -113) - server?client

Read: Packet_ID_UNLOAD_WEAPON_read @ 0x1008FDE0 (decomp); handler: 0x1018EA20.

Fields (read order):
- u32c @+0x434 (sub_1000C990); compares to sub_100079B0(91).
- u8c  @+0x438 (mode; handler uses 2/3).
- if mode==2: ItemEntryWithId @+0x43C (sub_102550A0).
- if mode==1 or 2: u32c @+0x430 (sub_1000C990).

Handler behavior (HandlePacket_ID_UNLOAD_WEAPON @ 0x1018EA20):
- playerId must match SharedMem[0x5B], else returns early.
- mode=2: list = g_LTClient vtbl+88(arg0); insert ItemEntryWithId via sub_1023FBB0.
  - if sub_1018D3F0(list+612, itemKey, tempEntry) then sub_1018D3C0(list+612, tempEntry, tempEntry).
  - else if ItemsAddedPayload_FindEntryByVariantId(list, itemKey, tempEntry) then sub_1023F010(list, tempEntry, 0) + sub_1023FBB0(list, tempEntry).
  - mark list dirty.
- mode=3: shows UI error message string id 5339 via sub_10180D40.

#### Packet_ID_ITEM_REMOVED (ID -120) - server->client

Read: Packet_ID_ITEM_REMOVED_read @ 0x1018DED0 (decomp); handler: 0x1018E550.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c  @+0x434 (sub_101C9AA0; handler uses 1/2/3).
- u32c @+0x438 (sub_1000C990).
- bit  @+0x43C (flag).

Handler behavior (HandlePacket_ID_ITEM_REMOVED @ 0x1018E550):
- playerId must match SharedMem[0x5B], else returns early.
- type=1: removes entry via sub_1018D350; if 1<=itemId<=0xBC0, clears equip slot mask and (if flag) shows UI msg 4316 with item name.
  - if removing current weapon and no variants left, sets SharedMem[0x9C]=1.
- type=2: uses list+612 path (sub_1018BEB0) to drop item; if itemId in range, shows UI msg 4316.
- type=3: list = g_LTClient vtbl+88(arg0); sub_1023F010(list, itemKey, 0); mark dirty.

#### Packet_ID_UPDATE (ID -130) ? client->server (weaponfire/update payload)

Read: Packet_ID_UPDATE_read @ 0x1019F570 (decomp).

Write: Packet_ID_UPDATE_write @ 0x101A0630 (decomp; writes terminating u8=0 after entries).

Send: SendPacket_UPDATE @ 0x101A27A0 (builds Packet_ID_UPDATE, appends WeaponFireEntry records, sends if count>0).

Notes:
- CNetworkMgrClient_DispatchPacketId has no inbound case for ID 0x7E (default case).
- Entry count stored at +0x430, capped at 10 (see WeaponFireEntry_add @ 0x101A14C0).
- Bitstream payload is a sequence of WeaponFireEntry records written into packet stream at +0x0C, terminated by a zero type byte (no explicit count observed).
- Vtable xrefs for off_102CED90 only at ctor (0x1019E3C6) and SendPacket_UPDATE (0x101A2835); no inbound read path found.

#### Packet_ID_UPDATE (ID -130) payload: WeaponFireEntry list (client->server)

- WeaponFireEntry_add @ 0x101A14C0 (adds entry if count<10; increments count @+0x430).
- WeaponFireEntry_write @ 0x101A1440 (writes entry type + fields into packet bitstream).
- WeaponFireEntry_build_from_state @ 0x101A2390 populates most fields prior to write:
  - +0x04 = SharedMem[0x5B] (player id)
  - +0x0C/+0x0E/+0x10 = int16 position from ILTClient object pos
  - +0x14 = yaw degrees (rot + pi, rad->deg)
  - +0x18/+0x1C/+0x20 = packed vec values or config values depending on SharedMem[0] (state 4/30/31 special cases)
  - +0x22..+0x53 = BitfieldBlock_0x30 copy (0x32 bytes from ILTClient vtbl+0x58)
  - +0x64 = int from SharedMem_ReadFloat_std(0x1D6A5)
  - +0x68.. = StatGroup_Read group 2 (0x3C bytes)
  - +0x6C = SharedMem[0x8F]
  - +0x74 = bool from WeaponFire sharedmem state (0x3042==1 or 0x3041==1/2)
  - +0x78 = SharedMem[0x3046] if (this+202)>0 else 0
  - +0x80 = SharedMem[0x1D6A4] (overridden to 61/62/63 for flags 0x1EEC3 / sub_100387C0 / 0x8D)
  - +0x84 = (SharedMem[0x1CEC2] == 2)
  - +0x86 = SharedMem[0x303E] (current weapon id)
  - +0x8C/+0x8E/+0x90 = int16 vector from dword_103BF75C (clamped via Vec3_IsWithinBounds_511 / Vec3_ScaleToLength)
  - +0x96 = SharedMem_ReadU16_std(120479) (equip slot mask)
  - +0x98 = u8 from SharedMem[(dword_103BF748+4), 0xA7]
  - +0x9C = WeaponFireEntry_pick_list_entry @ 0x101A21A0
  - +0xA3 = ShieldSetting (sub_1002B310(\"ShieldSetting\", 50))
  - +0xB0 = u8 from SharedMem[0x1EA3E]
  - +0xB4 = StatGroup_Read group 8 (u32)

WeaponFireEntry type1 (write @ 0x101A1310):
- u32c @+0x00
- u32c @+0x04
- u8c  @+0x08
- bit + u32c @+0x0C if >0
- bit + 3 bits @+0x10 if >0
- u32c @+0x14
- then type2 payload (same entry object) via WeaponFireEntry_type2_write

WeaponFireEntry type2 (write @ 0x101A00B0):
- u32c @+0x04
- Write_QuantVec3_And9 @+0x08
- Write_BitfieldBlock_0x30 @+0x22
- bit @+0x84
- if bit==0, optional fields in order:
  - u8  = (dword @+0x64) + 0x5A (8 bits)
  - bit + 12 bits @+0x68 if != 0x10
  - bit + 5 bits  @+0x6C if >0
  - bit + u16c    @+0x86 if >0
  - bit @+0x74
  - bit + 7 bits @+0x78 if >0, then Write_QuantVec3 @+0x88
  - bit @+0x7C, then 4 bits @+0x94 and 4 bits @+0x95 if set
  - bit + 6 bits @+0x80 if >0
  - if BitfieldBlock_0x30_HasExtra(@+0x22):
    - bit + u16c @+0x96 if >0
    - optional 7 bits @+0xA3 if sub_102323C0(...) returns true
  - 8 bits @+0xA2
  - 3 bits @+0xB0
  - bit @+0xB8
  - 10 bits @+0xBC
  - 10 bits @+0xC0
  - bit @+0xA4

WeaponFireEntry type3 (write @ 0x101A0360):
- u32c @+0x04
- u16c @+0x60
- 3 bits @+0xA0
- u8c @+0xA1
- Write_QuantVec3_And9 @+0x08
- u8  @+0x85; if nonzero, stop.
- else: bit @+0x7C, 5 bits @+0x6C, 4 bits @+0x70, optional 6 bits @+0x80, optional u32c @+0x78 if 2<=field<=4, then 14 bits @+0xBC.

WeaponFireEntry type4 (write @ 0x101A04D0):
- u32c @+0x04
- u16c @+0x86
- bit @+0x84
- 14 bits @+0xBC
- sub_1019F280 @+0xC4 (unknown bitfield block)
- Write_QuantVec3_And9 @+0x08
- bit + u32c @+0x54 if >0
- bit + u32c @+0x58 if >0
- bit + u32c @+0x5C if >0
- string @+0xC8 (via vtable dword_1035AA4C->fn+0x34, max 0x800)

#### Packet_ID_WEAPONFIRE (ID -121) - client->server

Read: Packet_ID_WEAPONFIRE_read @ 0x101A0680 (decomp).

Write: Packet_ID_WEAPONFIRE_write @ 0x101A06D0.

Fields (read/write order):
- u32c @+0x430
- u16c @+0x434
- u32c @+0x438

Notes:
- No inbound dispatch case found in CNetworkMgrClient_DispatchPacketId (outbound only).

#### Packet_ID_MERGE_ITEMS (ID -112) - server->client

Read: Packet_ID_MERGE_ITEMS_read @ 0x1010AC90 (decomp); handler: 0x1018EC20.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- bit  @+0x434 (flag).
- if flag==1: ItemEntryWithId @+0x440 and @+0x470 (two full entries).
- if flag==0: u32c @+0x438 + u32c @+0x43C (two entry ids only).

Handler behavior (HandlePacket_ID_MERGE_ITEMS @ 0x1018EC20):
- playerId must match SharedMem[0x5B]; requires valid ids and entries.
- uses ItemTemplate_GetType(templateId) to choose list operations; on success marks list dirty and shows UI msg 1851.

#### Packet_ID_NAME_CHANGE (ID -114) - server->client

Read: Packet_ID_NAME_CHANGE_read @ 0x10181140 (decomp); handler: 0x1018E8F0.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- bits(2048) @+0x434 (raw block; MSB-first).
  - bytes[0x00..0x1F] @+0x434: null-terminated name string (passed to sub_10008A00).
  - byte[0x20] @+0x454: flag used to choose message 11219 vs 11224.
  - remaining bytes (0x21..0xFF) currently unused in handler.
- post-read: sub_100328E0(this+0x454) reads one bit from the block context.

#### Packet_ID_BACKPACK_CONTENTS (ID -110) - server->client

Read: Packet_ID_BACKPACK_CONTENTS_read @ 0x100AC6C0 (decomp); handler: 0x10196CE0.

Fields (read order):
- u32c @+0x430 (sub_1000C990) -> playerId.
- u8c  @+0x434 (reason/type).
- u32c @+0x438 (containerId?).
- u32c @+0x460 (owner/backpack id).
- payload @+0x43C via sub_102404E0 (ItemsAdded payload).
- list @+0x464 via Read_u32c_list_u16count (u16 count + u32c ids).

#### Packet_ID_MAIL (ID -116) - server->client

Read: Packet_ID_MAIL_read @ 0x1013DDC0 (decomp); handler: 0x10193740.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- mail entries via Packet_ID_MAIL_read_entries @ 0x1013DD20:
  - u8c count
  - repeat count: Packet_ID_MAIL_read_entry @ 0x1013DA40 (decomp; fields below), then Packet_ID_MAIL_entry_list_insert @ 0x1013DC60.
- bit flag @+0x444 (reads 1 bit); if set, Read_Vector_U32c @ 0x1013DB60:
  - u8c count
  - count x u32c (compressed).

Write: Packet_ID_MAIL_write @ 0x1013D2E0 (decomp).

- writes u32c @+0x430 (BitStream_Write_u32c @ 0x10031AB0, value from sub_100079B0(0x5B)).
- writes mail entries via Packet_ID_MAIL_write_entries @ 0x1013D1E0 (u8c count + Packet_ID_MAIL_write_entry).
- writes bit @+0x444; if set, Packet_ID_MAIL_write_idlist @ 0x1013D250 (u8c count + u32 list).

Packet_ID_MAIL_read_entry @ 0x1013DA40 (fields in order):
- u32c @+0x00 (sub_1000C990).
- u8c  @+0x04 (BitStream_ReadBitsCompressed 8 bits).
- u32c @+0x08 (sub_1000C990).
- bits(2048) @+0x0C (vtbl+0x38; max 0x800).
- bits(2048) @+0x48 (vtbl+0x38; max 0x800).
- if u8c@+0x04 == 0: bits(2048) @+0x20 (vtbl+0x38; max 0x800).

Entry size: 0x848 bytes (list insert stride at 0x1013DC60).

Packet_ID_MAIL_write_entry @ 0x1013D0F0 (write order):
- u32c (BitStream_WriteBitsCompressed 32; endian swap if Net_IsBigEndian).
- u8c  (BitStream_WriteBitsCompressed 8).
- u32c (BitStream_WriteBitsCompressed 32; endian swap if Net_IsBigEndian).
- bits(2048) @+0x0C (vtbl+0x34).
- bits(2048) @+0x48 (vtbl+0x34).
- if u8c@+0x04 == 0: bits(2048) @+0x20 (vtbl+0x34).

Packet_ID_MAIL_entry_fill @ 0x1013C970 (UI helper; fills entry buffers):
- u32 @+0x00, u8 @+0x04, u32 @+0x08.
- strncpy_s @+0x0C (len 0x14), @+0x20 (len 0x28), @+0x48 (len 0x800).

Send flow (CWindowSendMail_OnCommand @ 0x1013DE40, case 8):
- Validates recipient (len >= 4), subject (len >= 5), body (len >= 10), rejects self?send (case?insensitive), and runs sub_10248020 (string filter) on each.
- Builds Packet_ID_MAIL, fills one entry via Packet_ID_MAIL_entry_fill, inserts unique, writes, then sends via LTClient_SendPacket_BuildIfNeeded(packet, 2, 1, 3, 1).

#### Packet_ID_PRODUCTION (ID -101) - server->client

Read: Packet_ID_PRODUCTION_read @ 0x10164A30 (decomp); handler: 0x10195A00.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- if type == 0:
  - bit @+0x435 (sub_100328E0).
  - u32c @+0x4C4 (sub_1000C990).
  - u8c  @+0x4C8 (sub_101C9AA0).
  - u32c @+0x448 (sub_1000C990).
  - bit @+0x4C9 (sub_100328E0).
  - 4x u32c @+0x438..+0x444 (sub_1000CAC0 loop).
  - 10x lists @+0x44C (each via sub_1023D7B0: u16c count + count*u32c).
- if type == 2:
  - entries via Packet_ID_PRODUCTION_read_entries @ 0x101648E0 (decomp):
    - u32c count
    - repeat count:
      - u32c
      - u8c
      - u32c
      - ItemEntryWithId (sub_102550A0)
      - u32c (sub_10246F10)
- else (type != 0/2): no extra fields observed.

#### Packet_ID_MARKET (ID -100) - server->client

Read: Packet_ID_MARKET_read @ 0x100CA180 (decomp); handler: 0x10195AF0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- type switch (0..0x1D):
  - 0: u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 1: u8c @+0x458, u8c @+0x47D, listA @+0x480.
  - 2: structA @+0x438, u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 3: u8c @+0x458, u8c @+0x47D, listC @+0x490, block6 @+0x4EC.
  - 4: no extra.
  - 5: listB @+0x4C0.
  - 6: structA @+0x438.
  - 7: u32c @+0x4D4, u16c @+0x4DC, u8c @+0x54D, structA @+0x438.
  - 8: u32c @+0x4D8, list via sub_1023D7B0 @+0x4E0.
  - 9: no extra.
  - 10: block6 @+0x4EC, bit @+0x54C (sub_100328E0).
  - 11: block6 @+0x4EC.
  - 12: u8c @+0x458, structC @+0x54E.
  - 13: u8c @+0x458, u8c @+0x47D, list @+0x554 (sub_1025C7B0).
  - 14: u16c @+0x564, u8c @+0x566, u16c @+0x4DC.
  - 15: no extra.
  - 16: no extra.
  - 17: no extra.
  - 18: u8c @+0x458, structC2 @+0x568.
  - 19: u8c @+0x458, u8c @+0x47D, list @+0x570 (sub_1025B1D0).
  - 20: u16c @+0x580, u16c @+0x4DC.
  - 21: u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 22: u8c @+0x458, u8c @+0x47D, listA @+0x480.
  - 23: structA @+0x438, u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 24: u8c @+0x458, u8c @+0x47D, listC @+0x490.
  - 25: no extra.
  - 26: structA @+0x438.
  - 27: u32c @+0x4D4, u16c @+0x4DC, u8c @+0x54D, structA @+0x438.
  - 28: u32c @+0x4D8, list via sub_1023D7B0 @+0x4E0.
  - 29: u16c @+0x582, u16c @+0x4DC.

Helper layouts:
- structA (Packet_ID_MARKET_read_structA @ 0x10254F80):
  - u16c @+0x00, u16c @+0x02, u16c @+0x04, u16c @+0x06
  - u8c  @+0x08, u8c @+0x09
  - u32c @+0x0C, u32c @+0x10, u32c @+0x14
  - u8c  @+0x1A, u8c @+0x19, u8c @+0x18
  - u8c[4] @+0x1B..0x1E
- structB (Packet_ID_MARKET_read_structB @ 0x100C87E0):
  - u8c @+0x00
  - u16c @+0x04
  - u32c @+0x08, u32c @+0x0C
  - u16c @+0x10, @+0x12, @+0x14, @+0x16
  - bit @+0x18
  - u8c @+0x01, u8c @+0x02
  - bit @+0x1C
- structC (Packet_ID_MARKET_read_structC @ 0x100C89A0):
  - u8c @+0x00, u8c @+0x01, u16c @+0x02, bit @+0x04, u8c @+0x05
- structC2 (Packet_ID_MARKET_read_structC2 @ 0x100C8A10):
  - u8c @+0x00, u8c @+0x01, u16c @+0x02, bit @+0x04
- listA (Packet_ID_MARKET_read_listA @ 0x10267840):
  - u8c count
  - repeat count: structA + u32c + u32c + u32c (field1 default = 0x3B9AC9FF before read).
- listB (Packet_ID_MARKET_read_listB @ 0x100C9EC0):
  - u8c count
  - repeat count: structA + u32c + u16c + u32c.
- listC (Packet_ID_MARKET_read_listC @ 0x100C9CE0):
  - structA
  - u8c count
  - repeat count: u32c, u32c, u16c, u16c, u32c, string (vtable+0x38, max 0x800).
- listD (Packet_ID_MARKET_read_listD @ 0x1025C7B0):
  - u32c count
  - repeat count: u16c, u8c, u16c (all via BitStream_ReadBitsCompressed + endian swap).
- listE (Packet_ID_MARKET_read_listE @ 0x1025B1D0):
  - u32c count
  - repeat count: u16c, u32c (all via BitStream_ReadBitsCompressed + endian swap).
- block (Packet_ID_MARKET_read_block @ 0x100CA060):
  - u32c count
  - repeat count:
    - u16c
    - 5x bits(9) (sub_101C9930).
- block6 (Packet_ID_MARKET_read_block6 @ 0x100CA150): 6x block.

#### Packet_ID_FACTION (ID -99) - server->client

Read: Packet_ID_FACTION_read @ 0x100AAD00 (decomp); handler: 0x101993B0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- switch on (type-2), 76 cases.

Confirmed helper layouts:
- Packet_ID_FACTION_read_blockA @ 0x100A7720:
  - string @+0x06 (vtable+0x38, max 0x800)
  - string @+0x3A (vtable+0x38, max 0x800)
  - string @+0x1A (vtable+0x38, max 0x800)
  - u32c @+0x00
  - bit @+0x43A
  - u8c @+0x05, u8c @+0x04
  - if bit@+0x43A != 0: u32c @+0x43C (sub_10246F10) else u32c @+0x440
  - Playerfile_read_blockC0 @+0x444
  - blockA_struct_4C0 @+0x4C0 (Packet_ID_FACTION_read_blockA_struct_4C0):
    - u32c @+0x00..0x14 (6x)
    - u8c count; repeat: u8c list @+0x18
  - blockA_list_4E8 @+0x4E8 (Packet_ID_FACTION_read_blockA_list_4E8):
    - u32c count
    - repeat: u32c + u8c + string (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_listA @ 0x100A9D00:
  - u32c header @+0x00
  - u32c count1; repeat count1: Packet_ID_A9_read_structB
  - u32c count2; repeat count2: u32c list (vector @+0x18)
- Packet_ID_A9_read_structB @ 0x100A6E70:
  - u8c @+0x00
  - string @+0x01 (vtable+0x38, max 0x800)
  - u32c count1; repeat: u8c + u32c (vector @+0x24)
  - u32c count2; repeat: u32c (vector @+0x34)
- Packet_ID_FACTION_read_listB @ 0x100AAC20:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_listB_entry @ 0x100A9680:
    - u8c header
    - u32c count; repeat: Packet_ID_A5_read_struct2 (see Packet_ID_A5 section)
    - inserts via sub_100A8F10
- Packet_ID_FACTION_read_listC @ 0x100A99F0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_listC_entry @ 0x100A6390:
    - u8c header
    - u32c @+0x14
    - u32c count; repeat: u32c + u32c (BitStream_ReadBitsCompressed + endian swap)
- Packet_ID_FACTION_read_block_107C @ 0x100A74F0:
  - u16c @+0x00
  - u16c @+0x02
  - u8c count
  - repeat count: Packet_ID_FACTION_read_block_107C_entry @ 0x1009F9A0:
    - u32c @+0x00 (sub_10246F10)
    - u8c @+0x04
    - u32c @+0x08
    - u32c @+0x0C
    - u32c @+0x10
    - string @+0x14 (vtable+0x38, max 0x800)
    - string @+0x28 (vtable+0x38, max 0x800)
    - string @+0x3C (vtable+0x38, max 0x800)
    - string @+0x5C (vtable+0x38, max 0x800)
  - insert filter: entry.u32c@+0x00 > 0 AND (u8@+0x04 - 1) <= 0x10
- Packet_ID_FACTION_read_block_1090 @ 0x100A7060:
  - u8c count
  - repeat count: Packet_ID_FACTION_read_block_10A0 @ 0x1009EE50
- Packet_ID_FACTION_read_block_10A0 @ 0x1009EE50 (entry):
  - u32c @+0x00
  - u8c  @+0x04
  - u8c  @+0x25
  - u8c  @+0x27
  - u32c @+0xA8
  - u8c  @+0x26
  - string @+0x05 (vtable+0x38, max 0x800)
  - string @+0x28 (vtable+0x38, max 0x800)
  - string @+0xAC (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0D50 @ 0x100A7950:
  - u16c count; repeat: FriendEntry (Packet_ID_PLAYERFILE_read_structA)
- Packet_ID_FACTION_read_block_0D78 @ 0x100A72D0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_0D78_entry @ 0x1009F580:
    - u32c @+0x30
    - u8c @+0x38
    - u32c @+0x00
    - u32c @+0x2C
    - u32c @+0x34
    - string @+0x04 (vtable+0x38, max 0x800)
    - string @+0x18 (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0E08 @ 0x1009F050:
  - bit @+0x00
  - u8c @+0x01
  - u32c_alt @+0x04
  - u32c_alt @+0x08
  - string @+0x0C (vtable+0x38, max 0x800)
  - u8c @+0x20
- Packet_ID_FACTION_read_block_0E2C @ 0x100A7350:
  - u32c count
  - repeat count: u32c + u32c + 3x string (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0E3C @ 0x100A71E0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_0E3C_entry @ 0x1009F350:
    - u32c @+0x00
    - u32c @+0x18
    - string @+0x04 (vtable+0x38, max 0x800)
    - string @+0x1C (vtable+0x38, max 0x800)
    - u32c @+0x11C
    - if u32c@+0x11C != 0:
      - Playerfile_read_blockC0 @+0x120
      - string @+0x19C (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0FD4 @ 0x100A7810:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_0FD4_entry @ 0x100A05E0:
    - u32c @+0x00
    - string @+0x04 (vtable+0x38, max 0x800)
    - string @+0x18 (vtable+0x38, max 0x800)
    - string @+0x38 (vtable+0x38, max 0x800)
    - u32c @+0x1B4
    - Playerfile_read_blockC0 @+0x138
- Packet_ID_FACTION_read_block_1784 @ 0x100A78B0:
  - u16c @+0x00
  - u16c @+0x02
  - u8c count
  - repeat count: Packet_ID_FACTION_read_block_1784_entry @ 0x100A08B0:
    - u8c @+0x00
    - u32c_alt @+0x04
    - u8c @+0x08
    - u32c @+0x0C
    - string @+0x10 (vtable+0x38, max 0x800)
    - string @+0x24 (vtable+0x38, max 0x800)
    - u32c @+0x44
- Packet_ID_FACTION_read_block_1160 @ 0x100A75F0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_11A4 @ 0x1009FDA0
- Packet_ID_FACTION_read_block_11A4 @ 0x1009FDA0 (entry):
  - u32c @+0x00
  - u16c @+0x04
  - bit  @+0x0C4
  - u32c @+0x164
  - u32c @+0x168
  - u32c @+0x08
  - u8c  @+0x0C5
  - string @+0x0C (vtable+0x38, max 0x800)
  - string @+0x20 (vtable+0x38, max 0x800)
  - string @+0x24 (vtable+0x38, max 0x800)
  - string @+0x44 (vtable+0x38, max 0x800)
  - string @+0x144 (vtable+0x38, max 0x800)
  - u32c @+0x170
  - u32c @+0x16C
  - Playerfile_read_blockC0 @+0x0C8
- Packet_ID_FACTION_read_block_1170 @ 0x1009FF90:
  - bit @+0x00
  - string @+0x01 (vtable+0x38, max 0x800)
  - string @+0x15 (vtable+0x38, max 0x800)
  - string @+0x29 (vtable+0x38, max 0x800)
  - u16c @+0x2E
  - u8c  @+0x30
- Packet_ID_FACTION_read_block_1318 @ 0x10252B70:
  - u32c @+0x00
  - u32c @+0x04 (sub_10246F10)
  - u32c count
  - repeat count: u16c + u8c + bit (direct) -> inserted list @+0x08
- Packet_ID_FACTION_read_block_1340 @ 0x100A02E0:
  - u32c @+0x3C0
  - bit  @+0x3C4
  - u32c @+0x3C8 (sub_10246F10)
  - u16c @+0x3CC
  - 0x1E entries (size 0x20) starting @+0x00:
    - presence bit
    - if 0: zero u8@+0x00, zero string@+0x01, u32@+0x1C=0
    - if 1: u8c @+0x00, u32c @+0x1C, if u8c>0x0A then string @+0x01 (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_1738 @ 0x100A06F0:
  - u8c  @+0x00
  - u32c_alt @+0x04
  - u8c  @+0x08, @+0x09, @+0x0A
  - bit  @+0x48
  - string @+0x0B (vtable+0x38, max 0x800)
  - string @+0x1F (vtable+0x38, max 0x800)
  - u32c @+0x40 (sub_10246F10)
  - u32c @+0x44 (sub_10246F10)
- Packet_ID_FACTION_read_block_17BC @ 0x100A9EB0:
  - u8c count
  - repeat count:
    - u8c
    - string (vtable+0x38, max 0x800)
    - u32c
    - Packet_ID_FACTION_read_block_0D50

Case map (type value => extra reads), jump table @ 0x100AB360 (76 entries; type = index+2):
- No extra fields: types 3, 6, 8, 11, 12, 20, 29, 32, 35, 53, 71.
- type 2: blockA @+0x858; if [0x0C92] != 0 -> Packet_ID_FACTION_read_block_0D50 @+0x0D50; else listA @+0x1008, listB @+0x179C, listC @+0x17AC.
- type 4: bits(2048) @+0x436, then bits(2048) @+0x456.
- type 5: bits(2048) @+0x456.
- type 7: u32c @+0x1074.
- type 9: bits(2048) @+0x0D64.
- type 10: u32c @+0x0D60, bit @+0x0F4C; if bit==0 -> bits(2048) @+0x0F4D.
- type 13: Packet_ID_FACTION_read_block_0D78 @+0x0D78, listA @+0x1008.
- type 14: u8c @+0x435.
- type 15: status list @+0x0D88 (sub_1000D870).
- type 16: u8c @+0x0E04, bits(2048) @+0x436.
- type 17: u8c @+0x0E04, u32c @+0x0D60.
- type 18: Packet_ID_FACTION_read_block_0E08 @+0x0E08.
- type 19: Packet_ID_FACTION_read_block_0D50 @+0x0D50.
- type 21: Packet_ID_FACTION_read_block_0E2C @+0x0E2C; Packet_ID_FACTION_read_block_0E3C @+0x0E3C; bits(2048) @+0x0E4C; bit @+0x0F4C; listA @+0x1008.
- type 22: u32c @+0x0D60.
- type 23: bits(2048) @+0x0E4C; bit @+0x0F4C.
- type 24: u32c @+0x0D60.
- type 25: u32c @+0x0D60, bit @+0x0F4C; if bit==0 -> bits(2048) @+0x0F4D.
- type 26: u32c @+0x0FD0.
- type 27: u32c @+0x0FD0.
- type 28: u32c @+0x0D60.
- type 30: Packet_ID_FACTION_read_block_0FD4 @+0x0FD4.
- type 31: u32c @+0x0FD0, bits(2048) @+0x0E4C.
- type 33: Packet_ID_FACTION_read_block_0E3C @+0x0E3C.
- type 34: u32c @+0x0FD0.
- type 36: listA @+0x1008, Packet_ID_FACTION_read_block_1340 @+0x1340.
- type 37: bits(2048) @+0x0FE4.
- type 38: u8c @+0x1004.
- type 39: sub_100A6E70 @+0x1030.
- types 40, 41, 59: u8c @+0x1004.
- type 42: u8c @+0x1078, u32c @+0x1074, u32c @+0x0D60, bits(2048) @+0x0F4D.
- type 43: u32c @+0x1074.
- type 44: Packet_ID_FACTION_read_block_1090 @+0x1090; Packet_ID_FACTION_read_block_107C @+0x107C; listA @+0x1008; Packet_ID_FACTION_read_block_1340 @+0x1340; Packet_ID_FACTION_read_blockA_struct_4C0 @+0x1710.
- type 45: Packet_ID_FACTION_read_block_10A0 @+0x10A0; u32c @+0x1074.
- type 46: Packet_ID_FACTION_read_block_10A0 @+0x10A0.
- type 47: u32c @+0x0D60; u32c @+0x1074.
- type 48: bit @+0x0F4C; Packet_ID_FACTION_read_block_1170 @+0x1170.
- type 49: bit @+0x0F4C; Packet_ID_FACTION_read_block_1160 @+0x1160; listA @+0x1008.
- type 50: bit @+0x0F4C; bits(2048) @+0x436.
- type 51: Packet_ID_FACTION_read_block_11A4 @+0x11A4.
- type 52: u32c @+0x0D60.
- type 54: Packet_ID_FACTION_read_block_1318 @+0x1318; u8c @+0x435.
- types 55, 56, 57, 60, 66, 70: u32c @+0x1074.
- type 58: u8c @+0x1004; bits(2048) @+0x436.
- type 61: u32c @+0x1074; Packet_ID_FACTION_read_block_1738 @+0x1738.
- type 62: Packet_ID_FACTION_read_block_1784 @+0x1784.
- type 63: bits(2048) @+0x436; u8c @+0x1798; u32c @+0x1074.
- type 64: u8c @+0x1798; u8c @+0x1799; u32c @+0x1074.
- type 65: bits(2048) @+0x0D64; u8c @+0x1798; u32c @+0x1074.
- type 67: u32c @+0x1074; u32c @+0x0D60.
- type 68: u32c @+0x1074; u32c @+0x0D60; u8c @+0x1798.
- type 69: bits(2048) @+0x0D64; u32c @+0x1074.
- type 72: Packet_ID_FACTION_read_block_17BC @+0x17BC.
- type 73: bits(2048) @+0x436.
- type 74: u8c @+0x435.
- type 75: bits(2048) @+0x0D64; u8c @+0x435.
- types 76, 77: u32c @+0x0D60; u8c @+0x435.

#### Packet_ID_PLAYERFILE (ID -97) - server->client

Read: Packet_ID_PLAYERFILE_read @ 0x1013C6F0 (decomp); handler: 0x10198F30.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- bit @+0x434 (flag via direct bit read).
- if flag == 1:
  - FriendEntry @+0x43C (Packet_ID_PLAYERFILE_read_structA @ 0x100A0C90).
  - Packet_ID_FACTION_read_listA @+0x77C (sub_100A9D00).
  - string @+0x57C (vtable+0x38, max 0x800).
- else:
  - u32c @+0x438 (sub_1000C990).

FriendEntry / Packet_ID_PLAYERFILE_read_structA @ 0x100A0C90 (read order):
- u32c @+0x00
- u8c  @+0x04
- u32c @+0x08
- u8c  @+0x0C
- string @+0x0D (vtable+0x38, max 0x800)
- u32c_alt @+0x50 (Read_u32c_alt)
- u8c  @+0x9C
- string @+0x9D (vtable+0x38, max 0x800)
- string @+0x54 (vtable+0x38, max 0x800), then strncpy/lowercase to +0x68 (size 0x14)
- string @+0x7C (vtable+0x38, max 0x800)
- Playerfile_read_blockC0 @+0xC0 (0x1000D870)
- u8c  @+0x13C

Playerfile_read_blockC0 @ 0x1000D870:
- u32c header
- 10 x Playerfile_read_blockC0_entry @ 0x1000D730 (entry size 0x0C)

Playerfile_read_blockC0_entry @ 0x1000D730:
- bit present; if 0 => zero-fill entry
- if present:
  - u16c @+0x00
  - u8c  @+0x02
  - u8c  @+0x03
  - bits(7) @+0x04
  - bits(7) @+0x05
  - bits(9) @+0x06
  - u8c  @+0x08
  - u8c  @+0x09
  - u8c  @+0x0A

#### Packet_ID_SKILLS (ID -93) - server->client

Read: Packet_ID_SKILLS_read @ 0x10141890 (decomp); handler: 0x101931E0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- if type in {2,7}:
  - list via Packet_ID_SKILLS_read_list @ 0x1024AD30:
    - u8c @+0x24..+0x27 (4x u8c).
    - u32c @+0x20.
    - u32c count.
    - repeat count:
      - u32c (BitStream_ReadBitsCompressed + endian swap)
      - u8c
      - u32c (BitStream_ReadBitsCompressed + endian swap)
      - u8c
      - u8c
      - u8c
      - insert via Packet_ID_SKILLS_read_list_insert @ 0x1024ACA0
- if type in {3,4,5,6}:
  - u32c @+0x468 (sub_1000C990).

#### Packet_ID_A5 (ID -91) - server->client (name TBD)

Read: Packet_ID_A5_read @ 0x1015E730 (decomp); handler: 0x10197580.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- type-specific payloads:
  - type 1: u32c @+0x438.
  - type 2: no extra fields.
  - type 3: ItemsAdded payload @+0x640 (sub_102404E0).
  - type 4: u32c @+0x438.
  - type 5: struct1 @+0x444 (Packet_ID_A5_read_struct1).
  - type 6: u32c @+0x438.
  - type 7: u32c @+0x438.
  - type 8: struct1 @+0x444 + struct2 @+0x5C0 + bit @+0x618.
  - type 9: u32c @+0x438 + u16c[6] @+0x61A (Read_u16c_x6).
  - type 10: u32c @+0x438.
  - type 11: u32c @+0x438 + u8c @+0x440 (sub_100388F0).
  - type 12: u32c @+0x438 + u32c @+0x43C.
  - type 13: u32c @+0x438.
  - type 14: struct3 @+0x628 (Packet_ID_A5_read_struct3).
  - type 15: u32c @+0x438.
  - type 16: struct3 @+0x628 + bit @+0x618.
  - type 17: u32c @+0x438 + u32c @+0x43C.

Struct1: Packet_ID_A5_read_struct1 @ 0x100D4620

- u32c @+0x00
- u8c  @+0x04
- u8c  @+0x0C
- u8c  @+0x05
- u32c @+0x08
- u32c @+0x10
- bits(2048) @+0x14 (raw block)
- status list @+0x34 via sub_1000D870
- bits(2048) @+0x14C
- bits(2048) @+0x0B0
- status list @+0x0D0 via sub_1000D870
- if u8c@+0x04 != 2: u16c[6] @+0x16C (Read_u16c_x6).

Struct2: Packet_ID_A5_read_struct2 @ 0x100A7AB0

- u32c @+0x14
- u8c  @+0x18
- u16c @+0x10
- u32c @+0x1C
- u32c @+0x28
- u32c @+0x2C
- u32c count
- repeat count:
  - u32c
  - bits(2048)
  - u32c
  - u16c
  - u32c
- u32c @+0x20 (sub_10246F10)
- u32c @+0x24 (sub_10246F10)

Struct3: Packet_ID_A5_read_struct3 @ 0x1015E590

- u32c @+0x00
- u32c @+0x04
- u32c count
- repeat count:
  - u32c
  - bits(2048)
  - u32c
  - u32c

#### Packet_ID_A6 (ID -90) - server->client (name TBD)

Read: Packet_ID_A6_read @ 0x100AB9F0 (decomp); handler: 0x1018F480.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x438 (sub_1000C990).
- u8c  @+0x440 (sub_101C9AA0).
- u8c  @+0x434 (type).
- u8c  @+0x43C (sub_101C9AA0).

type-specific (switch on type-2):
  - type 2: u16c @+0x43E.
  - type 3: u64c @+0x448 (sub_100AB5D0) + u16c @+0x43E.
  - type 4: u16c @+0x43E.
  - type 5: no extra fields.
  - type 6: no extra fields.
  - type 7: u16c @+0x43E.

#### Packet_ID_A8 (ID -88) - server->client (name TBD)

Read: Packet_ID_A8_read @ 0x1014B810 (decomp); handler: 0x10192690.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (sub_101C9AA0).
- if u8c == 1:
  - u8c @+0x435, @+0x436, @+0x437, @+0x438, @+0x439, @+0x43A.
  - 4x lists @+0x43C..@+0x460 via sub_1023D7B0 (u16c count + count*u32c).

#### Packet_ID_A9 (ID -87) - server->client (name TBD)

Read: Packet_ID_A9_read @ 0x1011AD30 (decomp); handler: 0x10199050.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-2).

Type map (type value => extra reads):
- type 2: Packet_ID_A9_read_structA @+0x43C; Packet_ID_A9_read_structB @+0x528; u32c @+0x58C; u32c @+0x590.
- type 3: Packet_ID_A9_read_structB @+0x528; u32c @+0x58C; u32c @+0x590.
- type 4: Packet_ID_A9_read_structA @+0x43C.
- type 5: no extra fields (default).
- type 6: bits(2048) @+0x56C.
- type 7: u32c @+0x438; bits(2048) @+0x56C.
- type 8: u32c @+0x438.
- type 9: bits(2048) @+0x56C.
- type 10: bits(2048) @+0x56C; u32c @+0x438.
- type 11: u32c @+0x438; FriendEntry @+0x594 (Packet_ID_PLAYERFILE_read_structA).
- type 12: no extra fields (default).
- type 13: Packet_ID_A9_read_structC @+0x6D4.
- type 14: Packet_ID_A9_read_structA_list @+0x6D8.
- type 15: u32c @+0x438.
- type 16: u32c @+0x438.
- type 17: u32c @+0x438; u16c @+0x804.
- type 18: Packet_ID_A9_read_structD @+0x6E8.
- type 19: bits(2048) @+0x806.
- type 20: u16c @+0x804.
- type 21: Packet_ID_A9_read_structD_list @+0x888; bit @+0x886.
- type 22: u32c @+0x438; bit @+0x886.
- type 23: u32c @+0x438; bit @+0x886.

Note: types 5 and 12 fall through default (no extra reads observed).

Packet_ID_A9 helper layouts:
- Packet_ID_A9_read_structA @ 0x10119210:
  - u32c @+0x00
  - u8c  @+0x1C
  - u32c @+0x04
  - string @+0x08 (vtable+0x38, max 0x800)
  - string @+0x1D (vtable+0x38, max 0x800)
  - string @+0x39 (vtable+0x38, max 0x800)
  - Read_Map_U32_String @+0x0BC
  - u8c @+0x0CC, @+0x0CD, @+0x0CE, @+0x0CF
  - u32c @+0x0D0
  - u16c @+0x0D4
  - u8c  @+0x0D6
  - Packet_ID_FACTION_read_block_0D50 @+0x0D8
  - u32c @+0x0E8
- Packet_ID_A9_read_structA_list @ 0x1011A5E0:
  - u32c count; repeat: Packet_ID_A9_read_structA
- Packet_ID_A9_read_structB @ 0x100A6E70:
  - u8c @+0x00
  - string @+0x01 (vtable+0x38, max 0x800)
  - u32c count1; repeat: u8c + u32c (vector @+0x24)
  - u32c count2; repeat: u32c (vector @+0x34)
- Packet_ID_A9_read_structC @ 0x101181E0:
  - u8c @+0x00, @+0x01, @+0x02, @+0x03
- Packet_ID_A9_read_structC2 @ 0x10118230:
  - u8c  @+0x00
  - u32c @+0x04
  - string @+0x08 (vtable+0x38, max 0x800)
  - u8c  @+0x1C, @+0x1D
  - u32c @+0x20 (sub_10246F10)
  - if u8c@+0x00 != 0:
    - u32c @+0x24
    - string @+0x28 (vtable+0x38, max 0x800)
    - u32c @+0x3C
    - string @+0x40 (vtable+0x38, max 0x800)
  - else:
    - string @+0x60 (vtable+0x38, max 0x800)
- Packet_ID_A9_read_structC3 @ 0x101182F0:
  - u32c @+0x00
  - string @+0x04 (vtable+0x38, max 0x800)
  - u32c @+0x18
  - string @+0x1C (vtable+0x38, max 0x800)
  - bit  @+0x3C
  - u32c @+0x40, @+0x44, @+0x48, @+0x4C, @+0x50, @+0x54, @+0x58
  - u8c  @+0x5C
- Packet_ID_A9_read_structD @ 0x10119030:
  - u32c @+0x04
  - u32c @+0x08
  - u8c @+0x0B4, @+0x0B5, @+0x0B6
  - u8c @+0x0C
  - string @+0x0D (vtable+0x38, max 0x800)
  - string @+0x29 (vtable+0x38, max 0x800)
  - u32c @+0x0AC (sub_10246F10)
  - u32c @+0x0B0
  - Packet_ID_A9_read_structD_sub_10C @+0x10C (u32c count + structC3 list)
  - bit  @+0x00
  - if bit@+0x00 != 0: Packet_ID_A9_read_structD_sub_B8 @+0x0B8
  - else: Packet_ID_A9_read_structD_sub_F8 @+0x0F8
- Packet_ID_A9_read_structD_sub_B8 @ 0x10118B00:
  - u32c count; repeat: Packet_ID_A9_read_structC2
- Packet_ID_A9_read_structD_sub_F8 @ 0x10118DE0:
  - u16c @+0x00
  - u16c @+0x02
  - u8c count; repeat: Packet_ID_A9_read_structC2
- Packet_ID_A9_read_structD_sub_10C @ 0x10118F50:
  - u32c count; repeat: Packet_ID_A9_read_structC3
- Packet_ID_A9_read_structD_list @ 0x1011AC50:
  - u16c @+0x02
  - u16c @+0x00
  - u32c count; repeat: Packet_ID_A9_read_structD

#### Packet_ID_PLAYER2PLAYER (ID -86) - server->client

Read: Packet_ID_PLAYER2PLAYER_read @ 0x100CC8E0 (decomp); handler: 0x10198840.

RTTI/vtable: .?AVPacket_ID_PLAYER2PLAYER@@ (TypeDescriptor @ 0x103546A0), vtable @ 0x102CA0A0; ctor @ 0x100CC840 sets ID 0xAA.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x434 (sub_1000C990).
- u8c  @+0x438 (type; switch on type-1).

Type map (type value => extra reads):
- type 2: bits(2048) @+0x439, then u32c @+0x450.
- type 3: bits(2048) @+0x439.
- type 4: bits(2048) @+0x439.
- type 5: bits(2048) @+0x439.
- type 6: bits(2048) @+0x439.
- type 7: ItemsAdded_entry_read @+0x454.
- type 8: ItemsAdded_entry_read @+0x454.
- type 9: ItemsAdded_entry_read @+0x454.
- type 10: ItemsAdded_entry_read @+0x454.
- type 11: u32c @+0x480.
- type 14: bit @+0x484.

Note: types 12 and 13 fall through default (no extra reads observed).

Handler case map (type => handler actions; HandlePacket_ID_PLAYER2PLAYER @ 0x10198840):
- type 3: Window id 0x2E via CWindowMgr_GetWindowById; sub_10144C00(window, pkt+0x54C).
- type 4: Window id 0x2E via CWindowMgr_GetWindowById; sub_10144850(window, pkt+0x54C).
- type 8: Window id 0x30 via CWindowMgr_GetWindowById; sub_10197C50(tmp, pkt+0x54C) then sub_1015C2B0(window, pkt+0x330).
- type 13: Window id 0x30 via CWindowMgr_GetWindowById; sub_10193460(window, pkt+0x84).
- type 15: g_LTClient->vtbl+0x58 (id 3) -> sub_10055A00(pkt+0x60); Window id 0x13 via CWindowMgr_GetWindowById; sub_10169540(window, 6); window vtbl+4 call (args 5,0,0); sub_1005A570(g_103BF6F4, 0x13).
- default (types 5-7,9-12,14): no extra action beyond cleanup.

#### Packet_ID_AC (ID -84) - server->client (name TBD)

Read: Packet_ID_AC_read @ 0x100D4960 (decomp); handler: 0x10195EE0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- u32c @+0x438 (sub_1000C990).

Type map (type value => extra reads):
- type 0: sub_1026BE70 @+0x43C.
- type 1: u16c @+0x44C.
- type 2: u16c @+0x44C.
- type 3: u16c @+0x44C, then sub-switch on that u16c:
  - case 510: Packet_ID_A5_read_struct1 @+0x450; Packet_ID_A5_read_struct2 @+0x5C8; u32c @+0x620,@+0x624,@+0x628.
  - case 511: u32c @+0x624.
  - case 512: u32c @+0x620,@+0x624; u16c @+0x660; ItemEntryWithId @+0x630.
  - case 516: u32c @+0x620,@+0x624; bit @+0x62C.
  - case 501: u16c @+0x660; bit @+0x62C; Read_6x4BitFlags @+0x662.
- type 4: u16c @+0x44C, then sub-switch on that u16c:
  - case 510: bit @+0x62C; if 0 -> u32c @+0x628.
  - case 511/516: bit @+0x62C.
  - case 512: bit @+0x62C; bit @+0x62D; u32c @+0x628.

Note: case mapping via tables @0x100D4BD8/@0x100D4BFC (u16 opcode minus 501, 16 cases). Only 501/510/511/512/516 are handled; others fall through default.

#### Packet_ID_AF (ID -81) - server->client (name TBD)

Read: Packet_ID_AF_read @ 0x10144ED0 (decomp); handler: 0x101994B0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-3).

Type map (type value => extra reads):
- type 3/4: sub_10056AC0 @+0x43C.
- type 5: u8c @+0x44C + bit @+0x44D.
- type 6: u32c @+0x438 + bits(2048) @+0x44E.
- type 7/10/14/16: u32c @+0x438.
- type 8: sub_10055080 @+0x658; bits(2048) @+0x456; Packet_ID_FACTION_read_listA @+0x94C.
- type 9: sub_10055080 @+0x658; bits(2048) @+0x456.
- type 11: u32c @+0x438 + bits(2048) @+0x8F0.
- type 12/13: sub_100530B0 @+0x904.
- type 15: ItemsAdded payload @+0x928 (sub_102404E0) + bit @+0x44D.

#### Packet_ID_B0 (ID -80) - server->client (name TBD)
Read: Packet_ID_B0_read @ 0x10056B80 (decomp); handler: 0x101996D0.
Write: Packet_ID_B0_write @ 0x10051940 (decomp); ctor: Packet_ID_B0_Ctor @ 0x100520D0; dtor: Packet_ID_B0_dtor @ 0x10055F80.
Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1/2: u32c @+0x438.
- type 3: bit @+0x43C.
- type 4: Packet_ID_AF_B0_read_listA @+0x440.
- type 5: u32c @+0x438; if zero -> bits(2048) @+0x450.
- type 6: u32c @+0x438; bits(2048) @+0x450.
- type 8: u32c @+0x464.
- type 9: Packet_ID_B0_read_listB @+0x468.

Note: type 7 falls through default (no extra reads observed).

#### Packet_ID_B1 (ID -79) - server->client (name TBD)

Read: Packet_ID_B1_read @ 0x100B76E0 (decomp); handler: 0x10198D70.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1: u16c @+0x480; bits(2048) @+0x440; bits(2048) @+0x454.
- type 2: u16c @+0x480; u16c @+0x482; Packet_ID_B1_read_listA @+0x468.
- type 3: u32c @+0x43C; bits(2048) @+0x440.
- type 5/9: Packet_ID_B1_read_listA @+0x468.
- type 6/7/12: u32c @+0x438.
- type 10/11: u32c @+0x438 + u32c @+0x43C.
- type 13: u32c @+0x438 + u32c @+0x43C + u8c @+0x484.
- type 15/17: Packet_ID_B1_read_listB @+0x488.
- type 18: u32c @+0x43C.

Note: types 4,8,14,16 fall through default (no extra reads observed).

#### Packet_ID_B2 (ID -78) - server->client (name TBD)

Read: Packet_ID_B2_read @ 0x10039780 (decomp); handler: 0x101901F0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1: u32c @+0x438.
- type 2: u32c @+0x438 + u32c @+0x43C.
- type 3: u32c @+0x438.
- type 4: u32c @+0x438 + u8c @+0x440.

Packet_ID_AF/B0 helper layouts:
- Packet_ID_AF_read_structA @ 0x100530B0:
  - u32c @+0x00
  - string @+0x04 (vtbl+0x38, max 0x800)
- Packet_ID_AF_B0_read_listA @ 0x10056AC0:
  - u8c count; repeat: Apartment_Read
- Read_Vector_RankPermission @ 0x10054FA0:
  - u8c count; repeat: u8c + bit
- Read_Map_U32_String @ 0x10054CE0:
  - u32c count; repeat: u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian) + string
- Apartment_Read @ 0x10055080 (fields in order):
  - u32c @+0x00
  - u8c  @+0x04
  - u32c @+0x08
  - u32c @+0x0C
  - Read_Vector_RankPermission @+0x10
  - bit  @+0x60
  - string @+0x20 (vtbl+0x38, max 0x800)
  - string @+0x58 (vtbl+0x38, max 0x800)
  - ItemsAdded payload @+0x34 (sub_102404E0)
  - bit  @+0x61
  - u32c @+0x294
  - string @+0x62 (vtbl+0x38, max 0x800)
  - string @+0x7A (vtbl+0x38, max 0x800)
  - Read_Map_U32_String @+0x27C
  - bit  @+0x28C
  - bit  @+0x28D
  - u32c @+0x290
- Packet_ID_B0_read_listB @ 0x10055200:
  - u32c @+0x04
  - u32c @+0x00
  - u32c count
  - repeat entry (size 0x2C):
    - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
    - bit
    - u16c (BitStream_ReadBitsCompressed 16; endian swap if Net_IsBigEndian)
    - ItemStructA_read
    - string (vtbl+0x38, max 0x800)

Packet_ID_B1 helper layouts:
- Packet_ID_B1_read_listA @ 0x100B75C0:
  - u32c @+0x00
  - u32c @+0x04
  - u32c count; repeat: Packet_ID_B1_read_entryA
- Packet_ID_B1_read_entryA @ 0x100B58D0:
  - u32c @+0x00
  - u32c @+0x04
  - string @+0x08 (vtbl+0x38, max 0x800)
  - u32c @+0x1C
  - string @+0x20 (vtbl+0x38, max 0x800)
  - u32c @+0x40
  - string @+0x44 (vtbl+0x38, max 0x800)
  - u32c @+0x58
  - string @+0x5C (vtbl+0x38, max 0x800)
  - u32c @+0x7C
  - Packet_ID_B1_read_entryA_list @+0x80
- Packet_ID_B1_read_entryA_list @ 0x100B5850:
  - u32c count; repeat: Packet_ID_B1_read_entryB
- Packet_ID_B1_read_entryB @ 0x100B4E90:
  - u32c @+0x00
  - string @+0x04 (vtbl+0x38, max 0x800)
  - u32c @+0x18
  - string @+0x1C (vtbl+0x38, max 0x800)
  - u8c  @+0x3C, @+0x3D, @+0x3E
  - u32c @+0x40
  - u32c @+0x44
  - u8c  @+0x48
- Packet_ID_B1_read_listB @ 0x100B5A60:
  - u8c count; repeat: Packet_ID_B1_read_entryC
- Packet_ID_B1_read_entryC @ 0x100B4DD0:
  - u32c @+0x00
  - string @+0x04 (vtbl+0x38, max 0x800)
  - bit  @+0x18
  - u32c @+0x1C
  - bit  @+0x20
  - u32c @+0x24
  - bit  @+0x28

#### Packet_ID_B5 (ID -75) - server->client (name TBD)

Read: Packet_ID_B5_read @ 0x101273D0 (decomp); handler: 0x10199820.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1: Packet_ID_B5_read_list @+0x500.
- type 2: Packet_ID_B5_read_entry @+0x43C.
- type 3/7/13: Packet_ID_B5_read_entry_list @+0x0E24.
- type 4: Packet_ID_B5_read_entry2 @+0x510.
- type 6/8/9: u32c @+0x438.
- type 11: Packet_ID_B5_read_entry_list @+0x0E24; Packet_ID_B5_read_extra_list @+0x0E34.
- type 12: u32c @+0x438; u8c @+0x0E44.

Note: other types fall through default (no extra reads observed).

Packet_ID_B5_read_list @ 0x101272E0:
- u16c count (sub_1000C9F0).
- repeat count: Packet_ID_B5_read_entry @ 0x100FF8D0.

Packet_ID_B5_read_entry @ 0x100FF8D0 (fields in order):
- u32c @+0x00 (sub_1000C990).
- u8   @+0x04 (BitStream_ReadBitsCompressed via sub_101C9AA0, 8 bits).
- u32c @+0x08 (sub_1000C990).
- u16c @+0x0C (sub_1000C9F0).
- Read_QuantVec3_9bit @+0x10 (sub_1026BE70).
- Read_BitfieldBlock_0x30 @+0x20 (sub_10257770).
- u8   @+0x52 (sub_101C9AA0, 8 bits).
- u16c @+0x54 (sub_1000C9F0).
- u8   @+0x56 (sub_101C9AA0, 8 bits).
- bits(2048) @+0x57 (ReadBits_2048 via vtbl+0x38).
- bit @+0x97, bit @+0x98, bit @+0x99 (3 single bits, manual read).
- u32c @+0x9C (sub_1000C990).
- bits(2048) @+0xA0 (ReadBits_2048 via vtbl+0x38).
- Packet_ID_B5_read_entry_list @+0x0B4 (sub_100FF800).

Read_QuantVec3_9bit @ 0x1026BE70:
- Read_QuantVec3 @ 0x10272500 (quantized vec3 using bit-width in struct[0]).
- bits(9) -> struct+0x0C (BitStream_ReadBits).

Read_QuantVec3 @ 0x10272500:
- If bitwidth >= 0x10: read 3x u16c via sub_1010F760 into +0x4/+0x6/+0x8.
- Else: read 3x BitStream_ReadBits(bitwidth) into +0x4/+0x6/+0x8, then for each component read 1 sign bit (BitStream_ReadBit); if sign set, negate.

Read_BitfieldBlock_0x30 @ 0x10257770 (bit lengths, in order):
- bits 1,1,5,5,32,5,6,4,12,12,12 (dest+0x00..0x14).
- if BitStream_ReadBit == 1: bits 12 x9 (dest+0x16..0x26).
- bits 1,1,1,1 (dest+0x28,0x2A,0x2C,0x2E).

Packet_ID_B5_read_entry_list @ 0x100FF800:
- u16c count (sub_1000C9F0).
- repeat count: Packet_ID_B5_read_entry2 @ 0x100FD880.

Packet_ID_B5_read_entry2 @ 0x100FD880 (fields in order):
- u32c @+0x00 (sub_1000C990).
- bits(2048) @+0x04.
- Packet_ID_B5_read_entry2_subA @+0x44.
- u16c @+0x90 (sub_1000C9F0).
- u16c @+0x92 (sub_1000C9F0).
- bit @+0x94.
- u32c @+0x98 (sub_1000C990).
- bits(2048) @+0x9C.
- u32c @+0x8FC (sub_1000C990).
- bits(2048) @+0x900.
- bit @+0x8EC, bit @+0x8ED.
- bits(2048) @+0x0DC.
- Packet_ID_B5_read_entry2_map @+0x8F0.
- u32c count (sub_1000C990) -> loop:
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix via sub_101CA080 if needed).
  - Read_Substruct_10249E10 + Read_Substruct_102550A0.
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix).
  - insert via sub_100FD790 into container @+0x8DC.

Packet_ID_B5_read_entry2_subA @ 0x100FCA80 (fields in order):
- u8  @+0x00 (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x01 (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x02 (BitStream_ReadBitsCompressed 8 bits).
- u16c @+0x04 (sub_1000C9F0).
- u8  @+0x06 (BitStream_ReadBitsCompressed 8 bits).
- u32c @+0x08 (sub_1000C990).
- bits(2048) @+0x0C.

Packet_ID_B5_read_entry2_map @ 0x100FD370:
- u32c count (sub_1000C990).
- repeat count:
  - u32c key (BitStream_ReadBitsCompressed 0x20; endian swap if Net_IsBigEndian).
  - bits(2048) string (vtbl+0x38, max 0x800).
  - insert/lookup via Packet_ID_B5_entry2_map_get_or_insert @ 0x100FD1A0, then assign string.

Packet_ID_B5_read_extra_list @ 0x101261D0:
- u32c count (sub_1000C990).
- repeat count: Packet_ID_B5_read_extra_list_entry @ 0x10125E90.

Packet_ID_B5_read_extra_list_entry @ 0x10125E90 (fields in order):
- u32c @+0x00 (sub_1000C990).
- bit  @+0x04.
- bit  @+0x05.

Read_Substruct_10249E10 @ 0x10249E10 (fields in order):
- u32c @+0x00.
- u8  @+0x04 (BitStream_ReadBitsCompressed 8 bits).
- u32c @+0x08.
- u8  @+0x0C (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x0D (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x0E (BitStream_ReadBitsCompressed 8 bits).

Read_Substruct_102550A0 @ 0x102550A0 (fields in order):
- u32c @+0x00.
- Packet_ID_MARKET_read_structA @+0x04.

#### Packet_ID_B6 (ID -74) - server->client (name TBD)

Read: Packet_ID_B6_read @ 0x101491E0 (decomp); handler: 0x101981F0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1/3: u32c @+0x438.
- type 2: Packet_ID_B6_read_structB @+0x4F8; bit @+0x5B4; if u16@+0x4FC == 0x3E0 -> Packet_ID_B6_read_structD @+0x594 + Packet_ID_B6_read_structA @+0x440; if == 0x3E2 -> Packet_ID_B6_read_structA @+0x440.
- type 4: Packet_ID_B6_read_structB @+0x4F8; bit @+0x5B4; Packet_ID_B6_read_structC @+0x5B8.
- type 5: Packet_ID_B6_read_structB @+0x4F8.
- type 6/7/8: u32c @+0x438 + u32c @+0x43C.

Packet_ID_B6_read_structA @ 0x10147C70 (fields in order):
- u32c @+0x00.
- u32c @+0x08.
- u32c @+0x0C.
- u32c @+0x10.
- sub_1000D870 @+0x34.
- bits(2048) @+0x14.
- u32c @+0xB0.
- u32c @+0xB4.
- sub_10246F10 @+0x04.

Packet_ID_B6_read_structB @ 0x10147CF0 (fields in order):
- u32c @+0x00.
- u16c @+0x04.
- bits(2048) @+0x07.
- u8   @+0x06 (BitStream_ReadBitsCompressed 8 bits).
- Read_u16c_x6 @+0x88.
- Read_6BitFlags @+0x94 (6 single bits -> +0x94..+0x99).

Packet_ID_B6_read_structC @ 0x101487A0 (fields in order):
- u32c @+0x00.
- u32c @+0x14.
- u32c @+0x18.
- u32c @+0x1C.
- sub_10246F10 @+0x20.
- u32c count -> loop:
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix via sub_101CA080 if needed).
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix).
  - bit flag (1 bit).
  - bits(2048).
  - sub_10246F10 (struct).
  - insert via sub_10148650 into list @+0x04.

Packet_ID_B6_read_structD @ 0x10149050 (fields in order):
- u32c count -> list of u32 (BitStream_ReadBitsCompressed 0x20) inserted into vector @+0x00.
- u32c count -> list of entries:
  - Packet_ID_B6_read_structD_entry @ 0x10148570.
  - insert via sub_10148FC0 into list @+0x10.

Packet_ID_B6_read_structD_entry @ 0x10148570 (fields in order):
- u32c @+0x00.
- bits(2048) @+0x04.
- u32c count -> list of u32 (BitStream_ReadBitsCompressed 0x20) inserted into vector @+0x24.

#### Packet_ID_FRIENDS (ID -105) - server->client

Read: Packet_ID_FRIENDS_read @ 0x100AD7D0 (decomp); handler: 0x10182CC0.

Fields (read order):
- u8c  @+0x438 (type).
- if type in {3,7}: list via sub_100A7950:
  - u16c count (sub_1000C9F0).
  - repeat count: FriendEntry (sub_100A0C90, size 0x140/320 bytes), read order:
    - u32c @+0x00
    - u8c  @+0x04
    - u32c @+0x08
    - u8c  @+0x0C
    - bits(2048) @+0x0D (raw 256-byte block; string0)
    - u32c @+0x50
    - u8c  @+0x9C
    - bits(2048) @+0x9D (raw 256-byte block; string1)
    - bits(2048) @+0x54 (raw 256-byte block; string2)
      - copies 0x14 bytes from +0x54 to +0x68 and lowercases.
    - bits(2048) @+0x7C (raw 256-byte block; string3)
    - status list @+0xC0 via sub_1000D870:
      - u32c
      - repeat 10x sub_1000D730 (12-byte record; guarded by 1-bit present flag):
        - u16c, u8c, u8c, bits(7), bits(7), bits(9), u8c, u8c, u8c
    - u8c  @+0x13C
- else (type not 3/7):
  - u32c @+0x430
  - u32c @+0x434
  - bits(2048) @+0x439 (raw 256-byte block; string)

#### Packet_ID_STORAGE (ID -103) - server->client

Read: Packet_ID_STORAGE_read @ 0x10032940 (decomp); handler: 0x10197F90.

Fields (read order):
- u32c @+0x430
- u32c @+0x434 (op)
- switch op:
  - 2:
    - ItemsAdded payload @+0x43C (sub_102404E0).
    - ItemsAdded payload @+0x460 (sub_102404E0).
    - bit flag @+0x484 (sub_100328E0).
  - 3:
    - u32c @+0x438
  - 5 or 7:
    - ItemsAdded payload @+0x43C (sub_102404E0).
  - 9:
    - struct @+0x488 via Packet_ID_STORAGE_read_structA @ 0x1023C1E0 (decomp):
      - ItemsAdded payload @+0x00 (sub_102404E0)
      - Packet_ID_STORAGE_structA_read_blockA_12 @ 0x10275730 @+0x24 (12x {bit + ItemEntryWithId}, stride 0x30)
      - Packet_ID_STORAGE_structA_read_blockB_3 @ 0x10275480 @+0x264 (3x {bit + ItemEntryWithId}, stride 0x30)
      - Packet_ID_STORAGE_structA_read_blockC_6 @ 0x10275960 @+0x2F8 (6x {bit + ItemEntryWithId}, stride 0x30)
      - ItemsAdded payload @+0x418 (sub_102404E0)

Write: Packet_ID_STORAGE_write @ 0x10031C30 (decomp).

- u32c @+0x430, u32c @+0x434 (op), then mirrors the same switch layout (ItemsAdded payloads / bit / structA).

Note: ItemsAdded payload header fields baseUsedCount/capacity are used by helper funcs; unk24/unk28 still not referenced in CShell.

#### Packet_ID_MINING (ID -102) - server->client

Read: Packet_ID_MINING_read @ 0x101101A0 (decomp); handler: 0x10195DA0.

Fields (read order):
- u32c @+0x430
- u8c  @+0x434 (type)
- switch type:
  - 0 or 2: u16c @+0x43C
  - 1: entries via Packet_ID_MINING_read_list @ 0x10110040 (decomp), then u16c @+0x43C
    - Packet_ID_MINING_read_list: u32c count; repeat count:
      - u16c
      - u16c
      - u32c
  - 3: u32c @+0x438

#### Packet_ID_SPLIT_CONTAINER (ID -94) - server->client

Read: Packet_ID_SPLIT_CONTAINER_read @ 0x1010ADC0 (decomp); handler: 0x1018EF60.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x434 (sub_1000C990).
- u16c @+0x438 (sub_1000C9F0).
- ItemEntryWithId @+0x43C (sub_102550A0).
- u8c  @+0x43A (sub_101C9AA0; read after ItemEntryWithId).

#### Packet_ID_REPAIR_ITEM (ID -83) - server->client

Read: Packet_ID_REPAIR_ITEM_read @ 0x10167A00 (decomp); handler: 0x1018FD60.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x434 (sub_1000C990).
- bit  @+0x438 (flag).

#### Packet_ID_RECYCLE_ITEM (ID -82) - server->client

  Read: inline in handler (0x1018FFC0) after sub_1000C6C0.

  Fields (read order):
  - u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
  - u32c @+0x434 (sub_1000C990).

#### Packet_ID_TRANSFER_ITEMS (ID unknown) - status

  CShell RTTI present but no handler/dispatch/vtable usage found.

  - TypeDescriptor @ 0x1035465C (name "Packet_ID_TRANSFER_ITEMS").
  - CompleteObjectLocator @ 0x10329F90; vtable slot @ 0x10329FC8 appears zeroed.
  - No xrefs to string in CShell; no "TRANSFER_ITEMS" in FoM *.dll/*.exe via rg (only in CShell IDB).

#### Packet_ID_GROUP (FoM-only) - status

  - Not present in FoM binaries (no "Packet_ID_GROUP" in FoM *.dll/*.exe).
  - Present in FoM CShell.dll RTTI strings; treat as FoM baseline only and re-locate/verify in FoM before reuse.

#### Outbound weapon packets (client->server)

Note: dispatcher has no inbound cases for -121/-111; only outbound send paths found (Packet_ID_WEAPONFIRE still has read/write vtable methods).

Packet_ID_WEAPONFIRE (ID -121) send: sub_101A0900.

- u32c (BitStream_Write_u32c @ 0x10031AB0) = sub_100079B0(91).
- u16c (sub_1000CD70) = sub_100079B0(12350).
- u32c (BitStream_Write_u32c @ 0x10031AB0) = sub_101C5080 counter (1..100).

Packet_ID_RELOAD (ID -111) send: sub_101C52E0.

- u32c @+0x430 = sub_100079B0(91).
- bit flag @+0x434 (write via sub_101C9310/92D0).
- if flag==0: u32c @+0x438 and u32c @+0x43C.

#### ItemEntry / list helpers (shared)

ItemEntry / ItemStructA (ItemStructA_read @ 0x10254F80):
- u16c @+0x00 templateId.
- u16c @+0x02 stackCount (ammo/charges/quantity).
- u16c @+0x04 ammoOverrideId (if 0, fallback to template ammo id).
- u16c @+0x06 durabilityCur (used by Item_GetDurabilityPercent; ItemStructA_IsValid requires nonzero).
- u8  @+0x08 durabilityLossPct (default 100; tooltip 6058).
- u8  @+0x09 bindState (0 none, 1 secured, 2 bound, >=3 special bound).
- u32c @+0x0C identityKeyA (unknown).
- u32c @+0x10 u32_tooltipValue (unknown; used in tooltip logic).
- u32c @+0x14 identityKeyB (unknown).
- u8  @+0x18 qualityBonusPct (0..100; applied to select stat ids).
- u8  @+0x19 qualityTier (stringId 29991 + value).
- u8  @+0x1A variantIndex (variant lookup).
- u8  @+0x1B..+0x1E variantRoll/identity blob (serialized as 4 bytes; unknown).
Tooltip usage (BuildItemTooltip @ 0x1010C330) uses ItemEntryWithId offsets (u32 entryId + ItemStructA):
- @+0x04 = templateId (template lookup + display name).
- @+0x06 = stackCount / ammo/charges (ammo/charges strings).
- @+0x08 (u16) = ammoOverrideId (if 0, fallback to template @+0x30).
- @+0x0A (u16) = durabilityCur (Item_GetDurabilityPercent + repair costs); cases 1/8/9 treat as duration seconds (FormatDuration_MinSec).
- @+0x0C (u8) = durabilityLossPct (%/100).
- @+0x0D (u8) = bindState (0 none,1 secured,2 bound,>=3 special bound).
- @+0x1B..+0x1E (u32) = variantRoll/identity blob (serialized bytes; not mapped).
- @+0x1C (u8) = qualityBonusPct.
- @+0x1D (u8) = qualityTier.
- @+0x1E (u8) = variantIndex used in variant lookup (ItemTemplate_CopyVariantByIndex).
- 6036 (0x1794) Durability: %1!s!
- 6037 (0x1795) Damage Radius: %1!u! m
- 6038 (0x1796) Attack Delay: %1!s! s
- 6039 (0x1797) Range: %1!u! m
- 6040 (0x1798) Ammo Count: %1!u!/%2!u!
- 6041 (0x1799) Required Ammo: %1!s!
- 6042 (0x179A) %1!u!/%2!u! Bullets
- 6043 (0x179B) %1!u!/%2!u! Charges
- 6058 (0x17AA) Durability Loss Factor: x%1!s!

ItemEntryWithId (ItemEntryWithId_read @ 0x102550A0):
- u32c entryId (sub_1000C990) + ItemEntry/ItemStructA (ItemStructA_read @ 0x10254F80).

ItemEntryWithId_write: sub_10255040 (u32c + ItemStructA_write @ 0x10254D40).

ItemStructA_read @ 0x10254F80 field order (sizes):
- u16c x4 @+0x00/+0x02/+0x04/+0x06
- u8  x2 @+0x08/+0x09
- u32c x3 @+0x0C/+0x10/+0x14
- u8  x3 @+0x18/+0x19/+0x1A
- u8  x4 @+0x1B..+0x1E

ItemStructAWithName_read @ 0x10053130:
- u32c header + bit flag @+0x04 + u16c @+0x06 + ItemStructA @+0x08 + string(2048) @+0x28.

ItemStructAPlus_u32_u16_u32_read @ 0x100C8920:
- ItemStructA + u32c @+0x20 + u16c @+0x24 + u32c @+0x28.

ItemStructAPlus_u32_u32_u32_read @ 0x1025FF80:
- ItemStructA + u32c @+0x20 + u32c @+0x24 + u32c @+0x28.

ItemsAdded payload (ItemList_Read @ 0x102404E0 / ItemsAdded_payload_write @ 0x1023D2C0):
- u16c baseUsedCount @ +0x00 (adds into used count; see helpers).
- ItemsAddedEntryVec header @ +0x04 (size 0x10):
  - +0x04 unk0
  - +0x08 begin
  - +0x0C end
  - +0x10 capacity
- u32c capacity / unk24 / unk28 @ +0x14/+0x18/+0x1C (3x u32c via sub_1000C990).
- entryCount is written as (end - begin) / 44 and read as u16c.
- repeat entryCount times: ItemsAddedEntry_Read @ 0x1023E3B0 / ItemsAddedEntry_Write @ 0x1023CDF0:
  - ItemStructA @ +0x00 (0x20 bytes).
  - VariantIdSetHeader @ +0x20 (0x0C bytes): u32 comp, u32 head, u32 nodeCount.
  - variantIdCount is serialized as u16; each variantId is a u32 stored in the RB-tree rooted at +0x20.

IDA structs:
- ItemsAddedPayload (size 0x20): baseUsedCount:u16, pad, entries:ItemsAddedEntryVec, capacity:u32, unk24:u32, unk28:u32.
- ItemsAddedEntry (size 0x2C): item:ItemStructA(0x20) + variantIdSet:VariantIdSetHeader(0x0C).
- ItemsAddedEntryVec (size 0x10): unk0:u32, begin/end/capacity pointers.

Helpers (CShell):
- ItemsAddedPayload_GetUsedCount @ 0x1023CEE0 (baseUsedCount + sum(entry.variantIdSet.nodeCount))
- ItemsAddedPayload_GetRemainingCapacity @ 0x1023D120 (capacity - used, clamped)
- ItemsAddedPayload_GetVariantCountByItemType @ 0x1023CF40
- ItemsAddedPayload_GetVariantCountByTemplateId @ 0x1023D020
- ItemsAddedPayload_FindEntryByItemStructA @ 0x1023D1A0
- ItemsAddedPayload_FindEntryByVariantId @ 0x1023DE50

### Data (globals / vtables)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102C116C | 0x002C116C | CGameClientShell_vftable | Vtable for CGameClientShell | RTTI + decomp | high |
| 0x103BF6F0 | 0x003BF6F0 | g_pGameClientShell | Global pointer set in ctor | decomp + xrefs | high |
| 0x1035C188 | 0x0035C188 | g_IClientShell_Default_Reg | IClientShell.Default registration struct | decomp + xrefs | high |
| 0x103C3FA8 | 0x003C3FA8 | g_ItemTemplateById | Item template pointer array (indexed by itemId) | xrefs + disasm | high |
| 0x102CDEAC | 0x002CDEAC | CInventoryClient_vftable | Vtable for CInventoryClient | RTTI + decomp | high |
| 0x102CED90 | 0x002CED90 | Packet_ID_UPDATE_vftable | Vtable for Packet_ID_UPDATE (read/write) | RTTI + disasm | med |
| 0x102CEDA0 | 0x002CEDA0 | Packet_ID_WEAPONFIRE_vftable | Vtable for Packet_ID_WEAPONFIRE (read/write) | RTTI + disasm | med |
| 0x102CA0A0 | 0x002CA0A0 | Packet_ID_PLAYER2PLAYER_vftable | Vtable for Packet_ID_PLAYER2PLAYER (read/write) | RTTI + disasm | med |
| 0x101B4510 | 0x001B4510 | g_AudioEventQueue | Global audio event queue/context used by AudioEvent_Enqueue | decomp + xrefs | low |

### CharFlags System (CShell.dll)

Character flags bitmask stored at SharedMem[0x1EA43]:

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1018B2D0 | 0x0018B2D0 | CharFlags_CheckFlag | Checks if flag bit is set in SharedMem[0x1EA43] | decomp | high |
| 0x1018B2F0 | 0x0018B2F0 | CharFlags_SetFlag | Sets flag bit (OR operation) in SharedMem[0x1EA43] | decomp | high |
| 0x1018B320 | 0x0018B320 | CharFlags_ClearFlag | Clears flag bit (AND NOT) in SharedMem[0x1EA43] | decomp | high |
| 0x1018B350 | 0x0018B350 | CharFlags_ClearAll | Clears all flags (writes 0) to SharedMem[0x1EA43] | decomp | high |

Known CharFlags bits:
- **Bit 2 (0x2) = CF_SPLIT_PENDING**: Set when item split request sent (Item_SendSplitRequest @ 0x1010AF10), cleared on response (PacketHandler_ID_SPLIT_CONTAINER @ 0x1018EF60). Prevents double-clicking item split dialog.

### StatGroup System (CShell.dll encrypted stats)

Encrypted variable manager stores game stats in indexed groups. Write via `StatGroup_WriteByIndex`, read via `StatGroup_Read`.

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101C32F0 | 0x001C32F0 | StatGroup_Read | Reads encrypted stat from StatGroup[index] into buffer | decomp | high |
| 0x101C3BD0 | 0x001C3BD0 | StatGroup_WriteByIndex | Writes value to StatGroup[index] | decomp | high |
| 0x101C3160 | 0x001C3160 | StatGroup_WriteGroup | Writes entire group buffer (15 floats) | decomp | high |
| 0x101C32C0 | 0x001C32C0 | StatGroup_GetPtr | Gets pointer to StatGroup[index] data | decomp | med |

StatGroup index meanings (confirmed by xrefs):

| Index | Purpose | Write Function | Read Usage | Evidence |
|---|---|---|---|---|
| 1 | Player stats array (level, camera mode, etc) | - | Player_CheckLevelCap, ClientGame_Update | decomp |
| 2 | Movement/input flags | EncVar_WriteStatGroup2 @ 0x1019E470 | Recoil_ApplyStatGroup2, PlayerInput_UpdateAndSend | decomp |
| 3 | Nearby object type (vehicle state) | EncVar_WriteStatGroup3 @ 0x1019E590 | Player_UpdateNearbyObjects | decomp |
| 4 | Movement speed multiplier (stamina-based) | EncVar_WriteStatGroup4 @ 0x1019E5B0 | PlayerInput_UpdateAndSend | decomp |
| 5 | AccountType (0=FREE, 1=BASIC, 2=PREMIUM, 3=ADMIN) | EncVar_WriteAccountType @ 0x1018C480 | Player_GetAccountType @ 0x10032D40 | decomp |
| 6 | IsFullAccount flag (enables premium features) | EncVar_WriteIsFullAccount @ 0x1018C4A0 | Player_IsFullAccount @ 0x10036BF0 | decomp |
| 7 | Unknown (reset to 0 in PlayerStats_Reset) | EncVarMgr_WriteStatGroup7 @ 0x100598B0 | - | decomp |
| 8 | Unknown | EncVar_WriteStatGroup8 @ 0x101BFEE0 | - | decomp |

StatGroup 2 (movement flags) is also used by:
- Player_OnDeath @ 0x101A2980: resets to 0
- PlayerInput_UpdateAndSend @ 0x101A2CE0: sets movement bits from input

StatGroup init in StatGroupMgr_InitGroups @ 0x101C3E50 shows type codes:
- Index 0: type 0 (int)
- Index 1: type 2 (array)
- Index 2: type 6 (flags)
- Index 3: type 0 (int)
- Index 4: type 4 (float)
- Index 5: type 4 (float) - AccountType
- Index 6: type 1 (bool) - IsFullAccount
- Index 7: type 1 (bool)
- Index 8: type 1 (bool)

### SharedMem Index Reference (CShell.dll)

Key SharedMem indices used by LOGIN_RETURN and world login:

| Index | Hex | Purpose | Set By |
|---|---|---|---|
| 0x1 | 0x1 | defaultWorldId (starmap UI) | LOGIN_RETURN handler |
| 0x54 | 0x54 | Login complete flag | LOGIN_RETURN handler |
| 0x5A | 0x5A | noCharacter flag (1=needs creation) | LOGIN_RETURN handler |
| 0x5B | 0x5B | playerId | LOGIN_RETURN handler |
| 0x77 | 0x77 | apartmentWorldSelect | WorldSelect_ApplyApartmentInfo |
| 0x78 | 0x78 | apartmentId (1..24) | WorldSelect_ApplyApartmentInfo |
| 0x1CEC2 | 118466 | World login state (0-3) flag | GameState_EnterGameplay |
| 0x1D2AD | 119469 | Float (pitch?) | PlayerStats_Reset |
| 0x1D698 | 120472 | Movement key W | PlayerInput_UpdateAndSend |
| 0x1D699 | 120473 | Movement key S | PlayerInput_UpdateAndSend |
| 0x1D69A | 120474 | Movement key A | PlayerInput_UpdateAndSend |
| 0x1D69B | 120475 | Movement key D | PlayerInput_UpdateAndSend |
| 0x1D6A5 | 120485 | Float (stamina current?) | ClientGame_Update |
| 0x1D6A6 | 120486 | Float (stamina max=250.0) | PlayerStats_Reset |
| 0x1D6A7 | 120487 | Unknown dword | PlayerStats_Reset |
| 0x1D6A8 | 120488 | Flag (=1 on reset) | PlayerStats_Reset |
| 0x1D6A9 | 120489 | Flag | Player_OnDeath |
| 0x1DA94 | 121492 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1DE7E | 122494 | hasCharFlags from LOGIN_RETURN | LOGIN_RETURN handler |
| 0x1DE7F | 122495 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1E269 | 123497 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1E653 | 124499 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1EA3E | 125502 | Unknown dword | PlayerStats_Reset |
| 0x1EA43 | 125507 | CharFlags bitmask | CharFlags_* functions |
| 0x1EA44 | 125508 | CharState (inventory unlock) | InventoryClient_Ctor |
| 0x1EA48 | 125512 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1EEBE | 126654 | Flag | Player_OnDeath |
| 0x1EEBF | 126655 | Unknown dword | PlayerStats_Reset |
| 0x1EEC0 | 126656 | World login state (0-3) | World login state machine |
| 0x1EEC1 | 126657 | worldId for connection | UI / LOGIN_RETURN |
| 0x1EEC2 | 126658 | worldInst | UI / LOGIN_RETURN |
| 0x1EEC3 | 126659 | Flag | PlayerStats_Reset |
| 0x1EEC4 | 126660 | Flag | Player_OnDeath |
| 0x3047 | 12359 | StatGroup 1 base (player stats, 0x6A entries, 0x1A8 bytes) | StatGroupMgr_InitGroups |

### Data (item template globals)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10147CC6 | (abs) | g_ItemVariantTable? | Packed 0x12?byte record table used by ItemVariant_FindMatchingRecord | disasm | low |

### Code (login request / Packet_ID_NOTIFY_107 build)
Note: renamed from Packet_Id107; IDA names may still use the old prefix.
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101C1072 | 0x001C1072 | Login_OnSubmit | Login UI submit handler; reads user/pass fields and queues updates | decomp (user) | high |
| 0x10008110 | 0x00008110 | Ui_ReadFieldTextById | Reads UI field text by ID into buffer (lpBaseAddress + 4*id) | decomp (user) | med |
| 0x10108F70 | 0x00108F70 | LoginField_QueueUpdate | Stores field ids/values into login window object + triggers apply/send | decomp (user) | med |
| 0x101055C0 | 0x001055C0 | LoginField_ApplyString | Resolves string via engine interface; sets UI text + flags | decomp (user) | med |
| 0x10077540 | 0x00077540 | UiText_SetValueIfChanged | Copies new string, triggers validation/callbacks | decomp (user) | low |
| 0x101C04B0 | 0x001C04B0 | Login_SendRequest_Throttled | Builds Packet_ID_NOTIFY_107 and calls LTClient_SendPacket_BuildIfNeeded | decomp (user) | med |
| 0x1000C7E0 | 0x0000C7E0 | Packet_ID_NOTIFY_107_Init | Initializes packet object; sets msg id byte = 107 | decomp (user) | med |
| 0x1000C770 | 0x0000C770 | Packet_WriteHeader | Initializes bitstream; writes optional header byte 0x19 + 64-bit token; writes msg id byte | decomp (user) | med |
| 0x1000D9D0 | 0x0000D9D0 | Packet_ID_NOTIFY_107_Serialize | Builds bitstream; writes flags + optional ints + 2x2048-bit blocks | decomp (user) | med |
| 0x1000D8B0 | 0x0000D8B0 | Packet_ID_NOTIFY_107_Read | Reads bitstream; mirrors serialize + 2x2048-bit blocks | decomp (user) | med |
| 0x1000D650 | 0x0000D650 | Playerfile_BlockC0_WriteEntry | Writes one entry in Playerfile blockC0 (bitflag + u16c + 5x u8c + bitfields) | decomp (user) | low |
| 0x1000CBF0 | 0x0000CBF0 | BitStream_WriteU16C | Writes u16 compressed to bitstream | inferred from usage | low |
| 0x1000C870 | 0x0000C870 | BitStream_Write2048 | Wrapper: g_LTClient vtbl+0x34 (write 2048 bits) | decomp (user) | low |
| 0x1000C8A5 | 0x0000C8A5 | BitStream_Read2048 | Wrapper: g_LTClient vtbl+0x38 (read 2048 bits) | decomp (user) | low |
| 0x1000CB60 | 0x0000CB60 | Packet_ID_NOTIFY_107_Vtbl0 | Vtable slot +0x00 (unknown role) | vtable xref | low |
| 0x100065D9 | 0x000065D9 | Registry_SetUsernameValue | Writes registry value "username" (persistence) | decomp (user) | low |
| 0x1008A0C0 | 0x0008A0C0 | LoginToken_Process | Reads LoginToken + passes to engine (pre-login flow) | decomp (user) | low |
| 0x1008F1A0 | 0x0008F1A0 | CharacterSelectUI_SetupDisplay | Sets up character select display (window id 0) using optC + strA/strB; called by Packet_ID_NOTIFY_107 subId=325 | decomp (user) | med |
| 0x102A64A0 | 0x002A64A0 | Ensure_BitstreamTables_Init | Wrapper; calls Init_BitstreamTables once | xrefs | low |
| 0x10272AD0 | 0x00272AD0 | Init_BitstreamTables | Initializes large bit/lookup tables (0x102FE000+) | disasm (user) | low |

#### Packet_ID_NOTIFY_107 bitstream construction (observed)

- Packet_ID_NOTIFY_107_Serialize writes a series of presence bits for 4 optional fields: +1076, +1080, +1084, +1088; if present it writes the value (u32 for last two; compressed for first two).
- Two fixed 2048-bit blocks are appended from packet offsets +1216 and +1344 via g_LTClient vtbl+0x34 (size=2048 bits).
- If word at +1072 == 325, an extra block is emitted via sub_1000D800(this+1092, this+12).
- Packet_ID_NOTIFY_107_Read mirrors the serialize path: reads u16c into +1072, then 4 presence bits + fields, then reads two 2048-bit blocks via g_LTClient vtbl+0x38.
- If +1072 == 325, Packet_ID_NOTIFY_107_Read calls Playerfile_read_blockC0(this+1092, this+12).
- Packet_ID_NOTIFY_107_Read layout: +1072=u16 subId, +1076=u32 optA (Read_u32c_alt), +1080=u32 optB (Read_u32c_alt), +1084=u32 optC (Read_u32c), +1088=u32 optD (Read_u32c), +1216/+1344=two LTClient strings (2048 bytes each).
- Packet_ID_NOTIFY_107_DispatchSubId (selected):
- subId 1: Network_OnConnectionLost(msgId 5585).
- subId 2: Player_OnDeath.
- subId 3: ChatNotify (string 5316).
- subId 4: ChatNotify "Cloning complete." + SharedMem_WriteFlag_0x94(0).
- subId 5: ChatNotify (string 5340).
- subId 6: Player_HasFaction -> Player_CheckSpawnState + ChatNotify (string 4321).
- subId 7: ChatNotify (string 5336) + g_LTClient vtbl+0x4C(0x1000000).
- subId 8: ChatNotify (string 1850).
- subId 9: ChatNotify (string 5341/5342/5343/5344 by optA).
- subId 0xA: ChatNotify (string 1846) + WriteLoginDataToFile("Mails\\<user>\\Outbox\\%u.fml").
- subId 0xB/0xC/0xD: ChatNotify (string 1847/1848/1899) + g_LTClient vtbl+0x4C(0x4000).
- subId 0xE: g_LTClient vtbl+0x4C(0x4000000).
- subId 0xF: ChatNotify (string 1849) + g_LTClient vtbl+0x4C(1) + Sound_PlayAtPosition(60).
- subId 0x10: Action_SendPickupPacket(optC).
- subId 0x12: EncVar_WriteStatGroup5(optA byte2).
- subId 0x13/0x14/0x15/0x16/0x18/0x1A/0x1C: ChatNotify (string 5347/5515/5514/5348/5349/5615/5616).
- subId 0x17/0x19: ChatNotify (string 4324/4323) + UIWidget_InvokeVirtual5(window id 17).
- subId 0x1B/0x1D: ChatNotify (string 4461/4462) + InventoryMgr_InvokeCommand5(window id 18).
- subId 0x1E: ChatNotify (string 5355).
- subId 0x1F: ChatNotify (string 4326 w/arg 30 or 4463) + g_LTClient vtbl+0x4C(64) + Data_SerializeHelper(window id 19).
- subId 0x24: ChatNotify (string 4328) + g_LTClient vtbl+0x4C(64) + Data_SerializeHelper(window id 19).
- subId 0x2C: ChatNotify (string 5367) + g_LTClient vtbl+0x4C(16) + HandlePacket_ID_6B_SubId44_InventoryUiRefresh(window id 21).
- subId 0x37: ChatNotify (string 4330) + g_LTClient vtbl+0x4C(2) + MarketUI_RefreshInventory(window id 19); if window id 23 && flag at +6241 -> vtbl+4(4).
- subId 0x3C: ChatNotify (string 4331) + g_LTClient vtbl+0x4C(2); optA==1 -> CWindowTerminalMarket_SendSearchRequest(window id 22); optB==2 -> Market_BuildSearchPacket(window id 70).
- subId 0x3F: g_LTClient vtbl+0x4C(4096) + CharacterUI_InvokeCommand5(window id 24) + ChatNotify (string 4338).
- subId 0x40: g_LTClient vtbl+0x4C(4096) + CharacterUI_InvokeCommand5(window id 24) + clear SharedMem strings + PlayerData_ClearEquipment + SharedMem_WritePlayerFile + set LTClient(2) flags + ChatNotify (string 4339).
- subId 0x42: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4340) + FriendsList_HandleSelection(window id 24, optC).
- subId 0x46: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4341) + UI_ClearTwoTextFields (window id 24).
- subId 0x4C: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4343) + PlayerData_ClearEquipment + CharacterUI_SetupPaperdoll(window id 24; copies window id 25 data).
- subId 0x52: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4345) + window id 24 vtbl+4(5).
- subId 0x53: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4346).
- subId 0x54/0x55/0x56/0x57/0x58/0x59/0x5A: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 5397/5398/5399/5400/5401/5404/5403).
- subId 0x5B: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4347) + FriendsList_ClearSelection(window id 24).
- subId 0x64: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4348) + FriendsList_ResetNetState(window id 24).
- subId 0x66: ChatNotify (string 5411) + g_LTClient vtbl+0x4C(0x8000).
- subId 0x68: g_LTClient vtbl+0x4C(4096) + ChatNotify (string 4351) + FriendsList_ToggleSortOrder(window id 24, optC, optA==0).
- subId 0x6E: ChatNotify (string 5416) + SetFlag6408(window id 28, 0) + g_LTClient vtbl+0x4C(8).
- subId 0x6F: g_LTClient vtbl+0x4C(8) + SetFlag6408(window id 28, 1).
- subId 0x70: g_LTClient vtbl+0x4C(8) + ChatNotify (string 5415) + SetFlag6408(window id 28, 0).
- subId 0x73: g_LTClient vtbl+0x4C(8) + ChatNotify (string 4362) + FriendsList_SelectById(window id 24, optC).
- subId 0x7C: FactionUI_OnCommand(window id 29, optC).
- subId 44: inventory/production UI refresh (slot/tooltips).
- subId 231/270: worldId=4 (apartments) + SharedMem[0x77]=optC + SharedMem[0x78]=optB + set 0x1EEC0=1.
- subId 269: if optA != 0 then worldId=optA + set 0x1EEC0=1 (non-apartment world selection).
- subId 0x145 (325): CharacterSelectUI_SetupDisplay(window id 0, optC + strA/strB).
- subId 0x14C/0x14D: localized ChatNotify (string 4467/4468, arg from string 14000+optC, float optD).
- subId 0x153: UIWidget_SetSelectionState(window id 72) + GameStateMgr_EnterPausedState(72).
- subId 0x15D: SharedMem_WriteString11224(strA).
- subId 0x161/0x162: UIWidget_SetLabelText / UIWidget_ResetLabel (window id 77).
- subId 0x163: HudNotify_ShowPPChangeMessage(window id 64, optC + optA byte2).
- World selection can also be triggered by packet ID 0x7B (HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270), which sets SharedMem[0x1EEC1/0x1EEC2] and 0x1EEC0=1.
- Packet_WriteHeader is called before serialize: it resets/initializes the bitstream, optionally writes header byte 0x19 plus a 64-bit token (Packet_GetHeaderTokenU64 via BitStream_WriteU64) when *(this+8)==0x19, then writes msg id byte from *(this+1064).
- Playerfile_BlockC0_WriteEntry layout (called 10x by sub_1000D800): if *(this+4)==0 or *(this+5)==0 => write bit0. Else write bit1, then u16c, then u8c for bytes +2/+3/+8/+9/+10, plus raw bitfields from +4 (7 bits), +5 (7 bits), +6 (9 bits).

### Data (login packet globals)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102BFDA8 | 0x002BFDA8 | vtbl_Packet_ID_NOTIFY_107 | Vtable for Packet_ID_NOTIFY_107_* funcs | vtable xref | low |
| 0x102BFD98 | 0x002BFD98 | vtbl_Packet_Unknown0 | Prior vtable used during Packet_ID_NOTIFY_107_Init | decomp (user) | low |
| 0x1035AA4C | 0x0035AA4C | g_LTClient | LTClient interface used for packet serialization/send; observed vtbl+0x28=SendPacket, vtbl+0x18=ConnectToWorld(SystemAddress*), vtbl+0x08=IsConnected? | xrefs | low |

### Data (world tables)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102E2178 | 0x002E2178 | g_ApartmentWorldTable | 6-dword/entry table indexed by apartmentId (SharedMem[0x78], 1..24); entry[0]=folder name; entry[1]=interface\\hqs\\NN.pcx; used by WorldLogin_LoadApartmentWorld | decomp + strings | high |
| 0x102E2980 | 0x002E2980 | g_WorldTable | 15-dword/entry table; entry[0]=folder name (NY_Manhattan, tokyo, apartments, etc), entry[1]=display name (NYC - Manhattan, etc); used by WorldLogin_StateMachineTick for \"worlds\\\\<folder>\" | py_eval + strings | high |

### Data (system address constants)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x103C0F50 | 0x003C0F50 | g_SystemAddress_Unassigned | 6-byte SystemAddress sentinel (all 0xFF) used as ?unassigned? | bytes + xrefs | high |
| 0x103C0DE8 | 0x003C0DE8 | g_SystemAddress_Unassigned2 | Duplicate unassigned sentinel (all 0xFF); used in WorldLoginReturn_HandleAddress | bytes + xrefs | high |

### Code (items/inventory + handlers)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10190D70 | 0x00190D70 | CNetworkMgrClient_HandlePacket_ID_MOVE_ITEMS | Handles move-items packet; deep inventory mutation | string + decomp | high |
| 0x1018F110 | 0x0018F110 | HandlePacket_ID_USE_ITEM | Use-item packet handling (ID -92) | dispatch + decomp | high |
| 0x10199A40 | 0x00199A40 | ClientShell_OnMessage_DispatchPacketId | CShell packet-id switch (signed char); dispatches 0x6B -> Packet_ID_NOTIFY_107_DispatchSubId; handles login IDs 0x6D/0x6F/0x70/0x73 plus inventory/world packets | decomp | high |
| 0x1018E1F0 | 0x0018E1F0 | HandlePacket_ID_LOGIN_REQUEST_RETURN | Login request-return handler (packet ID 0x6D) | dispatch + decomp | high |
| 0x1018DCE0 | 0x0018DCE0 | Packet_ID_LOGIN_REQUEST_RETURN_Read | Login response parse (u8 status + session_str via LTClient) | disasm | high |

| 0x10196900 | 0x00196900 | HandlePacket_ID_LOGIN_RETURN | Login return handler (packet ID 0x6F); drives UI + world select flow | decomp | high |

| 0x101935F0 | 0x001935F0 | Packet_ID_LOGIN_RETURN_Read | Parses ID_LOGIN_RETURN per Docs/Packets/ID_LOGIN_RETURN.md | decomp | high |

| 0x10196400 | 0x00196400 | Packet_ID_LOGIN_RETURN_Write | Serializes ID_LOGIN_RETURN (client rarely uses) | disasm | low |

| 0x1008A890 | 0x0008A890 | VariableSizedPacket_WriteString | Writes string (len bytes) to packet bitstream; used by ID_LOGIN_TOKEN_CHECK | disasm | med |

| 0x1008A950 | 0x0008A950 | VariableSizedPacket_ReadString | Reads string (len bytes) from packet bitstream; used by ID_LOGIN_TOKEN_CHECK | disasm | med |

| 0x1008AA10 | 0x0008AA10 | Packet_ID_LOGIN_TOKEN_CHECK_Read | Parses ID_LOGIN_TOKEN_CHECK (flag + token/username) | decomp | med |

| 0x1008AAA0 | 0x0008AAA0 | Packet_ID_LOGIN_TOKEN_CHECK_Write | Writes ID_LOGIN_TOKEN_CHECK (flag + token/username) | decomp | med |
| 0x1018DA20 | 0x0018DA20 | HandlePacket_ID_LOGIN_TOKEN_CHECK | Login token check handler (packet ID 0x70); reads flag + token/username and updates Login UI | decomp | low |

| 0x1008B6D0 | 0x0008B6D0 | LoginUI_Update_SendLoginTokenCheck | Login UI update; sends ID_LOGIN_TOKEN_CHECK using LoginToken string (requestToken) | decomp | med |
| 0x1018E340 | 0x0018E340 | HandlePacket_ID_WORLD_LOGIN_RETURN_73 | World login return handler (packet ID 0x73) | dispatch + decomp | high |
| 0x1018DDA0 | 0x0018DDA0 | Packet_ID_WORLD_LOGIN_RETURN_Read | World login return parse (u8 code/u8 flag/u32 worldIp/u16 worldPort) | disasm | high |
| 0x10038B10 | 0x00038B10 | CGameClientShell_OnMessage | IClientShell vtbl+0x58; dispatches MSG_ID (u8) to subsystems (0x6A,0x6B,0x6C,0x6E,0x6F,0x70,0x76,0x77,0x7E,0x81,0x83,0x84,0x85,0x86,0x88,0x8C,0x8E,0x8F,0x9A,0x9B,0x9D); routes packet-id switch via ClientShell_OnMessage_DispatchPacketId | decomp | med |
| 0x10037E70 | 0x00037E70 | CGameClientShell_OnMessage2 | IClientShell vtbl+0x14; dispatches MSG_ID stream (0x68,0x6A,0x75 sub?id 0..4) and routes to UI/gameplay handlers | decomp | med |
| 0x101C0D60 | 0x001C0D60 | WorldLoginReturn_HandleAddress | Validates world addr; calls g_LTClient->Connect; sets 0x1EEC0=2 | decomp + disasm | high |
| 0x10199270 | 0x00199270 | HandlePacket_ID_WORLD_SELECT_7B | Packet ID 0x7B; validates playerId; subId=4 sets SharedMem[0x1EEC1/0x1EEC2]=worldId/inst + 0x1EEC0=1 (LoginUI msg 0x0B); subId=6 routes payload to UI handler | disasm | high |
| 0x101064C0 | 0x001064C0 | Packet_ID_7B_Ctor | Packet ID = 0x7B; initializes payload blocks | disasm | med |
| 0x10106590 | 0x00106590 | Packet_ID_7B_Read | Parses 0x7B (u32c playerId + u8c type + type payload) | disasm | med |
| 0x10105D80 | 0x00105D80 | Packet_ID_WORLD_SELECT_Write | Writes 0x7B (u32c playerId + u8c subId + subId payload) | decomp | med |
| 0x101063B0 | 0x001063B0 | Packet_ID_7B_Dtor | Frees 0x7B payload buffers; BitStream_FreeOwnedBuffer | disasm | low |
| 0x10106470 | 0x00106470 | Packet_ID_7B_Sub6List_Init | Initializes subId=6 list header at +0x460 | disasm | low |
| 0x10177A40 | 0x00177A40 | WorldSelect_HandleSubId6Payload | SubId=6 handler; applies parsed +0x460 payload to UI (window id 0x31) | disasm | med |
| 0x10176FC0 | 0x00176FC0 | CWindowWorldSelect_Ctor | World select UI ctor; inits sub6 list + state | decomp | med |
| 0x10177260 | 0x00177260 | CWindowWorldSelect_Dtor | World select UI dtor | disasm | low |
| 0x10177290 | 0x00177290 | CWindowWorldSelect_OnCommand | World select UI command handler; sends 0x7B subId=5/7 | decomp | high |
| 0x10177D50 | 0x00177D50 | WorldSelect_GetBaseCostByClass | Maps classId (from world list entry) -> base cost {5000,10000,15000,20000,25000} | disasm | low |
| 0x1026F2E0 | 0x0026F2E0 | Packet_ID_7B_ReadSubId6List | SubId=6 payload parser for 0x7B (fills list @+0x460) | disasm | med |
| 0x10181A00 | 0x00181A00 | HandlePacket_ID_7D_WriteSharedMem_0x2BD0 | Packet ID 0x7D; reads u32c and writes SharedMem block 0x2BD0 (12 bytes) | decomp | low |
| 0x10164D40 | 0x00164D40 | HandlePacket_ID_6B_SubId44_InventoryUiRefresh | Packet 0x6B subId=44; updates inventory/production UI slots + tooltips | dispatch + decomp | med |
| 0x102404E0 | 0x002404E0 | ItemList_Read | Type=2 payload for 0x7B; reads item list | decomp | med |
| 0x101056B0 | 0x001056B0 | SystemAddress_Copy | Copies 6-byte SystemAddress (ip+port) | decomp | low |
| 0x101CA5D0 | 0x001CA5D0 | SystemAddress_SetUnassigned | Sets SystemAddress to 0xFFFFFFFFFFFF (unassigned) | decomp + bytes | low |
| 0x1018C570 | 0x0018C570 | WorldLoginReturn_ScheduleRetry | Schedules retry (SharedMem 0x1EEC0=1 + time) | decomp | med |
| 0x1018C320 | 0x0018C320 | Packet_ID_WORLD_LOGIN_RETURN_Ctor | Packet ID = 0x73; initializes worldAddr to unassigned; code=0, flag=0xFF | decomp | med |
| 0x1018D9C0 | 0x0018D9C0 | LTClient_SendPacket_BuildIfNeeded | If packet already built (a1[3]) or packet->Serialize() succeeds, calls g_LTClient vtbl+0x28 to send | decomp | med |
| 0x101C0E10 | 0x001C0E10 | WorldLogin_StateMachineTick | Drives world login state (0x1EEC0=1 send 0x72 -> 2 wait connect -> 3 load world); builds/sends 0x72 | decomp | high |
| 0x1008C310 | 0x0008C310 | SharedMem_WriteWorldLoginState_0x1EEC0 | Writes world login state (SharedMem 0x1EEC0) | decomp | low |
| 0x1005AE30 | 0x0005AE30 | WorldLogin_LoadWorldFromPath | Loads world from path + display name; writes SharedMem[19]=path; uses g_pILTClient vtbl+0x144 | decomp | med |
| 0x101C0340 | 0x001C0340 | WorldLogin_LoadApartmentWorld | If SharedMem[0x54] and apartmentId in SharedMem[0x78] (1..24), loads \"worlds\\\\apartments\\\\<name>\" via g_ApartmentWorldTable | decomp + strings | high |
| 0x1008C2B0 | 0x0008C2B0 | SharedMem_WriteDword_0x78 | Writes dword to SharedMem index 0x78 (apartment world selection) | decomp | low |
| 0x1008C2F0 | 0x0008C2F0 | SharedMem_WriteWorldId_0x1EEC1 | Writes worldId to SharedMem index 0x1EEC1 | decomp | low |
| 0x10122920 | 0x00122920 | SharedMem_WriteWorldInst_0x1EEC2 | Writes worldInst (u8) to SharedMem index 0x1EEC2 | disasm | low |
| 0x101BFEA0 | 0x001BFEA0 | SharedMem_ReadApartmentIndex_0x78 | Reads apartment index (SharedMem 0x78) | disasm | low |
| 0x101BFF60 | 0x001BFF60 | SharedMem_ReadWorldInst_0x1EEC2 | Reads world instance (SharedMem 0x1EEC2) | disasm | low |
| 0x101BFF70 | 0x001BFF70 | SharedMem_ReadWorldId_0x1EEC1 | Reads worldId (SharedMem 0x1EEC1) | disasm | low |
| 0x1008C670 | 0x0008C670 | WorldSelect_ApplyApartmentInfo | Writes SharedMem[0x77]/[0x78] from selection struct (dword + u8) and updates timer | decomp | med |
| 0x101A3550 | 0x001A3550 | Packet_ID_NOTIFY_107_DispatchSubId | Packet_ID_NOTIFY_107 (ID 0x6B) sub-id switch; subId 44 inventory UI refresh; subId 231/270 force worldId=4 (apartments) + set SharedMem[0x77]/[0x78], subId 269 sets worldId from field | decomp + disasm | high |
| 0x10089460 | 0x00089460 | LoginUI_SetMessageText | Sets login UI message text by string id + color; throttled by time | decomp | med |
| 0x1008BB60 | 0x0008BB60 | UiWidget_GetSlot | Returns widget pointer from UI array slot (0..3) | decomp | low |
| 0x101BFE00 | 0x001BFE00 | Packet_ID_WORLD_LOGIN_Ctor | Packet ID = 0x72 (WORLD_LOGIN) | disasm | high |
| 0x101C0980 | 0x001C0980 | Packet_ID_WORLD_LOGIN_Read | Parses 0x72 (u8/u8/u32c/u32c) | disasm | med |
| 0x101C09F0 | 0x001C09F0 | Packet_ID_WORLD_LOGIN_Write | Writes 0x72 (u8/u8/u32c/u32c) | disasm | med |
| 0x10190B90 | 0x00190B90 | HandlePacket_ID_ITEMS_CHANGED | Handler for Packet_ID_ITEMS_CHANGED (ID -126) | dispatch + decomp | high |
| 0x10192D40 | 0x00192D40 | HandlePacket_ID_ITEMS_REMOVED | Handler for Packet_ID_ITEMS_REMOVED (ID -127) | dispatch + decomp | high |
| 0x10197030 | 0x00197030 | HandlePacket_ID_ITEMS_ADDED | Handler for Packet_ID_ITEMS_ADDED (ID -109) | dispatch + decomp | high |
| 0x1018EA20 | 0x0018EA20 | HandlePacket_ID_UNLOAD_WEAPON | Handler for Packet_ID_UNLOAD_WEAPON (ID -113) | dispatch + decomp | med |
| 0x1018EC20 | 0x0018EC20 | HandlePacket_ID_MERGE_ITEMS | Handler for Packet_ID_MERGE_ITEMS (ID -112) | dispatch + decomp | high |
| 0x1018E550 | 0x0018E550 | HandlePacket_ID_ITEM_REMOVED | Handler for Packet_ID_ITEM_REMOVED (ID -120) | dispatch + decomp | high |
| 0x1018EF60 | 0x0018EF60 | HandlePacket_ID_SPLIT_CONTAINER | Handler for Packet_ID_SPLIT_CONTAINER (ID -94) | dispatch + decomp | high |
| 0x1018FD60 | 0x0018FD60 | HandlePacket_ID_REPAIR_ITEM | Handler for Packet_ID_REPAIR_ITEM (ID -83) | dispatch + decomp | high |
| 0x1018FFC0 | 0x0018FFC0 | HandlePacket_ID_RECYCLE_ITEM | Handler for Packet_ID_RECYCLE_ITEM (ID -82) | dispatch + decomp | high |
| 0x1018E8F0 | 0x0018E8F0 | HandlePacket_ID_NAME_CHANGE | Handler for Packet_ID_NAME_CHANGE (ID -114) | dispatch + decomp | med |
| 0x10196CE0 | 0x00196CE0 | HandlePacket_ID_BACKPACK_CONTENTS | Handler for Packet_ID_BACKPACK_CONTENTS (ID -110) | dispatch + decomp | med |
| 0x10193740 | 0x00193740 | HandlePacket_ID_MAIL | Handler for Packet_ID_MAIL (ID -116) | dispatch + decomp | med |
| 0x1013DE40 | 0x0013DE40 | CWindowSendMail_OnCommand | Send?mail UI handler; validates recipient/subject/body then builds + sends Packet_ID_MAIL | decomp | med |
| 0x10182CC0 | 0x00182CC0 | HandlePacket_ID_FRIENDS | Handler for Packet_ID_FRIENDS (ID -105) | dispatch + decomp | med |
| 0x10197F90 | 0x00197F90 | HandlePacket_ID_STORAGE | Handler for Packet_ID_STORAGE (ID -103) | dispatch + decomp | med |
| 0x10195DA0 | 0x00195DA0 | HandlePacket_ID_MINING | Handler for Packet_ID_MINING (ID -102) | dispatch + decomp | med |
| 0x10195A00 | 0x00195A00 | HandlePacket_ID_PRODUCTION | Handler for Packet_ID_PRODUCTION (ID -101) | dispatch + decomp | med |
| 0x10195AF0 | 0x00195AF0 | HandlePacket_ID_MARKET | Handler for Packet_ID_MARKET (ID -100) | dispatch + decomp | med |
| 0x101993B0 | 0x001993B0 | HandlePacket_ID_FACTION | Handler for Packet_ID_FACTION (ID -99) | dispatch + decomp | med |
| 0x10198F30 | 0x00198F30 | HandlePacket_ID_PLAYERFILE | Handler for Packet_ID_PLAYERFILE (ID -97) | dispatch + decomp | med |
| 0x101931E0 | 0x001931E0 | HandlePacket_ID_SKILLS | Handler for Packet_ID_SKILLS (ID -93) | dispatch + decomp | med |
| 0x10197580 | 0x00197580 | HandlePacket_ID_A5 | Handler for Packet_ID_A5 (ID -91; name TBD) | dispatch + disasm | med |
| 0x1018F480 | 0x0018F480 | HandlePacket_ID_A6 | Handler for Packet_ID_A6 (ID -90; name TBD) | dispatch + disasm | med |
| 0x10192690 | 0x00192690 | HandlePacket_ID_A8 | Handler for Packet_ID_A8 (ID -88; name TBD) | dispatch + disasm | med |
| 0x10199050 | 0x00199050 | HandlePacket_ID_A9 | Handler for Packet_ID_A9 (ID -87; name TBD) | dispatch + disasm | med |
| 0x10198840 | 0x00198840 | HandlePacket_ID_PLAYER2PLAYER | Handler for Packet_ID_PLAYER2PLAYER (ID -86) | dispatch + disasm + RTTI | med |
| 0x10195EE0 | 0x00195EE0 | HandlePacket_ID_AC | Handler for Packet_ID_AC (ID -84; name TBD) | dispatch + disasm | med |
| 0x101994B0 | 0x001994B0 | HandlePacket_ID_AF | Handler for Packet_ID_AF (ID -81; name TBD) | dispatch + disasm | med |
| 0x101996D0 | 0x001996D0 | HandlePacket_ID_B0 | Handler for Packet_ID_B0 (ID -80; name TBD) | dispatch + disasm | med |
| 0x10198D70 | 0x00198D70 | HandlePacket_ID_B1 | Handler for Packet_ID_B1 (ID -79; name TBD) | dispatch + disasm | med |
| 0x101901F0 | 0x001901F0 | HandlePacket_ID_B2 | Handler for Packet_ID_B2 (ID -78; name TBD) | dispatch + disasm | med |
| 0x10199820 | 0x00199820 | HandlePacket_ID_B5 | Handler for Packet_ID_B5 (ID -75; name TBD) | dispatch + disasm | med |
| 0x101981F0 | 0x001981F0 | HandlePacket_ID_B6 | Handler for Packet_ID_B6 (ID -74; name TBD) | dispatch + disasm | med |
| 0x10003760 | 0x00003760 | MapItemId_ToAssets | Maps item id -> model/skin assets | decomp + strings | high |
| 0x101281D0 | 0x001281D0 | BuildItemPreview_FromItemId | Builds item preview using MapItemId_ToAssets | xrefs + decomp | med |
| 0x101A0900 | 0x001A0900 | SendPacket_WEAPONFIRE | Builds Packet_ID_WEAPONFIRE and sends to server | decomp | high |
| 0x101A0680 | 0x001A0680 | Packet_ID_WEAPONFIRE_read | Packet_ID_WEAPONFIRE read (vtable) | decomp | med |
| 0x101A06D0 | 0x001A06D0 | Packet_ID_WEAPONFIRE_write | Packet_ID_WEAPONFIRE write (vtable) | disasm | med |
| 0x101C5350 | 0x001C5350 | SendPacket_RELOAD | Builds Packet_ID_RELOAD and sends to server | decomp | high |
| 0x101C5BA0 | 0x001C5BA0 | SendPacket_RELOAD_Alt | Alternate reload send path | decomp | med |
| 0x101A27A0 | 0x001A27A0 | SendPacket_UPDATE | Builds Packet_ID_UPDATE and sends WeaponFireEntry list | disasm | high |
| 0x1018D9C0 | 0x0018D9C0 | LTClient_SendPacket_BuildIfNeeded | Sends packet via LTClient vtbl+0x28; builds packet if needed | decomp | med |
| 0x1019F570 | 0x0019F570 | Packet_ID_UPDATE_read | Packet_ID_UPDATE read (vtable) | decomp | med |
| 0x101A0630 | 0x001A0630 | Packet_ID_UPDATE_write | Packet_ID_UPDATE write (vtable) | decomp | med |
| 0x101A1440 | 0x001A1440 | WeaponFireEntry_write | Writes WeaponFireEntry by type into bitstream | decomp | med |

### Code (admin/debug utilities + item list)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10039A80 | 0x00039A80 | Cmd_Admin | Handles "admin" command; `itemlist` writes ItemList.txt from runtime item table | decomp | high |
| 0x10246140 | 0x00246140 | FormatString_Args | Formats string with varargs (used by itemlist output) | decomp | med |
| 0x10246080 | 0x00246080 | FormatString | Variadic format into std::string (wrapper around FormatString_Args helpers) | decomp | med |
| 0x10241A10 | 0x00241A10 | String_AssignFromPtr | std::string assign helper | decomp | low |
| 0x10241530 | 0x00241530 | String_FromU16 | Converts u16 to string (item id formatting) | decomp | low |
| 0x102415C0 | 0x002415C0 | String_FromU8 | Converts u8 to string | decomp | low |
| 0x102414A0 | 0x002414A0 | String_FromU32 | Converts u32 to string | decomp | low |
| 0x101A14C0 | 0x001A14C0 | WeaponFireEntry_add | Adds entry to list; cap 10 | disasm | med |
| 0x101A2390 | 0x001A2390 | WeaponFireEntry_build_from_state | Builds entry from game state | decomp | med |
| 0x101A21A0 | 0x001A21A0 | WeaponFireEntry_pick_list_entry | Builds candidate list from RB-tree + filters, picks random id | decomp | med |
| 0x101A1310 | 0x001A1310 | WeaponFireEntry_type1_write | Type1 payload writer | decomp | med |
| 0x101A00B0 | 0x001A00B0 | WeaponFireEntry_type2_write | Type2 payload writer | decomp | med |
| 0x101A0360 | 0x001A0360 | WeaponFireEntry_type3_write | Type3 payload writer | decomp | med |
| 0x101A04D0 | 0x001A04D0 | WeaponFireEntry_type4_write | Type4 payload writer | decomp | med |
| 0x1010C330 | 0x0010C330 | BuildItemTooltip | Builds item tooltip text from runtime ItemStructA fields + template lookup | disasm | high |
| 0x101093A0 | 0x001093A0 | Item_GetDurabilityPercent | Computes durability% from ItemStructA (+0x0A) and ItemTemplate_GetMaxDurability | disasm | high |
| 0x101676F0 | 0x001676F0 | Item_CalcRepairCosts | Computes repair costs from ItemStructA durability (outputs 2 values); used by repair UI | decomp | med |
| 0x101676B0 | 0x001676B0 | RoundFloatToInt | Rounds float to nearest int (?0.5) | decomp | low |
| 0x10109330 | 0x00109330 | Item_GetAmmoItemIdOrTemplate | Returns ammo item id (runtime override or template) | disasm | high |
| 0x1024C940 | 0x0024C940 | ItemTemplate_CopyVariantByIndex | Copies 0x5C variant record by index from template | decomp | high |
| 0x1024C7B0 | 0x0024C7B0 | ItemVariantList_CopyByItemId | Copies per-item variant list (92-byte entries) from global table | decomp | low |
| 0x1024C5A0 | 0x0024C5A0 | VariantList_Assign | Assigns/copies 92-byte entries from another list | decomp | low |
| 0x1024C410 | 0x0024C410 | ByteVector_Insert | Vector insert for byte buffer (memmove + realloc) | decomp | low |
| 0x10247DF0 | 0x00247DF0 | FormatDuration_MinSec | Formats seconds to ?Xm? when divisible by 60 | decomp | high |
| 0x102330C0 | 0x002330C0 | ItemTemplate_GetAmmoItemId | Returns ammo item id from template (word @+0x30) | decomp | high |
| 0x10232300 | 0x00232300 | ItemTemplate_GetMaxDurability | Returns max durability by hardcoded item-id rules (not template field) | decomp | high |
| 0x1026F900 | 0x0026F900 | ItemId_GetDisplayName | Resolves item display name from id | disasm | med |

### Code (packet read helpers: B5/B6)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101273D0 | 0x001273D0 | Packet_ID_B5_read | Packet_ID_B5 read/parse entry point (type switch) | decomp | high |
| 0x101272E0 | 0x001272E0 | Packet_ID_B5_read_list | Reads list of Packet_ID_B5_read_entry | decomp | med |
| 0x100FF8D0 | 0x000FF8D0 | Packet_ID_B5_read_entry | Packet_ID_B5 complex entry (bitfields + nested lists) | decomp | med |
| 0x100FF800 | 0x000FF800 | Packet_ID_B5_read_entry_list | Reads list of Packet_ID_B5_read_entry2 | decomp | med |
| 0x100FD880 | 0x000FD880 | Packet_ID_B5_read_entry2 | Packet_ID_B5 nested entry (large) | decomp | med |
| 0x100FCA80 | 0x000FCA80 | Packet_ID_B5_read_entry2_subA | Packet_ID_B5 entry2 sub-struct (u8/u16/u32 + 2048 bits) | decomp | med |
| 0x100FD370 | 0x000FD370 | Packet_ID_B5_read_entry2_map | Packet_ID_B5 entry2 map (u32 key + 2048-bit string) | decomp | med |
| 0x100FD1A0 | 0x000FD1A0 | Packet_ID_B5_entry2_map_get_or_insert | Map lookup/insert for entry2 map | decomp | low |
| 0x101261D0 | 0x001261D0 | Packet_ID_B5_read_extra_list | Packet_ID_B5 extra list (u32c count + entry) | decomp | med |
| 0x10125E90 | 0x00125E90 | Packet_ID_B5_read_extra_list_entry | Extra list entry (u32c + 2 bits) | decomp | low |
| 0x101491E0 | 0x001491E0 | Packet_ID_B6_read | Packet_ID_B6 read/parse entry point (type switch) | decomp | high |
| 0x10147C70 | 0x00147C70 | Packet_ID_B6_read_structA | Packet_ID_B6 struct A read | decomp | med |
| 0x10147CF0 | 0x00147CF0 | Packet_ID_B6_read_structB | Packet_ID_B6 struct B read | decomp | med |
| 0x10147A90 | 0x00147A90 | Read_6BitFlags | Reads 6 single-bit flags into consecutive bytes | disasm | med |
| 0x101487A0 | 0x001487A0 | Packet_ID_B6_read_structC | Packet_ID_B6 struct C read (list) | decomp | med |
| 0x10149050 | 0x00149050 | Packet_ID_B6_read_structD | Packet_ID_B6 struct D read (lists) | decomp | med |
| 0x10148570 | 0x00148570 | Packet_ID_B6_read_structD_entry | StructD entry read (u32 + 2048 bits + list) | decomp | med |
| 0x1026BE70 | 0x0026BE70 | Read_QuantVec3_9bit | Reads quantized vec3 + 9-bit value | disasm | med |
| 0x10272500 | 0x00272500 | Read_QuantVec3 | Reads quantized vec3 (bit-width + sign bits) | disasm | med |
| 0x10257770 | 0x00257770 | Read_BitfieldBlock_0x30 | Reads packed bitfield block (variable layout) | disasm | med |
| 0x100312C0 | 0x000312C0 | BitStream_WriteBit | Writes single bit (bitstream) | disasm | med |
| 0x101C92D0 | 0x001C92D0 | BitStream_WriteBit0 | Writes 0 bit | disasm | med |
| 0x101C9310 | 0x001C9310 | BitStream_WriteBit1 | Writes 1 bit | disasm | med |
| 0x101C96C0 | 0x001C96C0 | BitStream_WriteBits | Core bitstream WriteBits | disasm | med |
| 0x101C9810 | 0x001C9810 | BitStream_WriteBitsCompressed | Compressed integer writer | disasm | high |
| 0x10031AB0 | 0x00031AB0 | BitStream_Write_u32c | Writes compressed u32 (endian swap if Net_IsBigEndian) | decomp | high |
| 0x1000C6C0 | 0x0000C6C0 | Packet_InitBitStreamFromPayload | Init BitStream from packet payload (header byte 0x19 branch) | decomp | high |
| 0x101C8DA0 | 0x001C8DA0 | BitStream_InitFromBuffer | Init BitStream from buffer (copy/own) | decomp | high |
| 0x101C8E80 | 0x001C8E80 | BitStream_FreeOwnedBuffer | Frees owned BitStream buffer | decomp | high |
| 0x101CA120 | 0x001CA120 | Net_IsBigEndian | Endianness check | disasm | high |
| 0x101CA080 | 0x001CA080 | ByteSwapCopy | Byte swap helper | disasm | high |
| 0x10272420 | 0x00272420 | Write_QuantVec3 | Writes quantized vec3 | disasm | med |
| 0x1026BE40 | 0x0026BE40 | Write_QuantVec3_And9 | Writes quantized vec3 + 9 bits | disasm | med |
| 0x102575D0 | 0x002575D0 | Write_BitfieldBlock_0x30 | Writes packed bitfield block | disasm | med |
| 0x102575B0 | 0x002575B0 | BitfieldBlock_0x30_HasExtra | Checks block extra-flag | disasm | low |
| 0x10249E10 | 0x00249E10 | Read_Substruct_10249E10 | Small packed struct (u32/u8/u32/u8/u8/u8) | disasm | med |
| 0x102550A0 | 0x002550A0 | ItemEntryWithId_read | u32c entryId + ItemStructA_read | disasm | med |
| 0x101C9930 | 0x001C9930 | BitStream_ReadBits | Core bitstream ReadBits (bitCount + sign flag) | disasm | high |
| 0x101C9AA0 | 0x001C9AA0 | BitStream_ReadBitsCompressed | Bitstream compressed read (byte-skip/lead-flag scheme) | disasm | high |
| 0x101C9390 | 0x001C9390 | BitStream_ReadBit | Core bitstream ReadBit (1 bit) | disasm | high |

### Code (packet read helpers: mail)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1013DA40 | 0x0013DA40 | Packet_ID_MAIL_read_entry | Mail entry bitstream read (size 0x848) | decomp | med |
| 0x1013DC60 | 0x0013DC60 | Packet_ID_MAIL_entry_list_insert | Inserts mail entry into vector/list | decomp | low |
| 0x1013DCF0 | 0x0013DCF0 | Packet_ID_MAIL_entry_list_insert_unique | Inserts mail entry if not already present | decomp | low |
| 0x1013CF40 | 0x0013CF40 | Packet_ID_MAIL_entry_list_contains | Checks list for entry id match | decomp | low |
| 0x1013C970 | 0x0013C970 | Packet_ID_MAIL_entry_fill | Fills mail entry strings from UI | decomp | low |
| 0x1013D0F0 | 0x0013D0F0 | Packet_ID_MAIL_write_entry | Mail entry bitstream write | decomp | med |
| 0x1013D1E0 | 0x0013D1E0 | Packet_ID_MAIL_write_entries | Writes mail entry list (u8 count + entries) | decomp | med |
| 0x1013D250 | 0x0013D250 | Packet_ID_MAIL_write_idlist | Writes mail id list (u8 count + u32 list) | decomp | med |
| 0x1013D2E0 | 0x0013D2E0 | Packet_ID_MAIL_write | Mail packet write (entries + optional id list) | decomp | med |

### Code (packet read helpers: market/faction/playerfile)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D730 | 0x0000D730 | Playerfile_read_blockC0_entry | Playerfile blockC0 entry read (presence bit + bitfields) | disasm | med |
| 0x1000D870 | 0x0000D870 | Playerfile_read_blockC0 | Playerfile blockC0 read (u32c header + 10 entries) | disasm | med |
| 0x100A0C90 | 0x000A0C90 | Packet_ID_PLAYERFILE_read_structA | FriendEntry read for Packet_ID_PLAYERFILE | disasm | med |
| 0x1013C6F0 | 0x0013C6F0 | Packet_ID_PLAYERFILE_read | Playerfile packet main read/dispatch | decomp | med |
| 0x100AAD00 | 0x000AAD00 | Packet_ID_FACTION_read | Faction packet main read/dispatch (type switch) | decomp + disasm | high |
| 0x100A7720 | 0x000A7720 | Packet_ID_FACTION_read_blockA | Faction blockA read (strings/flags/lists) | decomp | med |
| 0x100A9D00 | 0x000A9D00 | Packet_ID_FACTION_read_listA | Faction listA read (header + structB + u32 list) | decomp | med |
| 0x100A6E70 | 0x000A6E70 | Packet_ID_A9_read_structB | listA entry read (u8+string+lists) | decomp | med |
| 0x100AAC20 | 0x000AAC20 | Packet_ID_FACTION_read_listB | Faction listB read (count + entries) | decomp | med |
| 0x100A9680 | 0x000A9680 | Packet_ID_FACTION_read_listB_entry | Faction listB entry (u8c + list of Packet_ID_A5_read_struct2) | decomp | med |
| 0x100A99F0 | 0x000A99F0 | Packet_ID_FACTION_read_listC | Faction listC read (count + entries) | decomp | med |
| 0x100A6390 | 0x000A6390 | Packet_ID_FACTION_read_listC_entry | Faction listC entry (u8c + u32c list of pairs) | decomp | med |
| 0x100A74F0 | 0x000A74F0 | Packet_ID_FACTION_read_block_107C | Faction block_107C read (u16/u16 + entries) | decomp | med |
| 0x1009F9A0 | 0x0009F9A0 | Packet_ID_FACTION_read_block_107C_entry | block_107C entry read (u32/u8/u32s + 4 strings) | decomp | med |
| 0x100A7060 | 0x000A7060 | Packet_ID_FACTION_read_block_1090 | Faction block_1090 read (u8 count + block_10A0 entries) | decomp | med |
| 0x1009EE50 | 0x0009EE50 | Packet_ID_FACTION_read_block_10A0 | block_10A0 entry read (u32/u8s + 3 strings) | decomp | med |
| 0x100A75F0 | 0x000A75F0 | Packet_ID_FACTION_read_block_1160 | Faction block_1160 read (count + block_11A4 entries) | decomp | med |
| 0x1009FDA0 | 0x0009FDA0 | Packet_ID_FACTION_read_block_11A4 | block_11A4 entry read (u32/u16/bit/u8 + strings + blockC0) | decomp | med |
| 0x1009FF90 | 0x0009FF90 | Packet_ID_FACTION_read_block_1170 | block_1170 read (bit + 3 strings + u16/u8) | decomp | med |
| 0x10252B70 | 0x00252B70 | Packet_ID_FACTION_read_block_1318 | block_1318 read (u32/u32 + list of u16/u8/bit) | decomp | med |
| 0x100A02E0 | 0x000A02E0 | Packet_ID_FACTION_read_block_1340 | block_1340 read (u32/bit/u32/u16 + 0x1E entries) | decomp | med |
| 0x100A06F0 | 0x000A06F0 | Packet_ID_FACTION_read_block_1738 | block_1738 read (u8/u32/u8s/bit + strings + u32s) | decomp | med |
| 0x100A9EB0 | 0x000A9EB0 | Packet_ID_FACTION_read_block_17BC | block_17BC read (u8 count + entry w/ block_0D50) | decomp | med |
| 0x1011AD30 | 0x0011AD30 | Packet_ID_A9_read | Packet_ID_A9 main read/dispatch (type switch) | decomp | high |
| 0x10119210 | 0x00119210 | Packet_ID_A9_read_structA | Packet_ID_A9 structA read | decomp | med |
| 0x1011A5E0 | 0x0011A5E0 | Packet_ID_A9_read_structA_list | Packet_ID_A9 structA list read | decomp | med |
| 0x101181E0 | 0x001181E0 | Packet_ID_A9_read_structC | Packet_ID_A9 structC read (4x u8) | decomp | med |
| 0x10118230 | 0x00118230 | Packet_ID_A9_read_structC2 | Packet_ID_A9 structC2 read (u8/u32/string + conditional tail) | decomp | med |
| 0x101182F0 | 0x001182F0 | Packet_ID_A9_read_structC3 | Packet_ID_A9 structC3 read (u32/strings/u32s + bit + u8) | decomp | med |
| 0x10119030 | 0x00119030 | Packet_ID_A9_read_structD | Packet_ID_A9 structD read (u32/u8/strings + sublists) | decomp | med |
| 0x10118B00 | 0x00118B00 | Packet_ID_A9_read_structD_sub_B8 | structD sublist (u32 count + structC2) | decomp | med |
| 0x10118DE0 | 0x00118DE0 | Packet_ID_A9_read_structD_sub_F8 | structD sublist (u16/u16 + u8 count + structC2) | decomp | med |
| 0x10118F50 | 0x00118F50 | Packet_ID_A9_read_structD_sub_10C | structD sublist (u32 count + structC3) | decomp | med |
| 0x1011AC50 | 0x0011AC50 | Packet_ID_A9_read_structD_list | Packet_ID_A9 structD list read | decomp | med |
| 0x100A7950 | 0x000A7950 | Packet_ID_FACTION_read_block_0D50 | Faction block_0D50 read (u16 count + FriendEntry list) | decomp | med |
| 0x100A72D0 | 0x000A72D0 | Packet_ID_FACTION_read_block_0D78 | Faction block_0D78 read (count + entries) | decomp | med |
| 0x1009F580 | 0x0009F580 | Packet_ID_FACTION_read_block_0D78_entry | block_0D78 entry read (u32/u8/strings) | decomp | med |
| 0x1009F050 | 0x0009F050 | Packet_ID_FACTION_read_block_0E08 | Faction block_0E08 read | decomp | med |
| 0x100A7350 | 0x000A7350 | Packet_ID_FACTION_read_block_0E2C | Faction block_0E2C read (count + 2x u32 + 3x string) | decomp | med |
| 0x100A71E0 | 0x000A71E0 | Packet_ID_FACTION_read_block_0E3C | Faction block_0E3C read (count + entries) | decomp | med |
| 0x1009F350 | 0x0009F350 | Packet_ID_FACTION_read_block_0E3C_entry | block_0E3C entry read (u32s/strings + optional blockC0) | decomp | med |
| 0x100A7810 | 0x000A7810 | Packet_ID_FACTION_read_block_0FD4 | Faction block_0FD4 read (count + entries) | disasm | med |
| 0x100A05E0 | 0x000A05E0 | Packet_ID_FACTION_read_block_0FD4_entry | block_0FD4 entry read (u32 + 3x string + blockC0) | disasm | med |
| 0x100A78B0 | 0x000A78B0 | Packet_ID_FACTION_read_block_1784 | Faction block_1784 read (u16/u16 + entries) | decomp | med |
| 0x100A08B0 | 0x000A08B0 | Packet_ID_FACTION_read_block_1784_entry | block_1784 entry read (u8/u32/u8/u32 + strings + u32) | decomp | med |
| 0x10251DA0 | 0x00251DA0 | Packet_ID_FACTION_read_blockA_struct_4C0 | blockA sub-struct (6x u32 + u8 list) | decomp | med |
| 0x100A7110 | 0x000A7110 | Packet_ID_FACTION_read_blockA_list_4E8 | blockA list (u32 + u8 + string) | decomp | med |
| 0x100C87E0 | 0x000C87E0 | Packet_ID_MARKET_read_structB | Market structB read (u8/u16/u32s/bit/u8s/bit) | disasm | med |
| 0x100C89A0 | 0x000C89A0 | Packet_ID_MARKET_read_structC | Market structC read (u8/u8/u16/bit/u8) | disasm | med |
| 0x100C8A10 | 0x000C8A10 | Packet_ID_MARKET_read_structC2 | Market structC2 read (u8/u8/u16/bit) | disasm | med |
| 0x100C9CE0 | 0x000C9CE0 | Packet_ID_MARKET_read_listC | Market listC read (structA + entries + string) | disasm | med |
| 0x100C9EC0 | 0x000C9EC0 | Packet_ID_MARKET_read_listB | Market listB read (ItemStructA + u32c/u16c/u32c) | disasm | med |
| 0x100CA060 | 0x000CA060 | Packet_ID_MARKET_read_block | Market block read (u16 + 5x 9-bit values) | disasm | med |
| 0x100CA150 | 0x000CA150 | Packet_ID_MARKET_read_block6 | Market block6 read (6x block) | disasm | med |
| 0x100CA180 | 0x000CA180 | Packet_ID_MARKET_read | Market packet main read/dispatch | decomp | med |
| 0x1025C7B0 | 0x0025C7B0 | Packet_ID_MARKET_read_listD | Market listD read (u16/u8/u16) | disasm | med |
| 0x1025C720 | 0x0025C720 | MarketListD_Insert | Inserts 6-byte market listD entry | decomp | low |
| 0x1025B1D0 | 0x0025B1D0 | Packet_ID_MARKET_read_listE | Market listE read (u16/u32) | disasm | med |
| 0x1025AE90 | 0x0025AE90 | U32PairList_InsertRange | Vector insert/reserve for 8-byte entries | decomp | low |
| 0x1025A990 | 0x0025A990 | U32Pair_FillN | Fills N 8-byte entries with a single entry | decomp | low |
| 0x1025B880 | 0x0025B880 | MarketFilter_MatchesItem | Applies type/id/req flags to item; returns match | decomp | low |
| 0x10267840 | 0x00267840 | Packet_ID_MARKET_read_listA | Market listA read (structA + 3x u32c) | disasm | med |

### Code (packet read helpers: skills)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10141890 | 0x00141890 | Packet_ID_SKILLS_read | Skills packet main read/dispatch | decomp | high |
| 0x1024AD30 | 0x0024AD30 | Packet_ID_SKILLS_read_list | Skills list read (header + entries) | decomp | med |
| 0x1024ACA0 | 0x0024ACA0 | Packet_ID_SKILLS_read_list_insert | Skills list insert helper | disasm | med |

### Code (packet ctors / IDs)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10090870 | 0x00090870 | Packet_ID_MOVE_ITEMS_ctor | Packet ID = -118 (0x8A) | decomp | high |
| 0x10190890 | 0x00190890 | Packet_ID_ITEMS_CHANGED_ctor | Packet ID = -126 (0x82) | decomp | high |
| 0x10192AB0 | 0x00192AB0 | Packet_ID_ITEMS_REMOVED_ctor | Packet ID = -127 (0x81) | decomp | high |
| 0x10196600 | 0x00196600 | Packet_ID_ITEMS_ADDED_ctor | Packet ID = -109 (0x93) | decomp | high |
| 0x10180740 | 0x00180740 | Packet_ID_USE_ITEM_ctor | Packet ID = -92 (0xA4) | decomp | high |
| 0x1008F500 | 0x0008F500 | Packet_ID_UNLOAD_WEAPON_ctor | Packet ID = -113 (0x8F) | decomp | high |
| 0x1018C3C0 | 0x0018C3C0 | Packet_ID_ITEM_REMOVED_ctor | Packet ID = -120 (0x88) | decomp | high |
| 0x1010A540 | 0x0010A540 | Packet_ID_MERGE_ITEMS_ctor | Packet ID = -112 (0x90) | decomp | high |
| 0x100AC5F0 | 0x000AC5F0 | Packet_ID_BACKPACK_CONTENTS_ctor | Packet ID = -110 (0x92) | decomp | high |
| 0x1019E3F0 | 0x0019E3F0 | Packet_ID_WEAPONFIRE_ctor | Packet ID = -121 (0x87) | decomp | high |
| 0x101C4AF0 | 0x001C4AF0 | Packet_ID_RELOAD_ctor | Packet ID = -111 (0x91) | decomp | high |
| 0x1013D9A0 | 0x0013D9A0 | Packet_ID_MAIL_ctor | Packet ID = -116 (0x8C) | decomp | high |
| 0x1010A6A0 | 0x0010A6A0 | Packet_ID_SPLIT_CONTAINER_ctor | Packet ID = -94 (0xA2) | decomp | high |
| 0x101677F0 | 0x001677F0 | Packet_ID_REPAIR_ITEM_ctor | Packet ID = -83 (0xAD) | decomp | high |
| 0x10166A90 | 0x00166A90 | Packet_ID_RECYCLE_ITEM_ctor | Packet ID = -82 (0xAE) | decomp | high |
| 0x101806E0 | 0x001806E0 | Packet_ID_NAME_CHANGE_ctor | Packet ID = -114 (0x8E) | decomp | high |
| 0x100AD1C0 | 0x000AD1C0 | Packet_ID_FRIENDS_ctor | Packet ID = -105 (0x97) | decomp | high |
| 0x10032740 | 0x00032740 | Packet_ID_STORAGE_ctor | Packet ID = -103 (0x99) | decomp | high |
| 0x1010F670 | 0x0010F670 | Packet_ID_MINING_ctor | Packet ID = -102 (0x9A) | decomp | high |
| 0x10163320 | 0x00163320 | Packet_ID_PRODUCTION_ctor | Packet ID = -101 (0x9B) | decomp | high |
| 0x100C7DC0 | 0x000C7DC0 | Packet_ID_MARKET_ctor | Packet ID = -100 (0x9C) | decomp | high |
| 0x1009C390 | 0x0009C390 | Packet_ID_FACTION_ctor | Packet ID = -99 (0x9D) | decomp | high |
| 0x1013C110 | 0x0013C110 | Packet_ID_PLAYERFILE_ctor | Packet ID = -97 (0x9F) | decomp | high |
| 0x10141800 | 0x00141800 | Packet_ID_SKILLS_ctor | Packet ID = -93 (0xA3) | decomp | high |
| 0x1015DE50 | 0x0015DE50 | Packet_ID_A5_ctor | Packet ID = -91 (0xA5; name TBD) | disasm | med |
| 0x100CC840 | 0x000CC840 | Packet_ID_PLAYER2PLAYER_ctor | Packet ID = -86 (0xAA) | disasm + RTTI | med |
| 0x1018C2E0 | 0x0018C2E0 | Packet_ID_LOGIN_REQUEST_RETURN_Ctor | Packet ID = 0x6D (LOGIN_REQUEST_RETURN) | disasm | high |

| 0x10196320 | 0x00196320 | Packet_ID_LOGIN_RETURN_Ctor | Packet ID = 0x6F (LOGIN_RETURN) | decomp | high |

| 0x100897E0 | 0x000897E0 | Packet_ID_LOGIN_TOKEN_CHECK_Ctor | Packet ID = 0x70 (LOGIN_TOKEN_CHECK) | disasm | med |
| 0x101BFE00 | 0x001BFE00 | Packet_ID_WORLD_LOGIN_Ctor | Packet ID = 0x72 (WORLD_LOGIN) | disasm | high |

### Packet layouts (CShell.dll)

Notes:
- Bitstream read helpers: sub_1000C990 = ReadCompressed<u32>, sub_1000C9F0 = ReadCompressed<u16>, sub_101C9AA0 = ReadCompressed<N bits>, sub_1023D7B0 = u16 count + count*u32 list, sub_102550A0 = u32 + ItemEntry.
- u64c helper: sub_100AB5D0 = ReadCompressed<u64>; sub_100AB660 = WriteCompressed<u64>.
- UI helper: CWindowMgr_GetWindowById @ 0x10107540 (id < 0x5D) => *(this + 0x30 + id*4), else 0.
- ItemEntry read helper: sub_10254F80 (details below).
- Offsets are relative to the packet object base (VariableSizedPacket-derived).

#### Bitstream encoding (exact bit order)

Bit order:
- sub_10032840 reads one bit: MSB-first within each byte (mask = 0x80 >> (bitpos & 7)).
- sub_101C9930 reads raw bits; for the last partial byte (a4=1), it right-shifts so bits are LSB-aligned.
- sub_101C96C0 writes raw bits; for partial byte (a4=1), it left-shifts so bits are written MSB-first.

Byte order / endian:
- sub_101CA120 returns true on little-endian hosts (uses htonl check).
- When true, sub_101CA080 reverses byte order for 16/32/64-bit values.
- Stream representation is big-endian byte order for multi-byte values.

Compressed integer format (sub_101C9AA0 / sub_101C9810, a4=1 unsigned):
- For each high-order byte (MSB?LSB, excluding the lowest byte):
  - Read/Write 1 control bit.
  - 1 = byte omitted (implicitly 0x00). 0 = remaining bytes are stored raw and decoding stops.
- Lowest byte:
  - Read/Write 1 control bit.
  - 1 = only low nibble stored (4 bits); high nibble implicitly 0x0.
  - 0 = full 8 bits stored.
- For signed (a4=0), the implicit byte is 0xFF and high nibble 0xF (sign-extend).

Convenience legend:
- u8c/u16c/u32c = compressed unsigned (per above).
- bits(N) = raw bitfield via sub_101C9930/sub_101C96C0 (MSB-first stream order).

#### Packet_ID_LOGIN_REQUEST_RETURN (ID 0x6D) - master->client

Read: Packet_ID_LOGIN_REQUEST_RETURN_Read @ 0x1018DCE0; handler: HandlePacket_ID_LOGIN_REQUEST_RETURN @ 0x1018E1F0.

Fields (read order):
- u8c @+0x430 (status/result via BitStream_ReadBitsCompressed).
- string @+0x431 (session_str) via LTClient string read (max 2048 bytes).

Notes:

#### Packet_ID_LOGIN_RETURN (ID 0x6F) - master->client

Read: Packet_ID_LOGIN_RETURN_Read @ 0x101935F0; handler: HandlePacket_ID_LOGIN_RETURN @ 0x10196900.

Notes:
- See Docs/Packets/ID_LOGIN_RETURN.md for full wire order + structs.
- Success/NO CHARACTER paths gate on `clientVersion` (u16) <= `0x073D`; if higher, handler shows UI msg 1720 (outdated client) and aborts the flow.

Notes:
- When fromServer=false: requestToken string (max 32). When true: success bit + username string (max 32).

#### Packet_ID_LOGIN_TOKEN_CHECK (ID 0x70) - bidirectional

Read: Packet_ID_LOGIN_TOKEN_CHECK_Read @ 0x1008AA10; handler: HandlePacket_ID_LOGIN_TOKEN_CHECK @ 0x1018DA20.

Write: Packet_ID_LOGIN_TOKEN_CHECK_Write @ 0x1008AAA0; send path: LoginUI_Update_SendLoginTokenCheck @ 0x1008B6D0 (requestToken from "LoginToken").

Fields (read order):

-- String helpers: VariableSizedPacket_ReadString @ 0x1008A950, VariableSizedPacket_WriteString @ 0x1008A890.

- bit fromServer @+0x430.
- if fromServer: bit success @+0x431; username string @+0x452 (max 32).
- else: requestToken string @+0x432 (max 32).

Handler behavior:
- If UI slot exists and flag set, calls sub_10089620(flag, buffer) -> UiText_SetValueIfChanged + LoginToken UI toggle.

Notes:
- When fromServer=false: requestToken string (max 32). When true: success bit + username string (max 32).

Login packet dependency chains (CShell.dll):
- ID 0x6D: CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_LOGIN_REQUEST_RETURN -> Packet_ID_LOGIN_REQUEST_RETURN_Read -> Packet_InitBitStreamFromPayload -> BitStream_ReadBitsCompressed + LTClient DecodeString.
- ID 0x6F: CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_LOGIN_RETURN -> Packet_ID_LOGIN_RETURN_Read -> Packet_InitBitStreamFromPayload -> ReadBitsCompressed + Read_u32c + Read_u16c + LTClient DecodeString + Read_Vector_U32c + Apartment_Read.
- ID 0x70 (recv): CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_LOGIN_TOKEN_CHECK -> Packet_ID_LOGIN_TOKEN_CHECK_Read -> Packet_InitBitStreamFromPayload -> BitStream_ReadBit_u8 + ReadString(0x20).
- ID 0x70 (send): LoginUI_Update_SendLoginTokenCheck -> Packet_ID_LOGIN_TOKEN_CHECK_Ctor -> Packet_ID_LOGIN_TOKEN_CHECK_Write -> LTClient_SendPacket_BuildIfNeeded (requestToken from "LoginToken").
- ID 0x73: CGameClientShell_OnMessage -> ClientShell_OnMessage_DispatchPacketId -> HandlePacket_ID_WORLD_LOGIN_RETURN_73 -> Packet_ID_WORLD_LOGIN_RETURN_Read -> Packet_InitBitStreamFromPayload -> ReadBitsCompressed + Read_u32c + Read_u16c.

#### Packet_ID_WORLD_LOGIN (ID 0x72) - client->world

Write: Packet_ID_WORLD_LOGIN_Write @ 0x101C09F0; send via WorldLogin_StateMachineTick @ 0x101C0E10.

Fields (write order):
- u8c @+0x430 (worldId).
- u8c @+0x431 (worldInst).
- u32c @+0x434 (playerId, from SharedMem g_pPlayerStats[0x5B]).
- u32c @+0x438 (worldConst = 0x13BC52).

State machine (SharedMem[0x1EEC0]):
- 0 -> idle.
- 1 -> send 0x72; WorldLogin_StateMachineTick sets state=2 before send.
- 2 -> wait for g_LTClient vtbl+0x08 (connected gate); when true -> state=3.
- 3 -> load world (WorldLogin_LoadWorldFromPath / WorldLogin_LoadApartmentWorld), then clears 0x1EEC0/0x1EEC1/0x1EEC2.

#### Packet_ID_WORLD_LOGIN_RETURN (ID 0x73) - world->client

Read: Packet_ID_WORLD_LOGIN_RETURN_Read @ 0x1018DDA0; handler: HandlePacket_ID_WORLD_LOGIN_RETURN_73 @ 0x1018E340.

Fields (read order):
- u8c @+0x430 (code).
- u8c @+0x431 (flag).
- u32c @+0x434 (worldIp).
- u16c @+0x438 (worldPort).

Notes:
- code==1 -> WorldLoginReturn_HandleAddress @ 0x101C0D60 (calls g_LTClient->Connect).
- WorldLoginReturn_HandleAddress rejects unassigned SystemAddress (g_SystemAddress_Unassigned2 = 0xFFFFFFFFFFFF) and shows msg 1722.
- code==8 -> WorldLoginReturn_ScheduleRetry @ 0x1018C570.
- code in {2,3,4,6,7} -> LoginUI_SetMessageText (msg ids 1723/1734/1724/1735/1739) + LoginUI_ShowMessage(5).
- code unknown -> LoginUI_SetMessageText(1722) + logs unknown return code.

Client interface calls observed:
- g_LTClient vtbl+0x18: ConnectToWorld(SystemAddress*). Called from WorldLoginReturn_HandleAddress with stack SystemAddress (worldIp+worldPort).
- g_LTClient vtbl+0x08: IsConnected? gate in WorldLogin_StateMachineTick before advancing to state=3.

#### Packet_ID_7B (ID 0x7B) - server->client (world select + other subtypes)

Read: Packet_ID_7B_Read @ 0x10106590; handler: HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270.

Fields (read order):
- u32c @+0x430 (playerId).
- u8c  @+0x434 (type).

Type-specific payload:
- type=2 -> ItemList_Read @ 0x102404E0 into +0x438.
- type=3 -> u32c @+0x45C, u8c @+0x435, u8c @+0x436.
- type=4 -> u8c @+0x435, u8c @+0x436. (worldId, worldInst)
- type=5 -> no extra (client->world list request).
- type=6 -> Packet_ID_7B_ReadSubId6List @ 0x1026F2E0 on +0x460 (list payload).
- type=7 -> u8c @+0x435, u8c @+0x436. (client->world travel request: worldId, nodeId)

Handler behavior:
- if type==4 and playerId matches g_pPlayerStats[0x5B], sets SharedMem[0x1EEC1/0x1EEC2]=worldId/inst, sets 0x1EEC0=1, shows LoginUI msg 0x0B.
- if type==6, routes +0x460 payload to WorldSelect_HandleSubId6Payload (window id 0x31).
- type==7 is parsed but ignored by CShell handler (client->world only).

SubId=6 payload (Packet_ID_7B_ReadSubId6List @ 0x1026F2E0):
- entry_count (u8c), then per-entry: u8 key, u32 mask (read then bitwise inverted), u16a, u16b, listB entry, listC entry.
- trailing 3x u32c stored at +0x10/+0x14/+0x18 of the sub6 payload struct (meta_a/meta_b/meta_c).
- entry struct size is 0x3C (60 bytes). Init/reset helpers: sub_101231B0 / sub_10123100; copy helper: sub_10176BA0.
- UI usage:
  - byte_659E2954[60 * worldId] is treated as classId (3140+ string ids, base cost tier).
  - dword_659E2970[15 * worldId] is treated as nodeCount (node list entries).

#### Packet_ID_7D (ID 0x7D) - server->client (SharedMem update)

Read/handler: HandlePacket_ID_7D_WriteSharedMem_0x2BD0 @ 0x10181A00; parse via Packet_InitBitStreamFromPayload + Read_u32c.

Behavior:
- Reads u32c into temp, reads 12-byte block from SharedMem[0x2BD0] (SharedMem_ReadBlock_std), writes back block {dword0=temp, dword1=0, dword2=1}.

Notes:
- 0x2BD0 block is consumed by an inventory/production UI update path (uses dword2 as ?dirty? flag; when set and dword1==0, it updates UI text, then clears dword2 via SharedMem2BD0_WriteBlock12).
- UI text uses SharedMem[0x2BD3] string; if dword0>0 it clears 0x2BD3 and shows string id 0x14BC; else it writes the window?s string into 0x2BD3 and shows it.

#### Packet_ID_USE_ITEM (ID -92) - server?client

Read: Packet_ID_USE_ITEM_read @ 0x10181200 (decomp); handler: 0x1018F110.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u32c @+0x434 (sub_1000C990); item lookup key in sub_1023F010/sub_1023DE50.
- bit @+0x438 (flag; direct bit read).
- u8c  @+0x439 (compressed u8; handler accepts 0x17-0x1C).

Handler behavior (HandlePacket_ID_USE_ITEM @ 0x1018F110):
- playerId must match SharedMem[0x5B], else returns early.
- itemKey resolves via sub_1023F010(list, key, itemEntry) when useItemKey=1; else via ItemsAddedPayload_FindEntryByVariantId.
- if slotIndex != 0 and in 23..28, uses sub_1018BA80(list+760, slotIndex, itemEntry) to place into slot (fails => abort).
- marks list dirty on success.
- UI message: if itemId not in {1802, 1805}, builds item name (string id itemId+30000) and displays message 4363 via sub_10180D40.

#### Packet_ID_MOVE_ITEMS (ID -118) ? server?client

Read: Packet_ID_MOVE_ITEMS_read @ 0x10090910 (decomp); handler: 0x10190D70.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- list @+0x434 via sub_1023D7B0: u16c count + count*u32c entries.
- u8c @+0x440 (op1).
- u8c @+0x441 (op2).
- u8c @+0x442 (op3).
- u8c @+0x443 (op4).

MoveItems op dispatch (observed in handler; op1/op2 are 1..17):
- list_count at +0x43C (from sub_1023D7B0); many branches require list_count == 1.
- op1=1: op2=2 -> InvSlots_5_16_Add/Remove using op4; op2=3 -> InvSlots_1_3_Add/Remove using op4; op2=4 -> InvSlots_23_28_Add with auto slot via InvSlots_26_29_FindFree; op2=5 -> InvSlots_18_21_Set using op4; op2=6/8/13 -> list-based ops (sub_1023DF00/sub_1023F120/sub_10240180).
- op1=2: op2 in {1,6,8,13} -> InvSlots_5_16_Get/Remove using op3 (list_count==1).
- op1=3: op2 in {1,6,8,13} -> InvSlots_1_3_Get/Remove using op3 (list_count==1); op2=3 -> InvSlots_1_3_Swap(op3, op4).
- op1=4: op2=1 -> InvSlots_23_28_Get/Remove using op3 (list_count==1).
- op1=5: op2=5 -> InvSlots_18_21_Swap(op3, op4); else clears slot state.
- op1=6: op2=2 -> InvSlots_5_16_Add using op4; op2=3 -> InvSlots_1_3_Add using op4; op2=1/8/13 -> list-based ops.
- op1=11: op2=2 -> InvSlots_5_16_Add using op4; op2=3 -> InvSlots_1_3_Add using op4; op2=1/6/8/13 -> list-based ops.
- op1=13: op2 in {1,6,8} -> list-based ops (op2=6 path uses sub_1023FE50 + sub_1023F120).
- op1=17: op2 in {8,13} -> list-based ops (sub_1023F120 or sub_10240180).

MoveItems slot helpers (slot ranges from bounds checks):
- 0x1018BBA0 InvSlots_5_16_Add (slots 5..16; 48-byte ItemEntry).
- 0x1018BBF0 InvSlots_5_16_Get (slots 5..16; by item id).
- 0x1018BC40 InvSlots_5_16_Remove (slots 5..16; by item id).
- 0x1018BD10 InvSlots_1_3_Add (slots 1..3).
- 0x1018BE10 InvSlots_1_3_Get (slots 1..3; by item id).
- 0x1018BE60 InvSlots_1_3_Remove (slots 1..3; by item id).
- 0x1018BD60 InvSlots_1_3_Swap (swap 1..3).
- 0x1018BA80 InvSlots_23_28_Add (slots 23..28).
- 0x1018BAE0 InvSlots_23_28_Get (slots 23..28; by item id).
- 0x1018BB30 InvSlots_23_28_Remove (slots 23..28; by item id).
- 0x1018BB80 InvSlots_26_29_FindFree (returns 26..29; 29 if full).
- 0x1018BFC0 InvSlots_18_21_Set (slots 18..21; writes 16-bit field).
- 0x1018BFF0 InvSlots_18_21_Swap (swap 18..21).
- Equip slot mask only tracks slots 5..16 (SharedMem[0x1D69F], bit = slot-4).

MoveItems list helpers:
- sub_1023DF00: validate list of item IDs; optional output list build (used before list-based ops).
- sub_1023F120: remove listed items from inventory list (returns 0 on missing).
- ItemList_MoveFromList @ 0x1023FFE0: move items listed in a3 from list a2 into this (uses sub_1023F010 + sub_1023FBB0; optional per-item notify).
- ItemList_MoveFromList_Param @ 0x10240180: same as above but sets extra param (a4) on each entry before insert.
- ItemList_AddList @ 0x1023FE50: insert all entries from list a2 into this via sub_1023FBB0.
- sub_1023FD50: merge/stack list entries into inventory (uses sub_1023E450 / sub_1023D1A0).

#### Packet_ID_ITEMS_CHANGED (ID -126) ? server?client

Read: Packet_ID_ITEMS_CHANGED_read @ 0x10190990 (decomp); handler: 0x10190B90.

Write: Packet_ID_ITEMS_CHANGED_write @ 0x10190920 (list walk over +0x438, count @+0x43C).

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c count (sub_101C9AA0) -> stored at +0x43C.
- repeat count times: ItemEntryWithId (ItemEntryWithId_read @ 0x102550A0).
  - u32c entryId (sub_1000C990).
  - ItemEntry (ItemStructA_read @ 0x10254F80; see below).

Handler behavior (HandlePacket_ID_ITEMS_CHANGED @ 0x10190B90):
- playerId must match SharedMem[0x5B], else returns early.
- for each ItemEntryWithId:
  - type=3: list = g_LTClient vtbl+88(arg0); sub_1018D3C0(list+0x264, entryId, entryPtr).
  - type=5/6: g_LTClient vtbl+88(arg0); sub_1018D320(entryId, entryPtr).
  - type=16/17/18/19: list = g_LTClient vtbl+88(arg0); if sub_1023F010(list, entryId, temp) then:
    - sub_1023FBB0(list, entryPtr); mark list dirty.
    - update window id 64 via sub_10133E70(window, templateId, countDelta).

#### Packet_ID_ITEMS_REMOVED (ID -127) ? server?client

Read: Packet_ID_ITEMS_REMOVED_read @ 0x1018DE80 (decomp); handler: 0x10192D40.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c  @+0x434 (sub_101C9AA0; reason/type).
- list @+0x438 via Read_u32c_list_u16count: u16c count + count*u32c entries.

Handler behavior (HandlePacket_ID_ITEMS_REMOVED @ 0x10192D40):
- playerId must match SharedMem[0x5B], else returns early.
- removeType=1: for each id in list, sub_1018D350(id, temp); if 1<=itemId<=0xBC0:
  - equipSlot = ItemTemplate_GetEquipSlot(itemId); sub_10035530(dword_103BF748, equipSlot).
  - shows UI msg (string id 4316) with item name string (id + 30000) via sub_10180D40.
- removeType=3: list = g_LTClient vtbl+88(arg0); sub_1023F120(list, idList); mark list dirty.
- removeType=6: list = g_LTClient vtbl+88(arg0); window id 35:
  - clears slots 47..0x32 via sub_1014C0E0, then sub_1023FE50(list, tempList) and sub_1023F120(list, idList); mark list dirty.

#### Packet_ID_ITEMS_ADDED (ID -109) ? server?client

Read: Packet_ID_ITEMS_ADDED_read @ 0x1018DFD0 (decomp); handler: 0x10197030.

Write: Packet_ID_ITEMS_ADDED_write @ 0x101966B0.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c @+0x434 (type).
- if type==3: u8c @+0x435 (subtype).
- payload @+0x438 via sub_102404E0 (see below).

Handler behavior (HandlePacket_ID_ITEMS_ADDED @ 0x10197030):
- playerId must match SharedMem[0x5B], else returns early.
- type=1: merges payload into list from g_LTClient vtbl+88(arg0) via sub_1023FD50; marks list dirty; updates window id 64 with item id/qty list.
- type=3: subtype=1 merges into list arg0; subtype=3 merges into list arg3; subtype=2 merges into window id 19 list at +0x1928 (offset 6440) and refreshes window.
- type=4: merges into window id 19 list at +0x1928; shows UI message string id 4337 (fallback byte_102A8B98), calls sub_1016B5F0 then refreshes window.
- type=5: merges into list arg3; type=6: merges into list arg0.
- type=7: merges into list arg0; if sub_1023CF40(payload,7) then sub_1018BC90(list+36,6,0); marks dirty.
- type=8: iterates payload list; for each item template, calls sub_1018BC90(list+36, equipSlot, 0) then sub_1018BBA0(list+36, equipSlot, entry+8); marks dirty.

#### Packet_ID_UNLOAD_WEAPON (ID -113) - server?client

Read: Packet_ID_UNLOAD_WEAPON_read @ 0x1008FDE0 (decomp); handler: 0x1018EA20.

Fields (read order):
- u32c @+0x434 (sub_1000C990); compares to sub_100079B0(91).
- u8c  @+0x438 (mode; handler uses 2/3).
- if mode==2: ItemEntryWithId @+0x43C (sub_102550A0).
- if mode==1 or 2: u32c @+0x430 (sub_1000C990).

Handler behavior (HandlePacket_ID_UNLOAD_WEAPON @ 0x1018EA20):
- playerId must match SharedMem[0x5B], else returns early.
- mode=2: list = g_LTClient vtbl+88(arg0); insert ItemEntryWithId via sub_1023FBB0.
  - if sub_1018D3F0(list+612, itemKey, tempEntry) then sub_1018D3C0(list+612, tempEntry, tempEntry).
  - else if ItemsAddedPayload_FindEntryByVariantId(list, itemKey, tempEntry) then sub_1023F010(list, tempEntry, 0) + sub_1023FBB0(list, tempEntry).
  - mark list dirty.
- mode=3: shows UI error message string id 5339 via sub_10180D40.

#### Packet_ID_ITEM_REMOVED (ID -120) - server->client

Read: Packet_ID_ITEM_REMOVED_read @ 0x1018DED0 (decomp); handler: 0x1018E550.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c  @+0x434 (sub_101C9AA0; handler uses 1/2/3).
- u32c @+0x438 (sub_1000C990).
- bit  @+0x43C (flag).

Handler behavior (HandlePacket_ID_ITEM_REMOVED @ 0x1018E550):
- playerId must match SharedMem[0x5B], else returns early.
- type=1: removes entry via sub_1018D350; if 1<=itemId<=0xBC0, clears equip slot mask and (if flag) shows UI msg 4316 with item name.
  - if removing current weapon and no variants left, sets SharedMem[0x9C]=1.
- type=2: uses list+612 path (sub_1018BEB0) to drop item; if itemId in range, shows UI msg 4316.
- type=3: list = g_LTClient vtbl+88(arg0); sub_1023F010(list, itemKey, 0); mark dirty.

#### Packet_ID_UPDATE (ID -130) ? client->server (weaponfire/update payload)

Read: Packet_ID_UPDATE_read @ 0x1019F570 (decomp).

Write: Packet_ID_UPDATE_write @ 0x101A0630 (decomp; writes terminating u8=0 after entries).

Send: SendPacket_UPDATE @ 0x101A27A0 (builds Packet_ID_UPDATE, appends WeaponFireEntry records, sends if count>0).

Notes:
- CNetworkMgrClient_DispatchPacketId has no inbound case for ID 0x7E (default case).
- Entry count stored at +0x430, capped at 10 (see WeaponFireEntry_add @ 0x101A14C0).
- Bitstream payload is a sequence of WeaponFireEntry records written into packet stream at +0x0C, terminated by a zero type byte (no explicit count observed).
- Vtable xrefs for off_102CED90 only at ctor (0x1019E3C6) and SendPacket_UPDATE (0x101A2835); no inbound read path found.

#### Packet_ID_UPDATE (ID -130) payload: WeaponFireEntry list (client->server)

- WeaponFireEntry_add @ 0x101A14C0 (adds entry if count<10; increments count @+0x430).
- WeaponFireEntry_write @ 0x101A1440 (writes entry type + fields into packet bitstream).
- WeaponFireEntry_build_from_state @ 0x101A2390 populates most fields prior to write:
  - +0x04 = SharedMem[0x5B] (player id)
  - +0x0C/+0x0E/+0x10 = int16 position from ILTClient object pos
  - +0x14 = yaw degrees (rot + pi, rad->deg)
  - +0x18/+0x1C/+0x20 = packed vec values or config values depending on SharedMem[0] (state 4/30/31 special cases)
  - +0x22..+0x53 = BitfieldBlock_0x30 copy (0x32 bytes from ILTClient vtbl+0x58)
  - +0x64 = int from SharedMem_ReadFloat_std(0x1D6A5)
  - +0x68.. = StatGroup_Read group 2 (0x3C bytes)
  - +0x6C = SharedMem[0x8F]
  - +0x74 = bool from WeaponFire sharedmem state (0x3042==1 or 0x3041==1/2)
  - +0x78 = SharedMem[0x3046] if (this+202)>0 else 0
  - +0x80 = SharedMem[0x1D6A4] (overridden to 61/62/63 for flags 0x1EEC3 / sub_100387C0 / 0x8D)
  - +0x84 = (SharedMem[0x1CEC2] == 2)
  - +0x86 = SharedMem[0x303E] (current weapon id)
  - +0x8C/+0x8E/+0x90 = int16 vector from dword_103BF75C (clamped via Vec3_IsWithinBounds_511 / Vec3_ScaleToLength)
  - +0x96 = SharedMem_ReadU16_std(120479) (equip slot mask)
  - +0x98 = u8 from SharedMem[(dword_103BF748+4), 0xA7]
  - +0x9C = WeaponFireEntry_pick_list_entry @ 0x101A21A0
  - +0xA3 = ShieldSetting (sub_1002B310(\"ShieldSetting\", 50))
  - +0xB0 = u8 from SharedMem[0x1EA3E]
  - +0xB4 = StatGroup_Read group 8 (u32)

WeaponFireEntry type1 (write @ 0x101A1310):
- u32c @+0x00
- u32c @+0x04
- u8c  @+0x08
- bit + u32c @+0x0C if >0
- bit + 3 bits @+0x10 if >0
- u32c @+0x14
- then type2 payload (same entry object) via WeaponFireEntry_type2_write

WeaponFireEntry type2 (write @ 0x101A00B0):
- u32c @+0x04
- Write_QuantVec3_And9 @+0x08
- Write_BitfieldBlock_0x30 @+0x22
- bit @+0x84
- if bit==0, optional fields in order:
  - u8  = (dword @+0x64) + 0x5A (8 bits)
  - bit + 12 bits @+0x68 if != 0x10
  - bit + 5 bits  @+0x6C if >0
  - bit + u16c    @+0x86 if >0
  - bit @+0x74
  - bit + 7 bits @+0x78 if >0, then Write_QuantVec3 @+0x88
  - bit @+0x7C, then 4 bits @+0x94 and 4 bits @+0x95 if set
  - bit + 6 bits @+0x80 if >0
  - if BitfieldBlock_0x30_HasExtra(@+0x22):
    - bit + u16c @+0x96 if >0
    - optional 7 bits @+0xA3 if sub_102323C0(...) returns true
  - 8 bits @+0xA2
  - 3 bits @+0xB0
  - bit @+0xB8
  - 10 bits @+0xBC
  - 10 bits @+0xC0
  - bit @+0xA4

WeaponFireEntry type3 (write @ 0x101A0360):
- u32c @+0x04
- u16c @+0x60
- 3 bits @+0xA0
- u8c @+0xA1
- Write_QuantVec3_And9 @+0x08
- u8  @+0x85; if nonzero, stop.
- else: bit @+0x7C, 5 bits @+0x6C, 4 bits @+0x70, optional 6 bits @+0x80, optional u32c @+0x78 if 2<=field<=4, then 14 bits @+0xBC.

WeaponFireEntry type4 (write @ 0x101A04D0):
- u32c @+0x04
- u16c @+0x86
- bit @+0x84
- 14 bits @+0xBC
- sub_1019F280 @+0xC4 (unknown bitfield block)
- Write_QuantVec3_And9 @+0x08
- bit + u32c @+0x54 if >0
- bit + u32c @+0x58 if >0
- bit + u32c @+0x5C if >0
- string @+0xC8 (via vtable dword_1035AA4C->fn+0x34, max 0x800)

#### Packet_ID_WEAPONFIRE (ID -121) - client->server

Read: Packet_ID_WEAPONFIRE_read @ 0x101A0680 (decomp).

Write: Packet_ID_WEAPONFIRE_write @ 0x101A06D0.

Fields (read/write order):
- u32c @+0x430
- u16c @+0x434
- u32c @+0x438

Notes:
- No inbound dispatch case found in CNetworkMgrClient_DispatchPacketId (outbound only).

#### Packet_ID_MERGE_ITEMS (ID -112) - server->client

Read: Packet_ID_MERGE_ITEMS_read @ 0x1010AC90 (decomp); handler: 0x1018EC20.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- bit  @+0x434 (flag).
- if flag==1: ItemEntryWithId @+0x440 and @+0x470 (two full entries).
- if flag==0: u32c @+0x438 + u32c @+0x43C (two entry ids only).

Handler behavior (HandlePacket_ID_MERGE_ITEMS @ 0x1018EC20):
- playerId must match SharedMem[0x5B]; requires valid ids and entries.
- uses ItemTemplate_GetType(templateId) to choose list operations; on success marks list dirty and shows UI msg 1851.

#### Packet_ID_NAME_CHANGE (ID -114) - server->client

Read: Packet_ID_NAME_CHANGE_read @ 0x10181140 (decomp); handler: 0x1018E8F0.

Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- bits(2048) @+0x434 (raw block; MSB-first).
  - bytes[0x00..0x1F] @+0x434: null-terminated name string (passed to sub_10008A00).
  - byte[0x20] @+0x454: flag used to choose message 11219 vs 11224.
  - remaining bytes (0x21..0xFF) currently unused in handler.
- post-read: sub_100328E0(this+0x454) reads one bit from the block context.

#### Packet_ID_BACKPACK_CONTENTS (ID -110) - server->client

Read: Packet_ID_BACKPACK_CONTENTS_read @ 0x100AC6C0 (decomp); handler: 0x10196CE0.

Fields (read order):
- u32c @+0x430 (sub_1000C990) -> playerId.
- u8c  @+0x434 (reason/type).
- u32c @+0x438 (containerId?).
- u32c @+0x460 (owner/backpack id).
- payload @+0x43C via sub_102404E0 (ItemsAdded payload).
- list @+0x464 via Read_u32c_list_u16count (u16 count + u32c ids).

#### Packet_ID_MAIL (ID -116) - server->client

Read: Packet_ID_MAIL_read @ 0x1013DDC0 (decomp); handler: 0x10193740.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- mail entries via Packet_ID_MAIL_read_entries @ 0x1013DD20:
  - u8c count
  - repeat count: Packet_ID_MAIL_read_entry @ 0x1013DA40 (decomp; fields below), then Packet_ID_MAIL_entry_list_insert @ 0x1013DC60.
- bit flag @+0x444 (reads 1 bit); if set, Read_Vector_U32c @ 0x1013DB60:
  - u8c count
  - count x u32c (compressed).

Write: Packet_ID_MAIL_write @ 0x1013D2E0 (decomp).

- writes u32c @+0x430 (BitStream_Write_u32c @ 0x10031AB0, value from sub_100079B0(0x5B)).
- writes mail entries via Packet_ID_MAIL_write_entries @ 0x1013D1E0 (u8c count + Packet_ID_MAIL_write_entry).
- writes bit @+0x444; if set, Packet_ID_MAIL_write_idlist @ 0x1013D250 (u8c count + u32 list).

Packet_ID_MAIL_read_entry @ 0x1013DA40 (fields in order):
- u32c @+0x00 (sub_1000C990).
- u8c  @+0x04 (BitStream_ReadBitsCompressed 8 bits).
- u32c @+0x08 (sub_1000C990).
- bits(2048) @+0x0C (vtbl+0x38; max 0x800).
- bits(2048) @+0x48 (vtbl+0x38; max 0x800).
- if u8c@+0x04 == 0: bits(2048) @+0x20 (vtbl+0x38; max 0x800).

Entry size: 0x848 bytes (list insert stride at 0x1013DC60).

Packet_ID_MAIL_write_entry @ 0x1013D0F0 (write order):
- u32c (BitStream_WriteBitsCompressed 32; endian swap if Net_IsBigEndian).
- u8c  (BitStream_WriteBitsCompressed 8).
- u32c (BitStream_WriteBitsCompressed 32; endian swap if Net_IsBigEndian).
- bits(2048) @+0x0C (vtbl+0x34).
- bits(2048) @+0x48 (vtbl+0x34).
- if u8c@+0x04 == 0: bits(2048) @+0x20 (vtbl+0x34).

Packet_ID_MAIL_entry_fill @ 0x1013C970 (UI helper; fills entry buffers):
- u32 @+0x00, u8 @+0x04, u32 @+0x08.
- strncpy_s @+0x0C (len 0x14), @+0x20 (len 0x28), @+0x48 (len 0x800).

Send flow (CWindowSendMail_OnCommand @ 0x1013DE40, case 8):
- Validates recipient (len >= 4), subject (len >= 5), body (len >= 10), rejects self?send (case?insensitive), and runs sub_10248020 (string filter) on each.
- Builds Packet_ID_MAIL, fills one entry via Packet_ID_MAIL_entry_fill, inserts unique, writes, then sends via LTClient_SendPacket_BuildIfNeeded(packet, 2, 1, 3, 1).

#### Packet_ID_PRODUCTION (ID -101) - server->client

Read: Packet_ID_PRODUCTION_read @ 0x10164A30 (decomp); handler: 0x10195A00.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- if type == 0:
  - bit @+0x435 (sub_100328E0).
  - u32c @+0x4C4 (sub_1000C990).
  - u8c  @+0x4C8 (sub_101C9AA0).
  - u32c @+0x448 (sub_1000C990).
  - bit @+0x4C9 (sub_100328E0).
  - 4x u32c @+0x438..+0x444 (sub_1000CAC0 loop).
  - 10x lists @+0x44C (each via sub_1023D7B0: u16c count + count*u32c).
- if type == 2:
  - entries via Packet_ID_PRODUCTION_read_entries @ 0x101648E0 (decomp):
    - u32c count
    - repeat count:
      - u32c
      - u8c
      - u32c
      - ItemEntryWithId (sub_102550A0)
      - u32c (sub_10246F10)
- else (type != 0/2): no extra fields observed.

#### Packet_ID_MARKET (ID -100) - server->client

Read: Packet_ID_MARKET_read @ 0x100CA180 (decomp); handler: 0x10195AF0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- type switch (0..0x1D):
  - 0: u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 1: u8c @+0x458, u8c @+0x47D, listA @+0x480.
  - 2: structA @+0x438, u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 3: u8c @+0x458, u8c @+0x47D, listC @+0x490, block6 @+0x4EC.
  - 4: no extra.
  - 5: listB @+0x4C0.
  - 6: structA @+0x438.
  - 7: u32c @+0x4D4, u16c @+0x4DC, u8c @+0x54D, structA @+0x438.
  - 8: u32c @+0x4D8, list via sub_1023D7B0 @+0x4E0.
  - 9: no extra.
  - 10: block6 @+0x4EC, bit @+0x54C (sub_100328E0).
  - 11: block6 @+0x4EC.
  - 12: u8c @+0x458, structC @+0x54E.
  - 13: u8c @+0x458, u8c @+0x47D, list @+0x554 (sub_1025C7B0).
  - 14: u16c @+0x564, u8c @+0x566, u16c @+0x4DC.
  - 15: no extra.
  - 16: no extra.
  - 17: no extra.
  - 18: u8c @+0x458, structC2 @+0x568.
  - 19: u8c @+0x458, u8c @+0x47D, list @+0x570 (sub_1025B1D0).
  - 20: u16c @+0x580, u16c @+0x4DC.
  - 21: u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 22: u8c @+0x458, u8c @+0x47D, listA @+0x480.
  - 23: structA @+0x438, u8c @+0x458, u8c @+0x47C, structB @+0x45C.
  - 24: u8c @+0x458, u8c @+0x47D, listC @+0x490.
  - 25: no extra.
  - 26: structA @+0x438.
  - 27: u32c @+0x4D4, u16c @+0x4DC, u8c @+0x54D, structA @+0x438.
  - 28: u32c @+0x4D8, list via sub_1023D7B0 @+0x4E0.
  - 29: u16c @+0x582, u16c @+0x4DC.

Helper layouts:
- structA (Packet_ID_MARKET_read_structA @ 0x10254F80):
  - u16c @+0x00, u16c @+0x02, u16c @+0x04, u16c @+0x06
  - u8c  @+0x08, u8c @+0x09
  - u32c @+0x0C, u32c @+0x10, u32c @+0x14
  - u8c  @+0x1A, u8c @+0x19, u8c @+0x18
  - u8c[4] @+0x1B..0x1E
- structB (Packet_ID_MARKET_read_structB @ 0x100C87E0):
  - u8c @+0x00
  - u16c @+0x04
  - u32c @+0x08, u32c @+0x0C
  - u16c @+0x10, @+0x12, @+0x14, @+0x16
  - bit @+0x18
  - u8c @+0x01, u8c @+0x02
  - bit @+0x1C
- structC (Packet_ID_MARKET_read_structC @ 0x100C89A0):
  - u8c @+0x00, u8c @+0x01, u16c @+0x02, bit @+0x04, u8c @+0x05
- structC2 (Packet_ID_MARKET_read_structC2 @ 0x100C8A10):
  - u8c @+0x00, u8c @+0x01, u16c @+0x02, bit @+0x04
- listA (Packet_ID_MARKET_read_listA @ 0x10267840):
  - u8c count
  - repeat count: structA + u32c + u32c + u32c (field1 default = 0x3B9AC9FF before read).
- listB (Packet_ID_MARKET_read_listB @ 0x100C9EC0):
  - u8c count
  - repeat count: structA + u32c + u16c + u32c.
- listC (Packet_ID_MARKET_read_listC @ 0x100C9CE0):
  - structA
  - u8c count
  - repeat count: u32c, u32c, u16c, u16c, u32c, string (vtable+0x38, max 0x800).
- listD (Packet_ID_MARKET_read_listD @ 0x1025C7B0):
  - u32c count
  - repeat count: u16c, u8c, u16c (all via BitStream_ReadBitsCompressed + endian swap).
- listE (Packet_ID_MARKET_read_listE @ 0x1025B1D0):
  - u32c count
  - repeat count: u16c, u32c (all via BitStream_ReadBitsCompressed + endian swap).
- block (Packet_ID_MARKET_read_block @ 0x100CA060):
  - u32c count
  - repeat count:
    - u16c
    - 5x bits(9) (sub_101C9930).
- block6 (Packet_ID_MARKET_read_block6 @ 0x100CA150): 6x block.

#### Packet_ID_FACTION (ID -99) - server->client

Read: Packet_ID_FACTION_read @ 0x100AAD00 (decomp); handler: 0x101993B0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- switch on (type-2), 76 cases.

Confirmed helper layouts:
- Packet_ID_FACTION_read_blockA @ 0x100A7720:
  - string @+0x06 (vtable+0x38, max 0x800)
  - string @+0x3A (vtable+0x38, max 0x800)
  - string @+0x1A (vtable+0x38, max 0x800)
  - u32c @+0x00
  - bit @+0x43A
  - u8c @+0x05, u8c @+0x04
  - if bit@+0x43A != 0: u32c @+0x43C (sub_10246F10) else u32c @+0x440
  - Playerfile_read_blockC0 @+0x444
  - blockA_struct_4C0 @+0x4C0 (Packet_ID_FACTION_read_blockA_struct_4C0):
    - u32c @+0x00..0x14 (6x)
    - u8c count; repeat: u8c list @+0x18
  - blockA_list_4E8 @+0x4E8 (Packet_ID_FACTION_read_blockA_list_4E8):
    - u32c count
    - repeat: u32c + u8c + string (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_listA @ 0x100A9D00:
  - u32c header @+0x00
  - u32c count1; repeat count1: Packet_ID_A9_read_structB
  - u32c count2; repeat count2: u32c list (vector @+0x18)
- Packet_ID_A9_read_structB @ 0x100A6E70:
  - u8c @+0x00
  - string @+0x01 (vtable+0x38, max 0x800)
  - u32c count1; repeat: u8c + u32c (vector @+0x24)
  - u32c count2; repeat: u32c (vector @+0x34)
- Packet_ID_FACTION_read_listB @ 0x100AAC20:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_listB_entry @ 0x100A9680:
    - u8c header
    - u32c count; repeat: Packet_ID_A5_read_struct2 (see Packet_ID_A5 section)
    - inserts via sub_100A8F10
- Packet_ID_FACTION_read_listC @ 0x100A99F0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_listC_entry @ 0x100A6390:
    - u8c header
    - u32c @+0x14
    - u32c count; repeat: u32c + u32c (BitStream_ReadBitsCompressed + endian swap)
- Packet_ID_FACTION_read_block_107C @ 0x100A74F0:
  - u16c @+0x00
  - u16c @+0x02
  - u8c count
  - repeat count: Packet_ID_FACTION_read_block_107C_entry @ 0x1009F9A0:
    - u32c @+0x00 (sub_10246F10)
    - u8c @+0x04
    - u32c @+0x08
    - u32c @+0x0C
    - u32c @+0x10
    - string @+0x14 (vtable+0x38, max 0x800)
    - string @+0x28 (vtable+0x38, max 0x800)
    - string @+0x3C (vtable+0x38, max 0x800)
    - string @+0x5C (vtable+0x38, max 0x800)
  - insert filter: entry.u32c@+0x00 > 0 AND (u8@+0x04 - 1) <= 0x10
- Packet_ID_FACTION_read_block_1090 @ 0x100A7060:
  - u8c count
  - repeat count: Packet_ID_FACTION_read_block_10A0 @ 0x1009EE50
- Packet_ID_FACTION_read_block_10A0 @ 0x1009EE50 (entry):
  - u32c @+0x00
  - u8c  @+0x04
  - u8c  @+0x25
  - u8c  @+0x27
  - u32c @+0xA8
  - u8c  @+0x26
  - string @+0x05 (vtable+0x38, max 0x800)
  - string @+0x28 (vtable+0x38, max 0x800)
  - string @+0xAC (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0D50 @ 0x100A7950:
  - u16c count; repeat: FriendEntry (Packet_ID_PLAYERFILE_read_structA)
- Packet_ID_FACTION_read_block_0D78 @ 0x100A72D0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_0D78_entry @ 0x1009F580:
    - u32c @+0x30
    - u8c @+0x38
    - u32c @+0x00
    - u32c @+0x2C
    - u32c @+0x34
    - string @+0x04 (vtable+0x38, max 0x800)
    - string @+0x18 (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0E08 @ 0x1009F050:
  - bit @+0x00
  - u8c @+0x01
  - u32c_alt @+0x04
  - u32c_alt @+0x08
  - string @+0x0C (vtable+0x38, max 0x800)
  - u8c @+0x20
- Packet_ID_FACTION_read_block_0E2C @ 0x100A7350:
  - u32c count
  - repeat count: u32c + u32c + 3x string (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0E3C @ 0x100A71E0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_0E3C_entry @ 0x1009F350:
    - u32c @+0x00
    - u32c @+0x18
    - string @+0x04 (vtable+0x38, max 0x800)
    - string @+0x1C (vtable+0x38, max 0x800)
    - u32c @+0x11C
    - if u32c@+0x11C != 0:
      - Playerfile_read_blockC0 @+0x120
      - string @+0x19C (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_0FD4 @ 0x100A7810:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_0FD4_entry @ 0x100A05E0:
    - u32c @+0x00
    - string @+0x04 (vtable+0x38, max 0x800)
    - string @+0x18 (vtable+0x38, max 0x800)
    - string @+0x38 (vtable+0x38, max 0x800)
    - u32c @+0x1B4
    - Playerfile_read_blockC0 @+0x138
- Packet_ID_FACTION_read_block_1784 @ 0x100A78B0:
  - u16c @+0x00
  - u16c @+0x02
  - u8c count
  - repeat count: Packet_ID_FACTION_read_block_1784_entry @ 0x100A08B0:
    - u8c @+0x00
    - u32c_alt @+0x04
    - u8c @+0x08
    - u32c @+0x0C
    - string @+0x10 (vtable+0x38, max 0x800)
    - string @+0x24 (vtable+0x38, max 0x800)
    - u32c @+0x44
- Packet_ID_FACTION_read_block_1160 @ 0x100A75F0:
  - u32c count
  - repeat count: Packet_ID_FACTION_read_block_11A4 @ 0x1009FDA0
- Packet_ID_FACTION_read_block_11A4 @ 0x1009FDA0 (entry):
  - u32c @+0x00
  - u16c @+0x04
  - bit  @+0x0C4
  - u32c @+0x164
  - u32c @+0x168
  - u32c @+0x08
  - u8c  @+0x0C5
  - string @+0x0C (vtable+0x38, max 0x800)
  - string @+0x20 (vtable+0x38, max 0x800)
  - string @+0x24 (vtable+0x38, max 0x800)
  - string @+0x44 (vtable+0x38, max 0x800)
  - string @+0x144 (vtable+0x38, max 0x800)
  - u32c @+0x170
  - u32c @+0x16C
  - Playerfile_read_blockC0 @+0x0C8
- Packet_ID_FACTION_read_block_1170 @ 0x1009FF90:
  - bit @+0x00
  - string @+0x01 (vtable+0x38, max 0x800)
  - string @+0x15 (vtable+0x38, max 0x800)
  - string @+0x29 (vtable+0x38, max 0x800)
  - u16c @+0x2E
  - u8c  @+0x30
- Packet_ID_FACTION_read_block_1318 @ 0x10252B70:
  - u32c @+0x00
  - u32c @+0x04 (sub_10246F10)
  - u32c count
  - repeat count: u16c + u8c + bit (direct) -> inserted list @+0x08
- Packet_ID_FACTION_read_block_1340 @ 0x100A02E0:
  - u32c @+0x3C0
  - bit  @+0x3C4
  - u32c @+0x3C8 (sub_10246F10)
  - u16c @+0x3CC
  - 0x1E entries (size 0x20) starting @+0x00:
    - presence bit
    - if 0: zero u8@+0x00, zero string@+0x01, u32@+0x1C=0
    - if 1: u8c @+0x00, u32c @+0x1C, if u8c>0x0A then string @+0x01 (vtable+0x38, max 0x800)
- Packet_ID_FACTION_read_block_1738 @ 0x100A06F0:
  - u8c  @+0x00
  - u32c_alt @+0x04
  - u8c  @+0x08, @+0x09, @+0x0A
  - bit  @+0x48
  - string @+0x0B (vtable+0x38, max 0x800)
  - string @+0x1F (vtable+0x38, max 0x800)
  - u32c @+0x40 (sub_10246F10)
  - u32c @+0x44 (sub_10246F10)
- Packet_ID_FACTION_read_block_17BC @ 0x100A9EB0:
  - u8c count
  - repeat count:
    - u8c
    - string (vtable+0x38, max 0x800)
    - u32c
    - Packet_ID_FACTION_read_block_0D50

Case map (type value => extra reads), jump table @ 0x100AB360 (76 entries; type = index+2):
- No extra fields: types 3, 6, 8, 11, 12, 20, 29, 32, 35, 53, 71.
- type 2: blockA @+0x858; if [0x0C92] != 0 -> Packet_ID_FACTION_read_block_0D50 @+0x0D50; else listA @+0x1008, listB @+0x179C, listC @+0x17AC.
- type 4: bits(2048) @+0x436, then bits(2048) @+0x456.
- type 5: bits(2048) @+0x456.
- type 7: u32c @+0x1074.
- type 9: bits(2048) @+0x0D64.
- type 10: u32c @+0x0D60, bit @+0x0F4C; if bit==0 -> bits(2048) @+0x0F4D.
- type 13: Packet_ID_FACTION_read_block_0D78 @+0x0D78, listA @+0x1008.
- type 14: u8c @+0x435.
- type 15: status list @+0x0D88 (sub_1000D870).
- type 16: u8c @+0x0E04, bits(2048) @+0x436.
- type 17: u8c @+0x0E04, u32c @+0x0D60.
- type 18: Packet_ID_FACTION_read_block_0E08 @+0x0E08.
- type 19: Packet_ID_FACTION_read_block_0D50 @+0x0D50.
- type 21: Packet_ID_FACTION_read_block_0E2C @+0x0E2C; Packet_ID_FACTION_read_block_0E3C @+0x0E3C; bits(2048) @+0x0E4C; bit @+0x0F4C; listA @+0x1008.
- type 22: u32c @+0x0D60.
- type 23: bits(2048) @+0x0E4C; bit @+0x0F4C.
- type 24: u32c @+0x0D60.
- type 25: u32c @+0x0D60, bit @+0x0F4C; if bit==0 -> bits(2048) @+0x0F4D.
- type 26: u32c @+0x0FD0.
- type 27: u32c @+0x0FD0.
- type 28: u32c @+0x0D60.
- type 30: Packet_ID_FACTION_read_block_0FD4 @+0x0FD4.
- type 31: u32c @+0x0FD0, bits(2048) @+0x0E4C.
- type 33: Packet_ID_FACTION_read_block_0E3C @+0x0E3C.
- type 34: u32c @+0x0FD0.
- type 36: listA @+0x1008, Packet_ID_FACTION_read_block_1340 @+0x1340.
- type 37: bits(2048) @+0x0FE4.
- type 38: u8c @+0x1004.
- type 39: sub_100A6E70 @+0x1030.
- types 40, 41, 59: u8c @+0x1004.
- type 42: u8c @+0x1078, u32c @+0x1074, u32c @+0x0D60, bits(2048) @+0x0F4D.
- type 43: u32c @+0x1074.
- type 44: Packet_ID_FACTION_read_block_1090 @+0x1090; Packet_ID_FACTION_read_block_107C @+0x107C; listA @+0x1008; Packet_ID_FACTION_read_block_1340 @+0x1340; Packet_ID_FACTION_read_blockA_struct_4C0 @+0x1710.
- type 45: Packet_ID_FACTION_read_block_10A0 @+0x10A0; u32c @+0x1074.
- type 46: Packet_ID_FACTION_read_block_10A0 @+0x10A0.
- type 47: u32c @+0x0D60; u32c @+0x1074.
- type 48: bit @+0x0F4C; Packet_ID_FACTION_read_block_1170 @+0x1170.
- type 49: bit @+0x0F4C; Packet_ID_FACTION_read_block_1160 @+0x1160; listA @+0x1008.
- type 50: bit @+0x0F4C; bits(2048) @+0x436.
- type 51: Packet_ID_FACTION_read_block_11A4 @+0x11A4.
- type 52: u32c @+0x0D60.
- type 54: Packet_ID_FACTION_read_block_1318 @+0x1318; u8c @+0x435.
- types 55, 56, 57, 60, 66, 70: u32c @+0x1074.
- type 58: u8c @+0x1004; bits(2048) @+0x436.
- type 61: u32c @+0x1074; Packet_ID_FACTION_read_block_1738 @+0x1738.
- type 62: Packet_ID_FACTION_read_block_1784 @+0x1784.
- type 63: bits(2048) @+0x436; u8c @+0x1798; u32c @+0x1074.
- type 64: u8c @+0x1798; u8c @+0x1799; u32c @+0x1074.
- type 65: bits(2048) @+0x0D64; u8c @+0x1798; u32c @+0x1074.
- type 67: u32c @+0x1074; u32c @+0x0D60.
- type 68: u32c @+0x1074; u32c @+0x0D60; u8c @+0x1798.
- type 69: bits(2048) @+0x0D64; u32c @+0x1074.
- type 72: Packet_ID_FACTION_read_block_17BC @+0x17BC.
- type 73: bits(2048) @+0x436.
- type 74: u8c @+0x435.
- type 75: bits(2048) @+0x0D64; u8c @+0x435.
- types 76, 77: u32c @+0x0D60; u8c @+0x435.

#### Packet_ID_PLAYERFILE (ID -97) - server->client

Read: Packet_ID_PLAYERFILE_read @ 0x1013C6F0 (decomp); handler: 0x10198F30.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- bit @+0x434 (flag via direct bit read).
- if flag == 1:
  - FriendEntry @+0x43C (Packet_ID_PLAYERFILE_read_structA @ 0x100A0C90).
  - Packet_ID_FACTION_read_listA @+0x77C (sub_100A9D00).
  - string @+0x57C (vtable+0x38, max 0x800).
- else:
  - u32c @+0x438 (sub_1000C990).

FriendEntry / Packet_ID_PLAYERFILE_read_structA @ 0x100A0C90 (read order):
- u32c @+0x00
- u8c  @+0x04
- u32c @+0x08
- u8c  @+0x0C
- string @+0x0D (vtable+0x38, max 0x800)
- u32c_alt @+0x50 (Read_u32c_alt)
- u8c  @+0x9C
- string @+0x9D (vtable+0x38, max 0x800)
- string @+0x54 (vtable+0x38, max 0x800), then strncpy/lowercase to +0x68 (size 0x14)
- string @+0x7C (vtable+0x38, max 0x800)
- Playerfile_read_blockC0 @+0xC0 (0x1000D870)
- u8c  @+0x13C

Playerfile_read_blockC0 @ 0x1000D870:
- u32c header
- 10 x Playerfile_read_blockC0_entry @ 0x1000D730 (entry size 0x0C)

Playerfile_read_blockC0_entry @ 0x1000D730:
- bit present; if 0 => zero-fill entry
- if present:
  - u16c @+0x00
  - u8c  @+0x02
  - u8c  @+0x03
  - bits(7) @+0x04
  - bits(7) @+0x05
  - bits(9) @+0x06
  - u8c  @+0x08
  - u8c  @+0x09
  - u8c  @+0x0A

#### Packet_ID_SKILLS (ID -93) - server->client

Read: Packet_ID_SKILLS_read @ 0x10141890 (decomp); handler: 0x101931E0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- if type in {2,7}:
  - list via Packet_ID_SKILLS_read_list @ 0x1024AD30:
    - u8c @+0x24..+0x27 (4x u8c).
    - u32c @+0x20.
    - u32c count.
    - repeat count:
      - u32c (BitStream_ReadBitsCompressed + endian swap)
      - u8c
      - u32c (BitStream_ReadBitsCompressed + endian swap)
      - u8c
      - u8c
      - u8c
      - insert via Packet_ID_SKILLS_read_list_insert @ 0x1024ACA0
- if type in {3,4,5,6}:
  - u32c @+0x468 (sub_1000C990).

#### Packet_ID_A5 (ID -91) - server->client (name TBD)

Read: Packet_ID_A5_read @ 0x1015E730 (decomp); handler: 0x10197580.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- type-specific payloads:
  - type 1: u32c @+0x438.
  - type 2: no extra fields.
  - type 3: ItemsAdded payload @+0x640 (sub_102404E0).
  - type 4: u32c @+0x438.
  - type 5: struct1 @+0x444 (Packet_ID_A5_read_struct1).
  - type 6: u32c @+0x438.
  - type 7: u32c @+0x438.
  - type 8: struct1 @+0x444 + struct2 @+0x5C0 + bit @+0x618.
  - type 9: u32c @+0x438 + u16c[6] @+0x61A (Read_u16c_x6).
  - type 10: u32c @+0x438.
  - type 11: u32c @+0x438 + u8c @+0x440 (sub_100388F0).
  - type 12: u32c @+0x438 + u32c @+0x43C.
  - type 13: u32c @+0x438.
  - type 14: struct3 @+0x628 (Packet_ID_A5_read_struct3).
  - type 15: u32c @+0x438.
  - type 16: struct3 @+0x628 + bit @+0x618.
  - type 17: u32c @+0x438 + u32c @+0x43C.

Struct1: Packet_ID_A5_read_struct1 @ 0x100D4620

- u32c @+0x00
- u8c  @+0x04
- u8c  @+0x0C
- u8c  @+0x05
- u32c @+0x08
- u32c @+0x10
- bits(2048) @+0x14 (raw block)
- status list @+0x34 via sub_1000D870
- bits(2048) @+0x14C
- bits(2048) @+0x0B0
- status list @+0x0D0 via sub_1000D870
- if u8c@+0x04 != 2: u16c[6] @+0x16C (Read_u16c_x6).

Struct2: Packet_ID_A5_read_struct2 @ 0x100A7AB0

- u32c @+0x14
- u8c  @+0x18
- u16c @+0x10
- u32c @+0x1C
- u32c @+0x28
- u32c @+0x2C
- u32c count
- repeat count:
  - u32c
  - bits(2048)
  - u32c
  - u16c
  - u32c
- u32c @+0x20 (sub_10246F10)
- u32c @+0x24 (sub_10246F10)

Struct3: Packet_ID_A5_read_struct3 @ 0x1015E590

- u32c @+0x00
- u32c @+0x04
- u32c count
- repeat count:
  - u32c
  - bits(2048)
  - u32c
  - u32c

#### Packet_ID_A6 (ID -90) - server->client (name TBD)

Read: Packet_ID_A6_read @ 0x100AB9F0 (decomp); handler: 0x1018F480.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x438 (sub_1000C990).
- u8c  @+0x440 (sub_101C9AA0).
- u8c  @+0x434 (type).
- u8c  @+0x43C (sub_101C9AA0).

type-specific (switch on type-2):
  - type 2: u16c @+0x43E.
  - type 3: u64c @+0x448 (sub_100AB5D0) + u16c @+0x43E.
  - type 4: u16c @+0x43E.
  - type 5: no extra fields.
  - type 6: no extra fields.
  - type 7: u16c @+0x43E.

#### Packet_ID_A8 (ID -88) - server->client (name TBD)

Read: Packet_ID_A8_read @ 0x1014B810 (decomp); handler: 0x10192690.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (sub_101C9AA0).
- if u8c == 1:
  - u8c @+0x435, @+0x436, @+0x437, @+0x438, @+0x439, @+0x43A.
  - 4x lists @+0x43C..@+0x460 via sub_1023D7B0 (u16c count + count*u32c).

#### Packet_ID_A9 (ID -87) - server->client (name TBD)

Read: Packet_ID_A9_read @ 0x1011AD30 (decomp); handler: 0x10199050.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-2).

Type map (type value => extra reads):
- type 2: Packet_ID_A9_read_structA @+0x43C; Packet_ID_A9_read_structB @+0x528; u32c @+0x58C; u32c @+0x590.
- type 3: Packet_ID_A9_read_structB @+0x528; u32c @+0x58C; u32c @+0x590.
- type 4: Packet_ID_A9_read_structA @+0x43C.
- type 5: no extra fields (default).
- type 6: bits(2048) @+0x56C.
- type 7: u32c @+0x438; bits(2048) @+0x56C.
- type 8: u32c @+0x438.
- type 9: bits(2048) @+0x56C.
- type 10: bits(2048) @+0x56C; u32c @+0x438.
- type 11: u32c @+0x438; FriendEntry @+0x594 (Packet_ID_PLAYERFILE_read_structA).
- type 12: no extra fields (default).
- type 13: Packet_ID_A9_read_structC @+0x6D4.
- type 14: Packet_ID_A9_read_structA_list @+0x6D8.
- type 15: u32c @+0x438.
- type 16: u32c @+0x438.
- type 17: u32c @+0x438; u16c @+0x804.
- type 18: Packet_ID_A9_read_structD @+0x6E8.
- type 19: bits(2048) @+0x806.
- type 20: u16c @+0x804.
- type 21: Packet_ID_A9_read_structD_list @+0x888; bit @+0x886.
- type 22: u32c @+0x438; bit @+0x886.
- type 23: u32c @+0x438; bit @+0x886.

Note: types 5 and 12 fall through default (no extra reads observed).

Packet_ID_A9 helper layouts:
- Packet_ID_A9_read_structA @ 0x10119210:
  - u32c @+0x00
  - u8c  @+0x1C
  - u32c @+0x04
  - string @+0x08 (vtable+0x38, max 0x800)
  - string @+0x1D (vtable+0x38, max 0x800)
  - string @+0x39 (vtable+0x38, max 0x800)
  - Read_Map_U32_String @+0x0BC
  - u8c @+0x0CC, @+0x0CD, @+0x0CE, @+0x0CF
  - u32c @+0x0D0
  - u16c @+0x0D4
  - u8c  @+0x0D6
  - Packet_ID_FACTION_read_block_0D50 @+0x0D8
  - u32c @+0x0E8
- Packet_ID_A9_read_structA_list @ 0x1011A5E0:
  - u32c count; repeat: Packet_ID_A9_read_structA
- Packet_ID_A9_read_structB @ 0x100A6E70:
  - u8c @+0x00
  - string @+0x01 (vtable+0x38, max 0x800)
  - u32c count1; repeat: u8c + u32c (vector @+0x24)
  - u32c count2; repeat: u32c (vector @+0x34)
- Packet_ID_A9_read_structC @ 0x101181E0:
  - u8c @+0x00, @+0x01, @+0x02, @+0x03
- Packet_ID_A9_read_structC2 @ 0x10118230:
  - u8c  @+0x00
  - u32c @+0x04
  - string @+0x08 (vtable+0x38, max 0x800)
  - u8c  @+0x1C, @+0x1D
  - u32c @+0x20 (sub_10246F10)
  - if u8c@+0x00 != 0:
    - u32c @+0x24
    - string @+0x28 (vtable+0x38, max 0x800)
    - u32c @+0x3C
    - string @+0x40 (vtable+0x38, max 0x800)
  - else:
    - string @+0x60 (vtable+0x38, max 0x800)
- Packet_ID_A9_read_structC3 @ 0x101182F0:
  - u32c @+0x00
  - string @+0x04 (vtable+0x38, max 0x800)
  - u32c @+0x18
  - string @+0x1C (vtable+0x38, max 0x800)
  - bit  @+0x3C
  - u32c @+0x40, @+0x44, @+0x48, @+0x4C, @+0x50, @+0x54, @+0x58
  - u8c  @+0x5C
- Packet_ID_A9_read_structD @ 0x10119030:
  - u32c @+0x04
  - u32c @+0x08
  - u8c @+0x0B4, @+0x0B5, @+0x0B6
  - u8c @+0x0C
  - string @+0x0D (vtable+0x38, max 0x800)
  - string @+0x29 (vtable+0x38, max 0x800)
  - u32c @+0x0AC (sub_10246F10)
  - u32c @+0x0B0
  - Packet_ID_A9_read_structD_sub_10C @+0x10C (u32c count + structC3 list)
  - bit  @+0x00
  - if bit@+0x00 != 0: Packet_ID_A9_read_structD_sub_B8 @+0x0B8
  - else: Packet_ID_A9_read_structD_sub_F8 @+0x0F8
- Packet_ID_A9_read_structD_sub_B8 @ 0x10118B00:
  - u32c count; repeat: Packet_ID_A9_read_structC2
- Packet_ID_A9_read_structD_sub_F8 @ 0x10118DE0:
  - u16c @+0x00
  - u16c @+0x02
  - u8c count; repeat: Packet_ID_A9_read_structC2
- Packet_ID_A9_read_structD_sub_10C @ 0x10118F50:
  - u32c count; repeat: Packet_ID_A9_read_structC3
- Packet_ID_A9_read_structD_list @ 0x1011AC50:
  - u16c @+0x02
  - u16c @+0x00
  - u32c count; repeat: Packet_ID_A9_read_structD

#### Packet_ID_PLAYER2PLAYER (ID -86) - server->client

Read: Packet_ID_PLAYER2PLAYER_read @ 0x100CC8E0 (decomp); handler: 0x10198840.

RTTI/vtable: .?AVPacket_ID_PLAYER2PLAYER@@ (TypeDescriptor @ 0x103546A0), vtable @ 0x102CA0A0; ctor @ 0x100CC840 sets ID 0xAA.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x434 (sub_1000C990).
- u8c  @+0x438 (type; switch on type-1).

Type map (type value => extra reads):
- type 2: bits(2048) @+0x439, then u32c @+0x450.
- type 3: bits(2048) @+0x439.
- type 4: bits(2048) @+0x439.
- type 5: bits(2048) @+0x439.
- type 6: bits(2048) @+0x439.
- type 7: ItemsAdded_entry_read @+0x454.
- type 8: ItemsAdded_entry_read @+0x454.
- type 9: ItemsAdded_entry_read @+0x454.
- type 10: ItemsAdded_entry_read @+0x454.
- type 11: u32c @+0x480.
- type 14: bit @+0x484.

Note: types 12 and 13 fall through default (no extra reads observed).

Handler case map (type => handler actions; HandlePacket_ID_PLAYER2PLAYER @ 0x10198840):
- type 3: Window id 0x2E via CWindowMgr_GetWindowById; sub_10144C00(window, pkt+0x54C).
- type 4: Window id 0x2E via CWindowMgr_GetWindowById; sub_10144850(window, pkt+0x54C).
- type 8: Window id 0x30 via CWindowMgr_GetWindowById; sub_10197C50(tmp, pkt+0x54C) then sub_1015C2B0(window, pkt+0x330).
- type 13: Window id 0x30 via CWindowMgr_GetWindowById; sub_10193460(window, pkt+0x84).
- type 15: g_LTClient->vtbl+0x58 (id 3) -> sub_10055A00(pkt+0x60); Window id 0x13 via CWindowMgr_GetWindowById; sub_10169540(window, 6); window vtbl+4 call (args 5,0,0); sub_1005A570(g_103BF6F4, 0x13).
- default (types 5-7,9-12,14): no extra action beyond cleanup.

#### Packet_ID_AC (ID -84) - server->client (name TBD)

Read: Packet_ID_AC_read @ 0x100D4960 (decomp); handler: 0x10195EE0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type).
- u32c @+0x438 (sub_1000C990).

Type map (type value => extra reads):
- type 0: sub_1026BE70 @+0x43C.
- type 1: u16c @+0x44C.
- type 2: u16c @+0x44C.
- type 3: u16c @+0x44C, then sub-switch on that u16c:
  - case 510: Packet_ID_A5_read_struct1 @+0x450; Packet_ID_A5_read_struct2 @+0x5C8; u32c @+0x620,@+0x624,@+0x628.
  - case 511: u32c @+0x624.
  - case 512: u32c @+0x620,@+0x624; u16c @+0x660; ItemEntryWithId @+0x630.
  - case 516: u32c @+0x620,@+0x624; bit @+0x62C.
  - case 501: u16c @+0x660; bit @+0x62C; Read_6x4BitFlags @+0x662.
- type 4: u16c @+0x44C, then sub-switch on that u16c:
  - case 510: bit @+0x62C; if 0 -> u32c @+0x628.
  - case 511/516: bit @+0x62C.
  - case 512: bit @+0x62C; bit @+0x62D; u32c @+0x628.

Note: case mapping via tables @0x100D4BD8/@0x100D4BFC (u16 opcode minus 501, 16 cases). Only 501/510/511/512/516 are handled; others fall through default.

#### Packet_ID_AF (ID -81) - server->client (name TBD)

Read: Packet_ID_AF_read @ 0x10144ED0 (decomp); handler: 0x101994B0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-3).

Type map (type value => extra reads):
- type 3/4: sub_10056AC0 @+0x43C.
- type 5: u8c @+0x44C + bit @+0x44D.
- type 6: u32c @+0x438 + bits(2048) @+0x44E.
- type 7/10/14/16: u32c @+0x438.
- type 8: sub_10055080 @+0x658; bits(2048) @+0x456; Packet_ID_FACTION_read_listA @+0x94C.
- type 9: sub_10055080 @+0x658; bits(2048) @+0x456.
- type 11: u32c @+0x438 + bits(2048) @+0x8F0.
- type 12/13: sub_100530B0 @+0x904.
- type 15: ItemsAdded payload @+0x928 (sub_102404E0) + bit @+0x44D.

#### Packet_ID_B0 (ID -80) - server->client (name TBD)
Read: Packet_ID_B0_read @ 0x10056B80 (decomp); handler: 0x101996D0.
Write: Packet_ID_B0_write @ 0x10051940 (decomp); ctor: Packet_ID_B0_Ctor @ 0x100520D0; dtor: Packet_ID_B0_dtor @ 0x10055F80.
Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1/2: u32c @+0x438.
- type 3: bit @+0x43C.
- type 4: Packet_ID_AF_B0_read_listA @+0x440.
- type 5: u32c @+0x438; if zero -> bits(2048) @+0x450.
- type 6: u32c @+0x438; bits(2048) @+0x450.
- type 8: u32c @+0x464.
- type 9: Packet_ID_B0_read_listB @+0x468.

Note: type 7 falls through default (no extra reads observed).

#### Packet_ID_B1 (ID -79) - server->client (name TBD)

Read: Packet_ID_B1_read @ 0x100B76E0 (decomp); handler: 0x10198D70.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1: u16c @+0x480; bits(2048) @+0x440; bits(2048) @+0x454.
- type 2: u16c @+0x480; u16c @+0x482; Packet_ID_B1_read_listA @+0x468.
- type 3: u32c @+0x43C; bits(2048) @+0x440.
- type 5/9: Packet_ID_B1_read_listA @+0x468.
- type 6/7/12: u32c @+0x438.
- type 10/11: u32c @+0x438 + u32c @+0x43C.
- type 13: u32c @+0x438 + u32c @+0x43C + u8c @+0x484.
- type 15/17: Packet_ID_B1_read_listB @+0x488.
- type 18: u32c @+0x43C.

Note: types 4,8,14,16 fall through default (no extra reads observed).

#### Packet_ID_B2 (ID -78) - server->client (name TBD)

Read: Packet_ID_B2_read @ 0x10039780 (decomp); handler: 0x101901F0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1: u32c @+0x438.
- type 2: u32c @+0x438 + u32c @+0x43C.
- type 3: u32c @+0x438.
- type 4: u32c @+0x438 + u8c @+0x440.

Packet_ID_AF/B0 helper layouts:
- Packet_ID_AF_read_structA @ 0x100530B0:
  - u32c @+0x00
  - string @+0x04 (vtbl+0x38, max 0x800)
- Packet_ID_AF_B0_read_listA @ 0x10056AC0:
  - u8c count; repeat: Apartment_Read
- Read_Vector_RankPermission @ 0x10054FA0:
  - u8c count; repeat: u8c + bit
- Read_Map_U32_String @ 0x10054CE0:
  - u32c count; repeat: u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian) + string
- Apartment_Read @ 0x10055080 (fields in order):
  - u32c @+0x00
  - u8c  @+0x04
  - u32c @+0x08
  - u32c @+0x0C
  - Read_Vector_RankPermission @+0x10
  - bit  @+0x60
  - string @+0x20 (vtbl+0x38, max 0x800)
  - string @+0x58 (vtbl+0x38, max 0x800)
  - ItemsAdded payload @+0x34 (sub_102404E0)
  - bit  @+0x61
  - u32c @+0x294
  - string @+0x62 (vtbl+0x38, max 0x800)
  - string @+0x7A (vtbl+0x38, max 0x800)
  - Read_Map_U32_String @+0x27C
  - bit  @+0x28C
  - bit  @+0x28D
  - u32c @+0x290
- Packet_ID_B0_read_listB @ 0x10055200:
  - u32c @+0x04
  - u32c @+0x00
  - u32c count
  - repeat entry (size 0x2C):
    - u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian)
    - bit
    - u16c (BitStream_ReadBitsCompressed 16; endian swap if Net_IsBigEndian)
    - ItemStructA_read
    - string (vtbl+0x38, max 0x800)

Packet_ID_B1 helper layouts:
- Packet_ID_B1_read_listA @ 0x100B75C0:
  - u32c @+0x00
  - u32c @+0x04
  - u32c count; repeat: Packet_ID_B1_read_entryA
- Packet_ID_B1_read_entryA @ 0x100B58D0:
  - u32c @+0x00
  - u32c @+0x04
  - string @+0x08 (vtbl+0x38, max 0x800)
  - u32c @+0x1C
  - string @+0x20 (vtbl+0x38, max 0x800)
  - u32c @+0x40
  - string @+0x44 (vtbl+0x38, max 0x800)
  - u32c @+0x58
  - string @+0x5C (vtbl+0x38, max 0x800)
  - u32c @+0x7C
  - Packet_ID_B1_read_entryA_list @+0x80
- Packet_ID_B1_read_entryA_list @ 0x100B5850:
  - u32c count; repeat: Packet_ID_B1_read_entryB
- Packet_ID_B1_read_entryB @ 0x100B4E90:
  - u32c @+0x00
  - string @+0x04 (vtbl+0x38, max 0x800)
  - u32c @+0x18
  - string @+0x1C (vtbl+0x38, max 0x800)
  - u8c  @+0x3C, @+0x3D, @+0x3E
  - u32c @+0x40
  - u32c @+0x44
  - u8c  @+0x48
- Packet_ID_B1_read_listB @ 0x100B5A60:
  - u8c count; repeat: Packet_ID_B1_read_entryC
- Packet_ID_B1_read_entryC @ 0x100B4DD0:
  - u32c @+0x00
  - string @+0x04 (vtbl+0x38, max 0x800)
  - bit  @+0x18
  - u32c @+0x1C
  - bit  @+0x20
  - u32c @+0x24
  - bit  @+0x28

#### Packet_ID_B5 (ID -75) - server->client (name TBD)

Read: Packet_ID_B5_read @ 0x101273D0 (decomp); handler: 0x10199820.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1: Packet_ID_B5_read_list @+0x500.
- type 2: Packet_ID_B5_read_entry @+0x43C.
- type 3/7/13: Packet_ID_B5_read_entry_list @+0x0E24.
- type 4: Packet_ID_B5_read_entry2 @+0x510.
- type 6/8/9: u32c @+0x438.
- type 11: Packet_ID_B5_read_entry_list @+0x0E24; Packet_ID_B5_read_extra_list @+0x0E34.
- type 12: u32c @+0x438; u8c @+0x0E44.

Note: other types fall through default (no extra reads observed).

Packet_ID_B5_read_list @ 0x101272E0:
- u16c count (sub_1000C9F0).
- repeat count: Packet_ID_B5_read_entry @ 0x100FF8D0.

Packet_ID_B5_read_entry @ 0x100FF8D0 (fields in order):
- u32c @+0x00 (sub_1000C990).
- u8   @+0x04 (BitStream_ReadBitsCompressed via sub_101C9AA0, 8 bits).
- u32c @+0x08 (sub_1000C990).
- u16c @+0x0C (sub_1000C9F0).
- Read_QuantVec3_9bit @+0x10 (sub_1026BE70).
- Read_BitfieldBlock_0x30 @+0x20 (sub_10257770).
- u8   @+0x52 (sub_101C9AA0, 8 bits).
- u16c @+0x54 (sub_1000C9F0).
- u8   @+0x56 (sub_101C9AA0, 8 bits).
- bits(2048) @+0x57 (ReadBits_2048 via vtbl+0x38).
- bit @+0x97, bit @+0x98, bit @+0x99 (3 single bits, manual read).
- u32c @+0x9C (sub_1000C990).
- bits(2048) @+0xA0 (ReadBits_2048 via vtbl+0x38).
- Packet_ID_B5_read_entry_list @+0x0B4 (sub_100FF800).

Read_QuantVec3_9bit @ 0x1026BE70:
- Read_QuantVec3 @ 0x10272500 (quantized vec3 using bit-width in struct[0]).
- bits(9) -> struct+0x0C (BitStream_ReadBits).

Read_QuantVec3 @ 0x10272500:
- If bitwidth >= 0x10: read 3x u16c via sub_1010F760 into +0x4/+0x6/+0x8.
- Else: read 3x BitStream_ReadBits(bitwidth) into +0x4/+0x6/+0x8, then for each component read 1 sign bit (BitStream_ReadBit); if sign set, negate.

Read_BitfieldBlock_0x30 @ 0x10257770 (bit lengths, in order):
- bits 1,1,5,5,32,5,6,4,12,12,12 (dest+0x00..0x14).
- if BitStream_ReadBit == 1: bits 12 x9 (dest+0x16..0x26).
- bits 1,1,1,1 (dest+0x28,0x2A,0x2C,0x2E).

Packet_ID_B5_read_entry_list @ 0x100FF800:
- u16c count (sub_1000C9F0).
- repeat count: Packet_ID_B5_read_entry2 @ 0x100FD880.

Packet_ID_B5_read_entry2 @ 0x100FD880 (fields in order):
- u32c @+0x00 (sub_1000C990).
- bits(2048) @+0x04.
- Packet_ID_B5_read_entry2_subA @+0x44.
- u16c @+0x90 (sub_1000C9F0).
- u16c @+0x92 (sub_1000C9F0).
- bit @+0x94.
- u32c @+0x98 (sub_1000C990).
- bits(2048) @+0x9C.
- u32c @+0x8FC (sub_1000C990).
- bits(2048) @+0x900.
- bit @+0x8EC, bit @+0x8ED.
- bits(2048) @+0x0DC.
- Packet_ID_B5_read_entry2_map @+0x8F0.
- u32c count (sub_1000C990) -> loop:
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix via sub_101CA080 if needed).
  - Read_Substruct_10249E10 + Read_Substruct_102550A0.
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix).
  - insert via sub_100FD790 into container @+0x8DC.

Packet_ID_B5_read_entry2_subA @ 0x100FCA80 (fields in order):
- u8  @+0x00 (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x01 (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x02 (BitStream_ReadBitsCompressed 8 bits).
- u16c @+0x04 (sub_1000C9F0).
- u8  @+0x06 (BitStream_ReadBitsCompressed 8 bits).
- u32c @+0x08 (sub_1000C990).
- bits(2048) @+0x0C.

Packet_ID_B5_read_entry2_map @ 0x100FD370:
- u32c count (sub_1000C990).
- repeat count:
  - u32c key (BitStream_ReadBitsCompressed 0x20; endian swap if Net_IsBigEndian).
  - bits(2048) string (vtbl+0x38, max 0x800).
  - insert/lookup via Packet_ID_B5_entry2_map_get_or_insert @ 0x100FD1A0, then assign string.

Packet_ID_B5_read_extra_list @ 0x101261D0:
- u32c count (sub_1000C990).
- repeat count: Packet_ID_B5_read_extra_list_entry @ 0x10125E90.

Packet_ID_B5_read_extra_list_entry @ 0x10125E90 (fields in order):
- u32c @+0x00 (sub_1000C990).
- bit  @+0x04.
- bit  @+0x05.

Read_Substruct_10249E10 @ 0x10249E10 (fields in order):
- u32c @+0x00.
- u8  @+0x04 (BitStream_ReadBitsCompressed 8 bits).
- u32c @+0x08.
- u8  @+0x0C (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x0D (BitStream_ReadBitsCompressed 8 bits).
- u8  @+0x0E (BitStream_ReadBitsCompressed 8 bits).

Read_Substruct_102550A0 @ 0x102550A0 (fields in order):
- u32c @+0x00.
- Packet_ID_MARKET_read_structA @+0x04.

#### Packet_ID_B6 (ID -74) - server->client (name TBD)

Read: Packet_ID_B6_read @ 0x101491E0 (decomp); handler: 0x101981F0.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (type; switch on type-1).

Type map (type value => extra reads):
- type 1/3: u32c @+0x438.
- type 2: Packet_ID_B6_read_structB @+0x4F8; bit @+0x5B4; if u16@+0x4FC == 0x3E0 -> Packet_ID_B6_read_structD @+0x594 + Packet_ID_B6_read_structA @+0x440; if == 0x3E2 -> Packet_ID_B6_read_structA @+0x440.
- type 4: Packet_ID_B6_read_structB @+0x4F8; bit @+0x5B4; Packet_ID_B6_read_structC @+0x5B8.
- type 5: Packet_ID_B6_read_structB @+0x4F8.
- type 6/7/8: u32c @+0x438 + u32c @+0x43C.

Packet_ID_B6_read_structA @ 0x10147C70 (fields in order):
- u32c @+0x00.
- u32c @+0x08.
- u32c @+0x0C.
- u32c @+0x10.
- sub_1000D870 @+0x34.
- bits(2048) @+0x14.
- u32c @+0xB0.
- u32c @+0xB4.
- sub_10246F10 @+0x04.

Packet_ID_B6_read_structB @ 0x10147CF0 (fields in order):
- u32c @+0x00.
- u16c @+0x04.
- bits(2048) @+0x07.
- u8   @+0x06 (BitStream_ReadBitsCompressed 8 bits).
- Read_u16c_x6 @+0x88.
- Read_6BitFlags @+0x94 (6 single bits -> +0x94..+0x99).

Packet_ID_B6_read_structC @ 0x101487A0 (fields in order):
- u32c @+0x00.
- u32c @+0x14.
- u32c @+0x18.
- u32c @+0x1C.
- sub_10246F10 @+0x20.
- u32c count -> loop:
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix via sub_101CA080 if needed).
  - read u32 (BitStream_ReadBitsCompressed 0x20 with endian fix).
  - bit flag (1 bit).
  - bits(2048).
  - sub_10246F10 (struct).
  - insert via sub_10148650 into list @+0x04.

Packet_ID_B6_read_structD @ 0x10149050 (fields in order):
- u32c count -> list of u32 (BitStream_ReadBitsCompressed 0x20) inserted into vector @+0x00.
- u32c count -> list of entries:
  - Packet_ID_B6_read_structD_entry @ 0x10148570.
  - insert via sub_10148FC0 into list @+0x10.

Packet_ID_B6_read_structD_entry @ 0x10148570 (fields in order):
- u32c @+0x00.
- bits(2048) @+0x04.
- u32c count -> list of u32 (BitStream_ReadBitsCompressed 0x20) inserted into vector @+0x24.

#### Packet_ID_FRIENDS (ID -105) - server->client

Read: Packet_ID_FRIENDS_read @ 0x100AD7D0 (decomp); handler: 0x10182CC0.

Fields (read order):
- u8c  @+0x438 (type).
- if type in {3,7}: list via sub_100A7950:
  - u16c count (sub_1000C9F0).
  - repeat count: FriendEntry (sub_100A0C90, size 0x140/320 bytes), read order:
    - u32c @+0x00
    - u8c  @+0x04
    - u32c @+0x08
    - u8c  @+0x0C
    - bits(2048) @+0x0D (raw 256-byte block; string0)
    - u32c @+0x50
    - u8c  @+0x9C
    - bits(2048) @+0x9D (raw 256-byte block; string1)
    - bits(2048) @+0x54 (raw 256-byte block; string2)
      - copies 0x14 bytes from +0x54 to +0x68 and lowercases.
    - bits(2048) @+0x7C (raw 256-byte block; string3)
    - status list @+0xC0 via sub_1000D870:
      - u32c
      - repeat 10x sub_1000D730 (12-byte record; guarded by 1-bit present flag):
        - u16c, u8c, u8c, bits(7), bits(7), bits(9), u8c, u8c, u8c
    - u8c  @+0x13C
- else (type not 3/7):
  - u32c @+0x430
  - u32c @+0x434
  - bits(2048) @+0x439 (raw 256-byte block; string)

#### Packet_ID_STORAGE (ID -103) - server->client

Read: Packet_ID_STORAGE_read @ 0x10032940 (decomp); handler: 0x10197F90.

Fields (read order):
- u32c @+0x430
- u32c @+0x434 (op)
- switch op:
  - 2:
    - ItemsAdded payload @+0x43C (sub_102404E0).
    - ItemsAdded payload @+0x460 (sub_102404E0).
    - bit flag @+0x484 (sub_100328E0).
  - 3:
    - u32c @+0x438
  - 5 or 7:
    - ItemsAdded payload @+0x43C (sub_102404E0).
  - 9:
    - struct @+0x488 via Packet_ID_STORAGE_read_structA @ 0x1023C1E0 (decomp):
      - ItemsAdded payload @+0x00 (sub_102404E0)
      - Packet_ID_STORAGE_structA_read_blockA_12 @ 0x10275730 @+0x24 (12x {bit + ItemEntryWithId}, stride 0x30)
      - Packet_ID_STORAGE_structA_read_blockB_3 @ 0x10275480 @+0x264 (3x {bit + ItemEntryWithId}, stride 0x30)
      - Packet_ID_STORAGE_structA_read_blockC_6 @ 0x10275960 @+0x2F8 (6x {bit + ItemEntryWithId}, stride 0x30)
      - ItemsAdded payload @+0x418 (sub_102404E0)

Write: Packet_ID_STORAGE_write @ 0x10031C30 (decomp).

- u32c @+0x430, u32c @+0x434 (op), then mirrors the same switch layout (ItemsAdded payloads / bit / structA).

Note: ItemsAdded payload header fields baseUsedCount/capacity are used by helper funcs; unk24/unk28 still not referenced in CShell.

#### Packet_ID_MINING (ID -102) - server->client

Read: Packet_ID_MINING_read @ 0x101101A0 (decomp); handler: 0x10195DA0.

Fields (read order):
- u32c @+0x430
- u8c  @+0x434 (type)
- switch type:
  - 0 or 2: u16c @+0x43C
  - 1: entries via Packet_ID_MINING_read_list @ 0x10110040 (decomp), then u16c @+0x43C
    - Packet_ID_MINING_read_list: u32c count; repeat count:
      - u16c
      - u16c
      - u32c
  - 3: u32c @+0x438

#### Packet_ID_SPLIT_CONTAINER (ID -94) - server->client

Read: Packet_ID_SPLIT_CONTAINER_read @ 0x1010ADC0 (decomp); handler: 0x1018EF60.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x434 (sub_1000C990).
- u16c @+0x438 (sub_1000C9F0).
- ItemEntryWithId @+0x43C (sub_102550A0).
- u8c  @+0x43A (sub_101C9AA0; read after ItemEntryWithId).

#### Packet_ID_REPAIR_ITEM (ID -83) - server->client

Read: Packet_ID_REPAIR_ITEM_read @ 0x10167A00 (decomp); handler: 0x1018FD60.

Fields (read order):
- u32c @+0x430 (sub_1000C990).
- u32c @+0x434 (sub_1000C990).
- bit  @+0x438 (flag).

#### Packet_ID_RECYCLE_ITEM (ID -82) - server->client

  Read: inline in handler (0x1018FFC0) after sub_1000C6C0.

  Fields (read order):
  - u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
  - u32c @+0x434 (sub_1000C990).

#### Packet_ID_TRANSFER_ITEMS (ID unknown) - status

  CShell RTTI present but no handler/dispatch/vtable usage found.

  - TypeDescriptor @ 0x1035465C (name "Packet_ID_TRANSFER_ITEMS").
  - CompleteObjectLocator @ 0x10329F90; vtable slot @ 0x10329FC8 appears zeroed.
  - No xrefs to string in CShell; no "TRANSFER_ITEMS" in FoM *.dll/*.exe via rg (only in CShell IDB).

#### Packet_ID_GROUP (FoM-only) - status

  - Not present in FoM binaries (no "Packet_ID_GROUP" in FoM *.dll/*.exe).
  - Present in FoM CShell.dll RTTI strings; treat as FoM baseline only and re-locate/verify in FoM before reuse.

#### Outbound weapon packets (client->server)

Note: dispatcher has no inbound cases for -121/-111; only outbound send paths found (Packet_ID_WEAPONFIRE still has read/write vtable methods).

Packet_ID_WEAPONFIRE (ID -121) send: sub_101A0900.

- u32c (BitStream_Write_u32c @ 0x10031AB0) = sub_100079B0(91).
- u16c (sub_1000CD70) = sub_100079B0(12350).
- u32c (BitStream_Write_u32c @ 0x10031AB0) = sub_101C5080 counter (1..100).

Packet_ID_RELOAD (ID -111) send: sub_101C52E0.

- u32c @+0x430 = sub_100079B0(91).
- bit flag @+0x434 (write via sub_101C9310/92D0).
- if flag==0: u32c @+0x438 and u32c @+0x43C.

#### ItemEntry / list helpers (shared)

ItemEntry / ItemStructA (ItemStructA_read @ 0x10254F80):
- u16c @+0x00 templateId.
- u16c @+0x02 stackCount (ammo/charges/quantity).
- u16c @+0x04 ammoOverrideId (if 0, fallback to template ammo id).
- u16c @+0x06 durabilityCur (used by Item_GetDurabilityPercent; ItemStructA_IsValid requires nonzero).
- u8  @+0x08 durabilityLossPct (default 100; tooltip 6058).
- u8  @+0x09 bindState (0 none, 1 secured, 2 bound, >=3 special bound).
- u32c @+0x0C identityKeyA (unknown).
- u32c @+0x10 u32_tooltipValue (unknown; used in tooltip logic).
- u32c @+0x14 identityKeyB (unknown).
- u8  @+0x18 qualityBonusPct (0..100; applied to select stat ids).
- u8  @+0x19 qualityTier (stringId 29991 + value).
- u8  @+0x1A variantIndex (variant lookup).
- u8  @+0x1B..+0x1E variantRoll/identity blob (serialized as 4 bytes; unknown).
Tooltip usage (BuildItemTooltip @ 0x1010C330) uses ItemEntryWithId offsets (u32 entryId + ItemStructA):
- @+0x04 = templateId (template lookup + display name).
- @+0x06 = stackCount / ammo/charges (ammo/charges strings).
- @+0x08 (u16) = ammoOverrideId (if 0, fallback to template @+0x30).
- @+0x0A (u16) = durabilityCur (Item_GetDurabilityPercent + repair costs); cases 1/8/9 treat as duration seconds (FormatDuration_MinSec).
- @+0x0C (u8) = durabilityLossPct (%/100).
- @+0x0D (u8) = bindState (0 none,1 secured,2 bound,>=3 special bound).
- @+0x1B..+0x1E (u32) = variantRoll/identity blob (serialized bytes; not mapped).
- @+0x1C (u8) = qualityBonusPct.
- @+0x1D (u8) = qualityTier.
- @+0x1E (u8) = variantIndex used in variant lookup (ItemTemplate_CopyVariantByIndex).
- 6036 (0x1794) Durability: %1!s!
- 6037 (0x1795) Damage Radius: %1!u! m
- 6038 (0x1796) Attack Delay: %1!s! s
- 6039 (0x1797) Range: %1!u! m
- 6040 (0x1798) Ammo Count: %1!u!/%2!u!
- 6041 (0x1799) Required Ammo: %1!s!
- 6042 (0x179A) %1!u!/%2!u! Bullets
- 6043 (0x179B) %1!u!/%2!u! Charges
- 6058 (0x17AA) Durability Loss Factor: x%1!s!

ItemEntryWithId (ItemEntryWithId_read @ 0x102550A0):
- u32c entryId (sub_1000C990) + ItemEntry/ItemStructA (ItemStructA_read @ 0x10254F80).

ItemEntryWithId_write: sub_10255040 (u32c + ItemStructA_write @ 0x10254D40).

ItemStructA_read @ 0x10254F80 field order (sizes):
- u16c x4 @+0x00/+0x02/+0x04/+0x06
- u8  x2 @+0x08/+0x09
- u32c x3 @+0x0C/+0x10/+0x14
- u8  x3 @+0x18/+0x19/+0x1A
- u8  x4 @+0x1B..+0x1E

ItemStructAWithName_read @ 0x10053130:
- u32c header + bit flag @+0x04 + u16c @+0x06 + ItemStructA @+0x08 + string(2048) @+0x28.

ItemStructAPlus_u32_u16_u32_read @ 0x100C8920:
- ItemStructA + u32c @+0x20 + u16c @+0x24 + u32c @+0x28.

ItemStructAPlus_u32_u32_u32_read @ 0x1025FF80:
- ItemStructA + u32c @+0x20 + u32c @+0x24 + u32c @+0x28.

ItemsAdded payload (ItemList_Read @ 0x102404E0 / ItemsAdded_payload_write @ 0x1023D2C0):
- u16c baseUsedCount @ +0x00 (adds into used count; see helpers).
- ItemsAddedEntryVec header @ +0x04 (size 0x10):
  - +0x04 unk0
  - +0x08 begin
  - +0x0C end
  - +0x10 capacity
- u32c capacity / unk24 / unk28 @ +0x14/+0x18/+0x1C (3x u32c via sub_1000C990).
- entryCount is written as (end - begin) / 44 and read as u16c.
- repeat entryCount times: ItemsAddedEntry_Read @ 0x1023E3B0 / ItemsAddedEntry_Write @ 0x1023CDF0:
  - ItemStructA @ +0x00 (0x20 bytes).
  - VariantIdSetHeader @ +0x20 (0x0C bytes): u32 comp, u32 head, u32 nodeCount.
  - variantIdCount is serialized as u16; each variantId is a u32 stored in the RB-tree rooted at +0x20.

IDA structs:
- ItemsAddedPayload (size 0x20): baseUsedCount:u16, pad, entries:ItemsAddedEntryVec, capacity:u32, unk24:u32, unk28:u32.
- ItemsAddedEntry (size 0x2C): item:ItemStructA(0x20) + variantIdSet:VariantIdSetHeader(0x0C).
- ItemsAddedEntryVec (size 0x10): unk0:u32, begin/end/capacity pointers.

Helpers (CShell):
- ItemsAddedPayload_GetUsedCount @ 0x1023CEE0 (baseUsedCount + sum(entry.variantIdSet.nodeCount))
- ItemsAddedPayload_GetRemainingCapacity @ 0x1023D120 (capacity - used, clamped)
- ItemsAddedPayload_GetVariantCountByItemType @ 0x1023CF40
- ItemsAddedPayload_GetVariantCountByTemplateId @ 0x1023D020
- ItemsAddedPayload_FindEntryByItemStructA @ 0x1023D1A0
- ItemsAddedPayload_FindEntryByVariantId @ 0x1023DE50

### Data (globals / vtables)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102C116C | 0x002C116C | CGameClientShell_vftable | Vtable for CGameClientShell | RTTI + decomp | high |
| 0x103BF6F0 | 0x003BF6F0 | g_pGameClientShell | Global pointer set in ctor | decomp + xrefs | high |
| 0x1035C188 | 0x0035C188 | g_IClientShell_Default_Reg | IClientShell.Default registration struct | decomp + xrefs | high |
| 0x103C3FA8 | 0x003C3FA8 | g_ItemTemplateById | Item template pointer array (indexed by itemId) | xrefs + disasm | high |
| 0x102CDEAC | 0x002CDEAC | CInventoryClient_vftable | Vtable for CInventoryClient | RTTI + decomp | high |
| 0x102CED90 | 0x002CED90 | Packet_ID_UPDATE_vftable | Vtable for Packet_ID_UPDATE (read/write) | RTTI + disasm | med |
| 0x102CEDA0 | 0x002CEDA0 | Packet_ID_WEAPONFIRE_vftable | Vtable for Packet_ID_WEAPONFIRE (read/write) | RTTI + disasm | med |
| 0x102CA0A0 | 0x002CA0A0 | Packet_ID_PLAYER2PLAYER_vftable | Vtable for Packet_ID_PLAYER2PLAYER (read/write) | RTTI + disasm | med |
| 0x101B4510 | 0x001B4510 | g_AudioEventQueue | Global audio event queue/context used by AudioEvent_Enqueue | decomp + xrefs | low |

### CharFlags System (CShell.dll)

Character flags bitmask stored at SharedMem[0x1EA43]:

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1018B2D0 | 0x0018B2D0 | CharFlags_CheckFlag | Checks if flag bit is set in SharedMem[0x1EA43] | decomp | high |
| 0x1018B2F0 | 0x0018B2F0 | CharFlags_SetFlag | Sets flag bit (OR operation) in SharedMem[0x1EA43] | decomp | high |
| 0x1018B320 | 0x0018B320 | CharFlags_ClearFlag | Clears flag bit (AND NOT) in SharedMem[0x1EA43] | decomp | high |
| 0x1018B350 | 0x0018B350 | CharFlags_ClearAll | Clears all flags (writes 0) to SharedMem[0x1EA43] | decomp | high |

Known CharFlags bits:
- **Bit 2 (0x2) = CF_SPLIT_PENDING**: Set when item split request sent (Item_SendSplitRequest @ 0x1010AF10), cleared on response (PacketHandler_ID_SPLIT_CONTAINER @ 0x1018EF60). Prevents double-clicking item split dialog.

### StatGroup System (CShell.dll encrypted stats)

Encrypted variable manager stores game stats in indexed groups. Write via `StatGroup_WriteByIndex`, read via `StatGroup_Read`.

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x101C32F0 | 0x001C32F0 | StatGroup_Read | Reads encrypted stat from StatGroup[index] into buffer | decomp | high |
| 0x101C3BD0 | 0x001C3BD0 | StatGroup_WriteByIndex | Writes value to StatGroup[index] | decomp | high |
| 0x101C3160 | 0x001C3160 | StatGroup_WriteGroup | Writes entire group buffer (15 floats) | decomp | high |
| 0x101C32C0 | 0x001C32C0 | StatGroup_GetPtr | Gets pointer to StatGroup[index] data | decomp | med |

StatGroup index meanings (confirmed by xrefs):

| Index | Purpose | Write Function | Read Usage | Evidence |
|---|---|---|---|---|
| 1 | Player stats array (level, camera mode, etc) | - | Player_CheckLevelCap, ClientGame_Update | decomp |
| 2 | Movement/input flags | EncVar_WriteStatGroup2 @ 0x1019E470 | Recoil_ApplyStatGroup2, PlayerInput_UpdateAndSend | decomp |
| 3 | Nearby object type (vehicle state) | EncVar_WriteStatGroup3 @ 0x1019E590 | Player_UpdateNearbyObjects | decomp |
| 4 | Movement speed multiplier (stamina-based) | EncVar_WriteStatGroup4 @ 0x1019E5B0 | PlayerInput_UpdateAndSend | decomp |
| 5 | AccountType (0=FREE, 1=BASIC, 2=PREMIUM, 3=ADMIN) | EncVar_WriteAccountType @ 0x1018C480 | Player_GetAccountType @ 0x10032D40 | decomp |
| 6 | IsFullAccount flag (enables premium features) | EncVar_WriteIsFullAccount @ 0x1018C4A0 | Player_IsFullAccount @ 0x10036BF0 | decomp |
| 7 | Unknown (reset to 0 in PlayerStats_Reset) | EncVarMgr_WriteStatGroup7 @ 0x100598B0 | - | decomp |
| 8 | Unknown | EncVar_WriteStatGroup8 @ 0x101BFEE0 | - | decomp |

StatGroup 2 (movement flags) is also used by:
- Player_OnDeath @ 0x101A2980: resets to 0
- PlayerInput_UpdateAndSend @ 0x101A2CE0: sets movement bits from input

StatGroup init in StatGroupMgr_InitGroups @ 0x101C3E50 shows type codes:
- Index 0: type 0 (int)
- Index 1: type 2 (array)
- Index 2: type 6 (flags)
- Index 3: type 0 (int)
- Index 4: type 4 (float)
- Index 5: type 4 (float) - AccountType
- Index 6: type 1 (bool) - IsFullAccount
- Index 7: type 1 (bool)
- Index 8: type 1 (bool)

### SharedMem Index Reference (CShell.dll)

Key SharedMem indices used by LOGIN_RETURN and world login:

| Index | Hex | Purpose | Set By |
|---|---|---|---|
| 0x1 | 0x1 | defaultWorldId (starmap UI) | LOGIN_RETURN handler |
| 0x54 | 0x54 | Login complete flag | LOGIN_RETURN handler |
| 0x5A | 0x5A | noCharacter flag (1=needs creation) | LOGIN_RETURN handler |
| 0x5B | 0x5B | playerId | LOGIN_RETURN handler |
| 0x77 | 0x77 | apartmentWorldSelect | WorldSelect_ApplyApartmentInfo |
| 0x78 | 0x78 | apartmentId (1..24) | WorldSelect_ApplyApartmentInfo |
| 0x1CEC2 | 118466 | World login state (0-3) flag | GameState_EnterGameplay |
| 0x1D2AD | 119469 | Float (pitch?) | PlayerStats_Reset |
| 0x1D698 | 120472 | Movement key W | PlayerInput_UpdateAndSend |
| 0x1D699 | 120473 | Movement key S | PlayerInput_UpdateAndSend |
| 0x1D69A | 120474 | Movement key A | PlayerInput_UpdateAndSend |
| 0x1D69B | 120475 | Movement key D | PlayerInput_UpdateAndSend |
| 0x1D6A5 | 120485 | Float (stamina current?) | ClientGame_Update |
| 0x1D6A6 | 120486 | Float (stamina max=250.0) | PlayerStats_Reset |
| 0x1D6A7 | 120487 | Unknown dword | PlayerStats_Reset |
| 0x1D6A8 | 120488 | Flag (=1 on reset) | PlayerStats_Reset |
| 0x1D6A9 | 120489 | Flag | Player_OnDeath |
| 0x1DA94 | 121492 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1DE7E | 122494 | hasCharFlags from LOGIN_RETURN | LOGIN_RETURN handler |
| 0x1DE7F | 122495 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1E269 | 123497 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1E653 | 124499 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1EA3E | 125502 | Unknown dword | PlayerStats_Reset |
| 0x1EA43 | 125507 | CharFlags bitmask | CharFlags_* functions |
| 0x1EA44 | 125508 | CharState (inventory unlock) | InventoryClient_Ctor |
| 0x1EA48 | 125512 | Unknown (StatGroup init) | StatGroupMgr_InitGroups |
| 0x1EEBE | 126654 | Flag | Player_OnDeath |
| 0x1EEBF | 126655 | Unknown dword | PlayerStats_Reset |
| 0x1EEC0 | 126656 | World login state (0-3) | World login state machine |
| 0x1EEC1 | 126657 | worldId for connection | UI / LOGIN_RETURN |
| 0x1EEC2 | 126658 | worldInst | UI / LOGIN_RETURN |
| 0x1EEC3 | 126659 | Flag | PlayerStats_Reset |
| 0x1EEC4 | 126660 | Flag | Player_OnDeath |
| 0x3047 | 12359 | StatGroup 1 base (player stats, 0x6A entries, 0x1A8 bytes) | StatGroupMgr_InitGroups |

