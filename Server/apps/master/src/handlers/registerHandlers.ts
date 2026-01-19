/**
 * Register master server RakNet packet handlers.
 */
import type { RakPacket, RakSystemAddress } from '@openfom/networking';
import { addressToString } from '@openfom/networking';
import { IdWorldHeartbeatPacket, IdWorldInfoPacket, RakNetMessageId } from '@openfom/packets';
import { addressFromString } from '@openfom/networking';
import { info } from '@openfom/utils';
import { ConnectionManager, ConnectionState, LoginPhase } from '../network/Connection';
import { LoginHandler } from './LoginHandler';
import { WorldDiscoveryClient } from '../world/WorldDiscoveryClient';
export type PacketHandler = (packet: RakPacket) => void;
interface HandlerContext {
    connections: ConnectionManager;
    loginHandler: LoginHandler;
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
    worldDiscovery: WorldDiscoveryClient;
    worldHeartbeatToken: string;
}

/**
 * Build the packet handler registry for the master server.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {Map<number, PacketHandler>} Handler map keyed by message ID.
 */
export function createPacketHandlers(context: HandlerContext): Map<number, PacketHandler> {
    const { connections, loginHandler, sendReliable, worldDiscovery, worldHeartbeatToken } =
        context;
    const handlers: Map<number, PacketHandler> = new Map();

    /**
     * Send login handler responses (single or batch).
     * @param {ReturnType<typeof loginHandler.handle>} response - Handler response.
     * @returns {Promise<void>} Resolves after sends complete.
     */
    const sendResponses = async (
        response: ReturnType<typeof loginHandler.handle>,
    ): Promise<void> => {
        if (!response) return;
        if (Array.isArray(response)) {
            for (const r of response) {
                if (r.delay) await new Promise((resolve) => setTimeout(resolve, r.delay));
                sendReliable(r.data, r.address);
            }
        } else {
            sendReliable(response.data, response.address);
        }
    };
    // RakNet internal: New connection (post-accept)
    handlers.set(RakNetMessageId.ID_NEW_INCOMING_CONNECTION, (packet) => {
        const existing = connections.get(packet.systemAddress);
        if (existing) {
            loginHandler.releaseConnection(existing);
            connections.remove(packet.systemAddress);
        }
        const conn = connections.getOrCreate(packet.systemAddress);
        conn.state = ConnectionState.CONNECTED;
        conn.loginPhase = LoginPhase.CONNECTED;
        info(`[Server] New connection from ${conn.key}`);
    });
    // RakNet internal: Disconnection (graceful)
    handlers.set(RakNetMessageId.ID_DISCONNECTION_NOTIFICATION, (packet) => {
        const conn = connections.get(packet.systemAddress);
        if (conn) {
            info(`[Server] Client disconnected: ${conn.key}`);
            loginHandler.releaseConnection(conn);
            connections.remove(packet.systemAddress);
        }
    });
    // RakNet internal: Connection lost (timeout/reset)
    handlers.set(RakNetMessageId.ID_CONNECTION_LOST, (packet) => {
        const conn = connections.get(packet.systemAddress);
        if (conn) {
            info(`[Server] Connection lost: ${conn.key}`);
            loginHandler.releaseConnection(conn);
            connections.remove(packet.systemAddress);
        }
    });
    // RakNet internal: Invalid password
    handlers.set(RakNetMessageId.ID_INVALID_PASSWORD, (packet) => {
        const addr = addressToString(packet.systemAddress);
        info(`[Server] Invalid password from: ${addr}`);
    });
    // FoM: Login request (0x6C) - initial username + clientVersion.
    handlers.set(RakNetMessageId.ID_LOGIN_REQUEST, (packet) => {
        const conn = connections.getOrCreate(packet.systemAddress);
        const response = loginHandler.handle(RakNetMessageId.ID_LOGIN_REQUEST, packet.data, conn);
        sendResponses(response);
    });
    // FoM: Login auth (0x6E) - encrypted auth + file CRCs.
    handlers.set(RakNetMessageId.ID_LOGIN, (packet) => {
        const conn = connections.get(packet.systemAddress);
        if (!conn) return;
        const response = loginHandler.handle(RakNetMessageId.ID_LOGIN, packet.data, conn);
        sendResponses(response);
    });
    // FoM: Login token check (0x70) - client token probe.
    handlers.set(RakNetMessageId.ID_LOGIN_TOKEN_CHECK, (packet) => {
        const conn = connections.get(packet.systemAddress);
        if (!conn) return;
        const response = loginHandler.handle(
            RakNetMessageId.ID_LOGIN_TOKEN_CHECK,
            packet.data,
            conn,
        );
        sendResponses(response);
    });
    // FoM: World login (0x72) - master->world redirect handshake.
    handlers.set(RakNetMessageId.ID_WORLD_LOGIN, (packet) => {
        const conn = connections.get(packet.systemAddress);
        if (!conn) return;
        const response = loginHandler.handle(RakNetMessageId.ID_WORLD_LOGIN, packet.data, conn);
        sendResponses(response);
    });
    // World discovery response (0xFF) - world -> master.
    handlers.set(RakNetMessageId.ID_WORLD_INFO, (packet) => {
        try {
            const infoPacket = IdWorldInfoPacket.decode(Buffer.from(packet.data));
            worldDiscovery.handleInfo(infoPacket, packet.systemAddress);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            info(`[WorldDiscovery] decode failed: ${msg}`);
        }
    });
    // World heartbeat relay (0xFD) - world -> master.
    handlers.set(RakNetMessageId.ID_WORLD_HEARTBEAT, (packet) => {
        try {
            const heartbeat = IdWorldHeartbeatPacket.decode(Buffer.from(packet.data));
            if (worldHeartbeatToken && heartbeat.token !== worldHeartbeatToken) {
                info('[WorldHeartbeat] Ignoring relay with invalid token');
                return;
            }
            let conn = connections.getByPlayerId(heartbeat.playerId);
            if (!conn) {
                const addr = addressFromString(heartbeat.clientIp, heartbeat.clientPort);
                conn = connections.get(addr);
            }
            if (conn) {
                conn.updateActivity();
                conn.worldId = heartbeat.worldId;
                conn.worldInst = heartbeat.worldInst;
                conn.worldLastHeartbeatAt = Date.now();
                conn.worldHeartbeatGraceUntil = 0;
                if (!conn.playerId && heartbeat.playerId) {
                    conn.playerId = heartbeat.playerId;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            info(`[WorldHeartbeat] decode failed: ${msg}`);
        }
    });
    return handlers;
}
