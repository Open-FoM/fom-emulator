# ID_LOGIN_RETURN (0x6F)

## Summary
- Direction: master -> client
- Purpose: login result + account/world payload

## On-wire encoding (source of truth)

Server response to `ID_LOGIN`. Contains the authentication result, player information, account type, ban status, and when `playerID != 0`, extended character/world data.

## Read/Write (decomp)
- Read: `CShell.dll` @ `0x658935F0`
- Write: `CShell.dll` @ `0x65896400` (rarely used by client)

## IDA Anchors
- ida: n/a
- ida2: `Packet_ID_LOGIN_RETURN_Read` `0x658935F0`, `Packet_ID_LOGIN_RETURN_Write` `0x65896400`, `Packet_ID_LOGIN_RETURN_Ctor` `0x65896320`

## Validation
- ida: n/a
- ida2: verified 01/05/26 (decompile)

### Wire Format

```
Packet_ID_LOGIN_RETURN
├── status: uint8                                // LoginReturnStatus (compressed)
├── playerID: uint32                             // compressed
│
└── [if playerID != 0]
    ├── accountType: uint8                       // AccountType (compressed)
    ├── field4_0x439: bool                       // bit
    ├── field5_0x43a: bool                       // bit
    ├── clientVersion: uint16                    // compressed
    ├── isBanned: bool                           // bit
    │
    ├── [if isBanned]
    │   ├── banLength: string                    // encoded
    │   └── banReason: string                    // encoded
    │
    ├── worldIDs: vector<uint32>                 // FUN_1013db60
    │   ├── count: uint8                         // compressed
    │   └── ids[count]: uint32[]                 // compressed
    │
    ├── factionMOTD: string                      // encoded
    │
    ├── apartment: Apartment                     // FUN_10055080 (Apartment::Read)
    │   ├── id: uint32                           // compressed
    │   ├── type: uint8                          // compressed (ApartmentType)
    │   ├── ownerPlayerID: uint32                // compressed
    │   ├── ownerFactionID: uint32               // compressed
    │   │
    │   ├── allowedRanks: vector<RankPermission> // FUN_10054fa0
    │   │   ├── count: uint8                     // compressed
    │   │   └── entries[count]:
    │   │       ├── rankID: uint8                // compressed
    │   │       └── allowed: bool                // bit
    │   │
    │   ├── isOpen: bool                         // bit (UI: "Open")
    │   ├── ownerName: string                    // encoded (UI: "Owner Name")
    │   ├── entryCode: string                    // encoded (UI: "Entry Code")
    │   │
    │   ├── storage: ItemList                    // FUN_102404e0 (ItemList::Read)
    │   │   ├── capacity: uint16                 // compressed
    │   │   ├── field_14: uint32                 // compressed
    │   │   ├── field_18: uint32                 // compressed
    │   │   ├── field_1C: uint32                 // compressed
    │   │   ├── itemCount: uint16                // compressed
    │   │   └── items[itemCount]: ItemStack[]    // FUN_1023e3b0
    │   │
    │   ├── hasPublicInfo: bool                  // bit (controls public listing)
    │   ├── entryPrice: uint32                   // compressed (UI: "Cost")
    │   ├── publicName: string                   // encoded (UI: "Apartment Name")
    │   ├── publicDescription: string            // encoded (biography/description)
    │   │
    │   ├── allowedFactions: map<uint32, string> // FUN_10054ce0 (UI: "Allowed Factions")
    │   │   ├── count: uint32                    // compressed
    │   │   └── entries[count]:
    │   │       ├── factionID: uint32            // compressed
    │   │       └── factionName: string          // encoded
    │   │
    │   ├── isDefault: bool                      // bit (UI: "Default Apartment")
    │   ├── isFeatured: bool                     // bit (UI: "Featured")
    │   └── occupancy: uint32                    // compressed (number of players in apartment)
    │
    ├── field_final1: uint8                      // compressed
    └── field_final2: uint8                      // compressed
```

## Structures

### `Packet_ID_LOGIN_RETURN`

| Field         | Type                  | Offset | Size  |
|---------------|-----------------------|--------|-------|
| base          | `VariableSizedPacket` | 0x0    | 0x430 |
| status        | `LoginReturnStatus`   | 0x430  | 0x1   |
| playerID      | `uint32_t`            | 0x434  | 0x4   |
| accountType   | `AccountType`         | 0x438  | 0x1   |
| field4_0x439  | `bool`                | 0x439  | 0x1   |
| field5_0x43a  | `bool`                | 0x43A  | 0x1   |
| clientVersion | `uint16_t`            | 0x43C  | 0x2   |
| isBanned      | `bool`                | 0x43E  | 0x1   |
| banLength     | `char[16]`            | 0x43F  | 0x10  |
| banReason     | `char[129]`           | 0x44F  | 0x81  |

