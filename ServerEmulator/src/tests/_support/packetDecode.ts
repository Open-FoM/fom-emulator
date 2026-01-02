import RakBitStream from '../../raknet-js/structures/BitStream';
import { BitStreamReader } from '../../protocol/BitStream';
import {
    readCompressedString,
    readHuffmanStringRawLenBE,
} from '../../protocol/RakStringCompressor';
import { parseRakNetDatagram } from '../../reliable/ReliablePackets';

export type FieldDef = {
    name: string;
    type:
        | 'bit'
        | 'u8'
        | 'u16'
        | 'u32'
        | 'u8c'
        | 'bytes'
        | 'huffman_string_rawlen_be'
        | 'huffman_string_compressed';
    endian?: 'be' | 'le';
    length?: number | 'rest';
    maxLen?: number;
};

export type PacketSchema = {
    name: string;
    msgId: number;
    wrapper: 'reliable' | 'raw';
    scan: 'lsb' | 'byte';
    bitOrder: 'lsb' | 'msb';
    startOffset?: number;
    fields: FieldDef[];
    validate?: (fields: Record<string, unknown>) => { ok: boolean; score: number };
};

export type LoginDecodeResult = {
    ok: boolean;
    username: string;
    token: number;
    preFlag: number;
    postFlag: number;
    startBit: number;
    score: number;
};

export type DecodeResult = {
    ok: boolean;
    score: number;
    startBit: number;
    fields: Record<string, unknown>;
};

export type ProbeVariant = {
    bitOrder: 'msb' | 'lsb';
    huffmanLength: 'compressed' | 'raw_u32_be';
};

export type ProbeResult = {
    ok: boolean;
    score: number;
    variant: ProbeVariant;
    result: DecodeResult | null;
};

export function hexToBuffer(hex: string): Buffer {
    const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
    return Buffer.from(cleaned, 'hex');
}

function unwrapReliable(packet: Buffer): Buffer {
    const parsed = parseRakNetDatagram(packet);
    if (parsed && parsed.packets.length > 0) {
        const candidate = parsed.packets.find((pkt) => pkt.innerData.length > 0);
        if (candidate) {
            return candidate.innerData;
        }
    }
    if (packet.length > 17 && (packet[0] & 0x40) === 0x40) {
        return packet.subarray(17);
    }
    return Buffer.alloc(0);
}

function repackLsbToMsb(buffer: Buffer, startBit: number): Buffer {
    const reader = new BitStreamReader(buffer, startBit);
    const writer = new RakBitStream();
    const totalBits = Math.max(0, reader.remainingBits);
    for (let i = 0; i < totalBits; i += 1) {
        writer.writeBit(reader.readBits(1) === 1);
    }
    const outBits = Math.max(0, writer.bits());
    const outBytes = Math.ceil(outBits / 8);
    return writer.data.subarray(0, outBytes);
}

function repackMsbToAligned(buffer: Buffer, startBit: number): Buffer {
    const reader = new RakBitStream(buffer);
    if (startBit > 0) {
        reader.readBits(startBit);
    }
    const writer = new RakBitStream();
    const totalBits = Math.max(0, buffer.length * 8 - startBit);
    for (let i = 0; i < totalBits; i += 1) {
        writer.writeBit(reader.readBit() === 1);
    }
    const outBits = Math.max(0, writer.bits());
    const outBytes = Math.ceil(outBits / 8);
    return writer.data.subarray(0, outBytes);
}

function scanForMsgIdLsb(buffer: Buffer, msgId: number, maxBits: number): number[] {
    const hits: number[] = [];
    const limit = Math.min(buffer.length * 8, maxBits);
    for (let startBit = 0; startBit <= limit - 8; startBit += 1) {
        const reader = new BitStreamReader(buffer, startBit);
        const id = reader.readBits(8);
        if (id === msgId) {
            hits.push(startBit);
        }
    }
    return hits;
}

function scanForMsgIdMsb(buffer: Buffer, msgId: number, maxBits: number): number[] {
    const hits: number[] = [];
    const limit = Math.min(buffer.length * 8, maxBits);
    for (let startBit = 0; startBit <= limit - 8; startBit += 1) {
        const reader = new RakBitStream(buffer);
        if (startBit > 0) {
            reader.readBits(startBit);
        }
        const id = reader.readByte();
        if (id === msgId) {
            hits.push(startBit);
        }
    }
    return hits;
}

class BitCursor {
    private stream: RakBitStream;
    private totalBits: number;
    bitsRead: number = 0;

    constructor(buffer: Buffer) {
        this.stream = new RakBitStream(buffer);
        this.totalBits = buffer.length * 8;
    }

