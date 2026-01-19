/**
 * ProfileC appearance data + helpers.
 * Source: WorldLogin_Read/WriteProfileBlockC + CShell bitfield helpers.
 */

import { NativeBitStream, Struct, writeBitsLE, readBitsLE } from '@openfom/networking';

/**
 * Appearance defaults for Character creation/spawn.
 * Source: Appearance_ItemTemplate_Map.csv + Appearance_FaceHair.csv.
 */
export const APPEARANCE_DEFAULTS = {
    // Male
    MALE_SKIN_TONE: 0,
    MALE_HEAD_TEX_A: 7,
    MALE_HEAD_TEX_B: 12,
    MALE_TORSO: 1029,
    MALE_LEGS: 1104,
    MALE_SHOES: 521,
    MALE_HAT: 1609,

    // Temporary armor defaults (Legionnaire Powered set).
    TEST_ARMOR_HELMET: 133,
    TEST_ARMOR_SHOULDERS: 233,
    TEST_ARMOR_TORSO: 333,
    TEST_ARMOR_ARMS: 283,
    TEST_ARMOR_GLOVES: 433,
    TEST_ARMOR_LEGPADS: 383,

    // Female
    FEMALE_SKIN_TONE: 0,
    FEMALE_HEAD_TEX_A: 0,
    FEMALE_HEAD_TEX_B: 0,
    FEMALE_TORSO: 797,
    FEMALE_LEGS: 907,
    FEMALE_SHOES: 510,
    FEMALE_HAT: 1609,
} as const;

/**
 * Local switch for validation defaults (do not enable in production).
 */
const ENABLE_APPEARANCE_TEST_DEFAULTS = true;

/**
 * Appearance flag bits (4 x 1-bit).
 */
export type AppearanceFlagBits = [boolean, boolean, boolean, boolean];

/**
 * Count of extra equipment slots serialized in ProfileC.
 */
export const APPEARANCE_EXTRA_SLOT_COUNT = 9;

/**
 * Index mapping for the 9 extra slots in ProfileC.
 */
export enum AppearanceExtraSlotIndex {
    Helmet = 0,
    Hat = 1,
    Eyes = 2,
    Shoulders = 3,
    Arms = 4,
    TorsoArmor = 5,
    Back = 6,
    LegPads = 7,
    Gloves = 8,
}

/**
 * Named accessors for extra equipment slots.
 */
export type AppearanceExtraSlotData = {
    helmetItemId?: number;
    hatItemId?: number;
    eyesItemId?: number;
    shouldersItemId?: number;
    armsItemId?: number;
    torsoArmorItemId?: number;
    backItemId?: number;
    legPadsItemId?: number;
    glovesItemId?: number;
};

/**
 * Clamp and pad extra slot ids to the wire count (9).
 */
const normalizeExtraSlotIds = (values: number[] = []): number[] => {
    const slots = values.slice(0, APPEARANCE_EXTRA_SLOT_COUNT);
    while (slots.length < APPEARANCE_EXTRA_SLOT_COUNT) slots.push(0);
    return slots;
};

/**
 * Apply named overrides into the extra slot array.
 */
const applyExtraSlotOverrides = (slots: number[], data: AppearanceExtraSlotData): void => {
    if (data.helmetItemId !== undefined) slots[AppearanceExtraSlotIndex.Helmet] = data.helmetItemId;
    if (data.hatItemId !== undefined) slots[AppearanceExtraSlotIndex.Hat] = data.hatItemId;
    if (data.eyesItemId !== undefined) slots[AppearanceExtraSlotIndex.Eyes] = data.eyesItemId;
    if (data.shouldersItemId !== undefined)
        slots[AppearanceExtraSlotIndex.Shoulders] = data.shouldersItemId;
    if (data.armsItemId !== undefined) slots[AppearanceExtraSlotIndex.Arms] = data.armsItemId;
    if (data.torsoArmorItemId !== undefined)
        slots[AppearanceExtraSlotIndex.TorsoArmor] = data.torsoArmorItemId;
    if (data.backItemId !== undefined) slots[AppearanceExtraSlotIndex.Back] = data.backItemId;
    if (data.legPadsItemId !== undefined)
        slots[AppearanceExtraSlotIndex.LegPads] = data.legPadsItemId;
    if (data.glovesItemId !== undefined)
        slots[AppearanceExtraSlotIndex.Gloves] = data.glovesItemId;
};

