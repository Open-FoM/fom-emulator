/**
 * Handle world login requests and relay heartbeats to master.
 */
import { addressToIp, type RakSystemAddress } from '@openfom/networking';
import { IdWorldHeartbeatPacket } from '@openfom/packets';
import { error, info } from '@openfom/utils';
import type { HandlerContext, PacketHandler } from './types';

/**
 * Relay a heartbeat packet to the configured master peers.
 * @param {string} connKey - Connection key.
 * @param {RakSystemAddress} address - Client address.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {void} No return value.
 */
const relayHeartbeatToMaster = (
    connKey: string,
    address: RakSystemAddress,
    context: HandlerContext,
): void => {
    const { masterPeers, config, connections, sendReliable } = context;
    if (!config.worldDiscoveryToken) return;
    const conn = connections.get(connKey);
    if (!conn || conn.playerId <= 0) return;
    if (masterPeers.size === 0) return;
    const now = Date.now();
    if (now - conn.lastHeartbeatRelayAt < config.heartbeatRelayMs) return;
    conn.lastHeartbeatRelayAt = now;
    const heartbeat = new IdWorldHeartbeatPacket({
        token: config.worldDiscoveryToken,
        worldId: conn.worldId,
        worldInst: conn.worldInst,
        playerId: conn.playerId,
        clientIp: addressToIp(address),
        clientPort: address.port,
    });
    const payload = heartbeat.encode();
    for (const peer of masterPeers.values()) {
        sendReliable(payload, peer.address);
    }
};

/**
 * Create a handler for world login request packets.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {PacketHandler} Packet handler function.
 */
export function createWorldLoginRequestHandler(context: HandlerContext): PacketHandler {
    const { connections, getConnectionKey } = context;
    return (packet) => {
        const address = packet.systemAddress as RakSystemAddress;
        const key = getConnectionKey(address);
        const conn = connections.get(key);
        if (!conn) {
            error(`[World] No connection found for ${key}`);
            return;
        }
        conn.lastHeartbeatAt = Date.now();
        conn.hasHeartbeat = true;
        info(`[World] 0x6b WORLD_LOGIN_REQUEST from ${key} (${packet.data.length} bytes)`);
        relayHeartbeatToMaster(key, address, context);
    };
}
