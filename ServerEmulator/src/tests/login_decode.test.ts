import assert from 'assert/strict';
import { resetHuffmanCache } from '../protocol/RakStringCompressor';
import { loadFixtures } from './_support/fixtures';
import { decodeLogin6cFromPacket, hexToBuffer } from './_support/packetDecode';

function runLoginFixtures(label: string): void {
    const fixtures = loadFixtures().filter((fixture) => fixture.msg_id === 0x6c);
    assert.ok(fixtures.length >= 2, `${label}: expected at least two login fixtures`);

    for (const fixture of fixtures) {
        const packet = hexToBuffer(fixture.hex);
        const decoded = decodeLogin6cFromPacket(packet);
        assert.ok(decoded, `${label}: ${fixture.name} decode returned null`);
        assert.ok(decoded.ok, `${label}: ${fixture.name} score too low`);
        if (!fixture.expected) {
            throw new Error(`${label}: ${fixture.name} missing expected values`);
        }
        assert.equal(
            decoded.username,
            fixture.expected.username,
            `${label}: ${fixture.name} username mismatch`,
        );
        assert.equal(
            decoded.token,
            fixture.expected.token,
            `${label}: ${fixture.name} token mismatch`,
        );
        assert.equal(
            decoded.preFlag,
            fixture.expected.preFlag,
            `${label}: ${fixture.name} preFlag mismatch`,
        );
        assert.equal(
            decoded.postFlag,
            fixture.expected.postFlag,
            `${label}: ${fixture.name} postFlag mismatch`,
        );
    }
}

resetHuffmanCache();
const envBackup = process.env.FOM_HUFFMAN_TABLE;
delete process.env.FOM_HUFFMAN_TABLE;
runLoginFixtures('default-table');

if (envBackup === undefined) {
    delete process.env.FOM_HUFFMAN_TABLE;
} else {
    process.env.FOM_HUFFMAN_TABLE = envBackup;
}
