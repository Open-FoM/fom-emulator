import dgram from 'dgram';
import os from 'os';
import path from 'path';
import { BitStreamReader, BitStreamWriter } from '../protocol/BitStream';
import {
  CONNECTION_MAGIC,
  ConnectionRequestType,
  DEFAULT_PORT,
  LithTechMessageId,
  OPEN_CONNECTION_PROTOCOL_VERSION,
  RakNetMessageId,
  RETRY_INTERVAL,
  SEQUENCE_MASK,
} from '../protocol/Constants';
import {
  buildOpenConnectionRequest,
  buildLoginAuth,
  buildLoginAuthSession,
  buildLoginRequestInner,
  buildWorldLogin,
  wrapFomReliablePacket,
  buildRakPeerGuidSeed,
} from '../protocol/FoMPacketBuilder';
import RakBitStream from '../raknet-js/structures/BitStream';
import { readCompressedString } from '../protocol/RakStringCompressor';
import { PacketDirection, PacketLogger } from '../utils/PacketLogger';
import {
  loadEnvCandidates,
  parseBool,
  parseConsoleMode,
  parseFlushMode,
  parsePacketIds,
} from '../config/ConfigLoader';

const DEFAULT_GUID_SEED = buildRakPeerGuidSeed();

type ParsedReliablePacket = { innerData: Buffer; reliability: number };

const RELIABILITY = {
  UNRELIABLE: 0,
  UNRELIABLE_SEQUENCED: 1,
  RELIABLE: 2,
  RELIABLE_ORDERED: 3,
  RELIABLE_SEQUENCED: 4,
};

const RELIABLE_SCORE_IDS = [
  RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER,
  RakNetMessageId.ID_FILE_LIST_TRANSFER_RESPONSE,
  RakNetMessageId.ID_LOGIN_REQUEST,
  RakNetMessageId.ID_LOGIN_REQUEST_RETURN,
  RakNetMessageId.ID_LOGIN,
  RakNetMessageId.ID_LOGIN_RETURN,
  RakNetMessageId.ID_LOGIN_TOKEN_CHECK,
  RakNetMessageId.ID_WORLD_SELECT,
  RakNetMessageId.ID_WORLD_LOGIN,
  RakNetMessageId.ID_WORLD_LOGIN_RETURN,
];

class SafeBitReader {
  private data: Buffer;
  private bytePos: number;
  private bitPos: number;

  constructor(data: Buffer) {
    this.data = data;
    this.bytePos = 0;
    this.bitPos = 7;
  }

  remainingBits(): number {
    if (this.bytePos >= this.data.length) return 0;
    return (this.data.length - this.bytePos - 1) * 8 + (this.bitPos + 1);
  }

  readBit(): number | null {
    if (this.bytePos >= this.data.length) return null;
    const byte = this.data[this.bytePos];
    const bit = (byte >> this.bitPos) & 0x01;
    this.bitPos -= 1;
    if (this.bitPos < 0) {
      this.bitPos = 7;
      this.bytePos += 1;
    }
    return bit;
  }

  readBits(count: number): number | null {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const bit = this.readBit();
      if (bit === null) return null;
      value = (value << 1) | bit;
    }
    return value >>> 0;
  }

  readByte(): number | null {
    const bits = this.readBits(8);
    return bits === null ? null : bits;
  }

  readLong(): number | null {
    const b0 = this.readByte();
    const b1 = this.readByte();
    const b2 = this.readByte();
    const b3 = this.readByte();
    if (b0 === null || b1 === null || b2 === null || b3 === null) return null;
    return (b0 + (b1 << 8) + (b2 << 16) + (b3 << 24)) >>> 0;
  }

  readShort(): number | null {
    const b0 = this.readByte();
    const b1 = this.readByte();
    if (b0 === null || b1 === null) return null;
    return (b0 + (b1 << 8)) >>> 0;
  }

  alignRead(): void {
    if (this.bitPos !== 7) {
      this.bitPos = 7;
      this.bytePos += 1;
    }
  }

  readCompressedUnsigned(sizeBytes: number): number | null {
    let currentByte = sizeBytes - 1;

    while (currentByte > 0) {
      const b = this.readBit();
      if (b === null) return null;
      if (b === 1) {
        currentByte -= 1;
      } else {
        let value = 0;
        for (let i = 0; i <= currentByte; i += 1) {
          const byte = this.readByte();
          if (byte === null) return null;
          value |= byte << (i * 8);
        }
        return value >>> 0;
      }
    }

    const b = this.readBit();
    if (b === null) return null;
    if (b === 1) {
      const low = this.readBits(4);
      if (low === null) return null;
      return low;
    }
    const byte = this.readByte();
    if (byte === null) return null;
    return byte;
  }
}

const scoreInnerPayload = (inner: Buffer): number => {
  if (!inner || inner.length === 0) return 0;
  let score = 1;
  const first = inner[0];
  if (RELIABLE_SCORE_IDS.includes(first)) {
    score += 8;
  }
  for (const id of RELIABLE_SCORE_IDS) {
    if (inner.includes(id)) score += 2;
  }
  return score;
};

const bestScore = (packets: ParsedReliablePacket[]): number => {
  let best = 0;
  for (const pkt of packets) {
    const score = scoreInnerPayload(pkt.innerData);
    if (score > best) best = score;
  }
  return best;
};

const parseLegacyReliable = (data: Buffer): ParsedReliablePacket[] | null => {
  if (!data || data.length <= 17) return null;
  if ((data[0] & 0x40) !== 0x40) return null;
  return [{ innerData: data.subarray(17), reliability: RELIABILITY.RELIABLE }];
};

const parseRakNetBitAligned = (data: Buffer): ParsedReliablePacket[] | null => {
  if (!data || data.length === 0) return null;
  const stream = new SafeBitReader(data);
  const hasAcksBit = stream.readBit();
  if (hasAcksBit === null) return null;
  const hasAcks = hasAcksBit === 1;
  if (hasAcks) {
    const ackRemoteTime = stream.readLong();
    if (ackRemoteTime === null) return null;
    const count = stream.readCompressedUnsigned(2);
    if (count === null) return null;
    for (let i = 0; i < count; i += 1) {
      const equalBit = stream.readBit();
      const min = stream.readLong();
      if (equalBit === null || min === null) return null;
      if (equalBit === 0) {
        const maxVal = stream.readLong();
        if (maxVal === null) return null;
      }
    }
    if (stream.remainingBits() === 0) {
      return null;
    }
  }

  const hasRemoteBit = stream.readBit();
  if (hasRemoteBit === null) return null;
  if (hasRemoteBit === 1) {
    const remoteTime = stream.readLong();
    if (remoteTime === null) return null;
  }

  const packets: ParsedReliablePacket[] = [];
  while (stream.remainingBits() >= 8) {
    const messageNumber = stream.readLong();
    const reliabilityBits = stream.readBits(3);
    if (messageNumber === null || reliabilityBits === null) return null;
    const reliability = reliabilityBits;

    if (
      reliability === RELIABILITY.UNRELIABLE_SEQUENCED ||
      reliability === RELIABILITY.RELIABLE_ORDERED ||
      reliability === RELIABILITY.RELIABLE_SEQUENCED
    ) {
      const channelBits = stream.readBits(5);
      const orderingVal = stream.readLong();
      if (channelBits === null || orderingVal === null) return null;
    }

    const splitBit = stream.readBit();
    if (splitBit === null) return null;
    const isSplit = splitBit === 1;
    if (isSplit) {
      const splitId = stream.readShort();
      const splitIndex = stream.readCompressedUnsigned(4);
      const splitCount = stream.readCompressedUnsigned(4);
      if (splitId === null || splitIndex === null || splitCount === null) return null;
    }

    const lengthBits = stream.readCompressedUnsigned(2);
    if (lengthBits === null) return null;
    stream.alignRead();
    if (lengthBits > stream.remainingBits()) {
      return null;
    }

    const innerStream = new RakBitStream();
    for (let i = 0; i < lengthBits; i += 1) {
      const bit = stream.readBit();
      if (bit === null) return null;
      innerStream.writeBit(bit === 1);
    }

    const innerBytes = Math.ceil(lengthBits / 8);
    const innerData = innerStream.data.subarray(0, innerBytes);
    packets.push({ innerData, reliability });
  }

  return packets.length > 0 ? packets : null;
};

