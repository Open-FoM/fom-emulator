cmake_minimum_required(VERSION 3.20)
project(FoMHookInjector LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(IMGUI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/imgui)

add_library(fom_hook SHARED
    fom_hook.cpp
    ${IMGUI_DIR}/imgui.cpp
    ${IMGUI_DIR}/imgui_draw.cpp
    ${IMGUI_DIR}/imgui_tables.cpp
    ${IMGUI_DIR}/imgui_widgets.cpp
    ${IMGUI_DIR}/imgui_demo.cpp
    ${IMGUI_DIR}/backends/imgui_impl_win32.cpp
    ${IMGUI_DIR}/backends/imgui_impl_dx9.cpp
)
target_compile_definitions(fom_hook PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX)
target_include_directories(fom_hook PRIVATE
    ${IMGUI_DIR}
    ${IMGUI_DIR}/backends
)
target_link_libraries(fom_hook PRIVATE ws2_32 d3d9)
set_target_properties(fom_hook PROPERTIES OUTPUT_NAME "fom_hook")

add_executable(injector
    injector.cpp
)
target_compile_definitions(injector PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX)
