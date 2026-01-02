# Quick Start

## Goal
Establish a minimal peer lifecycle: startup, connect, send, receive, shutdown.

## Create a Peer
- Use `RakNetworkFactory::GetRakPeerInterface()` to create a peer instance.
- Use `RakNetworkFactory::DestroyRakPeerInterface()` when done.

## Server Startup Flow
1) Create a `SocketDescriptor` with the listen port.
2) Call `RakPeerInterface::Startup()`.
3) Call `RakPeerInterface::SetMaximumIncomingConnections()` to allow inbound connections.
4) Poll `RakPeerInterface::Receive()` in your update loop.
5) After handling each packet, call `RakPeerInterface::DeallocatePacket()`.

## Client Startup Flow
1) Call `RakPeerInterface::Startup()` with a max connection count of 1.
2) Call `RakPeerInterface::Connect()` with the remote host and port.
3) Poll `RakPeerInterface::Receive()` and handle connection status messages.

## Sending Data
- Use `RakPeerInterface::Send(const char* data, int length, PacketPriority, PacketReliability, char orderingChannel, SystemAddress, bool broadcast)`.
- Or use `RakPeerInterface::Send(const RakNet::BitStream* bitStream, PacketPriority, PacketReliability, char orderingChannel, SystemAddress, bool broadcast)`.

## Receiving Data
- `RakPeerInterface::Receive()` returns a `Packet*`.
- `MessageID` is defined as the first byte of a network message (see `RakNetTypes.h`).
- Use `MessageIdentifiers.h` for the ID_* constants.

## Shutdown
- Call `RakPeerInterface::Shutdown()` to stop networking threads and close sockets.
- Destroy the peer via `RakNetworkFactory::DestroyRakPeerInterface()`.

## Reference
- RakPeerInterface
- RakNetworkFactory
- RakNetTypes
- MessageIdentifiers


