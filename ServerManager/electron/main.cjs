/**
 * Electron main process entrypoint for Server Manager.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const repoRoot = path.resolve(__dirname, '../..');
const resourcesRoot = path.resolve(__dirname, '../resources');
const iconCandidates = [
  path.join(resourcesRoot, 'logo.ico'),
  path.join(resourcesRoot, 'logo.png'),
  path.join(resourcesRoot, 'logo.jpg'),
  path.join(__dirname, '../logo.jpg')
];
const appIconPath = iconCandidates.find((candidate) => fs.existsSync(candidate));

const serverRoot = path.join(repoRoot, 'Server');
const profileDir = path.join(__dirname, '../server_profiles');
const MAX_LOG_READ_BYTES = 1024 * 1024;

console.log('[Main] Paths', { repoRoot, serverRoot, profileDir });

/**
 * Resolve bun executable path with a user-profile fallback.
 * @returns {string} Bun executable path or fallback command.
 */
function resolveBunExe() {
  const home = process.env.USERPROFILE;
  if (home) {
    const candidate = path.join(home, '.bun', 'bin', 'bun.exe');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'bun';
}

/**
 * Resolve the Windows shell (cmd.exe) path.
 * @returns {string} Path to cmd.exe.
 */
function resolveComspec() {
  if (process.env.ComSpec && fs.existsSync(process.env.ComSpec)) {
    return process.env.ComSpec;
  }
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const candidate = path.join(systemRoot, 'System32', 'cmd.exe');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return path.join('C:\\Windows', 'System32', 'cmd.exe');
}

/**
 * Resolve the PowerShell executable path.
 * @returns {string} Path to PowerShell executable.
 */
function resolvePowerShell() {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const candidate = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return 'powershell.exe';
}

/**
 * Kill any process listening on a UDP port.
 * @param {string | number} port - UDP port.
 * @returns {Promise<void>} Resolves when cleanup finishes.
 */
function killUdpPort(port) {
  return new Promise((resolve) => {
    if (!port) return resolve();
    const psCommand = `$udpPids=Get-NetUDPEndpoint -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if($udpPids){foreach($procId in $udpPids){Write-Host ('[Server] Closing UDP ${port} (PID ' + $procId + ')...'); Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue}} else {Write-Host ('[Server] No UDP listeners on ${port}.')}`;
    const ps = spawn(resolvePowerShell(), ['-NoProfile', '-Command', psCommand], {
      windowsHide: true,
      stdio: 'ignore'
    });
    ps.on('close', () => resolve());
    ps.on('error', () => resolve());
  });
}

/**
 * Ensure server dependencies are installed.
 * @param {string} bunExe - Bun executable path.
 * @returns {Promise<boolean>} True when dependencies are present or installed.
 */
function ensureServerDeps(bunExe) {
  return new Promise((resolve) => {
    const nodeModules = path.join(serverRoot, 'node_modules');
    if (fs.existsSync(nodeModules)) return resolve(true);
    const child = spawn(bunExe, ['install'], {
      cwd: serverRoot,
      windowsHide: true,
      stdio: 'ignore'
    });
    child.on('close', () => resolve(true));
    child.on('error', () => resolve(false));
  });
}

/**
 * Spawn a master or world server process via bun.
 * @param {'master' | 'world'} kind - Server kind.
 * @param {string} bunExe - Bun executable path.
 * @param {Record<string, string>} env - Environment overrides.
 * @returns {import('node:child_process').ChildProcess} Spawned process handle.
 */
function startServerProcess(kind, bunExe, env) {
  const appPath = kind === 'world' ? 'apps\\world' : 'apps\\master';
  const args = [
    '/k',
    bunExe,
    'run',
    '--cwd',
    appPath,
    'start'
  ];
  const comspec = resolveComspec();
  console.log('[Main] Spawn cmd', { comspec, args, serverRoot });
  const child = spawn(comspec, args, {
    cwd: serverRoot,
    env: { ...process.env, ...env },
    windowsHide: false,
    stdio: 'ignore',
    detached: true
  });
  child.unref();
  return child;
}

ipcMain.handle('server:launch', async (_event, payload) => {
  const kind = payload?.kind === 'world' ? 'world' : 'master';
  const env = payload?.env && typeof payload.env === 'object' ? payload.env : {};
  const bunExe = resolveBunExe();
  const port = env.PORT || (kind === 'world' ? '62000' : '61000');

  try {
    console.log('[Main] Launch request', { kind, port, bunExe, serverRoot });
    await ensureServerDeps(bunExe);
    await killUdpPort(port);
    console.log('[Main] killUdpPort done');
    const child = startServerProcess(kind, bunExe, env);
    console.log('[Main] startServerProcess ok', { pid: child?.pid });
    return { ok: true, pid: child.pid };
  } catch (err) {
    console.error('[Main] Launch failed', err);
    return { ok: false, error: err?.message || String(err) };
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Main] Unhandled rejection:', err);
});

ipcMain.handle('profiles:load', () => {
  try {
    if (!fs.existsSync(profileDir)) return [];
    const files = fs.readdirSync(profileDir).filter((file) => file.toLowerCase().endsWith('.json'));
    const profiles = [];
    for (const file of files) {
      const filePath = path.join(profileDir, file);
      let raw = null;
      try {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        continue;
      }
      const items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.profiles) ? raw.profiles : [raw]);
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const baseName = path.basename(file, '.json');
        const id = item.id || item.name || baseName;
        const name = item.name || item.id || baseName;
        profiles.push({
          ...item,
          id,
          name,
          source: 'disk'
        });
      }
    }
    return profiles;
  } catch {
    return [];
  }
});

ipcMain.handle('logs:tail', (_event, payload) => {
  try {
    const kind = payload?.serverType === 'world' ? 'world' : 'master';
    const fileName = (payload?.logFileName || 'fom_server.log').toString();
    const offset = Number.isFinite(Number(payload?.offset)) ? Number(payload.offset) : 0;
    const maxBytes = Number.isFinite(Number(payload?.maxBytes)) ? Math.max(1024, Number(payload.maxBytes)) : MAX_LOG_READ_BYTES;
    const logPath = path.join(serverRoot, 'apps', kind, 'logs', fileName);
    if (!fs.existsSync(logPath)) {
      return { ok: false, missing: true, offset: 0, data: '' };
    }
    const stats = fs.statSync(logPath);
    const fileSize = stats.size;
    const start = fileSize < offset ? 0 : offset;
    const available = fileSize - start;
    if (available <= 0) {
      return { ok: true, offset: fileSize, data: '' };
    }
    const length = Math.min(available, maxBytes);
    const fd = fs.openSync(logPath, 'r');
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, start);
    fs.closeSync(fd);
    return { ok: true, offset: start + length, data: buffer.toString('utf8') };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), offset: 0, data: '' };
  }
});

/**
 * Create the main application window.
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0f1117',
    title: 'Open-FoM Server Manager',
    icon: appIconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
