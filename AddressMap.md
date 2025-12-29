# AddressMap (FoM)

Notes:
- Use VA (absolute) + RVA (module base subtracted).
- Confidence is about behavioral meaning, not just address correctness.
- Mid-function hooks are explicitly labeled.

## d3d9.dll (image base 0x10000000)

### Code (proxy/custom)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1003B420 | 0x0003B420 | ProxyThreadMain | Proxy worker thread; sets up hooks | decomp + xrefs | high |
| 0x10047280 | 0x00047280 | Proxy_DllEntry | DLL entry wrapper; dispatches to Proxy_DllMain | decomp | high |
| 0x10047147 | 0x00047147 | Proxy_DllMain | DllMain path; CRT dispatch + LoadOriginalD3D9AndInit | decomp | high |
| 0x1003C230 | 0x0003C230 | InstallClientHooks | Installs mid-function + trampoline hooks | decomp + xrefs | high |
| 0x1003C100 | 0x0003C100 | InstallTrampolineHook | Writes JMP + NOP padding | decomp | high |
| 0x1003C560 | 0x0003C560 | UninstallHooks | Removes detours and restores state | decomp + xrefs | high |
| 0x1003CEE0 | 0x0003CEE0 | LoadOriginalD3D9AndInit | Loads system d3d9.dll + resolves exports | decomp | high |
| 0x1003CDC0 | 0x0003CDC0 | D3DPERF_BeginEvent | Export stub -> p_D3DPERF_BeginEvent | decomp | high |
| 0x1003CDD0 | 0x0003CDD0 | D3DPERF_EndEvent | Export stub -> p_D3DPERF_EndEvent | decomp | high |
| 0x1003CDE0 | 0x0003CDE0 | D3DPERF_GetStatus | Export stub -> p_D3DPERF_GetStatus | decomp | high |
| 0x1003CDF0 | 0x0003CDF0 | D3DPERF_QueryRepeatFrame | Export stub -> p_D3DPERF_QueryRepeatFrame | decomp | high |
| 0x1003CE00 | 0x0003CE00 | D3DPERF_SetMarker | Export stub -> p_D3DPERF_SetMarker | decomp | high |
| 0x1003CE10 | 0x0003CE10 | D3DPERF_SetOptions | Export stub -> p_D3DPERF_SetOptions | decomp | high |
| 0x1003CE20 | 0x0003CE20 | D3DPERF_SetRegion | Export stub -> p_D3DPERF_SetRegion | decomp | high |
| 0x1003CE30 | 0x0003CE30 | DebugSetLevel | Export stub -> p_DebugSetLevel | decomp | high |
| 0x1003CE40 | 0x0003CE40 | DebugSetMute | Export stub -> p_DebugSetMute | decomp | high |
| 0x1003CE50 | 0x0003CE50 | Direct3D9EnableMaximizedWindowedModeShim | Export stub -> p_Direct3D9EnableMaximizedWindowedModeShim | decomp | high |
| 0x1003CE60 | 0x0003CE60 | Direct3DCreate9 | Export stub -> p_Direct3DCreate9 | decomp | high |
| 0x1003CE70 | 0x0003CE70 | Direct3DCreate9Ex | Export stub -> p_Direct3DCreate9Ex | decomp | high |
| 0x1003CE80 | 0x0003CE80 | Direct3DCreate9On12 | Export stub -> p_Direct3DCreate9On12 | decomp | high |
| 0x1003CE90 | 0x0003CE90 | Direct3DCreate9On12Ex | Export stub -> p_Direct3DCreate9On12Ex | decomp | high |
| 0x1003CEA0 | 0x0003CEA0 | Direct3DShaderValidatorCreate9 | Export stub -> p_Direct3DShaderValidatorCreate9 | decomp | high |
| 0x1003CEB0 | 0x0003CEB0 | PSGPError | Export stub -> p_PSGPError | decomp | high |
| 0x1003CEC0 | 0x0003CEC0 | PSGPSampleTexture | Export stub -> p_PSGPSampleTexture | decomp | high |
| 0x10036EA0 | 0x00036EA0 | Hooked_EndScene | Overlay/render hook entry | decomp + call chain | high |
| 0x10037140 | 0x00037140 | DrawDebugWindows | Debug UI (Face of Mankind Debug Window) | decomp + strings | high |
| 0x10037D20 | 0x00037D20 | DrawItemWindow | Item window UI + spawn tools | decomp + strings | high |
| 0x10039970 | 0x00039970 | Hooked_SetRenderState | State shim when param_2==8 | decomp | high |
| 0x100399F0 | 0x000399F0 | Hooked_SetTexture | Forces SetTexture(0,0) under flag | decomp | high |
| 0x10036DE0 | 0x00036DE0 | Hooked_LogPrint | Log wrapper; adds newline; forwards | decomp + strings | high |
| 0x100370D0 | 0x000370D0 | Hooked_GetServerHost | Host override wrapper | decomp + string | med |
| 0x1003BE20 | 0x0003BE20 | PickSGT_Detour | Trampoline detour for CShell PickSGT; maps ID->SGT name | decomp | high |
| 0x1003C1D0 | 0x0003C1D0 | CMusicPath_Detour | Mid-function detour; logs/loading + tailcalls original CMusic_InitLevel | decomp | med |
| 0x1003C9D0 | 0x0003C9D0 | CMusicPath_GetCwd | Logs + returns GetCurrentDirectoryA path to CMusicPath_Detour | decomp | high |
| 0x1003C8E0 | 0x0003C8E0 | GetAxisOffsets_Detour | MouseFix deadzone + smoothing filter | decomp | high |
| 0x1003BC20 | 0x0003BC20 | CShell_PatchTarget_167D23 | Actual target for CShell+0x167D23 (rel32 uses 0x1003BC1B) | decomp + patch math | med |
| 0x1003C0E0 | 0x0003C0E0 | CShell_PatchTarget_15DAD2 | Sets g_dispatchFlag then tail-calls orig_DispatchOpcode | decomp + patch math | high |
| 0x10044A00 | 0x00044A00 | Hook_Create | Queues detour with trampoline + relocation | decomp | high |
| 0x10044E70 | 0x00044E70 | Hook_Remove | Queues unhook and restore original bytes | decomp | high |
| 0x10045160 | 0x00045160 | Hook_BeginTransaction | Initializes hook transaction + RWX trampolines | decomp | high |
| 0x100451D0 | 0x000451D0 | Hook_CommitTransaction | Applies queued hooks, fixes thread EIP, resumes threads | decomp | med |
| 0x10045630 | 0x00045630 | Hook_SuspendThreadForPatch | Suspends target thread for safe patching | decomp | med |
| 0x10043A70 | 0x00043A70 | Trampoline_AllocSlot | Allocates 0x48-byte trampoline slot near target | decomp | med |
| 0x10043EF0 | 0x00043EF0 | Trampoline_FreeSlot | Frees trampoline slot back to region list | decomp | med |
| 0x10043840 | 0x00043840 | Trampoline_AllocBelow | VirtualAlloc 64k below target within rel32 range | decomp | med |
| 0x10043930 | 0x00043930 | Trampoline_AllocAbove | VirtualAlloc 64k above target within rel32 range | decomp | med |
| 0x1003A7F0 | 0x0003A7F0 | FilterChatMessageByCRC | CRC filter for message struct (param+0x14); suppresses known system/premium notices | decomp + string list | med |
| 0x1003A910 | 0x0003A910 | CShell_PathOverride | Overrides CShell path resolution using CWD + custom buffer; sets DAT_10058702 for PickSGT path swap | decomp | med |
| 0x1003CAA0 | 0x0003CAA0 | InitMessageFilterTable | Builds CRC-keyed list of known system messages for suppression | decomp + strings | high |
| 0x1003D0F0 | 0x0003D0F0 | GetDLLVersion | Export stub: returns 0x63F | decomp | high |

