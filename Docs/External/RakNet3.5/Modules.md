# RakNet3.5 Modules

## Core Networking
- RakPeerInterface
- RakPeer
- RakNetworkFactory
- RakNetTypes
- RakNetDefines
- RakNetStatistics
- MessageIdentifiers
- PacketPriority
- InternalPacket
- ReliabilityLayer
- SocketLayer
- MTUSize

## Serialization and Compression
- BitStream
- BitStream_NoTemplate
- StringCompressor
- StringTable
- DataCompressor
- TableSerializer

## Security and Crypto
- DataBlockEncryptor
- Rijndael
- Rijndael-Boxes
- RSACrypt
- SHA1

## Replication and Network IDs
- NetworkIDManager
- NetworkIDObject
- Replica
- ReplicaEnums
- ReplicaManager
- ReplicaManager2

## Plugins and Topology
- PluginInterface
- AutoRPC
- Gen_RPC8
- RPCMap
- RPCNode
- ConnectionGraph
- FullyConnectedMesh
- Router
- RouterInterface
- NatPunchthrough
- ReadyEvent
- MessageFilter

## File Transfer and Patching
- FileList
- FileListTransfer
- FileListTransferCBInterface
- DirectoryDeltaTransfer
- AutopatcherPatchContext
- AutopatcherRepositoryInterface
- AsynchronousFileIO
- _FindFirst
- FileOperations

## Database
- LightweightDatabaseCommon
- LightweightDatabaseClient
- LightweightDatabaseServer

## Transport Interfaces
- TransportInterface
- RakNetTransport
- TCPInterface
- TelnetTransport

## Logging and Diagnostics
- PacketLogger
- PacketFileLogger
- PacketConsoleLogger
- ThreadsafePacketLogger
- LogCommandParser
- RakNetCommandParser
- CommandParserInterface

## Utilities and Platform
- RakString
- GetTime
- RakSleep
- RakThread
- SimpleMutex
- ThreadPool
- FunctionThread
- ExtendedOverlappedPool
- SystemAddressList
- Rand
- Itoa
- FormatString
- EpochTimeToString
- LinuxStrings
- Kbhit
- InlineFunctor
- SingleProducerConsumer
- RefCountedObj
- GridSectorizer
- HTTPConnection
- EmailSender

## Data Structures
- DS_BinarySearchTree
- DS_BPlusTree
- DS_BytePool
- DS_ByteQueue
- DS_Heap
- DS_HuffmanEncodingTree
- DS_HuffmanEncodingTreeFactory
- DS_HuffmanEncodingTreeNode
- DS_LinkedList
- DS_List
- DS_Map
- DS_MemoryPool
- DS_OrderedChannelHeap
- DS_OrderedList
- DS_Queue
- DS_QueueLinkedList
- DS_RangeList
- DS_Table
- DS_Tree
- DS_WeightedGraph


