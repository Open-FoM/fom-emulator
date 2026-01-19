/**
 * Handle register-client packets from world clients.
 */
import type { RakSystemAddress } from '@openfom/networking';
import { IdRegisterClientPacket, IdRegisterClientReturnPacket } from '@openfom/packets';
import { error, info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Create a handler for register-client packets.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createRegisterClientHandler(context: HandlerContext): PacketHandler {
    const { connections, sendReliable, getConnectionKey } = context;
    return (packet) => {
        const address = packet.systemAddress as RakSystemAddress;
        const registerPacket = IdRegisterClientPacket.decode(Buffer.from(packet.data));
        const { worldId, playerId, sessionId } = registerPacket;
        const key = getConnectionKey(address);
        info(
            `[World] 0x78 REGISTER_CLIENT from ${key}: worldId=${worldId} playerId=${playerId} sessionId=${sessionId}`,
        );
        const conn = connections.get(key);
        if (!conn) {
            error(`[World] No connection found for ${key}`);
            return;
        }
        conn.authenticated = true;
        conn.playerId = playerId || conn.playerId;
        conn.worldId = worldId || conn.worldId;
        conn.registered = true;
        const response = new IdRegisterClientReturnPacket({
            worldId: conn.worldId,
            playerId: conn.playerId,
            returnCode: 1,
        });
        const responseBuffer = response.encode();
        sendReliable(responseBuffer, address);
        info(
            `[World] -> 0x79 REGISTER_CLIENT_RETURN (worldId=${conn.worldId}, playerId=${conn.playerId}, ${responseBuffer.length} bytes)`,
        );
    };
}