### Data (hook state)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10058708 | 0x00058708 | orig_EndScene | Saved IDirect3DDevice9::EndScene pointer (vtable slot 0xA8) | decomp + vtable copy | med |
| 0x1005870C | 0x0005870C | orig_SetRenderState | Saved SetRenderState pointer (slot 0xE4) | decomp + vtable copy | med |
| 0x10058710 | 0x00058710 | orig_SetTexture | Saved SetTexture pointer (slot 0x104) | decomp + vtable copy | med |
| 0x10058714 | 0x00058714 | orig_LogPrint | Saved client log-print pointer | decomp + hook chain | high |
| 0x10058718 | 0x00058718 | orig_GetServerHost | Saved host resolver pointer | decomp + hook chain | high |
| 0x10058720 | 0x00058720 | orig_GetAxisOffsetsBytes | Heap buffer holding original bytes for GetAxisOffsets hook | decomp | med |
| 0x1005874C | 0x0005874C | p_FindCVar | Client function pointer used to resolve cvars by name | decomp + xrefs | high |
| 0x100586F0 | 0x000586F0 | g_cshellModule | HMODULE for CShell.dll | decomp + GetModuleHandle | high |
| 0x10058760 | 0x00058760 | g_gameHwnd | HWND for game window | decomp + EnumWindows | high |
| 0x10058764 | 0x00058764 | g_proxyModule | HMODULE for d3d9 proxy | decomp + DllMain | high |
| 0x10058DF8 | 0x00058DF8 | g_origD3D9Module | HMODULE for system d3d9.dll | decomp | high |
| 0x10058DFC | 0x00058DFC | p_D3DPERF_BeginEvent | Original D3DPERF_BeginEvent | decomp | high |
| 0x10058E00 | 0x00058E00 | p_D3DPERF_EndEvent | Original D3DPERF_EndEvent | decomp | high |
| 0x10058E04 | 0x00058E04 | p_D3DPERF_GetStatus | Original D3DPERF_GetStatus | decomp | high |
| 0x10058E08 | 0x00058E08 | p_D3DPERF_QueryRepeatFrame | Original D3DPERF_QueryRepeatFrame | decomp | high |
| 0x10058E0C | 0x00058E0C | p_D3DPERF_SetMarker | Original D3DPERF_SetMarker | decomp | high |
| 0x10058E10 | 0x00058E10 | p_D3DPERF_SetOptions | Original D3DPERF_SetOptions | decomp | high |
| 0x10058E14 | 0x00058E14 | p_D3DPERF_SetRegion | Original D3DPERF_SetRegion | decomp | high |
| 0x10058E18 | 0x00058E18 | p_DebugSetLevel | Original DebugSetLevel | decomp | high |
| 0x10058E1C | 0x00058E1C | p_DebugSetMute | Original DebugSetMute | decomp | high |
| 0x10058E20 | 0x00058E20 | p_Direct3D9EnableMaximizedWindowedModeShim | Original Direct3D9EnableMaximizedWindowedModeShim | decomp | high |
| 0x10058E24 | 0x00058E24 | p_Direct3DCreate9 | Original Direct3DCreate9 | decomp | high |
| 0x10058E28 | 0x00058E28 | p_Direct3DCreate9Ex | Original Direct3DCreate9Ex | decomp | high |
| 0x10058E2C | 0x00058E2C | p_Direct3DCreate9On12 | Original Direct3DCreate9On12 | decomp | high |
| 0x10058E30 | 0x00058E30 | p_Direct3DCreate9On12Ex | Original Direct3DCreate9On12Ex | decomp | high |
| 0x10058E34 | 0x00058E34 | p_Direct3DShaderValidatorCreate9 | Original Direct3DShaderValidatorCreate9 | decomp | high |
| 0x10058E38 | 0x00058E38 | p_PSGPError | Original PSGPError | decomp | high |
| 0x10058E3C | 0x00058E3C | p_PSGPSampleTexture | Original PSGPSampleTexture | decomp | high |
| 0x10058703 | 0x00058703 | g_dispatchFlag | Flag set before dispatch hook | decomp | med |
| 0x10058738 | 0x00058738 | orig_DispatchOpcode | Saved CShell dispatcher pointer | decomp + hook chain | med |
| 0x10058960 | 0x00058960 | g_cvarMouseFix | CVar pointer for "MouseFix" | decomp | med |
| 0x10058964 | 0x00058964 | g_mouseDeadzoneX | MouseFix deadzone X (from "MouseDeadzoneX") | decomp + xrefs | med |
| 0x10058968 | 0x00058968 | g_mouseDeadzoneY | MouseFix deadzone Y (from "MouseDeadzoneY") | decomp + xrefs | med |
| 0x100589B4 | 0x000589B4 | g_mouseSmoothX | Smoothed X accumulator | decomp + xrefs | med |
| 0x10058DB8 | 0x00058DB8 | g_mouseSmoothY | Smoothed Y accumulator | decomp + xrefs | med |
| 0x1004BC54 | 0x0004BC54 | kMouseSmoothNewWeight | 0.4f (input weight) | hexdump + decomp | med |
| 0x1004BC5C | 0x0004BC5C | kMouseSmoothPrevWeight | 0.6f (previous weight) | hexdump + decomp | med |
| 0x1004BD50 | 0x0004BD50 | kAbsMask | 0x7FFFFFFF (clear sign bit for abs) | hexdump + decomp | med |
| 0x10058DC4 | 0x00058DC4 | g_msgFilterTable | Head of CRC->message list built by InitMessageFilterTable | decomp | med |
| 0x10058F1C | 0x00058F1C | g_trampRegionList | List of 64k trampoline regions | decomp | med |
| 0x10058F20 | 0x00058F20 | g_trampRegionCursor | Cursor for current trampoline region | decomp | med |
| 0x10058F2C | 0x00058F2C | g_hookOwnerThreadId | Hook transaction owner thread id | decomp | med |
| 0x10058F30 | 0x00058F30 | g_hookLastError | Last hook error code | decomp | med |
| 0x10058F34 | 0x00058F34 | g_hookLastErrorTarget | Pointer to target pointer for last error | decomp | low |
| 0x10058F38 | 0x00058F38 | g_suspendedThreads | List of suspended threads during commit | decomp | med |
| 0x10058F3C | 0x00058F3C | g_hookRecords | List of active/queued hook records | decomp | med |

