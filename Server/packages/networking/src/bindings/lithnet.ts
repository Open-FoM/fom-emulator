import { dlopen, FFIType, ptr, suffix, CString } from 'bun:ffi';
import { join } from 'path';
import { existsSync } from 'fs';

function getLibraryPath(): string {
    const libName = `lithnet_ffi.${suffix}`;
    const searchPaths = [
        join(import.meta.dir, '..', '..', 'native', 'lithnet', libName),
        join(process.cwd(), 'packages', 'networking', 'native', 'lithnet', libName),
    ];

    for (const p of searchPaths) {
        if (existsSync(p)) {
            return p;
        }
    }

    return join(import.meta.dir, '..', '..', 'native', 'lithnet', libName);
}

const libPath = getLibraryPath();
const shouldLogLoad = (() => {
    const raw = process.env.FOM_LITHNET_LOG || '';
    return raw === '1' || raw.toLowerCase() === 'true';
})();
if (shouldLogLoad) {
    console.log(`[LithNet FFI] Loading native library from: ${libPath}`);
}

const lib = dlopen(libPath, {
    lith_packet_write_create: {
        returns: FFIType.ptr,
        args: [],
    },
    lith_packet_write_destroy: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    lith_packet_write_reset: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    lith_packet_write_size: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_packet_write_size_bytes: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_packet_write_empty: {
        returns: FFIType.bool,
        args: [FFIType.ptr],
    },
    lith_packet_write_get_data: {
        returns: FFIType.ptr,
        args: [FFIType.ptr, FFIType.ptr],
    },
    lith_packet_write_copy_data: {
        returns: FFIType.u32,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },

    lith_write_bits: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32, FFIType.u32],
    },
    lith_write_bits64: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u64, FFIType.u32],
    },
    lith_write_data: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },
    lith_write_bool: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.bool],
    },
    lith_write_uint8: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u8],
    },
    lith_write_uint16: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u16],
    },
    lith_write_uint32: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_write_uint64: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u64],
    },
    lith_write_int8: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.i8],
    },
    lith_write_int16: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.i16],
    },
    lith_write_int32: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.i32],
    },
    lith_write_int64: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.i64],
    },
    lith_write_float: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.f32],
    },
    lith_write_double: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.f64],
    },
    lith_write_string: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr],
    },

    lith_packet_read_create: {
        returns: FFIType.ptr,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_packet_read_create_bytes: {
        returns: FFIType.ptr,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_packet_read_from_write: {
        returns: FFIType.ptr,
        args: [FFIType.ptr],
    },
    lith_packet_read_destroy: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    lith_packet_read_size: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_packet_read_tell: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_packet_read_tell_end: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_packet_read_eop: {
        returns: FFIType.bool,
        args: [FFIType.ptr],
    },
    lith_packet_read_seek: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.i32],
    },
    lith_packet_read_seek_to: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32],
    },

    lith_read_bits: {
        returns: FFIType.u32,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_read_bits64: {
        returns: FFIType.u64,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_read_data: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },
    lith_read_bool: {
        returns: FFIType.bool,
        args: [FFIType.ptr],
    },
    lith_read_uint8: {
        returns: FFIType.u8,
        args: [FFIType.ptr],
    },
    lith_read_uint16: {
        returns: FFIType.u16,
        args: [FFIType.ptr],
    },
    lith_read_uint32: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_read_uint64: {
        returns: FFIType.u64,
        args: [FFIType.ptr],
    },
    lith_read_int8: {
        returns: FFIType.i8,
        args: [FFIType.ptr],
    },
    lith_read_int16: {
        returns: FFIType.i16,
        args: [FFIType.ptr],
    },
    lith_read_int32: {
        returns: FFIType.i32,
        args: [FFIType.ptr],
    },
    lith_read_int64: {
        returns: FFIType.i64,
        args: [FFIType.ptr],
    },
    lith_read_float: {
        returns: FFIType.f32,
        args: [FFIType.ptr],
    },
    lith_read_double: {
        returns: FFIType.f64,
        args: [FFIType.ptr],
    },
    lith_read_string: {
        returns: FFIType.u32,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },

    lith_peek_bits: {
        returns: FFIType.u32,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_peek_bits64: {
        returns: FFIType.u64,
        args: [FFIType.ptr, FFIType.u32],
    },
    lith_peek_uint8: {
        returns: FFIType.u8,
        args: [FFIType.ptr],
    },
    lith_peek_uint16: {
        returns: FFIType.u16,
        args: [FFIType.ptr],
    },
    lith_peek_uint32: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },

    lith_packet_calc_checksum: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    lith_get_version: {
        returns: FFIType.ptr,
        args: [],
    },
});

