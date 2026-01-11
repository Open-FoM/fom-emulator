/**
 * LithTech Huffman string encoder for LT bitstreams (0x79 StringBundleE).
 *
 * Uses runtime Huffman table from Docs/Notes/huffman_table_runtime.json.
 * Encodes as: u32c bitLength + bitstream (exactly bitLength bits).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { NativeBitStream } from '../bindings/raknet';

type HuffEntry = { sym: number; bitlen: number; bits: string };

let codeMap: Map<number, string> | null = null;

const getTablePath = (): string => {
    return join(import.meta.dir, '..', '..', '..', '..', '..', 'Docs', 'Notes', 'huffman_table_runtime.json');
};

const loadCodeMap = (): Map<number, string> => {
    if (codeMap) return codeMap;
    const raw = readFileSync(getTablePath(), 'utf8');
    const entries = JSON.parse(raw) as HuffEntry[];
    codeMap = new Map<number, string>();
    for (const entry of entries) {
        if (typeof entry.sym === 'number' && typeof entry.bits === 'string') {
            codeMap.set(entry.sym & 0xff, entry.bits);
        }
    }
    return codeMap;
};

export interface LithHuffmanBits {
    bitLen: number;
    codes: string[];
}

export const encodeLithHuffman = (input: string, maxBits: number = 2048): LithHuffmanBits => {
    const map = loadCodeMap();
    const bytes = Buffer.from(input ?? '', 'latin1');
    const codes: string[] = [];
    let bitLen = 0;

    for (const b of bytes) {
        const code = map.get(b);
        if (!code) continue;
        const nextLen = bitLen + code.length;
        if (nextLen > maxBits) break;
        codes.push(code);
        bitLen = nextLen;
    }

    return { bitLen, codes };
};

export const writeLithHuffmanString = (bs: NativeBitStream, input: string, maxBits: number = 2048): void => {
    const { bitLen, codes } = encodeLithHuffman(input, maxBits);
    bs.writeCompressedU32(bitLen >>> 0);
    for (const code of codes) {
        for (let i = 0; i < code.length; i++) {
            bs.writeBit(code[i] === '1');
        }
    }
};
