# FoM Server Emulator V2

Second-generation server emulator using **native RakNet 3.611** via Bun FFI for proper reliability, ACKs, and duplicate detection.

## Why V2?

The legacy TS emulator (removed) used a TypeScript reimplementation of RakNet's reliability layer. This had several issues:

- Incomplete ACK handling
- Missing resend logic for server→client packets
- No proper duplicate detection at the reliability layer
- Application-level workarounds needed (e.g., "duplicate pending → skip resend" in LoginHandler)

V2 uses the **actual RakNet 3.611 C++ code** via FFI, giving us:

- ✅ Full reliability layer with proper ACKs and resends
- ✅ Duplicate packet detection at the network layer
- ✅ RSA security and AES encryption (same as original game)
- ✅ Battle-tested networking code

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TypeScript (Bun)                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Game Logic (Login, LithTech, World handlers)       ││
│  └─────────────────────────────────────────────────────┘│
│                          │                               │
│                    Bun FFI Bindings                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  src/bindings/raknet.ts                             ││
│  │  - RakPeer class                                    ││
│  │  - Type definitions                                 ││
│  │  - High-level API                                   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                          │
                    FFI (dlopen)
                          │
┌─────────────────────────────────────────────────────────┐
│              Native DLL (raknet_ffi.dll)                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │  C Wrapper API (extern "C")                         ││
│  │  native/raknet_ffi.h + .cpp                         ││
│  └─────────────────────────────────────────────────────┘│
│                          │                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │  RakNet 3.611 Source                                 ││
│  │  External/raknet/                        ││
│  │  - RakPeer, ReliabilityLayer                        ││
│  │  - RSACrypt, DataBlockEncryptor                     ││
│  │  - BitStream, etc.                                  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Building

### Prerequisites

- Windows: Visual Studio 2022 with C++ workload
- CMake 3.16+
- Bun 1.0+

### Build the Native DLL

```bash
cd Server/Master_TS/native
build.bat
```

This produces `Server/Master_TS/raknet_ffi.dll`.

### Install Dependencies

```bash
cd Server/Master_TS
bun install
```

### Run the Server

```bash
bun run dev
```

## Configuration

Config sources (highest priority first):

1) `Server/Master_TS/fom_server.ini` (or `FOM_INI` override)
2) Environment variables

INI keys are case-insensitive; missing keys fall back to defaults.

| Key | Default | Description |
|-----|---------|-------------|
| `PORT` | `61000` | Listen UDP port |
| `MAX_CONNECTIONS` | `100` | Maximum client connections |
| `SERVER_PASSWORD` | `37eG87Ph` | RakNet connection password |
| `SERVER_MODE` | `master` | `master` or `world` |
| `WORLD_IP` | `127.0.0.1` | World IP returned in 0x73 |
| `WORLD_PORT` | `62000` | World port returned in 0x73 |
| `DEBUG` | `1` | Global debug logging |
| `LOGIN_DEBUG` | `0` | Verbose login logging |
| `LOGIN_STRICT` | `0` | Enforce strict login validation + status codes |
| `LOGIN_REQUIRE_CREDENTIALS` | `0` | Require password hash in 0x6E |
| `ACCEPT_AUTH_WITHOUT_USER` | `0` | Allow 0x6E without prior 0x6C |
| `RESEND_DUPLICATE_6D` | `0` | Re-send 0x6D on duplicate 0x6C |
| `LOGIN_CLIENT_VERSION` | `0` | Enforce exact clientVersion (0 disables) |
| `FOM_WORLD_ID` | `0` | World ID sent in 0x7B |
| `FOM_WORLD_INST` | `0` | World instance sent in 0x7B |
| `WORLD_SELECT_PLAYER_ID` | `0` | Force playerId in 0x6F/0x7B |
| `WORLD_SELECT_PLAYER_ID_RANDOM` | `0` | Randomize playerId when not forced |
| `PACKET_LOG` | `full` | `off` \| `summary` \| `full` |
| `PACKET_LOG_INTERVAL_MS` | `5000` | Min console log interval (ms) |
| `PACKET_LOG_FILE` | `1` | Enable file logging |
| `PACKET_LOG_ANALYSIS` | `0` | Enable log analysis |
| `PACKET_LOG_REPEAT_SUPPRESS_MS` | `2000` | Suppress duplicate logs (ms) |
| `PACKET_LOG_IDS` | empty | Comma-separated IDs for console logging |
| `PACKET_LOG_FILE_IDS` | empty | Comma-separated IDs for file logging |
| `PACKET_LOG_IGNORE_IDS` | empty | Comma-separated IDs to suppress |
| `PACKET_LOG_FLUSH` | `off` | `off` \| `login` \| `always` |
| `QUIET_MODE` | `0` | Suppress console output |
| `FOM_QUIET_LOGS` | `0` | Alias for QUIET_MODE |

