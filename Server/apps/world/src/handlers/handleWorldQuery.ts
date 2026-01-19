/**
 * Handle world query packets from the master server.
 */
import { addressToIp, type RakSystemAddress } from '@openfom/networking';
import { IdWorldInfoPacket, IdWorldQueryPacket } from '@openfom/packets';
import { debug, info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Create a handler for world query packets.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createWorldQueryHandler(context: HandlerContext): PacketHandler {
    const { masterPeers, config, sendReliable, getConnectionKey } = context;
    return (packet) => {
        const address = packet.systemAddress as RakSystemAddress;
        const connKey = getConnectionKey(address);
        try {
            const isMasterSource =
                address.port === config.masterPortHint ||
                masterPeers.has(connKey) ||
                (config.masterHost && addressToIp(address) === config.masterHost);
            if (!isMasterSource) {
                return;
            }
            const query = IdWorldQueryPacket.decode(Buffer.from(packet.data));
            if (!config.worldDiscoveryToken || query.token !== config.worldDiscoveryToken) {
                info('[World] Ignoring world query with invalid token');
                return;
            }
            masterPeers.set(connKey, { address, lastSeen: Date.now() });
            const worldIp = config.worldPublicIp || addressToIp(address);
            const response = new IdWorldInfoPacket({
                token: query.token,
                worldId: config.worldId,
                worldIp,
                worldPort: config.port,
            });
            sendReliable(response.encode(), address);
            if (config.debug) {
                debug(
                    `[World] -> ID_WORLD_INFO worldId=${config.worldId} ip=${worldIp} port=${config.port}`,
                );
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            info(`[World] ID_WORLD_QUERY decode failed: ${msg}`);
        }
    };
}
