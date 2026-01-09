import { LithPacketWrite, LithPacketRead } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export interface MsgClientObjectIdData {
    objectId: number;
}

export class MsgClientObjectId extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_CLIENTOBJECTID;

    objectId: number;

    constructor(data: MsgClientObjectIdData) {
        super();
        this.objectId = data.objectId;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgClientObjectId.MESSAGE_ID);
        writer.writeUint16(this.objectId & 0xffff);
        return writer.getData();
    }

    get payloadBits(): number {
        return 16;
    }

    static decode(buffer: Buffer): MsgClientObjectId {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgClientObjectId.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgClientObjectId.MESSAGE_ID}, got ${messageId}`);
        }
        const objectId = reader.readUint16();
        return new MsgClientObjectId({ objectId });
    }

    static create(objectId: number): MsgClientObjectId {
        return new MsgClientObjectId({ objectId });
    }

    toString(): string {
        return `MsgClientObjectId { objectId: ${this.objectId} }`;
    }
}
