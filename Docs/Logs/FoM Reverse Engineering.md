# FoM Reverse Engineering Log

- [x] [01/01/26-11:48PM] Render path: display-list clone + SetRenderMode handlers (fom_client.exe)
  - Context: Continue render-path mapping toward a safe ImGui hook point.
  - Acceptance: Found render function-table entries for display list clone/free and SetRenderMode; renamed functions; AddressMap.md updated.
  - Validation: IDA decomp of RenderList_BuildAndClone / RenderList_FreeClone / Render_SetRenderMode.
  - Dependencies: fom_client.exe IDB via IDA MCP (port 13337).
  - Status: Done.

- [x] [01/01/26-11:17PM] Render path: D3D9 init + CreateDevice flow (fom_client.exe)
  - Context: Locate render-path entry points and the IDirect3DDevice9 creation site for future ImGui hook.
  - Acceptance: Renamed D3D9 manager/init functions; identified Renderer_CreateDevice wrapper; AddressMap.md updated with FoTD base addresses.
  - Validation: IDA decomp of D3D9Mgr_Init/D3D9Mgr_EnumerateAdapters/Renderer_CreateDevice/Renderer_InitDevice.
  - Dependencies: fom_client.exe IDB via IDA MCP (port 13337).
  - Status: Done.

- [x] [01/01/26-09:36AM] CrosshairMgr_Update: struct + Packet_ID_B0 writer renames
  - Context: Improve readability of spread/target gating logic used by MSG_ID 0x6E.
  - Acceptance: CrosshairMgr struct created; CrosshairMgr_Update typed to struct; Packet_ID_B0 ctor/write/dtor renamed; AddressMap.md updated with field offsets.
  - Validation: IDA2 decomp after type/rename pass.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [01/01/26-09:45AM] g_pGameClientShell mapping + ctor/dtor names
  - Context: Identify owner of dword_103BF6F0 used in crosshair spread scaling.
  - Acceptance: Renamed global to g_pGameClientShell; created CGameClientShell struct (field_24); renamed ctor/dtor; AddressMap.md updated.
  - Validation: IDA2 decomp of CGameClientShell_Ctor/Dtor.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [01/01/26-09:49AM] recoilScale field name + camera distance helpers
  - Context: Clarify g_pGameClientShell->field_24 usage in crosshair spread and camera distance.
  - Acceptance: Renamed field_24 -> recoilScale; renamed CameraDistance_GetCVar/ApplyDeltaScaled; AddressMap.md updated.
  - Validation: IDA2 decomp of 0x10014BC0/0x10014D70.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [01/01/26-10:16AM] Movement input + unguaranteed update details
  - Context: Focus movement/input send path and inbound movement replication.
  - Acceptance: Renamed PlayerInput_UpdateAimVectors / PlayerInput_UpdatePitchFromMouse; expanded SMSG_UNGUARANTEEDUPDATE field map in AddressMap.md.
  - Validation: IDA2 decomp (CShell) + IDA decomp (fom_client) for OnUnguaranteedUpdatePacket.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338); fom_client.exe IDB via IDA MCP (port 13337).
  - Status: Done.

- [x] [01/01/26-04:58PM] CrosshairMgr: flag map + recoil/spread linkage
  - Context: Required full clarity for MSG_ID 0x6E crosshair flow and recoil mapping.
  - Acceptance: AddressMap.md updated with xhair flag map + CrosshairMgr_Update (spread formula).
  - Validation: IDA2 decomp of CrosshairMgr_OnMessage + CrosshairMgr_Update.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [01/01/26-04:49PM] Rename MSG_ID handlers + CrosshairMgr locals
  - Context: Finish MSG_ID cleanup by standardizing handler names and improving CrosshairMgr readability.
  - Acceptance: CShell function names normalized (MsgId_*); CrosshairMgr_OnMessage key locals renamed.
  - Validation: IDA2 rename via Hex‑Rays lvar renamer.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [01/01/26-04:38PM] Fill remaining MSG_ID payload layouts (CShell)
  - Context: Continue MSG_ID mapping for 0x6A/6E/70/76/77/7E/81/83/84/85/86/88/8C/8E/8F/9A/9B/9D.
  - Acceptance: AddressMap.md updated with payload layouts and CrosshairMgr (0x6E) summary.
  - Validation: IDA2 decomp of CGameClientShell_OnMessage + handlers.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [01/01/26-04:13PM] Decode spawn payload + object message packet path
  - Context: Continue SMSG_UPDATE spawn flow (object def block, sub‑block message path, object spawn).
  - Acceptance: AddressMap.md updated with Update_ReadObjectDefBlock layout + object message packet path functions.
  - Validation: IDA MCP decomp/disasm for Update_ReadObjectDefBlock, World_AddObjectFromUpdate, MessagePacket_Parse/Init, Packet_ReadSubBlock.
  - Dependencies: FoTD\\fom_client.exe IDB via IDA MCP (port 13337).
  - Status: Done.

