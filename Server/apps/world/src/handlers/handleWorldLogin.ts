/**
 * Handle world login packets that establish player state.
 */
import type { RakSystemAddress } from '@openfom/networking';
import { IdWorldLoginPacket, MsgPacketGroup } from '@openfom/packets';
import { error, info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Send the initial LithTech packet group burst.
 * @param {HandlerContext['sendReliable']} sendReliable - Reliable send function.
 * @param {RakSystemAddress} address - Client address.
 * @param {number} playerId - Player id.
 * @param {number} worldId - World id.
 * @returns {void} No return value.
 */
const sendLithTechBurst = (
    sendReliable: HandlerContext['sendReliable'],
    address: RakSystemAddress,
    playerId: number,
    worldId: number,
): void => {
    const packetGroup = MsgPacketGroup.buildWorldLoginBurst(playerId, worldId, 0.0);
    const encoded = packetGroup.encode();
    sendReliable(encoded, address);
    info(
        `[World] -> SMSG_PACKETGROUP (NETPROTOCOLVERSION + YOURID + LOADWORLD) worldId=${worldId}, playerId=${playerId}`,
    );
};

/**
 * Create a handler for world login packets.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createWorldLoginHandler(context: HandlerContext): PacketHandler {
    const { connections, config, getConnectionKey, sendReliable } = context;
    return (packet) => {
        const worldLoginPacket = IdWorldLoginPacket.decode(Buffer.from(packet.data));
        const { worldId, worldInst, playerId, worldConst } = worldLoginPacket;
        const address = packet.systemAddress as RakSystemAddress;
        const key = getConnectionKey(address);
        info(
            `[World] 0x72 WORLD_LOGIN from ${key}: worldId=${worldId} inst=${worldInst} playerId=${playerId} const=0x${worldConst.toString(16)}`,
        );
        const conn = connections.get(key);
        if (!conn) {
            error(`[World] No connection found for ${key}`);
            return;
        }
        conn.playerId = playerId || 1;
        conn.worldId = worldId || config.worldId;
        conn.worldInst = worldInst || config.worldInst;
        conn.authenticated = true;
        if (!conn.sentLoginBurst) {
            sendLithTechBurst(sendReliable, conn.address, conn.playerId, conn.worldId);
            conn.sentLoginBurst = true;
        }
        info(`[World] Updated connection: playerId=${conn.playerId} worldId=${conn.worldId}`);
    };
}
