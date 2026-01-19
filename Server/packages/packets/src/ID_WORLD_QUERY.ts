import { NativeBitStream, encodeString, decodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdWorldQueryData {
    token: string;
}

// Master -> World discovery request. Uses a shared token to avoid spoofed probes.
export class IdWorldQueryPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_QUERY;

    token: string;

    constructor(data: IdWorldQueryData) {
        super();
        this.token = data.token ?? '';
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLD_QUERY);
            // Token is a short shared secret; cap at 64 chars.
            encodeString(this.token, bs, 64, 0);
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdWorldQueryPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_WORLD_QUERY) {
                throw new Error(`Expected packet ID 0xFE, got 0x${packetId.toString(16)}`);
            }
            const token = decodeString(bs, 64);
            return new IdWorldQueryPacket({ token });
        } finally {
            bs.destroy();
        }
    }

    toString(): string {
        return `IdWorldQueryPacket { token: "${this.token}" }`;
    }
}