- [x] [12/31/25-11:56PM] Map SMSG_UPDATE internals (group handlers + unguaranteed update layout)
  - Context: Decode OnUpdatePacket group 0/1/3/object-update path and SMSG_UNGUARANTEEDUPDATE flags for movement/model updates.
  - Acceptance: AddressMap.md updated with handler RVAs/VA and payload summaries; IDA renames verified.
  - Validation: IDA decomp/disasm review (OnUpdatePacket, Group0/1/3/ObjUpdate, OnUnguaranteedUpdatePacket).
  - Dependencies: FoTD\\fom_client.exe IDB via IDA MCP (port 13337).
  - Status: Done.

- [ ] [12/31/25-10:36PM] HookInjector: single D3D9 proxy with embedded hook
  - Context: Replace injector.exe + fom_hook.dll with one proxy DLL loaded via d3d9.dll import.
  - Acceptance: d3d9.dll proxy builds, forwards to system d3d9, and contains all hook code (no external fom_hook.dll).
  - Validation: Launch failed with 0xc000007b; removed d3d9 import from proxy; added D3DPERF_* exports required by libEGL/libGLESv2.
  - Dependencies: HookInjector build; FoTD\\fom_client.exe DINPUT8 import.
  - Intended delta: Add D3D9 proxy target, embed hook sources, and route HookAttach/Detach via proxy DllMain.
  - Diff: HookInjector/CMakeLists.txt; HookInjector/Source/HookMain.cpp; HookInjector/Source/HookMain.h; HookInjector/Source/ProxyD3D9/D3D9Proxy.cpp; HookInjector/Source/ProxyD3D9/D3D9Proxy.def
  - Rollback: git checkout -- HookInjector/CMakeLists.txt HookInjector/Source/HookMain.cpp HookInjector/Source/HookMain.h HookInjector/Source/ProxyD3D9/D3D9Proxy.cpp HookInjector/Source/ProxyD3D9/D3D9Proxy.def
  - Metrics: N/A (no latency/error snapshot captured).
  - Status: In progress.

- [x] [12/30/25-09:52PM] Attempted PP7 base stat patch (rolled back)
  - Context: Item tooltip uses g_ItemBaseStatTable for base stats (CShell.dll).
  - Acceptance: Rolled back patch; confirmed original PP7 base stats restored and CSV aligned.
  - Validation: Restored CShell.dll from backup; re-read table to confirm values; CSV reverted.
  - Dependencies: FoTD/Resources/CShell.dll.
  - Rollback: Copy-Item -Force "FoTD\\Resources\\CShell.dll.bak" "FoTD\\Resources\\CShell.dll"

- [x] [12/30/25-10:10PM] HookInjector: item overrides (base + armor) + item read map
  - Context: Replace static item stats in-memory using client paths (no server edits).
  - Acceptance: Added HookItemOverrides module; hooks ItemEntryWithId/ItemStatEntry readers and Item_AddArmorBaseStats; base table override support; docs for override CSV + item read map.
  - Validation: Code review; RVA/prologue checks match IDA disasm.
  - Dependencies: HookInjector build.
  - Rollback: git checkout -- HookInjector/Source/HookItemOverrides.* HookInjector/Source/HookMain.cpp HookInjector/Source/HookState.h HookInjector/Source/HookConfig.cpp HookInjector/FoMHook.vcxproj* Docs/Notes/ItemDataRead_Map.md Docs/Notes/ItemOverride_Format.md