## Injection Flow (step-by-step)
1) Proxy load:
   - d3d9.dll is loaded by EXE import.
   - LoadOriginalD3D9AndInit (0x1003CEE0) loads system d3d9.dll, resolves exports, spawns ProxyThreadMain (0x1003B420).

2) Module discovery + setup:
   - ProxyThreadMain resolves CShell.dll -> g_cshellModule (0x100586F0).
   - Resolves client base (fom_client.exe) via DAT_10058988(+4).
   - Captures D3D9 device vtable and copies to DAT_10058770 (vtable snapshot).

3) D3D9 device detours (vtable):
   - orig_EndScene (0x10058708) -> Hooked_EndScene (0x10036EA0).
   - orig_SetRenderState (0x1005870C) -> Hooked_SetRenderState (0x10039970).
   - orig_SetTexture (0x10058710) -> Hooked_SetTexture (0x100399F0).

4) fom_client.exe trampolines:
   - mid-fn hook at 0x0040AA60 -> proxy trampoline (GetAxisOffsets / MouseFix) if "MouseFix" cvar exists and is enabled.
   - mid-fn hook at 0x004BF5B0 -> Hooked_LogPrint (0x10036DE0) -> orig_LogPrint (0x004BE980+).
   - direct hook at 0x004E5B00 -> Hooked_GetServerHost (0x100370D0) -> ResolveHostToIp.

