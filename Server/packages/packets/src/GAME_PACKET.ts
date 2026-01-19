import { PacketIdUpdate } from './PACKET_ID_UPDATE';

export interface GamePacketEnvelopeData {
    id: number;
    payload: Buffer;
    decoded?: { toString(): string };
}

export class GamePacketEnvelope {
    id: number;
    payload: Buffer;
    decoded?: { toString(): string };

    constructor(data: GamePacketEnvelopeData) {
        this.id = data.id;
        this.payload = data.payload;
        this.decoded = data.decoded;
    }

    toString(): string {
        if (this.decoded) {
            return `GamePacket { id: 0x${this.id.toString(16).padStart(2, '0')}, decoded: ${this.decoded.toString()} }`;
        }
        return `GamePacket { id: 0x${this.id.toString(16).padStart(2, '0')}, bytes: ${this.payload.length} }`;
    }
}

export function decodeGamePacket(buffer: Buffer): GamePacketEnvelope | null {
    if (!buffer || buffer.length < 1) {
        return null;
    }
    const id = buffer[0];
    if (id < 0x6b) {
        return null;
    }

    const payload = buffer.subarray(1);
    if (id === PacketIdUpdate.GAME_ID) {
        try {
            const decoded = PacketIdUpdate.decode(payload);
            return new GamePacketEnvelope({ id, payload, decoded });
        } catch {
            return new GamePacketEnvelope({ id, payload });
        }
    }

    return new GamePacketEnvelope({ id, payload });
}
