/**
 * LithTech Compressed Integer Writers
 *
 * RakNet-style compression for integers in LithTech messages.
 * Uses LSB BitStreamWriter for game layer serialization.
 */

import { LsbBitStreamWriter } from './BitStream';

const clampU32 = (value: number): number => value >>> 0;

/**
 * Write a compressed unsigned integer using RakNet compression scheme
 * @param writer LSB BitStreamWriter
 * @param value The value to write
 * @param byteCount Number of bytes (1-4)
 */
export const writeCompressedUInt = (
    writer: LsbBitStreamWriter,
    value: number,
    byteCount: number,
): void => {
    const clamped = clampU32(value);
    const bytes = Math.max(1, Math.min(4, byteCount));

    // Emit leading zero flags until the first non-zero byte.
    for (let i = bytes - 1; i >= 1; i -= 1) {
        const b = (clamped >>> (i * 8)) & 0xff;
        if (b === 0) {
            writer.writeBits(1, 1);
            continue;
        }
        writer.writeBits(0, 1);
        for (let j = i; j >= 0; j -= 1) {
            writer.writeBits((clamped >>> (j * 8)) & 0xff, 8);
        }
        return;
    }

    // Low-byte nibble compression for small values.
    const low = clamped & 0xff;
    if ((low & 0xf0) === 0) {
        writer.writeBits(1, 1);
        writer.writeBits(low & 0x0f, 4);
        return;
    }
    writer.writeBits(0, 1);
    writer.writeBits(low, 8);
};

/**
 * Write compressed u8 (1 byte)
 */
export const writeU8c = (writer: LsbBitStreamWriter, value: number): void => {
    writeCompressedUInt(writer, value & 0xff, 1);
};

/**
 * Write compressed u16 (2 bytes)
 */
export const writeU16c = (writer: LsbBitStreamWriter, value: number): void => {
    writeCompressedUInt(writer, value & 0xffff, 2);
};

/**
 * Write compressed u32 (4 bytes)
 */
export const writeU32c = (writer: LsbBitStreamWriter, value: number): void => {
    writeCompressedUInt(writer, clampU32(value), 4);
};

/**
 * Write a list with u16 count prefix and u32 compressed entries
 */
export const writeListU16CountU32c = (writer: LsbBitStreamWriter, values: number[]): void => {
    const list = values ?? [];
    writeU16c(writer, list.length);
    for (const entry of list) {
        writeU32c(writer, entry >>> 0);
    }
};

/**
 * Write a list with u8 count prefix and u32 compressed entries
 */
export const writeListU8CountU32c = (writer: LsbBitStreamWriter, values: number[]): void => {
    const list = values ?? [];
    writeU8c(writer, list.length);
    for (const entry of list) {
        writeU32c(writer, entry >>> 0);
    }
};
