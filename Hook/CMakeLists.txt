cmake_minimum_required(VERSION 3.20)
project(FoMHook LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_SUPPRESS_REGENERATION ON)

if(MSVC)
    cmake_policy(SET CMP0091 NEW)
    set(CMAKE_CONFIGURATION_TYPES "Development;Release" CACHE STRING "" FORCE)
    set(CMAKE_C_FLAGS_DEVELOPMENT "/O2 /Zi /DNDEBUG")
    set(CMAKE_CXX_FLAGS_DEVELOPMENT "/O2 /Zi /DNDEBUG")
    set(CMAKE_SHARED_LINKER_FLAGS_DEVELOPMENT "/DEBUG")
endif()

set(THIRDPARTY_DIR ${CMAKE_CURRENT_SOURCE_DIR}/ThirdParty)
set(IMGUI_DIR ${THIRDPARTY_DIR}/imgui)
set(SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/Source)
set(OUTPUT_ROOT ${CMAKE_CURRENT_SOURCE_DIR}/..)

file(GLOB_RECURSE SOURCE_CPP CONFIGURE_DEPENDS
    "${SOURCE_DIR}/*.cpp"
    "${SOURCE_DIR}/*.c"
)
file(GLOB_RECURSE SOURCE_HEADERS CONFIGURE_DEPENDS
    "${SOURCE_DIR}/*.h"
    "${SOURCE_DIR}/*.hpp"
)
set(EXCLUDED_SOURCES
    ${SOURCE_DIR}/HookNetwork.cpp
    ${SOURCE_DIR}/HookSharedMem.cpp
    ${SOURCE_DIR}/HookWinsock.cpp
    ${SOURCE_DIR}/FoMInjector/Injector.cpp
    ${SOURCE_DIR}/FoMInjector/Injector.h
    ${SOURCE_DIR}/ProxyD3D9/D3D9Proxy.cpp
    ${SOURCE_DIR}/ProxyDInput8/DInput8Proxy.cpp
)
list(REMOVE_ITEM SOURCE_CPP ${EXCLUDED_SOURCES})
set(IMGUI_SOURCES
    ${IMGUI_DIR}/imgui.cpp
    ${IMGUI_DIR}/imgui_draw.cpp
    ${IMGUI_DIR}/imgui_tables.cpp
    ${IMGUI_DIR}/imgui_widgets.cpp
    ${IMGUI_DIR}/imgui_demo.cpp
    ${IMGUI_DIR}/backends/imgui_impl_win32.cpp
    ${IMGUI_DIR}/backends/imgui_impl_dx9.cpp
)

set(DINPUT8_DEF ${SOURCE_DIR}/ProxyDInput8/DInput8Proxy.def)

add_library(FoMHook SHARED
    ${SOURCE_CPP}
    ${SOURCE_HEADERS}
    ${IMGUI_SOURCES}
    ${SOURCE_DIR}/ProxyDInput8/DInput8Proxy.cpp
    ${DINPUT8_DEF}
)
target_compile_definitions(FoMHook PRIVATE FOM_PROXY WIN32_LEAN_AND_MEAN NOMINMAX)
target_include_directories(FoMHook PRIVATE
    ${SOURCE_DIR}
    ${IMGUI_DIR}
    ${IMGUI_DIR}/backends
)
target_link_libraries(FoMHook PRIVATE ws2_32 d3d9)
target_link_options(FoMHook PRIVATE "/DEF:${DINPUT8_DEF}")
set_property(TARGET FoMHook PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded")
set_target_properties(FoMHook PROPERTIES OUTPUT_NAME "dinput8")
add_custom_command(TARGET FoMHook POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:FoMHook>" "${OUTPUT_ROOT}/dinput8.dll"
)
