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
| 0x008112F0 | 0x004112F0 | ItemTemplate_IsTypeInSpecialSet | Type?based switch for types 6..; fallback: id in {0x3CD..0x3CF, 985} | decomp | low |
| 0x00811390 | 0x00411390 | ItemTemplate_IsTypeWithCountGate | Type 0x10..0x12 needs a2>1; type 0x13 needs a3>1; a4 must be <2 | decomp | low |
| 0x008115B0 | 0x004115B0 | ItemTemplate_AdjustQuantityByType | Adjusts quantity based on id/type; scales by constants; halves if a5 set | decomp | low |
| 0x00811F40 | 0x00411F40 | ItemTemplate_GetClassGroup | Returns `template->group` (byte @ +0x02) or armor group via GetArmorClassIndex->ArmorClassIndex_ToGroup | decomp | med |
| 0x00817090 | 0x00417090 | ArmorClass_FillStatBlockA | Armor class switch (0..0x2E) populates stat block; uses ItemTemplate_GetArmorClassIndex | decomp | low |
| 0x008177E0 | 0x004177E0 | ArmorClass_FillStatBlockB | Armor class switch (0..0x2E) populates alt stat block | decomp | low |
| 0x0081AA60 | 0x0041AA60 | ItemList_SumWeaponCounts | Sums stack counts for type 3/4 items in list (size 44 entries) | decomp | low |
| 0x008209C0 | 0x004209C0 | ItemStats_ProcessAll_WithScale | Builds stat entries for item; applies multiplier for stat 39; consumes base stat blocks | decomp | low |
| 0x00820B50 | 0x00420B50 | ItemStats_ProcessAll_NoScale | Builds stat entries for item without multiplier; per?stat jump table | decomp | low |
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
    - Layout: loop { u16 objectId, u4 flags }. If objectId==0xFFFF ? read float gameTime + update tick. Flags: 0x4 pos (+optional vel), 0x8 alt rot, 0x2 quat rot, 0x1 modelinfo (Update_ReadModelInfoBlock).
  - ID 11 `SMSG_(unused)`           -> no handler set
  - ID 12 `SMSG_YOURID`             -> `HandleIDPacket` VA `0x00424EF0` RVA `0x00024EF0`
  - ID 13 `SMSG_MESSAGE`            -> `OnMessagePacket` VA `0x00426F50` RVA `0x00026F50`

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

### RakNet send loop / sendto wrappers (Client)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00D46780 | 0x00946780 | Net_SendLoop_Worker | Send thread worker; ticks send loop and waits on socket events | decomp | med |
| 0x00D44520 | 0x00944520 | Net_SendLoop_Tick | Core send tick: drains recv, processes queues/timeouts, builds and sends packets | decomp | med |
| 0x00D63570 | 0x00963570 | Net_SendPacket_Internal | Prepares packet + dispatch to sendto wrapper | decomp | low |
| 0x00D35E90 | 0x00935E90 | Net_SendTo_WSAWrapper | WSA send wrapper (sockaddr build + sendto) | decomp | low |
| 0x00D35E39 | 0x00935E39 | Net_SendTo_impl | Lowest sendto loop (retry until success) | decomp | low |
| 0x00D64430 | 0x00964430 | BitStream_WritePacketPayloadBlob | Writes payload blob into bitstream buffer | decomp | low |
| 0x00D323E0 | 0x009323E0 | BitStream_WriteBytes_Raw | Writes raw bytes into bitstream (no align) | decomp | low |
| 0x00D328E0 | 0x009328E0 | BitStream_WriteBytes_Align | Writes raw bytes into bitstream (byte-align) | decomp | low |

Packet ID notes (client side):
- 0x05 Secured Connection Response (RSA payload, carries server part used to derive session key).
- 0x06 Secured Connection Confirmation (size 85; cookie + RSA(random)).
- 0x11 NEW_INCOMING_CONNECTION in RakNet 3.611; **0x19 timestamp header is confirmed in FoM** (client reads u64 timestamp via BitStream::Read 64 bits, then msg id).
- StringCompressor/Huffman confirmed in FoM:
  - `sub_F63A10` (VA 0x00F63A10) write Huffman string
  - `sub_F63B30` (VA 0x00F63B30) read Huffman string
  - `sub_F1A420` (VA 0x00F1A420) write **compressed u32 length** for StringCompressor (RakNet WriteCompressed; endian swap if `sub_F63620()` true)
  - `sub_F1C280` (VA 0x00F1C280) read **compressed u32 length** for StringCompressor (RakNet ReadCompressed; endian swap if `sub_F63620()` true)
  - `RakNet_BitStream_WriteCompressed` (VA 0x00F62D10, was `sub_F62D10`) core WriteCompressed (byte prefix bits + 4?bit/8?bit tail)
  - `RakNet_BitStream_ReadCompressed` (VA 0x00F62FA0, was `sub_F62FA0`) core ReadCompressed (byte prefix bits + 4?bit/8?bit tail)
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