**Length:** 0x4D0

**Note:** Extended data (`worldIDs`, `factionMOTD`, `characterData`, etc.) is stored beyond offset 0x4D0 via `this[1]` and `this[2]` references. The full structure size is approximately 0xE70 bytes.

### `LoginReturnStatus`

A `uint8_t` enum indicating the result of the login attempt.

| Name                                | Value |
|-------------------------------------|-------|
| LOGIN_RETURN_INVALID_LOGIN          | 0     |
| LOGIN_RETURN_SUCCESS                | 1     |
| LOGIN_RETURN_UNKNOWN_USERNAME       | 2     |
| LOGIN_RETURN_3                      | 3     |
| LOGIN_RETURN_INCORRECT_PASSWORD     | 4     |
| LOGIN_RETURN_CREATE_CHARACTER       | 5     |
| LOGIN_RETURN_CREATE_CHARACTER_ERROR | 6     |
| LOGIN_RETURN_TEMP_BANNED            | 7     |
| LOGIN_RETURN_PERM_BANNED            | 8     |
| LOGIN_RETURN_DUPLICATE_IP           | 9     |
| LOGIN_RETURN_INTEGRITY_CHECK_FAILED | 10    |
| LOGIN_RETURN_RUN_AS_ADMIN           | 11    |
| LOGIN_RETURN_ACCOUNT_LOCKED         | 12    |
| LOGIN_RETURN_NOT_PURCHASED          | 13    |

### `ItemType`

A `uint8_t` enum indicating the item's binding/security status.

| Name              | Value |
|-------------------|-------|
| ITEM_TYPE_NORMAL  | 0     |
| ITEM_TYPE_SECURED | 1     |
| ITEM_TYPE_BOUND   | 2     |
| ITEM_TYPE_SPECIAL | 3     |

### `ItemQuality`

A `uint8_t` enum indicating the item's quality level (affects display color).

| Name                    | Value | Color  |
|-------------------------|-------|--------|
| ITEM_QUALITY_STANDARD   | 0     | White  |
| ITEM_QUALITY_CUSTOM     | 1     | Blue   |
| ITEM_QUALITY_SPECIAL    | 2     | Orange |
| ITEM_QUALITY_RARE       | 3     | Yellow |
| ITEM_QUALITY_SPECIAL_RARE | 4   | Red    |

### `Apartment`

The player's apartment data structure. Read by `FUN_10055080`.

| Field             | Type                      | Offset | Size   | Notes |
|-------------------|---------------------------|--------|--------|-------|
| id                | `uint32_t`                | 0x00   | 0x04   | Apartment ID |
| type              | `uint8_t`                 | 0x04   | 0x01   | ApartmentType enum (string 10500+type) |
| ownerPlayerID     | `uint32_t`                | 0x08   | 0x04   | |
| ownerFactionID    | `uint32_t`                | 0x0C   | 0x04   | |
| allowedRanks      | `vector<RankPermission>`  | 0x10   | 0x10   | Faction ranks with access |
| ownerName         | `char[56]`                | 0x20   | 0x38   | Used in listing search filter |
| storage           | `ItemList`                | 0x34   | ~0x24  | Apartment storage items |
| entryCode         | `char[10]`                | 0x58   | 0x08   | Access code |
| isOpen            | `bool`                    | 0x60   | 0x01   | Is publicly open |
| hasPublicInfo     | `bool`                    | 0x61   | 0x01   | Has public listing |
| publicName        | `char[24]`                | 0x62   | 0x18   | Falls back to "Unnamed" (4423) if empty |
| publicDescription | `char[512]`               | 0x7A   | 0x200  | Biography/description |
| allowedFactions   | `map<uint32, string>`     | 0x27C  | 0x10   | Factions with access |
| isDefault         | `bool`                    | 0x28C  | 0x01   | Default spawn apartment |
| isFeatured        | `bool`                    | 0x28D  | 0x01   | Featured - adds 10000 to sort order |
| occupancy         | `uint32_t`                | 0x290  | 0x04   | Number of players in apartment |
| entryPrice        | `uint32_t`                | 0x294  | 0x04   | Entry fee in UC |

**Length:** 0x298 bytes (confirmed by `CWindowTerminalApartments` iteration stride)

