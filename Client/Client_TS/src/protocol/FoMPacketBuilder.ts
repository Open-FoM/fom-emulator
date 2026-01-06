import {
  OFFLINE_MESSAGE_ID,
  OPEN_CONNECTION_PROTOCOL_VERSION,
  RakNetMessageId,
} from './Constants';
import os from 'os';
import { createHash } from 'crypto';
import RakBitStream from '../raknet-js/structures/BitStream';
import { writeCompressedString } from './RakStringCompressor';

export interface RakPeerGuidSeed {
  guid: Buffer;
  seed: Buffer;
}

export interface OpenConnectionRequestOptions {
  targetIp: string;
  targetPort: number;
  protocolVersion?: number;
  guid?: Buffer;
  seed?: Buffer;
}

export interface LoginRequestOptions {
  username: string;
  clientVersion: number;
}

export interface LoginAuthOptions {
  username: string;
  passwordHash?: Buffer | string;
  fileCRCs?: [number, number, number];
  macAddress?: string;
  driveModels?: string[];
  driveSerialNumbers?: string[];
  loginToken?: string;
  computerName?: string;
  steamTicket?: Buffer;
  steamTicketLength?: number;
  timestampMs?: bigint;
}

export interface WorldLoginOptions {
  worldId: number;
  worldInst: number;
  playerId: number;
  worldConst?: number;
  timestampMs?: bigint;
}

export interface FomReliableWrapOptions {
  timestamp?: number;
  messageNumber?: number;
  orderingFlags?: number;
  lengthInfo?: number;
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
let lastQpcMicros = 0n;

const sleepMs = (ms: number): void => {
  if (ms <= 0) return;
  Atomics.wait(sleepBuffer, 0, 0, ms);
};

const qpcMicros64 = (): bigint => {
  const now = process.hrtime.bigint() / 1000n;
  if (now < lastQpcMicros) return lastQpcMicros;
  lastQpcMicros = now;
  return now;
};

const qpcMicros32 = (): number => Number(qpcMicros64() & 0xffffffffn) >>> 0;
const rakNetTimeMsBase = (() => {
  const uptimeMs = BigInt(Math.floor(os.uptime() * 1000));
  const qpcMs = qpcMicros64() / 1000n;
  const base = uptimeMs - qpcMs;
  return base > 0n ? base : 0n;
})();
const rakNetTimeMs64 = (): bigint => rakNetTimeMsBase + (qpcMicros64() / 1000n);
const time64Seconds32 = (): number => Math.floor(Date.now() / 1000) >>> 0;

const writeBoundedBytes = (bs: RakBitStream, value: Buffer, maxLen: number): void => {
  if (maxLen <= 1) {
    return;
  }
  let length = value.length;
  if (length >= maxLen) {
    length = maxLen - 1;
  }
  const bits = Math.floor(Math.log2(maxLen)) + 1;
  bs.writeBits(length, bits);
  for (let i = 0; i < length; i += 1) {
    bs.writeBits(value[i], 8);
  }
};

const writeBoundedString = (bs: RakBitStream, value: string, maxLen: number): void => {
  const raw = Buffer.from(value ?? '', 'latin1');
  writeBoundedBytes(bs, raw, maxLen);
};

const md5HexLatin1 = (value: string): string => {
  const buf = Buffer.from(value ?? '', 'latin1');
  return createHash('md5').update(buf).digest('hex');
};

export const buildLoginAuthSession = (password: string, sessionSuffix: string): string => {
  const passHash = md5HexLatin1(password ?? '');
  return md5HexLatin1(`${passHash}${sessionSuffix ?? ''}`);
};

const ensureGuidSeed = (guid?: Buffer, seed?: Buffer): RakPeerGuidSeed => {
  if (guid && guid.length !== 16) {
    throw new Error('guid must be 16 bytes');
  }
  if (seed && seed.length !== 8) {
    throw new Error('seed must be 8 bytes');
  }
  if (guid && seed) return { guid, seed };
  const generated = buildRakPeerGuidSeed();
  return {
    guid: guid ?? generated.guid,
    seed: seed ?? generated.seed,
  };
};

export const parseIpv4Bytes = (value: string): number[] | null => {
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => Number.parseInt(part, 10));
  if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null;
  return bytes;
};

export const buildRakPeerGuidSeed = (): RakPeerGuidSeed => {
  const words = new Uint32Array(6);
  words[0] = qpcMicros32();
  words[1] = time64Seconds32();
  for (let i = 2; i < 6; i += 1) {
    sleepMs(1);
    sleepMs(0);
    words[i] = qpcMicros32();
    for (let j = 0; j < 7; j += 1) {
      const v6 = qpcMicros32() & 0xff;
      sleepMs(1);
      sleepMs(0);
      const v7 = qpcMicros32() & 0xff;
      const nibble = (v7 - v6) & 0x0f;
      const shift = 28 - (4 * j);
      words[i] = (words[i] ^ ((nibble << shift) >>> 0)) >>> 0;
    }
  }

  const buffer = Buffer.alloc(24);
  for (let i = 0; i < words.length; i += 1) {
    buffer.writeUInt32LE(words[i], i * 4);
  }
  return {
    guid: buffer.subarray(0, 16),
    seed: buffer.subarray(16),
  };
};

export const writeInvertedIpPort = (
  buffer: Buffer,
  offset: number,
  ipBytes: number[],
  port: number,
): number => {
  for (let i = 0; i < 4; i += 1) {
    const b = ipBytes[i] ?? 0;
    buffer[offset++] = (~b) & 0xff;
  }
  const clampedPort = Math.max(0, Math.min(0xffff, port));
  buffer.writeUInt16BE(clampedPort, offset);
  return offset + 2;
};

