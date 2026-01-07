/**
 * Huffman Codec for FoM string compression
 *
 * Handles bit-level operations for RakNet StringCompressor compatibility.
 * Uses runtime table from huffman_table_runtime.json (extracted from FoM client).
 *
 * Two formats supported:
 * 1. RakNet compressed format (writeCompressedString/readCompressedString) - compressed u32 bit count prefix
 * 2. Raw U32BE format (encodeHuffmanStringRawLenBE/decodeHuffmanStringRawLenBE) - raw 4-byte BE bit count
 */

import * as fs from 'fs';
import * as path from 'path';
import { debug as logDebug, warn as logWarn } from '@openfom/utils';

interface HuffmanCode {
    bits: number[];
    bitLength: number;
}

interface HuffmanNode {
    symbol: number | null;
    weight: number;
    left?: HuffmanNode;
    right?: HuffmanNode;
}

// Cache (initialized on first use)
let cachedCodes: HuffmanCode[] | null = null;
let cachedDecodeTree: HuffmanNode | null = null;

function resolveTablePath(): string | null {
    // Prefer explicit env override; fall back to workspace paths.
    const candidates = [
        process.env.FOM_HUFFMAN_TABLE,
        path.resolve(process.cwd(), 'huffman_table_runtime.json'),
        // Monorepo: apps/master or apps/world
        path.resolve(process.cwd(), 'apps', 'master', 'huffman_table_runtime.json'),
        path.resolve(process.cwd(), 'apps', 'world', 'huffman_table_runtime.json'),
        // Legacy paths
        path.resolve(process.cwd(), 'Server', 'Master_TS', 'huffman_table_runtime.json'),
        path.resolve(__dirname, '..', '..', 'huffman_table_runtime.json'),
    ].filter(Boolean) as string[];

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function loadRuntimeCodes(): HuffmanCode[] | null {
    const tablePath = resolveTablePath();
    if (!tablePath) return null;

    try {
        const raw = fs.readFileSync(tablePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length !== 256) return null;

        const codes: HuffmanCode[] = new Array(256);
        for (const entry of parsed) {
            if (!entry || typeof entry.sym !== 'number') return null;
            const sym = entry.sym & 0xff;
            const bitlen = entry.bitlen ?? entry.bitLength ?? 0;
            const bitstr = typeof entry.bits === 'string' ? entry.bits : '';
            const bits: number[] = [];
            for (let i = 0; i < bitstr.length; i++) {
                bits.push(bitstr[i] === '1' ? 1 : 0);
            }
            codes[sym] = { bits: bits.slice(0, bitlen), bitLength: bitlen };
        }
        logDebug(`[HuffmanCodec] Loaded table from ${tablePath}`);
        return codes;
    } catch {
        return null;
    }
}

function getCodes(): HuffmanCode[] {
    // Lazily load and cache Huffman codes.
    if (!cachedCodes) {
        cachedCodes = loadRuntimeCodes();
        if (!cachedCodes) {
            throw new Error('Failed to load Huffman table - ensure huffman_table_runtime.json exists');
        }
    }
    return cachedCodes;
}

function buildDecodeTree(): HuffmanNode {
    // Build a binary decode tree from the canonical code table.
    const root: HuffmanNode = { symbol: null, weight: 0 };
    const codes = getCodes();

    for (let sym = 0; sym < codes.length; sym++) {
        const code = codes[sym];
        if (!code || code.bitLength <= 0) continue;

        let node = root;
        for (let i = 0; i < code.bitLength; i++) {
            const bit = code.bits[i] ? 1 : 0;
            if (bit === 0) {
                if (!node.left) node.left = { symbol: null, weight: 0 };
                node = node.left;
            } else {
                if (!node.right) node.right = { symbol: null, weight: 0 };
                node = node.right;
            }
        }
        node.symbol = sym;
    }
    return root;
}

function getDecodeTree(): HuffmanNode {
    // Build once and reuse for decoding.
    if (!cachedDecodeTree) {
        cachedDecodeTree = buildDecodeTree();
    }
    return cachedDecodeTree;
}

// =============================================================================
// MsbBitStream - MSB-first BitStream compatible with RakNet StringCompressor
// =============================================================================

/**
 * MSB-first BitStream for RakNet packet serialization
 */
export class MsbBitStream {
    readonly bitOrder: 'msb' = 'msb';
    private buffer: Buffer;
    private byteCount: number;

    private readBytePosition: number = 0;
    private readBitPosition: number = 7;

    private writeBytePosition: number = 0;
    private writeBitPosition: number = 7;

    private readonly mask: number[] = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];

    constructor(data?: Buffer | Uint8Array) {
        this.buffer = data ? Buffer.from(data) : Buffer.alloc(0);
        this.byteCount = this.buffer.length;
    }

    get data(): Buffer {
        return this.buffer;
    }

    length(): number {
        return this.byteCount;
    }

    bits(): number {
        return this.writeBytePosition * 8 + (8 - this.writeBitPosition) - 1;
    }

    resetRead(): void {
        this.readBytePosition = 0;
        this.readBitPosition = 7;
    }

    readOffsetBits(): number {
        return this.readBytePosition * 8 + (7 - this.readBitPosition);
    }

    remainingReadBits(): number {
        const remaining = this.byteCount * 8 - this.readOffsetBits();
        return remaining < 0 ? 0 : remaining;
    }

    allRead(): boolean {
        return this.readBytePosition * 8 + this.readBitPosition >= this.byteCount * 8 - 1;
    }

    readBit(): number {
        // Read MSB-first bit from the current byte.
        if (this.readBytePosition >= this.byteCount) {
            this.writeBytePosition = this.readBytePosition;
            this.writeByte(0);
        }

        const byte = this.buffer.readUInt8(this.readBytePosition);
        const bit = (byte & this.mask[this.readBitPosition]) >> this.readBitPosition;
        if (--this.readBitPosition === -1) {
            this.readBitPosition = 7;
            this.readBytePosition++;
        }
        return bit;
    }

    writeBit(b: boolean): void {
        // Write MSB-first bit into the current byte.
        if (this.writeBitPosition === 7) {
            const old = this.buffer;
            this.buffer = Buffer.alloc(this.writeBytePosition + 1);
            this.byteCount = this.writeBytePosition + 1;
            old.copy(this.buffer);
            this.buffer.writeUInt8(0, this.writeBytePosition);
        }

        let byte = this.buffer.readUInt8(this.writeBytePosition);
        byte |= Number(b) << this.writeBitPosition;
        this.buffer.writeUInt8(byte, this.writeBytePosition);

        this.writeBitPosition--;
        if (this.writeBitPosition < 0) {
            this.writeBitPosition = 7;
            this.writeBytePosition++;
        }
    }

    readBits(n: number): number {
        let val = 0;
        while (n--) {
            const bit = this.readBit();
            val = (val << 1) | bit;
        }
        return val;
    }

    writeBits(n: number, b: number): void {
        for (let i = b; i > 0; i--) {
            const temp = (n >> (i - 1)) & 0x01;
            this.writeBit(temp === 1);
        }
    }

    readByte(): number {
        return this.readBits(8);
    }

    writeByte(n: number): void {
        for (let i = 0; i < 8; i++) {
            const t = (n & 0x80) >>> 7;
            this.writeBit(t === 1);
            n = (n << 1) & 0xff;
        }
    }

    readShort(): number {
        return this.readByte() + (this.readByte() << 8);
    }

    writeShort(n: number): void {
        this.writeByte(n & 0xff);
        this.writeByte((n & 0xff00) >>> 8);
    }

    readLong(): number {
        return (
            this.readByte() +
            (this.readByte() << 8) +
            (this.readByte() << 16) +
            this.readByte() * 16777216
        );
    }

    writeLong(n: number): void {
        this.writeShort(n & 0xffff);
        this.writeShort((n & 0xffff0000) >>> 16);
    }

    readLongLong(): bigint {
        return BigInt(
            this.readByte() +
            (this.readByte() << 8) +
            (this.readByte() << 16) +
            this.readByte() * 16777216 +
            this.readByte() * 4294967296 +
            this.readByte() * 1099511627776 +
            this.readByte() * 281474976710656 +
            this.readByte() * 72057594037927936,
        );
    }

    writeLongLong(n: bigint): void {
        this.writeLong(Number(n & 0xffffffffn));
        this.writeLong(Number((n & 0xffffffff00000000n) >> 32n));
    }

    /**
     * Read RakNet compressed data
     * @param size Number of bytes in the uncompressed value
     */
    readCompressed(size: number): MsbBitStream {
        // RakNet compressed int format (MSB-first).
        let currentByte = size - 1;
        const ret = new MsbBitStream();

        while (currentByte > 0) {
            const b = this.readBit();
            if (b) {
                currentByte--;
            } else {
                for (let i = 0; i < currentByte + 1; i++) {
                    ret.writeByte(this.readByte());
                }
                for (let i = 0; i < size - currentByte - 1; i++) {
                    ret.writeByte(0);
                }
                return ret;
            }
        }

        const b = this.readBit();
        if (b) {
            ret.writeByte(this.readBits(4));
        } else {
            ret.writeByte(this.readByte());
        }
        for (let i = 0; i < size - 1; i++) {
            ret.writeByte(0);
        }
        return ret;
    }

    /**
     * Write RakNet compressed data
     * @param data The number to write
     * @param size Number of bytes to write it in
     */
    writeCompressed(data: number, size: number): void {
        // RakNet compressed int format (MSB-first).
        let currentByte = size - 1;
        const mask = [
            0xff, 0xff00, 0xff0000, 0xff000000, 0xff00000000, 0xff0000000000, 0xff000000000000,
            0xff00000000000000,
        ];

        while (currentByte > 0) {
            const zero = (data & mask[currentByte]) === 0;
            this.writeBit(zero);
            if (!zero) {
                for (let i = 0; i < currentByte + 1; i++) {
                    this.writeByte((data & mask[i]) >> (i * 8));
                }
                return;
            }
            currentByte--;
        }

        const zero = (data & 0xf0) === 0;
        this.writeBit(zero);
        if (zero) {
            this.writeBits(data & 0x0f, 4);
        } else {
            this.writeByte(data & 0xff);
        }
    }

    /**
     * Copy bits from another BitStream
     */
    writeBitStream(bs: MsbBitStream): void {
        bs.resetRead();
        const bitCount = bs.bits();
        for (let i = 0; i < bitCount; i++) {
            this.writeBit(bs.readBit() === 1);
        }
    }

    alignRead(): void {
        if (this.readBitPosition !== 7) {
            this.readBitPosition = 7;
            this.readBytePosition++;
        }
    }

    alignWrite(): void {
        if (this.writeBitPosition !== 7) {
            this.writeBitPosition = 7;
            this.writeBytePosition++;
        }
    }

    toHexString(): string {
        const hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        let output = '';
        for (let i = 0; i < this.byteCount; i++) {
            const byte = this.buffer.readUInt8(i);
            output += hex[(byte & 0xf0) >> 4] + hex[byte & 0x0f] + ' ';
        }
        return output;
    }
}

