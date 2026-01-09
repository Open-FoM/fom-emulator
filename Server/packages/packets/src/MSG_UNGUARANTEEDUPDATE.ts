import { LithPacketWrite, LithPacketRead } from '@openfom/networking';
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
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgUnguaranteedUpdate.MESSAGE_ID);
        writer.writeUint16(this.objectId & 0xffff);
        writer.writeBits(0, 4);
        writer.writeFloat(this.gameTime);
        return writer.getData();
    }

    get payloadBits(): number {
        return 52;
    }

    static decode(buffer: Buffer): MsgUnguaranteedUpdate {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgUnguaranteedUpdate.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgUnguaranteedUpdate.MESSAGE_ID}, got ${messageId}`);
        }
        const objectId = reader.readUint16();
        reader.readBits(4);
        const gameTime = reader.readFloat();
        return new MsgUnguaranteedUpdate({ objectId, gameTime });
    }

    static createHeartbeat(gameTimeSeconds: number): MsgUnguaranteedUpdate {
        return new MsgUnguaranteedUpdate({ objectId: 0xffff, gameTime: gameTimeSeconds });
    }

    toString(): string {
        return `MsgUnguaranteedUpdate { objectId: ${this.objectId}, gameTime: ${this.gameTime.toFixed(3)} }`;
    }
}
