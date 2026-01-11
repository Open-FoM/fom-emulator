/**
 * Profile structs for character data.
 * Source: object.lto WorldLogin_* functions
 */

import { NativeBitStream, Struct, writeBitsLE, readBitsLE } from '@openfom/networking';

// Matching with Appearance_ItemTemplate_Map.csv, Appearance_FaceHair.csv
export const APPEARANCE_DEFAULTS = {
    // Male
    MALE_SKIN_TONE: 0,
    MALE_HEAD_TEX_A: 7,
    MALE_HEAD_TEX_B: 12,
    MALE_TORSO: 1029,
    MALE_LEGS: 1104,
    MALE_SHOES: 521,

    // Female
    FEMALE_SKIN_TONE: 0,
    FEMALE_HEAD_TEX_A: 0,
    FEMALE_HEAD_TEX_B: 0,
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

export type ProfileCFlagBits = [boolean, boolean, boolean, boolean];

export const PROFILE_C_EXTRA_SLOT_COUNT = 9;

const normalizeExtraSlotIds = (values: number[] = []): number[] => {
    const slots = values.slice(0, PROFILE_C_EXTRA_SLOT_COUNT);
    while (slots.length < PROFILE_C_EXTRA_SLOT_COUNT) slots.push(0);
    return slots;
};

const normalizeFlagBits = (values: boolean[] = []): ProfileCFlagBits => {
    const flags = values.slice(0, 4);
    while (flags.length < 4) flags.push(false);
    return [Boolean(flags[0]), Boolean(flags[1]), Boolean(flags[2]), Boolean(flags[3])];
};

export type ProfileCAppearancePatch = Partial<ProfileCData>;

export interface ProfileCData {
    isFemale?: number;
    skinTone?: number;
    headTexA?: number;
    headTexB?: number;
    unkU32?: number;
    unk5bit?: number;
    unk6bit?: number;
    unk4bit?: number;
    torsoItemId?: number;
    legsItemId?: number;
    shoesItemId?: number;
    extraSlotIds?: number[];
    hasExtraSlots?: boolean;
    flagBits?: boolean[];
}

export const applyProfileCAppearance = (target: ProfileC, data: ProfileCAppearancePatch = {}): ProfileC => {
    if (data.isFemale !== undefined) target.isFemale = data.isFemale & 0x1;
    if (data.skinTone !== undefined) target.skinTone = data.skinTone & 0x1;
    if (data.headTexA !== undefined) target.headTexA = data.headTexA & 0x1f;
    if (data.headTexB !== undefined) target.headTexB = data.headTexB & 0x1f;
    if (data.unkU32 !== undefined) target.unkU32 = data.unkU32 >>> 0;
    if (data.unk5bit !== undefined) target.unk5bit = data.unk5bit & 0x1f;
    if (data.unk6bit !== undefined) target.unk6bit = data.unk6bit & 0x3f;
    if (data.unk4bit !== undefined) target.unk4bit = data.unk4bit & 0xf;
    if (data.torsoItemId !== undefined) target.torsoItemId = data.torsoItemId;
    if (data.legsItemId !== undefined) target.legsItemId = data.legsItemId;
    if (data.shoesItemId !== undefined) target.shoesItemId = data.shoesItemId;
    if (data.extraSlotIds !== undefined) target.extraSlotIds = normalizeExtraSlotIds(data.extraSlotIds);
    if (data.hasExtraSlots !== undefined) {
        target.hasExtraSlots = Boolean(data.hasExtraSlots);
    } else if (data.extraSlotIds !== undefined) {
        target.hasExtraSlots = target.extraSlotIds.some(value => value !== 0);
    }
    if (data.flagBits !== undefined) target.flagBits = normalizeFlagBits(data.flagBits);
    return target;
};

/**
 * ProfileC - Character appearance data.
 * Source: WorldLogin_Read/WriteProfileBlockC @ 0x67418D20 / 0x67418B80
 *
 * Bit layout:
 * isFemale, skinTone, headTexA, headTexB, unkU32, unk5bit, unk6bit, unk4bit,
 * torsoItemId, legsItemId, shoesItemId, [if hasExtraSlots] 9x12, flagBits[4]
 *
 * Refs:
 * - Docs/Appearance/Appearance_Assets.md (head/skin lookup + resource paths)
 * - Docs/Appearance/Appearance_ItemTemplate.csv (itemId -> skin/model)
 */
export class ProfileC extends Struct {
    isFemale: number;
    skinTone: number;
    headTexA: number;
    headTexB: number;
    unkU32: number;
    unk5bit: number;
    unk6bit: number;
    unk4bit: number;
    torsoItemId: number;
    legsItemId: number;
    shoesItemId: number;
    extraSlotIds: number[];
    hasExtraSlots: boolean;
    flagBits: ProfileCFlagBits;

    constructor(data: ProfileCData = {}) {
        super();
        this.isFemale = (data.isFemale ?? 0) & 0x1;
        this.skinTone = (data.skinTone ?? APPEARANCE_DEFAULTS.MALE_SKIN_TONE) & 0x1;
        this.headTexA = (data.headTexA ?? APPEARANCE_DEFAULTS.MALE_HEAD_TEX_A) & 0x1f;
        this.headTexB = (data.headTexB ?? APPEARANCE_DEFAULTS.MALE_HEAD_TEX_B) & 0x1f;
        this.unkU32 = (data.unkU32 ?? 0) >>> 0;
        this.unk5bit = (data.unk5bit ?? 0) & 0x1f;
        this.unk6bit = (data.unk6bit ?? 0) & 0x3f;
        this.unk4bit = (data.unk4bit ?? 0) & 0xf;
        this.torsoItemId = data.torsoItemId ?? APPEARANCE_DEFAULTS.MALE_TORSO;
        this.legsItemId = data.legsItemId ?? APPEARANCE_DEFAULTS.MALE_LEGS;
        this.shoesItemId = data.shoesItemId ?? APPEARANCE_DEFAULTS.MALE_SHOES;
        this.extraSlotIds = normalizeExtraSlotIds(data.extraSlotIds ?? []);
        this.hasExtraSlots = data.hasExtraSlots ?? this.extraSlotIds.some(value => value !== 0);
        this.flagBits = normalizeFlagBits(data.flagBits ?? []);
    }

    encode(bs: NativeBitStream): void {
        writeBitsLE(bs, this.isFemale, 1);
        writeBitsLE(bs, this.skinTone, 1);
        writeBitsLE(bs, this.headTexA, 5);
        writeBitsLE(bs, this.headTexB, 5);

        const u32Buf = Buffer.alloc(4);
        u32Buf.writeUInt32LE(this.unkU32 >>> 0, 0);
        bs.writeBits(u32Buf, 32, true);

        writeBitsLE(bs, this.unk5bit, 5);
        writeBitsLE(bs, this.unk6bit, 6);
        writeBitsLE(bs, this.unk4bit, 4);

        writeBitsLE(bs, this.torsoItemId, 12);
        writeBitsLE(bs, this.legsItemId, 12);
        writeBitsLE(bs, this.shoesItemId, 12);

        const hasExtra = this.extraSlotIds.some(v => v !== 0);
        bs.writeBit(hasExtra);
        if (hasExtra) {
            for (let i = 0; i < PROFILE_C_EXTRA_SLOT_COUNT; i++) {
                writeBitsLE(bs, this.extraSlotIds[i] ?? 0, 12);
            }
        }

        for (let i = 0; i < 4; i++) {
            writeBitsLE(bs, this.flagBits[i] ? 1 : 0, 1);
        }
    }

    static decode(bs: NativeBitStream): ProfileC {
        const isFemale = readBitsLE(bs, 1);
        const skinTone = readBitsLE(bs, 1);
        const headTexA = readBitsLE(bs, 5);
        const headTexB = readBitsLE(bs, 5);

        const u32Buf = bs.readBits(32, true);
        const unkU32 = u32Buf.readUInt32LE(0);

        const unk5bit = readBitsLE(bs, 5);
        const unk6bit = readBitsLE(bs, 6);
        const unk4bit = readBitsLE(bs, 4);

        const torsoItemId = readBitsLE(bs, 12);
        const legsItemId = readBitsLE(bs, 12);
        const shoesItemId = readBitsLE(bs, 12);

        const hasExtraSlots = bs.readBit();
        const extraSlotIds: number[] = [];
        if (hasExtraSlots) {
            for (let i = 0; i < PROFILE_C_EXTRA_SLOT_COUNT; i++) {
                extraSlotIds.push(readBitsLE(bs, 12));
            }
        } else {
            for (let i = 0; i < PROFILE_C_EXTRA_SLOT_COUNT; i++) extraSlotIds.push(0);
        }

        const flagBits = Array(4).fill(false).map(() => readBitsLE(bs, 1) === 1);

        return new ProfileC({
            isFemale,
            skinTone,
            headTexA,
            headTexB,
            unkU32,
            unk5bit,
            unk6bit,
            unk4bit,
            torsoItemId,
            legsItemId,
            shoesItemId,
            extraSlotIds,
            hasExtraSlots,
            flagBits,
        });
    }

    static defaultMale(): ProfileC {
        return new ProfileC({
            isFemale: 0,
            skinTone: APPEARANCE_DEFAULTS.MALE_SKIN_TONE,
            headTexA: APPEARANCE_DEFAULTS.MALE_HEAD_TEX_A,
            headTexB: APPEARANCE_DEFAULTS.MALE_HEAD_TEX_B,
            torsoItemId: APPEARANCE_DEFAULTS.MALE_TORSO,
            legsItemId: APPEARANCE_DEFAULTS.MALE_LEGS,
            shoesItemId: APPEARANCE_DEFAULTS.MALE_SHOES,
        });
    }

    static defaultFemale(): ProfileC {
        return new ProfileC({
            isFemale: 1,
            skinTone: APPEARANCE_DEFAULTS.FEMALE_SKIN_TONE,
            headTexA: APPEARANCE_DEFAULTS.FEMALE_HEAD_TEX_A,
            headTexB: APPEARANCE_DEFAULTS.FEMALE_HEAD_TEX_B,
            torsoItemId: APPEARANCE_DEFAULTS.FEMALE_TORSO,
            legsItemId: APPEARANCE_DEFAULTS.FEMALE_LEGS,
            shoesItemId: APPEARANCE_DEFAULTS.FEMALE_SHOES,
        });
    }
}

/**
 * ProfileD - 53 compressed u32 values (stats/attributes).
 * Source: WorldLogin_ReadProfileBlockD @ 0x674334A0
 * Stat index map: Docs/Packets/ID_WORLD_LOGIN_DATA.md
 */
export const PROFILE_D_STAT_COUNT = 53;

export type ProfileDStatDef = {
    index: number;
    name: string;
    stringId?: number;
    notes?: string;
};

export enum ProfileDStatIndex {
    Health = 0x00,
    Stamina = 0x01,
    BioEnergy = 0x02,
    Aura = 0x03,
    UniversalCredits = 0x04,
    FactionCredits = 0x05,
    Penalty = 0x06,
    PrisonerStatus = 0x07,
    HighestPenalty = 0x08,
    MostWantedStatus = 0x09,
    WantedStatus = 0x0A,
    Agility = 0x0B,
    BallisticDamage = 0x0C,
    EnergyDamage = 0x0D,
    BioDamage = 0x0E,
    AuraDamage = 0x0F,
    Destruction = 0x10,
    WeaponRecoil = 0x11,
    Armor = 0x12,
    Shielding = 0x13,
    Resistance = 0x14,
    Reflection = 0x15,
    HealthRegen = 0x16,
    StaminaRegen = 0x17,
    BioRegen = 0x18,
    AuraRegen = 0x19,
    Coins = 0x1A,
    HealingCooldown = 0x1B,
    FoodCooldown = 0x1C,
    XenoDamage = 0x1D,
    HealthDrain = 0x1E,
    StaminaDrain = 0x1F,
    BioEnergyDrain = 0x20,
    AuraDrain = 0x21,
    ProtectionBypass = 0x22,
    EffectiveRange = 0x23,
    WeaponFireDelay = 0x24,
    Blank1 = 0x25,
    Blank2 = 0x26,
    Weight = 0x27,
    JumpVelocityMultiplier = 0x28,
    FallDamageMultiplier = 0x29,
    Nightvision = 0x2A,
    SoundlessMovement = 0x2B,
    ActivationDistance = 0x2C,
    SprintSpeedMultiplier = 0x2D,
    MaxStamina = 0x2E,
    BioEnergyReplenishingCooldown = 0x2F,
    AuraHealingCooldown = 0x30,
    ShieldSettingOverrideFlag = 0x31,
    Unknown0x32 = 0x32,
    VortexEmitterCooldownFlag = 0x33,
    VortexEmitterCooldownSeconds = 0x34,
}

export const PROFILE_D_STATS: ReadonlyArray<ProfileDStatDef> = Object.freeze([
    { index: 0x00, name: 'Health', stringId: 6300 },
    { index: 0x01, name: 'Stamina', stringId: 6301 },
    { index: 0x02, name: 'Bio Energy', stringId: 6302 },
    { index: 0x03, name: 'Aura', stringId: 6303 },
    { index: 0x04, name: 'Universal Credits', stringId: 6304, notes: 'currencyA - currencyB' },
    { index: 0x05, name: 'Faction Credits', stringId: 22103 },
    { index: 0x06, name: 'Penalty', stringId: 6306 },
    { index: 0x07, name: 'Prisoner Status', stringId: 6307, notes: "blocks item 'j' (msg 5668)" },
    { index: 0x08, name: 'Highest Penalty', stringId: 6308 },
    { index: 0x09, name: 'Most-Wanted Status', stringId: 6309 },
    { index: 0x0A, name: 'Wanted Status', stringId: 6310 },
    { index: 0x0B, name: 'Agility', stringId: 6311 },
    { index: 0x0C, name: 'Ballistic Damage', stringId: 6312 },
    { index: 0x0D, name: 'Energy Damage', stringId: 6313 },
    { index: 0x0E, name: 'Bio Damage', stringId: 6314 },
    { index: 0x0F, name: 'Aura Damage', stringId: 6315 },
    { index: 0x10, name: 'Destruction', stringId: 6316 },
    { index: 0x11, name: 'Weapon Recoil', stringId: 6317 },
    { index: 0x12, name: 'Armor', stringId: 29905 },
    { index: 0x13, name: 'Shielding', stringId: 6319 },
    { index: 0x14, name: 'Resistance', stringId: 6320 },
    { index: 0x15, name: 'Reflection', stringId: 6321 },
    { index: 0x16, name: 'Health Regeneration', stringId: 6322 },
    { index: 0x17, name: 'Stamina Regeneration', stringId: 6323 },
    { index: 0x18, name: 'Bio Regeneration', stringId: 6324 },
    { index: 0x19, name: 'Aura Regeneration', stringId: 6325 },
    { index: 0x1A, name: 'Coins', stringId: 6326 },
    { index: 0x1B, name: 'Healing Cooldown', stringId: 6427 },
    { index: 0x1C, name: 'Food Cooldown', stringId: 6428 },
    { index: 0x1D, name: 'Xeno Damage', stringId: 6329 },
    { index: 0x1E, name: 'Health Drain', stringId: 6330 },
    { index: 0x1F, name: 'Stamina Drain', stringId: 6331 },
    { index: 0x20, name: 'Bio Energy Drain', stringId: 6332 },
    { index: 0x21, name: 'Aura Drain', stringId: 6333 },
    { index: 0x22, name: 'Protection Bypass', stringId: 6334 },
    { index: 0x23, name: 'Effective Range', stringId: 6335 },
    { index: 0x24, name: 'Weapon Fire Delay', stringId: 6336 },
    { index: 0x25, name: 'Blank 1', stringId: 6337 },
    { index: 0x26, name: 'Blank 2', stringId: 6338 },
    { index: 0x27, name: 'Weight', stringId: 6339 },
    { index: 0x28, name: 'Jump Velocity Multiplier', stringId: 6340 },
    { index: 0x29, name: 'Fall Damage Multiplier', stringId: 6341 },
    { index: 0x2A, name: 'Nightvision', stringId: 6342 },
    { index: 0x2B, name: 'Soundless Movement', stringId: 6343 },
    { index: 0x2C, name: 'Activation Distance', stringId: 6344 },
    { index: 0x2D, name: 'Sprint Speed Multiplier', stringId: 6345 },
    { index: 0x2E, name: 'Max Stamina', stringId: 6346 },
    { index: 0x2F, name: 'Bio Energy Replenishing Cooldown', stringId: 6347 },
    { index: 0x30, name: 'Aura Healing Cooldown', stringId: 6348 },
    { index: 0x31, name: 'Shield Setting Override Flag' },
    { index: 0x32, name: 'Unknown' },
    { index: 0x33, name: 'Vortex Emitter Cooldown Flag' },
    { index: 0x34, name: 'Vortex Emitter Cooldown Seconds' },
]);

export const PROFILE_D_STATS_BY_INDEX: Readonly<Record<number, ProfileDStatDef>> = Object.freeze(
    Object.fromEntries(PROFILE_D_STATS.map(def => [def.index, def]))
);

export class ProfileD extends Struct {
    constructor(public values: number[] = Array(PROFILE_D_STAT_COUNT).fill(0)) {
        super();
    }

    encode(bs: NativeBitStream): void {
        for (let i = 0; i < PROFILE_D_STAT_COUNT; i++) bs.writeCompressedU32(this.values[i]);
    }

    static decode(bs: NativeBitStream): ProfileD {
        return new ProfileD(Array(PROFILE_D_STAT_COUNT).fill(0).map(() => bs.readCompressedU32()));
    }

    getStat(index: number): number {
        return this.values[index] ?? 0;
    }

    setStat(index: number, value: number): void {
        if (index >= 0 && index < PROFILE_D_STAT_COUNT) {
            this.values[index] = value >>> 0;
        }
    }

    static empty(): ProfileD {
        const values = Array(PROFILE_D_STAT_COUNT).fill(0);

        // Stats
        values[ProfileDStatIndex.Health] = 1000;
        values[ProfileDStatIndex.HealthRegen] = 3;
        values[ProfileDStatIndex.Stamina] = 10000;
        values[ProfileDStatIndex.BioEnergy] = 1000;
        values[ProfileDStatIndex.Aura] = 1000;
        values[ProfileDStatIndex.AuraRegen] = 43;
        values[ProfileDStatIndex.Agility] = 800;   // 80.0%
        values[ProfileDStatIndex.MaxStamina] = 10000;
        values[ProfileDStatIndex.JumpVelocityMultiplier] = 1100;
        values[ProfileDStatIndex.SprintSpeedMultiplier] = 1200;

        // Currencies
        values[ProfileDStatIndex.UniversalCredits] = 10000;
        values[ProfileDStatIndex.Coins] = 100;
        return new ProfileD(values);
    }
}
