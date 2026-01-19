/**
 * Handle new RakNet connections for the world server.
 */
import type { RakSystemAddress } from '@openfom/networking';
import { info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';
import type { WorldConnection } from '../types';

/**
 * Create a handler for new incoming connections.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createNewIncomingConnectionHandler(context: HandlerContext): PacketHandler {
    const { connections, config, sendReliable, getConnectionKey } = context;
    return (packet) => {
        const key = getConnectionKey(packet.systemAddress);
        info(`[World] New connection from ${key}`);
        const conn: WorldConnection = {
            address: packet.systemAddress as RakSystemAddress,
            key,
            playerId: 0,
            worldId: config.worldId,
            worldInst: config.worldInst,
            authenticated: false,
            registered: false,
            lastActivity: Date.now(),
            lastHeartbeatAt: Date.now(),
            hasHeartbeat: false,
            lastHeartbeatRelayAt: 0,
            worldTimeOrigin: Date.now(),
            lithTechOutSeq: 0,
            connectStage: -1,
            sentLoginBurst: false,
        };
        connections.set(key, conn);
    };
}
