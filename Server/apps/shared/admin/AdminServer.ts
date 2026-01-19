/**
 * Shared admin server for master/world with injected handlers.
 */

import type { ServerWebSocket } from 'bun';
import os from 'node:os';
import * as Packets from '@openfom/packets';
import { info as logInfo, type LogEntry } from '@openfom/utils';
import type { RakSystemAddress } from '@openfom/networking';

export interface AdminConfigLike {
    enabled: boolean;
    port: number;
    token: string;
    profileName?: string;
}

export interface AdminTarget {
    address: RakSystemAddress;
}

export interface AdminServerOptions<TTarget extends AdminTarget> {
    admin: AdminConfigLike;
    serverPort: number;
    serverLabel: string;
    connectionCount: () => number;
    listConnections: () => unknown[];
    resolveTargets: (ids: string[] | null) => TTarget[];
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
    sendUnreliable: (data: Buffer, address: RakSystemAddress) => boolean;
    shutdown: () => void;
    getInfoPayload?: () => Record<string, unknown>;
    onSetWorldServers?: (
        servers: Array<string | { ip: string; port: number; worldId?: number }>,
    ) => {
        count: number;
        summary: string;
    };
}

type AdminSocketData = {
    authed: boolean;
    subscribed: boolean;
    logSubscribed: boolean;
    metricsSubscribed: boolean;
    intervalId?: ReturnType<typeof setInterval>;
    metricsIntervalId?: ReturnType<typeof setInterval>;
};

type AdminRequest =
    | { type: 'auth'; token: string }
    | { type: 'list_connections' }
    | { type: 'list_logs'; tail?: number }
    | { type: 'list_metrics' }
    | { type: 'list_state'; tail?: number }
    | { type: 'subscribe_connections'; intervalMs?: number }
    | { type: 'subscribe_logs'; tail?: number }
    | { type: 'subscribe_metrics'; intervalMs?: number }
    | {
          type: 'send_packet';
          target: 'all' | 'ids';
          ids?: string[];
          packetName: string;
          params?: Record<string, unknown>;
          reliable?: boolean;
      }
    | { type: 'send_raw'; target: 'all' | 'ids'; ids?: string[]; hex: string; reliable?: boolean }
    | {
          type: 'set_world_servers';
          servers: Array<string | { ip: string; port: number; worldId?: number }>;
      }
    | { type: 'shutdown' };

const DEFAULT_PACKET_TYPES = Object.entries(Packets)
    .filter(([, value]) => typeof value === 'function')
    .filter(([, value]) => typeof (value as any).prototype?.encode === 'function')
    .filter(
        ([, value]) =>
            typeof (value as any).RAKNET_ID !== 'undefined' ||
            typeof (value as any).MESSAGE_ID !== 'undefined' ||
            typeof (value as any).GAME_ID !== 'undefined',
    )
    .map(([name]) => name)
    .sort();

type TelemetrySnapshot = {
    cpuPercent: number;
    rssMb: number;
    heapMb: number;
    uptimeSec: number;
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(ws: ServerWebSocket<AdminSocketData>, payload: unknown): void {
    ws.send(JSON.stringify(payload));
}

const MAX_LOG_BUFFER = 400;
const logBuffer: LogEntry[] = [];
const sockets = new Set<ServerWebSocket<AdminSocketData>>();
const metricsSubscribers = new Set<ServerWebSocket<AdminSocketData>>();
const adminTrace = false;
let consoleHooked = false;
const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};
let metricsTimer: ReturnType<typeof setInterval> | null = null;
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();
const cpuCores = Math.max(1, os.cpus()?.length ?? 1);

function sampleTelemetry(): TelemetrySnapshot {
    const now = Date.now();
    const usage = process.cpuUsage();
    const cpuMicros = usage.user - lastCpuUsage.user + (usage.system - lastCpuUsage.system);
    const elapsedMs = Math.max(1, now - lastCpuTime);
    lastCpuUsage = usage;
    lastCpuTime = now;

    const cpuPercent = Math.min(
        100,
        Math.max(0, (cpuMicros / 1000 / (elapsedMs * cpuCores)) * 100),
    );
    const mem = process.memoryUsage();
    return {
        cpuPercent,
        rssMb: mem.rss / (1024 * 1024),
        heapMb: mem.heapUsed / (1024 * 1024),
        uptimeSec: process.uptime(),
    };
}

