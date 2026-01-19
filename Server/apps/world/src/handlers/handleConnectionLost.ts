/**
 * Handle connection-lost events for the world server.
 */
import type { HandlerContext, PacketHandler } from './types';
import { createDisconnectHandler } from './handleDisconnect';

/**
 * Create a handler for connection lost events.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createConnectionLostHandler(context: HandlerContext): PacketHandler {
    return createDisconnectHandler(context);
}