// =============================================================================
// Huffman String Encoding/Decoding
// =============================================================================

/**
 * Decode Huffman bits directly from a stream
 * @param stream The MsbBitStream to read from
 * @param bitCount Number of bits to read
 * @param maxLen Maximum output string length
 */
export function decodeHuffmanBitsFromStream(
    stream: MsbBitStream,
    bitCount: number,
    maxLen: number = 2048,
): string {
    // Decode Huffman symbols directly from a bit stream.
    if (bitCount <= 0) return '';

    const root = getDecodeTree();
    let node: HuffmanNode | undefined = root;
    const out: number[] = [];

    for (let i = 0; i < bitCount; i++) {
        const bit = stream.readBit();
        node = bit ? node?.right : node?.left;
        if (!node) {
            throw new Error('Huffman decode failed: invalid prefix');
        }
        if (node.symbol !== null && node.symbol !== undefined) {
            if (maxLen <= 0 || out.length < maxLen) {
                out.push(node.symbol & 0xff);
            }
            node = root;
        }
    }

    return Buffer.from(out).toString('latin1');
}

// =============================================================================
// LithTech BitStream byte-array compression (used by FoM client)
// =============================================================================

export function readByteArrayCompressed(
    stream: MsbBitStream,
    bitLength: number,
    unsigned: boolean = true,
): Buffer {
    // FoM/LithTech "byte-array compressed" format.
    const byteCount = bitLength >> 3;
    if (byteCount <= 0) return Buffer.alloc(0);

    const out = Buffer.alloc(byteCount, 0);
    const defaultByte = unsigned ? 0x00 : 0xff;
    let idx = byteCount - 1;

    while (idx > 0) {
        const flag = stream.readBit();
        if (flag === 1) {
            out[idx] = defaultByte;
            idx -= 1;
            continue;
        }

        for (let i = 0; i <= idx; i++) {
            out[i] = stream.readByte() & 0xff;
        }
        return out;
    }

    const flag = stream.readBit();
    if (unsigned) {
        if (flag === 1) {
            out[0] = stream.readBits(4) & 0x0f;
        } else {
            out[0] = stream.readByte() & 0xff;
        }
    } else {
        if (flag === 1) {
            out[0] = 0xf0 | (stream.readBits(4) & 0x0f);
        } else {
            out[0] = stream.readByte() & 0xff;
        }
    }

    return out;
}

