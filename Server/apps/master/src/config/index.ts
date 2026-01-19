/**
 * Packet log console verbosity mode.
 */
export type ConsoleMode = 'off' | 'summary' | 'full';

/**
 * Packet log flush mode for console/file outputs.
 */
export type FlushMode = 'off' | 'login' | 'always';

/**
 * Rule entry for selective packet logging.
 */
export interface LogRuleConfig {
    tag: string;
    ids: number[];
    repeatMs: number;
    minIntervalMs: number;
    suppress: boolean;
}

/**
 * Named logging profile composed of rule overrides.
 */
export interface LogProfileConfig {
    name: string;
    repeatMs: number;
    minIntervalMs: number;
    rules: LogRuleConfig[];
}

/**
 * Runtime configuration for the master server process.
 */
export interface ServerConfig {
    port: number;
    maxConnections: number;
    password: string;
    serverMode: 'master' | 'world';
    debug: boolean;
    connectionTimeoutMs: number;
    masterHeartbeatTimeoutMs: number;
    loginDebug: boolean;
    loginStrict: boolean;
    loginRequireCredentials: boolean;
    acceptLoginAuthWithoutUser: boolean;
    resendDuplicateLogin6D: boolean;
    loginClientVersion: number;
    loginResetDelayMs: number;
    worldSelectWorldId: number;
    worldSelectWorldInst: number;
    worldSelectPlayerId: number;
    worldSelectPlayerIdRandom: boolean;
    loginAccountType: number;
    loginIsFullAccount: boolean;
    loginHasCharFlags: boolean;
    worldServers: WorldEndpointConfig[];
    worldDiscoveryToken: string;
    worldDiscoveryIntervalMs: number;
    worldDiscoveryStaleTtlMs: number;
}
export const DEFAULT_WORLD_ID = 1;

/**
 * Static world endpoint configuration entry.
 */
export interface WorldEndpointConfig {
    ip: string;
    port: number;
}

/**
 * Packet logging configuration for console/file output.
 */
export interface PacketLogConfig {
    quiet: boolean;
    consoleMode: ConsoleMode;
    consoleMinIntervalMs: number;
    logToFile: boolean;
    logFileName?: string;
    analysisEnabled: boolean;
    consolePacketIds?: number[];
    filePacketIds?: number[];
    ignorePacketIds?: number[];
    consoleRepeatSuppressMs: number;
    flushMode: FlushMode;
    logProfile?: LogProfileConfig;
    rawCapture: boolean;
    rawCaptureRecv: boolean;
    rawCaptureSend: boolean;
    rawCaptureMaxQueue: number;
    rawCaptureMaxBytes: number;
    rawCaptureOnly: boolean;
    reliableTrace: boolean;
    reliableTraceIntervalMs: number;
}

/**
 * Admin API configuration.
 */
export interface AdminConfig {
    enabled: boolean;
    port: number;
    token: string;
    profileName: string;
}

/**
 * Aggregated runtime configuration bundle.
 */
export interface RuntimeConfig {
    server: ServerConfig;
    packetLog: PacketLogConfig;
    admin: AdminConfig;
}

/**
 * Interpret common truthy strings for env flags.
 * @param {string | undefined} value - Raw env value.
 * @param {boolean} fallback - Fallback when value is empty.
 * @returns {boolean} Parsed boolean value.
 */
export function parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    const normalized = value.trim().toLowerCase();
    return (
        normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
    );
}

/**
 * Normalize packet log console mode settings.
 * @param {string | undefined} value - Raw env value.
 * @returns {ConsoleMode} Parsed console mode.
 */
export function parseConsoleMode(value: string | undefined): ConsoleMode {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'off' || normalized === 'none' || normalized === '0') return 'off';
    if (normalized === 'summary' || normalized === 'short') return 'summary';
    return 'full';
}

/**
 * Normalize packet log flush behavior.
 * @param {string | undefined} value - Raw env value.
 * @returns {FlushMode} Parsed flush mode.
 */
export function parseFlushMode(value: string | undefined): FlushMode {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'always') return 'always';
    if (normalized === 'login') return 'login';
    return 'off';
}

/**
 * Parse a comma-delimited list of packet IDs (hex or decimal).
 * @param {string | undefined} value - Raw env value.
 * @returns {number[] | undefined} Parsed packet IDs (8-bit masked).
 */
export function parsePacketIds(value: string | undefined): number[] | undefined {
    if (!value) return undefined;
    const parts = value
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    const ids: number[] = [];
    for (const part of parts) {
        const parsed =
            part.startsWith('0x') || part.startsWith('0X')
                ? Number.parseInt(part, 16)
                : Number.parseInt(part, 10);
        if (Number.isFinite(parsed)) {
            ids.push(parsed & 0xff);
        }
    }
    return ids.length > 0 ? ids : undefined;
}

