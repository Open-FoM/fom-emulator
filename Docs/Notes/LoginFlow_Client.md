# FoM Client Login Flow (CShell.dll)
Generated: 2025-12-31
IDB: C:\FoM_Decompilation\FoTD\Resources\CShell.dll
ImageBase: 0x10000000

## Overview
- Login UI submit path reads fields 0x5E (username) and 0x7C (password), writes shared mem, and triggers send/tick.
- Login request throttle uses EncVar indices 10/11/12/13; sends Packet_Id107 (0x6B) when threshold met.
- Login tick (sub_101C0820) sends Packet_Id107 (0x6B) when SharedMem flag 0x54 is set and timing gate passes.
- 0x6D response handler parses status/text and updates UI only.

## Login_OnSubmit (0x101C1072)
Role: UI submit; reads username/password; updates UI and triggers login send/tick.

### Decomp
```c
// positive sp value has been detected, the output may be wrong!
int __usercall Login_OnSubmit@<eax>(int a1@<eax>, void (__cdecl *a2)(int, void *)@<edx>, int a3@<ebp>, _BYTE *a4@<esi>)
{
  int WindowById; // eax
  int v5; // edi
  int v6; // edi
  int v7; // ebx
  int v8; // edx
  int v9; // edi
  int result; // eax
  int v11; // [esp-14h] [ebp-14h]
  int v12; // [esp-10h] [ebp-10h]

  a2(a1, &loc_102D045C);
  *(_DWORD *)(a3 - 4) = -1;
  *(_DWORD *)(a3 - 1260) = &vtbl_Packet_Unknown0;
  BitStream_FreeOwnedBuffer(a3 - 1248);
  if ( (unsigned __int8)SharedMem_ReadBool_std(122) )
  {
    ((void (__thiscall *)(int))sub_101072E0)(dword_103BF708);
    SharedMem_WriteU8_std(122, 0);
  }
  if ( (unsigned __int8)SharedMem_ReadBool_std(148) )
  {
    WindowById = CWindowMgr_GetWindowById(dword_103BF708, 15);
    if ( WindowById )
    {
      if ( !*(_BYTE *)(WindowById + 6241) )
        sub_1005A570(dword_103BF6F4, 15);
    }
  }
  v5 = SharedMem_ReadDword_this(a4, 0x5Cu);
  if ( v5 )
  {
    sub_101C0A60(dword_103BF73C, 5);
    if ( sub_1008BB60(dword_103BF70C, 1) )
      sub_10089460(v5, "FF000000", 0, 0, 0);
    SharedMem_WriteDword_this(92, 0);
  }
  v6 = SharedMem_ReadDword_this(a4, 0x5Du);
  v7 = SharedMem_ReadDword_this(a4, 0x7Bu);
  if ( !v6 || *(_DWORD *)dword_103BF754 == 2 )
  {
    if ( v7 )
    {
      *(_BYTE *)(a3 - 80) = 0;
      Ui_ReadFieldTextById(a4, 124, a3 - 80, 64);
      if ( !*(_BYTE *)(CWindowMgr_GetWindowById(dword_103BF708, 91) + 6241) )
      {
        v8 = 3;
        if ( v7 == 1801 )
          v8 = 2;
        if ( strlen((const char *)(a3 - 80)) )
        {
          LoginField_QueueUpdate((int **)dword_103BF708, v8, v7, *(_DWORD *)(dword_103BF6F4 + 8), a3 - 80);
          SharedMem_WriteString_std(124, (char *)byte_102A8B98);
        }
        else
        {
          LoginField_QueueUpdate((int **)dword_103BF708, v8, v7, *(_DWORD *)(dword_103BF6F4 + 8), 0);
        }
        sub_1005A430(4);
        sub_1005A570(dword_103BF6F4, 91);
      }
      SharedMem_WriteDword_this(123, 0);
    }
  }
  else
  {
    if ( !*(_BYTE *)(CWindowMgr_GetWindowById(dword_103BF708, 91) + 6241)
      && (v6 != 1889 || !*(_BYTE *)(CWindowMgr_GetWindowById(dword_103BF708, 53) + 6241)) )
    {
      *(_BYTE *)(a3 - 144) = 0;
      Ui_ReadFieldTextById(a4, 94, a3 - 144, 64);
      if ( strlen((const char *)(a3 - 144)) )
      {
        LoginField_QueueUpdate((int **)dword_103BF708, 4, v6, *(_DWORD *)(dword_103BF6F4 + 8), a3 - 144);
        SharedMem_WriteString_std(94, (char *)byte_102A8B98);
      }
      else
      {
        LoginField_QueueUpdate((int **)dword_103BF708, 4, v6, *(_DWORD *)(dword_103BF6F4 + 8), 0);
      }
      sub_1005A570(dword_103BF6F4, 91);
    }
    SharedMem_WriteDword_this(93, 0);
  }
  if ( (unsigned __int8)SharedMem_ReadBool_std(110) )
  {
    *((_BYTE *)dword_103BF71C + 132) = 0;
    SharedMem_WriteU8_std(110, 0);
  }
  if ( (unsigned __int8)SharedMem_ReadBool_std(111) )
  {
    ((void (__thiscall *)(void *))sub_101C56F0)(dword_103BF75C);
    SharedMem_WriteU8_std(111, 0);
  }
  if ( EncVarMgr_GetInt(10) )
  {
    v9 = EncVarMgr_GetInt(11);
    if ( timeGetTime() - v9 > 0x3E8 )
      ((void (__cdecl *)())Login_SendRequest_Throttled)();
  }
  result = sub_101C0820(v11, v12);
  if ( !a4[52] )
  {
    result = PlayerStats_GetStatValue(7);
    if ( result )
      a4[52] = 1;
  }
  return result;
}
```

