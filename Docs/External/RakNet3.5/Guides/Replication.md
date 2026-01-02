# Replication (ReplicaManager and ReplicaManager2)

## Overview
RakNet provides object replication systems via `ReplicaManager` and `ReplicaManager2`. ReplicaManager2 is the newer iteration with built-in world download and scoping.

## ReplicaManager2 Quick Start (from header comments)
1) Derive a class from `Connection_RM2` and implement `Construct()`.
2) Derive a class from `Connection_RM2Factory` and implement `AllocConnection()` and `DeallocConnection()`.
3) Attach `ReplicaManager2` as a plugin.
4) Call `ReplicaManager2::SetConnectionFactory()` with your factory instance.
5) Derive your game objects from `Replica2` and implement `SerializeConstruction()`, `Serialize()`, and `Deserialize()`.
6) Call `Replica2::SetReplicaManager()` after allocating your objects.
7) Use `Replica2::SendConstruction()` and `Replica2::SendDestruction()` for remote create/delete.
8) Override `Replica2::QueryVisibility()` and `Replica2::QueryConstruction()` to control scoping.
9) Use `Replica2::AddAutoSerializeTimer()` for automatic serialization.

## Network ID Requirements
- Call `RakPeer::SetNetworkIDManager()`.
- Set authority via `NetworkIDManager::SetIsNetworkIDAuthority()`.
- For peer-to-peer, set `NetworkID::peerToPeerMode` and adjust `NETWORK_ID_USE_PTR_TABLE` in `NetworkIDManager.h` per header notes.

## Reference
- ReplicaManager2
- ReplicaManager
- Replica
- ReplicaEnums
- NetworkIDManager
- NetworkIDObject


