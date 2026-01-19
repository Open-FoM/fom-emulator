import { NativeBitStream, encodeString, decodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdWorldHeartbeatData {
    token: string;
    worldId: number;
    worldInst: number;
    playerId: number;
    clientIp: string;
    clientPort: number;
}

// World -> Master liveness relay (player heartbeat observed on world).
export class IdWorldHeartbeatPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_HEARTBEAT;

    token: string;
    worldId: number;
    worldInst: number;
    playerId: number;
    clientIpU32: number;
    clientPort: number;

    constructor(data: IdWorldHeartbeatData) {
        super();
        this.token = data.token ?? '';
        this.worldId = data.worldId >>> 0;
        this.worldInst = data.worldInst >>> 0;
        this.playerId = data.playerId >>> 0;
        this.clientIpU32 = IdWorldHeartbeatPacket.ipv4ToU32LE(data.clientIp);
        this.clientPort = data.clientPort & 0xffff;
    }

    /**
     * Wire: u8 msgId, token(string), u32c worldId, u32c worldInst, u32c playerId, u32c clientIp, u16c clientPort
     */
    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLD_HEARTBEAT);
            encodeString(this.token, bs, 64, 0);
            bs.writeCompressedU32(this.worldId >>> 0);
            bs.writeCompressedU32(this.worldInst >>> 0);
            bs.writeCompressedU32(this.playerId >>> 0);
            bs.writeCompressedU32(this.clientIpU32 >>> 0);
            bs.writeCompressedU16(this.clientPort & 0xffff);
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdWorldHeartbeatPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_WORLD_HEARTBEAT) {
                throw new Error(`Expected packet ID 0xFD, got 0x${packetId.toString(16)}`);
            }
            const token = decodeString(bs, 64);
            const worldId = bs.readCompressedU32();
            const worldInst = bs.readCompressedU32();
            const playerId = bs.readCompressedU32();
            const clientIpU32 = bs.readCompressedU32();
            const clientPort = bs.readCompressedU16();
            const clientIp = IdWorldHeartbeatPacket.u32LEToIpv4(clientIpU32);
            return new IdWorldHeartbeatPacket({
                token,
                worldId,
                worldInst,
                playerId,
                clientIp,
                clientPort,
            });
        } finally {
            bs.destroy();
        }
    }

    toString(): string {
        const clientIp = IdWorldHeartbeatPacket.u32LEToIpv4(this.clientIpU32);
        return `IdWorldHeartbeatPacket { worldId: ${this.worldId}, worldInst: ${this.worldInst}, playerId: ${this.playerId}, clientIp: "${clientIp}", clientPort: ${this.clientPort} }`;
    }

    get clientIp(): string {
        return IdWorldHeartbeatPacket.u32LEToIpv4(this.clientIpU32);
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
}