### Disasm
```asm
101C1072  push    offset loc_102D045C
101C1077  push    eax
101C1078  call    edx
101C107A  add     esp, 0Ch
101C107D  lea     ecx, [ebp-4E0h]
101C1083  mov     dword ptr [ebp-4], 0FFFFFFFFh
101C108A  mov     dword ptr [ebp-4ECh], offset vtbl_Packet_Unknown0
101C1094  call    BitStream_FreeOwnedBuffer
101C1099  push    7Ah ; 'z'
101C109B  mov     ecx, esi
101C109D  call    SharedMem_ReadBool_std
101C10A2  test    al, al
101C10A4  jz      short loc_101C10BC
101C10A6  mov     ecx, dword_103BF708
101C10AC  call    sub_101072E0
101C10B1  push    0
101C10B3  push    7Ah ; 'z'
101C10B5  mov     ecx, esi
101C10B7  call    SharedMem_WriteU8_std
101C10BC  push    94h
101C10C1  mov     ecx, esi
101C10C3  call    SharedMem_ReadBool_std
101C10C8  test    al, al
101C10CA  jz      short loc_101C10F3
101C10CC  mov     ecx, dword_103BF708
101C10D2  push    0Fh
101C10D4  call    CWindowMgr_GetWindowById
101C10D9  test    eax, eax
101C10DB  jz      short loc_101C10F3
101C10DD  cmp     byte ptr [eax+1861h], 0
101C10E4  jnz     short loc_101C10F3
101C10E6  mov     ecx, dword_103BF6F4
101C10EC  push    0Fh
101C10EE  call    sub_1005A570
101C10F3  push    5Ch ; '\'
101C10F5  mov     ecx, esi
101C10F7  call    SharedMem_ReadDword_this
101C10FC  mov     edi, eax
101C10FE  test    edi, edi
101C1100  jz      short loc_101C113E
101C1102  mov     ecx, dword_103BF73C
101C1108  push    5
101C110A  call    sub_101C0A60
101C110F  mov     ecx, dword_103BF70C
101C1115  push    1
101C1117  call    sub_1008BB60
101C111C  test    eax, eax
101C111E  jz      short loc_101C1133
101C1120  push    0; int
101C1122  push    0; char
101C1124  push    0; int
101C1126  push    offset aFf000000; "FF000000"
101C112B  push    edi; int
101C112C  mov     ecx, eax
101C112E  call    sub_10089460
101C1133  push    0
101C1135  push    5Ch ; '\'
101C1137  mov     ecx, esi
101C1139  call    SharedMem_WriteDword_this
101C113E  push    5Dh ; ']'
101C1140  mov     ecx, esi
101C1142  call    SharedMem_ReadDword_this
101C1147  push    7Bh ; '{'
101C1149  mov     ecx, esi
101C114B  mov     edi, eax
101C114D  call    SharedMem_ReadDword_this
101C1152  mov     ebx, eax
101C1154  test    edi, edi
101C1156  jbe     loc_101C1231
101C115C  mov     eax, dword_103BF754
101C1161  cmp     dword ptr [eax], 2
101C1164  jz      loc_101C1231
101C116A  mov     ecx, dword_103BF708
101C1170  push    5Bh ; '['
101C1172  call    CWindowMgr_GetWindowById
101C1177  cmp     byte ptr [eax+1861h], 0
101C117E  jnz     loc_101C1228
101C1184  cmp     edi, 761h
101C118A  jnz     short loc_101C11A6
101C118C  mov     ecx, dword_103BF708
101C1192  push    35h ; '5'
101C1194  call    CWindowMgr_GetWindowById
101C1199  cmp     byte ptr [eax+1861h], 0
101C11A0  jnz     loc_101C1228
101C11A6  push    40h ; '@'
101C11A8  lea     ecx, [ebp-90h]
101C11AE  push    ecx
101C11AF  push    5Eh ; '^'
101C11B1  mov     ecx, esi
101C11B3  mov     byte ptr [ebp-90h], 0
101C11BA  call    Ui_ReadFieldTextById
101C11BF  lea     eax, [ebp-90h]
101C11C5  lea     edx, [eax+1]
101C11C8  mov     cl, [eax]
101C11CA  inc     eax
101C11CB  test    cl, cl
101C11CD  jnz     short loc_101C11C8
101C11CF  sub     eax, edx
101C11D1  jz      short loc_101C1201
101C11D3  mov     eax, dword_103BF6F4
101C11D8  mov     ecx, [eax+8]
101C11DB  lea     edx, [ebp-90h]
101C11E1  push    edx
101C11E2  push    ecx
101C11E3  mov     ecx, dword_103BF708
101C11E9  push    edi
101C11EA  push    4
101C11EC  call    LoginField_QueueUpdate
101C11F1  push    offset byte_102A8B98; Source
101C11F6  push    5Eh ; '^'; int
101C11F8  mov     ecx, esi
101C11FA  call    SharedMem_WriteString_std
101C11FF  jmp     short loc_101C121B
101C1201  mov     edx, dword_103BF6F4
101C1207  mov     eax, [edx+8]
101C120A  mov     ecx, dword_103BF708
101C1210  push    0
101C1212  push    eax
101C1213  push    edi
101C1214  push    4
101C1216  call    LoginField_QueueUpdate
101C121B  mov     ecx, dword_103BF6F4
101C1221  push    5Bh ; '['
101C1223  call    sub_1005A570
101C1228  push    0
101C122A  push    5Dh ; ']'
101C122C  jmp     loc_101C12E7
101C1231  test    ebx, ebx
101C1233  jbe     loc_101C12EE
101C1239  push    40h ; '@'
101C123B  lea     ecx, [ebp-50h]
101C123E  push    ecx
101C123F  push    7Ch ; '|'
101C1241  mov     ecx, esi
101C1243  mov     byte ptr [ebp-50h], 0
101C1247  call    Ui_ReadFieldTextById
101C124C  mov     ecx, dword_103BF708
101C1252  push    5Bh ; '['
101C1254  call    CWindowMgr_GetWindowById
101C1259  cmp     byte ptr [eax+1861h], 0
101C1260  jnz     loc_101C12E3
101C1266  mov     edx, 3
101C126B  cmp     ebx, 709h
101C1271  jnz     short loc_101C1278
101C1273  mov     edx, 2
101C1278  lea     eax, [ebp-50h]
101C127B  lea     edi, [eax+1]
101C127E  mov     edi, edi
101C1280  mov     cl, [eax]
101C1282  inc     eax
101C1283  test    cl, cl
101C1285  jnz     short loc_101C1280
101C1287  sub     eax, edi
101C1289  mov     ecx, dword_103BF6F4
101C128F  jz      short loc_101C12B6
101C1291  lea     eax, [ebp-50h]
101C1294  push    eax
101C1295  mov     eax, [ecx+8]
101C1298  mov     ecx, dword_103BF708
101C129E  push    eax
101C129F  push    ebx
101C12A0  push    edx
101C12A1  call    LoginField_QueueUpdate
101C12A6  push    offset byte_102A8B98; Source
101C12AB  push    7Ch ; '|'; int
101C12AD  mov     ecx, esi
101C12AF  call    SharedMem_WriteString_std
101C12B4  jmp     short loc_101C12C9
101C12B6  mov     eax, [ecx+8]
101C12B9  mov     ecx, dword_103BF708
101C12BF  push    0
101C12C1  push    eax
101C12C2  push    ebx
101C12C3  push    edx
101C12C4  call    LoginField_QueueUpdate
101C12C9  mov     ecx, dword_103BF6F4
101C12CF  push    4
101C12D1  call    sub_1005A430
101C12D6  mov     ecx, dword_103BF6F4
101C12DC  push    5Bh ; '['
101C12DE  call    sub_1005A570
101C12E3  push    0
101C12E5  push    7Bh ; '{'
101C12E7  mov     ecx, esi
101C12E9  call    SharedMem_WriteDword_this
101C12EE  push    6Eh ; 'n'
101C12F0  mov     ecx, esi
101C12F2  call    SharedMem_ReadBool_std
101C12F7  test    al, al
101C12F9  jz      short loc_101C1313
101C12FB  mov     ecx, dword_103BF71C
101C1301  push    0
101C1303  mov     byte ptr [ecx+84h], 0
101C130A  push    6Eh ; 'n'
101C130C  mov     ecx, esi
101C130E  call    SharedMem_WriteU8_std
101C1313  push    6Fh ; 'o'
101C1315  mov     ecx, esi
101C1317  call    SharedMem_ReadBool_std
101C131C  test    al, al
101C131E  jz      short loc_101C1336
101C1320  mov     ecx, dword_103BF75C
101C1326  call    sub_101C56F0
101C132B  push    0
101C132D  push    6Fh ; 'o'
101C132F  mov     ecx, esi
101C1331  call    SharedMem_WriteU8_std
101C1336  mov     ecx, g_pEncVarMgr
101C133C  push    0Ah
101C133E  call    EncVarMgr_GetInt
101C1343  test    eax, eax
101C1345  jbe     short loc_101C136C
101C1347  mov     ecx, g_pEncVarMgr
101C134D  push    0Bh
101C134F  call    EncVarMgr_GetInt
101C1354  mov     edi, eax
101C1356  call    ds:__imp_timeGetTime
101C135C  sub     eax, edi
101C135E  cmp     eax, 3E8h
101C1363  jbe     short loc_101C136C
101C1365  mov     ecx, esi
101C1367  call    Login_SendRequest_Throttled
101C136C  mov     ecx, esi
101C136E  call    sub_101C0820
101C1373  cmp     byte ptr [esi+34h], 0
101C1377  jnz     short loc_101C138E
101C1379  mov     ecx, g_pPlayerStats
101C137F  push    7
101C1381  call    PlayerStats_GetStatValue
101C1386  test    eax, eax
101C1388  jbe     short loc_101C138E
101C138A  mov     byte ptr [esi+34h], 1
101C138E  mov     ecx, [ebp-0Ch]
101C1391  mov     large fs:0, ecx
101C1398  pop     ecx
101C1399  pop     edi
101C139A  pop     esi
101C139B  pop     ebx
101C139C  mov     ecx, [ebp-10h]
101C139F  xor     ecx, ebp
101C13A1  call    sub_1028584E
101C13A6  mov     esp, ebp
101C13A8  pop     ebp
101C13A9  retn
```

## Login_SendRequest_Throttled (0x101C04B0)
Role: Throttle/gate; sends Packet_Id107 (0x6B) when threshold met.

