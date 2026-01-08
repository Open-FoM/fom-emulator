import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export enum WorldSelectSubId {
    ITEMS_ADDED = 2,
    SUB_ID_3 = 3,
    WORLD_ID_INST = 4,
    SUB_ID_5 = 5,
    SUB_ID_6 = 6,
    WORLD_ID_INST_ALT = 7,
}

export interface IdWorldSelectDataSubId4 {
    playerId: number;
    subId: WorldSelectSubId.WORLD_ID_INST | WorldSelectSubId.WORLD_ID_INST_ALT;
    worldId: number;
    worldInst: number;
}

export interface IdWorldSelectDataOther {
    playerId: number;
    subId: WorldSelectSubId;
    rawPayload?: Buffer;
}

export type IdWorldSelectData = IdWorldSelectDataSubId4 | IdWorldSelectDataOther;

/**
 * ID_WORLD_SELECT (0x7B) - Server -> Client
 * See: Docs/Packets/ID_WORLD_SELECT.md
 */
export class IdWorldSelectPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_SELECT;

    playerId: number;
    subId: WorldSelectSubId;
    worldId: number;
    worldInst: number;
    rawPayload: Buffer | null;

    constructor(data: IdWorldSelectData) {
        super();
        this.playerId = data.playerId;
        this.subId = data.subId;
        if (data.subId === WorldSelectSubId.WORLD_ID_INST || data.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
            this.worldId = (data as IdWorldSelectDataSubId4).worldId;
            this.worldInst = (data as IdWorldSelectDataSubId4).worldInst;
            this.rawPayload = null;
        } else {
            this.worldId = 0;
            this.worldInst = 0;
            this.rawPayload = (data as IdWorldSelectDataOther).rawPayload ?? null;
        }
    }

    /**
     * Wire: u8 msgId, u32c playerId, u8c subId, [subId-specific payload]
     */
    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLD_SELECT);
            bs.writeCompressedU32(this.playerId >>> 0);
            bs.writeCompressedU8(this.subId & 0xff);

            if (this.subId === WorldSelectSubId.WORLD_ID_INST || this.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
                bs.writeCompressedU8(this.worldId & 0xff);
                bs.writeCompressedU8(this.worldInst & 0xff);
            } else if (this.rawPayload) {
                bs.writeBytes(this.rawPayload);
            }

            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(_buffer: Buffer): IdWorldSelectPacket {
        throw new Error('IdWorldSelectPacket decode not fully implemented');
    }

    static createWorldSelect(playerId: number, worldId: number, worldInst: number): IdWorldSelectPacket {
        return new IdWorldSelectPacket({
            playerId,
            subId: WorldSelectSubId.WORLD_ID_INST_ALT,
            worldId,
            worldInst,
        });
    }

    toString(): string {
        const subIdName = WorldSelectSubId[this.subId] ?? this.subId;
        if (this.subId === WorldSelectSubId.WORLD_ID_INST || this.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
            return `IdWorldSelectPacket { playerId: ${this.playerId}, subId: ${subIdName}, worldId: ${this.worldId}, worldInst: ${this.worldInst} }`;
        }
        const payloadLen = this.rawPayload?.length ?? 0;
        return `IdWorldSelectPacket { playerId: ${this.playerId}, subId: ${subIdName}, rawPayload: ${payloadLen} bytes }`;
    }
}
