# FoMServer Project Plan (RakNet MMO Packet Handling)

This document merges:
- `Docs/Projects/FoMServer.md`
- `Docs/raknet_mmo_packet_handling.md`

It is the single source for FoMServer architecture and execution, with emphasis on RakNet MMO packet handling.

---

## Project Scope (FoMServer)

### Problem
The TypeScript Server (`Server/apps/master/`) has login packet issues and version drift risk. We need a native C++ server that links directly against `Server/packagers/networking/native/raknet` (RakNet 3.611) and preserves the exact login packet parsing/writing logic.

### Goals
- Replace the existing Server (`Server/apps/master/`) with a C++ server focused on the login handshake.
- Use `Server/packagers/networking/native/raknet` as the authoritative RakNet source.
- Port login parsing/writing logic 1:1 from `Server/apps/master/src` (primary code reference) and packet docs.
- Provide a clean, predictable packet handling workflow that scales to MMO packet counts.
- Mirror PacketLogger behavior (file + console logging, filters, analysis).
- Build via CMake with a simple batch file (Unreal-style layout reference: `Hook`).

### Non-Goals
- World/gameplay packet handling beyond login handshake.
- Changing packet formats, timing, or validation rules.
- Rewriting protocol docs or client hooks.

### Constraints
- Project root solution file: `FoMServer.sln`.
- Workspace: `Server/` with Unreal-like header/source layout.
- Use `fom_server.ini` + env overrides; focus on login-related settings.
- Preserve behavior of TS login logic, including fallbacks and validation.

### Source of Truth (Login Packets)
- 0x6C: `Docs/Packets/ID_LOGIN_REQUEST.md`
- 0x6D: `Docs/Packets/ID_LOGIN_REQUEST_RETURN.md`

---

## RakNet MMO Packet Handling Architecture

### 1) Target pipeline
**Receive -> Identify -> Dispatch -> Decode -> Validate -> Enqueue -> Apply -> Send**

Rules:
- Keep the network poll loop cheap.
- Keep authoritative world state single-threaded (per world or per zone).
- Only one thread owns calls into `RakPeerInterface`.

### 2) Threading model

**Default recommendation: 2 threads**
- **Net thread (RakNet owner)**
  - Calls `Peer->Receive()` and `Peer->DeallocatePacket()`
  - Parses header (including `ID_TIMESTAMP` wrapper)
  - Dispatches handlers
  - Handlers decode + validate
  - Handlers enqueue commands to world thread
  - Drains outbound send queue and calls `Peer->Send()`

- **World thread (authoritative simulation)**
  - Fixed tick (20/30/60 Hz)
  - Applies queued commands to world state
  - Produces outbound messages and queues them for net thread send

**Single-thread option** (login-only, RE-friendly)
- Poll network
- Apply commands immediately
- Tick world

### 3) RakNet facts that matter
- MessageId is the first byte of a message.
- `ID_TIMESTAMP` wrapper shifts the real MessageID to a later byte.
- Always deallocate packets (`Peer->DeallocatePacket(Packet)`).
- Never keep pointers into `Packet->data` after dealloc.
- Write IDs as true 1-byte values in BitStream.

### 4) Dispatcher pattern (scales to 100s of packets)
Use a fixed array of 256 handlers indexed by MessageID:

```cpp
using FHandlerFn = void(*)(FSession&, RakNet::BitStream&, const RakNet::Packet&);

struct FDispatcher
{
    std::array<FHandlerFn, 256> Table;

    FDispatcher() { Table.fill(nullptr); }

    void Bind(uint8 MessageId, FHandlerFn Handler)
    {
        Table[MessageId] = Handler;
    }

    void Dispatch(uint8 MessageId, FSession& Session, RakNet::BitStream& In, const RakNet::Packet& Packet) const
    {
        if (FHandlerFn Handler = Table[MessageId])
        {
            Handler(Session, In, Packet);
            return;
        }

        Session.OnUnknownOpcode(MessageId);
    }
};
```

Registration is per domain:
- `RegisterAuthHandlers(Dispatcher)`
- `RegisterMovementHandlers(Dispatcher)`
- `RegisterChatHandlers(Dispatcher)`