### Decomp
```c
int Login_SendRequest_Throttled()
{
  double v1; // st7
  DWORD Time; // eax
  struct _SYSTEMTIME SystemTime; // [esp+8h] [ebp-5F0h] BYREF
  struct _FILETIME SystemTimeAsFileTime; // [esp+18h] [ebp-5E0h] BYREF
  float v5; // [esp+20h] [ebp-5D8h]
  float v6; // [esp+24h] [ebp-5D4h]
  _DWORD v7[3]; // [esp+28h] [ebp-5D0h] BYREF
  _BYTE v8[1060]; // [esp+34h] [ebp-5C4h] BYREF
  __int16 v9; // [esp+458h] [ebp-1A0h]
  int v10; // [esp+45Ch] [ebp-19Ch]
  int v11; // [esp+464h] [ebp-194h]
  int v12; // [esp+5F4h] [ebp-4h]

  GetSystemTime(&SystemTime);
  GetSystemTimeAsFileTime(&SystemTimeAsFileTime);
  if ( ((double (__thiscall *)(int))*(_DWORD *)(*(_DWORD *)g_pILTClient + 104))(g_pILTClient) <= 0.067000002 )
  {
    if ( EncVarMgr_GetInt(11) )
    {
      v6 = (double)(SystemTimeAsFileTime.dwLowDateTime - EncVarMgr_GetInt(12)) / 10000000.0;
      v6 = 1.0 - v6;
      v6 = fabs(v6);
      v6 = v6 * 100.0;
      if ( v6 > 33.0 )
        v6 = 33.0;
      v5 = EncVarMgr_GetFloat(g_pEncVarMgr, 13);
      if ( v6 <= 10.0 )
        v1 = v5 - 10.0;
      else
        v1 = v6 + v5;
      v5 = v1;
      if ( v5 < 0.0 )
        v5 = 0.0;
      if ( v5 >= 100.0 )
      {
        Packet_Id107_Init(v7);
        v12 = 0;
        v9 = 1;
        v10 = 1;
        v11 = SharedMem_ReadDword_this(g_pPlayerStats, 0x5Bu);
        LTClient_SendPacket_BuildIfNeeded(v7, 2, 1, 3, 0);
        v5 = 0.0;
        v12 = -1;
        v7[0] = &vtbl_Packet_Unknown0;
        BitStream_FreeOwnedBuffer((int)v8);
      }
      EncVarMgr_SetFloat(13, v5);
    }
    EncVarMgr_SetInt(g_pEncVarMgr, 12, SystemTimeAsFileTime.dwLowDateTime);
    Time = timeGetTime();
    return EncVarMgr_SetInt(g_pEncVarMgr, 11, Time);
  }
  else
  {
    EncVarMgr_SetInt(g_pEncVarMgr, 11, 0);
    return EncVarMgr_SetFloat(13, 0.0);
  }
}
```

### Disasm
```asm
101C04B0  push    ebp
101C04B1  mov     ebp, esp
101C04B3  push    0FFFFFFFFh
101C04B5  push    offset SEH_101C04B0
101C04BA  mov     eax, large fs:0
101C04C0  push    eax
101C04C1  sub     esp, 5E4h
101C04C7  mov     eax, dword_1035A5B0
101C04CC  xor     eax, ebp
101C04CE  mov     [ebp+var_10_1], eax
101C04D1  push    eax
101C04D2  lea     eax, [ebp+var_10]
101C04D5  mov     large fs:0, eax
101C04DB  lea     eax, [ebp+SystemTime]
101C04E1  push    eax; lpSystemTime
101C04E2  call    ds:__imp_GetSystemTime
101C04E8  lea     ecx, [ebp+SystemTimeAsFileTime]
101C04EE  push    ecx; lpSystemTimeAsFileTime
101C04EF  call    ds:__imp_GetSystemTimeAsFileTime
101C04F5  mov     ecx, g_pILTClient
101C04FB  mov     edx, [ecx]
101C04FD  mov     eax, [edx+68h]
101C0500  call    eax
101C0502  fcomp   ds:flt_102D0410
101C0508  mov     ecx, g_pEncVarMgr
101C050E  fnstsw  ax
101C0510  test    ah, 41h
101C0513  jnz     short loc_101C0536
101C0515  push    0
101C0517  push    0Bh
101C0519  call    EncVarMgr_SetInt
101C051E  fldz
101C0520  push    ecx
101C0521  fstp    [esp+5F8h+var_5F8]; float
101C0524  mov     ecx, g_pEncVarMgr
101C052A  push    0Dh; char
101C052C  call    EncVarMgr_SetFloat
101C0531  jmp     loc_101C06EF
101C0536  push    0Bh
101C0538  call    EncVarMgr_GetInt
101C053D  test    eax, eax
101C053F  jbe     loc_101C06C7
101C0545  mov     ecx, g_pEncVarMgr
101C054B  push    0Ch
101C054D  call    EncVarMgr_GetInt
101C0552  mov     ecx, [ebp+SystemTimeAsFileTime.dwLowDateTime]
101C0558  sub     ecx, eax
101C055A  mov     [ebp+var_5D8], ecx
101C0560  fild    [ebp+var_5D8]
101C0566  test    ecx, ecx
101C0568  jge     short loc_101C0570
101C056A  fadd    ds:flt_102AA6F4
101C0570  fdiv    ds:dbl_102D0408
101C0576  fstp    [ebp+var_5D8]
101C057C  fld     [ebp+var_5D8]
101C0582  fld1
101C0584  fsubrp  st(1), st
101C0586  fstp    [ebp+var_5D8]
101C058C  fld     [ebp+var_5D8]
101C0592  fabs
101C0594  fstp    [ebp+var_5D8]
101C059A  fld     [ebp+var_5D8]
101C05A0  fmul    ds:dbl_102C25B8
101C05A6  fstp    [ebp+var_5D8]
101C05AC  fld     ds:flt_102BFF40
101C05B2  fcom    [ebp+var_5D8]
101C05B8  fnstsw  ax
101C05BA  test    ah, 5
101C05BD  jp      short loc_101C05C7
101C05BF  fstp    [ebp+var_5D8]
101C05C5  jmp     short loc_101C05C9
101C05C7  fstp    st
101C05C9  mov     ecx, g_pEncVarMgr
101C05CF  push    0Dh
101C05D1  call    EncVarMgr_GetFloat
101C05D6  fstp    dword ptr [ebp-5D8h]
101C05DC  fld     ds:flt_102C006C
101C05E2  fld     [ebp+var_5D8]
101C05E8  fcom    st(1)
101C05EA  fnstsw  ax
101C05EC  fstp    st(1)
101C05EE  test    ah, 41h
101C05F1  jnz     short loc_101C05FB
101C05F3  fadd    dword ptr [ebp-5D8h]
101C05F9  jmp     short loc_101C0609
101C05FB  fstp    st
101C05FD  fld     dword ptr [ebp-5D8h]
101C0603  fsub    ds:dbl_102C0080
101C0609  fstp    dword ptr [ebp-5D8h]
101C060F  fldz
101C0611  fcom    dword ptr [ebp-5D8h]
101C0617  fnstsw  ax
101C0619  test    ah, 41h
101C061C  jnz     short loc_101C0626
101C061E  fstp    dword ptr [ebp-5D8h]
101C0624  jmp     short loc_101C0628
101C0626  fstp    st
101C0628  fld     dword ptr [ebp-5D8h]
101C062E  fcomp   ds:dbl_102C25B8
101C0634  fnstsw  ax
101C0636  test    ah, 1
101C0639  jnz     short loc_101C06B0
101C063B  lea     ecx, [ebp+var_5D4]
101C0641  call    Packet_Id107_Init
101C0646  mov     ecx, g_pPlayerStats
101C064C  mov     edx, 1
101C0651  push    5Bh ; '['
101C0653  mov     [ebp+var_4], 0
101C065A  mov     [ebp+var_1A0_1], dx
101C0661  mov     [ebp+var_1A0], edx
101C0667  call    SharedMem_ReadDword_this
101C066C  mov     ecx, dword_103BF734
101C0672  push    0
101C0674  push    3
101C0676  push    1
101C0678  mov     [ebp+var_194], eax
101C067E  push    2
101C0680  lea     eax, [ebp+var_5D4]
101C0686  push    eax
101C0687  call    LTClient_SendPacket_BuildIfNeeded
101C068C  fldz
101C068E  lea     ecx, [ebp+var_5C4]
101C0694  fstp    dword ptr [ebp-5D8h]
101C069A  mov     [ebp+var_4], 0FFFFFFFFh
101C06A1  mov     [ebp+var_5D4], offset vtbl_Packet_Unknown0
101C06AB  call    BitStream_FreeOwnedBuffer
101C06B0  fld     dword ptr [ebp-5D8h]
101C06B6  push    ecx
101C06B7  mov     ecx, g_pEncVarMgr
101C06BD  fstp    [esp+5F8h+var_5F8]; float
101C06C0  push    0Dh; char
101C06C2  call    EncVarMgr_SetFloat
101C06C7  mov     ecx, [ebp+SystemTimeAsFileTime.dwLowDateTime]
101C06CD  push    ecx
101C06CE  mov     ecx, g_pEncVarMgr
101C06D4  push    0Ch
101C06D6  call    EncVarMgr_SetInt
101C06DB  call    ds:__imp_timeGetTime
101C06E1  mov     ecx, g_pEncVarMgr
101C06E7  push    eax
101C06E8  push    0Bh
101C06EA  call    EncVarMgr_SetInt
101C06EF  mov     ecx, [ebp+var_10]
101C06F2  mov     large fs:0, ecx
101C06F9  pop     ecx
101C06FA  mov     ecx, [ebp+var_10_1]
101C06FD  xor     ecx, ebp
101C06FF  call    sub_1028584E
101C0704  mov     esp, ebp
101C0706  pop     ebp
101C0707  retn
10298440  lea     ecx, [ebp+var_5D4]
10298446  jmp     sub_1000BA60
1029844B  mov     edx, [esp-4+arg_4]
1029844F  lea     eax, [edx+0Ch]
10298452  mov     ecx, [edx-5E8h]
10298458  xor     ecx, eax
1029845A  call    sub_1028584E
1029845F  mov     ecx, [edx-4]
10298462  xor     ecx, eax
10298464  call    sub_1028584E
10298469  mov     eax, offset unk_1033E9DC
1029846E  jmp     __CxxFrameHandler3
```

