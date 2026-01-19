/**
 * Handle 0x7B world select packets (world travel).
 */
import type { RakSystemAddress } from '@openfom/networking';
import { IdWorldSelectPacket, WorldSelectSubId } from '@openfom/packets';
import { error, info, warn } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Create a handler for world select packets.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createWorldSelectHandler(context: HandlerContext): PacketHandler {
    const { connections, getConnectionKey, sendReliable, config } = context;
    return (packet) => {
        const address = packet.systemAddress as RakSystemAddress;
        const key = getConnectionKey(address);
        const conn = connections.get(key);
        if (!conn) {
            error(`[World] 0x7B WORLD_SELECT from ${key}: no connection`);
            return;
        }

        const worldSelect = IdWorldSelectPacket.decode(Buffer.from(packet.data));
        const subIdName = WorldSelectSubId[worldSelect.subId] ?? worldSelect.subId;

        if (worldSelect.playerId > 0 && conn.playerId > 0 && worldSelect.playerId !== conn.playerId) {
            warn(
                `[World] 0x7B WORLD_SELECT drop ${key}: playerId=${worldSelect.playerId} expected=${conn.playerId}`,
            );
            return;
        }

        if (worldSelect.playerId > 0 && conn.playerId === 0) {
            conn.playerId = worldSelect.playerId;
        }

        if (worldSelect.subId === WorldSelectSubId.WORLD_ID_INST) {
            const worldId = worldSelect.worldId;
            const worldInst = worldSelect.worldInst;
            if (worldId > 0) {
                conn.worldId = worldId;
            }
            if (worldInst > 0) {
                conn.worldInst = worldInst;
            }
            info(
                `[World] 0x7B WORLD_SELECT from ${key}: playerId=${worldSelect.playerId} subId=${subIdName} ` +
                    `worldId=${worldId} inst=${worldInst}`,
            );
            return;
        }

        if (worldSelect.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
            const worldId = worldSelect.worldId;
            const nodeId = worldSelect.worldInst;
            const playerId = worldSelect.playerId || conn.playerId;
            if (playerId <= 0) {
                warn(
                    `[World] 0x7B WORLD_SELECT drop ${key}: subId=${subIdName} missing playerId`,
                );
                return;
            }
            if (worldId <= 0) {
                warn(
                    `[World] 0x7B WORLD_SELECT drop ${key}: subId=${subIdName} invalid worldId=${worldId}`,
                );
                return;
            }
            const worldInst =
                worldId === config.worldId && config.worldInst > 0 ? config.worldInst : 0;
            const response = IdWorldSelectPacket.createWorldSelect(playerId, worldId, worldInst);
            const payload = response.encode();
            sendReliable(payload, address);
            info(
                `[World] 0x7B WORLD_SELECT -> client ${key}: playerId=${playerId} subId=WORLD_ID_INST ` +
                    `worldId=${worldId} inst=${worldInst} nodeId=${nodeId}`,
            );
            return;
        }

        if (worldSelect.subId === WorldSelectSubId.STARMAP && worldSelect.starmap) {
            info(
                `[World] 0x7B WORLD_SELECT from ${key}: playerId=${worldSelect.playerId} subId=${subIdName} ` +
                    `entries=${worldSelect.starmap.entries.length}`,
            );
            return;
        }

        info(
            `[World] 0x7B WORLD_SELECT from ${key}: playerId=${worldSelect.playerId} subId=${subIdName}`,
        );
    };
}
