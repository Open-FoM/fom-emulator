# MSG_ID 0x79 - WORLD_LOGIN_DATA

## Summary
- Direction: world -> client
- Transport: LithTech game message (msgId byte = `0x79`) delivered to `CGameServerShell::OnMessage`.
- Handler (Object.lto, ida3): `Handle_ID_WORLD_LOGIN` @ `0x1007AD90`
- Reader (Object.lto, ida3): `ID_WORLD_LOGIN_Read` @ `0x10078D80`
- Note: **not** the same as `ID_WORLD_LOGIN (0x72)` which is client -> world (CShell).

## Dispatch chain (no translation found)
```
CGameServerShell_OnMessage (0x10035BF0)
  -> DispatchGameMsg (0x10056F20)
     -> case 0x79 => Handle_ID_WORLD_LOGIN
```
The message ID is used directly as `msgId`. This implies the on-wire game message uses `0x79` as its message ID (no CShell packet-ID remap observed).

## Payload layout (read order)
Offsets are relative to the packet struct base (`this` in `ID_WORLD_LOGIN_Read`).
Types are inferred from reader helpers (u8c/u16c/u32c = compressed read).
Naming focuses on **player data first** (stats/inventory/abilities), then UI/cache blocks.

```
0x0430  worldId            u8c   (sub_1008BD20, 8 bits)
0x0434  worldInst          u32c  (sub_10016370)
0x0438  returnCode         u8c   (sub_1008BD20, 8 bits)

0x043C  PlayerProfileA     WorldLogin_ReadProfileBlockA
        - Core player profile blob (stats/progression/equipment/abilities).
        - Internal layout (from WorldLogin_CopyProfileBlockA):
          - +0x00  u16
          - +0x04  vec<44B> (sub_1002E560)
          - +0x14  u32
          - +0x18  u32
          - +0x1C  u32
          - +0x20  u8
          - +0x24  AbilityTable[12] (12 * 48 bytes = 0x240)
                   * entry[0] dword used as present flag
                   * entry[+4] u16 abilityId (used by WorldLogin_GrantAbilityIfAllowed)
          - +0x27C  sub‑block (0x94)
          - +0x2F8  sub‑block (0x122)
          - +0x41C  vec<44B> (sub_1002E560)
          - +0x42C  u32
          - +0x430  u32
          - +0x434  u32
          - +0x438  u8
0x0878  PlayerProfileB     WorldLogin_ReadProfileBlockB
        - 4 records, each 16 bytes; only first u16c per record is read.
0x08B8  PlayerProfileC     WorldLogin_ReadProfileBlockC
        - Bitfield/packed stats blob (0x32 bytes).
0x08EC  PlayerProfileD     WorldLogin_ReadProfileBlockD
        - u32c[53] (53 x 32‑bit compressed values).

0x0CCC  PlayerStringsE     WorldLogin_ReadStringBundleE
        +0x00  u32c (id?)
        +0x04  flag bit
        +0x05  strA (2048 bits / 256 bytes)
        +0x19  strB (2048 bits / 256 bytes)
        +0x39  strC (2048 bits / 256 bytes)
        +0x239 strD (2048 bits / 256 bytes)

0x0F28  profileFlag0       u8c
0x0F29  profileFlag1       u8c
0x0F2A  profileEntryCount  u16c
0x0F2C  profileEntries[]   WorldLogin_ReadProfileBlockC (0x32 bytes each)

0x49C4  flag2              bit
0x49C8  PlayerVecF         WorldLogin_ReadCompactVec3F
        - Reads compressed vec3 (bit‑length stored in struct) + 9‑bit value.
0x49D8  currencyA_u32c     u32c
0x49DC  currencyB_u32c     u32c
0x49E0  flag3              bit
0x49E2  valC_u16c          u16c
0x49E4  valD_u32c          u32c
0x49E8  PlayerEntryG[10]   WorldLogin_ReadEntryG (12 bytes each)
        - per‑entry: present bit, u16c, u8, u8, 7b, 7b, 9b, u8, u8, u8

0x4A60  PlayerBlobH        vtbl+56 read (string/blob; size unknown)
0x0C9C  PlayerTableI       WorldLogin_ReadTableI
        - header: 4x u8 + u32c
        - count: u32c
        - entry: u32c id, u8 type?, u32c value, u8, u8, u8 (inserted into 20‑byte records)
0x4A80  PlayerVecJ         WorldLogin_ReadCompactVec3F (same as F)
0x4A90  flag4              bit
0x4A94  PlayerListK        WorldLogin_ReadListK
        - header: u32c + sub_100D0E60 (unknown)
        - count: u32c
        - entry: u16c id, u8 value, 1‑bit flag
```

## Handler usage (key fields)
- `worldId/worldInst/returnCode` gate the success path.
- On success, the handler sets spawn/rot into `g_pLocalPlayerObj`:
  - `spawnX_u16/spawnY_u16/spawnZ_u16`
  - `hasOverrideSpawn` + `overrideYawDeg_u16` choose override spawn/rotation.
- `PlayerListK` looks like flag/id list (likely quests, achievements, or unlocks).
- `PlayerTableI` looks like id/value table (likely inventory/currency or items).
- `worldLoginAbilityBuf` is used to grant abilities:
  - entries 5..16 via `WorldLogin_GetAbilityEntry`, then `WorldLogin_GrantAbilityIfAllowed`.

## Open items
- Identify semantic names for blockA/blockB/blockC/blockD/blockE/blockF/blockG/blockH/blockI/blockJ/blockK.
- Confirm if `blockH` is a variable-length string (vtbl+56 reader).
- Trace server send path to confirm exact on-wire envelope (game message vs group).
