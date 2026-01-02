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
set(EXCLUDED_SOURCES
    ${SOURCE_DIR}/HookNetwork.cpp
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

set(D3D9_DEF ${SOURCE_DIR}/ProxyD3D9/D3D9Proxy.def)
set(DINPUT8_DEF ${SOURCE_DIR}/ProxyDInput8/DInput8Proxy.def)

add_library(FoMProxyD3D9 SHARED
    ${SOURCE_DIR}/ProxyD3D9/D3D9Proxy.cpp
    ${D3D9_DEF}
)
target_compile_definitions(FoMProxyD3D9 PRIVATE FOM_PROXY WIN32_LEAN_AND_MEAN NOMINMAX)
target_include_directories(FoMProxyD3D9 PRIVATE
    ${SOURCE_DIR}
)
target_link_options(FoMProxyD3D9 PRIVATE "/DEF:${D3D9_DEF}")
set_property(TARGET FoMProxyD3D9 PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded")
set_target_properties(FoMProxyD3D9 PROPERTIES OUTPUT_NAME "d3d9")
add_custom_command(TARGET FoMProxyD3D9 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:FoMProxyD3D9>" "${OUTPUT_ROOT}/d3d9.dll"
)

add_library(FoMProxyDInput8 SHARED
    ${SOURCE_CPP}
    ${IMGUI_SOURCES}
    ${SOURCE_DIR}/ProxyDInput8/DInput8Proxy.cpp
    ${DINPUT8_DEF}
)
target_compile_definitions(FoMProxyDInput8 PRIVATE FOM_PROXY WIN32_LEAN_AND_MEAN NOMINMAX)
target_include_directories(FoMProxyDInput8 PRIVATE
    ${SOURCE_DIR}
    ${IMGUI_DIR}
    ${IMGUI_DIR}/backends
)
target_link_libraries(FoMProxyDInput8 PRIVATE ws2_32 d3d9)
target_link_options(FoMProxyDInput8 PRIVATE "/DEF:${DINPUT8_DEF}")
set_property(TARGET FoMProxyDInput8 PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded")
set_target_properties(FoMProxyDInput8 PROPERTIES OUTPUT_NAME "dinput8")
add_custom_command(TARGET FoMProxyDInput8 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:FoMProxyDInput8>" "${OUTPUT_ROOT}/dinput8.dll"
)