## sub_101C0820 (0x101C0820)
Role: Login state tick; gated 0x6B heartbeat (SharedMem 0x54).

### Decomp
```c
void __thiscall sub_101C0820(float *this)
{
  char v2[12]; // [esp+8h] [ebp-5D0h] BYREF
  _BYTE v3[1060]; // [esp+14h] [ebp-5C4h] BYREF
  __int16 v4; // [esp+438h] [ebp-1A0h]
  int v5; // [esp+43Ch] [ebp-19Ch]
  int Dword_this; // [esp+444h] [ebp-194h]
  int v7; // [esp+5D4h] [ebp-4h]

  if ( SharedMem_ReadBool_std(0x54u)
    && *(this + 16) <= ((double (__thiscall *)(int))*(_DWORD *)(*(_DWORD *)g_pILTClient + 100))(g_pILTClient) )
  {
    if ( (unsigned __int8)sub_101BFC00() )
    {
      Packet_Id107_Init(v2);
      v7 = 0;
      v4 = 1;
      v5 = 21;
      Dword_this = SharedMem_ReadDword_this(g_pPlayerStats, 0x5Bu);
      LTClient_SendPacket_BuildIfNeeded(v2, 2, 1, 3, 0);
      v7 = -1;
      *(_DWORD *)v2 = &vtbl_Packet_Unknown0;
      BitStream_FreeOwnedBuffer((int)v3);
    }
    *(this + 16) = ((double (*)(void))*(_DWORD *)(g_pILTClient + 500))() + 300.0;
  }
}
```

### Disasm
```asm
101C0820  push    ebp
101C0821  mov     ebp, esp
101C0823  push    0FFFFFFFFh
101C0825  push    offset SEH_101C0820
101C082A  mov     eax, large fs:0
101C0830  push    eax
101C0831  sub     esp, 5C4h
101C0837  mov     eax, dword_1035A5B0
101C083C  xor     eax, ebp
101C083E  mov     [ebp+var_10], eax
101C0841  push    esi
101C0842  push    eax
101C0843  lea     eax, [ebp+var_C]
101C0846  mov     large fs:0, eax
101C084C  push    54h ; 'T'
101C084E  mov     esi, ecx
101C0850  call    SharedMem_ReadBool_std
101C0855  test    al, al
101C0857  jz      loc_101C090B
101C085D  mov     ecx, g_pILTClient
101C0863  mov     eax, [ecx]
101C0865  mov     edx, [eax+64h]
101C0868  call    edx
101C086A  fld     dword ptr [esi+40h]
101C086D  fcompp
101C086F  fnstsw  ax
101C0871  test    ah, 41h
101C0874  jz      loc_101C090B
101C087A  call    sub_101BFC00
101C087F  test    al, al
101C0881  jz      short loc_101C08F4
101C0883  lea     ecx, [ebp+var_5D0]
101C0889  call    Packet_Id107_Init
101C088E  mov     ecx, g_pPlayerStats
101C0894  mov     eax, 1
101C0899  push    5Bh ; '['
101C089B  mov     [ebp+var_4], 0
101C08A2  mov     [ebp+var_1A0], ax
101C08A9  mov     [ebp+var_19C], 15h
101C08B3  call    SharedMem_ReadDword_this
101C08B8  push    0
101C08BA  push    3
101C08BC  push    1
101C08BE  push    2
101C08C0  lea     ecx, [ebp+var_5D0]
101C08C6  push    ecx
101C08C7  mov     ecx, dword_103BF734
101C08CD  mov     [ebp+var_194], eax
101C08D3  call    LTClient_SendPacket_BuildIfNeeded
101C08D8  lea     ecx, [ebp+var_5C4]
101C08DE  mov     [ebp+var_4], 0FFFFFFFFh
101C08E5  mov     dword ptr [ebp+var_5D0], offset vtbl_Packet_Unknown0
101C08EF  call    BitStream_FreeOwnedBuffer
101C08F4  mov     edx, g_pILTClient
101C08FA  mov     eax, [edx+1F4h]
101C0900  call    eax
101C0902  fadd    ds:dbl_102C3960
101C0908  fstp    dword ptr [esi+40h]
101C090B  mov     ecx, [ebp+var_C]
101C090E  mov     large fs:0, ecx
101C0915  pop     ecx
101C0916  pop     esi
101C0917  mov     ecx, [ebp+var_10]
101C091A  xor     ecx, ebp
101C091C  call    sub_1028584E
101C0921  mov     esp, ebp
101C0923  pop     ebp
101C0924  retn
102984C0  lea     ecx, [ebp+var_5D0]
102984C6  jmp     sub_1000BA60
102984CB  mov     edx, [esp-4+arg_4]
102984CF  lea     eax, [edx+0Ch]
102984D2  mov     ecx, [edx-5CCh]
102984D8  xor     ecx, eax
102984DA  call    sub_1028584E
102984DF  mov     ecx, [edx-4]
102984E2  xor     ecx, eax
102984E4  call    sub_1028584E
102984E9  mov     eax, offset unk_1033EA34
102984EE  jmp     __CxxFrameHandler3
```

## HandlePacket_ID_6D_LoginResponse (0x1018E1F0)
Role: Parse 0x6D response; show UI status; no send.

### Decomp
```c
// ID 0x6D login response handler. Uses Packet_6D_Read -> Packet_InitBitStreamFromPayload + ReadBitsCompressed; no Read_u16c/u32c in this path.
int __stdcall HandlePacket_ID_6D_LoginResponse(int a1)
{
  void **v2; // [esp+Ch] [ebp-458h] BYREF
  char v3; // [esp+14h] [ebp-450h]
  _BYTE v4[1044]; // [esp+18h] [ebp-44Ch] BYREF
  int v5; // [esp+42Ch] [ebp-38h]
  int v6; // [esp+430h] [ebp-34h]
  char v7; // [esp+434h] [ebp-30h]
  char v8; // [esp+43Ch] [ebp-28h]
  char v9; // [esp+43Dh] [ebp-27h]
  int v10; // [esp+460h] [ebp-4h]

  v3 = 0;
  Concurrency::details::UMSThreadProxy::~UMSThreadProxy((#179 *)v4);
  v5 = 0;
  v6 = 0;
  v7 = 109;
  v2 = &off_102CE86C;
  v8 = 0;
  v9 = 0;
  v10 = 0;
  if ( Packet_6D_Read((int)&v2, a1) )
  {
    if ( v8 )
    {
      if ( v8 == 2 )
      {
        if ( sub_1008BB60(dword_103BF70C, 1) )
          sub_10089460(1720, "FF000000", 0, 0, 0);
      }
      else if ( v8 == 3 )
      {
        if ( sub_1008BB60(dword_103BF70C, 1) )
          sub_10089460(1710, "FF000000", 0, 0, 0);
      }
    }
    else if ( sub_1008BB60(dword_103BF70C, 1) )
    {
      sub_10089460(1711, "FF000000", 0, 0, 0);
    }
    v10 = -1;
    v2 = (void **)&vtbl_Packet_Unknown0;
    BitStream_FreeOwnedBuffer((int)v4);
    return 0;
  }
  else
  {
    v10 = -1;
    v2 = (void **)&vtbl_Packet_Unknown0;
    BitStream_FreeOwnedBuffer((int)v4);
    return 1;
  }
}
```