export const buildOpenConnectionRequest = (options: OpenConnectionRequestOptions): Buffer => {
  const protocolVersion = options.protocolVersion ?? OPEN_CONNECTION_PROTOCOL_VERSION;
  const { guid, seed } = ensureGuidSeed(options.guid, options.seed);
  const ipBytes = parseIpv4Bytes(options.targetIp) || [127, 0, 0, 1];
  const payloadLength = 1 + 1 + 24 + OFFLINE_MESSAGE_ID.length + 4 + 2;
  const buffer = Buffer.alloc(payloadLength);

  let offset = 0;
  buffer[offset++] = RakNetMessageId.ID_OPEN_CONNECTION_REQUEST;
  buffer[offset++] = protocolVersion & 0xff;
  guid.copy(buffer, offset);
  offset += 16;
  seed.copy(buffer, offset);
  offset += 8;
  OFFLINE_MESSAGE_ID.copy(buffer, offset);
  offset += OFFLINE_MESSAGE_ID.length;
  writeInvertedIpPort(buffer, offset, ipBytes, options.targetPort);
  return buffer;
};

export const buildLoginRequest = (options: LoginRequestOptions): Buffer => {
  const bs = new RakBitStream();
  bs.writeByte(RakNetMessageId.ID_LOGIN_REQUEST);
  writeCompressedString(bs, options.username ?? '', 2048);
  const clientVersion = options.clientVersion & 0xffff;
  bs.writeCompressed(clientVersion, 2);
  return bs.data;
};

export const buildLoginAuth = (options: LoginAuthOptions): Buffer => {
  const bs = new RakBitStream();
  if (options.timestampMs !== undefined) {
    bs.writeByte(RakNetMessageId.ID_TIMESTAMP);
    bs.writeLongLong(options.timestampMs);
  }
  bs.writeByte(RakNetMessageId.ID_LOGIN);
  const username = options.username ?? '';
  const macAddress = options.macAddress ?? '';
  const driveModels = options.driveModels ?? [];
  const driveSerialNumbers = options.driveSerialNumbers ?? [];
  const loginToken = options.loginToken ?? '';
  const computerName = options.computerName ?? os.hostname();
  const fileCRCs = options.fileCRCs ?? [0, 0, 0];
  const passwordHashRaw =
    options.passwordHash instanceof Buffer
      ? options.passwordHash
      : Buffer.from(options.passwordHash ?? '', 'latin1');

  writeCompressedString(bs, username, 2048);
  writeBoundedBytes(bs, passwordHashRaw, 0x40);
  for (let i = 0; i < 3; i += 1) {
    bs.writeCompressed(fileCRCs[i] ?? 0, 4);
  }
  writeCompressedString(bs, macAddress, 2048);
  for (let i = 0; i < 4; i += 1) {
    writeBoundedString(bs, driveModels[i] ?? '', 0x40);
    writeBoundedString(bs, driveSerialNumbers[i] ?? '', 0x20);
  }
  writeBoundedString(bs, loginToken, 0x40);
  writeCompressedString(bs, computerName, 2048);

  const ticket = options.steamTicket;
  if (ticket && ticket.length > 0) {
    bs.writeBit(true);
    for (let i = 0; i < 0x400; i += 1) {
      const byte = ticket[i] ?? 0;
      bs.writeCompressed(byte, 1);
    }
    const ticketLength = options.steamTicketLength ?? Math.min(ticket.length, 0x400);
    bs.writeCompressed(ticketLength >>> 0, 4);
  } else {
    bs.writeBit(false);
  }

  return bs.data;
};

export const buildWorldLogin = (options: WorldLoginOptions): Buffer => {
  const bs = new RakBitStream();
  if (options.timestampMs !== undefined) {
    bs.writeByte(RakNetMessageId.ID_TIMESTAMP);
    bs.writeLongLong(options.timestampMs);
  }
  bs.writeByte(RakNetMessageId.ID_WORLD_LOGIN);
  const worldId = options.worldId & 0xff;
  const worldInst = options.worldInst & 0xff;
  const playerId = options.playerId >>> 0;
  const worldConst = (options.worldConst ?? 0x13bc52) >>> 0;
  bs.writeCompressed(worldId, 1);
  bs.writeCompressed(worldInst, 1);
  bs.writeCompressed(playerId, 4);
  bs.writeCompressed(worldConst, 4);
  return bs.data;
};

export const buildLoginRequestInner = (options: LoginRequestOptions): Buffer => {
  const payload = buildLoginRequest(options);
  const bs = new RakBitStream();
  // FoM prefix observed in hook logs: 0x80 + LE 0x200f0000
  bs.writeByte(0x80);
  bs.writeLong(0x200f0000);
  for (const byte of payload) {
    bs.writeByte(byte);
  }
  const outBytes = Math.ceil(bs.bits() / 8);
  return bs.data.subarray(0, outBytes);
};

export const wrapFomReliablePacket = (innerData: Buffer, options: FomReliableWrapOptions = {}): Buffer => {
  const packet = Buffer.alloc(17 + innerData.length);
  packet[0] = 0x40;
  // Bytes 1-4 constant in FoM logs.
  packet.writeUInt32BE(0x00000001, 1);

  const ts = (options.timestamp ?? qpcMicros32()) >>> 0;
  packet.writeUInt32BE(ts, 5);

  const msgNum = (options.messageNumber ?? 5) & 0xffffff;
  const flags = (options.orderingFlags ?? 0x8) & 0x0f;
  const orderingInfo = ((msgNum << 4) | flags) >>> 0;
  packet.writeUInt32BE(orderingInfo, 9);

  const lengthInfo = (options.lengthInfo ?? 0) >>> 0;
  packet.writeUInt32BE(lengthInfo, 13);

  innerData.copy(packet, 17);
  return packet;
};
