/**
 * Handle world service packets for debugging/logging.
 */
import { IdWorldServicePacket } from '@openfom/packets';
import { info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Create a handler for world service packets.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createWorldServiceHandler(context: HandlerContext): PacketHandler {
    const { getConnectionKey } = context;
    return (packet) => {
        const worldServicePacket = IdWorldServicePacket.decode(Buffer.from(packet.data));
        const key = getConnectionKey(packet.systemAddress);
        info(`[World] 0xa5 WORLDSERVICE from ${key}: ${worldServicePacket.toString()}`);
    };
}
