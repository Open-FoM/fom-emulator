import * as fs from 'fs';
import * as path from 'path';

export type ConsoleMode = 'off' | 'summary' | 'full';
export type FlushMode = 'off' | 'login' | 'always';

export interface ServerConfig {
    port: number;
    maxConnections: number;
    password: string;
    serverMode: 'master' | 'world';
    worldIp: string;
    worldPort: number;
    debug: boolean;
    loginDebug: boolean;
    loginStrict: boolean;
    loginRequireCredentials: boolean;
    acceptLoginAuthWithoutUser: boolean;
    resendDuplicateLogin6D: boolean;
    loginClientVersion: number;
    worldSelectWorldId: number;
    worldSelectWorldInst: number;
    worldSelectPlayerId: number;
    worldSelectPlayerIdRandom: boolean;
}

export interface PacketLogConfig {
    quiet: boolean;
    consoleMode: ConsoleMode;
    consoleMinIntervalMs: number;
    logToFile: boolean;
    analysisEnabled: boolean;
    consolePacketIds?: number[];
    filePacketIds?: number[];
    ignorePacketIds?: number[];
    consoleRepeatSuppressMs: number;
    flushMode: FlushMode;
}

export interface RuntimeConfig {
    iniPath: string;
    iniConfig: Record<string, string>;
    server: ServerConfig;
    packetLog: PacketLogConfig;
}

// Interpret common truthy strings for env/ini flags.
export function parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

// Normalize packet log console mode settings.
export function parseConsoleMode(value: string | undefined): ConsoleMode {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'off' || normalized === 'none' || normalized === '0') return 'off';
    if (normalized === 'summary' || normalized === 'short') return 'summary';
    return 'full';
}

// Normalize packet log flush behavior.
export function parseFlushMode(value: string | undefined): FlushMode {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'always') return 'always';
    if (normalized === 'login') return 'login';
    return 'off';
}

// Parse a comma-delimited list of packet IDs (hex or decimal).
export function parsePacketIds(value: string | undefined): number[] | undefined {
    if (!value) return undefined;
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    const ids: number[] = [];
    for (const part of parts) {
        const parsed = part.startsWith('0x') || part.startsWith('0X')
            ? Number.parseInt(part, 16)
            : Number.parseInt(part, 10);
        if (Number.isFinite(parsed)) {
            ids.push(parsed & 0xff);
        }
    }
    return ids.length > 0 ? ids : undefined;
}

// Minimal ini reader: uppercase keys, ignore sections and comments.
export function loadIniConfig(filePath: string): Record<string, string> {
    const config: Record<string, string> = {};
    if (!fs.existsSync(filePath)) return config;
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim().toUpperCase();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key) config[key] = value;
    }
    return config;
}