function broadcastTelemetry(): void {
    const snapshot = sampleTelemetry();
    for (const ws of metricsSubscribers) {
        if (ws.readyState !== ws.OPEN) continue;
        sendJson(ws, { type: 'metrics', telemetry: snapshot });
    }
}

function ensureMetricsTimer(intervalMs: number): void {
    if (metricsTimer) clearInterval(metricsTimer);
    metricsTimer = setInterval(broadcastTelemetry, intervalMs);
}

function pushLog(entry: LogEntry): void {
    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();
    for (const ws of sockets) {
        if (!ws.data.authed || !ws.data.logSubscribed) continue;
        if (ws.readyState !== ws.OPEN) continue;
        sendJson(ws, { type: 'log', level: entry.level, message: entry.message, ts: entry.ts });
    }
}

function formatLogArgs(args: unknown[]): string {
    const stripAnsi = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, '');
    return args
        .map((arg) => {
            if (typeof arg === 'string') return stripAnsi(arg);
            if (arg instanceof Error) return stripAnsi(arg.stack || arg.message);
            try {
                return stripAnsi(JSON.stringify(arg));
            } catch {
                return stripAnsi(String(arg));
            }
        })
        .join(' ');
}

function hookConsole(): void {
    if (consoleHooked) return;
    consoleHooked = true;
    console.log = (...args: unknown[]) => {
        originalConsole.log(...args);
        pushLog({ level: 'log', message: formatLogArgs(args), ts: Date.now() });
    };
    console.warn = (...args: unknown[]) => {
        originalConsole.warn(...args);
        pushLog({ level: 'warn', message: formatLogArgs(args), ts: Date.now() });
    };
    console.error = (...args: unknown[]) => {
        originalConsole.error(...args);
        pushLog({ level: 'error', message: formatLogArgs(args), ts: Date.now() });
    };
}

function parseJsonMessage(message: string | Buffer): AdminRequest | null {
    const text = typeof message === 'string' ? message : message.toString('utf8');
    try {
        return JSON.parse(text) as AdminRequest;
    } catch {
        return null;
    }
}

function normalizeHex(input: string): string {
    return input.replace(/^0x/i, '').replace(/[\s_]/g, '');
}

function bufferFromHex(hex: string): Buffer {
    const normalized = normalizeHex(hex);
    if (normalized.length === 0) return Buffer.alloc(0);
    if (normalized.length % 2 !== 0) {
        throw new Error('Hex payload length must be even');
    }
    return Buffer.from(normalized, 'hex');
}

function normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = { ...params };
    for (const [key, value] of Object.entries(params)) {
        if (typeof value !== 'string') continue;
        if (key.endsWith('Hex')) {
            const baseKey = key.slice(0, -3);
            output[baseKey] = bufferFromHex(value);
        }
        if (key.endsWith('Base64')) {
            const baseKey = key.slice(0, -6);
            output[baseKey] = Buffer.from(value, 'base64');
        }
    }
    return output;
}

function buildPacketBuffer(
    packetName: string,
    params: Record<string, unknown> | undefined,
): Buffer {
    if (packetName === 'raw_hex') {
        const hex = typeof params?.hex === 'string' ? params.hex : '';
        return bufferFromHex(hex);
    }

    const ctor = (Packets as Record<string, new (data: any) => { encode: () => Buffer }>)[
        packetName
    ];
    if (!ctor) {
        throw new Error(`Unknown packet type: ${packetName}`);
    }

    const normalized = normalizeParams(params ?? {});
    const instance = new ctor(normalized);
    if (!instance || typeof instance.encode !== 'function') {
        throw new Error(`Packet ${packetName} has no encode()`);
    }
    return instance.encode();
}

function sendToTargets<TTarget extends AdminTarget>(options: {
    targets: TTarget[];
    payload: Buffer;
    reliable: boolean;
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
    sendUnreliable: (data: Buffer, address: RakSystemAddress) => boolean;
}) {
    const { targets, payload, reliable, sendReliable, sendUnreliable } = options;
    let sent = 0;
    let failed = 0;

    for (const conn of targets) {
        const ok = reliable
            ? sendReliable(payload, conn.address)
            : sendUnreliable(payload, conn.address);
        if (ok) sent += 1;
        else failed += 1;
    }

    return { sent, failed, total: targets.length };
}

