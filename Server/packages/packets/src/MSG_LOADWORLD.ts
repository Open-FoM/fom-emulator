import { LithPacketWrite, LithPacketRead } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export interface MsgLoadWorldData {
    worldId: number;
    gameTime: number;
}

export class MsgLoadWorld extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_LOADWORLD;

    worldId: number;
    gameTime: number;

    constructor(data: MsgLoadWorldData) {
        super();
        this.worldId = data.worldId;
        this.gameTime = data.gameTime;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgLoadWorld.MESSAGE_ID);
        writer.writeFloat(this.gameTime);
        writer.writeUint16(this.worldId & 0xffff);
        return writer.getData();
    }

    static decode(buffer: Buffer): MsgLoadWorld {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgLoadWorld.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgLoadWorld.MESSAGE_ID}, got ${messageId}`);
        }
        const gameTime = reader.readFloat();
        const worldId = reader.readUint16();
        return new MsgLoadWorld({ worldId, gameTime });
    }

    static create(worldId: number, gameTime: number = 0.0): MsgLoadWorld {
        return new MsgLoadWorld({ worldId, gameTime });
    }

    toString(): string {
        return `MsgLoadWorld { worldId: ${this.worldId}, gameTime: ${this.gameTime.toFixed(3)} }`;
    }
}
