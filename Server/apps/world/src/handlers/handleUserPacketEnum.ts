/**
 * Handle ID_USER_PACKET_ENUM payloads for world clients.
 */
import { LithTechMessageId, RakNetMessageId } from '@openfom/packets';
import type { HandlerContext, PacketHandler } from './types';
import { handleConnectStageData } from './handleConnectStage';

/**
 * Create a handler for user packet enum dispatch.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createUserPacketEnumHandler(context: HandlerContext): PacketHandler {
    return (packet) => {
        if (packet.data.length < 2) return;
        const lithId = packet.data[1];
        if (lithId !== LithTechMessageId.MSG_CONNECTSTAGE) return;
        const lithPayload = packet.data.subarray(1);
        handleConnectStageData(Buffer.from(lithPayload), packet.systemAddress, context);
    };
}