export function readCompressedUIntBE(stream: MsbBitStream, byteCount: number): number {
    const buf = readByteArrayCompressed(stream, byteCount * 8, true);
    let value = 0;
    for (let i = 0; i < buf.length; i++) {
        value = (value << 8) | (buf[i] & 0xff);
    }
    return value >>> 0;
}

export function writeByteArrayCompressed(
    stream: MsbBitStream,
    data: Uint8Array,
    bitLength: number,
    unsigned: boolean = true,
): void {
    // FoM/LithTech "byte-array compressed" format.
    const byteCount = bitLength >> 3;
    if (byteCount <= 0) return;

    const defaultByte = unsigned ? 0x00 : 0xff;
    let idx = byteCount - 1;

    while (idx > 0) {
        const b = data[idx] & 0xff;
        if (b === defaultByte) {
            stream.writeBit(true);
            idx -= 1;
            continue;
        }

        stream.writeBit(false);
        for (let i = 0; i <= idx; i++) {
            stream.writeByte(data[i] & 0xff);
        }
        return;
    }

    const b0 = data[0] & 0xff;
    if (unsigned) {
        if ((b0 & 0xf0) === 0) {
            stream.writeBit(true);
            stream.writeBits(b0 & 0x0f, 4);
        } else {
            stream.writeBit(false);
            stream.writeByte(b0);
        }
        return;
    }

    if ((b0 & 0xf0) === 0xf0) {
        stream.writeBit(true);
        stream.writeBits(b0 & 0x0f, 4);
    } else {
        stream.writeBit(false);
        stream.writeByte(b0);
    }
}

