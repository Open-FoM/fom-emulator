import { RakNetMessageId, LithTechMessageId } from './shared';
import { Packet, LithMessage } from './base';
import { MsgMessage } from './MSG_MESSAGE';

class UnknownLithMessage extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_MESSAGE;

    messageId: number;
    raw: Buffer;

    constructor(messageId: number, raw: Buffer) {
        super();
        this.messageId = messageId;
        this.raw = raw;
    }

    get Id(): LithTechMessageId {
        return this.messageId as LithTechMessageId;
    }

    get payloadBits(): number {
        return this.raw.length * 8;
    }

    encode(): Buffer {
        return Buffer.from(this.raw);
    }

    toString(): string {
        return `UnknownLithMessage { id: 0x${this.messageId.toString(16)}, bytes: ${this.raw.length} }`;
    }
}

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
        if (_buffer.length < 2) {
            throw new Error('IdUserPacket.decode: buffer too short');
        }
        const packetId = _buffer[0];
        if (packetId !== RakNetMessageId.ID_USER_PACKET_ENUM) {
            throw new Error(`IdUserPacket.decode: expected 0x${RakNetMessageId.ID_USER_PACKET_ENUM.toString(16)}, got 0x${packetId.toString(16)}`);
        }
        const lithPayload = _buffer.subarray(1);
        const lithId = lithPayload[0];
        let message: LithMessage;

        if (lithId === MsgMessage.MESSAGE_ID) {
            message = MsgMessage.decode(lithPayload);
        } else {
            message = new UnknownLithMessage(lithId, lithPayload);
        }

        return new IdUserPacket({ message });
    }

    static wrap(message: LithMessage): IdUserPacket {
        return new IdUserPacket({ message });
    }

    toString(): string {
        return `IdUserPacket { message: ${this.message.toString()} }`;
    }
}
