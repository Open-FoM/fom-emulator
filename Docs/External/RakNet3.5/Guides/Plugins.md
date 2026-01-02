# Plugins and Callbacks

## Overview
RakNet plugins derive from `PluginInterface` and are attached to a `RakPeerInterface` instance to intercept packets and receive lifecycle callbacks.

## Core Hooks (PluginInterface)
- `OnAttach` and `OnDetach` for lifecycle attachment.
- `OnStartup` and `OnShutdown` for peer lifecycle.
- `Update` for per-receive update ticks.
- `OnReceive` to intercept inbound packets and return a `PluginReceiveResult`.
- `OnCloseConnection` for explicit connection close events.
- `OnDirectSocketSend` and `OnDirectSocketReceive` for raw socket datagrams.
- `OnInternalPacket` for reliability-layer send/receive.

## Attaching Plugins
- `RakPeerInterface::AttachPlugin(PluginInterface* plugin)`
- `RakPeerInterface::DetachPlugin(PluginInterface* plugin)`

## Return Values (OnReceive)
- `RR_STOP_PROCESSING_AND_DEALLOCATE` stops processing and deallocates.
- `RR_CONTINUE_PROCESSING` continues to other plugins and the user.
- `RR_STOP_PROCESSING` stops processing but holds the packet.

## Reference
- PluginInterface
- RakPeerInterface
- MessageFilter
- PacketLogger
- PacketFileLogger
- PacketConsoleLogger


