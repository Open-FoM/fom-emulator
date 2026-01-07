import { BitStreamWriter, BitStreamReader } from '@openfom/networking';
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
        const writer = new BitStreamWriter(16);
        writer.writeBits(this.clientId & 0xffff, 16);
        writer.writeBits(this.isLocal ? 1 : 0, 8);
        return writer.toBuffer();
    }

    get payloadBits(): number {
        return 24;
    }

    static decode(buffer: Buffer): MsgYourId {
        const reader = new BitStreamReader(buffer);
        const clientId = reader.readBits(16);
        const isLocal = reader.readBits(8) !== 0;
        return new MsgYourId({ clientId, isLocal });
    }

    static create(clientId: number, isLocal: boolean = false): MsgYourId {
        return new MsgYourId({ clientId, isLocal });
    }
}
