/**
 * World admin server adapter wiring shared admin endpoints.
 */
import type { RakSystemAddress } from '@openfom/networking';
import type { AdminConfig } from '../config';
import type { WorldConnection } from '../types';
import { startAdminServer as startSharedAdminServer } from '../../../shared/admin/AdminServer';

/**
 * Admin-facing view of a world connection.
 */
export interface WorldConnectionView {
    address: string;
    key: string;
    playerId: number;
    worldId: number;
    worldInst: number;
    authenticated: boolean;
    registered: boolean;
    connectStage: number;
    worldTimeOrigin: number;
}

/**
 * Configuration bundle for world admin server adapter.
 */
export interface AdminServerOptions {
    admin: AdminConfig;
    serverPort: number;
    worldId: number;
    worldInst: number;
    connections: Map<string, WorldConnection>;
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
    sendUnreliable: (data: Buffer, address: RakSystemAddress) => boolean;
    shutdown: () => void;
}

/**
 * Start the shared admin server with world-specific adapters.
 * @param {AdminServerOptions} options - Admin server configuration.
 * @returns {void} No return value.
 */
export function startAdminServer(options: AdminServerOptions): void {
    const {
        admin,
        serverPort,
        worldId,
        worldInst,
        connections,
        sendReliable,
        sendUnreliable,
        shutdown,
    } = options;

    /**
     * Build admin-facing connection snapshots for current clients.
     * @returns {WorldConnectionView[]} Snapshot list for the admin API.
     */
    const listConnections = (): WorldConnectionView[] =>
        Array.from(connections.values()).map((conn) => ({
            id: conn.key,
            key: conn.key,
            address: conn.key,
            playerId: conn.playerId,
            worldId: conn.worldId,
            worldInst: conn.worldInst,
            authenticated: conn.authenticated,
            registered: conn.registered,
            connectStage: conn.connectStage,
            worldTimeOrigin: conn.worldTimeOrigin,
            connectedMs: Date.now() - conn.worldTimeOrigin,
        }));

    /**
     * Resolve admin target filters to concrete connections.
     * @param {string[] | null} ids - Optional list of player IDs or address keys.
     * @returns {WorldConnection[]} Target connections.
     */
    const resolveTargets = (ids: string[] | null): WorldConnection[] => {
        if (!ids) return Array.from(connections.values());
        const targets = new Map<string, WorldConnection>();
        for (const id of ids) {
            const byKey = connections.get(id);
            if (byKey) {
                targets.set(byKey.key, byKey);
                continue;
            }
            const numeric = Number.parseInt(id, 10);
            if (Number.isFinite(numeric)) {
                const match = Array.from(connections.values()).find(
                    (conn) => conn.playerId === numeric,
                );
                if (match) targets.set(match.key, match);
            }
        }
        return Array.from(targets.values());
    };

    /**
     * Start the shared admin server with world-specific callbacks.
     * @returns {void} No return value.
     */
    const startSharedAdmin = (): void => {
        startSharedAdminServer({
            admin,
            serverPort,
            serverLabel: 'world',
            connectionCount: () => connections.size,
            listConnections,
            resolveTargets,
            sendReliable,
            sendUnreliable,
            shutdown,
            getInfoPayload: () => ({ worldId, worldInst }),
        });
    };

    startSharedAdmin();
}