export function writeCompressedUIntBE(stream: MsbBitStream, value: number, byteCount: number): void {
    const buf = Buffer.alloc(byteCount, 0);
    let v = value >>> 0;
    for (let i = byteCount - 1; i >= 0; i--) {
        buf[i] = v & 0xff;
        v >>>= 8;
    }
    writeByteArrayCompressed(stream, buf, byteCount * 8, true);
}

function writeCode(stream: MsbBitStream, code: HuffmanCode, bitLimit?: number): void {
    const limit = bitLimit ?? code.bitLength;
    for (let i = 0; i < limit; i++) {
        stream.writeBit(code.bits[i] === 1);
    }
}

function encodeStringToBitStream(value: string, maxLen: number): MsbBitStream {
    const codes = getCodes();
    const temp = new MsbBitStream();

    const trimmed = sanitizeString(value, maxLen);

    for (let i = 0; i < trimmed.length; i++) {
        const codePoint = trimmed.charCodeAt(i) & 0xff;
        const code = codes[codePoint];
        writeCode(temp, code);
    }

    // Pad to byte boundary using partial code
    let bitCount = temp.bits();
    const pad = bitCount % 8;
    if (pad !== 0) {
        const padBits = 8 - pad;
        for (let i = 0; i < 256; i++) {
            const code = codes[i];
            if (code.bitLength > padBits) {
                writeCode(temp, code, padBits);
                break;
            }
        }
    }

    return temp;
}

