import { BitStreamWriter, BitStreamReader } from '@openfom/networking';
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
        const writer = new BitStreamWriter(24);
        const timeBuf = Buffer.alloc(4);
        timeBuf.writeFloatLE(this.gameTime, 0);
        writer.writeBytes(timeBuf);
        writer.writeBits(this.worldId & 0xffff, 16);
        return writer.toBuffer();
    }

    get payloadBits(): number {
        return 48;
    }

    static decode(buffer: Buffer): MsgLoadWorld {
        const reader = new BitStreamReader(buffer);
        const timeBuf = reader.readBytes(4);
        const gameTime = timeBuf.readFloatLE(0);
        const worldId = reader.readBits(16);
        return new MsgLoadWorld({ worldId, gameTime });
    }

    static create(worldId: number, gameTime: number = 0.0): MsgLoadWorld {
        return new MsgLoadWorld({ worldId, gameTime });
    }

    toString(): string {
        return `MsgLoadWorld { worldId: ${this.worldId}, gameTime: ${this.gameTime.toFixed(3)} }`;
    }
}