5) CShell.dll hooks:
   - Hooked PickSGT: target 0x10149490 -> detour at 0x1003BE20.
   - Hooked music path: mid-fn target 0x10149DCC -> detour at 0x1003C1D0 (rel32 stored as 0x1003C1CB).
   - Patch sites:
     - CShell+0x167D23 -> d3d9 stub CShell_PatchTarget_167D23 (0x1003BC20).
     - CShell+0x15DAD2 -> d3d9 stub CShell_PatchTarget_15DAD2 (0x1003C0E0).

## Behavior Overrides (what each hook changes)
- Overlay/Debug UI: Hooked_EndScene -> DrawDebugWindows / DrawItemWindow.
- Render state shim: Hooked_SetRenderState forces specific states when param_2 == 8.
- Texture override: Hooked_SetTexture forces SetTexture(0,0) under flag.
- Host override: Hooked_GetServerHost injects fixed host string.
- Log/console: Hooked_LogPrint appends newline and forwards.
- Message suppression: FilterChatMessageByCRC CRCs FoMString text (refcnt @+0x0C, len @+0x10, cap @+0x12, text @+0x14) and skips matched system/premium lines.
- Music/SGT: PickSGT_Detour returns SGT name by ID; CMusicPath_Detour logs + resumes original path logic.
- Input: GetAxisOffsets_Detour applies deadzone + smoothing to mouse axes (abs mask 0x7FFFFFFF; new = old*0.6 + input*0.4).
- Music path: CMusicPath_GetCwd logs current directory and feeds CMusicPath_Detour.

