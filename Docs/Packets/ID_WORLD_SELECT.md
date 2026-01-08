# ID_WORLD_SELECT (0x7B)

## Summary
- **Direction**: Server → Client
- **Purpose**: World selection, item payloads, faction data, and world transition control
- **Handler**: `HandlePacket_ID_WORLD_SELECT_7B` @ CShell 0x65899270
- **Read**: `Packet_ID_WORLD_SELECT_Read` @ CShell 0x65806590
- **Ctor**: `Packet_ID_WORLD_SELECT_Ctor` @ CShell 0x658064C0

## CRITICAL: Client Crash Issue

**Sending this packet incorrectly WILL crash the client.**

The crash occurs because the packet struct is **1120+ bytes** and uses a `VariableSizedPacket` base class that copies the entire RakNet payload into an internal BitStream. If the packet is malformed or truncated, the client will crash during parsing.

### Common Crash Causes:
1. **Missing base class init**: The packet requires `VariableSizedPacket::Read()` to initialize the internal BitStream from the RakNet payload first
2. **Invalid playerId**: Handler validates `playerId == g_pPlayerStats[0x5B]` - mismatch causes silent drop
3. **Invalid subId**: Unrecognized subIds (0,1,5) still succeed but do nothing
4. **Truncated payload**: SubIds 2 and 6 have complex list payloads that must be complete

---

## On-Wire Encoding (Source of Truth)

```
ID_WORLD_SELECT (0x7B)

# Base packet header (handled by VariableSizedPacket::Read)
u8    packetId = 0x7B

# Packet-specific payload
u32c  playerId          # Must match client's playerId (g_pPlayerStats[0x5B])
u8c   subId             # Dispatch type (2,3,4,5,6,7)

switch (subId):
  case 2 -> ItemsAdded payload (ItemList_Read)
  case 3 -> u32c + u8c + u8c (unknown purpose)
  case 4 -> u8c worldId + u8c worldInst (sets world + triggers login)
  case 5 -> (no extra data)
  case 6 -> SubId6List payload (faction/world data for UI)
  case 7 -> u8c worldId + u8c worldInst
  default -> (no extra data, returns ok=1)
```

### Encoding Notes:
- All fields use RakNet compressed encoding (`ReadCompressed`)
- `u32c` = compressed u32 (small values use fewer bits)
- `u8c` = compressed u8 (typically 1-8 bits)

---

## Field Table

| Offset | Field | Type | Encoding | Notes |
|--------|-------|------|----------|-------|
| 0x00 | vtable | ptr | - | Packet vtable |
| 0x08 | packetId | u8 | - | Always 0x7B |
| 0x0C | bitstream | BitStream | - | Internal 1044-byte struct |
| 0x430 | playerId | u32 | compressed | Must match client's player |
| 0x434 | subId | u8 | compressed | Dispatch type |
| 0x435 | worldId | u8 | compressed | For subId 4/7 |
| 0x436 | worldInst | u8 | compressed | For subId 4/7 |
| 0x438 | itemsPayload | ItemsAddedPayload | - | For subId 2 (36 bytes) |
| 0x45C | sub3_u32 | u32 | compressed | For subId 3 |
| 0x460 | sub6List | Sub6List | - | For subId 6 (28+ bytes) |

---

## SubId Payloads

### SubId 2: ItemsAdded Payload

Used to add items to the client's inventory/world state.

```c
struct ItemsAddedPayload {    // @ offset 0x438 in packet
    u16c  slotId;             // Inventory slot
    u32c  capacity;           // Capacity/count
    u32c  unk24;              // Unknown
    u32c  unk28;              // Unknown
    u16c  entryCount;         // Number of ItemsAddedEntry
    ItemsAddedEntry entries[];
};

struct ItemsAddedEntry {
    ItemStructA item;         // 31 bytes (see below)
    u16c variantCount;
    u32c variantIds[];        // variantCount entries
};

struct ItemStructA {          // 31 bytes
    u16c  stackCount;         // +0x00
    u16c  templateId;         // +0x02
    u16c  ammoOverrideId;     // +0x04
    u16c  durabilityCur;      // +0x06
    u8c   durabilityLossPct;  // +0x08 (default 100)
    u8c   bindState;          // +0x09
    u32c  identityKeyA;       // +0x0C
    u32c  identityKeyB;       // +0x10
    u32c  identityKeyC;       // +0x14
    u8c   flags[4];           // +0x1B-0x1E (4 bytes)
    u8c   unk1A;              // +0x1A
    u8c   unk19;              // +0x19
    u8c   unk18;              // +0x18
};
```

