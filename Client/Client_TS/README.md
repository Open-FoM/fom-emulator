# Face of Mankind Client Emulator

A TypeScript test client for reproducing FoM client packet patterns.

## Quick Start

```bash
cd ClientEmulator
npm install
npm run client:open-spam
```

## Notes
- Logs default to `logs/client/fom_client.log` with the same format as the server logs.
- Login token defaults to `1234` (override with `--token=` or `FOM_LOGIN_TOKEN`).
- Start via repo root helper: `start_client.bat`.
