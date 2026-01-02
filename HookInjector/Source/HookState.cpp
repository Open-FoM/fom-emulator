/** Shared hook configuration and global state. */
#include "HookState.h"

FHookConfig GConfig;

uint64_t GRecvBytes = 0;
uint64_t GSendBytes = 0;
uint64_t GRecvCount = 0;
uint64_t GSendCount = 0;
int GLastRecv = 0;
int GLastSend = 0;
uint8_t* GExeBase = nullptr;
IDirect3DDevice9* GD3D9Device = nullptr;
