import { RakNetMessageId } from './shared';
import { Packet, LithMessage } from './base';

export interface IdUserPacketData {
    message: LithMessage;
}

export class IdUserPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_USER_PACKET_ENUM;

    message: LithMessage;

    constructor(data: IdUserPacketData) {
        super();
        this.message = data.message;
    }

    encode(): Buffer {
        const payload = this.message.encode();
        const buffer = Buffer.allocUnsafe(1 + payload.length);
        buffer[0] = RakNetMessageId.ID_USER_PACKET_ENUM;
        payload.copy(buffer, 1);
        return buffer;
    }

    static decode(_buffer: Buffer): IdUserPacket {
        throw new Error('IdUserPacket.decode not implemented');
    }

    static wrap(message: LithMessage): IdUserPacket {
        return new IdUserPacket({ message });
    }

    toString(): string {
        return `IdUserPacket { message: ${this.message.toString()} }`;
    }
}