**Read function**: `ItemList_Read` @ 0x659404E0

### SubId 3: Unknown Triple Payload

```
u32c  value32           # Unknown purpose
u8c   value8a           # Unknown
u8c   value8b           # Unknown
```

**Handler**: No visible side effects in handler - appears unused.

### SubId 4: World Login Trigger (IMPORTANT)

This is the primary world selection packet that triggers world login.

```
u8c   worldId           # Target world ID
u8c   worldInst         # Target world instance
```

**Handler Actions** (@ 0x6589933D):
1. `SharedMem[0x1EEC1] = worldId`
2. `SharedMem[0x1EEC2] = worldInst`
3. `SharedMem[0x1EEC0] = 1` (login state flag)
4. `LoginUI_ShowMessage(11)` (show "Connecting" UI)

**This is the packet to send to make the client connect to a world server.**

### SubId 5: Empty

No payload data. Handler does nothing (falls through to success).

### SubId 6: Faction/World Select UI Payload

Complex payload used to populate the world selection UI with faction data.

```c
struct Sub6List {
    u8c   entryCount;
    Sub6Entry entries[];
    u32c  field16;            // @ offset +16
    u32c  field20;            // @ offset +20
    u32c  field24;            // @ offset +24
};

struct Sub6Entry {
    u8c   key;                // Entry key/type
    u32   mask;               // Read as raw bits, then inverted (~mask)
    u16   u16a;               // Direct bits (not compressed)
    u16c  u16b;               // Compressed
    FactionListB listB;       // Variable-length faction data
    FactionListC listC;       // Variable-length faction data
};
```

**Handler**: `WorldSelect_HandleSubId6Payload` @ 0x65877A40
- Populates faction UI elements
- Sets up world selection buttons
- Draws connection lines between worlds
- Window ID 49 (world select window)

### SubId 7: World Set (No Login Trigger)

Same payload as SubId 4 but does NOT trigger login state change.

```
u8c   worldId           # Target world ID
u8c   worldInst         # Target world instance
```

**Handler**: Falls through to default - no SharedMem writes, no UI message.

---

## Handler Flow

```
HandlePacket_ID_WORLD_SELECT_7B(payload):
    pkt = Packet_ID_WORLD_SELECT_Ctor()
    
    if !Packet_ID_WORLD_SELECT_Read(pkt, payload):
        return 1  # Parse failure - silent drop
    
    g_LTClient->vtbl[19](0x400000)  # Unknown flag set
    
    if pkt.playerId != g_pPlayerStats[0x5B]:
        return 1  # Player ID mismatch - silent drop
    
    switch pkt.subId:
        case 4:
            SharedMem_Write(g_pWorldMgr, 0x1EEC1, pkt.worldId)
            SharedMem_Write(g_pWorldMgr, 0x1EEC2, pkt.worldInst)
            SharedMem_Write(g_pWorldMgr, 0x1EEC0, 1)  # Login flag
            LoginUI_ShowMessage(11)
            break
            
        case 6:
            window = CWindowMgr_GetWindowById(g_pWindowMgr, 49)
            if window:
                WorldSelect_HandleSubId6Payload(window, pkt.sub6List)
            break
            
    return 0  # Success
```

---

## Server Implementation Guide

### Minimal Working Packet (SubId 4 - World Select)

To trigger world login, send subId 4 with the target world coordinates:

```typescript
function buildWorldSelectPacket(playerId: number, worldId: number, worldInst: number): Buffer {
    const writer = new RakNetBitWriter();
    
    writer.writeByte(0x7B);                    // packetId
    writer.writeCompressedU32(playerId);       // MUST match client's playerId
    writer.writeCompressedU8(4);               // subId = 4 (world login trigger)
    writer.writeCompressedU8(worldId);         // target world
    writer.writeCompressedU8(worldInst);       // target instance
    
    return writer.toBuffer();
}
```