/**
 * Fast check for whether any extra slot overrides were provided.
 */
const hasExtraSlotOverrides = (data: AppearanceExtraSlotData): boolean =>
    data.helmetItemId !== undefined ||
    data.hatItemId !== undefined ||
    data.eyesItemId !== undefined ||
    data.shouldersItemId !== undefined ||
    data.armsItemId !== undefined ||
    data.torsoArmorItemId !== undefined ||
    data.backItemId !== undefined ||
    data.legPadsItemId !== undefined ||
    data.glovesItemId !== undefined;

/**
 * Clamp and pad flag bits to 4 entries.
 */
const normalizeFlagBits = (values: boolean[] = []): AppearanceFlagBits => {
    const flags = values.slice(0, 4);
    while (flags.length < 4) flags.push(false);
    return [Boolean(flags[0]), Boolean(flags[1]), Boolean(flags[2]), Boolean(flags[3])];
};

/**
 * Partial appearance updates (server-side patching helper).
 */
export type AppearancePatch = Partial<AppearanceData>;

/**
 * Appearance payload shape used by packets and world updates.
 */
export interface AppearanceData {
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
    helmetItemId?: number;
    hatItemId?: number;
    eyesItemId?: number;
    shouldersItemId?: number;
    armsItemId?: number;
    torsoArmorItemId?: number;
    backItemId?: number;
    legPadsItemId?: number;
    glovesItemId?: number;
    hasExtraSlots?: boolean;
    flagBits?: boolean[];
}

/**
 * Mutate an existing Appearance instance with partial data.
 */
export const applyAppearancePatch = (
    target: Appearance,
    data: AppearancePatch = {},
): Appearance => {
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
    if (data.extraSlotIds !== undefined) {
        target.extraSlotIds = normalizeExtraSlotIds(data.extraSlotIds);
    }
    applyExtraSlotOverrides(target.extraSlotIds, data);
    if (data.hasExtraSlots !== undefined) {
        target.hasExtraSlots = Boolean(data.hasExtraSlots);
    } else if (data.extraSlotIds !== undefined || hasExtraSlotOverrides(data)) {
        // Keep wire behavior: hasExtraSlots reflects whether any extra slots are non-zero.
        target.hasExtraSlots = target.extraSlotIds.some((value) => value !== 0);
    }
    if (data.flagBits !== undefined) target.flagBits = normalizeFlagBits(data.flagBits);
    return target;
};