// Resolve ini path using FOM_INI or workspace defaults.
export function resolveIniPath(): string {
    const override = process.env.FOM_INI;
    if (override && override.trim() !== '') {
        return path.resolve(override.trim());
    }
    const candidates = [
        path.resolve(process.cwd(), 'fom_server.ini'),
        path.resolve(process.cwd(), 'Server', 'Master_TS', 'fom_server.ini'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return candidates[0];
}

// Read a setting from ini (highest priority) or env.
function readSetting(iniConfig: Record<string, string>, name: string): string | undefined {
    const key = name.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(iniConfig, key)) {
        return iniConfig[key];
    }
    return process.env[name];
}

// Read the first available setting from a list of keys.
function readSettingAny(iniConfig: Record<string, string>, ...names: string[]): string | undefined {
    for (const name of names) {
        const value = readSetting(iniConfig, name);
        if (value !== undefined && value !== '') return value;
    }
    return undefined;
}

// Build runtime config snapshot for server and packet logging.
export function loadRuntimeConfig(): RuntimeConfig {
    const iniPath = resolveIniPath();
    const iniConfig = loadIniConfig(iniPath);

    const server: ServerConfig = {
        port: parseInt(readSetting(iniConfig, 'PORT') || '61000', 10),
        maxConnections: parseInt(readSetting(iniConfig, 'MAX_CONNECTIONS') || '100', 10),
        password: readSetting(iniConfig, 'SERVER_PASSWORD') || '37eG87Ph',
        serverMode: (readSetting(iniConfig, 'SERVER_MODE') || 'master') as 'master' | 'world',
        worldIp: readSetting(iniConfig, 'WORLD_IP') || '127.0.0.1',
        worldPort: parseInt(readSetting(iniConfig, 'WORLD_PORT') || '62000', 10),
        debug: parseBool(readSetting(iniConfig, 'DEBUG'), true),
        loginDebug: parseBool(readSetting(iniConfig, 'LOGIN_DEBUG'), false),
        loginStrict: parseBool(readSetting(iniConfig, 'LOGIN_STRICT'), false),
        loginRequireCredentials: parseBool(readSetting(iniConfig, 'LOGIN_REQUIRE_CREDENTIALS'), false),
        acceptLoginAuthWithoutUser: parseBool(readSetting(iniConfig, 'ACCEPT_AUTH_WITHOUT_USER'), false),
        resendDuplicateLogin6D: parseBool(readSetting(iniConfig, 'RESEND_DUPLICATE_6D'), false),
        loginClientVersion: parseInt(readSetting(iniConfig, 'LOGIN_CLIENT_VERSION') || '0', 10),
        worldSelectWorldId: parseInt(readSettingAny(iniConfig, 'FOM_WORLD_ID', 'WORLD_ID') || '0', 10),
        worldSelectWorldInst: parseInt(readSettingAny(iniConfig, 'FOM_WORLD_INST', 'WORLD_INST') || '0', 10),
        worldSelectPlayerId: parseInt(readSetting(iniConfig, 'WORLD_SELECT_PLAYER_ID') || '0', 10),
        worldSelectPlayerIdRandom: parseBool(readSetting(iniConfig, 'WORLD_SELECT_PLAYER_ID_RANDOM'), false),
    };

    const quiet = parseBool(readSettingAny(iniConfig, 'QUIET_MODE', 'FOM_QUIET_LOGS'), false);
    const consoleMode = parseConsoleMode(readSetting(iniConfig, 'PACKET_LOG'));
    const consoleMinIntervalMs = Math.max(
        0,
        Number.parseInt(readSetting(iniConfig, 'PACKET_LOG_INTERVAL_MS') || '5000', 10) || 0,
    );
    const logToFile = parseBool(readSetting(iniConfig, 'PACKET_LOG_FILE'), true);
    const analysisEnabled = parseBool(readSetting(iniConfig, 'PACKET_LOG_ANALYSIS'), false);
    const consolePacketIds = parsePacketIds(readSetting(iniConfig, 'PACKET_LOG_IDS'));
    const filePacketIds = parsePacketIds(readSetting(iniConfig, 'PACKET_LOG_FILE_IDS'));
    const ignorePacketIds = parsePacketIds(readSetting(iniConfig, 'PACKET_LOG_IGNORE_IDS'));
    const consoleRepeatSuppressMs = Math.max(
        0,
        Number.parseInt(readSetting(iniConfig, 'PACKET_LOG_REPEAT_SUPPRESS_MS') || '2000', 10) || 0,
    );
    const flushMode = parseFlushMode(readSetting(iniConfig, 'PACKET_LOG_FLUSH'));

    const packetLog: PacketLogConfig = {
        quiet,
        consoleMode,
        consoleMinIntervalMs,
        logToFile,
        analysisEnabled,
        consolePacketIds,
        filePacketIds,
        ignorePacketIds,
        consoleRepeatSuppressMs,
        flushMode,
    };

    return {
        iniPath,
        iniConfig,
        server,
        packetLog,
    };
}
