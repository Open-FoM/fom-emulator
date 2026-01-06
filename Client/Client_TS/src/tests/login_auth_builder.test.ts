import assert from 'node:assert/strict';
import { buildLoginAuth } from '../protocol/FoMPacketBuilder';
import { RakNetMessageId } from '../protocol/Constants';
import RakBitStream from '../raknet-js/structures/BitStream';
import { readCompressedString } from '../protocol/RakStringCompressor';

const readBoundedString = (stream: RakBitStream, maxLen: number): string => {
  if (maxLen <= 1) return '';
  const bits = Math.floor(Math.log2(maxLen)) + 1;
  const len = stream.readBits(bits);
  const rawLen = Math.max(0, len);
  const safeLen = Math.min(rawLen, maxLen - 1);
  const bytes: number[] = [];
  for (let i = 0; i < rawLen; i += 1) {
    const byte = stream.readBits(8);
    if (i < safeLen) bytes.push(byte);
  }
  return Buffer.from(bytes).toString('latin1');
};

const readCompressedUInt = (stream: RakBitStream, size: number): number => {
  const comp = stream.readCompressed(size);
  let value = 0;
  let factor = 1;
  for (let i = 0; i < size; i += 1) {
    value += comp.readByte() * factor;
    factor *= 256;
  }
  return value >>> 0;
};

const decodeLoginAuth = (buffer: Buffer) => {
  const stream = new RakBitStream(buffer);
  let packetId = stream.readByte();
  if (packetId === RakNetMessageId.ID_TIMESTAMP) {
    stream.readLongLong();
    packetId = stream.readByte();
  }
  assert.equal(packetId, RakNetMessageId.ID_LOGIN, 'packet id mismatch');

  const username = readCompressedString(stream, 2048);
  const passwordHash = readBoundedString(stream, 0x40);
  const fileCRCs = [
    readCompressedUInt(stream, 4),
    readCompressedUInt(stream, 4),
    readCompressedUInt(stream, 4),
  ] as [number, number, number];
  const macAddress = readCompressedString(stream, 2048);
  const driveModels: string[] = [];
  const driveSerials: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    driveModels.push(readBoundedString(stream, 0x40));
    driveSerials.push(readBoundedString(stream, 0x20));
  }
  const loginToken = readBoundedString(stream, 0x40);
  const computerName = readCompressedString(stream, 2048);
  const flag = stream.readBit();
  let blob: Buffer | undefined;
  let blobU32 = 0;
  if (flag) {
    const bytes: number[] = [];
    for (let i = 0; i < 0x400; i += 1) {
      const comp = stream.readCompressed(1);
      bytes.push(comp.readByte());
    }
    blob = Buffer.from(bytes);
    blobU32 = readCompressedUInt(stream, 4);
  }
  return {
    username,
    passwordHash,
    fileCRCs,
    macAddress,
    driveModels,
    driveSerials,
    loginToken,
    computerName,
    blob,
    blobU32,
    blobFlag: flag,
  };
};

(() => {
  const blob = Buffer.alloc(0x400, 0);
  blob[0] = 0x12;
  blob[1] = 0x34;
  blob[0x3ff] = 0xab;

  const packet = buildLoginAuth({
    timestampMs: 0x1122334455667788n,
    username: 'USER_ABC',
    passwordHash: 'PASS_HASH',
    fileCRCs: [0x11223344, 0x55667788, 0x99aabbcc],
    macAddress: 'AA-BB-CC-DD-EE-FF',
    driveModels: ['EX64_0', 'EX64_1', 'EX64_2', 'EX64_3'],
    driveSerialNumbers: ['EX32_0', 'EX32_1', 'EX32_2', 'EX32_3'],
    loginToken: 'TOKEN_STR',
    computerName: 'COMPUTER_NAME',
    steamTicket: blob,
    steamTicketLength: 0x0badf00d,
  });

  const decoded = decodeLoginAuth(packet);
  assert.equal(decoded.username, 'USER_ABC');
  assert.equal(decoded.passwordHash, 'PASS_HASH');
  assert.deepEqual(decoded.fileCRCs, [0x11223344, 0x55667788, 0x99aabbcc]);
  assert.equal(decoded.macAddress, 'AA-BB-CC-DD-EE-FF');
  assert.deepEqual(decoded.driveModels, ['EX64_0', 'EX64_1', 'EX64_2', 'EX64_3']);
  assert.deepEqual(decoded.driveSerials, ['EX32_0', 'EX32_1', 'EX32_2', 'EX32_3']);
  assert.equal(decoded.loginToken, 'TOKEN_STR');
  assert.equal(decoded.computerName, 'COMPUTER_NAME');
  assert.ok(decoded.blob);
  assert.equal(decoded.blob?.length, 0x400);
  assert.equal(decoded.blob?.[0], 0x12);
  assert.equal(decoded.blob?.[1], 0x34);
  assert.equal(decoded.blob?.[0x3ff], 0xab);
  assert.equal(decoded.blobU32, 0x0badf00d);
})();

(() => {
  const longName = 'A'.repeat(80);
  const packet = buildLoginAuth({
    username: 'S',
    passwordHash: longName,
    macAddress: '',
    computerName: 'G',
  });
  const decoded = decodeLoginAuth(packet);
  assert.equal(decoded.passwordHash.length, 63);
})();

console.log('login_auth_builder.test.ts: ok');
