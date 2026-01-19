import { NativeBitStream, writeBitsLE } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';
import { CompactVec3 } from './structs/common';
import { Appearance, type AppearanceData } from './structs/profile';

export type WorldUpdateVec3 = {
    x: number;
    y: number;
    z: number;
};

export type WorldUpdatePlayerExtFields = {
    // Type-1 prelude (WorldUpdate_ReadPlayerEntry_Ext)
    ext_u32_24?: number;
    ext_u32_28?: number;
    ext_u8_32?: number;
    ext_u32_156?: number;
    ext_3bits_152?: number;
    ext_u32_180?: number;
};

export type WorldUpdatePlayerOptionalFields = {
    // Optional block (WorldUpdate_ReadPlayerEntry). Names reflect behavior, not meaning.
    pitchDeg?: number; // encoded as (pitch + 90) & 0xff
    opt_12bits_default16?: number;
    opt_5bits_default0?: number;
    opt_u16_134?: number;
    opt_flag116?: boolean;
    opt_7bits_conditional?: number;
    opt_vec3?: WorldUpdateVec3;
    opt_nibble_a?: number;
    opt_nibble_b?: number;
    opt_6bits_default0?: number;
    slotItemId?: number;
    opt_u7_163?: number;
    forceOptU7_163?: boolean;
    opt_u8_162?: number;
    opt_3bits_176?: number;
    opt_flag184?: boolean;
    opt_10bits_188?: number;
    opt_10bits_192?: number;
    opt_flag164?: boolean;
};

export type WorldUpdatePlayerEntry = {
    entryType?: 1 | 2;
    netId: number;
    position: WorldUpdateVec3;
    yaw: number;
    profile: AppearanceData;
    // When true, client skips the optional block (bit at offset 0x84).
    skipOptionalBlock?: boolean;
    ext?: WorldUpdatePlayerExtFields;
    optional?: WorldUpdatePlayerOptionalFields;
};

export type WorldUpdateCharacterEntry = WorldUpdatePlayerEntry;
export type WorldUpdateEntry = WorldUpdatePlayerEntry;

export type MsgWorldUpdateData = {
    worldInst: number;
    sequence: number;
    entries?: WorldUpdateEntry[];
    includeTerminator?: boolean;
};

const writeCompactVec3S16 = (bs: NativeBitStream, vec: WorldUpdateVec3): void => {
    bs.writeCompressedU16(vec.x & 0xffff);
    bs.writeCompressedU16(vec.y & 0xffff);
    bs.writeCompressedU16(vec.z & 0xffff);
};

const writeCharacterEntryExt = (bs: NativeBitStream, ext?: WorldUpdatePlayerExtFields): void => {
    const ext_u32_24 = ext?.ext_u32_24 ?? 0;
    const ext_u32_28 = ext?.ext_u32_28 ?? 0;
    const ext_u8_32 = ext?.ext_u8_32 ?? 0;
    const ext_u32_156 = ext?.ext_u32_156;
    const ext_3bits_152 = ext?.ext_3bits_152;
    const ext_u32_180 = ext?.ext_u32_180 ?? 0;

    bs.writeCompressedU32(ext_u32_24 >>> 0);
    bs.writeCompressedU32(ext_u32_28 >>> 0);
    bs.writeCompressedU8(ext_u8_32 & 0xff);

    bs.writeBit(ext_u32_156 !== undefined);
    if (ext_u32_156 !== undefined) {
        bs.writeCompressedU32(ext_u32_156 >>> 0);
    }

    bs.writeBit(ext_3bits_152 !== undefined);
    if (ext_3bits_152 !== undefined) {
        writeBitsLE(bs, ext_3bits_152 & 0x7, 3);
    }

    bs.writeCompressedU32(ext_u32_180 >>> 0);
};