/**
 * Normalize a profile name into an uppercase token.
 * @param {string} name - Raw profile name.
 * @returns {string} Normalized profile name.
 */
function normalizeProfileName(name: string): string {
    return name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}

/**
 * Parse an optional integer, returning -1 when missing/invalid.
 * @param {string | undefined} value - Raw env value.
 * @returns {number} Parsed integer or -1.
 */
function parseOptionalInt(value: string | undefined): number {
    if (!value) return -1;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : -1;
}

/**
 * Normalize rule tags and aliases into canonical tag names.
 * @param {string} tag - Raw tag string.
 * @returns {string} Canonicalized tag value.
 */
function normalizeRuleTag(tag: string): string {
    const trimmed = tag.trim();
    if (!trimmed) return trimmed;
    if (['*', 'ALL', 'ANY'].includes(trimmed.toUpperCase())) return '*';
    if (['RAKRECV', 'RAKNETRECV'].includes(trimmed.toUpperCase())) return 'Rak][Net_Recv';
    if (['RAKSEND', 'RAKSENDTO'].includes(trimmed.toUpperCase())) return 'Rak][Net_SendTo';
    if (['LITHRECV', 'LITHNETRECV'].includes(trimmed.toUpperCase())) return 'Lith][Net_Recv';
    if (['LITHSEND', 'LITHSENDTO'].includes(trimmed.toUpperCase())) return 'Lith][Net_SendTo';
    return trimmed;
}

/**
 * Apply inline alias tokens (ids, repeat, suppress) to a rule.
 * @param {string} value - Alias definition string.
 * @param {LogRuleConfig} rule - Rule to mutate.
 * @returns {void} No return value.
 */
function parseAliasValue(value: string, rule: LogRuleConfig): void {
    let rest = value.trim();
    if (!rest) return;
    if (rest.endsWith('!')) {
        rule.suppress = true;
        rest = rest.slice(0, -1).trim();
    }
    const at = rest.indexOf('@');
    if (at !== -1) {
        const repeatStr = rest.slice(at + 1).trim();
        rest = rest.slice(0, at).trim();
        if (repeatStr) {
            rule.repeatMs = parseOptionalInt(repeatStr);
        }
    }
    if (rest && rest !== '*') {
        const ids = parsePacketIds(rest);
        if (ids) {
            rule.ids = ids;
        }
    }
}

/**
 * Fetch an existing rule or create a new one for a tag.
 * @param {LogRuleConfig[]} rules - Rule list to search/mutate.
 * @param {string} tag - Rule tag to match.
 * @returns {LogRuleConfig} Resolved rule entry.
 */
function getOrCreateRule(rules: LogRuleConfig[], tag: string): LogRuleConfig {
    const existing = rules.find((rule) => rule.tag.toLowerCase() === tag.toLowerCase());
    if (existing) return existing;
    const rule: LogRuleConfig = {
        tag,
        ids: [],
        repeatMs: -1,
        minIntervalMs: -1,
        suppress: false,
    };
    rules.push(rule);
    return rule;
}

/**
 * Apply a single alias key/value pair to the rule list.
 * @param {LogRuleConfig[]} rules - Rule list to mutate.
 * @param {string} aliasKey - Raw alias key.
 * @param {string} value - Raw alias value.
 * @returns {void} No return value.
 */
function applyAlias(rules: LogRuleConfig[], aliasKey: string, value: string): void {
    const upperKey = aliasKey.trim().toUpperCase();
    if (!upperKey) return;
    if (upperKey === 'MININTERVALMS' || upperKey === 'REPEATSUPPRESSMS') return;
    const suffixes = ['_IDS', '_REPEATMS', '_MININTERVALMS', '_SUPPRESS'];
    for (const suffix of suffixes) {
        if (upperKey.endsWith(suffix)) {
            const base = upperKey.slice(0, -suffix.length);
            const tag = normalizeRuleTag(base);
            if (!tag) return;
            const rule = getOrCreateRule(rules, tag);
            if (suffix === '_IDS') {
                const ids = parsePacketIds(value);
                if (ids) rule.ids = ids;
            } else if (suffix === '_REPEATMS') {
                rule.repeatMs = parseOptionalInt(value);
            } else if (suffix === '_MININTERVALMS') {
                rule.minIntervalMs = parseOptionalInt(value);
            } else if (suffix === '_SUPPRESS') {
                rule.suppress = parseBool(value, false);
            }
            return;
        }
    }
    const tag = normalizeRuleTag(upperKey);
    if (!tag) return;
    const rule = getOrCreateRule(rules, tag);
    parseAliasValue(value, rule);
}

