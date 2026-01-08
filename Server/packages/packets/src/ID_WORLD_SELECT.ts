import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export enum WorldSelectSubId {
    ITEMS_ADDED = 2,
    SUB_ID_3 = 3,
    WORLD_ID_INST = 4,
    SUB_ID_5 = 5,
    STARMAP = 6,
    WORLD_ID_INST_ALT = 7,
}

export interface IdWorldSelectDataSubId4 {
    playerId: number;
    subId: WorldSelectSubId.WORLD_ID_INST | WorldSelectSubId.WORLD_ID_INST_ALT;
    worldId: number;
    worldInst: number;
}

export interface FactionPair {
    valueA: number;
    valueB: number;
}

export interface FactionListC {
    key: number;
    field20: number;
    pairs: FactionPair[];
}

export interface ServerEntityState {
    entityId: number;
    factionId: number;
    standing: number;
    flags: number;
}

export interface FactionListB {
    key: number;
    entries: ServerEntityState[];
}

export interface Sub6Entry {
    key: number;
    mask: number;
    u16a: number;
    u16b: number;
    listB: FactionListB;
    listC: FactionListC;
}

export interface Sub6List {
    entries: Sub6Entry[];
    field16: number;
    field20: number;
    field24: number;
}

export interface IdWorldSelectDataStarmap {
    playerId: number;
    subId: WorldSelectSubId.STARMAP;
    starmap: Sub6List;
}

export interface IdWorldSelectDataOther {
    playerId: number;
    subId: WorldSelectSubId;
    rawPayload?: Buffer;
}

export type IdWorldSelectData = IdWorldSelectDataSubId4 | IdWorldSelectDataStarmap | IdWorldSelectDataOther;

function encodeFactionListB(bs: NativeBitStream, listB: FactionListB): void {
    bs.writeCompressedU8(listB.key & 0xff);
    bs.writeCompressedU32(listB.entries.length >>> 0);

    for (const entry of listB.entries) {
        bs.writeCompressedU32(entry.entityId >>> 0);
        bs.writeCompressedU16(entry.factionId & 0xffff);
        bs.writeCompressedU16(entry.standing & 0xffff);
        bs.writeCompressedU8(entry.flags & 0xff);
    }
}

function encodeFactionListC(bs: NativeBitStream, listC: FactionListC): void {
    bs.writeCompressedU8(listC.key & 0xff);
    bs.writeCompressedU32(listC.field20 >>> 0);
    bs.writeCompressedU32(listC.pairs.length >>> 0);

    for (const pair of listC.pairs) {
        bs.writeCompressedU32(pair.valueA >>> 0);
        bs.writeCompressedU32(pair.valueB >>> 0);
    }
}

function encodeSub6Entry(bs: NativeBitStream, entry: Sub6Entry): void {
    bs.writeCompressedU8(entry.key & 0xff);
    bs.writeU32(entry.mask >>> 0);
    bs.writeU16(entry.u16a & 0xffff);
    bs.writeCompressedU16(entry.u16b & 0xffff);
    encodeFactionListB(bs, entry.listB);
    encodeFactionListC(bs, entry.listC);
}

function encodeSub6List(bs: NativeBitStream, starmap: Sub6List): void {
    bs.writeCompressedU8(starmap.entries.length & 0xff);

    for (const entry of starmap.entries) {
        encodeSub6Entry(bs, entry);
    }

    bs.writeCompressedU32(starmap.field16 >>> 0);
    bs.writeCompressedU32(starmap.field20 >>> 0);
    bs.writeCompressedU32(starmap.field24 >>> 0);
}

export function createEmptyFactionListB(key: number = 0): FactionListB {
    return { key, entries: [] };
}

export function createEmptyFactionListC(key: number = 0, field20: number = 0): FactionListC {
    return { key, field20, pairs: [] };
}

export function createSub6Entry(
    worldKey: number,
    mask: number = 0xffffffff,
    options?: {
        u16a?: number;
        u16b?: number;
        listB?: FactionListB;
        listC?: FactionListC;
    },
): Sub6Entry {
    return {
        key: worldKey,
        mask,
        u16a: options?.u16a ?? 0,
        u16b: options?.u16b ?? 0,
        listB: options?.listB ?? createEmptyFactionListB(),
        listC: options?.listC ?? createEmptyFactionListC(),
    };
}

