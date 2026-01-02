/** Simple DLL injector entry point. */
#include "Injector.h"

#include <shellapi.h>
#include <string>
#include <vector>

static void LogLine(const char* Message)
{
    OutputDebugStringA(Message);
    OutputDebugStringA("\n");
}

static std::wstring QuoteArg(const std::wstring& Arg)
{
    if (Arg.empty())
    {
        return L"\"\"";
    }
    bool NeedsQuotes = false;
    for (wchar_t Ch : Arg)
    {
        if (Ch == L' ' || Ch == L'\t' || Ch == L'"')
        {
            NeedsQuotes = true;
            break;
        }
    }
    if (!NeedsQuotes)
    {
        return Arg;
    }
    std::wstring Out = L"\"";
    for (wchar_t Ch : Arg)
    {
        if (Ch == L'"')
        {
            Out += L"\\\"";
        }
        else
        {
            Out += Ch;
        }
    }
    Out += L"\"";
    return Out;
}

static bool GetDirectoryFromPath(const std::wstring& Path, std::wstring& OutDir)
{
    size_t Pos = Path.find_last_of(L"\\/");
    if (Pos == std::wstring::npos)
    {
        return false;
    }
    OutDir = Path.substr(0, Pos);
    return true;
}

static bool GetFullPath(const std::wstring& InPath, std::wstring& OutPath)
{
    wchar_t Buffer[MAX_PATH] = {0};
    DWORD Len = GetFullPathNameW(InPath.c_str(), MAX_PATH, Buffer, nullptr);
    if (Len == 0 || Len >= MAX_PATH)
    {
        return false;
    }
    OutPath.assign(Buffer);
    return true;
}

static bool InjectDll(HANDLE Process, const std::wstring& DllPath)
{
    if (!Process || DllPath.empty())
    {
        return false;
    }
    const size_t Bytes = (DllPath.size() + 1) * sizeof(wchar_t);
    void* Remote = VirtualAllocEx(Process, nullptr, Bytes, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!Remote)
    {
        LogLine("[injector] VirtualAllocEx failed");
        return false;
    }
    if (!WriteProcessMemory(Process, Remote, DllPath.c_str(), Bytes, nullptr))
    {
        LogLine("[injector] WriteProcessMemory failed");
        VirtualFreeEx(Process, Remote, 0, MEM_RELEASE);
        return false;
    }
    HMODULE Kernel32 = GetModuleHandleA("kernel32.dll");
    FARPROC LoadLibraryWFn = Kernel32 ? GetProcAddress(Kernel32, "LoadLibraryW") : nullptr;
    if (!LoadLibraryWFn)
    {
        LogLine("[injector] GetProcAddress(LoadLibraryW) failed");
        VirtualFreeEx(Process, Remote, 0, MEM_RELEASE);
        return false;
    }
    HANDLE Thread = CreateRemoteThread(Process, nullptr, 0,
        reinterpret_cast<LPTHREAD_START_ROUTINE>(LoadLibraryWFn), Remote, 0, nullptr);
    if (!Thread)
    {
        LogLine("[injector] CreateRemoteThread failed");
        VirtualFreeEx(Process, Remote, 0, MEM_RELEASE);
        return false;
    }
    WaitForSingleObject(Thread, INFINITE);
    DWORD ExitCode = 0;
    GetExitCodeThread(Thread, &ExitCode);
    CloseHandle(Thread);
    VirtualFreeEx(Process, Remote, 0, MEM_RELEASE);
    return ExitCode != 0;
}

static int ShowUsage()
{
    MessageBoxA(nullptr,
        "Usage: injector.exe --launch <fom_client.exe> [args...]\n"
        "Optional: --dll <path-to-fom_hook.dll>",
        "FoM Hook Injector",
        MB_OK | MB_ICONINFORMATION);
    return 1;
}