**UI String References:**
- 970: "Apartment Information"
- 971: "Entry Code"
- 972: "Default Apartment"
- 973: "Allowed Faction Ranks"
- 975: "Open"
- 976: "Featured"
- 977: "Cost"
- 978: "Apartment Name"
- 928: "Allowed Factions"
- 941: "Allow Factionless"
- 4415: "No. %1!u! (%2!s! - %3!s!)" - owned apartment format
- 4423: "Unnamed" - fallback when publicName empty
- 4434: "Faction HQ - No. %1!u! (%2!s! - %3!s!)" - faction HQ format

### `ApartmentType`

A `uint8_t` enum for apartment types. String ID = 10500 + type.

| Name                    | Value | String ID |
|-------------------------|-------|-----------|
| APARTMENT_TYPE_ALL      | 0     | 10500     |
| APARTMENT_TYPE_CITY_FLAT | 1    | 10501     |
| APARTMENT_TYPE_RATHOLE  | 2     | 10502     |
| APARTMENT_TYPE_COLONIAL_FLAT | 3 | 10503    |
| APARTMENT_TYPE_FRENCH_FLAT | 4  | 10504     |
| APARTMENT_TYPE_JAPANESE_FLAT | 5 | 10505    |
| APARTMENT_TYPE_UNDERWATER_FLAT | 6 | 10506  |
| APARTMENT_TYPE_CITY_APARTMENT | 7 | 10507   |
| APARTMENT_TYPE_CELLAR   | 8     | 10508     |
| APARTMENT_TYPE_COLONIAL_APARTMENT | 9 | 10509 |
| APARTMENT_TYPE_FRENCH_APARTMENT | 10 | 10510 |
| APARTMENT_TYPE_JAPANESE_APARTMENT | 11 | 10511 |
| APARTMENT_TYPE_UNDERWATER_APARTMENT | 12 | 10512 |
| APARTMENT_TYPE_CITY_SUITE | 13  | 10513     |
| APARTMENT_TYPE_RAMSHACKLE_HUT | 14 | 10514  |
| APARTMENT_TYPE_COLONIAL_SUITE | 15 | 10515  |
| APARTMENT_TYPE_FRENCH_PENTHOUSE | 16 | 10516 |
| APARTMENT_TYPE_JAPANESE_PENTHOUSE | 17 | 10517 |
| APARTMENT_TYPE_UNDERWATER_SUITE | 18 | 10518 |
| APARTMENT_TYPE_UNDERGROUND_HQ | 19 | 10519  |
| APARTMENT_TYPE_TACTICAL_HQ | 20 | 10520     |
| APARTMENT_TYPE_CITY_TOWER_OFFICES | 21 | 10521 |
| APARTMENT_TYPE_ARCTURUS_FREIGHTER | 22 | 10522 |
| APARTMENT_TYPE_PRISON_DUEL_ARENA | 23 | 10523 |
| APARTMENT_TYPE_BACKER_SAFEHOUSE | 24 | 10524 |

### `RankPermission`

Entry in the `allowedRanks` vector.

| Field   | Type      | Size |
|---------|-----------|------|
| rankID  | `uint8_t` | 0x01 |
| allowed | `bool`    | bit  |

## Function Reference

| Function | Purpose |
|----------|---------|
| `FUN_1013db60` | Read `vector<uint32>` (worldIDs) |
| `FUN_10055080` | Read `Apartment` structure |
| `FUN_10054fa0` | Read `vector<RankPermission>` (allowedRanks) |
| `FUN_102404e0` | Read `ItemList` (storage) |
| `FUN_1023e3b0` | Read `ItemStack` |
| `FUN_10254f80` | Read `ItemBase` |
| `FUN_10054ce0` | Read `map<uint32, string>` (allowedFactions) |

## Notes

- If `playerID` is 0, only `status` is read; all other fields are skipped
- If `isBanned` is true, `banLength` and `banReason` are read
- The `ItemBase` fields at offsets 0x18, 0x19, 0x1A are read in reverse order: 0x1A, 0x19, 0x18
- The `idCount` in `ItemStack` appears to always be 1, with a single `id` following
- The `Apartment` struct memory layout differs from wire order; wire format reads fields in a specific sequence optimized for RakNet compression
- `allowedFactions` uses faction IDs as keys mapped to faction display names
- `allowedRanks` controls which faction ranks can enter (if faction matches `ownerFactionID`)
- The `Allow Factionless` checkbox (string 941) is stored as a special entry in `allowedFactions`

## UI Message Mapping (CShell)

These are the UI strings shown for 0x6F status values (string IDs from CRes.dll).

