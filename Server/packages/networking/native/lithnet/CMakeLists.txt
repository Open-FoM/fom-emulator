cmake_minimum_required(VERSION 3.16)
project(LithNetFFI VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(FFI_SOURCES
    lithnet_ffi.cpp
    lithnet_ffi.h
)

add_library(LithNetFFI SHARED ${FFI_SOURCES})

target_include_directories(LithNetFFI PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

if(WIN32)
    target_compile_definitions(LithNetFFI PRIVATE
        _WIN32
        WIN32
        _WINDOWS
        LITHNET_FFI_EXPORTS
        _CRT_SECURE_NO_WARNINGS
    )
    
    set_target_properties(LithNetFFI PROPERTIES
        OUTPUT_NAME "lithnet_ffi"
        PREFIX ""
    )
endif()

if(UNIX AND NOT APPLE)
    target_compile_definitions(LithNetFFI PRIVATE
        _LINUX
        LITHNET_FFI_EXPORTS
    )
    
    set_target_properties(LithNetFFI PROPERTIES
        OUTPUT_NAME "lithnet_ffi"
        PREFIX ""
    )
endif()

if(APPLE)
    target_compile_definitions(LithNetFFI PRIVATE
        __APPLE__
        LITHNET_FFI_EXPORTS
    )
    
    target_compile_options(LithNetFFI PRIVATE
        -Wno-c++11-narrowing
        -Wno-error
    )
    
    set_target_properties(LithNetFFI PROPERTIES
        OUTPUT_NAME "lithnet_ffi"
        PREFIX ""
    )
endif()

set_target_properties(LithNetFFI PROPERTIES
    CXX_VISIBILITY_PRESET hidden
    VISIBILITY_INLINES_HIDDEN ON
)

install(TARGETS LithNetFFI
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

install(FILES lithnet_ffi.h
    DESTINATION include
)

add_custom_command(TARGET LithNetFFI POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:LithNetFFI> "${CMAKE_SOURCE_DIR}/"
    COMMENT "Copying ${CMAKE_SHARED_LIBRARY_PREFIX}lithnet_ffi${CMAKE_SHARED_LIBRARY_SUFFIX} to lithnet/"
)

message(STATUS "LithNet FFI wrapper configured (LithTech-compatible packet read/write)")
message(STATUS "  Output: ${CMAKE_SHARED_LIBRARY_PREFIX}lithnet_ffi${CMAKE_SHARED_LIBRARY_SUFFIX}")
