# SMSG_UPDATE Spawn Packet Format

## Overview
SMSG_UPDATE (LithTech MSG ID 8) is used for guaranteed object updates including player spawns.
The client handler is at `OnUpdatePacket` (0x00026DF0) which dispatches to `UpdateHandle_GroupObjUpdate` (0x000267C0).

## Outer Structure (per update block)
```
u32     bitlen          # bit length of following block (client validates consumed == bitlen)
u8      flagsLo         # update flags low byte
[u8     flagsHi]        # if flagsLo & 0x80, read high byte -> combine to u16
u16     objectId        # if flags != 0
        <payload>       # UpdateHandle_GroupObjUpdate(objId, flags)
```

Multiple blocks can be chained. Loop terminates when bitpos >= total packet bits.

## CF_* Update Flags
```cpp
CF_NEWOBJECT    = 0x0001  // New object - read object definition block
CF_POSITION     = 0x0002  // Position + velocity vectors
CF_ROTATION     = 0x0004  // Rotation quaternion
CF_FLAGS        = 0x0008  // Object flags (u16 + u16 + u32)
CF_SCALE        = 0x0010  // Scale values (2-3 float32)
CF_RENDERINFO   = 0x0040  // Render info (5 bytes + optional u16)
CF_ATTACHMENTS  = 0x0100  // Attachment list
CF_FILENAMES    = 0x0800  // File ID lists (triggers Object_CreatePostInit)
CF_MODELINFO    = 0x2020  // Model/animation info block
CF_DIMS         = 0x8000  // Dimensions (3 float32)
```

## Object Definition Block (CF_NEWOBJECT)
When `flags & 0x1`:
```
u8      objDefFlags     # bits 0-5: objType, bit 6: has subblock, bit 7: subblock len is u16
float32 posX            # X position
float32 posY            # Y position  
float32 posZ            # Z position
[u8/u16 subBlockLen]    # if objDefFlags & 0x40 (has subblock)
[bytes  subBlockData]   # subblock payload
```

Object types (objDefFlags & 0x3F):
- Type 1: File ID lists (model/texture refs)
- Type 2: String (127 bytes max)
- Type 3: u16 at offset +8
- Type 9: String + u16

## Position/Velocity (CF_POSITION | 0x0200)
If object flags & 0x100 (uncompressed):
```
float32[3] position     # full precision
float32[3] velocity     # full precision
```
Else (compressed):
```
compressed_vec3 position
compressed_vec3 velocity
```

## Rotation (CF_ROTATION | 0x0400)
If object flags & 0x100 (uncompressed):
```
float32[4] quaternion   # 128 bits raw
```
Else:
```
compressed_quat         # Packet_ReadCompressedQuat
```

## Render Info (CF_RENDERINFO)
```
u8      byte[5]         # render bytes at objHandle+144..148
u8      renderFlags     # at objHandle+170
[u16    extra]          # if objType == 4
```

## Scale (CF_SCALE)
```
float32 scaleX
float32 scaleY
[float32 scaleZ]        # omitted if objType == 3 (defaults to 1.0)
```

## Attachments (CF_ATTACHMENTS)
```
loop:
  i16   attachId        # -1 terminates
  u32   nodeId
  float32[3] position
  compressed_quat rotation
end
[u32[3] extra]          # if objType == 1
```

## Model Info (CF_MODELINFO)
- objType 1: `Update_ReadModelInfoBlock(pkt, objHandle, 1)`
- objType 3: `u64` raw model info blob

## Dims (CF_DIMS)
```
float32 dimX
float32 dimY
float32 dimZ
```

## Minimal Spawn Packet
For a basic player spawn, flags should include:
- `CF_NEWOBJECT` (0x0001) - required for spawn
- `CF_POSITION` (0x0002) - initial position + velocity
- `CF_ROTATION` (0x0004) - initial rotation
- `CF_MODELINFO` (0x2020) - model/animation data
- `CF_RENDERINFO` (0x0040) - render properties

Typical spawn flags seen in pcap: varies, but usually includes position/rotation/model.

## Validation
Client validates `consumed_bits == bitlen` for each block. Mismatch returns `LT_INVALIDSERVERPACKET (44)`.

## Reference
- `OnUpdatePacket`: 0x00026DF0 (fom_client.exe)
- `UpdateHandle_GroupObjUpdate`: 0x000267C0
- `Update_ReadObjectDefBlock`: 0x000264E0
- `Update_ApplyObjectUpdateFlags`: 0x000258F0
- Pcap reference: Docs/Notes/World_Server_First_10s_Packets.md (Packet #17)