export class LithPacketWrite implements Disposable {
    private handle: ReturnType<typeof lib.symbols.lith_packet_write_create>;
    private destroyed = false;

    constructor() {
        this.handle = lib.symbols.lith_packet_write_create();
        if (!this.handle) {
            throw new Error('Failed to create LithPacketWrite instance');
        }
    }

    [Symbol.dispose](): void {
        this.destroy();
    }

    reset(): void {
        this.ensureAlive();
        lib.symbols.lith_packet_write_reset(this.handle);
    }

    size(): number {
        this.ensureAlive();
        return lib.symbols.lith_packet_write_size(this.handle);
    }

    sizeBytes(): number {
        this.ensureAlive();
        return lib.symbols.lith_packet_write_size_bytes(this.handle);
    }

    empty(): boolean {
        this.ensureAlive();
        return lib.symbols.lith_packet_write_empty(this.handle);
    }

    getData(): Buffer {
        this.ensureAlive();
        const sizeBytes = this.sizeBytes();
        const buffer = Buffer.alloc(sizeBytes);
        lib.symbols.lith_packet_write_copy_data(this.handle, ptr(buffer), sizeBytes);
        return buffer;
    }

    writeBits(value: number, numBits: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_bits(this.handle, value >>> 0, numBits);
    }

    writeBits64(value: bigint, numBits: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_bits64(this.handle, value, numBits);
    }

    writeData(data: Buffer | Uint8Array, numBits: number): void {
        this.ensureAlive();
        const buf = data instanceof Buffer ? data : Buffer.from(data);
        lib.symbols.lith_write_data(this.handle, ptr(buf), numBits);
    }

    writeBool(value: boolean): void {
        this.ensureAlive();
        lib.symbols.lith_write_bool(this.handle, value);
    }

    writeUint8(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_uint8(this.handle, value & 0xff);
    }

    writeUint16(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_uint16(this.handle, value & 0xffff);
    }

    writeUint32(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_uint32(this.handle, value >>> 0);
    }

    writeUint64(value: bigint): void {
        this.ensureAlive();
        lib.symbols.lith_write_uint64(this.handle, value);
    }

    writeInt8(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_int8(this.handle, value);
    }

    writeInt16(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_int16(this.handle, value);
    }

    writeInt32(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_int32(this.handle, value);
    }

    writeInt64(value: bigint): void {
        this.ensureAlive();
        lib.symbols.lith_write_int64(this.handle, value);
    }

    writeFloat(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_float(this.handle, value);
    }

    writeDouble(value: number): void {
        this.ensureAlive();
        lib.symbols.lith_write_double(this.handle, value);
    }

    writeString(value: string): void {
        this.ensureAlive();
        const buf = Buffer.from(value + '\0');
        lib.symbols.lith_write_string(this.handle, ptr(buf));
    }

    getHandle(): ReturnType<typeof lib.symbols.lith_packet_write_create> {
        this.ensureAlive();
        return this.handle;
    }

    destroy(): void {
        if (!this.destroyed && this.handle) {
            lib.symbols.lith_packet_write_destroy(this.handle);
            this.destroyed = true;
        }
    }

    private ensureAlive(): void {
        if (this.destroyed) {
            throw new Error('LithPacketWrite has been destroyed');
        }
    }
}

export class LithPacketRead implements Disposable {
    private handle: ReturnType<typeof lib.symbols.lith_packet_read_create>;
    private destroyed = false;

    constructor(data: Buffer | Uint8Array, sizeInBits?: number) {
        const buf = data instanceof Buffer ? data : Buffer.from(data);
        if (sizeInBits !== undefined) {
            this.handle = lib.symbols.lith_packet_read_create(ptr(buf), sizeInBits);
        } else {
            this.handle = lib.symbols.lith_packet_read_create_bytes(ptr(buf), buf.length);
        }
        if (!this.handle) {
            throw new Error('Failed to create LithPacketRead instance');
        }
    }