## Hook Chain (target -> detour -> original)
| Target (module:VA) | Detour (d3d9.dll) | Original | Notes |
|---|---|---|---|
| IDirect3DDevice9::EndScene (vtable slot 0xA8) | Hooked_EndScene (0x10036EA0) | orig_EndScene (0x10058708) | vtable patch |
| IDirect3DDevice9::SetRenderState (vtable slot 0xE4) | Hooked_SetRenderState (0x10039970) | orig_SetRenderState (0x1005870C) | vtable patch |
| IDirect3DDevice9::SetTexture (vtable slot 0x104) | Hooked_SetTexture (0x100399F0) | orig_SetTexture (0x10058710) | vtable patch |
| fom_client.exe:0x004BF5B0 (mid-fn LogPrint) | Hooked_LogPrint (0x10036DE0) | orig_LogPrint (0x10058714) | trampoline patch |
| fom_client.exe:0x004E5B00 (ResolveHostToIp) | Hooked_GetServerHost (0x100370D0) | orig_GetServerHost (0x10058718) | direct patch |
| fom_client.exe:0x0040AA60 (mid-fn GetAxisOffsets) | GetAxisOffsets_Detour (0x1003C8E0) | orig_GetAxisOffsetsBytes (0x10058720) | trampoline patch |
| CShell.dll:0x10167D23 (patch site) | CShell_PatchTarget_167D23 (0x1003BC20) | orig_DispatchOpcode (0x10058738) | rel32 uses 0x1003BC1B |
| CShell.dll:0x1015DAD2 (patch site) | CShell_PatchTarget_15DAD2 (0x1003C0E0) | orig_DispatchOpcode (0x10058738) | rel32 uses 0x1003C0DB |
| CShell.dll:0x10149490 (PickSGT) | PickSGT_Detour (0x1003BE20) | (unknown) | trampoline bytes saved to stack only |
| CShell.dll:0x10149DCC (mid-fn in CMusic_InitLevel) | CMusicPath_Detour (0x1003C1D0) | (unknown) | rel32 stored as 0x1003C1CB (target+5) |

## Signature TODOs (pre-hook bytes)
Use these to build resilient patch signatures; verify on target build before shipping.

| Module | VA | Bytes (pre-hook) | Notes |
|---|---|---|---|
| fom_client.exe | 0x0040AA60 | 00 57 53 56 E8 97 F9 00 00 5F 5B 5E 5D C3 CC CC | GetAxisOffsets mid-fn hook |
| fom_client.exe | 0x004BF5B0 | 23 D8 0B 5C 95 94 8B D1 89 5E 04 8B 5E 08 C1 EA | LogPrint mid-fn hook |
| fom_client.exe | 0x004E5B00 | 55 8B EC 83 EC 0C 89 4D F4 8B 45 08 50 FF 15 74 | ResolveHostToIp entry |
| CShell.dll | 0x10149490 | 8B 44 24 04 83 F8 11 77 73 FF 24 85 10 95 14 10 | PickSGT entry |
| CShell.dll | 0x10149DCC | 68 FF 00 00 00 8D 44 24 48 50 8D 8C 24 54 05 00 | CMusic_InitLevel mid-fn |
| CShell.dll | 0x10167D23 | E8 88 5C FF FF 5B 5E C2 08 00 52 8B CE E8 DB A2 | DispatchOpcode patch site |
| CShell.dll | 0x1015DAD2 | E8 E9 E3 FE FF 8B 0D 94 FC 32 10 33 C0 38 84 24 | HandleFactionMessage patch site |
## fom_client.exe (image base 0x00400000)

