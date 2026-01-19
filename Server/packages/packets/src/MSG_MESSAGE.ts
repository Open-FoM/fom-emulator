import { LithPacketRead, LithPacketWrite } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';
import { PacketIdUpdate } from './PACKET_ID_UPDATE';

export interface MsgMessageData {
    packetId: number;
    payload: Buffer;
    innerId?: number;
    innerTimestamp?: bigint;
    innerPayload?: Buffer;
    decoded?: PacketIdUpdate;
}

export class MsgMessage extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_MESSAGE;

    packetId: number;
    payload: Buffer;
    innerId?: number;
    innerTimestamp?: bigint;
    innerPayload?: Buffer;
    decoded?: PacketIdUpdate;

    constructor(data: MsgMessageData) {
        super();
        this.packetId = data.packetId;
        this.payload = data.payload;
        this.innerId = data.innerId;
        this.innerTimestamp = data.innerTimestamp;
        this.innerPayload = data.innerPayload;
        this.decoded = data.decoded;
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

    static decode(buffer: Buffer): MsgMessage {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgMessage.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgMessage.MESSAGE_ID}, got ${messageId}`);
        }
        const packetId = reader.readUint8();
        const remainingBits = reader.tellEnd() - reader.tell();
        const payload = remainingBits > 0 ? reader.readData(remainingBits) : Buffer.alloc(0);

        let innerId: number | undefined;
        let innerTimestamp: bigint | undefined;
        let innerPayload: Buffer | undefined;
        if (payload.length >= 1) {
            if (payload[0] === 0x19 && payload.length >= 10) {
                innerTimestamp = payload.readBigUInt64BE(1);
                innerId = payload[9];
                innerPayload = payload.subarray(10);
            } else {
                innerId = payload[0];
                innerPayload = payload.subarray(1);
            }
        }

        let decoded: PacketIdUpdate | undefined;
        if (innerId === PacketIdUpdate.GAME_ID && innerPayload) {
            try {
                decoded = PacketIdUpdate.decode(innerPayload);
            } catch {}
        }

        return new MsgMessage({
            packetId,
            payload,
            innerId,
            innerTimestamp,
            innerPayload,
            decoded,
        });
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
        const innerInfo = this.innerId !== undefined
            ? `, innerId: 0x${this.innerId.toString(16)}`
            : '';
        const tsInfo = this.innerTimestamp !== undefined
            ? `, innerTs: ${this.innerTimestamp.toString()}`
            : '';
        const decodedInfo = this.decoded ? `, decoded: ${this.decoded.toString()}` : '';
        return `MsgMessage { packetId: 0x${this.packetId.toString(16)}, payload: ${this.payload.length} bytes${innerInfo}${tsInfo}${decodedInfo} }`;
    }
}
