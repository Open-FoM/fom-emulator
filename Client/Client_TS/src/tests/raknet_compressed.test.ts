import assert from 'node:assert/strict';
import RakBitStream from '../raknet-js/structures/BitStream';

const readLE = (stream: RakBitStream, size: number): number => {
  let value = 0;
  let shift = 0;
  for (let i = 0; i < size; i += 1) {
    value |= (stream.readByte() << shift) >>> 0;
    shift += 8;
  }
  return value >>> 0;
};

const roundTrip = (value: number, size: number): number => {
  const writer = new RakBitStream();
  writer.writeCompressed(value >>> 0, size);
  const reader = new RakBitStream(writer.data);
  const comp = reader.readCompressed(size);
  return readLE(comp, size);
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
