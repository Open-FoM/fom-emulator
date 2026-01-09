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
    server: ServerConfig;
    packetLog: PacketLogConfig;
}

// Interpret common truthy strings for env flags.
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

// Build runtime config snapshot from environment variables.
export function loadRuntimeConfig(): RuntimeConfig {
    const env = process.env;

    const server: ServerConfig = {
        port: parseInt(env.PORT || '61000', 10),
        maxConnections: parseInt(env.MAX_CONNECTIONS || '100', 10),
        password: env.SERVER_PASSWORD || '37eG87Ph',
        serverMode: (env.SERVER_MODE || 'master') as 'master' | 'world',
        worldIp: env.WORLD_IP || '127.0.0.1',
        worldPort: parseInt(env.WORLD_PORT || '62000', 10),
        debug: parseBool(env.DEBUG, true),
        loginDebug: parseBool(env.LOGIN_DEBUG, false),
        loginStrict: parseBool(env.LOGIN_STRICT, false),
        loginRequireCredentials: parseBool(env.LOGIN_REQUIRE_CREDENTIALS, false),
        acceptLoginAuthWithoutUser: parseBool(env.ACCEPT_AUTH_WITHOUT_USER, false),
        resendDuplicateLogin6D: parseBool(env.RESEND_DUPLICATE_6D, false),
        loginClientVersion: parseInt(env.LOGIN_CLIENT_VERSION || '0', 10),
        worldSelectWorldId: parseInt(env.WORLD_ID || '0', 10),
        worldSelectWorldInst: parseInt(env.WORLD_INST || '0', 10),
        worldSelectPlayerId: parseInt(env.WORLD_SELECT_PLAYER_ID || '0', 10),
        worldSelectPlayerIdRandom: parseBool(env.WORLD_SELECT_PLAYER_ID_RANDOM, false),
    };

    const quiet = parseBool(env.QUIET_MODE || env.FOM_QUIET_LOGS, false);
    const consoleMode = parseConsoleMode(env.PACKET_LOG);
    const consoleMinIntervalMs = Math.max(
        0,
        Number.parseInt(env.PACKET_LOG_INTERVAL_MS || '5000', 10) || 0,
    );
    const logToFile = parseBool(env.PACKET_LOG_FILE, true);
    const analysisEnabled = parseBool(env.PACKET_LOG_ANALYSIS, false);
    const consolePacketIds = parsePacketIds(env.PACKET_LOG_IDS);
    const filePacketIds = parsePacketIds(env.PACKET_LOG_FILE_IDS);
    const ignorePacketIds = parsePacketIds(env.PACKET_LOG_IGNORE_IDS);
    const consoleRepeatSuppressMs = Math.max(
        0,
        Number.parseInt(env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0,
    );
    const flushMode = parseFlushMode(env.PACKET_LOG_FLUSH);

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
        server,
        packetLog,
    };
}