function decodeHuffmanBits(stream: MsbBitStream, bitCount: number, maxLen: number): string {
    if (bitCount <= 0) return '';

    const root = getDecodeTree();
    let node: HuffmanNode | undefined = root;
    const out: number[] = [];

    for (let i = 0; i < bitCount; i++) {
        const bit = stream.readBit();
        node = bit ? node?.right : node?.left;
        if (!node) {
            throw new Error('Huffman decode failed: invalid prefix');
        }
        if (node.symbol !== null && node.symbol !== undefined) {
            if (maxLen <= 0 || out.length < maxLen) {
                out.push(node.symbol & 0xff);
            }
            node = root;
        }
    }

    return Buffer.from(out).toString('latin1');
}

// =============================================================================
// RakNet Compressed String Format (V1 compatible)
// =============================================================================

/**
 * Write a Huffman-compressed string with RakNet compressed u32 bit count prefix
 * This is the format used by RakNet's StringCompressor::EncodeString
 */
export function writeCompressedString(
    stream: MsbBitStream,
    value: string,
    maxLen: number = 2048,
): void {
    // RakNet StringCompressor format (compressed u32 bit count prefix).
    const temp = encodeStringToBitStream(value ?? '', maxLen);
    const bitCount = temp.bits();
    stream.writeCompressed(bitCount, 4);
    if (bitCount === 0) return;
    temp.resetRead();
    stream.writeBitStream(temp);
}

/**
 * Read a Huffman-compressed string with RakNet compressed u32 bit count prefix
 * This is the format used by RakNet's StringCompressor::DecodeString
 */
export function readCompressedString(stream: MsbBitStream, maxLen: number = 2048): string {
    // RakNet StringCompressor format (compressed u32 bit count prefix).
    const countStream = stream.readCompressed(4);
    const bitCount = countStream.readLong();
    if (bitCount <= 0) return '';
    if (maxLen > 0 && bitCount > maxLen * 16) {
        throw new Error(`Huffman decode failed: bitCount ${bitCount} exceeds limit`);
    }
    return decodeHuffmanBits(stream, bitCount, maxLen);
}

// =============================================================================
// Raw U32BE Format (legacy/alternate format)
// =============================================================================

/**
 * Decode a Huffman string with raw U32BE length prefix
 * Format: [4 bytes BE bit count] [huffman bits...]
 */
export function decodeHuffmanStringRawLenBE(
    data: Uint8Array,
    offset: number,
    maxLen = 2048,
): { value: string; bytesRead: number } {
    // Raw U32BE length prefix with Huffman bits.
    const stream = new MsbBitStream(Buffer.from(data.slice(offset)));
    const b0 = stream.readByte();
    const b1 = stream.readByte();
    const b2 = stream.readByte();
    const b3 = stream.readByte();
    const bitCount = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;

    if (bitCount <= 0) {
        return { value: '', bytesRead: 4 };
    }
    if (bitCount > maxLen * 16) {
        throw new Error(`Huffman decode failed: bitCount ${bitCount} exceeds limit`);
    }

    const value = decodeHuffmanBits(stream, bitCount, maxLen);
    const bytesRead = 4 + Math.ceil(bitCount / 8);
    return { value, bytesRead };
}

/**
 * Encode a string using Huffman with raw U32BE length prefix
 */
export function encodeHuffmanStringRawLenBE(value: string, maxLen = 2048): Buffer {
    // Raw U32BE length prefix with Huffman bits.
    const temp = encodeStringToBitStream(value ?? '', maxLen);
    const bitCount = temp.bits();

    const huffmanData = temp.data;
    const result = Buffer.alloc(4 + huffmanData.length);
    result.writeUInt32BE(bitCount, 0);
    huffmanData.copy(result, 4);

    return result;
}

