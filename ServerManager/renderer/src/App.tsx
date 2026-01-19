/**
 * Server Manager renderer UI.
 * Handles profile management, admin connections, telemetry, and packet tooling.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invokeLaunch, loadDiskProfiles, readLogTail } from './electronApi';
import packetTemplates from './packetTemplates.json';

/**
 * Types.
 */
type ServerKind = 'master' | 'world';

type AdminInfo = {
  ok: boolean;
  server: ServerKind;
  pid: number;
  adminPort: number;
  serverPort?: number;
  worldId?: number;
  worldInst?: number;
  packetTypes?: string[];
  profileName?: string;
  connectionCount?: number;
};

type TelemetrySnapshot = {
  cpuPercent: number;
  rssMb: number;
  heapMb: number;
  uptimeSec: number;
};

type ConnectionItem = {
  id: string;
  key?: string;
  address?: string;
  state?: string;
  loginPhase?: string;
  username?: string;
  authenticated?: boolean;
  worldId?: number;
  worldInst?: number;
  playerId?: number;
  registered?: boolean;
  connectStage?: number;
  lastActivityMs?: number;
  connectedMs?: number;
};

type LogEntry = {
  level: 'log' | 'warn' | 'error';
  message: string;
  ts: number;
};

type WsMessage =
  | { type: 'auth_ok'; server: ServerKind; packetTypes?: string[] }
  | { type: 'auth_error'; message: string }
  | { type: 'connections'; items: ConnectionItem[] }
  | { type: 'subscribed'; intervalMs: number }
  | { type: 'log'; level: 'log' | 'warn' | 'error'; message: string; ts: number }
  | { type: 'logs'; items: LogEntry[] }
  | { type: 'metrics'; telemetry: TelemetrySnapshot }
  | { type: 'state'; telemetry: TelemetrySnapshot; connections: ConnectionItem[]; logs: LogEntry[] }
  | { type: 'send_result'; sent: number; failed: number; total: number }
  | { type: 'send_error'; message: string }
  | { type: 'world_servers_updated'; count: number }
  | { type: 'shutdown_ack' }
  | { type: 'error'; message: string };

type LaunchProfile = {
  id: string;
  name: string;
  serverType: ServerKind;
  port: string;
  adminPort: string;
  adminToken: string;
  serverIp: string;
  worldIp?: string;
  source?: 'disk' | 'local';
  envText: string;
  logFileName?: string;
};

type NavTab = 'dashboard' | 'settings';
type SubTab = 'dashboard' | 'console' | 'players' | 'packet';

/**
 * Constants.
 */
const PROFILE_STORAGE_KEY = 'servermanager.launchProfiles';
const DEFAULT_POLL_INTERVAL = 1200;
const DEFAULT_TOKEN = 'dev-admin-token';
const DEFAULT_DISCOVERY_TOKEN = 'dev-world-token';
const DEFAULT_REFRESH_INTERVAL = 3000;

const emptyParams = '{\n  \n}';

/**
 * Utilities.
 */
/**
 * Parse env text into a key/value map.
 * @param text - Raw env text (newline or comma delimited).
 * @returns Parsed env map.
 */
