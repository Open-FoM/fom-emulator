# Face of Mankind Server Emulator

A TypeScript proof-of-concept server emulator for game preservation.

## Quick Start

```bash
cd ServerEmulator
npm install
npm run dev
```

## Project Structure

```
ServerEmulator/
├── src/
│   ├── index.ts              # Main entry point
│   ├── protocol/
│   │   ├── BitStream.ts      # LithTech bit-level serialization
│   │   └── Constants.ts      # Protocol constants from RE
│   ├── network/
│   │   ├── UDPServer.ts      # UDP socket wrapper
│   │   └── Connection.ts     # Connection state management
│   ├── handlers/
│   │   └── PacketHandler.ts  # Packet processing logic
│   ├── utils/
│   │   └── PacketLogger.ts   # Hex dump and packet logging
│   └── tools/
│       └── (moved)           # Client tools live in ClientEmulator/
├── logs/                     # Packet log files (gitignored)
├── package.json
└── tsconfig.json
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server with auto-reload |
| `npm run server` | Start server once |
| `npm run build` | Compile TypeScript |

## Packet Logging

All packets are logged to:
- **Console**: Color-coded hex dumps with analysis
- **File (latest)**: `logs/fom_server.log`
- **File (rotated)**: `logs/packets_YYYY.MM.DD-HH.mm.ss.mmm.log`

### Logging Controls (Env)

Reduce console spam while keeping full file logs:

```
PACKET_LOG=summary
PACKET_LOG_INTERVAL_MS=1000
```

Options:
- `PACKET_LOG=off|summary|full` (default: `summary`)
- `PACKET_LOG_INTERVAL_MS=0` (no throttling)
- `PACKET_LOG_IDS=0x6B,0x6D` (console allowlist; matches inner ID for reliable packets)
- `PACKET_LOG_FILE_IDS=0x6B,0x6D` (file allowlist; matches inner ID for reliable packets)
- `PACKET_LOG_IGNORE_IDS=0x00,0x01,0x03,0x80` (drop noisy packet IDs like pings/acks)
- `PACKET_LOG_FILE=0` (disable file logging)
- `PACKET_LOG_ANALYSIS=0` (disable analysis lines)
- `WORLD_IP=127.0.0.1`, `WORLD_PORT=61000` (login response target)
- RSA env (auto-loaded if `ServerEmulator/fom_private_key.env` exists):
  - `FOM_RSA_PRIVATE_P_HEX`, `FOM_RSA_PRIVATE_Q_HEX` (or `FOM_RSA_PRIVATE_N_HEX` + `FOM_RSA_PRIVATE_D_HEX`)
  - `FOM_RSA_PUBLIC_E_HEX` (defaults to 0x10001)
  - `FOM_RSA_MODULUS_BYTES=64`, `FOM_RSA_ENDIAN=little`
- INI config (auto-loaded if present):
  - `ServerEmulator/fom_server.ini` (preferred), or `ServerEmulator/server.ini`, `ServerEmulator/config.ini`
  - Override with `FOM_INI=path\to\file.ini` or `FOM_CONFIG_INI=...`
  - Keys are applied as env vars (INI values override existing env vars when non-empty)
  - On startup, the server writes a snapshot of the effective config to the INI path (only if missing)
  - Set `FOM_CONFIG_OVERWRITE=1` to refresh the file with current values

### Log Format

```
[1] RECV 192.168.1.100:54321 [Conn#1] (12 bytes)
  0000  c7 d9 19 99 02 00 00 00 00 00 00 00  |............|
  → Connection Magic detected (0x9919D9C7)
  → Request Type: 2 (CONNECT)
```

### Color Coding (Console)
- Green: RECV (incoming)
- Blue: SEND (outgoing)
- Yellow: Printable ASCII bytes
- Gray: Null bytes
- Cyan: Offset addresses
- Magenta: Packet analysis

## Testing

### With Test FoM

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
```

### With Real Game FoM (Windows)

#### Step 1: Redirect DNS

Edit `C:\Windows\System32\drivers\etc\hosts` (requires Administrator):

```
127.0.0.1 fom1.fomportal.com
```

#### Step 2: Start Server

```bash
cd ServerEmulator
npm install
npm run dev
```

#### Step 3: Launch Game

Run `fom_client.exe` and attempt to log in. Watch the server console for captured packets.

#### Step 4: Analyze Packets

Check `logs/packets_*.log` for full packet captures. The server logs:
- Connection requests (magic 0x9919D9C7)
- Password validation
- All game packets with hex dumps

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Address in use" | Another process on port 61000. Kill it or use `PORT=61001 npm run dev` |
| No packets received | Check hosts file. Verify with `ping fom1.fomportal.com` (should be 127.0.0.1) |
| Connection refused | Windows firewall may block. Add exception for UDP 61000 |

## Current Status

- [x] UDP server listening on port 61000
- [x] Connection magic handling (0x9919D9C7)
- [x] BitStream reader/writer (LithTech compatible)
- [x] LithTech connection handshake (CONNECT/QUERY/CONNECT_RESPONSE)
- [x] Password validation for world server connections
- [x] Packet logging with color-coded hex dumps
- [x] Ping/pong handling
- [x] Test client tool
- [ ] LOGIN_REQUEST parsing (after connection)
- [ ] LOGIN_REQUEST_RETURN response (0x6D)
- [ ] RSA key generation
- [ ] World server on port 27889
- [ ] Game state synchronization

## Protocol Reference

See `../PROTOCOL_SPECIFICATION.md` for full protocol documentation.

