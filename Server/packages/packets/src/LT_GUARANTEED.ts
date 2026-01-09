import { LithPacketWrite } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';
import { MsgNetProtocolVersion } from './MSG_NETPROTOCOLVERSION';
import { MsgYourId } from './MSG_YOURID';
import { MsgClientObjectId } from './MSG_CLIENTOBJECTID';
import { MsgLoadWorld } from './MSG_LOADWORLD';

const SEQUENCE_MASK = 0x1fff;

function writeSizeIndicator(writer: LithPacketWrite, size: number): void {
    writer.writeBits(size & 0x7f, 7);

    if (size <= 0x7f) {
        writer.writeBits(0, 1);
        return;
    }

    writer.writeBits(1, 1);
    writer.writeBits((size >> 7) & 0x7, 3);

    if (size <= 0x3ff) {
        writer.writeBits(0, 1);
        return;
    }

    writer.writeBits(1, 1);

    let mask = 1 << 10;
    while (mask <= size) {
        writer.writeBits((size & mask) ? 1 : 0, 1);
        if (mask * 2 > size) {
            writer.writeBits(0, 1);
            break;
        }
        writer.writeBits(1, 1);
        mask <<= 1;
    }
}

function writeBitsFromBuffer(writer: LithPacketWrite, buf: Buffer, bitCount: number): void {
    let bitsWritten = 0;
    for (let i = 0; i < buf.length && bitsWritten < bitCount; i++) {
        const byte = buf[i];
        const remaining = bitCount - bitsWritten;
        const take = remaining >= 8 ? 8 : remaining;
        writer.writeBits(byte, take);
        bitsWritten += take;
    }
}

export interface LtGuaranteedData {
    sequence: number;
    messages: LithMessage[];
}

export class LtGuaranteedPacket extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_MESSAGE_GROUP;

    sequence: number;
    messages: LithMessage[];

    constructor(data: LtGuaranteedData) {
        super();
        this.sequence = data.sequence;
        this.messages = data.messages;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();

        writer.writeBits(this.sequence & SEQUENCE_MASK, 13);
        writer.writeBits(0, 1);

        for (let i = 0; i < this.messages.length; i++) {
            const msg = this.messages[i];
            const msgId = msg.Id;
            const payload = msg.encode();
            const payloadBits = msg.payloadBits ?? (payload.length * 8);
            const subBits = payloadBits + 8;

            writeSizeIndicator(writer, subBits);
            writer.writeBits(msgId & 0xff, 8);

            if (payloadBits > 0) {
                writeBitsFromBuffer(writer, payload, payloadBits);
            }

            const hasMore = i < this.messages.length - 1;
            writer.writeBits(hasMore ? 1 : 0, 1);
        }

        return writer.getData();
    }

    get payloadBits(): number {
        // We encode for simplicity. But we could calculate the exact bit count.
        // However we would need to take into account the size indicator for each message.
        return this.encode().length * 8;
    }

    static decode(_buffer: Buffer): LtGuaranteedPacket {
        throw new Error('LtGuaranteedPacket.decode not implemented');
    }

    static fromMessages(sequence: number, messages: LithMessage[]): LtGuaranteedPacket {
        return new LtGuaranteedPacket({ sequence, messages });
    }

    static buildWorldLoginBurst(
        sequence: number,
        clientId: number,
        worldId: number,
        gameTime: number = 0.0,
    ): LtGuaranteedPacket {
        const messages: LithMessage[] = [
            MsgNetProtocolVersion.createDefault(),
            MsgYourId.create(clientId, false),
            MsgLoadWorld.create(worldId, gameTime),
        ];
        return LtGuaranteedPacket.fromMessages(sequence, messages);
    }

    toString(): string {
        const msgStrs = this.messages.map(m => m.toString()).join(', ');
        return `LtGuaranteedPacket { sequence: ${this.sequence}, messages: [${msgStrs}] }`;
    }
}