int WINAPI WinMain(HINSTANCE Instance, HINSTANCE PrevInstance, LPSTR CmdLine, int ShowCmd)
{
    (void)Instance;
    (void)PrevInstance;
    (void)CmdLine;
    (void)ShowCmd;

    int Argc = 0;
    LPWSTR* Argv = CommandLineToArgvW(GetCommandLineW(), &Argc);
    if (!Argv || Argc < 2)
    {
        return ShowUsage();
    }

    std::wstring TargetPath;
    std::wstring DllPath;
    std::vector<std::wstring> ForwardArgs;

    for (int Index = 1; Index < Argc; ++Index)
    {
        const std::wstring Arg = Argv[Index];
        if (Arg == L"--launch" && Index + 1 < Argc)
        {
            TargetPath = Argv[++Index];
            continue;
        }
        if (Arg == L"--dll" && Index + 1 < Argc)
        {
            DllPath = Argv[++Index];
            continue;
        }
        ForwardArgs.push_back(Arg);
    }
    LocalFree(Argv);

    if (TargetPath.empty())
    {
        return ShowUsage();
    }

    std::wstring FullTarget;
    if (!GetFullPath(TargetPath, FullTarget))
    {
        MessageBoxA(nullptr, "Failed to resolve target path.", "FoM Hook Injector", MB_OK | MB_ICONERROR);
        return 2;
    }
    std::wstring WorkingDir;
    if (!GetDirectoryFromPath(FullTarget, WorkingDir))
    {
        MessageBoxA(nullptr, "Failed to resolve target directory.", "FoM Hook Injector", MB_OK | MB_ICONERROR);
        return 3;
    }

    if (DllPath.empty())
    {
        wchar_t ModulePath[MAX_PATH] = {0};
        GetModuleFileNameW(nullptr, ModulePath, MAX_PATH);
        std::wstring InjectorPath(ModulePath);
        std::wstring InjectorDir;
        if (GetDirectoryFromPath(InjectorPath, InjectorDir))
        {
            DllPath = InjectorDir + L"\\fom_hook.dll";
        }
        else
        {
            DllPath = L"fom_hook.dll";
        }
    }

    std::wstring FullDll;
    if (!GetFullPath(DllPath, FullDll))
    {
        MessageBoxA(nullptr, "Failed to resolve DLL path.", "FoM Hook Injector", MB_OK | MB_ICONERROR);
        return 4;
    }

    std::wstring CmdLineFull = QuoteArg(FullTarget);
    for (const auto& Arg : ForwardArgs)
    {
        CmdLineFull.append(L" ");
        CmdLineFull.append(QuoteArg(Arg));
    }

    STARTUPINFOW StartupInfo{};
    StartupInfo.cb = sizeof(StartupInfo);
    PROCESS_INFORMATION ProcessInfo{};
    std::wstring MutableCmd = CmdLineFull;
    BOOL Created = CreateProcessW(
        FullTarget.c_str(),
        MutableCmd.data(),
        nullptr,
        nullptr,
        FALSE,
        CREATE_SUSPENDED,
        nullptr,
        WorkingDir.c_str(),
        &StartupInfo,
        &ProcessInfo);
    if (!Created)
    {
        MessageBoxA(nullptr, "CreateProcess failed.", "FoM Hook Injector", MB_OK | MB_ICONERROR);
        return 5;
    }

    if (!InjectDll(ProcessInfo.hProcess, FullDll))
    {
        TerminateProcess(ProcessInfo.hProcess, 1);
        CloseHandle(ProcessInfo.hThread);
        CloseHandle(ProcessInfo.hProcess);
        MessageBoxA(nullptr, "DLL injection failed.", "FoM Hook Injector", MB_OK | MB_ICONERROR);
        return 6;
    }

    ResumeThread(ProcessInfo.hThread);
    CloseHandle(ProcessInfo.hThread);
    CloseHandle(ProcessInfo.hProcess);
    return 0;
}
