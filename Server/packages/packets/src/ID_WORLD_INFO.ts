import { NativeBitStream, encodeString, decodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdWorldInfoData {
    token: string;
    worldId: number;
    worldIp: string;
    worldPort: number;
}

// World -> Master discovery response (authoritative worldId + endpoint).
export class IdWorldInfoPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_INFO;

    token: string;
    worldId: number;
    worldIpU32: number;
    worldPort: number;

    constructor(data: IdWorldInfoData) {
        super();
        this.token = data.token ?? '';
        this.worldId = data.worldId >>> 0;
        this.worldIpU32 = IdWorldInfoPacket.ipv4ToU32LE(data.worldIp);
        this.worldPort = data.worldPort & 0xffff;
    }

    /**
     * Wire: u8 msgId, token(string), u32c worldId, u32c worldIp, u16c worldPort
     */
    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLD_INFO);
            encodeString(this.token, bs, 64, 0);
            bs.writeCompressedU32(this.worldId >>> 0);
            bs.writeCompressedU32(this.worldIpU32 >>> 0);
            bs.writeCompressedU16(this.worldPort & 0xffff);
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdWorldInfoPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_WORLD_INFO) {
                throw new Error(`Expected packet ID 0xFF, got 0x${packetId.toString(16)}`);
            }
            const token = decodeString(bs, 64);
            const worldId = bs.readCompressedU32();
            const worldIpU32 = bs.readCompressedU32();
            const worldPort = bs.readCompressedU16();

            const worldIp = IdWorldInfoPacket.u32LEToIpv4(worldIpU32);
            return new IdWorldInfoPacket({ token, worldId, worldIp, worldPort });
        } finally {
            bs.destroy();
        }
    }

    static ipv4ToU32LE(ip: string): number {
        const parts = ip.split('.');
        if (parts.length !== 4) return 0;
        const bytes = parts.map((p) => Number.parseInt(p, 10));
        if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return 0;
        return ((bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0]) >>> 0;
    }

    static u32LEToIpv4(value: number): string {
        return [
            value & 0xff,
            (value >>> 8) & 0xff,
            (value >>> 16) & 0xff,
            (value >>> 24) & 0xff,
        ].join('.');
    }

    toString(): string {
        const worldIp = IdWorldInfoPacket.u32LEToIpv4(this.worldIpU32);
        return `IdWorldInfoPacket { worldId: ${this.worldId}, worldIp: "${worldIp}", worldPort: ${this.worldPort} }`;
    }

    get worldIp(): string {
        return IdWorldInfoPacket.u32LEToIpv4(this.worldIpU32);
    }
}