class TestClient {
  private socket: dgram.Socket;
  private serverAddress: string;
  private serverPort: number;
  private packetLogger: PacketLogger;
  private connectionId: number;
  private loginAuthEnabled: boolean;
  private loginAuthUsername: string;
  private loginAuthPasswordHash: string;
  private loginAuthLoginToken: string;
  private loginAuthMacAddress: string;
  private loginAuthComputerName: string;
  private loginAuthDriveModels: string[];
  private loginAuthDriveSerials: string[];
  private loginAuthFileCRCs: [number, number, number];
  private loginAuthSteamTicket?: Buffer;
  private loginAuthSteamTicketLength?: number;
  private loginAuthWrapReliable: boolean;
  private loginAuthReliable?: { timestamp?: number; messageNumber?: number; orderingFlags?: number; lengthInfo?: number };
  private loginAuthSent: boolean;
  private loginAuthPass: string;
  private worldLoginWorldId: number;
  private worldLoginWorldInst: number;
  private worldLoginPlayerId: number;
  private worldLoginWorldConst: number;
  private worldLoginTarget?: { address: string; port: number };
  private worldLoginPending: boolean;
  private worldLoginLastSelectKey?: string;
  private worldLoginRetryTimer?: NodeJS.Timeout;
  private worldSocket?: dgram.Socket;
  private worldConnectionId: number;
  private worldConnectActive: boolean;
  private worldOpenSent: boolean;
  private worldLoginSentToWorld: boolean;
  private worldConnectTimer?: NodeJS.Timeout;
  private worldGuid: Buffer;
  private worldSeed: Buffer;
  private worldProtocolVersion: number;
  private worldLithOutSeq: number;
  private worldConnectStageSent: boolean;
  private worldPingTimer?: NodeJS.Timeout;
  private worldYourId: number | null;
  private worldClientObjectId: number | null;
  private worldNetProtocol: { version: number; extra: number } | null;
  private worldUnguaranteedLog: boolean;
  private worldUnguaranteedLogIntervalMs: number;
  private worldUnguaranteedLogLast: number;

  constructor(
    serverAddress: string,
    serverPort: number,
    packetLogger: PacketLogger,
    connectionId: number = 1,
    loginAuth?: {
      enabled: boolean;
      username?: string;
      password?: string;
      passwordHash?: string;
      loginToken?: string;
      macAddress?: string;
      computerName?: string;
      driveModels?: string[];
      driveSerialNumbers?: string[];
      fileCRCs?: [number, number, number];
      steamTicket?: Buffer;
      steamTicketLength?: number;
      wrapReliable?: boolean;
      reliable?: { timestamp?: number; messageNumber?: number; orderingFlags?: number; lengthInfo?: number };
    },
    worldLogin?: {
      worldId?: number;
      worldInst?: number;
      playerId?: number;
      worldConst?: number;
    },
    worldNet?: {
      guid?: Buffer;
      seed?: Buffer;
      protocolVersion?: number;
      connectionId?: number;
    },
  ) {
    this.socket = dgram.createSocket('udp4');
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
    this.packetLogger = packetLogger;
    this.connectionId = connectionId;
    this.loginAuthEnabled = loginAuth?.enabled ?? false;
    this.loginAuthUsername = loginAuth?.username ?? '';
    this.loginAuthPasswordHash = loginAuth?.passwordHash ?? '';
    this.loginAuthLoginToken = loginAuth?.loginToken ?? '';
    this.loginAuthMacAddress = loginAuth?.macAddress ?? '';
    this.loginAuthComputerName = loginAuth?.computerName ?? '';
    this.loginAuthDriveModels = loginAuth?.driveModels ?? [];
    this.loginAuthDriveSerials = loginAuth?.driveSerialNumbers ?? [];
    this.loginAuthFileCRCs = loginAuth?.fileCRCs ?? [0, 0, 0];
    this.loginAuthSteamTicket = loginAuth?.steamTicket;
    this.loginAuthSteamTicketLength = loginAuth?.steamTicketLength;
    this.loginAuthWrapReliable = loginAuth?.wrapReliable ?? true;
    this.loginAuthReliable = loginAuth?.reliable;
    this.loginAuthSent = false;
    this.loginAuthPass = loginAuth?.password ?? '';
    this.worldLoginWorldId = worldLogin?.worldId ?? 0;
    this.worldLoginWorldInst = worldLogin?.worldInst ?? 0;
    this.worldLoginPlayerId = worldLogin?.playerId ?? 0;
    this.worldLoginWorldConst = worldLogin?.worldConst ?? 0x13bc52;
    this.worldLoginPending = false;
    this.worldConnectionId = worldNet?.connectionId ?? (this.connectionId + 1);
    this.worldConnectActive = false;
    this.worldOpenSent = false;
    this.worldLoginSentToWorld = false;
    this.worldGuid = worldNet?.guid ?? DEFAULT_GUID_SEED.guid;
    this.worldSeed = worldNet?.seed ?? DEFAULT_GUID_SEED.seed;
    this.worldProtocolVersion = worldNet?.protocolVersion ?? OPEN_CONNECTION_PROTOCOL_VERSION;
    this.worldLithOutSeq = 0;
    this.worldConnectStageSent = false;
    this.worldYourId = null;
    this.worldClientObjectId = null;
    this.worldNetProtocol = null;
    this.worldUnguaranteedLog = parseBool(
      process.env.FOM_WORLD_UNGUARANTEED_LOG ?? process.env.FOM_LOG_UNGUARANTEED,
      false,
    );
    this.worldUnguaranteedLogIntervalMs = Math.max(
      0,
      parseInt(
        process.env.FOM_WORLD_UNGUARANTEED_LOG_MS ??
          process.env.FOM_LOG_UNGUARANTEED_MS ??
          '5000',
        10,
      ) || 5000,
    );
    this.worldUnguaranteedLogLast = 0;
    
    this.socket.on('message', (msg, rinfo) => {
      this.logIncoming(msg, rinfo.address, rinfo.port, this.connectionId);
      this.tryAutoLoginAuth(msg);
      this.tryAutoWorldLogin(msg);
    });

    this.socket.on('error', (err) => {
      PacketLogger.globalNote(`[Error] client socket ${err.message}`);
      console.error('Socket error:', err);
    });
  }

  private logIncoming(data: Buffer, address: string, port: number, connectionId: number): void {
    const incoming = {
      timestamp: new Date(),
      direction: PacketDirection.INCOMING,
      address,
      port,
      data,
      connectionId,
    };
    const logged = this.packetLogger.log(incoming);
    this.packetLogger.logAnalysis(incoming, logged);
  }

  private logOutgoing(data: Buffer, address: string, port: number, connectionId: number = this.connectionId): void {
    const outgoing = {
      timestamp: new Date(),
      direction: PacketDirection.OUTGOING,
      address,
      port,
      data,
      connectionId,
    };
    const logged = this.packetLogger.log(outgoing);
    this.packetLogger.logAnalysis(outgoing, logged);
  }

