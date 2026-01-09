/**
 * Common reusable structs. Source: object.lto decompilation
 */

import { NativeBitStream, Struct, writeBitsLE, readBitsLE } from '@openfom/networking';

/**
 * CompactVec3 - Packed 3D position vector.
 * Source: sub_100DF040 -> sub_100E1F10 + 9 bits rotation
 */
export class CompactVec3 extends Struct {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0,
        public rotation: number = 0
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU16(this.x);
        bs.writeCompressedU16(this.y);
        bs.writeCompressedU16(this.z);
        writeBitsLE(bs, this.rotation, 9);
    }

    static decode(bs: NativeBitStream): CompactVec3 {
        const x = bs.readCompressedU16();
        const y = bs.readCompressedU16();
        const z = bs.readCompressedU16();
        const rotation = readBitsLE(bs, 9);
        return new CompactVec3(x, y, z, rotation);
    }
}

/**
 * EntryG - Single entry in EntryGBlock.
 * Source: WorldLogin_WriteEntryG @ 0x10017390
 */
export class EntryG extends Struct {
    constructor(public valid: boolean = false) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeBit(this.valid);
    }

    static decode(bs: NativeBitStream): EntryG {
        return new EntryG(bs.readBit());
    }
}

/**
 * EntryGBlock - Block of 10 EntryG entries.
 * Source: WorldLogin_WriteEntryGBlock @ 0x10017390
 */
export class EntryGBlock extends Struct {
    constructor(
        public header: number = 0,
        public entries: EntryG[] = Array(10).fill(null).map(() => new EntryG())
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.header);
        for (let i = 0; i < 10; i++) {
            bs.writeStruct(this.entries[i]);
        }
    }

    static decode(bs: NativeBitStream): EntryGBlock {
        const header = bs.readCompressedU32();
        const entries = Array(10).fill(null).map(() => bs.readStruct(EntryG));
        return new EntryGBlock(header, entries);
    }

    static empty(): EntryGBlock {
        return new EntryGBlock();
    }
}

/**
 * TableIBlock - Table with header and entries.
 * Source: sub_100DDE70 (offset 0xC9C)
 */
export class TableIBlock extends Struct {
    constructor(
        public field36: number = 0,
        public field37: number = 0,
        public field38: number = 0,
        public field39: number = 0,
        public field32: number = 0,
        public entries: Buffer[] = []
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU8(this.field36);
        bs.writeCompressedU8(this.field37);
        bs.writeCompressedU8(this.field38);
        bs.writeCompressedU8(this.field39);
        bs.writeCompressedU32(this.field32);
        bs.writeCompressedU32(this.entries.length);
    }

    static decode(bs: NativeBitStream): TableIBlock {
        const field36 = bs.readCompressedU8();
        const field37 = bs.readCompressedU8();
        const field38 = bs.readCompressedU8();
        const field39 = bs.readCompressedU8();
        const field32 = bs.readCompressedU32();
        bs.readCompressedU32();
        return new TableIBlock(field36, field37, field38, field39, field32, []);
    }

    static empty(): TableIBlock {
        return new TableIBlock();
    }
}

/**
 * FinalBlock - Final nested block structure.
 * Source: sub_100E63C0 (offset 0x4A94)
 */
export class FinalBlock extends Struct {
    constructor(
        public header: number = 0,
        public nestedValue: number = 0,
        public entries: Buffer[] = []
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.header);
        bs.writeCompressedU32(this.nestedValue);
        bs.writeCompressedU32(this.entries.length);
    }

    static decode(bs: NativeBitStream): FinalBlock {
        const header = bs.readCompressedU32();
        const nestedValue = bs.readCompressedU32();
        bs.readCompressedU32();
        return new FinalBlock(header, nestedValue, []);
    }

    static empty(): FinalBlock {
        return new FinalBlock();
    }
}
