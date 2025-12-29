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
│       └── TestClient.ts     # Test client for debugging
├── logs/                     # Packet log files (gitignored)
├── package.json
└── tsconfig.json
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server with auto-reload |
| `npm run server` | Start server once |
| `npm run client:connect` | Send test connection request |
| `npm run client:query` | Send test server query |
| `npm run build` | Compile TypeScript |

## Packet Logging

All packets are logged to:
- **Console**: Color-coded hex dumps with analysis
- **File**: `logs/packets_<timestamp>.log`

### Logging Controls (Env)

Reduce console spam while keeping full file logs:

```
PACKET_LOG=summary
PACKET_LOG_INTERVAL_MS=1000
```

Options:
- `PACKET_LOG=off|summary|full` (default: `summary`)
- `PACKET_LOG_INTERVAL_MS=0` (no throttling)
- `PACKET_LOG_IDS=0x6D,0x04` (log only these packet IDs)
- `PACKET_LOG_FILE=0` (disable file logging)
- `PACKET_LOG_ANALYSIS=0` (disable analysis lines)
- `FAST_LOGIN=1` (auto-accept login after handshake)
- `WORLD_IP=127.0.0.1`, `WORLD_PORT=61000` (login response target)

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

### With Test Client

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run client:connect
```

### With Real Game Client (Windows)

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