### PlayerId Validation

**Critical**: The `playerId` field MUST match the client's stored player ID at `g_pPlayerStats[0x5B]`. This value is set during the login sequence (0x6F ID_LOGIN_RETURN). If mismatched, the packet is silently dropped.

### Reliability

Send with RakNet **RELIABLE** ordering - packet loss would leave the client in an undefined state.

---

## IDA Anchors

| Symbol | IDB | Address | Notes |
|--------|-----|---------|-------|
| Packet_ID_WORLD_SELECT_Read | ida2 | 0x65806590 | Packet deserializer |
| Packet_ID_WORLD_SELECT_Ctor | ida2 | 0x658064C0 | Packet constructor |
| Packet_ID_7B_Dtor | ida2 | 0x658063B0 | Packet destructor |
| HandlePacket_ID_WORLD_SELECT_7B | ida2 | 0x65899270 | Main handler |
| ItemList_Read | ida2 | 0x659404E0 | SubId 2 payload reader |
| Packet_ID_7B_ReadSubId6List | ida2 | 0x6596F2E0 | SubId 6 payload reader |
| Packet_ID_7B_Sub6List_Init | ida2 | 0x65806470 | SubId 6 list initializer |
| WorldSelect_HandleSubId6Payload | ida2 | 0x65877A40 | SubId 6 UI handler |
| ItemStructA_Read | ida2 | 0x65954F80 | Item data deserializer |
| ItemsAddedEntry_Read | ida2 | 0x6593E3B0 | Item entry deserializer |

---

## Validation

- **ida2**: Verified 2026-01-07 via decompilation
- **Cross-ref**: Handler at 0x658992B8 calls Read at 0x65806590
- **VTable**: 0x659CB498 (Packet_ID_7B vtable)

---

## Notes / Edge Cases

1. **SubId 4/7 Difference**: SubId 4 triggers login state (writes 0x1EEC0=1), SubId 7 just sets world IDs
2. **Window ID 49**: The world select window must exist for SubId 6 to have any effect
3. **Packet Size**: Total struct is 1120+ bytes due to VariableSizedPacket base class (1044-byte internal BitStream)
4. **No SubId 0/1**: These fall through to default handler (no-op)
5. **SubId 2 Items**: Used during login to populate initial inventory state
6. **Faction Data**: SubId 6 populates the world map UI with travel permissions and faction relationships

---

## Related Packets

- `0x72 ID_WORLD_LOGIN`: Client → World after SubId 4 triggers login
- `0x73 ID_WORLD_LOGIN_RETURN`: Master → Client with world server address
- `0x6F ID_LOGIN_RETURN`: Sets the playerId that must match in this packet

---

## Crash Debugging Checklist

If sending this packet crashes the client:

1. ☐ Is packetId exactly 0x7B?
2. ☐ Is playerId compressed correctly (WriteCompressed)?
3. ☐ Does playerId match the value sent in 0x6F LOGIN_RETURN?
4. ☐ Is subId a valid value (2,3,4,5,6,7)?
5. ☐ For subId 2/6: Is the list payload complete and properly formatted?
6. ☐ Are you sending via RakNet RELIABLE?
7. ☐ Check fom_hook.log for packet hex dump before crash

---

## Example: Triggering World Login

```typescript
// After successful login (0x6F), trigger world selection
const playerId = 12345;  // From 0x6F response
const worldId = 1;       // Target world
const worldInst = 1;     // Instance 1

// Build and send
const packet = buildWorldSelectPacket(playerId, worldId, worldInst);
raknet.send(clientAddr, packet, PacketReliability.RELIABLE);

// Client will then:
// 1. Set SharedMem world state
// 2. Show "Connecting..." message
// 3. Send 0x72 WORLD_LOGIN to master server
// 4. Master replies with 0x73 containing world server IP:Port
// 5. Client connects to world server
```
