import { LithPacketWrite, LithPacketRead } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export interface MsgYourIdData {
    clientId: number;
    isLocal: boolean;
}

export class MsgYourId extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_YOURID;

    clientId: number;
    isLocal: boolean;

    constructor(data: MsgYourIdData) {
        super();
        this.clientId = data.clientId;
        this.isLocal = data.isLocal;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgYourId.MESSAGE_ID);
        writer.writeUint16(this.clientId & 0xffff);
        writer.writeUint8(this.isLocal ? 1 : 0);
        return writer.getData();
    }

    static decode(buffer: Buffer): MsgYourId {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgYourId.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgYourId.MESSAGE_ID}, got ${messageId}`);
        }
        const clientId = reader.readUint16();
        const isLocal = reader.readUint8() !== 0;
        return new MsgYourId({ clientId, isLocal });
    }

    static create(clientId: number, isLocal: boolean = false): MsgYourId {
        return new MsgYourId({ clientId, isLocal });
    }

    toString(): string {
        return `MsgYourId { clientId: ${this.clientId}, isLocal: ${this.isLocal} }`;
    }
}