/**
 * Write a Huffman-compressed string with raw U32BE length prefix to a stream
 */
export function writeHuffmanStringRawLenBE(
    stream: MsbBitStream,
    value: string,
    maxLen: number = 2048,
): void {
    // Raw U32BE length prefix with Huffman bits.
    const temp = encodeStringToBitStream(value ?? '', maxLen);
    const bitCount = temp.bits();

    // Write BE u32 bit count
    stream.writeByte((bitCount >>> 24) & 0xff);
    stream.writeByte((bitCount >>> 16) & 0xff);
    stream.writeByte((bitCount >>> 8) & 0xff);
    stream.writeByte(bitCount & 0xff);

    if (bitCount === 0) return;
    temp.resetRead();
    stream.writeBitStream(temp);
}

/**
 * Read a Huffman-compressed string with raw U32BE length prefix from a stream
 */
export function readHuffmanStringRawLenBE(stream: MsbBitStream, maxLen: number = 2048): string {
    // Raw U32BE length prefix with Huffman bits.
    const b0 = stream.readByte();
    const b1 = stream.readByte();
    const b2 = stream.readByte();
    const b3 = stream.readByte();
    const bitCount = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;

    if (bitCount <= 0) return '';
    if (maxLen > 0 && bitCount > maxLen * 16) {
        throw new Error(`Huffman decode failed: bitCount ${bitCount} exceeds limit`);
    }

    return decodeHuffmanBits(stream, bitCount, maxLen);
}

// =============================================================================
// BitStream Compressed U32 BitCount Format (FoM client)
// =============================================================================

export function readHuffmanStringCompressedU32(stream: MsbBitStream, maxLen: number = 2048): string {
    // FoM client format: compressed U32 bit count prefix (byte-array compressed).
    const bitCount = readCompressedUIntBE(stream, 4);
    if (bitCount <= 0) return '';
    if (maxLen > 0 && bitCount > maxLen * 16) {
        throw new Error(`Huffman decode failed: bitCount ${bitCount} exceeds limit`);
    }
    return decodeHuffmanBitsFromStream(stream, bitCount, maxLen);
}

export function writeHuffmanStringCompressedU32(
    stream: MsbBitStream,
    value: string,
    maxLen: number = 2048,
): void {
    // FoM client format: compressed U32 bit count prefix (byte-array compressed).
    const temp = encodeStringToBitStream(value ?? '', maxLen);
    const bitCount = temp.bits();
    writeCompressedUIntBE(stream, bitCount >>> 0, 4);
    if (bitCount === 0) return;
    temp.resetRead();
    stream.writeBitStream(temp);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Try to extract username from 0x6C packet using Huffman decoding
 * Handles timestamp prefix if present
 */
export function extractUsernameFrom6C(data: Uint8Array): string {
    // Convenience helper for 0x6C packets; tries RakNet or raw U32BE formats.
    let offset = 1; // Skip packet ID (0x6C)

    // Check for timestamp prefix (0x19)
    if (data[0] === 0x19) {
        offset = 10; // 1 byte ID + 8 byte timestamp + 1 byte actual packet ID
    }

    try {
        // Try RakNet StringCompressor format first
        const stream = new MsbBitStream(Buffer.from(data.slice(offset)));
        return readCompressedString(stream, 2048) || 'unknown';
    } catch {
        try {
            // Fall back to raw U32BE format
            const { value } = decodeHuffmanStringRawLenBE(data, offset);
            return value || 'unknown';
        } catch {
            logWarn('[HuffmanCodec] Failed to decode username');
            return 'unknown';
        }
    }
}

export function resetHuffmanCache(): void {
    cachedCodes = null;
    cachedDecodeTree = null;
}

export function sanitizeString(value: string, maxLen: number): string {
    const raw = (value ?? '').split('\0')[0];
    if (maxLen > 0 && raw.length >= maxLen) {
        return raw.slice(0, Math.max(0, maxLen - 1));
    }
    return raw;
}

export { MsbBitStream as RakBitStream };
// Re-export MsbBitStream as default for V1 compatibility
export default MsbBitStream;