### Disasm
```asm
1018E1F0  push    ebp; ID 0x6D login response handler. Uses Packet_6D_Read -> Packet_InitBitStreamFromPayload + ReadBitsCompressed; no Read_u16c/u32c in this path.
1018E1F1  mov     ebp, esp
1018E1F3  push    0FFFFFFFFh
1018E1F5  push    offset SEH_1018E1F0
1018E1FA  mov     eax, large fs:0
1018E200  push    eax
1018E201  sub     esp, 44Ch
1018E207  mov     eax, dword_1035A5B0
1018E20C  xor     eax, ebp
1018E20E  mov     [ebp+var_10], eax
1018E211  push    ebx
1018E212  push    esi
1018E213  push    eax
1018E214  lea     eax, [ebp+var_C]
1018E217  mov     large fs:0, eax
1018E21D  mov     esi, [ebp+arg_0]
1018E220  xor     ebx, ebx
1018E222  lea     ecx, [ebp+var_44C]; this
1018E228  mov     [ebp+var_458], offset vtbl_Packet_Unknown0
1018E232  mov     [ebp+var_450], bl
1018E238  call    ??1UMSThreadProxy@details@Concurrency@@UAE@XZ; Concurrency::details::UMSThreadProxy::~UMSThreadProxy(void)
1018E23D  mov     [ebp+var_38], ebx
1018E240  mov     [ebp+var_34], ebx
1018E243  mov     [ebp+var_30], 6Dh ; 'm'
1018E247  mov     [ebp+var_458], offset off_102CE86C
1018E251  mov     [ebp+var_28], bl
1018E254  mov     [ebp+var_27], bl
1018E257  push    esi
1018E258  lea     ecx, [ebp+var_458]
1018E25E  mov     [ebp+var_4], ebx
1018E261  call    Packet_6D_Read
1018E266  test    al, al
1018E268  jnz     short loc_1018E28E
1018E26A  lea     ecx, [ebp+var_44C]
1018E270  mov     [ebp+var_4], 0FFFFFFFFh
1018E277  mov     [ebp+var_458], offset vtbl_Packet_Unknown0
1018E281  call    BitStream_FreeOwnedBuffer
1018E286  lea     eax, [ebx+1]
1018E289  jmp     loc_1018E323
1018E28E  movzx   eax, [ebp+var_28]
1018E292  sub     eax, ebx
1018E294  jz      short loc_1018E2E0
1018E296  sub     eax, 2
1018E299  jz      short loc_1018E2C0
1018E29B  sub     eax, 1
1018E29E  jnz     short loc_1018E305
1018E2A0  mov     ecx, dword_103BF70C
1018E2A6  push    1
1018E2A8  call    sub_1008BB60
1018E2AD  cmp     eax, ebx
1018E2AF  jz      short loc_1018E305
1018E2B1  push    ebx
1018E2B2  push    ebx
1018E2B3  push    ebx
1018E2B4  push    offset aFf000000; "FF000000"
1018E2B9  push    6AEh
1018E2BE  jmp     short loc_1018E2FE
1018E2C0  mov     ecx, dword_103BF70C
1018E2C6  push    1
1018E2C8  call    sub_1008BB60
1018E2CD  cmp     eax, ebx
1018E2CF  jz      short loc_1018E305
1018E2D1  push    ebx
1018E2D2  push    ebx
1018E2D3  push    ebx
1018E2D4  push    offset aFf000000; "FF000000"
1018E2D9  push    6B8h
1018E2DE  jmp     short loc_1018E2FE
1018E2E0  mov     ecx, dword_103BF70C
1018E2E6  push    1
1018E2E8  call    sub_1008BB60
1018E2ED  cmp     eax, ebx
1018E2EF  jz      short loc_1018E305
1018E2F1  push    ebx; int
1018E2F2  push    ebx; char
1018E2F3  push    ebx; int
1018E2F4  push    offset aFf000000; "FF000000"
1018E2F9  push    6AFh; int
1018E2FE  mov     ecx, eax
1018E300  call    sub_10089460
1018E305  lea     ecx, [ebp+var_44C]
1018E30B  mov     [ebp+var_4], 0FFFFFFFFh
1018E312  mov     [ebp+var_458], offset vtbl_Packet_Unknown0
1018E31C  call    BitStream_FreeOwnedBuffer
1018E321  xor     eax, eax
1018E323  mov     ecx, [ebp+var_C]
1018E326  mov     large fs:0, ecx
1018E32D  pop     ecx
1018E32E  pop     esi
1018E32F  pop     ebx
1018E330  mov     ecx, [ebp+var_10]
1018E333  xor     ecx, ebp
1018E335  call    sub_1028584E
1018E33A  mov     esp, ebp
1018E33C  pop     ebp
1018E33D  retn    4
10296680  lea     ecx, [ebp+var_458]
10296686  jmp     sub_1018C310
1029668B  mov     edx, [esp-4+arg_4]
1029668F  lea     eax, [edx+0Ch]
10296692  mov     ecx, [edx-458h]
10296698  xor     ecx, eax
1029669A  call    sub_1028584E
1029669F  mov     ecx, [edx-4]
102966A2  xor     ecx, eax
102966A4  call    sub_1028584E
102966A9  mov     eax, offset unk_1033CF9C
102966AE  jmp     __CxxFrameHandler3
```

## Packet_6D_Read (0x1018DCE0)
Role: Parse 0x6D payload: status byte + string.

### Decomp
```c
char __thiscall Packet_6D_Read(int this, int a2)
{
  char result; // al

  result = Packet_InitBitStreamFromPayload((_DWORD *)this, a2);
  if ( result )
  {
    BitStream_ReadBitsCompressed((unsigned int *)(this + 12), (char *)(this + 1072), 8u, 1);
    return (*(unsigned __int8 (__thiscall **)(int, int, int, int))(*(_DWORD *)g_LTClient + 56))(
             g_LTClient,
             this + 1073,
             2048,
             this + 12) != 0;
  }
  return result;
}
```

### Disasm
```asm
1018DCE0  push    ebp
1018DCE1  mov     ebp, esp
1018DCE3  mov     eax, [ebp+arg_0]
1018DCE6  push    esi
1018DCE7  push    eax
1018DCE8  mov     esi, ecx
1018DCEA  call    Packet_InitBitStreamFromPayload
1018DCEF  test    al, al
1018DCF1  jnz     short loc_1018DCF8
1018DCF3  pop     esi
1018DCF4  pop     ebp
1018DCF5  retn    4
1018DCF8  push    edi
1018DCF9  push    1
1018DCFB  push    8
1018DCFD  lea     ecx, [esi+430h]
1018DD03  lea     edi, [esi+0Ch]
1018DD06  push    ecx
1018DD07  mov     ecx, edi
1018DD09  call    BitStream_ReadBitsCompressed
1018DD0E  mov     ecx, g_LTClient
1018DD14  mov     edx, [ecx]
1018DD16  mov     eax, [edx+38h]
1018DD19  push    edi
1018DD1A  push    800h
1018DD1F  add     esi, 431h
1018DD25  push    esi
1018DD26  call    eax
1018DD28  test    al, al
1018DD2A  pop     edi
1018DD2B  setnz   al
1018DD2E  pop     esi
1018DD2F  pop     ebp
1018DD30  retn    4
```

## Packet_Id107_Init (0x1000C7E0)
Role: Init packet id 0x6B struct.

### Decomp
```c
char *__thiscall Packet_Id107_Init(char *this)
{
  *(_DWORD *)this = &vtbl_Packet_Unknown0;
  *(this + 8) = 0;
  Concurrency::details::UMSThreadProxy::~UMSThreadProxy((#179 *)(this + 12));
  *((_DWORD *)this + 264) = 0;
  *((_DWORD *)this + 265) = 0;
  *(this + 1064) = 107;
  *(_DWORD *)this = &vtbl_Packet_Id107;
  sub_1000C580(this + 1092);
  *((_WORD *)this + 536) = 0;
  *((_DWORD *)this + 270) = 0;
  *((_DWORD *)this + 269) = 0;
  *((_DWORD *)this + 271) = 0;
  *((_DWORD *)this + 272) = 0;
  *(this + 1216) = 0;
  *(this + 1344) = 0;
  return this;
}
```

### Disasm
```asm
1000C7E0  push    ebx
1000C7E1  push    esi
1000C7E2  mov     esi, ecx
1000C7E4  xor     ebx, ebx
1000C7E6  lea     ecx, [esi+0Ch]; this
1000C7E9  mov     dword ptr [esi], offset vtbl_Packet_Unknown0
1000C7EF  mov     [esi+8], bl
1000C7F2  call    ??1UMSThreadProxy@details@Concurrency@@UAE@XZ; Concurrency::details::UMSThreadProxy::~UMSThreadProxy(void)
1000C7F7  lea     ecx, [esi+444h]
1000C7FD  mov     [esi+420h], ebx
1000C803  mov     [esi+424h], ebx
1000C809  mov     byte ptr [esi+428h], 6Bh ; 'k'
1000C810  mov     dword ptr [esi], offset vtbl_Packet_Id107
1000C816  call    sub_1000C580
1000C81B  xor     eax, eax
1000C81D  mov     [esi+430h], ax
1000C824  mov     [esi+438h], ebx
1000C82A  mov     [esi+434h], ebx
1000C830  mov     [esi+43Ch], ebx
1000C836  mov     [esi+440h], ebx
1000C83C  mov     [esi+4C0h], bl
1000C842  mov     [esi+540h], bl
1000C848  mov     eax, esi
1000C84A  pop     esi
1000C84B  pop     ebx
1000C84C  retn
```

