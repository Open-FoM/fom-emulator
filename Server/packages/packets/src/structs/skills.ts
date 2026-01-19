/**
 * ProfileA (skills + slot tables) and related structures.
 * Source: WorldLogin_ReadProfileBlockA + skill table readers.
 */

import { NativeBitStream, Struct } from '@openfom/networking';

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
        public extra: number[] = [0, 0, 0, 0],
    ) {
        super();
    }

    /**
     * Serialize skill entry in wire order.
     */
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

    /**
     * Deserialize skill entry in wire order.
     */
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
            extra,
        );
    }
}

/**
 * SkillSlot - Optional slot entry.
 * Source: WorldLogin_ReadSkillSlot @ 0x6742B940
 */
export class SkillSlot extends Struct {
    constructor(
        public slotId: number = 0,
        public entry: SkillEntry = new SkillEntry(),
    ) {
        super();
    }

    /**
     * Serialize slot payload when present.
     */
    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.slotId >>> 0);
        this.entry.encode(bs);
    }

    /**
     * Deserialize a slot payload.
     */
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
    constructor(
        public slotCount: number,
        public slots: Array<SkillSlot | null> = Array(slotCount).fill(null),
    ) {
        super();
    }

    /**
     * Serialize the optional-slot bitset and entries.
     */
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

    /**
     * Deserialize a table with a known slot count.
     */
    static decodeWithCount(bs: NativeBitStream, slotCount: number): SkillTable {
        const slots: Array<SkillSlot | null> = [];
        for (let i = 0; i < slotCount; i++) {
            const present = bs.readBit();
            slots.push(present ? SkillSlot.decode(bs) : null);
        }
        return new SkillTable(slotCount, slots);
    }

    /**
     * Create an empty table with all slots unset.
     */
    static empty(slotCount: number): SkillTable {
        return new SkillTable(slotCount);
    }
}

/**
 * SkillTree - Entry + list of skill IDs.
 * Source: WorldLogin_ReadSkillTree @ 0x6741C190
 */
export class SkillTree extends Struct {
    constructor(
        public entry: SkillEntry = new SkillEntry(),
        public skillIds: number[] = [],
    ) {
        super();
    }

    /**
     * Serialize skill tree entry + list of skill IDs.
     */
    encode(bs: NativeBitStream): void {
        this.entry.encode(bs);
        bs.writeCompressedU16(this.skillIds.length & 0xffff);
        for (const skillId of this.skillIds) {
            bs.writeCompressedU32(skillId >>> 0);
        }
    }

    /**
     * Deserialize a skill tree entry + IDs list.
     */
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
        public entries: SkillTree[] = [],
    ) {
        super();
    }

    /**
     * Serialize the skill tree list and header fields.
     */
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

    /**
     * Deserialize the skill tree list and header fields.
     */
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

    /**
     * Create an empty skill tree list payload.
     */
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
        public skillTreeB: SkillTreeList = SkillTreeList.empty(),
    ) {
        super();
    }

    /**
     * Serialize ProfileA (skill trees + slot tables).
     */
    encode(bs: NativeBitStream): void {
        this.skillTreeA.encode(bs);
        this.skillTable12.encode(bs);
        this.skillTable3.encode(bs);
        this.skillTable6.encode(bs);
        this.skillTreeB.encode(bs);
    }

    /**
     * Deserialize ProfileA.
     */
    static decode(bs: NativeBitStream): ProfileA {
        const skillTreeA = SkillTreeList.decode(bs);
        const skillTable12 = SkillTable.decodeWithCount(bs, 12);
        const skillTable3 = SkillTable.decodeWithCount(bs, 3);
        const skillTable6 = SkillTable.decodeWithCount(bs, 6);
        const skillTreeB = SkillTreeList.decode(bs);
        return new ProfileA(skillTreeA, skillTable12, skillTable3, skillTable6, skillTreeB);
    }

    /**
     * Create an empty ProfileA payload.
     */
    static empty(): ProfileA {
        return new ProfileA();
    }
}