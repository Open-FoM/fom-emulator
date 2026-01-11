/**
 * Profile structs for character data.
 * Source: object.lto WorldLogin_* functions
 */

import { NativeBitStream, Struct, writeBitsLE, readBitsLE } from '@openfom/networking';

export const APPEARANCE_DEFAULTS = {
    MALE_TORSO: 611,
    MALE_LEGS: 760,
    MALE_SHOES: 500,
    FEMALE_TORSO: 797,
    FEMALE_LEGS: 907,
    FEMALE_SHOES: 510,
} as const;

/**
 * SkillEntry - 48B slot payload (on-wire fields + local padding).
 * Source: WorldLogin_ReadSkillEntry @ 0x6742B820
 */
export class SkillEntry extends Struct {
    constructor(
        public abilityItemId: number = 0,
        public field2: number = 0,
        public field4: number = 0,
        public field6: number = 0,
        public field8: number = 0,
        public field9: number = 0,
        public field12: number = 0,
        public field16: number = 0,
        public field20: number = 0,
        public field24: number = 0,
        public field25: number = 0,
        public field26: number = 0,
        public extra: number[] = [0, 0, 0, 0]
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU16(this.abilityItemId & 0xffff);
        bs.writeCompressedU16(this.field2 & 0xffff);
        bs.writeCompressedU16(this.field4 & 0xffff);
        bs.writeCompressedU16(this.field6 & 0xffff);
        bs.writeCompressedU8(this.field8 & 0xff);
        bs.writeCompressedU8(this.field9 & 0xff);
        bs.writeCompressedU32(this.field12 >>> 0);
        bs.writeCompressedU32(this.field16 >>> 0);
        bs.writeCompressedU32(this.field20 >>> 0);
        bs.writeCompressedU8(this.field26 & 0xff);
        bs.writeCompressedU8(this.field25 & 0xff);
        bs.writeCompressedU8(this.field24 & 0xff);
        for (let i = 0; i < 4; i++) {
            bs.writeCompressedU8((this.extra[i] ?? 0) & 0xff);
        }
    }

    static decode(bs: NativeBitStream): SkillEntry {
        const abilityItemId = bs.readCompressedU16();
        const field2 = bs.readCompressedU16();
        const field4 = bs.readCompressedU16();
        const field6 = bs.readCompressedU16();
        const field8 = bs.readCompressedU8();
        const field9 = bs.readCompressedU8();
        const field12 = bs.readCompressedU32();
        const field16 = bs.readCompressedU32();
        const field20 = bs.readCompressedU32();
        const field26 = bs.readCompressedU8();
        const field25 = bs.readCompressedU8();
        const field24 = bs.readCompressedU8();
        const extra = [] as number[];
        for (let i = 0; i < 4; i++) extra.push(bs.readCompressedU8());
        return new SkillEntry(
            abilityItemId,
            field2,
            field4,
            field6,
            field8,
            field9,
            field12,
            field16,
            field20,
            field24,
            field25,
            field26,
            extra
        );
    }
}

/**
 * SkillSlot - Optional slot entry.
 * Source: WorldLogin_ReadSkillSlot @ 0x6742B940
 */
export class SkillSlot extends Struct {
    constructor(public slotId: number = 0, public entry: SkillEntry = new SkillEntry()) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.slotId >>> 0);
        this.entry.encode(bs);
    }

    static decode(bs: NativeBitStream): SkillSlot {
        const slotId = bs.readCompressedU32();
        const entry = SkillEntry.decode(bs);
        return new SkillSlot(slotId, entry);
    }
}

/**
 * SkillTable - Table of optional slots (12/3/6).
 * Source: WorldLogin_ReadSkillTable* @ 0x6743BA60 / 0x67451AB0 / 0x67451D60
 */
export class SkillTable extends Struct {
    constructor(public slotCount: number, public slots: Array<SkillSlot | null> = Array(slotCount).fill(null)) {
        super();
    }