### Code (hook targets)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x004E5B00 | 0x000E5B00 | ResolveHostToIp | gethostbyname -> inet_ntoa wrapper | decomp | high |
| 0x0040AA20 | 0x0000AA20 | maybe_GetAxisOffsets | Input/mouse axis helper (hooked mid-function at +0x40) | decomp + hook chain | med |
| 0x0040AA60 | 0x0000AA60 | (mid-function) | MouseFix/GetAxisOffsets trampoline target | patch site + proxy notes | med |
| 0x004BF5B0 | 0x000BF5B0 | (mid-function) | LogPrint trampoline target in FUN_004be980 | patch site + proxy notes | high |
| 0x00405570 | 0x00005570 | InitClientFromCmdLine | Parses cmdline; picks config/display cfg; builds rez list; calls CClientMgr_Init | decomp + strings | high |
| 0x00413810 | 0x00013810 | CClientMgr_Init | Loads resources; executes config files via Console_ExecConfigFile | decomp + strings | high |
| 0x0040B280 | 0x0000B280 | FindCVar (wrapper) | Proxy p_FindCVar target; wrapper calls 0x0041EF40 with name + 0x006F2498 | RVA bytes | med |
| 0x0041EF40 | 0x0001EF40 | FindCVar_Impl (target) | Hash-table string lookup; returns entry->value (used by cvar/SCon access) | decomp | med |
| 0x00409700 | 0x00009700 | CLTClient_GetSConValueFloat | Looks up SCon entry by name; returns float from entry+0x18 | decomp | high |
| 0x004097B0 | 0x000097B0 | CLTClient_GetSConValueString | Looks up SCon entry by name; copies string from entry+0x14 | decomp | high |
| 0x00420DF0 | 0x00020DF0 | Console_Init | Initializes console mgr; sets command table + hashes | decomp | high |
| 0x0043A120 | 0x0003A120 | CVar_GetBindingTable | Returns ptr to cvar binding table (g_CVarBindTable) | decomp | high |
| 0x0043A130 | 0x0003A130 | CVar_GetBindingCount | Returns binding count (0x71) | decomp | high |
| 0x0041F590 | 0x0001F590 | Console_RegisterProgramsFromTable | Registers console programs from mgr->table (name/func/help) | decomp | high |
| 0x0041F670 | 0x0001F670 | Console_ExecConfigFile | Opens config file and feeds each line to Console_ParseAndExecLine | decomp | high |
| 0x0041F120 | 0x0001F120 | Console_ParseAndExecLine | Parses line; creates/updates cvars; handles +/- flags | decomp | high |
| 0x0041F450 | 0x0001F450 | Console_SetVarFromString | Sets cvar by name/value; creates entry if missing | decomp | high |
| 0x004098D0 | 0x000098D0 | CLTClient_ProcessAttachments | Iterates object->0x94 attachment list; calls Attachment_ApplyToObject | decomp + xrefs | high |
| 0x0047A460 | 0x0007A460 | Attachment_AddNode | Builds attachment node; links at object+0x94 | decomp | high |
| 0x00487320 | 0x00087320 | Attachment_ApplyToObject | Resolves attached object (node+0x28) and applies transform/scale | decomp | med |
| 0x0049E7E0 | 0x0009E7E0 | SetLocalPlayerId_FromPacket | Reads u16 from net stream -> client shell +0x64 | hexdump + decomp context | med |
| 0x004A1160 | 0x000A1160 | CClientShell_GetLocalPlayerObj | Returns local player object ptr (id at this+0x64) | decomp | high |
| 0x004A6450 | 0x000A6450 | FoMString_Create | Allocates FoM string node (len+0x18), inserts into global list | decomp | med |
| 0x004A64D0 | 0x000A64D0 | FoMString_AddRef | Increments refcount at +0x0C | decomp | med |
| 0x004A6540 | 0x000A6540 | FoMString_EqualsNoCase | _mbsicmp on text (+0x14) | decomp | med |
| 0x004A6570 | 0x000A6570 | FoMString_Text | Returns text pointer (+0x14) | decomp | high |
| 0x0040A3A0 | 0x0000A3A0 | FoMString_TextOrEmpty | Returns text pointer or fallback empty string | decomp | med |

