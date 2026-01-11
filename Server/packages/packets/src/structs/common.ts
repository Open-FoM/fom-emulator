/**
 * Common reusable structs. Source: object.lto decompilation
 */

import { NativeBitStream, Struct, writeBitsLE, readBitsLE } from '@openfom/networking';

/**
 * CompactVec3 - Packed 3D position vector with optional reduced precision.
 * Source: WorldLogin_ReadCompactVec3S16Yaw @ 0x6742F070
 *
 * Layout in memory:
 *   +0x00 mode/precision (u32, local-only; default 16)
 *   +0x04 x (s16)
 *   +0x06 y (s16)
 *   +0x08 z (s16)
 *   +0x0C rotation (yaw, 9 bits)
 *
 * On-wire:
 *   - if mode < 16: write abs(x,y,z) with `mode` bits each + 3 sign bits
 *   - else: write u16c for each axis
 *   - then write 9-bit yaw
 */
export class CompactVec3 extends Struct {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0,
        public rotation: number = 0,
        public mode: number = 16
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        if (this.mode < 16) {
            const bits = Math.max(0, this.mode | 0);
            if (bits > 0) {
                const mask = (1 << bits) - 1;
                const absX = Math.abs(this.x) & mask;
                const absY = Math.abs(this.y) & mask;
                const absZ = Math.abs(this.z) & mask;
                writeBitsLE(bs, absX, bits);
                writeBitsLE(bs, absY, bits);
                writeBitsLE(bs, absZ, bits);
            }
            bs.writeBit(this.x < 0);
            bs.writeBit(this.y < 0);
            bs.writeBit(this.z < 0);
        } else {
            bs.writeCompressedU16(this.x & 0xffff);
            bs.writeCompressedU16(this.y & 0xffff);
            bs.writeCompressedU16(this.z & 0xffff);
        }

        writeBitsLE(bs, this.rotation & 0x1ff, 9);
    }

    static decode(bs: NativeBitStream): CompactVec3 {
        const mode = 16;
        let x = 0;
        let y = 0;
        let z = 0;

        if (mode < 16) {
            const bits = Math.max(0, mode | 0);
            const magX = bits > 0 ? readBitsLE(bs, bits) : 0;
            const magY = bits > 0 ? readBitsLE(bs, bits) : 0;
            const magZ = bits > 0 ? readBitsLE(bs, bits) : 0;
            x = bs.readBit() ? -magX : magX;
            y = bs.readBit() ? -magY : magY;
            z = bs.readBit() ? -magZ : magZ;
        } else {
            const rawX = bs.readCompressedU16();
            const rawY = bs.readCompressedU16();
            const rawZ = bs.readCompressedU16();
            x = (rawX << 16) >> 16;
            y = (rawY << 16) >> 16;
            z = (rawZ << 16) >> 16;
        }

        const rotation = readBitsLE(bs, 9);
        return new CompactVec3(x, y, z, rotation, mode);
    }
}

/**
 * EntryG - Single entry in EntryG block.
 * Source: WorldLogin_ReadEntryG @ 0x673672C0
 */
export class EntryG extends Struct {
    constructor(
        public present: boolean = false,
        public field0: number = 0,
        public field1: number = 0,
        public field2: number = 0,
        public field3: number = 0,
        public field4: number = 0,
        public field5: number = 0,
        public field6: number = 0,
        public field7: number = 0,
        public field8: number = 0
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeBit(this.present);
        if (!this.present) return;
        bs.writeCompressedU16(this.field0 & 0xffff);
        bs.writeCompressedU8(this.field1 & 0xff);
        bs.writeCompressedU8(this.field2 & 0xff);
        writeBitsLE(bs, this.field3, 7);
        writeBitsLE(bs, this.field4, 7);
        writeBitsLE(bs, this.field5, 9);
        bs.writeCompressedU8(this.field6 & 0xff);
        bs.writeCompressedU8(this.field7 & 0xff);
        bs.writeCompressedU8(this.field8 & 0xff);
    }

    static decode(bs: NativeBitStream): EntryG {
        const present = bs.readBit();
        if (!present) return new EntryG(false);
        const field0 = bs.readCompressedU16();
        const field1 = bs.readCompressedU8();
        const field2 = bs.readCompressedU8();
        const field3 = readBitsLE(bs, 7);
        const field4 = readBitsLE(bs, 7);
        const field5 = readBitsLE(bs, 9);
        const field6 = bs.readCompressedU8();
        const field7 = bs.readCompressedU8();
        const field8 = bs.readCompressedU8();
        return new EntryG(true, field0, field1, field2, field3, field4, field5, field6, field7, field8);
    }
}

/**
 * EntryGBlock - Block of 10 EntryG entries.
 * Source: WorldLogin_ReadEntryG loop @ 0x673C8FB3
 */