/**
 * Parse a composite profile string into rule entries.
 * @param {string} value - Composite profile string.
 * @param {LogRuleConfig[]} rules - Rule list to mutate.
 * @returns {void} No return value.
 */
function parseProfileComposite(value: string, rules: LogRuleConfig[]): void {
    if (!value) return;
    const parts = value
        .split(/[;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean);
    for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const key = part.slice(0, eq).trim();
        const val = part.slice(eq + 1).trim();
        if (!key) continue;
        applyAlias(rules, key, val);
    }
}

/**
 * Parse logging profile configuration from environment variables.
 * @param {NodeJS.ProcessEnv} env - Process environment.
 * @returns {LogProfileConfig | undefined} Parsed profile or undefined.
 */
export function parseLogProfile(env: NodeJS.ProcessEnv): LogProfileConfig | undefined {
    const nameRaw = env.PACKET_LOG_PROFILE?.trim();
    if (!nameRaw) return undefined;
    const nameKey = normalizeProfileName(nameRaw);
    if (!nameKey) return undefined;
    const profile: LogProfileConfig = {
        name: nameRaw,
        repeatMs: -1,
        minIntervalMs: -1,
        rules: [],
    };
    const prefix = `PACKET_LOG_PROFILE_${nameKey}_`;
    const compositeKey = `PACKET_LOG_PROFILE_${nameKey}`;
    for (const [key, valueRaw] of Object.entries(env)) {
        if (valueRaw === undefined) continue;
        const upperKey = key.toUpperCase();
        if (upperKey === compositeKey) {
            parseProfileComposite(valueRaw, profile.rules);
            continue;
        }
        if (!upperKey.startsWith(prefix)) continue;
        const suffix = upperKey.slice(prefix.length);
        if (!suffix) continue;
        if (suffix === 'MININTERVALMS') {
            profile.minIntervalMs = parseOptionalInt(valueRaw);
            continue;
        }
        if (suffix === 'REPEATSUPPRESSMS') {
            profile.repeatMs = parseOptionalInt(valueRaw);
            continue;
        }
        applyAlias(profile.rules, suffix, valueRaw);
    }
    return profile.rules.length > 0 || profile.repeatMs >= 0 || profile.minIntervalMs >= 0
        ? profile
        : undefined;
}

/**
 * Parse comma-delimited list of ip:port entries (WORLD_SERVERS).
 * @param {string | undefined} value - Raw env value.
 * @returns {WorldEndpointConfig[]} Parsed endpoint list.
 */
export function parseWorldServers(value: string | undefined): WorldEndpointConfig[] {
    if (!value) return [];
    const entries = value
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    const results: WorldEndpointConfig[] = [];
    for (const entry of entries) {
        const [ip, portRaw] = entry.split(':');
        const port = Number.parseInt(portRaw || '', 10);
        if (!ip || !Number.isFinite(port)) continue;
        results.push({ ip, port });
    }
    return results;
}

/**
 * Build runtime config snapshot from environment variables.
 * @returns {RuntimeConfig} Parsed runtime config.
 */
