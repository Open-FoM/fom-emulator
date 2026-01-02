import assert from 'assert/strict';
import RakBitStream from '../raknet-js/structures/BitStream';
import { writeCompressedString } from '../protocol/RakStringCompressor';
import { probeDecodeSchema } from './_support/packetDecode';
import { LOGIN_6D_SCHEMA } from './_support/packetSchemas';

const writer = new RakBitStream();
writer.writeByte(0x6d);
writer.writeCompressed(1, 1);
writeCompressedString(writer, 'sess=abc', 2048);
const packet = writer.data;

const result = probeDecodeSchema(packet, LOGIN_6D_SCHEMA, 512);
assert.ok(result.ok, 'probe should succeed');
assert.equal(result.variant.bitOrder, 'msb');
assert.equal(result.variant.huffmanLength, 'compressed');
assert.equal(result.result?.fields.session, 'sess=abc');
