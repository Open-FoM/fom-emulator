/**
 * Master admin server adapter wiring shared admin endpoints.
 */
import type { RakSystemAddress } from '@openfom/networking';
import { info } from '@openfom/utils';
import type { AdminConfig } from '../config';
import type { ConnectionManager } from '../network/Connection';
import { ConnectionState, LoginPhase } from '../network/Connection';
import { buildWorldEndpoint, type WorldDirectory } from '../world/WorldDirectory';
import type { WorldDiscoveryClient } from '../world/WorldDiscoveryClient';
import { startAdminServer as startSharedAdminServer } from '../../../shared/admin/AdminServer';

/**
 * Configuration bundle for the master admin server adapter.
 */
export interface AdminServerOptions {
    admin: AdminConfig;
    serverPort: number;
    connections: ConnectionManager;
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
    sendUnreliable: (data: Buffer, address: RakSystemAddress) => boolean;
    shutdown: () => void;
    worldDirectory: WorldDirectory;
    worldDiscovery: WorldDiscoveryClient;
}

/**
 * Start the shared admin server with master-specific adapters.
 * @param {AdminServerOptions} options - Admin server configuration.
 * @returns {void} No return value.
 */
export function startAdminServer(options: AdminServerOptions): void {
    const {
        admin,
        serverPort,
        connections,
        sendReliable,
        sendUnreliable,
        shutdown,
        worldDirectory,
        worldDiscovery,
    } = options;

    /**
     * Build admin-facing connection snapshots for current clients.
     * @returns {Array<{id: string, key: string, address: string, state: string, loginPhase: string, username: string, authenticated: boolean, worldId: number, worldInst: number, playerId: number, lastActivityMs: number, connectedMs: number}>}
     * Snapshot list for the admin API.
     */
    const listConnections = () =>
        connections.getAll().map((conn) => ({
            id: String(conn.id),
            key: conn.key,
            address: conn.key,
            state: ConnectionState[conn.state],
            loginPhase: LoginPhase[conn.loginPhase],
            username: conn.username,
            authenticated: conn.authenticated,
            worldId: conn.worldId,
            worldInst: conn.worldInst,
            playerId: conn.playerId,
            lastActivityMs: Date.now() - conn.lastActivity,
            connectedMs: conn.connectionDuration,
        }));

    /**
     * Resolve admin target filters to concrete connections.
     * @param {string[] | null} ids - Optional list of connection IDs or address keys.
     * @returns {ReturnType<ConnectionManager['getAll']>} Target connections.
     */
    const resolveTargets = (ids: string[] | null) => {
        if (!ids) return connections.getConnected();
        const targets = new Map<number, ReturnType<ConnectionManager['getAll']>[number]>();
        for (const id of ids) {
            const numeric = Number.parseInt(id, 10);
            if (Number.isFinite(numeric)) {
                const conn = connections.getById(numeric);
                if (conn) targets.set(conn.id, conn);
                continue;
            }
            const match = connections.getAll().find((conn) => conn.key === id);
            if (match) targets.set(match.id, match);
        }
        return Array.from(targets.values());
    };

    /**
     * Normalize admin world server inputs into unique endpoint entries.
     * @param {Array<string | { ip: string; port: number; worldId?: number }>} servers - Raw endpoints from admin.
     * @returns {Array<{ ip: string; port: number; key: string; worldId?: number }>} Normalized endpoints.
     */
    const buildWorldEndpoints = (
        servers: Array<string | { ip: string; port: number; worldId?: number }>,
    ): { ip: string; port: number; key: string; worldId?: number }[] => {
        const endpoints: { ip: string; port: number; key: string; worldId?: number }[] = [];
        const seen = new Set<string>();
        for (const entry of servers) {
            if (!entry) continue;
            let ip: string | null = null;
            let port: number | null = null;
            let worldId: number | undefined;
            if (typeof entry === 'string') {
                const trimmed = entry.trim();
                if (!trimmed) continue;
                const [ipRaw, portRaw] = trimmed.split(':');
                const parsedPort = Number.parseInt(portRaw || '', 10);
                if (!ipRaw || !Number.isFinite(parsedPort)) continue;
                ip = ipRaw;
                port = parsedPort;
            } else {
                ip = entry.ip;
                port = entry.port;
                worldId = entry.worldId;
            }
            if (!ip || port === null || !Number.isFinite(port)) continue;
            const key = `${ip}:${port}`;
            if (seen.has(key)) continue;
            seen.add(key);
            endpoints.push({ ip, port, key, worldId });
        }
        return endpoints;
    };

    /**
     * Start the shared admin server with master-specific callbacks.
     * @returns {void} No return value.
     */
    const startSharedAdmin = (): void => {
        startSharedAdminServer({
            admin,
            serverPort,
            serverLabel: 'master',
            connectionCount: () => connections.getAll().length,
            listConnections,
            resolveTargets,
            sendReliable,
            sendUnreliable,
            shutdown,
            onSetWorldServers: (servers) => {
                const endpoints = buildWorldEndpoints(servers || []);
                worldDirectory.setEndpoints(
                    endpoints.map((entry) =>
                        buildWorldEndpoint(entry.ip, entry.port, entry.worldId),
                    ),
                );
                let seeded = 0;
                for (const entry of endpoints) {
                    if (entry.worldId && entry.worldId > 0) {
                        worldDirectory.updateFromInfo({
                            worldId: entry.worldId,
                            worldIp: entry.ip,
                            worldPort: entry.port,
                            source: buildWorldEndpoint(entry.ip, entry.port, entry.worldId),
                        });
                        seeded += 1;
                    }
                }
                if (endpoints.length > 0) {
                    worldDiscovery.queryAll();
                }
                const summary =
                    endpoints.length > 0 ? endpoints.map((entry) => entry.key).join(',') : 'none';
                info(
                    `[Admin] World servers updated (${endpoints.length}): ${summary} seeded=${seeded}`,
                );
                return { count: endpoints.length, summary };
            },
        });
    };

    startSharedAdmin();
}
