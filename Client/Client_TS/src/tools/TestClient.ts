import os from 'os';
import path from 'path';
import {
  RakPeer,
  RakPriority,
  RakReliability,
  NativeBitStream,
  BitStreamReader,
  BitStreamWriter,
  addressFromString,
  addressToIp,
  addressToString,
  decodeString,
  type RakSystemAddress,
} from '@openfom/networking';
import {
  DEFAULT_PORT,
  LithTechMessageId,
  RakNetMessageId,
  SEQUENCE_MASK,
  WORLD_SERVER_PASSWORD,
} from '../protocol/Constants';
import {
  buildLoginAuth,
  buildLoginAuthSession,
  buildLoginRequest,
  buildWorldLogin,
} from '../protocol/FoMPacketBuilder';
import type { LoginAuthOptions } from '../protocol/FoMPacketBuilder';
import { PacketDirection, PacketLogger } from '../utils/PacketLogger';
import {
  loadEnvCandidates,
  parseBool,
  parseConsoleMode,
  parseFlushMode,
  parsePacketIds,
} from '../config/ConfigLoader';

class TestClient {
  private masterPeer: RakPeer;
  private masterAddress: RakSystemAddress;
  private masterPollTimer?: NodeJS.Timeout;
  private masterConnected: boolean;
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
  private loginAuthSent: boolean;
  private loginAuthPass: string;
  private pendingLoginRequest?: { username: string; clientVersion: number };
  private pendingLoginAuth?: LoginAuthOptions;
  private worldLoginWorldId: number;
  private worldLoginWorldInst: number;
  private worldLoginPlayerId: number;
  private worldLoginWorldConst: number;
  private worldLoginTarget?: { address: string; port: number };
  private worldLoginPending: boolean;
  private worldLoginLastSelectKey?: string;
  private worldLoginRetryTimer?: NodeJS.Timeout;
  private worldPeer?: RakPeer;
  private worldAddress?: RakSystemAddress;
  private worldPollTimer?: NodeJS.Timeout;
  private worldConnected: boolean;
  private worldConnectionId: number;
  private worldConnectActive: boolean;
  private worldLoginSentToWorld: boolean;
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
    },
    worldLogin?: {
      worldId?: number;
      worldInst?: number;
      playerId?: number;
      worldConst?: number;
    },
    worldNet?: {
      connectionId?: number;
    },
  ) {
    this.masterPeer = new RakPeer();
    this.masterPeer.startup(1, 0, 0);
    this.masterAddress = addressFromString(serverAddress, serverPort);
    this.masterConnected = false;
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
    this.loginAuthSent = false;
    this.loginAuthPass = loginAuth?.password ?? '';
    this.pendingLoginRequest = undefined;
    this.pendingLoginAuth = undefined;
    this.worldLoginWorldId = worldLogin?.worldId ?? 0;
    this.worldLoginWorldInst = worldLogin?.worldInst ?? 0;
    this.worldLoginPlayerId = worldLogin?.playerId ?? 0;
    this.worldLoginWorldConst = worldLogin?.worldConst ?? 0x13bc52;
    this.worldLoginPending = false;
    this.worldConnectionId = worldNet?.connectionId ?? (this.connectionId + 1);
    this.worldConnectActive = false;
    this.worldLoginSentToWorld = false;
    this.worldConnected = false;
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

    this.masterPollTimer = setInterval(() => {
      this.pollMasterPeer();
    }, 10);
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

  private sendPacket(
    peer: RakPeer,
    address: RakSystemAddress,
    data: Buffer,
    connectionId: number,
    priority: RakPriority = RakPriority.HIGH,
    reliability: RakReliability = RakReliability.RELIABLE,
  ): void {
    const ip = addressToIp(address);
    this.logOutgoing(data, ip, address.port, connectionId);
    const ok = peer.send(
      data,
      priority,
      reliability,
      0,
      address,
      false,
    );
    if (!ok) {
      const addr = addressToString(address);
      PacketLogger.globalNote(`[Send] failed to ${addr} len=${data.length}`, true);
    }
  }

  private pollMasterPeer(): void {
    let packet = this.masterPeer.receive();
    while (packet) {
      const data = Buffer.from(packet.data);
      const ip = addressToIp(packet.systemAddress);
      this.logIncoming(data, ip, packet.systemAddress.port, this.connectionId);
      this.handleMasterMessage(data, packet.systemAddress);
      packet = this.masterPeer.receive();
    }
  }

  private pollWorldPeer(): void {
    if (!this.worldPeer) return;
    let packet = this.worldPeer.receive();
    while (packet) {
      const data = Buffer.from(packet.data);
      const ip = addressToIp(packet.systemAddress);
      this.logIncoming(data, ip, packet.systemAddress.port, this.worldConnectionId);
      this.handleWorldMessage(data, packet.systemAddress);
      packet = this.worldPeer.receive();
    }
  }

  private handleMasterMessage(data: Buffer, address: RakSystemAddress): void {
    if (data.length === 0) return;
    const msgId = data[0];

    if (
      msgId === RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED ||
      msgId === RakNetMessageId.ID_NEW_INCOMING_CONNECTION
    ) {
      if (!this.masterConnected) {
        this.masterConnected = true;
        PacketLogger.globalNote(`[Master] Connected ${addressToString(address)}`, true);
      }
      if (this.pendingLoginRequest) {
        const pending = this.pendingLoginRequest;
        this.pendingLoginRequest = undefined;
        this.sendLoginRequest(pending);
      }
      if (this.pendingLoginAuth) {
        const pending = this.pendingLoginAuth;
        this.pendingLoginAuth = undefined;
        this.sendLoginAuth(pending);
      }
      if (this.worldLoginPending) {
        this.sendWorldLogin();
      }
      return;
    }

    if (
      msgId === RakNetMessageId.ID_CONNECTION_ATTEMPT_FAILED ||
      msgId === RakNetMessageId.ID_CONNECTION_LOST ||
      msgId === RakNetMessageId.ID_DISCONNECTION_NOTIFICATION
    ) {
      this.masterConnected = false;
      const addr = addressToString(address);
      PacketLogger.globalNote(`[Master] Disconnected msg=0x${msgId.toString(16)} ${addr}`, true);
      return;
    }

    this.tryAutoLoginAuth(data);
    this.tryAutoWorldLogin(data);
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

  private decodeLoginRequestReturnPayload(inner: Buffer): { status: number; username: string } | null {
    if (!inner || inner.length === 0) return null;
    try {
      const stream = new NativeBitStream(inner, true);
      let packetId = stream.readU8();
      if (packetId === RakNetMessageId.ID_TIMESTAMP) {
        stream.readBytes(8);
        packetId = stream.readU8();
      }
      if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) return null;

      const status = stream.readCompressedU8() & 0xff;
      const username = decodeString(stream, 2048);
      return { status, username };
    } catch {
      return null;
    }
  }

  private decodeLoginRequestReturn(data: Buffer): { status: number; username: string } | null {
    return this.decodeLoginRequestReturnPayload(data);
  }

  private decodeLoginReturnPayload(inner: Buffer): { status: number; playerId: number } | null {
    if (!inner || inner.length === 0) return null;
    try {
      const stream = new NativeBitStream(inner, true);
      let packetId = stream.readU8();
      if (packetId === RakNetMessageId.ID_TIMESTAMP) {
        stream.readBytes(8);
        packetId = stream.readU8();
      }
      if (packetId !== RakNetMessageId.ID_LOGIN_RETURN) return null;

      const status = stream.readCompressedU8() & 0xff;
      const playerId = this.readCompressedUInt(stream, 4);
      return { status, playerId };
    } catch {
      return null;
    }
  }

  private decodeLoginReturn(data: Buffer): { status: number; playerId: number } | null {
    return this.decodeLoginReturnPayload(data);
  }

  private readCompressedUInt(stream: NativeBitStream, size: number): number {
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
  }

  private ipv4FromU32BE(value: number): string {
    const b0 = (value >>> 24) & 0xff;
    const b1 = (value >>> 16) & 0xff;
    const b2 = (value >>> 8) & 0xff;
    const b3 = value & 0xff;
    return `${b0}.${b1}.${b2}.${b3}`;
  }

  private decodeWorldSelect(data: Buffer): { subId: number; playerId: number; worldId?: number; worldInst?: number } | null {
    if (!data || data.length === 0) return null;
    const stream = new NativeBitStream(data, true);
    let packetId = stream.readU8();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      stream.readBytes(8);
      packetId = stream.readU8();
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
    if (!data || data.length === 0) return null;
    const stream = new NativeBitStream(data, true);
    let packetId = stream.readU8();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      stream.readBytes(8);
      packetId = stream.readU8();
    }
    if (packetId !== RakNetMessageId.ID_WORLD_LOGIN_RETURN) return null;

    const code = this.readCompressedUInt(stream, 1) & 0xff;
    const flag = this.readCompressedUInt(stream, 1) & 0xff;
    const worldIpU32 = this.readCompressedUInt(stream, 4);
    const worldPort = this.readCompressedUInt(stream, 2) & 0xffff;
    const worldIp = this.ipv4FromU32BE(worldIpU32);
    return { code, flag, worldIp, worldPort };
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
    const payload = writer.toBuffer();
    return Buffer.concat([Buffer.from([RakNetMessageId.ID_USER_PACKET_ENUM]), payload]);
  }

  private sendConnectStage(stage: number): void {
    if (!this.worldPeer || !this.worldAddress) return;
    if (this.worldConnectStageSent) return;
    this.worldConnectStageSent = true;
    const payloadWriter = new BitStreamWriter(16);
    payloadWriter.writeBits(stage & 0xffff, 16);
    const payload = payloadWriter.toBuffer();
    const lith = this.buildLithTechGuaranteedPacket([
      { msgId: LithTechMessageId.MSG_CONNECTSTAGE, payload, payloadBits: 16 },
    ]);
    this.sendPacket(
      this.worldPeer,
      this.worldAddress,
      lith,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private startWorldHeartbeat(): void {
    if (!this.worldPeer || !this.worldAddress) return;
    if (this.worldPingTimer) return;
    this.worldPingTimer = setInterval(() => {
      if (!this.worldPeer || !this.worldAddress) return;
      const ping = Buffer.alloc(5);
      ping[0] = RakNetMessageId.ID_PING;
      ping.writeUInt32BE((Date.now() >>> 0), 1);
      this.sendPacket(
        this.worldPeer,
        this.worldAddress,
        ping,
        this.worldConnectionId,
        RakPriority.LOW,
        RakReliability.UNRELIABLE,
      );
    }, 3000);
  }

  private initWorldPeer(): void {
    if (this.worldPeer) return;
    this.worldPeer = new RakPeer();
    this.worldPeer.startup(1, 0, 0);
    this.worldConnected = false;
    this.worldPollTimer = setInterval(() => {
      this.pollWorldPeer();
    }, 10);
  }

  private handleWorldMessage(data: Buffer, address: RakSystemAddress): void {
    if (data.length === 0) return;
    let payload = data;
    let msgId = data[0];
    if (msgId === RakNetMessageId.ID_TIMESTAMP && data.length > 9) {
      payload = data.subarray(9);
      msgId = payload[0];
    }
    if (msgId >= RakNetMessageId.ID_USER_PACKET_ENUM && payload.length > 1) {
      // World packets carry LithTech data inside the RakNet user packet wrapper.
      payload = payload.subarray(1);
      msgId = payload[0];
    }

    if (
      msgId === RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED ||
      msgId === RakNetMessageId.ID_NEW_INCOMING_CONNECTION
    ) {
      if (!this.worldConnected) {
        this.worldConnected = true;
        PacketLogger.globalNote(`[World] Connected ${addressToString(address)}`, true);
      }
      this.sendWorldLoginToWorld();
      this.startWorldHeartbeat();
      return;
    }

    if (
      msgId === RakNetMessageId.ID_CONNECTION_ATTEMPT_FAILED ||
      msgId === RakNetMessageId.ID_CONNECTION_LOST ||
      msgId === RakNetMessageId.ID_DISCONNECTION_NOTIFICATION
    ) {
      this.worldConnected = false;
      this.worldConnectActive = false;
      PacketLogger.globalNote(
        `[World] Disconnected msg=0x${msgId.toString(16)} ${addressToString(address)}`,
        true,
      );
      return;
    }

    if (msgId === RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) {
      const parsed = this.parseFileListTransfer(payload);
      if (parsed) {
        const preview = parsed.names.length > 0 ? ` preview=${parsed.names.join(',')}` : '';
        PacketLogger.globalNote(
          `[World] FileList 0x32 entries=${parsed.ids.length}${preview}`,
          true,
        );
        this.sendFileListAck(parsed.ids, address);
        return;
      }
    }

    const messages = this.parseLithTechGuaranteedSubMessages(payload);
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

  private sendFileListAck(ids: number[], address: RakSystemAddress): void {
    if (!this.worldPeer) return;
    const writer = new BitStreamWriter(Math.max(8, 1 + ids.length * 2));
    writer.writeByte(RakNetMessageId.ID_FILE_LIST_TRANSFER_RESPONSE);
    for (const id of ids) {
      writer.writeUInt16(id & 0x7fff);
    }
    const payload = writer.toBuffer();
    this.sendPacket(
      this.worldPeer,
      address,
      payload,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  connectWorldDirect(address: string, port: number): void {
    this.startWorldConnection({ address, port });
  }

  private connectMaster(): void {
    if (this.masterConnected) return;
    const ok = this.masterPeer.connect(this.serverAddress, this.serverPort, WORLD_SERVER_PASSWORD);
    if (!ok) {
      PacketLogger.globalNote(
        `[Master] Connect failed ${this.serverAddress}:${this.serverPort}`,
        true,
      );
    }
  }

  connect(): void {
    this.connectMaster();
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
  }): void {
    const payloadOptions: LoginAuthOptions = {
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
    };
    const payload = buildLoginAuth(payloadOptions);
    if (!this.masterConnected) {
      this.pendingLoginAuth = payloadOptions;
      this.connectMaster();
      return;
    }
    this.pendingLoginAuth = undefined;
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      payload,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private sendWorldLogin(): void {
    if (!this.masterConnected) {
      this.connectMaster();
      return;
    }
    const payload = buildWorldLogin({
      worldId: this.worldLoginWorldId,
      worldInst: this.worldLoginWorldInst,
      playerId: this.worldLoginPlayerId,
      worldConst: this.worldLoginWorldConst,
    });
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      payload,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
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

  private sendWorldLoginToWorld(): void {
    if (!this.worldPeer || !this.worldAddress) return;
    if (this.worldLoginSentToWorld) return;
    this.worldLoginSentToWorld = true;
    const payload = buildWorldLogin({
      worldId: this.worldLoginWorldId,
      worldInst: this.worldLoginWorldInst,
      playerId: this.worldLoginPlayerId,
      worldConst: this.worldLoginWorldConst,
    });
    this.sendPacket(
      this.worldPeer,
      this.worldAddress,
      payload,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private startWorldConnection(target: { address: string; port: number }): void {
    this.initWorldPeer();
    if (!this.worldPeer) return;
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
    this.worldLoginSentToWorld = false;
    this.worldConnectStageSent = false;
    this.worldLithOutSeq = 0;
    this.worldConnected = false;
    this.worldAddress = addressFromString(target.address, target.port);
    PacketLogger.globalNote(`[WorldConnect] connect ${target.address}:${target.port}`, true);
    const ok = this.worldPeer.connect(target.address, target.port, WORLD_SERVER_PASSWORD);
    if (!ok) {
      PacketLogger.globalNote(
        `[WorldConnect] connect failed ${target.address}:${target.port}`,
        true,
      );
    }
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

  sendLoginRequest(options: {
    username: string;
    clientVersion: number;
  }): void {
    this.loginAuthSent = false;
    const payload = buildLoginRequest(options);
    if (!this.masterConnected) {
      this.pendingLoginRequest = options;
      this.connectMaster();
      return;
    }
    this.pendingLoginRequest = undefined;
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      payload,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  sendRawPacket(data: Buffer): void {
    if (!this.masterConnected) {
      this.connectMaster();
      return;
    }
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      data,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  close(): void {
    this.packetLogger.close();
    if (this.masterPollTimer) {
      clearInterval(this.masterPollTimer);
      this.masterPollTimer = undefined;
    }
    this.masterPeer.shutdown(200);
    this.masterPeer.destroy();
    if (this.worldPollTimer) {
      clearInterval(this.worldPollTimer);
      this.worldPollTimer = undefined;
    }
    if (this.worldPeer) {
      this.worldPeer.shutdown(200);
      this.worldPeer.destroy();
      this.worldPeer = undefined;
    }
    if (this.worldLoginRetryTimer) {
      clearTimeout(this.worldLoginRetryTimer);
      this.worldLoginRetryTimer = undefined;
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
  }, {
    worldId: worldId ?? 0,
    worldInst: worldInst ?? 0,
    playerId: playerId ?? 0,
    worldConst: worldConst ?? 0x13bc52,
  });

  switch (command) {
    case 'connect':
      client.connect();
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
      client.sendLoginRequest({
        username: user,
        clientVersion,
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
      });
      break;
    default:
      console.log('Usage: bun src/tools/TestClient.ts [connect|login|login6e|world|world-connect] [address] [port] [--user=NAME] [--client-version=N] [--login-user=NAME] [--login-pass=TEXT] [--login-hash=TEXT] [--login-token=TEXT] [--login-mac=TEXT] [--login-computer=TEXT] [--login-crc=v1,v2,v3] [--login-drives=a,b,c,d] [--login-serials=a,b,c,d] [--login-ticket=HEX] [--login-ticket-len=N] [--login=SECONDS] [--login-auth=BOOL] [--world-ip=IP] [--world-port=N] [--world-id=N] [--world-inst=N] [--world-player=N] [--world-const=N]');
      client.close();
      return;
  }

  if (loginDelayMs > 0 && command !== 'login' && command !== 'world' && command !== 'world-connect') {
    setTimeout(() => {
      client.sendLoginRequest({
        username: user,
        clientVersion,
      });
    }, loginDelayMs);
  }

  // Keep the client alive by default; user can close the window or Ctrl+C.
}

main();
