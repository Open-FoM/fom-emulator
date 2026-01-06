# ClientNetworking Class

## Overview

Core networking class handling connections to master and world servers.
See `Docs\Notes\Login_Flow.md` for the end-to-end login/world flow.

## RTTI

```
.?AVClientNetworking@@
```

Address: `0x006E3E88`

## Inheritance

```
ClientNetworking
    └── FoMClientNetworking (game-specific extension)
```

## Key Members (Estimated Offsets)

| Offset | Type | Name | Description |
|--------|------|------|-------------|
| 0x08 | bool | initialized | Initialization flag |
| 0x0C | RakPeer* | masterPeer | Master server connection |
| 0x10 | RakPeer* | worldPeer | World server connection |
| 0x14 | SystemAddress | masterAddr | Master server address |
| 0x1C | SystemAddress | worldAddr | World server address |
| 0x24 | SystemAddress | pendingWorld | Pending world connection |
| 0x2C | bool | masterConnecting | Master connection in progress |
| 0x2D | bool | worldConnecting | World connection in progress |
| 0x91 | char[64] | username | Current username |
| 0xD1 | char[64] | sessionData | Session data |
| 0x111 | char[64] | masterHost | Master server hostname |
| 0x151 | bool | worldConnectionPending | World conn pending flag |

## Key Methods

### ClientNetworking_Init (0x004DE220)

```c
void Init(const char* masterHost, uint16_t localPort);
```

- Loads `fom_public.key` (RSA public key)
- Creates two RakPeer instances (master + world)
- Configures MTU to 1400 (0x578)
- Starts on specified local port

### RSA key replacement (2025-12-30)

Reason: original server private key is unavailable; we generated a new keypair so the emulator can decrypt login blobs and complete RakNet secure handshake.

Files:
- Public key (active): `Client\Client_FoM\fom_public.key` (68 bytes)
- Public key backup: `Client\Client_FoM\fom_public_copy.key`
- Private key/env: `Server\Master_TS\fom_private_key.env` (P/Q/N/D + endian hints)

Format (exact 68 bytes):
- Bytes 0..3: exponent, **little-endian** (0x10001 -> `01 00 01 00`)
- Bytes 4..67: modulus, **64-byte** value (512-bit). Keep endianness consistent with FoM build; current writer uses little-endian.

Rollback:
```
copy Client\Client_FoM\fom_public_copy.key Client\Client_FoM\fom_public.key
```

### ClientNetworking_InitMasterConnection (0x004E03C0)

```c
void InitMasterConnection(uint16_t localPort);
```

- Creates ClientNetworking instance if needed
- Connects to `fom1.fomportal.com`
- Validates installation integrity

### ClientNetworking_ConnectToWorld (0x004DE5F0)

```c
bool ConnectToWorld(SystemAddress* worldAddr);
```

- Requires active master connection
- Stores world server address for connection

### ClientNetworking_TryConnectWorld (0x004DE710)

```c
void TryConnectWorld();
```

- Attempts connection to pending world server
- Uses password: `37eG87Ph`
- Called periodically until connected

### ClientNetworking_HandleLoginResponse (0x004DF570)

```c
void HandleLoginResponse(Packet* packet);
```

- Handles `Packet_ID_LOGIN_REQUEST_RETURN` (0x6D)
- Extracts world server info on success
- Initiates world server connection

## Usage Flow

```
1. ClientNetworking_Init()
   - Load RSA key
   - Create RakPeer instances

2. ClientNetworking_InitMasterConnection()
   - Connect to master server

3. [Receive ID_CONNECTION_REQUEST_ACCEPTED]

4. [Send LOGIN_REQUEST]

5. ClientNetworking_HandleLoginResponse()
   - Process login result

6. ClientNetworking_ConnectToWorld()
   - Initiate world connection

7. ClientNetworking_TryConnectWorld()
   - Complete world connection
```

## Related Classes

- `FoMClientNetworking` - Game-specific extension
- `CNetHandler` - Network event handler
- `CUDPDriver` - Low-level UDP transport

---

*Last updated: December 27, 2025*
