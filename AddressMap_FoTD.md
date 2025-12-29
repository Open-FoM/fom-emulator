# AddressMap (FoTD)

Notes:
- Use VA (absolute) + RVA (module base subtracted).
- Confidence is about behavioral meaning, not just address correctness.
- Mid-function hooks are explicitly labeled.

## fom_client.exe (image base 0x00400000)

### Code (client init + module loading)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x0044C380 | 0x0004C380 | ClientEntry | CEF/bootstrap + single-instance mutex; calls RunClient | decomp + xrefs | high |
| 0x0044BC80 | 0x0004BC80 | RunClient | Main loop + launcher gate (requires dpsmagic); sets CWD; calls InitEngineAndLoadLtmsg | decomp + strings | high |
| 0x0044B580 | 0x0004B580 | ParseCmdLine | Parses command line; expands -cmdfile; builds arg table | decomp | med |
| 0x0044AA60 | 0x0004AA60 | InitClientFromCmdLine | Parses -rez list, workingdir/config/display, +sounddll; calls resource init | decomp + strings | high |
| 0x00450000 | 0x00050000 | InitEngineAndLoadLtmsg | CoInitialize + core init; LoadLibraryA(\"ltmsg.dll\") | decomp | high |
| 0x004B8390 | 0x000B8390 | InitMasterConnection | Init connection to master server (default fom1.fomportal.com); validates install | decomp + strings | high |
| 0x00499960 | 0x00099960 | ClientNetworking_Init | Loads fom_public.key; creates RakPeer master/world; sets MTU 0x578 | decomp | high |
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

### Code (items/inventory + handlers)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10190D70 | 0x00190D70 | CNetworkMgrClient_HandlePacket_ID_MOVE_ITEMS | Handles move-items packet; deep inventory mutation | string + decomp | high |
| 0x1018F110 | 0x0018F110 | HandlePacket_ID_USE_ITEM | Use-item packet handling (ID -92) | dispatch + decomp | high |
| 0x10199A40 | 0x00199A40 | CNetworkMgrClient_DispatchPacketId | Packet ID switch/dispatcher (includes items + weapon unload) | decomp | high |
| 0x1018E1F0 | 0x0018E1F0 | HandlePacket_ID_6D_LoginResponse | Login response handler (packet ID 0x6D) | dispatch + disasm | high |
| 0x1018DCE0 | 0x0018DCE0 | Packet_6D_Read | Login response bitstream parse (InitBitStream + ReadBitsCompressed) | disasm | med |
| 0x1018E340 | 0x0018E340 | HandlePacket_ID_73 | Handler for packet ID 0x73 (post-login?) | dispatch + disasm | low |
| 0x1018DDA0 | 0x0018DDA0 | Packet_73_Read | ID 0x73 bitstream parse (uses Read_u32c/Read_u16c) | disasm | med |
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
| 0x10241A10 | 0x00241A10 | String_AssignFromPtr | std::string assign helper | decomp | low |
| 0x10241530 | 0x00241530 | String_FromU16 | Converts u16 to string (item id formatting) | decomp | low |
| 0x101A14C0 | 0x001A14C0 | WeaponFireEntry_add | Adds entry to list; cap 10 | disasm | med |
| 0x101A2390 | 0x001A2390 | WeaponFireEntry_build_from_state | Builds entry from game state | disasm | med |
| 0x101A21A0 | 0x001A21A0 | WeaponFireEntry_pick_list_entry | Selects list entry for payload | disasm | med |
| 0x101A1310 | 0x001A1310 | WeaponFireEntry_type1_write | Type1 payload writer | decomp | med |
| 0x101A00B0 | 0x001A00B0 | WeaponFireEntry_type2_write | Type2 payload writer | disasm | med |
| 0x101A0360 | 0x001A0360 | WeaponFireEntry_type3_write | Type3 payload writer | disasm | med |
| 0x101A04D0 | 0x001A04D0 | WeaponFireEntry_type4_write | Type4 payload writer | disasm | med |
| 0x1010C330 | 0x0010C330 | BuildItemTooltip | Builds item tooltip text from runtime ItemStructA fields + template lookup | disasm | high |
| 0x101093A0 | 0x001093A0 | Item_GetDurabilityPercent | Computes durability% from ItemStructA and template max | disasm | high |
| 0x10109330 | 0x00109330 | Item_GetAmmoItemIdOrTemplate | Returns ammo item id (runtime override or template) | disasm | high |
| 0x1024C940 | 0x0024C940 | ItemTemplate_CopyVariantByIndex | Copies 0x5C variant record by index from template | decomp | high |
| 0x10247DF0 | 0x00247DF0 | FormatDuration_MinSec | Formats seconds to “Xm” when divisible by 60 | decomp | high |
| 0x102330C0 | 0x002330C0 | ItemTemplate_GetAmmoItemId | Returns ammo item id from template (word @+0x30) | decomp | high |
| 0x10232300 | 0x00232300 | ItemTemplate_GetMaxDurability | Returns template max durability for item id | decomp | high |
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
| 0x1025B1D0 | 0x0025B1D0 | Packet_ID_MARKET_read_listE | Market listE read (u16/u32) | disasm | med |
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

#### Packet_ID_USE_ITEM (ID -92) — server→client
Read: Packet_ID_USE_ITEM_read @ 0x10181200 (decomp); handler: 0x1018F110.
Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u32c @+0x434 (sub_1000C990); item lookup key in sub_1023F010/sub_1023DE50.
- bit @+0x438 (flag; direct bit read).
- u8c  @+0x439 (compressed u8; handler accepts 0x17–0x1C).

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

#### Packet_ID_ITEMS_REMOVED (ID -127) — server→client
Read: Packet_ID_ITEMS_REMOVED_read @ 0x1018DE80 (decomp); handler: 0x10192D40.
Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c  @+0x434 (sub_101C9AA0; reason/type).
- list @+0x438 via Read_u32c_list_u16count: u16c count + count*u32c entries.

#### Packet_ID_ITEMS_ADDED (ID -109) — server→client
Read: Packet_ID_ITEMS_ADDED_read @ 0x1018DFD0 (decomp); handler: 0x10197030.
Write: Packet_ID_ITEMS_ADDED_write @ 0x101966B0.
Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c @+0x434 (type).
- if type==3: u8c @+0x435 (subtype).
- payload @+0x438 via sub_102404E0 (see below).

#### Packet_ID_UNLOAD_WEAPON (ID -113) — server→client
Read: Packet_ID_UNLOAD_WEAPON_read @ 0x1008FDE0 (decomp); handler: 0x1018EA20.
Fields (read order):
- u32c @+0x434 (sub_1000C990); compares to sub_100079B0(91).
- u8c  @+0x438 (mode; handler uses 2/3).
- if mode==2: ItemEntryWithId @+0x43C (sub_102550A0).
- if mode==1 or 2: u32c @+0x430 (sub_1000C990).

#### Packet_ID_ITEM_REMOVED (ID -120) - server->client
Read: Packet_ID_ITEM_REMOVED_read @ 0x1018DED0 (decomp); handler: 0x1018E550.
Fields (read order):
- u32c @+0x430 (sub_1000C990); expects == sub_100079B0(91).
- u8c  @+0x434 (sub_101C9AA0; handler uses 1/2/3).
- u32c @+0x438 (sub_1000C990).
- bit  @+0x43C (flag).


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
  - +0x04 = GameVar u32 id 0x5B (sub_100079B0)
  - +0x08..+0x0E = QuantVec3 + angle (from engine vtbl +98/+94, sub_101A0710, __ftol2)
  - +0x18/+0x1C/+0x20 from config/vec math (sub_100079B0 ids 0x77/0x1E/0x1F; sub_10256590 over vec; sub_101C3180(3))
  - +0x22.. = BitfieldBlock_0x30 copy (from sub_101C4A20 output)
  - +0x64 = float GameVar 0x1D6A5 cast to int (sub_10007ED0 + __ftol2)
  - +0x68 = sub_101C32F0(2)
  - +0x74 = bool from 0x3042/0x3041 chain
  - +0x78 = GameVar u32 0x3046 if [edi+328h]>0 else 0
  - +0x80 = GameVar u32 0x1D6A4, maybe overridden by flags (0x1EEC3/0x8D path)
  - +0x84 = bool from 0x1CEC2
  - +0x86 = u16 from 0x303E
  - +0x8C/+0x8E/+0x90 = int16s from vector built off dword_103BF75C (sub_101C4A20)
  - +0x96 = u16 ShieldSetting (sub_1002B310); also sets +0xA3
  - +0x98 = u8 from 0xA7
  - +0x9C = WeaponFireEntry_pick_list_entry @ 0x101A21A0
  - +0xB0 = u8 from 0x1EA3E
  - +0xB4 = sub_101C32F0(8)

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
- if flag==1:
  - ItemEntryWithId @+0x440 (sub_102550A0).
  - ItemEntryWithId @+0x470 (sub_102550A0).
- else:
  - u32c @+0x438 (sub_1000C990).
  - u32c @+0x43C (sub_1000C990).

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
- u32c @+0x430 (sub_1000C990).
- u8c  @+0x434 (sub_101C9AA0).
- u32c @+0x438 (sub_1000C990).
- u32c @+0x460 (sub_1000C990).
- payload @+0x43C via sub_102404E0 (ItemsAdded-style payload).
- list @+0x464 via sub_1023D7B0 (u16c count + count*u32c).

#### Packet_ID_MAIL (ID -116) - server->client
Read: Packet_ID_MAIL_read @ 0x1013DDC0 (decomp); handler: 0x10193740.
Fields (read order):
- u32c @+0x430 (sub_1000C990).
- mail entries via Packet_ID_MAIL_read_entries @ 0x1013DD20:
  - u8c count
  - repeat count: Packet_ID_MAIL_read_entry @ 0x1013DA40 (decomp; fields below), then Packet_ID_MAIL_entry_list_insert @ 0x1013DC60.
- bit flag @+0x444 (reads 1 bit); if set, Packet_ID_MAIL_read_idlist @ 0x1013DB60:
  - u8c count
  - count x u32c (compressed).
Write: Packet_ID_MAIL_write @ 0x1013D2E0 (decomp).
- writes u32c @+0x430 (sub_10031AB0, value from sub_100079B0(0x5B)).
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
  - Packet_ID_AF_B0_read_entryA_listB @+0x0BC
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
  - u8c count; repeat: Packet_ID_AF_B0_read_entryA
- Packet_ID_AF_B0_read_entryA_listA @ 0x10054FA0:
  - u8c count; repeat: u8c + bit
- Packet_ID_AF_B0_read_entryA_listB @ 0x10054CE0:
  - u32c count; repeat: u32c (BitStream_ReadBitsCompressed 32; endian swap if Net_IsBigEndian) + string
- Packet_ID_AF_B0_read_entryA @ 0x10055080 (fields in order):
  - u32c @+0x00
  - u8c  @+0x04
  - u32c @+0x08
  - u32c @+0x0C
  - Packet_ID_AF_B0_read_entryA_listA @+0x10
  - bit  @+0x60
  - string @+0x20 (vtbl+0x38, max 0x800)
  - string @+0x58 (vtbl+0x38, max 0x800)
  - ItemsAdded payload @+0x34 (sub_102404E0)
  - bit  @+0x61
  - u32c @+0x294
  - string @+0x62 (vtbl+0x38, max 0x800)
  - string @+0x7A (vtbl+0x38, max 0x800)
  - Packet_ID_AF_B0_read_entryA_listB @+0x27C
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
  - No xrefs to string in CShell; no "TRANSFER_ITEMS" in FoTD/FoM *.dll/*.exe via rg (only in CShell IDB).
  Next: search in engine/server/CRes IDBs for vtable/ctor or packet ID constant.

#### Packet_ID_GROUP (FoM-only) - status
  - Not present in FoTD binaries (no "Packet_ID_GROUP" in FoTD *.dll/*.exe).
  - Present in FoM CShell.dll RTTI strings; treat as FoM baseline only and re-locate/verify in FoTD before reuse.

#### Outbound weapon packets (client->server)
Note: dispatcher has no inbound cases for -121/-111; only outbound send paths found (Packet_ID_WEAPONFIRE still has read/write vtable methods).
Packet_ID_WEAPONFIRE (ID -121) send: sub_101A0900.
- u32c (sub_10031AB0) = sub_100079B0(91).
- u16c (sub_1000CD70) = sub_100079B0(12350).
- u32c (sub_10031AB0) = sub_101C5080 counter (1..100).

Packet_ID_RELOAD (ID -111) send: sub_101C52E0.
- u32c @+0x430 = sub_100079B0(91).
- bit flag @+0x434 (write via sub_101C9310/92D0).
- if flag==0: u32c @+0x438 and u32c @+0x43C.

#### ItemEntry / list helpers (shared)
ItemEntry / ItemStructA (ItemStructA_read @ 0x10254F80):
- u16c @+0x00, +0x02, +0x04, +0x06 (4x u16c via sub_1000C9F0).
- u8c  @+0x08, +0x09.
- u32c @+0x0C, +0x10, +0x14 (3x u32c via sub_1000C990).
- u8c  @+0x18, +0x19, +0x1A (read in reverse order).
- u8c  @+0x1B..+0x1E (4 bytes).
Tooltip usage (BuildItemTooltip @ 0x1010C330):
- @+0x04 = itemId (template lookup + display name).
- @+0x06 = quantity/max ammo (used in ammo/charges strings).
- @+0x08 (u16) = ammo override id (if 0, fallback to template @+0x30).
- @+0x0A (u16) = current durability OR effect duration (sec) depending on type.
- @+0x0C (u8) = durability loss factor (%/100).
- @+0x0D (u8) = bind state (0 none,1 secured,2 bound,>=3 special bound).
- @+0x1D (u8) = quality tier (Standard/Custom/Special/Rare/Special Rare).
- @+0x1E (u8) = variant index used in variant lookup (case 19).
CRes string IDs used for stat labels (FoTD CRes.dll):
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

ItemsAdded payload (ItemsAdded_payload_read @ 0x102404E0 / ItemsAdded_payload_write @ 0x1023D2C0):
- u16c field0 (sub_1000C9F0).
- u32c field20 / field24 / field28 (3x u32c via sub_1000C990).
- u16c entryCount (sub_1000C9F0).
- repeat entryCount times: ItemsAdded_entry_read @ 0x1023E3B0 / ItemsAdded_entry_write @ 0x1023CDF0:
  - ItemEntry (ItemStructA_read @ 0x10254F80).
  - u16c attachCount (sub_1000C9F0) -> written from list count (@+0x28).
  - attachCount x u32c (BitStream_ReadBitsCompressed 0x20; values from list @+0x24).

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

## Object.lto (image base 0x10000000)

### Data (object templates)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1011EBD0 | 0x0011EBD0 | ObjectTemplateTable | 0x80-byte records, u16 id at +0x00; contiguous ids starting at 1 (content does not match weapon stats) | file scan + id sequence | low |

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
| 0x10005840 | 0x00005840 | SetMasterDatabase | Export; installs master DB from server.dll | exports + call sites | high |
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

### Object DB loader / Object.lto hookup
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100195DA | 0x000195DA | LoadServerObjects | Loads `object.lto` + calls ObjectDLLSetup chain | string refs + call graph | high |
| 0x1004AD60 | 0x0004AD60 | ServerObjects_ObjectDLLSetup | Calls LoadObjectDLL_ByName then continues setup | call graph | med |
| 0x1004AD83 | 0x0004AD83 | ServerObjects_ObjectDLLSetup_Finish | Uses "ObjectDLLSetup" string, finalizes setup | string ref | low |
| 0x100189B0 | 0x000189B0 | LoadObjectDLL_ByName | Uses Dyn_LoadLibraryA/Dyn_LoadLibraryA_OrMsg | call graph | med |
| 0x100189DE | 0x000189DE | Resolve_SetMasterDatabase | Resolves `SetMasterDatabase` export (GetProcAddress) | string ref + call graph | high |

Dynamic loader wrappers:
- 0x1001A5A0 Dyn_LoadLibraryA
- 0x1001A5A9 Dyn_LoadLibraryA_OrMsg (LoadLibraryA + GetLastError + FormatMessage + MessageBox)
- 0x1001A627 Dyn_FreeLibrary
- 0x1001A630 Dyn_GetModuleHandleA
- 0x1001A670 Dyn_GetProcAddress

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
| 0x10018C60 | 0x00018C60 | FormatSystemError | FormatMessage/LoadString wrapper | import calls | med |
| 0x10003830 | 0x00003830 | FormatString_vsnprintf | vsnprintf wrapper | import call | high |

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