const parseEnvText = (text: string) => {
  const env: Record<string, string> = {};
  const entries = text.split(/[\n,]+/).map((line) => line.trim()).filter(Boolean);
  for (const entry of entries) {
    const idx = entry.indexOf('=');
    if (idx <= 0) continue;
    const key = entry.slice(0, idx).trim();
    const value = entry.slice(idx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
};

/**
 * Normalize a log file name and ensure .log suffix.
 * @param value - Raw log file name input.
 * @returns Normalized filename or empty string.
 */
const normalizeLogFileName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase().endsWith('.log') ? trimmed : `${trimmed}.log`;
};

/**
 * Upsert a LOG_FILE_NAME-like entry into env text.
 * @param text - Existing env text.
 * @param key - Env key to upsert.
 * @param value - Raw value to normalize and set.
 * @returns Updated env text.
 */
const upsertEnvLine = (text: string, key: string, value: string) => {
  const normalized = normalizeLogFileName(value);
  if (!normalized) return text;
  const lines = text.split(/\r?\n/);
  let found = false;
  const nextLines = lines.map((line) => {
    if (!line.trim()) return line;
    const idx = line.indexOf('=');
    if (idx === -1) return line;
    const k = line.slice(0, idx).trim();
    if (k.toUpperCase() !== key.toUpperCase()) return line;
    found = true;
    return `${key}=${normalized}`;
  });
  if (!found) nextLines.push(`${key}=${normalized}`);
  return nextLines.filter((line) => line !== undefined).join('\n').trim();
};

/**
 * Resolve the effective log file name for a profile.
 * @param profile - Launch profile or null.
 * @returns Normalized log filename.
 */
const resolveLogFileName = (profile: LaunchProfile | null) => {
  if (!profile) return 'fom_server.log';
  const env = parseEnvText(profile.envText || '');
  const base = env.LOG_FILE_NAME || profile.logFileName || `${profile.name}.log`;
  const normalized = normalizeLogFileName(base);
  return normalized || 'fom_server.log';
};

/**
 * Normalize a partial profile into a valid launch profile.
 * @param raw - Raw profile input.
 * @returns Normalized profile or null.
 */
function normalizeProfile(raw: Partial<LaunchProfile> & { kind?: ServerKind }): LaunchProfile | null {
  if (!raw.id || !raw.name) return null;
  const serverType = raw.serverType || raw.kind || 'master';
  return {
    id: raw.id,
    name: raw.name,
    serverType,
    port: raw.port || (serverType === 'world' ? '62000' : '61000'),
    adminPort: raw.adminPort || (serverType === 'world' ? '4702' : '4701'),
    adminToken: raw.adminToken || DEFAULT_TOKEN,
    serverIp: raw.serverIp || raw.worldIp || '127.0.0.1',
    envText: raw.envText || '',
    worldIp: raw.worldIp,
    source: raw.source,
    logFileName: raw.logFileName,
  };
}

/**
 * Format milliseconds into a compact display string.
 * @param value - Milliseconds since last activity.
 * @returns Human-friendly duration string.
 */
function formatMs(value?: number): string {
  if (value === undefined) return '-';
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem.toFixed(0)}s`;
}

/**
 * Format MB into a compact memory string.
 * @param value - Memory in MB.
 * @returns Human-friendly memory string.
 */
function formatMemory(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return '-';
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  return `${value.toFixed(0)} MB`;
}

/**
 * App component.
 */
function App() {
  /**
   * State.
   */
  const [navTab, setNavTab] = useState<NavTab>('dashboard');
  const [subTab, setSubTab] = useState<SubTab>('dashboard');

  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [pollInterval, setPollInterval] = useState(DEFAULT_POLL_INTERVAL);
  const [refreshInterval, setRefreshInterval] = useState(DEFAULT_REFRESH_INTERVAL);
  const [availableServers, setAvailableServers] = useState<AdminInfo[]>([]);
  const [attachedServer, setAttachedServer] = useState<AdminInfo | null>(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [attachSince, setAttachSince] = useState<number | null>(null);
  const [packetTypes, setPacketTypes] = useState<string[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [telemetryUpdatedAt, setTelemetryUpdatedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<{ cpu: number[]; ram: number[]; players: number[] }>({
    cpu: [],
    ram: [],
    players: [],
  });
  const [connectionCache, setConnectionCache] = useState<Record<string, ConnectionItem[]>>({});
  const [attachedKey, setAttachedKey] = useState<string | null>(null);
  const [consoleCache, setConsoleCache] = useState<Record<string, LogEntry[]>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [packetMode, setPacketMode] = useState<'builder' | 'raw'>('builder');
  const [packetName, setPacketName] = useState('');
  const [packetParams, setPacketParams] = useState(emptyParams);
  const [rawHex, setRawHex] = useState('');
  const [reliable, setReliable] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [actionStatusByProfile, setActionStatusByProfile] = useState<Record<string, { text: string; busy: boolean; id: number; kind: 'starting' | 'stopping' | 'online' | 'error' | 'info' }>>({});

  const [launchKind, setLaunchKind] = useState<ServerKind>('master');
  const [launchPort, setLaunchPort] = useState('61000');
  const [launchServerIp, setLaunchServerIp] = useState('127.0.0.1');
  const [launchAdminPort, setLaunchAdminPort] = useState('4701');
  const [launchAdminToken, setLaunchAdminToken] = useState(DEFAULT_TOKEN);
  const [launchEnvText, setLaunchEnvText] = useState('');
  const [launchLogFileName, setLaunchLogFileName] = useState('');

  const [profiles, setProfiles] = useState<LaunchProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState('');
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [profileName, setProfileName] = useState('');

  /**
   * Refs.
   */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const attachedKeyRef = useRef<string | null>(null);
  const attachedProfileIdRef = useRef<string | null>(null);
  const actionTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const worldServersKeyRef = useRef<string | null>(null);
  const logSeenRef = useRef<Record<string, { seen: Set<string>; queue: string[] }>>({});
  const traceEnabledRef = useRef<boolean>(localStorage.getItem('servermanager.trace') === '1');
  const logTailRef = useRef<Record<string, { offset: number; carry: string }>>({});
  const useFileLogsRef = useRef<boolean>(true);
  const lastPacketNameRef = useRef<string | null>(null);
  const serverSeenRef = useRef<Record<number, { info: AdminInfo; lastSeen: number }>>({});

  const packetTemplateMap = packetTemplates as Record<string, unknown>;
  /**
   * Debug trace logging gated by localStorage toggle.
   * @param args - Arbitrary trace payload.
   */
  const trace = useCallback((...args: unknown[]) => {
    if (!traceEnabledRef.current) return;
    console.debug('[ServerManager]', ...args);
  }, []);

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectionCount = selectedIds.size;
  const hasSelection = selectionCount > 0;

  const pollPorts = useMemo(() => {
    const ports = new Set<number>();
    for (const profile of profiles) {
      const port = Number(profile.adminPort);
      if (Number.isFinite(port)) ports.add(port);
    }
    return Array.from(ports);
  }, [profiles]);

  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === activeProfileId) || null, [profiles, activeProfileId]);
  const selectedProfiles = useMemo(
    () => profiles.filter((profile) => selectedProfileIds.has(profile.id)),
    [profiles, selectedProfileIds],
  );
  const isMultiSelect = selectedProfileIds.size > 1;
  /**
   * Resolve the active target profile list for actions.
   * @returns Target profile list.
   */
  const resolveTargetProfiles = useCallback(() => {
    if (selectedProfiles.length > 0) return selectedProfiles;
    return selectedProfile ? [selectedProfile] : [];
  }, [selectedProfiles, selectedProfile]);
  /**
   * Resolve a stable cache key for a running server.
   * @param info - Admin info snapshot.
   * @returns Key string or null.
   */
  const getServerKey = (info: AdminInfo | null) => {
    if (!info) return null;
    if (info.server === 'world' && Number.isFinite(info.worldId)) {
      return `w:${info.worldId}`;
    }
    const port = info.serverPort ?? info.adminPort;
    return `p:${port}`;
  };

  /**
   * Check whether a running server matches a launch profile.
   * @param info - Admin info snapshot.
   * @param profile - Profile to compare.
   * @returns True when profile and server align.
   */
  const matchesProfile = useCallback((info: AdminInfo | null, profile: LaunchProfile | null) => {
    if (!info || !profile) return false;
    if (info.profileName && info.profileName === profile.name) return true;
    if (info.server === 'world') {
      if (profile.serverType !== 'world') return false;
      if (Number.isFinite(info.worldId)) {
        const profileId = Number(profile.id);
        if (Number.isFinite(profileId) && info.worldId === profileId) return true;
      }
      const profilePort = Number(profile.port);
      if (Number.isFinite(profilePort) && info.serverPort === profilePort) return true;
      const profileAdminPort = Number(profile.adminPort);
      return Number.isFinite(profileAdminPort) && info.adminPort === profileAdminPort;
    }
    const profilePort = Number(profile.port);
    if (Number.isFinite(profilePort) && info.serverPort === profilePort) return true;
    const profileAdminPort = Number(profile.adminPort);
    return Number.isFinite(profileAdminPort) && info.adminPort === profileAdminPort;
  }, []);

  /**
   * Extract WORLD_ID from env text.
   * @param envText - Raw env text.
   * @returns Parsed world ID, if present.
   */
  const parseWorldIdFromEnvText = useCallback((envText?: string) => {
    if (!envText) return undefined;
    const match = envText.match(/^\s*WORLD_ID\s*=\s*(\d+)\s*$/m);
    return match ? Number.parseInt(match[1], 10) : undefined;
  }, []);

  /**
   * Resolve the profile ID used for action status display.
   * @returns Profile ID string or empty string.
   */
  const resolveActionProfileId = useCallback(() => {
    if (attachedServer) {
      const matched = profiles.find((profile) => matchesProfile(attachedServer, profile));
      if (matched) return matched.id;
    }
    return selectedProfile?.id || activeProfileId;
  }, [attachedServer, profiles, matchesProfile, selectedProfile, activeProfileId]);

  /**
   * Append log entries into the console cache with de-duplication.
   * @param entries - Log entries to append.
   * @param info - Optional server info for mapping.
   */
  const appendLogEntries = useCallback((entries: LogEntry[], info?: AdminInfo) => {
    if (!entries || entries.length === 0) return;
    if (!attachedProfileIdRef.current && info && profiles.length > 0) {
      const matched = profiles.find((profile) => matchesProfile(info, profile));
      if (matched) attachedProfileIdRef.current = matched.id;
    }
    const profileKey = attachedProfileIdRef.current || null;
    const serverKey = attachedKeyRef.current || null;
    if (!profileKey && !serverKey) return;

    setConsoleCache((prev) => {
      const nextCache: typeof prev = { ...prev };
      const updateKey = (key: string | null) => {
        if (!key) return;
        const bucket = logSeenRef.current[key] ?? { seen: new Set<string>(), queue: [] };
        logSeenRef.current[key] = bucket;
        const existing = nextCache[key] ?? [];
        let next = existing;
        for (const entry of entries) {
          const signature = `${entry.ts}|${entry.level}|${entry.message}`;
          if (bucket.seen.has(signature)) continue;
          bucket.seen.add(signature);
          bucket.queue.push(signature);
          if (bucket.queue.length > 800) {
            const oldest = bucket.queue.shift();
            if (oldest) bucket.seen.delete(oldest);
          }
          if (next === existing) next = [...existing, entry];
          else next = [...next, entry];
        }
        if (next !== existing) {
          nextCache[key] = next.length > 500 ? next.slice(-500) : next;
        }
      };

      updateKey(profileKey);
      if (serverKey && serverKey !== profileKey) updateKey(serverKey);
      return nextCache;
    });
    trace('logs:append', { count: entries.length, profileKey, serverKey });
  }, [profiles, matchesProfile, trace]);

  /**
   * Append file-based log lines into the console cache.
   * @param profileId - Profile identifier.
   * @param lines - Log lines to append.
   */
  const appendFileLogLines = useCallback((profileId: string, lines: string[]) => {
    if (!profileId || lines.length === 0) return;
    const now = Date.now();
    const entries = lines.map((line) => ({ level: 'log' as const, message: line, ts: now }));
    setConsoleCache((prev) => {
      const nextCache: typeof prev = { ...prev };
      const existing = nextCache[profileId] ?? [];
      const next = [...existing, ...entries];
      nextCache[profileId] = next.length > 500 ? next.slice(-500) : next;
      return nextCache;
    });
    trace('logs:file_append', { profileId, count: lines.length });
  }, [trace]);

  /**
   * Resolve world server endpoints from live admin telemetry.
   * @param servers - Available admin servers.
   * @returns World endpoint list.
   */
  const resolveWorldEndpoints = useCallback((servers: AdminInfo[]) => {
    const endpoints: Array<{ ip: string; port: number; worldId?: number }> = [];
    const seen = new Set<string>();
    for (const info of servers) {
      if (info.server !== 'world') continue;
      const profile = profiles.find((entry) => matchesProfile(info, entry));
      const ip = profile?.serverIp || profile?.worldIp || '127.0.0.1';
      const port = info.serverPort ?? Number(profile?.port);
      if (!ip || !Number.isFinite(port)) continue;
      const worldIdFallback = parseWorldIdFromEnvText(profile?.envText);
      const worldId = Number.isFinite(info.worldId) ? info.worldId : worldIdFallback;
      const entry = `${ip}:${port}`;
      if (seen.has(entry)) continue;
      seen.add(entry);
      endpoints.push({
        ip,
        port,
        worldId: Number.isFinite(worldId) ? worldId : undefined,
      });
    }
    return endpoints;
  }, [profiles, matchesProfile, parseWorldIdFromEnvText]);
  const orderedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const aId = Number.parseInt(a.id, 10);
      const bId = Number.parseInt(b.id, 10);
      const aVal = Number.isFinite(aId) ? aId : 9999;
      const bVal = Number.isFinite(bId) ? bId : 9999;
      if (aVal !== bVal) return aVal - bVal;
      return a.name.localeCompare(b.name);
    });
  }, [profiles]);

  /**
   * Build a world endpoint entry from a profile.
   * @param profile - Profile to derive from.
   * @returns World endpoint or null.
   */
  const buildWorldEntryFromProfile = useCallback((profile: LaunchProfile | null) => {
    if (!profile || profile.serverType !== 'world') return null;
    const ip = profile.serverIp || profile.worldIp || '127.0.0.1';
    const port = Number(profile.port);
    if (!ip || !Number.isFinite(port)) return null;
    const envWorldId = parseWorldIdFromEnvText(profile.envText);
    const idFallback = Number(profile.id);
    const worldId = Number.isFinite(envWorldId)
      ? envWorldId
      : (Number.isFinite(idFallback) ? idFallback : undefined);
    return {
      ip,
      port,
      worldId: Number.isFinite(worldId) ? worldId : undefined,
    };
  }, [parseWorldIdFromEnvText]);

  /**
   * Build a world endpoint entry from the launch form.
   * @returns World endpoint or null.
   */
  const buildWorldEntryFromForm = useCallback(() => {
    if (launchKind !== 'world') return null;
    const ip = launchServerIp || '127.0.0.1';
    const port = Number(launchPort);
    if (!ip || !Number.isFinite(port)) return null;
    const envWorldId = parseWorldIdFromEnvText(launchEnvText);
    const profileWorldId = Number(selectedProfile?.id);
    const worldId = Number.isFinite(envWorldId)
      ? envWorldId
      : (Number.isFinite(profileWorldId) ? profileWorldId : undefined);
    return {
      ip,
      port,
      worldId: Number.isFinite(worldId) ? worldId : undefined,
    };
  }, [launchKind, launchServerIp, launchPort, launchEnvText, selectedProfile, parseWorldIdFromEnvText]);

  /**
   * Merge world endpoint lists and preserve worldId when possible.
   * @param base - Base endpoint list.
   * @param extra - Extra endpoints to merge.
   * @returns Merged endpoint list.
   */
  const mergeWorldEndpoints = useCallback((
    base: Array<{ ip: string; port: number; worldId?: number }>,
    extra: Array<{ ip: string; port: number; worldId?: number }>,
  ) => {
    const merged = new Map<string, { ip: string; port: number; worldId?: number }>();
    for (const entry of base) {
      merged.set(`${entry.ip}:${entry.port}`, { ...entry });
    }
    for (const entry of extra) {
      const key = `${entry.ip}:${entry.port}`;
      const existing = merged.get(key);
      if (existing) {
        merged.set(key, { ...existing, worldId: entry.worldId ?? existing.worldId });
      } else {
        merged.set(key, { ...entry });
      }
    }
    return Array.from(merged.values());
  }, []);

  /**
   * Filter out world endpoints by ip/port.
   * @param base - Base endpoint list.
   * @param remove - Endpoints to remove.
   * @returns Filtered endpoint list.
   */
  const filterWorldEndpoints = useCallback((
    base: Array<{ ip: string; port: number; worldId?: number }>,
    remove: Array<{ ip: string; port: number }>,
  ) => {
    if (remove.length === 0) return base;
    const blocked = new Set(remove.map((entry) => `${entry.ip}:${entry.port}`));
    return base.filter((entry) => !blocked.has(`${entry.ip}:${entry.port}`));
  }, []);

  /**
   * Resolve master admin targets for world list updates.
   * @param servers - Available admin servers.
   * @returns Target list with admin ports and tokens.
   */
  const resolveMasterTargets = useCallback((servers: AdminInfo[]) => {
    const targets = new Map<number, string>();
    for (const info of servers) {
      if (info.server !== 'master') continue;
      const profile = profiles.find((entry) => matchesProfile(info, entry));
      const token = profile?.adminToken || DEFAULT_TOKEN;
      targets.set(info.adminPort, token);
    }
    if (targets.size === 0) {
      for (const profile of profiles) {
        if (profile.serverType !== 'master') continue;
        const port = Number(profile.adminPort);
        if (!Number.isFinite(port)) continue;
        targets.set(port, profile.adminToken || DEFAULT_TOKEN);
      }
    }
    return Array.from(targets.entries()).map(([adminPort, token]) => ({ adminPort, token }));
  }, [profiles, matchesProfile]);
  const runningServerForProfile = useMemo(() => {
    if (!selectedProfile) return null;
    return availableServers.find((server) => matchesProfile(server, selectedProfile)) || null;
  }, [availableServers, selectedProfile]);

  const selectedServerInfo = useMemo(() => {
    if (!selectedProfile) return null;
    const info = availableServers.find((server) => matchesProfile(server, selectedProfile));
    if (info) return info;
    if (attachedServer && matchesProfile(attachedServer, selectedProfile)) return attachedServer;
    return null;
  }, [availableServers, attachedServer, selectedProfile]);

  const selectedActionStatus = useMemo(() => {
    if (!selectedProfile) return null;
    return actionStatusByProfile[selectedProfile.id] ?? null;
  }, [actionStatusByProfile, selectedProfile]);

  const selectedServerKey = useMemo(() => getServerKey(selectedServerInfo), [selectedServerInfo]);

  const selectedConsoleLines = useMemo(() => {
    if (!selectedProfile) return [];
    const byProfile = consoleCache[selectedProfile.id];
    if (byProfile && byProfile.length > 0) return byProfile;
    if (selectedServerKey && consoleCache[selectedServerKey]) return consoleCache[selectedServerKey];
    const attachedKey = attachedKeyRef.current;
    if (attachedKey && consoleCache[attachedKey]) return consoleCache[attachedKey];
    return [];
  }, [consoleCache, selectedProfile, selectedServerKey]);
  const useFileLogs = Boolean(selectedProfile);

  const currentConnections = useMemo(() => {
    if (selectedServerKey && connectionCache[selectedServerKey]) {
      return connectionCache[selectedServerKey];
    }
    if (selectedServerInfo && attachedServer && selectedServerInfo.adminPort === attachedServer.adminPort) {
      return connections;
    }
    return [];
  }, [selectedServerKey, connectionCache, selectedServerInfo, attachedServer, connections]);

  const masterEndpoint = useMemo(() => {
    const masterProfile = profiles.find((profile) => profile.serverType === 'master');
    if (!masterProfile) return null;
    const port = Number(masterProfile.port);
    const ip = masterProfile.serverIp || masterProfile.worldIp || '127.0.0.1';
    if (!Number.isFinite(port)) return null;
    return { ip, port };
  }, [profiles]);

  /**
   * Normalize host strings into IP form for comparisons.
   * @param host - Raw host string.
   * @returns Normalized host.
   */
  const normalizeHost = useCallback((host: string) => {
    let value = host.trim().toLowerCase();
    if (value.startsWith('raw=')) value = value.slice(4);
    if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1);
    if (value === 'localhost' || value === '::1') return '127.0.0.1';
    if (value.startsWith('0x')) {
      const hex = value.slice(2);
      if (hex.length === 8) {
        const parsed = Number.parseInt(hex, 16);
        if (Number.isFinite(parsed)) {
          const b1 = parsed & 0xff;
          const b2 = (parsed >> 8) & 0xff;
          const b3 = (parsed >> 16) & 0xff;
          const b4 = (parsed >> 24) & 0xff;
          return `${b1}.${b2}.${b3}.${b4}`;
        }
      }
    }
    return value;
  }, []);

  /**
   * Filter connections to hide master-link echoes for world profiles.
   * @param profile - Active profile.
   * @param items - Connection list to filter.
   * @returns Filtered connection list.
   */
  const filterConnectionsForProfile = useCallback((profile: LaunchProfile | null, items: ConnectionItem[]) => {
    if (!profile) return items;
    if (profile.serverType !== 'world') return items;
    if (!masterEndpoint) return items;
    const masterHost = normalizeHost(masterEndpoint.ip);
    const masterPort = masterEndpoint.port;
    return items.filter((conn) => {
      const addr = conn.address || '';
      const trimmed = addr.trim().replace(/^raw=/i, '');
      const match = trimmed.match(/^(.*):(\d+)$/);
      if (!match) return true;
      const host = normalizeHost(match[1]);
      const port = Number.parseInt(match[2], 10);
      if (!Number.isFinite(port)) return true;
      if (port !== masterPort) return true;
      return host !== masterHost;
    });
  }, [masterEndpoint, normalizeHost]);

  /**
   * Derive player connections from connection list.
   * @param profile - Active profile.
   * @param items - Connection list to inspect.
   * @returns Player connection list.
   */
  const derivePlayerConnections = useCallback((profile: LaunchProfile | null, items: ConnectionItem[]) => {
    const filtered = filterConnectionsForProfile(profile, items);
    if (!profile) return filtered;
    if (profile.serverType === 'world') {
      return filtered.filter((conn) => {
        const playerId = Number(conn.playerId ?? 0);
        if (Number.isFinite(playerId) && playerId > 0) return true;
        return Boolean(conn.registered || conn.authenticated);
      });
    }
    return filtered.filter((conn) => {
      const state = (conn.state || '').toUpperCase();
      if (state && state !== 'CONNECTED') return false;
      const phase = (conn.loginPhase || '').toUpperCase();
      if (conn.username) return true;
      const playerId = Number(conn.playerId ?? 0);
      if (Number.isFinite(playerId) && playerId > 0) return true;
      return ['AUTHENTICATED', 'WORLD_PENDING', 'IN_WORLD'].includes(phase);
    });
  }, [filterConnectionsForProfile]);

  const filteredConnections = useMemo(() => filterConnectionsForProfile(selectedProfile, currentConnections), [currentConnections, selectedProfile, filterConnectionsForProfile]);

  const playerConnections = useMemo(() => derivePlayerConnections(selectedProfile, currentConnections), [currentConnections, selectedProfile, derivePlayerConnections]);

  const attachedPlayerCount = useMemo(() => {
    const unique = new Set<string>();
    for (const conn of playerConnections) {
      if (conn.playerId) {
        unique.add(`p:${conn.playerId}`);
      } else {
        unique.add(`c:${conn.id}`);
      }
    }
    return unique.size;
  }, [playerConnections]);

  /**
   * Clear packet target selection.
   */
  const resetSelection = () => setSelectedIds(new Set());

  /**
   * Set a temporary action status for a profile.
   * @param profileId - Profile identifier.
   * @param text - Status text.
   * @param busy - Whether the status should show busy state.
   * @param kind - Status kind for styling.
   */
  const setActionStatusTimed = useCallback((profileId: string, text: string, busy: boolean, kind: 'starting' | 'stopping' | 'online' | 'error' | 'info' = 'info') => {
    if (!profileId) return;
    setActionStatusByProfile((prev) => ({
      ...prev,
      [profileId]: { text, busy, id: Date.now(), kind },
    }));
    if (actionTimerRef.current[profileId]) {
      clearTimeout(actionTimerRef.current[profileId]);
    }
    actionTimerRef.current[profileId] = setTimeout(() => {
      setActionStatusByProfile((prev) => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
      delete actionTimerRef.current[profileId];
    }, 5000);
  }, []);

  /**
   * Apply shared env defaults for launch requests.
   * @param env - Base env map to mutate.
   * @param options - Launch options.
   * @returns Env map with defaults applied.
   */
  const applyEnvDefaults = useCallback((env: Record<string, string>, options: {
    serverType: ServerKind;
    serverPort: string;
    adminPort: string;
    adminToken: string;
    adminProfileName: string;
    serverIp?: string;
    logNameBase?: string;
  }) => {
    const {
      serverType,
      serverPort,
      adminPort,
      adminToken,
      adminProfileName,
      serverIp,
      logNameBase,
    } = options;
    const discoveryToken = env.WORLD_DISCOVERY_TOKEN || DEFAULT_DISCOVERY_TOKEN;
    env.SERVER_MODE = serverType;
    env.PORT = serverPort;
    env.ADMIN_ENABLED = '1';
    env.ADMIN_PORT = adminPort;
    env.ADMIN_TOKEN = adminToken || DEFAULT_TOKEN;
    env.ADMIN_PROFILE_NAME = adminProfileName || '';
    env.WORLD_DISCOVERY_TOKEN = discoveryToken;
    if (logNameBase) {
      const logName = normalizeLogFileName(logNameBase);
      if (logName) {
        env.LOG_FILE_NAME = logName;
      }
    }
    if (serverIp) {
      env.SERVER_IP = serverIp;
      if (serverType === 'world') {
        env.WORLD_PUBLIC_IP = serverIp;
      }
    }
    if (serverType === 'world') {
      if (!env.MASTER_HOST && masterEndpoint?.ip) {
        env.MASTER_HOST = masterEndpoint.ip;
      }
      if (!env.MASTER_PORT && masterEndpoint?.port) {
        env.MASTER_PORT = String(masterEndpoint.port);
      }
    }
    if (serverType === 'master') {
      if (!env.MASTER_HEARTBEAT_TIMEOUT_MS) {
        env.MASTER_HEARTBEAT_TIMEOUT_MS = '20000';
      }
      const onlineWorlds = resolveWorldEndpoints(availableServers);
      if (onlineWorlds.length > 0) {
        env.WORLD_SERVERS = onlineWorlds.map((entry) => `${entry.ip}:${entry.port}`).join(',');
      }
    }
    return env;
  }, [resolveWorldEndpoints, availableServers, masterEndpoint]);

  /**
   * Build env overrides from the launch form.
   * @returns Env map for launch request.
   */
  const buildEnvFromForm = useCallback(() => {
    const env = parseEnvText(launchEnvText);
    const logNameBase = launchLogFileName || profileName || selectedProfile?.name || '';
    return applyEnvDefaults(env, {
      serverType: launchKind,
      serverPort: launchPort,
      adminPort: launchAdminPort,
      adminToken: launchAdminToken || DEFAULT_TOKEN,
      adminProfileName: profileName || selectedProfile?.name || '',
      serverIp: launchServerIp,
      logNameBase,
    });
  }, [launchEnvText, launchKind, launchPort, launchAdminPort, launchAdminToken, launchServerIp, profileName, selectedProfile, launchLogFileName, applyEnvDefaults]);

  /**
   * Attach to a server over WebSocket and subscribe to streams.
   * @param info - Admin server info.
   */
  const attachToServer = useCallback((info: AdminInfo) => {
    setStatusMessage('Connecting...');
    setWsStatus('connecting');
    setTelemetry(null);

    wsRef.current?.close();
    const socket = new WebSocket(`ws://127.0.0.1:${info.adminPort}/admin/ws`);
    wsRef.current = socket;
    const key = getServerKey(info);
    const matchedProfile = profiles.find((profile) => matchesProfile(info, profile));
    setAttachedKey(key);
    attachedKeyRef.current = key;
    attachedProfileIdRef.current = matchedProfile?.id ?? activeProfileId ?? null;
    trace('ws:connect', { adminPort: info.adminPort, key, profile: matchedProfile?.id ?? null });

    socket.onopen = () => {
      trace('ws:open');
      socket.send(JSON.stringify({ type: 'auth', token }));
    };

    socket.onmessage = (event) => {
      trace('ws:message', event.data?.slice ? event.data.slice(0, 200) : event.data);
      let message: WsMessage | null = null;
      try {
        message = JSON.parse(event.data) as WsMessage;
      } catch {
        setStatusMessage('Malformed WS message');
        trace('ws:parse_error');
        return;
      }

      if (message.type === 'auth_ok') {
        setAttachedServer(info);
        setWsStatus('connected');
        setAttachSince(Date.now());
        setPacketTypes(message.packetTypes ?? []);
        if ((message.packetTypes ?? []).length > 0 && !packetName) {
          setPacketName((message.packetTypes ?? [])[0] ?? '');
        }
        setStatusMessage(`Attached to ${message.server} server on :${info.adminPort}`);
        socket.send(JSON.stringify({ type: 'list_connections' }));
        socket.send(JSON.stringify({ type: 'subscribe_connections', intervalMs: 1000 }));
        socket.send(JSON.stringify({ type: 'subscribe_metrics', intervalMs: 1000 }));
        socket.send(JSON.stringify({ type: 'subscribe_logs', tail: 200 }));
        socket.send(JSON.stringify({ type: 'list_logs', tail: 200 }));
        trace('ws:auth_ok', { adminPort: info.adminPort });
        return;
      }

      if (message.type === 'auth_error') {
        setWsStatus('error');
        setStatusMessage(message.message);
        socket.close();
        return;
      }

      if (message.type === 'connections') {
        setConnections(message.items);
        const cacheKey = attachedKeyRef.current;
        if (cacheKey) {
          setConnectionCache((prev) => ({ ...prev, [cacheKey]: message.items }));
        }
        trace('ws:connections', { count: message.items.length });
        return;
      }

      if (message.type === 'metrics') {
        setTelemetry(message.telemetry);
        setTelemetryUpdatedAt(Date.now());
        trace('ws:metrics', message.telemetry);
        return;
      }

      if (message.type === 'log') {
        if (useFileLogsRef.current) return;
        appendLogEntries([{ level: message.level, message: message.message, ts: message.ts }], info);
        return;
      }

      if (message.type === 'logs') {
        if (useFileLogsRef.current) return;
        appendLogEntries(message.items ?? [], info);
        return;
      }

      if (message.type === 'send_result') {
        setStatusMessage(`Sent ${message.sent}/${message.total} (failed ${message.failed})`);
        return;
      }

      if (message.type === 'shutdown_ack') {
        const targetId = resolveActionProfileId();
        if (targetId) setActionStatusTimed(targetId, 'Server stopping...', true, 'stopping');
        return;
      }

      if (message.type === 'send_error' || message.type === 'error') {
        setStatusMessage(message.message);
        const targetId = resolveActionProfileId();
        if (targetId) setActionStatusTimed(targetId, message.message, false, 'error');
      }
    };

    socket.onclose = () => {
      setWsStatus('disconnected');
      setStatusMessage('Disconnected');
      setAttachedServer(null);
      setAttachSince(null);
      setConnections([]);
      setTelemetry(null);
      setTelemetryUpdatedAt(null);
      setAttachedKey(null);
      attachedKeyRef.current = null;
      attachedProfileIdRef.current = null;
      resetSelection();
    };
  }, [token, packetName, setActionStatusTimed, resolveActionProfileId, profiles, matchesProfile, appendLogEntries, activeProfileId, trace]);

  useEffect(() => {
    if (launchKind === 'master') {
      setLaunchPort('61000');
      setLaunchAdminPort('4701');
      return;
    }
    setLaunchPort('62000');
    setLaunchAdminPort('4702');
  }, [launchKind]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as LaunchProfile[];
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((profile) => normalizeProfile({ ...profile, source: profile.source ?? 'local' }))
          .filter(Boolean) as LaunchProfile[];
        setProfiles(normalized);
      }
    } catch {
      setProfiles([]);
    }
  }, []);

  useEffect(() => {
    loadDiskProfiles()
      .then((list) => {
        if (!Array.isArray(list)) return;
        setProfiles((prev) => {
          const merged = [...prev];
          for (const item of list as LaunchProfile[]) {
            const normalized = normalizeProfile({ ...item, source: 'disk' });
            if (!normalized) continue;
            const index = merged.findIndex((entry) => entry.id === normalized.id);
            if (index >= 0) merged[index] = normalized;
            else merged.push(normalized);
          }
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
      setProfileName(profiles[0].name);
      applyProfile(profiles[0]);
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    if (!attachedServer || attachedProfileIdRef.current) return;
    const matched = profiles.find((profile) => matchesProfile(attachedServer, profile));
    if (matched) {
      attachedProfileIdRef.current = matched.id;
    }
  }, [attachedServer, profiles, matchesProfile]);

  useEffect(() => {
    if (profiles.length === 0) return;
    if (selectedProfileIds.size === 0) {
      setSelectedProfileIds(new Set([profiles[0].id]));
    }
  }, [profiles, selectedProfileIds.size]);

  useEffect(() => {
    if (!selectedProfile) return;
    if (runningServerForProfile) {
      if (!attachedServer || attachedServer.adminPort !== runningServerForProfile.adminPort) {
        attachToServer(runningServerForProfile);
      }
    } else if (attachedServer && !matchesProfile(attachedServer, selectedProfile)) {
      detach();
    }
  }, [selectedProfile, runningServerForProfile, attachedServer, attachToServer]);

  useEffect(() => {
    useFileLogsRef.current = Boolean(selectedProfile);
  }, [selectedProfile]);

  useEffect(() => {
    if (packetTypes.length === 0) return;
    if (!packetName || !packetTypes.includes(packetName)) {
      setPacketName(packetTypes[0]);
    }
  }, [packetTypes, packetName]);

  useEffect(() => {
    if (!packetName) return;
    if (lastPacketNameRef.current === packetName) return;
    lastPacketNameRef.current = packetName;
    const template = packetTemplateMap[packetName];
    if (template) {
      setPacketParams(JSON.stringify(template, null, 2));
    }
  }, [packetName, packetTemplateMap]);

  useEffect(() => {
    let canceled = false;

    const poll = async () => {
      if (pollPorts.length === 0) {
        serverSeenRef.current = {};
        setAvailableServers([]);
        return;
      }
      const now = Date.now();
      const graceMs = Math.max(2000, pollInterval * 2);
      const seen = serverSeenRef.current;
      for (const key of Object.keys(seen)) {
        const port = Number(key);
        if (!pollPorts.includes(port)) {
          delete seen[port];
        }
      }
      await Promise.all(
        pollPorts.map(async (port) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 500);
          try {
            const res = await fetch(`http://127.0.0.1:${port}/admin/info`, { signal: controller.signal });
            if (res.ok) {
              const info = (await res.json()) as AdminInfo;
              if (info.ok) {
                seen[port] = { info, lastSeen: now };
              }
            }
          } catch {
          } finally {
            clearTimeout(timeout);
          }
        })
      );

      if (!canceled) {
        const next: AdminInfo[] = [];
        for (const entry of Object.values(seen)) {
          if (now - entry.lastSeen <= graceMs) {
            next.push(entry.info);
          }
        }
        setAvailableServers(next);
      }
    };

    poll();
    const intervalId = setInterval(poll, pollInterval);
    return () => {
      canceled = true;
      clearInterval(intervalId);
    };
  }, [pollInterval, pollPorts]);

  /**
   * Run a one-shot admin WebSocket command with auth and timeout handling.
   * @param options - Command options.
   * @returns Promise resolving true on success.
   */
  const runAdminCommand = useCallback((options: {
    adminPort: number | string;
    adminToken: string;
    timeoutMs?: number;
    onAuthed: (socket: WebSocket) => void;
    onMessage?: (message: WsMessage, socket: WebSocket, authed: boolean) => 'resolve' | 'reject' | void;
  }) => {
    const { adminPort, adminToken, timeoutMs, onAuthed, onMessage } = options;
    return new Promise<boolean>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${adminPort}/admin/ws`);
      let done = false;
      let authed = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        if (timeoutId) clearTimeout(timeoutId);
        socket.close();
        resolve(ok);
      };

      if (timeoutMs !== undefined && timeoutMs > 0) {
        timeoutId = setTimeout(() => finish(false), timeoutMs);
      }

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', token: adminToken || DEFAULT_TOKEN }));
      };
      socket.onmessage = (event) => {
        let message: WsMessage | null = null;
        try {
          message = JSON.parse(event.data) as WsMessage;
        } catch {
          finish(false);
          return;
        }
        if (message.type === 'auth_ok') {
          authed = true;
          onAuthed(socket);
          return;
        }
        if (message.type === 'auth_error') {
          finish(false);
          return;
        }
        if (onMessage) {
          const outcome = onMessage(message, socket, authed);
          if (outcome === 'resolve') {
            finish(true);
            return;
          }
          if (outcome === 'reject') {
            finish(false);
            return;
          }
        }
      };
      socket.onerror = () => finish(false);
    });
  }, []);

  /**
   * Push the world server list to a master admin socket.
   * @param adminPort - Master admin port.
   * @param adminToken - Admin auth token.
   * @param servers - World endpoints to publish.
   */
  const sendWorldServersUpdate = useCallback((
    adminPort: number,
    adminToken: string,
    servers: Array<{ ip: string; port: number; worldId?: number }>,
  ) => {
    void runAdminCommand({
      adminPort,
      adminToken,
      timeoutMs: 0,
      onAuthed: (socket) => {
        socket.send(JSON.stringify({ type: 'set_world_servers', servers }));
      },
      onMessage: (message, _socket, authed) => {
        if ((message as { type?: string }).type === 'world_servers_updated') return 'resolve';
        if (authed) return 'resolve';
        return undefined;
      },
    });
  }, []);

  /**
   * Synchronize world server list across known master targets.
   * @param options - Add/remove options for endpoints.
   */
  const syncWorldServers = useCallback((
    options: {
      add?: Array<{ ip: string; port: number; worldId?: number }>;
      remove?: Array<{ ip: string; port: number }>;
    } = {},
  ) => {
    const base = resolveWorldEndpoints(availableServers);
    const merged = mergeWorldEndpoints(base, options.add ?? []);
    const filtered = filterWorldEndpoints(merged, options.remove ?? []);
    const targets = resolveMasterTargets(availableServers);
    if (targets.length === 0) return;
    for (const target of targets) {
      sendWorldServersUpdate(target.adminPort, target.token, filtered);
    }
  }, [availableServers, resolveWorldEndpoints, mergeWorldEndpoints, filterWorldEndpoints, resolveMasterTargets, sendWorldServersUpdate]);

  useEffect(() => {
    const endpoints = resolveWorldEndpoints(availableServers);
    const targets = resolveMasterTargets(availableServers);
    if (targets.length === 0) {
      worldServersKeyRef.current = null;
      return;
    }
    const targetKey = targets.map((entry) => entry.adminPort).sort((a, b) => a - b).join(',');
    const masterPids = availableServers
      .filter((server) => server.server === 'master')
      .map((server) => server.pid)
      .sort((a, b) => a - b)
      .join(',');
    /**
     * Include master PID signature so restarts trigger a fresh world list sync.
     */
    const key = `${targetKey}|${masterPids}|${JSON.stringify(endpoints)}`;
    if (worldServersKeyRef.current === key) return;
    worldServersKeyRef.current = key;
    for (const target of targets) {
      sendWorldServersUpdate(target.adminPort, target.token, endpoints);
    }
  }, [availableServers, resolveWorldEndpoints, resolveMasterTargets, sendWorldServersUpdate]);

  /**
   * Detach from the currently attached admin socket.
   */
  const detach = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setAttachedServer(null);
    setConnections([]);
    resetSelection();
  }, []);

  /**
   * Apply a profile into the launch form controls.
   * @param profile - Profile to apply.
   */
  const applyProfile = (profile: LaunchProfile) => {
    setLaunchKind(profile.serverType);
    setLaunchPort(profile.port);
    setLaunchAdminPort(profile.adminPort);
    setLaunchAdminToken(profile.adminToken);
    setLaunchServerIp(profile.serverIp || profile.worldIp || '127.0.0.1');
    setLaunchEnvText(profile.envText);
    setProfileName(profile.name);
    setToken(profile.adminToken || DEFAULT_TOKEN);
    const env = parseEnvText(profile.envText || '');
    const logName = env.LOG_FILE_NAME || profile.logFileName || `${profile.name}.log`;
    setLaunchLogFileName(logName);
  };

  /**
   * Handle profile selection changes and multi-select toggle.
   * @param id - Selected profile id.
   * @param event - Mouse event for modifier detection.
   */
  const handleProfileChange = (id: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    const toggle = Boolean(event?.ctrlKey || event?.metaKey);
    let nextSelection = new Set(selectedProfileIds);
    if (toggle) {
      if (nextSelection.has(id)) nextSelection.delete(id);
      else nextSelection.add(id);
      if (nextSelection.size === 0) nextSelection.add(id);
    } else {
      nextSelection = new Set([id]);
    }
    setSelectedProfileIds(nextSelection);

    const nextActive = nextSelection.has(id) ? id : Array.from(nextSelection)[0];
    setActiveProfileId(nextActive);
    const profile = profiles.find((item) => item.id === nextActive);
    if (profile) applyProfile(profile);
    resetSelection();
  };

  useEffect(() => {
    setToken(launchAdminToken || DEFAULT_TOKEN);
  }, [launchAdminToken]);

  useEffect(() => {
    const env = parseEnvText(launchEnvText);
    if (env.LOG_FILE_NAME && env.LOG_FILE_NAME !== launchLogFileName) {
      setLaunchLogFileName(env.LOG_FILE_NAME);
    }
  }, [launchEnvText, launchLogFileName]);

  useEffect(() => {
    const el = consoleRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedConsoleLines, subTab]);

  const isSelectedAttached = Boolean(selectedProfile && attachedServer && matchesProfile(attachedServer, selectedProfile));
  const activeTelemetry = isSelectedAttached ? telemetry : null;

  useEffect(() => {
    if (wsStatus !== 'connected') return;
    const intervalId = setInterval(() => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: 'list_connections' }));
      const intervalMs = Math.max(500, refreshInterval);
      socket.send(JSON.stringify({ type: 'subscribe_connections', intervalMs }));
      socket.send(JSON.stringify({ type: 'subscribe_metrics', intervalMs }));
      socket.send(JSON.stringify({ type: 'subscribe_logs', tail: 0 }));
    }, Math.max(500, refreshInterval));
    return () => clearInterval(intervalId);
  }, [wsStatus, refreshInterval]);

  useEffect(() => {
    if (wsStatus !== 'connected' || subTab !== 'console') return;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'subscribe_logs', tail: 50 }));
  }, [wsStatus, subTab]);

  useEffect(() => {
    if (!selectedProfile) return;
    let canceled = false;
    const poll = async () => {
      const profile = selectedProfile;
      const logFileName = resolveLogFileName(profile);
      const state = logTailRef.current[profile.id] ?? { offset: 0, carry: '' };
      const result = await readLogTail({ serverType: profile.serverType, logFileName, offset: state.offset });
      if (canceled) return;
      if (!result.ok) return;
      const data = result.data || '';
      if (!data) return;
      const combined = state.carry + data;
      const parts = combined.split(/\r?\n/);
      let carry = '';
      if (combined && combined.endsWith('\n')) {
        if (parts.length > 0 && parts[parts.length - 1] === '') {
          parts.pop();
        }
      } else if (combined) {
        carry = parts.pop() ?? '';
      }
      if (parts.length > 0) {
        appendFileLogLines(profile.id, parts);
      }
      logTailRef.current[profile.id] = { offset: result.offset ?? state.offset, carry };
    };
    poll();
    const intervalId = setInterval(poll, Math.max(500, refreshInterval));
    return () => {
      canceled = true;
      clearInterval(intervalId);
    };
  }, [selectedProfile, refreshInterval, appendFileLogLines]);

  useEffect(() => {
    return () => {
      const timers = actionTimerRef.current;
      Object.keys(timers).forEach((key) => clearTimeout(timers[key]));
      actionTimerRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!activeTelemetry) return;
    setHistory((prev) => {
      const nextCpu = [...prev.cpu, activeTelemetry.cpuPercent];
      const nextRam = [...prev.ram, activeTelemetry.rssMb];
      const nextPlayers = [...prev.players, attachedPlayerCount];
      const limit = 60;
      if (nextCpu.length > limit) nextCpu.shift();
      if (nextRam.length > limit) nextRam.shift();
      if (nextPlayers.length > limit) nextPlayers.shift();
      return { cpu: nextCpu, ram: nextRam, players: nextPlayers };
    });
  }, [activeTelemetry, attachedPlayerCount]);

  /**
   * Save or update the current launch profile in local storage.
   */
  const saveProfile = () => {
    const trimmed = profileName.trim();
    if (!trimmed) {
      setStatusMessage('Profile name is required');
      return;
    }

    const baseId = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `profile-${Date.now()}`;
    const id = activeProfileId || baseId;

    const nextEnvText = upsertEnvLine(launchEnvText, 'LOG_FILE_NAME', launchLogFileName || trimmed);
    const normalizedLogName = normalizeLogFileName(launchLogFileName || trimmed);
    setLaunchLogFileName(normalizedLogName || launchLogFileName);
    setLaunchEnvText(nextEnvText);
    const nextProfile: LaunchProfile = {
      id,
      name: trimmed,
      serverType: launchKind,
      port: launchPort,
      adminPort: launchAdminPort,
      adminToken: launchAdminToken || DEFAULT_TOKEN,
      serverIp: launchServerIp,
      envText: nextEnvText,
      source: 'local',
      logFileName: normalizedLogName || undefined,
    };

    setProfiles((prev) => {
      const copy = [...prev];
      const index = copy.findIndex((item) => item.id === id);
      if (index >= 0) copy[index] = nextProfile;
      else copy.push(nextProfile);
      return copy;
    });

    setActiveProfileId(id);
    setStatusMessage(`Profile saved: ${trimmed}`);
  };

  /**
   * Delete the active profile from local storage.
   */
  const deleteProfile = () => {
    if (!activeProfileId) return;
    const current = profiles.find((item) => item.id === activeProfileId);
    setProfiles((prev) => prev.filter((item) => item.id !== activeProfileId));
    setActiveProfileId('');
    setProfileName('');
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      next.delete(activeProfileId);
      if (next.size === 0) {
        const fallback = profiles.find((item) => item.id !== activeProfileId);
        if (fallback) next.add(fallback.id);
      }
      return next;
    });
    setActionStatusByProfile((prev) => {
      if (!prev[activeProfileId]) return prev;
      const next = { ...prev };
      delete next[activeProfileId];
      return next;
    });
    setStatusMessage(`Profile removed: ${current?.name ?? activeProfileId}`);
  };

  /**
   * Export profiles to a JSON download.
   */
  const exportProfiles = () => {
    if (profiles.length === 0) {
      setStatusMessage('No profiles to export');
      return;
    }
    const blob = new Blob([JSON.stringify({ profiles }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'server_profiles.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Profiles exported');
  };

  /**
   * Import profiles from a selected JSON file.
   * @param event - File input change event.
   */
  const onImportProfiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text()
      .then((text) => {
        const parsed = JSON.parse(text) as { profiles?: LaunchProfile[] } | LaunchProfile[];
        const list = Array.isArray(parsed) ? parsed : parsed.profiles;
        if (!list || !Array.isArray(list)) {
          setStatusMessage('Invalid profile JSON');
          return;
        }
        setProfiles((prev) => {
          const merged = [...prev];
          for (const entry of list) {
            const normalized = normalizeProfile({ ...entry, source: entry.source ?? 'local' });
            if (!normalized) continue;
            const index = merged.findIndex((item) => item.id === normalized.id);
            if (index >= 0) merged[index] = normalized;
            else merged.push(normalized);
          }
          return merged;
        });
        setStatusMessage('Profiles imported');
      })
      .catch(() => setStatusMessage('Failed to import profiles'))
      .finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  /**
   * Trigger the hidden file input for imports.
   */
  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  

  /**
   * Build env overrides for a specific profile launch.
   * @param profile - Profile to launch.
   * @returns Env overrides for server launch.
   */
  const buildEnvForProfile = useCallback((profile: LaunchProfile) => {
    const env = parseEnvText(profile.envText);
    const logNameBase = env.LOG_FILE_NAME || profile.logFileName || `${profile.name}.log`;
    return applyEnvDefaults(env, {
      serverType: profile.serverType,
      serverPort: profile.port,
      adminPort: profile.adminPort,
      adminToken: profile.adminToken || DEFAULT_TOKEN,
      adminProfileName: profile.name || '',
      serverIp: profile.serverIp,
      logNameBase,
    });
  }, [applyEnvDefaults]);

  /**
   * Launch a server with precomputed env overrides.
   * @param options - Launch request details.
   * @returns True when launch request succeeds.
   */
  const launchWithEnv = useCallback(async (options: {
    kind: ServerKind;
    env: Record<string, string>;
    profileId?: string;
    worldEntry?: { ip: string; port: number; worldId?: number } | null;
  }) => {
    const { kind, env, profileId, worldEntry } = options;
    if (profileId) setActionStatusTimed(profileId, 'Server starting...', true, 'starting');
    const result = await invokeLaunch({ kind, env });
    if (result.ok) {
      const pid = 'pid' in result ? result.pid : undefined;
      setStatusMessage(`Launched ${kind} (pid ${pid ?? '-'})`);
      if (profileId) setActionStatusTimed(profileId, 'Server online', false, 'online');
      if (kind === 'world' && worldEntry) {
        syncWorldServers({ add: [worldEntry] });
      }
      return true;
    }
    setStatusMessage(result.error || 'Launch failed');
    if (profileId) setActionStatusTimed(profileId, 'Launch failed', false, 'error');
    return false;
  }, [setActionStatusTimed, syncWorldServers]);

  /**
   * Launch a profile using the Electron IPC bridge.
   * @param profile - Profile to launch.
   * @returns True when launch request succeeds.
   */
  const launchProfile = useCallback(async (profile: LaunchProfile) => {
    const env = buildEnvForProfile(profile);
    const entry = profile.serverType === 'world' ? buildWorldEntryFromProfile(profile) : null;
    return launchWithEnv({
      kind: profile.serverType,
      env,
      profileId: profile.id,
      worldEntry: entry,
    });
  }, [buildEnvForProfile, buildWorldEntryFromProfile, launchWithEnv]);

  const launchServer = async () => {
    const targets = resolveTargetProfiles();
    if (targets.length === 0) return;
    if (!isMultiSelect) {
      const targetId = selectedProfile?.id || activeProfileId;
      const env = buildEnvFromForm();
      const entry = launchKind === 'world' ? buildWorldEntryFromForm() : null;
      await launchWithEnv({
        kind: launchKind,
        env,
        profileId: targetId,
        worldEntry: entry,
      });
      return;
    }
    for (const profile of targets) {
      await launchProfile(profile);
    }
  };

  /**
   * Send shutdown command to a profile's admin socket.
   * @param profile - Profile to shut down.
   * @returns True when shutdown acked.
   */
  const sendShutdownToProfile = useCallback((profile: LaunchProfile) => {
    return runAdminCommand({
      adminPort: profile.adminPort,
      adminToken: profile.adminToken || DEFAULT_TOKEN,
      timeoutMs: 3000,
      onAuthed: (socket) => {
        socket.send(JSON.stringify({ type: 'shutdown' }));
      },
      onMessage: (message, _socket, authed) => {
        if (message.type === 'shutdown_ack') return 'resolve';
        if (message.type === 'error') return 'reject';
        if (authed) return 'resolve';
        return undefined;
      },
    });
  }, [runAdminCommand]);

  const shutdownServer = async () => {
    const targets = resolveTargetProfiles();
    if (targets.length === 0) return;
    if (!isMultiSelect && wsRef.current && wsStatus === 'connected') {
      wsRef.current.send(JSON.stringify({ type: 'shutdown' }));
      setStatusMessage('Shutdown requested');
      const targetId = selectedProfile?.id || activeProfileId;
      if (targetId) setActionStatusTimed(targetId, 'Server stopping...', true, 'stopping');
      return;
    }
    for (const profile of targets) {
      setActionStatusTimed(profile.id, 'Server stopping...', true, 'stopping');
      await sendShutdownToProfile(profile);
      if (profile.serverType === 'world') {
        const entry = buildWorldEntryFromProfile(profile);
        if (entry) {
          syncWorldServers({ remove: [{ ip: entry.ip, port: entry.port }] });
        }
      }
    }
  };

  const restartServer = async () => {
    const targets = resolveTargetProfiles();
    if (targets.length === 0) return;
    for (const profile of targets) {
      setActionStatusTimed(profile.id, 'Server restarting...', true, 'starting');
      await sendShutdownToProfile(profile);
      await launchProfile(profile);
    }
  };

  /**
   * Toggle connection selection.
   * @param id - Connection id.
   */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Select all visible connections.
   */
  const selectAll = () => {
    setSelectedIds(new Set(filteredConnections.map((item) => item.id)));
  };

  /**
   * Clear all selected connections.
   */
  const clearSelection = () => {
    resetSelection();
  };

  /**
   * Send packet payloads to selected connections or broadcast.
   */
  const sendPacket = () => {
    const activeSocket = wsRef.current;
    if (!activeSocket || wsStatus !== 'connected') {
      if (!isMultiSelect) {
        setStatusMessage('Attach to a server first');
        return;
      }
    }

    const target = hasSelection ? 'ids' : 'all';
    const ids = hasSelection ? selectedList : undefined;

    /**
     * Build packet payload for the current mode.
     * @returns Packet payload request object.
     */
    const buildPayload = (paramsOverride?: Record<string, unknown>) => {
      if (packetMode === 'raw') {
        return { type: 'send_raw', target: 'all', hex: rawHex, reliable };
      }
      return { type: 'send_packet', target: 'all', packetName, params: paramsOverride, reliable };
    };

    /**
     * Send packet payload to a profile over admin websocket.
     * @param profile - Target profile.
     * @param payload - Payload to send.
     */
    const sendPayloadToProfile = (profile: LaunchProfile, payload: Record<string, unknown>) => {
      return runAdminCommand({
        adminPort: profile.adminPort,
        adminToken: profile.adminToken || DEFAULT_TOKEN,
        timeoutMs: 3000,
        onAuthed: (socket) => {
          socket.send(JSON.stringify(payload));
        },
        onMessage: (message) => {
          if (message.type === 'send_result') return 'resolve';
          if (message.type === 'send_error' || message.type === 'error') return 'reject';
          return undefined;
        },
      });
    };

    if (packetMode === 'raw') {
      if (isMultiSelect) {
        const payload = buildPayload();
        const targets = resolveTargetProfiles();
        targets.forEach((profile) => {
          sendPayloadToProfile(profile, payload);
        });
        setStatusMessage(`Sent to ${targets.length} servers`);
        return;
      }
      if (!activeSocket) {
        setStatusMessage('Attach to a server first');
        return;
      }
      activeSocket.send(JSON.stringify({ type: 'send_raw', target, ids, hex: rawHex, reliable }));
      return;
    }

    let params: Record<string, unknown> | undefined = undefined;
    if (packetParams.trim()) {
      try {
        params = JSON.parse(packetParams);
      } catch (err) {
        setStatusMessage('Packet params must be valid JSON');
        return;
      }
    }

    if (isMultiSelect) {
      const payload = buildPayload(params);
      const targets = resolveTargetProfiles();
      targets.forEach((profile) => {
        sendPayloadToProfile(profile, payload);
      });
      setStatusMessage(`Sent to ${targets.length} servers`);
      return;
    }

    if (!activeSocket) {
      setStatusMessage('Attach to a server first');
      return;
    }
    activeSocket.send(JSON.stringify({
      type: 'send_packet',
      target,
      ids,
      packetName,
      params,
      reliable,
    }));
  };

  const metrics = useMemo(() => {
    if (!activeTelemetry) {
      const uptime = attachSince ? formatMs(Date.now() - attachSince) : '-';
      return {
        cpu: '-%',
        ram: '- MB',
        uptime,
      };
    }
    return {
      cpu: `${activeTelemetry.cpuPercent.toFixed(1)}%`,
      ram: `${activeTelemetry.rssMb.toFixed(0)} MB`,
      uptime: formatMs(activeTelemetry.uptimeSec * 1000),
    };
  }, [activeTelemetry, attachSince]);

  const telemetryHint = useMemo(() => {
    if (!isSelectedAttached || !telemetryUpdatedAt) return 'Awaiting telemetry';
    const deltaSec = Math.floor((Date.now() - telemetryUpdatedAt) / 1000);
    if (deltaSec >= 5) return `Stale (${deltaSec}s ago)`;
    return '';
  }, [telemetryUpdatedAt, isSelectedAttached]);

  /**
   * Render a lightweight sparkline SVG.
   * @param values - Series values.
   * @param minValue - Minimum range value.
   * @param maxValue - Maximum range value.
   * @param stroke - Stroke color.
   * @returns Sparkline SVG element or null.
   */
  const renderSparkline = (values: number[], minValue: number, maxValue: number, stroke: string) => {
    if (values.length === 0) return null;
    const max = Math.max(maxValue, ...values);
    const min = Math.min(minValue, ...values);
    const range = Math.max(1, max - min);
    const points = values.map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const clamped = Math.min(max, Math.max(min, value));
      const y = 40 - ((clamped - min) / range) * 40;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const areaPoints = `0,40 ${points} 100,40`;
    return (
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <polygon points={areaPoints} fill={`${stroke}22`} />
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="1" />
        {values.map((value, index) => {
          const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
          const clamped = Math.min(max, Math.max(min, value));
          const y = 40 - ((clamped - min) / range) * 40;
          return <circle key={`${index}-${value}`} cx={x} cy={y} r="1" fill={stroke} />;
        })}
      </svg>
    );
  };

  /**
   * Resolve online status and counts for a profile.
   * @param profile - Profile to evaluate.
   * @returns Status info for UI.
   */
  const getProfileStatus = (profile: LaunchProfile) => {
    const matchesAttached = attachedServer && matchesProfile(attachedServer, profile);
    const info =
      availableServers.find((server) => matchesProfile(server, profile)) ||
      (matchesAttached ? attachedServer : null);
    const key = getServerKey(info);
    const cachedConnections = key && connectionCache[key] ? connectionCache[key] : null;
    const cachedCount = cachedConnections ? derivePlayerConnections(profile, cachedConnections).length : null;
    const count = cachedCount ?? (matchesAttached ? attachedPlayerCount : 0);
    const action = actionStatusByProfile[profile.id];
    let dotClass = info ? 'online' : 'offline';
    if (action?.kind === 'starting') dotClass = 'starting';
    else if (action?.kind === 'stopping') dotClass = 'stopping';
    else if (action?.kind === 'online') dotClass = 'online';
    const statusText = dotClass === 'starting'
      ? 'Starting'
      : dotClass === 'stopping'
        ? 'Stopping'
        : info
          ? 'Online'
          : 'Offline';
    return {
      online: Boolean(info),
      count,
      server: info,
      dotClass,
      statusText,
    };
  };

  const activeStatus = selectedProfile ? getProfileStatus(selectedProfile) : { online: false, count: 0, server: null, dotClass: 'offline', statusText: 'Offline' };
  const activePlayers = activeStatus.count;
  const activeAddress = selectedProfile ? `${selectedProfile.serverIp}:${selectedProfile.port}` : '-';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <img src="/logo.jpg" alt="FoM" />
          </div>
          <div>
            <div className="brand-title">Open-FoM</div>
            <div className="brand-sub">Server Manager</div>
          </div>
        </div>
        <div className="nav-group">
          <button
            className={`nav-button ${navTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setNavTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-button ${navTab === 'settings' ? 'active' : ''}`}
            onClick={() => setNavTab('settings')}
          >
            Settings
          </button>
        </div>
      </aside>

      <main className="content">
        {navTab === 'dashboard' && (
          <header className="topbar">
            <div className="profile-tabs">
              {profiles.length === 0 && <div className="empty">No profiles loaded yet.</div>}
              {orderedProfiles.map((profile) => {
                const status = getProfileStatus(profile);
                const isSelected = selectedProfileIds.has(profile.id);
                return (
                  <button
                    key={profile.id}
                    className={`profile-tab ${activeProfileId === profile.id ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={(event) => handleProfileChange(profile.id, event)}
                  >
                    <div className="profile-top">
                      <span className="profile-name">{profile.name}</span>
                      <span className={`status-dot ${status.dotClass}`}></span>
                    </div>
                    <div className="profile-meta">
                      <span>{status.count} players</span>
                      <span className="profile-sep">|</span>
                      <span>{status.statusText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </header>
        )}

        {navTab === 'dashboard' ? (
          <div className="dashboard-view">
            <section className="panel server-header">
              <div className="server-title">
                <div>
                  <div className="server-name">
                    {isMultiSelect ? `Multi-world selection (${selectedProfiles.length})` : (selectedProfile?.name || 'Select a profile')}
                  </div>
                  <div className="server-status">
                    {isMultiSelect ? (
                      <span className="muted">MULTI-WORLD SELECTION MODE</span>
                    ) : (
                      <>
                        <span className={`status-dot ${activeStatus.dotClass}`}></span>
                        <span>{activeStatus.statusText}</span>
                        <span className="profile-sep">|</span>
                        <span className="server-type">{selectedProfile?.serverType ?? '--'}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="server-actions">
                  <div className="server-action-buttons">
                    <button className="btn" onClick={launchServer} disabled={!selectedProfile}>
                      Start
                    </button>
                    <button className="btn ghost danger" onClick={shutdownServer} disabled={wsStatus !== 'connected'}>
                      Stop
                    </button>
                    <button className="btn ghost" onClick={restartServer} disabled={!selectedProfile}>
                      Restart
                    </button>
                  </div>
                  {selectedActionStatus ? (
                    <div key={selectedActionStatus.id} className="server-status-pill floating">
                      {selectedActionStatus.busy && <span className="spinner" aria-hidden="true"></span>}
                      <span>{selectedActionStatus.text}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="server-meta-row">
                <div className="meta-chip">
                  <span className="label">Address</span>
                  <span className="value mono">{isMultiSelect ? 'Multiple' : activeAddress}</span>
                </div>
                <div className="meta-chip">
                  <span className="label">Players</span>
                  <span className="value">{isMultiSelect ? '--' : activePlayers}</span>
                </div>
                <div className="meta-chip">
                  <span className="label">Admin Port</span>
                  <span className="value">{isMultiSelect ? '--' : (selectedProfile?.adminPort ?? '-')}</span>
                </div>
              </div>
            </section>

            <div className="subtabs">
              {(['dashboard', 'console', 'players', 'packet'] as SubTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`subtab ${subTab === tab ? 'active' : ''}`}
                  onClick={() => setSubTab(tab)}
                >
                  {tab === 'packet' ? 'Packet Console' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="subtab-content">
              {subTab === 'dashboard' && (
                isMultiSelect ? (
                  <div className="panel">
                    <div className="panel-header">
                      <h3>Multi-world selection mode</h3>
                      <span className="meta">{selectedProfiles.length} servers</span>
                    </div>
                    <div className="muted">
                      Select a single world to view telemetry, console, and players. Actions and packet sends will target all selected servers.
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-grid">
                    <div className="dashboard-main">
                      <div className="metrics-row">
                        <div className="metric-card">
                          <div className="metric-label">CPU</div>
                          <div className="metric-value">{metrics.cpu}</div>
                          {telemetryHint ? <div className="metric-sub">{telemetryHint}</div> : null}
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">RAM</div>
                          <div className="metric-value">{metrics.ram}</div>
                          {telemetryHint ? <div className="metric-sub">{telemetryHint}</div> : null}
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">Uptime</div>
                          <div className="metric-value">{metrics.uptime}</div>
                          {telemetryHint ? <div className="metric-sub">{telemetryHint}</div> : null}
                        </div>
                      </div>
                      <div className="graph-stack">
                        <div className="graph-card">
                          <div className="graph-header">
                            <span>CPU Usage</span>
                            <span className="graph-meta">{history.cpu.length ? `${history.cpu[history.cpu.length - 1].toFixed(1)}% now` : '--'}</span>
                          </div>
                          <div className="graph-placeholder">
                            {renderSparkline(history.cpu, 0, 100, '#49d6c8')}
                            <div className="graph-scale">
                              <span>100%</span>
                              <span>0%</span>
                            </div>
                          </div>
                        </div>
                        <div className="graph-card">
                          <div className="graph-header">
                            <span>RAM Usage</span>
                            <span className="graph-meta">
                              {history.ram.length ? `${formatMemory(history.ram[history.ram.length - 1])} now` : '--'}
                            </span>
                          </div>
                          <div className="graph-placeholder">
                            {renderSparkline(history.ram, 200, 2048, '#f8b547')}
                            <div className="graph-scale">
                              <span>2 GB</span>
                              <span>200 MB</span>
                            </div>
                          </div>
                        </div>
                        <div className="graph-card">
                          <div className="graph-header">
                            <span>Players Online</span>
                            <span className="graph-meta">{history.players.length ? `${history.players[history.players.length - 1]} now` : '--'}</span>
                          </div>
                          <div className="graph-placeholder">
                            {renderSparkline(history.players, 0, 100, '#8b8bff')}
                            <div className="graph-scale">
                              <span>100</span>
                              <span>0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="panel dashboard-side">
                      <div className="panel-header">
                        <h3>Players Online</h3>
                        <span className="meta">{activePlayers}</span>
                      </div>
                      <div className="player-list">
                      {playerConnections.length === 0 && <div className="empty">No players yet.</div>}
                      {playerConnections.slice(0, 20).map((conn) => (
                        <div key={conn.id} className="player-row">
                          <div className="player-name">{conn.username || `Player ${conn.playerId ?? conn.id}`}</div>
                          <div className="player-meta">{conn.address || conn.state || 'connected'}</div>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                )
              )}

              {subTab === 'console' && (
                isMultiSelect ? (
                  <div className="panel">
                    <div className="panel-header">
                      <h3>Console</h3>
                      <span className="meta">Multi-world selection</span>
                    </div>
                    <div className="muted">Select a single server to view live console output.</div>
                  </div>
                ) : (
                <div className="panel console-panel">
                  <div className="panel-header">
                    <h3>Console</h3>
                    <span className="meta">{selectedConsoleLines.length} lines</span>
                  </div>
                  <div className="console-stream" ref={consoleRef}>
                    {selectedConsoleLines.length === 0 && <div className="empty">No console output yet.</div>}
                    {selectedConsoleLines.map((line, index) => (
                      <div key={`${line.ts}-${index}`} className={`console-line ${line.level}`}>
                        {useFileLogs ? (
                          <span className="console-text">{line.message}</span>
                        ) : (
                          <>
                            <span className="console-time">[{new Date(line.ts).toLocaleTimeString()}]</span>
                            <span className="console-text">{line.message}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                )
              )}

              {subTab === 'players' && (
                isMultiSelect ? (
                  <div className="panel">
                    <div className="panel-header">
                      <h3>Connections</h3>
                      <span className="meta">Multi-world selection</span>
                    </div>
                    <div className="muted">Select a single server to view connections and players.</div>
                  </div>
                ) : (
                <div className="panel">
                    <div className="panel-header">
                      <h3>Connections</h3>
                      <div className="action-group">
                      <button className="btn ghost" onClick={selectAll} disabled={filteredConnections.length === 0}>
                        Select all
                      </button>
                      <button className="btn ghost" onClick={clearSelection} disabled={!hasSelection}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="table">
                    <div className="table-head">
                      <span>ID</span>
                      <span>Address</span>
                      <span>State</span>
                      <span>Player</span>
                      <span>Last</span>
                    </div>
                    <div className="table-body">
                      {filteredConnections.length === 0 && <div className="empty">No connections yet.</div>}
                      {filteredConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className={`table-row ${selectedIds.has(conn.id) ? 'selected' : ''}`}
                          onClick={() => toggleSelect(conn.id)}
                        >
                          <span className="mono">{conn.id}</span>
                          <span className="mono">{conn.address || '-'}</span>
                          <span>{conn.state || conn.loginPhase || '-'}</span>
                          <span>{conn.username || conn.playerId || '-'}</span>
                          <span>{formatMs(conn.lastActivityMs)}</span>
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                )
              )}

              {subTab === 'packet' && (
                <div className="panel packet-panel">
                  <div className="panel-header">
                    <h3>Packet Console</h3>
                    <span className="meta">{hasSelection ? `${selectionCount} selected` : 'Broadcast to all'}</span>
                  </div>
                  <div className="composer">
                    <div className="composer-tabs">
                      <button
                        className={`tab ${packetMode === 'builder' ? 'active' : ''}`}
                        onClick={() => setPacketMode('builder')}
                      >
                        Builder
                      </button>
                      <button
                        className={`tab ${packetMode === 'raw' ? 'active' : ''}`}
                        onClick={() => setPacketMode('raw')}
                      >
                        Raw Hex
                      </button>
                    </div>

                    {packetMode === 'builder' && (
                      <>
                        <div className="field">
                          <label>Packet Type</label>
                          <select value={packetName} onChange={(event) => setPacketName(event.target.value)}>
                            {packetTypes.length === 0 && <option value="">No packets yet</option>}
                            {packetTypes.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>Params (JSON)</label>
                          <textarea
                            rows={8}
                            value={packetParams}
                            onChange={(event) => setPacketParams(event.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {packetMode === 'raw' && (
                      <div className="field">
                        <label>Raw Hex</label>
                        <textarea
                          rows={8}
                          value={rawHex}
                          onChange={(event) => setRawHex(event.target.value)}
                        />
                      </div>
                    )}

                    <div className="composer-actions">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={reliable}
                          onChange={(event) => setReliable(event.target.checked)}
                        />
                        Reliable
                      </label>
                      <div className="action-group">
                        <button className="btn ghost" onClick={clearSelection} disabled={!hasSelection}>
                          Clear selection
                        </button>
                        <button className="btn" onClick={sendPacket} disabled={wsStatus !== 'connected'}>
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="status-line">
                    <span>{statusMessage || 'Ready'}</span>
                    <span>{wsStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="settings-view">
            <div className="settings-grid">
              <section className="panel">
                <div className="panel-header">
                  <h3>Launch Profile</h3>
                </div>
                <div className="launcher-grid">
                  <label className="field-inline">
                    Profile Name
                    <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                  </label>
                  <label className="field-inline">
                    Log File Name
                    <input
                      value={launchLogFileName}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setLaunchLogFileName(nextValue);
                        setLaunchEnvText((prev) => upsertEnvLine(prev, 'LOG_FILE_NAME', nextValue));
                      }}
                    />
                  </label>
                  <label className="field-inline">
                    Server Type
                    <select value={launchKind} onChange={(event) => setLaunchKind(event.target.value as ServerKind)}>
                      <option value="master">master</option>
                      <option value="world">world</option>
                    </select>
                  </label>
                  <label className="field-inline">
                    UDP Port
                    <input value={launchPort} onChange={(event) => setLaunchPort(event.target.value)} />
                  </label>
                  <label className="field-inline">
                    ServerIP
                    <input value={launchServerIp} onChange={(event) => setLaunchServerIp(event.target.value)} />
                  </label>
                  <label className="field-inline">
                    Admin Port
                    <input value={launchAdminPort} onChange={(event) => setLaunchAdminPort(event.target.value)} />
                  </label>
                  <label className="field-inline">
                    Admin Token
                    <input
                      value={launchAdminToken}
                      onChange={(event) => {
                        setLaunchAdminToken(event.target.value);
                        setToken(event.target.value);
                      }}
                    />
                  </label>
                  <label className="field-inline">
                    Refresh Interval (ms)
                    <input
                      type="number"
                      min={500}
                      value={refreshInterval}
                      onChange={(event) => setRefreshInterval(Number(event.target.value))}
                    />
                  </label>
                </div>
                <div className="field">
                  <label>Env (KEY=VALUE, newline or comma)</label>
                  <textarea
                    rows={6}
                    value={launchEnvText}
                    onChange={(event) => setLaunchEnvText(event.target.value)}
                  />
                </div>
                <div className="launcher-actions">
                  <div className="action-group">
                    <button className="btn" onClick={saveProfile}>Save</button>
                    <button className="btn ghost" onClick={deleteProfile} disabled={!activeProfileId}>Delete</button>
                    <button className="btn ghost" onClick={launchServer} disabled={!profileName.trim()}>
                      Launch
                    </button>
                  </div>
                  <div className="action-group">
                    <button className="btn ghost" onClick={exportProfiles}>Export</button>
                    <button className="btn ghost" onClick={triggerImport}>Import</button>
                    <input
                      ref={fileInputRef}
                      className="hidden-file"
                      type="file"
                      accept="application/json"
                      onChange={onImportProfiles}
                    />
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
