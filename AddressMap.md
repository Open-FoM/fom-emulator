# AddressMap (FoM)



Notes:

- Use VA (absolute) + RVA (module base subtracted).

- Runtime debugging uses relocated module bases. Compute runtime EA as: `RuntimeBase + RVA` (do NOT rewrite AddressMap for ASLR).

- Confidence is about behavioral meaning, not just address correctness.

- Mid-function hooks are explicitly labeled.



## fom_client.exe (image base 0x00400000)

### Render / D3D9 init (Client build; image base 0x008D0000)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00ADAE90 | 0x0020AE90 | D3D9Mgr_Init | Creates IDirect3D9, captures adapter display mode, then enumerates adapters/modes | decomp | high |
| 0x00ADA1E0 | 0x0020A1E0 | D3D9Mgr_Reset | Clears D3D9 manager state/lists | decomp | med |
| 0x00ADA430 | 0x0020A430 | D3D9Mgr_EnumerateAdapters | Enumerates adapters, display modes, formats, and caps into manager lists | decomp | med |
| 0x00AD67B0 | 0x002067B0 | D3D9Mgr_BuildModeList | Builds display-mode list entries for UI/device selection | decomp | med |
| 0x00A54500 | 0x00184500 | Renderer_BuildDisplayList | Ensures D3D9Mgr_Init then builds display list into `g_DisplayModeListHead` | decomp | med |
| 0x00A547B0 | 0x001847B0 | Renderer_InitDevice | High-level device init: selects adapter/mode, calls Renderer_CreateDevice, positions window | decomp | high |
| 0x00A540C9 | 0x001840C9 | Renderer_CreateDevice | Calls IDirect3D9::CreateDevice (vtbl+0x40), writes device ptr to `renderCtx-16` | decomp | high |
| 0x00A54060 | 0x00184060 | Renderer_CreateDeviceWrapper | Prepares renderCtx + flags then calls Renderer_CreateDevice | decomp | med |
| 0x00A54260 | 0x00184260 | Renderer_ResetDevice | Calls IDirect3DDevice9::Reset, retries on lost device, rebinds defaults | decomp | med |
| 0x00A5BB40 | 0x0018BB40 | D3DDeviceWrapper_Ctor | Initializes device-wrapper flags | decomp | low |
| 0x00A5BB70 | 0x0018BB70 | D3DDeviceWrapper_InitStates | Caches device render/texture stage state defaults | decomp | low |
| 0x0091F5A0 | 0x0004F5A0 | RenderList_BuildAndClone | Builds display list then clones nodes into caller list | decomp | med |
| 0x0091F600 | 0x0004F600 | RenderList_GetClone | Thin wrapper around RenderList_BuildAndClone; returns list head | decomp | low |
| 0x0091F620 | 0x0004F620 | RenderList_FreeClone | Iterates list and frees nodes | decomp | low |
| 0x0091F650 | 0x0004F650 | RenderList_CopyDefaults | memcpy from `unk_BFCC40` into caller buffer | decomp | low |
| 0x0091F670 | 0x0004F670 | Render_OnWindowStateFlags | Show/Hide window via flags; marks render state dirty | decomp | low |
| 0x00920250 | 0x00050250 | Render_SetRenderMode | Handles SetRenderMode + restore video flow; emits LT_UNABLETORESTOREVIDEO | decomp | med |
| 0x00A54540 | 0x00184540 | RenderList_Free | Iterates list and frees nodes (sub_908030) | decomp | low |

### Item templates (Client base 0x00400000)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00757220 | 0x00357220 | ItemTemplate_GetPtrById | Returns template pointer for id (or 0 if out of range) | decomp | high |

| 0x0080FFC0 | 0x0040FFC0 | ItemTemplateTable_Init | Zeros 0xBC1 dwords then calls ItemTemplateTable_FillPointers | disasm | med |

| 0x0083EF50 | 0x0043EF50 | ItemTemplateTable_FillPointers | Bulk fills template pointer table with hardcoded addresses (id->template ptr) | decomp | med |

| 0x00861DA0 | 0x00461DA0 | ItemTemplateTable_InitGlobal | Zeros `g_ItemTemplateById` @ 0x101B9710 then fills via ItemTemplateTable_FillPointers | disasm | med |

| 0x00811170 | 0x00411170 | ItemTemplate_GetTypeById | Returns `template->type` (byte @ +0x08) for item id; `this` = template table base | decomp + xrefs | high |

| 0x00811140 | 0x00411140 | ItemTemplate_GetAmmoItemId | Returns `template->ammo_item_id` (u16 @ +0x30) | decomp | high |

| 0x008111A0 | 0x004111A0 | ItemTemplate_GetEquipSlot | Returns `template->equip_slot` (u8 @ +0x0A) | decomp | high |

| 0x00811430 | 0x00411430 | ItemTemplate_AppendIdListByType | Builds CSV list of item IDs with matching `template->type` into caller buffer | decomp | med |

| 0x00811940 | 0x00411940 | ItemTemplate_IsSpecialIdAllowed | ID allowlist/denylist w/ jump tables; used as filter in item scan | decomp + xrefs | low |

| 0x00811E40 | 0x00411E40 | ItemTemplate_FindPrevByTypeFiltered | Scans backward for matching type/subtype/flag in template table | decomp | med |

| 0x00812230 | 0x00412230 | ItemTemplate_IsWeaponType34 | Returns true if `template->type` is 3 or 4 | decomp | med |

| 0x00812270 | 0x00412270 | ItemTemplate_IsArmorType | True if `template->type == 5` | decomp | med |

| 0x008122B0 | 0x004122B0 | ItemTemplate_IsType7 | True if `template->type == 7` | decomp | low |

| 0x00812380 | 0x00412380 | ItemTemplate_IsType11or13 | True if `template->type` is 11 or 13 | decomp | low |

| 0x008123C0 | 0x004123C0 | ItemTemplate_IsType12or14 | True if `template->type` is 12 or 14 | decomp | low |

| 0x00812400 | 0x00412400 | ItemTemplate_IsType15 | True if `template->type == 15` | decomp | low |

| 0x00812440 | 0x00412440 | ItemTemplate_IsType6or23 | True if `template->type` is 6 or 23 | decomp | low |

| 0x00812480 | 0x00412480 | ItemTemplate_IsType6_Global | True if global template table entry has `type == 6` | decomp | low |

| 0x008124C0 | 0x004124C0 | ItemTemplate_GetSubTypeOrArmorSubType | Returns `template->subtype` (byte @ +0x09) or armor subtype via ArmorClassIndex_ToSubType | decomp | low |

| 0x00812510 | 0x00412510 | ItemTemplate_CanUseVariantFlagged | Composite gate: template flags @ +56/+58, skill checks, and item allowlists | decomp | low |

| 0x00812630 | 0x00412630 | ItemInstance_PassesUseGate | Checks instance flags + template time gate (`+0x50`) and id != 980 | decomp | low |

| 0x00811510 | 0x00411510 | ItemTemplate_IsType21or22 | True if `template->type` is 21 or 22 | decomp | low |

| 0x00812940 | 0x00412940 | ItemTemplate_IsSubType36 | True if subtype (or armor subtype) equals 36 | decomp | low |

| 0x0081D2A0 | 0x0041D2A0 | ItemList_FilterBySpecialTypeSet | Removes list entries failing ItemTemplate_IsTypeInSpecialSet | decomp | low |

| 0x0081D340 | 0x0041D340 | ItemList_PruneByCountGate | Removes entries when `a2` exceeds entry count and count/skill gate passes | decomp | low |

| 0x0081ED20 | 0x0041ED20 | ItemType16_18_ProcessList | Processes list entries for types 16/17/18 with stack split/consume logic | decomp | low |

| 0x00819980 | 0x00419980 | ItemUseCriteria_Matches | Evaluates criteria struct vs item id/class group; uses CanUseVariantFlagged | decomp | low |

| 0x0080FFF0 | 0x0040FFF0 | ItemId_IsSet_24_25_31 | True if id is 24, 25, or 31 | decomp | low |

| 0x00810050 | 0x00410050 | ItemId_IsSet_8_14 | True if id is 8 or 14 | decomp | low |

| 0x00810150 | 0x00410150 | ItemFlag_TestBitForSlot | Tests bit `(a1-4)` in mask when slot 5..16 | decomp | low |

| 0x00810190 | 0x00410190 | ItemFlag_SetBitForSlot | Sets/clears bit `(a1-4)` in mask when slot 5..16 | decomp | low |

| 0x00810250 | 0x00410250 | ItemId_GetMultiplierForA2GE3 | Returns 1.0 unless id is in hardcoded set and `a2 >= 3`, then uses `0x1012DA00` | decomp | low |

| 0x008102D0 | 0x004102D0 | ItemTemplate_UnusedStub | Always returns 0 | decomp | low |

| 0x00811280 | 0x00411280 | ItemId_CheckCountOrSkillGate | Gate for ids {24,25,31,32} based on `a2` and skill check `sub_12061C0(13, a3)` | decomp | low |

| 0x008104E0 | 0x004104E0 | ItemTemplate_GetArmorClassIndex | Maps armor item ID to class index (0..0x2F) via packed table @ 0x100C0394 + jump tables @ 0x100C02D4/0x100C051C | disasm | med |

| 0x00810930 | 0x00410930 | ArmorClassIndex_ToGroup | Maps armor class index (0..0x2E) to small group 1..5 via tables @ 0x100C0570/0x100C0584 | disasm | med |

| 0x008109C0 | 0x004109C0 | ArmorClassIndex_ToSubType | Maps armor class index (0..0x2E) to subtype via jump table @ 0x100C060C | disasm | low |

| 0x008110B0 | 0x004110B0 | ItemTemplate_IsWeaponExceptSubtypeSet | Returns true for type 3/4 except subtype {18,20,22,38}; also subtype 15 or id 993 | decomp | med |

| 0x008112F0 | 0x004112F0 | ItemTemplate_IsTypeInSpecialSet | Type‑based switch for types 6..; fallback: id in {0x3CD..0x3CF, 985} | decomp | low |

| 0x00811390 | 0x00411390 | ItemTemplate_IsTypeWithCountGate | Type 0x10..0x12 needs a2>1; type 0x13 needs a3>1; a4 must be <2 | decomp | low |

| 0x008115B0 | 0x004115B0 | ItemTemplate_AdjustQuantityByType | Adjusts quantity based on id/type; scales by constants; halves if a5 set | decomp | low |

| 0x00811F40 | 0x00411F40 | ItemTemplate_GetClassGroup | Returns `template->group` (byte @ +0x02) or armor group via GetArmorClassIndex->ArmorClassIndex_ToGroup | decomp | med |

| 0x00817090 | 0x00417090 | ArmorClass_FillStatBlockA | Armor class switch (0..0x2E) populates stat block; uses ItemTemplate_GetArmorClassIndex | decomp | low |

| 0x008177E0 | 0x004177E0 | ArmorClass_FillStatBlockB | Armor class switch (0..0x2E) populates alt stat block | decomp | low |

| 0x0081AA60 | 0x0041AA60 | ItemList_SumWeaponCounts | Sums stack counts for type 3/4 items in list (size 44 entries) | decomp | low |

| 0x008209C0 | 0x004209C0 | ItemStats_ProcessAll_WithScale | Builds stat entries for item; applies multiplier for stat 39; consumes base stat blocks | decomp | low |

| 0x00820B50 | 0x00420B50 | ItemStats_ProcessAll_NoScale | Builds stat entries for item without multiplier; per‑stat jump table | decomp | low |

| 0x00820F60 | 0x00420F60 | ItemStats_ProcessByStatId_WithScale | Builds stat entries for a single stat id (a4), applying multiplier | decomp | low |

| 0x00829890 | 0x00429890 | ItemStats_InitCaches | One-time init for item/armor stat caches; walks item ids and armor classes | decomp | low |

| 0x00829A80 | 0x00429A80 | ItemStats_ComputeRequirementScore | Recursively computes a value from requirement pairs; weights by class group for type 16 | decomp | low |

| 0x00828690 | 0x00428690 | ItemVariant_FindMatchingRecord | Scans packed 0x12-byte records @ 0x10147CC6; validates IDs via template table | decomp + disasm | low |

| 0x0081F6A0 | 0x0041F6A0 | ItemStat_ScaleFloat | Multiplies base stat by factor, rounds via float helper, stores back | decomp | low |

| 0x0081F920 | 0x0041F920 | ItemStat_FormatLine | Formats stat line with unit scaling/color; uses string table @ 0x101440xx | disasm | low |

| 0x0082B4E0 | 0x0042B4E0 | ItemStat_AdjustValueByFormat | Adjusts stat float based on format key/subtype; calls ItemStat_ScaleFloat | disasm | low |

| 0x00833320 | 0x00433320 | StatList_SetEntryClamped | Sets stat entry by id, clamps to g_ItemBaseStatTable (0x101431A0) | decomp | low |

| 0x00833370 | 0x00433370 | StatList_AddEntryClamped | Adds to stat entry by id, clamps to g_ItemBaseStatTable (0x101431A0) | decomp | low |

| 0x00833770 | 0x00433770 | StatList_ReadFromPacket | Reads stat list (count + id/value pairs) from bitstream | decomp | med |

| 0x007B28E0 | 0x003B28E0 | StatList_ApplyEntryClamped | Applies single stat entry with clamp + side effects | decomp | low |

| 0x007B2A80 | 0x003B2A80 | StatList_ApplyPacket | Parses stat list and applies entries via StatList_ApplyEntryClamped | decomp | low |

| 0x00833900 | 0x00433900 | PlayerStats_RecalcFromInventory | Rebuilds player stats from equipped items + stat list; clamps to g_ItemBaseStatTable | decomp | low |



### Weapons / Fire (fom_client.exe)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x0076A170 | 0x0036A170 | WeaponFire_TryFire | Validates weapon fire (type 3/4), aim checks, and state gating | decomp | low |

| 0x0076A380 | 0x0036A380 | WeaponFire_Execute | Executes fire; computes vectors, raycast/aim, and queues fire action | decomp | low |

| 0x00768470 | 0x00368470 | WeaponFire_HandleType4Fx | Type-4 weapon fire handler; builds FX params and spawns effect | decomp | low |

| 0x007B65E0 | 0x003B65E0 | WeaponFire_InitShot | Initializes shot state from params + item id; validates weapon type | decomp | low |

| 0x00768BE0 | 0x00368BE0 | WeaponHUD_UpdateCrosshair | Updates crosshair/weapon HUD elements and labels | decomp | low |

| 0x0076AA00 | 0x0036AA00 | WeaponClient_Update | Main weapon update tick; handles state, HUD, and fire timing | decomp | low |



### UI / Equipment (fom_client.exe)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x007681E0 | 0x003681E0 | EquipPanel_Update | Updates equipment panel + slot text; syncs UI and item type changes | decomp | low |

| 0x00757350 | 0x00357350 | EquipPanel_BuildSlotText | Formats equipment slot text into UI buffer; resolves template names | decomp | low |

| 0x00757BB0 | 0x00357BB0 | EquipPanel_PushSlotText | Pushes equipment slot names into UI list/control | decomp | low |



### Player data / stat feed (fom_client.exe)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x007A7320 | 0x003A7320 | MsgGroup_Dispatch_121 | Message-group dispatcher for ids 121.. (jump table @ 0x10056FF4) | decomp | low |

| 0x007CB190 | 0x003CB190 | HandleMsg_PlayerData | Large player data handler; applies 0x35 stat entries + equips list | decomp | low |



### Data (item template globals)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x101B9710 | (abs) | g_ItemTemplateById (external) | Absolute ptr base used by fom_client to access template pointers (array indexed by item id) | disasm (`ds:101B9710h[id*4]`) | med |

| 0x10147CC6 | (abs) | g_ItemVariantTable? | Packed 0x12‑byte record table used by ItemVariant_FindMatchingRecord | disasm | low |



## NetMgr / Packet Intake (fom_client.exe)


- GetPacketId (reads 8 bits from CPacket_Read) VA `0x0043A580` RVA `0x0003A580`



### Login / Auth packets (fom_client.exe)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x00969700 | 0x00099700 | VariableSizedPacket_ScalarDeletingDtor | Base vftable dtor (VariableSizedPacket_vftable) | disasm | low |



| 0x00969730 | 0x00099730 | Packet_ID_LOGIN_REQUEST_Ctor | Ctor sets `messageType = 0x6C` (ID_LOGIN_REQUEST) | disasm | high |
| 0x00969780 | 0x00099780 | Packet_ID_LOGIN_REQUEST_Dtor | Dtor for Packet_ID_LOGIN_REQUEST | disasm | low |

| 0x00969790 | 0x00099790 | Packet_ID_LOGIN_REQUEST_RETURN_Ctor | Ctor sets `messageType = 0x6D` (ID_LOGIN_REQUEST_RETURN) | disasm | high |





| 0x009697E0 | 0x000997E0 | Packet_ID_LOGIN_REQUEST_RETURN_Dtor | Dtor for Packet_ID_LOGIN_REQUEST_RETURN | disasm | low |

| 0x0096A740 | 0x0009A740 | VariableSizedPacket_Read | Base read; copies packet into BitStream + handles ID_TIMESTAMP header | decomp | med |



| 0x0096A7F0 | 0x0009A7F0 | VariableSizedPacket_WriteHeader | Writes optional ID_TIMESTAMP + messageType into BitStream | decomp | med |



| 0x0096A930 | 0x0009A930 | Packet_ID_LOGIN_REQUEST_ScalarDeletingDtor | Vftable dtor for Packet_ID_LOGIN_REQUEST | disasm | low |



| 0x0096A960 | 0x0009A960 | Packet_ID_LOGIN_REQUEST_RETURN_ScalarDeletingDtor | Vftable dtor for Packet_ID_LOGIN_REQUEST_RETURN | disasm | low |



| 0x0096A330 | 0x0009A330 | BitStream_ReadCompressed_U16 | Compressed read of uint16 (bitlength 16, endian-aware) | disasm | med |
| 0x0096B3A0 | 0x0009B3A0 | BitStream_WriteCompressed_U16 | Compressed write of uint16 (bitlength 16, endian-aware) | disasm | med |
| 0x0096B6C0 | 0x0009B6C0 | Packet_ID_LOGIN_REQUEST_Read | Reads username (StringCompressor/Huffman) + clientVersion (compressed u16) | disasm | med |



| 0x0096B720 | 0x0009B720 | Packet_ID_LOGIN_REQUEST_Write | Writes username (StringCompressor/Huffman) + clientVersion (compressed u16) | disasm | med |

| 0x0096B760 | 0x0009B760 | Packet_ID_LOGIN_REQUEST_RETURN_Read_Stub | Stub: status=1 + server addr; **does not parse payload** (Docs/Packets says status + username StringCompressor) | disasm | low |
| 0x0096B7C0 | 0x0009B7C0 | Packet_ID_LOGIN_REQUEST_RETURN_Write | Writes status (compressed byte) + username (StringCompressor/Huffman) | disasm | med |

| 0x0096B820 | 0x0009B820 | Packet_ID_LOGIN_Write | Writes ID_LOGIN per Docs/Packets/ID_LOGIN.md | decomp | med |

| 0x0096C090 | 0x0009C090 | Packet_ID_LOGIN_Ctor | Ctor sets `messageType = 0x6E` (ID_LOGIN) | disasm | high |

| 0x0096CA70 | 0x0009CA70 | ClientNetworking_HandleLoginRequestReturn | Handles ID_LOGIN_REQUEST_RETURN; **legacy session-hash flow (mismatch vs Docs/Packets)** | decomp | med |


| 0x0096D250 | 0x0009D250 | ClientNetworking_DispatchPacket | Switch on packet ID; handles ID_CONNECTION_REQUEST_ACCEPTED + ID_LOGIN_REQUEST_RETURN (0x6D/109); updates master/world addrs; else fallthrough | decomp | med |



| 0x00988190 | 0x000B8190 | PacketHandlerTable_FindIndexById | Linear search (0xC8 entries) of handler table for packet ID | decomp | low |



| 0x00988290 | 0x000B8290 | ClientNetworking_HandleIncomingPacket | Entry point for incoming packet; validates + calls ClientNetworking_DispatchPacket; fallback to handler table (client/world) | decomp | med |

| 0x00B4A74A | 0x0027A74A | ClientNetworking_HandleLoginRequestReturn_SEH | SEH wrapper for login-request-return handler | disasm | low |

| 0x0096D090 | 0x0009D090 | ClientNetworking_SubmitLoginRequest | Builds/sends ID_LOGIN_REQUEST from UI input; captures fileCRCs + optional Steam ticket (client sends 0x6C) | decomp | med |
| 0x00987E60 | 0x000B7E60 | Login_Invoke | Global wrapper calling ClientNetworking_SubmitLoginRequest on g_pClientNetworking | disasm | med |





Login packet dependency chains (fom_client.exe):

- ID 0x6C: Login_Invoke -> ClientNetworking_SubmitLoginRequest -> Packet_ID_LOGIN_REQUEST_Write -> SendPacket_LogMasterWorld.
- ID 0x6D: RakPeer recv -> ClientNetworking_HandleIncomingPacket -> ClientNetworking_DispatchPacket -> ClientNetworking_HandleLoginRequestReturn -> Packet_ID_LOGIN_REQUEST_RETURN_Read_Stub (legacy/mismatch).

- ID 0x6E: ClientNetworking_HandleLoginRequestReturn -> Packet_ID_LOGIN_Write -> SendPacket_LogMasterWorld.

## Message Handlers (g_MessageHandlers table)
- Init_MessageHandlers VA `0x00427480` RVA `0x00027480` (memset 0x400 bytes, then assigns handlers)
- g_MessageHandlers base VA `0x0072AB88` (.data), index = `PacketID` (IDs 0..3 unused); Init sets ID 4..23 entries.
- IDs 4..23
  - ID 4  `SMSG_NETPROTOCOLVERSION` -> `OnNetProtocolVersionPacket` VA `0x00425060` RVA `0x00025060` (expects u32 version==7; else LT_INVALIDNETVERSION)

  - ID 5  `SMSG_UNLOADWORLD`        -> `OnUnloadWorldPacket` VA `0x00424F40` RVA `0x00024F40`

  - ID 6  `SMSG_LOADWORLD`          -> `OnLoadWorldPacket` VA `0x004266C0` RVA `0x000266C0` (loads world + sends MSG_ID 0x09 connect stage=0 ack)

  - ID 7  `SMSG_CLIENTOBJECTID`     -> `OnClientObjectID` VA `0x00425040` RVA `0x00025040`

- ID 8  `SMSG_UPDATE`             -> `OnUpdatePacket` VA `0x00426DF0` RVA `0x00026DF0` (validates sub-packet bitlen boundaries)
- ID 9  `SMSG_(unused)`           -> no handler set
- ID 10 `SMSG_UNGUARANTEEDUPDATE` -> `OnUnguaranteedUpdatePacket` VA `0x004260D0` RVA `0x000260D0`
    - Layout: loop { u16 objectId, u4 flags }. If objectId==0xFFFF → read float gameTime + update tick. Flags: 0x4 pos (+optional vel), 0x8 alt rot, 0x2 quat rot, 0x1 modelinfo (Update_ReadModelInfoBlock).
  - ID 11 `SMSG_(unused)`           -> no handler set

  - ID 12 `SMSG_YOURID`             -> `HandleIDPacket` VA `0x00424EF0` RVA `0x00024EF0`

  - ID 13 `SMSG_MESSAGE`            -> `OnMessagePacket` VA `0x00426F50` RVA `0x00026F50`



## Object.lto (image base 0x10000000)



### Class definitions / IDs

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100012F0 | 0x000012F0 | ObjectDLLSetup | Builds class-def pointer array from linked list; sets g_pLTServer and returns array+count | decomp | high |

| 0x1006C150 | 0x0006C150 | CacheObjectClassIds | Caches class IDs by name via g_pLTServer vfunc +0x170 | decomp | high |

| (see Docs/Notes/Object_lto_class_ids.csv) | (abs) | ObjectClassDef list | Object class name -> class_id mapping from .data (93 entries) | IDA script | med |

- ID 14 `SMSG_PACKETGROUP`        -> `OnMessageGroupPacket` VA `0x00426C00` RVA `0x00026C00` (iterates: u8 **bit-length** + subpacket; length includes inner SMSG id bits; dispatched via g_MessageHandlers)

    - OnMessagePacket internals: builds a message object via MessagePacket_Parse (PacketView->MessagePacket_Alloc->MessagePacket_Init) then calls IClientShell_Default vtbl+0x58 with message id; releases object after dispatch.
    - OnMessageGroupPacket: for each subpacket, reads inner msgId via Packet_ReadBits(8) and dispatches g_MessageHandlers[msgId]; decrefs PacketView when done.

  - ID 15 `SMSG_CONSOLEVAR`         -> `OnConsoleVar` VA `0x00426FC0` RVA `0x00026FC0`

  - ID 16 `SMSG_SKYDEF`             -> `OnSkyDef` VA `0x00426360` RVA `0x00026360`

  - ID 17 `SMSG_INSTANTSPECIALEFFECT` -> `OnInstantSpecialEffect` VA `0x00427050` RVA `0x00027050`

  - ID 18 `SMSG_(unused)`           -> no handler set

  - ID 19 `SMSG_PRELOADLIST`        -> `OnPreloadListPacket` VA `0x004270D0` RVA `0x000270D0`

  - ID 20 `SMSG_THREADLOAD`         -> `OnThreadLoadPacket` VA `0x004250F0` RVA `0x000250F0`

  - ID 21 `SMSG_UNLOAD`             -> `OnUnloadPacket` VA `0x00425130` RVA `0x00025130`

  - ID 22 `SMSG_GLOBALLIGHT`        -> `OnGlobalLight` VA `0x00425820` RVA `0x00025820`

  - ID 23 `SMSG_CHANGE_CHILDMODEL`  -> `OnChangeChildModel` VA `0x00425230` RVA `0x00025230`

### SMSG_UPDATE internals (fom_client.exe)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00425ED0 | 0x00025ED0 | UpdateHandle_Group0 | Group0 update: u16 blockId + u8 blockFlags; optional u16/u8 scale; optional timeScale; optional vec3 (packet or client pos). Ends with u32 field + World_ApplyUpdateBlock | decomp | med |
| 0x004256B0 | 0x000256B0 | UpdateHandle_Group1 | Group1 update: u8 flags + u16 objectId; flags 0x1 spawn/refresh, 0x2 pos vec3 apply, 0x20 extra handler; uses Update_ReadBlock0_Alloc + World_ApplyUpdateBlock | decomp | med |
| 0x00424F60 | 0x00024F60 | UpdateHandle_Group3 | Group3 update: remove list of u16 objectIds; World_RemoveObject / ObjectInstance_OnRemoved / Object_HandlePendingRemoval | decomp | med |
| 0x004267C0 | 0x000267C0 | UpdateHandle_GroupObjUpdate | Object update path (flags!=0): optional remove+add, Update_ReadObjectDefBlock, World_AddObjectFromUpdate, Update_ApplyObjectUpdateFlags, optional object msg dispatch | decomp | low |
| 0x004254F0 | 0x000254F0 | Update_ReadBlock0_Alloc | Reads update-block core fields (blockId/flags/scale/time/u32) and optional client-pos copy; fills 0x13C buffer used by Group1 spawn | decomp | low |
| 0x004258F0 | 0x000258F0 | Update_ApplyObjectUpdateFlags | Applies CF_* update flags: pos/vel, rot, render, scale, modelinfo, attachments, dims | decomp | low |
| 0x004264E0 | 0x000264E0 | Update_ReadObjectDefBlock | Reads object-def block used by GroupObjUpdate (spawn/update) | decomp | low |
| 0x00424B60 | 0x00024B60 | Update_ReadModelInfoBlock | Reads model-info delta list (bitpacked) for unguaranteed updates | disasm | low |
| 0x00424810 | 0x00024810 | Update_IsLocalPlayer | Returns true if update target is local player | decomp | low |

Notes (SMSG_UPDATE / model info):
- Update_ReadModelInfoBlock layout: if leading bit set, loop entries with applyChange(1), flagSet(1), modelId (8 or 14 bits + useHighBits), localFlag(1), lenSelector(2) -> read N bits (1/6/10/32) and scale by 8; for non‑first entries: key(u8) + extraVal(3 or 8 bits); optional scale (1 bit → 32‑bit float). Applies via ModelInfo_ApplyDelta then ModelInfo_ApplyDirtyNodes.
- Update_ReadObjectDefBlock layout:
  - u8 objDefFlags (bit7: lenIs16, bit6: hasSubBlock, low6: objType)
  - vec3f32 position (x/y/z) → stored at defStruct+0x10
  - if hasSubBlock: read subBlockLen (u8 or u16), PacketView_Init sub-block, Packet_ReadSubBlock into output writer, then advance packet cursor
  - objType cases:
    - 1: Update_ReadFileIdLists(def) (file id lists)
    - 2: read null‑terminated string (max 127) into defStruct+0x4C
    - 3: read u16 into def+0x08
    - 9: same string as type 2 + read u16 into defStruct+0x02
  - writes objType into *(u16*)defStruct

### Object message packet path (fom_client.exe)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00426430 | 0x00026430 | MessagePacket_Parse | Builds PacketView over subpacket and alloc+init MessagePacket; returns ptr with first dword = messageId | disasm | med |
| 0x00420390 | 0x00020390 | MessagePacket_AllocAndInit | Allocates from pool and calls MessagePacket_Init | decomp | low |
| 0x004200A0 | 0x000200A0 | MessagePacket_Init | Inits PacketView inside MessagePacket (no parsing here) | decomp | low |
| 0x0040C510 | 0x0000C510 | BuildObjectMsgPacket | Finalizes object msg writer and builds PacketView | decomp | low |
| 0x0040B830 | 0x0000B830 | ObjectMsgWriter_FlushToView | Flushes pending bits into PacketWriter, sets PacketView+cache, releases old writer | decomp | low |
| 0x0040A770 | 0x0000A770 | PacketWriter_WriteU32 | Writes 32‑bit word to PacketWriter chain (updates bit count) | decomp | low |
| 0x0040A840 | 0x0000A840 | PacketView_RefreshCache | Refresh cached word pointer for PacketView at current bit position | decomp | low |
| 0x0043D3E0 | 0x0003D3E0 | Packet_ReadSubBlock | Copies sub‑block bits from PacketView into PacketWriter (32‑bit chunks + tail) | decomp | low |
| 0x0040DDB0 | 0x0000DDB0 | World_AddObjectFromUpdate | Spawns object from def: CreateObjectFromDef → PostInit → apply transforms/scale → set objectId | decomp | low |
| 0x0043CFC0 | 0x0003CFC0 | Packet_ReadCString | Reads null‑terminated string (returns length excl. null) | decomp | low |

### MSG_ID dispatch (CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10038B58 | 0x00038B58 | CGameClientShell_OnMessage | Primary MSG_ID switch (0x6A..0x9D); dispatches to MsgId_* handlers | decomp | high |
| 0x100380E4 | 0x000380E4 | CGameClientShell_OnMessage2 | Secondary MSG_ID switch (base=0x68); calls Msg2_PreDispatch and Msg2_Default_Handler | decomp | med |
| 0x101B8040 | 0x001B8040 | MsgId_6B_Handler | Reads type(u8) + id(u32); resolves handler via MsgId6B_FindHandlerByTypeAndId and calls vtbl+0x2C | decomp | med |
| 0x101B7FD0 | 0x001B7FD0 | MsgId6B_FindHandlerByTypeAndId | Walks 12 buckets (16 bytes each); bucket->entries[i]->id == a3 | decomp | med |
| 0x101BBAE0 | 0x001BBAE0 | Msg2_PreDispatch | Pre-decodes Msg2 payload types (2..10) before OnMessage2 handling | decomp | low |

MSG_ID cases handled by CGameClientShell_OnMessage (CShell):
- 0x6A -> MsgId_6A_Handler (0x101852D0) (reads u32 + 12-byte payload)
- 0x6B -> MsgId_6B_Handler (0x101B8040) (group dispatch via MsgId6B_FindHandlerByTypeAndId)
- 0x6C -> MsgId_6C_Handler (0x101B3000) (resource/string formatting + UI routing)
- 0x6E -> CrosshairMgr_OnMessage (0x1004E710)
- 0x6F -> MsgId_6F_Handler (0x101C18A0) (TravelMgrClient subtypes 0/2/3/5/6/7)
- 0x70 -> MsgId_70_ReadVecOrStruct (0x10037320) + MsgId_70_Handler (0x1019E9E0)
- 0x76 -> MsgId_76_Handler (0x10028010)
- 0x77 -> MsgId_77_NoPayload (0x101A1B30) or MsgId_77_WithPayload (0x101A1F80) based on flag
- 0x7E -> MsgId_7E_Handler (0x1004CCF0)
- 0x81 -> CameraShake + Recoil_ApplyStatGroup2 (inline)
- 0x83 -> MsgId_83_LocalPlayerGate (0x101A0BC0) else MsgId_83_Handler (0x10028180)
- 0x84 -> MsgId_84_Handler (0x10028070)
- 0x85 -> MsgId_85_Handler (0x10035840)
- 0x86 -> MsgId_86_WindowClose (0x100F82A0)
- 0x88 -> MsgId_88_WindowClose (0x100F2E30)
- 0x8C -> MsgId_8C_Handler (0x10028100)
- 0x8E -> MsgId_8E_Handler (0x100383B0)
- 0x8F -> MsgId_8F_Handler (0x101C2460)
- 0x9A -> MsgId_9A_Handler (0x10028140)
- 0x9B -> UI window close routing by subtype (510/511/512/515/516)
- 0x9D -> MsgId_9D_Handler (0x100280B0)

MSG_ID cases handled by CGameClientShell_OnMessage2:
- 0x68 -> Msg2_Id68_Handler (0x1019F740)
- 0x6A -> MsgId_6A_Handler (0x101852D0)
- 0x75 -> subtype switch (0..4) -> Msg2_75_Sub0_Create / Msg2_75_Sub1_Create / Msg2_75_Sub2_SetValue / Msg2_75_Sub3_Create / Msg2_75_Sub4_Create
- else -> Msg2_Default_Handler (0x10022E30)

IDA structs (CShell):
- MsgId6B_GroupBucket (size 0x10): entries ptr @+0x00, count @+0x08 (unk @+0x04/+0x0C).
- MsgId6B_HandlerEntry: id @+0x10; vtbl used at +0x0 to call handler.

### MSG_ID payload layouts (CShell)
MSG_ID 0x6B:
- u8 groupType (0..11), u32 id, then handler-specific payload.
- Dispatch: MsgId6B_FindHandlerByTypeAndId (bucket = groupType; entry->id == id) then entry->vtable+0x2C(msg).

MSG_ID 0x6C (resource/string message):
- u32 dest, u32 stringId, u32 paramCount (<=10).
- paramCount times: u32 paramType.
  - 0: read string (max 1024) into local buffer; arg = char*.
  - 1/2: read u32 value; arg = u32.
  - 3: read u32 stringId -> LTClient string; arg = char*.
- LoadStringA(cres_hinstance, stringId) + FormatMessageA(..., args).
- dest switch:
  - 0: ILTClient::CPrint(Source)
  - 1: SharedMem[0x7B] = stringId, SharedMem[124] = ""
  - 2: SharedMem[0x5D] = stringId, SharedMem[94] = ""
  - 5: ILTClient::ShowMessage(stringId lookup)
  - 6/7/8/9/10: sub_10180D40(Source, colors) (UI colored text)
  - 3/4/12/13: no-op

MSG_ID 0x6F (TravelMgrClient):
- u32 subtype, then:
  - 0: u32 value -> sub_101C13B0
  - 2: u32 ms -> log "World loading took %.2f" + sub_101C0B40
  - 3: u32 error + string(256) worldName -> log + message id 5314
  - 5: u32 ms -> log "World starting took %.2f" + LoginUI_ShowMessage(9) + nullsub_6
  - 6: u32 error -> reads UI field id 3 locally; log "Running world ..." + "Error running world"
  - 7: no payload -> sub_10109A10
  - default: log unknown subtype

MSG_ID 0x75 (OnMessage2 path):
- subtypeByte = Read8; switch uses (subtypeByte - 1) -> cases 0..4.
  - sub0: u32 id, u32 v3 -> Msg2_75_Sub0_Create
  - sub1: u32 id, u32 v10, u32 v11(?), u32 v12 -> Msg2_75_Sub1_Create
  - sub2: u32 id, u32 value -> Msg2_75_Sub2_SetValue
  - sub3: u32 id, u32 v14, u32 v15(?) -> Msg2_75_Sub3_Create
  - sub4: u32 id, u32 v17, u32 v18(?) + bit flag -> Msg2_75_Sub4_Create
- note: some reads are cast to u16 in decomp but called with bitCount=32; validate with disasm if strict sizes are needed.

MSG_ID 0x6A:
- u32 id, then 96 bits (12 bytes) payload; passes to MsgId_6A_Handler (creates/updates entry in list).

MSG_ID 0x6E (CrosshairMgr_OnMessage):
- ReadObjectId (vtbl+100) -> target/object handle
- u32 flags (see flag map below)
- Optional payload is **flag-gated**; includes combinations of:
  - u32 stringId OR 256‑byte string (ReadString) for target name/title
  - u8 timer/seconds (when flag 0x200000)
  - additional 256‑byte strings + u8 color code(s) for extra lines
- Uses flags to choose crosshair textures and build UI text blocks.

MSG_ID 0x70:
- 128 bits into vec4 (MsgId_70_ReadVecOrStruct), then MsgId_70_Handler (EncVar + stats update).

MSG_ID 0x76:
- ReadObjectId, then f32, then u16; writes into Msg2_75_Sub0 entry (offsets +148, +702).

MSG_ID 0x77:
- bit hasPayload, u32 id; if hasPayload then 32‑bit value (read via vtbl+68) → MsgId_77_WithPayload else MsgId_77_NoPayload.

MSG_ID 0x7E:
- ReadObjectId; MsgId_7E_Handler searches list by id and triggers action.

MSG_ID 0x81:
- vec3 (Msg_ReadVector3f) for CameraShake (rate‑limited), then f32 for Recoil_ApplyStatGroup2.

MSG_ID 0x83:
- ReadObjectId; if local player, MsgId_83_LocalPlayerGate, else MsgId_83_Handler.

MSG_ID 0x84:
- ReadObjectId, then u8; writes into Msg2_75_Sub0 entry (+724).

MSG_ID 0x85:
- f32 (Msg_ReadFloat) -> MsgId_85_Handler (sets next‑time gate).

MSG_ID 0x86:
- no payload; closes specific windows (ids 88/89/90) if open.

MSG_ID 0x88:
- u32 id; closes window 31/30 if matching id.

MSG_ID 0x8C:
- ReadObjectId, then u8; writes into Msg2_75_Sub0 entry (+725).

MSG_ID 0x8E:
- u16 code; MsgId_8E_Handler(this, code, 1) (UI/state reset + optional message).

MSG_ID 0x8F:
- vec3 + vec4(128‑bit) → transforms → MsgId_8F_Handler(7 floats).

MSG_ID 0x9A:
- ReadObjectId, then u8; writes into Msg2_75_Sub0 entry (+726).

MSG_ID 0x9B:
- u32 id, u16 subtype, u16 unused; closes window(s) based on subtype 510/511/512/515/516.

MSG_ID 0x9D:
- ReadObjectId, then 1‑bit flag; writes into Msg2_75_Sub0 entry (+727).

### CrosshairMgr_OnMessage flag map (MSG_ID 0x6E)
Flags are read as a single u32 and drive icon selection + text parsing:
- 0x00002000: add secondary icon (uses InterfaceMgr slot +24).
- 0x00020000: icon variant A (uses InterfaceMgr slot +48).
- 0x00240000: icon variant B (uses InterfaceMgr slot +40). **Mask test** includes 0x200000; handled before title parsing.
- 0x00100000: title string uses format 13008/13007 with numeric param (u32) → text buffer.
- 0x00880000: icon variant C (uses InterfaceMgr slot +44) when 0x100000 is **not** set.
- 0x00200000: has title string + timer: reads u32 stringId + 256‑byte string + u8 seconds; creates primary text line w/ optional “(Ns)” suffix; if stringId != 0, adds title line from id+14000.
- 0x00800000: special tagged title parse. If title starts with “_T*…”, strips between `*` markers and may force icon variant A + red/green color logic. Also toggles hostile color when no timer.
- 0x00080000: action text uses LT string 6002 (else 6000/6061).
- 0x00400000: action text uses LT string 6061 with extra param (else 6000/6002).

Inline stream flags (not part of xhairFlags):
- u8 == 1 → read two extra 256‑byte strings (lines 2 & 3).
- bit (1) → attach icon slot +32 (if set).
- bit (1) → attach icon slot +20 (if set).
- bit (1) → prepend formatted LT string 13013 using the current name buffer.
- u8 color code(s) → Color_GetARGBHexByCode for bracketed tag lines.

### Crosshair / recoil linkage (CShell)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10056350 | 0x00056350 | CrosshairMgr_Update | Updates EncVar float #7 (crosshair spread) using base + scaled recoil: `spread = base + (g_pGameClientShell->recoilScale) * 100/5`; uses CrosshairMgr fields (spreadLastTime/targetMode/lastTargetMode/targetModeIsSpecial) to gate fire; sends Packet_ID_B0 subId 8/5 when spread >= 100 and input not held | decomp | low |

### Code (client init + module loading)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x0044C380 | 0x0004C380 | ClientEntry | CEF/bootstrap + single-instance mutex; calls RunClient | decomp + xrefs | high |

| 0x0044BC80 | 0x0004BC80 | RunClient | Main loop + launcher gate (requires dpsmagic); sets CWD; calls InitEngineAndLoadLtmsg | decomp + strings | high |

| 0x0044B580 | 0x0004B580 | ParseCmdLine | Parses command line; expands -cmdfile; builds arg table | decomp | med |

| 0x0044AA60 | 0x0004AA60 | InitClientFromCmdLine | Parses -rez list, workingdir/config/display, +sounddll; calls resource init | decomp + strings | high |

| 0x00450000 | 0x00050000 | InitEngineAndLoadLtmsg | CoInitialize + core init; LoadLibraryA(\"ltmsg.dll\") | decomp | high |

| 0x004B8390 | 0x000B8390 | InitMasterConnection | Init connection to master server (default fom1.fomportal.com); validates install | decomp + strings | high |

| 0x00499960 | 0x00099960 | ClientNetworking_Init | Loads fom_public.key (68 bytes: exp=0x00010001 + 64-byte modulus); creates RakPeer master/world; sets MTU 0x578 | decomp + file inspection | high |

| 0x0043E660 | 0x0003E660 | UDP_BuildSockaddrFromString | Builds local sockaddr; uses BindIP override or gethostname/gethostbyname | decomp + strings | high |

| 0x00446180 | 0x00046180 | CUDPDriver_StartQuery | Binds UDP socket for queries; retries ports; uses BindIP override | decomp + strings | high |

| 0x00449B70 | 0x00049B70 | CUDPDriver_HostSession | Binds UDP socket for hosting; default port 0x6CF0 (27888) | decomp + strings | high |

| 0x0045F930 | 0x0005F930 | LoadLibraryA_ShowError | Wrapper: LoadLibraryA + GetLastError + FormatMessage + MessageBox | decomp + strings | high |

| 0x0044A8E0 | 0x0004A8E0 | LoadClientModule | Loads client module, optional SetMasterDatabase export, then init interface | decomp + xrefs | high |

| 0x0044F6C0 | 0x0004F6C0 | CopyRezFileToTemp | Extracts rez-contained file to temp path; returns temp file path + flag | decomp | med |

| 0x00450410 | 0x00050410 | InitClientShellDE | Loads cshell.dll + cres.dll via CopyRezFileToTemp/LoadClientModule; error handling for missing/invalid | decomp + strings | high |



### Code (networking / master-world)
| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x0043DEE0 | 0x0003DEE0 | UDP_ParseHostString_DefaultPort | Parses "host[:port]" -> sockaddr; if no :port uses 0x6CF0 (27888) | decomp | high |

| 0x0043E0E0 | 0x0003E0E0 | UDP_SelectClientPortFromRange | Chooses bind port from IPClientPort/IPClientPortRange/IPClientPortMRU; randomizes when MRU=0 | decomp | med |

| 0x0043E090 | 0x0003E090 | UDP_UpdateClientPortMRU | Writes MRU port string to IPClientPortMRU cvar | decomp | med |

| 0x00449F20 | 0x00049F20 | CUDPDriver_OpenSocket | Binds client UDP socket to selected port; retries within range | decomp | high |

| 0x00442BD0 | 0x00042BD0 | UDP_SendMasterPacket | Builds packet w/ magic 0x9919D9C7 and sends to parsed host/port | decomp | med |

| 0x00447C20 | 0x00047C20 | CUDPDriver_SendPacketWithRetry | Wraps UDP_SendMasterPacket with retry list + msg id | decomp | med |

| 0x0049AB70 | 0x0009AB70 | World_Connect | Logs "Try connecting to world server at {0}:{1}"; calls RakPeer::Connect with password "37eG87Ph" | decomp + strings | high |

| 0x0049AD60 | 0x0009AD60 | CloseMasterConnection | Logs + closes master; resets addr/port to defaults | decomp + strings | med |

| 0x0049AE30 | 0x0009AE30 | CloseWorldConnection | Logs + closes world; resets addr/port to defaults | decomp + strings | med |

| 0x0049AF40 | 0x0009AF40 | SendPacket_LogMasterWorld | Logs "Sent packet {0} to Master/World" | decomp + strings | med |

| 0x0049B990 | 0x0009B990 | Networking_Reset | Resets networking state; clears master/world endpoints | decomp | med |

### ClientFileMgr / File Transfer (fom_client.exe)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x008E3E50 | 0x004E3E50 | ClientFileMgr_Init | Initializes file trees, server file buckets (100), identifier buckets (200), alloc pools | disasm + LithTech source | high |
| 0x008E3EE0 | 0x004E3EE0 | ClientFileMgr_Term | Frees file trees + identifiers, clears buckets | disasm + LithTech source | high |
| 0x008E3720 | 0x004E3720 | ClientFileMgr_OnConnect | Opens cache tree (c:\\de_cache), inits FT client, ties off server file lists | disasm + LithTech source | high |
| 0x008E3F50 | 0x004E3F50 | ClientFileMgr_OnDisconnect | Frees server file list + cache tree + FT client | disasm + LithTech source | high |
| 0x008E3700 | 0x004E3700 | ClientFileMgr_ProcessPacket | Forwards to FTClient_ProcessPacket (ftc_ProcessPacket) | disasm | high |
| 0x009784B0 | 0x000F84B0 | FTClient_ProcessPacket | Parses FT msgId 0x32: (u16 fileId, u32 size, cstr filename)*, calls OnNewFile; replies msgId 0x36 with u16 fileIds (bit15 set if needed) | disasm | high |
| 0x008E3630 | 0x004E3630 | ClientFileMgr_FindInFileTrees | Finds filename in resource trees via df_GetFileInfo | disasm + LithTech source | med |
| 0x008E38A0 | 0x004E38A0 | ClientFileMgr_FindFileIdentifierByName | Hashes normalized filename (weighted sum mod 200) and finds matching FileIdentifier | disasm + LithTech source | high |
| 0x008E41E0 | 0x004E41E0 | ClientFileMgr_GetFileIdentifier | Gets/creates FileIdentifier; local files set FileID=0xFFFF | disasm + LithTech source | high |
| 0x008E4470 | 0x004E4470 | ClientFileMgr_OnNewFile | Server-supplied fileID creates ServerFile entry; fileID mod 100 bucket; assigns FileID | disasm + LithTech source | high |
### World loading (fom_client.exe)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x004130F0 | 0x000130F0 | ClientShell_DoLoadWorld | Reads SMSG_LOADWORLD payload (float gameTime + u16 worldId), resets world state, loads world file; logs “Entering world %s” | decomp + strings | high |

| 0x004CB4B0 | 0x000CB4B0 | CServerMgr_DoStartWorld_fom_client | Normalizes world filename (.dat) then loads via world mgr; logs "Loading world: %s" | decomp + "%s.dat" string | high |

| 0x004D4990 | 0x000D4990 | Cmd_StartWorld_fom_client | Command handler that forwards to CServerMgr_DoStartWorld_fom_client | decomp | med |



### Code (socket wrappers / RakNet)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x004E5BA0 | 0x000E5BA0 | Net_RecvFrom | recvfrom wrapper; builds sockaddr, calls __imp_recvfrom | disasm + xrefs | high |

| 0x004E5E30 | 0x000E5E30 | Net_SendTo | sendto wrapper; builds sockaddr, calls __imp_sendto | disasm + xrefs | high |

| 0x005230F0 | 0x001230F0 | Net_Send | send wrapper; calls __imp_send | disasm + xrefs | med |

| 0x00523120 | 0x00123120 | Net_Recv | recv wrapper; calls __imp_recv | disasm + xrefs | med |

| 0x004F4520 | 0x000F4520 | Net_RecvFrom_Caller | upstream caller of Net_RecvFrom | xrefs | med |

| 0x004E5E90 | 0x000E5E90 | Net_SendTo_Caller | upstream caller of Net_SendTo | xrefs | low |

| 0x00522560 | 0x00122560 | Net_SendRecv_Caller | upstream caller of Net_Send/Recv wrappers | xrefs | med |



### Data (network config globals + constants)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x007362F4 | 0x003362F4 | g_MasterServerHost | CVar "MasterServer"; if null/empty defaults to fom1.fomportal.com | decomp + strings | high |

| 0x006BA4A8 | 0x002BA4A8 | s_DefaultMasterServer | "fom1.fomportal.com" | .rdata string | high |

| 0x007362EC | 0x003362EC | g_BindIP | CVar “BindIP”; overrides local bind address for UDP sockets | decomp + strings | high |

| 0x007362F0 | 0x003362F0 | g_IPOverride | CVar “IP”; overrides local IP string in UDP_BuildSockaddrFromString | decomp + strings | high |

| 0x006B9D18 | 0x002B9D18 | s_CVar_MasterServer | CVar name string "MasterServer" | .rdata string | high |

| 0x006B9D24 | 0x002B9D24 | s_CVar_IP | CVar name string "IP" | .rdata string | high |

| 0x006B9D28 | 0x002B9D28 | s_CVar_BindIP | CVar name string "BindIP" | .rdata string | high |

| 0x0071A528 | 0x0031A528 | g_QueryPortRange | Port-try count/range for CUDPDriver_StartQuery (retry loop) | decomp | med |

| 0x007363CC | 0x003363CC | g_QueryPortBase | Base port used when retrying StartQuery binds | decomp | med |

| 0x007363D0 | 0x003363D0 | g_QueryPortMRU | Last-used port for StartQuery (MRU cycling) | decomp | med |

| 0x006B31C0 | 0x002B31C0 | s_LauncherMagic | String "dpsmagic" used by RunClient launcher gate | .rdata string + decomp | high |

| 0x006B9724 | 0x002B9724 | s_CVar_IPClientPortMRU | CVar name "IPClientPortMRU" | .rdata string | med |

| 0x006B9734 | 0x002B9734 | s_CVar_IPClientPortRange | CVar name "IPClientPortRange" | .rdata string | med |

| 0x006B9748 | 0x002B9748 | s_CVar_IPClientPort | CVar name "IPClientPort" | .rdata string | med |

| 0x00712954 | 0x00312954 | s_IPClientPortMRU | Duplicate string used by UDP_UpdateClientPortMRU | decomp + hexdump | low |

| 0x006B9224 | 0x002B9224 | s_WorldPassword | "37eG87Ph" world password used in World_Connect | .rdata string + decomp | high |



### Code/Data (LithTech message handlers)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x00427480 | 0x00027480 | Init_MessageHandlers | Initializes g_MessageHandlers table | decomp | high |

| 0x0072AB88 | 0x0032AB88 | g_MessageHandlers | Message handler function table (msg id * 4) | decomp + xrefs | high |

| 0x00424EF0 | 0x00024EF0 | LithTech_HandleIDPacket | Msg ID 12 handler; reads u16 id + u8 flag; logs "Got ID packet (%d)" | decomp + string | high |

| 0x00426C00 | 0x00026C00 | LithTech_OnMessageGroupPacket | Msg ID 14 handler; iterates sub-messages; logs "invalid packet" on overflow | decomp + string | high |



### Message handlers (IDs 4..23)

| ID | VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|---|

| 4 | 0x00425060 | 0x00025060 | OnNetProtocolVersionPacket | Validates protocol version; logs LT_INVALIDNETVERSION on mismatch | decomp + string | high |

| 5 | 0x00424F40 | 0x00024F40 | OnUnloadWorldPacket | Clears client object id; unloads world | decomp + External/LithTech shellnet.cpp | med |

| 6 | 0x004266C0 | 0x000266C0 | OnLoadWorldPacket | Clears client object id; calls ClientShell_DoLoadWorld; sends MSG_ID 0x09 connect stage=0 | decomp + External/LithTech shellnet.cpp | med |

| 7 | 0x00425040 | 0x00025040 | OnClientObjectID | Reads u16 client object id | decomp + External/LithTech shellnet.cpp | high |

| 8 | 0x00426DF0 | 0x00026DF0 | OnUpdatePacket | Parses update entries; validates length; logs LT_INVALIDSERVERPACKET on error | decomp + string | high |

| 9 | 0x00000000 | 0x00000000 | NULL | No handler assigned | Init_MessageHandlers | high |

| 10 | 0x004260D0 | 0x000260D0 | OnUnguaranteedUpdatePacket | Per-object unguaranteed update (pos/rot/animinfo); uses UUF flags | decomp + External/LithTech shellnet.cpp | med |

| 11 | 0x00000000 | 0x00000000 | NULL | No handler assigned | Init_MessageHandlers | high |

| 12 | 0x00424EF0 | 0x00024EF0 | OnYourIDPacket | Reads u16 client id + u8 local flag; logs "Got ID packet (%d)" | decomp + string | high |

| 13 | 0x00426F50 | 0x00026F50 | OnMessagePacket | Wraps CSubMsg_Client and calls client shell OnMessage | decomp + External/LithTech shellnet.cpp | med |

| 14 | 0x00426C00 | 0x00026C00 | OnMessageGroupPacket | SMSG_PACKETGROUP: u8 **bit-length** + subpacket; length includes inner SMSG id bits; dispatched via g_MessageHandlers | decomp + string | high |

| 15 | 0x00426FC0 | 0x00026FC0 | OnConsoleVar | Reads var name + value strings (two reads) then applies via sub_974C90(dword_BF94C8+1184, name, value) | decomp | high |
| 16 | 0x00426360 | 0x00026360 | OnSkyDef | Reads 0x180 bits into sky data, then u16 count<=0x1E and u16 sky object IDs into dword_BF94C8+2444; invalid -> LT_ERROR | decomp + string | high |
| 17 | 0x00427050 | 0x00027050 | OnInstantSpecialEffect | MessagePacket_Parse + IClientShell_Default vtbl+0x64 (SpecialEffectNotify) | decomp | med |
| 18 | 0x00000000 | 0x00000000 | NULL | No handler assigned | Init_MessageHandlers | high |

| 19 | 0x004270D0 | 0x000270D0 | OnPreloadListPacket | subtype u8: 0/1 start/end, 2 model, 3 texture?, 4 sprite, 5 sound, 6 cached model; loads via rez managers, logs "model-rez: client preload ..." | decomp + strings | high |
| 20 | 0x004250F0 | 0x000250F0 | OnThreadLoadPacket | Reads u16 fileId; loads via sub_8EA5A0 (resource type=3) | decomp | med |
| 21 | 0x00425130 | 0x00025130 | OnUnloadPacket | Reads fileType(u8)+fileId(u16): type0 unload cached model via g_ModelRezMap; type2 unloads resource via dword_BFAF8C; else invalid | decomp + strings | med |
| 22 | 0x00425820 | 0x00025820 | OnGlobalLight | Reads 2x vec3 + ambient float (3x32 each) then calls dword_BFAB80 vtbl+0x130/+0x138/+0x140 | decomp | high |
| 23 | 0x00425230 | 0x00025230 | OnChangeChildModel | Reads parent/child model file IDs; resolves via g_ModelRezMap; logs missing object/model; applies via sub_93D8E0 | decomp + strings | high |


### Update sub-handlers (SMSG_UPDATE)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x00425ED0 | 0x00025ED0 | UpdateHandle_Group0 | Group 0: u16 blockId + u8 flags; optional u16+u8 scale fields; optional byte (flag 0x40); optional time-scale (sign bit); optional vec3 from packet or client object pos; ends with u32 + World_ApplyUpdateBlock | decomp | med |

| 0x004256B0 | 0x000256B0 | UpdateHandle_Group1 | Group 1: flags 0x1 spawn/refresh (Update_ReadBlock0_Alloc), 0x2 pos vec3 apply, 0x20 Object_HandleGroup1_Flag20; calls World_ApplyUpdateBlock when spawn set | decomp | med |

| 0x004267C0 | 0x000267C0 | UpdateHandle_GroupObjUpdate | Per-object update/spawn: if flags&1 reads obj-def (Update_ReadBlock_ObjectDef) + World_AddObjectFromUpdate, then Update_ValidateObject; if flags&1 and not local player, builds ObjectMsg packet and calls IClientShell_Default vtbl+0x64; if flags&0x800 calls vtbl+0x14 | decomp | med |
| 0x00424F60 | 0x00024F60 | UpdateHandle_Group3 | Group 3: remove object(s) by id; if obj flag 0x40 -> Object_HandlePendingRemoval; else World_RemoveObject/ObjectInstance_OnRemoved | decomp | low |



### Message layouts (source-aligned, FoM)

- ID 4 (SMSG_NETPROTOCOLVERSION): u32 version; u32 server bandwidth.

- ID 5 (SMSG_UNLOADWORLD): no payload.

- ID 6 (SMSG_LOADWORLD): ClientShell_DoLoadWorld(cPacket,false) (payload: float game time + u16 world file id).

- ID 7 (SMSG_CLIENTOBJECTID): u16 client object id.

- ID 8 (SMSG_UPDATE): loop: u32 **bitlen**; read updateFlags lo8; if (lo8 & 0x80) read hi8 and combine => u16 updateFlags.

  - if updateFlags != 0: read u16 objectId + UpdateHandle_GroupObjUpdate(objectId, updateFlags)

  - else: read groupTag u8: 0->UpdateHandle_Group0, 1->UpdateHandle_Group1 (then u8 flags + u16 id), 3->UpdateHandle_Group3

  - validates: endBit == startBit + bitlen; mismatch returns LT_INVALIDSERVERPACKET (44).

  - client validates consumed bits == bitlen; mismatch => LT_INVALIDSERVERPACKET (44)

  - CF_* flags (Update_ValidateObject): NEWOBJECT=0x1, POSITION=0x2, ROTATION=0x4, FLAGS=0x8, SCALE=0x10,

    MODELINFO=0x2020, RENDERINFO=0x40, ATTACHMENTS=0x100, FILENAMES=0x800, DIMS=0x8000

- ID 10 (SMSG_UNGUARANTEEDUPDATE): loop: u16 objectId; u4 flags; if objectId==0xFFFF then read float gameTime and end.
  - flags: 0x4 position (vec3) + optional vel bit + compressed vec3, 0x8 alt rotation (sub_97BFC0), 0x2 compressed quat, 0x1 modelinfo.
  - apply: Object_ApplyPosVel (pos+vel) + Object_ApplyRotationQuat (rot) + Update_ReadModelInfoBlock (anim/model info).


### Update helpers (fom_client.exe)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x00419970 | 0x00019970 | ObjectList_FindById | Lookup world object entry by id | decomp | med |

| 0x00419940 | 0x00019940 | ObjectList_GetHandleById | Fast handle lookup by object id (active entries only) | decomp | low |

| 0x00419910 | 0x00019910 | ObjectList_ClearById | Clears object list entry by id (active=0) | decomp | low |

| 0x00410B20 | 0x00010B20 | World_RemoveObject | Remove object by handle | decomp | low |

| 0x004C7A80 | 0x000C7A80 | Object_GetInstance | Resolve object instance | decomp | low |

| 0x004C9690 | 0x000C9690 | ObjectInstance_OnRemoved | Instance removal handler | decomp | low |

| 0x0040D350 | 0x0000D350 | World_ApplyUpdateBlock | Apply UpdateBlock to world | decomp | med |

| 0x0041F750 | 0x0001F750 | Msg_ReadVector3f | Read vec3 from packet | decomp | low |

| 0x004254F0 | 0x000254F0 | Update_ReadBlock0_Alloc | Group1: alloc/read update block | decomp | low |

| 0x004258F0 | 0x000258F0 | Update_ValidateObject | GroupObjUpdate: applies CF_* flags (pos/rot/scale/render/model/attachments/dims) | decomp | low |

| 0x004249A0 | 0x000249A0 | Update_LogChangeFlags | Debug log of CF_* flags (NEWOBJECT/POS/ROT/FLAGS/SCALE/MODELINFO/RENDERINFO/ATTACHMENTS/FILENAMES/DIMS) | decomp | low |

| 0x00424D70 | 0x00024D70 | Update_ReadFileIds | CF_FILENAMES: reads model/skin/attach file-id lists into UpdateBlock | decomp | low |
| 0x008E36C0 | 0x004E36C0 | ClientFileMgr_FindFileIdentifierById | Hash-bucket lookup (100 buckets) for u16 fileId -> FileIdentifier* (id @ +0x10, name ptr @ +0x1C) | disasm | med |
| 0x008E3820 | 0x004E3820 | ClientFileMgr_GetFilenameFromFileRef | FileRef->filename; if type==2 resolves fileId via ClientFileMgr_FindFileIdentifierById, else returns direct name ptr | disasm + xrefs | med |
| 0x00424B60 | 0x00024B60 | Update_ReadModelInfo | CF_MODELINFO: bitpacked list; per-entry applyChange flag, modelId (8 or 14 bits + useHighbits), local flag, lenSelector (1/6/10/32 bits) -> scaled value, optional key/extraVal, optional scale (float); applies via ModelInfo_ApplyChange then Update_ApplyModelInfo | decomp | low |
| 0x00424B10 | 0x00024B10 | Update_ApplyModelInfo | Finalizes model info updates for object | decomp | low |

| 0x00424910 | 0x00024910 | ModelInfo_ApplyChange | Applies model/skin change (flags + anim) | decomp | low |

| 0x00423490 | 0x00023490 | Object_ApplyPosVel | Applies position + velocity update, queues object for update list | decomp | low |

| 0x00423360 | 0x00023360 | Object_ApplyRotationQuat | Applies rotation quaternion update (w/ list logic) | decomp | low |

| 0x00424670 | 0x00024670 | Object_SetDimsFromVec3 | CF_DIMS: sets dims vec + radius | decomp | low |

| 0x00424880 | 0x00024880 | Object_ClearAttachments | Clears attachment list before CF_ATTACHMENTS parse | decomp | low |

| 0x004BA4E0 | 0x000BA4E0 | Object_AddAttachment | Parses/queues attachment entry for object | decomp | low |

| 0x004C56B0 | 0x000C56B0 | Object_HandlePendingRemoval | Clears pending removal id (flagged 0x40) | decomp | low |

| 0x004C5D90 | 0x000C5D90 | Object_HandleGroup1_Flag20 | Group1 flag 0x20: updates object state via engine callbacks | decomp | low |

| 0x0043CE10 | 0x0003CE10 | Packet_ReadBits_Clamp32 | Reads up to 32 bits (discard extra) | decomp | low |

| 0x0043CE60 | 0x0003CE60 | Packet_ReadBitsToBuffer | Reads N bits into buffer | decomp | low |

| 0x004ABE50 | 0x000ABE50 | Packet_ReadCompressedQuat | Reads compressed quaternion bytes (3/6 bytes) | decomp | low |

| 0x004ABF60 | 0x000ABF60 | Packet_ReadCompressedVec3 | Reads compressed vec3 (32/16/16/8 bits) | decomp | low |

| 0x00425490 | 0x00025490 | Packet_ReadVec3f32 | Reads 3x float32 into dst | decomp | low |

| 0x004264E0 | 0x000264E0 | Update_ReadBlock_ObjectDef | GroupObjUpdate: parse object def | decomp | low |

| 0x0040DDB0 | 0x0000DDB0 | World_AddObjectFromUpdate | Spawn object from update stream | decomp | low |

| 0x00412BF0 | 0x00012BF0 | UpdateBlock_Free | Free update block | decomp | low |

| 0x00424810 | 0x00024810 | Update_IsLocalPlayer | Local player check for update | decomp | low |

| 0x0040C510 | 0x0000C510 | BuildObjectMsgPacket | Build object msg packet (for IClientShell notify) | decomp | low |

| 0x00404CA0 | 0x00004CA0 | ObjectMsg_Free | Free object msg packet | decomp | low |

| 0x00404F50 | 0x00004F50 | UpdateBlock_Init | Init update block | decomp | low |

| 0x004127F0 | 0x000127F0 | UpdateBlock_Clear | Clear update block | decomp | low |

| 0x00412500 | 0x00012500 | UpdateBlock_GetOrAlloc | Get or alloc update block | decomp | low |

| 0x00412C60 | 0x00012C60 | PacketView_Init | Init packet view/slice | decomp | low |

| 0x00412C30 | 0x00012C30 | PacketView_Advance | Advance packet view cursor | decomp | low |

| 0x0043CD50 | 0x0003CD50 | Packet_ReadBits | Bit reader used by update parsing | decomp | high |

- ID 12 (SMSG_YOURID): u16 client id; u8 bLocal.

- ID 13 (SMSG_MESSAGE): message data (CSubMsg_Client).

- ID 14 (SMSG_PACKETGROUP): repeated u8 **bit-length** + subpacket (u8 id + payload), terminator len=0.

- ID 15 (SMSG_CONSOLEVAR): string var name + string value.

- ID 16 (SMSG_SKYDEF): SkyDef struct + u16 count (<=0x1E) + count*u16 object IDs.

- ID 17 (SMSG_INSTANTSPECIALEFFECT): message data.

- ID 19 (SMSG_PRELOADLIST): u8 type (0..6); for model/texture/sprite/sound lists: repeated u16 file id until EOP.

- ID 20 (SMSG_THREADLOAD): u16 file id (FT_TEXTURE in FoM).

- ID 21 (SMSG_UNLOAD): u8 fileType + u16 file id.

- ID 22 (SMSG_GLOBALLIGHT): LTVector dir + LTVector color + float ambient convert.

- ID 23 (SMSG_CHANGE_CHILDMODEL): u16 parent file id + u16 child file id.



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



## RakNet security / public key flow (FoM)

- 0x004F1610 `HandleSecureConnResponse_SetSessionKey` (was sub_F71610) - processes ID 0x05 secured connection response; writes 16-byte session key at peer+0x1408, sets security flag at peer+0x1418, sends confirmation.

- 0x004EF8E0 `HandleSecureConnConfirm` (was sub_F6F8E0) - handles ID 0x06 secured connection confirmation (size 85); validates nonce/cookie, sets connectMode=5 (HANDLING_CONNECTION_REQUEST), then clears/sets security via PeerSetSecurityFlag.

- 0x004EFC10 `PeerSetSecurityFlag` (was sub_F6FC10) - sets byte at peer+0x1418 (encryption enabled); when enabling, copies AES key to peer+0x1408 and sets connectMode=7.

- 0x004EFF90 `PeerClearSecurityFlag` (was sub_F6FF90) - clears byte at peer+0x1418 on teardown.

- 0x004F4520 `RakPeer_RecvDispatch` (was sub_F74520) - main recv loop; reads peer+0x1418 at 0x004F644C to gate encrypted path; dispatches ID 0x05->HandleSecureConnResponse_SetSessionKey, ID 0x06->HandleSecureConnConfirm, ID 0x11 (likely NEW_INCOMING_CONNECTION per RakNet 3.611), ID 0x14 reliability/timeouts, ID 0x13/0x17 connection drops, ID 0x05/0x06 security.

- 0x004F41B0 `RakNet_DecryptEntry` (was sub_F741B0) - recv path decrypt wrapper before BitStream parse; called from recvfrom wrapper sub_F65BA0.

- 0x00411370 `RakPeer_GenerateSYNCookieRandomNumber` (was sub_F71370) - rotates syn-cookie randoms; sets expiration time (GetTime + 10000).

- 0x004113C0 `ReliabilityLayer_SetEncryptionKey` (IDA: RakNet_SetEncryptionKey, was sub_F913C0) - wraps DataBlockEncryptor set/unset; called from RecvDispatch and PeerClearSecurityFlag.

- 0x0041EFA0 `DataBlockEncryptor_SetKey` (IDA: RakNet_AESWrapper, was sub_F9EFA0) - makes encrypt/decrypt keys + cipher init; sets keySet flag.

- 0x0051EF80 `DataBlockEncryptor_IsKeySet` (was sub_F9EF80) - returns keySet flag (byte @ +0x258).

- 0x0051F220 `DataBlockEncryptor_Decrypt` (was sub_F9F220) - decrypts packet in-place; validates checksum; returns 0 on failure.

- 0x00511A00 `ReliabilityLayer_HandleSocketReceiveFromConnectedPlayer` (was sub_F91A00) - decrypts (if key set) then parses reliability/acks; sets stats.

- 0x0041F000 `DataBlockEncryptor_UnsetKey` (was sub_F9F000) - clears keySet flag.

- 0x005ABDE0 `RakNet_AES_Process` (was sub_FABDE0) - AES encrypt/decrypt wrapper around S-box core.

- 0x005AADE0 `RakNet_AES_Core` (was sub_FAADE0) - AES block core using S-box at 0x071E118 (IDA 0x119E118).



Packet ID notes (client side):

- 0x05 Secured Connection Response (RSA payload, carries server part used to derive session key).

- 0x06 Secured Connection Confirmation (size 85; cookie + RSA(random)).

- 0x11 NEW_INCOMING_CONNECTION in RakNet 3.611; **0x19 timestamp header is confirmed in FoM** (client reads u64 timestamp via BitStream::Read 64 bits, then msg id).

- StringCompressor/Huffman confirmed in FoM:

  - `sub_F63A10` (VA 0x00F63A10) write Huffman string

  - `sub_F63B30` (VA 0x00F63B30) read Huffman string

  - `sub_F1A420` (VA 0x00F1A420) write **compressed u32 length** for StringCompressor (RakNet WriteCompressed; endian swap if `sub_F63620()` true)

  - `sub_F1C280` (VA 0x00F1C280) read **compressed u32 length** for StringCompressor (RakNet ReadCompressed; endian swap if `sub_F63620()` true)

  - `RakNet_BitStream_WriteCompressed` (VA 0x00F62D10, was `sub_F62D10`) core WriteCompressed (byte prefix bits + 4‑bit/8‑bit tail)

  - `RakNet_BitStream_ReadCompressed` (VA 0x00F62FA0, was `sub_F62FA0`) core ReadCompressed (byte prefix bits + 4‑bit/8‑bit tail)

  - `unk_119D6A0` (VA 0x0119D6A0) englishCharacterFrequencies table (256 * u32)

  - `dword_11B8064` (VA 0x011B8064) runtime StringCompressor pointer



Peer offsets (RemoteSystemStruct, FoM):

- AESKey @ +0x1408 (16 bytes), security flag @ +0x1418 (byte), connectMode @ +0x144C.

- connectMode enum values (RakNet 3.611): 4=REQUESTED_CONNECTION, 5=HANDLING_CONNECTION_REQUEST, 7=SET_ENCRYPTION_ON_MULTIPLE_16_BYTE_PACKET, 8=CONNECTED.



RecvDispatch connectMode + plaintext taps (FoM):

- 0x004F6446 reads peer+0x1418; if set, 0x004F646C calls RakNet_SetEncryptionKey(peer+0x1408); if clear, 0x004F647E clears the key.

- HandleSecureConnResponse_SetSessionKey (ID 0x05): key mismatch sets connectMode=2 at 0x004F17E8; otherwise leaves connectMode=4 and sets security flag.

- HandleSecureConnConfirm (ID 0x06): valid cookie sets connectMode=5 at 0x004EFA98; invalid cookie sets connectMode=2 at 0x004EFBD4.

- PeerSetSecurityFlag enable=1 sets connectMode=7 at 0x004EFC52 (SET_ENCRYPTION_ON_MULTIPLE_16_BYTE_PACKET).

- RecvDispatch ID 0x0E (ID_CONNECTION_REQUEST_ACCEPTED): 0x004F6419 sets connectMode=8 (CONNECTED).

- RecvDispatch ID 0x11 (ID_NEW_INCOMING_CONNECTION): 0x004F590C checks msg id; if connectMode in {4,5,7} then 0x004F5959 sets connectMode=8 (CONNECTED) and calls sub_F71A10 (PingInternal).

- RecvDispatch ID 0x13 (ID_DISCONNECTION_NOTIFICATION): 0x004F5EF2 sets connectMode=3 (DISCONNECT_ON_NO_ACK).

- RecvDispatch user notifications (queued via sub_F77090): 0x004F532F allocs packet; if connectMode==4 writes ID 0x0F at 0x004F5361 (CONNECTION_ATTEMPT_FAILED), if connectMode==8 writes ID 0x14 at 0x004F537E (CONNECTION_LOST), else writes ID 0x13 at 0x004F538C (DISCONNECTION_NOTIFICATION); queued at 0x004F53DC.

- RecvDispatch early failure: 0x004F2C01 writes ID 0x0F (CONNECTION_ATTEMPT_FAILED) with systemIndex=0xFFFF and queues via sub_F77090 at 0x004F2C3B.

- Plaintext tap #1 (test decrypt): RakNet_DecryptEntry 0x004F42BF calls DataBlockEncryptor_Decrypt; on success 0x004F42DB calls RakNet_SetEncryptionKey(peer+0x1408).

- Plaintext tap #2 (main recv): ReliabilityLayer_HandleSocketReceiveFromConnectedPlayer 0x00511A7B calls DataBlockEncryptor_Decrypt; plaintext is live after success.



### Code (login request / Packet_Id107 build)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x101C1072 | 0x001C1072 | Login_OnSubmit | Login UI submit handler; reads user/pass fields and queues updates | decomp (user) | high |

| 0x10008110 | 0x00008110 | Ui_ReadFieldTextById | Reads UI field text by ID into buffer (lpBaseAddress + 4*id) | decomp (user) | med |

| 0x10108F70 | 0x00108F70 | LoginField_QueueUpdate | Stores field ids/values into login window object + triggers apply/send | decomp (user) | med |

| 0x101055C0 | 0x001055C0 | LoginField_ApplyString | Resolves string via engine interface; sets UI text + flags | decomp (user) | med |

| 0x10077540 | 0x00077540 | UiText_SetValueIfChanged | Copies new string, triggers validation/callbacks | decomp (user) | low |

| 0x101C04B0 | 0x001C04B0 | Login_SendRequest_Throttled | Builds Packet_Id107 and calls LTClient_SendPacket_BuildIfNeeded | decomp (user) | med |

| 0x1000C7E0 | 0x0000C7E0 | Packet_Id107_Init | Initializes packet object; sets msg id byte = 107 | decomp (user) | med |

| 0x1000C770 | 0x0000C770 | Packet_WriteHeader | Initializes bitstream; writes optional header byte 0x19 + 64-bit token; writes msg id byte | decomp (user) | med |

| 0x1000D9D0 | 0x0000D9D0 | Packet_Id107_Serialize | Builds bitstream; writes flags + optional ints + 2x2048-bit blocks | decomp (user) | med |

| 0x1000D8B0 | 0x0000D8B0 | Packet_Id107_Read | Reads bitstream; mirrors serialize + 2x2048-bit blocks | decomp (user) | med |

| 0x1000D650 | 0x0000D650 | Playerfile_BlockC0_WriteEntry | Writes one entry in Playerfile blockC0 (bitflag + u16c + 5x u8c + bitfields) | decomp (user) | low |

| 0x1000CBF0 | 0x0000CBF0 | BitStream_WriteU16C | Writes u16 compressed to bitstream | inferred from usage | low |

| 0x1000C870 | 0x0000C870 | BitStream_Write2048 | Wrapper: g_LTClient vtbl+0x34 (write 2048 bits) | decomp (user) | low |

| 0x1000C8A5 | 0x0000C8A5 | BitStream_Read2048 | Wrapper: g_LTClient vtbl+0x38 (read 2048 bits) | decomp (user) | low |

| 0x1000CB60 | 0x0000CB60 | Packet_Id107_Vtbl0 | Vtable slot +0x00 (unknown role) | vtable xref | low |

| 0x100065D9 | 0x000065D9 | Registry_SetUsernameValue | Writes registry value "username" (persistence) | decomp (user) | low |

| 0x1008A0C0 | 0x0008A0C0 | LoginToken_Process | Reads LoginToken + passes to engine (pre-login flow) | decomp (user) | low |

| 0x102A64A0 | 0x002A64A0 | Ensure_BitstreamTables_Init | Wrapper; calls Init_BitstreamTables once | xrefs | low |

| 0x10272AD0 | 0x00272AD0 | Init_BitstreamTables | Initializes large bit/lookup tables (0x102FE000+) | disasm (user) | low |



#### Packet_Id107 bitstream construction (observed)

- Packet_Id107_Serialize writes a series of presence bits for 4 optional fields: +1076, +1080, +1084, +1088; if present it writes the value (u32 for last two; compressed for first two).

- Two fixed 2048-bit blocks are appended from packet offsets +1216 and +1344 via g_LTClient vtbl+0x34 (size=2048 bits).

- If word at +1072 == 325, an extra block is emitted via sub_1000D800(this+1092, this+12).

- Packet_Id107_Read mirrors the serialize path: reads u16c into +1072, then 4 presence bits + fields, then reads two 2048-bit blocks via g_LTClient vtbl+0x38.

- If +1072 == 325, Packet_Id107_Read calls Playerfile_read_blockC0(this+1092, this+12).

- Packet_Id107_Read layout: +1072=u16 subId, +1076=u32 optA (Read_u32c_alt), +1080=u32 optB (Read_u32c_alt), +1084=u32 optC (Read_u32c), +1088=u32 optD (Read_u32c), +1216/+1344=two LTClient strings (2048 bytes each).

- Packet_Id107_DispatchSubId: subId 44 -> inventory/production UI refresh (slot/tooltips); subId 231/270 -> worldId=4 (apartments) + SharedMem[0x77]=optC + SharedMem[0x78]=optB + set 0x1EEC0=1; subId 269 -> if optA != 0 then worldId=optA + set 0x1EEC0=1 (non-apartment world selection).

- World selection can also be triggered by packet ID 0x7B (HandlePacket_ID_WORLD_SELECT_7B @ 0x10199270), which sets SharedMem[0x1EEC1/0x1EEC2] and 0x1EEC0=1.

- Packet_WriteHeader is called before serialize: it resets/initializes the bitstream, optionally writes header byte 0x19 plus a 64-bit token (Packet_GetHeaderTokenU64 via BitStream_WriteU64) when *(this+8)==0x19, then writes msg id byte from *(this+1064).

- Playerfile_BlockC0_WriteEntry layout (called 10x by sub_1000D800): if *(this+4)==0 or *(this+5)==0 => write bit0. Else write bit1, then u16c, then u8c for bytes +2/+3/+8/+9/+10, plus raw bitfields from +4 (7 bits), +5 (7 bits), +6 (9 bits).



### Data (login packet globals)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x102BFDA8 | 0x002BFDA8 | vtbl_Packet_Id107 | Vtable for Packet_Id107_* funcs | vtable xref | low |

| 0x102BFD98 | 0x002BFD98 | vtbl_Packet_Unknown0 | Prior vtable used during Packet_Id107_Init | decomp (user) | low |

| 0x1035AA4C | 0x0035AA4C | g_LTClient | LTClient interface used for packet serialization/send; observed vtbl+0x28=SendPacket, vtbl+0x18=ConnectToWorld(SystemAddress*), vtbl+0x08=IsConnected? | xrefs | low |



### Data (world tables)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x102E2178 | 0x002E2178 | g_ApartmentWorldTable | 6-dword/entry table indexed by apartmentId (SharedMem[0x78], 1..24); entry[0]=folder name; entry[1]=interface\\hqs\\NN.pcx; used by WorldLogin_LoadApartmentWorld | decomp + strings | high |

| 0x102E2980 | 0x002E2980 | g_WorldTable | 15-dword/entry table; entry[0]=folder name (NY_Manhattan, tokyo, apartments, etc), entry[1]=display name (NYC - Manhattan, etc); used by WorldLogin_StateMachineTick for \"worlds\\\\<folder>\" | py_eval + strings | high |



### Data (system address constants)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x103C0F50 | 0x003C0F50 | g_SystemAddress_Unassigned | 6-byte SystemAddress sentinel (all 0xFF) used as “unassigned” | bytes + xrefs | high |

| 0x103C0DE8 | 0x003C0DE8 | g_SystemAddress_Unassigned2 | Duplicate unassigned sentinel (all 0xFF); used in WorldLoginReturn_HandleAddress | bytes + xrefs | high |



### Code (items/inventory + handlers)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10190D70 | 0x00190D70 | CNetworkMgrClient_HandlePacket_ID_MOVE_ITEMS | Handles move-items packet; deep inventory mutation | string + decomp | high |

| 0x1018F110 | 0x0018F110 | HandlePacket_ID_USE_ITEM | Use-item packet handling (ID -92) | dispatch + decomp | high |

| 0x10199A40 | 0x00199A40 | ClientShell_OnMessage_DispatchPacketId | CShell packet-id switch (signed char); handles login IDs 0x6D/0x6F/0x70/0x73 plus inventory/world packets | decomp | high |

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

| 0x10037E70 | 0x00037E70 | CGameClientShell_OnMessage2 | IClientShell vtbl+0x14; dispatches MSG_ID stream (0x68,0x6A,0x75 sub‑id 0..4) and routes to UI/gameplay handlers | decomp | med |

| 0x101C0D60 | 0x001C0D60 | WorldLoginReturn_HandleAddress | Validates world addr; calls g_LTClient->Connect; sets 0x1EEC0=2 | decomp + disasm | high |

| 0x10199270 | 0x00199270 | HandlePacket_ID_WORLD_SELECT_7B | Packet ID 0x7B; validates playerId; subId=4 sets SharedMem[0x1EEC1/0x1EEC2]=worldId/inst + 0x1EEC0=1 (LoginUI msg 0x0B); subId=6 routes payload to UI handler | disasm | high |

| 0x101064C0 | 0x001064C0 | Packet_ID_7B_Ctor | Packet ID = 0x7B; initializes payload blocks | disasm | med |

| 0x10106590 | 0x00106590 | Packet_ID_7B_Read | Parses 0x7B (u32c playerId + u8c type + type payload) | disasm | med |

| 0x101063B0 | 0x001063B0 | Packet_ID_7B_Dtor | Frees 0x7B payload buffers; BitStream_FreeOwnedBuffer | disasm | low |

| 0x10106470 | 0x00106470 | Packet_ID_7B_Sub6List_Init | Initializes subId=6 list header at +0x460 | disasm | low |

| 0x10177A40 | 0x00177A40 | WorldSelect_HandleSubId6Payload | SubId=6 handler; applies parsed +0x460 payload to UI (window id 0x31) | disasm | med |

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

| 0x101A3550 | 0x001A3550 | Packet_Id107_DispatchSubId | Packet_Id107 (ID 0x6B) sub-id switch; subId 44 inventory UI refresh; subId 231/270 force worldId=4 (apartments) + set SharedMem[0x77]/[0x78], subId 269 sets worldId from field | decomp + disasm | high |

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

| 0x1013DE40 | 0x0013DE40 | CWindowSendMail_OnCommand | Send‑mail UI handler; validates recipient/subject/body then builds + sends Packet_ID_MAIL | decomp | med |

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

| 0x101676B0 | 0x001676B0 | RoundFloatToInt | Rounds float to nearest int (±0.5) | decomp | low |

| 0x10109330 | 0x00109330 | Item_GetAmmoItemIdOrTemplate | Returns ammo item id (runtime override or template) | disasm | high |

| 0x1024C940 | 0x0024C940 | ItemTemplate_CopyVariantByIndex | Copies 0x5C variant record by index from template | decomp | high |

| 0x1024C7B0 | 0x0024C7B0 | ItemVariantList_CopyByItemId | Copies per-item variant list (92-byte entries) from global table | decomp | low |

| 0x1024C5A0 | 0x0024C5A0 | VariantList_Assign | Assigns/copies 92-byte entries from another list | decomp | low |

| 0x1024C410 | 0x0024C410 | ByteVector_Insert | Vector insert for byte buffer (memmove + realloc) | decomp | low |

| 0x10247DF0 | 0x00247DF0 | FormatDuration_MinSec | Formats seconds to “Xm” when divisible by 60 | decomp | high |

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

- For each high-order byte (MSB→LSB, excluding the lowest byte):

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

- CShell handler shows UI messages; auth packet build/sending occurs in fom_client (0x6E).



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

- type=5 -> no extra.

- type=6 -> Packet_ID_7B_ReadSubId6List @ 0x1026F2E0 on +0x460 (list payload).

- type=7 -> u8c @+0x435, u8c @+0x436.

Handler behavior:

- if type==4 and playerId matches g_pPlayerStats[0x5B], sets SharedMem[0x1EEC1/0x1EEC2]=worldId/inst, sets 0x1EEC0=1, shows LoginUI msg 0x0B.

- if type==6, routes +0x460 payload to WorldSelect_HandleSubId6Payload (window id 0x31).

SubId=6 payload (Packet_ID_7B_ReadSubId6List @ 0x1026F2E0):

- entry_count (u8c), then per-entry: u8 key, u32 mask (read then bitwise inverted), u16a, u16b, listB entry, listC entry.

- trailing 3x u32c stored at +0x10/+0x14/+0x18 of the sub6 payload struct (meta_a/meta_b/meta_c).

- entry struct size is 0x3C (60 bytes). Init/reset helpers: sub_101231B0 / sub_10123100; copy helper: sub_10176BA0.



#### Packet_ID_7D (ID 0x7D) - server->client (SharedMem update)

Read/handler: HandlePacket_ID_7D_WriteSharedMem_0x2BD0 @ 0x10181A00; parse via Packet_InitBitStreamFromPayload + Read_u32c.

Behavior:

- Reads u32c into temp, reads 12-byte block from SharedMem[0x2BD0] (SharedMem_ReadBlock_std), writes back block {dword0=temp, dword1=0, dword2=1}.

Notes:

- 0x2BD0 block is consumed by an inventory/production UI update path (uses dword2 as “dirty” flag; when set and dword1==0, it updates UI text, then clears dword2 via SharedMem2BD0_WriteBlock12).

- UI text uses SharedMem[0x2BD3] string; if dword0>0 it clears 0x2BD3 and shows string id 0x14BC; else it writes the window’s string into 0x2BD3 and shows it.



#### Packet_ID_USE_ITEM (ID -92) - server→client

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



#### Packet_ID_MOVE_ITEMS (ID -118) — server→client

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



#### Packet_ID_ITEMS_CHANGED (ID -126) — server→client

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



#### Packet_ID_ITEMS_REMOVED (ID -127) — server→client

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



#### Packet_ID_ITEMS_ADDED (ID -109) — server→client

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



#### Packet_ID_UNLOAD_WEAPON (ID -113) - server→client

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



#### Packet_ID_UPDATE (ID -130) — client->server (weaponfire/update payload)

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

- Validates recipient (len >= 4), subject (len >= 5), body (len >= 10), rejects self‑send (case‑insensitive), and runs sub_10248020 (string filter) on each.

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

  Next: search in engine/server/CRes IDBs for vtable/ctor or packet ID constant.



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
CRes string IDs used for stat labels (FoM CRes.dll):

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



## Object.lto (image base 0x10000000)



### Data (object templates)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1011EBD0 | 0x0011EBD0 | ObjectTemplateTable | 0x80-byte records, u16 id at +0x00; contiguous ids starting at 1 (content does not match weapon stats) | file scan + id sequence | low |
| 0x1011EB50 | 0x0011EB50 | SoundEntryTable | 0x80-byte records; entry[31]=clipCount; weight/clip pairs start at entry[11]/[12] | decomp + data scan | low |



### Local player object / Vortex FX

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1012EE50 | 0x0012EE50 | CGameServerShell_vftable | Vtable (RTTI ??_R4CGameServerShell@@6B@); slot +0x14 -> CreateLocalPlayerObj, +0x18 -> ClearLocalPlayerObj | vtable scan | med |

| 0x10039D50 | 0x00039D50 | CreateLocalPlayerObj | Creates CPlayerObj, binds to HCLIENT, sets g_pLocalPlayerObj | decomp | high |

| 0x100355A0 | 0x000355A0 | ClearLocalPlayerObj | Detaches from HCLIENT, clears g_pLocalPlayerObj | decomp | high |

| 0x101B4504 | 0x001B4504 | g_pLocalPlayerObj | Global pointer used by Tick_VortexActiveState / UpdateVortexActiveFx | xrefs + crash dump | high |

| 0x10079960 | 0x00079960 | Tick_VortexActiveState | State handler; calls UpdateVortexActiveFx in states 8/11/13 | decomp | med |

| 0x10013C90 | 0x00013C90 | UpdateVortexActiveFx | Every 10s fires "Vortex_Active" on playerObj->objectId | decomp + string | med |

- Crash: UpdateVortexActiveFx reads playerObj+0x9B0; if g_pLocalPlayerObj is 0xFFFFFFFF/NULL during state 8/11/13, access violation at Object.lto+0x13CAA.



### World login data (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10078D80 | 0x00078D80 | ID_WORLD_LOGIN_Read | Reads large world-login payload into pkt buffer (1072 bytes + extended data blocks) | decomp | med |

| 0x1007AD90 | 0x0007AD90 | Handle_ID_WORLD_LOGIN | Validates worldId/worldInst, branches on pktReturnCode, caches world data, writes spawn/rot into g_pLocalPlayerObj | decomp + strings | med |
| 0x1007A850 | 0x0007A850 | Packet_ID_WORLD_LOGIN_DATA_Ctor | Initializes 0x79 payload defaults (id=0x79, flags, compact vec init) | decomp | med |

| 0x10056F20 | 0x00056F20 | DispatchGameMsg | Message dispatch; msgId 0x79 routes to Handle_ID_WORLD_LOGIN | decomp | med |

| 0x10035BF0 | 0x00035BF0 | CGameServerShell_OnMessage | Trampoline into DispatchGameMsg (engine callback) | decomp + xref | med |

| 0x10051CA0 | 0x00051CA0 | Handle_MSG_ID_WORLD_UPDATE | Packet_ID_WORLD_UPDATE handler: reads (playerId, seq?) then up to 101 entries; spawns/updates CCharacter/Enemy/Turret | decomp | med |
| 0x10086B50 | 0x00086B50 | Handle_MSG_ID_WEATHER | Packet_ID_WEATHER handler; decodes packed weather fields into local cache | decomp | low |
| 0x10062680 | 0x00062680 | Handle_MSG_ID_ATTRIBUTE_CHANGE | Packet_ID_ATTRIBUTE_CHANGE handler; applies attribute list and triggers local FX gates | decomp | low |
| 0x10050550 | 0x00050550 | Handle_MSG_ID_84_HIT | Packet_ID_HIT handler; if target==local player triggers hit reaction | decomp | med |
| 0x10056AC0 | 0x00056AC0 | Handle_MSG_ID_WORLD_OBJECTS | Packet_ID_WORLD_OBJECTS handler; multi-subtype list payload (ids 0x1FA..0x204) | decomp | low |
| 0x10050680 | 0x00050680 | Handle_MSG_ID_EXPLOSIVE | Packet_ID_EXPLOSIVE handler; by objectId + subtype; applies effects to CCharacter | decomp | low |
| 0x1005F0D0 | 0x0005F0D0 | Handle_MSG_ID_AVATAR_CHANGE | Packet_ID_AVATAR_CHANGE handler; applies profile block C and updates shared strings | decomp | low |
| 0x10050840 | 0x00050840 | Handle_MSG_ID_CHAT | Packet_ID_CHAT handler; chat/notification routing + colored text | decomp | low |
| 0x10050DF0 | 0x00050DF0 | Handle_MSG_ID_TAUNT | Packet_ID_TAUNT handler; plays taunt + optional local chat | decomp | low |
| 0x100510B0 | 0x000510B0 | Handle_MSG_ID_OBJECT_DETAILS | Packet_ID_OBJECT_DETAILS handler; updates character metadata strings | decomp | low |

- UI msgs observed in Handle_ID_WORLD_LOGIN failure paths: 1721, 1722, 1724.

### Chat / Taunt helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10046F40 | 0x00046F40 | ChatLog_AddEntry | Pushes chat log entry into shared table (max 0x14 entries) | decomp | low |
| 0x1004C900 | 0x0004C900 | ChatNameCache_SetEntry | Writes name cache entry (id + name + lowercase) | decomp | low |
| 0x1004C9E0 | 0x0004C9E0 | ChatNameCache_InsertOrUpdate | Update or append name cache (max 0x32 entries) | decomp | low |
| 0x1004E150 | 0x0004E150 | ChatNameCache_Reset | Clears name cache entries and resets count | decomp | low |
| 0x1000B480 | 0x0000B480 | SoundEntryTable_GetEntry | Returns sound entry pointer (id 0..0x18A) | decomp | low |
| 0x1000B520 | 0x0000B520 | SoundEntryTable_GetEntry_Thunk | Thunk to SoundEntryTable_GetEntry | disasm | low |
| 0x10070510 | 0x00070510 | SoundEntry_SelectClipPath | Weighted pick of clip path from entry | decomp | low |
| 0x10070CB0 | 0x00070CB0 | SoundEntry_PlayEntry | Builds audio event from sound entry and enqueues | decomp | low |
| 0x100711B0 | 0x000711B0 | SoundEntry_PlayById | Look up sound entry then play | decomp | low |
| 0x100706B0 | 0x000706B0 | SoundEntryList_BuildNameList | Fills UI list with entry names (max len) | decomp | low |
| 0x100704C0 | 0x000704C0 | AudioEvent_Enqueue | Enqueues audio event payload into shared queue | decomp | low |
| 0x10070BE0 | 0x00070BE0 | AudioEvent_EnqueueFromObject | Builds audio event from object + string | decomp | low |
| 0x10070DE0 | 0x00070DE0 | SoundEntry_PlayForObject | Plays sound entry relative to object | decomp | low |
| 0x10070EF0 | 0x00070EF0 | AudioEvent_EnqueueAtPos | Builds audio event at world position | decomp | low |
| 0x10071080 | 0x00071080 | SoundEntry_PlayAtPos | Plays sound entry at world position | decomp | low |
| 0x10046D90 | 0x00046D90 | AudioEvent_InitDefaults | Initializes audio event defaults | decomp | low |
| 0x10046B20 | 0x00046B20 | AudioEventQueue_Push | Pushes event into queue (max 0x64 entries) | decomp | low |

SoundEntry (SoundEntryTable) layout (partial, 0x80 bytes):
- +0x00 u32 id
- +0x04 char* name (C string)
- +0x0C float minDist (copied into AudioEvent f68)
- +0x10 float maxDist (copied into AudioEvent f69)
- +0x14 float pitchOrRolloff (copied into AudioEvent f71)
- +0x18 float playChance (if <1.0, random gate)
- +0x1C u8 volumePercent (0..100) -> f70 (0..1)
- +0x20 u32 flagsOrGroup (copied into AudioEvent dword)
- +0x24 float useObjectPos (nonzero -> pull object position in SoundEntry_PlayEntry)
- +0x2C float weight0
- +0x30 char* clip0
- subsequent pairs: weight1/clip1 at +0x34/+0x38, etc
- +0x7C u32 clipCount

Taunt (msgId 0x96) uses SoundEntryTable[tauntId] to pick the clip path (weighted by weightN).
SoundEntry_SelectClipPath:
- sums weights (float) -> casts sum to int for Rand_IntInclusive
- picks first weight bucket where cumulative > randomInt

AudioEvent payload (0x148 bytes, as written by AudioEvent_Enqueue):
- +0x000 char path[260] (sound/FX path)
- +0x104 float f65
- +0x108 float f66
- +0x10C float f67
- +0x110 float f68
- +0x114 float f69
- +0x118 float f70
- +0x11C float f71
- +0x120 float f72 (default 10.0)
- +0x124 float f73 (default 500.0)
- +0x128 float f74 (default 1.0)
- +0x12C float f75 (default 1.0)
- +0x130 float f76
- +0x134 float f77
- +0x138 float f78
- +0x13C u32 linkA (AudioEvent_Enqueue writes *this)
- +0x140 u32 linkB (AudioEvent_Enqueue writes *(this+1))
- +0x144 u32 linkC (cleared to 0)
Defaults for f65..f78 are set by AudioEvent_InitDefaults; positions/volumes override in SoundEntry_* helpers.

### Appearance helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10015DC0 | 0x00015DC0 | AppearanceEntry_Reset | Zeroes 124-byte appearance/identity block | decomp | low |
| 0x100143A0 | 0x000143A0 | AppearanceEntry_Clear | Zeroes 124-byte appearance/identity block (inner helper) | decomp | low |

### Sound emitter (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10070180 | 0x00070180 | SoundEmitter_Create | Allocates/initializes sound emitter object | disasm | low |
| 0x100701B0 | 0x000701B0 | SoundEmitter_PlayNow | Builds AudioEvent from emitter fields and enqueues | decomp | low |
| 0x100702D0 | 0x000702D0 | SoundEmitter_Update | Tick: plays at interval (rand between min/max) | decomp | low |
| 0x10070360 | 0x00070360 | SoundEmitter_Stop | Stops/restarts emitter based on flags and timing | decomp | low |
| 0x10070420 | 0x00070420 | SoundEmitter_OnMessage | Message handler: stop/update based on msg, forwards | disasm | low |
| 0x10001390 | 0x00001390 | ClientObj_OnMessageDispatch | Forwards engine message to object vtbl handler | disasm | low |
| 0x10001080 | 0x00001080 | ClientObj_OnMessageDispatch_WithSender | Dispatch w/ sender + extra args | disasm | low |

SoundEmitter fields (partial, from SoundEmitter_PlayNow/Stop/Update):
- +0x08 HOBJECT (used for position + stop calls)
- +0x40 s32 soundEntryId (‑1 disables)
- +0x44 s32 lastEventHandle (AudioEvent_Enqueue return)
- +0x48 float minDist
- +0x4C float maxDist
- +0x50 u8 volumePercent
- +0x54 float pitchOrRolloff
- +0x5C bool playAttached
- +0x64 u8 flags/group
- +0x68 bool repeat
- +0x6C float repeatTimeMin
- +0x70 float repeatTimeMax
- +0x74 float nextPlayTime

Property strings near 0x10139078 include: RepeatTimeMax, RepeatTimeMin, Repeat, PlayAttached, PitchShift (likely SoundEmitter props).

### Math / visibility helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10013E30 | 0x00013E30 | Vec3_LengthSq | Returns squared length of vec3 | decomp | high |
| 0x1006D790 | 0x0006D790 | LTServer_IsLineOfSightClear | Raycast between two objects; returns true if clear | decomp | med |
| 0x10007EA0 | 0x00007EA0 | Rand_IntInclusive | rand() % (n+1) (or -1..0 when n==-1) | decomp | low |
| 0x10007F10 | 0x00007F10 | Rand_FloatRange | Returns uniform float in [min, max] | decomp | low |

### Object render helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D290 | 0x0000D290 | Obj_SetAlphaAndHiddenFlag | Sets alpha and toggles hidden flag when alpha==0 | decomp | low |

### Text parser helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100E26B0 | 0x000E26B0 | TextParser_StripMarkupTags | Parses text and strips tag markup into std::string | decomp | low |
| 0x100E22D0 | 0x000E22D0 | TextParser_NextToken | Tokenizes `<tag>` stream; returns token type | decomp | low |
| 0x100E2280 | 0x000E2280 | TextParser_ReadNonWhitespace | Returns next non-whitespace char from stream | decomp | low |

### World login flow (CShell.dll / fom_client.exe@0x65700000)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x65899AD3 | 0x00199AD3 | ClientShell_OnMessage_DispatchPacketId | Packet ID switch; routes ID 0x73 -> HandlePacket_ID_WORLD_LOGIN_RETURN_73 | decomp | high |
| 0x6588E340 | 0x0018E340 | HandlePacket_ID_WORLD_LOGIN_RETURN_73 | Handles world login return (code 1/2/3/4/6/7/8 UI + connect) | decomp | high |
| 0x6588DDA0 | 0x0018DDA0 | ID_WORLD_LOGIN_RETURN_Read | Reads code/flag + worldAddr.ip + worldAddr.port | decomp | high |
| 0x6588C320 | 0x0018C320 | ID_WORLD_LOGIN_RETURN_Ctor | id=0x73; worldAddr=unassigned; code=0; flag=0xFF | decomp | high |
| 0x658C0D60 | 0x001C0D60 | WorldLoginReturn_HandleAddress | Validates address; g_LTClient->ConnectToWorld; sets state=2 | decomp | high |
| 0x6588C570 | 0x0018C570 | WorldLoginReturn_ScheduleRetry | Sets state=1 and retry time (now+5s) | decomp | high |
| 0x658C0E10 | 0x001C0E10 | WorldLogin_StateMachineTick | State machine; sends 0x72 and loads world | decomp | high |
| 0x658BFE00 | 0x001BFE00 | ID_WORLD_LOGIN_Ctor | id=0x72; worldId=-1; worldInst/playerId/worldConst=0 | decomp | high |
| 0x658C09F0 | 0x001C09F0 | ID_WORLD_LOGIN_Write | Writes worldId/worldInst/u32c playerId/u32c worldConst | decomp | high |
| 0x6588D9C0 | 0x0018D9C0 | LTClient_SendPacket_BuildIfNeeded | Sends packet via g_LTClient vtbl+0x28/0x40 | decomp | med |
| 0x6575AE30 | 0x0005AE30 | WorldLogin_LoadWorldFromPath | Loads world by path + display name | decomp | med |
| 0x658C0340 | 0x001C0340 | WorldLogin_LoadApartmentWorld | Special-case worldId==4 load | decomp | med |
| 0x6578C310 | 0x0008C310 | SharedMem_WriteWorldLoginState_0x1EEC0 | Writes world login state | decomp | med |
| 0x6588E8F0 | 0x0018E8F0 | Packet_ID_NAME_CHANGE_ReadAndApply | Updates shared string keys 11219/11224 based on name-change packet | decomp | low |
| 0x657850A0 | 0x000850A0 | SharedMem2BD3_WriteString | Writes key 11219 (string) | decomp | low |
| 0x6588AD10 | 0x0018AD10 | SharedMem_WriteKey11224 | Writes key 11224 (string) | decomp | low |
| 0x6588AD30 | 0x0018AD30 | SharedMem_WriteKey126546 | Writes key 126546 (string) | decomp | low |
| 0x658C51B0 | 0x001C51B0 | WeaponFire_IsDistanceSqBelowThreshold | Reads key 125503 (vec3) + 125506 (u32 threshold) | decomp | low |
| 0x6589D9D0 | 0x0019D9D0 | SharedMem_WriteKey125508 | Writes key 125508 (u32) | decomp | low |

Packet send path (CShell.dll):
| 0x6570C770 | 0x0000C770 | Packet_WriteHeader | Writes header id; if id==25 writes U64 token; always writes packet id byte | decomp | med |
| 0x658CA270 | 0x001CA270 | Packet_GetHeaderTokenU64 | Returns monotonic time (micros/1000) | decomp | med |
| 0x658CA290 | 0x001CA290 | Timer_GetTimeMicros_Monotonic | QPC-based monotonic microseconds | decomp | med |
| 0x658C92B0 | 0x001C92B0 | BitStream_ResetBitPosition | Sets bit position=0 | decomp | med |
| 0x658C96C0 | 0x001C96C0 | BitStream_WriteBits | Writes bits to stream (bit-level) | decomp | med |
| 0x6570BB60 | 0x0000BB60 | BitStream_WriteU64 | Writes U64 (endian-aware) | decomp | med |
| 0x658C9BD0 | 0x001C9BD0 | BitStream_EnsureCapacityBits | Grows bitstream buffer as needed | decomp | med |
| 0x658CA120 | 0x001CA120 | Net_IsBigEndian | Returns big-endian bool (cached) | decomp | low |
| 0x658CA150 | 0x001CA150 | Net_IsBigEndian_Cached | Cached endianness check using htonl | decomp | low |
| 0x658CA080 | 0x001CA080 | ByteSwapCopy | Byte-reverse copy helper | decomp | low |

Notes:
- g_LTClient is runtime engine interface; vtbl+0x18 used as ConnectToWorld(SystemAddress*). Static IDB shows g_LTClient=0xFFFFFFFF (uninitialized).

Helpers (msgId 0x79 payload):
- 0x100EAB40 WorldLogin_ReadProfileBlockA (core player profile + skill table)
- 0x1007A6D0 WorldLogin_CopyProfileBlockA (copies profile into server state)
- 0x100EAA40 WorldLogin_ReadProfileBlockB
- 0x100EA9E0 WorldLogin_WriteProfileBlockB
- 0x100C8D20 WorldLogin_ReadProfileBlockC (bitfield stats)
- 0x100C8B80 WorldLogin_WriteProfileBlockC (bitfield stats, write-side)
- 0x100E34A0 WorldLogin_ReadProfileBlockD (u32c[53])
- 0x100E3440 WorldLogin_WriteProfileBlockD (u32c[53])
- 0x10078B80 WorldLogin_ReadStringBundleE (4 x 256B strings)
- 0x1007AA30 WorldLogin_WriteStringBundleE (4 x 256B strings)
- 0x100DF070 WorldLogin_ReadCompactVec3S16Yaw (vec3 + 9-bit extra)
- 0x100E1FF0 WorldLogin_ReadCompactVec3S16 (vec3 core)
- 0x100DF2F0 WorldLogin_CompactVec3_Init16 (sets bitCount=16, zero vec)

Helpers (msgId 0x7F world update payload):
- 0x1004C740 Packet_ID_WORLD_UPDATE_Ctor
- 0x10051950 WorldUpdate_ReadEntry (entry type 1-4)
- 0x100518C0 WorldUpdate_ReadCharacterEntry_Ext (type 1)
- 0x1004EC50 WorldUpdate_ReadCharacterEntry (type 2)
- 0x1004EEF0 WorldUpdate_ReadEnemyEntry (type 3)
- 0x1004F000 WorldUpdate_ReadTurretEntry (type 4)
- 0x1004FF00 WorldUpdate_SpawnCharacter (CCharacter)
- 0x10050130 WorldUpdate_SpawnEnemy (Enemy)
- 0x10050340 WorldUpdate_SpawnTurret (Turret)
- 0x100C8B60 ProfileBlockC_HasSlots11To19
- 0x100C0DA0 ItemTemplate_GetTypeById
- 0x100BFD50 ItemType_HasBitFlag
- 0x1004DD40 BitStream_Read4BitsToBools

World update entry notes (msgId 0x7F):
- type 2 (Character): u32c id, compact vec3+yaw, ProfileBlockC, then gated fields (stance, pitch, flags, optional u16c + vec3, bits for appearance/weapon)
- type 3 (Enemy): u32c id, u16c type?, 3b/8b flags, compact vec3+yaw, 8b state; if state==0 reads extra bitfields + optional u32c
- type 4 (Turret): u32c id, u16c type?, bit flags, 14b field, 4b flags, compact vec3+yaw, optional u32c[3], 2048-bit string

Helpers (msgId 0x83 attribute change payload):
- 0x10062260 Packet_ID_ATTRIBUTE_CHANGE_Ctor
- 0x100622C0 Packet_ID_ATTRIBUTE_CHANGE_Read
- 0x100E3370 AttributeChange_ReadEntryList
- 0x100624E0 AttributeTable_SetValueFromServer
- 0x1001E0E0 AttributeTable_GetValue
- 0x1007F710 SharedTable_ReadBucket
- 0x100628C8 Handle_MSG_ID_ATTRIBUTE_CHANGE (apply list to AttributeTable; triggers damage FX when stat 0 drops)
- 0x10006F50 AppearanceCache_BuildFromProfileC (builds appearance paths from profileC)
- 0x100077B0 Appearance_ApplyProfileCToObject (apply model/attachment entries from profileC)

Packet_ID_ATTRIBUTE_CHANGE (msgId 0x83) layout (observed):
- u8 count
- ids: u8[count] (stored at buf+1)
- values: u32c[count] (stored at buf+56, 4 bytes each)
- 0x1007FA90 SharedTable_WriteBucket

Helpers (msgId 0x85 world objects payload):
- 0x10055D50 Packet_ID_WORLD_OBJECTS_Ctor
- 0x100568D0 Packet_ID_WORLD_OBJECTS_Read
- 0x10055A90 Packet_ID_WORLD_OBJECTS_Dtor
- 0x10054F00 WorldObjects_ReadList_Type508 (size 792)
- 0x10055090 WorldObjects_ReadList_Type513 (size 84)
- 0x100567E0 WorldObjects_ReadList_NPC (size 196)
- 0x1004EA70 WorldObjects_ReadType508_Entries
- 0x1004E990 WorldObjects_ReadType508_Header
- 0x1004EB90 WorldObjects_ReadType513_Entries
- 0x1004EB30 WorldObjects_ReadType513_Header
- 0x100E08A0 WorldObjects_Type508_MapInsert
- 0x100E07C0 WorldObjects_Type508_MapLowerBound
- 0x100E1740 WorldObjects_Type513_MapInsert
- 0x100DC250 WorldObjects_ReadList28 (entry size 28)
- 0x100DC190 WorldObjects_List28_Insert
- 0x100DBC40 WorldObjects_List28_Copy
- 0x100DBB10 WorldObjects_List28_GetEntry
- 0x10054AE0 WorldObjects_List792_AllocAt
- 0x10054B50 WorldObjects_List84_AllocAt
- 0x10055CE0 WorldObjects_List196_AllocAt
- 0x100539F0 WorldObjects_List792_CopyOrThrow
- 0x10053AA0 WorldObjects_List84_CopyOrThrow
- 0x10053B50 WorldObjects_List792_Clear
- 0x10053BA0 WorldObjects_List84_Clear
- 0x10052ED0 WorldObjects_List792_DestroyEntry
- 0x10052F10 WorldObjects_List84_DestroyEntry
- 0x10051240 WorldObjects_HandleList28_ByType (types 506/507/509/510/511/512/515/516)
- 0x100530D0 WorldObjects_HandleList800_Type508
- 0x100535D0 WorldObjects_HandleList92_Type513
- 0x100515C0 WorldObjects_HandleNPCList
- 0x100723A0 WorldObject_RegisterIds (sets objectId/type and registers in mgr)
- 0x10073630 WorldObject_ApplyUpdate
- 0x100734F0 WorldObject_ApplyStateByType (type 0x200/0x201/0x203/0x204)
- 0x100722C0 WorldObject_SetState_Off (sets text "OFF", triggers effect id 180)
- 0x10072330 WorldObject_SetState_On (sets text "ON", triggers effect id 180)
- 0x10073020 WorldObject_EnableShieldFx (spawns shield meshes/shaders)
- 0x10072170 WorldObject_DisableShieldFx

World objects (msgId 0x85) subId → list/type mapping:
- 0x1FA → type 506 (list28) -> WorldObjects_HandleList28_ByType(506)
- 0x1FB → type 507 (list28) -> WorldObjects_HandleList28_ByType(507)
- 0x1FC → type 508 (list792) -> WorldObjects_HandleList800_Type508
- 0x1FD → type 509 (list28) -> WorldObjects_HandleList28_ByType(509)
- 0x1FE → type 510 (list28) -> WorldObjects_HandleList28_ByType(510)
- 0x1FF → type 511 (list28) -> WorldObjects_HandleList28_ByType(511)
- 0x200 → type 512 (list28) -> WorldObjects_HandleList28_ByType(512)
- 0x201 → type 513 (list84) -> WorldObjects_HandleList92_Type513
- 0x202 → NPC list (list196) -> WorldObjects_HandleNPCList
- 0x203 → type 515 (list28) -> WorldObjects_HandleList28_ByType(515)
- 0x204 → type 516 (list28) -> WorldObjects_HandleList28_ByType(516)

Type behavior notes (WorldObject_ApplyStateByType):
- type 0x200 (512): toggles "Looping"/"PowerUp" animation slots
- type 0x201 (513): ON/OFF text + effect id 180
- type 0x203 (515): shield fx enable/disable (Models\\Items\\shield_player.ltb + shader textures)
- type 0x204 (516): state timer gate (sets state + time)

List28 entry (from WorldObjects_ReadList28):
- u32c objectId
- u16c typeOrItemId
- u8  flag
- u32c paramA
- compact vec3 s16 + yaw (WorldLogin_ReadCompactVec3S16Yaw)

Helpers (msgId 0x89 explosive payload):
- 0x1004DF00 Packet_ID_EXPLOSIVE_Ctor
- 0x1004F270 Packet_ID_EXPLOSIVE_Read
- 0x100164A0 ExplosiveEvent_Init
- 0x10016E10 Character_HandleExplosiveAction1
- 0x10019EE0 Character_HandleExplosiveAction2 (spawns effect if item class == 4)

Packet_ID_EXPLOSIVE (msgId 0x89) layout (observed):
- u32c targetId
- u16c itemId? (used as *u16 in ExplosiveEvent_Init -> sub_10019EE0)
- u8 action (1/2/3)
- if action==2 or 3:
  - s16c x,y,z
  - u32c unkA
  - compact vec3 + yaw (s16)
- if action==2:
  - s16c vx,vy,vz (scaled by 0.001 in handler)
- if action==3:
  - compact vec3 s16 (A)
  - compact vec3 s16 (B)
Handler behavior:
- action==1 -> Character_HandleExplosiveAction1
- action==2 -> ExplosiveEvent_Init + Character_HandleExplosiveAction2 (uses scaled vecs)
- action==3 -> parsed but no handler path observed here

Helpers (msgId 0x80 weather payload):
- 0x100854F0 Packet_ID_WEATHER_Ctor
- 0x100EE8F0 Packet_ID_WEATHER_ReadU32Pair
- 0x100EEA70 WeatherState_SetPacked
- 0x100EEB20 WeatherState_Reset
- 0x100DFCB0 BitStream_Read_u32c_into
- 0x100172C0 WorldLogin_ReadEntryG
- 0x100DEC50 WorldLogin_ReadTableI (header u8x4+u32c, count u32c; entry id/type/value/flags)
- 0x100E9090 WorldLogin_ReadListK (header u32c+u32c, count u32c; entry u16 id + u8 value + 1-bit flag -> u8)
- 0x1007AB00 ID_WORLD_LOGIN_DATA_Write (writes msgId 0x79 payload)
- 0x100EBA60 WorldLogin_ReadSkillTable
- 0x100DB820 WorldLogin_ReadSkillEntry
- 0x100DB940 WorldLogin_ReadSkillSlot
- 0x100CE500 WorldLogin_ReadSkillTreeList
- 0x100CC190 WorldLogin_ReadSkillTree
- 0x10101AB0 WorldLogin_ReadSkillTable_3Slots
- 0x10101D60 WorldLogin_ReadSkillTable_6Slots
- 0x1007A7A0 WorldLogin_ProfileA_Init (skill trees + skill tables defaults)
- 0x10078870 WorldLogin_SkillTable12_Init
- 0x100788D0 WorldLogin_SkillTable3_Init
- 0x10078810 WorldLogin_SkillTable6_Init
- 0x100EA990 WorldLogin_ProfileB_Init
- 0x100E3400 WorldLogin_ProfileD_Init
- 0x100E2D50 WorldLogin_ProfileD_Defaults (fills 2x53 dword tables + flags)
- 0x100DE7C0 WorldLogin_TableI_Init
- 0x100DE480 WorldLogin_TableI_Reset
- 0x100EBA50 WorldLogin_StringBundle_Init
- 0x100EB9F0 WorldLogin_StringBundle_Reset
- 0x1007A410 WorldLogin_CopyListK
- 0x1007A450 WorldLogin_CopyTableI
- 0x100EA9E0 WorldLogin_WriteProfileBlockB (4 * u16c)
- 0x100C8B80 WorldLogin_WriteProfileBlockC (bitfield; conditional 9x12 block)
- 0x100E3440 WorldLogin_WriteProfileBlockD (u32c[53])
- 0x1007AA30 WorldLogin_WriteStringBundleE (u32c + flag + 4 strings)
- 0x10017390 WorldLogin_WriteEntryGBlock (u32c + 10 entries)
- 0x100171E0 WorldLogin_WriteEntryG (present bit + 12B entry fields)
- 0x1007A0B0 Vec4_Assign
- 0x10025540 Vec4_Assign_Alt
- 0x1007A1C0 Vec20_Assign
- 0x1000B1C0 SharedStringTable_WriteAt
- 0x10016750 BitStream_Write_u16c
- 0x1008BA90 BitStream_WriteCompressed
- 0x1008B940 BitStream_WriteBits
- 0x1008B590 BitStream_WriteBit1
- 0x1008B550 BitStream_WriteBit0
- 0x10015F10 WorldLogin_ListK_FindById (u16 id -> entry {u16 id, u8 value, u8 flag})
- 0x10017440 WorldLogin_ListK_IsFlagSet (entryId -> entry[+3] != 0)
- 0x100CB2A0 WorldLogin_SkillTree_Insert
- 0x100EBAB0 WorldLogin_SkillTable_IsEmpty
- 0x100DEBC0 WorldLogin_TableI_Insert
- 0x100DEE50 WorldLogin_TableI_AddEntry (guards id < 0x74, inserts)
- 0x100DEE90 WorldLogin_TableI_Merge (merge/update by id)
- 0x100DCA80 WorldLogin_TableI_FindById (linear scan; compares entryId)
- 0x100DCCA0 WorldLogin_TableI_GetMaxRank (max byte+12 across entries)
- 0x100DD0F0 WorldLogin_TableI_DecrementRank (byte+12--)
- 0x100DD180 WorldLogin_TableI_IncrementRank (byte+12++)
- 0x100DE2F0 Vec20_CopyN
- 0x100DE370 Vec20_AppendN
- 0x100DE510 Vec20_InsertN
- 0x100DEB50 Vec20_InsertPos
- 0x100E6990 Vec4_CopyN
- 0x100E79E0 Vec4_InsertN
- 0x100CDB40 Vec44_InsertN
- 0x100CDAE0 Vec44_InsertPos
- 0x100CD600 Vec44_InsertN_Internal
- 0x100CC830 Vec44_CopyN_Throw
- 0x100CBFC0 Vec44_CopyRange
- 0x1002D370 SkillEntry_Copy
- 0x1002C4F0 SkillEntry_InitTree
- 0x1002C080 SkillEntry_CopyTree
- 0x1002BD40 SkillEntry_TreeCopyRecurse
- 0x100DD350 Skill_ProcessValue (logs "ProcessValue - Skill {0} not handled!")
- 0x10007C90 AppearanceCache_Init (clears large appearance cache struct)
- 0x10006F50 AppearanceCache_BuildFromProfileC (builds skin/mesh paths from ProfileBlockC)
- 0x10037C40 WorldLogin_SelectStartPoint (startpoint selection when no override spawn)
- 0x10017DE0 WorldLogin_ApplyProfileCToPlayer (appearance + ability updates)

Bitstream helpers (Object.lto):
- 0x10016090 VariableSizedPacket_Read (copies payload -> bitstream + reads header)
- 0x1008BD20 BitStream_ReadCompressed
- 0x1008BBB0 BitStream_ReadBits
- 0x1008B610 BitStream_ReadBit
- 0x10016250 BitStream_ReadBit_Checked
- 0x10016370 BitStream_Read_u32c
- 0x100163D0 BitStream_Read_u16c
- 0x10014BD0 BitStream_ReadU64
- 0x1008C300 ByteSwapCopy
- 0x1008C3A0 Net_IsBigEndian
- 0x1008C3D0 Net_IsBigEndian_Cached



### MasterDatabase / internal DB APIs

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10004D50 | 0x00004D50 | ObjDB_ListInsert | Intrusive list insert helper | bytes + call sites | med |

| 0x10004D90 | 0x00004D90 | ObjDB_ListRemove | Intrusive list remove helper | bytes + call sites | med |

| 0x10004FC0 | 0x00004FC0 | ObjDB_ProcessTables | Table iteration/dispatch loop (walks list, calls handlers) | bytes + call pattern | low |

| 0x10005420 | 0x00005420 | ObjDB_Master_Init | Master DB init/ctor (vtbl=0x10114440, allocs 0x0C) | bytes + field init | med |

| 0x100054A0 | 0x000054A0 | ObjDB_Master_Dtor | Master DB destructor/clear (frees lists/blocks) | bytes + call sites | med |

| 0x100054F0 | 0x000054F0 | ObjDB_Master_Build | Master DB setup/dispatch (calls vtbl+0x10 path) | bytes + call pattern | low |

| 0x10005608 | 0x00005608 | ObjDB_Master_CallSlot0C | Master DB dispatch via vtbl+0x0C | bytes + vtbl call | low |

| 0x100056B8 | 0x000056B8 | ObjDB_Master_CallSlot08 | Master DB dispatch via vtbl+0x08 | bytes + vtbl call | low |

| 0x10003090 | 0x00003090 | SetMasterDatabase | Export; installs master DB from server.dll | entrypoints (export) | high |

| 0x10005840 | 0x00005840 | Server_Call_50_vtbl88 | Calls vtbl+0x88 on *(this+0x50) with arg | disasm | low |

| 0x10005BA0 | 0x00005BA0 | ObjDB_Master_CtorThunk | Sets vptr (0x1011446C) then tail-jumps | bytes (mov vptr + jmp) | low |

| 0x10114440 | 0x00114440 | ObjDB_Master_vftable | Master DB vtable (vptr set in ObjDB_Master_Init) | bytes (vtbl ptr) | med |



Vtable slots (ObjDB_Master_vftable):

- +0x00 -> 0x10005A80 ObjDB_Master_Vfn00

- +0x04 -> 0x10005B80 ObjDB_Master_Vfn04

- +0x08 -> 0x10004F00 ObjDB_Master_Vfn08

- +0x0C -> 0x10004E30 ObjDB_Master_Vfn0C

- +0x10 -> 0x10005280 ObjDB_Master_Vfn10

- +0x14 -> 0x100048F0 ObjDB_Master_Vfn14

- +0x18 -> 0x10004890 ObjDB_Master_Vfn18

- +0x1C -> 0x10004DD0 ObjDB_Master_Vfn1C

- +0x20 -> 0x10004950 ObjDB_Master_Vfn20

- +0x24 -> 0x10004250 ObjDB_Master_Vfn24

- +0x28 -> 0x1018C58C ObjDB_Master_VtblData_28 (data, unknown)

- +0x2C -> 0x10005BB0 ObjDB_Master_Vfn2C

- +0x30/+0x34/+0x38 -> 0x10102324 thunk__purecall (IAT thunk -> _purecall)

- +0x3C -> 0x1018C5A0 ObjDB_Master_VtblData_3C (data, unknown)



IAT thunks near vtable:

- 0x10102324 thunk__purecall -> [0x10113278] _purecall

- 0x1010232A thunk__strncpy_s -> [0x1011327C] strncpy_s

- 0x10102330 thunk__rand -> [0x10113280] rand

- 0x10102336 thunk___CIatan2 -> [0x10113284] _CIatan2

- 0x1010233C thunk___CIcos -> [0x10113288] _CIcos

- 0x10102342 thunk___CIsin -> [0x1011328C] _CIsin

- 0x10102224 thunk__op_new -> [0x10113268] operator new

- 0x1010222A thunk__sprintf -> [0x1011326C] sprintf

- 0x101021F0 thunk__op_delete -> [0x10113250] operator delete



Vtable call graph (IDA callees, no decomp/disasm):

- Vfn00 (0x10005A80) calls: ObjDB_Array_GetPtr, ObjDB_Array_GetPtr2, ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_Master_RebuildIndexes, thunk__op_new

- Vfn04 (0x10005B80) calls: ObjDB_Master_Dtor (0x100054A0), thunk__op_delete

- Vfn08 (0x10004F00) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_List_CallVfn8, thunk__op_new

- Vfn0C (0x10004E30) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_List_ForEachA, thunk__op_new

- Vfn10 (0x10005280) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_Master_ProcessTable, thunk__op_new

- Vfn14 (0x100048F0) calls: ObjDB_Index_GetByIdx, ObjDB_List_Add, ObjDB_Index_Ready, ObjDB_Array_Find

- Vfn18 (0x10004890) calls: ObjDB_Index_GetByIdx, ObjDB_List_Add2, ObjDB_Index_Ready, ObjDB_Array_Find

- Vfn1C (0x10004DD0) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Rebuild, ObjDB_Index_Ready, ObjDB_Array_Find

- Vfn20 (0x10004950) calls: ObjDB_Index_GetByIdx, ObjDB_List_RemoveMaybe

- Vfn24 (0x10004250) calls: ObjDB_Array_GetPtr

- Vfn2C (0x10005BB0) calls: ObjDB_Master_CtorThunk (0x10005BA0), thunk__op_delete



Helper cluster (renamed, no decomp/disasm):

| VA | RVA | Symbol | Purpose (inferred) | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10004720 | 0x00004720 | ObjDB_Index_GetByIdx | Index lookup by id (calls ObjDB_Index_AllocSlots) | bytes + call chain | low |

| 0x10004300 | 0x00004300 | ObjDB_Index_Create | Create index struct (allocs, sets vtbl 0x10114438) | bytes + alloc pattern | low |

| 0x10004B90 | 0x00004B90 | ObjDB_Index_BinSearch | Binary search over index entries | bytes + loop pattern | low |

| 0x100038E0 | 0x000038E0 | ObjDB_Index_Ensure | Ensure list/index allocated (uses memset) | bytes + memset | low |

| 0x100038A0 | 0x000038A0 | ObjDB_Index_CopyHeader | Copy/init header (memcpy) | bytes + memcpy | low |

| 0x10004A10 | 0x00004A10 | ObjDB_List_ForEachA | Iterates list + callback | bytes + call chain | low |

| 0x10004A40 | 0x00004A40 | ObjDB_List_CallVfn8 | Calls vtbl+8 on list items | bytes + vtbl call | low |

| 0x10004A70 | 0x00004A70 | ObjDB_Index_Rebuild | Rebuilds index (calls Array_* + List_Iterate) | call graph | low |

| 0x10004470 | 0x00004470 | ObjDB_Index_Ready | Ready check / counts (uses Array_* helpers) | call graph | low |

| 0x100044C0 | 0x000044C0 | ObjDB_List_Add | Add element to list | call chain | low |

| 0x100044A0 | 0x000044A0 | ObjDB_List_Add2 | Add element (variant; uses ObjDB_Array_FindIdx) | call chain | low |

| 0x100044E0 | 0x000044E0 | ObjDB_List_RemoveMaybe | Remove element or status | call chain | low |

| 0x10003B10 | 0x00003B10 | ObjDB_Array_GetPtr | Array ptr getter | bytes | low |

| 0x10003B20 | 0x00003B20 | ObjDB_Array_GetPtr2 | Array ptr getter (variant) | bytes | low |

| 0x10003B40 | 0x00003B40 | ObjDB_Array_Find | Linear/array search | bytes | low |

| 0x10003C70 | 0x00003C70 | ObjDB_Array_Pop | Pop/decrement helper | bytes | low |

| 0x10003D40 | 0x00003D40 | ObjDB_Array_GetPtr4 | Array ptr getter (variant) | bytes | low |

| 0x10003D00 | 0x00003D00 | ObjDB_Array_FindIdx | Linear search returning index | bytes | low |

| 0x10003BD0 | 0x00003BD0 | ObjDB_StructZero1 | Zero-init helper (memset) | bytes + calls | low |

| 0x10003CD0 | 0x00003CD0 | ObjDB_StructZero2 | Zero-init helper (memset) | bytes + calls | low |

| 0x10003DE0 | 0x00003DE0 | ObjDB_StructZero3 | Zero-init helper (memset) | bytes + calls | low |

| 0x10003EC0 | 0x00003EC0 | ObjDB_Index_AllocSlots | Alloc index slots | bytes | low |

| 0x10003B90 | 0x00003B90 | ObjDB_Index_Init1 | Index init helper | calls memcpy | low |

| 0x10003C90 | 0x00003C90 | ObjDB_Index_Init2 | Index init helper | calls memcpy | low |

| 0x10003DA0 | 0x00003DA0 | ObjDB_Index_Init3 | Index init helper | calls memcpy | low |

| 0x100047E0 | 0x000047E0 | ObjDB_Index_BinSearchEx | Binsearch variant | calls ObjDB_Index_Sort3 | low |

| 0x100039E0 | 0x000039E0 | ObjDB_List_Next | Next pointer helper | bytes | low |

| 0x10004780 | 0x00004780 | ObjDB_Index_Build1 | Builds index (sort) | calls memcpy+memset | low |

| 0x100047B0 | 0x000047B0 | ObjDB_Index_Build2 | Builds index (sort) | calls memcpy+memset | low |

| 0x10004830 | 0x00004830 | ObjDB_Index_InsertSorted | Insert into sorted index | bytes + loop | low |

| 0x10004C70 | 0x00004C70 | ObjDB_Index_InsertMulti | Insert multiple entries (calls InsertSorted) | call graph | low |

| 0x10003C20 | 0x00003C20 | ObjDB_Array_SetRange | Set array range | bytes | low |

| 0x10003BF0 | 0x00003BF0 | ObjDB_Array_Clear | Clear array | bytes | low |

| 0x10003C00 | 0x00003C00 | ObjDB_Array_Set | Set array entry | bytes | low |

| 0x10004550 | 0x00004550 | ObjDB_List_Iterate1 | List iteration helper | call graph | low |

| 0x100045A0 | 0x000045A0 | ObjDB_List_Iterate2 | List iteration helper | call graph | low |

| 0x10003CF0 | 0x00003CF0 | ObjDB_List_Reset | Reset list head | bytes | low |

| 0x10003E50 | 0x00003E50 | ObjDB_List_FindInsertPos | Find insert pos (sort) | bytes | low |

| 0x100040C0 | 0x000040C0 | ObjDB_Index_Sort3 | Sort helper (memcpy+memset) | call graph | low |

| 0x10004000 | 0x00004000 | ObjDB_Index_Sort1 | Sort helper (memcpy+memset) | call graph | low |

| 0x10004060 | 0x00004060 | ObjDB_Index_Sort2 | Sort helper (memcpy+memset) | call graph | low |

| 0x10003D80 | 0x00003D80 | ObjDB_List_Count | Count items in list | bytes | low |

| 0x10003E00 | 0x00003E00 | ObjDB_List_GetHead | Returns head pointer | bytes | low |

| 0x10003E10 | 0x00003E10 | ObjDB_Array_GetPtr3 | Array ptr getter (variant) | bytes | low |

| 0x10003EA0 | 0x00003EA0 | ObjDB_Array_GetPtr5 | Array ptr getter (variant) | bytes | low |

| 0x10004990 | 0x00004990 | ObjDB_Index_Clear | Clears index structs (memset + zero helpers) | call graph | low |

| 0x10004FD0 | 0x00004FD0 | ObjDB_Index_Dtor | Index destructor (clears + delete) | call graph | low |

| 0x10114438 | 0x00114438 | ObjDB_Index_vftable | Index vtable (extends Master vtable) | bytes | low |

| 0x1018C544 | 0x0018C544 | ObjDB_Index_VtblData_04 | Vtable data (unknown) | bytes | low |

| 0x10005000 | 0x00005000 | ObjDB_Master_ProcessTable | Master vfn helper (uses list iterate + index ops) | call graph | low |

| 0x100055B0 | 0x000055B0 | ObjDB_Master_AddIndex_A | Alloc + link index list (uses op_new + list ops) | call graph | low |

| 0x10005660 | 0x00005660 | ObjDB_Master_AddIndex_B | Alloc + link index list (uses op_new + list ops) | call graph | low |

| 0x10005740 | 0x00005740 | ObjDB_Master_RebuildIndexes | Rebuild indexes for tables | call graph | low |



Vtable slots (ObjDB_Index_vftable):

- +0x00 -> 0x10004FD0 ObjDB_Index_Dtor

- +0x04 -> 0x1018C544 ObjDB_Index_VtblData_04 (data)

- +0x08 -> 0x10005A80 ObjDB_Master_Vfn00

- +0x0C -> 0x10005B80 ObjDB_Master_Vfn04

- +0x10 -> 0x10004F00 ObjDB_Master_Vfn08

- +0x14 -> 0x10004E30 ObjDB_Master_Vfn0C

- +0x18 -> 0x10005280 ObjDB_Master_Vfn10

- +0x1C -> 0x100048F0 ObjDB_Master_Vfn14

- +0x20 -> 0x10004890 ObjDB_Master_Vfn18

- +0x24 -> 0x10004DD0 ObjDB_Master_Vfn1C

- +0x28 -> 0x10004950 ObjDB_Master_Vfn20

- +0x2C -> 0x10004250 ObjDB_Master_Vfn24



CRT thunks:

- 0x1010231E thunk__memset -> [0x10113270] memset

- 0x10101F87 thunk__memcpy -> [0x10113298] memcpy



## server.dll (image base 0x10000000)



### Data (command table)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100AC1D0 | 0x000AC1D0 | g_ServerCmdTable | 8 command entries (name, handler, flags) registered at init | memory read + strings | high |
| 0x100AFDFC | 0x000AFDFC | g_ObjDB_Master | Global ObjDB master pointer used by Object.lto load/lookup | decomp + xrefs | low |

Command entries (name -> handler, flags):
- ShowGameVars -> Cmd_ShowGameVars (0x10045F10), 0
- ShowUsedFiles -> Cmd_ShowUsedFiles (0x10045EC0), 0
- world -> Cmd_World (0x10045F80), 0
- objectinfo -> Cmd_ObjectInfo (0x10045FD0), 0
- DisableWMPhysics -> Cmd_DisableWMPhysics (0x10046280), 0
- ExhaustMemory -> Cmd_ExhaustMemory (0x100462C0), 0
- SpawnObject -> Cmd_SpawnObject (0x10046310), 0
- Mem -> Cmd_Mem (0x1007EC90), 0


Command list helpers:

- 0x1003DF50 CmdList_Init

- 0x1003DF30 CmdList_Reset

- 0x1003DAC0 CmdList_DispatchByName
- 0x100465D0 ServerCmdTable_Init
- 0x100532D0 ServerCmdTable_GetList
- 0x100532E0 ServerCmdTable_GetCount
- 0x10055E00 ObjDB_BuildUniqueFileList

### Data (server var table / cvars)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100AD200 | 0x000AD200 | g_ServerVarTable | Static cvar table; entry size 0x14 (ptr0, 0, 0, namePtr, 0) | memory walk + strings | high |

Table entries (name -> entry addr -> ptr0):
- InputDebug -> 0x100AD200 -> 0x100B2FA8
- UpdateRate -> 0x100AD214 -> 0x100B2FB0
- InputRate -> 0x100AD228 -> 0x100ACEF0 (const block)
- ForceRemote -> 0x100AD23C -> 0x100B2FD0
- DebugLevel -> 0x100AD250 -> 0x100B2FD4
- ShowRunningTime -> 0x100AD264 -> 0x100B0E74
- NullRender -> 0x100AD278 -> 0x100B2FD8
- LocalDebug -> 0x100AD28C -> 0x100B2FDC
- TransportDebug -> 0x100AD2A0 -> 0x100B2FE4
- ParseNet_Incoming -> 0x100AD2B4 -> 0x100B2FEC
- ParseNet_Outgoing -> 0x100AD2C8 -> 0x100B2FF0
- ParseNet -> 0x100AD2DC -> 0x100B2FF4
- NetMaxQueue -> 0x100AD2F0 -> 0x100B2FF8
- ClientSleepMS -> 0x100AD304 -> 0x100ACF18 (const block)
- ShowTickCounts -> 0x100AD318 -> 0x100B2FFC
- ShowMemStats -> 0x100AD32C -> 0x100B3000
- Prediction -> 0x100AD340 -> 0x100B3004
- PredictionLines -> 0x100AD354 -> 0x100ACF14 (const block)
- DebugStrings -> 0x100AD368 -> 0x100B2FE8
- DebugPackets -> 0x100AD37C -> 0x100B3008
- DoExtraObjectStuff -> 0x100AD390 -> 0x100B300C
- CollideParticles -> 0x100AD3A4 -> 0x100B3038
- SoundShowCounts -> 0x100AD3B8 -> 0x100ACF10 (const block)
- SoundDebugLevel -> 0x100AD3CC -> 0x100B3018
- ErrorLog -> 0x100AD3E0 -> 0x100B3014
- AlwaysFlushLog -> 0x100AD3F4 -> 0x100B301C

Var table helpers:
- 0x100524B0 VarTable_AddEntry
- 0x100525D0 VarTable_Init
- 0x10046630 ServerCmdTable_Init (calls VarTable_Init)


### Object DB loader / Object.lto hookup
| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100195DA | 0x000195DA | LoadServerObjects | Loads `object.lto` + calls ObjectDLLSetup chain | string refs + call graph | high |

| 0x1004AD60 | 0x0004AD60 | ServerObjects_ObjectDLLSetup | Calls LoadObjectDLL_ByName then continues setup | call graph | med |

| 0x1004AD83 | 0x0004AD83 | ServerObjects_ObjectDLLSetup_Finish | Uses "ObjectDLLSetup" string, finalizes setup | string ref | low |

| 0x100189B0 | 0x000189B0 | LoadObjectDLL_ByName | Uses Dyn_LoadLibraryA/Dyn_LoadLibraryA_OrMsg | call graph | med |

| 0x100189DE | 0x000189DE | Resolve_SetMasterDatabase | Resolves `SetMasterDatabase` export (GetProcAddress) | string ref + call graph | high |

| 0x10034A30 | 0x00034A30 | Server_ThreadLoadTexture | Loads texture via ObjDB; logs missing | decomp | low |

| 0x10034AB0 | 0x00034AB0 | Server_ThreadLoadTexture_Alt | Variant texture load path | decomp | low |



Dynamic loader wrappers:
- 0x1001A5A0 Dyn_LoadLibraryA
  - 0x1001A5A9 Dyn_LoadLibraryA_OrMsg (LoadLibraryA + GetLastError + FormatMessage + MessageBox)

  - 0x1001A627 Dyn_FreeLibrary

  - 0x1001A630 Dyn_GetModuleHandleA

- 0x1001A670 Dyn_GetProcAddress
  - 0x1007CD78 Dyn_LoadLibraryA_3 (IAT thunk -> LoadLibraryA)
  - 0x1007CDB4 Dyn_GetProcAddress_3 (IAT thunk -> GetProcAddress)

### Net update / movement send path (server -> client)
Key call chain (movement replication cadence):
- 0x10045B90 Client_Update -> calls 0x10043250 Server_BuildObjectUpdates
- 0x10043250 Server_BuildObjectUpdates -> builds update bitstream
- 0x10045140 Server_BuildObjectUpdates_Delta -> calls 0x100431C0 UpdateSendToClientState
- 0x100431C0 UpdateSendToClientState -> per-conn update selection (calls ShouldSendToClient @ 0x100410E0)
- 0x10014A30 NetConn_BuildAndSendFrame -> calls:
  - 0x1000D500 NetConn_ShouldSendFrame
  - 0x1000D580 NetConn_UpdateSendInterval (called by CUDPDriver_UpdateConnTick @ 0x10014CF0)
  - 0x1000FB10 NetConn_SendUnguaranteed (movement/unguar stream)
  - 0x10014440 NetConn_SendGuaranteed

Notes:
- Cvar reads for UpdateRate/InputRate are *not* direct xrefs to gCvar_*; likely resolved via VarTable runtime.
- Prime candidates for cvar usage: NetConn_UpdateSendInterval, NetConn_ShouldSendFrame, CUDPDriver_UpdateConnTick.
### IO manager wrappers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1004A7F0 | 0x0004A7F0 | IO_Read_28_32 | Calls IO mgr vtbl+0x10 with this+28/this+32 | decomp | low |

| 0x1004A820 | 0x0004A820 | IO_Write_28_32 | Calls IO mgr vtbl+0x14 with this+28/this+32 | decomp | low |



### ObjDB file-path + entry helpers (no decomp/disasm)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10018DC0 | 0x00018DC0 | ObjDB_Load_ObjectLTO | Loads Object.lto; direct-path or temp-file extract | decomp + temp-file APIs | high |

| 0x1003DA10 | 0x0003DA10 | ObjDB_FindDataFile | Scans/locates data file entry by name | decomp + call graph | med |

| 0x10003B00 | 0x00003B00 | EnumFiles_FindMatch | File enumeration helper (_findfirst/_findnext/_findclose) | import calls | med |

| 0x10003AE0 | 0x00003AE0 | ObjDB_DataFile_IsDirect | Returns data-file type flag (0=extract, 1=direct) | decomp | med |

| 0x10003D70 | 0x00003D70 | ObjDB_DataFile_GetPath | Builds output path for direct entry access | decomp | med |

| 0x10004F70 | 0x00004F70 | File_OpenAndSize | File open/size helper (fopen/ftell) | import calls | med |

| 0x10004250 | 0x00004250 | ObjDB_File_ExtractToPath | Extracts entry to disk path (returns 0 on success) | decomp | med |

| 0x1003D9A0 | 0x0003D9A0 | ObjDB_LoadEntryData | Finds entry + extracts to temp file | decomp | med |

| 0x1003DB10 | 0x0003DB10 | ObjDB_InsertEntry | Inserts entry into DB + notifies instance list | decomp + call graph | med |

| 0x1003DDB0 | 0x0003DDB0 | ObjDB_FindOrAddEntry | Lookup with optional insert (calls ObjDB_InsertEntry) | decomp + call graph | med |

| 0x1003DFF0 | 0x0003DFF0 | ObjDB_FindEntryByName | Thin wrapper (calls ObjDB_FindOrAddEntry) | decomp + call graph | med |

| 0x10003DB0 | 0x00003DB0 | ObjDB_EnumFiles_Next | Enumerates files/entries; handles direct + packed paths | decomp | low |

| 0x10018C60 | 0x00018C60 | FormatSystemError | FormatMessage/LoadString wrapper | import calls | med |

| 0x10003830 | 0x00003830 | FormatString_vsnprintf | vsnprintf wrapper | import call | high |

| 0x1003A520 | 0x0003A520 | sm_CacheFile | Caches file into ObjDB; ILTServer::CacheFile paths | decomp + "sm_CacheFile"/"ILTServer::CacheFile" strings | high |

| 0x10030100 | 0x00030100 | ObjDB_LoadEntryData_G | Wrapper: ObjDB_LoadEntryData(g_ObjDB?, name, path) | decomp | low |

| 0x10031160 | 0x00031160 | CacheFile_Wrapper | Thin wrapper to sm_CacheFile | decomp | low |

| 0x10034E20 | 0x00034E20 | Server_LoadObjectFromScript | Loads object via script, builds args, spawns | decomp | low |



### RezMgr / RezDir (rezmgr.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10080530 | 0x00080530 | CRezItm::GetType | Returns item type (via CRezTyp) | decomp + rezmgr.cpp | med |

| 0x10080A80 | 0x00080A80 | CRezDir::GetFirstSubDir | Returns first subdir in hash table | decomp + rezmgr.cpp | med |

| 0x10080AA0 | 0x00080AA0 | CRezDir::GetNextSubDir | Returns next subdir via hash elem | decomp + rezmgr.cpp | med |

| 0x10080AD0 | 0x00080AD0 | CRezDir::GetFirstType | Returns first resource type in dir | decomp + rezmgr.cpp | med |

| 0x10080AF0 | 0x00080AF0 | CRezDir::GetNextType | Returns next resource type | decomp + rezmgr.cpp | med |

| 0x10080B10 | 0x00080B10 | CRezDir::GetFirstItem | Returns first item in type | decomp + rezmgr.cpp | med |

| 0x10080B30 | 0x00080B30 | CRezDir::GetNextItem | Returns next item in type | decomp + rezmgr.cpp | med |

| 0x10080BB0 | 0x00080BB0 | CRezMgr::StrToType | Converts ASCII extension to rez type | decomp + rezmgr.cpp | med |

| 0x10080C10 | 0x00080C10 | CRezMgr::TypeToStr | Converts rez type to ASCII extension | decomp + rezmgr.cpp | med |

| 0x10080D00 | 0x00080D00 | CRezDir::WriteDirBlock | Writes dir block (types/items) to rez file | decomp + rezmgr.cpp | med |

| 0x10080FF0 | 0x00080FF0 | CRezDir::IsGoodChar | Valid path char check (dir separators or alnum/punct) | decomp + rezmgr.cpp | med |

| 0x10081050 | 0x00081050 | CRezDir::GetDirFromPath | Parses path; recurses into subdirs | disasm + rezmgr.cpp | med |

| 0x10081380 | 0x00081380 | CRezDir::GetDirFromPath_Thunk | Tail-jump thunk to GetDirFromPath | disasm | low |

| 0x10081520 | 0x00081520 | CRezTyp::Dtor | Destroys type: frees items + hash tables | decomp + rezmgr.cpp | med |

| 0x10081760 | 0x00081760 | CRezDir::GetRezFromDosName | Parses DOS name, resolves type + item | decomp + rezmgr.cpp | med |

| 0x10081C60 | 0x00081C60 | CRezDir::WriteAllDirs | Recurses subdirs then writes self dir block | decomp + rezmgr.cpp | med |

| 0x10081CF0 | 0x00081CF0 | CRezDir::GetRezFromDosPath | Splits path into dir + name, resolves | decomp + rezmgr.cpp | med |

| 0x10081E40 | 0x00081E40 | CRezDir::GetRezFromDosPath_Thunk | Tail-jump thunk to GetRezFromDosPath | disasm | low |

| 0x10082100 | 0x00082100 | CRezDir::Dtor | Destroys dir: deletes types/subdirs + frees buffers | decomp + rezmgr.cpp | med |

| 0x10082CB0 | 0x00082CB0 | CRezMgr::Flush | Writes header + dirs to rez file | decomp + rezmgr.cpp | med |

| 0x10083490 | 0x00083490 | CRezMgr::Close | Closes rez file(s), frees root dir + filename | decomp + rezmgr.cpp | med |

| 0x10083590 | 0x00083590 | CRezMgr::Dtor | Destructor; calls Close + frees lists/dirs/separators | decomp + rezmgr.cpp | med |



### RezMgr hash helpers (rezhash.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10083890 | 0x00083890 | CRezItmHashTableByName::Find | String lookup in item name hash table | decomp + rezhash.cpp | med |

| 0x10083960 | 0x00083960 | CRezTypeHashTable::Find | Lookup type in type hash table | decomp + rezhash.cpp | med |

| 0x100839E0 | 0x000839E0 | CRezDirHashTable::Find | String lookup in dir hash table | disasm + rezhash.cpp | med |

| 0x10083A90 | 0x00083A90 | CRezDirHash::HashFunc | Hash dir name (len % bins) | disasm + rezhash.cpp | med |

| 0x10083AC0 | 0x00083AC0 | CRezTypeHash::HashFunc | Hash type (nType % bins) | disasm + rezhash.cpp | med |

| 0x10083AD0 | 0x00083AD0 | CRezItmHashByName::HashFunc | Hash item name (len % bins) | disasm + rezhash.cpp | med |



### BaseHash / BaseList (basehash.cpp / baselist.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10083940 | 0x00083940 | CBaseHashItem::Next_Thunk | Thin jump to CBaseHashItem::Next | disasm | low |

| 0x1008550B | 0x0008550B | __EHFilter_CBaseHash_Ctor | SEH filter helper for CBaseHash::CBaseHash | disasm + EH table | low |

| 0x1008551F | 0x0008551F | __EHEpilog_CBaseHash_Ctor | SEH epilog helper for CBaseHash::CBaseHash | disasm + EH table | low |

| 0x100856F0 | 0x000856F0 | CLTBaseList::InsertFirst | Inserts item at list head | disasm + baselist.cpp | med |

| 0x10085810 | 0x00085810 | CLTBaseList::Delete | Removes item from list (updates first/last) | decomp + baselist.cpp | med |

| 0x10085970 | 0x00085970 | CVirtBaseList::Delete | Removes item from virtual list (updates first/last) | decomp + virtlist.cpp | med |

| 0x100859D0 | 0x000859D0 | CBaseHashItem::Next | Returns next hash item across bins | decomp + basehash.cpp | med |

| 0x10085A80 | 0x00085A80 | CBaseHash::CHashBin::CHashBin | CHashBin ctor (zeros m_lstItems) | disasm + basehash.cpp | med |

| 0x10085A90 | 0x00085A90 | CBaseHash::CHashBin::Dtor | Trivial bin dtor (no-op) | disasm | low |

| 0x10085AA0 | 0x00085AA0 | CBaseHash::Insert | Sets parent/bin + inserts into bin list | decomp + basehash.cpp | med |

| 0x10085AE0 | 0x00085AE0 | CBaseHash::Delete | Removes item from bin list | disasm + basehash.cpp | med |

| 0x10085B10 | 0x00085B10 | CBaseHash::GetFirst | Returns first item in first non-empty bin | decomp + basehash.cpp | med |

| 0x10085B40 | 0x00085B40 | CBaseHash::GetLast | Returns last item in last non-empty bin | disasm + basehash.cpp | med |

| 0x10085B70 | 0x00085B70 | CBaseHash::GetFirstInBin | Returns first item in bin | disasm + basehash.cpp | med |

| 0x10085BA0 | 0x00085BA0 | CBaseHash::CBaseHash | Allocates bins + initializes | disasm + basehash.cpp | med |

| 0x10085CA0 | 0x00085CA0 | CBaseHash::Dtor | Frees bin array | decomp + basehash.cpp | med |



### Physics/Collision API holders (server-side interfaces)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1008CCF0 | 0x0008CCF0 | Init_ILTPhysics_APIHolder_A | Registers ILTPhysics.Server API holder (A) | inline init stub | low |

| 0x1008D7C0 | 0x0008D7C0 | Init_ILTPhysics_APIHolder_B | Registers ILTPhysics.Server API holder (B) | inline init stub | low |

| 0x1008E4A0 | 0x0008E4A0 | Init_ILTCollisionMgr_APIHolder | Registers ILTCollisionMgr.Server API holder | inline init stub | low |

| 0x100B0248 | 0x000B0248 | g_ILTPhysics_APIHolder_A | ILTPhysics API holder instance (A) | init stub ECX | low |

| 0x100B01A0 | 0x000B01A0 | g_pILTPhysics_A | ILTPhysics API pointer (A) | init stub arg | low |

| 0x100B06BC | 0x000B06BC | g_ILTPhysics_APIHolder_B | ILTPhysics API holder instance (B) | init stub ECX | low |

| 0x100B0698 | 0x000B0698 | g_pILTPhysics_B | ILTPhysics API pointer (B) | init stub arg | low |

| 0x100B0E48 | 0x000B0E48 | g_ILTCollisionMgr_APIHolder | CollisionMgr API holder instance | init stub ECX | low |

| 0x100B0D98 | 0x000B0D98 | g_pILTCollisionMgr | CollisionMgr API pointer | init stub arg | low |

| 0x1002F9C0 | 0x0002F9C0 | Get_ILTPhysics_A | Getter stub (mov eax, g_pILTPhysics_A; ret) | bytes | low |



### ILTPhysics API methods (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1002FC30 | 0x0002FC30 | ILTPhysics_GetPing | Returns client ping via client conn vtbl | decomp + "ILTPhysics::GetPing" string | high |

| 0x1002FFE0 | 0x0002FFE0 | ILTPhysics_GetWorldBox | Fetches world bounds via physics mgr vtbl | decomp + "ILTPhysics::GetWorldBox" string | high |

| 0x10030050 | 0x00030050 | ILTPhysics_OpenFile | ObjDB lookup by name; returns entry handle | decomp + "ILTPhysics::OpenFile" string | high |

| 0x10030A50 | 0x00030A50 | ILTPhysics_GetStaticObject | Returns static object pointer from object | decomp + "ILTPhysics::GetStaticObject" string | high |

| 0x10030AE0 | 0x00030AE0 | ILTPhysics_GetObjectClass | Returns object class via server class table | decomp + "ILTPhysics::GetObjectClass" string | high |

| 0x10031270 | 0x00031270 | ILTPhysics_AddObjectToSky | Adds object to sky list | decomp + "ILTPhysics::AddObjectToSky" string | high |

| 0x10031350 | 0x00031350 | ILTPhysics_RemoveObjectFromSky | Removes object from sky list | decomp + "ILTPhysics::RemoveObjectFromSky" string | high |

| 0x100313F0 | 0x000313F0 | ILTPhysics_AttachClient | Attach client to object | decomp + "ILTPhysics::AttachClient" string | high |

| 0x10031450 | 0x00031450 | ILTPhysics_DetachClient | Detach client from object | decomp + "ILTPhysics::DetachClient" string | high |

| 0x100318D0 | 0x000318D0 | ILTPhysics_CreateInterObjectLink | Create inter-object link | decomp + "ILTPhysics::CreateInterObjectLink" string | high |

| 0x10031930 | 0x00031930 | ILTPhysics_RemoveAttachment | Remove attachment from object | decomp + "ILTPhysics::RemoveAttachment" string | high |

| 0x10031A50 | 0x00031A50 | ILTPhysics_FindAttachment | Find attachment by name | decomp + "ILTPhysics::FindAttachment" string | high |

| 0x10031C80 | 0x00031C80 | ILTPhysics_SetObjectUserFlags | Sets object user flags | decomp + "ILTPhysics::SetObjectUserFlags" string | high |

| 0x10031E30 | 0x00031E30 | ILTPhysics_GetObjectScale | Returns object scale | decomp + "ILTPhysics::GetObjectScale" string | high |

| 0x10031F20 | 0x00031F20 | ILTPhysics_TeleportObject | Teleport object (calls internal mover) | decomp + "ILTPhysics::TeleportObject" string | high |

| 0x100321E0 | 0x000321E0 | ILTPhysics_SaveObjects | Save objects to file | decomp + "ILTPhysics::SaveObjects" string | high |

| 0x10032260 | 0x00032260 | ILTPhysics_RestoreObjects | Restore objects from file | decomp + "ILTPhysics::RestoreObjects" string | high |

| 0x10032350 | 0x00032350 | ILTPhysics_GetSessionName | Returns session name string | decomp + "ILTPhysics::GetSessionName" string | high |

| 0x100323B0 | 0x000323B0 | ILTPhysics_GetTcpIpAddress | Returns server IP string | decomp + "ILTPhysics::GetTcpIpAddress" string | high |

| 0x10033B60 | 0x00033B60 | ILTPhysics_CreateAttachment | Create attachment | decomp + "ILTPhysics::CreateAttachment" string | high |

| 0x10033CE0 | 0x00033CE0 | ILTPhysics_GetLastCollision | Returns last collision data | decomp + "ILTPhysics::GetLastCollision" string | high |

| 0x10033DB0 | 0x00033DB0 | ILTPhysics_SetObjectRotation | Set object rotation | decomp + "ILTPhysics::SetObjectRotation" string | high |

| 0x10034060 | 0x00034060 | ILTPhysics_SetObjectRotation2 | Set object rotation (variant) | decomp + "ILTPhysics::SetObjectRotation2" string | high |

| 0x1005CE10 | 0x0005CE10 | ILTPhysics_SetObjectRotation_Internal | Internal rotation update (children/attachments) | decomp + xrefs | low |

| 0x10033ED0 | 0x00033ED0 | ILTPhysics_SetObjectRotation_Wrap0 | Wrapper: ILTPhysics_SetObjectRotation(a1,a2,0) | decomp | low |

| 0x10034040 | 0x00034040 | ILTPhysics_SetObjectRotation_Wrap1 | Wrapper: ILTPhysics_SetObjectRotation(a1,a2,1) | decomp | low |

| 0x100342D0 | 0x000342D0 | ILTPhysics_FindWorldModelObjectIntersections | World-model intersection query | decomp + "ILTPhysics::FindWorldModelObjectIntersections" string | high |

| 0x10035490 | 0x00035490 | ILTPhysics_ThreadLoadFile | Threaded file load | decomp + "ILTPhysics::ThreadLoadFile" string | high |

| 0x10035560 | 0x00035560 | ILTPhysics_UnloadFile | Unload file | decomp + "ILTPhysics::UnloadFile" string | high |

| 0x10066B80 | 0x00066B80 | ILTPhysics_GetForceIgnoreLimit | Returns sqrt(forceIgnoreSq) | decomp + "ILTPhysics::GetForceIgnoreLimit" string | high |

| 0x10066BE0 | 0x00066BE0 | ILTPhysics_SetForceIgnoreLimit | Stores forceIgnoreSq | decomp + "ILTPhysics::SetForceIgnoreLimit" string | high |

| 0x10066CB0 | 0x00066CB0 | ILTPhysics_GetObjectDims | Returns object dims | decomp + "ILTPhysics::GetObjectDims" string | high |

| 0x10066D90 | 0x00066D90 | ILTPhysics_GetStandingOn | Returns standing object + position | decomp + "ILTPhysics::GetStandingOn" string | high |



### ILTModel API methods (modellt_impl.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100573E0 | 0x000573E0 | ILTModel::GetRootNode | Wrapper: calls GetNextNode with INVALID_MODEL_NODE | decomp + modellt_impl.cpp | med |

| 0x10057400 | 0x00057400 | ILTModel::GetParent | Returns parent node for a model node | decomp + "ILTModel::GetParent" string | med |

| 0x10057470 | 0x00057470 | ILTModel::GetChild | Returns nth child node for parent | decomp + "ILTModel::GetChild" string | med |

| 0x100574E0 | 0x000574E0 | ILTModel::GetNumChildren | Returns number of children for node | decomp + "ILTModel::GetNumChildren" string | med |

| 0x10057550 | 0x00057550 | ILTModel::AddNodeControlFn_Node | Add node control fn (node-specific) | decomp + "ILTModel::SetNodeControlFn" string | med |

| 0x100575C0 | 0x000575C0 | ILTModel::AddNodeControlFn_All | Add node control fn (all nodes) | decomp + "ILTModel::SetNodeControlFn" string | med |

| 0x10057630 | 0x00057630 | ILTModel::RemoveNodeControlFn_Node | Remove node control fn (node-specific) | decomp + "ILTModel::SetNodeControlFn" string | med |

| 0x100576B0 | 0x000576B0 | ILTModel::RemoveNodeControlFn_All | Remove node control fn (all nodes) | decomp + "ILTModel::SetNodeControlFn" string | med |

| 0x10057720 | 0x00057720 | ILTModel::GetSocket | Looks up socket by name | decomp + "ILTModel::GetSocket" string | med |

| 0x10057820 | 0x00057820 | ILTModel::GetNode | Looks up node by name | decomp + "ILTModel::GetNode" string | med |

| 0x10057920 | 0x00057920 | ILTModel::GetPiece | Looks up piece by name | decomp + "ILTModel::GetPiece" string | med |

| 0x10057A30 | 0x00057A30 | ILTModel::FindWeightSet | Looks up weight set by name (FN_NAME uses GetWeightSet) | decomp + "ILTModel::GetWeightSet" string | med |

| 0x10057B40 | 0x00057B40 | ILTModel::GetPieceHideStatus | Reads hidden flag for piece (bitfield) | decomp + "ILTModel::GetPieceHideStatus" string | med |

| 0x10057BC0 | 0x00057BC0 | ILTModel::SetPieceHideStatus | Sets hidden flag for piece (bitfield) | decomp + "ILTModel::SetPieceHideStatus" string | med |

| 0x10057C60 | 0x00057C60 | ILTModel::HideAllPieces | Sets all piece hidden bits | decomp + "ILTModel::HideAllPieces" string | med |

| 0x10057CD0 | 0x00057CD0 | ILTModel::UnHideAllPieces | Clears all piece hidden bits | decomp + "ILTModel::UnHideAllPieces" string | med |

| 0x10057D40 | 0x00057D40 | ILTModel::GetHiddenPieces | Returns hidden pieces bitfields | decomp + "ILTModel::GetHiddenPieces" string | med |

| 0x10057DB0 | 0x00057DB0 | ILTModel::GetNodeTransform | Returns node transform (LTransform) | decomp + "ILTModel::GetNodeTransform" string | med |

| 0x10057E20 | 0x00057E20 | ILTModel::GetNodeTransform_Matrix | Internal wrapper to ModelInstance::GetNodeTransform (LTMatrix) | decomp + objectmgr.cpp (LTMatrix overload) | low |

| 0x10057E90 | 0x00057E90 | ILTModel::SetupTransform | Calls LTObject::SetupTransform | decomp + "ILTModel::SetupTransform" string | med |

| 0x10057F50 | 0x00057F50 | ILTModel::GetSocketTransform | Returns socket transform (LTransform) | decomp + "ILTModel::GetSocketTransform" string | med |

| 0x10057FC0 | 0x00057FC0 | ILTModel::GetSocketTransform_Matrix | Internal wrapper to ModelInstance::GetSocketTransform (LTMatrix) | decomp + objectmgr.cpp (LTMatrix overload) | low |

| 0x10057EF0 | 0x00057EF0 | ILTModel::ApplyAnimations | Forces cached transform update on model (ForceUpdateCachedTransforms) | disasm + "ILTModel::ApplyAnimations" string | med |

| 0x10058030 | 0x00058030 | ILTModel::UpdateMainTracker | Updates main tracker (ms delta) if model not paused | disasm + modellt_impl.cpp | med |

| 0x100580E0 | 0x000580E0 | ILTModel::GetMainTracker | Returns MAIN_TRACKER (0xFF) | disasm + modellt_impl.cpp | med |

| 0x100580F0 | 0x000580F0 | ILTModel::GetPlaybackState | Returns playback flags for tracker | disasm + modellt_impl.cpp | med |

| 0x10058170 | 0x00058170 | ILTModel::GetAnimIndex | Finds animation index by name | disasm + modellt_impl.cpp | med |

| 0x100581E0 | 0x000581E0 | ILTModel::GetCurAnim | Returns current anim for tracker | disasm + modellt_impl.cpp | med |

| 0x10058250 | 0x00058250 | ILTModel::SetCurAnim | Sets current anim for tracker | disasm + modellt_impl.cpp | med |

| 0x10058320 | 0x00058320 | ILTModel::ResetAnim | Resets tracker animation state | disasm + modellt_impl.cpp | med |

| 0x100583E0 | 0x000583E0 | ILTModel::SetTrackerInterpolation | Sets tracker interpolation flag | disasm | low |

| 0x10058440 | 0x00058440 | ILTModel::GetLooping | Returns looping state for tracker | disasm + modellt_impl.cpp | med |

| 0x100584B0 | 0x000584B0 | ILTModel::SetLooping | Sets looping state for tracker | disasm + modellt_impl.cpp | med |

| 0x10058530 | 0x00058530 | ILTModel::GetPlaying | Returns playing state for tracker | disasm + modellt_impl.cpp | med |

| 0x100585A0 | 0x000585A0 | ILTModel::SetPlaying | Sets playing state for tracker | disasm + modellt_impl.cpp | med |

| 0x10058620 | 0x00058620 | ILTModel::GetCurAnimTime | Returns current anim time for tracker | disasm + modellt_impl.cpp | med |

| 0x10058690 | 0x00058690 | ILTModel::SetCurAnimTime | Sets current anim time for tracker | disasm + modellt_impl.cpp | med |

| 0x10058750 | 0x00058750 | ILTModel::SetHintNode | Sets hint node on tracker (FN_NAME uses SetCurAnimTime) | disasm + modellt_impl.cpp | med |

| 0x100587C0 | 0x000587C0 | ILTModel::SetAnimRate | Sets animation rate for tracker | disasm + modellt_impl.cpp | med |

| 0x10058860 | 0x00058860 | ILTModel::GetAnimRate | Returns animation rate for tracker | disasm + modellt_impl.cpp | med |

| 0x100588D0 | 0x000588D0 | ILTModel::GetWeightSet | Returns weight set for tracker | disasm + modellt_impl.cpp | med |

| 0x10058930 | 0x00058930 | ILTModel::SetWeightSet | Sets weight set for tracker | disasm + modellt_impl.cpp | med |

| 0x100589E0 | 0x000589E0 | ILTModel::GetNumLODs | Returns num LODs for model piece | disasm + modellt_impl.cpp | med |

| 0x10058A50 | 0x00058A50 | ILTModel::GetNumModelOBBs | Returns num collision OBBs for model | disasm + modellt_impl.cpp | med |

| 0x10058AB0 | 0x00058AB0 | ILTModel::GetModelOBBCopy | Copies model OBBs to output array | disasm + modellt_impl.cpp | med |

| 0x10058B10 | 0x00058B10 | ILTModel::UpdateModelOBB | Updates model OBBs from user data | disasm + modellt_impl.cpp | med |

| 0x10058B70 | 0x00058B70 | ILTModel::ApplyModelDrawDistCvars | Scales model draw distance by ModelDrawDistMultiplier; clamps to MinModelDrawDist | disasm + cvar refs | low |

| 0x10058C10 | 0x00058C10 | ILTModel::GetNextNode | Iterates model nodes (error string says GetNextModelNode) | decomp + modellt_impl.cpp | med |

| 0x10058C90 | 0x00058C90 | ILTModel::GetNumNodes | Returns number of nodes | decomp + modellt_impl.cpp | med |

| 0x10058D00 | 0x00058D00 | ILTModel::GetNumPieces | Returns number of model pieces (FN_NAME uses GetPiece) | disasm + modellt_impl.cpp | med |

| 0x10058D70 | 0x00058D70 | ILTModel::AddTracker | Adds animation tracker | decomp + modellt_impl.cpp | med |

| 0x10058EA0 | 0x00058EA0 | ILTModel::RemoveTracker | Removes animation tracker | decomp + modellt_impl.cpp | med |

| 0x10058FB0 | 0x00058FB0 | ILTModel::GetNodeName | Copies node name into buffer | disasm + modellt_impl.cpp | med |

| 0x10059070 | 0x00059070 | ILTModel::GetBindPoseNodeTransform | Copies bind-pose node transform | disasm + modellt_impl.cpp | med |

| 0x10059100 | 0x00059100 | ILTModel::GetAnimLength | Returns anim length by anim index | disasm + modellt_impl.cpp | med |

| 0x10059200 | 0x00059200 | ILTModel::GetCurAnimLength | Returns anim length by tracker | disasm + modellt_impl.cpp | med |



### CLTModelServer (server_iltmodel.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1003EAB0 | 0x0003EAB0 | CLTModelServer::SetPieceHideStatus | Sets hidden state for model piece; sets object change flags | disasm + call flow | med |

| 0x1003EAF0 | 0x0003EAF0 | CLTModelServer::AddTracker | Adds animation tracker; sets object change flags | disasm + call flow | med |

| 0x1003EB20 | 0x0003EB20 | CLTModelServer::RemoveTracker | Removes animation tracker; sets object change flags | disasm + call flow | med |

| 0x1003EB50 | 0x0003EB50 | CLTModelServer::SetLooping | Sets looping state; sets object change flags | disasm + "CLTModelServer::SetLooping" string | high |

| 0x1003EBE0 | 0x0003EBE0 | CLTModelServer::SetPlaying | Sets playing state; sets object change flags | disasm + "CLTModelServer::SetPlaying" string | high |

| 0x1003EC70 | 0x0003EC70 | CLTModelServer::SetCurAnimTime | Sets current anim time; sets object change flags | disasm + "CLTModelServer::SetCurAnimTime" string | high |

| 0x1003ED50 | 0x0003ED50 | CLTModelServer::SetAnimRate | Sets animation rate; sets object change flags | disasm + "CLTModelServer::SetAnimRate" string | high |

| 0x1003EE20 | 0x0003EE20 | CLTModelServer::SetCurAnim | Sets current animation; sets object change flags | disasm + "CLTModelServer::SetCurAnim" string | high |

| 0x1003EF00 | 0x0003EF00 | CLTModelServer::ResetAnim | Resets animation; sets object change flags | disasm + "CLTModelServer::ResetAnim" string | high |

| 0x1003EFD0 | 0x0003EFD0 | CLTModelServer::SetTrackerInterpolation | Sets tracker interpolation | disasm + "CLTModelServer::SetTrackerInterpolation" string | high |

| 0x1003F090 | 0x0003F090 | CLTModelServer::SetWeightSet | Sets weight set; sets object change flags | disasm + "CLTModelServer::SetWeightSet" string | high |

| 0x1003F160 | 0x0003F160 | CLTModelServer::CacheModelDB | Caches model DB; returns handle | disasm + model-rez calls | med |

| 0x1003F1B0 | 0x0003F1B0 | CLTModelServer::UncacheModelDB | Uncaches model DB handle | disasm + model-rez calls | med |

| 0x1003F1F0 | 0x0003F1F0 | CLTModelServer::IsModelDBLoaded | Checks if model DB handle is loaded | disasm + model-rez calls | med |

| 0x1003F220 | 0x0003F220 | CLTModelServer::AddChildModelDB | Adds child model DB and updates model rez | disasm + "CLTModelServer::AddChildModelDB" string | med |

| 0x1003F320 | 0x0003F320 | CLTModelServer::GetFilenames | Fills model + skin filenames using server_filemgr | disasm + "CLTModelServer::GetFilenames" string | high |

| 0x1003F3D0 | 0x0003F3D0 | CLTModelServer::GetModelDBFilename | Copies model DB filename from model instance | disasm + "CLTModelServer::GetModelDBFilename" string | high |

| 0x1003F470 | 0x0003F470 | CLTModelServer::GetSkinFilename | Copies skin filename by index (<=0x20) | disasm + "CLTModelServer::GetSkinFilename" string | high |

| 0x1003F520 | 0x0003F520 | CLTModelServer::Ctor | Sets vtbl ptr to CLTModelServer vtable | disasm | low |

| 0x1003F530 | 0x0003F530 | CLTModelServer::_InterfaceImplementation | Returns \"CLTModelServer\" | disasm + string | low |



### World model / transform helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10059AF0 | 0x00059AF0 | WorldModel_UpdateTransforms | Builds RT/Inverse matrices and applies to model data | decomp | low |

| 0x10069360 | 0x00069360 | WorldModel_BuildRTAndInverse | Builds RT/Inverse matrices from object transforms | decomp | low |

| 0x100685E0 | 0x000685E0 | WorldModel_ApplyTransform | Applies RT transform to model data arrays | decomp | low |

| 0x1005A530 | 0x0005A530 | WorldModel_RefreshTransforms | Builds RT/Inverse then updates model data (type 2/9) | decomp | low |



### ILTServer/CLTServer API methods (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1002FC30 | 0x0002FC30 | ILTServer_GetClientPing | Fetch client ping | decomp + "ILTServer::GetClientPing" string | high |

| 0x1002FCD0 | 0x0002FCD0 | ILTServer_GetClientAddr | Fetch client IP/port into buffers | decomp + "ILTServer::GetClientAddr" string | high |

| 0x1002FF00 | 0x0002FF00 | CLTServer_GetHPolyObject | Resolve HPoly to object | decomp + "CLTServer::GetHPolyObject" string | med |

| 0x10033590 | 0x00033590 | CLTServer_FindObjectsByNameAndClass | Finds objects by name+class into list | decomp + "CLTServer::FindObjectsByNameAndClass" string | high |

| 0x100337C0 | 0x000337C0 | CLTServer_SetObjectSFXMessage | Sends SFX message to object | decomp + "CLTServer::SetObjectSFXMessage" string | high |

| 0x10034CD0 | 0x00034CD0 | CLTServer_SendSFXMessage | Sends SFX message | decomp + "CLTServer::SendSFXMessage" string | high |

| 0x10031760 | 0x00031760 | ILTServer_KickClient | Marks client for kick | decomp + "ILTServer::KickClient" string | high |

| 0x100317F0 | 0x000317F0 | ILTServer_SetClientViewPos | Sets client view position | decomp + "SetClientViewPos" string | med |

| 0x10035480 | 0x00035480 | Init_ILTServer_API_vtbl | Populates ILTServer vtbl slots | decomp | low |

| 0x1002FE30 | 0x0002FE30 | GetNetFlags | Reads net flags from object | decomp + "GetNetFlags" string | med |

| 0x1002FE90 | 0x0002FE90 | SetNetFlags | Writes net flags to object | decomp + "SetNetFlags" string | med |

| 0x10063740 | 0x00063740 | ILTServer_RemoveAttachment | Removes attachment by name/id from object | disasm + "ILTServer::RemoveAttachment" string | high |

| 0x100336E0 | 0x000336E0 | ILTServer_SendToObject | Sends packet stream to object | decomp + "ILTServer::SendToObject" string | high |

| 0x10033890 | 0x00033890 | ILTServer_SendToServer | Sends packet stream to server | decomp + "ILTServer::SendToServer" string | high |

| 0x10056030 | 0x00056030 | ILTServer_GetAttachmentByIndex | Returns attachment pointer by index (obj+556 data) | vtbl slot +0x138 | low |



### Server data / object manager helpers (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1003AB80 | 0x0003AB80 | sm_CreateServerData | Alloc/init server data struct; insert into list | decomp + "sm_CreateServerData" string | high |

| 0x1003B400 | 0x0003B400 | sm_CreateNewID | Alloc new object ID entry | decomp + "sm_CreateNewID" string | high |

| 0x1003B5E0 | 0x0003B5E0 | sm_AllocateID | Alloc/reuse object ID entry | decomp + "sm_AllocateID" string | high |

| 0x1003B8D0 | 0x0003B8D0 | sm_AddObjectToWorld | Creates object + server data + registers | decomp + "sm_AddObjectToWorld" string | high |

| 0x1003A760 | 0x0003A760 | sm_RemoveObjectFromWorld | Removes object + frees server data | decomp + "sm_RemoveObjectFromWorld" string | high |

| 0x1005A870 | 0x0005A870 | Obj_DetachFromParent | Unlinks object from parent/attach list | decomp | low |

| 0x1005A8B0 | 0x0005A8B0 | Obj_DetachAllChildren | Detaches all children from object list | decomp | low |

| 0x1005A900 | 0x0005A900 | Obj_AttachToParent | Links object into parent attach list | decomp | low |

| 0x1003BB90 | 0x0003BB90 | Server_CreateObject_Internal | Creates object instance and adds to world if needed | decomp | low |

| 0x1003BC50 | 0x0003BC50 | Server_SpawnWorldObjects | Spawns world objects for "MainWorld" | decomp | low |

| 0x1003C240 | 0x0003C240 | Server_RemoveWorldObjects | Removes world objects (optional flag to force remove) | decomp | low |

| 0x1003C450 | 0x0003C450 | Server_ResetWorld | Clears world state, client links, sounds, models | decomp | low |

| 0x1003CC70 | 0x0003CC70 | Server_InitSprite | Loads sprite entry; falls back to default.spr | decomp | low |

| 0x1003CD10 | 0x0003CD10 | Server_LoadChildModels | Loads and attaches child models from list | decomp | low |

| 0x1003CDA0 | 0x0003CDA0 | Server_InitModelObject | Loads model; falls back to models\\default.ltb | decomp | low |

| 0x1003CE70 | 0x0003CE70 | Server_InitModelSkin | Loads model skin; falls back to skins\\default.dtx | decomp | low |

| 0x1003CF30 | 0x0003CF30 | Server_InitModelRenderStyle | Loads renderstyle; falls back to RenderStyles\\default.ltb | decomp | low |

| 0x1003CFF0 | 0x0003CFF0 | Server_InitModelResources | Loads model + skins + renderstyles + child models | decomp | low |

| 0x1003D070 | 0x0003D070 | Model_UnbindIfValid | Unbinds model instance if non-null | decomp | low |

| 0x1003D090 | 0x0003D090 | Obj_InitSpriteFromTemplate | Clears sprite IDs then loads sprite from template | decomp | low |

| 0x1003D130 | 0x0003D130 | Obj_InitByType_Dispatch | Dispatch init based on obj type table | decomp | low |

| 0x1003D1C0 | 0x0003D1C0 | Obj_CleanupByType_Dispatch | Dispatch cleanup based on obj type table | decomp | low |

| 0x100408E0 | 0x000408E0 | Server_DispatchEventAtPos | Builds event struct and dispatches at position | decomp | low |

| 0x10040970 | 0x00040970 | ObjNode_ClearPendingListNode | Clears pending list node (moves node to list 1744 if set) | decomp | low |

| 0x100409B0 | 0x000409B0 | Obj_GetLinkedObj | Returns linked object based on flags (0x8/0x800) | decomp | low |

| 0x10040A60 | 0x00040A60 | Obj_UpdateStateTimer | Updates per-object state timer; sets update flag | decomp | low |

| 0x10040CE0 | 0x00040CE0 | Obj_UpdateAttachment | Updates attachment position/flags; uses Obj_GetLinkedObj | decomp | low |

| 0x10040FE0 | 0x00040FE0 | Obj_IsValidForUpdate | Checks object flags/state for update eligibility | decomp | low |

| 0x100410E0 | 0x000410E0 | ShouldSendToClient | Determines if object should be sent to client | decomp + s_client.cpp | med |

| 0x10041150 | 0x00041150 | Obj_ApplyWorldModelFlags | Applies per-object world model flags to obj table | decomp | low |

| 0x10040990 | 0x00040990 | GetFloat_Offset9 | Returns float at +9 (used by Obj_UpdateAttachment) | decomp | low |

| 0x100409A0 | 0x000409A0 | GetByte_Offset20 | Returns byte at +20 (used by Obj_ApplyWorldModelFlags) | decomp | low |

| 0x100409D0 | 0x000409D0 | AddSoundTrackToChangeList | Adds soundtrack to changed list (soundtrack.cpp) | decomp | low |

| 0x10040A40 | 0x00040A40 | CSoundTrack_AddRef | Adds client ref if eligible (soundtrack.cpp) | decomp | low |

| 0x10041220 | 0x00041220 | Obj_ClearWorldModelFlags | Clears world model flag field for all entries | decomp | low |

| 0x10041270 | 0x00041270 | Server_WriteUpdateHeader | Writes update header (ids + time) to bitstream | decomp | low |

| 0x100412C0 | 0x000412C0 | Obj_IsUpdateableViaVtbl | Calls object vtbl+0 to determine update eligibility | decomp | low |

| 0x10041470 | 0x00041470 | ServerMgr_GetClientFromId | Finds client by client ID in server client list | decomp | med |

| 0x100414B0 | 0x000414B0 | Obj_SetFlag10_All | Sets obj flag 0x10 for all objects in list 1572 | decomp | low |

| 0x100414F0 | 0x000414F0 | Obj_RemoveFromSlotList | Removes object from slot list; updates flags | decomp | low |

| 0x10041560 | 0x00041560 | sm_GetClientFileIDInfo | Gets/creates FileIDInfo for client hash table | decomp + s_client.cpp | med |

| 0x10041760 | 0x00041760 | Vector12_ThrowLengthError | std::vector length_error (12-byte elements) | decomp | low |

| 0x100417E0 | 0x000417E0 | Vector8_ThrowLengthError | std::vector length_error (8-byte elements) | decomp | low |

| 0x1004B750 | 0x0004B750 | Vector_ThrowLengthError | std::vector length_error ("vector<T> too long") | decomp | low |

| 0x1005D3A0 | 0x0005D3A0 | Deque_ThrowLengthError | std::deque length_error ("deque<T> too long") | decomp | low |

| 0x10041980 | 0x00041980 | Vector12_Alloc | std::vector allocator (12-byte elements) | decomp | low |

| 0x1004B9B0 | 0x0004B9B0 | Vector12_Alloc_Vec3 | Duplicate Vector12_Alloc used by Vec3Array_InsertN | decomp | low |

| 0x100419E0 | 0x000419E0 | Vector8_Alloc | std::vector allocator (8-byte elements) | decomp | low |

| 0x1005D540 | 0x0005D540 | Deque_Alloc | std::deque allocator (4-byte elements) | decomp | low |

| 0x10060B20 | 0x00060B20 | Deque_GrowMap | std::deque map growth/realloc | decomp | low |

| 0x10060CD0 | 0x00060CD0 | Deque_PushBack | std::deque push_back (allocates block if needed) | decomp | low |

| 0x10041F30 | 0x00041F30 | WriteUnguaranteedInfo | Writes unguaranteed update info for object (pos/rot/anim) | decomp | med |

| 0x10042050 | 0x00042050 | WriteUnguaranteedDataWithAttachments | Writes unguaranteed info for object + eligible attachments | decomp | med |

| 0x10042200 | 0x00042200 | DwordTriple_FillRange | Fills [begin,end) with dword triplet | decomp | low |

| 0x10042230 | 0x00042230 | DwordPair_FillRange | Fills [begin,end) with dword pair | decomp | low |

| 0x100423D0 | 0x000423D0 | DwordTriple_CopyRange | Copies dword triplets [begin,end) | decomp | low |

| 0x10042410 | 0x00042410 | DwordPair_CopyRange | Copies dword pairs [begin,end) | decomp | low |

| 0x100425B0 | 0x000425B0 | DwordTriple_CopyBackward | Copies dword triplets backward | decomp | low |

| 0x100425E0 | 0x000425E0 | DwordPair_CopyBackward | Copies dword pairs backward | decomp | low |

| 0x10042620 | 0x00042620 | DwordTriple_Fill | Fills N triplets with value | decomp | low |

| 0x10042660 | 0x00042660 | DwordPairArray_Fill | Fills array of dword pairs with a repeated pair | decomp | low |

| 0x100426D0 | 0x000426D0 | Heap12_InsertByKey | Inserts 12-byte entry into heap ordered by float key | decomp | low |

| 0x10042750 | 0x00042750 | Heap8_InsertByKey | Inserts 8-byte entry into heap ordered by float key | decomp | low |

| 0x100427C0 | 0x000427C0 | Heap12_SiftDownThenInsert | Sifts down then inserts 12-byte entry (min-heap by float key) | decomp | low |

| 0x10042870 | 0x00042870 | Heap8_SiftDownThenInsert | Sifts down then inserts 8-byte entry (min-heap by float key) | decomp | low |

| 0x10042960 | 0x00042960 | sm_SendCacheListSection | Sends a preload cache list section (msg id 19 + file-id list) | decomp | med |

| 0x10042A90 | 0x00042A90 | sm_SendCacheListToClient | Sends preload cache list sections (sprites/textures/sounds) | decomp | med |

| 0x10042AD0 | 0x00042AD0 | sm_TellClientToPreloadStuff | Tells client to preload (cache list + sound list + PRELOADTYPE_END) | decomp | med |

| 0x10042CA0 | 0x00042CA0 | Client_ClearStateAndNotify | Clears client state + sends msg id 5 | decomp | low |

| 0x10042D90 | 0x00042D90 | Client_ClearObjectLink | Clears client object link + sends msg id 7 | decomp | low |

| 0x10042EA0 | 0x00042EA0 | Client_ClearAllObjectLinks | Clears all object links for client list | decomp | low |

| 0x10042ED0 | 0x00042ED0 | sm_TracePacket | Writes packet.trc trace when packettrace enabled | decomp | low |

| 0x10043030 | 0x00043030 | Client_SendPacketIfNotEmpty | Sends packet if bitstream length > 8 | decomp | low |

| 0x10043070 | 0x00043070 | sm_AddObjectChangeInfo | Marks CF_SENTINFO, fills packet, adds id to sent list | decomp + s_client.cpp | med |

| 0x100431C0 | 0x000431C0 | UpdateSendToClientState | Adds object + attachment change info for client updates | decomp | med |

| 0x10043250 | 0x00043250 | Server_BuildObjectUpdates | Builds object update packet (flags/timers) | decomp | low |

| 0x10043410 | 0x00043410 | Server_SendConfigToClient | Sends server config/slot list to client | decomp | low |

| 0x10043530 | 0x00043530 | Server_SendClientViewInfo | Sends view/orientation info to client (msg id 22) | decomp | low |

| 0x10043A00 | 0x00043A00 | sm_UpdatePuttingInWorld | Advances client world-entry state; calls OnClientEnterWorld and sends config | decomp | med |

| 0x10043C70 | 0x00043C70 | Client_SendInitMessages | Sends init messages (names + config) to client | decomp | low |

| 0x10043FF0 | 0x00043FF0 | Client_SetState | Sets client state; may send init messages | decomp | low |

| 0x10044040 | 0x00044040 | Client_UpdateState | Advances state (1->3 or 2->...) and syncs | decomp | low |

| 0x10044090 | 0x00044090 | DwordTriple_FillN_ReturnEnd | Fill N triplets, return end | decomp | low |

| 0x100440E0 | 0x000440E0 | DwordPair_FillN_ReturnEnd | Fill N pairs, return end | decomp | low |

| 0x10044840 | 0x00044840 | DwordTriple_CopyRange_Wrap | Wrapper over DwordTriple_CopyRange | decomp | low |

| 0x10044870 | 0x00044870 | DwordPair_CopyRange_Wrap | Wrapper over DwordPair_CopyRange | decomp | low |

| 0x100449F0 | 0x000449F0 | Vector12_Insert | std::vector insert (12-byte elements) | decomp | low |

| 0x10044C80 | 0x00044C80 | Vector8_Insert | std::vector insert (8-byte elements) | decomp | low |

| 0x10044F10 | 0x00044F10 | Vector12_InsertAt | std::vector insert at position (12-byte elements) | decomp | low |

| 0x10044FC0 | 0x00044FC0 | Vector12_PushBack | std::vector push_back (12-byte elements) | decomp | low |

| 0x10040F90 | 0x00040F90 | Client_UpdateMsgQueue | Updates per-client message queue using server delta time | decomp | low |

| 0x10044630 | 0x00044630 | Client_Destroy | Clears links/state, removes from lists, frees client | decomp | low |

| 0x10045140 | 0x00045140 | Server_BuildObjectUpdates_Delta | Builds delta update list by priority | decomp | low |

| 0x10045600 | 0x00045600 | Server_BuildObjectUpdates_Prioritized | Builds prioritized updates; handles budget window | decomp | low |

| 0x10045B90 | 0x00045B90 | Client_Update | Per-client update tick; builds packets + sends | decomp | low |

| 0x10045E60 | 0x00045E60 | StringArray_FindIndex | Finds string in array of 32-byte entries; returns index | decomp | low |

| 0x100462D0 | 0x000462D0 | GlobalList_Reset | Jump to global list reset routine | decomp | low |

| 0x100462E0 | 0x000462E0 | GlobalList_ApplyWithResult | Calls global list apply; returns result | decomp | low |

| 0x100464E0 | 0x000464E0 | Server_BroadcastNamePair | Broadcasts name pair (msg id 15) | decomp | low |

| 0x100465C0 | 0x000465C0 | Server_BroadcastNamePair_Wrap | Wrapper around Server_BroadcastNamePair | decomp | low |

| 0x100465D0 | 0x000465D0 | ServerCmdTable_Init | Initializes command table + callbacks | decomp | low |

| 0x10046640 | 0x00046640 | Server_SendPingToClient | Sends ping via server net manager | decomp | low |

| 0x100466C0 | 0x000466C0 | Client_ReadObjectUpdateIds | Reads update IDs and refreshes timers | decomp | low |

| 0x10046730 | 0x00046730 | Client_ReadObjectUpdateHeader | Reads update header + dispatches ID list | decomp | low |

| 0x10046790 | 0x00046790 | Client_Disconnect | Disconnects client via net mgr (reason 5) | decomp | low |

| 0x100467C0 | 0x000467C0 | Client_ReadAckFlag | Reads ack flag and updates client state | decomp | low |

| 0x100467F0 | 0x000467F0 | Client_ReadBlob | Reads blob (u16 size + data) into client buffer | decomp | low |

| 0x10046B90 | 0x00046B90 | Server_BroadcastPacketWindow | Sends packet window to all clients | decomp | low |

| 0x10046BE0 | 0x00046BE0 | Server_SendPacketWindow_ToClientAndLinks | Sends packet window to client and optionally linked clients | decomp | low |

| 0x10046F00 | 0x00046F00 | GetSoundFileIDInfoFlags | Updates FileIDInfo change flags from current values | decomp + s_net.cpp | med |

| 0x10047830 | 0x00047830 | WriteAnimInfo | Writes model animation tracker info to packet | decomp + s_net.cpp | med |

| 0x10047A70 | 0x00047A70 | FillPacketFromInfo | Fills update packet from ObjInfo flags and object state | decomp + s_net.cpp | med |

| 0x100472B0 | 0x000472B0 | FillInPlaysoundMessage | Builds play-sound event subpacket | decomp | med |

| 0x10047550 | 0x00047550 | FillSoundTrackPacketFromInfo_Internal | Builds soundtrack update subpacket | decomp | med |

| 0x10047FF0 | 0x00047FF0 | Client_ExecCommandString | Reads command string from packet and dispatches via global list | decomp | low |

| 0x10048070 | 0x00048070 | Client_DispatchPacketWindow | Builds packet window and dispatches to handler (dword_100B0900) | decomp | low |

| 0x10048160 | 0x00048160 | BitStream_AppendBuiltBlock | Builds block via FillSoundTrackPacketFromInfo_Internal and appends to writer | decomp | low |

| 0x10048250 | 0x00048250 | BitStream_AppendBuiltBlock2 | Builds block via FillInPlaysoundMessage and appends to writer | decomp | low |

| 0x10048350 | 0x00048350 | ProcessIncomingPacket | Dispatches incoming packet to server handler | decomp | med |

| 0x10048480 | 0x00048480 | NetMgr_ProcessPackets_Type2 | Processes incoming packets of type 2 (loop) | decomp | low |

| 0x10048580 | 0x00048580 | ClientPacketHandlers_Init | Initializes client packet handler table | decomp | low |

| 0x10048660 | 0x00048660 | Quat_FromMatrix | Builds quaternion from 3x3 matrix | decomp | low |

| 0x10048860 | 0x00048860 | Vec3Info_Init | Initializes vec3 info + formats \"x y z\" string | decomp | low |

| 0x10048910 | 0x00048910 | ValueFmt_InitFloat | Initializes value formatter from float | decomp | low |

| 0x10048990 | 0x00048990 | ValueFmt_InitInt | Initializes value formatter from int | decomp | low |

| 0x100489F0 | 0x000489F0 | ValueFmt_InitBool | Initializes value formatter from bool | decomp | low |

| 0x10048A70 | 0x00048A70 | ServerStringKeyCallback | Parses model string keys and dispatches MID_MODELSTRINGKEY | decomp + s_object.cpp | med |

| 0x10048B20 | 0x00048B20 | ServerObj_IsInList_364 | True if object is linked in list at +364 | decomp | low |

| 0x10048B60 | 0x00048B60 | Obj_BuildUpdateFlags | Builds update bitmask from object state | decomp | low |

| 0x10048C50 | 0x00048C50 | Server_FindNodeById_1744 | Finds node in list 1744 by id | decomp | low |

| 0x10048C90 | 0x00048C90 | Server_ClearList_1788 | Clears list at +1788 and frees nodes | decomp | low |

| 0x10048CE0 | 0x00048CE0 | Server_FindEntryByU16_1788 | Finds entry in list 1788 by u16 id | decomp | low |

| 0x10048D20 | 0x00048D20 | Server_RemoveMarkedObjects_1772 | Removes marked objects from list 1772 | decomp | low |

| 0x10048D70 | 0x00048D70 | Obj_IsUpdateCandidate | Returns true if object eligible for updates | decomp | low |

| 0x10048DB0 | 0x00048DB0 | Obj_GetUpdateCode_Default | Default update code (returns 3) | decomp | low |

| 0x10048DC0 | 0x00048DC0 | Server_AddObjToList_1824 | Adds object to list 1824 if server flag set | decomp | low |

| 0x10048E10 | 0x00048E10 | Pool_AllocItem | Allocates item from pool and initializes | decomp | low |

| 0x10048E70 | 0x00048E70 | Pool_FreeItem | Returns item to pool after cleanup | decomp | low |

| 0x10048EE0 | 0x00048EE0 | Std_ThrowLengthError | Throws std::length_error(\"vector<T> too long\") | decomp | low |

| 0x10048FE0 | 0x00048FE0 | AllocChecked | Allocates with overflow check; throws bad_alloc | decomp | low |

| 0x10049160 | 0x00049160 | Quat_FromEuler | Builds quaternion from Euler angles | decomp | low |

| 0x10049290 | 0x00049290 | GetPhysicsVector | Computes physics delta for object (container influences + CalcMotion) | decomp + s_object.cpp | med |

| 0x100493D0 | 0x000493D0 | Obj_RefreshUpdateState | Updates per-object state based on eligibility | decomp | low |

| 0x10049410 | 0x00049410 | AddObjectToRemoveList | Queues object for removal and sets remove flag | decomp + s_object.cpp | med |

| 0x10049490 | 0x00049490 | Server_ClearList_1640 | Removes objects in list 1640 and frees nodes | decomp | low |

| 0x10049500 | 0x00049500 | Obj_SetUpdateState_18 | Sets obj state bits (0x18) and relinks lists | decomp | low |

| 0x100496E0 | 0x000496E0 | Mem_FillByte | Fills byte range with value | decomp | low |

| 0x10049780 | 0x00049780 | Server_GetObjByIndex_1804 | Returns object ptr from table if valid | decomp | low |

| 0x100497B0 | 0x000497B0 | Server_GetEntryById_1804 | Returns entry pointer from table by id | decomp | low |

| 0x100497E0 | 0x000497E0 | Server_SetObjectChangeFlags | Sets object change flags; logs on failure | decomp | low |

| 0x10049950 | 0x00049950 | Mem_MoveRangeTail | memmove_s wrapper for tail shift | decomp | low |

| 0x100499D0 | 0x000499D0 | PhysicsUpdateObject | Applies physics step, moves object, sets change flags | decomp + s_object.cpp | med |

| 0x10049B50 | 0x00049B50 | FullObjectUpdate | Model ServerUpdate + OnUpdate + PhysicsUpdateObject | decomp + s_object.cpp | med |

| 0x10049C00 | 0x00049C00 | Obj_SetUpdateBitStream | Copies bitstream into object state and refreshes | decomp | low |

| 0x10049D30 | 0x00049D30 | Mem_MoveRange | memmove_s wrapper; returns end ptr | decomp | low |

| 0x10049D80 | 0x00049D80 | Mem_FillBytes_ReturnEnd | Fills bytes and returns end pointer | decomp | low |

| 0x10049DB0 | 0x00049DB0 | ByteBuffer_InsertFill | Inserts a3 bytes at pos and fills with value | decomp | low |

| 0x10032460 | 0x00032460 | Call_1003DAC0_IfArg | Wrapper: sub_1003DAC0(dword_100B0198, arg) | decomp | low |

| 0x1002F500 | 0x0002F500 | ObjType_Is_2or9 | True if object type == 2 or 9 | decomp | low |

| 0x10035660 | 0x00035660 | ServerData_Release | Decref server-data; returns to pool at zero | decomp | low |

| 0x10035910 | 0x00035910 | Server_ClearClientLinks | Clears client->object link field | decomp | low |

| 0x10035950 | 0x00035950 | Server_ClearClientLink | Clears specific client link and release | decomp | low |

| 0x100359D0 | 0x000359D0 | Server_DisconnectOrCleanupClients | Disconnect flagged clients; cleanup others | decomp | low |

| 0x10035BB0 | 0x00035BB0 | Server_FindObjByU16_104 | Finds obj by u16 field at +104 | decomp | low |

| 0x10036200 | 0x00036200 | Server_ResizeObjArray_72 | Resizes per-obj array at +72 | decomp | low |

| 0x10036490 | 0x00036490 | Server_ClearObjListFlag | Clears flag at obj+24 for list entries | decomp | low |

| 0x100363A0 | 0x000363A0 | Server_LoadObjectFromFile | Loads object from ObjDB entry | decomp | low |

| 0x1003A2B0 | 0x0003A2B0 | Server_RemoveObjectFromLists | Clears client links, removes interlinks, frees object list nodes | decomp | low |

| 0x10041DF0 | 0x00041DF0 | ServerData_Dtor | Releases server data, frees resources, unlinks from lists | decomp | low |

| 0x10030B40 | 0x00030B40 | List_ContainsNodeByPtr | Walks list at +36 to find node | decomp | low |

| 0x10030BF0 | 0x00030BF0 | ObjectList_CollectCallback | Collect callback: pushes obj into list | decomp | low |

| 0x10030C50 | 0x00030C50 | CollectObjectsInVolume | Collects objects in volume via callback | decomp | low |

| 0x10030CD0 | 0x00030CD0 | ObjectList_Release | Returns list nodes to pool | decomp | low |

| 0x10031110 | 0x00031110 | Server_GetFlags_404 | Returns g_ServerInstance+404 (+bit2 if set) | decomp | low |

| 0x10031130 | 0x00031130 | Server_SetFlag_404 | Sets g_ServerInstance+404 to (a1 & 1) | decomp | low |

| 0x10036370 | 0x00036370 | Server_FindObjByField12 | Walks list at g_ServerInstance+0x40, matches obj+0x0C | disasm | low |

| 0x100364C0 | 0x000364C0 | Server_ResetList_80 | Clears list at g_ServerInstance+0x50 and resets free list | disasm | low |

| 0x10036520 | 0x00036520 | Server_BroadcastPacket | Sends packet window to all clients in list | disasm | low |

| 0x10036570 | 0x00036570 | Server_AddClientIdPair | Adds (clientId, objId?) pair to g_ServerInstance+0x730 array | disasm | low |

| 0x100366A0 | 0x000366A0 | Server_SetObjRef_490 | Sets obj ref at +0x7A8; marks clients dirty | disasm | low |

| 0x100314E0 | 0x000314E0 | GetNextNodeValue_1788 | Returns list value via g_ServerInstance+1788 | decomp | low |

| 0x10031510 | 0x00031510 | ObjFlag_IsBit1 | Returns bit1 of flags at obj+12 | decomp | low |

| 0x10031530 | 0x00031530 | Obj_GetName | Copies name string from obj+18 | decomp | low |

| 0x10031580 | 0x00031580 | Obj_GetClassById | Resolves class by id at obj+16 | decomp | low |

| 0x100315A0 | 0x000315A0 | Obj_GetU16_104 | Returns u16 field at obj+104 or -1 | decomp | low |

| 0x100315E0 | 0x000315E0 | Obj_GetString120 | Copies string pointer at obj+120 | decomp | low |

| 0x10031630 | 0x00031630 | Obj_SetString120 | Alloc+copy string into obj+120 | decomp | low |

| 0x100316B0 | 0x000316B0 | Obj_SetFlags_4_8 | Sets bits 4/8 in obj+116 | decomp | low |

| 0x100316E0 | 0x000316E0 | Obj_GetFlagsMask | Returns composite flags from obj+116 | decomp | low |

| 0x10059B70 | 0x00059B70 | Flags_Test2000_Cond | Checks bit 0x2000 (and clears if 0x8000 set) | decomp | low |

| 0x10059E30 | 0x00059E30 | Obj_CheckFlags_2000_20010000 | Composite flag check using obj+0x84/0x88 | disasm + decomp | low |

| 0x10059B30 | 0x00059B30 | Obj_IsWorldModelOrFlag2000 | True if WM type/flag or WM collision flag | decomp | low |

| 0x10031720 | 0x00031720 | Obj_SetU32_100 | Sets u32 at obj+100 | decomp | low |

| 0x10031740 | 0x00031740 | Obj_GetU32_100 | Gets u32 at obj+100 | decomp | low |

| 0x100310A0 | 0x000310A0 | Ptr_GetU32_8 | Returns *(ptr+8) if ptr non-null | decomp | low |

| 0x100310C0 | 0x000310C0 | Ptr_GetNested_396_52 | Returns *(*(ptr+396)+52) if ptr non-null | decomp | low |

| 0x10031AE0 | 0x00031AE0 | Obj_GetColorRGBA | Reads RGBA floats from obj+144..147 | decomp | low |

| 0x10031B60 | 0x00031B60 | Obj_SetColorRGBA | Writes RGBA bytes; marks dirty | decomp | low |

| 0x10031CF0 | 0x00031CF0 | GetNextActiveObj | Returns next object with flags &0x18 == 0 | decomp | low |

| 0x10031D40 | 0x00031D40 | GetNextInactiveObj | Returns next object with flags &0x18 != 0 | decomp | low |

| 0x10031D90 | 0x00031D90 | Obj_SetFloat_44 | Sets float at obj->serverData+44 | decomp | low |

| 0x10031DB0 | 0x00031DB0 | Obj_SetMode_0_8_16 | Sets mode via sub_10049500(0/8/16) | decomp | low |

| 0x10031E00 | 0x00031E00 | Obj_IsFlagSet_308 | Checks flags at obj+308 | decomp | low |

| 0x10031EA0 | 0x00031EA0 | Obj_SetVec3_38 | Stores vec3 at obj+38; marks dirty | decomp | low |

| 0x10031F00 | 0x00031F00 | Obj_SetTransform_15 | Wrapper to sub_100408E0(...,15) | decomp | low |

| 0x1005A7F0 | 0x0005A7F0 | Obj_UpdateRotationMatrix | Builds rotation matrix from quat and marks dirty | decomp | low |

| 0x1005A200 | 0x0005A200 | Obj_UpdateBoundsFromMatrix | Rebuilds AABB/radius from transformed corners | decomp | low |

| 0x1005A570 | 0x0005A570 | Obj_UpdateBoundsFromOBB | Updates AABB from OBB corners via matrix | decomp | low |

| 0x10031F80 | 0x00031F80 | Obj_GetByte_169 | Returns byte at obj+169 | decomp | low |

| 0x10031FA0 | 0x00031FA0 | Obj_SetFieldPair_420_424 | Sets fields at obj+420/424; marks dirty | decomp | low |

| 0x10031FF0 | 0x00031FF0 | Obj_SetByte_169 | Sets byte at obj+169 | decomp | low |

| 0x10032010 | 0x00032010 | Obj_GetColorRGB | Returns RGB floats (alpha ignored) | decomp | low |

| 0x10032040 | 0x00032040 | Obj_SetColorRGB_KeepAlpha | Sets RGB floats, preserves alpha | decomp | low |

| 0x10032090 | 0x00032090 | Obj_GetScaleIfType4 | Returns scale (type 4) or 1.0 | decomp | low |

| 0x100320B0 | 0x000320B0 | Obj_SetScaleIfType4 | Sets scale (type 4) + marks dirty | decomp | low |

| 0x100320E0 | 0x000320E0 | Obj_SetFlag_548_bit0 | Sets bit0 at obj+548 (type 1) | decomp | low |

| 0x10032130 | 0x00032130 | Obj_GetFlag_548_bit0 | Gets bit0 at obj+548 (type 1) | decomp | low |

| 0x10032150 | 0x00032150 | Obj_GetModelInfo | Fills model info + name from obj | decomp | low |

| 0x10038980 | 0x00038980 | Server_CleanupPendingList | Drains list nodes with flag==0 to free list | decomp | low |

| 0x100394C0 | 0x000394C0 | Server_CleanupTick | Clears server flag + cleanup pending list | decomp | low |

| 0x10043E90 | 0x00043E90 | sm_AttachClient | Attach client to object + notify | decomp + "sm_AttachClient" string | high |

| 0x10063570 | 0x00063570 | om_CreateObject | Alloc/init object by type | decomp + "om_CreateObject" string | high |



### Object save/restore

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1002E0B0 | 0x0002E0B0 | sm_SaveObjects | Serializes object list to stream (version 2002) | decomp + caller ILTPhysics_SaveObjects | med |

| 0x1002E3D0 | 0x0002E3D0 | sm_RestoreObjects | Restores objects from stream (validates version) | decomp + "sm_RestoreObjects" string | high |

| 0x1002D0B0 | 0x0002D0B0 | sm_CreateNextObject | Create/serialize next object (save path) | string xref "sm_CreateNextObject" | med |

| 0x1002DD30 | 0x0002DD30 | sm_RestoreNextObject | Restore next object (load path) | string xref "sm_RestoreNextObject" | med |

| 0x1002AFB0 | 0x0002AFB0 | SerializeList_WithIds | Serializes list entries with id field (word != 0xFFFF) | decomp | low |

| 0x1002C750 | 0x0002C750 | sm_SaveObject | Serializes object state to stream | decomp | low |

| 0x1002B080 | 0x0002B080 | SaveAttachments | Serializes attachment list (id + type) | decomp | low |

| 0x1002B150 | 0x0002B150 | RestoreAttachments | Restores attachments from stream | decomp + "RestoreAttachments" string | low |

| 0x1002B240 | 0x0002B240 | RestoreInterlinks | Restores interlinks from stream | decomp + "RestoreInterlinks" string | low |

| 0x1002B2F0 | 0x0002B2F0 | RestoreObjects_ReadNamePairs | Reads object name pairs from stream | decomp + "RestoreObjects" string | low |

| 0x1002E6C0 | 0x0002E6C0 | Interlink_Exists | Checks for existing interlink between objects | decomp | low |

| 0x1002E770 | 0x0002E770 | Interlink_Add | Adds interlink between objects | decomp | low |

| 0x1002E990 | 0x0002E990 | Interlink_RemoveByType | Removes interlinks by type; frees nodes | decomp | low |

| 0x1002EA80 | 0x0002EA80 | CLTMessage_Write_Server::WriteCompPos | Compresses world position (3x u16) and writes to bitstream | decomp + ltmessage_server.cpp | high |



### Server manager / world lifecycle (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10036700 | 0x00036700 | CServerMgr_LoadWorld | Loads world via world mgr; sets running flag | decomp + "CServerMgr::LoadWorld" string | high |

| 0x1003C6F0 | 0x0003C6F0 | CServerMgr_DoStartWorld | Start world (load dat, init, optional run) | decomp + "CServerMgr::DoStartWorld" string | high |

| 0x10039570 | 0x00039570 | CServerMgr_DoRunWorld | Starts world sim; runs cleanup + timing | decomp + "CServerMgr::DoRunWorld" string | high |

| 0x100322E0 | 0x000322E0 | Server_StartWorld | Wrapper: CServerMgr_DoStartWorld(g_ServerInstance, name, flag, mode) | decomp | low |

| 0x10032300 | 0x00032300 | Server_RunWorld | Wrapper: CServerMgr_DoRunWorld(g_ServerInstance) | decomp | low |

| 0x10032310 | 0x00032310 | Server_Call_3C450 | Wrapper: sub_1003C450(g_ServerInstance, a1) | decomp | low |



### World model init (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1003D240 | 0x0003D240 | se_InitWorldModel | Initializes world model + physics bounds | decomp + "se_InitWorldModel" string | high |



### Object load (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10049FC0 | 0x00049FC0 | LoadObjects | Loads object list from world data | decomp + "LoadObjects" string | high |



### Logging / debug

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100175A0 | 0x000175A0 | Debug_Printf | Formats + OutputDebugStringA | decomp + OutputDebugStringA | med |

| 0x10018C10 | 0x00018C10 | dsi_OnReturnError | Error hook stub (no-op in server build) | disasm + xrefs | low |

| 0x10018F50 | 0x00018F50 | ServerLog_Printf | Formats + forwards to server log interface (g_pServerInstance+0x85C) | decomp | med |

| 0x10035A90 | 0x00035A90 | ServerLog_UnfreedString | Logs unfreed server string | decomp + "Unfreed (server) string: %s" string | low |

| 0x100311C0 | 0x000311C0 | ServerDebug_Printf | Formats + passes to sub_1003A3E0 | decomp | low |



### Server init / shutdown

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10003A40 | 0x00003A40 | Server_Shutdown_NoOp | No-op shutdown stub (called by Server_Shutdown_Subsystems) | disasm + xref | low |

| 0x10019570 | 0x00019570 | Server_Init_Subsystems | CoInitialize + init helpers; loads ltmsg.dll | decomp + call chain | low |

| 0x100380B0 | 0x000380B0 | CServerMgr::Init | Initializes server manager fields, lists, banks, command table, and packet handlers | decomp + server_interface.cpp | med |

| 0x10018D80 | 0x00018D80 | Server_Shutdown_Subsystems | Calls init cleanup helpers; frees ltmsg.dll; CoUninitialize | decomp | low |

| 0x10036460 | 0x00036460 | Server_SetLastError | Formats error into g_ServerInstance+96 | decomp | low |

| 0x10018C20 | 0x00018C20 | Ltmsg_LoadLibrary | LoadLibraryA(\"ltmsg.dll\"), stores HMODULE | disasm | low |

| 0x10018C40 | 0x00018C40 | Ltmsg_FreeLibrary | FreeLibrary on stored HMODULE | disasm | low |

| 0x10018C25 | 0x00018C25 | Dyn_LoadLibraryA_2 | LoadLibraryA + store handle; returns success flag | disasm | low |

| 0x10018C4A | 0x00018C4A | Dyn_FreeLibrary_2 | FreeLibrary + clear stored handle | disasm | low |

| 0x10018F30 | 0x00018F30 | Sleep_IfNonZero | Sleep wrapper (skips if 0) | decomp | low |



### Server interface exports (server_interface.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10018270 | 0x00018270 | CreateServer | Alloc/init server instance; returns status codes | decomp + server_interface.cpp | high |

| 0x10018340 | 0x00018340 | DeleteServer | Tears down server instance + subsystems | disasm + server_interface.cpp | high |



### Module records / DLL lifetime

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100188F0 | 0x000188F0 | ModuleRecord_Create | Allocates module record; stores HMODULE + name | decomp + Resolve_SetMasterDatabase | low |

| 0x10018A30 | 0x00018A30 | ModuleRecord_Destroy | Releases module handle; optional DeleteFileA; frees record | decomp | low |

| 0x1004AE00 | 0x0004AE00 | ModuleRecord_DestroyIfSet | Destroys module record if non-null and clears ptr | decomp | low |

| 0x1001A620 | 0x0001A620 | FreeLibrary_Wrapper | Thin wrapper around FreeLibrary | disasm | low |

| 0x1001A660 | 0x0001A660 | GetModuleHandle_NULL | Returns GetModuleHandleA(NULL) | decomp | low |

| 0x1001A67B | 0x0001A67B | GetProcAddress_Thunk | Thin GetProcAddress wrapper | disasm | low |

| 0x1001B020 | 0x0001B020 | FileStream_Open | fopen wrapper returning vtable-backed file stream | decomp | low |

| 0x1001BE80 | 0x0001BE80 | GlobalList_Init | Initializes global intrusive list + refcount | decomp | low |

| 0x1001BEA0 | 0x0001BEA0 | GlobalList_Shutdown | Drains list on refcount zero | decomp | low |

| 0x1001BEF0 | 0x0001BEF0 | GlobalList_ForEach | Iterates global list, calls callback | decomp | low |

| 0x1001C3D0 | 0x0001C3D0 | Time_GetSecondsSinceStart | (timeGetTime - base) * 0.001 | decomp | low |

| 0x1001C400 | 0x0001C400 | Time_GetMsSinceStart | timeGetTime - base (ms) | decomp | low |

| 0x10005100 | 0x00005100 | NewHandler_OnAllocFail | new_handler target; calls sub_10018FE0 | decomp | low |

| 0x10005110 | 0x00005110 | NewHandler_Init | Installs new_handler and zeros globals; refcount++ | decomp | low |

| 0x10005150 | 0x00005150 | NewHandler_Shutdown | Restores previous new_handler; refcount-- | decomp | low |

| 0x100051A0 | 0x000051A0 | Mem_AllocTracked | Alloc wrapper; updates alloc/fail counters | decomp | low |

| 0x100051E0 | 0x000051E0 | Mem_AllocZeroed | Alloc + zero init (memset) | decomp | low |

| 0x10005210 | 0x00005210 | Mem_FreeTracked | Free wrapper; updates free counters | decomp | low |

| 0x10005290 | 0x00005290 | Mem_FreeTracked_Thunk | Thin wrapper to Mem_FreeTracked | decomp | low |

| 0x10018FE0 | 0x00018FE0 | OutOfMemory_Abort | Displays OOM dialog then exits | decomp | low |



### Math / utility helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1001D690 | 0x0001D690 | Matrix4_Mul | 4x4 matrix multiply (out = a2 * a3) | decomp | low |

| 0x1001D8B0 | 0x0001D8B0 | MatVMul_3x3 | 3x3 matrix-vector multiply (dest = mat * vec) | decomp + ltmatrix.h | low |

| 0x100693C0 | 0x000693C0 | MatVMul | 4x4 matrix-vector multiply (no perspective divide) | decomp + ltmatrix.h | low |

| 0x1001E030 | 0x0001E030 | Vec3_Sub | Vector3 subtract (this - a3 -> a2) | decomp | low |

| 0x1001E060 | 0x0001E060 | Vec3_Scale | Scales vec3 by scalar into out | decomp | low |

| 0x1004B660 | 0x0004B660 | LTVector_Scale | In-place vec3 scale (this *= scalar) | decomp + ltvector.h | low |

| 0x1002F5E0 | 0x0002F5E0 | Vec3_Cross | Cross product (out = a3 x this) | decomp | low |

| 0x10028520 | 0x00028520 | Vec3_AddInPlace | In-place vec3 add (this += a2) | decomp | low |

| 0x10028550 | 0x00028550 | Vec3_Add | Vec3 add (out = this + a3) | decomp | low |

| 0x1002B720 | 0x0002B720 | Vec3_SetDiffSum | Computes (a2-a3) and (a2+a3) into out | decomp | low |

| 0x1001D070 | 0x0001D070 | Const_Return70 | Returns constant 70 | decomp | low |

| 0x1001D570 | 0x0001D570 | Pair_Init | Sets {0, a2} pair | decomp | low |

| 0x10051260 | 0x00051260 | LTMatrix::SetBasisVectors | Sets basis vectors (right/up/forward) on LTMatrix | decomp + ltmatrix.h | low |

| 0x1001D910 | 0x0001D910 | Ptr_GetValue | Returns *(this) | decomp | low |

| 0x1001D920 | 0x0001D920 | StringPtr_ResetDefault | Frees string if not default; sets to off_100A85F8 | decomp | low |

| 0x1001DF80 | 0x0001DF80 | Vec3_Dot | Dot product of two vec3 | decomp | low |

| 0x100324B0 | 0x000324B0 | Vec3_DistSqr | Squared distance between two vec3 | decomp | low |

| 0x10032F30 | 0x00032F30 | LTPlane::DistTo | Plane distance to point (dot - dist) | decomp + ltplane.h | low |

| 0x1005E0D0 | 0x0005E0D0 | Vec3_NearlyEquals | Returns true if distance <= epsilon | decomp | low |

| 0x1005D670 | 0x0005D670 | LTPlane::Init | Initialize plane from normal + point | decomp + ltplane.h | low |

| 0x10041060 | 0x00041060 | U16Array_Grow | Grow u16 array by +256 entries | decomp | low |

| 0x100410B0 | 0x000410B0 | U16Array_Push | Append u16 to dynamic array (grows if needed) | decomp | low |

| 0x1001E770 | 0x0001E770 | Matrix4_Identity | Writes 4x4 identity matrix | decomp | low |

| 0x100548A0 | 0x000548A0 | LTMatrix::Inverse | Gauss-Jordan 4x4 matrix inverse (returns false on singular) | decomp + ltmatrix.h | low |

| 0x1001EA30 | 0x0001EA30 | Mat4_InvertRT | Inverts rotation+translation matrix (orthonormal) | decomp | low |

| 0x10006080 | 0x00006080 | ExceptionWithString_Ctor | std::exception ctor + std::string from arg | decomp | low |

| 0x10006800 | 0x00006800 | ClampFloat | Clamps value to [min,max] | decomp | low |

| 0x10028030 | 0x00028030 | quat_Mul | Quaternion multiply (q = a * b) | decomp + ltquatbase.h | low |

| 0x10062720 | 0x00062720 | quat_RotVec | Rotates vector by quaternion | decomp + ltquatbase.h | low |

| 0x100283C0 | 0x000283C0 | quat_Slerp | Quaternion slerp | decomp + ltquatbase.cpp | low |

| 0x100281F0 | 0x000281F0 | Quat_ToMatrix4 | Converts quaternion to 4x4 matrix | decomp | low |

| 0x10055350 | 0x00055350 | Matrix4_FromTRS | Builds 4x4 from translation, rotation(quat), scale | decomp | low |

| 0x10055410 | 0x00055410 | Matrix4_BuildRTAndInverse | Builds RT matrix from a1/a2/a3 and computes inverse | decomp | low |

| 0x1002AED0 | 0x0002AED0 | Vec3_Length | Returns vec3 length (sqrt of sum sq) | decomp | low |

| 0x1002AF40 | 0x0002AF40 | GlobalScratch_Free | Frees global scratch buffer | decomp | low |

| 0x1002AF60 | 0x0002AF60 | GlobalScratch_Alloc | Allocates global scratch buffer; sets size | decomp | low |

| 0x1002AF90 | 0x0002AF90 | GlobalScratch_EnsureSize | Reallocates scratch buffer if size grows | decomp | low |

| 0x1002B790 | 0x0002B790 | Box_SetMax_UpdateDeltaSum | Stores max; updates delta and sum vs min | decomp | low |

| 0x1002B840 | 0x0002B840 | Box_SetMin_UpdateRadius | Stores min; updates delta/sum + radius | decomp | low |

| 0x10059310 | 0x00059310 | CalcMotion | Computes physics displacement/velocity with gravity/friction | decomp + motion.cpp | med |

| 0x10059C20 | 0x00059C20 | AABB_OverlapWithMargin | AABB overlap test with margin | decomp | low |

| 0x1005A0E0 | 0x0005A0E0 | AABB_ExpandByDelta | Expands bounds by signed delta per axis | decomp | low |

| 0x1002F3D0 | 0x0002F3D0 | Mat4_TransformPoint | Transforms point by 4x4 matrix (homogeneous) | decomp | low |

| 0x10059A90 | 0x00059A90 | Mat4_TransformPoint_3x4 | Transforms point by 3x4 matrix (with translation) | decomp | low |

| 0x10059D60 | 0x00059D60 | Mat4_TransformPointPerspective | Transforms point by 4x4 with perspective divide | decomp | low |

| 0x1005D6B0 | 0x0005D6B0 | Plane_FromPointNormal | Sets plane normal + d from point/normal | decomp | low |

| 0x1002F560 | 0x0002F560 | Vec4_Equals | Compares 4-float vector equality | decomp | low |

| 0x1002F620 | 0x0002F620 | Vec3_SetLength | Normalizes vec3 to target length | decomp | low |

| 0x10032480 | 0x00032480 | Vec3_LengthSq | Returns squared length of vec3 | decomp | low |

| 0x10033EF0 | 0x00033EF0 | Vec3_OrthoNormalizeBasis | Orthogonalizes basis vector using up vec | decomp | low |

| 0x100358C0 | 0x000358C0 | Vec3_Normalize_UsingLength | Scales vec3 by 1/len (len passed in) | decomp | low |

| 0x1002F6E0 | 0x0002F6E0 | Struct_ParseVec3Flag | Parses vec3 + flag from string | decomp | low |

| 0x1002F8D0 | 0x0002F8D0 | ComputeColorAtPos | Computes color at position (uses server instance lighting) | decomp | low |

| 0x10068F50 | 0x00068F50 | LightTable_GetColorAtPos | Samples light grid at pos; optional color scale | decomp + light_table.cpp | low |

| 0x1006CC60 | 0x0006CC60 | CLightTable::GetLightVal | Light grid trilinear sample + lightgroup add | decomp + light_table.cpp | med |

| 0x1006C860 | 0x0006C860 | CLightTable::AddLightGroupSamples | Adds lightgroup samples to 8 corner values | decomp + light_table.cpp | low |

| 0x1006C220 | 0x0006C220 | TVector3i_Sub | Subtracts int vector (out = this - a3) | decomp + light_table.h | low |

| 0x1006C4F0 | 0x0006C4F0 | SLightGroup::GetSample | Returns color sample at grid coord | decomp + light_table.h | low |

| 0x1002FDD0 | 0x0002FDD0 | Buffer_SetData | Replaces buffer contents (alloc + memcpy) | decomp | low |

| 0x10030B80 | 0x00030B80 | Vec3_AddScaled10000 | Adds vec3 + (vec3*10000) into out | decomp | low |

| 0x1003D1F0 | 0x0003D1F0 | LTransform_Copy | Copies LTransform (pos/rot/scale) | decomp | low |

| 0x10040400 | 0x00040400 | Mat4_TransformVector | Multiplies vec3 by 3x3 portion of 4x4 matrix | decomp | low |

| 0x100405B0 | 0x000405B0 | Mat4_TransformVector_InPlace | In-place variant of Mat4_TransformVector | decomp | low |

| 0x1004B630 | 0x0004B630 | Vec3_SubInPlace | In-place vec3 subtract (this -= a2) | decomp | low |

| 0x1004DC10 | 0x0004DC10 | Vec3Array_Copy | Copies vec3 array (stride 12) | decomp | low |

| 0x1004DC50 | 0x0004DC50 | Vec3Array_FillRange | Fills vec3s in [begin,end) with value | decomp | low |

| 0x1004DD00 | 0x0004DD00 | Vec3Array_CopyRange_Int | Copies vec3 range (dword variant) | decomp | low |

| 0x10050830 | 0x00050830 | Vec3Array_FillN | Fills N vec3s and returns end pointer | decomp | low |

| 0x10050910 | 0x00050910 | Vec3Array_CopyRange_Int_Thunk | Wrapper to Vec3Array_CopyRange_Int | decomp | low |

| 0x10050C80 | 0x00050C80 | Vec3Array_Push | Appends vec3 into dynamic array | decomp | low |

| 0x10050C20 | 0x00050C20 | Vec3Array_InsertAt | Inserts vec3 into dynamic array | decomp | low |

| 0x10050990 | 0x00050990 | Vec3Array_InsertN | Inserts N vec3s at iterator (std::vector-style) | decomp | low |

| 0x10050700 | 0x00050700 | Vec3Array_CopyBackward | Backward copy for overlapping vec3 ranges | decomp | low |

| 0x10050740 | 0x00050740 | Vec3Array_Fill | Fills vec3 array with value | decomp | low |

| 0x10031170 | 0x00031170 | RandInRange | Returns random int in [min,max] | decomp | low |

| 0x10247A40 | 0x00247A40 | RandInRange_Int | Returns random int in [min,max] (alt RNG math) | decomp | low |

| 0x10031190 | 0x00031190 | RandFloat | Returns random float in [0,range] | decomp | low |

| 0x10055CE0 | 0x00055CE0 | RandFloatRange | Returns random float in [min,max] | decomp | low |

| 0x10055BD0 | 0x00055BD0 | QPC_Get | QueryPerformanceCounter wrapper | disasm | low |

| 0x10055BE0 | 0x00055BE0 | QPC_ElapsedScaled | Elapsed ticks divided by frequency (scaled) | disasm | low |

| 0x10031ED0 | 0x00031ED0 | Vec4_Copy | Copies 4 floats | decomp | low |

| 0x1000CC80 | 0x0000CC80 | MaxFloat | Returns max(a1,a2) | decomp | low |

| 0x1000CBD0 | 0x0000CBD0 | MinFloat | Returns min(a1,a2) | decomp | low |

| 0x10075100 | 0x00075100 | DistSqrSegSeg | Squared distance between two line segments | decomp + world_blocker_math.cpp | low |

| 0x1001D590 | 0x0001D590 | Ptr_SetOnce | Sets pointer if null | decomp | low |

| 0x1001D950 | 0x0001D950 | Slot_AssignIndexed | Assigns slot index with refcount | decomp | low |

| 0x1001D990 | 0x0001D990 | Slot_FindByField4 | Finds slot by field4; returns slot + index | decomp | low |

| 0x10038EE0 | 0x00038EE0 | Struct981E8_Ctor | vtable init + sub_1007CE70(0x17C,0x20) | decomp | low |

| 0x10038F90 | 0x00038F90 | StructRelease_Handle | Releases handle via vtbl+8, clears fields | decomp | low |

| 0x10038FC0 | 0x00038FC0 | Stream_ReadAt8x | Calls vtbl+4 with offset 8*x | decomp | low |

| 0x10038FE0 | 0x00038FE0 | Wrapper_37DA0 | Thin wrapper to sub_10037DA0 | decomp | low |

| 0x10039010 | 0x00039010 | Vtable_Call0 | Calls (**a1)(a1,0) | decomp | low |

| 0x10039030 | 0x00039030 | ObjRefWrapper_Ctor | Inits ref wrapper + validates obj ref | decomp | low |

| 0x10039090 | 0x00039090 | Struct_SetDefaultPos | Sets default pos/orientation (-2000 Y) | decomp | low |

| 0x100396F0 | 0x000396F0 | StreamCache_SetHandle | Updates handle; reads stream at 8x offset | decomp | low |

| 0x100078B0 | 0x000078B0 | StreamCache_SetHandleA | Updates handle via sub_10007370/73A0 | decomp | low |

| 0x10007930 | 0x00007930 | StreamCache_SetHandleB | Updates handle via sub_100073C0/73F0 | decomp | low |

| 0x10008550 | 0x00008550 | StreamCache_SetHandleA_Wrap | Wrapper: StreamCache_SetHandleA(this,a2,off_100AF430) | decomp | low |

| 0x100085B0 | 0x000085B0 | StreamCache_SetHandleB_Wrap | Wrapper: StreamCache_SetHandleB(this,a2,off_100AF430) | decomp | low |

| 0x1000CAD0 | 0x0000CAD0 | Event_Set | Sets Win32 event handle | decomp | low |



### List / lookup helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1001D5C0 | 0x0001D5C0 | List_ResetCount | Sets this+4 = 0 | decomp | low |

| 0x1001E760 | 0x0001E760 | List_ResetCount_Thunk | Thunk to List_ResetCount | decomp | low |

| 0x10006350 | 0x00006350 | Flag_SetBit0 | Sets bit0 on dword | decomp | low |

| 0x10006360 | 0x00006360 | Flag_ClearBit0 | Clears bit0 on dword | decomp | low |

| 0x1001E660 | 0x0001E660 | List_ClearNodes | Iterates list and frees nodes via vtable | decomp | low |

| 0x1001FCF0 | 0x0001FCF0 | List_ClearNodes_Thunk | Thunk to List_ClearNodes | decomp | low |

| 0x1001FFB0 | 0x0001FFB0 | List_FindByName_OffsetE8 | Case-insensitive lookup by name at +0xE8 | decomp | low |

| 0x10020240 | 0x00020240 | List_FindByName_Offset28 | Case-insensitive lookup by name at +0x28 | decomp | low |

| 0x10055C70 | 0x00055C70 | StringList_ContainsNoCase | Walks list and compares name via _stricmp | decomp | low |

| 0x10055CB0 | 0x00055CB0 | StringList_Free | Frees singly-linked list nodes | decomp | low |

| 0x10062680 | 0x00062680 | List_RemoveNode | Removes node from singly-linked list | decomp | low |

| 0x10056260 | 0x00056260 | List_RemoveAndRecycleNode | Removes node; optionally recycles into global list | decomp | low |

| 0x10056AA0 | 0x00056AA0 | CLTMessage_Write::WriteYRotation | Writes Y rotation as int8 | decomp + ltmessage.cpp | high |

| 0x10056700 | 0x00056700 | CLTMessage_Write::WriteCompLTVector | Compresses vector and writes to bitstream | decomp + ltmessage.cpp | high |

| 0x10056770 | 0x00056770 | CLTMessage_Write::WriteCompLTRotation | Compresses rotation and writes to bitstream | decomp + ltmessage.cpp | high |

| 0x10001050 | 0x00001050 | String_CopySafe | strncpy wrapper + null terminator | decomp | low |

| 0x10051CC0 | 0x00051CC0 | String_EqualsNoCase | Case-insensitive ASCII string compare | decomp | low |

| 0x10055BF0 | 0x00055BF0 | StrEqualsNoCase_Wrap | Wrapper for table-driven case-insensitive compare | decomp | low |

| 0x1007D4C0 | 0x0007D4C0 | StrEqualsNoCase_Table | Case-insensitive compare using lookup table | decomp | low |

| 0x10052A20 | 0x00052A20 | Hash_String_CI_IndexMul | Case-insensitive hash (index*char) | decomp | low |

| 0x10052A60 | 0x00052A60 | Hash_BytePairs | Hash over byte pairs | decomp | low |

| 0x10052A10 | 0x00052A10 | U16_Deref | Returns *u16 | decomp | low |

| 0x10052AF0 | 0x00052AF0 | Hash_Path_CI_IndexMul | Case-insensitive hash; '/'->'\\' | decomp | low |

| 0x10052B30 | 0x00052B30 | U16_Equals | Returns true if *u16 equal | decomp | low |

| 0x10052B50 | 0x00052B50 | Mem_EqualsNoCase_Offset | Case-insensitive compare of two ranges | decomp | low |

| 0x10052BB0 | 0x00052BB0 | Mem_Equals_Offset | Byte-compare of two ranges | decomp | low |

| 0x10052BE0 | 0x00052BE0 | Mem_EqualsPathNoCase_Offset | Case-insensitive compare; '/'->'\\' | decomp | low |

| 0x10051E10 | 0x00051E10 | EntryTable_FindByNameNoCase | Finds entry in 5-dword table by name | decomp | low |

| 0x10051E60 | 0x00051E60 | EntryTable_UpdateFromObj | Updates entry fields from object values | decomp | low |

| 0x100520C0 | 0x000520C0 | Var_PrintNameValue | Prints \"name = value\" via function pointer | decomp | low |

| 0x10052130 | 0x00052130 | VarTable_ParseAndApplyLine | Parses and applies var/command line | decomp | low |

| 0x10052410 | 0x00052410 | VarTable_SetVarByName | Sets var by name + value; triggers callbacks | decomp | low |

| 0x100524B0 | 0x000524B0 | VarTable_AddEntry | Allocates and inserts var table entry | decomp | low |

| 0x10052500 | 0x00052500 | VarTable_ExecFile | Reads config file and applies each line | decomp | low |

| 0x100525B0 | 0x000525B0 | VarTable_ParseLine_Wrap | Wrapper for VarTable_ParseAndApplyLine | decomp | low |

| 0x100525D0 | 0x000525D0 | VarTable_Init | Initializes var table + default entries | decomp | low |

| 0x10052670 | 0x00052670 | VarTable_ParseLine_NoFlags | Wrapper for VarTable_ParseAndApplyLine (no flags) | decomp | low |

| 0x10052890 | 0x00052890 | ParseIdList_UpTo30 | Parses up to 30 ids into array | decomp | low |

| 0x10052910 | 0x00052910 | ParseTokenList_Next | Parses next token/list element | decomp | low |

| 0x100527C0 | 0x000527C0 | ParseToken_Extended | Parses token with quotes/paren nesting | decomp | low |

| 0x10052780 | 0x00052780 | Char_IsControlOrDel | Returns true for control chars or DEL | decomp | low |

| 0x10001420 | 0x00001420 | NodeList_Init | Initializes node/list header + alloc 4 bytes | decomp | low |

| 0x10002000 | 0x00002000 | ListNode_Insert | Inserts node into list (dlist) | decomp | low |

| 0x10002040 | 0x00002040 | ListNode_Remove | Removes node from list (dlist) | decomp | low |

| 0x10003860 | 0x00003860 | ListNode_AllocFromPool | Pops free node; allocates new page if needed | disasm | low |

| 0x1004AF30 | 0x0004AF30 | List_FindByMask | Walks list to find node with mask match | decomp | low |

| 0x100026A0 | 0x000026A0 | Callback_InvokeAndMaybeUnlink | Invokes vtbl+0x1C; if vtbl+0x24 true then vtbl+0x04 + unlink | decomp | low |

| 0x10002B20 | 0x00002B20 | CallbackMgr_AddRefInit | Increments refcount; allocs global mgr if null (36 bytes) | decomp | low |

| 0x10002B60 | 0x00002B60 | CallbackNode_Ctor | vtable init + allocs/list inits sub-node | decomp | low |

| 0x10002C70 | 0x00002C70 | CallbackMgr_Dispatch3 | Ensures mgr, creates node if null, calls vtbl+0x10 | decomp | low |

| 0x10002D30 | 0x00002D30 | CallbackMgr_Dispatch1 | Ensures mgr, creates node if null, calls vtbl+0x0C | decomp | low |

| 0x10032B30 | 0x00032B30 | Callback_InvokeOnce | Builds callback handle and dispatches | decomp | low |

| 0x1003F660 | 0x0003F660 | Callback_Invoke3 | Stores args then dispatches callback (3 params) | decomp | low |

| 0x1004A960 | 0x0004A960 | CallbackHandle_Dispatch1_ClearPtr | Callback handle init; clears ptr then dispatches | decomp | low |

| 0x10003060 | 0x00003060 | CallbackHandle_Ctor | vtable init + mgr addref + stores args | decomp | low |

| 0x10003140 | 0x00003140 | CallbackMgr_GetOrCreateNode | Ensures mgr + node; returns list head or cached ptr | decomp | low |

| 0x10003440 | 0x00003440 | ObjRef_SetOrValidate | Uses global vtbl+0x80 to validate; sets this+0x0C | decomp | low |

| 0x10003750 | 0x00003750 | ListNode_Reset | Unlinks node and self-links; clears this+0x0C | decomp | low |

| 0x10003940 | 0x00003940 | CriticalSection_Enter | EnterCriticalSection(this+4) | decomp | low |

| 0x10003A30 | 0x00003A30 | ResetGlobals_AF7DC | Zeros dword_100AF7DC/100AF7E0 | decomp | low |

| 0x10003A80 | 0x00003A80 | GlobalMgr_Shutdown | Frees manager ptr + deletes CS; resets globals | decomp | low |

| 0x1003DF90 | 0x0003DF90 | GlobalMgrList_Shutdown | Clears string pool + shuts down all global mgr entries | decomp | low |

| 0x10006780 | 0x00006780 | Array_FindIndex | Returns index of value in array or -1 | decomp | low |

| 0x10032500 | 0x00032500 | Array_PushIfSpace | Appends value if capacity; returns success | decomp | low |

| 0x10007A10 | 0x00007A10 | ListDyn_InsertAt | Inserts element at index (grows buffer) | decomp | low |

| 0x10007B00 | 0x00007B00 | ListDyn_RemoveAt | Removes element at index (shrinks buffer) | decomp | low |

| 0x100207E0 | 0x000207E0 | List_ResizeWithAlloc | Resizes list storage; alloc/free via vtbl | decomp | low |

| 0x100208C0 | 0x000208C0 | List_ResizeWithAlloc2 | Resizes list with extra capacity tracking | decomp | low |

| 0x1001F800 | 0x0001F800 | List_FreeBuffer | Frees list buffer via allocator vtbl+8 | decomp | low |

| 0x1001F830 | 0x0001F830 | List_AllocBuffer | Allocates list buffer via sub_1001E3A0 | decomp | low |

| 0x1001E2A0 | 0x0001E2A0 | List_FreeBuffer2 | Frees list buffer + resets capacity | decomp | low |

| 0x1001F8A0 | 0x0001F8A0 | List_AllocBuffer2 | Allocates list buffer (4-byte elems) | decomp | low |

| 0x1001E260 | 0x0001E260 | List_ResetCounts | Zeros list count fields | decomp | low |

| 0x10020FB0 | 0x00020FB0 | List_Resize_DefaultAlloc | Resizes list using off_100AF430 | decomp | low |

| 0x1001E280 | 0x0001E280 | List_ResetCounts2 | Zeros counts + sets field4 | decomp | low |

| 0x10020770 | 0x00020770 | List_ResizeWithAlloc3 | Resizes list3 using allocator | decomp | low |

| 0x10021010 | 0x00021010 | List_Resize2_DefaultAlloc | Resizes list2 using off_100AF430 | decomp | low |

| 0x1001E250 | 0x0001E250 | List_ResetCounts3 | Zeros list3 counts | decomp | low |

| 0x1001F7B0 | 0x0001F7B0 | List_FreeBuffer3 | Frees list3 buffer via allocator | decomp | low |

| 0x1001F7E0 | 0x0001F7E0 | List_AllocBuffer3 | Allocates list3 buffer (12-byte elems) | decomp | low |

| 0x10020C40 | 0x00020C40 | List3_ResizeWithAlloc | Resizes list3 and stores allocator | decomp | low |

| 0x10020F90 | 0x00020F90 | List3_Resize_DefaultAlloc | Resizes list3 with off_100AF430 | decomp | low |

| 0x1001E3A0 | 0x0001E3A0 | AllocPairArray_Zero | Allocates 8-byte pairs and zeroes | decomp | low |

| 0x1000CB90 | 0x0000CB90 | List_RemoveNode_UpdateHead | Removes node, updates head/count | decomp | low |

| 0x1000D1A0 | 0x0000D1A0 | List_InsertNodeWithValue | Inserts node after head; sets value | decomp | low |

| 0x1001FB10 | 0x0001FB10 | GetStatic_962EC | One-time init + returns global ptr | decomp | low |

| 0x1001FB40 | 0x0001FB40 | GetStatic_962FC | One-time init + returns global ptr | decomp | low |

| 0x1001FB70 | 0x0001FB70 | GetStatic_960B8 | One-time init + returns global ptr | decomp | low |

| 0x1001FBA0 | 0x0001FBA0 | GetStatic_960C8 | One-time init + returns global ptr | decomp | low |

| 0x10026040 | 0x00026040 | GetStaticTable_A | Returns static table based on args | decomp | low |

| 0x10026080 | 0x00026080 | GetStaticTable_B | Returns static table based on args | decomp | low |

| 0x10023D70 | 0x00023D70 | RBTree_EraseRange | Erases range in RB-tree (used by model rez cleanup) | decomp | low |

| 0x100108F0 | 0x000108F0 | RBTree_FindLowerBound | Finds node with key >= value | decomp | low |

| 0x10022D70 | 0x00022D70 | RBTree_FindOrInsert | Find node or insert; returns iterator+flag | decomp | low |

| 0x10020D10 | 0x00020D10 | RBTree_InsertNode | Inserts node and rebalances tree | decomp | low |

| 0x10024610 | 0x00024610 | RBTree_EraseByKey | Erases nodes matching key; returns count | decomp | low |

| 0x1001F5B0 | 0x0001F5B0 | RBTree_EqualRange | Returns {lower, upper} range for key | decomp | low |

| 0x100206A0 | 0x000206A0 | RBTree_AllocNode | Allocates/init RB-tree node | decomp | low |

| 0x10020BA0 | 0x00020BA0 | RBTree_CountRange | Counts nodes in [first,last) range | decomp | low |

| 0x1001DE50 | 0x0001DE50 | RBTree_Leftmost | Returns leftmost node in subtree (min) | decomp | low |

| 0x1001DE30 | 0x0001DE30 | RBTree_Rightmost | Returns rightmost node in subtree (max) | decomp | low |

| 0x1001DE80 | 0x0001DE80 | RBTree_Decrement | In-order decrement (prev node) | decomp | low |

| 0x1001F640 | 0x0001F640 | RBTree_RotateLeft | Left-rotate at node | decomp | low |

| 0x1001F6A0 | 0x0001F6A0 | RBTree_RotateRight | Right-rotate at node | decomp | low |

| 0x1001DF30 | 0x0001DF30 | RBTree_Increment | In-order increment (next node) | decomp | low |

| 0x100203E0 | 0x000203E0 | RBTree_EraseNode | Erases node by iterator (std::map erase) | decomp | low |

| 0x100206E0 | 0x000206E0 | RBTree_ClearNodesRec | Recursively frees tree nodes | decomp | low |

| 0x10025180 | 0x00025180 | RBTree_Dtor | Erases nodes + frees tree head/sentinel | decomp | low |



### ObjRef / vector helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10037DA0 | 0x00037DA0 | ObjRefArray_SyncReverse | Walks source/dest arrays in reverse; resets + rebinds ObjRef if id changed | decomp | low |

| 0x100397B0 | 0x000397B0 | ObjRefArray_SyncReverse_Wrap | Thin wrapper around ObjRefArray_SyncReverse | decomp | low |

| 0x10037E60 | 0x00037E60 | ObjRefListNode_Ctor | Initializes node vtbl + self-linked list + ObjRef from src | decomp | low |

| 0x10037E90 | 0x00037E90 | Vec3NormLen_SetFromVec | Stores vec3, computes length, stores normalized vec3 | decomp | low |

| 0x1003F600 | 0x0003F600 | Vec3_NotEqual | Returns true if any component differs | decomp | low |

| 0x1004DB10 | 0x0004DB10 | Vec3_Normalize | Normalizes vec3 in place | decomp | low |

| 0x1005E360 | 0x0005E360 | Vec3_Normalize_Out | Normalizes vec3 into out | decomp | low |

| 0x10039940 | 0x00039940 | ObjRefArray_InitFromRange | Initializes ObjRef list nodes from 16-byte source range | decomp | low |

| 0x10039A00 | 0x00039A00 | ObjRefArray_InitFromRange2 | Variant of ObjRef list init from 16-byte source range | decomp | low |

| 0x1003AA70 | 0x0003AA70 | ObjRefArray_InitCountFromObj | Initializes N ObjRef nodes using a single source object | decomp | low |

| 0x1003B540 | 0x0003B540 | ObjRefArray_InitCountFromObj_Wrap | Wrapper returns end pointer after init | decomp | low |

| 0x1003BB60 | 0x0003BB60 | ObjRefArray_InitFromRange2_Wrap | Wrapper around ObjRefArray_InitFromRange2 | decomp | low |

| 0x1003BDF0 | 0x0003BDF0 | ObjRefArray_Reserve | Reserves capacity for ObjRef array (16-byte nodes) | decomp | low |

| 0x1003BEF0 | 0x0003BEF0 | ObjRefArray_InsertAt | Inserts N ObjRef nodes at position; grows if needed | decomp | low |



### Array helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100397E0 | 0x000397E0 | Array8_InsertAt | Inserts 8-byte element at index; grows backing storage if needed | decomp | low |

| 0x1003A970 | 0x0003A970 | Array8_InsertAt_Default | Wrapper using default handle (off_100AF430) | decomp | low |

| 0x1003B2D0 | 0x0003B2D0 | StructList_InitWithHandle_Default | Clears handle + init list, then sets handle | decomp | low |



### Vtable helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1003B260 | 0x0003B260 | Vtable0_CallRange | Calls vtbl[0] for each object in range | decomp | low |



### Object list / pool helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10038730 | 0x00038730 | ObjList_PurgeInactive | Walks list, unlinks inactive nodes, recycles to free list | decomp | low |

| 0x1002E890 | 0x0002E890 | ObjLink_RemovePair | Removes object link entries matching (a1,a2); optional notify; returns node to pool | decomp | low |



### Spatial queries / plane tree

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1004D510 | 0x0004D510 | PlaneTree_IntersectSphere | Traverses plane tree to test sphere intersection | decomp | low |

| 0x10050350 | 0x00050350 | PlaneTree_IntersectAABB | Traverses plane tree to test AABB intersection | decomp | low |

| 0x100504C0 | 0x000504C0 | PlaneTree_IntersectBounds | Chooses AABB vs sphere test based on flag | decomp | low |



### WorldTree (world_tree.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1007BB70 | 0x0007BB70 | FilterBox | Filters box into child nodes (quadtree recurse) | decomp + world_tree.cpp | med |

| 0x1007BC20 | 0x0007BC20 | DoBoxesTouch | AABB overlap test (min/max vs min/max) | decomp + world_tree.cpp | med |

| 0x1007BCB0 | 0x0007BCB0 | base_IsPtInBoxXZ | Point-in-box test on XZ only | decomp + ltbasedefs.h | low |

| 0x1007BD00 | 0x0007BD00 | GetDimBoxStatus | Returns BackSide/FrontSide/Intersect for segment vs box | decomp + world_tree.cpp | med |

| 0x1007BD70 | 0x0007BD70 | FindObjectsInBox_R | Recurses WorldTreeNode lists + callback | decomp + world_tree.cpp | med |

| 0x1007BE00 | 0x0007BE00 | TestBoxPlane | Segment-vs-plane for box; checks other dim bounds | decomp + world_tree.cpp | med |

| 0x1007BF30 | 0x0007BF30 | TestBoxBothSides | Segment-vs-box test on both planes | decomp + world_tree.cpp | med |

| 0x1007BF80 | 0x0007BF80 | TestNode | Segment-vs-node test; recurses if intersecting | decomp + world_tree.cpp | med |

| 0x1007C090 | 0x0007C090 | IntersectSegment_R | Recurses WorldTree nodes + invokes ISCallback | decomp + world_tree.cpp | med |

| 0x1007C3A0 | 0x0007C3A0 | WorldTreeNode::AddObjectToList | Inserts WTObjLink and increments node counts | decomp + world_tree.cpp | med |

| 0x1007C3F0 | 0x0007C3F0 | WorldTree::FindObjectsInBox2 | Sets framecode then calls FindObjectsInBox_R | decomp + world_tree.cpp | med |

| 0x1007C4C0 | 0x0007C4C0 | FilterObj_R | Inserts WorldTreeObj into node list or recurses | decomp + world_tree.cpp | med |

| 0x1007C5A0 | 0x0007C5A0 | WorldTreeNode::RemoveLink | Unlinks WTObjLink and decrements node object counts | decomp + world_tree.cpp | med |

| 0x1007C670 | 0x0007C670 | WTObjLink_Init | Ties off WTObjLink and assigns node pointer | decomp + world_tree.h | low |

| 0x1007C690 | 0x0007C690 | WorldTree::FindObjectsInBox | Builds FindObjInfo and calls FindObjectsInBox2 | decomp + world_tree.cpp | med |

| 0x1007C710 | 0x0007C710 | WorldTree::IntersectSegment | Builds ISInfo and calls IntersectSegment_R | decomp + world_tree.cpp | med |

| 0x1007C7D0 | 0x0007C7D0 | WorldTreeObj::RemoveFromWorldTree | Unlinks all WTObjLinks; sets FRAMECODE_NOTINTREE | decomp + world_tree.cpp | med |

| 0x1007C850 | 0x0007C850 | WorldTree::InsertObject2 | Removes from tree, builds FilterObjInfo, recurses | decomp + world_tree.cpp | med |

| 0x1007C9A0 | 0x0007C9A0 | WorldTree::InsertObject | Calls InsertObject2 with object bbox | decomp + world_tree.cpp | low |



### Collision helpers (internal)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1004B020 | 0x0004B020 | AABB_ContainsPoint | Returns true if point inside AABB (min/max) | decomp | low |

| 0x10069730 | 0x00069730 | UseThisObject | Updates global best-hit state after filter check | decomp + fullintersectline.cpp | med |

| 0x100697D0 | 0x000697D0 | i_BoundingBoxTest | Bounding box segment test; outputs point + plane | decomp + fullintersectline.cpp | med |

| 0x100694F0 | 0x000694F0 | i_QuickSphereTest | Quick sphere reject test for intersect queries | decomp + fullintersectline.cpp | med |

| 0x10069620 | 0x00069620 | i_QuickSphereTest2 | Quick sphere reject test (vector + radius variant) | decomp + fullintersectline.cpp | med |

| 0x10069D80 | 0x00069D80 | i_OrientedBoundingBoxTest | Ray vs ModelOBB test (returns parametric t) | decomp + fullintersectline.cpp | med |

| 0x1006A110 | 0x0006A110 | i_TestWorldModel | Intersect segment with worldmodel BSP | decomp + fullintersectline.cpp | med |

| 0x1006A270 | 0x0006A270 | i_TestModelOBBS | Intersect segment with model OBBs | decomp + fullintersectline.cpp | med |

| 0x1006A640 | 0x0006A640 | i_HandlePossibleIntersection | World/model/object intersection filter pipeline | decomp + fullintersectline.cpp | med |

| 0x1006A760 | 0x0006A760 | i_FindIntersectionsHPoly | IntersectLineNode with HPOLY output | decomp + fullintersectline.cpp | med |

| 0x1006A830 | 0x0006A830 | i_FindIntersections | IntersectLine without HPOLY | decomp + fullintersectline.cpp | med |

| 0x1006A8B0 | 0x0006A8B0 | i_ISCallback | WorldTree callback filter for IntersectSegment | decomp + fullintersectline.cpp | med |

| 0x1006A900 | 0x0006A900 | i_IntersectSegment | WorldTree segment intersect; fills IntersectInfo | decomp + fullintersectline.cpp | high |

| 0x1006BA70 | 0x0006BA70 | InsideConvex | Tests point inside convex poly | decomp + intersect_line.cpp | med |

| 0x1006BC10 | 0x0006BC10 | InternalIntersectLineNode | Recursive BSP line intersect | decomp + intersect_line.cpp | med |

| 0x1006BFB0 | 0x0006BFB0 | IntersectLineNode | Wrapper to InternalIntersectLineNode | decomp + intersect_line.cpp | low |

| 0x1006BFF0 | 0x0006BFF0 | IntersectLine | Intersect segment vs BSP; returns hit node + plane | decomp + intersect_line.cpp | med |

| 0x1004B0B0 | 0x0004B0B0 | ClassifyHighX | Classify box vs plane (high X) | disasm + g_ClassifyFns | low |

| 0x1004B110 | 0x0004B110 | ClassifyLowX | Classify box vs plane (low X) | disasm + g_ClassifyFns | low |

| 0x1004B170 | 0x0004B170 | ClassifyHighY | Classify box vs plane (high Y) | disasm + g_ClassifyFns | low |

| 0x1004B1D0 | 0x0004B1D0 | ClassifyLowY | Classify box vs plane (low Y) | disasm + g_ClassifyFns | low |

| 0x1004B230 | 0x0004B230 | ClassifyHighZ | Classify box vs plane (high Z) | disasm + g_ClassifyFns | low |

| 0x1004B290 | 0x0004B290 | ClassifyLowZ | Classify box vs plane (low Z) | disasm + g_ClassifyFns | low |

| 0x1004B2F0 | 0x0004B2F0 | QueueEdgeIfIntersectsX | Edge-plane intersection helper (X) for AABB/poly test | decomp | low |

| 0x1004B360 | 0x0004B360 | QueueEdgeIfIntersectsY | Edge-plane intersection helper (Y) for AABB/poly test | decomp | low |

| 0x1004B3D0 | 0x0004B3D0 | QueueEdgeIfIntersectsZ | Edge-plane intersection helper (Z) for AABB/poly test | decomp | low |

| 0x1004B440 | 0x0004B440 | AABBIntersectsLineSegment | Separating-axis AABB vs segment test | decomp | low |

| 0x1004BB50 | 0x0004BB50 | ReallyClassifyPointsGeneric | Computes min/max plane distances for 8 box points | decomp | low |

| 0x1004BC00 | 0x0004BC00 | ClassifyPointsGeneric | Sphere vs plane test, falls back to full classify | disasm + decomp | low |

| 0x1004BC70 | 0x0004BC70 | Collision_SetupBox | Builds swept box points + spheres + AABB | decomp | low |

| 0x1004C1D0 | 0x0004C1D0 | WorldPolyIntersectsAABB | Tests world poly vs AABB intersection | decomp | low |

| 0x1004C8B0 | 0x0004C8B0 | CMovingCylinder_Recalc | Recomputes movement vectors/radius/sphere/top-bottom bounds | decomp + LithTech collision.cpp | low |

| 0x1004CA50 | 0x0004CA50 | CMovingCylinder_GetPlaneSide | Classifies cylinder vs plane (front/back/intersect) | decomp + LithTech collision.cpp | low |

| 0x1004CC30 | 0x0004CC30 | ClipPolyToYRange | Clips poly verts to Y range; outputs clipped vertices | decomp + LithTech collision.cpp | low |

| 0x1004CF30 | 0x0004CF30 | SetupAxisAlignedBox | Initializes swept AABB + encompassing sphere | decomp + LithTech collision.cpp | low |

| 0x1004D130 | 0x0004D130 | ClipOutline | Clips polygon outline to axis-aligned plane | decomp + LithTech collision.cpp | low |

| 0x1004D2A0 | 0x0004D2A0 | GetMaxYIntrusion | Clips poly to AABB; returns max Y intersection | decomp + LithTech collision.cpp | low |

| 0x1004D5C0 | 0x0004D5C0 | CalculateCollisionResponse | Computes vel/force response for plane collision | decomp | low |

| 0x1004D7E0 | 0x0004D7E0 | DoInterObjectCollisionResponse | Collision response between two objects | decomp | low |

| 0x1004DDE0 | 0x0004DDE0 | Collision_MoveToFrontside | Adjusts P1 to plane frontside after hit | decomp | low |

| 0x1004DF50 | 0x0004DF50 | Collision_ClipBoxIntoTree2 | Core BSP clip for swept box collisions | decomp | low |

| 0x1004E800 | 0x0004E800 | CMovingCylinder_CollideWith | Collides moving cylinder with WorldPoly | decomp + LithTech collision.cpp | low |

| 0x1004F040 | 0x0004F040 | CMovingCylinder_HandleCollision | Applies collision response to cylinder; stair-step attach | decomp + LithTech collision.cpp | low |

| 0x1004F1B0 | 0x0004F1B0 | CollideCylinderWithTree | Cylinder collision path (player collide) | decomp | low |

| 0x1004F8F0 | 0x0004F8F0 | StairStep_CylinderPolyIntersect | Cylinder vs poly test for stair stepping | decomp | low |

| 0x1004FD30 | 0x0004FD30 | StairStep_Segment | Handles a single stair-step segment | decomp | low |

| 0x10050160 | 0x00050160 | StairStep | Wrapper for stair stepping (subdivides movement) | decomp | low |

| 0x100ACBB4 | 0x000ACBB4 | g_ClassifyFns | Function pointer table for plane classification | data | low |

| 0x1005AB80 | 0x0005AB80 | Collision_OverlapTest | AABB/plane-tree/segment checks; sets out flag | decomp | low |

| 0x1005BCD0 | 0x0005BCD0 | Collision_TestPair | High-level collision test with flags/boxes | decomp | low |

| 0x1005BE30 | 0x0005BE30 | Collision_SweepMove | Sweeps object from start->end with collision tests | decomp | low |

| 0x1005C110 | 0x0005C110 | Physics_MoveObject_Internal | Core move/collision pipeline; handles attachments | decomp | low |

| 0x1005CAD0 | 0x0005CAD0 | Physics_MoveObject | High-level move with axis sweeps + attachments | decomp | low |

| 0x1005C750 | 0x0005C750 | Collision_ResolveWorldModel | Resolves collision against world model/plane tree | decomp | low |

| 0x1005A960 | 0x0005A960 | Collision_HandleContact | Handles collision contact/attachment + callbacks | decomp | low |

| 0x1005AC90 | 0x0005AC90 | Collision_ProcessContact | Processes contact resolution for object pairs | decomp | low |

| 0x1005B120 | 0x0005B120 | Collision_ResolveObjectPair | Resolves collision between two dynamic objects | decomp | low |

| 0x1005B640 | 0x0005B640 | Collision_ResolvePairIterative | Iterative sweep/resolve for object pairs | decomp | low |

| 0x10050D10 | 0x00050D10 | CollideWithWorld | Main world collision pipeline (point/box/cylinder) | decomp | low |

| 0x10092060 | 0x00092060 | CollideWithWorld_TempBuffers_Free | Frees temp buffers used by CollideWithWorld | decomp + xrefs | low |

| 0x10092140 | 0x00092140 | CPlayerMover::CollideWithWorldModel__cWalkStack_Dtor | atexit dtor for static std::stack<Node*> in CollideWithWorldModel | disasm + xrefs | low |

| 0x10059E90 | 0x00059E90 | SelectLargestAxisDelta | Chooses axis with largest separation | decomp | low |

| 0x100505D0 | 0x000505D0 | DoPointCollision | Point-collision loop using IntersectLine | decomp | low |

| 0x1004D6C0 | 0x0004D6C0 | DoObjectCollisionResponse | Applies collision response vs world poly | decomp | low |

| 0x1005C5E0 | 0x0005C5E0 | Collision_SweepAxis | Resolves movement along one axis via sweep | decomp | low |

| 0x1005D780 | 0x0005D780 | CollisionShape_UpdateFromDims | Updates collision shape from object dims | decomp | low |

| 0x1005E2E0 | 0x0005E2E0 | CollisionNode_InitFromObj | Initializes collision node from object + flags | decomp | low |

| 0x1005A020 | 0x0005A020 | Collision_DispatchCallbacks | Dispatches collision callbacks between two objs | decomp | low |

| 0x1005A190 | 0x0005A190 | FindObjectsCB_Collect | Callback to collect intersecting objects | decomp | low |

| 0x1005CDE0 | 0x0005CDE0 | ResolveWorldModel_CB | Callback to resolve worldmodel collisions | decomp | low |

| 0x1002AEA0 | 0x0002AEA0 | MoveContext_Init | Initializes move context struct (4 ints + zeros) | decomp | low |



### Player mover (moveplayer.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1005D260 | 0x0005D260 | CPlayerMover::ShouldCollideWithObject | Checks self/solid/worldmodel/specialnonsolid filters | decomp + moveplayer.cpp | med |

| 0x1005D2D0 | 0x0005D2D0 | CPlayerMover::ShouldTouchObject | Touch notify filter (solid vs non-solid + flags) | decomp + moveplayer.cpp | med |

| 0x1005D310 | 0x0005D310 | CPlayerMover::FindIntersectingObjects_Callback | Collects intersecting objects into array | decomp + moveplayer.cpp | med |

| 0x1005DC20 | 0x0005DC20 | CPlayerMover::GetPlaneProjection | Projects player dims onto plane normal (radius+height) | decomp + moveplayer.cpp | med |

| 0x1005DD20 | 0x0005DD20 | CPlayerMover::GetPlaneSide | Classifies point vs plane using sphere radius/projection | decomp + moveplayer.cpp | med |

| 0x1005DEE0 | 0x0005DEE0 | UpdateIntervalBounds | Updates min/max interval given value + flag | decomp + moveplayer.cpp | low |

| 0x1005DF70 | 0x0005DF70 | CPlayerMover::FindIntersectingObjects | Builds swept AABB and queries WorldTree | decomp + moveplayer.cpp | med |

| 0x1005E4E0 | 0x0005E4E0 | CPlayerMover::CalculateLineCircleIntersect | XZ circle vs segment; writes SCollideResult | decomp + moveplayer.cpp | med |

| 0x1005E7A0 | 0x0005E7A0 | CPlayerMover::CollideWithAABB_GetCornerIntersect | Corner-circle intersect for AABB collision | decomp + moveplayer.cpp | med |

| 0x1005E860 | 0x0005E860 | CPlayerMover::CollideWithAABB | AABB/OBB collision; uses object rotation + corner test | decomp + moveplayer.cpp | med |

| 0x1005F090 | 0x0005F090 | CPlayerMover::CalculateLineCylinderIntersect | Swept cylinder vs segment; writes SCollideResult | decomp + moveplayer.cpp | med |

| 0x1005F320 | 0x0005F320 | CPlayerMover::CWWM_Poly_CalcEdgeIntersect | Swept-cylinder edge test for worldmodel poly | decomp + moveplayer.cpp | med |

| 0x10060370 | 0x00060370 | CPlayerMover::CollideWithWorldModel_Poly | Tests poly collision + edge intersections | decomp + moveplayer.cpp | med |

| 0x10060D60 | 0x00060D60 | CPlayerMover::CollideWithWorldModel | BSP walk; tests planes & polys | decomp + moveplayer.cpp | med |

| 0x100610D0 | 0x000610D0 | CPlayerMover::CollideWithObject | Dispatches worldmodel vs AABB collision test | decomp + moveplayer.cpp | med |

| 0x10061190 | 0x00061190 | CPlayerMover::Collide | Collide vs blockers + objects; returns earliest hit | decomp + moveplayer.cpp | med |

| 0x10061540 | 0x00061540 | CPlayerMover::Slide | Sliding movement with collision plane handling | decomp + moveplayer.cpp | med |

| 0x10061AF0 | 0x00061AF0 | CPlayerMover::StairStep | Stair-step logic using Slide/Collide | decomp + moveplayer.cpp | med |

| 0x10061F60 | 0x00061F60 | CPlayerMover::SetStandingOn | Evaluates standing surface; attaches/detaches | decomp + moveplayer.cpp | med |

| 0x10062110 | 0x00062110 | CPlayerMover::TouchObjects | Touch notifications along movement path | decomp + moveplayer.cpp | med |

| 0x100623D0 | 0x000623D0 | CPlayerMover::MoveTo | Moves player (slide/stair/standing/touch) | decomp + moveplayer.cpp | med |



### Server connections

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10009E60 | 0x00009E60 | Server_NewConnectionNotify | Handles new connection notify; dispatches to hooks | decomp + "NewConnectionNotify" string | med |



### Server instance wrappers (unknown vtbl; returns 73 if missing)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10006280 | 0x00006280 | ServerInst_GetString_58_60 | Calls vtbl+0x3C on this+0xE8; fills buffer | decomp | low |

| 0x100062B0 | 0x000062B0 | ServerInst_Call_58_56 | Calls vtbl+0x38 on this+0xE8; returns 73 if null | decomp | low |

| 0x100062E0 | 0x000062E0 | ServerInst_GetString_58_84 | Calls vtbl+0x54 on this+0xE8; fills buffer | decomp | low |

| 0x10006320 | 0x00006320 | ServerInst_Call_58_64 | Calls vtbl+0x40 on this+0xE8; returns 73 if null | decomp | low |

| 0x1002F8A0 | 0x0002F8A0 | ServerInst_CallIfFlag_2120 | Calls sub_1002F7F0 if server flag set | decomp | low |

| 0x10030110 | 0x00030110 | ServerInst_Call_vtbl160 | Calls g_ServerInst vtbl+0xA0 (arg1, 255, a2, a3) | decomp | low |

| 0x10030140 | 0x00030140 | ServerInst_GetVarInt | Calls g_ServerInst vtbl+0x9C; returns int or -1 | decomp | low |

| 0x10030180 | 0x00030180 | ServerInst_SetVarInt | Calls g_ServerInst vtbl+0xB0 (arg,255,val) | decomp | low |

| 0x100301B0 | 0x000301B0 | ServerInst_IsVarType86 | Calls g_ServerInst vtbl+0xAC; returns ==86 | decomp | low |

| 0x100301E0 | 0x000301E0 | ServerInst_GetVarType | Calls g_ServerInst vtbl+0xA4 (arg,255) | decomp | low |

| 0x10030E20 | 0x00030E20 | ServerInst_GetVarString | Gets string var by name; returns 0 or 61 | decomp | low |

| 0x10030E80 | 0x00030E80 | ServerInst_GetVarVec3 | Gets vec3 var (type 1/2); returns 0 or 61 | decomp | low |

| 0x10030EE0 | 0x00030EE0 | ServerInst_GetVarFloat | Gets float var (type 3); returns 0 or 61 | decomp | low |

| 0x10030F10 | 0x00030F10 | ServerInst_GetVarU32 | Gets u32 var (type 4); returns 0 or 61 | decomp | low |

| 0x10030F40 | 0x00030F40 | ServerInst_GetVarByte | Gets byte var (type 5); returns 0 or 61 | decomp | low |

| 0x10030F70 | 0x00030F70 | ServerInst_GetVarIntType6 | Gets int var (type 6); returns 0 or 61 | decomp | low |

| 0x10030FA0 | 0x00030FA0 | ServerInst_GetVarQuat | Gets 4-float var (type 7); returns 0 or 61 | decomp | low |

| 0x10030FF0 | 0x00030FF0 | ServerInst_GetVarVec3_Type7 | Gets vec3 from type-7 var; returns 0 or 61 | decomp | low |

| 0x10031030 | 0x00031030 | ServerInst_GetVarStruct13C | Copies 0x13C bytes from var; returns 0 or 61 | decomp | low |

| 0x10031070 | 0x00031070 | ServerInst_GetVarTypeRaw | Returns raw var type dword | decomp | low |

| 0x10030D30 | 0x00030D30 | ServerInst_PopNode_1976 | Pops node from pool at g_ServerInstance+1976 | decomp | low |

| 0x10030D80 | 0x00030D80 | ServerInst_PushNode_2004 | Pushes node onto list; uses pool at +2004 | decomp | low |

| 0x10030DD0 | 0x00030DD0 | ServerInst_RemoveNode_2028 | Removes node by id; returns node to pool | decomp | low |

| 0x10038070 | 0x00038070 | ServerInst_MoveNode_ToList1744 | Unlinks node then inserts into list at g_ServerInstance+1744 | decomp | low |

| 0x100385A0 | 0x000385A0 | ServerInst_ClearList_1824 | Clears list at +1824; resets per-node flag and count | decomp | low |

| 0x10038620 | 0x00038620 | ServerInst_ApplyPendingFlags_1572 | Applies pending flag lists (1824/1836) to objects in list 1572, then clears lists | decomp | low |

| 0x100386F0 | 0x000386F0 | ServerInst_TickObjectsAndCleanup | Disconnect/cleanup clients, apply pending flags, drain queue, tick objects | decomp | low |

| 0x100387C0 | 0x000387C0 | ServerInst_AssignUpdateBudget | Orders list by priority and distributes time budget among objects | decomp | low |

| 0x10038900 | 0x00038900 | ServerInst_MarkObjListDirty | Clears list state and sets dirty flag in server instance | decomp | low |

| 0x10038930 | 0x00038930 | ServerInst_ResetList_64 | Clears list at +64 and returns nodes to free list | decomp | low |

| 0x10032410 | 0x00032410 | ServerInst_Call_1296_58_64 | Wrapper: ServerInst_Call_58_64(g_ServerInstance+1296) | decomp | low |

| 0x10039D00 | 0x00039D00 | ServerInst_SendMsgToList_393 | Sends small msg (u8,u8,u16) to each node in list at +393 | decomp | low |

| 0x1003B750 | 0x0003B750 | ServerInst_Ctor | Initializes server instance struct, lists, net mgr, defaults | decomp | low |

| 0x1003C4E0 | 0x0003C4E0 | ServerInst_Dtor | Full server instance teardown; clears lists, frees globals | decomp | low |

| 0x10032430 | 0x00032430 | ServerInst_Call_2140 | Calls vtbl on g_ServerInstance+2140; returns 61 if null | decomp | low |

| 0x100310E0 | 0x000310E0 | ServerInst_Call_3BB90 | Wrapper: sub_1003BB90(g_ServerInstance, a1, a2) | decomp | low |

| 0x10030A00 | 0x00030A00 | ServerInst_GetLimits_2124_2128 | Returns globals from g_ServerInstance+2124/+2128 | decomp | low |

| 0x10031210 | 0x00031210 | ServerInst_GetConfig_1852 | Copies 0x30 bytes from g_ServerInstance+1852 | decomp | low |

| 0x10031240 | 0x00031240 | ServerInst_SetConfig_1852 | Writes 0x30 bytes to g_ServerInstance+1852 + updates | decomp | low |

| 0x100313A0 | 0x000313A0 | ServerInst_GetClient_1972 | Returns ptr from g_ServerInstance+1972 | decomp | low |

| 0x100313D0 | 0x000313D0 | ServerInst_Call_366A0 | Calls sub_100366A0(g_ServerInstance, a1) | decomp | low |

| 0x100314A0 | 0x000314A0 | GetNextNodeValue_1572 | Returns list value via g_ServerInstance+1572 | decomp | low |

| 0x100315C0 | 0x000315C0 | ServerInst_Call_35BB0 | Wrapper to sub_10035BB0(g_ServerInstance, a1) | decomp | low |

| 0x100321D0 | 0x000321D0 | ServerInst_Call_52890 | Wrapper: sub_10052890(...) | decomp | low |

| 0x10032330 | 0x00032330 | ServerInst_Call_1296_58_56 | Wrapper: ServerInst_Call_58_56(g_ServerInstance+1296, a1) | decomp | low |



### Server networking / packet IO

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10008180 | 0x00008180 | NetMgr_SendPacketToConnection | Sends packet to connection; logs at debug >=5 | decomp + "Sent packet to connection %p (packet ID %d, length %d)." string | med |

| 0x100082C0 | 0x000082C0 | NetMgr_ProcessIncomingPacket | Applies drop rate + logs recv/drop | decomp + "Got packet from %p..." + "Dropping packet" strings | med |

| 0x100086C0 | 0x000086C0 | NetMgr_UpdateConnections | Ticks connections; sends queued packets; logs conn stats | decomp + "Conn %d Info - Ping" strings | med |

| 0x10009770 | 0x00009770 | NetMgr_SendOrQueuePacket | Sends immediately or queues based on send interval | decomp + NetMgr_SendPacketToConnection call | med |

| 0x100094C0 | 0x000094C0 | NetMgr_AllocQueuedPacket | Alloc/initialize queued packet node from pool | decomp + pool pop + BitStream init | low |

| 0x10006D20 | 0x00006D20 | NetMgr_LogPrintf | Net debug logging with rate/flag gating | decomp + _vsnprintf + ServerLog_Printf | med |

| 0x10006A10 | 0x00006A10 | NetMgr_QueueInsert | Inserts packet into send queue (dlist) | decomp + list pointer patch + count++ | low |

| 0x10006A80 | 0x00006A80 | NetMgr_InitListA | Clears list + sets param at +0x10 | decomp | low |

| 0x10006AC0 | 0x00006AC0 | NetMgr_InitListB | Clears list + sets param at +0x10 | decomp | low |

| 0x10039AC0 | 0x00039AC0 | NetMsg_Init | Initializes message struct + BitStream writer | decomp | low |

| 0x1003A3E0 | 0x0003A3E0 | Server_BroadcastConsoleMsg | Formats string to packet (id 13) and broadcasts | decomp | low |

| 0x1003A9B0 | 0x0003A9B0 | NetMsgPool_Alloc | Pops message from pool (allocs if empty) and initializes | decomp | low |

| 0x1003A990 | 0x0003A990 | StreamCache_SetHandle_Default | Wrapper: StreamCache_SetHandle(this, handle, off_100AF430, 0) | decomp | low |

| 0x100413E0 | 0x000413E0 | BitStreamPair_Release | Releases up to two packet refs (InterlockedDecrement) | decomp | low |

| 0x10007600 | 0x00007600 | NetMgr_Disconnect | Logs and dispatches disconnect via conn vtbl | decomp + "CNetMgr::Disconnect called" string | low |

| 0x100063A0 | 0x000063A0 | Stats_AddCountAndBytes | Updates count/bytes totals; optional aggregate | decomp | low |

| 0x10007150 | 0x00007150 | Struct94490_Ctor | vtable init + sub_1007CE70(0x2C,0x20) | decomp | low |

| 0x10007640 | 0x00007640 | NetMgr_SetAddressAndNotify | Sets address fields + notifies children via vtbl+0x6C | decomp | low |

| 0x10008110 | 0x00008110 | ConnInfo_Init | Initializes conn info struct + name + timestamp | decomp | low |

| 0x10009550 | 0x00009550 | NetMgr_AddConn_Init | Preps list + initializes conn + appends | decomp | low |

| 0x10009590 | 0x00009590 | NetMgr_AddConn_Init2 | Variant: prep list + init conn + append | decomp | low |

| 0x100095F0 | 0x000095F0 | NetMgr_ClearConnList | Drains connection list via sub_10008950 loop | decomp | low |

| 0x10009A60 | 0x00009A60 | NetMgr_Ctor | Initializes sublists, stats, and defaults | decomp | low |

| 0x10009B50 | 0x00009B50 | NetMgr_Reset | Clears lists; resets name/flags | decomp | low |

| 0x10009B90 | 0x00009B90 | NetMgr_SendPacketWindow | Builds bitstream from packet window + sends/queues | decomp | low |

| 0x10009C60 | 0x00009C60 | NetMgr_DisconnectNotify | Handles disconnect notify; updates lists + callbacks | decomp + "DisconnectNotify" string | low |

| 0x10009EF0 | 0x00009EF0 | NetMgr_ProcessNewConnQueue | Drains pending conn queue; calls Server_NewConnectionNotify | decomp | low |

| 0x10009D30 | 0x00009D30 | Queue4_Push | Pushes entry into 4-slot bucketed queue | decomp | low |

| 0x10007D90 | 0x00007D90 | Queue4_FindValue | Searches bucketed queue for value; returns cursor | decomp | low |

| 0x100093A0 | 0x000093A0 | Queue4_MoveRange | Moves a range across queue buckets | decomp | low |

| 0x100098F0 | 0x000098F0 | Queue4_Grow | Grows bucketed queue storage | decomp | low |

| 0x10008950 | 0x00008950 | NetMgr_RemoveConn | Removes connection node from list | decomp | low |

| 0x100089A0 | 0x000089A0 | NetMgr_GetPacket | Pulls packets from drivers; parses + dispatches; returns next | decomp + LithTech netmgr.cpp | med |

| 0x10006370 | 0x00006370 | NetMgr_IncRecvCounter | Increments recv PPS/BPS counters on connection | decomp + LithTech netmgr.cpp | low |

| 0x1000B7A0 | 0x0000B7A0 | NetWait_PollWithTimeout | Polls vtbl+32/36 with 3.5s timeout | decomp | low |

| 0x100163C0 | 0x000163C0 | CUDPDriver_JoinSession | UDP connect handshake; sends conn request; waits for accept | decomp + "CUDPDriver::JoinSession" + "UDP: Connection to %d.%d.%d.%d:%d accepted" strings | med |

| 0x10016E20 | 0x00016E20 | CUDPDriver_JoinSession_FromSession | Wrapper: JoinSession(this,1, a2+0x1070) | decomp | low |

| 0x10016140 | 0x00016140 | CUDPDriver_ResetState | Resets join state; clears buffers; optional WSACleanup | decomp + WSACleanup | med |

| 0x100161D0 | 0x000161D0 | CUDPDriver_Disconnect | Logs + removes connection; optional send disconnect | decomp + "CUDPDriver::Disconnect" string | low |

| 0x10016E40 | 0x00016E40 | CUDPDriver_StartWorkerThread | Starts/ensures driver worker thread; registers callback | decomp (sub_10016C80) | low |

| 0x10016E80 | 0x00016E80 | CUDPDriver_PumpNetworkThread | Wrapper: sub_10011E10 + sub_10016CB0 + tailcall 0x10011F30 | decomp | low |

| 0x10011E10 | 0x00011E10 | CUDPDriver_ProcessNewConnectionQueue | Drains pending new connections; notifies server | decomp + Server_NewConnectionNotify | low |

| 0x10011F30 | 0x00011F30 | CUDPDriver_ProcessPendingQueryResults | Drains pending query results to callback | decomp | low |

| 0x10016C80 | 0x00016C80 | CUDPDriver_WorkerThreadProc_Thunk | Thread proc trampoline (JUMPOUT 0x10015D50) | decomp | low |

| 0x10016CB0 | 0x00016CB0 | CUDPDriver_ProcessDisconnectQueue | Drains queued disconnects and calls CUDPDriver_Disconnect | decomp | low |

| 0x1000ADC0 | 0x0000ADC0 | CUDPDriver_LockGuard_Init | Stores lock ptr then locks it | decomp | low |

| 0x10010F00 | 0x00010F00 | List168_InsertAt | Inserts 168-byte element at index in dynamic list | decomp | low |

| 0x10011790 | 0x00011790 | List168_InsertAt_Wrapper | Wrapper to List168_InsertAt with off_100AF430 | decomp | low |

| 0x10008510 | 0x00008510 | List168_Wrapper_A | Wrapper to sub_10007A10 with off_100AF430 | decomp | low |

| 0x10008530 | 0x00008530 | List168_Wrapper_B | Wrapper to sub_10007B00 with off_100AF430 | decomp | low |

| 0x10010E20 | 0x00010E20 | List168_SetHandle | Updates handle via List168_Realloc/Reset | decomp | low |

| 0x1000AEE0 | 0x0000AEE0 | List168_CopyElement | Copies 0xA8 bytes and dupes string at +0x98 | decomp | low |

| 0x1000E5D0 | 0x0000E5D0 | List168_ReallocWrapper | Wrapper to sub_1000D2F0 for list growth | decomp | low |

| 0x1000F1F0 | 0x0000F1F0 | List168_ResetBuffer | Frees list buffer via sub_1000E5F0; zeroes ptrs | decomp | low |

| 0x1000D2F0 | 0x0000D2F0 | List168_AllocAndInit | Allocates list storage and zero-inits fields | decomp | low |

| 0x1000E5F0 | 0x0000E5F0 | List168_FreeAndReleaseStrings | Frees per-element string at +0x98 then releases list | decomp | low |

| 0x100067C0 | 0x000067C0 | DynArray_FindIndex_Int | Linear scan for int; returns index or -1 | decomp | low |

| 0x10007CC0 | 0x00007CC0 | DynArray_RemoveAt | Removes entry by index; may realloc + shift | decomp | low |

| 0x10008590 | 0x00008590 | DynArray_RemoveAt_DefaultAlloc | Wrapper to DynArray_RemoveAt with off_100AF430 | decomp | low |

| 0x100073F0 | 0x000073F0 | DynArray_Alloc | Allocates a1*4 via allocator vtbl+4 | decomp | low |

| 0x100073A0 | 0x000073A0 | DynArray_Alloc2 | Allocates a1*4 via allocator vtbl+4 | decomp | low |

| 0x100073C0 | 0x000073C0 | DynArray_Free | Frees buffer via allocator vtbl+8; zeros count | decomp | low |

| 0x10007370 | 0x00007370 | DynArray_Free2 | Frees buffer via allocator vtbl+8; zeros count | decomp | low |

| 0x100068C0 | 0x000068C0 | AllocU32Array_Throw | Allocates a1*4 bytes or throws bad_alloc | decomp | low |

| 0x1000CF50 | 0x0000CF50 | AllocArrayU32 | Allocates a1*4 bytes or throws bad_alloc | decomp | low |

| 0x1000CFD0 | 0x0000CFD0 | AllocArrayU32_2 | Allocates a1*4 bytes or throws bad_alloc | decomp | low |

| 0x10007E00 | 0x00007E00 | Deque_CopyRange_Backward | Copies segmented deque range backward | decomp | low |

| 0x10007EC0 | 0x00007EC0 | Deque_CopyRange_Forward | Copies segmented deque range forward | decomp | low |

| 0x10006520 | 0x00006520 | Std_ThrowDequeTooLong | Throws std::length_error(\"deque<T> too long\") | decomp | low |

| 0x1000C5B0 | 0x0000C5B0 | ThrowDequeTooLong | Throws std::length_error(\"deque<T> too long\") | decomp | low |

| 0x1000C660 | 0x0000C660 | ThrowDequeTooLong_2 | Throws std::length_error(\"deque<T> too long\") | decomp | low |

| 0x10013FC0 | 0x00013FC0 | BucketQueue_Push2 | Pushes 2 dwords into bucketed ring (allocs 16-byte buckets) | decomp | low |

| 0x10014040 | 0x00014040 | BucketQueue_Push4 | Pushes 1 dword into bucketed ring (4 slots per bucket) | decomp | low |

| 0x10012A50 | 0x00012A50 | BucketQueue_Grow2 | Grows bucketed ring for 2-slot buckets | decomp | low |

| 0x10012BC0 | 0x00012BC0 | BucketQueue_Grow4 | Grows bucketed ring for 4-slot buckets | decomp | low |

| 0x10016EA0 | 0x00016EA0 | CUDPDriver_UpdateConnections | Iterates connections; calls per-conn update; disconnects if flagged | decomp (vtable + sub_100161D0) | low |

| 0x10017350 | 0x00017350 | CUDPDriver_StopSession | Sends disconnect to all connections, then ResetState | decomp | low |

| 0x100160F0 | 0x000160F0 | CUDPDriver_ClearConnections | Clears connection list; destructs each | decomp + NetConn_dtor + Mem_Free | low |

| 0x1000CB60 | 0x0000CB60 | CUDPDriver_ConnListNext | Iterates connection list; returns next | decomp + list cursor advance | low |

| 0x1000BD30 | 0x0000BD30 | CUDPDriver_CloseSocket | Closes UDP socket + resets internal interfaces | decomp + closesocket | low |

| 0x1000B700 | 0x0000B700 | CUDPDriver_InitTCPIP | WSAStartup + logs UDP status/description; sets init flag at +0x218 | decomp + "UDP: TCP/IP initialized" string | low |

| 0x1000B960 | 0x0000B960 | CUDPDriver_GetValue_1E8 | Returns dword at this+0x1E8 under driver lock | decomp | low |

| 0x1000B820 | 0x0000B820 | CUDPDriver_SetString_1EC | Sets/allocs null-terminated string at this+0x1EC under driver lock | decomp (string copy + realloc) | low |

| 0x1000DAF0 | 0x0000DAF0 | CUDPDriver_GetString_1EC | Copies string at this+0x1EC into buffer under driver lock | decomp | low |

| 0x100054C0 | 0x000054C0 | CUDPDriver_NullOp | No-op vtable stub | decomp | low |

| 0x10004D80 | 0x00004D80 | CUDPDriver_PopPoolNode | Pops node from pool, inits vtable + clears fields | decomp | low |

| 0x1000BA20 | 0x0000BA20 | CUDPDriver_SetupLocalSockaddr | Builds local IP/port string; enumerates IP devices; logs UDP setup | decomp + "UDP: SetupLocalSockaddr" string | low |

| 0x1000B4C0 | 0x0000B4C0 | UDP_BuildSockaddrFromPort | Fills sockaddr_in from port + global IP string | decomp | low |

| 0x1000D840 | 0x0000D840 | UDP_BuildSockaddrFromString | Parses "host[:port]" into sockaddr_in (default port 27888) | decomp | low |

| 0x1000B510 | 0x0000B510 | UDP_GetMaxPortConst | Returns 0xFFFF (max port constant) | decomp | low |

| 0x1000B530 | 0x0000B530 | UDP_SelectPortFromRange | Picks initial port from configured range (random or MRU) | decomp | low |

| 0x1000B5B0 | 0x0000B5B0 | UDP_NextPortInRange | Advances to next port in range (wrap) | decomp | low |

| 0x1000B5F0 | 0x0000B5F0 | UDP_OpenBoundSocket | socket+nonblocking+SO_REUSEADDR+bind+getsockname | decomp | low |

| 0x1000B490 | 0x0000B490 | WSA_GetLastErrorString | Maps WSAGetLastError to string via table | decomp | low |

| 0x1000DA60 | 0x0000DA60 | CUDPDriver_IPDeviceList_Add | Allocates 0xA0-byte IP device entry; copies name; pushes onto list | decomp + "Internet TCP/IP" string | low |

| 0x10014FF0 | 0x00014FF0 | CUDPDriver_NullOp2 | No-op vtable stub | decomp | low |

| 0x100137E0 | 0x000137E0 | CUDPDriver_StartQuery | Binds query socket; enumerates IP devices; sets SO_BROADCAST | decomp + "CUDPDriver::StartQuery" string | low |

| 0x10013A60 | 0x00013A60 | CUDPDriver_UpdateQuery | Sends query replies + processes incoming query responses | decomp + "UpdateQuery" string | low |

| 0x1000E9D0 | 0x0000E9D0 | CUDPDriver_BuildQueryResultList | Builds linked list of query results (alloc 0x1080 each) | decomp (IP/port + name copy) | low |

| 0x1000D990 | 0x0000D990 | CUDPDriver_FindConnectionByAddr | Finds existing connection by sockaddr (port + ip) | decomp | low |

| 0x10016F60 | 0x00016F60 | CUDPDriver_HostSession | Binds host socket; logs "UDP: Hosting on"; sets session fields | decomp + "CUDPDriver::HostSession" string | low |

| 0x100170E0 | 0x000170E0 | CUDPDriver_GetPacketFromConnections | Iterates connections and returns first pending packet + conn | decomp (BitStream_Copy + ConnListNext) | low |

| 0x10017250 | 0x00017250 | CUDPDriver_OpenSocket | Opens/binds UDP socket; retries ports; logs bind failures | decomp + "CUDPDriver::OpenSocket" string | low |

| 0x10011CC0 | 0x00011CC0 | CUDPDriver_SendDisconnect | Sends disconnect packet (x4) | decomp + "UDP: Sending disconnect" string | low |

| 0x10014CA0 | 0x00014CA0 | CUDPDriver_UpdateConnTick | Updates conn: flow control + send frame | decomp | low |

| 0x1000B9A0 | 0x0000B9A0 | UDPQueryResult_Init | Zeroes core fields for query result object (size 0x1080) | decomp | low |

| 0x1000B990 | 0x0000B990 | UDPQueryResult_Ctor | Sets vtable to off_10094D1C | decomp | low |

| 0x1000D430 | 0x0000D430 | UDPQueryResult_Ctor2 | Sets vtable to off_10094D1C | decomp | low |

| 0x1000E7A0 | 0x0000E7A0 | UDPQueryResult_Ctor3 | Sets vtable to off_10094D1C | decomp | low |

| 0x1000DB54 | 0x0000DB54 | UDPQueryResult_InitWithValue | Initializes query result fields to a2 | decomp | low |

| 0x1000B9D0 | 0x0000B9D0 | UDPQueryResult_Dtor | Scalar deleting dtor (sets vtable, frees if flagged) | decomp | low |

| 0x1000E7BA | 0x0000E7BA | UDPQueryResult_Dtor2 | Scalar deleting dtor (sets vtable, frees if flagged) | decomp | low |

| 0x1000E72A | 0x0000E72A | UDPQueryResult_Dtor3 | Scalar deleting dtor (sets vtable, frees if flagged) | decomp | low |

| 0x1000BA00 | 0x0000BA00 | UDPQueryResult_ClearField_104 | Clears dword at +0x104 | decomp | low |

| 0x1000BA10 | 0x0000BA10 | UDPQueryResult_SetField_104 | Sets dword at +0x104 | decomp | low |

| 0x1000E470 | 0x0000E470 | CUDPDriver_AddConnection | Inserts accepted connection into list | decomp + list insert + count++ | low |

| 0x100154D0 | 0x000154D0 | CUDPDriver_HandleUnconnectedPacket | Handles query/conn/ping unconnected packets; builds responses | decomp + UDP: Received * strings | low |

| 0x10015160 | 0x00015160 | NetConn_ctor | Initializes net connection object + stats | decomp + vtable + InitializeCriticalSection | low |

| 0x10015380 | 0x00015380 | NetConn_dtor | Tears down net connection object | decomp + DeleteCriticalSection + frees | low |

| 0x10008080 | 0x00008080 | NetConn_Close | Closes connection; logs "Conn %p closing" | decomp + "Conn %p closing" string | low |

| 0x100079B0 | 0x000079B0 | NetConn_ClearPacketTree | Clears packet tree; releases packet refs | decomp + BitStream_ReleasePacket | low |

| 0x10010060 | 0x00010060 | NetConn_ResetCounters | Resets/accumulates counter buckets | decomp + counter sum loop | low |

| 0x10011100 | 0x00011100 | NetConn_UpdateStatsWindow | Periodically pushes stats bucket + resets counters | decomp | low |

| 0x100141A0 | 0x000141A0 | NetConn_ClearReassemblyList | Frees reassembly list + sublists | decomp + Mem_Free + NetConn_ClearPacketList | low |

| 0x1000EE20 | 0x0000EE20 | NetConn_ClearPacketList | Frees packet list; releases BitStream packets | decomp + BitStream_ReleasePacket | low |

| 0x1000B1F0 | 0x0000B1F0 | NetConn_UpdatePingAverage | Updates ping ring + logs | decomp + "UDP: Ping update" string | low |

| 0x1000B2C0 | 0x0000B2C0 | NetConn_WriteHeartbeat | Builds heartbeat payload + ACK bits | decomp + "UDP: Sending heartbeat" string | low |

| 0x1000FA70 | 0x0000FA70 | NetConn_SaveOutOfOrderPacket | Stores out-of-order packet snapshot | decomp + "UDP: Saving out of order packet" string | low |

| 0x10014440 | 0x00014440 | NetConn_SendGuaranteed | Builds/sends guaranteed packets | decomp + "UDP: Sent Guaranteed" string | low |

| 0x10014A30 | 0x00014A30 | NetConn_BuildAndSendFrame | Builds frame (heartbeat/guaranteed/unguaranteed) + sends | decomp + "UDP: Sending built frame" string | low |

| 0x10012FC0 | 0x00012FC0 | NetConn_HandleGuaranteedPacket | Handles guaranteed packet receive/reassembly | decomp + "UDP: Received guaranteed packet" string | low |

| 0x10013540 | 0x00013540 | NetConn_HandleUnguaranteedPacket | Handles unguaranteed packet receive | decomp + "Short un-guaranteed message received!" string | low |

| 0x10011550 | 0x00011550 | NetConn_EnqueueSentPacket | Allocates + enqueues sent packet node | decomp + Mem_Alloc + BitStream_InitFromPacketWindow | low |

| 0x10013EF0 | 0x00013EF0 | NetConn_QueueNodeFromFreeList | Pops free node, copies payload, appends | decomp + qmemcpy + list append | low |

| 0x10012870 | 0x00012870 | NetConn_QueueNodeAlloc | Allocates new queue node | decomp + Mem_Alloc(36) | low |

| 0x100120B0 | 0x000120B0 | NetConn_QueueNodeReuse | Reuses free node for queue append | decomp + BitStream_Copy + list append | low |

| 0x1000DBC0 | 0x0000DBC0 | NetConn_SplicePacketList | Splices packet list into another | decomp + list pointer swap | low |

| 0x1000FB10 | 0x0000FB10 | NetConn_SendUnguaranteed | Builds/sends unguaranteed packets | decomp + "UDP: Sending unguaranteed" string | low |

| 0x1000FD60 | 0x0000FD60 | NetConn_DequeuePacketWindow | Pops next packet window from conn queue | decomp + NetConn_MovePacketNode | low |

| 0x1000D7D0 | 0x0000D7D0 | NetConn_FlowControlBlocked | Flow control gate (logs when blocked) | decomp + "UDP: Flow control blocked" string | low |

| 0x1000B420 | 0x0000B420 | NetConn_GetElapsedMs | Returns timeGetTime() - this+0x14C | decomp | low |

| 0x1000B440 | 0x0000B440 | NetConn_IsTimeoutExpired | True if enabled and elapsed > 120000ms | decomp | low |

| 0x1000D500 | 0x0000D500 | NetConn_ShouldSendFrame | Returns true if enough time elapsed since last send | decomp | low |

| 0x1000D580 | 0x0000D580 | NetConn_UpdateSendInterval | Updates send interval using elapsed time clamp | decomp | low |

| 0x1000D600 | 0x0000D600 | NetConn_ResetFlowControl | Resets flow control counters; logs if verbose | decomp | low |

| 0x1000D670 | 0x0000D670 | NetConn_UpdateFlowControl | Updates flow control counters; logs if verbose | decomp | low |

| 0x1000E7E0 | 0x0000E7E0 | NetConn_CanSend | Flow control gate + send timing | decomp | low |

| 0x1000DCA0 | 0x0000DCA0 | RingBuffer_PushPair | Pushes 2 dwords into ring buffer | decomp | low |

| 0x1000E990 | 0x0000E990 | ConnList_FindIndexByAddr | Finds entry index by addr fields | decomp | low |

| 0x100109C0 | 0x000109C0 | NetConn_ClearPacketWindowQueue | Releases queued packet windows | decomp | low |

| 0x10011150 | 0x00011150 | NetConn_SendPacket | Sends packet with checksum + flow control | decomp | low |

| 0x10011850 | 0x00011850 | NetConn_ResendFrame | Sends resend frame (heartbeat + queued data) | decomp + "UDP: Resent frame %d" string | low |

| 0x10011A40 | 0x00011A40 | NetConn_ProcessGuaranteedQueue | Processes guaranteed packet queue | decomp | low |

| 0x1000F4E0 | 0x0000F4E0 | NetConn_MovePacketNode | Moves packet node between lists | decomp + list splice + BitStream_Copy | low |

| 0x1000D4D0 | 0x0000D4D0 | NetConn_SetRemoteValue_140 | Sets field at +0x144 and calls vtbl+0x0C with min | decomp (used on conn accept) | low |

| 0x1000B1A0 | 0x0000B1A0 | NetConn_CalcPacketBytes | Computes packet byte size incl overhead | decomp + size formula | low |

| 0x1000B060 | 0x0000B060 | NetConn_CalcVarIntBits | Computes bit size for var-int header | decomp + shift loop | low |

| 0x10019880 | 0x00019880 | CUDPDriver_Lock | EnterCriticalSection on driver lock | decomp + EnterCriticalSection | low |

| 0x10019890 | 0x00019890 | CUDPDriver_Unlock | LeaveCriticalSection on driver lock | decomp + LeaveCriticalSection | low |

| 0x100100C0 | 0x000100C0 | UDP_RecvFrom_BitStream | recvfrom + build bitstream; logs recvfrom errors | decomp + "UDP: recvfrom returned error %d" string | med |

| 0x10010260 | 0x00010260 | UDP_SendTo_BitStream | sendto for bitstream; optional corruption test | decomp + sendto | low |

| 0x10011DD0 | 0x00011DD0 | UDP_CloseSocketAndReset | Closes UDP socket at +0x19C; resets IO buffer | disasm + closesocket + sub_10010E20 | low |



### Server networking / bitstream helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1000A7B0 | 0x0000A7B0 | BitStream_WriteBits | Writes up to 32 bits into stream | decomp + bitmask + word flush | med |

| 0x1000A840 | 0x0000A840 | CPacket_Write::WriteBits64 | Writes up to 64 bits (splits to 2x WriteBits) | decomp + packet.cpp | high |

| 0x1000A420 | 0x0000A420 | BitStream_ReadBits | Reads up to 32 bits from stream | decomp + bitmask + cache update | med |

| 0x1000A530 | 0x0000A530 | BitStream_ReadBitsToBuffer | Reads N bits into buffer (32-bit chunks + tail bytes) | decomp | low |

| 0x10007FE0 | 0x00007FE0 | BitStream_ReadU8 | Reads 8 bits (u8) from stream | decomp + BitStream_ReadBits(8) | med |

| 0x1000A940 | 0x0000A940 | BitStream_CRC32 | CRC32 over stream bytes | decomp + CRC table loop | low |

| 0x1000B1C0 | 0x0000B1C0 | BitStream_Checksum8 | XOR-folds CRC32 to 8-bit checksum | decomp + CRC32 + byte xor | low |

| 0x1000AC00 | 0x0000AC00 | BitStream_IsEmpty | Returns true if stream has zero bits | decomp + size check | low |

| 0x10005B10 | 0x00005B10 | BitStream_InitFromWriter | Finalizes writer state into readable stream | decomp + BitWriter_AppendWord + BitStream_UpdateCache | low |

| 0x10005C90 | 0x00005C90 | BitStream_Copy | Copies stream state + refcount | decomp + refcount + UpdateCache | low |

| 0x10005C00 | 0x00005C00 | BitStream_InitEmpty | Initializes empty stream | decomp + BitStream_InitFromWriter(empty) | low |

| 0x10005D00 | 0x00005D00 | BitStream_ResetToEmpty | Copies empty stream into target; releases temp packet | decomp | low |

| 0x10005A10 | 0x00005A10 | BitStream_UpdateCache | Recomputes current dword cache from bit offset | decomp + BitStream_AdvanceToBitOffset | low |

| 0x10007450 | 0x00007450 | BitStream_InitFromPacketWindow | Initializes stream window from packet + offsets | decomp + InterlockedIncrement + UpdateCache | low |

| 0x10005340 | 0x00005340 | BitStream_AdvanceToBitOffset | Advances chunk pointer to target bit offset | decomp + chunk walk (0xFC/248 stride) | low |

| 0x1000AA20 | 0x0000AA20 | BitStream_AppendToWriter | Appends one stream into another | decomp + ReadBits/WriteBits loop | low |

| 0x1000A5A0 | 0x0000A5A0 | BitStream_SerializeToBuffer | Copies stream into flat buffer for send | decomp + chunk memcpy loop | low |

| 0x1000A910 | 0x0000A910 | BitStream_WriteBytes | Writes raw bytes into bitstream writer | decomp + alloc + BitWriter_WriteBytes | low |

| 0x1000A6F0 | 0x0000A6F0 | BitWriter_WriteBytes | Writes bytes into chunked buffer (0xF8 blocks) | decomp + memcpy + chunk alloc | low |

| 0x1000A6A0 | 0x0000A6A0 | BitStream_ReadCString | Reads null-terminated string (8-bit chars) | decomp | low |

| 0x1000AB90 | 0x0000AB90 | BitStream_WriteCString | Writes null-terminated string (8-bit chars) | decomp | low |

| 0x1000AC70 | 0x0000AC70 | CPacket_Write::Writeuint16 | Writes uint16 via WriteBits(16) | decomp + packet.h | high |

| 0x10040E00 | 0x00040E00 | CPacket_Write::WriteLTVector | Writes 3 floats (x,y,z) via WriteBits(32) | decomp + packet.h | high |

| 0x10005940 | 0x00005940 | BitWriter_AppendWord | Appends 32-bit word to chunk list | decomp + chunk fill + alloc | low |

| 0x1000B090 | 0x0000B090 | BitStream_WriteVarInt | Writes variable-length int header | decomp + bit writes | low |

| 0x1000B130 | 0x0000B130 | BitStream_ReadVarInt | Reads variable-length int header | decomp + bit reads | low |

| 0x1000ABE0 | 0x0000ABE0 | BitStream_GetBitLength | Returns bit length of stream | decomp + header size + bits | low |

| 0x1000F2C0 | 0x0000F2C0 | BitStream_Slice | Builds bitstream window from another | decomp + InitFromPacketWindow | low |

| 0x1000A370 | 0x0000A370 | BitStream_AllocPacket | Alloc small packet header from pool | decomp + pool alloc (16 bytes) | low |

| 0x1000A2B0 | 0x0000A2B0 | BitStream_AllocBlock | Alloc 0x104-byte data block from pool | decomp + pool alloc (260 bytes) | low |

| 0x1000A100 | 0x0000A100 | BitStream_ReleasePacket | Releases packet + blocks to pool | decomp + pool return | low |

| 0x1000A0B0 | 0x0000A0B0 | BitStream_FreeBlock | Returns data block to pool | decomp + pool free | low |

| 0x1000A880 | 0x0000A880 | BitStream_WriteBitsFromBuffer | Writes N bits from buffer | decomp + BitStream_WriteBits loop | low |

| 0x10005410 | 0x00005410 | BitStream_ReleaseRef | Decrements packet refcount and frees if 0 | disasm | low |

| 0x10005460 | 0x00005460 | BitStream_Release | Decrements packet refcount | decomp + InterlockedDecrement | low |

| 0x1002C260 | 0x0002C260 | BitStreamWindow_Ctor | Builds bitstream window over packet buffer | decomp | low |

| 0x1002F0C0 | 0x0002F0C0 | BitStreamWindow_InitEmpty | Initializes empty bitstream window | decomp | low |

| 0x1002F270 | 0x0002F270 | BitStreamWindow_Alloc | Allocates window object from pool | decomp | low |

| 0x1002F300 | 0x0002F300 | BitStreamWindow_AllocFromPacket | Alloc+init window from packet buffer | decomp | low |

| 0x1000F300 | 0x0000F300 | PacketWindow_ReadBitsToBuffer | Reads bits to buffer from packet window | decomp | low |

| 0x1000F440 | 0x0000F440 | PacketWindow_ReadCString | Reads C string from packet window | decomp | low |

| 0x10005260 | 0x00005260 | Mem_Alloc | Heap alloc wrapper | decomp + call thunk | low |

| 0x100846BE | 0x000846BE | Mem_Alloc_Thunk | Thin wrapper around Mem_Alloc | decomp | low |

| 0x10005270 | 0x00005270 | Mem_Free | Heap free wrapper | decomp + call thunk | low |

| 0x10066290 | 0x00066290 | NetStats_AddSampleTime | Accumulates time; triggers average recompute | decomp + threshold + NetStats_ComputeAverage | low |

| 0x10066260 | 0x00066260 | NetStats_ComputeAverage | Computes average rate over time window | decomp + value/time scaling | low |

| 0x10066230 | 0x00066230 | NetStats_Init | Initializes stat window values | decomp + constants (0.0001, 2.0) | low |

| 0x100074E0 | 0x000074E0 | NetStats_ctor | Initializes net stats struct | decomp + NetStats_Init calls | low |

| 0x1000F600 | 0x0000F600 | NetQueuedPacket_ctor | Initializes queued packet node | decomp + BitStream_InitEmpty | low |

| 0x1000B040 | 0x0000B040 | NetQueuedPacket_dtor | Releases queued packet node | decomp + BitStream_ReleasePacket | low |



### Server update / frame

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100390D0 | 0x000390D0 | Server_FrameUpdate | Per-frame/server tick update loop | decomp + "Game time: %.2f" + FindObjectsTouchingSphere tick/count logs | med |

| 0x10033A90 | 0x00033A90 | FindObjectsInSphere | Builds list of objects within radius | decomp | low |

| 0x100339C0 | 0x000339C0 | FindObjectsInSphere_Callback | Callback for spatial query; pushes obj into list | decomp | low |

| 0x10034920 | 0x00034920 | Server_BroadcastSfxMsg | Broadcasts SFX msg to clients | decomp | low |

| 0x10035C30 | 0x00035C30 | Server_ProcessPendingList | Processes pending object list; ticks count | decomp | low |

| 0x10035CB0 | 0x00035CB0 | Server_TickList_84 | Ticks list entries; calls sub_10040CE0 | decomp | low |

| 0x10035BF0 | 0x00035BF0 | Server_ClearList_1836 | Clears list at g_ServerInstance+1836 | decomp | low |



### Object update temp lists

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10091ED0 | 0x00091ED0 | ObjUpdateDeltaList_Free | Frees temp list used by Server_BuildObjectUpdates_Delta | decomp + atexit xrefs | low |

| 0x10091F10 | 0x00091F10 | ObjUpdatePriorityList_Free | Frees temp list used by Server_BuildObjectUpdates_Prioritized | decomp + atexit xrefs | low |



### Sound / audio (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100389E0 | 0x000389E0 | ServerSound_Cleanup | Frees server sound instances; logs unfreed sound files | decomp + "Unfreed sound file (server) %s" string | med |

| 0x10040AA0 | 0x00040AA0 | SetSoundTrackChangeFlags | ORs sound track change flags + adds to change list | decomp + soundtrack.cpp | med |

| 0x100678D0 | 0x000678D0 | CSoundData::Term | Clears duration/flags in sound data | decomp + sounddata.cpp | low |

| 0x100678E0 | 0x000678E0 | CSoundData::Init | Validates inputs, parses WAV header, computes duration | decomp + sounddata.cpp + wave.cpp | med |

| 0x10067970 | 0x00067970 | ReadChunk | RIFF/WAVE/LIST chunk reader for CWaveHeader | decomp + wave.cpp | med |

| 0x10067C30 | 0x00067C30 | GetWaveInfo | Reads wave header via ReadChunk; validates format | decomp + wave.cpp | med |



### Concurrency / sync helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1001D5B0 | 0x0001D5B0 | Concurrency::details::ReaderWriterLock::ReaderWriterLock | Zero-inits lock fields | disasm | low |

| 0x10085A70 | 0x00085A70 | Concurrency::details::ReaderWriterLock::ReaderWriterLock_inline | Inline ctor stub (zeroes fields) | disasm | low |



### Std exception helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100379A0 | 0x000379A0 | AllocArray16_Throw | Allocates array of 16-byte elements; throws std::bad_alloc on overflow | decomp | low |

| 0x10036810 | 0x00036810 | Std_ThrowVectorTooLong | Throws std::length_error(\"vector<T> too long\") | disasm | low |



### Struct list helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10037CD0 | 0x00037CD0 | StructList_Init | Initializes struct list header fields | decomp | low |

| 0x10037D00 | 0x00037D00 | StructList_ResetRefs | Resets list nodes and validates ObjRefs | decomp | low |



### Static init / cleanup (CRT)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10091A80 | 0x00091A80 | Init_dword_100AFFD8 | Static init: set vtbl ptr to off_10096098 | decomp | low |

| 0x10091A90 | 0x00091A90 | Init_dword_100AFFE0 | Static init: set vtbl ptr to off_100960A8 | decomp | low |

| 0x10091AA0 | 0x00091AA0 | Init_dword_100AFFE8 | Static init: set vtbl ptr to off_10096098 | decomp | low |

| 0x10091AB0 | 0x00091AB0 | Init_dword_100AFFF0 | Static init: set vtbl ptr to off_100960A8 | decomp | low |

| 0x10091AC0 | 0x00091AC0 | Init_dword_100AFFF8 | Static init: set vtbl ptr to off_10096098 | decomp | low |

| 0x10091AD0 | 0x00091AD0 | Init_dword_100B0000 | Static init: set vtbl ptr to off_100960A8 | decomp | low |

| 0x10091AE0 | 0x00091AE0 | Init_dword_100B0008 | Static init: set vtbl ptr to off_10096098 | decomp | low |

| 0x10091AF0 | 0x00091AF0 | Init_dword_100B0010 | Static init: set vtbl ptr to off_100960A8 | decomp | low |

| 0x10091B00 | 0x00091B00 | Init_dword_100B0018 | Static init: set vtbl ptr to off_10096098 | decomp | low |

| 0x10091B10 | 0x00091B10 | Init_dword_100B0020 | Static init: set vtbl ptr to off_100960A8 | decomp | low |

| 0x10091C60 | 0x00091C60 | Thunk_10032BB0 | Thunk to 0x10032BB0 (callback/cleanup cluster) | decomp | low |

| 0x10091DF0 | 0x00091DF0 | Cleanup_ILTPhysics_APIHolder_B_Callback | Cleanup callback for ILTPhysics API holder B | decomp | low |

| 0x10092000 | 0x00092000 | Thunk_1004A9E0 | Thunk to 0x1004A9E0 (callback/cleanup cluster) | decomp | low |



### CRT / OS import thunks

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100846E6 | 0x000846E6 | @__security_check_cookie@4 | CRT security cookie check | import thunk | low |

| 0x10084803 | 0x00084803 | _atexit | CRT atexit registration | import thunk | low |

| 0x10084856 | 0x00084856 | memset | CRT memset import thunk | import thunk | low |

| 0x10084880 | 0x00084880 | _CxxThrowException | C++ exception throw helper | import thunk | low |

| 0x1008489E | 0x0008489E | memcpy | CRT memcpy import thunk | import thunk | low |

| 0x100848DC | 0x000848DC | ??_V@YAXPAX@Z | CRT vector deleting dtor helper (mangled) | import thunk | low |

| 0x100849FC | 0x000849FC | ??_L@YGXPAXIHP6EX0@Z1@Z | CRT EH helper (mangled) | import thunk | low |

| 0x10084AD1 | 0x00084AD1 | ??_M@YGXPAXIHP6EX0@Z@Z | CRT EH helper (mangled) | import thunk | low |

| 0x10084D24 | 0x00084D24 | floor | CRT math import thunk | import thunk | low |

| 0x10084D86 | 0x00084D86 | __CRT_INIT@12 | CRT init routine | disasm | low |

| 0x10084FAC | 0x00084FAC | ___DllMainCRTStartup | CRT DLL entry | disasm | low |

| 0x100850C2 | 0x000850C2 | DllEntryPoint | DLL entry stub | disasm | low |

| 0x1008523C | 0x0008523C | __SEH_prolog4 | SEH prolog helper | disasm | low |

| 0x10085281 | 0x00085281 | __SEH_epilog4 | SEH epilog helper | disasm | low |

| 0x10085295 | 0x00085295 | SEH_10085480 | SEH handler thunk | disasm | low |

| 0x10085556 | 0x00085556 | _DllMain@12 | DLL main stub | disasm | low |

| 0x1008557A | 0x0008557A | ___security_init_cookie | CRT security cookie init | disasm | low |



### Winsock import thunks

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10085628 | 0x00085628 | WSAGetLastError | Winsock import thunk | import thunk | low |

| 0x1008562E | 0x0008562E | inet_addr | Winsock import thunk | import thunk | low |

| 0x10085634 | 0x00085634 | htons | Winsock import thunk | import thunk | low |

| 0x1008563A | 0x0008563A | getsockname | Winsock import thunk | import thunk | low |

| 0x10085640 | 0x00085640 | bind | Winsock import thunk | import thunk | low |

| 0x10085646 | 0x00085646 | setsockopt | Winsock import thunk | import thunk | low |

| 0x1008564C | 0x0008564C | closesocket | Winsock import thunk | import thunk | low |

| 0x10085652 | 0x00085652 | ioctlsocket | Winsock import thunk | import thunk | low |

| 0x10085658 | 0x00085658 | socket | Winsock import thunk | import thunk | low |

| 0x1008565E | 0x0008565E | WSAStartup | Winsock import thunk | import thunk | low |

| 0x10085664 | 0x00085664 | htonl | Winsock import thunk | import thunk | low |

| 0x1008566A | 0x0008566A | gethostbyname | Winsock import thunk | import thunk | low |

| 0x10085670 | 0x00085670 | gethostname | Winsock import thunk | import thunk | low |

| 0x10085676 | 0x00085676 | ntohs | Winsock import thunk | import thunk | low |

| 0x1008567C | 0x0008567C | ntohl | Winsock import thunk | import thunk | low |

| 0x10085682 | 0x00085682 | recvfrom | Winsock import thunk | import thunk | low |

| 0x10085688 | 0x00085688 | sendto | Winsock import thunk | import thunk | low |

| 0x10085694 | 0x00085694 | WSACleanup | Winsock import thunk | import thunk | low |



### Model/rez (string-verified)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10063EF0 | 0x00063EF0 | ModelInstance_Unbind | Unbinds model instance; decref model rez; frees when last | disasm + "model-rez: model-instance(%s) unbind %s" string | med |

| 0x10065A30 | 0x00065A30 | ModelInstance_Bind | Binds model instance; increments ref | disasm + "model-rez: model-instance(%s) bind %s" string | med |

| 0x10063150 | 0x00063150 | ModelInstance_CountChildModels | Counts child model list on instance | decomp + list traversal | low |

| 0x10063170 | 0x00063170 | ModelInstance::DisableTransformCache | Deletes cached transforms/info/rendering transforms | decomp + objectmgr.cpp | med |

| 0x100631C0 | 0x000631C0 | ModelInstance::FreeNodeInfo | Frees node control lists + SNodeInfo array | decomp + objectmgr.cpp | med |

| 0x10063220 | 0x00063220 | ModelInstance::GetTracker | Returns tracker by ID (0xFF = main; else list search) | disasm + AddTracker call | med |

| 0x10063310 | 0x00063310 | ModelInstance::DisableCollisionObjects | Deletes ModelOBB array + resets count | decomp + objectmgr.cpp | med |

| 0x10062E10 | 0x00062E10 | WorldModelInstance::MakeHPoly | Maps BSP node to HPOLY; falls back to original BSP | decomp + objectmgr.cpp | med |

| 0x10062EC0 | 0x00062EC0 | ModelInstance::HasNodeControlFn | Returns true if node has control list | decomp + objectmgr.cpp | med |

| 0x10062EE0 | 0x00062EE0 | ModelInstance::AddNodeControlFn_Node | Adds node control fn for specific node | decomp + objectmgr.cpp | med |

| 0x10062F20 | 0x00062F20 | ModelInstance::AddNodeControlFn_All | Adds node control fn to every node | decomp + objectmgr.cpp | med |

| 0x10062F60 | 0x00062F60 | ModelInstance::RemoveNodeControlFn_Node | Removes node control fn for specific node | decomp + objectmgr.cpp | med |

| 0x10062FE0 | 0x00062FE0 | ModelInstance::RemoveNodeControlFn_All | Removes node control fn from every node | decomp + objectmgr.cpp | med |

| 0x10063020 | 0x00063020 | ModelInstance::ApplyNodeControl | Runs node control chain for node | decomp + objectmgr.cpp | med |

| 0x10057380 | 0x00057380 | ModelInstance::IsPieceHidden | Checks hidden bit for model piece | decomp + de_objects.h | low |

| 0x10063FA0 | 0x00063FA0 | ModelInstance::SetupNodeInfo | Allocates/zeros SNodeInfo array sized to NumNodes | decomp + objectmgr.cpp | med |

| 0x10063FF0 | 0x00063FF0 | ModelInstance::ForceUpdateCachedTransforms | Rebuilds cached transforms; logs on failure | decomp + objectmgr.cpp + string | med |

| 0x10064200 | 0x00064200 | ModelInstance::EnableCollisionObjects | Allocates ModelOBB array and copies from model DB | decomp + objectmgr.cpp | med |

| 0x10064260 | 0x00064260 | ModelInstance::GetCollisionObjects | Copies ModelOBB array to user buffer | disasm + objectmgr.cpp | med |

| 0x10046880 | 0x00046880 | sm_WriteModelFiles | Writes model file refs/attachments to stream | decomp + "sm_WriteModelFiles" string | med |

| 0x100469E0 | 0x000469E0 | sm_WriteChangedModelFiles | Writes only changed model file refs | decomp + "sm_WriteChangedModelFiles" string | med |

| 0x10039E10 | 0x00039E10 | ModelRez_CacheModelFile | Loads/caches model file into server model-rez | decomp + "model-rez: server cachemodelfile %s" string | med |

| 0x10035DF0 | 0x00035DF0 | CServerMgr_LoadModel | Loads model file via ObjDB + model rez | decomp + "model-rez: server loadmodel" string | med |

| 0x10035D30 | 0x00035D30 | Server_LoadModelFromPath | Builds path + calls CServerMgr_LoadModel | decomp | low |

| 0x10039BD0 | 0x00039BD0 | ModelRez_SendLoadRequest | Sends model load/cache-load request | decomp + "model-rez: send load req" string | med |

| 0x10039EC0 | 0x00039EC0 | ModelRez_ServerUncacheModelFile | Uncaches server model file entry; decref + release | decomp + "model-rez: server uncachemodelfile %s" string | med |

| 0x10039F30 | 0x00039F30 | ModelRez_SendPreloadRequest | Sends preload request for model file id | decomp + "model-rez: send preload req fileid(%d) %s" string | med |

| 0x1003A050 | 0x0003A050 | ServerMgr_SendPreloadModelMsgToClient | Sends PRELOADLIST start, per-model preload messages, then end | decomp | med |

| 0x10021570 | 0x00021570 | ModelMgr_ForEach | Iterates model set and invokes callback | decomp + model.cpp | low |

| 0x100361F0 | 0x000361F0 | ModelRez_ServerUncacheModel | Uncaches server model + dec ref | decomp + "model-rez: server uncache" string | med |

| 0x100361C0 | 0x000361C0 | ModelRez_IsLoaded | Checks model rez entry loaded flag | decomp | low |



### World BSP

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100684D0 | 0x000684D0 | WorldBsp::MakeHPoly | Builds HPOLY from node poly; validates poly range | decomp + de_mainworld.cpp | med |



### Object manager

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10064E40 | 0x00064E40 | ObjectMgr::ObjectMgr | Initializes object banks + list heads | decomp + objectmgr.cpp | med |

| 0x10064900 | 0x00064900 | ObjectBank_LTObject_Ctor | ObjectBank init for LTObject (size 0x190) | decomp + objectmgr.cpp | low |

| 0x10064970 | 0x00064970 | ObjectBank_ModelInstance_Ctor | ObjectBank init for ModelInstance (size 0x5F0) | decomp + objectmgr.cpp | low |

| 0x100649E0 | 0x000649E0 | ObjectBank_WorldModelInstance_Ctor | ObjectBank init for WorldModelInstance (size 0x21C) | decomp + objectmgr.cpp | low |

| 0x10064A50 | 0x00064A50 | ObjectBank_SpriteInstance_Ctor | ObjectBank init for SpriteInstance (size 0x1B8) | decomp + objectmgr.cpp | low |

| 0x10064AC0 | 0x00064AC0 | ObjectBank_DynamicLight_Ctor | ObjectBank init for DynamicLight (size 0x194) | decomp + objectmgr.cpp | low |

| 0x10064B30 | 0x00064B30 | ObjectBank_CameraInstance_Ctor | ObjectBank init for CameraInstance (size 0x1B8) | decomp + objectmgr.cpp | low |

| 0x10064BA0 | 0x00064BA0 | ObjectBank_LTParticleSystem_Ctor | ObjectBank init for LTParticleSystem (size 0x254) | decomp + objectmgr.cpp | low |

| 0x10064C10 | 0x00064C10 | ObjectBank_LTPolyGrid_Ctor | ObjectBank init for LTPolyGrid (size 0x11F8) | decomp + objectmgr.cpp | low |

| 0x10064C80 | 0x00064C80 | ObjectBank_LineSystem_Ctor | ObjectBank init for LineSystem (size 0x204) | decomp + objectmgr.cpp | low |

| 0x10064CF0 | 0x00064CF0 | ObjectBank_ContainerInstance_Ctor | ObjectBank init for ContainerInstance (size 0x220) | decomp + objectmgr.cpp | low |

| 0x10064D60 | 0x00064D60 | ObjectBank_Canvas_Ctor | ObjectBank init for Canvas (size 0x19C) | decomp + objectmgr.cpp | low |

| 0x10064DD0 | 0x00064DD0 | ObjectBank_LTVolumeEffect_Ctor | ObjectBank init for LTVolumeEffect (size 0x1B4) | decomp + objectmgr.cpp | low |

| 0x100629E0 | 0x000629E0 | ObjectMgr::IncFrameCode | Increments frame code; resets WTFrameCode on overflow | decomp + objectmgr.cpp | med |

| 0x100648A0 | 0x000648A0 | om_DestroyObject | Removes object from list and frees via object bank | decomp + objectmgr.cpp | med |

| 0x10063CB0 | 0x00063CB0 | LTObject::NotifyObjRefList_Delete | Removes object from ref lists on delete | decomp + objectmgr.cpp | low |

| 0x10064810 | 0x00064810 | ObjectMgr::~ObjectMgr | Destroys object banks + clears lists | decomp | med |

| 0x10063400 | 0x00063400 | om_Init | Initializes object banks/lists; inserts into g_ObjectMgrs | decomp + objectmgr.cpp | med |

| 0x10063660 | 0x00063660 | om_CreateAttachment | Allocates + links Attachment; sets offsets/rotation | decomp + objectmgr.cpp | med |

| 0x100637C0 | 0x000637C0 | om_ClearSerializeIDs | Sets SerializeID = INVALID for all objects | decomp + objectmgr.cpp | med |



### StructBank / memory pools

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1007CE70 | 0x0007CE70 | sb_Init | Initializes StructBank sizing + cache | decomp + struct_bank.cpp | med |

| 0x1007D010 | 0x0007D010 | sb_Init2 | Init + preallocate pages | decomp + struct_bank.cpp | med |

| 0x1007CF80 | 0x0007CF80 | sb_AllocateNewStructPage | Allocates page + builds free list | decomp + struct_bank.cpp | med |

| 0x1007CF00 | 0x0007CF00 | sb_Term | Frees pages + resets bank | decomp + struct_bank.cpp | low |

| 0x1007CF40 | 0x0007CF40 | sb_Term_Duplicate | Duplicate free/reset helper (same as sb_Term) | decomp | low |



### Helpers / path

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1007D560 | 0x0007D560 | CHelpers::ExtractPathAndFileName | Splits path into dir + filename | decomp + helpers.cpp | med |

| 0x1007D600 | 0x0007D600 | CHelpers::ExtractFileNameAndExtension | Splits filename into name + ext | decomp + helpers.cpp | med |

| 0x1007D670 | 0x0007D670 | CHelpers::ExtractNames | Extracts pathname/filename/title/ext | decomp + helpers.cpp | med |

| 0x1007D830 | 0x0007D830 | CHelpers::FormatFilename | Uppercase + normalize slashes | decomp + helpers.cpp | med |



### CStringHolder (stringholder.cpp)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1007D880 | 0x0007D880 | CStringHolder::SetAllocSize | Sets alloc size (assert strings empty) | decomp + stringholder.cpp | med |

| 0x1007DC70 | 0x0007DC70 | CStringHolder::ClearStrings | Frees strings + array, resets counts | decomp + stringholder.cpp | med |

| 0x1007E2D0 | 0x0007E2D0 | CStringHolder::Dtor | Calls ClearStrings, frees array, resets vtbl | decomp + stringholder.cpp | med |

| 0x1007E450 | 0x0007E450 | CStringHolder::CStringHolder | Ctor sets vtbl, zeros fields, default alloc size 150 | decomp + stringholder.cpp | med |



### Allocators

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1007D2A0 | 0x0007D2A0 | LAllocSimpleBlock::LAllocSimpleBlock | Zeros fields (ctor/clear) | decomp + l_allocator.cpp | med |

| 0x1007D2F0 | 0x0007D2F0 | LAllocSimpleBlock::Term | Frees block via delegate; resets fields | decomp + l_allocator.cpp | med |

| 0x1007D360 | 0x0007D360 | LAllocSimpleBlock::Init | Allocates block with delegate; sets size | decomp + l_allocator.cpp | med |

| 0x1007E4F0 | 0x0007E4F0 | malloc_thunk | Tail-jump thunk to CRT malloc | disasm + import | low |

| 0x1007E500 | 0x0007E500 | free_thunk | Tail-jump thunk to CRT free | disasm + import | low |

| 0x10025C60 | 0x00025C60 | ModelRez_ClientUncacheModel | Uncaches client model + dec ref | decomp + "model-rez: client uncachemodel" string | med |

| 0x100259F0 | 0x000259F0 | ModelRez_ModelRelease | Releases model resources | decomp + "model-rez: model release" string | med |

| 0x100250C0 | 0x000250C0 | ModelInst_Ctor | Initializes model instance + resource slot | decomp | low |

| 0x1001E800 | 0x0001E800 | ModelInst_InitDefaults | Initializes model instance fields to defaults | decomp | low |

| 0x10025420 | 0x00025420 | ModelRez_ModelCtor | Model rez node constructor | decomp + "model-rez: model constr" string | med |

| 0x100257C0 | 0x000257C0 | ModelMgr_Ctor | Initializes model manager; sets vtable | decomp | low |

| 0x1001FE70 | 0x0001FE70 | ModelMgr_ResetSlots | Clears slot list + decrefs models | decomp | low |

| 0x1001FE20 | 0x0001FE20 | ModelRez_Res2_Dtor_Thunk | Thunk to ModelRez_Res2_Dtor | decomp | low |

| 0x10025780 | 0x00025780 | ModelMgr_Reset | Clears internal list + resizes storage | decomp | low |

| 0x10025740 | 0x00025740 | Struct20_ArrayFree | Calls per-elem dtor then frees array | decomp | low |

| 0x10025410 | 0x00025410 | Struct20_Dtor | Thunk to per-elem destructor | decomp | low |

| 0x10025910 | 0x00025910 | ModelInst_Reset | Resets model instance state + frees resources | decomp | low |

| 0x100258A0 | 0x000258A0 | ModelRez_ResetResource5List | Clears res5 list entries then resets | decomp | low |

| 0x10025D10 | 0x00025D10 | Align4 | Aligns size to 4-byte boundary | decomp | low |

| 0x10025DD0 | 0x00025DD0 | List_SetElemSize4 | Calls vtbl+8 with elem size 4 | decomp | low |

| 0x10025D20 | 0x00025D20 | Struct15_Zero | Zeroes 15 dwords | decomp | low |

| 0x10025DF0 | 0x00025DF0 | Struct15_Reset | Wrapper: Struct15_Zero | decomp | low |

| 0x10025E00 | 0x00025E00 | Struct15_ReadFromStream | Reads 15 dwords from stream; returns success | decomp | low |

| 0x10025F70 | 0x00025F70 | Array_GetAtOrZero | Returns array[a2] if in range; else 0 | decomp | low |

| 0x100260C0 | 0x000260C0 | Stream_Read4096_Parse | Reads 4K chunk and parses via sub_1001E9E0 | decomp | low |

| 0x1001E9E0 | 0x0001E9E0 | Thunk_1001E690 | Jump to 0x1001E690 (unknown target) | decomp | low |

| 0x10026190 | 0x00026190 | List_SetElemSize4_Self | Calls vtbl+8 with elem size 4 | decomp | low |

| 0x10026210 | 0x00026210 | Ptr_ReturnThis | Returns this | decomp | low |

| 0x10026250 | 0x00026250 | Global_SetString255 | Copies string into global 0x100A8BAF buffer | decomp | low |

| 0x100200F0 | 0x000200F0 | ModelDB_FindAnimByName | Finds anim entry by name+type; returns ptr | decomp | low |

| 0x100201E0 | 0x000201E0 | ModelDB_CountOwned | Counts anim entries owned by this | decomp | low |

| 0x10026540 | 0x00026540 | ModelDB_ReadAnimInfo | Reads anim names + bounds; logs dupes | decomp | low |

| 0x100269D0 | 0x000269D0 | FormatString_256 | vsnprintf wrapper for 256-byte buffer | decomp | low |

| 0x1001D670 | 0x0001D670 | Struct48_Init | Initializes 48-byte element (sets a2 + zeroes) | decomp | low |

| 0x10026A00 | 0x00026A00 | Struct48_AllocArrayInit | Allocates 48-byte elems and inits via sub_1001D670 | decomp | low |

| 0x10025070 | 0x00025070 | Struct32_Init | Initializes 32-byte element defaults | decomp | low |

| 0x10023F20 | 0x00023F20 | List_InitWithAllocAndLoad | Resets list + loads via sub_10020FB0 | decomp | low |

| 0x10023FA0 | 0x00023FA0 | List_InitWithAllocAndLoad2 | Resets list2 + loads via sub_10021010 | decomp | low |

| 0x10023EE0 | 0x00023EE0 | List_InitWithAllocAndLoad3 | Resets list3 + loads via sub_10020F90 | decomp | low |

| 0x10026AA0 | 0x00026AA0 | Struct32_AllocArrayInit | Allocates 32-byte elems and inits via sub_10025070 | decomp | low |

| 0x10026710 | 0x00026710 | Struct20_AllocArrayInit | Allocates 20-byte elems and inits via Struct20_Init | decomp | low |

| 0x100267B0 | 0x000267B0 | Struct236_AllocArrayInit | Allocates 236-byte elems and inits via Struct236_Init | decomp | low |

| 0x10026880 | 0x00026880 | Struct48_AllocArrayInit2 | Allocates 48-byte elems and inits via Struct48_InitDefaults | decomp | low |

| 0x10026920 | 0x00026920 | Struct28_AllocArrayInit2 | Allocates 28-byte elems and inits via Struct28_Init | decomp | low |

| 0x1001D5D0 | 0x0001D5D0 | Struct20_Init | Initializes 20-byte element defaults | decomp | low |

| 0x10025100 | 0x00025100 | Struct236_Init | Initializes 236-byte element defaults | decomp | low |

| 0x10025140 | 0x00025140 | Struct28_Init | Initializes 28-byte element defaults | decomp | low |

| 0x1001FE30 | 0x0001FE30 | Struct48_InitDefaults | Initializes 48-byte element defaults | decomp | low |

| 0x10024F90 | 0x00024F90 | Struct14_Ctor | Initializes 0x14-byte element | decomp | low |

| 0x10024110 | 0x00024110 | Struct14_Dtor | Destroys 0x14-byte element | decomp | low |

| 0x10025030 | 0x00025030 | Struct14_ArrayClear | Clears array of 0x14-byte elements | decomp | low |

| 0x10025D50 | 0x00025D50 | ModelData_CalcSize | Computes model data buffer size | decomp | low |

| 0x10026BC0 | 0x00026BC0 | Model_ReadFromStream | Reads model data from stream; allocs arrays | decomp | low |

| 0x10026F40 | 0x00026F40 | Model_ReadAnimTable | Reads animation table + entries from stream | decomp | low |

| 0x10027050 | 0x00027050 | ModelNode_Read | Reads node header + optional extra data | decomp | low |

| 0x10027170 | 0x00027170 | ModelNode_ReadTree | Reads node + child tree; builds transforms | decomp | low |

| 0x10026B40 | 0x00026B40 | ModelNode_LoadRecursive | Loads node recursively; resets on failure | decomp | low |

| 0x100262D0 | 0x000262D0 | ModelNode_Load | Loads node data (variants) from stream | decomp | low |

| 0x10026280 | 0x00026280 | ReadArray12 | Reads count and fills 12-byte array | decomp | low |

| 0x10025FA0 | 0x00025FA0 | DataBlock_Read0 | Reads data block into this+2 (size = count*elem) | decomp | low |

| 0x10025FF0 | 0x00025FF0 | DataBlock_Read1 | Reads data block into this+3 (size = count*elem) | decomp | low |

| 0x10027330 | 0x00027330 | Model_ReadNodeList | Reads node list + names from stream | decomp | low |

| 0x10027420 | 0x00027420 | Model_ReadMeshList | Reads mesh list entries; validates counts | decomp | low |

| 0x10027090 | 0x00027090 | Model_ReadIndexList | Reads index list into resized array | decomp | low |

| 0x10027110 | 0x00027110 | Call_10026DF0_Char | Wrapper to ModelRez_SetRes2_Fill | decomp | low |

| 0x10020FF0 | 0x00020FF0 | Call_10020AE0_Char | Wrapper to ModelRez_SetRes1_Fill | decomp | low |

| 0x10027130 | 0x00027130 | Call_10026E40_Char | Wrapper to ModelRez_SetRes3_Fill | decomp | low |

| 0x10027150 | 0x00027150 | Call_10026E90_Char | Wrapper to ModelRez_SetRes4_Fill | decomp | low |

| 0x100274F0 | 0x000274F0 | Model_Load | Loads .ltb model; builds model data + resources | decomp + "Error loading model" strings | med |

| 0x10029290 | 0x00029290 | LargeStruct_Reset | Clears large model-related struct (arrays + defaults) | decomp | low |

| 0x100347E0 | 0x000347E0 | StructLarge_Copy | Copies large struct with embedded arrays | decomp | low |

| 0x10029400 | 0x00029400 | Struct9_Zero | Zeroes 9 dwords | decomp | low |

| 0x10029420 | 0x00029420 | Struct9_ZeroRet1 | Zeroes 9 dwords; returns 1 | decomp | low |

| 0x10029450 | 0x00029450 | StringTable_GetIdByName | Looks up string id by name (table at this+0x1C) | decomp | low |

| 0x1002F7F0 | 0x0002F7F0 | StringTable_FindId_BinarySearch | Binary-searches sorted name list; returns id+256 | decomp | low |

| 0x10029A40 | 0x00029A40 | LargeStruct_FreeArrays | Frees two arrays + resets sizes | decomp | low |

| 0x1002A340 | 0x0002A340 | PtrVector_ClearFree | Frees ptrs in range and resets end | decomp | low |

| 0x1002A570 | 0x0002A570 | Elem5C_Dtor | Destructor for 0x5C-byte element | decomp | low |

| 0x1002A980 | 0x0002A980 | Elem5CList_Dtor | Frees list of 0x5C elements + module refs | decomp | low |

| 0x10030A30 | 0x00030A30 | ServerStringTable_GetIdByName | String table lookup (g_ServerInstance+1604) | decomp | low |

| 0x10031850 | 0x00031850 | StringTable_Remove | Removes string entry by key | decomp | low |

| 0x10031870 | 0x00031870 | StringTable_SetString | Adds/sets string entry | decomp | low |

| 0x100318A0 | 0x000318A0 | StringTable_GetString | Lookup string by key | decomp | low |

| 0x10032FB0 | 0x00032FB0 | StringTable_Resize | Resizes string table storage | decomp | low |

| 0x10033150 | 0x00033150 | StringTable_InsertOrUpdate | Inserts/updates string table entry | decomp | low |

| 0x100341F0 | 0x000341F0 | StringTable_Copy | Copies string table contents | decomp | low |

| 0x1003D580 | 0x0003D580 | StringHandle_GetPtr | Returns string pointer from handle | decomp | low |

| 0x1003D660 | 0x0003D660 | StringHandle_GetPtrOrEmpty | Returns string or empty if null handle | decomp | low |

| 0x1003D5A0 | 0x0003D5A0 | StringPool_AddCString | Adds C-string to pool; returns handle via out param | decomp | low |

| 0x1003D940 | 0x0003D940 | StringHandle_OpenFile | Opens file by handle (normalize path + File_OpenAndSize) | decomp | low |

| 0x1003DC60 | 0x0003DC60 | StringPool_ClearEntries | Clears pool entries to free list | decomp | low |

| 0x10051D10 | 0x00051D10 | StringPool_FindOrAdd | Finds string in pool or inserts; returns handle ptr | decomp | low |

| 0x10051D60 | 0x00051D60 | StringPool_GetOrCreateRecord | Finds/creates string record in pool; returns record | decomp | low |

| 0x10051EF0 | 0x00051EF0 | StringPool_FindRecord | Finds string record in pool; returns record or 0 | decomp | low |

| 0x10052CA0 | 0x00052CA0 | HashTable_Index | Computes hash bucket index via hash fn table | decomp | low |

| 0x10052CE0 | 0x00052CE0 | HashTable_FindEntry | Finds entry in hash table by key | decomp | low |

| 0x10052C40 | 0x00052C40 | HashIter_Next | Iterates to next hash entry | decomp | low |

| 0x10052E40 | 0x00052E40 | HashTable_BeginIter | Returns first entry via iterator | decomp | low |

| 0x10052DE0 | 0x00052DE0 | StringEntry_GetPtrLen | Returns string ptr; optional len out | decomp | low |

| 0x10052E00 | 0x00052E00 | StringEntry_GetValue | Returns entry value at +16 | decomp | low |

| 0x10052E20 | 0x00052E20 | StringEntry_SetValue | Sets entry value at +16 | decomp | low |

| 0x10052E60 | 0x00052E60 | HashIter_NextValue | Returns current value and advances iterator | decomp | low |

| 0x10052E90 | 0x00052E90 | HashTable_Create | Allocates/initializes hash table | decomp | low |

| 0x10053090 | 0x00053090 | HashTable_Destroy | Frees hash table and entries | decomp | low |

| 0x10053100 | 0x00053100 | HashTable_RemoveEntry | Removes entry from hash table | decomp | low |

| 0x100531A0 | 0x000531A0 | HashTable_InsertEntryCopy | Alloc+insert entry; copies key bytes | decomp | low |



### Object update state helpers (late)

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100534E0 | 0x000534E0 | ObjUpdateInfo_GetField72 | Returns *(ptr+72) or 0 | decomp | low |

| 0x10053500 | 0x00053500 | ObjUpdateInfo_GetField76 | Returns *(ptr+76) or 0 | decomp | low |

| 0x10041320 | 0x00041320 | ObjUpdate_SetPriorityForObjAndAttachments | Writes update value for obj + attached objs matching flags | decomp | low |



### Msg50 (packet id 0x32) helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10053400 | 0x00053400 | Msg50_WriteRecord | Writes msg 0x32 header + u16/u32/string | decomp | low |

| 0x100539A0 | 0x000539A0 | Msg50_SendRecord | Builds bitstream and sends via NetMgr_SendPacketWindow | decomp | low |

| 0x10053B90 | 0x00053B90 | Msg50_QueueRecord | Alloc/queue entry; optionally sends immediately | decomp | low |



### Msg queue / Msg52 helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x100533A0 | 0x000533A0 | MsgQueue_FindReadyEntry | Finds next queue entry with flag bit 2 set | decomp | low |

| 0x10053580 | 0x00053580 | MsgQueue_BaseDtor | Resets vtable + frees base list | decomp | low |

| 0x10053690 | 0x00053690 | MsgQueue_FreeEntry | Removes entry from list and returns to free list | decomp | low |

| 0x10053710 | 0x00053710 | MsgQueue_Dtor | Dtor: base cleanup + sub_1007E2D0 | decomp | low |

| 0x10053770 | 0x00053770 | MsgQueue_ClearUnsent | Scans list; frees entries without flag 4 | decomp | low |

| 0x100537F0 | 0x000537F0 | MsgQueue_SendNext | Builds/sends next queued packet (msg id 0x35) | disasm + BitStream_WriteBits | low |

| 0x10053D80 | 0x00053D80 | Msg52_SendAndClear | Sends msg 0x34 and clears pending state | decomp | low |

| 0x100533D0 | 0x000533D0 | fts_FindFileByID | Finds FTFile by fileID in FTServ list | decomp + ftserv.cpp | med |

| 0x10053E80 | 0x00053E80 | fts_ProcessPacket | File transfer service packet handler | decomp + ftserv.cpp | med |

| 0x10053FD0 | 0x00053FD0 | MsgQueue_Update | Advances queue state machine; dispatches send path | decomp | low |

| 0x100540C0 | 0x000540C0 | MsgQueue_Destroy | Clears queue, sends msg52 if pending, frees | decomp | low |



### Model / animation helpers

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x1001C450 | 0x0001C450 | trk_Reset | Resets tracker time/frame state to start | decomp + animtracker.cpp | med |

| 0x1001C530 | 0x0001C530 | trk_Init | Initializes tracker state + anim index | decomp + animtracker.cpp | med |

| 0x1001C6C0 | 0x0001C6C0 | trk_NextPositionFrame | Returns keyframe pointer for index; sets next frame | decomp + animtracker.cpp | med |

| 0x1001C700 | 0x0001C700 | trk_ProcessKey | Processes keyframe callbacks + updates frame refs | decomp + animtracker.cpp | med |

| 0x1001C8A0 | 0x0001C8A0 | AnimTimeRef::IsValid | Validates anim/frame indices and interpolation percent | decomp + animtracker.cpp | high |

| 0x1001CAF0 | 0x0001CAF0 | trk_UpdatePositionInterpolant | Updates interpolation percent between keyframes | decomp + animtracker.cpp | med |

| 0x1001CC10 | 0x0001CC10 | trk_ScanToKeyFrame | Advances tracker, processes keyframes | decomp + animtracker.cpp | med |

| 0x1001CDC0 | 0x0001CDC0 | trk_Update | Updates tracker when AT_PLAYING (calls trk_ScanToKeyFrame) | decomp + animtracker.cpp | med |

| 0x100573C0 | 0x000573C0 | trk_Loop | Sets/clears AT_LOOPING flag | decomp + animtracker.h | low |

| 0x10057350 | 0x00057350 | LTAnimTracker::SetNext | Sets tracker link next pointer | decomp + ltanimtracker.h | low |

| 0x10057360 | 0x00057360 | LTAnimTracker::SetModelInstance | Sets tracker link data (ModelInstance) | decomp + ltanimtracker.h | low |

| 0x1001E7B0 | 0x0001E7B0 | ModelAnim::GetAnimTime | Returns last keyframe time or 0 | decomp + model.cpp | high |

| 0x1001E9F0 | 0x0001E9F0 | Model_CountChildNodes | Sums child counts across slots | decomp | low |

| 0x1001EB10 | 0x0001EB10 | Model_ParseProps | Parses model properties (ShadowEnable/MaxDrawDist) | decomp | low |

| 0x1001EBF0 | 0x0001EBF0 | String_AssignDup | Duplicates string into heap | decomp | low |

| 0x1001E0C0 | 0x0001E0C0 | ModelRez_ResetResource1List_Thunk | Thunk to ModelRez_ResetResource1List | decomp | low |

| 0x1001F9E0 | 0x0001F9E0 | Struct28_AllocArrayInit | Allocates a3*28 and runs per-element ctor | decomp | low |

| 0x1001E7D0 | 0x0001E7D0 | Struct28_InitDefaults | Initializes 7-float struct defaults | decomp | low |

| 0x10027EF0 | 0x00027EF0 | Struct28_Alloc | Allocates 28-byte object + vtable init | decomp | low |

| 0x1001FAB0 | 0x0001FAB0 | ModelNodeTree_Compare | Recursively compares node trees; out=first mismatch | decomp | low |

| 0x1001FD20 | 0x0001FD20 | ModelRez_ResetResource1List_Wrap | Wrapper to ModelRez_ResetResource1List | decomp | low |

| 0x10020160 | 0x00020160 | Model_UpdateNodePositions | Updates node positions from parent transforms | decomp | low |

| 0x1001DA20 | 0x0001DA20 | Model::GetNumOBB | Returns number of OBBs in model | decomp + model.h | low |

| 0x100202A0 | 0x000202A0 | Model::GetCopyOfOBBSet | Copies OBB array into caller buffer | decomp + model.h | low |

| 0x1001FF10 | 0x0001FF10 | Model::FindPiece | Case-insensitive lookup of model piece by name | decomp + model.cpp | med |

| 0x1001FF60 | 0x0001FF60 | Model::FindWeightSet | Case-insensitive lookup of weightset by name | decomp + model.cpp | med |

| 0x10020210 | 0x00020210 | ModelNodeTree_Compare_Wrap | Wrapper to ModelNodeTree_Compare | decomp | low |



### TransformMaker

| VA | RVA | Symbol | Purpose | Evidence | Conf |

|---|---|---|---|---|---|

| 0x10063970 | 0x00063970 | TransformMaker::TransformMaker | Ctor: clears anim state and pointers | decomp + objectmgr.cpp | low |

| 0x100285B0 | 0x000285B0 | TransformMaker::IsValid | Validates anims + model/weightset constraints | decomp + transformmaker.cpp | med |

| 0x10028620 | 0x00028620 | TransformMaker::InitTransformAdditive | Computes additive node transform | decomp + transformmaker.cpp | med |

| 0x10028910 | 0x00028910 | TransformMaker::InitTransform | Computes node transform from anims | decomp + transformmaker.cpp | med |

| 0x10028B40 | 0x00028B40 | TransformMaker::BlendTransform | Blends anim into current transform (weight/additive) | decomp + transformmaker.cpp | med |

| 0x10028850 | 0x00028850 | TransformMaker::SetupCall | Validates anims + caches anim pointers | decomp + transformmaker.cpp | med |

| 0x10028D10 | 0x00028D10 | TransformMaker::Recurse | Recurse node tree to build transforms | decomp + transformmaker.cpp | med |

| 0x10028ED0 | 0x00028ED0 | TransformMaker::RecurseWithPath | Recurse only eval-path nodes | decomp + transformmaker.cpp | med |

| 0x10029080 | 0x00029080 | TransformMaker::SetupTransforms | SetupCall + Recurse(root) | decomp + transformmaker.cpp | med |

| 0x100290C0 | 0x000290C0 | TransformMaker::SetupTransformsWithPath | SetupCall + RecurseWithPath(root) | decomp + transformmaker.cpp | med |

| 0x10020850 | 0x00020850 | ModelRez_SetResource1 | Set/replace resource handle (type 1) | decomp | low |

| 0x10062CE0 | 0x00062CE0 | LTObject::SetupTransform | Builds matrix from Pos/Rot/Scale | decomp + objectmgr.cpp | med |

| 0x100640F0 | 0x000640F0 | ModelInstance::ResetCachedTransformNodeStates | Clears cached transform evaluation flags for nodes | decomp + objectmgr.cpp | med |

| 0x10062E80 | 0x00062E80 | ModelInstance::InitAnimTrackers | Re-inits trackers with model DB; ORs flags | decomp + objectmgr.cpp | med |

| 0x10065290 | 0x00065290 | ModelInstance::EnableTransformCache | Allocates cached transforms/info (and rendering cache) | decomp + objectmgr.cpp | med |

| 0x10065340 | 0x00065340 | ModelInstance::GetNumLOD | Returns num LODs for a model piece | decomp + objectmgr.cpp | med |

| 0x10065460 | 0x00065460 | ModelInstance::SetupNodePath | Marks node->root path for evaluation | decomp + objectmgr.cpp | med |

| 0x100654F0 | 0x000654F0 | ModelInstance::UpdateCollisionObjects | Updates ModelOBBs from user data + cached transforms | disasm + objectmgr.cpp | med |

| 0x10065AB0 | 0x00065AB0 | ModelInstance::GetCachedTransform | Ensures cached transform is valid, then copies LTMatrix | decomp + objectmgr.cpp | med |

| 0x10064130 | 0x00064130 | ModelInstance::UpdateCachedTransformsWithPath | Rebuilds cached transforms via path; logs missing weightsets | decomp + objectmgr.cpp + string | med |

| 0x10065B40 | 0x00065B40 | ModelInstance::GetNodeTransform (LTransform) | Returns node transform (local/world), normalized basis | decomp + objectmgr.cpp | med |

| 0x10065C80 | 0x00065C80 | ModelInstance::GetNodeTransform (LTMatrix) | Returns node transform matrix (local/world) | decomp + objectmgr.cpp | med |

| 0x10065D00 | 0x00065D00 | ModelInstance::GetSocketTransform (LTransform) | Returns socket transform (local/world) | decomp + objectmgr.cpp | med |

| 0x10065E20 | 0x00065E20 | ModelInstance::GetSocketTransform (LTMatrix) | Returns socket transform matrix (local/world) | decomp + objectmgr.cpp | med |

| 0x10065220 | 0x00065220 | ModelInstance::NodeGetParent | Returns parent node index | decomp + objectmgr.cpp | low |

| 0x10065240 | 0x00065240 | ModelInstance::NodeGetChild | Returns child node index for node+child slot | decomp + objectmgr.cpp | low |

| 0x10065270 | 0x00065270 | ModelInstance::NodeGetNumChildren | Returns NumChildren for node | decomp + objectmgr.cpp | low |

| 0x10065EF0 | 0x00065EF0 | DoMoveHint | Applies move hint for model instance before update | decomp + objectmgr.cpp | med |

| 0x10066050 | 0x00066050 | ModelInstance::ServerUpdate | DoMoveHint + trk_Update loop; reset cached transforms | decomp + objectmgr.cpp | med |

| 0x10025380 | 0x00025380 | ModelRez_ResetResource1List | Releases res1 list entries then clears | decomp | low |

| 0x10020AE0 | 0x00020AE0 | ModelRez_SetRes1_Fill | Sets res1 then fills list with ptr | decomp | low |

| 0x10020940 | 0x00020940 | ModelRez_SetResource2 | Set/replace resource handle (type 2) | decomp | low |

| 0x10026DF0 | 0x00026DF0 | ModelRez_SetRes2_Fill | Sets res2 then fills list with ptr | decomp | low |

| 0x100209B0 | 0x000209B0 | ModelRez_SetResource3 | Set/replace resource handle (type 3) | decomp | low |

| 0x10026E40 | 0x00026E40 | ModelRez_SetRes3_Fill | Sets res3 then fills list with ptr | decomp | low |

| 0x10020A20 | 0x00020A20 | ModelRez_SetResource4 | Set/replace resource handle (type 4) | decomp | low |

| 0x10026E90 | 0x00026E90 | ModelRez_SetRes4_Fill | Sets res4 then fills list with ptr | decomp | low |

| 0x10020A90 | 0x00020A90 | ModelRez_ResetResource4List | Releases res4 list entries then clears | decomp | low |

| 0x1001EC40 | 0x0001EC40 | Float7_Copy | Copies 7 dwords/floats from src to dst | disasm | low |

| 0x1001E270 | 0x0001E270 | ResRef1_Reset | Zeroes resref fields (type 1) | disasm | low |

| 0x1001E2D0 | 0x0001E2D0 | ResRef2_Reset | Zeroes resref fields (type 2) | disasm | low |

| 0x1001E2E0 | 0x0001E2E0 | ResRef3_Reset | Zeroes resref fields (type 3) | disasm | low |

| 0x1001E300 | 0x0001E300 | ResRef4_Reset | Zeroes resref fields (type 4) | disasm | low |

| 0x1001F850 | 0x0001F850 | ResRef1_Release | Releases resref handle (type 1) | disasm | low |

| 0x1001F880 | 0x0001F880 | ResRef1_Alloc | Allocates resref handle array (type 1) | disasm | low |

| 0x1001F8C0 | 0x0001F8C0 | ResRef2_Release | Releases resref handle (type 2) | disasm | low |

| 0x1001F8F0 | 0x0001F8F0 | ResRef2_Alloc | Allocates resref handle array (type 2) | disasm | low |

| 0x1001F910 | 0x0001F910 | ResRef3_Release | Releases resref handle (type 3) | disasm | low |

| 0x1001F940 | 0x0001F940 | ResRef3_Alloc | Allocates resref handle array (type 3) | disasm | low |

| 0x1001F960 | 0x0001F960 | ResRef5_Release | Releases resref handle (type 5) | disasm | low |

| 0x1001F990 | 0x0001F990 | ResRef4_Release | Releases resref handle (type 4) | disasm | low |

| 0x1001F9C0 | 0x0001F9C0 | ResRef4_Alloc | Allocates resref handle array (type 4) | disasm | low |

| 0x10020B80 | 0x00020B80 | ResRef_AllocWrapper | Wrapper: AllocU32Array_Throw(a1) | decomp | low |

| 0x10020FD0 | 0x00020FD0 | ModelRez_SetRes1_Wrap | Wrapper: ModelRez_SetResource1 | decomp | low |

| 0x10021050 | 0x00021050 | ModelRez_SetRes2_Wrap | Wrapper: ModelRez_SetResource2 | decomp | low |

| 0x10021070 | 0x00021070 | ModelRez_SetRes3_Wrap | Wrapper: ModelRez_SetResource3 | decomp | low |

| 0x10021090 | 0x00021090 | ModelRez_SetResource5 | Set/replace resource handle (type 5) | decomp | low |

| 0x10021100 | 0x00021100 | ResRef5_ResizeEntries | Resizes resource ref array (type 5) | decomp | low |

| 0x10021330 | 0x00021330 | ModelRez_SetRes4_Wrap | Wrapper: ModelRez_SetResource4 | decomp | low |

| 0x10021450 | 0x00021450 | ModelRez_FindByName | Case-insensitive lookup by model name | decomp | low |

| 0x10023F60 | 0x00023F60 | ModelRez_LoadResource1 | Wrapper: reset resource1 + load by id | decomp | low |

| 0x10023FE0 | 0x00023FE0 | ModelRez_LoadResource2 | Wrapper: reset resource2 + load by id | decomp | low |

| 0x10024020 | 0x00024020 | ModelRez_LoadResource3 | Wrapper: reset resource3 + load by id | decomp | low |

| 0x10024080 | 0x00024080 | ModelRez_LoadResource4 | Wrapper: reset resource4 + load by id | decomp | low |

| 0x10024060 | 0x00024060 | ModelRez_SetRes5_Wrap | Wrapper: ModelRez_SetResource5 | decomp | low |

| 0x100240C0 | 0x000240C0 | ModelRez_ResetResource2List | Releases res2 list entries then clears | decomp | low |

| 0x1001E910 | 0x0001E910 | ModelRez_Res2_Dtor | Res2 list destructor/reset | decomp | low |

| 0x100256C0 | 0x000256C0 | ModelRez_ResetResource3List | Releases res3 list entries then clears | decomp | low |

| 0x10024260 | 0x00024260 | ModelRez_Res3_Dtor | Res3 element destructor/reset | decomp | low |

| 0x100241F0 | 0x000241F0 | ModelRez_ModelSubInit | Initializes model sub-struct; sets vtable + clears res1 | decomp | low |

| 0x100242D0 | 0x000242D0 | Thunk_100213D0 | Jump to 0x100213D0 (unknown target) | decomp | low |

| 0x100244A0 | 0x000244A0 | Call_10022D70_GetFlag | Wrapper: RBTree_FindOrInsert + return inserted flag | decomp | low |

| 0x1001E2F0 | 0x0001E2F0 | ModelRez_ResetRes5 | Clears res5 fields (ptrs/flags) | decomp | low |

| 0x10024EF0 | 0x00024EF0 | ModelRez_LoadResource5 | Wrapper: reset res5 + init + load by id | decomp | low |

| 0x100252B0 | 0x000252B0 | Call_10024610_IsTrue | Wrapper: RBTree_EraseByKey != 0 | decomp | low |

| 0x100242E0 | 0x000242E0 | ModelRez_AddChildModelInternal | Adds child model; enforces limits; syncs node trees | decomp + "Child model limit reached" | low |

| 0x10025B40 | 0x00025B40 | ModelRez_ModelDtor | Model rez node destructor (optional free) | decomp + ModelRez_ModelRelease call | low |

| 0x10025B70 | 0x00025B70 | ModelRez_ModelDecRef | Decrements model rez refcount; frees at zero | decomp + ModelRez_ModelRelease call | low |

| 0x100251C0 | 0x000251C0 | ModelRez_LogUnfreedModelsAndClear | Logs unfreed models and clears model tree | decomp + "model-rez: unfreed model" string | med |

| 0x10063080 | 0x00063080 | ModelRez_AddChildModel | Adds child model; logs warnings on mismatch | decomp + "model-rez: add-childmodel" string | med |



| 0x00499730 | 0x00099730 | Packet_ID_LOGIN_REQUEST_Ctor | Sets packet id 0x6C (ID_LOGIN_REQUEST); clears fields | decomp | high |
| 0x0049A7F0 | 0x0009A7F0 | Packet_WriteHeader_OptionalTimestamp | Writes optional 0x19 timestamp + packet id byte from +0x428 (login request + login; client uses 0x6C/0x6E) | decomp + disasm | high |
| 0x0049B720 | 0x0009B720 | Packet_ID_LOGIN_REQUEST_Serialize | Writes Huffman username + u16 clientVersion (byte-swap gated by ShouldByteSwap) | decomp | high |
| 0x0049B3A0 | 0x0009B3A0 | BitStream_WriteCompressed_U16 | Writes 16-bit clientVersion via bitstream; byte-swap if ShouldByteSwap (0x004E3620) | decomp | med |
| 0x0049D090 | 0x0009D090 | LoginButton_OnClick | Builds Packet_ID_LOGIN_REQUEST and sends to master | decomp | high |

| 0x0049D250 | 0x0009D250 | ClientNetworking_DispatchPacket | Master/world packet dispatcher; routes 0x6D (109) to ClientNetworking_HandleLoginRequestReturn; handles addr updates (0x0E/0x13/0x14) and closes on 0x0F/10/12/15/16/17/5F | decomp + disasm | high |

| 0x0049B760 | 0x0009B760 | Packet_ID_LOGIN_REQUEST_RETURN_Read_Stub | Stub: sets success=1 + server addr; does not parse payload (Docs/Packets says status + username StringCompressor) | decomp + disasm | high |
| 0x0049CA70 | 0x0009CA70 | ClientNetworking_HandleLoginRequestReturn | Legacy 0x6D flow; builds session_md5 + sends 0x6E (mismatch vs Docs/Packets) | decomp | high |
| 0x0049C540 | 0x0009C540 | ClientNetworking_Ctor | ClientNetworking ctor; clears login strings + blob flags/buffer | decomp + disasm | high |

| 0x004B7E60 | 0x000B7E60 | Login_Invoke | Wrapper: forwards UI strings + blob args into LoginButton_OnClick | decomp + disasm | med |

| 0x0049C090 | 0x0009C090 | Packet_ID_LOGIN_Ctor | Sets packet id 0x6E; clears login auth fields/buffers | decomp + disasm | high |

| 0x0049B820 | 0x0009B820 | Packet_ID_LOGIN_Write | Writes ID_LOGIN per Docs/Packets/ID_LOGIN.md (legacy flow in client) | decomp | high |

| 0x0049A860 | 0x0009A860 | BitStream_WriteBoundedString | Writes length (bits=ceil(log2(max))) then raw bytes | decomp + disasm | med |

| 0x004E3A10 | 0x000E3A10 | BitStream_WriteHuffmanString | Huffman-encodes string then writes bits to bitstream | decomp + disasm | high |

| 0x004E37E0 | 0x000E37E0 | Huffman_GetTable | Returns Huffman table pointer (dword_11B8064) | decomp + disasm | low |

| 0x00564950 | 0x00164950 | BitStream_Write3U32_FromBuffer | Writes 3 dwords from buffer to bitstream, byte-swap if needed | decomp + disasm | med |

| 0x004E27D0 | 0x000E27D0 | BitStream_WriteBit0 | Writes a single 0 bit | decomp + disasm | low |

| 0x004E2810 | 0x000E2810 | BitStream_WriteBit1 | Writes a single 1 bit | decomp + disasm | low |

| 0x004E3620 | 0x000E3620 | ShouldByteSwap | Returns !sub_F63650 (endianness/byte-swap gate) | decomp + disasm | low |

| 0x004E3580 | 0x000E3580 | ByteSwap_Copy | Copies bytes in reverse order (endianness helper) | decomp + disasm | low |



### Packet_ID_LOGIN (0x6E) layout (Client client)

- +0x08: timestamp flag (if == 0x19, header writes timestamp)

- +0x420/+0x424: timestamp qword (set by Packet_WriteHeader_OptionalTimestamp)

- +0x428: packet id byte (0x6E)

- +0x430: string A (max 2048, Huffman)

- +0x470: string B (max 64, bounded)

- +0x4C0: string C (max 2048, Huffman)

- +0x4E0: string D[4] (each max 64, bounded)

- +0x5E0: string E[4] (each max 32, bounded)

- +0x660: string F (max 64, bounded)

- +0x6A0: string G (max 2048, Huffman)

- +0x6C0: has_blob flag (byte)

- +0x6C4: blob_u32 (dword)

- +0x6C8: blob[0x400] (1024 bytes)

- serialization: blob bytes written raw via BitStream_WriteBits8 (sub_004E2D10); blob_u32 byte-swap gated by ShouldByteSwap (0x004E3620)



### ClientNetworking login context (Client client)

- +0x91  (this+145): string A from LoginButton_OnClick Source (<=64)

- +0xD1  (this+209): string B from LoginButton_OnClick a3 (<=64)

- +0x111 (this+273): string C from LoginButton_OnClick a6 (<=64)

- +0x191 (this+401): optional blob[0x400] from LoginButton_OnClick a8 when a7!=0

- +0x594 (this+1428): blob_u32 from LoginButton_OnClick a9 when a7!=0

- +0x598 (this+1432): blob flag set by LoginButton_OnClick a7

- 0x6D handler uses +0xD1 to derive session_md5 = MD5(MD5(this+0xD1) + session_str), inserted into 0x6E



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

- 0x0C..0x10,0x1D: if item type 3/4 → raw value (0.1 scaling); else percent of g_StatScaleTable[stat].

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

| 0x0000189C | 0x0000189C | StatNameStringIdBase | Stat name localization ID base (CRes.dll string table): 0x189C + stat_id | disasm (BuildItemTooltip) | high |



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



### Item stat name strings (CRes.dll)

| StatId | StringID | Name | Evidence |

|---|---|---|---|

| 0x00 | 0x189C | Health | LoadString (CRes.dll) |

| 0x01 | 0x189D | Stamina | LoadString (CRes.dll) |

| 0x02 | 0x189E | Bio Energy | LoadString (CRes.dll) |

| 0x03 | 0x189F | Aura | LoadString (CRes.dll) |

| 0x04 | 0x18A0 | Universal Credits | LoadString (CRes.dll) |

| 0x05 | 0x18A1 | Faction Credits | LoadString (CRes.dll) |

| 0x06 | 0x18A2 | Penalty | LoadString (CRes.dll) |

| 0x07 | 0x18A3 | Prisoner Status | LoadString (CRes.dll) |

| 0x08 | 0x18A4 | Highest Penalty | LoadString (CRes.dll) |

| 0x09 | 0x18A5 | Most-Wanted Status | LoadString (CRes.dll) |

| 0x0A | 0x18A6 | Wanted Status | LoadString (CRes.dll) |

| 0x0B | 0x18A7 | Agility | LoadString (CRes.dll) |

| 0x0C | 0x18A8 | Ballistic Damage | LoadString (CRes.dll) |

| 0x0D | 0x18A9 | Energy Damage | LoadString (CRes.dll) |

| 0x0E | 0x18AA | Bio Damage | LoadString (CRes.dll) |

| 0x0F | 0x18AB | Aura Damage | LoadString (CRes.dll) |

| 0x10 | 0x18AC | Destruction | LoadString (CRes.dll) |

| 0x11 | 0x18AD | Weapon Recoil | LoadString (CRes.dll) |

| 0x12 | 0x18AE | Armor | LoadString (CRes.dll) |

| 0x13 | 0x18AF | Shielding | LoadString (CRes.dll) |

| 0x14 | 0x18B0 | Resistance | LoadString (CRes.dll) |

| 0x15 | 0x18B1 | Reflection | LoadString (CRes.dll) |

| 0x16 | 0x18B2 | Health Regeneration | LoadString (CRes.dll) |

| 0x17 | 0x18B3 | Stamina Regeneration | LoadString (CRes.dll) |

| 0x18 | 0x18B4 | Bio Regeneration | LoadString (CRes.dll) |

| 0x19 | 0x18B5 | Aura Regeneration | LoadString (CRes.dll) |

| 0x1A | 0x18B6 | Coins | LoadString (CRes.dll) |

| 0x1B | 0x18B7 | Healing Cooldown | LoadString (CRes.dll) |

| 0x1C | 0x18B8 | Food Cooldown | LoadString (CRes.dll) |

| 0x1D | 0x18B9 | Xeno Damage | LoadString (CRes.dll) |

| 0x1E | 0x18BA | Health Drain | LoadString (CRes.dll) |

| 0x1F | 0x18BB | Stamina Drain | LoadString (CRes.dll) |

| 0x20 | 0x18BC | Bio Energy Drain | LoadString (CRes.dll) |

| 0x21 | 0x18BD | Aura Drain | LoadString (CRes.dll) |

| 0x22 | 0x18BE | Protection Bypass | LoadString (CRes.dll) |

| 0x23 | 0x18BF | Effective Range | LoadString (CRes.dll) |

| 0x24 | 0x18C0 | Weapon Fire Delay | LoadString (CRes.dll) |

| 0x25 | 0x18C1 | Blank 1 | LoadString (CRes.dll) |

| 0x26 | 0x18C2 | Blank 2 | LoadString (CRes.dll) |

| 0x27 | 0x18C3 | Weight | LoadString (CRes.dll) |

| 0x28 | 0x18C4 | Jump Velocity Multiplier | LoadString (CRes.dll) |

| 0x29 | 0x18C5 | Fall Damage Multiplier | LoadString (CRes.dll) |

| 0x2A | 0x18C6 | Nightvision | LoadString (CRes.dll) |

| 0x2B | 0x18C7 | Soundless Movement | LoadString (CRes.dll) |

| 0x2C | 0x18C8 | Activation Distance | LoadString (CRes.dll) |

| 0x2D | 0x18C9 | Sprint Speed Multiplier | LoadString (CRes.dll) |

| 0x2E | 0x18CA | Max Stamina | LoadString (CRes.dll) |

| 0x2F | 0x18CB | Bio Energy Replenishing Cooldown | LoadString (CRes.dll) |



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

| 0x101C5F40 | 0x001C5F40 | ItemTemplate+0x34 (u16) | Used as clip/max‑ammo threshold vs current ammo (dx from sub_100368B0) | disasm | med |

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

### Compression helpers (Client / fom_client.exe)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x008EF030 | 0x0001F030 | Packet_WriteCompressedWorldPosU16 | Writes world position via g_pICompressWorld (3x u16 packed) | disasm | med |
| 0x00903470 | 0x00033470 | ICompress_EncodeWorldPosU16 | ICompress wrapper: encode world pos (out u16[3], in vec3) | decomp | med |
| 0x009034A0 | 0x000334A0 | ICompress_DecodeWorldPosU16 | ICompress wrapper: decode world pos (out vec3, in u16[3]) | decomp | med |
| 0x0097BBB0 | 0x000ABBB0 | Packet_WriteCompressedVec3 | Writes compressed vec3 (u32 + u16 + u16 + u8) via g_pCCompress | disasm | med |
| 0x0097BC20 | 0x000ABC20 | Packet_WriteCompressedQuat | Writes compressed quat (3 bytes + optional 3) via g_pCCompress | disasm | med |
| 0x009739A0 | 0x000A39A0 | CCompress_EncodeDirVector | Compresses direction vec (largest component + 2x 18-bit + flags) | decomp | low |
| 0x00973B40 | 0x000A3B40 | CCompress_DecodeDirVector | Decodes direction vec from CCompress_EncodeDirVector format | decomp | low |
| 0x00973CB0 | 0x000A3CB0 | CCompress_EncodeWorldPos | Packs world pos into 3x u16 + extra bits (min/max/range) | decomp | low |
| 0x00973E40 | 0x000A3E40 | CCompress_DecodeWorldPos | Unpacks world pos from 3x u16 + extra bits | decomp | low |
| 0x009740A0 | 0x000A40A0 | CCompress_DecodeQuat6B | Decodes 3/6-byte quat into float quat | decomp | low |
| 0x009742C0 | 0x000A42C0 | CCompress_EncodeQuat6B | Encodes float quat into 6-byte representation | decomp | low |

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
- CrosshairMgr::spreadCooldownMs @ 0x1A8 (float) — set to 500.0 when target mode active.
- CrosshairMgr::spreadLastTime @ 0x1AC (float) — last tick time for 1s gate.
- CrosshairMgr::targetMode @ 0x1B0 (int) — current target mode (0/1/other).
- CrosshairMgr::lastTargetMode @ 0x1B4 (int) — previous target mode (prevents repeats).
- CrosshairMgr::targetModeIsSpecial @ 0x1B8 (u8) — forces Packet_ID_B0 subId 8.

### CShell globals (CShell)
- g_pGameClientShell @ 0x103BF6F0 (CGameClientShell*) — set in CGameClientShell_Ctor, cleared in CGameClientShell_Dtor.
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

| 0x10256110 | 0x00256110 | RoundFloatToInt2 | Rounds float to nearest int (±0.5) | decomp | low |

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

| 0x1008F760 | 0x0008F760 | CWindowStatusBar_UpdateStats | Reads player stat group (index 1) and updates HUD bars + percent texts (6020–6022) | decomp | med |

| 0x10033B40 | 0x00033B40 | HandleFlashlightToggle | Gated by PlayerStats_GetStatValue(2); shows error + plays Flashlight2on.wav | decomp | low |

| 0x10039380 | 0x00039380 | HandleQuickbarItemUse | Quickbar item use gating; checks PlayerStats_GetStatValue(2,7,0x33,0x34) | decomp | low |

| 0x1003A470 | 0x0003A470 | ClientGame_Update | Per-tick update: reads stat group 1, gates warnings on stat 0/3, clears flags | decomp | low |

| 0x10181570 | 0x00181570 | HandleItemUseRequest | Item-use gating: checks PlayerStats_GetStatValue(0/2/3) vs thresholds and shows UI errors | decomp | med |

| 0x1019E840 | 0x0019E840 | PlayerInput_UpdateAimVectors | Updates view/aim vectors from ILTClient; writes EncVar vec4 idx 1 and updates playerstats (offset 120480) | decomp | med |
| 0x1019EA30 | 0x0019EA30 | PlayerInput_UpdatePitchFromMouse | Mouse Y delta -> pitch update (SharedMem 0x1D6A5) w/ invert; clamps ±50; clears pitch on movement key flags | decomp | med |
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

| 0x0B | Used as float scale (stat/1000, clamp 0.05–1.5) | PlayerInput_UpdateAndSend |

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

### Hit FX helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10016C80 | 0x00016C80 | Player_HandleHitFx | Resolves hit bone name + triggers hit FX | decomp | low |
| 0x10016910 | 0x00016910 | Obj_GetForwardVector | Computes forward vector from object rotation | decomp | low |
| 0x1000E380 | 0x0000E380 | HitFx_ApplyByHitLoc | Applies hit FX based on hit location + facing | decomp | low |
| 0x1000E090 | 0x0000E090 | ClientFX_SetSlotByName | Loads/assigns client FX by name into slot | decomp | low |
| 0x1000DDE0 | 0x0000DDE0 | ClientFX_TestFlag | Queries FX flags for slot/name | decomp | low |
| 0x1000DED0 | 0x0000DED0 | ClientFX_ResetSlot | Clears FX slot, resets names/flags | decomp | low |
| 0x1000DFD0 | 0x0000DFD0 | ClientFX_GetState | Returns FX state code (==86 used as active) | decomp | low |
| 0x1000E9D0 | 0x0000E9D0 | ClientFX_Update | Updates FX state and syncs tracker scales | decomp | low |
| 0x1000E510 | 0x0000E510 | ClientFX_UpdateByState | Chooses FX by faction/state and assigns slots | decomp | low |
| 0x1000E000 | 0x0000E000 | ClientFX_ClearSlot1IfNeeded | Clears slot 1 when pending flag set | decomp | low |
| 0x1000DF90 | 0x0000DF90 | ClientFX_ResetSlot1IfActive | Resets slot 1 if currently active | decomp | low |
| 0x1000DE30 | 0x0000DE30 | ClientFX_RestoreSlot | Restores previously cached slot entry | decomp | low |
| 0x1000E050 | 0x0000E050 | ClientFX_SetState | Sets state field (this+17) | decomp | low |

### Animation helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D8E0 | 0x0000D8E0 | Animator_Ctor | Initializes Animator fields + default tracker ids | decomp | low |
| 0x1000D850 | 0x0000D850 | Animator_WeightSetName | Returns weightset name by index (Upper/Lower/Recoil_*) | decomp | low |
| 0x1000D960 | 0x0000D960 | Animator_InitTrackers | Adds animation trackers (Upper/Lower/Recoil) | decomp | low |
| 0x1000DD70 | 0x0000DD70 | Animator_ClearTrackers | Removes trackers 1..4 from object | decomp | low |
| 0x1000EB50 | 0x0000EB50 | Animator_InitFullTracker | Adds single "Full" tracker | decomp | low |
| 0x1000EC60 | 0x0000EC60 | Animator_ClearFullTracker | Removes "Full" tracker | decomp | low |

### AI helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D390 | 0x0000D390 | AINode_Ctor | Initializes AINode (vtbl + fields) | decomp | low |

### PowerUp / Swarm helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D5B0 | 0x0000D5B0 | PowerUp_OnMessage | Handles PowerUp messages (spawns FX / stops) | decomp | low |
| 0x1000D420 | 0x0000D420 | PowerUp_StopFx | Stops powerup FX (via sub_1006D9D0) | decomp | low |
| 0x1000D770 | 0x0000D770 | SwarmObj_ReadProps | Reads SwarmType/Radius props | decomp | low |

### Attachment helpers (Object.lto)

| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000F170 | 0x0000F170 | CAttachment_Ctor | Initializes attachment record | decomp | low |
| 0x1000F540 | 0x0000F540 | CAttachment_Detach | Detaches and destroys attached object | decomp | low |
| 0x1000F600 | 0x0000F600 | CAttachment_Init | Sets owner/object/socket; updates local state | decomp | low |
| 0x1000F470 | 0x0000F470 | CAttachmentPosition_Ctor | Initializes attachment position | decomp | low |
| 0x1000F710 | 0x0000F710 | CAttachmentPosition_Dtor | Frees attachment position | decomp | low |
| 0x1000F7A0 | 0x0000F7A0 | CAttachmentPosition_Clear | Clears attachment and sets name to \"<nothing>\" | decomp | low |
| 0x1000F880 | 0x0000F880 | CAttachment_CreateItemModel | Spawns item model and attaches to owner | decomp | low |
| 0x1000FE90 | 0x0000FE90 | CAttachment_CreateLogo | Spawns team/role logo and attaches to owner | decomp | low |
| 0x1000FBD0 | 0x0000FBD0 | CAttachment_CreatePropByName | Spawns prop (Hamburger/Cigarette/Handy) and attaches | decomp | low |
- u8 hitDir? (compressed)
Hit handler:
- 0x10016C80 Player_HandleHitFx (maps hitType → bone name, spawns hit effect)

Helpers (msgId 0x94 avatar change):
- 0x1005BBA0 Packet_ID_AVATAR_CHANGE_Ctor

Packet_ID_AVATAR_CHANGE (msgId 0x94) layout (observed):
- u32c playerId
- ProfileBlockC (0x32 bytes)
Applies via `WorldLogin_ApplyProfileCToPlayer` (0x10017DE0).

Helpers (msgId 0x95 chat):
- 0x1004C810 Packet_ID_CHAT_Ctor
- 0x1004F470 Packet_ID_CHAT_Read

Packet_ID_CHAT (msgId 0x95) layout (observed):
- u8 type
- u32c senderId
- if type in {1,9,12}: u32c targetId
- if type==10: string (len 0x800)
- else: bit + optional u8 color? then string A (0x800) + string B (0x800)

Chat color mapping (colorId -> textColor/outlineColor):
- 0: FFFFFF00 / D2D2D200
- 1,5: FFED0000 / FFFF0000
- 2: B4FF6400 / B4FF0000
- 3: 64FFA200 / 00FFA200
- 4: FF828200 / FF878700
- 6: FFD26400 / FFB90F00 (sets flag)
- 7: 90D7FF00 / 7CC5FD00
- 8: CE90FF00 / C57CFD00

Helpers (msgId 0x96 taunt):
- 0x10050DF0 Handle_MSG_ID_TAUNT (inline read)

Packet_ID_TAUNT (msgId 0x96) layout (observed):
- u8 tauntId
- u32c characterId

Helpers (msgId 0xA1 object details):
- 0x100161B0 Packet_ID_OBJECT_DETAILS_Ctor
- 0x10017470 Packet_ID_OBJECT_DETAILS_Read
- 0x100162F0 Packet_ReadEncodedString_0x800
- 0x10016860 BitStream_ReadU8Compressed
- 0x10017400 ObjectDetails_ReadEntryGList
- 0x1004DA70 Character_SetString_80_len19
- 0x1004DAA0 Character_SetString_328_len31
- 0x1004DAD0 Character_SetString_360_len63
- 0x1004DB00 Character_SetString_2379
- 0x1004DB30 Character_SetString_2384

Packet_ID_OBJECT_DETAILS (msgId 0xA1) layout (observed):
- u32c objectId
- u8c detailType
- bit hasDetails
- if hasDetails:
  - string A (0x800)
  - string B (0x800)
  - string C (0x800)
  - EntryG list (u32c count + 10x 12-byte entries)
  - u8c field_1326
  - string D (0x800)
  - u8c field_1331
  - string E (0x800)
  - u8c field_1336
  - bit field_1325
  - bit field_1324
- else: u32c fallbackId