export function loadRuntimeConfig(): RuntimeConfig {
    const env = process.env;
    const server: ServerConfig = {
        port: parseInt(env.PORT || '61000', 10),
        maxConnections: parseInt(env.MAX_CONNECTIONS || '100', 10),
        password: env.SERVER_PASSWORD || '37eG87Ph',
        serverMode: (env.SERVER_MODE || 'master') as 'master' | 'world',
        debug: parseBool(env.DEBUG, true),
        connectionTimeoutMs: Math.max(1000, parseInt(env.CONNECTION_TIMEOUT_MS || '60000', 10)),
        masterHeartbeatTimeoutMs: (() => {
            const raw = parseInt(env.MASTER_HEARTBEAT_TIMEOUT_MS || '20000', 10);
            if (!Number.isFinite(raw) || raw <= 0) return 0;
            return Math.max(20000, raw);
        })(),
        loginDebug: parseBool(env.LOGIN_DEBUG, false),
        loginStrict: parseBool(env.LOGIN_STRICT, false),
        loginRequireCredentials: parseBool(env.LOGIN_REQUIRE_CREDENTIALS, false),
        acceptLoginAuthWithoutUser: parseBool(env.ACCEPT_AUTH_WITHOUT_USER, false),
        resendDuplicateLogin6D: parseBool(env.RESEND_DUPLICATE_6D, false),
        loginClientVersion: parseInt(env.LOGIN_CLIENT_VERSION || '0', 10),
        loginResetDelayMs: parseInt(env.LOGIN_RESET_DELAY_MS || '3000', 10),
        worldSelectWorldId: parseInt(env.WORLD_ID || String(DEFAULT_WORLD_ID), 10),
        worldSelectWorldInst: parseInt(env.WORLD_INST || '0', 10),
        worldSelectPlayerId: parseInt(env.WORLD_SELECT_PLAYER_ID || '0', 10),
        worldSelectPlayerIdRandom: parseBool(env.WORLD_SELECT_PLAYER_ID_RANDOM, false),
        loginAccountType: Math.max(
            0,
            Math.min(3, Number.parseInt(env.LOGIN_ACCOUNT_TYPE || '0', 10) || 0),
        ),
        loginIsFullAccount: parseBool(env.LOGIN_IS_FULL_ACCOUNT, false),
        loginHasCharFlags: parseBool(env.LOGIN_HAS_CHAR_FLAGS, false),
        worldServers: parseWorldServers(env.WORLD_SERVERS),
        worldDiscoveryToken: env.WORLD_DISCOVERY_TOKEN || '',
        worldDiscoveryIntervalMs: parseInt(env.WORLD_DISCOVERY_INTERVAL_MS || '5000', 10),
        worldDiscoveryStaleTtlMs: parseInt(env.WORLD_DISCOVERY_STALE_TTL_MS || '15000', 10),
    };
    const quiet = parseBool(env.QUIET_MODE || env.FOM_QUIET_LOGS, false);
    const consoleMode = parseConsoleMode(env.PACKET_LOG);
    const consoleMinIntervalMs = Math.max(
        0,
        Number.parseInt(env.PACKET_LOG_INTERVAL_MS || '5000', 10) || 0,
    );
    const logToFile = parseBool(env.PACKET_LOG_FILE, true);
    const logFileName = (env.LOG_FILE_NAME || env.PACKET_LOG_FILE_NAME || '').trim() || undefined;
    const analysisEnabled = parseBool(env.PACKET_LOG_ANALYSIS, false);
    const consolePacketIds = parsePacketIds(env.PACKET_LOG_IDS);
    const filePacketIds = parsePacketIds(env.PACKET_LOG_FILE_IDS);
    const ignorePacketIds = parsePacketIds(env.PACKET_LOG_IGNORE_IDS);
    const consoleRepeatSuppressMs = Math.max(
        0,
        Number.parseInt(env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0,
    );
    const flushMode = parseFlushMode(env.PACKET_LOG_FLUSH);
    const logProfile = parseLogProfile(env);
    const rawCapture = parseBool(env.PACKET_LOG_RAW, true);
    const rawCaptureRecv = parseBool(env.PACKET_LOG_RAW_RECV, rawCapture);
    const rawCaptureSend = parseBool(env.PACKET_LOG_RAW_SEND, rawCapture);
    const rawCaptureMaxQueue = Math.max(
        1,
        Number.parseInt(env.PACKET_LOG_RAW_MAX_QUEUE || '4096', 10) || 4096,
    );
    const rawCaptureMaxBytes = Math.max(
        1,
        Number.parseInt(env.PACKET_LOG_RAW_MAX_BYTES || '4096', 10) || 4096,
    );
    const rawCaptureOnly = parseBool(env.PACKET_LOG_RAW_ONLY, true);
    const reliableTrace = parseBool(env.PACKET_LOG_RELIABLE_TRACE, false);
    const reliableTraceIntervalMs = Math.max(
        0,
        Number.parseInt(env.PACKET_LOG_RELIABLE_TRACE_MS || '1000', 10) || 1000,
    );
    const packetLog: PacketLogConfig = {
        quiet,
        consoleMode,
        consoleMinIntervalMs,
        logToFile,
        logFileName,
        analysisEnabled,
        consolePacketIds,
        filePacketIds,
        ignorePacketIds,
        consoleRepeatSuppressMs,
        flushMode,
        logProfile,
        rawCapture,
        rawCaptureRecv,
        rawCaptureSend,
        rawCaptureMaxQueue,
        rawCaptureMaxBytes,
        rawCaptureOnly,
        reliableTrace,
        reliableTraceIntervalMs,
    };
    const admin: AdminConfig = {
        enabled: parseBool(env.ADMIN_ENABLED, true),
        port: parseInt(env.ADMIN_PORT || '4701', 10),
        token: env.ADMIN_TOKEN || 'dev-admin-token',
        profileName: env.ADMIN_PROFILE_NAME || '',
    };
    return {
        server,
        packetLog,
        admin,
    };
}
