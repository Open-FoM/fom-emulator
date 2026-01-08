import { BitStreamWriter } from '@openfom/networking';
import { LithMessage } from './base';

const MSG_MESSAGE_ID = 13;

export interface MsgMessageData {
    packetId: number;
    payload: Buffer;
}

export class MsgMessage extends LithMessage {
    static MESSAGE_ID = MSG_MESSAGE_ID;

    packetId: number;
    payload: Buffer;

    constructor(data: MsgMessageData) {
        super();
        this.packetId = data.packetId;
        this.payload = data.payload;
    }

    encode(): Buffer {
        const writer = new BitStreamWriter(this.payload.length + 1);
        writer.writeBits(this.packetId & 0xff, 8);
        for (let i = 0; i < this.payload.length; i++) {
            writer.writeBits(this.payload[i], 8);
        }
        return writer.toBuffer();
    }

    get payloadBits(): number {
        return (1 + this.payload.length) * 8;
    }

    static decode(_buffer: Buffer): MsgMessage {
        throw new Error('MsgMessage.decode not implemented');
    }

    static wrap(packetId: number, payload: Buffer): MsgMessage {
        return new MsgMessage({ packetId, payload });
    }

    static wrapEncoded(packetBuffer: Buffer): MsgMessage {
        if (packetBuffer.length < 1) {
            throw new Error('Packet buffer must have at least 1 byte (packet ID)');
        }
        return new MsgMessage({
            packetId: packetBuffer[0],
            payload: packetBuffer.subarray(1),
        });
    }

    toString(): string {
        return `MsgMessage { packetId: 0x${this.packetId.toString(16)}, payload: ${this.payload.length} bytes }`;
    }
}
