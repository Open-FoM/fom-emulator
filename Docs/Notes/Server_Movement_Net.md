# Server Movement Networking (Findings)

Last updated: 2026-01-01

## Scope
Documents the server-side timing/flow control behavior that governs movement update
transmission. This is required to mirror FoM server pacing in the emulator (cadence,
throttling, resend gates).

## Key Functions (server.dll, base 0x10000000)
- NetConn_SendUnguaranteed @ 0x1000FB10
- NetConn_BuildAndSendFrame @ 0x10014A30
- NetConn_ShouldSendFrame @ 0x1000D500
- NetConn_UpdateSendInterval @ 0x1000D580
- NetConn_UpdateFlowControl @ 0x1000D670
- NetConn_FlowControlBlocked @ 0x1000D7D0
- CUDPDriver_UpdateConnTick @ 0x10014CF0 (calls NetConn_UpdateSendInterval)
- Server_BuildObjectUpdates @ 0x10043250
- UpdateSendToClientState @ 0x100431C0

## Send Cadence (exact behavior)
### NetConn_ShouldSendFrame
```
deltaMs = timeGetTime() - *(this+0xCC)     // +204
if (deltaMs < 200) return false

intervalMs = *(float*)(this+0x124)         // +292
if (intervalMs > 1000.0) intervalMs = 1000.0
return deltaMs >= (uint32)intervalMs
```
Implications:
- Hard floor: **200ms** (max 5 Hz), even if configured interval is shorter.
- Hard cap: **1000ms** maximum interval.
- `this+0xCC` is last-send timestamp.
- `this+0x124` is base target interval (ms).

### NetConn_UpdateSendInterval
```
if (*(this+0x12C)) { // +300 adaptive flag
  elapsed = timeGetTime() - *(this+0x130)  // +304
  interval = max(elapsed, *(float*)(this+0x124))
  *(float*)(this+0x128) = interval         // +296 effective interval
} else {
  *(float*)(this+0x128) = *(float*)(this+0x124)
}
```
Implications:
- Effective interval lives at `this+0x128`.
- Adaptive mode widens the interval if tick slipped.

### NetConn_ctor defaults (init)
```
*(float*)(this+0x124) = 200.0f   // baseIntervalMs (default)
*(float*)(this+0x128) = 0.0f     // effectiveIntervalMs
*(byte*)(this+0x12C) = 0         // adaptive interval disabled
*(u32*)(this+0x13C) = 0x7FFFFFFF // flowRateBytesPerSec (effectively unlimited)
*(byte*)(this+0x3D0) = 0         // flow init flag
*(u32*)(this+0x3D4) = 0          // flowUsage
*(u32*)(this+0x3D8) = 0          // flowDebt
*(u32*)(this+0x3DC) = timeGetTime()
```
Implication: **default send cadence is 200ms (5 Hz)** unless cvars override later.

## Flow Control (exact behavior)
### NetConn_FlowControlBlocked(a2 = bytesToSendNow)
```
NetConn_UpdateFlowControl(this, 0, now)
pending = *(this+0x3D5)     // +245
inflight = *(this+0x3D6)    // +246
bucket = *(this+0x3D8)      // +248
total = a2 + pending + inflight
return total > 2*bucket
```
Notes:
- `dword_100B2FA8` (InputDebug) gates verbose log output.

### NetConn_UpdateFlowControl(a2, now)
Key fields:
- `this+0x3D8` bucket max (used as 2*bucket in blocked check)
- `this+0x3DC` current bucket usage
- `this+0x3E0` debt usage
- `this+0x3E4` bucket cap
- `this+0x3D0` rate (bytes/sec)
- `this+0x3DC/0x3E0` are adjusted every ~17ms

Behavior (simplified):
- On first call, initializes and sets last timestamp.
- Every ~17ms: decays usage by `(rate * elapsed) / 1000`.
- If `a2 > 0`, it increments usage and caps at bucket.
- When `InputDebug > 2`, it logs detailed flow control state.

## Cvar/Config Hooks (VarTable runtime)
The cvar table is registered via:
`ServerCmdTable_Init` -> `VarTable_Init` -> `VarTable_AddEntry`.

Relevant cvars (g_ServerVarTable @ 0x100AD200):
- InputRate (base cadence)
- UpdateRate (update pacing)
- InputDebug (controls flow-control logging)
- ParseNet_* (packet parsing debug)
- NetMaxQueue (queue limits)
- ClientSleepMS (main loop sleep)

Important: cvars are resolved **via VarTable runtime**, not direct global xrefs. That’s
why no static xrefs appear from movement functions to `gCvar_*`.

## Emulator Implementation Notes
To mirror movement send cadence:
1) Track per-connection:
   - lastSendMs, baseIntervalMs, effectiveIntervalMs,
     adaptive flag, lastIntervalUpdateMs.
2) Apply gating:
   - if (delta < 200ms) no send.
   - clamp interval to 1000ms max.
   - adaptive widening when lagged.
3) Apply flow control:
   - block if `(pending + inflight + bytesToSend) > 2*bucket`.
   - decay usage by `(rate * elapsed)/1000` every ~17ms.

## Approximate values (client‑inferred, no server config)
These are safe defaults to emulate FoM behavior when server config is unknown.
- Base interval (server update target): **200 ms** (5 Hz). Matches NetConn_ctor default and
  aligns with observed unguaranteed update pacing in Client logs.
- Effective interval: **200 ms**, adaptive off by default.
- Adaptive interval: **disabled** unless explicit evidence from client indicates otherwise.
- Flow rate (bytes/sec): **0x7FFFFFFF** (effectively unlimited) from NetConn_ctor default.
- Flow bucket max: **2 * baseInterval** worth of queued bytes (flow control block uses
  `pending + inflight + bytesNow > 2*bucket`).
- Flow decay period: **~17 ms** (0x11) from NetConn_UpdateFlowControl.
- Unguaranteed resend window: **2 * baseInterval** (packets older than 2*interval dropped).
- Max unguaranteed frame size: **0x2260 bits** (~1100 bytes) from NetConn_SendUnguaranteed.

Notes:
- These should be treated as **defaults** until client instrumentation provides tighter
  cadence measurements (send/recv deltas).

## Client‑instrumentation TODO
To refine cadence:
- Hook client send path (PlayerInput_UpdateAndSend) and log deltaMs between sends.
- Hook client recv path (OnUnguaranteedUpdatePacket) and log deltaMs between updates.
- Compare idle vs movement to infer server pacing under load.

## Open Questions
- Where `this+0x124` (base interval) and flow-control bucket/rate are initialized.
  These are likely driven by InputRate/UpdateRate cvars during NetConn init or
  connection setup.
- Need to map cvar-to-field wiring (VarTable read path).