    encode(bs: NativeBitStream): void {
        for (let i = 0; i < this.slotCount; i++) {
            const slot = this.slots[i];
            const present = Boolean(slot && slot.slotId !== 0);
            bs.writeBit(present);
            if (present) {
                slot?.encode(bs);
            }
        }
    }

    static decodeWithCount(bs: NativeBitStream, slotCount: number): SkillTable {
        const slots: Array<SkillSlot | null> = [];
        for (let i = 0; i < slotCount; i++) {
            const present = bs.readBit();
            slots.push(present ? SkillSlot.decode(bs) : null);
        }
        return new SkillTable(slotCount, slots);
    }

    static empty(slotCount: number): SkillTable {
        return new SkillTable(slotCount);
    }
}

/**
 * SkillTree - Entry + list of skill IDs.
 * Source: WorldLogin_ReadSkillTree @ 0x6741C190
 */
export class SkillTree extends Struct {
    constructor(public entry: SkillEntry = new SkillEntry(), public skillIds: number[] = []) {
        super();
    }

    encode(bs: NativeBitStream): void {
        this.entry.encode(bs);
        bs.writeCompressedU16(this.skillIds.length & 0xffff);
        for (const skillId of this.skillIds) {
            bs.writeCompressedU32(skillId >>> 0);
        }
    }

    static decode(bs: NativeBitStream): SkillTree {
        const entry = SkillEntry.decode(bs);
        const count = bs.readCompressedU16();
        const skillIds: number[] = [];
        for (let i = 0; i < count; i++) {
            skillIds.push(bs.readCompressedU32());
        }
        return new SkillTree(entry, skillIds);
    }
}

/**
 * SkillTreeList - Container with header + list of SkillTree entries.
 * Source: WorldLogin_ReadSkillTreeList @ 0x6741E500
 */
export class SkillTreeList extends Struct {
    constructor(
        public headerField0: number = 0,
        public field20: number = 0,
        public field24: number = 0,
        public field28: number = 0,
        public entries: SkillTree[] = []
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU16(this.headerField0 & 0xffff);
        bs.writeCompressedU32(this.field20 >>> 0);
        bs.writeCompressedU32(this.field24 >>> 0);
        bs.writeCompressedU32(this.field28 >>> 0);
        bs.writeCompressedU16(this.entries.length & 0xffff);
        for (const entry of this.entries) {
            entry.encode(bs);
        }
    }

    static decode(bs: NativeBitStream): SkillTreeList {
        const headerField0 = bs.readCompressedU16();
        const field20 = bs.readCompressedU32();
        const field24 = bs.readCompressedU32();
        const field28 = bs.readCompressedU32();
        const count = bs.readCompressedU16();
        const entries: SkillTree[] = [];
        for (let i = 0; i < count; i++) {
            entries.push(SkillTree.decode(bs));
        }
        return new SkillTreeList(headerField0, field20, field24, field28, entries);
    }

    static empty(): SkillTreeList {
        return new SkillTreeList();
    }
}

/**
 * ProfileA - Skill trees + slot tables (1084 bytes in memory).
 * Source: WorldLogin_ReadProfileBlockA @ 0x6743AB40
 */
export class ProfileA extends Struct {
    constructor(
        public skillTreeA: SkillTreeList = SkillTreeList.empty(),
        public skillTable12: SkillTable = SkillTable.empty(12),
        public skillTable3: SkillTable = SkillTable.empty(3),
        public skillTable6: SkillTable = SkillTable.empty(6),
        public skillTreeB: SkillTreeList = SkillTreeList.empty()
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        this.skillTreeA.encode(bs);
        this.skillTable12.encode(bs);
        this.skillTable3.encode(bs);
        this.skillTable6.encode(bs);
        this.skillTreeB.encode(bs);
    }