export class EntryGBlock extends Struct {
    constructor(public entries: EntryG[] = Array(10).fill(null).map(() => new EntryG())) {
        super();
    }

    encode(bs: NativeBitStream): void {
        for (let i = 0; i < 10; i++) {
            bs.writeStruct(this.entries[i]);
        }
    }

    static decode(bs: NativeBitStream): EntryGBlock {
        const entries = Array(10).fill(null).map(() => bs.readStruct(EntryG));
        return new EntryGBlock(entries);
    }

    static empty(): EntryGBlock {
        return new EntryGBlock();
    }
}

/**
 * TableIEntry - Single skill ranking entry.
 * Source: WorldLogin_ReadTableI @ 0x6742EC50
 */
export class TableIEntry extends Struct {
    constructor(
        public entryId: number = 0,
        public entryType: number = 0,
        public entryValue: number = 0,
        public flag1: number = 0,
        public flag2: number = 0,
        public flag3: number = 0
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.entryId >>> 0);
        bs.writeCompressedU8(this.entryType & 0xff);
        bs.writeCompressedU32(this.entryValue >>> 0);
        bs.writeCompressedU8(this.flag1 & 0xff);
        bs.writeCompressedU8(this.flag2 & 0xff);
        bs.writeCompressedU8(this.flag3 & 0xff);
    }

    static decode(bs: NativeBitStream): TableIEntry {
        const entryId = bs.readCompressedU32();
        const entryType = bs.readCompressedU8();
        const entryValue = bs.readCompressedU32();
        const flag1 = bs.readCompressedU8();
        const flag2 = bs.readCompressedU8();
        const flag3 = bs.readCompressedU8();
        return new TableIEntry(entryId, entryType, entryValue, flag1, flag2, flag3);
    }
}

/**
 * TableIBlock - Table header + entries.
 * Source: WorldLogin_ReadTableI @ 0x6742EC50
 */
export class TableIBlock extends Struct {
    constructor(
        public field36: number = 0,
        public field37: number = 0,
        public field38: number = 0,
        public field39: number = 0,
        public field32: number = 0,
        public entries: TableIEntry[] = []
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU8(this.field36 & 0xff);
        bs.writeCompressedU8(this.field37 & 0xff);
        bs.writeCompressedU8(this.field38 & 0xff);
        bs.writeCompressedU8(this.field39 & 0xff);
        bs.writeCompressedU32(this.field32 >>> 0);
        bs.writeCompressedU32(this.entries.length >>> 0);
        for (const entry of this.entries) {
            entry.encode(bs);
        }
    }

    static decode(bs: NativeBitStream): TableIBlock {
        const field36 = bs.readCompressedU8();
        const field37 = bs.readCompressedU8();
        const field38 = bs.readCompressedU8();
        const field39 = bs.readCompressedU8();
        const field32 = bs.readCompressedU32();
        const count = bs.readCompressedU32();
        const entries: TableIEntry[] = [];
        for (let i = 0; i < count; i++) {
            entries.push(TableIEntry.decode(bs));
        }
        return new TableIBlock(field36, field37, field38, field39, field32, entries);
    }

    static empty(): TableIBlock {
        return new TableIBlock();
    }
}

/**
 * ListKEntry - Single entry in ListK block.
 * Source: WorldLogin_ReadListK @ 0x67439090
 */
export class ListKEntry extends Struct {
    constructor(public entryId: number = 0, public entryValue: number = 0, public entryFlag: boolean = false) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU16(this.entryId & 0xffff);
        bs.writeCompressedU8(this.entryValue & 0xff);
        bs.writeBit(this.entryFlag);
    }

    static decode(bs: NativeBitStream): ListKEntry {
        const entryId = bs.readCompressedU16();
        const entryValue = bs.readCompressedU8();
        const entryFlag = bs.readBit();
        return new ListKEntry(entryId, entryValue, entryFlag);
    }
}

/**
 * ListKBlock - Header + entries.
 * Source: WorldLogin_ReadListK @ 0x67439090
 */
export class ListKBlock extends Struct {
    constructor(
        public headerA: number = 0,
        public headerB: number = 0,
        public entries: ListKEntry[] = []
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.headerA >>> 0);
        bs.writeCompressedU32(this.headerB >>> 0);
        bs.writeCompressedU32(this.entries.length >>> 0);
        for (const entry of this.entries) {
            entry.encode(bs);
        }
    }

    static decode(bs: NativeBitStream): ListKBlock {
        const headerA = bs.readCompressedU32();
        const headerB = bs.readCompressedU32();
        const count = bs.readCompressedU32();
        const entries: ListKEntry[] = [];
        for (let i = 0; i < count; i++) {
            entries.push(ListKEntry.decode(bs));
        }
        return new ListKBlock(headerA, headerB, entries);
    }

    static empty(): ListKBlock {
        return new ListKBlock();
    }
}
