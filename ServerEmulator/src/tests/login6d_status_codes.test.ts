import assert from 'assert/strict';
import RakBitStream from '../raknet-js/structures/BitStream';

function decodeStatus(payload: Buffer): number {
    const reader = new RakBitStream(payload);
    assert.equal(reader.readByte(), 0x6d, 'login6d id mismatch');
    const statusStream = reader.readCompressed(1);
    return statusStream.readByte();
}

for (const status of [0, 1, 2, 3]) {
    const writer = new RakBitStream();
    writer.writeByte(0x6d);
    writer.writeCompressed(status, 1);
    const payload = writer.data;
    const decoded = decodeStatus(payload);
    assert.equal(decoded, status, `login6d status roundtrip mismatch (${status})`);
}