## sub_10089460 (0x10089460)
Role: UI message/text update helper (login errors/status).

### Decomp
```c
void __thiscall sub_10089460(float *this, int a2, char *Source, int a4, char a5, int a6)
{
  int v7; // esi
  int v8; // edx
  int v9; // eax
  int v10; // esi
  char *v11; // eax
  float v12; // [esp+4h] [ebp-4h]

  sub_100892D0(0);
  v12 = ((double (__thiscall *)(int))*(_DWORD *)(*(_DWORD *)g_pILTClient + 100))(g_pILTClient);
  if ( a5 || *(this + 2245) <= (double)v12 )
  {
    UiText_SetValueIfChanged((char *)byte_102A8B98, 0, 0);
    v7 = a2;
    if ( a2 )
    {
      switch ( a2 )
      {
        case 1711:
        case 1721:
        case 1800:
        case 1803:
          sub_10066530(dword_103BF754, 1);
          sub_101072E0(dword_103BF708);
          break;
        case 1718:
        case 1719:
          if ( a6 )
            v7 = a2 + 19;
          goto LABEL_8;
        default:
LABEL_8:
          sub_10066530(dword_103BF754, 1);
          break;
      }
      if ( v7 > 0 )
      {
        if ( a4 )
        {
          v8 = *(_DWORD *)g_pILTClient;
          if ( a6 )
            v9 = (*(int (__cdecl **)(int, int, int, int))(v8 + 64))(g_pILTClient, v7, a4, a6);
          else
            v9 = (*(int (__cdecl **)(int, int, int))(v8 + 64))(g_pILTClient, v7, a4);
        }
        else
        {
          v9 = (*(int (__cdecl **)(int, int))(*(_DWORD *)g_pILTClient + 64))(g_pILTClient, v7);
        }
        v10 = v9;
        if ( v9 )
          v11 = (char *)(*(int (__thiscall **)(int, int))(*(_DWORD *)g_pILTClient + 88))(g_pILTClient, v9);
        else
          v11 = (char *)byte_102A8B98;
        UiText_SetValueIfChanged(v11, 1, Source);
        if ( v10 )
          (*(void (__thiscall **)(int, int))(*(_DWORD *)g_pILTClient + 76))(g_pILTClient, v10);
        if ( a5 )
          *(this + 2245) = v12 + 5.0;
      }
    }
  }
}
```

### Disasm
```asm
10089460  push    ebp
10089461  mov     ebp, esp
10089463  push    ecx
10089464  push    ebx
10089465  push    0
10089467  mov     ebx, ecx
10089469  call    sub_100892D0
1008946E  mov     ecx, g_pILTClient
10089474  mov     eax, [ecx]
10089476  mov     edx, [eax+64h]
10089479  call    edx
1008947B  fstp    [ebp+var_4]
1008947E  cmp     [ebp+arg_C], 0
10089482  jnz     short loc_1008949A
10089484  fld     [ebp+var_4]
10089487  fld     dword ptr [ebx+2314h]
1008948D  fcompp
1008948F  fnstsw  ax
10089491  test    ah, 41h
10089494  jz      loc_1008959C
1008949A  mov     ecx, [ebx+22F4h]
100894A0  push    esi
100894A1  push    0; Source
100894A3  push    0; int
100894A5  push    offset byte_102A8B98; char *
100894AA  call    UiText_SetValueIfChanged
100894AF  mov     esi, [ebp+arg_0]
100894B2  test    esi, esi
100894B4  jz      loc_1008959B
100894BA  lea     eax, [esi-6AFh]; switch 93 cases
100894C0  push    edi
100894C1  mov     edi, [ebp+arg_10]
100894C4  cmp     eax, 5Ch
100894C7  ja      short def_100894D0; jumptable 100894D0 default case, cases 1712-1717,1720,1722-1799,1801,1802
100894C9  movzx   eax, ds:byte_100895B0[eax]
100894D0  jmp     ds:jpt_100894D0[eax*4]; switch jump
100894D7  mov     ecx, dword_103BF754; jumptable 100894D0 cases 1711,1721,1800,1803
100894DD  push    1
100894DF  call    sub_10066530
100894E4  mov     ecx, dword_103BF708
100894EA  call    sub_101072E0
100894EF  jmp     short loc_10089505
100894F1  test    edi, edi; jumptable 100894D0 cases 1718,1719
100894F3  jz      short def_100894D0; jumptable 100894D0 default case, cases 1712-1717,1720,1722-1799,1801,1802
100894F5  add     esi, 13h
100894F8  mov     ecx, dword_103BF754; jumptable 100894D0 default case, cases 1712-1717,1720,1722-1799,1801,1802
100894FE  push    1
10089500  call    sub_10066530
10089505  test    esi, esi
10089507  jle     loc_1008959A
1008950D  mov     ecx, [ebp+arg_8]
10089510  mov     eax, g_pILTClient
10089515  test    ecx, ecx
10089517  jz      short loc_1008953A
10089519  mov     edx, [eax]
1008951B  test    edi, edi
1008951D  jz      short loc_1008952D
1008951F  push    edi
10089520  push    ecx
10089521  push    esi
10089522  push    eax
10089523  mov     eax, [edx+40h]
10089526  call    eax
10089528  add     esp, 10h
1008952B  jmp     short loc_10089546
1008952D  push    ecx
1008952E  push    esi
1008952F  push    eax
10089530  mov     eax, [edx+40h]
10089533  call    eax
10089535  add     esp, 0Ch
10089538  jmp     short loc_10089546
1008953A  mov     ecx, [eax]
1008953C  mov     edx, [ecx+40h]
1008953F  push    esi
10089540  push    eax
10089541  call    edx
10089543  add     esp, 8
10089546  mov     esi, eax
10089548  test    esi, esi
1008954A  jz      short loc_1008955C
1008954C  mov     ecx, g_pILTClient
10089552  mov     eax, [ecx]
10089554  mov     edx, [eax+58h]
10089557  push    esi
10089558  call    edx
1008955A  jmp     short loc_10089561
1008955C  mov     eax, offset byte_102A8B98
10089561  mov     ecx, [ebp+Source]
10089564  push    ecx; Source
10089565  mov     ecx, [ebx+22F4h]
1008956B  push    1; int
1008956D  push    eax; char *
1008956E  call    UiText_SetValueIfChanged
10089573  test    esi, esi
10089575  jz      short loc_10089585
10089577  mov     ecx, g_pILTClient
1008957D  mov     edx, [ecx]
1008957F  mov     eax, [edx+4Ch]
10089582  push    esi
10089583  call    eax
10089585  cmp     [ebp+arg_C], 0
10089589  jz      short loc_1008959A
1008958B  fld     [ebp+var_4]
1008958E  fadd    ds:dbl_102C3950
10089594  fstp    dword ptr [ebx+2314h]
1008959A  pop     edi
1008959B  pop     esi
1008959C  pop     ebx
1008959D  mov     esp, ebp
1008959F  pop     ebp
100895A0  retn    14h
```

## sub_1008BB60 (0x1008BB60)
Role: State flag accessor.

### Decomp
```c
int __thiscall sub_1008BB60(_DWORD *this, unsigned int a2)
{
  if ( a2 < 4 )
    return *(this + a2 + 4);
  else
    return 0;
}
```

### Disasm
```asm
1008BB60  push    ebp
1008BB61  mov     ebp, esp
1008BB63  mov     eax, [ebp+arg_0]
1008BB66  cmp     eax, 4
1008BB69  jb      short loc_1008BB71
1008BB6B  xor     eax, eax
1008BB6D  pop     ebp
1008BB6E  retn    4
1008BB71  mov     eax, [ecx+eax*4+10h]
1008BB75  pop     ebp
1008BB76  retn    4
```

## sub_1005A430 (0x1005A430)
Role: UI/state transition helper.

