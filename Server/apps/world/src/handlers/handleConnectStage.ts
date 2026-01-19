/**
 * Handle LithTech connect stage messages for world clients.
 */
import type { RakSystemAddress } from '@openfom/networking';
import { MsgClientObjectId, MsgPreloadList } from '@openfom/packets';
import { error, info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Process a connect stage payload and send follow-up packets.
 * @param {Buffer} data - Connect stage payload.
 * @param {RakSystemAddress} address - Client address.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {void} No return value.
 */
export function handleConnectStageData(
    data: Buffer,
    address: RakSystemAddress,
    context: HandlerContext,
): void {
    const { connections, getConnectionKey, sendReliable } = context;
    const key = getConnectionKey(address);
    const conn = connections.get(key);
    if (!conn) {
        error(`[World] CONNECTSTAGE: No connection found for ${key}`);
        return;
    }
    const stage = data[1];
    conn.connectStage = stage;
    info(`[World] CMSG_CONNECTSTAGE from ${key}: stage=${stage}`);
    if (stage === 0) {
        info('[World] -> SMSG_PRELOADLIST (END) - client loaded world, sending preload end');
        const preloadEnd = MsgPreloadList.createEnd();
        const encoded = preloadEnd.encode();
        sendReliable(encoded, conn.address);
    } else if (stage === 1) {
        info(
            `[World] -> SMSG_CLIENTOBJECTID - client preloaded, sending object ID ${conn.playerId}`,
        );
        const clientObjId = MsgClientObjectId.create(conn.playerId);
        const encoded = clientObjId.encode();
        sendReliable(encoded, conn.address);
    }
}

/**
 * Create a handler for connect stage messages.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createConnectStageHandler(context: HandlerContext): PacketHandler {
    return (packet) => {
        handleConnectStageData(Buffer.from(packet.data), packet.systemAddress, context);
    };
}