    static decode(bs: NativeBitStream): ProfileA {
        const skillTreeA = SkillTreeList.decode(bs);
        const skillTable12 = SkillTable.decodeWithCount(bs, 12);
        const skillTable3 = SkillTable.decodeWithCount(bs, 3);
        const skillTable6 = SkillTable.decodeWithCount(bs, 6);
        const skillTreeB = SkillTreeList.decode(bs);
        return new ProfileA(skillTreeA, skillTable12, skillTable3, skillTable6, skillTreeB);
    }

    static empty(): ProfileA {
        return new ProfileA();
    }
}

/**
 * ProfileB - 4 u16c values.
 * Source: WorldLogin_ReadProfileBlockB @ 0x6743AA40
 */
export class ProfileB extends Struct {
    constructor(public values: number[] = [0, 0, 0, 0]) {
        super();
    }

    encode(bs: NativeBitStream): void {
        for (let i = 0; i < 4; i++) bs.writeCompressedU16(this.values[i] & 0xffff);
    }

    static decode(bs: NativeBitStream): ProfileB {
        return new ProfileB(Array(4).fill(0).map(() => bs.readCompressedU16()));
    }

    static empty(): ProfileB {
        return new ProfileB();
    }
}

export interface ProfileCData {
    gender?: number;
    skinColor?: number;
    headTextureIdx?: number;
    hairTextureIdx?: number;
    unknownU32?: number;
    unknown5?: number;
    unknown6?: number;
    unknown7?: number;
    torsoTypeId?: number;
    legsTypeId?: number;
    shoesTypeId?: number;
    accessorySlots?: number[];
    hasAbilities?: boolean;
    flags?: boolean[];
}

/**
 * ProfileC - Character appearance data.
 * Source: WorldLogin_Read/WriteProfileBlockC @ 0x67418D20 / 0x67418B80
 *
 * Bit layout:
 * 1,1,5,5,32,5,6,4,12,12,12, [if flag] 9x12, 1,1,1,1
 */
export class ProfileC extends Struct {
    gender: number;
    skinColor: number;
    headTextureIdx: number;
    hairTextureIdx: number;
    unknownU32: number;
    unknown5: number;
    unknown6: number;
    unknown7: number;
    torsoTypeId: number;
    legsTypeId: number;
    shoesTypeId: number;
    accessorySlots: number[];
    hasAbilities: boolean;
    flags: boolean[];

    constructor(data: ProfileCData = {}) {
        super();
        this.gender = data.gender ?? 0;
        this.skinColor = data.skinColor ?? 0;
        this.headTextureIdx = data.headTextureIdx ?? 0;
        this.hairTextureIdx = data.hairTextureIdx ?? 0;
        this.unknownU32 = data.unknownU32 ?? 0;
        this.unknown5 = data.unknown5 ?? 0;
        this.unknown6 = data.unknown6 ?? 0;
        this.unknown7 = data.unknown7 ?? 0;
        this.torsoTypeId = data.torsoTypeId ?? APPEARANCE_DEFAULTS.MALE_TORSO;
        this.legsTypeId = data.legsTypeId ?? APPEARANCE_DEFAULTS.MALE_LEGS;
        this.shoesTypeId = data.shoesTypeId ?? APPEARANCE_DEFAULTS.MALE_SHOES;
        this.accessorySlots = (data.accessorySlots ?? []).slice(0, 9);
        while (this.accessorySlots.length < 9) this.accessorySlots.push(0);
        this.hasAbilities = data.hasAbilities ?? false;
        this.flags = data.flags ?? [false, false, false, false];
    }

