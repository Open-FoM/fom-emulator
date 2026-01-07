import { BitStreamWriter, BitStreamReader } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export interface MsgUnguaranteedUpdateData {
    objectId: number;
    gameTime: number;
}

export class MsgUnguaranteedUpdate extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_UNGUARANTEEDUPDATE;

    objectId: number;
    gameTime: number;

    constructor(data: MsgUnguaranteedUpdateData) {
        super();
        this.objectId = data.objectId;
        this.gameTime = data.gameTime;
    }

    encode(): Buffer {
        const writer = new BitStreamWriter(12);
        writer.writeUInt16(this.objectId & 0xffff);
        writer.writeBits(0, 4);
        const timeBuf = Buffer.alloc(4);
        timeBuf.writeFloatLE(this.gameTime, 0);
        writer.writeBytes(timeBuf);
        return writer.toBuffer();
    }

    get payloadBits(): number {
        return 52;
    }

    static decode(buffer: Buffer): MsgUnguaranteedUpdate {
        const reader = new BitStreamReader(buffer);
        const objectId = reader.readUInt16();
        reader.readBits(4);
        const timeBuf = reader.readBytes(4);
        const gameTime = timeBuf.readFloatLE(0);
        return new MsgUnguaranteedUpdate({ objectId, gameTime });
    }

    static createHeartbeat(gameTimeSeconds: number): MsgUnguaranteedUpdate {
        return new MsgUnguaranteedUpdate({ objectId: 0xffff, gameTime: gameTimeSeconds });
    }
}
