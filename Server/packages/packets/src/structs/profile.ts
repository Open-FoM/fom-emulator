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
 * ProfileA - Character profile header and inventory slots.
 * Source: sub_100EAAF0 (offset 0x43C)
 */
export class ProfileA extends Struct {
    constructor(
        public headerField0: number = 0,
        public field20: number = 0,
        public field24: number = 0,
        public field28: number = 0,
        public itemSlots12: boolean[] = Array(12).fill(false),
        public itemSlots3: boolean[] = Array(3).fill(false),
        public itemSlots6: boolean[] = Array(6).fill(false),
        public secondHeaderField0: number = 0,
        public secondField20: number = 0,
        public secondField24: number = 0,
        public secondField28: number = 0
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU16(this.headerField0);
        bs.writeCompressedU32(this.field20);
        bs.writeCompressedU32(this.field24);
        bs.writeCompressedU32(this.field28);
        bs.writeCompressedU16(0);
        
        for (let i = 0; i < 12; i++) bs.writeBit(this.itemSlots12[i]);
        for (let i = 0; i < 3; i++) bs.writeBit(this.itemSlots3[i]);
        for (let i = 0; i < 6; i++) bs.writeBit(this.itemSlots6[i]);
        
        bs.writeCompressedU16(this.secondHeaderField0);
        bs.writeCompressedU32(this.secondField20);
        bs.writeCompressedU32(this.secondField24);
        bs.writeCompressedU32(this.secondField28);
        bs.writeCompressedU16(0);
    }

    static decode(bs: NativeBitStream): ProfileA {
        const headerField0 = bs.readCompressedU16();
        const field20 = bs.readCompressedU32();
        const field24 = bs.readCompressedU32();
        const field28 = bs.readCompressedU32();
        bs.readCompressedU16();
        
        const itemSlots12 = Array(12).fill(false).map(() => bs.readBit());
        const itemSlots3 = Array(3).fill(false).map(() => bs.readBit());
        const itemSlots6 = Array(6).fill(false).map(() => bs.readBit());
        
        const secondHeaderField0 = bs.readCompressedU16();
        const secondField20 = bs.readCompressedU32();
        const secondField24 = bs.readCompressedU32();
        const secondField28 = bs.readCompressedU32();
        bs.readCompressedU16();
        
        return new ProfileA(
            headerField0, field20, field24, field28,
            itemSlots12, itemSlots3, itemSlots6,
            secondHeaderField0, secondField20, secondField24, secondField28
        );
    }

    static empty(): ProfileA {
        return new ProfileA();
    }
}

/**
 * ProfileB - 4 u16c values.
 * Source: WorldLogin_WriteProfileBlockB @ 0x100ea9e0 (offset 0x878)
 */
export class ProfileB extends Struct {
    constructor(public values: number[] = [0, 0, 0, 0]) {
        super();
    }

    encode(bs: NativeBitStream): void {
        for (let i = 0; i < 4; i++) bs.writeCompressedU16(this.values[i]);
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
    hasAbilities?: boolean;
    flags?: boolean[];
}

/**
 * ProfileC - Character appearance data.
 * Source: WorldLogin_WriteProfileBlockC @ 0x100c8b80 (offset 0x8B8)
 * 
 * Bit layout:
 * bits[1]: gender, bits[1]: skinColor, bits[5]: headTextureIdx, bits[5]: hairTextureIdx,
 * bits[32]: unknownU32, bits[5]: unknown5, bits[6]: unknown6, bits[4]: unknown7,
 * bits[12]: torsoTypeId, bits[12]: legsTypeId, bits[12]: shoesTypeId,
 * bits[1]: hasAbilities, bits[1] x 4: flags
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
        this.hasAbilities = data.hasAbilities ?? false;
        this.flags = data.flags ?? [false, false, false, false];
    }

    encode(bs: NativeBitStream): void {
        writeBitsLE(bs, this.gender, 1);
        writeBitsLE(bs, this.skinColor, 1);
        writeBitsLE(bs, this.headTextureIdx, 5);
        writeBitsLE(bs, this.hairTextureIdx, 5);
        
        const u32Buf = Buffer.alloc(4);
        u32Buf.writeUInt32LE(this.unknownU32, 0);
        bs.writeBits(u32Buf, 32, true);
        
        writeBitsLE(bs, this.unknown5, 5);
        writeBitsLE(bs, this.unknown6, 6);
        writeBitsLE(bs, this.unknown7, 4);
        
        writeBitsLE(bs, this.torsoTypeId, 12);
        writeBitsLE(bs, this.legsTypeId, 12);
        writeBitsLE(bs, this.shoesTypeId, 12);
        
        bs.writeBit(this.hasAbilities);
        
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
        const flags = Array(4).fill(false).map(() => readBitsLE(bs, 1) === 1);
        
        return new ProfileC({
            gender, skinColor, headTextureIdx, hairTextureIdx,
            unknownU32, unknown5, unknown6, unknown7,
            torsoTypeId, legsTypeId, shoesTypeId,
            hasAbilities, flags
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
 * Source: WorldLogin_WriteProfileBlockD @ 0x100e3440 (offset 0x8EC)
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
        return new ProfileD();
    }
}
