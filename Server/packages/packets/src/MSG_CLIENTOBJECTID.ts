import { BitStreamWriter, BitStreamReader } from '@openfom/networking';
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
        const writer = new BitStreamWriter(16);
        writer.writeBits(this.objectId & 0xffff, 16);
        return writer.toBuffer();
    }

    get payloadBits(): number {
        return 16;
    }

    static decode(buffer: Buffer): MsgClientObjectId {
        const reader = new BitStreamReader(buffer);
        const objectId = reader.readBits(16);
        return new MsgClientObjectId({ objectId });
    }

    static create(objectId: number): MsgClientObjectId {
        return new MsgClientObjectId({ objectId });
    }
}
