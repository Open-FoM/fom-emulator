import assert from 'assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import RakBitStream from '../raknet-js/structures/BitStream';
import {
    resetHuffmanCache,
    readCompressedString,
    writeCompressedString,
} from '../protocol/RakStringCompressor';

function resolveRuntimeTable(): string | null {
    const candidates = [
        path.resolve(process.cwd(), 'huffman_table_runtime.json'),
        path.resolve(process.cwd(), 'ServerEmulator', 'huffman_table_runtime.json'),
        path.resolve(__dirname, '..', '..', 'huffman_table_runtime.json'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

const tablePath = resolveRuntimeTable();
assert.ok(tablePath, 'runtime huffman table not found for login6d test');

const envBackup = process.env.FOM_HUFFMAN_TABLE;
process.env.FOM_HUFFMAN_TABLE = tablePath;
resetHuffmanCache();

const writer = new RakBitStream();
writer.writeByte(0x6d);
writer.writeCompressed(1, 1);
const session = 'sess=abc123;world=127.0.0.1:1234';
writeCompressedString(writer, session, 2048);
const payload = writer.data;

const reader = new RakBitStream(payload);
const packetId = reader.readByte();
assert.equal(packetId, 0x6d, 'login6d packet id mismatch');
const statusStream = reader.readCompressed(1);
const status = statusStream.readByte();
assert.equal(status, 1, 'login6d status mismatch');
const decoded = readCompressedString(reader, 2048);
assert.equal(decoded, session, 'login6d roundtrip string mismatch');

if (envBackup === undefined) {
    delete process.env.FOM_HUFFMAN_TABLE;
} else {
    process.env.FOM_HUFFMAN_TABLE = envBackup;
}
