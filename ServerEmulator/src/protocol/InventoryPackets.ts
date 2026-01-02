import { BitStreamWriter } from './BitStream';
import { writeListU16CountU32c, writeU16c, writeU32c, writeU8c } from './LithCompressed';

const ITEM_STRUCT_A_SIZE = 0x20;

export interface ItemEntryWithId {
    entryId: number;
    itemRaw: Buffer;
}

export interface ItemsAddedEntry {
    itemRaw: Buffer;
    variantIds?: number[];
}

export interface ItemsAddedPayload {
    baseUsedCount?: number;
    capacity?: number;
    unk24?: number;
    unk28?: number;
    entries?: ItemsAddedEntry[];
}

export interface ItemsChangedPacket {
    playerId: number;
    entries: ItemEntryWithId[];
}

export interface ItemsRemovedPacket {
    playerId: number;
    removeType: number;
    ids: number[];
}

export interface ItemRemovedPacket {
    playerId: number;
    removeType: number;
    itemId: number;
    flag?: boolean;
}

export interface MergeItemsPacket {
    playerId: number;
    useEntries: boolean;
    entryA?: ItemEntryWithId;
    entryB?: ItemEntryWithId;
    itemIdA?: number;
    itemIdB?: number;
}

export interface BackpackContentsPacket {
    playerId: number;
    subtype: number;
    keyA: number;
    keyB: number;
    payload: ItemsAddedPayload;
    ids: number[];
}

const writeItemStructA = (writer: BitStreamWriter, itemRaw: Buffer): void => {
    if (itemRaw.length !== ITEM_STRUCT_A_SIZE) {
        throw new Error(`ItemStructA must be ${ITEM_STRUCT_A_SIZE} bytes`);
    }
    writer.writeBytes(itemRaw);
};

const writeItemEntryWithId = (writer: BitStreamWriter, entry: ItemEntryWithId): void => {
    writeU32c(writer, entry.entryId >>> 0);
    writeItemStructA(writer, entry.itemRaw);
};

const writeItemsAddedPayload = (writer: BitStreamWriter, payload?: ItemsAddedPayload): void => {
    const entries = payload?.entries ?? [];
    writeU16c(writer, payload?.baseUsedCount ?? 0);
    writeU32c(writer, payload?.capacity ?? 0);
    writeU32c(writer, payload?.unk24 ?? 0);
    writeU32c(writer, payload?.unk28 ?? 0);
    writeU16c(writer, entries.length);
    for (const entry of entries) {
        writeItemStructA(writer, entry.itemRaw);
        const variantIds = entry.variantIds ?? [];
        writeU16c(writer, variantIds.length);
        for (const variantId of variantIds) {
            writeU32c(writer, variantId >>> 0);
        }
    }
};

export const buildItemsAddedPacket = (
    playerId: number,
    type: number,
    payload: ItemsAddedPayload,
    subtype?: number,
): Buffer => {
    const writer = new BitStreamWriter(256);
    writer.writeBits(0x93, 8);
    writeU32c(writer, playerId >>> 0);
    writeU8c(writer, type & 0xff);
    if (type === 3) {
        writeU8c(writer, subtype ?? 0);
    }
    writeItemsAddedPayload(writer, payload);
    return writer.toBuffer();
};

export const buildItemsChangedPacket = (packet: ItemsChangedPacket): Buffer => {
    const writer = new BitStreamWriter(256);
    writer.writeBits(0x82, 8);
    writeU32c(writer, packet.playerId >>> 0);
    writeU8c(writer, packet.entries.length & 0xff);
    for (const entry of packet.entries) {
        writeItemEntryWithId(writer, entry);
    }
    return writer.toBuffer();
};

export const buildItemsRemovedPacket = (packet: ItemsRemovedPacket): Buffer => {
    const writer = new BitStreamWriter(128);
    writer.writeBits(0x81, 8);
    writeU32c(writer, packet.playerId >>> 0);
    writeU8c(writer, packet.removeType & 0xff);
    writeListU16CountU32c(writer, packet.ids);
    return writer.toBuffer();
};

export const buildItemRemovedPacket = (packet: ItemRemovedPacket): Buffer => {
    const writer = new BitStreamWriter(64);
    writer.writeBits(0x88, 8);
    writeU32c(writer, packet.playerId >>> 0);
    writeU8c(writer, packet.removeType & 0xff);
    writeU32c(writer, packet.itemId >>> 0);
    writer.writeBits(packet.flag ? 1 : 0, 1);
    return writer.toBuffer();
};

export const buildMergeItemsPacket = (packet: MergeItemsPacket): Buffer => {
    const writer = new BitStreamWriter(128);
    writer.writeBits(0x90, 8);
    writeU32c(writer, packet.playerId >>> 0);
    writer.writeBits(packet.useEntries ? 1 : 0, 1);
    if (packet.useEntries) {
        if (!packet.entryA || !packet.entryB) {
            throw new Error('MergeItems with entries requires entryA and entryB');
        }
        writeItemEntryWithId(writer, packet.entryA);
        writeItemEntryWithId(writer, packet.entryB);
    } else {
        writeU32c(writer, packet.itemIdA ?? 0);
        writeU32c(writer, packet.itemIdB ?? 0);
    }
    return writer.toBuffer();
};

export const buildBackpackContentsPacket = (packet: BackpackContentsPacket): Buffer => {
    const writer = new BitStreamWriter(256);
    writer.writeBits(0x92, 8);
    writeU32c(writer, packet.playerId >>> 0);
    writeU8c(writer, packet.subtype & 0xff);
    writeU32c(writer, packet.keyA >>> 0);
    writeU32c(writer, packet.keyB >>> 0);
    writeItemsAddedPayload(writer, packet.payload);
    writeListU16CountU32c(writer, packet.ids);
    return writer.toBuffer();
};