/**
 * Appearance - Character appearance data.
 * Source: WorldLogin_Read/WriteProfileBlockC @ 0x67418D20 / 0x67418B80
 *
 * Bit layout:
 * isFemale, skinTone, headTexA, headTexB, unkU32, unk5bit, unk6bit, unk4bit,
 * torsoItemId, legsItemId, shoesItemId, [if hasExtraSlots] 9x12, flagBits[4]
 *
 * CShell storage (Read_BitfieldBlock_0x30 @ 0x65957770) is word-indexed:
 * 0..3=isFemale/skin/headA/headB, 4=unkU32 (32-bit read; high word overwritten by idx5),
 * 5..7=unk5/unk6/unk4, 8..10=torso/legs/shoes, 11..19=extra slots, 20..23=flagBits.
 *
 * Equip slots are word IDs 5..16 (12 total) in the actor equip array (object.lto GetWordFieldByIndex).
 * ProfileC only covers a subset (base clothing + extra slots below). Remaining equip slots (6,12..16)
 * are not present in ProfileC and likely live in another block (Stats/ProfileD) or attachment state.
 *
     * Extra slots (word idx 11..19; 9x12 block order):
     * 0=helmet(type5/slot5), 1=hat(type6/23, assumed), 2=glasses(type7),
     * 3=shoulderPads(type5/slot7), 4=armPads(type5/slot9),
     * 5=torsoArmor(type5/slot8), 6=back/implant(type6/23, assumed),
     * 7=legPads(type5/slot11), 8=gloves(type5/slot10).
 *
 * Notes:
 * - CShell UI does not reference unk5bit/unk6bit/unk4bit; hat/back mapping to extra slots is assumed.
 * - Hats (item ids 1601..1609) are handled via CAttachments_UpdateAccessoryByItemId (object.lto),
 *   so they likely bind to attachment slots rather than ProfileC bitfields.
 * - unkU32 only gates avatarData reset in Handle_MSG_ID_AVATAR_CHANGE (object.lto).
 *
 * Refs:
 * - Docs/Appearance/Appearance_Assets.md (head/skin lookup + resource paths)
 * - Docs/Appearance/Appearance_ItemTemplate.csv (itemId -> skin/model)
 */
export class Appearance extends Struct {
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
    flagBits: AppearanceFlagBits;