### Data (cvar/console)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x006D8CB8 | 0x002D8CB8 | g_CVarBindTable | 113-entry binding table (0x14 bytes each). Console_Init sets mgr->bindTable= CVar_GetBindingTable(), count=0x71. | decomp + data scan | high |

### Data (client state)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x006F01C4 | 0x002F01C4 | g_pClientMgr | Global client manager ptr (CClientMgr) | decomp + xrefs | high |

## CShell.dll
## CShell.dll (image base 0x10000000)

### Code (hook targets / patched sites)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10149490 | 0x00149490 | PickSGT | Returns .sgt name by ID | decomp + strings | high |
| 0x10149D60 | 0x00149D60 | CMusic_InitLevel | Music init / search paths | decomp + strings | high |
| 0x10149DCC | 0x00149DCC | (mid-function) | CMusic path hook target | hook offset + decomp | high |
| 0x10167CB0 | 0x00167CB0 | DispatchOpcode | Switch dispatcher on opcode | decomp | med |
| 0x10167D23 | 0x00167D23 | (patch site) | Proxy rel32 patch → UNK_1003bc1b | hook offset + hexdump | med |
| 0x1015D9B0 | 0x0015D9B0 | HandleFactionMessage | Faction message handler | decomp + string | med |
| 0x1015DAD2 | 0x0015DAD2 | (patch site) | Proxy rel32 patch → UNK_1003c0db | hook offset + hexdump | med |
| 0x1013EB40 | 0x0013EB40 | Client_InitAndVerify | Client init; triggers integrity failure message | decomp | med |
| 0x101F50B0 | 0x001F50B0 | IntegrityCheck_ScanDirectory | Enumerates *.* and rejects blacklisted filenames | decomp | high |
| 0x101F5040 | 0x001F5040 | IntegrityCheck_IsFilenameAllowed | Decodes blacklist and strstr(file) | decomp | high |
| 0x101F4FF0 | 0x001F4FF0 | IntegrityCheck_InitBlacklist | Seeds obfuscated blacklist bytes | decomp | med |
| 0x101D04E0 | 0x001D04E0 | Blacklist_DecodeInPlace | Rot/Xor decode of blacklist bytes | decomp | med |
| 0x101D05A0 | 0x001D05A0 | Blacklist_EncodeInPlace | Re-encodes blacklist bytes | decomp | med |
| 0x1004FBA2 | 0x0004FBA2 | IntegrityPatch_Byte74 | Patched byte -> 0x74 by proxy during init | decomp (ProxyThreadMain) | med |
| 0x1001126F | 0x0001126F | IntegrityPatch_Byte08 | Patched byte -> 0x08 by proxy during init | decomp (ProxyThreadMain) | med |
| 0x100576A5 | 0x000576A5 | IntegrityPatch_Dword63F | Patched dword -> 0x63F by proxy during init | decomp (ProxyThreadMain) | med |

Notes:
- In the Resources build, these three offsets land inside instruction immediates in FUN_1004fb90 / FUN_10010800 / FUN_100575d0. The proxy patch values would corrupt code, suggesting a CShell version mismatch; verify the runtime-loaded CShell module.
- Found two CShell.dll copies: C:\\FoM_Decompilation\\Resources (3062784 bytes) and C:\\FoM_Decompilation\\Face of Mankind\\Resources (3678720 bytes); patch RVAs do not align cleanly with either.
- Blacklist strings decode to "d3d" and "cheat"; integrity check scans *.* for those substrings.

### CShell.dll Data (integrity check)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x102C7D78 | 0x002C7D78 | g_integrityBlacklistTable | Pointer/length pairs for obfuscated blacklist strings | decomp + hexdump | med |
| 0x1033E720 | 0x0033E720 | g_obfBlack_cheat | Obfuscated bytes for "cheat" | decomp + decode | med |
| 0x1033E728 | 0x0033E728 | g_obfBlack_d3d | Obfuscated bytes for "d3d" | decomp + decode | med |
