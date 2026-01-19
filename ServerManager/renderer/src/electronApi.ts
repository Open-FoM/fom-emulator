/**
 * IPC helpers for the renderer to call Electron main process.
 */
export type LaunchKind = 'master' | 'world';

export type LaunchRequest = {
  kind: LaunchKind;
  env?: Record<string, string>;
};

type IpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
};

type ElectronWindow = Window & { require?: (module: string) => { ipcRenderer: IpcRenderer } };

/**
 * Resolve the Electron ipcRenderer handle when available.
 * @returns ipcRenderer or null when unavailable.
 */
function getIpcRenderer() {
  const electron = (window as ElectronWindow).require?.('electron');
  return electron?.ipcRenderer ?? null;
}

/**
 * Request a server launch via IPC.
 * @param request - Launch request payload.
 * @returns Launch response.
 */
export function invokeLaunch(request: LaunchRequest) {
  const ipc = getIpcRenderer();
  if (!ipc) {
    return Promise.resolve({ ok: false, error: 'IPC unavailable' });
  }
  return ipc.invoke('server:launch', request) as Promise<{ ok: boolean; pid?: number; error?: string }>;
}

/**
 * Load profiles from disk via IPC.
 * @returns Raw profile list.
 */
export function loadDiskProfiles() {
  const ipc = getIpcRenderer();
  if (!ipc) {
    return Promise.resolve([] as unknown[]);
  }
  return ipc.invoke('profiles:load') as Promise<unknown[]>;
}

/**
 * Read a log tail chunk via IPC.
 * @param request - Tail request parameters.
 * @returns Tail response.
 */
export function readLogTail(request: { serverType: LaunchKind; logFileName: string; offset: number; maxBytes?: number }) {
  const ipc = getIpcRenderer();
  if (!ipc) {
    return Promise.resolve({ ok: false, error: 'IPC unavailable', offset: 0, data: '' });
  }
  return ipc.invoke('logs:tail', request) as Promise<{ ok: boolean; data: string; offset: number; missing?: boolean; error?: string }>;
}