### 5) Packet identify + BitStream header parse (timestamp-safe)

```cpp
static uint8 ReadMessageIdAndSeekPayload(RakNet::BitStream& In)
{
    RakNet::MessageID First = 0;
    if (!In.Read(First)) { return 255; }

    if (First == ID_TIMESTAMP)
    {
        RakNet::Time Timestamp = 0;
        RakNet::MessageID RealId = 0;
        if (!In.Read(Timestamp)) { return 255; }
        if (!In.Read(RealId)) { return 255; }
        return (uint8)RealId;
    }

    return (uint8)First;
}
```

### 6) Handler structure (decode + validate + enqueue)

DTOs are decoded input, not world state.

```cpp
struct FMsgChatSay { std::string Text; };
```

Handler template:
```cpp
static void HandleChatSay(FSession& Session, RakNet::BitStream& In, const RakNet::Packet& Packet)
{
    FMsgChatSay Msg;
    if (!DecodeChatSay(In, Msg)) { Session.StrikeBadPacket(); return; }
    if (!Session.IsInWorld()) { Session.StrikeBadPacket(); return; }
    if (Msg.Text.empty()) { Session.StrikeBadPacket(); return; }

    Session.EnqueueToWorld(
        [SessionId = Session.GetId(), Text = std::move(Msg.Text)](FWorld& World)
        {
            World.BroadcastChat(SessionId, Text);
        }
    );
}
```

### 7) Outbound sending (centralized)
Do not call `Peer->Send()` from random places. Queue outbound messages, then let net thread drain.

### 8) Net poll loop

```cpp
void FServer::NetPollOnce()
{
    for (RakNet::Packet* Packet = Peer->Receive(); Packet; Peer->DeallocatePacket(Packet), Packet = Peer->Receive())
    {
        FSession& Session = Sessions.GetOrCreate(*Packet);

        RakNet::BitStream In(Packet->data, Packet->length, false);
        const uint8 MessageId = ReadMessageIdAndSeekPayload(In);
        if (MessageId == 255) { Session.StrikeBadPacket(); continue; }

        if (!Session.AllowPacket(MessageId, Packet->length))
        {
            Session.RateLimitDrop(MessageId);
            continue;
        }

        Dispatcher.Dispatch(MessageId, Session, In, *Packet);
    }

    DrainOutboundSends();
}
```

### 9) File layout (scalable)

```
/Net
  ServerNet.cpp/.h
  Dispatcher.cpp/.h

/World
  World.cpp/.h

/Protocol
  MessageIds.h
  Decode.cpp/.h
  Messages/

/Handlers
  Auth/
  Movement/
  Chat/
```

### 10) Scaling checklist
- Max packet size
- String max lengths
- Count max (arrays/lists)
- Session state gating
- Rate limits per opcode
- Dispatch table (array)
- Centralized send queue
- Observability (per-opcode counters, disconnect reasons)

---

## FoMServer Implementation Plan (Login-Only)

1) Implement array[256] dispatcher with timestamp-safe ID parse.
2) Handlers decode/validate login packets and respond immediately (no world thread yet).
3) PacketLogger mirrors TS output and filters.
4) Send path is centralized; future-ready for outbound queue.

### Login Packet Coverage
- 0x6C -> 0x6D
- 0x6E -> 0x6F
- 0x70 bidirectional
- 0x72 -> 0x73
- 0x7B world select (master flow)

---

## Milestones
1) Scaffold FoMServer (CMake + batch) and set output layout.
2) Port login handshake + codecs + logger (exact encoding).
3) Validate parity with TS/captures and document deltas.

## Unreal C++ Standards & Helpers
/***
- Follow Unreal-style C++ conventions (PascalCase ALL identifiers, UPPER_SNAKE for constants, clear module boundaries).
- Use header/implementation pairs: `.h` + `.cpp` for all modules and handlers.
- Avoid Public/Private folder conventions; keep headers and sources in clearly named module folders instead.
- Prefer lightweight helpers: small DTO structs for decoded packets, centralized decode/encode utilities, and minimal allocations in hot paths.
- Comment style: use `/***/` block comments for section headers and rationale notes; avoid `//` commentary except for brief inline clarifications.
***/