const writeCharacterOptionalFields = (
    bs: NativeBitStream,
    optional: WorldUpdatePlayerOptionalFields | undefined,
    hasProfileExtras: boolean,
): void => {
    const pitchDeg = optional?.pitchDeg ?? 0;
    writeBitsLE(bs, (pitchDeg + 90) & 0xff, 8);

    const opt12 = optional?.opt_12bits_default16;
    bs.writeBit(opt12 !== undefined);
    if (opt12 !== undefined) {
        writeBitsLE(bs, opt12 & 0xfff, 12);
    }

    const opt5 = optional?.opt_5bits_default0;
    bs.writeBit(opt5 !== undefined);
    if (opt5 !== undefined) {
        writeBitsLE(bs, opt5 & 0x1f, 5);
    }

    const hasGroup134 =
        optional?.opt_u16_134 !== undefined ||
        optional?.opt_flag116 !== undefined ||
        optional?.opt_7bits_conditional !== undefined ||
        optional?.opt_vec3 !== undefined;
    bs.writeBit(hasGroup134);
    if (hasGroup134) {
        bs.writeCompressedU16((optional?.opt_u16_134 ?? 0) & 0xffff);
        bs.writeBit(Boolean(optional?.opt_flag116));

        const hasOpt7 = optional?.opt_7bits_conditional !== undefined;
        bs.writeBit(hasOpt7);
        if (hasOpt7) {
            writeBitsLE(bs, optional?.opt_7bits_conditional ?? 0, 7);
            const opt7 = optional?.opt_7bits_conditional ?? 0;
            if (opt7 !== 0) {
                writeCompactVec3S16(bs, optional?.opt_vec3 ?? { x: 0, y: 0, z: 0 });
            }
        }
    }

    const hasNibbles = optional?.opt_nibble_a !== undefined || optional?.opt_nibble_b !== undefined;
    bs.writeBit(hasNibbles);
    if (hasNibbles) {
        writeBitsLE(bs, optional?.opt_nibble_a ?? 0, 4);
        writeBitsLE(bs, optional?.opt_nibble_b ?? 0, 4);
    }

    const opt6 = optional?.opt_6bits_default0;
    bs.writeBit(opt6 !== undefined);
    if (opt6 !== undefined) {
        writeBitsLE(bs, opt6 & 0x3f, 6);
    }

    if (hasProfileExtras) {
        const slotItemId = optional?.slotItemId;
        const hasSlotItem = slotItemId !== undefined;
        bs.writeBit(hasSlotItem);
        if (hasSlotItem) {
            bs.writeCompressedU16(slotItemId & 0xffff);
            const wantsOptU7 = Boolean(
                optional?.forceOptU7_163 && optional?.opt_u7_163 !== undefined,
            );
            if (wantsOptU7) {
                writeBitsLE(bs, optional?.opt_u7_163 ?? 0, 7);
            }
        }
    }

    writeBitsLE(bs, optional?.opt_u8_162 ?? 0, 8);
    writeBitsLE(bs, optional?.opt_3bits_176 ?? 0, 3);
    bs.writeBit(Boolean(optional?.opt_flag184));
    writeBitsLE(bs, optional?.opt_10bits_188 ?? 0, 10);
    writeBitsLE(bs, optional?.opt_10bits_192 ?? 0, 10);
    bs.writeBit(Boolean(optional?.opt_flag164));
};

export class MsgWorldUpdate extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_ID_WORLD_UPDATE;

    worldInst: number;
    sequence: number;
    entries: WorldUpdateEntry[];
    includeTerminator: boolean;
    private cachedPayloadBits: number | null = null;

    constructor(data: MsgWorldUpdateData) {
        super();
        this.worldInst = data.worldInst >>> 0;
        this.sequence = data.sequence >>> 0;
        this.entries = data.entries ?? [];
        this.includeTerminator = data.includeTerminator ?? true;
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        bs.writeU8(MsgWorldUpdate.MESSAGE_ID);
        bs.writeCompressedU32(this.worldInst >>> 0);
        bs.writeCompressedU32(this.sequence >>> 0);

        for (const entry of this.entries) {
            const entryType = entry.entryType ?? 2;
            bs.writeCompressedU8(entryType & 0xff);
            if (entryType === 1) {
                writeCharacterEntryExt(bs, entry.ext);
            }

            bs.writeCompressedU32(entry.netId >>> 0);

            const position = entry.position ?? { x: 0, y: 0, z: 0 };
            const yaw = entry.yaw ?? 0;
            const compact = new CompactVec3(position.x, position.y, position.z, yaw, 16);
            compact.encode(bs);

            const profile =
                entry.profile instanceof Appearance ? entry.profile : new Appearance(entry.profile);
            profile.encode(bs);

            const skipOptionalBlock = Boolean(entry.skipOptionalBlock);
            bs.writeBit(skipOptionalBlock);
            if (!skipOptionalBlock) {
                const hasExtras = profile.hasExtraSlots;
                writeCharacterOptionalFields(bs, entry.optional, hasExtras);
            }
        }

        if (this.includeTerminator) {
            bs.writeCompressedU8(0);
        }

        this.cachedPayloadBits = Math.max(0, bs.getNumberOfBitsUsed() - 8);
        return bs.getData();
    }

    get payloadBits(): number {
        return this.cachedPayloadBits ?? 0;
    }

    toString(): string {
        return `MsgWorldUpdate { worldInst: ${this.worldInst}, entries: ${this.entries.length} }`;
    }
}