    constructor(data: AppearanceData = {}) {
        super();
        this.isFemale = (data.isFemale ?? 0) & 0x1;
        this.skinTone = (data.skinTone ?? APPEARANCE_DEFAULTS.MALE_SKIN_TONE) & 0x1;
        this.headTexA = (data.headTexA ?? APPEARANCE_DEFAULTS.MALE_HEAD_TEX_A) & 0x1f;
        this.headTexB = (data.headTexB ?? APPEARANCE_DEFAULTS.MALE_HEAD_TEX_B) & 0x1f;
        // Unknown/reserved: only known use is unkU32 gating avatarData reset in Handle_MSG_ID_AVATAR_CHANGE.
        this.unkU32 = (data.unkU32 ?? 0) >>> 0;
        this.unk5bit = (data.unk5bit ?? 0) & 0x1f;
        this.unk6bit = (data.unk6bit ?? 0) & 0x3f;
        this.unk4bit = (data.unk4bit ?? 0) & 0xf;
        this.torsoItemId = data.torsoItemId ?? APPEARANCE_DEFAULTS.MALE_TORSO;
        this.legsItemId = data.legsItemId ?? APPEARANCE_DEFAULTS.MALE_LEGS;
        this.shoesItemId = data.shoesItemId ?? APPEARANCE_DEFAULTS.MALE_SHOES;
        // Order matches ProfileC word idx 11..19 (see class doc comment).
        this.extraSlotIds = normalizeExtraSlotIds(data.extraSlotIds ?? []);
        applyExtraSlotOverrides(this.extraSlotIds, data);
        if (ENABLE_APPEARANCE_TEST_DEFAULTS) {
            const defaultHat = this.isFemale
                ? APPEARANCE_DEFAULTS.FEMALE_HAT
                : APPEARANCE_DEFAULTS.MALE_HAT;
            if (
                data.hatItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.Hat] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.Hat] = defaultHat;
            }
            if (
                data.helmetItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.Helmet] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.Helmet] =
                    APPEARANCE_DEFAULTS.TEST_ARMOR_HELMET;
            }
            if (
                data.shouldersItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.Shoulders] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.Shoulders] =
                    APPEARANCE_DEFAULTS.TEST_ARMOR_SHOULDERS;
            }
            if (
                data.torsoArmorItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.TorsoArmor] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.TorsoArmor] =
                    APPEARANCE_DEFAULTS.TEST_ARMOR_TORSO;
            }
            if (
                data.armsItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.Arms] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.Arms] =
                    APPEARANCE_DEFAULTS.TEST_ARMOR_ARMS;
            }
            if (
                data.glovesItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.Gloves] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.Gloves] =
                    APPEARANCE_DEFAULTS.TEST_ARMOR_GLOVES;
            }
            if (
                data.legPadsItemId === undefined &&
                this.extraSlotIds[AppearanceExtraSlotIndex.LegPads] === 0
            ) {
                this.extraSlotIds[AppearanceExtraSlotIndex.LegPads] =
                    APPEARANCE_DEFAULTS.TEST_ARMOR_LEGPADS;
            }
        }
        this.hasExtraSlots = data.hasExtraSlots ?? this.extraSlotIds.some((value) => value !== 0);
        this.flagBits = normalizeFlagBits(data.flagBits ?? []);
    }

    /**
     * Named view of extra slots.
     */
    get extraSlots(): AppearanceExtraSlotData {
        return {
            helmetItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Helmet],
            hatItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Hat],
            eyesItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Eyes],
            shouldersItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Shoulders],
            armsItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Arms],
            torsoArmorItemId: this.extraSlotIds[AppearanceExtraSlotIndex.TorsoArmor],
            backItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Back],
            legPadsItemId: this.extraSlotIds[AppearanceExtraSlotIndex.LegPads],
            glovesItemId: this.extraSlotIds[AppearanceExtraSlotIndex.Gloves],
        };
    }

    /**
     * Update extra slots and refresh the hasExtraSlots flag.
     */
    set extraSlots(value: AppearanceExtraSlotData) {
        applyExtraSlotOverrides(this.extraSlotIds, value);
        this.hasExtraSlots = this.extraSlotIds.some((slot) => slot !== 0);
    }

    /**
     * Serialize ProfileC appearance block.
     */
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

        // Presence bit gates the 9x12 extra slot block.
        const hasExtra = this.extraSlotIds.some((v) => v !== 0);
        bs.writeBit(hasExtra);
        if (hasExtra) {
            for (let i = 0; i < APPEARANCE_EXTRA_SLOT_COUNT; i++) {
                writeBitsLE(bs, this.extraSlotIds[i] ?? 0, 12);
            }
        }

        for (let i = 0; i < 4; i++) {
            writeBitsLE(bs, this.flagBits[i] ? 1 : 0, 1);
        }
    }

    /**
     * Deserialize ProfileC appearance block.
     */
    static decode(bs: NativeBitStream): Appearance {
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

        // Presence bit gates the 9x12 extra slot block.
        const hasExtraSlots = bs.readBit();
        const extraSlotIds: number[] = [];
        if (hasExtraSlots) {
            for (let i = 0; i < APPEARANCE_EXTRA_SLOT_COUNT; i++) {
                extraSlotIds.push(readBitsLE(bs, 12));
            }
        } else {
            for (let i = 0; i < APPEARANCE_EXTRA_SLOT_COUNT; i++) extraSlotIds.push(0);
        }

        const flagBits = Array(4)
            .fill(false)
            .map(() => readBitsLE(bs, 1) === 1);

        return new Appearance({
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

    /**
     * Create a default male appearance.
     */
    static defaultMale(): Appearance {
        return new Appearance({
            isFemale: 0,
            skinTone: APPEARANCE_DEFAULTS.MALE_SKIN_TONE,
            headTexA: APPEARANCE_DEFAULTS.MALE_HEAD_TEX_A,
            headTexB: APPEARANCE_DEFAULTS.MALE_HEAD_TEX_B,
            torsoItemId: APPEARANCE_DEFAULTS.MALE_TORSO,
            legsItemId: APPEARANCE_DEFAULTS.MALE_LEGS,
            shoesItemId: APPEARANCE_DEFAULTS.MALE_SHOES,
        });
    }

    /**
     * Create a default female appearance.
     */
    static defaultFemale(): Appearance {
        return new Appearance({
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