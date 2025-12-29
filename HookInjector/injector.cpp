#include <windows.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static void Usage() {
    printf("Usage:\n");
    printf("  injector.exe --launch <exe_path> [args...]\n");
    printf("  injector.exe --pid <pid>\n");
    printf("  injector.exe <exe_path> [args...] (defaults to --launch)\n");
}

static bool InjectDll(HANDLE hProcess, const char* dllPath) {
    size_t len = strlen(dllPath) + 1;
    void* remote = VirtualAllocEx(hProcess, nullptr, len, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!remote) {
        return false;
    }
    SIZE_T wrote = 0;
    if (!WriteProcessMemory(hProcess, remote, dllPath, len, &wrote) || wrote != len) {
        VirtualFreeEx(hProcess, remote, 0, MEM_RELEASE);
        return false;
    }
    HMODULE k32 = GetModuleHandleA("kernel32.dll");
    FARPROC loadlib = GetProcAddress(k32, "LoadLibraryA");
    if (!loadlib) {
        VirtualFreeEx(hProcess, remote, 0, MEM_RELEASE);
        return false;
    }
    HANDLE hThread = CreateRemoteThread(hProcess, nullptr, 0,
                                        reinterpret_cast<LPTHREAD_START_ROUTINE>(loadlib),
                                        remote, 0, nullptr);
    if (!hThread) {
        VirtualFreeEx(hProcess, remote, 0, MEM_RELEASE);
        return false;
    }
    WaitForSingleObject(hThread, 5000);
    CloseHandle(hThread);
    VirtualFreeEx(hProcess, remote, 0, MEM_RELEASE);
    return true;
}

static bool GetDefaultDllPath(char* outPath, size_t cap) {
    char self[MAX_PATH] = {0};
    DWORD len = GetModuleFileNameA(nullptr, self, MAX_PATH);
    if (len == 0 || len >= MAX_PATH) {
        return false;
    }
    char* slash = strrchr(self, '\\');
    if (!slash) {
        return false;
    }
    slash[1] = '\0';
    snprintf(outPath, cap, "%sfom_hook.dll", self);
    return true;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        Usage();
        return 1;
    }

    char dllPath[MAX_PATH] = {0};
    if (!GetDefaultDllPath(dllPath, sizeof(dllPath))) {
        printf("Failed to resolve fom_hook.dll path\n");
        return 1;
    }

    if (strcmp(argv[1], "--pid") == 0) {
        if (argc < 3) {
            Usage();
            return 1;
        }
        DWORD pid = strtoul(argv[2], nullptr, 10);
        HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
        if (!hProcess) {
            printf("OpenProcess failed (%lu)\n", GetLastError());
            return 1;
        }
        bool ok = InjectDll(hProcess, dllPath);
        CloseHandle(hProcess);
        printf(ok ? "Injected.\n" : "Injection failed.\n");
        return ok ? 0 : 1;
    }

    const char* exePath = nullptr;
    int argStart = 1;
    if (strcmp(argv[1], "--launch") == 0) {
        if (argc < 3) {
            Usage();
            return 1;
        }
        exePath = argv[2];
        argStart = 3;
    } else {
        exePath = argv[1];
        argStart = 2;
    }

    char cmdLine[4096] = {0};
    snprintf(cmdLine, sizeof(cmdLine), "\"%s\"", exePath);
    for (int i = argStart; i < argc; ++i) {
        strcat_s(cmdLine, sizeof(cmdLine), " ");
        strcat_s(cmdLine, sizeof(cmdLine), argv[i]);
    }

    STARTUPINFOA si{};
    PROCESS_INFORMATION pi{};
    si.cb = sizeof(si);

    if (!CreateProcessA(nullptr, cmdLine, nullptr, nullptr, FALSE, CREATE_SUSPENDED, nullptr, nullptr, &si, &pi)) {
        printf("CreateProcess failed (%lu)\n", GetLastError());
        return 1;
    }

    bool ok = InjectDll(pi.hProcess, dllPath);
    if (!ok) {
        printf("Injection failed (%lu)\n", GetLastError());
    }

    ResumeThread(pi.hThread);
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    printf(ok ? "Launched + injected.\n" : "Launched, injection failed.\n");
    return ok ? 0 : 1;
}
