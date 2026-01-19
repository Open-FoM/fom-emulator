/**
 * Handle disconnection events for the world server.
 */
import { info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Create a handler for disconnection notifications.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createDisconnectHandler(context: HandlerContext): PacketHandler {
    const { connections, getConnectionKey } = context;
    return (packet) => {
        const key = getConnectionKey(packet.systemAddress);
        const conn = connections.get(key);
        if (conn?.pingInterval) {
            clearInterval(conn.pingInterval);
        }
        info(`[World] Disconnected: ${key}`);
        connections.delete(key);
    };
}
