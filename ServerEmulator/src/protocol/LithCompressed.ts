import { BitStreamWriter } from './BitStream';

const clampU32 = (value: number): number => value >>> 0;

export const writeCompressedUInt = (
    writer: BitStreamWriter,
    value: number,
    byteCount: number,
): void => {
    const clamped = clampU32(value);
    const bytes = Math.max(1, Math.min(4, byteCount));

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

    const low = clamped & 0xff;
    if ((low & 0xf0) === 0) {
        writer.writeBits(1, 1);
        writer.writeBits(low & 0x0f, 4);
        return;
    }
    writer.writeBits(0, 1);
    writer.writeBits(low, 8);
};

export const writeU8c = (writer: BitStreamWriter, value: number): void => {
    writeCompressedUInt(writer, value & 0xff, 1);
};

export const writeU16c = (writer: BitStreamWriter, value: number): void => {
    writeCompressedUInt(writer, value & 0xffff, 2);
};

export const writeU32c = (writer: BitStreamWriter, value: number): void => {
    writeCompressedUInt(writer, clampU32(value), 4);
};

export const writeListU16CountU32c = (writer: BitStreamWriter, values: number[]): void => {
    const list = values ?? [];
    writeU16c(writer, list.length);
    for (const entry of list) {
        writeU32c(writer, entry >>> 0);
    }
};
