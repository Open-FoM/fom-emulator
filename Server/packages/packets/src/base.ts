import { LithTechMessageId, RakNetMessageId } from "./shared";

export enum NetworkLayer {
    MMO,
    GAME,
}

export abstract class Packet {
    static RAKNET_ID: RakNetMessageId;

    abstract encode(): Buffer;
    abstract toString(): string;

    static decode(_buffer: Buffer): Packet {
        throw new Error('Not implemented');
    }
}

export abstract class LithMessage {
    static MESSAGE_ID: LithTechMessageId;

    abstract get payloadBits(): number

    get Id(): LithTechMessageId {
        return (this.constructor as typeof LithMessage).MESSAGE_ID;
    }

    abstract encode(): Buffer;
    abstract toString(): string;

    static decode(_buffer: Buffer): LithMessage {
        throw new Error('Not implemented');
    }
}