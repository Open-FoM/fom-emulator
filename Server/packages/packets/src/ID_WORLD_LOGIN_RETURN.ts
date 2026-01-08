/**
 * ID_WORLD_LOGIN_RETURN (0x73) - Server -> Client
 * See: Docs/Packets/ID_WORLD_LOGIN_RETURN.md
 */

import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export enum WorldLoginReturnCode {
    SUCCESS = 1,
    SERVER_UNAVAILABLE = 2,
    FACTION_NOT_AVAILABLE = 3,
    WORLD_FULL = 4,
    FACTION_PRIVILEGES_REVOKED = 6,
    VORTEX_GATE_RANGE_ERROR = 7,
    RETRY_LATER = 8,
}

export interface IdWorldLoginReturnData {
    code: WorldLoginReturnCode;
    flag: number;
    worldIp: string;
    worldPort: number;
}

export class IdWorldLoginReturnPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_LOGIN_RETURN;

    code: WorldLoginReturnCode;
    flag: number;
    worldIpU32: number;
    worldPort: number;

    constructor(data: IdWorldLoginReturnData) {
        super();
        this.code = data.code;
        this.flag = data.flag;
        this.worldIpU32 = IdWorldLoginReturnPacket.ipv4ToU32BE(data.worldIp);
        this.worldPort = data.worldPort;
    }

    /**
     * Wire: u8 msgId, u8c code, u8c flag, u32c worldIp, u16c worldPort
     */
    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLD_LOGIN_RETURN);
            bs.writeCompressedU8(this.code & 0xff);
            bs.writeCompressedU8(this.flag & 0xff);
            bs.writeCompressedU32(this.worldIpU32 >>> 0);
            bs.writeCompressedU16(this.worldPort & 0xffff);
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdWorldLoginReturnPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_WORLD_LOGIN_RETURN) {
                throw new Error(`Expected packet ID 0x73, got 0x${packetId.toString(16)}`);
            }

            const code = bs.readCompressedU8() as WorldLoginReturnCode;
            const flag = bs.readCompressedU8();
            const worldIpU32 = bs.readCompressedU32();
            const worldPort = bs.readCompressedU16();

            const worldIp = IdWorldLoginReturnPacket.u32BEToIpv4(worldIpU32);
            return new IdWorldLoginReturnPacket({ code, flag, worldIp, worldPort });
        } finally {
            bs.destroy();
        }
    }

    static ipv4ToU32BE(ip: string): number {
        const parts = ip.split('.');
        if (parts.length !== 4) return 0;
        const bytes = parts.map((p) => Number.parseInt(p, 10));
        if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return 0;
        return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    }

    static u32BEToIpv4(value: number): string {
        return [
            (value >>> 24) & 0xff,
            (value >>> 16) & 0xff,
            (value >>> 8) & 0xff,
            value & 0xff,
        ].join('.');
    }

    static createSuccess(worldIp: string, worldPort: number): IdWorldLoginReturnPacket {
        return new IdWorldLoginReturnPacket({
            code: WorldLoginReturnCode.SUCCESS,
            flag: 0xff,
            worldIp,
            worldPort,
        });
    }

    toString(): string {
        const codeName = WorldLoginReturnCode[this.code] ?? this.code;
        const worldIp = IdWorldLoginReturnPacket.u32BEToIpv4(this.worldIpU32);
        return `IdWorldLoginReturnPacket { code: ${codeName}, flag: 0x${this.flag.toString(16)}, worldIp: "${worldIp}", worldPort: ${this.worldPort} }`;
    }
}

export { WorldLoginReturnCode as WorldLoginCode };
