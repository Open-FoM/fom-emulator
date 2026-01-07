import assert from 'node:assert/strict';
import { buildLoginAuth } from '../protocol/FoMPacketBuilder';
import { RakNetMessageId } from '../protocol/Constants';
import { NativeBitStream, decodeString } from '@openfom/networking';

const readCompressedUInt = (stream: NativeBitStream, size: number): number => {
  switch (size) {
    case 1:
      return stream.readCompressedU8() >>> 0;
    case 2:
      return stream.readCompressedU16() >>> 0;
    case 4:
      return stream.readCompressedU32() >>> 0;
    default:
      throw new Error(`Unsupported compressed int size ${size}`);
  }
};

const decodeLoginAuth = (buffer: Buffer) => {
  const stream = new NativeBitStream(buffer, true);
  let packetId = stream.readU8();
  if (packetId === RakNetMessageId.ID_TIMESTAMP) {
    stream.readBytes(8);
    packetId = stream.readU8();
  }
  assert.equal(packetId, RakNetMessageId.ID_LOGIN, 'packet id mismatch');

  const username = decodeString(stream, 2048);
  const passwordHash = stream.readString(0x40, 'hex');
  const fileCRCs = [
    readCompressedUInt(stream, 4),
    readCompressedUInt(stream, 4),
    readCompressedUInt(stream, 4),
  ] as [number, number, number];
  const macAddress = decodeString(stream, 2048);
  const driveModels: string[] = [];
  const driveSerials: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    driveModels.push(stream.readString(0x40));
    driveSerials.push(stream.readString(0x20));
  }
  const loginToken = stream.readString(0x40);
  const computerName = decodeString(stream, 2048);
  const flag = stream.readBit();
  let blob: Buffer | undefined;
  let blobU32 = 0;
  if (flag) {
    const bytes: number[] = [];
    for (let i = 0; i < 0x400; i += 1) {
      bytes.push(stream.readCompressedU8());
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
    passwordHash: Buffer.from('PASS_HASH', 'latin1'),
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
  assert.equal(decoded.passwordHash, Buffer.from('PASS_HASH', 'latin1').toString('hex'));
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
    passwordHash: Buffer.from(longName, 'latin1'),
    macAddress: '',
    computerName: 'G',
  });
  const decoded = decodeLoginAuth(packet);
  assert.equal(decoded.passwordHash.length, 126);
})();

console.log('login_auth_builder.test.ts: ok');
