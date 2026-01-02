# SDK Overview

## Entry Headers
- `engine/sdk/inc/lithtech.h` includes base type and definition headers.
- `engine/sdk/inc/ltbasetypes.h` and `engine/sdk/inc/ltbasedefs.h` define foundational types, handles, and engine macros.

## Core Interfaces
- `ILTClient` in `engine/sdk/inc/iltclient.h` for client-side engine access.
- `ILTServer` in `engine/sdk/inc/iltserver.h` for server-side engine access.
- `ILTCommon` in `engine/sdk/inc/iltcommon.h` for shared operations.
- `ILTCSBase` in `engine/sdk/inc/iltcsbase.h` for client/server shared helpers.
- `ILTMessage_*` in `engine/sdk/inc/iltmessage.h` for message read/write.

## Supporting Interfaces
- Rendering: `iltrender*`, `iltmodel.h`, `iltdrawprim.h`, `ilttexinterface.h`.
- Audio: `iltsoundmgr.h`.
- Physics: `iltphysics.h` and `engine/sdk/inc/physics/*`.
- UI: `cui*.h` headers.

## Reference
- lithtech.h
- ltbasetypes.h
- ltbasedefs.h
- iltclient.h
- iltserver.h
- iltcommon.h
- iltcsbase.h
- iltmessage.h