    [Symbol.dispose](): void {
        this.destroy();
    }

    static fromWritePacket(writePacket: LithPacketWrite): LithPacketRead {
        const reader = Object.create(LithPacketRead.prototype) as LithPacketRead;
        reader.handle = lib.symbols.lith_packet_read_from_write(writePacket.getHandle());
        reader.destroyed = false;
        if (!reader.handle) {
            throw new Error('Failed to create LithPacketRead from write packet');
        }
        return reader;
    }

    size(): number {
        this.ensureAlive();
        return lib.symbols.lith_packet_read_size(this.handle);
    }

    tell(): number {
        this.ensureAlive();
        return lib.symbols.lith_packet_read_tell(this.handle);
    }

    tellEnd(): number {
        this.ensureAlive();
        return lib.symbols.lith_packet_read_tell_end(this.handle);
    }

    eop(): boolean {
        this.ensureAlive();
        return lib.symbols.lith_packet_read_eop(this.handle);
    }

    seek(offsetBits: number): void {
        this.ensureAlive();
        lib.symbols.lith_packet_read_seek(this.handle, offsetBits);
    }

    seekTo(positionBits: number): void {
        this.ensureAlive();
        lib.symbols.lith_packet_read_seek_to(this.handle, positionBits);
    }

    readBits(numBits: number): number {
        this.ensureAlive();
        return lib.symbols.lith_read_bits(this.handle, numBits);
    }

    readBits64(numBits: number): bigint {
        this.ensureAlive();
        return lib.symbols.lith_read_bits64(this.handle, numBits);
    }

    readData(numBits: number): Buffer {
        this.ensureAlive();
        const numBytes = Math.ceil(numBits / 8);
        const buf = Buffer.alloc(numBytes);
        lib.symbols.lith_read_data(this.handle, ptr(buf), numBits);
        return buf;
    }

    readBool(): boolean {
        this.ensureAlive();
        return lib.symbols.lith_read_bool(this.handle);
    }

    readUint8(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_uint8(this.handle);
    }

    readUint16(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_uint16(this.handle);
    }

    readUint32(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_uint32(this.handle);
    }

    readUint64(): bigint {
        this.ensureAlive();
        return lib.symbols.lith_read_uint64(this.handle);
    }

    readInt8(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_int8(this.handle);
    }

    readInt16(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_int16(this.handle);
    }

    readInt32(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_int32(this.handle);
    }

    readInt64(): bigint {
        this.ensureAlive();
        return lib.symbols.lith_read_int64(this.handle);
    }

    readFloat(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_float(this.handle);
    }

    readDouble(): number {
        this.ensureAlive();
        return lib.symbols.lith_read_double(this.handle);
    }

    readString(maxLen: number = 256): string {
        this.ensureAlive();
        const buf = Buffer.alloc(maxLen);
        const len = lib.symbols.lith_read_string(this.handle, ptr(buf), maxLen);
        return buf.subarray(0, len).toString('utf8');
    }

    peekBits(numBits: number): number {
        this.ensureAlive();
        return lib.symbols.lith_peek_bits(this.handle, numBits);
    }

    peekBits64(numBits: number): bigint {
        this.ensureAlive();
        return lib.symbols.lith_peek_bits64(this.handle, numBits);
    }

    peekUint8(): number {
        this.ensureAlive();
        return lib.symbols.lith_peek_uint8(this.handle);
    }

    peekUint16(): number {
        this.ensureAlive();
        return lib.symbols.lith_peek_uint16(this.handle);
    }

    peekUint32(): number {
        this.ensureAlive();
        return lib.symbols.lith_peek_uint32(this.handle);
    }

    calcChecksum(): number {
        this.ensureAlive();
        return lib.symbols.lith_packet_calc_checksum(this.handle);
    }

    destroy(): void {
        if (!this.destroyed && this.handle) {
            lib.symbols.lith_packet_read_destroy(this.handle);
            this.destroyed = true;
        }
    }

    private ensureAlive(): void {
        if (this.destroyed) {
            throw new Error('LithPacketRead has been destroyed');
        }
    }
}

export function getVersion(): string {
    const versionPtr = lib.symbols.lith_get_version();
    if (!versionPtr) return 'unknown';
    return new CString(versionPtr).toString();
}
