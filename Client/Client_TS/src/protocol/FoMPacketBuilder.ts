import { RakNetMessageId } from './Constants';
import os from 'os';
import { createHash } from 'crypto';
import {
  NativeBitStream,
  encodeString,
} from '@openfom/networking';

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

const writeBoundedBytes = (bs: NativeBitStream, value: Buffer, maxLen: number): void => {
  if (maxLen <= 1) {
    return;
  }
  let length = value.length;
  if (length >= maxLen) {
    length = maxLen - 1;
  }
  const bits = Math.floor(Math.log2(maxLen)) + 1;
  // RakNet bounded strings store the length in right-aligned bits.
  bs.writeBits(Buffer.from([length & 0xff]), bits, true);
  if (length > 0) {
    bs.writeBytes(value.subarray(0, length));
  }
};

const writeBoundedString = (bs: NativeBitStream, value: string, maxLen: number): void => {
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

export const buildLoginRequest = (options: LoginRequestOptions): Buffer => {
  const bs = new NativeBitStream();
  try {
    bs.writeU8(RakNetMessageId.ID_LOGIN_REQUEST);
    // Server expects RakNet StringCompressor path (no preFlag).
    encodeString(options.username ?? '', bs, 2048);
    bs.writeBit(false); // postFlag (observed 0)
    const clientVersion = options.clientVersion & 0xffff;
    bs.writeU16(clientVersion);
    return bs.getData();
  } finally {
    bs.destroy();
  }
};

export const buildLoginAuth = (options: LoginAuthOptions): Buffer => {
  const bs = new NativeBitStream();
  try {
    if (options.timestampMs !== undefined) {
      bs.writeU8(RakNetMessageId.ID_TIMESTAMP);
      const tsBuf = Buffer.alloc(8);
      tsBuf.writeBigUInt64LE(options.timestampMs);
      bs.writeBytes(tsBuf);
    }
    bs.writeU8(RakNetMessageId.ID_LOGIN);
    const username = options.username ?? '';
    const macAddress = options.macAddress ?? '';
    const driveModels = options.driveModels ?? [];
    const driveSerialNumbers = options.driveSerialNumbers ?? [];
    const loginToken = options.loginToken ?? '';
    const computerName = options.computerName ?? os.hostname();
    const fileCRCs = options.fileCRCs ?? [0, 0, 0];
    const passwordHashRaw = (() => {
      if (options.passwordHash instanceof Buffer) {
        return options.passwordHash;
      }
      const raw = typeof options.passwordHash === 'string' ? options.passwordHash : '';
      const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0;
      return Buffer.from(raw, isHex ? 'hex' : 'latin1');
    })();

    encodeString(username, bs, 2048);
    writeBoundedBytes(bs, passwordHashRaw, 0x40);
    for (let i = 0; i < 3; i += 1) {
      bs.writeCompressedU32((fileCRCs[i] ?? 0) >>> 0);
    }
    encodeString(macAddress, bs, 2048);
    for (let i = 0; i < 4; i += 1) {
      writeBoundedString(bs, driveModels[i] ?? '', 0x40);
      writeBoundedString(bs, driveSerialNumbers[i] ?? '', 0x20);
    }
    writeBoundedString(bs, loginToken, 0x40);
    encodeString(computerName, bs, 2048);

    const ticket = options.steamTicket;
    if (ticket && ticket.length > 0) {
      bs.writeBit(true);
      for (let i = 0; i < 0x400; i += 1) {
        const byte = ticket[i] ?? 0;
        bs.writeCompressedU8(byte);
      }
      const ticketLength = options.steamTicketLength ?? Math.min(ticket.length, 0x400);
      bs.writeCompressedU32(ticketLength >>> 0);
    } else {
      bs.writeBit(false);
    }

    return bs.getData();
  } finally {
    bs.destroy();
  }
};

export const buildWorldLogin = (options: WorldLoginOptions): Buffer => {
  const bs = new NativeBitStream();
  try {
    if (options.timestampMs !== undefined) {
      bs.writeU8(RakNetMessageId.ID_TIMESTAMP);
      const tsBuf = Buffer.alloc(8);
      tsBuf.writeBigUInt64LE(options.timestampMs);
      bs.writeBytes(tsBuf);
    }
    bs.writeU8(RakNetMessageId.ID_WORLD_LOGIN);
    const worldId = options.worldId & 0xff;
    const worldInst = options.worldInst & 0xff;
    const playerId = options.playerId >>> 0;
    const worldConst = (options.worldConst ?? 0x13bc52) >>> 0;
    bs.writeCompressedU8(worldId);
    bs.writeCompressedU8(worldInst);
    bs.writeCompressedU32(playerId);
    bs.writeCompressedU32(worldConst);
    return bs.getData();
  } finally {
    bs.destroy();
  }
};