/**
 * Start the shared admin server for master/world control planes.
 * @param {AdminServerOptions<TTarget>} options - Admin server configuration.
 * @returns {void} No return value.
 */
export function startAdminServer<TTarget extends AdminTarget>(
    options: AdminServerOptions<TTarget>,
): void {
    const {
        admin,
        serverPort,
        serverLabel,
        connectionCount,
        listConnections,
        resolveTargets,
        sendReliable,
        sendUnreliable,
        shutdown,
        getInfoPayload,
        onSetWorldServers,
    } = options;

    if (!admin.enabled) {
        logInfo('[Admin] Disabled (ADMIN_ENABLED=0)');
        return;
    }

    const server = Bun.serve<AdminSocketData>({
        port: admin.port,
        hostname: '127.0.0.1',
        fetch(req, server) {
            if (req.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: corsHeaders });
            }
            const url = new URL(req.url);
            if (url.pathname === '/admin/info') {
                const basePayload: Record<string, unknown> = {
                    ok: true,
                    server: serverLabel,
                    pid: process.pid,
                    adminPort: admin.port,
                    serverPort,
                    profileName: admin.profileName,
                    connectionCount: connectionCount(),
                    packetTypes: DEFAULT_PACKET_TYPES,
                };
                const extra = getInfoPayload ? getInfoPayload() : {};
                return new Response(JSON.stringify({ ...basePayload, ...extra }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
            if (url.pathname === '/admin/ws') {
                const success = server.upgrade(req, {
                    data: {
                        authed: false,
                        subscribed: false,
                        logSubscribed: false,
                        metricsSubscribed: false,
                    },
                });
                return success
                    ? new Response(null, { status: 101 })
                    : new Response('Upgrade failed', { status: 400 });
            }
            return new Response('Not found', { status: 404 });
        },
        websocket: {
            open(ws) {
                sockets.add(ws);
                if (adminTrace) {
                    logInfo(`[AdminTrace] WS open (sockets=${sockets.size})`);
                }
            },
            message(ws, message) {
                const data = parseJsonMessage(message);
                if (!data) {
                    sendJson(ws, { type: 'error', message: 'Invalid JSON' });
                    return;
                }
                if (adminTrace) {
                    logInfo(`[AdminTrace] WS msg type=${(data as any).type}`);
                }

                if (!ws.data.authed) {
                    if (data.type === 'auth' && data.token === admin.token) {
                        ws.data.authed = true;
                        sendJson(ws, {
                            type: 'auth_ok',
                            server: serverLabel,
                            packetTypes: DEFAULT_PACKET_TYPES,
                        });
                        if (adminTrace) {
                            logInfo('[AdminTrace] auth_ok');
                        }
                        return;
                    }
                    sendJson(ws, { type: 'auth_error', message: 'Invalid token' });
                    ws.close();
                    return;
                }

                if (data.type === 'list_connections') {
                    const items = listConnections();
                    if (adminTrace) {
                        logInfo(`[AdminTrace] list_connections count=${items.length}`);
                    }
                    sendJson(ws, { type: 'connections', items });
                    return;
                }

                if (data.type === 'list_logs') {
                    const tail = Math.max(0, Math.min(MAX_LOG_BUFFER, Number(data.tail ?? 200)));
                    const slice = tail > 0 ? logBuffer.slice(-tail) : logBuffer;
                    if (adminTrace) {
                        logInfo(
                            `[AdminTrace] list_logs tail=${tail} buffer=${logBuffer.length} slice=${slice.length}`,
                        );
                    }
                    sendJson(ws, { type: 'logs', items: slice });
                    return;
                }

                if (data.type === 'list_metrics') {
                    if (adminTrace) {
                        logInfo('[AdminTrace] list_metrics');
                    }
                    sendJson(ws, { type: 'metrics', telemetry: sampleTelemetry() });
                    return;
                }

                if (data.type === 'list_state') {
                    const tail = Math.max(0, Math.min(MAX_LOG_BUFFER, Number(data.tail ?? 200)));
                    const slice = tail > 0 ? logBuffer.slice(-tail) : logBuffer;
                    const items = listConnections();
                    if (adminTrace) {
                        logInfo(
                            `[AdminTrace] list_state tail=${tail} logs=${slice.length} conns=${items.length}`,
                        );
                    }
                    sendJson(ws, {
                        type: 'state',
                        telemetry: sampleTelemetry(),
                        connections: items,
                        logs: slice,
                    });
                    return;
                }

                if (data.type === 'subscribe_connections') {
                    const intervalMs = Math.max(250, Number(data.intervalMs ?? 1000));
                    ws.data.subscribed = true;
                    if (ws.data.intervalId) clearInterval(ws.data.intervalId);
                    ws.data.intervalId = setInterval(() => {
                        if (ws.readyState !== ws.OPEN) return;
                        sendJson(ws, { type: 'connections', items: listConnections() });
                    }, intervalMs);
                    sendJson(ws, { type: 'subscribed', intervalMs });
                    if (adminTrace) {
                        logInfo(`[AdminTrace] subscribe_connections interval=${intervalMs}`);
                    }
                    return;
                }

                if (data.type === 'subscribe_logs') {
                    ws.data.logSubscribed = true;
                    const tail = Math.max(0, Math.min(MAX_LOG_BUFFER, Number(data.tail ?? 200)));
                    if (tail > 0) {
                        const slice = logBuffer.slice(-tail);
                        for (const entry of slice) {
                            sendJson(ws, {
                                type: 'log',
                                level: entry.level,
                                message: entry.message,
                                ts: entry.ts,
                            });
                        }
                    }
                    if (adminTrace) {
                        logInfo(
                            `[AdminTrace] subscribe_logs tail=${tail} buffer=${logBuffer.length}`,
                        );
                    }
                    return;
                }

                if (data.type === 'subscribe_metrics') {
                    ws.data.metricsSubscribed = true;
                    metricsSubscribers.add(ws);
                    const intervalMs = Math.max(500, Number(data.intervalMs ?? 1000));
                    ensureMetricsTimer(intervalMs);
                    sendJson(ws, { type: 'metrics', telemetry: sampleTelemetry() });
                    if (adminTrace) {
                        logInfo(`[AdminTrace] subscribe_metrics interval=${intervalMs}`);
                    }
                    return;
                }

                if (data.type === 'send_packet') {
                    try {
                        const payload = buildPacketBuffer(data.packetName, data.params);
                        const targets = resolveTargets(
                            data.target === 'all' ? null : (data.ids ?? []),
                        );
                        const result = sendToTargets({
                            targets,
                            payload,
                            reliable: data.reliable !== false,
                            sendReliable,
                            sendUnreliable,
                        });
                        sendJson(ws, { type: 'send_result', ...result });
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        sendJson(ws, { type: 'send_error', message });
                    }
                    return;
                }

                if (data.type === 'send_raw') {
                    try {
                        const payload = bufferFromHex(data.hex);
                        const targets = resolveTargets(
                            data.target === 'all' ? null : (data.ids ?? []),
                        );
                        const result = sendToTargets({
                            targets,
                            payload,
                            reliable: data.reliable !== false,
                            sendReliable,
                            sendUnreliable,
                        });
                        sendJson(ws, { type: 'send_result', ...result });
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        sendJson(ws, { type: 'send_error', message });
                    }
                    return;
                }

                if (data.type === 'set_world_servers') {
                    if (!onSetWorldServers) {
                        sendJson(ws, { type: 'error', message: 'set_world_servers not supported' });
                        return;
                    }
                    const result = onSetWorldServers(data.servers || []);
                    logInfo(`[Admin] World servers updated (${result.count}): ${result.summary}`);
                    sendJson(ws, { type: 'world_servers_updated', count: result.count });
                    return;
                }

                if (data.type === 'shutdown') {
                    sendJson(ws, { type: 'shutdown_ack' });
                    setTimeout(() => shutdown(), 50);
                    return;
                }

                sendJson(ws, {
                    type: 'error',
                    message: `Unknown message type: ${(data as any).type}`,
                });
            },
            close(ws) {
                if (ws.data.intervalId) clearInterval(ws.data.intervalId);
                sockets.delete(ws);
                metricsSubscribers.delete(ws);
                if (metricsSubscribers.size === 0 && metricsTimer) {
                    clearInterval(metricsTimer);
                    metricsTimer = null;
                }
            },
        },
    });

    hookConsole();

    logInfo(`[Admin] ${serverLabel} admin server listening on 127.0.0.1:${server.port}`);
}
