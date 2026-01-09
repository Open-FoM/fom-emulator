# Server - AGENTS

## Overview
Bun-based server emulator for Face of Mankind. Monorepo with apps and shared packages.

## Structure
- `apps/master/` - Master server (login, session routing)
- `apps/world/` - World server (gameplay, replication)
- `packages/packets/` - LithTech packet definitions (encode/decode)
- `packages/networking/` - Network layer (RakNet FFI, LithNet FFI, BitStream)

## Native Code (MUST COMPILE BEFORE USE)

### LithNet FFI (LithTech packet serialization)
```bash
cd packages/networking/native/lithnet && ./build.sh
```

### RakNet FFI (transport layer)
```bash
cd packages/networking/native/raknet && ./build.sh
```

## Running
```bash
# From repo root
./start_server.bat      # Master server
./start_world.bat       # World server
```

## Key Patterns
- Packets use `LithPacketWrite`/`LithPacketRead` from `@openfom/networking` (native FFI)
- `using` keyword for automatic resource cleanup (Disposable pattern)
- `encode()` includes message ID; `decode()` validates message ID
