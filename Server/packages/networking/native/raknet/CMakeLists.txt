project(
  "RakNet"
  DESCRIPTION "RakNet is a C++ game networking engine."
  VERSION 3.611
)

set(CMAKE_CXX_STANDARD 98)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_compile_definitions(
  _RAKNET_LIB
  _CRT_NONSTDC_NO_DEPRECATE
  _CRT_SECURE_NO_DEPRECATE
)

add_library(RakNet STATIC
  "src/_FindFirst.cpp"
  "src/AutoRPC.cpp"
  "src/BigInt.cpp"
  "src/BitStream_NoTemplate.cpp"
  "src/BitStream.cpp"
  "src/CheckSum.cpp"
  "src/CommandParserInterface.cpp"
  "src/ConnectionGraph.cpp"
  "src/ConnectionGraph2.cpp"
  "src/ConsoleServer.cpp"
  "src/DataBlockEncryptor.cpp"
  "src/DataCompressor.cpp"
  "src/DS_BytePool.cpp"
  "src/DS_ByteQueue.cpp"
  "src/DS_HuffmanEncodingTree.cpp"
  "src/DS_Table.cpp"
  "src/EncodeClassName.cpp"
  "src/EpochTimeToString.cpp"
  "src/ExtendedOverlappedPool.cpp"
  "src/FileOperations.cpp"
  "src/FormatString.cpp"
  "src/FullyConnectedMesh.cpp"
  "src/FullyConnectedMesh2.cpp"
  "src/FunctionThread.cpp"
  "src/Gen_RPC8.cpp"
  "src/GetTime.cpp"
  "src/gettimeofday.cpp"
  "src/GridSectorizer.cpp"
  "src/HTTPConnection.cpp"
  "src/InlineFunctor.cpp"
  "src/Itoa.cpp"
  "src/LightweightDatabaseClient.cpp"
  "src/LightweightDatabaseCommon.cpp"
  "src/LightweightDatabaseServer.cpp"
  "src/LinuxStrings.cpp"
  "src/LogCommandParser.cpp"
  "src/MessageFilter.cpp"
  "src/NatPunchthroughClient.cpp"
  "src/NatPunchthroughServer.cpp"
  "src/NetworkIDManager.cpp"
  "src/NetworkIDObject.cpp"
  "src/PacketConsoleLogger.cpp"
  "src/PacketFileLogger.cpp"
  "src/PacketLogger.cpp"
  "src/PluginInterface.cpp"
  "src/PluginInterface2.cpp"
  "src/RakMemoryOverride.cpp"
  "src/RakNetCommandParser.cpp"
  "src/RakNetSocket.cpp"
  "src/RakNetStatistics.cpp"
  "src/RakNetTransport.cpp"
  "src/RakNetTransport2.cpp"
  "src/RakNetTypes.cpp"
  "src/RakNetworkFactory.cpp"
  "src/RakPeer.cpp"
  "src/RakSleep.cpp"
  "src/RakString.cpp"
  "src/RakThread.cpp"
  "src/Rand.cpp"
  "src/ReadyEvent.cpp"
  "src/ReliabilityLayer.cpp"
  "src/ReplicaManager.cpp"
  "src/ReplicaManager2.cpp"
  "src/ReplicaManager3.cpp"
  "src/rijndael.cpp"
  "src/Router.cpp"
  "src/RPCMap.cpp"
  "src/RSACrypt.cpp"
  "src/SHA1.cpp"
  "src/SimpleMutex.cpp"
  "src/SocketLayer.cpp"
  "src/StringCompressor.cpp"
  "src/StringTable.cpp"
  "src/SuperFastHash.cpp"
  "src/SystemAddressList.cpp"
  "src/TableSerializer.cpp"
  "src/TCPInterface.cpp"
  "src/TelnetTransport.cpp"
  "src/ThreadsafePacketLogger.cpp"
  "src/UDPForwarder.cpp"
  "src/UDPProxyClient.cpp"
  "src/UDPProxyCoordinator.cpp"
  "src/UDPProxyServer.cpp"
  "src/VariadicSQLParser.cpp"
  "src/WSAStartupSingleton.cpp"
)

target_include_directories(RakNet
  PUBLIC
  ${PROJECT_SOURCE_DIR}/include
)

# Windows-specific
if(WIN32)
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
  target_link_libraries(RakNet wsock32 ws2_32)

  # We don't want to see warnings for RakNet code.
  target_compile_options(RakNet PRIVATE /w)

  # RakNet has warnings that we're not going to fix!
  target_compile_options(RakNet PRIVATE /w)  # disables all warnings
endif()

# Linux-specific
if(UNIX)
    target_compile_options(RakNet PRIVATE -fpermissive -w -Wno-notes -Wno-pragma-messages)

  # The compiler spams "note:" messages that Visual Studio promotes to errors.
  # We silence all build log output so that we don't see those messages.
  set_target_properties(RakNet PROPERTIES
        RULE_LAUNCH_COMPILE ">/dev/null 2>&1"
    )

    # Make sure that it can be linked correctly.
    set_target_properties(RakNet PROPERTIES POSITION_INDEPENDENT_CODE ON)
endif()

install(TARGETS RakNet
  EXPORT RakNetTargets
  ARCHIVE DESTINATION lib
  INCLUDES DESTINATION include
)
install(DIRECTORY include/ DESTINATION include)
