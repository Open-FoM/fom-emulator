/**
 * RSA Decryption for FoM login blobs
 *
 * Ported from legacy TS emulator
 */

export type RsaEndian = 'little' | 'big';

export interface RsaKey {
    n: bigint;
    d: bigint;
    e: bigint;
    modulusBytes: number;
    endian: RsaEndian;
}

export interface RsaKeyJson {
    endian?: 'little' | 'big';
    e?: string;
    p?: string;
    q?: string;
    n?: string;
    d?: string;
    modulusBytes?: number;
}

function normalizeHex(input: string): string {
    const trimmed = input.trim().replace(/^0x/i, '').replace(/\s+/g, '');
    return trimmed.length % 2 === 1 ? `0${trimmed}` : trimmed;
}

function parseHexBigInt(value?: string): bigint | null {
    if (!value) return null;
    const hex = normalizeHex(value);
    if (!hex) return null;
    return BigInt(`0x${hex}`);
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) {
            result = (result * b) % mod;
        }
        e >>= 1n;
        if (e > 0n) {
            b = (b * b) % mod;
        }
    }
    return result;
}

function egcd(a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint } {
    if (b === 0n) {
        return { g: a, x: 1n, y: 0n };
    }
    const { g, x, y } = egcd(b, a % b);
    return { g, x: y, y: x - (a / b) * y };
}

function modInverse(a: bigint, m: bigint): bigint {
    const { g, x } = egcd(a, m);
    if (g !== 1n && g !== -1n) {
        throw new Error('RSA: modInverse failed (gcd != 1)');
    }
    const inv = x % m;
    return inv < 0n ? inv + m : inv;
}

function bitLength(value: bigint): number {
    if (value <= 0n) return 0;
    return value.toString(2).length;
}

export function bufferToBigInt(buffer: Buffer, endian: RsaEndian): bigint {
    if (buffer.length === 0) return 0n;
    const bytes = endian === 'little' ? Buffer.from(buffer).reverse() : buffer;
    const hex = bytes.toString('hex') || '00';
    return BigInt(`0x${hex}`);
}

export function bigIntToBuffer(value: bigint, size: number, endian: RsaEndian): Buffer {
    const out = Buffer.alloc(size);
    let v = value;
    for (let i = 0; i < size; i++) {
        const byte = Number(v & 0xffn);
        const idx = endian === 'little' ? i : size - 1 - i;
        out[idx] = byte;
        v >>= 8n;
    }
    return out;
}

export function loadRsaKeyFromJson(json: RsaKeyJson): RsaKey | null {
    const endianRaw = (json.endian || 'little').toLowerCase();
    const endian: RsaEndian = endianRaw === 'big' ? 'big' : 'little';

    const e = parseHexBigInt(json.e) ?? 0x10001n;
    const p = parseHexBigInt(json.p);
    const q = parseHexBigInt(json.q);
    const n = parseHexBigInt(json.n);
    const d = parseHexBigInt(json.d);

    let keyN: bigint | null = null;
    let keyD: bigint | null = null;

    if (p && q) {
        keyN = p * q;
        const phi = (p - 1n) * (q - 1n);
        keyD = modInverse(e, phi);
    } else if (n && d) {
        keyN = n;
        keyD = d;
    }

    if (!keyN || !keyD) {
        return null;
    }

    const modulusBytes =
        json.modulusBytes && json.modulusBytes > 0
            ? json.modulusBytes
            : Math.ceil(bitLength(keyN) / 8);

    return {
        n: keyN,
        d: keyD,
        e,
        modulusBytes,
        endian,
    };
}

export function rsaDecryptBlocks(blob: Buffer, key: RsaKey, blockBytes?: number): Buffer {
    const size = blockBytes && blockBytes > 0 ? blockBytes : key.modulusBytes;
    if (size <= 0) return Buffer.alloc(0);

    const fullBlocks = Math.floor(blob.length / size);
    const remainder = blob.length % size;
    const chunks: Buffer[] = [];

    for (let i = 0; i < fullBlocks; i++) {
        const block = blob.subarray(i * size, (i + 1) * size);
        const c = bufferToBigInt(block, key.endian);
        const m = modPow(c, key.d, key.n);
        chunks.push(bigIntToBuffer(m, size, key.endian));
    }

    if (remainder > 0) {
        chunks.push(blob.subarray(fullBlocks * size));
    }

    return Buffer.concat(chunks);
}