    readBit(): number {
        this.bitsRead += 1;
        return this.stream.readBit();
    }

    readBits(bits: number): number {
        this.bitsRead += bits;
        return this.stream.readBits(bits);
    }

    readByte(): number {
        this.bitsRead += 8;
        return this.stream.readByte();
    }

    readUInt16(endian: 'be' | 'le' = 'be'): number {
        if (endian === 'le') {
            const lo = this.readByte();
            const hi = this.readByte();
            return (hi << 8) | lo;
        }
        return this.readBits(16);
    }

    readUInt32(endian: 'be' | 'le' = 'be'): number {
        if (endian === 'le') {
            const b0 = this.readByte();
            const b1 = this.readByte();
            const b2 = this.readByte();
            const b3 = this.readByte();
            return ((b3 << 24) | (b2 << 16) | (b1 << 8) | b0) >>> 0;
        }
        return this.readBits(32);
    }

    readBytes(length: number): Buffer {
        this.bitsRead += length * 8;
        return this.stream.readBytes(length).data;
    }

    remainingBits(): number {
        return Math.max(0, this.totalBits - this.bitsRead);
    }
}

class CursorBitStream extends RakBitStream {
    private cursor: BitCursor;

    constructor(cursor: BitCursor) {
        super(Buffer.alloc(0));
        this.cursor = cursor;
    }

    readBit(): number {
        return this.cursor.readBit();
    }

    readBits(bits: number): number {
        return this.cursor.readBits(bits);
    }

    readByte(): number {
        return this.cursor.readByte();
    }
}

function isPrintableAscii(value: string): boolean {
    for (let i = 0; i < value.length; i += 1) {
        const c = value.charCodeAt(i);
        if (c < 0x20 || c > 0x7e) return false;
    }
    return true;
}

function scoreLogin(username: string, token: number, preFlag: number, postFlag: number): number {
    let score = 0;
    if (isPrintableAscii(username)) score += 10;
    if (username.length >= 3 && username.length <= 64) score += 5;
    if (preFlag === 0 && postFlag === 0) score += 3;
    if (token !== 0) score += 2;
    return score;
}

export function decodeLogin6cFromPacket(
    packet: Buffer,
    maxScanBits: number = 1024,
): LoginDecodeResult | null {
    const inner = unwrapReliable(packet);
    if (inner.length === 0) return null;
    const candidates = scanForMsgIdMsb(inner, 0x6c, maxScanBits);
    const ordered = [
        ...candidates.filter((bit) => bit % 8 === 0),
        ...candidates.filter((bit) => bit % 8 !== 0),
    ];

    let best: LoginDecodeResult | null = null;
    for (const startBit of ordered) {
        const startByte = Math.floor(startBit / 8);
        const bitOffset = startBit % 8;
        const source =
            bitOffset === 0 ? inner.subarray(startByte) : repackMsbToAligned(inner, startBit);
        try {
            const stream = new RakBitStream(source);
            const id = stream.readByte();
            if (id !== 0x6c) continue;
            const preFlag = stream.readBit();
            const username = readHuffmanStringRawLenBE(stream, 2048);
            const postFlag = stream.readBit();
            const token = stream.readBits(16);
            const score = scoreLogin(username, token, preFlag, postFlag);

            const result: LoginDecodeResult = {
                ok: score >= 10,
                username,
                token,
                preFlag,
                postFlag,
                startBit,
                score,
            };
            if (result.ok && bitOffset === 0) {
                return result;
            }
            if (
                !best ||
                result.score > best.score ||
                (result.score === best.score && result.startBit < best.startBit)
            ) {
                best = result;
            }
        } catch {
            // Ignore decode errors for this candidate.
        }
    }

    return best;
}

