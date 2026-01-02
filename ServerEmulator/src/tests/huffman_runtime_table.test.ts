import assert from 'assert/strict';
import { resetHuffmanCache } from '../protocol/RakStringCompressor';
import { loadFixtures } from './_support/fixtures';
import { decodeLogin6cFromPacket, hexToBuffer } from './_support/packetDecode';

const envBackup = process.env.FOM_HUFFMAN_TABLE;
process.env.FOM_HUFFMAN_TABLE = 'huffman_table_runtime.json';
resetHuffmanCache();

const fixtures = loadFixtures().filter((fixture) => fixture.msg_id === 0x6c);
assert.ok(fixtures.length >= 2, 'huffman-table: expected at least two login fixtures');

for (const fixture of fixtures) {
    const packet = hexToBuffer(fixture.hex);
    const decoded = decodeLogin6cFromPacket(packet);
    assert.ok(decoded, `huffman-table: ${fixture.name} decode returned null`);
    assert.ok(decoded.ok, `huffman-table: ${fixture.name} score too low`);
    if (!fixture.expected) {
        throw new Error(`huffman-table: ${fixture.name} missing expected values`);
    }
    assert.equal(
        decoded.username,
        fixture.expected.username,
        `huffman-table: ${fixture.name} username mismatch`,
    );
    assert.equal(
        decoded.token,
        fixture.expected.token,
        `huffman-table: ${fixture.name} token mismatch`,
    );
}

if (envBackup === undefined) {
    delete process.env.FOM_HUFFMAN_TABLE;
} else {
    process.env.FOM_HUFFMAN_TABLE = envBackup;
}