export function createSub6List(
    entries: (Sub6Entry | number)[],
    options?: {
        field16?: number;
        field20?: number;
        field24?: number;
    },
): Sub6List {
    const resolvedEntries = entries.map((e) =>
        typeof e === 'number' ? createSub6Entry(e) : e,
    );

    return {
        entries: resolvedEntries,
        field16: options?.field16 ?? 0,
        field20: options?.field20 ?? 0,
        field24: options?.field24 ?? 0,
    };
}

export class IdWorldSelectPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_SELECT;

    playerId: number;
    subId: WorldSelectSubId;
    worldId: number;
    worldInst: number;
    starmap: Sub6List | null;
    rawPayload: Buffer | null;

    constructor(data: IdWorldSelectData) {
        super();
        this.playerId = data.playerId;
        this.subId = data.subId;

        if (data.subId === WorldSelectSubId.WORLD_ID_INST || data.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
            this.worldId = (data as IdWorldSelectDataSubId4).worldId;
            this.worldInst = (data as IdWorldSelectDataSubId4).worldInst;
            this.starmap = null;
            this.rawPayload = null;
        } else if (data.subId === WorldSelectSubId.STARMAP) {
            this.worldId = 0;
            this.worldInst = 0;
            this.starmap = (data as IdWorldSelectDataStarmap).starmap;
            this.rawPayload = null;
        } else {
            this.worldId = 0;
            this.worldInst = 0;
            this.starmap = null;
            this.rawPayload = (data as IdWorldSelectDataOther).rawPayload ?? null;
        }
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_WORLD_SELECT);
            bs.writeCompressedU32(this.playerId >>> 0);
            bs.writeCompressedU8(this.subId & 0xff);

            if (this.subId === WorldSelectSubId.WORLD_ID_INST || this.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
                bs.writeCompressedU8(this.worldId & 0xff);
                bs.writeCompressedU8(this.worldInst & 0xff);
            } else if (this.subId === WorldSelectSubId.STARMAP && this.starmap) {
                encodeSub6List(bs, this.starmap);
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

    static createStarmap(
        playerId: number,
        worldKeys: number[] = [1],
        options?: { field16?: number; field20?: number; field24?: number },
    ): IdWorldSelectPacket {
        return new IdWorldSelectPacket({
            playerId,
            subId: WorldSelectSubId.STARMAP,
            starmap: createSub6List(worldKeys, options),
        });
    }

    static createStarmapFull(playerId: number, starmap: Sub6List): IdWorldSelectPacket {
        return new IdWorldSelectPacket({
            playerId,
            subId: WorldSelectSubId.STARMAP,
            starmap,
        });
    }

    static createWorldSelect(playerId: number, worldId: number, worldInst: number): IdWorldSelectPacket {
        return new IdWorldSelectPacket({
            playerId,
            subId: WorldSelectSubId.WORLD_ID_INST,
            worldId,
            worldInst,
        });
    }

    toString(): string {
        const subIdName = WorldSelectSubId[this.subId] ?? this.subId;

        if (this.subId === WorldSelectSubId.WORLD_ID_INST || this.subId === WorldSelectSubId.WORLD_ID_INST_ALT) {
            return `IdWorldSelectPacket { playerId: ${this.playerId}, subId: ${subIdName}, worldId: ${this.worldId}, worldInst: ${this.worldInst} }`;
        }

        if (this.subId === WorldSelectSubId.STARMAP && this.starmap) {
            const worldKeys = this.starmap.entries.map((e) => e.key).join(',');
            return `IdWorldSelectPacket { playerId: ${this.playerId}, subId: ${subIdName}, worlds: [${worldKeys}] }`;
        }

        const payloadLen = this.rawPayload?.length ?? 0;
        return `IdWorldSelectPacket { playerId: ${this.playerId}, subId: ${subIdName}, rawPayload: ${payloadLen} bytes }`;
    }
}
