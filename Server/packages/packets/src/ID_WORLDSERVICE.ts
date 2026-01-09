import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdWorldServiceData {
    actionCode: number;
    flags: number;
}

export class IdWorldServicePacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLDSERVICE;

    actionCode: number;
    flags: number;

    constructor(data: IdWorldServiceData) {
        super();
        this.actionCode = data.actionCode;
        this.flags = data.flags;
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLDSERVICE);
            bs.writeU32(this.actionCode);
            bs.writeU16(this.flags);
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdWorldServicePacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_WORLDSERVICE) {
                throw new Error(`Expected packet ID 0xa5, got 0x${packetId.toString(16)}`);
            }
            const actionCode = bs.readU32();
            const flags = bs.readU16();
            return new IdWorldServicePacket({ actionCode, flags });
        } finally {
            bs.destroy();
        }
    }

    toString(): string {
        return `IdWorldServicePacket { actionCode: ${this.actionCode}, flags: 0x${this.flags.toString(16)} }`;
    }
}
