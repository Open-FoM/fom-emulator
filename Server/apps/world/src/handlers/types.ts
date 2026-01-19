/**
 * Handler context types for world server packet dispatch.
 */
import type { RakPacket, RakSystemAddress } from '@openfom/networking';
import type { WorldConnection } from '../types';
export type PacketHandler = (packet: RakPacket) => void;
export interface HandlerContext {
    connections: Map<string, WorldConnection>;
    masterPeers: Map<string, { address: RakSystemAddress; lastSeen: number }>;
    config: {
        worldId: number;
        worldInst: number;
        worldDiscoveryToken: string;
        heartbeatRelayMs: number;
        masterHost: string;
        masterPortHint: number;
        worldPublicIp: string;
        port: number;
        debug: boolean;
    };
    sendReliable: (data: Buffer, address: RakSystemAddress) => boolean;
    getConnectionKey: (address: RakSystemAddress) => string;
}