    encode(bs: NativeBitStream): void {
        writeBitsLE(bs, this.gender, 1);
        writeBitsLE(bs, this.skinColor, 1);
        writeBitsLE(bs, this.headTextureIdx, 5);
        writeBitsLE(bs, this.hairTextureIdx, 5);

        const u32Buf = Buffer.alloc(4);
        u32Buf.writeUInt32LE(this.unknownU32 >>> 0, 0);
        bs.writeBits(u32Buf, 32, true);

        writeBitsLE(bs, this.unknown5, 5);
        writeBitsLE(bs, this.unknown6, 6);
        writeBitsLE(bs, this.unknown7, 4);

        writeBitsLE(bs, this.torsoTypeId, 12);
        writeBitsLE(bs, this.legsTypeId, 12);
        writeBitsLE(bs, this.shoesTypeId, 12);

        const hasExtra = this.accessorySlots.some(v => v !== 0);
        bs.writeBit(hasExtra);
        if (hasExtra) {
            for (let i = 0; i < 9; i++) {
                writeBitsLE(bs, this.accessorySlots[i] ?? 0, 12);
            }
        }

        for (let i = 0; i < 4; i++) {
            writeBitsLE(bs, this.flags[i] ? 1 : 0, 1);
        }
    }

    static decode(bs: NativeBitStream): ProfileC {
        const gender = readBitsLE(bs, 1);
        const skinColor = readBitsLE(bs, 1);
        const headTextureIdx = readBitsLE(bs, 5);
        const hairTextureIdx = readBitsLE(bs, 5);

        const u32Buf = bs.readBits(32, true);
        const unknownU32 = u32Buf.readUInt32LE(0);

        const unknown5 = readBitsLE(bs, 5);
        const unknown6 = readBitsLE(bs, 6);
        const unknown7 = readBitsLE(bs, 4);

        const torsoTypeId = readBitsLE(bs, 12);
        const legsTypeId = readBitsLE(bs, 12);
        const shoesTypeId = readBitsLE(bs, 12);

        const hasAbilities = bs.readBit();
        const accessorySlots: number[] = [];
        if (hasAbilities) {
            for (let i = 0; i < 9; i++) {
                accessorySlots.push(readBitsLE(bs, 12));
            }
        } else {
            for (let i = 0; i < 9; i++) accessorySlots.push(0);
        }

        const flags = Array(4).fill(false).map(() => readBitsLE(bs, 1) === 1);

        return new ProfileC({
            gender,
            skinColor,
            headTextureIdx,
            hairTextureIdx,
            unknownU32,
            unknown5,
            unknown6,
            unknown7,
            torsoTypeId,
            legsTypeId,
            shoesTypeId,
            accessorySlots,
            hasAbilities,
            flags,
        });
    }

    static defaultMale(): ProfileC {
        return new ProfileC({
            gender: 0,
            torsoTypeId: APPEARANCE_DEFAULTS.MALE_TORSO,
            legsTypeId: APPEARANCE_DEFAULTS.MALE_LEGS,
            shoesTypeId: APPEARANCE_DEFAULTS.MALE_SHOES,
        });
    }

    static defaultFemale(): ProfileC {
        return new ProfileC({
            gender: 1,
            torsoTypeId: APPEARANCE_DEFAULTS.FEMALE_TORSO,
            legsTypeId: APPEARANCE_DEFAULTS.FEMALE_LEGS,
            shoesTypeId: APPEARANCE_DEFAULTS.FEMALE_SHOES,
        });
    }
}

/**
 * ProfileD - 53 compressed u32 values (stats/attributes).
 * Source: WorldLogin_ReadProfileBlockD @ 0x674334A0
 */
export class ProfileD extends Struct {
    constructor(public values: number[] = Array(53).fill(0)) {
        super();
    }

    encode(bs: NativeBitStream): void {
        for (let i = 0; i < 53; i++) bs.writeCompressedU32(this.values[i]);
    }

    static decode(bs: NativeBitStream): ProfileD {
        return new ProfileD(Array(53).fill(0).map(() => bs.readCompressedU32()));
    }

    static empty(): ProfileD {
        const values = Array(53).fill(0);
        // Basic vitals: match client stat scale caps (g_StatScaleTable[0..3]).
        values[0] = 1000;  // Health
        values[1] = 10000; // Stamina
        values[2] = 1000;  // Bio Energy / Consciousness
        values[3] = 1000;  // Aura / Morale
        return new ProfileD(values);
    }
}
