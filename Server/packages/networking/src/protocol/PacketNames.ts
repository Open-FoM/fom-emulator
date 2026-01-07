import { getPacketDocName } from './PacketDocs';

// Internal RakNet IDs not documented in Docs/Packets.
const RAKNET_INTERNAL_NAMES: Record<number, string> = {
    0x00: 'ID_INTERNAL_PING',
    0x01: 'ID_PING',
    0x02: 'ID_PING_OPEN_CONNECTIONS',
    0x03: 'ID_CONNECTED_PONG',
    0x04: 'ID_CONNECTION_REQUEST',
    0x09: 'ID_OPEN_CONNECTION_REQUEST',
    0x0a: 'ID_OPEN_CONNECTION_REPLY',
    0x0e: 'ID_CONNECTION_REQUEST_ACCEPTED',
    0x10: 'ID_ALREADY_CONNECTED',
    0x11: 'ID_NEW_INCOMING_CONNECTION',
    0x13: 'ID_DISCONNECTION_NOTIFICATION',
    0x14: 'ID_CONNECTION_LOST',
    0x19: 'ID_TIMESTAMP',
};

// Resolve a packet ID to a human-readable name (Docs/Packets takes priority).
export function getPacketName(packetId: number): string {
    const docName = getPacketDocName(packetId);
    if (docName) return docName;
    const internal = RAKNET_INTERNAL_NAMES[packetId];
    if (internal) return internal;
    return `UNKNOWN (0x${packetId.toString(16)})`;
}