- [x] [12/29/25-12:25AM] Deep decode MARKET/PLAYERFILE/SKILLS packet bitstreams (CShell.dll) + apply helper renames
  - Context: AddressMap.md (packet layouts for IDs -100/-97/-93; helper structs/lists).
  - Acceptance: AddressMap.md updated with Market listD/listE/read_list_u32 details; Playerfile struct layout + blockC0 entry layout; Playerfile uses Packet_ID_FACTION_read_listA; Skills list layout confirmed; IDA renames applied for new readers.
  - Validation: Manual review of AddressMap.md + IDA rename list.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [ ] [12/29/25-10:55PM] Decode Packet_ID_A8/A9/AA/AC/AF/B0 bitstreams (CShell.dll)
  - Context: AddressMap.md (packet layouts for IDs -88/-87/-86/-84/-81/-80; handler map corrections).
  - Acceptance: AddressMap.md updated with layouts + helper calls; handler map updated (A6/A8/A9/AA/AC/AF/B0/B1/B2/B5/B6); IDA renames applied for read/handler funcs.
  - Validation: Manual review of AddressMap.md + IDA rename list.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: In progress - layouts added through ID -74; B5/B6 helper readers decoded + renamed (incl. Read_6BitFlags, structD entry, entry2 subA, substruct 10249E10/102550A0); AF sub-struct decoded (Packet_ID_AF_read_structA); A9 structs decoded (Packet_ID_A9_read_structA/B/C + structA list + structD + structD list); AC resolved as Packet_ID_DEPLOY_ITEM (ID -84) with ctor/read/handler + full subtype map added; B1 list/entry helpers decoded; AF/B0 list helpers decoded + renamed (Packet_ID_AF_B0_read_listA/entryA + entryA listA/listB + Packet_ID_B0_read_listB); B6 structD list insert identified (Packet_ID_B6_structD_list_insert); A6 case map resolved; MAIL entry decode completed (Packet_ID_MAIL_read_entry + idlist details); FACTION listB/listC entry layouts decoded + renamed (Packet_ID_FACTION_read_listB_entry / Packet_ID_FACTION_read_listC_entry); added Packet_ID_UPDATE/CHARACTER_UPDATE layouts + ctors; added WEAPONFIRE/RELOAD read layouts (no dispatcher path found); decoded Packet_ID_UPDATE payload (WeaponFireEntry types 1-4) + Packet_ID_UPDATE send path; documented WeaponFireEntry_build_from_state field sources; renamed bitstream helpers (BitStream_WriteBit*, BitStream_WriteBits/Compressed, Net_IsBigEndian/ByteSwapCopy, Write_QuantVec3, Write_BitfieldBlock_0x30) + WeaponFireEntry writers/build/pick; enumerated remaining Packet_ID_* RTTI not yet mapped (login/mission/npc/territory/chat/etc) and parked as non-must-have.

- [x] [12/28/25-10:35PM] Decode Packet_ID_MARKET bit layouts + start Packet_ID_FACTION helpers; add Packet_ID_A6 base layout
  - Context: AddressMap.md (packet layouts for IDs -100/-99/-90; helper structs/lists).
  - Acceptance: Packet_ID_MARKET layout fully enumerated; helper struct/list layouts captured; Packet_ID_FACTION base fields + confirmed helper layouts documented; Packet_ID_A6 base fields documented; IDA renames applied for new readers.
  - Validation: Manual review of AddressMap.md + IDA rename list.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done - Faction case map (types 2..77) + jump table decoded; helper renames applied (Read_u8c + Packet_ID_FACTION_read_block_*).

- [x] [12/28/25-10:18PM] Decode PRODUCTION/PLAYERFILE/SKILLS and Packet_ID_A5 (ID -91) via disasm
  - Context: AddressMap.md (packet layouts for IDs -101/-97/-93/-91; helper structs for -91).
  - Acceptance: AddressMap.md updated with layouts and ctors/handlers; IDA renames applied for Packet_ID_A5 + helpers.
  - Validation: Manual review of AddressMap.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:38PM] Decode Packet_ID_FRIENDS/STORAGE/MINING bitstreams
  - Context: AddressMap.md (packet layouts + ctors/handlers for IDs -105/-103/-102).
  - Acceptance: AddressMap.md updated with layouts for Packet_ID_FRIENDS/STORAGE/MINING and handler/ctor tables.
  - Validation: Manual review of AddressMap.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:29PM] Decode list-based MOVE_ITEMS ops + NAME_CHANGE blob + add MAIL/BACKPACK_CONTENTS layouts
  - Context: AddressMap.md (MOVE_ITEMS list helpers, Packet_ID_NAME_CHANGE/MAIL/BACKPACK_CONTENTS layouts).
  - Acceptance: AddressMap.md updated with list-helper semantics, NAME_CHANGE string/flag offsets, and packet layouts for IDs -110/-116; IDA renames applied.
  - Validation: Manual review of AddressMap.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:19PM] Decode MOVE_ITEMS op dispatch and slot helpers
  - Context: AddressMap.md (Packet_ID_MOVE_ITEMS layout + op dispatch).
  - Acceptance: Documented op1/op2 routing, slot helper ranges, and list helper roles; IDA renames applied for slot helpers.
  - Validation: Manual review of AddressMap.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:08PM] Decode CShell packet bitstreams (item/weapon)
  - Context: AddressMap.md (CShell packet layouts)
  - Acceptance: AddressMap.md updated with bitstream layouts for IDs -120/-112/-114/-94/-83/-82; handler map + ctors updated; IDA renames applied for new handlers/ctors/readers.
  - Validation: Manual review of AddressMap.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done (handlers + layouts captured; IDA renames applied).
