# FoM Server Manager (Electron)

## Dev
1) Install deps:
   - `npm install`
2) Run the UI:
   - `npm run dev`

## Server Requirements
- Master and/or world server running with ADMIN_ENABLED=1.
- Set ADMIN_TOKEN to match the token you enter in the UI (default `dev-admin-token`).
- Admin ports default to 4701 (master) and 4702 (world).

## Launcher
- Use the in-app launcher to start master/world with custom env vars.
- Launch runs `bun run --cwd apps\\master start` / `bun run --cwd apps\\world start` directly.
- Profiles are stored locally in the app (browser storage) and can be saved/selected from the launcher.
- Use Export/Import to move profiles between machines (JSON file).
- Preset profiles live in `ServerManager/server_profiles/*.json` and load on startup.
