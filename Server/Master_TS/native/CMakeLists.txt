cmake_minimum_required(VERSION 3.16)
project(RakNetFFI VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# RakNet 3.611 source directory (exact version used by FoM)
# native/ is nested under Server/Master_TS, so we need to go up three levels.
set(RAKNET_SRC_DIR "${CMAKE_SOURCE_DIR}/../../../External/raknet/src")
set(RAKNET_INC_DIR "${CMAKE_SOURCE_DIR}/../../../External/raknet/include")

# Collect RakNet sources
file(GLOB RAKNET_SOURCES "${RAKNET_SRC_DIR}/*.cpp")
file(GLOB RAKNET_HEADERS "${RAKNET_INC_DIR}/raknet/*.h")

# FFI wrapper sources
set(FFI_SOURCES
    raknet_ffi.cpp
    raknet_ffi.h
)

# Create shared library (DLL on Windows, .so on Linux)
add_library(RakNetFFI SHARED
    ${FFI_SOURCES}
    ${RAKNET_SOURCES}
)

# Include directories
target_include_directories(RakNetFFI PRIVATE
    ${RAKNET_INC_DIR}
    ${RAKNET_INC_DIR}/raknet
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Windows-specific settings
if(WIN32)
    target_compile_definitions(RakNetFFI PRIVATE
        _WIN32
        WIN32
        _WINDOWS
        RAKNET_FFI_EXPORTS
        _CRT_SECURE_NO_WARNINGS
        _WINSOCK_DEPRECATED_NO_WARNINGS
    )
    
    # Link Windows networking libraries
    target_link_libraries(RakNetFFI PRIVATE
        ws2_32
        winmm
    )
    
    # Set output name (raknet_ffi.dll)
    set_target_properties(RakNetFFI PROPERTIES
        OUTPUT_NAME "raknet_ffi"
        PREFIX ""
    )
endif()

# Linux-specific settings
if(UNIX AND NOT APPLE)
    target_compile_definitions(RakNetFFI PRIVATE
        _LINUX
        RAKNET_FFI_EXPORTS
    )
    
    target_link_libraries(RakNetFFI PRIVATE
        pthread
    )
    
    set_target_properties(RakNetFFI PROPERTIES
        OUTPUT_NAME "raknet_ffi"
        PREFIX "lib"
    )
endif()

# macOS-specific settings
if(APPLE)
    target_compile_definitions(RakNetFFI PRIVATE
        __APPLE__
        RAKNET_FFI_EXPORTS
    )
    
    target_link_libraries(RakNetFFI PRIVATE
        pthread
    )
    
    set_target_properties(RakNetFFI PROPERTIES
        OUTPUT_NAME "raknet_ffi"
        PREFIX "lib"
    )
endif()

# Export symbols for shared library
set_target_properties(RakNetFFI PROPERTIES
    CXX_VISIBILITY_PRESET hidden
    VISIBILITY_INLINES_HIDDEN ON
)

# Install targets
install(TARGETS RakNetFFI
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

install(FILES raknet_ffi.h
    DESTINATION include
)

# Copy DLL to Server directory after build
add_custom_command(TARGET RakNetFFI POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:RakNetFFI> "${CMAKE_SOURCE_DIR}/"
    COMMENT "Copying ${CMAKE_SHARED_LIBRARY_PREFIX}raknet_ffi${CMAKE_SHARED_LIBRARY_SUFFIX} to Server/Master_TS/"
)

message(STATUS "RakNet FFI wrapper configured (RakNet 3.611 - FoM exact version)")
message(STATUS "  RakNet source dir: ${RAKNET_SRC_DIR}")
message(STATUS "  RakNet include dir: ${RAKNET_INC_DIR}")
message(STATUS "  Output: ${CMAKE_SHARED_LIBRARY_PREFIX}raknet_ffi${CMAKE_SHARED_LIBRARY_SUFFIX}")
