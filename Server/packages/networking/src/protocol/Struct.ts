import { NativeBitStream } from '../bindings/raknet';

export abstract class Struct {
    abstract encode(bs: NativeBitStream): void;

    static decode(_bs: NativeBitStream): Struct {
        throw new Error('decode() must be implemented by subclass');
    }
}

export function writeBitsLE(bs: NativeBitStream, value: number, bits: number): void {
    const bytes = Math.ceil(bits / 8);
    const buf = Buffer.alloc(bytes);
    
    if (bytes === 1) {
        buf.writeUInt8(value & ((1 << bits) - 1), 0);
    } else if (bytes === 2) {
        buf.writeUInt16LE(value & ((1 << bits) - 1), 0);
    } else if (bytes <= 4) {
        buf.writeUInt32LE(value >>> 0, 0);
    }
    
    bs.writeBits(buf, bits, true);
}

export function readBitsLE(bs: NativeBitStream, bits: number): number {
    const buf = bs.readBits(bits, true);
    
    if (buf.length === 1) {
        return buf.readUInt8(0) & ((1 << bits) - 1);
    } else if (buf.length === 2) {
        return buf.readUInt16LE(0) & ((1 << bits) - 1);
    } else {
        return buf.readUInt32LE(0) & ((1 << bits) - 1);
    }
}