### Decomp
```c
int __thiscall sub_1005A430(_DWORD *this, int a2)
{
  if ( SharedMem_ReadDword_this(g_pPlayerStats, 0x1CEC2u) == 2 && a2 == 4 && !SharedMem_ReadBool_std(0x72u)
    || !sub_1005A0B0(this, *(this + 2), a2) )
  {
    return 0;
  }
  if ( a2 == 2 || a2 == 3 )
  {
    nullsub_9(dword_103BF718);
    goto LABEL_13;
  }
  if ( a2 != 1 )
  {
    if ( a2 != 4 )
      goto LABEL_14;
LABEL_13:
    sub_10058D70(dword_103BF6F4);
    goto LABEL_14;
  }
  (*(void (**)(void))(g_pILTClient + 428))();
  sub_101079C0(dword_103BF708);
  sub_101072E0(dword_103BF708);
  sub_10108D40(dword_103BF708);
  sub_10108D90(dword_103BF708);
  sub_10108CF0(dword_103BF708);
  sub_10108BD0(dword_103BF708);
  *(_DWORD *)(dword_103BF708 + 36) = 0;
  *(_DWORD *)(dword_103BF6F4 + 80) = *(_DWORD *)(dword_103BF6F4 + 84);
  nullsub_10(dword_103BF718);
LABEL_14:
  *(this + 2) = a2;
  sub_10058CF0(this, 0);
  return 1;
}
```

### Disasm
```asm
1005A430  push    ebp
1005A431  mov     ebp, esp
1005A433  push    esi
1005A434  push    edi
1005A435  mov     edi, ecx
1005A437  mov     ecx, g_pPlayerStats
1005A43D  push    1CEC2h
1005A442  call    SharedMem_ReadDword_this
1005A447  mov     esi, [ebp+arg_0]
1005A44A  cmp     eax, 2
1005A44D  jnz     short loc_1005A46D
1005A44F  cmp     esi, 4
1005A452  jnz     short loc_1005A46D
1005A454  mov     ecx, dword_103BF73C
1005A45A  push    72h ; 'r'
1005A45C  call    SharedMem_ReadBool_std
1005A461  test    al, al
1005A463  jnz     short loc_1005A46D
1005A465  pop     edi
1005A466  xor     eax, eax
1005A468  pop     esi
1005A469  pop     ebp
1005A46A  retn    4
1005A46D  mov     eax, [edi+8]
1005A470  push    esi
1005A471  push    eax
1005A472  mov     ecx, edi
1005A474  call    sub_1005A0B0
1005A479  test    eax, eax
1005A47B  jz      short loc_1005A465
1005A47D  cmp     esi, 2
1005A480  jz      loc_1005A50F
1005A486  cmp     esi, 3
1005A489  jz      loc_1005A50F
1005A48F  cmp     esi, 1
1005A492  jnz     short loc_1005A508
1005A494  mov     eax, g_pILTClient
1005A499  mov     ecx, [eax+1ACh]
1005A49F  call    ecx
1005A4A1  mov     ecx, dword_103BF708
1005A4A7  call    sub_101079C0
1005A4AC  mov     ecx, dword_103BF708
1005A4B2  call    sub_101072E0
1005A4B7  mov     ecx, dword_103BF708
1005A4BD  call    sub_10108D40
1005A4C2  mov     ecx, dword_103BF708
1005A4C8  call    sub_10108D90
1005A4CD  mov     ecx, dword_103BF708
1005A4D3  call    sub_10108CF0
1005A4D8  mov     ecx, dword_103BF708
1005A4DE  call    sub_10108BD0
1005A4E3  mov     edx, dword_103BF708
1005A4E9  mov     dword ptr [edx+24h], 0
1005A4F0  mov     eax, dword_103BF6F4
1005A4F5  mov     ecx, [eax+54h]
1005A4F8  mov     [eax+50h], ecx
1005A4FB  mov     ecx, dword_103BF718
1005A501  call    nullsub_10
1005A506  jmp     short loc_1005A525
1005A508  cmp     esi, 4
1005A50B  jnz     short loc_1005A525
1005A50D  jmp     short loc_1005A51A
1005A50F  mov     ecx, dword_103BF718
1005A515  call    nullsub_9
1005A51A  mov     ecx, dword_103BF6F4
1005A520  call    sub_10058D70
1005A525  push    0
1005A527  mov     ecx, edi
1005A529  mov     [edi+8], esi
1005A52C  call    sub_10058CF0
1005A531  pop     edi
1005A532  mov     eax, 1
1005A537  pop     esi
1005A538  pop     ebp
1005A539  retn    4
```

## sub_1005A570 (0x1005A570)
Role: UI window update helper.

### Decomp
```c
int __thiscall sub_1005A570(_DWORD *this, int a2)
{
  int result; // eax
  int WindowById; // eax

  if ( *(this + 2) == 4 || (result = sub_1005A430(this, 4)) != 0 )
  {
    WindowById = CWindowMgr_GetWindowById(dword_103BF708, 74);
    if ( WindowById )
      sub_100F5660(WindowById, a2);
    sub_1010AB50(dword_103BF708, a2);
    return 1;
  }
  return result;
}
```

### Disasm
```asm
1005A570  push    ebp
1005A571  mov     ebp, esp
1005A573  cmp     dword ptr [ecx+8], 4
1005A577  jz      short loc_1005A588
1005A579  push    4
1005A57B  call    sub_1005A430
1005A580  test    eax, eax
1005A582  jnz     short loc_1005A588
1005A584  pop     ebp
1005A585  retn    4
1005A588  mov     ecx, dword_103BF708
1005A58E  push    esi
1005A58F  push    4Ah ; 'J'
1005A591  call    CWindowMgr_GetWindowById
1005A596  mov     esi, [ebp+arg_0]
1005A599  test    eax, eax
1005A59B  jz      short loc_1005A5A5
1005A59D  push    esi
1005A59E  mov     ecx, eax
1005A5A0  call    sub_100F5660
1005A5A5  mov     ecx, dword_103BF708
1005A5AB  push    esi
1005A5AC  call    sub_1010AB50
1005A5B1  mov     eax, 1
1005A5B6  pop     esi
1005A5B7  pop     ebp
1005A5B8  retn    4
```

## sub_101C0A60 (0x101C0A60)
Role: Packet/command helper used during submit flow.

### Decomp
```c
int __stdcall sub_101C0A60(int a1)
{
  int v1; // ecx
  void (__thiscall *v2)(int, int, int); // eax
  int (__thiscall *v3)(int, int, int); // eax
  int result; // eax
  int v5; // [esp-8h] [ebp-1Ch]
  int v6; // [esp+4h] [ebp-10h] BYREF
  int v7; // [esp+10h] [ebp-4h]

  v6 = 0;
  if ( (*(int (__thiscall **)(int, int *))(*(_DWORD *)dword_1035A6E8 + 36))(dword_1035A6E8, &v6) )
  {
    v1 = 0;
    v6 = 0;
  }
  else
  {
    (*(void (__thiscall **)(int))(*(_DWORD *)v6 + 4))(v6);
    v1 = v6;
  }
  v2 = *(void (__thiscall **)(int, int, int))(*(_DWORD *)v1 + 36);
  v7 = 0;
  v2(v1, 111, 8);
  (*(void (__thiscall **)(int, _DWORD, int))(*(_DWORD *)v6 + 36))(v6, 0, 32);
  (*(void (__thiscall **)(int, int, int))(*(_DWORD *)v6 + 36))(v6, a1, 32);
  v5 = *(_DWORD *)sub_10021AC0(&v6, &a1);
  v3 = *(int (__thiscall **)(int, int, int))(*(_DWORD *)g_pILTClient + 324);
  LOBYTE(v7) = 1;
  result = v3(g_pILTClient, v5, 1);
  LOBYTE(v7) = 0;
  if ( a1 )
    result = (*(int (__thiscall **)(int))(*(_DWORD *)a1 + 8))(a1);
  v7 = -1;
  if ( v6 )
    return (*(int (__thiscall **)(int))(*(_DWORD *)v6 + 8))(v6);
  return result;
}
```