| Status | Name | UI String ID | UI Text |
|---|---|---|---|
| 0 | LOGIN_RETURN_INVALID_LOGIN | 1711 | You have entered invalid login information. Please check your username and try again! |
| 1 | LOGIN_RETURN_SUCCESS | — | (no error message) |
| 2 | LOGIN_RETURN_UNKNOWN_USERNAME | 1708 | This username is unknown. Please try again! |
| 3 | LOGIN_RETURN_3 | — | (no error message) |
| 4 | LOGIN_RETURN_INCORRECT_PASSWORD | 1709 | Incorrect password. Please try again! |
| 5 | LOGIN_RETURN_CREATE_CHARACTER | — | (enters character creation flow) |
| 6 | LOGIN_RETURN_CREATE_CHARACTER_ERROR | 1706 | We're sorry, but an error occurred while trying to create your avatar. Please try again later! |
| 7 | LOGIN_RETURN_TEMP_BANNED | 1718 | Your account has been temporarily banned, %1!s! hours remaining. |
| 8 | LOGIN_RETURN_PERM_BANNED | 1719 | Your account has been permanently banned. |
| 9 | LOGIN_RETURN_DUPLICATE_IP | 1732 | Your account has been locked as our systems have detected multiple accounts originating from your IP address. Please contact Face of Mankind Support if you believe this is a mistake. |
| 10 | LOGIN_RETURN_INTEGRITY_CHECK_FAILED | 1707 | Integrity check failed! You are using a wrong client version. |
| 11 | LOGIN_RETURN_RUN_AS_ADMIN | 1700 | Please make sure to run the game client with admin privileges! |
| 12 | LOGIN_RETURN_ACCOUNT_LOCKED | 1699 | Your account is locked. |
| 13 | LOGIN_RETURN_NOT_PURCHASED | 1741 | Please visit https://www.faceofmankind.com/account/detail and purchase the game to log in! |

**ClientVersion check (success path):** On status 1/5, the handler compares the `clientVersion` field against `0x073D`. If the field is greater, it shows the outdated-client message (ID 1720). Keep this in mind when populating `clientVersion` in the 0x6F payload.
**Handler anchor:** `HandlePacket_ID_LOGIN_RETURN` @ `0x65896949` (compare at ~`0x658969F3` in ida2).

## Constructor

```c
Packet_ID_LOGIN_RETURN *__thiscall FOM::Packets::Packet_ID_LOGIN_RETURN::Packet_ID_LOGIN_RETURN(Packet_ID_LOGIN_RETURN *this)
{
  void *local_10;
  undefined1 *puStack_c;
  undefined4 local_8;

  local_8 = 0xffffffff;
  puStack_c = &LAB_10296fa6;
  local_10 = ExceptionList;
  ExceptionList = &local_10;
  (this->base).vftable = &VariableSizedPacket::vftable;
  *(undefined1 *)&(this->base).bitStream.numberOfBitsUsed = 0;
  RakNet::BitStream::BitStream((BitStream *)&(this->base).bitStream.numberOfBitsAllocated);
  *(undefined4 *)&(this->base).timestamp = 0;
  *(undefined4 *)((int)&(this->base).timestamp + 4) = 0;
  (this->base).messageType = ID_LOGIN_RETURN;
  (this->base).vftable = (VariableSizedPacket_vftbl *)vftable;
  *(undefined4 *)&this[1].base.timestampType = 0;
  this[1].base.bitStream.numberOfBitsUsed = 0;
  this[1].base.bitStream.numberOfBitsAllocated = 0;
  local_8 = 1;
  FUN_10055820((undefined4 *)(this[1].base.bitStream.stackData + 0x3fb));
  this->clientVersion = 0;
  this->status = LOGIN_RETURN_INVALID_LOGIN;
  this->playerID = 0;
  this->accountType = ACCOUNT_TYPE_FREE;
  this->field4_0x439 = false;
  this->field5_0x43a = false;
  this->isBanned = false;
  this->banLength[0] = '\0';
  *(undefined1 *)&this[1].base.bitStream.readOffset = 0;
  this->banReason[0] = '\0';
  this[1].base.bitStream.stackData[0x3f7] = '\0';
  this[2].base.bitStream.stackData[0x1c3] = '\0';
  ExceptionList = local_10;
  return this;
}
```

## Read

