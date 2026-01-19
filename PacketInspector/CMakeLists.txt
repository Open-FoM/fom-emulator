cmake_minimum_required(VERSION 3.16)
project(PacketInspector LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PACKET_INSPECTOR_ROOT ${CMAKE_CURRENT_LIST_DIR})
set(RAKNET_ROOT ${CMAKE_CURRENT_LIST_DIR}/../Server/packages/networking/native/raknet)

add_library(PacketInspector SHARED
    ${PACKET_INSPECTOR_ROOT}/Source/FomApi.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/FomConfig.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/FomHexDump.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/FomIdTables.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/FomInspect.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/FomSchema.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/FomRakParse.cpp
    ${PACKET_INSPECTOR_ROOT}/Source/RakNetStubs.cpp
)

target_include_directories(PacketInspector PRIVATE
    ${PACKET_INSPECTOR_ROOT}/Include
    ${RAKNET_ROOT}/include
)

target_compile_definitions(PacketInspector PRIVATE FOM_PI_EXPORTS)

if (WIN32)
    target_link_libraries(PacketInspector PRIVATE ws2_32)
endif()

set(PI_PLATFORM_DIR "")
if (MSVC)
    if (CMAKE_VS_PLATFORM_NAME)
        set(PI_PLATFORM_DIR ${CMAKE_VS_PLATFORM_NAME})
    elseif (CMAKE_SIZEOF_VOID_P EQUAL 8)
        set(PI_PLATFORM_DIR x64)
    else()
        set(PI_PLATFORM_DIR Win32)
    endif()
else()
    if (CMAKE_SIZEOF_VOID_P EQUAL 8)
        set(PI_PLATFORM_DIR x64)
    else()
        set(PI_PLATFORM_DIR x86)
    endif()
endif()

# Output to Build/<platform>/ by default
set(PI_OUTPUT_DIR ${PACKET_INSPECTOR_ROOT}/Build/${PI_PLATFORM_DIR})
set_target_properties(PacketInspector PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${PI_OUTPUT_DIR}
    LIBRARY_OUTPUT_DIRECTORY ${PI_OUTPUT_DIR}
    ARCHIVE_OUTPUT_DIRECTORY ${PI_OUTPUT_DIR}
)
