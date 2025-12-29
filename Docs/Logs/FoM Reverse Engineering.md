# FoM Reverse Engineering Log

- [x] [12/29/25-12:25AM] Deep decode MARKET/PLAYERFILE/SKILLS packet bitstreams (CShell.dll) + apply helper renames
  - Context: AddressMap_FoTD.md (packet layouts for IDs -100/-97/-93; helper structs/lists).
  - Acceptance: AddressMap_FoTD.md updated with Market listD/listE/read_list_u32 details; Playerfile struct layout + blockC0 entry layout; Playerfile uses Packet_ID_FACTION_read_listA; Skills list layout confirmed; IDA renames applied for new readers.
  - Validation: Manual review of AddressMap_FoTD.md + IDA rename list.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [ ] [12/29/25-10:55PM] Decode Packet_ID_A8/A9/AA/AC/AF/B0 bitstreams (CShell.dll)
  - Context: AddressMap_FoTD.md (packet layouts for IDs -88/-87/-86/-84/-81/-80; handler map corrections).
  - Acceptance: AddressMap_FoTD.md updated with layouts + helper calls; handler map updated (A6/A8/A9/AA/AC/AF/B0/B1/B2/B5/B6); IDA renames applied for read/handler funcs.
  - Validation: Manual review of AddressMap_FoTD.md + IDA rename list.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: In progress - layouts added through ID -74; B5/B6 helper readers decoded + renamed (incl. Read_6BitFlags, structD entry, entry2 subA, substruct 10249E10/102550A0); AF sub-struct decoded (Packet_ID_AF_read_structA); A9 structs decoded (Packet_ID_A9_read_structA/B/C + structA list + structD + structD list); AC resolved as Packet_ID_DEPLOY_ITEM (ID -84) with ctor/read/handler + full subtype map added; B1 list/entry helpers decoded; AF/B0 list helpers decoded + renamed (Packet_ID_AF_B0_read_listA/entryA + entryA listA/listB + Packet_ID_B0_read_listB); B6 structD list insert identified (Packet_ID_B6_structD_list_insert); A6 case map resolved; MAIL entry decode completed (Packet_ID_MAIL_read_entry + idlist details); FACTION listB/listC entry layouts decoded + renamed (Packet_ID_FACTION_read_listB_entry / Packet_ID_FACTION_read_listC_entry); added Packet_ID_UPDATE/CHARACTER_UPDATE layouts + ctors; added WEAPONFIRE/RELOAD read layouts (no dispatcher path found); decoded Packet_ID_UPDATE payload (WeaponFireEntry types 1-4) + Packet_ID_UPDATE send path; documented WeaponFireEntry_build_from_state field sources; renamed bitstream helpers (BitStream_WriteBit*, BitStream_WriteBits/Compressed, Net_IsBigEndian/ByteSwapCopy, Write_QuantVec3, Write_BitfieldBlock_0x30) + WeaponFireEntry writers/build/pick; enumerated remaining Packet_ID_* RTTI not yet mapped (login/mission/npc/territory/chat/etc) and parked as non-must-have.

- [x] [12/28/25-10:35PM] Decode Packet_ID_MARKET bit layouts + start Packet_ID_FACTION helpers; add Packet_ID_A6 base layout
  - Context: AddressMap_FoTD.md (packet layouts for IDs -100/-99/-90; helper structs/lists).
  - Acceptance: Packet_ID_MARKET layout fully enumerated; helper struct/list layouts captured; Packet_ID_FACTION base fields + confirmed helper layouts documented; Packet_ID_A6 base fields documented; IDA renames applied for new readers.
  - Validation: Manual review of AddressMap_FoTD.md + IDA rename list.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done - Faction case map (types 2..77) + jump table decoded; helper renames applied (Read_u8c + Packet_ID_FACTION_read_block_*).

- [x] [12/28/25-10:18PM] Decode PRODUCTION/PLAYERFILE/SKILLS and Packet_ID_A5 (ID -91) via disasm
  - Context: AddressMap_FoTD.md (packet layouts for IDs -101/-97/-93/-91; helper structs for -91).
  - Acceptance: AddressMap_FoTD.md updated with layouts and ctors/handlers; IDA renames applied for Packet_ID_A5 + helpers.
  - Validation: Manual review of AddressMap_FoTD.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:38PM] Decode Packet_ID_FRIENDS/STORAGE/MINING bitstreams
  - Context: AddressMap_FoTD.md (packet layouts + ctors/handlers for IDs -105/-103/-102).
  - Acceptance: AddressMap_FoTD.md updated with layouts for Packet_ID_FRIENDS/STORAGE/MINING and handler/ctor tables.
  - Validation: Manual review of AddressMap_FoTD.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:29PM] Decode list-based MOVE_ITEMS ops + NAME_CHANGE blob + add MAIL/BACKPACK_CONTENTS layouts
  - Context: AddressMap_FoTD.md (MOVE_ITEMS list helpers, Packet_ID_NAME_CHANGE/MAIL/BACKPACK_CONTENTS layouts).
  - Acceptance: AddressMap_FoTD.md updated with list-helper semantics, NAME_CHANGE string/flag offsets, and packet layouts for IDs -110/-116; IDA renames applied.
  - Validation: Manual review of AddressMap_FoTD.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:19PM] Decode MOVE_ITEMS op dispatch and slot helpers
  - Context: AddressMap_FoTD.md (Packet_ID_MOVE_ITEMS layout + op dispatch).
  - Acceptance: Documented op1/op2 routing, slot helper ranges, and list helper roles; IDA renames applied for slot helpers.
  - Validation: Manual review of AddressMap_FoTD.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done.

- [x] [12/28/25-09:08PM] Decode CShell packet bitstreams (item/weapon)
  - Context: AddressMap_FoTD.md (CShell packet layouts)
  - Acceptance: AddressMap_FoTD.md updated with bitstream layouts for IDs -120/-112/-114/-94/-83/-82; handler map + ctors updated; IDA renames applied for new handlers/ctors/readers.
  - Validation: Manual review of AddressMap_FoTD.md.
  - Dependencies: CShell.dll IDB via IDA MCP (port 13338).
  - Status: Done (handlers + layouts captured; IDA renames applied).