```c
bool __thiscall FOM::Packets::Packet_ID_LOGIN_RETURN::Read(Packet_ID_LOGIN_RETURN *this, Packet *packet)
{
  uint32_t *this_00;
  bool bVar1;

  bVar1 = VariableSizedPacket::Read(&this->base, packet);
  if (!bVar1) {
    return false;
  }
  this_00 = &(this->base).bitStream.numberOfBitsAllocated;
  RakNet::BitStream::ReadCompressed((BitStream *)this_00, &this->status, 8, true);
  RakNet::BitStream::ReadCompressed_T_uint((BitStream *)this_00, &this->playerID);
  if (this->playerID != 0) {
    RakNet::BitStream::ReadCompressed((BitStream *)this_00, &this->accountType, 8, true);
    VariableSizedPacket::ReadBit(&this->base, &this->field4_0x439);
    VariableSizedPacket::ReadBit(&this->base, &this->field5_0x43a);
    RakNet::BitStream::ReadCompressed_T_ushort((BitStream *)this_00, &this->clientVersion);
    VariableSizedPacket::ReadBit(&this->base, &this->isBanned);
    if (this->isBanned != false) {
      bVar1 = (*(*Globals::g_pLTNetwork)->DecodeString)((char *)this->banLength, 0x800, (BitStream *)this_00);
      if (!bVar1) {
        return false;
      }
      bVar1 = VariableSizedPacket::DecodeString(&this->base, (char *)this->banReason);
      if (!bVar1) {
        return false;
      }
    }
    FUN_1013db60(this + 1, this_00);
    bVar1 = (*(*Globals::g_pLTNetwork)->DecodeString)((char *)&this[1].base.bitStream.readOffset, 0x800, (BitStream *)this_00);
    if (!bVar1) {
      return false;
    }
    FUN_10055080(this[1].base.bitStream.stackData + 0x3fb, this_00);
    RakNet::BitStream::ReadCompressed((BitStream *)this_00, this[1].base.bitStream.stackData + 0x3f7, 8, true);
    RakNet::BitStream::ReadCompressed((BitStream *)this_00, this[2].base.bitStream.stackData + 0x1c3, 8, true);
  }
  return true;
}
```

## Write

```c
void __thiscall FOM::Packets::Packet_ID_LOGIN_RETURN::Write(Packet_ID_LOGIN_RETURN *this)
{
  uint32_t *this_00;
  char extraout_AL;
  Packet_ID_LOGIN_RETURN *local_8;

  local_8 = this;
  VariableSizedPacket::Write(&this->base);
  if (extraout_AL == '\0') {
    return;
  }
  this_00 = &(this->base).bitStream.numberOfBitsAllocated;
  local_8._0_1_ = this->status;
  RakNet::BitStream::WriteCompressed((BitStream *)this_00, (uchar *)&local_8, 8, true);
  VariableSizedPacket::WriteCompressed_uint(&this->base, this->playerID);
  if (this->playerID != 0) {
    local_8 = (Packet_ID_LOGIN_RETURN *)CONCAT31(local_8._1_3_, this->accountType);
    RakNet::BitStream::WriteCompressed((BitStream *)this_00, (uchar *)&local_8, 8, true);
    if (this->field4_0x439 == false) {
      RakNet::BitStream::Write0((BitStream *)this_00);
    }
    else {
      RakNet::BitStream::Write1((BitStream *)this_00);
    }
    if (this->field5_0x43a == false) {
      RakNet::BitStream::Write0((BitStream *)this_00);
    }
    else {
      RakNet::BitStream::Write1((BitStream *)this_00);
    }
    VariableSizedPacket::WriteCompressed_ushort(&this->base, this->clientVersion);
    if (this->isBanned == false) {
      RakNet::BitStream::Write0((BitStream *)this_00);
    }
    else {
      RakNet::BitStream::Write1((BitStream *)this_00);
    }
    if (this->isBanned != false) {
      (*(*Globals::g_pLTNetwork)->EncodeString)((char *)this->banLength, 0x800, (BitStream *)this_00);
      (*(*Globals::g_pLTNetwork)->EncodeString)((char *)this->banReason, 0x800, (BitStream *)this_00);
    }
    FUN_1013d250(this + 1, this_00);
    (*(*Globals::g_pLTNetwork)->EncodeString)((char *)&this[1].base.bitStream.readOffset, 0x800, (BitStream *)this_00);
    FUN_100514e0(this[1].base.bitStream.stackData + 0x3fb, this_00);
    local_8._0_1_ = this[1].base.bitStream.stackData[0x3f7];
    RakNet::BitStream::WriteCompressed((BitStream *)this_00, (uchar *)&local_8, 8, true);
    local_8 = (Packet_ID_LOGIN_RETURN *)CONCAT31(local_8._1_3_, this[2].base.bitStream.stackData[0x1c3]);
    RakNet::BitStream::WriteCompressed((BitStream *)this_00, (uchar *)&local_8, 8, true);
  }
  return;
}
```
