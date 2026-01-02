# Client and Server Shells

## Overview
Client and server shells are the primary integration points between game code and the LithTech engine SDK. The interfaces and shared types live in `engine/sdk/inc`.

## Key Headers
- Client shell: `iclientshell.h`
- Server shell: `iservershell.h`
- Client interface: `iltclient.h`
- Server interface: `iltserver.h`
- Shared client/server helpers: `iltcsbase.h`

## Typical Flow (High-Level)
- Implement the shell interfaces from `iclientshell.h` and `iservershell.h`.
- Use `ILTClient` and `ILTServer` APIs to drive runtime behavior.
- Use shared types from `ltbasedefs.h` and `ltbasetypes.h`.

## Reference
- iclientshell.h
- iservershell.h
- iltclient.h
- iltserver.h
- iltcsbase.h
- ltbasedefs.h
- ltbasetypes.h