### Disasm
```asm
101C0A60  push    ebp
101C0A61  mov     ebp, esp
101C0A63  push    0FFFFFFFFh
101C0A65  push    offset SEH_101C0A60
101C0A6A  mov     eax, large fs:0
101C0A70  push    eax
101C0A71  push    ecx
101C0A72  mov     eax, dword_1035A5B0
101C0A77  xor     eax, ebp
101C0A79  push    eax
101C0A7A  lea     eax, [ebp+var_C]
101C0A7D  mov     large fs:0, eax
101C0A83  mov     ecx, dword_1035A6E8
101C0A89  mov     [ebp+var_10], 0
101C0A90  mov     eax, [ecx]
101C0A92  mov     eax, [eax+24h]
101C0A95  lea     edx, [ebp+var_10]
101C0A98  push    edx
101C0A99  call    eax
101C0A9B  test    eax, eax
101C0A9D  jnz     short loc_101C0AAE
101C0A9F  mov     ecx, [ebp+var_10]
101C0AA2  mov     edx, [ecx]
101C0AA4  mov     eax, [edx+4]
101C0AA7  call    eax
101C0AA9  mov     ecx, [ebp+var_10]
101C0AAC  jmp     short loc_101C0AB3
101C0AAE  xor     ecx, ecx
101C0AB0  mov     [ebp+var_10], ecx
101C0AB3  mov     edx, [ecx]
101C0AB5  mov     eax, [edx+24h]
101C0AB8  push    8
101C0ABA  push    6Fh ; 'o'
101C0ABC  mov     [ebp+var_4], 0
101C0AC3  call    eax
101C0AC5  mov     ecx, [ebp+var_10]
101C0AC8  mov     edx, [ecx]
101C0ACA  mov     eax, [edx+24h]
101C0ACD  push    20h ; ' '
101C0ACF  push    0
101C0AD1  call    eax
101C0AD3  mov     ecx, [ebp+var_10]
101C0AD6  mov     edx, [ecx]
101C0AD8  mov     eax, [ebp+arg_0]
101C0ADB  mov     edx, [edx+24h]
101C0ADE  push    20h ; ' '
101C0AE0  push    eax
101C0AE1  call    edx
101C0AE3  lea     eax, [ebp+arg_0]
101C0AE6  push    eax
101C0AE7  lea     ecx, [ebp+var_10]
101C0AEA  call    sub_10021AC0
101C0AEF  mov     eax, [eax]
101C0AF1  mov     ecx, g_pILTClient
101C0AF7  mov     edx, [ecx]
101C0AF9  push    1
101C0AFB  push    eax
101C0AFC  mov     eax, [edx+144h]
101C0B02  mov     byte ptr [ebp+var_4], 1
101C0B06  call    eax
101C0B08  mov     ecx, [ebp+arg_0]
101C0B0B  mov     byte ptr [ebp+var_4], 0
101C0B0F  test    ecx, ecx
101C0B11  jz      short loc_101C0B1A
101C0B13  mov     edx, [ecx]
101C0B15  mov     eax, [edx+8]
101C0B18  call    eax
101C0B1A  mov     ecx, [ebp+var_10]
101C0B1D  mov     [ebp+var_4], 0FFFFFFFFh
101C0B24  test    ecx, ecx
101C0B26  jz      short loc_101C0B2F
101C0B28  mov     edx, [ecx]
101C0B2A  mov     eax, [edx+8]
101C0B2D  call    eax
101C0B2F  mov     ecx, [ebp+var_C]
101C0B32  mov     large fs:0, ecx
101C0B39  pop     ecx
101C0B3A  mov     esp, ebp
101C0B3C  pop     ebp
101C0B3D  retn    4
10298500  lea     ecx, [ebp+var_10]
10298503  jmp     sub_10021AA0
10298508  lea     ecx, [ebp+arg_0]
1029850B  jmp     sub_10021130
10298510  mov     edx, [esp-4+arg_4]
10298514  lea     eax, [edx+0Ch]
10298517  mov     ecx, [edx-8]
1029851A  xor     ecx, eax
1029851C  call    sub_1028584E
10298521  mov     eax, offset unk_1033EA68
10298526  jmp     __CxxFrameHandler3
```

## sub_101BFC00 (0x101BFC00)
Role: Environment/anti-debug check used by login tick.

### Decomp
```c
char sub_101BFC00()
{
  char Str[260]; // [esp+1Ch] [ebp-120h] BYREF
  int v2; // [esp+138h] [ebp-4h]

  __indword(0x5658u);
  v2 = -2;
  strstr(Str, "C:\\InsideTm\\");
  __asm { vpcext  7, 0Bh }
  return 1;
}
```

### Disasm
```asm
101BFC00  push    ebp
101BFC01  mov     ebp, esp
101BFC03  push    0FFFFFFFEh
101BFC05  push    offset stru_1033E980
101BFC0A  push    offset __except_handler4
101BFC0F  mov     eax, large fs:0
101BFC15  push    eax
101BFC16  sub     esp, 11Ch
101BFC1C  mov     eax, dword_1035A5B0
101BFC21  xor     [ebp+var_8], eax
101BFC24  xor     eax, ebp
101BFC26  mov     [ebp+var_1C], eax
101BFC29  push    ebx
101BFC2A  push    esi
101BFC2B  push    edi
101BFC2C  push    eax
101BFC2D  lea     eax, [ebp+var_10]
101BFC30  mov     large fs:0, eax
101BFC36  mov     [ebp+var_18], esp
101BFC39  mov     [ebp+var_121], 1
101BFC40  mov     [ebp+var_4], 0
101BFC47  push    edx
101BFC48  push    ecx
101BFC49  push    ebx
101BFC4A  mov     eax, 564D5868h
101BFC4F  mov     ebx, 0
101BFC54  mov     ecx, 0Ah
101BFC59  mov     edx, 5658h
101BFC5E  in      eax, dx
101BFC5F  cmp     ebx, 564D5868h
101BFC65  setz    [ebp+var_121]
101BFC6C  pop     ebx
101BFC6D  pop     ecx
101BFC6E  pop     edx
101BFC6F  mov     esi, 0FFFFFFFEh
101BFC74  mov     [ebp+var_4], esi
101BFC77  xor     bl, bl
101BFC79  jmp     short loc_101BFC94
101BFC7B  mov     eax, 1
101BFC80  retn
101BFC81  mov     esp, [ebp+var_18]
101BFC84  xor     bl, bl
101BFC86  mov     [ebp+var_121], bl
101BFC8C  mov     esi, 0FFFFFFFEh
101BFC91  mov     [ebp+var_4], esi
101BFC94  mov     [ebp+var_123], bl
101BFC9A  push    offset aCInsidetm; "C:\\InsideTm\\"
101BFC9F  lea     eax, [ebp+Str]
101BFCA5  push    eax; Str
101BFCA6  call    ds:__imp_strstr
101BFCAC  add     esp, 8
101BFCAF  test    eax, eax
101BFCB1  jz      short loc_101BFCBA
101BFCB3  mov     [ebp+var_123], 1
101BFCBA  mov     [ebp+var_122], bl
101BFCC0  mov     [ebp+var_4], 1
101BFCC7  push    ebx
101BFCC8  mov     ebx, 0
101BFCCD  mov     eax, 1
101BFCD2  vpcext  7, 0Bh
101BFCD6  test    ebx, ebx
101BFCD8  setz    [ebp+var_122]
101BFCDF  pop     ebx
101BFCE0  mov     [ebp+var_4], esi
101BFCE3  jmp     short loc_101BFD36
101BFCE5  mov     ecx, [ebp+var_14]
101BFCE8  mov     [ebp+var_12C], ecx
101BFCEE  mov     edx, [ebp+var_12C]
101BFCF4  mov     eax, [edx+4]
101BFCF7  mov     [ebp+var_128], eax
101BFCFD  mov     ecx, [ebp+var_128]
101BFD03  mov     dword ptr [ecx+0A4h], 0FFFFFFFFh
101BFD0D  mov     edx, [ebp+var_128]
101BFD13  mov     eax, [edx+0B8h]
101BFD19  add     eax, 4
101BFD1C  mov     ecx, [ebp+var_128]
101BFD22  mov     [ecx+0B8h], eax
101BFD28  or      eax, 0FFFFFFFFh
101BFD2B  retn
101BFD2C  mov     esp, [ebp+var_18]
101BFD2F  mov     [ebp+var_4], 0FFFFFFFEh
101BFD36  cmp     [ebp+var_121], 0
101BFD3D  jnz     short loc_101BFD55
101BFD3F  cmp     [ebp+var_122], 0
101BFD46  jnz     short loc_101BFD55
101BFD48  cmp     [ebp+var_123], 0
101BFD4F  jnz     short loc_101BFD55
101BFD51  xor     al, al
101BFD53  jmp     short loc_101BFD57
101BFD55  mov     al, 1
101BFD57  mov     ecx, [ebp+var_10]
101BFD5A  mov     large fs:0, ecx
101BFD61  pop     ecx
101BFD62  pop     edi
101BFD63  pop     esi
101BFD64  pop     ebx
101BFD65  mov     ecx, [ebp+var_1C]
101BFD68  xor     ecx, ebp
101BFD6A  call    sub_1028584E
101BFD6F  mov     esp, ebp
101BFD71  pop     ebp
101BFD72  retn
```