export function decodeWithSchema(
    packet: Buffer,
    schema: PacketSchema,
    maxScanBits: number = 1024,
): DecodeResult | null {
    const inner = schema.wrapper === 'reliable' ? unwrapReliable(packet) : packet;
    if (inner.length === 0) return null;

    const candidates: number[] = [];
    if (schema.scan === 'byte') {
        if (typeof schema.startOffset === 'number') {
            const idx = schema.startOffset;
            if (idx < 0 || idx >= inner.length) return null;
            if (inner[idx] !== schema.msgId) return null;
            candidates.push(idx * 8);
        } else {
            const idx = inner.indexOf(schema.msgId);
            if (idx < 0) return null;
            candidates.push(idx * 8);
        }
    } else {
        const hits =
            schema.bitOrder === 'msb'
                ? scanForMsgIdMsb(inner, schema.msgId, maxScanBits)
                : scanForMsgIdLsb(inner, schema.msgId, maxScanBits);
        if (hits.length === 0) return null;
        candidates.push(...hits);
    }

    const ordered =
        schema.scan === 'lsb'
            ? [
                  ...candidates.filter((bit) => bit % 8 === 0),
                  ...candidates.filter((bit) => bit % 8 !== 0),
              ]
            : candidates;

    let best: DecodeResult | null = null;
    for (const startBit of ordered) {
        const startByte = Math.floor(startBit / 8);
        const bitOffset = startBit % 8;
        const source =
            schema.bitOrder === 'lsb'
                ? repackLsbToMsb(inner, startBit)
                : bitOffset === 0
                  ? inner.subarray(startByte)
                  : repackMsbToAligned(inner, startBit);
        try {
            const cursor = new BitCursor(source);
            const cursorStream = new CursorBitStream(cursor);

            const msgId = cursor.readByte();
            if (msgId !== schema.msgId) continue;

            const fields: Record<string, unknown> = {};
            for (const field of schema.fields) {
                switch (field.type) {
                    case 'bit':
                        fields[field.name] = cursor.readBit();
                        break;
                    case 'u8':
                        fields[field.name] = cursor.readByte();
                        break;
                    case 'u8c': {
                        const comp = cursorStream.readCompressed(1);
                        fields[field.name] = comp.readByte();
                        break;
                    }
                    case 'u16':
                        fields[field.name] = cursor.readUInt16(field.endian ?? 'be');
                        break;
                    case 'u32':
                        fields[field.name] = cursor.readUInt32(field.endian ?? 'be');
                        break;
                    case 'huffman_string_rawlen_be':
                        fields[field.name] = readHuffmanStringRawLenBE(
                            cursorStream,
                            field.maxLen ?? 2048,
                        );
                        break;
                    case 'huffman_string_compressed':
                        fields[field.name] = readCompressedString(
                            cursorStream,
                            field.maxLen ?? 2048,
                        );
                        break;
                    case 'bytes': {
                        let length = field.length;
                        if (length === 'rest') {
                            length = Math.floor(cursor.remainingBits() / 8);
                        }
                        const resolved = typeof length === 'number' ? length : 0;
                        fields[field.name] = cursor.readBytes(resolved);
                        break;
                    }
                    default:
                        throw new Error(`Unsupported field type: ${field.type}`);
                }
            }

            const validation = schema.validate ? schema.validate(fields) : { ok: true, score: 1 };
            const candidate: DecodeResult = {
                ok: validation.ok,
                score: validation.score,
                startBit,
                fields,
            };
            if (candidate.ok && bitOffset === 0) {
                return candidate;
            }
            if (
                !best ||
                candidate.score > best.score ||
                (candidate.score === best.score && candidate.startBit < best.startBit)
            ) {
                best = candidate;
            }
        } catch {
            // Ignore decode errors for this candidate.
        }
    }

    return best;
}

function cloneSchemaWithVariant(schema: PacketSchema, variant: ProbeVariant): PacketSchema {
    const fields: FieldDef[] = schema.fields.map((field) => {
        if (
            field.type === 'huffman_string_rawlen_be' ||
            field.type === 'huffman_string_compressed'
        ) {
            return {
                ...field,
                type:
                    variant.huffmanLength === 'compressed'
                        ? 'huffman_string_compressed'
                        : 'huffman_string_rawlen_be',
            };
        }
        return field;
    });
    return {
        ...schema,
        bitOrder: variant.bitOrder,
        fields,
    };
}

export function probeDecodeSchema(
    packet: Buffer,
    schema: PacketSchema,
    maxScanBits: number = 1024,
): ProbeResult {
    const variants: ProbeVariant[] = [
        { bitOrder: 'msb', huffmanLength: 'compressed' },
        { bitOrder: 'msb', huffmanLength: 'raw_u32_be' },
        { bitOrder: 'lsb', huffmanLength: 'compressed' },
        { bitOrder: 'lsb', huffmanLength: 'raw_u32_be' },
    ];

    let best: ProbeResult | null = null;
    for (const variant of variants) {
        const candidateSchema = cloneSchemaWithVariant(schema, variant);
        const decoded = decodeWithSchema(packet, candidateSchema, maxScanBits);
        const score = decoded?.score ?? 0;
        const ok = decoded?.ok ?? false;
        const result: ProbeResult = { ok, score, variant, result: decoded };
        if (
            !best ||
            result.score > best.score ||
            (result.score === best.score && result.ok && !best.ok)
        ) {
            best = result;
        }
    }

    return (
        best ?? {
            ok: false,
            score: 0,
            variant: { bitOrder: 'msb', huffmanLength: 'compressed' },
            result: null,
        }
    );
}