  private hexDump(buffer: Buffer): void {
    const bytesPerLine = 16;
    for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
      const slice = buffer.subarray(offset, Math.min(offset + bytesPerLine, buffer.length));
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(slice).map(b => (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : '.').join('');
      console.log(`  ${offset.toString(16).padStart(4, '0')}  ${hex.padEnd(47)}  |${ascii}|`);
    }
  }

  private analyzeResponse(data: Buffer): void {
    if (data.length < 4) return;
    
    const firstDword = data.readUInt32LE(0);
    if (firstDword === CONNECTION_MAGIC) {
      console.log('\n  → Response contains Connection Magic');
      if (data.length > 4) {
        const typeBits = data[4] & 0x07;
        console.log(`  → Response Type: ${typeBits}`);
      }
    }
  }

  private extractLoginPayload(data: Buffer): Buffer | null {
    if (data.length === 0) return null;
    const first = data[0];
    if ((first & 0x80) === 0x80 && (first & 0x40) === 0) {
      return null;
    }
    if ((first & 0x40) === 0x40) {
      if (data.length <= 17) return null;
      return data.subarray(17);
    }
    return data;
  }

  private decodeLoginRequestReturnPayload(inner: Buffer): { status: number; username: string } | null {
    if (!inner || inner.length === 0) return null;
    try {
      const stream = new RakBitStream(inner);
      let packetId = stream.readByte();
      if (packetId === RakNetMessageId.ID_TIMESTAMP) {
        if (stream.remainingReadBits() < 64) return null;
        stream.readLongLong();
        packetId = stream.readByte();
      }
      if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) return null;

      const statusStream = stream.readCompressed(1);
      const status = statusStream.readByte();
      const username = readCompressedString(stream, 2048);
      return { status, username };
    } catch {
      return null;
    }
  }

  private scanForLoginRequestReturn(inner: Buffer, maxHits: number = 2): { status: number; username: string } | null {
    if (!inner || inner.length === 0) return null;
    let hits = 0;
    for (let i = 0; i < inner.length; i += 1) {
      if (inner[i] !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) continue;
      const decoded = this.decodeLoginRequestReturnPayload(inner.subarray(i));
      if (decoded) return decoded;
      hits += 1;
      if (hits >= maxHits) break;
    }
    return null;
  }

  private decodeLoginRequestReturn(data: Buffer): { status: number; username: string } | null {
    const payload = this.extractLoginPayload(data);
    if (payload && payload.length > 0) {
      let inner = payload;
      if (inner[0] === 0x80 && inner.length > 5) {
        inner = inner.subarray(5);
      }
      const direct = this.decodeLoginRequestReturnPayload(inner);
      if (direct) return direct;
    }

    const inners = this.extractReliablePackets(data);
    if (inners) {
      for (const buf of inners) {
        if (!buf || buf.length === 0) continue;
        const innerPayload = this.extractLoginPayload(buf) ?? buf;
        let inner = innerPayload;
        if (inner[0] === 0x80 && inner.length > 5) {
          inner = inner.subarray(5);
        }
        const decoded = this.decodeLoginRequestReturnPayload(inner);
        if (decoded) return decoded;
      }
    }

    if (payload && payload.length > 0) {
      let inner = payload;
      if (inner[0] === 0x80 && inner.length > 5) {
        inner = inner.subarray(5);
      }
      const scanned = this.scanForLoginRequestReturn(inner);
      if (scanned) return scanned;
    }

    return null;
  }

  private decodeLoginReturnPayload(inner: Buffer): { status: number; playerId: number } | null {
    if (!inner || inner.length === 0) return null;
    try {
      const stream = new RakBitStream(inner);
      let packetId = stream.readByte();
      if (packetId === RakNetMessageId.ID_TIMESTAMP) {
        if (stream.remainingReadBits() < 64) return null;
        stream.readLongLong();
        packetId = stream.readByte();
      }
      if (packetId !== RakNetMessageId.ID_LOGIN_RETURN) return null;

      const statusStream = stream.readCompressed(1);
      const status = statusStream.readByte();
      const playerId = this.readCompressedUInt(stream, 4);
      return { status, playerId };
    } catch {
      return null;
    }
  }

  private scanForLoginReturn(inner: Buffer, maxHits: number = 2): { status: number; playerId: number } | null {
    if (!inner || inner.length === 0) return null;
    let hits = 0;
    for (let i = 0; i < inner.length; i += 1) {
      if (inner[i] !== RakNetMessageId.ID_LOGIN_RETURN) continue;
      const decoded = this.decodeLoginReturnPayload(inner.subarray(i));
      if (decoded) return decoded;
      hits += 1;
      if (hits >= maxHits) break;
    }
    return null;
  }

  private decodeLoginReturn(data: Buffer): { status: number; playerId: number } | null {
    const payload = this.extractLoginPayload(data);
    if (payload && payload.length > 0) {
      let inner = payload;
      if (inner[0] === 0x80 && inner.length > 5) {
        inner = inner.subarray(5);
      }
      const direct = this.decodeLoginReturnPayload(inner);
      if (direct) return direct;
    }

    const inners = this.extractReliablePackets(data);
    if (inners) {
      for (const buf of inners) {
        if (!buf || buf.length === 0) continue;
        const innerPayload = this.extractLoginPayload(buf) ?? buf;
        let inner = innerPayload;
        if (inner[0] === 0x80 && inner.length > 5) {
          inner = inner.subarray(5);
        }
        const decoded = this.decodeLoginReturnPayload(inner);
        if (decoded) return decoded;
      }
    }

    if (payload && payload.length > 0) {
      let inner = payload;
      if (inner[0] === 0x80 && inner.length > 5) {
        inner = inner.subarray(5);
      }
      const scanned = this.scanForLoginReturn(inner);
      if (scanned) return scanned;
    }

    return null;
  }

  private readCompressedUInt(stream: RakBitStream, size: number): number {
    const comp = stream.readCompressed(size);
    let value = 0;
    let factor = 1;
    for (let i = 0; i < size; i += 1) {
      value += comp.readByte() * factor;
      factor *= 256;
    }
    return value >>> 0;
  }

  private ipv4FromU32BE(value: number): string {
    const b0 = (value >>> 24) & 0xff;
    const b1 = (value >>> 16) & 0xff;
    const b2 = (value >>> 8) & 0xff;
    const b3 = value & 0xff;
    return `${b0}.${b1}.${b2}.${b3}`;
  }

  private decodeWorldSelect(data: Buffer): { subId: number; playerId: number; worldId?: number; worldInst?: number } | null {
    const payload = this.extractLoginPayload(data);
    if (!payload || payload.length === 0) return null;

    let inner = payload;
    if (inner[0] === 0x80 && inner.length > 5) {
      inner = inner.subarray(5);
    }

    const stream = new RakBitStream(inner);
    let packetId = stream.readByte();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      if (stream.remainingReadBits() < 64) return null;
      stream.readLongLong();
      packetId = stream.readByte();
    }
    if (packetId !== 0x7b) return null;

    const playerId = this.readCompressedUInt(stream, 4);
    const subId = this.readCompressedUInt(stream, 1) & 0xff;
    if (subId === 4 || subId === 7) {
      const worldId = this.readCompressedUInt(stream, 1) & 0xff;
      const worldInst = this.readCompressedUInt(stream, 1) & 0xff;
      return { subId, playerId, worldId, worldInst };
    }
    return { subId, playerId };
  }

  private decodeWorldLoginReturn(data: Buffer): { code: number; flag: number; worldIp: string; worldPort: number } | null {
    const payload = this.extractLoginPayload(data);
    if (!payload || payload.length === 0) return null;

    let inner = payload;
    if (inner[0] === 0x80 && inner.length > 5) {
      inner = inner.subarray(5);
    }

    const stream = new RakBitStream(inner);
    let packetId = stream.readByte();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      if (stream.remainingReadBits() < 64) return null;
      stream.readLongLong();
      packetId = stream.readByte();
    }
    if (packetId !== RakNetMessageId.ID_WORLD_LOGIN_RETURN) return null;

    const code = this.readCompressedUInt(stream, 1) & 0xff;
    const flag = this.readCompressedUInt(stream, 1) & 0xff;
    const worldIpU32 = this.readCompressedUInt(stream, 4);
    const worldPort = this.readCompressedUInt(stream, 2) & 0xffff;
    const worldIp = this.ipv4FromU32BE(worldIpU32);
    return { code, flag, worldIp, worldPort };
  }

  private extractReliablePackets(data: Buffer): Buffer[] | null {
    const legacyPackets = parseLegacyReliable(data) ?? [];
    const raknetPackets = parseRakNetBitAligned(data) ?? [];
    if (legacyPackets.length === 0 && raknetPackets.length === 0) return null;

    if (legacyPackets.length === 0) {
      return raknetPackets.map((pkt) => pkt.innerData).filter((buf) => buf.length > 0);
    }
    if (raknetPackets.length === 0) {
      return legacyPackets.map((pkt) => pkt.innerData).filter((buf) => buf.length > 0);
    }

    const legacyScore = bestScore(legacyPackets);
    const raknetScore = bestScore(raknetPackets);
    const preferLegacy = (data[0] & 0x40) === 0x40;
    const chosen =
      raknetScore > legacyScore + 2
        ? raknetPackets
        : legacyScore > raknetScore + 2
          ? legacyPackets
          : preferLegacy
            ? legacyPackets
            : raknetPackets;
    return chosen.map((pkt) => pkt.innerData).filter((buf) => buf.length > 0);
  }

  private readLithSizeIndicator(reader: BitStreamReader): number {
    let result = reader.readBits(7);
    const above7f = reader.readBool();
    if (!above7f) return result;
    result |= reader.readBits(3) << 7;
    const above7 = reader.readBool();
    if (!above7) return result;
    let mask = 1 << 10;
    do {
      if (reader.readBool()) {
        result |= mask;
      }
      mask <<= 1;
    } while (reader.readBool());
    return result >>> 0;
  }

  private readLithBitsToBuffer(reader: BitStreamReader, bits: number): Buffer {
    const bytes = Buffer.alloc(Math.ceil(bits / 8));
    let remaining = bits;
    for (let i = 0; i < bytes.length; i += 1) {
      const take = Math.min(8, remaining);
      bytes[i] = take > 0 ? reader.readBits(take) : 0;
      remaining -= take;
    }
    return bytes;
  }

  private skipLithBits(reader: BitStreamReader, bits: number): void {
    let remaining = bits;
    while (remaining > 0) {
      const take = Math.min(32, remaining);
      reader.readBits(take);
      remaining -= take;
    }
  }

  private parseLithTechGuaranteedSubMessages(data: Buffer): Array<{ msgId: number; payload: Buffer; payloadBits: number }> {
    const messages: Array<{ msgId: number; payload: Buffer; payloadBits: number }> = [];
    if (data.length < 2) return messages;
    const reader = new BitStreamReader(data);
    reader.readBits(13); // sequence
    reader.readBits(1); // continuation
    let lastPacket = false;
    let safety = 0;
    const maxPackets = Math.max(4, data.length);

    while (!lastPacket && reader.remainingBits > 0 && safety < maxPackets) {
      safety += 1;
      const subBits = this.readLithSizeIndicator(reader);
      if (subBits === 0) {
        if (reader.remainingBits < 1) break;
        lastPacket = !reader.readBool();
        if (lastPacket) break;
        continue;
      }
      if (subBits < 8 || subBits > reader.remainingBits) break;
      const subStart = reader.position;
      const subReader = new BitStreamReader(data, subStart);
      const msgId = subReader.readBits(8);
      const payloadBits = Math.max(0, subBits - 8);
      const payload = payloadBits > 0 ? this.readLithBitsToBuffer(subReader, payloadBits) : Buffer.alloc(0);
      messages.push({ msgId, payload, payloadBits });
      this.skipLithBits(reader, subBits);
      if (reader.remainingBits < 1) break;
      lastPacket = !reader.readBool();
    }
    return messages;
  }

  private decodeLoadWorldPayload(payload: Buffer): { gameTime: number; worldId: number } | null {
    if (payload.length < 6) return null;
    const reader = new BitStreamReader(payload);
    const timeBytes = reader.readBytes(4);
    const gameTime = timeBytes.readFloatLE(0);
    const worldId = reader.readUInt16();
    return { gameTime, worldId };
  }

  private decodeUnguaranteedUpdatePayload(
    payload: Buffer,
  ): { terminator: boolean; flags: number; gameTime?: number } | null {
    const reader = new BitStreamReader(payload);
    if (reader.remainingBits < 20) return null;
    const objId = reader.readUInt16();
    const flags = reader.readBits(4);
    if (objId === 0xffff) {
      if (reader.remainingBits < 32) return { terminator: true, flags };
      const timeBytes = reader.readBytes(4);
      const gameTime = timeBytes.readFloatLE(0);
      return { terminator: true, flags, gameTime };
    }
    return { terminator: false, flags };
  }

  private shouldLogWorldUnguaranteed(now: number): boolean {
    if (!this.worldUnguaranteedLog) return false;
    if (this.worldUnguaranteedLogIntervalMs <= 0) return true;
    if (now - this.worldUnguaranteedLogLast < this.worldUnguaranteedLogIntervalMs) {
      return false;
    }
    this.worldUnguaranteedLogLast = now;
    return true;
  }

  private decodeNetProtocolPayload(payload: Buffer): { version: number; extra: number } | null {
    if (payload.length < 8) return null;
    const reader = new BitStreamReader(payload);
    const version = reader.readUInt32();
    const extra = reader.readUInt32();
    return { version, extra };
  }

  private decodeYourIdPayload(payload: Buffer): { id: number; flags: number } | null {
    if (payload.length < 3) return null;
    const reader = new BitStreamReader(payload);
    const id = reader.readUInt16();
    const flags = reader.readBits(8);
    return { id, flags };
  }

  private decodeClientObjectIdPayload(payload: Buffer): { id: number } | null {
    if (payload.length < 2) return null;
    const reader = new BitStreamReader(payload);
    const id = reader.readUInt16();
    return { id };
  }

  private writeLithBits(writer: BitStreamWriter, payload: Buffer, payloadBits: number): void {
    const reader = new BitStreamReader(payload);
    let remaining = payloadBits;
    while (remaining > 0) {
      const take = Math.min(32, remaining);
      writer.writeBits(reader.readBits(take), take);
      remaining -= take;
    }
  }

  private buildLithTechGuaranteedPacket(subMessages: Array<{ msgId: number; payload: Buffer; payloadBits: number }>): Buffer {
    const writer = new BitStreamWriter(128);
    const seq = this.worldLithOutSeq & SEQUENCE_MASK;
    this.worldLithOutSeq = (seq + 1) & SEQUENCE_MASK;
    writer.writeBits(seq, 13);
    writer.writeBits(0, 1); // no continuation
    for (let i = 0; i < subMessages.length; i += 1) {
      const msg = subMessages[i];
      const subBits = msg.payloadBits + 8;
      writer.writeBits(subBits, 8);
      writer.writeBits(msg.msgId & 0xff, 8);
      if (msg.payloadBits > 0) {
        this.writeLithBits(writer, msg.payload, msg.payloadBits);
      }
      const hasMore = i < subMessages.length - 1;
      writer.writeBits(hasMore ? 1 : 0, 1);
    }
    writer.writeBits(0, 8);
    return writer.toBuffer();
  }

  private sendConnectStage(stage: number): void {
    if (!this.worldSocket || !this.worldLoginTarget) return;
    if (this.worldConnectStageSent) return;
    this.worldConnectStageSent = true;
    const payloadWriter = new BitStreamWriter(16);
    payloadWriter.writeBits(stage & 0xffff, 16);
    const payload = payloadWriter.toBuffer();
    const lith = this.buildLithTechGuaranteedPacket([
      { msgId: LithTechMessageId.MSG_CONNECTSTAGE, payload, payloadBits: 16 },
    ]);
    const packet = wrapFomReliablePacket(lith);
    this.logOutgoing(packet, this.worldLoginTarget.address, this.worldLoginTarget.port, this.worldConnectionId);
    this.worldSocket.send(packet, this.worldLoginTarget.port, this.worldLoginTarget.address, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  private startWorldHeartbeat(): void {
    if (!this.worldSocket || !this.worldLoginTarget) return;
    if (this.worldPingTimer) return;
    this.worldPingTimer = setInterval(() => {
      if (!this.worldSocket || !this.worldLoginTarget) return;
      const ping = Buffer.alloc(5);
      ping[0] = RakNetMessageId.ID_PING;
      ping.writeUInt32BE((Date.now() >>> 0), 1);
      this.logOutgoing(ping, this.worldLoginTarget.address, this.worldLoginTarget.port, this.worldConnectionId);
      this.worldSocket.send(ping, this.worldLoginTarget.port, this.worldLoginTarget.address, (err) => {
        if (err) console.error('Send error:', err);
      });
    }, 3000);
  }

  private initWorldSocket(): void {
    if (this.worldSocket) return;
    this.worldSocket = dgram.createSocket('udp4');
    this.worldSocket.on('message', (msg, rinfo) => {
      this.logIncoming(msg, rinfo.address, rinfo.port, this.worldConnectionId);
      this.handleWorldMessage(msg, rinfo.address, rinfo.port);
    });
    this.worldSocket.on('error', (err) => {
      PacketLogger.globalNote(`[Error] world socket ${err.message}`);
      console.error('World socket error:', err);
    });
  }

  private handleWorldMessage(data: Buffer, address: string, port: number): void {
    if (data.length === 0) return;
    const first = data[0];
    if (first === RakNetMessageId.ID_OPEN_CONNECTION_REPLY) {
      this.sendWorldLoginToWorld();
      this.startWorldHeartbeat();
      return;
    }
    const inners = this.extractReliablePackets(data);
    if (!inners) return;
    for (const inner of inners) {
      if (inner.length === 0) continue;
      if (inner[0] === RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) {
        const parsed = this.parseFileListTransfer(inner);
        if (parsed) {
          const preview = parsed.names.length > 0 ? ` preview=${parsed.names.join(',')}` : '';
          PacketLogger.globalNote(
            `[World] FileList 0x32 entries=${parsed.ids.length}${preview}`,
            true,
          );
          this.sendFileListAck(parsed.ids, address, port);
          continue;
        }
      }
      const messages = this.parseLithTechGuaranteedSubMessages(inner);
      for (const msg of messages) {
        if (msg.msgId === LithTechMessageId.MSG_NETPROTOCOLVERSION) {
          const decoded = this.decodeNetProtocolPayload(msg.payload);
          if (decoded) {
            this.worldNetProtocol = decoded;
            PacketLogger.globalNote(
              `[World] SMSG_NETPROTOCOLVERSION version=${decoded.version} extra=${decoded.extra}`,
              true,
            );
          }
          continue;
        }
        if (msg.msgId === LithTechMessageId.MSG_YOURID) {
          const decoded = this.decodeYourIdPayload(msg.payload);
          if (decoded) {
            this.worldYourId = decoded.id;
            PacketLogger.globalNote(
              `[World] SMSG_YOURID id=${decoded.id} flags=${decoded.flags}`,
              true,
            );
          }
          continue;
        }
        if (msg.msgId === LithTechMessageId.MSG_CLIENTOBJECTID) {
          const decoded = this.decodeClientObjectIdPayload(msg.payload);
          if (decoded) {
            this.worldClientObjectId = decoded.id;
            PacketLogger.globalNote(
              `[World] SMSG_CLIENTOBJECTID id=${decoded.id}`,
              true,
            );
          }
          continue;
        }
        if (msg.msgId === LithTechMessageId.MSG_LOADWORLD) {
          const decoded = this.decodeLoadWorldPayload(msg.payload);
          if (decoded) {
            PacketLogger.globalNote(
              `[World] SMSG_LOADWORLD worldId=${decoded.worldId} gameTime=${decoded.gameTime}`,
              true,
            );
          }
          this.sendConnectStage(0);
          continue;
        }
        if (msg.msgId === LithTechMessageId.MSG_UNGUARANTEEDUPDATE) {
          const decoded = this.decodeUnguaranteedUpdatePayload(msg.payload);
          if (decoded && this.shouldLogWorldUnguaranteed(Date.now())) {
            const timeNote =
              decoded.terminator && typeof decoded.gameTime === 'number'
                ? ` time=${decoded.gameTime.toFixed(3)}`
                : '';
            PacketLogger.globalNote(
              `[World] SMSG_UNGUARANTEEDUPDATE end=${decoded.terminator ? 1 : 0} flags=0x${decoded.flags.toString(
                16,
              )}${timeNote}`,
              true,
            );
          }
        }
      }
    }
  }

  private parseFileListTransfer(inner: Buffer): { ids: number[]; names: string[] } | null {
    if (inner.length < 2 || inner[0] !== RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) return null;
    const reader = new BitStreamReader(inner);
    const msgId = reader.readByte();
    if (msgId !== RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) return null;
    const ids: number[] = [];
    const names: string[] = [];
    let safety = 0;
    const maxEntries = Math.max(4, Math.floor(inner.length / 4));

    while (reader.remainingBits >= 16 && safety < maxEntries) {
      safety += 1;
      const fileId = reader.readUInt16();
      if (reader.remainingBits < 32) break;
      reader.readUInt32(); // size (unused by test client)
      const chars: number[] = [];
      while (reader.remainingBits >= 8) {
        const byte = reader.readByte();
        if (byte === 0) break;
        chars.push(byte);
        if (chars.length > 1024) break;
      }
      ids.push(fileId & 0x7fff);
      if (names.length < 4 && chars.length > 0) {
        names.push(Buffer.from(chars).toString('ascii'));
      }
    }

    return ids.length > 0 ? { ids, names } : null;
  }

  private sendFileListAck(ids: number[], address: string, port: number): void {
    if (!this.worldSocket) return;
    const writer = new BitStreamWriter(Math.max(8, 1 + ids.length * 2));
    writer.writeByte(RakNetMessageId.ID_FILE_LIST_TRANSFER_RESPONSE);
    for (const id of ids) {
      writer.writeUInt16(id & 0x7fff);
    }
    const payload = writer.toBuffer();
    const packet = wrapFomReliablePacket(payload);
    this.logOutgoing(packet, address, port, this.worldConnectionId);
    this.worldSocket.send(packet, port, address, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  private sendOpenConnectionRequestTo(
    address: string,
    port: number,
    socket: dgram.Socket,
    connectionId: number,
  ): void {
    const packet = buildOpenConnectionRequest({
      targetIp: address,
      targetPort: port,
      guid: this.worldGuid,
      seed: this.worldSeed,
      protocolVersion: this.worldProtocolVersion,
    });
    this.logOutgoing(packet, address, port, connectionId);
    socket.send(packet, port, address, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  private sendWorldLoginTo(
    address: string,
    port: number,
    socket: dgram.Socket,
    connectionId: number,
  ): void {
    const payload = buildWorldLogin({
      worldId: this.worldLoginWorldId,
      worldInst: this.worldLoginWorldInst,
      playerId: this.worldLoginPlayerId,
      worldConst: this.worldLoginWorldConst,
    });
    const packet = wrapFomReliablePacket(payload);
    this.logOutgoing(packet, address, port, connectionId);
    socket.send(packet, port, address, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  connectWorldDirect(address: string, port: number): void {
    this.startWorldConnection({ address, port });
  }

  sendLoginAuth(options: {
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
    wrapReliable?: boolean;
    reliable?: { timestamp?: number; messageNumber?: number; orderingFlags?: number; lengthInfo?: number };
  }): void {
    const payload = buildLoginAuth({
      username: options.username ?? '',
      passwordHash: options.passwordHash,
      fileCRCs: options.fileCRCs,
      macAddress: options.macAddress,
      driveModels: options.driveModels,
      driveSerialNumbers: options.driveSerialNumbers,
      loginToken: options.loginToken,
      computerName: options.computerName,
      steamTicket: options.steamTicket,
      steamTicketLength: options.steamTicketLength,
    });
    const packet = options.wrapReliable === false ? payload : wrapFomReliablePacket(payload, options.reliable);
    this.logOutgoing(packet, this.serverAddress, this.serverPort);
    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  private sendWorldLogin(): void {
    this.sendWorldLoginTo(this.serverAddress, this.serverPort, this.socket, this.connectionId);
  }

  private scheduleWorldLoginRetry(delayMs: number): void {
    if (this.worldLoginRetryTimer) {
      clearTimeout(this.worldLoginRetryTimer);
    }
    this.worldLoginRetryTimer = setTimeout(() => {
      if (this.worldLoginPending) {
        this.sendWorldLogin();
      }
    }, delayMs);
  }

  private scheduleWorldLoginToWorld(delayMs: number): void {
    if (this.worldConnectTimer) {
      clearTimeout(this.worldConnectTimer);
    }
    this.worldConnectTimer = setTimeout(() => {
      this.sendWorldLoginToWorld();
    }, delayMs);
  }

  private sendWorldLoginToWorld(): void {
    if (!this.worldSocket || !this.worldLoginTarget) return;
    if (this.worldLoginSentToWorld) return;
    this.worldLoginSentToWorld = true;
    this.sendWorldLoginTo(
      this.worldLoginTarget.address,
      this.worldLoginTarget.port,
      this.worldSocket,
      this.worldConnectionId,
    );
  }

  private startWorldConnection(target: { address: string; port: number }): void {
    this.initWorldSocket();
    if (!this.worldSocket) return;
    if (this.worldConnectActive && this.worldLoginTarget) {
      if (
        this.worldLoginTarget.address === target.address &&
        this.worldLoginTarget.port === target.port
      ) {
        return;
      }
    }
    this.worldLoginTarget = target;
    this.worldConnectActive = true;
    this.worldOpenSent = false;
    this.worldLoginSentToWorld = false;
    this.worldConnectStageSent = false;
    this.worldLithOutSeq = 0;
    PacketLogger.globalNote(`[WorldConnect] open ${target.address}:${target.port}`, true);
    this.sendOpenConnectionRequestTo(
      target.address,
      target.port,
      this.worldSocket,
      this.worldConnectionId,
    );
    this.worldOpenSent = true;
    this.scheduleWorldLoginToWorld(500);
  }

  private tryAutoLoginAuth(data: Buffer): void {
    if (!this.loginAuthEnabled) return;
    const decoded = this.decodeLoginRequestReturn(data);
    if (!decoded || decoded.status !== 1) return;
    if (this.loginAuthSent) return;
    const passwordHash =
      this.loginAuthPasswordHash ||
      (this.loginAuthPass ? buildLoginAuthSession(this.loginAuthPass, '') : '');
    this.loginAuthSent = true;
    this.sendLoginAuth({
      username: this.loginAuthUsername || decoded.username,
      passwordHash,
      macAddress: this.loginAuthMacAddress,
      loginToken: this.loginAuthLoginToken,
      computerName: this.loginAuthComputerName,
      driveModels: this.loginAuthDriveModels,
      driveSerialNumbers: this.loginAuthDriveSerials,
      fileCRCs: this.loginAuthFileCRCs,
      steamTicket: this.loginAuthSteamTicket,
      steamTicketLength: this.loginAuthSteamTicketLength,
      wrapReliable: this.loginAuthWrapReliable,
      reliable: this.loginAuthReliable,
    });
  }

  private tryAutoWorldLogin(data: Buffer): void {
    const loginReturn = this.decodeLoginReturn(data);
    if (loginReturn && loginReturn.status === 1) {
      if (loginReturn.playerId > 0 && this.worldLoginPlayerId === 0) {
        this.worldLoginPlayerId = loginReturn.playerId;
      }
      if (this.worldLoginWorldId > 0 && !this.worldLoginPending) {
        this.worldLoginPending = true;
        this.sendWorldLogin();
      }
    }

    const select = this.decodeWorldSelect(data);
    if (select && select.subId === 4) {
      const worldId = select.worldId ?? 0;
      const worldInst = select.worldInst ?? 0;
      const playerId = select.playerId ?? 0;
      if (this.worldLoginPlayerId !== 0 && playerId !== this.worldLoginPlayerId) {
        return;
      }
      const selectKey = `${playerId}:${worldId}:${worldInst}`;
      if (selectKey !== this.worldLoginLastSelectKey) {
        this.worldLoginLastSelectKey = selectKey;
        this.worldLoginWorldId = worldId;
        this.worldLoginWorldInst = worldInst;
        this.worldLoginPlayerId = playerId;
        this.worldLoginPending = true;
        this.sendWorldLogin();
      }
    }

    const decoded = this.decodeWorldLoginReturn(data);
    if (!decoded) return;
    const { code, worldIp, worldPort } = decoded;
    if (!worldIp || worldIp === '0.0.0.0' || worldPort <= 0) return;

    const target = { address: worldIp, port: worldPort };
    this.worldLoginTarget = target;

    if (code === 8) {
      this.scheduleWorldLoginRetry(5000);
      return;
    }
    if (code === 1) {
      this.worldLoginPending = false;
      this.startWorldConnection(target);
    }
  }

  sendConnectionRequest(): void {
    const writer = new BitStreamWriter(256);
    
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.CONNECT, 3);
    
    const fakeGuid = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      writer.writeByte(fakeGuid[i]);
    }
    
    const packet = writer.toBuffer();
    this.logOutgoing(packet, this.serverAddress, this.serverPort);
    
    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  sendQuery(): void {
    const writer = new BitStreamWriter(64);
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.QUERY, 3);
    
    const packet = writer.toBuffer();
    this.logOutgoing(packet, this.serverAddress, this.serverPort);
    
    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  sendOpenConnectionRequest(options: {
    targetIp: string;
    targetPort: number;
    guid: Buffer;
    seed: Buffer;
    protocolVersion: number;
  }): void {
    const packet = buildOpenConnectionRequest(options);
    this.logOutgoing(packet, this.serverAddress, this.serverPort, this.connectionId);

    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  sendLoginRequest(options: {
    username: string;
    clientVersion: number;
    wrapReliable?: boolean;
    reliable?: { timestamp?: number; messageNumber?: number; orderingFlags?: number; lengthInfo?: number };
  }): void {
    this.loginAuthSent = false;
    const payload = buildLoginRequestInner(options);
    const packet = options.wrapReliable === false ? payload : wrapFomReliablePacket(payload, options.reliable);
    this.logOutgoing(packet, this.serverAddress, this.serverPort);

    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  sendRawPacket(data: Buffer): void {
    this.logOutgoing(data, this.serverAddress, this.serverPort);
    
    this.socket.send(data, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
    });
  }

  close(): void {
    this.packetLogger.close();
    this.socket.close();
    if (this.worldSocket) {
      this.worldSocket.close();
      this.worldSocket = undefined;
    }
    if (this.worldLoginRetryTimer) {
      clearTimeout(this.worldLoginRetryTimer);
      this.worldLoginRetryTimer = undefined;
    }
    if (this.worldConnectTimer) {
      clearTimeout(this.worldConnectTimer);
      this.worldConnectTimer = undefined;
    }
    if (this.worldPingTimer) {
      clearInterval(this.worldPingTimer);
      this.worldPingTimer = undefined;
    }
  }
}

async function main() {
  loadEnvCandidates();
  const args = process.argv.slice(2);
  const command = args[0] || 'connect';
  const address = args[1] || '127.0.0.1';
  const port = parseInt(args[2] || String(DEFAULT_PORT), 10);
  const flags = args.slice(3);

  const getFlag = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const hit = flags.find((arg) => arg.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
  };

  const parseHex = (value: string | undefined, expectedBytes: number, label: string, fallback: Buffer): Buffer => {
    const raw = (value && value.length > 0) ? value : fallback.toString('hex');
    const cleaned = raw.replace(/[^a-fA-F0-9]/g, '');
    if (cleaned.length !== expectedBytes * 2) {
      throw new Error(`${label} hex must be ${expectedBytes} bytes (${expectedBytes * 2} hex chars)`);
    }
    return Buffer.from(cleaned, 'hex');
  };

  const parseCsv = (value: string | undefined): string[] => {
    if (!value) return [];
    return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
  };

  const parseU32 = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const base = value.startsWith('0x') || /[a-f]/i.test(value) ? 16 : 10;
    const parsed = Number.parseInt(value, base);
    return Number.isNaN(parsed) ? undefined : (parsed >>> 0);
  };

  const parseU32Block = (value: string | undefined): [number, number, number] => {
    if (!value) return [0, 0, 0];
    const parts = value.split(',').map((v) => parseU32(v.trim()) ?? 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const parseBlob = (value: string | undefined): Buffer | undefined => {
    if (!value) return undefined;
    const cleaned = value.replace(/[^a-fA-F0-9]/g, '');
    if (cleaned.length % 2 !== 0) {
      throw new Error('login ticket hex must be even length');
    }
    const maxBytes = 0x400;
    const byteLen = cleaned.length / 2;
    if (byteLen > maxBytes) {
      throw new Error(`login ticket hex exceeds ${maxBytes} bytes`);
    }
    return Buffer.from(cleaned, 'hex');
  };

  const protocolRaw = parseInt(getFlag('protocol') || `${OPEN_CONNECTION_PROTOCOL_VERSION}`, 10);
  const protocolVersion = Number.isNaN(protocolRaw) ? OPEN_CONNECTION_PROTOCOL_VERSION : protocolRaw;
  const defaultGuid = DEFAULT_GUID_SEED.guid;
  const defaultSeed = DEFAULT_GUID_SEED.seed;
  const guid = parseHex(getFlag('guid'), 16, 'guid', defaultGuid);
  const seed = parseHex(getFlag('seed'), 8, 'seed', defaultSeed);
  const intervalRaw = parseInt(getFlag('interval-ms') || `${RETRY_INTERVAL}`, 10);
    const intervalMs = Number.isNaN(intervalRaw) ? RETRY_INTERVAL : intervalRaw;
  const user = getFlag('user') || process.env.FOM_LOGIN_USER || 'test';
  const clientVersionRaw =
    getFlag('client-version') ||
    process.env.FOM_CLIENT_VERSION ||
    getFlag('token') ||
    process.env.FOM_LOGIN_TOKEN ||
    '0';
  const clientVersionValue = Number.parseInt(
    clientVersionRaw,
    clientVersionRaw.startsWith('0x') || /[a-f]/i.test(clientVersionRaw) ? 16 : 10,
  );
  const clientVersion = Number.isNaN(clientVersionValue) ? 0 : clientVersionValue;
  const loginDelayRaw = getFlag('login') || getFlag('login-delay');
  const loginDelaySec = loginDelayRaw !== undefined ? Number.parseFloat(loginDelayRaw) : NaN;
  const loginDelayMs = Number.isFinite(loginDelaySec) && loginDelaySec > 0 ? Math.round(loginDelaySec * 1000) : 0;
  const loginRaw = parseBool(getFlag('login-raw') || process.env.FOM_LOGIN_RAW, false);
  const loginAuth = parseBool(getFlag('login-auth') || process.env.FOM_LOGIN_AUTH, true);
  const loginPass = getFlag('login-pass') || process.env.FOM_LOGIN_PASS || '';
  const loginUsername =
    getFlag('login-user') || getFlag('login-a') || process.env.FOM_LOGIN_STR_A || user;
  let loginPasswordHash =
    getFlag('login-hash') || getFlag('login-b') || process.env.FOM_LOGIN_STR_B || '';
  if (!loginPasswordHash && loginPass) {
    loginPasswordHash = buildLoginAuthSession(loginPass, '');
  }
  const loginToken =
    getFlag('login-token') || getFlag('login-c') || process.env.FOM_LOGIN_STR_C || '';
  const loginMacAddress =
    getFlag('login-mac') || getFlag('login-f') || process.env.FOM_LOGIN_STR_F || '';
  const loginComputerName =
    getFlag('login-computer') || getFlag('login-g') || process.env.FOM_LOGIN_STR_G || os.hostname();
  const loginDriveModels = parseCsv(
    getFlag('login-drives') || getFlag('login-extra64') || process.env.FOM_LOGIN_EXTRA64,
  );
  const loginDriveSerials = parseCsv(
    getFlag('login-serials') || getFlag('login-extra32') || process.env.FOM_LOGIN_EXTRA32,
  );
  const loginFileCRCs = parseU32Block(
    getFlag('login-crc') || getFlag('login-u32') || process.env.FOM_LOGIN_U32_BLOCK,
  );
  const loginSteamTicket =
    parseBlob(getFlag('login-ticket') || getFlag('login-blob') || process.env.FOM_LOGIN_BLOB_HEX);
  const loginSteamTicketLength = parseU32(
    getFlag('login-ticket-len') || getFlag('login-blob-u32') || process.env.FOM_LOGIN_BLOB_U32,
  );
  const relMsgRaw = getFlag('rel-msg') || process.env.FOM_RELIABLE_MSG_NUM;
  const relFlagsRaw = getFlag('rel-flags') || process.env.FOM_RELIABLE_FLAGS;
  const relLenRaw = getFlag('rel-len') || process.env.FOM_RELIABLE_LEN;
  const relTsRaw = getFlag('rel-ts') || process.env.FOM_RELIABLE_TS;
  const relMsgValue = relMsgRaw ? Number.parseInt(relMsgRaw, relMsgRaw.startsWith('0x') ? 16 : 10) : NaN;
  const relFlagsValue = relFlagsRaw ? Number.parseInt(relFlagsRaw, relFlagsRaw.startsWith('0x') ? 16 : 10) : NaN;
  const relLenValue = relLenRaw ? Number.parseInt(relLenRaw, relLenRaw.startsWith('0x') ? 16 : 10) : NaN;
  const relTsValue = relTsRaw ? Number.parseInt(relTsRaw, relTsRaw.startsWith('0x') ? 16 : 10) : NaN;
  const reliableOptions = {
    messageNumber: Number.isNaN(relMsgValue) ? undefined : relMsgValue,
    orderingFlags: Number.isNaN(relFlagsValue) ? undefined : relFlagsValue,
    lengthInfo: Number.isNaN(relLenValue) ? undefined : relLenValue,
    timestamp: Number.isNaN(relTsValue) ? undefined : relTsValue,
  };

  const worldId =
    parseU32(getFlag('world-id') || process.env.FOM_WORLD_ID || process.env.WORLD_ID);
  const worldInst =
    parseU32(getFlag('world-inst') || process.env.FOM_WORLD_INST || process.env.WORLD_INST);
  const playerId =
    parseU32(getFlag('world-player') || process.env.FOM_PLAYER_ID || process.env.PLAYER_ID);
  const worldConst =
    parseU32(getFlag('world-const') || process.env.FOM_WORLD_CONST || process.env.WORLD_CONST);
  const worldIp = getFlag('world-ip') || process.env.FOM_WORLD_IP || process.env.WORLD_IP;
  const worldPortRaw = getFlag('world-port') || process.env.FOM_WORLD_PORT || process.env.WORLD_PORT;
  const worldPort = worldPortRaw ? Number.parseInt(worldPortRaw, 10) : NaN;

  const quiet = parseBool(process.env.QUIET_MODE ?? process.env.FOM_QUIET_LOGS, false);
  if (quiet) {
    // Match server behavior: silence console spam while keeping file logs.
    // eslint-disable-next-line no-console
    console.log = () => {};
  }

  console.log('='.repeat(50));
  console.log('  FoM Test Client');
  console.log('='.repeat(50));
  console.log(`Target: ${address}:${port}`);

  const consoleMode = parseConsoleMode(process.env.PACKET_LOG ?? 'full');
  const consoleMinIntervalMs = Math.max(0, parseInt(process.env.PACKET_LOG_INTERVAL_MS || '0', 10) || 0);
  const logToFile = parseBool(process.env.PACKET_LOG_FILE, true);
  const analysisEnabled = parseBool(process.env.PACKET_LOG_ANALYSIS, false);
  const consolePacketIds = parsePacketIds(process.env.PACKET_LOG_IDS);
  const filePacketIds = parsePacketIds(process.env.PACKET_LOG_FILE_IDS);
  const ignorePacketIds = parsePacketIds(process.env.PACKET_LOG_IGNORE_IDS);
  const consoleRepeatSuppressMs = Math.max(0, parseInt(process.env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0);
  const flushMode = parseFlushMode(process.env.PACKET_LOG_FLUSH);
  const logDir = process.env.PACKET_LOG_DIR || path.resolve(process.cwd(), 'logs');

  const packetLogger = new PacketLogger({
    console: !quiet && consoleMode !== 'off',
    file: logToFile,
    consoleMode,
    consoleMinIntervalMs,
    consolePacketIds,
    filePacketIds,
    ignorePacketIds,
    analysis: analysisEnabled,
    consoleRepeatSuppressMs,
    flushMode,
    logDir,
  });
  PacketLogger.setGlobal(packetLogger);

  const client = new TestClient(address, port, packetLogger, 1, {
    enabled: loginAuth,
    username: loginUsername,
    password: loginPass,
    passwordHash: loginPasswordHash,
    loginToken: loginToken,
    macAddress: loginMacAddress,
    computerName: loginComputerName,
    driveModels: loginDriveModels,
    driveSerialNumbers: loginDriveSerials,
    fileCRCs: loginFileCRCs,
    steamTicket: loginSteamTicket,
    steamTicketLength: loginSteamTicketLength,
    wrapReliable: !loginRaw,
    reliable: reliableOptions,
  }, {
    worldId: worldId ?? 0,
    worldInst: worldInst ?? 0,
    playerId: playerId ?? 0,
    worldConst: worldConst ?? 0x13bc52,
  }, {
    guid,
    seed,
    protocolVersion,
  });

  switch (command) {
    case 'connect':
      client.sendConnectionRequest();
      break;
    case 'query':
      client.sendQuery();
      break;
    case 'open':
      client.sendOpenConnectionRequest({
        targetIp: address,
        targetPort: port,
        guid,
        seed,
        protocolVersion,
      });
      break;
    case 'world':
    case 'world-connect': {
      const targetIp = worldIp || address;
      const targetPort = Number.isFinite(worldPort) ? worldPort : port;
      if (!targetIp || !Number.isFinite(targetPort) || targetPort <= 0) {
        console.log('Missing --world-ip/--world-port (or set FOM_WORLD_IP/FOM_WORLD_PORT).');
        client.close();
        return;
      }
      client.connectWorldDirect(targetIp, targetPort);
      break;
    }
    case 'login':
    case 'login6b':
    case 'login6c': // legacy alias
      client.sendLoginRequest({
        username: user,
        clientVersion,
        wrapReliable: !loginRaw,
        reliable: reliableOptions,
      });
      break;
    case 'login6e':
      if (!loginUsername) {
        console.log('Missing --login-user/--login-a/--user for login6e.');
        client.close();
        return;
      }
      client.sendLoginAuth({
        username: loginUsername,
        passwordHash: loginPasswordHash,
        loginToken: loginToken,
        macAddress: loginMacAddress,
        computerName: loginComputerName,
        driveModels: loginDriveModels,
        driveSerialNumbers: loginDriveSerials,
        fileCRCs: loginFileCRCs,
        steamTicket: loginSteamTicket,
        steamTicketLength: loginSteamTicketLength,
        wrapReliable: !loginRaw,
        reliable: reliableOptions,
      });
      break;
    default:
      console.log('Usage: npx tsx src/tools/TestClient.ts [connect|query|open|login|login6b|login6e|world|world-connect] [address] [port] [--guid=HEX] [--seed=HEX] [--protocol=N] [--interval-ms=N] [--user=NAME] [--client-version=N] [--login-user=NAME] [--login-pass=TEXT] [--login-hash=TEXT] [--login-token=TEXT] [--login-mac=TEXT] [--login-computer=TEXT] [--login-crc=v1,v2,v3] [--login-drives=a,b,c,d] [--login-serials=a,b,c,d] [--login-ticket=HEX] [--login-ticket-len=N] [--login=SECONDS] [--login-raw] [--login-auth=BOOL] [--rel-msg=N] [--rel-flags=HEX] [--rel-len=HEX] [--rel-ts=HEX] [--world-ip=IP] [--world-port=N] [--world-id=N] [--world-inst=N] [--world-player=N] [--world-const=N]');
      client.close();
      return;
  }

  if (loginDelayMs > 0 && command !== 'login' && command !== 'login6b' && command !== 'world' && command !== 'world-connect') {
    setTimeout(() => {
      client.sendLoginRequest({
        username: user,
        clientVersion,
        wrapReliable: !loginRaw,
        reliable: reliableOptions,
      });
    }, loginDelayMs);
  }

  // Keep the client alive by default; user can close the window or Ctrl+C.
}

main();
