import assert from 'node:assert/strict';
import { NativeBitStream } from '@openfom/networking';

const roundTrip = (value: number, size: number): number => {
  const writer = new NativeBitStream();
  try {
    switch (size) {
      case 1:
        writer.writeCompressedU8(value >>> 0);
        break;
      case 2:
        writer.writeCompressedU16(value >>> 0);
        break;
      case 4:
        writer.writeCompressedU32(value >>> 0);
        break;
      default:
        throw new Error(`unsupported size ${size}`);
    }
    const data = writer.getData();
    const reader = new NativeBitStream(data, true);
    switch (size) {
      case 1:
        return reader.readCompressedU8() >>> 0;
      case 2:
        return reader.readCompressedU16() >>> 0;
      case 4:
        return reader.readCompressedU32() >>> 0;
      default:
        throw new Error(`unsupported size ${size}`);
    }
  } finally {
    writer.destroy();
  }
};

const cases: Array<{ size: number; values: number[] }> = [
  { size: 1, values: [0, 1, 0x0f, 0x10, 0x7f, 0x80, 0xff] },
  { size: 2, values: [0, 1, 0x10, 0x1234, 0x7fff, 0x8000, 0xffff] },
  { size: 4, values: [0, 1, 0x10, 0x1234, 0x12345678, 0xffffffff] },
];

for (const testCase of cases) {
  for (const value of testCase.values) {
    const actual = roundTrip(value, testCase.size);
    assert.equal(actual, value >>> 0, `compressed roundtrip failed size=${testCase.size} value=0x${value.toString(16)}`);
  }
}

console.log('raknet_compressed.test.ts: ok');
