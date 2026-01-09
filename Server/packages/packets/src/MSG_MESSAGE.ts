import { LithPacketWrite } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export interface MsgMessageData {
    packetId: number;
    payload: Buffer;
}

export class MsgMessage extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_MESSAGE;

    packetId: number;
    payload: Buffer;

    constructor(data: MsgMessageData) {
        super();
        this.packetId = data.packetId;
        this.payload = data.payload;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgMessage.MESSAGE_ID);
        writer.writeUint8(this.packetId & 0xff);
        writer.writeData(this.payload, this.payload.length * 8);
        return writer.getData();
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
