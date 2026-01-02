import assert from 'assert/strict';
import RakBitStream from '../raknet-js/structures/BitStream';
import {
    readCompressedString,
    writeCompressedString,
    resetHuffmanCache,
} from '../protocol/RakStringCompressor';
import * as path from 'path';

const envBackup = process.env.FOM_HUFFMAN_TABLE;
process.env.FOM_HUFFMAN_TABLE = path.resolve(process.cwd(), 'huffman_table_runtime.json');
resetHuffmanCache();

const writer = new RakBitStream();
writer.writeByte(0x6d);
writer.writeCompressed(1, 1);
const session = 'sess=bitoffset';
writeCompressedString(writer, session, 2048);
const payload = writer.data;

const reader = new RakBitStream(payload);
assert.equal(reader.readByte(), 0x6d, 'login6d id mismatch');
const statusStream = reader.readCompressed(1);
assert.equal(statusStream.readByte(), 1, 'login6d status mismatch');
const decoded = readCompressedString(reader, 2048);
assert.equal(decoded, session, 'login6d string decode failed (bit offset alignment)');

if (envBackup === undefined) {
    delete process.env.FOM_HUFFMAN_TABLE;
} else {
    process.env.FOM_HUFFMAN_TABLE = envBackup;
}
