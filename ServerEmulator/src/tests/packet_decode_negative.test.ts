import assert from 'assert/strict';
import { loadFixtures } from './_support/fixtures';
import { decodeWithSchema, hexToBuffer } from './_support/packetDecode';
import { LOGIN_6C_SCHEMA } from './_support/packetSchemas';

const fixtures = loadFixtures().filter((fixture) => fixture.msg_id === 0x6c);
assert.ok(fixtures.length >= 2, 'packet-negative: expected at least two login fixtures');

const badSchema = { ...LOGIN_6C_SCHEMA, scan: 'byte' as const };
const lsbSchema = { ...LOGIN_6C_SCHEMA, bitOrder: 'lsb' as const };

function shiftRightBits(buffer: Buffer, bits: number): Buffer {
    if (bits <= 0) return Buffer.from(buffer);
    const out = Buffer.alloc(buffer.length);
    const mask = (1 << bits) - 1;
    let carry = 0;
    for (let i = 0; i < buffer.length; i += 1) {
        const byte = buffer[i];
        out[i] = ((byte >> bits) | (carry << (8 - bits))) & 0xff;
        carry = byte & mask;
    }
    return out;
}

for (const fixture of fixtures) {
    const packet = hexToBuffer(fixture.hex);
    const lsbDecoded = decodeWithSchema(packet, lsbSchema);
    if (lsbDecoded) {
        assert.equal(
            lsbDecoded.ok,
            false,
            `packet-negative: ${fixture.name} should fail with lsb bit order`,
        );
    }
    const shifted = shiftRightBits(packet, 1);
    const decoded = decodeWithSchema(shifted, badSchema);
    if (decoded) {
        assert.equal(
            decoded.ok,
            false,
            `packet-negative: ${fixture.name} should fail on misaligned packet`,
        );
    }
}