## API

### RakPeer Class

```typescript
import { RakPeer, RakReliability, RakPriority } from './bindings/raknet';

const peer = new RakPeer();

// Start server
peer.startup(100, 61000, 0);
peer.setMaxIncomingConnections(100);
peer.setIncomingPassword('password');

// Main loop
while (peer.isActive()) {
    const packet = peer.receive();
    if (packet) {
        console.log(`Got packet: 0x${packet.data[0].toString(16)}`);
        
        // Send response
        peer.send(
            responseData,
            RakPriority.HIGH,
            RakReliability.RELIABLE,
            0, // ordering channel
            packet.systemAddress,
            false // not broadcast
        );
    }
    await Bun.sleep(10);
}

peer.shutdown(500);
peer.destroy();
```

### Message IDs

```typescript
import { RakMessageId } from './bindings/raknet';

// RakNet internal messages
RakMessageId.NEW_INCOMING_CONNECTION  // 0x0D
RakMessageId.DISCONNECTION_NOTIFICATION  // 0x0F
RakMessageId.CONNECTION_REQUEST_ACCEPTED  // 0x11

// User packets start at 0x4B
RakMessageId.USER_PACKET_ENUM  // 0x4B
```

## Migration from V1

Key differences:

1. **No manual ACK handling** - RakNet does this automatically
2. **No reliability layer reimplementation** - Use `RakReliability` enum
3. **Packets are raw** - No need to parse RakNet framing, you get the payload directly
4. **Security is built-in** - Use `peer.initSecurity()` for RSA/AES

### V1 → V2 Mapping

| Legacy TS (removed) | V2 (Server) |
|---------------------|----------------------|
| `parseRakNetDatagram()` | N/A - handled by native |
| `wrapReliablePacket()` | `peer.send(..., RakReliability.RELIABLE, ...)` |
| `buildAckPacket()` | N/A - automatic |
| `connection.pendingAcks` | N/A - automatic |
| `LoginHandler` duplicate check | N/A - native dedup |

## Files

```
Server/Master_TS/
├── native/
│   ├── raknet_ffi.h      # C API header
│   ├── raknet_ffi.cpp    # C wrapper implementation
│   ├── CMakeLists.txt    # Build configuration
│   └── build.bat         # Windows build script
├── src/
│   ├── bindings/
│   │   └── raknet.ts     # Bun FFI bindings
│   └── index.ts          # Main entry point
ÃÄÄ fom_server.ini        # Optional INI config
├── package.json
├── tsconfig.json
└── README.md
```

## Status

- [x] C wrapper API design
- [x] CMake build system
- [x] Bun FFI bindings
- [x] Basic server skeleton
- [ ] Build and test native DLL
- [x] Port login handler (native BitStream/StringCompressor + strict gating)
- [x] Packet logger + INI config overrides
- [ ] Port LithTech message handling
- [ ] Port world server logic
- [x] Integration testing with real FoM client



