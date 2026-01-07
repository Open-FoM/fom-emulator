import type { RakPacket, RakSystemAddress } from '@openfom/networking';
import { addressToString, RakNetMessageId } from '@openfom/networking';
import { info } from '@openfom/utils';
import { ConnectionManager, LoginPhase } from '../network/Connection';
import { LoginHandler } from './LoginHandler';

export type PacketHandler = (packet: RakPacket) => void;

interface HandlerContext {
    connections: ConnectionManager;
    loginHandler: LoginHandler;
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
}

export function createPacketHandlers(context: HandlerContext): Map<number, PacketHandler> {
    const { connections, loginHandler, sendReliable } = context;
    const handlers: Map<number, PacketHandler> = new Map();

    // Normalize handler return types into outbound sends.
    const sendResponses = (response: ReturnType<typeof loginHandler.handle>): void => {
        if (!response) return;
        if (Array.isArray(response)) {
            for (const r of response) {
                sendReliable(r.data, r.address);
            }
        } else {
            sendReliable(response.data, response.address);
        }
    };

    // RakNet internal: New connection (post-accept)
    handlers.set(RakNetMessageId.ID_NEW_INCOMING_CONNECTION, (packet) => {
        const conn = connections.getOrCreate(packet.systemAddress);
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
        const response = loginHandler.handle(RakNetMessageId.ID_LOGIN_TOKEN_CHECK, packet.data, conn);
        sendResponses(response);
    });

    // FoM: World login (0x72) - master->world redirect handshake.
    handlers.set(RakNetMessageId.ID_WORLD_LOGIN, (packet) => {
        const conn = connections.get(packet.systemAddress);
        if (!conn) return;
        const response = loginHandler.handle(RakNetMessageId.ID_WORLD_LOGIN, packet.data, conn);
        sendResponses(response);
    });

    return handlers;
}
