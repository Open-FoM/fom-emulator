import * as fs from 'fs';
import * as path from 'path';
import { Connection, ConnectionState } from '../network/Connection';
import { BitStreamReader, BitStreamWriter } from '../protocol/BitStream';
import RakBitStream from '../raknet-js/structures/BitStream';
import { writeCompressedString, readCompressedString } from '../protocol/RakStringCompressor';
import { PacketLogger } from '../utils/PacketLogger';
import { 
  CONNECTION_MAGIC, 
  ConnectionRequestType,
  ConnectionResponseFlag,
  RakNetMessageId,
  LithTechMessageId,
  LoginResult,
  WORLD_SERVER_PASSWORD,
  SEQUENCE_MASK,
  DEFAULT_PORT,
  OFFLINE_MESSAGE_ID,
  OFFLINE_SYSTEM_ADDRESS_BYTES
} from '../protocol/Constants';

export interface PacketContext {
  connection: Connection;
  data: Buffer;
  reader: BitStreamReader;
}

/**
 * Parsed LithTech sub-message from a guaranteed packet
 */
interface LithTechSubMessage {
  msgId: number;
  payload: Buffer;
  payloadBits: number;
}

/**
 * Connection request data parsed from client
 * Based on Ghidra analysis of CUDPDriver_JoinSession (0x004B67B0)
 */
export interface ConnectionRequestData {
  magic: number;
  requestType: number;
  password: string;       // 128 bytes (0x80) - null terminated
  timestamp: number;      // 32-bit client timestamp
}

export class PacketHandler {
  private fastLoginEnabled: boolean;
  private worldIp: string;
  private worldPort: number;
  private verbose: boolean;
  private loginDebug: boolean;
  private logThrottleMs: number;
  private lastLogByKey: Map<string, number>;
  private lithDebugBurst: number;
  private lithDebugTrigger: string;
  private lithDebugHexBytes: number;
  private lithDebugRaw: boolean;
  private lithDebugRawBytes: number;
  private lithDebugRawMin: number;
  private lithDebugRawMax: number;
  private lithDebugScan: boolean;
  private lithDebugScanAny: boolean;
  private lithDebugScanMax: number;
  private lithDebugScanPayloadBytes: number;
  private lithDebugBits: boolean;
  private lithDebugBitsPerLine: number;
  private lithDebugBitsMax: number;
  private lithHasMoreFlag: boolean;
  private forceLoginOnFirstLith: boolean;
  private lithDebugLogPath: string | null;
  private lithDebugLogStream: fs.WriteStream | null;

  constructor() {
    this.fastLoginEnabled = this.parseBool(process.env.FAST_LOGIN, false);
    this.worldIp = process.env.WORLD_IP || '127.0.0.1';
    const port = parseInt(process.env.WORLD_PORT || '', 10);
    this.worldPort = Number.isNaN(port) || port <= 0 ? DEFAULT_PORT : port;
    this.verbose = this.parseBool(process.env.PACKET_HANDLER_VERBOSE, false);
    this.loginDebug = this.parseBool(process.env.LOGIN_DEBUG, false);
    const throttle = parseInt(process.env.PACKET_HANDLER_LOG_THROTTLE_MS || '5000', 10);
    this.logThrottleMs = Number.isNaN(throttle) ? 5000 : Math.max(0, throttle);
    this.lastLogByKey = new Map();
    this.lithDebugBurst = this.parseInt(process.env.LITH_DEBUG_BURST, 0);
    this.lithDebugTrigger = (process.env.LITH_DEBUG_TRIGGER || 'none').toLowerCase();
    this.lithDebugHexBytes = this.parseInt(process.env.LITH_DEBUG_HEX_BYTES, 48);
    this.lithDebugRaw = this.parseBool(process.env.LITH_DEBUG_RAW, false);
    this.lithDebugRawBytes = this.parseInt(process.env.LITH_DEBUG_RAW_BYTES, 512);
    this.lithDebugRawMin = this.parseInt(process.env.LITH_DEBUG_RAW_MIN, 0);
    this.lithDebugRawMax = this.parseInt(process.env.LITH_DEBUG_RAW_MAX, 0);
    this.lithDebugScan = this.parseBool(process.env.LITH_DEBUG_SCAN, false);
    this.lithDebugScanAny = this.parseBool(process.env.LITH_DEBUG_SCAN_ANY, false);
    this.lithDebugScanMax = this.parseInt(process.env.LITH_DEBUG_SCAN_MAX, 12);
    this.lithDebugScanPayloadBytes = this.parseInt(process.env.LITH_DEBUG_SCAN_PAYLOAD_BYTES, 32);
    this.lithDebugBits = this.parseBool(process.env.LITH_DEBUG_BITS, false);
    this.lithDebugBitsPerLine = this.parseInt(process.env.LITH_DEBUG_BITS_PER_LINE, 128);
    this.lithDebugBitsMax = this.parseInt(process.env.LITH_DEBUG_BITS_MAX, 0);
    this.lithHasMoreFlag = this.parseBool(process.env.LITH_HAS_MORE_FLAG, false);
    this.forceLoginOnFirstLith = this.parseBool(process.env.FORCE_LOGIN_ON_FIRST_LITH, false);
    this.lithDebugLogPath = null;
    this.lithDebugLogStream = null;
    this.initLithDebugLog();
  }

  private parseBool(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    const v = value.toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
    if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
    return defaultValue;
  }

  private parseInt(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  private initLithDebugLog(): void {
    const logEnabled = this.parseBool(process.env.LITH_DEBUG_LOG, false);
    const logPathEnv = process.env.LITH_DEBUG_LOG_PATH || '';
    if (!logEnabled && !logPathEnv) return;
    const logPath = logPathEnv || path.join('logs', 'lithdebug.log');
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.lithDebugLogPath = logPath;
    this.lithDebugLogStream = fs.createWriteStream(logPath, { flags: 'a' });
    const stamp = new Date().toISOString();
    this.lithDebugLogStream.write(`# LithDebug log started ${stamp}\n`);
    console.log(`[PacketHandler] LithDebug logging to ${logPath}`);
  }

  private logLithDebug(line: string): void {
    console.log(line);
    if (this.lithDebugLogStream) {
      this.lithDebugLogStream.write(`${line}\n`);
    }
  }

  private maybeTriggerLithDebug(connection: Connection, reason: string): void {
    if (this.lithDebugBurst <= 0 || connection.lithDebugTriggered) return;
    connection.lithDebugTriggered = true;
    connection.lithDebugRemaining = this.lithDebugBurst;
    this.logLithDebug(`[PacketHandler] LithDebug triggered (${reason}) for ${connection.key}: next ${this.lithDebugBurst} reliable packets`);
  }

  private formatHex(buffer: Buffer, maxBytes: number): string {
    const slice = buffer.subarray(0, Math.max(0, maxBytes));
    return slice.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
  }

  private formatHexLines(buffer: Buffer, maxBytes: number, lineBytes: number = 16): string[] {
    const limit = maxBytes > 0 ? Math.min(buffer.length, maxBytes) : buffer.length;
    const slice = buffer.subarray(0, limit);
    const lines: string[] = [];
    for (let i = 0; i < slice.length; i += lineBytes) {
      const chunk = slice.subarray(i, i + lineBytes);
      const hex = chunk.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
      lines.push(`${i.toString(16).padStart(4, '0')}  ${hex}`);
    }
    return lines;
  }

  private logBits(tag: string, buffer: Buffer, bits: number): void {
    if (!this.lithDebugBits) return;
    const totalBits = Math.min(bits, buffer.length * 8);
    const maxBits = this.lithDebugBitsMax > 0 ? Math.min(totalBits, this.lithDebugBitsMax) : totalBits;
    const perLine = this.lithDebugBitsPerLine > 0 ? this.lithDebugBitsPerLine : 128;
    this.logLithDebug(`[Bits] ${tag} bits=${totalBits} order=lsb0`);
    for (let offset = 0; offset < maxBits; offset += perLine) {
      const lineBits = Math.min(perLine, maxBits - offset);
      let line = `  ${offset.toString(16).padStart(4, '0')}  `;
      for (let i = 0; i < lineBits; i++) {
        const idx = offset + i;
        const byteIndex = idx >> 3;
        const bitIndex = idx & 7;
        const bitVal = (buffer[byteIndex] >> bitIndex) & 1;
        line += bitVal ? '1' : '0';
        if ((i & 7) === 7) {
          line += ' ';
        }
      }
      this.logLithDebug(line);
    }
    if (maxBits < totalBits) {
      this.logLithDebug(`[Bits] ... truncated ${totalBits - maxBits} bits`);
    }
  }

  private logLoginResponse(tag: string, buffer: Buffer): void {
    const maxBytes = this.lithDebugRawBytes > 0 ? this.lithDebugRawBytes : 512;
    this.logLithDebug(`[LoginResp] ${tag} bytes=${buffer.length}`);
    const lines = this.formatHexLines(buffer, maxBytes);
    for (const line of lines) {
      this.logLithDebug(`[LoginResp]   ${line}`);
    }
    this.logBits(`[LoginResp] ${tag}`, buffer, buffer.length * 8);
  }

  private shouldLogRaw(length: number): boolean {
    if (!this.lithDebugRaw) return false;
    if (this.lithDebugRawMin > 0 && length < this.lithDebugRawMin) return false;
    if (this.lithDebugRawMax > 0 && length > this.lithDebugRawMax) return false;
    return true;
  }

  private scanLithTech(innerData: Buffer): void {
    if (!this.lithDebugScan) return;
    const msgIds = new Set<number>([
      LithTechMessageId.MSG_CYCLECHECK,
      LithTechMessageId.MSG_UNKNOWN_5,
      LithTechMessageId.MSG_PROTOCOL_VERSION,
      LithTechMessageId.MSG_UNKNOWN_7,
      LithTechMessageId.MSG_UPDATE,
      LithTechMessageId.MSG_UNKNOWN_10,
      LithTechMessageId.MSG_ID_PACKET,
      LithTechMessageId.MSG_UNKNOWN_13,
      LithTechMessageId.MSG_MESSAGE_GROUP,
      LithTechMessageId.MSG_UNKNOWN_15,
      LithTechMessageId.MSG_UNKNOWN_16,
      LithTechMessageId.MSG_UNKNOWN_17,
      LithTechMessageId.MSG_UNKNOWN_19,
      LithTechMessageId.MSG_UNKNOWN_20,
      LithTechMessageId.MSG_UNKNOWN_21,
      LithTechMessageId.MSG_UNKNOWN_22,
      LithTechMessageId.MSG_UNKNOWN_23,
    ]);

    const lengthBitSizes = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const preSkips = [0, 8, 16, 24, 32, 40, 48, 56];
    let logged = 0;

    for (const pre of preSkips) {
      for (let off = 0; off < 8; off++) {
        const start = pre + off;
        for (const lenBitsSize of lengthBitSizes) {
          if (logged >= this.lithDebugScanMax) return;
          try {
            const reader = new BitStreamReader(innerData, start);
            if (reader.remainingBits < (13 + 1 + lenBitsSize + 8)) continue;
            const seq = reader.readBits(13);
            const cont = reader.readBits(1);
            const lenBits = reader.readBits(lenBitsSize);
            if (lenBits <= 0 || lenBits > 4096) continue;
            const msgId = reader.readBits(8);
            if (!this.lithDebugScanAny && !msgIds.has(msgId)) continue;
            if (this.lithDebugScanAny && (msgId === 0x00 || msgId === 0xff)) continue;
            const payloadBytes = Math.ceil(lenBits / 8);
            if (payloadBytes <= 0 || payloadBytes > (reader.remainingBits / 8)) continue;
            const toRead = Math.min(payloadBytes, this.lithDebugScanPayloadBytes);
            const payload = reader.readBytes(toRead);
            const hex = this.formatHex(payload, toRead);
            this.logLithDebug(
              `[LithScan] startBit=${start} lenBits=${lenBitsSize} seq=${seq} cont=${cont} msg=0x${msgId.toString(16)} payloadBits=${lenBits} sample=${hex}`
            );
            logged++;
          } catch {
            // ignore decode errors
          }
        }
      }
    }
  }

  private logVerbose(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }

  private logThrottled(key: string, message: string): void {
    if (this.logThrottleMs === 0) {
      console.log(message);
      return;
    }
    const now = Date.now();
    const last = this.lastLogByKey.get(key);
    if (last !== undefined && (now - last) < this.logThrottleMs) {
      return;
    }
    this.lastLogByKey.set(key, now);
    console.log(message);
  }

  private maybeFastLogin(connection: Connection): Buffer | null {
    if (!this.fastLoginEnabled) return null;
    if (connection.authenticated) return null;
    if (connection.state !== ConnectionState.CONNECTED) return null;
    if (connection.lastTimestamp === 0) return null;

    connection.authenticated = true;
    console.log(`[PacketHandler] FAST_LOGIN enabled: auto-accepting login for ${connection.key} -> ${this.worldIp}:${this.worldPort}`);
    const login = this.buildLoginResponse(true, this.worldIp, this.worldPort);
    return this.wrapReliable(login, connection);
  }
  
  handlePacket(ctx: PacketContext): Buffer | null {
    const { data, reader, connection } = ctx;
    
    if (data.length < 4) {
      console.log(`[PacketHandler] Packet too small: ${data.length} bytes`);
      return null;
    }

    const firstDword = data.readUInt32LE(0);
    
    // LithTech connection magic - custom protocol, NOT standard RakNet
    if (firstDword === CONNECTION_MAGIC) {
      return this.handleConnectionRequest(ctx);
    }

    // Standard RakNet packet (first byte is packet ID)
    const packetId = data[0];
    this.logVerbose(`[PacketHandler] Received packet ID: 0x${packetId.toString(16).padStart(2, '0')} from ${connection.key}`);

    if ((packetId & 0xF0) === 0x40) {
      return this.handleReliablePacket(ctx, packetId);
    }

    switch (packetId) {
      case RakNetMessageId.ID_OPEN_CONNECTION_REQUEST:
        return this.handleOpenConnectionRequest(ctx);
      
      case RakNetMessageId.ID_CONNECTION_REQUEST:
        return this.handleRakNetConnectionRequest(ctx);

      case 0x80:
        this.handleAckPacket(ctx);
        return null;
      
      case RakNetMessageId.ID_LOGIN_REQUEST_RETURN:
        console.log('[PacketHandler] Unexpected LOGIN_REQUEST_RETURN from client');
        return null;
      
      case RakNetMessageId.ID_DISCONNECTION_NOTIFICATION:
        console.log(`[PacketHandler] Client ${connection.key} disconnected cleanly`);
        connection.state = ConnectionState.DISCONNECTED;
        return null;
      
      case RakNetMessageId.ID_PING:
      case RakNetMessageId.ID_INTERNAL_PING:
        return this.handlePing(ctx);
        
      default:
        return this.handleGamePacket(ctx, packetId);
    }
  }

  /**
   * Handle LithTech custom connection request (NOT standard RakNet)
   * 
   * Packet structure (from Ghidra CUDPDriver_JoinSession):
   * - Magic: 0x9919D9C7 (32 bits)
   * - Request Type: 3 bits (1=QUERY, 2=CONNECT, 3=CONNECT_RESPONSE)
   * - Password: 128 bytes (0x80) - null-terminated string for CONNECT
   * - Timestamp: 32 bits
   */
  private handleConnectionRequest(ctx: PacketContext): Buffer | null {
    const { reader, connection, data } = ctx;
    
    const magic = reader.readUInt32();
    if (magic !== CONNECTION_MAGIC) {
      console.log(`[PacketHandler] Invalid magic: 0x${magic.toString(16)}`);
      return null;
    }

    const requestType = reader.readBits(3);
    
    const typeNames: Record<number, string> = {
      1: 'QUERY',
      2: 'CONNECT', 
      3: 'CONNECT_RESPONSE'
    };
    console.log(`[PacketHandler] Connection request: ${typeNames[requestType] || 'UNKNOWN'} (${requestType}) from ${connection.key}`);

    switch (requestType) {
      case ConnectionRequestType.CONNECT:
        return this.handleConnectRequest(ctx, reader);
      
      case ConnectionRequestType.QUERY:
        return this.buildQueryResponse();
      
      default:
        console.log(`[PacketHandler] Unknown request type: ${requestType}`);
        return null;
    }
  }

  private handleConnectRequest(ctx: PacketContext, reader: BitStreamReader): Buffer | null {
    const { connection } = ctx;
    
    // Protocol: 128 bytes password field (0x80), null-terminated
    const availableBytes = Math.floor(reader.remainingBits / 8);
    if (availableBytes < 128) {
      console.log(`[PacketHandler] Short CONNECT packet: ${availableBytes} bytes available, expected 128. Treating missing bytes as empty.`);
    }
    const passwordBytes = Buffer.alloc(128);
    if (availableBytes > 0) {
      const toRead = Math.min(128, availableBytes);
      reader.readBytes(toRead).copy(passwordBytes);
    }
    
    let passwordEnd = passwordBytes.indexOf(0);
    if (passwordEnd === -1) passwordEnd = passwordBytes.length;
    const password = passwordBytes.subarray(0, passwordEnd).toString('ascii');
    
    let timestamp = 0;
    if (reader.remainingBits >= 32) {
      timestamp = reader.readUInt32();
    } else {
      this.logVerbose(`[PacketHandler] No timestamp in connection request`);
    }
    
    if (this.verbose) {
      console.log(`[PacketHandler] Connect request details:`);
      console.log(`  Password: "${password}" (${password.length} chars)`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Expected: "${WORLD_SERVER_PASSWORD}"`);
    }
    
    const passwordValid = password === '' || password === WORLD_SERVER_PASSWORD;
    
    if (passwordValid) {
      connection.state = ConnectionState.CONNECTED;
      return this.buildConnectionAcceptedResponse(connection);
    } else {
      console.log(`[PacketHandler] Invalid password from ${connection.key}`);
      return this.buildConnectionRejectedResponse('INVALID_PASSWORD');
    }
  }

  private buildConnectionAcceptedResponse(connection: Connection): Buffer {
    const writer = new BitStreamWriter(256);
    
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.CONNECT_RESPONSE, 3);
    writer.writeBits(ConnectionResponseFlag.ACCEPTED, 1);
    writer.writeBits(ConnectionResponseFlag.SKIP_GUID_CHECK, 1);
    
    console.log(`[PacketHandler] Sending connection ACCEPTED to ${connection.key}`);
    return writer.toBuffer();
  }
  
  private buildConnectionRejectedResponse(reason: string): Buffer {
    const writer = new BitStreamWriter(256);
    
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.CONNECT_RESPONSE, 3);
    writer.writeBits(ConnectionResponseFlag.REJECTED, 1);
    const guidFlag = reason === 'GUID_MISMATCH' 
      ? ConnectionResponseFlag.GUID_MISMATCH 
      : ConnectionResponseFlag.SKIP_GUID_CHECK;
    writer.writeBits(guidFlag, 1);
    
    console.log(`[PacketHandler] Sending connection REJECTED (${reason})`);
    return writer.toBuffer();
  }
  
  private handlePing(ctx: PacketContext): Buffer {
    const writer = new BitStreamWriter(16);
    writer.writeByte(RakNetMessageId.ID_PONG);
    if (ctx.data.length > 1) {
      writer.writeBytes(ctx.data.subarray(1, Math.min(ctx.data.length, 9)));
    }
    return writer.toBuffer();
  }

  private buildQueryResponse(): Buffer {
    const writer = new BitStreamWriter(256);
    
    const currentPlayerCount = 0;
    const maxPlayerCount = 100;
    
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.QUERY, 3);
    writer.writeString('Face of Mankind Emulator');
    writer.writeUInt16(currentPlayerCount);
    writer.writeUInt16(maxPlayerCount);
    
    return writer.toBuffer();
  }

  private parseIpv4(ip: string): number[] | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    const bytes = parts.map((part) => Number.parseInt(part, 10));
    if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null;
    return bytes;
  }

  private handleOpenConnectionRequest(ctx: PacketContext): Buffer | null {
    console.log(`[PacketHandler] ID_OPEN_CONNECTION_REQUEST from ${ctx.connection.key}`);

    const replyIp = process.env.REPLY_IP || process.env.BIND_IP || process.env.SERVER_IP || '127.0.0.1';
    const replyPortRaw = Number.parseInt(process.env.REPLY_PORT || process.env.PORT || String(DEFAULT_PORT), 10);
    const replyPort = Number.isNaN(replyPortRaw) || replyPortRaw <= 0 ? DEFAULT_PORT : replyPortRaw;

    let ipBytes = this.parseIpv4(replyIp);
    let resolvedIp = replyIp;
    if (!ipBytes) {
      const fallback = this.parseIpv4(ctx.connection.address) || [127, 0, 0, 1];
      ipBytes = fallback;
      resolvedIp = fallback.join('.');
    }

    const payloadLength = 1 + OFFLINE_MESSAGE_ID.length + OFFLINE_SYSTEM_ADDRESS_BYTES.length + 6;
    const reply = Buffer.alloc(payloadLength);
    let offset = 0;
    reply[offset++] = RakNetMessageId.ID_OPEN_CONNECTION_REPLY;
    OFFLINE_MESSAGE_ID.copy(reply, offset);
    offset += OFFLINE_MESSAGE_ID.length;
    OFFLINE_SYSTEM_ADDRESS_BYTES.copy(reply, offset);
    offset += OFFLINE_SYSTEM_ADDRESS_BYTES.length;
    for (const b of ipBytes) {
      reply[offset++] = (~b) & 0xff;
    }
    reply.writeUInt16BE(replyPort, offset);

    this.logVerbose(`[PacketHandler] Sending ID_OPEN_CONNECTION_REPLY addr=${resolvedIp}:${replyPort}`);
    return reply;
  }

  private handleReliablePacket(ctx: PacketContext, headerByte: number): Buffer | null {
    const { data, connection } = ctx;
    
    if (data.length < 18) {
      console.log(`[PacketHandler] Reliable packet too short: ${data.length} bytes`);
      return null;
    }

    const timestamp = data.readUInt32LE(5);
    const orderingInfo = data.readUInt32BE(9);
    const lengthInfo = data.readUInt32BE(13);
    const messageNumber = (orderingInfo >> 4) & 0xFFFFFF;
    
    const innerData = data.subarray(17);
    const innerMsgId = innerData.length > 0 ? innerData[0] : -1;
    
    if (this.verbose) {
      console.log(`[PacketHandler] Reliable packet from ${connection.key}:`);
      console.log(`  Header: 0x${headerByte.toString(16)}, MsgNum: ${messageNumber}, Timestamp: ${timestamp}`);
      console.log(`  Inner: ${innerData.length} bytes, FirstByte: 0x${innerMsgId.toString(16)}`);
    }
    if (this.shouldLogRaw(innerData.length) && innerMsgId !== 0x00) {
      this.logLithDebug(`[RelRaw] ${connection.key} innerBytes=${innerData.length} first=0x${innerMsgId.toString(16)}`);
      const lines = this.formatHexLines(innerData, this.lithDebugRawBytes);
      for (const line of lines) {
        this.logLithDebug(`[RelRaw]   ${line}`);
      }
      this.logBits(`[RelRaw] ${connection.key} inner`, innerData, innerData.length * 8);
    }
    if (this.shouldLogRaw(innerData.length)) {
      this.scanLithTech(innerData);
    }

    connection.lastTimestamp = timestamp;
    connection.lastMessageNumber = messageNumber;

    if (innerMsgId === RakNetMessageId.ID_CONNECTION_REQUEST) {
      return this.handleReliableConnectionRequest(ctx, innerData);
    }

    if (!connection.authenticated && innerData.length > 0 && innerMsgId === 0x6d) {
      const resp = this.tryParseLoginRequestRak(
        innerData,
        connection,
        `reliable-inner-0x${innerMsgId.toString(16)}`
      );
      if (resp) return resp;
    }
    
    if (innerMsgId === RakNetMessageId.ID_NEW_INCOMING_CONNECTION) {
      console.log(`[PacketHandler] ID_NEW_INCOMING_CONNECTION - client fully connected!`);
      connection.state = ConnectionState.CONNECTED;
      if (this.lithDebugTrigger === 'on_connect') {
        this.maybeTriggerLithDebug(connection, 'on_connect');
      }
      const fastLogin = this.maybeFastLogin(connection);
      if (fastLogin) return fastLogin;
      return null;
    }
    
    // LithTech guaranteed packet format: 13-bit sequence + messages
    // First byte 0x00 often indicates start of LithTech layer
    if ((innerMsgId === 0x00 || innerMsgId === 0x40) && innerData.length > 4) {
      const lithResponse = this.handleLithTechGuaranteed(ctx, innerData);
      if (lithResponse) {
        return lithResponse;
      }
    }
    // Temporary: scan 0x80 payloads for nested LithTech frames (no functional handling yet).
    if (innerMsgId === 0x80 && innerData.length > 4) {
      this.logLithDebug(`[LithScan] ${connection.key} inner=0x80 bytes=${innerData.length}`);
      this.scanLithTechFrames(innerData, connection);
    }

    const fastLogin = this.maybeFastLogin(connection);
    if (fastLogin) return fastLogin;
    
    if (innerMsgId >= 0) {
      this.logThrottled(`unhandled-inner-${innerMsgId}`, `[PacketHandler] Unhandled inner message: 0x${innerMsgId.toString(16)}`);
    }
    return null;
  }
  
  private handleLithTechGuaranteed(ctx: PacketContext, innerData: Buffer): Buffer | null {
    const { connection } = ctx;
    
    // Parse LithTech guaranteed packet using bit-stream reader
    const reader = new BitStreamReader(innerData);
    
    // Read 13-bit sequence number
    const sequenceNum = reader.readBits(13);
    // Read continuation flag (1 bit)
    const hasContinuation = reader.readBits(1);
    
    this.logVerbose(`[PacketHandler] LithTech guaranteed: seq=${sequenceNum}, cont=${hasContinuation}`);
    if (this.shouldLogRaw(innerData.length)) {
      this.logLithDebug(`[LithRaw] ${connection.key} seq=${sequenceNum} cont=${hasContinuation} innerBytes=${innerData.length}`);
      const lines = this.formatHexLines(innerData, this.lithDebugRawBytes);
      for (const line of lines) {
        this.logLithDebug(`[LithRaw]   ${line}`);
      }
    }
    
    // Byte-aligned pattern scan (helps detect structured frames)
    this.scanLithTechFrames(innerData, connection);

    // Parse sub-messages (probe offsets to avoid misalignment)
    const probe = this.parseLithTechSubMessagesProbe(innerData);
    const messages = probe.messages;
    if (this.shouldLogRaw(innerData.length) || this.lithDebugRaw || this.verbose) {
      this.logLithDebug(`[LithProbe] ${connection.key} offsetBits=${probe.startBit} msgs=${probe.messages.length} invalid=${probe.invalidCount}`);
    }
    this.logVerbose(`[PacketHandler] Parsed ${messages.length} LithTech sub-messages`);

    if (this.lithDebugTrigger === 'first_lith') {
      this.maybeTriggerLithDebug(connection, 'first_lith');
    }

    if (connection.lithDebugRemaining > 0) {
      this.logLithDebug(`[LithDebug] ${connection.key} seq=${sequenceNum} cont=${hasContinuation} innerBytes=${innerData.length} msgs=${messages.length}`);
      for (const msg of messages) {
        const hex = this.formatHex(msg.payload, this.lithDebugHexBytes);
        this.logLithDebug(`[LithDebug]   MSG_ID=0x${msg.msgId.toString(16)} bits=${msg.payloadBits} payload=${hex}`);
      }
      connection.lithDebugRemaining = Math.max(0, connection.lithDebugRemaining - 1);
      this.logLithDebug(`[LithDebug] Remaining packets: ${connection.lithDebugRemaining}`);
    }

    for (const msg of messages) {
      this.logVerbose(`  MSG_ID ${msg.msgId}: ${msg.payloadBits} bits`);
      this.logBits(`[LithMsg] ${connection.key} msg=0x${msg.msgId.toString(16)}`, msg.payload, msg.payloadBits);
      const resp = this.handleLithTechSubMessage(ctx, msg);
      if (resp) return resp;
    }
    
    if (!connection.lithTechProtocolSent) {
      connection.lithTechProtocolSent = true;
      return this.buildProtocolVersionPacket(connection);
    }
    if (!connection.lithTechIdSent) {
      connection.lithTechIdSent = true;
      return this.buildLithTechIdPacket(connection);
    }
    if (this.forceLoginOnFirstLith && !connection.forcedLoginSent) {
      connection.forcedLoginSent = true;
      console.log(`[PacketHandler] FORCE_LOGIN_ON_FIRST_LITH sending login response to ${connection.key}`);
      const login = this.buildLoginResponse(true, this.worldIp, this.worldPort);
      return this.wrapReliable(login, connection);
    }
    
    return null;
  }
  
  buildInitialPackets(connection: Connection): Buffer[] {
    const packets: Buffer[] = [];
    
    if (!connection.lithTechProtocolSent) {
      connection.lithTechProtocolSent = true;
      packets.push(this.buildProtocolVersionPacket(connection));
    }
    if (!connection.lithTechIdSent) {
      connection.lithTechIdSent = true;
      packets.push(this.buildLithTechIdPacket(connection));
    }
    
    return packets;
  }
  
  private parseLithTechSubMessages(reader: BitStreamReader): LithTechSubMessage[] {
    const messages: LithTechSubMessage[] = [];
    
    try {
      while (reader.remainingBits >= 8) {
        const lengthBits = reader.readBits(8);
        if (lengthBits === 0) break;
        
        const msgId = reader.readBits(8);
        
        const payloadBytes = Math.ceil(lengthBits / 8);
        const payload = Buffer.alloc(payloadBytes);
        for (let i = 0; i < payloadBytes && reader.remainingBits >= 8; i++) {
          payload[i] = reader.readBits(8);
        }
        
        messages.push({ msgId, payload, payloadBits: lengthBits });
        if (this.lithHasMoreFlag && reader.remainingBits >= 1) {
          const hasMore = reader.readBits(1);
          if (!hasMore) break;
        }
      }
    } catch (e) {
      console.log(`[PacketHandler] Error parsing LithTech messages: ${e}`);
    }
    
    return messages;
  }

  private parseLithTechSubMessagesProbe(buffer: Buffer): { messages: LithTechSubMessage[]; startBit: number; invalidCount: number } {
    const offsets = [0, 8, 16, 24, 32, 40];
    let bestMessages: LithTechSubMessage[] = [];
    let bestInvalid = Number.MAX_SAFE_INTEGER;
    let bestOffset = 0;
    let bestScore = -1;

    for (const offset of offsets) {
      const result = this.parseLithTechSubMessagesTolerant(buffer, offset);
      const score = (result.messages.length * 10) - result.invalidCount;
      if (this.lithDebugRaw || this.verbose) {
        this.logLithDebug(`[LithProbe] try offset=${offset} msgs=${result.messages.length} invalid=${result.invalidCount}`);
      }
      if (score > bestScore) {
        bestScore = score;
        bestMessages = result.messages;
        bestInvalid = result.invalidCount;
        bestOffset = offset;
      }
    }

    return { messages: bestMessages, startBit: bestOffset, invalidCount: bestInvalid };
  }

  private scanLithTechFrames(buffer: Buffer, connection: Connection): void {
    if (!this.lithDebugRaw && !this.verbose && !this.shouldLogRaw(buffer.length)) return;
    const targets = [0x6c, 0x6d];
    const maxHits = 6;
    let hits = 0;

    for (let i = 0; i < buffer.length; i += 1) {
      if (!targets.includes(buffer[i])) continue;
      const start = Math.max(0, i - 12);
      const end = Math.min(buffer.length, i + 20);
      const slice = buffer.subarray(start, end);
      this.logLithDebug(`[FrameScan] ${connection.key} hit=0x${buffer[i].toString(16)} @${i} window=${slice.toString('hex')}`);
      hits += 1;
      if (hits >= maxHits) break;
    }

    // Try structured decoders near buffer start
    this.decodeFrameLen32(buffer, connection);
    this.decodeFrameLen16(buffer, connection);
    this.decodeFrameIdLen16(buffer, connection);
  }

  private decodeFrameLen32(buffer: Buffer, connection: Connection): void {
    // format: [len32le][msgId8][payload...]
    if (buffer.length < 6) return;
    const maxFrames = 6;
    let offset = 0;
    let frames = 0;
    while (offset + 5 <= buffer.length && frames < maxFrames) {
      const len = buffer.readUInt32LE(offset);
      if (len === 0 || len > buffer.length) break;
      const msgId = buffer[offset + 4];
      const payloadStart = offset + 5;
      const payloadEnd = Math.min(buffer.length, payloadStart + len);
      const payload = buffer.subarray(payloadStart, payloadEnd);
      this.logLithDebug(`[Frame32] ${connection.key} off=${offset} len=${len} msgId=0x${msgId.toString(16)} payload=${this.formatHex(payload, this.lithDebugHexBytes)}`);
      frames += 1;
      offset = payloadEnd;
    }
  }

  private decodeFrameLen16(buffer: Buffer, connection: Connection): void {
    // format: [len16le][msgId8][payload...]
    if (buffer.length < 4) return;
    const maxFrames = 8;
    let offset = 0;
    let frames = 0;
    while (offset + 3 <= buffer.length && frames < maxFrames) {
      const len = buffer.readUInt16LE(offset);
      if (len === 0 || len > buffer.length) break;
      const msgId = buffer[offset + 2];
      const payloadStart = offset + 3;
      const payloadEnd = Math.min(buffer.length, payloadStart + len);
      const payload = buffer.subarray(payloadStart, payloadEnd);
      this.logLithDebug(`[Frame16] ${connection.key} off=${offset} len=${len} msgId=0x${msgId.toString(16)} payload=${this.formatHex(payload, this.lithDebugHexBytes)}`);
      this.scanNestedFrames(payload, connection, `frame16@${offset}`);
      frames += 1;
      offset = payloadEnd;
    }
  }

  private decodeFrameIdLen16(buffer: Buffer, connection: Connection): void {
    // format: [msgId8][len16le][payload...]
    if (buffer.length < 4) return;
    const maxFrames = 8;
    let offset = 0;
    let frames = 0;
    while (offset + 3 <= buffer.length && frames < maxFrames) {
      const msgId = buffer[offset];
      const len = buffer.readUInt16LE(offset + 1);
      if (len === 0 || len > buffer.length) break;
      const payloadStart = offset + 3;
      const payloadEnd = Math.min(buffer.length, payloadStart + len);
      const payload = buffer.subarray(payloadStart, payloadEnd);
      this.logLithDebug(`[FrameId16] ${connection.key} off=${offset} len=${len} msgId=0x${msgId.toString(16)} payload=${this.formatHex(payload, this.lithDebugHexBytes)}`);
      this.scanNestedFrames(payload, connection, `frameId16@${offset}`);
      frames += 1;
      offset = payloadEnd;
    }
  }

  private scanNestedFrames(payload: Buffer, connection: Connection, tag: string): void {
    // Look for 0x6c/0x6d inside payload and attempt nested decode from that offset.
    const targets = [0x6c, 0x6d];
    for (let i = 0; i < payload.length; i += 1) {
      if (!targets.includes(payload[i])) continue;
      const start = Math.max(0, i - 8);
      const end = Math.min(payload.length, i + 24);
      const window = payload.subarray(start, end);
      this.logLithDebug(`[NestedScan] ${connection.key} ${tag} hit=0x${payload[i].toString(16)} @${i} window=${window.toString('hex')}`);

      // Try nested decodes starting at this offset
      const slice = payload.subarray(i);
      this.decodeFrameLen32(slice, connection);
      this.decodeFrameLen16(slice, connection);
      this.decodeFrameIdLen16(slice, connection);
    }
  }

  private parseLithTechSubMessagesTolerant(buffer: Buffer, startBit: number): { messages: LithTechSubMessage[]; invalidCount: number } {
    const messages: LithTechSubMessage[] = [];
    const reader = new BitStreamReader(buffer, startBit);
    let invalid = 0;
    let steps = 0;
    const maxSteps = Math.max(64, buffer.length * 2);

    try {
      while (reader.remainingBits >= 8 && steps < maxSteps) {
        const lengthBits = reader.readBits(8);
        steps += 1;

        if (lengthBits === 0) {
          invalid += 1;
          continue;
        }
        if (reader.remainingBits < 8) {
          invalid += 1;
          break;
        }

        const msgId = reader.readBits(8);
        if (lengthBits > reader.remainingBits) {
          invalid += 1;
          continue;
        }

        const payloadBytes = Math.ceil(lengthBits / 8);
        const payload = Buffer.alloc(payloadBytes);
        let bitsLeft = lengthBits;
        for (let i = 0; i < payloadBytes; i++) {
          const take = Math.min(8, bitsLeft);
          payload[i] = reader.readBits(take);
          bitsLeft -= take;
        }

        messages.push({ msgId, payload, payloadBits: lengthBits });

        if (this.lithHasMoreFlag && reader.remainingBits >= 1) {
          const hasMore = reader.readBits(1);
          if (!hasMore) break;
        }
      }
    } catch (e) {
      console.log(`[PacketHandler] Error parsing LithTech messages (tolerant): ${e}`);
    }

    return { messages, invalidCount: invalid };
  }
  
  private handleLithTechSubMessage(ctx: PacketContext, msg: LithTechSubMessage): Buffer | null {
    switch (msg.msgId) {
      case LithTechMessageId.MSG_PROTOCOL_VERSION:
        this.logVerbose(`[PacketHandler] Protocol version check`);
        return null;
      case LithTechMessageId.MSG_ID_PACKET:
        this.logVerbose(`[PacketHandler] ID packet received`);
        return null;
      case LithTechMessageId.MSG_MESSAGE_GROUP:
        this.logVerbose(`[PacketHandler] Message group - unpacking`);
        const groupMessages = this.parseMessageGroup(msg.payload, msg.payloadBits);
        if (groupMessages.length > 0) {
          if (this.lithDebugRaw || this.verbose) {
            this.logLithDebug(`[Group] ${ctx.connection.key} subMessages=${groupMessages.length} bits=${msg.payloadBits}`);
            for (const sub of groupMessages) {
              const hex = this.formatHex(sub.payload, this.lithDebugHexBytes);
              this.logLithDebug(`[Group]   MSG_ID=0x${sub.msgId.toString(16)} bits=${sub.payloadBits} payload=${hex}`);
            }
          }
          for (const sub of groupMessages) {
            const resp = this.handleLithTechSubMessage(ctx, sub);
            if (resp) return resp;
          }
        } else if (this.lithDebugRaw || this.verbose) {
          this.logLithDebug(`[Group] ${ctx.connection.key} no sub-messages parsed (bits=${msg.payloadBits})`);
        }
        return null;
      default:
        this.logThrottled(`lithtech-unknown-${msg.msgId}`, `[PacketHandler] Unknown LithTech MSG_ID ${msg.msgId}`);
        if (!ctx.connection.authenticated && msg.payload.length > 0 && msg.msgId === 0x6d) {
          const resp = this.tryParseLoginRequestRak(
            msg.payload,
            ctx.connection,
            `lith-msg-0x${msg.msgId.toString(16)}`
          );
          if (resp) return resp;
        }
        return null;
    }
    return null;
  }

  private parseMessageGroup(payload: Buffer, payloadBits: number): LithTechSubMessage[] {
    const messages: LithTechSubMessage[] = [];
    if (payloadBits <= 0) return messages;

    const reader = new BitStreamReader(payload);
    const maxBits = Math.min(payloadBits, payload.length * 8);

    try {
      while (reader.position + 8 <= maxBits) {
        const lengthBits = reader.readBits(8);
        if (lengthBits === 0) break;
        if (reader.position + 8 > maxBits) break;
        const msgId = reader.readBits(8);
        if (reader.position + lengthBits > maxBits) {
          this.logLithDebug(`[Group] invalid length: want=${lengthBits} remaining=${maxBits - reader.position}`);
          break;
        }

        const payloadBytes = Math.ceil(lengthBits / 8);
        const subPayload = Buffer.alloc(payloadBytes);
        let bitsLeft = lengthBits;
        for (let i = 0; i < payloadBytes; i++) {
          const take = Math.min(8, bitsLeft);
          subPayload[i] = reader.readBits(take);
          bitsLeft -= take;
        }

        messages.push({ msgId, payload: subPayload, payloadBits: lengthBits });
      }
    } catch (e) {
      this.logLithDebug(`[Group] parse error: ${e}`);
    }

    return messages;
  }
  
  private buildLithTechIdPacket(connection: Connection): Buffer {
    const writer = new BitStreamWriter(64);
    
    const seq = connection.lithTechOutSeq || 0;
    connection.lithTechOutSeq = (seq + 1) & SEQUENCE_MASK;
    writer.writeBits(seq, 13);
    writer.writeBits(0, 1); // no continuation
    
    // MSG_ID 12: ID packet - 8 + 16 + 8 = 32 bits payload
    writer.writeBits(32, 8);
    writer.writeBits(LithTechMessageId.MSG_ID_PACKET, 8);
    writer.writeBits(connection.id, 16);
    writer.writeBits(0, 8); // flags
    
    writer.writeBits(0, 1); // no more messages
    writer.writeBits(0, 8); // terminator
    
    const lithTechData = writer.toBuffer();
    this.logVerbose(`[PacketHandler] Built LithTech ID packet: ${lithTechData.toString('hex')}`);
    
    return this.wrapReliable(lithTechData, connection);
  }
  
  private buildProtocolVersionPacket(connection: Connection): Buffer {
    const writer = new BitStreamWriter(64);
    
    const seq = connection.lithTechOutSeq || 0;
    connection.lithTechOutSeq = (seq + 1) & SEQUENCE_MASK;
    writer.writeBits(seq, 13);
    writer.writeBits(0, 1); // no continuation
    
    // MSG_ID 4: Protocol version - 8 + 32 + 32 = 72 bits payload
    writer.writeBits(72, 8);
    writer.writeBits(LithTechMessageId.MSG_CYCLECHECK, 8);
    writer.writeBits(7, 32); // Protocol version 7
    writer.writeBits(0, 32); // Additional version data
    
    writer.writeBits(0, 1); // no more messages
    writer.writeBits(0, 8); // terminator
    
    const lithTechData = writer.toBuffer();
    this.logVerbose(`[PacketHandler] Built protocol version packet: ${lithTechData.toString('hex')}`);
    
    return this.wrapReliable(lithTechData, connection);
  }

  private handleReliableConnectionRequest(ctx: PacketContext, innerData: Buffer): Buffer | null {
    const { connection } = ctx;
    
    if (this.verbose) {
      console.log(`[PacketHandler] ID_CONNECTION_REQUEST inside reliable packet`);
      console.log(`  Inner hex: ${innerData.toString('hex').substring(0, 100)}...`);
    }
    
    const passwordOffset = innerData.indexOf(Buffer.from(WORLD_SERVER_PASSWORD));
    if (passwordOffset !== -1) {
      this.logVerbose(`  Password "${WORLD_SERVER_PASSWORD}" found at inner offset ${passwordOffset}`);
    }
    
    connection.state = ConnectionState.CONNECTED;
    
    // Build ID_CONNECTION_REQUEST_ACCEPTED response
    // Standard RakNet format: ID + server address + port + client index + client address + timestamps
    const response = Buffer.alloc(25);
    let offset = 0;
    
    response[offset++] = RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED;
    
    const replyIp = process.env.REPLY_IP || process.env.BIND_IP || process.env.SERVER_IP || '127.0.0.1';
    const replyPortRaw = Number.parseInt(process.env.REPLY_PORT || process.env.PORT || String(DEFAULT_PORT), 10);
    const replyPort = Number.isNaN(replyPortRaw) || replyPortRaw <= 0 ? DEFAULT_PORT : replyPortRaw;
    const ipBytes = this.parseIpv4(replyIp) || [127, 0, 0, 1];
    const ipValue = (ipBytes[0] << 24) | (ipBytes[1] << 16) | (ipBytes[2] << 8) | ipBytes[3];

    // Server external IP (BE)
    response.writeUInt32BE(ipValue >>> 0, offset); offset += 4;
    
    // Server port (BE)
    response.writeUInt16BE(replyPort, offset); offset += 2;
    
    // Client index (LE)
    response.writeUInt16LE(connection.id, offset); offset += 2;
    
    // Client external address placeholder (8 bytes)
    response.writeBigUInt64LE(BigInt(0), offset); offset += 8;
    
    // Timestamp (8 bytes)
    response.writeBigUInt64LE(BigInt(Date.now()), offset); offset += 8;
    
    this.logVerbose(`[PacketHandler] Sending ID_CONNECTION_REQUEST_ACCEPTED: ${response.toString('hex')}`);
    
    // Wrap in reliable packet format
    return this.wrapReliable(response, connection);
  }

  private wrapReliable(innerData: Buffer, connection: Connection): Buffer {
    // Build byte-aligned reliable packet header (17 bytes) + inner data
    const packet = Buffer.alloc(17 + innerData.length);
    
    packet[0] = 0x40; // RELIABLE header
    
    // Bytes 1-4: Channel/flags (BE)
    packet.writeUInt32BE(0x00000003, 1);
    
    // Bytes 5-8: Echo client timestamp (LE)
    packet.writeUInt32LE(connection.lastTimestamp || 0, 5);
    
    // Bytes 9-12: Ordering info (BE) - include our message number
    const ourMsgNum = connection.outgoingMessageNumber || 0;
    const orderingInfo = (ourMsgNum << 4) | 0x10;
    packet.writeUInt32BE(orderingInfo, 9);
    connection.outgoingMessageNumber = ourMsgNum + 1;
    
    // Bytes 13-16: Length in bits * 2 (BE)
    packet.writeUInt32BE(innerData.length * 8 * 2, 13);
    
    // Copy inner data
    innerData.copy(packet, 17);

    if (innerData.length > 0 && innerData[0] === RakNetMessageId.ID_LOGIN_REQUEST_RETURN) {
      connection.loginResponseSendCount += 1;
      connection.lastLoginResponseMsgNum = ourMsgNum;
      connection.lastLoginResponseSentAt = Date.now();
      this.logVerbose(`[LoginTrace] LOGIN_RESPONSE reliable #${ourMsgNum} sendCount=${connection.loginResponseSendCount} bytes=${innerData.length} bits=${innerData.length * 8}`);
      this.logLoginResponse(`inner msg=${ourMsgNum}`, innerData);
      this.logLoginResponse(`wrapped msg=${ourMsgNum}`, packet);
    }

    this.logVerbose(`[PacketHandler] Wrapped reliable #${ourMsgNum}: ${packet.toString('hex')}`);
    return packet;
  }

  buildAck(connection: Connection): Buffer {
    // Byte-aligned ACK format matching client:
    // Byte 0: 0x80 = ACK header
    // Bytes 1-4: Flags (BE) - 0x00000006
    // Bytes 5-8: Echo timestamp (LE)
    // Bytes 9-12: ACK info (BE) - 0x00000060
    // Bytes 13-16: Message number (BE)
    
    const ack = Buffer.alloc(17);
    ack[0] = 0x80;
    ack.writeUInt32BE(0x00000006, 1);
    ack.writeUInt32LE(connection.lastTimestamp || 0, 5);
    ack.writeUInt32BE(0x00000060, 9);
    ack.writeUInt32BE(connection.lastMessageNumber || 0, 13);
    
    return ack;
  }

  private handleRakNetConnectionRequest(ctx: PacketContext): Buffer | null {
    const writer = new BitStreamWriter(64);
    writer.writeByte(RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED);
    
    const serverIpPlaceholder = 0;
    const serverPortPlaceholder = 0;
    
    writer.writeUInt32(serverIpPlaceholder);
    writer.writeUInt16(serverPortPlaceholder);
    writer.writeUInt16(ctx.connection.id);
    
    console.log(`[PacketHandler] Accepted RakNet connection for ${ctx.connection.key}`);
    return writer.toBuffer();
  }

  private handleGamePacket(ctx: PacketContext, packetId: number): Buffer | null {
    const { data, connection } = ctx;
    
    this.logVerbose(`[PacketHandler] Game packet 0x${packetId.toString(16).padStart(2, '0')} (${data.length} bytes)`);
    
    if (packetId >= 0x80 && packetId <= 0xFF) {
      const login = this.tryParseLoginRequest(ctx);
      if (login) return login;
    }
    
    if (packetId >= LithTechMessageId.MSG_CYCLECHECK && 
        packetId <= LithTechMessageId.MSG_UNKNOWN_23) {
      this.logVerbose(`[PacketHandler] LithTech message ID ${packetId}`);
      return this.handleLithTechMessage(ctx, packetId);
    }
    
    this.logThrottled(`unknown-packet-${packetId}`, `[PacketHandler] Unknown packet ID 0x${packetId.toString(16)} - logging for analysis`);
    return null;
  }
  
  private tryParseLoginRequest(ctx: PacketContext): Buffer | null {
    const { data, connection } = ctx;
    const packetId = data.length > 0 ? data[0] : -1;
    return this.tryParseLoginRequestRak(data, connection, `game-0x${packetId.toString(16)}`);
  }

  private isPrintableAscii(value: string): boolean {
    for (let i = 0; i < value.length; i += 1) {
      const c = value.charCodeAt(i);
      if (c < 0x20 || c > 0x7e) return false;
    }
    return true;
  }

  private logPacketNote(message: string): void {
    PacketLogger.globalNote(message);
  }

  private tryParseLoginRequestRak(buffer: Buffer, connection: Connection, source: string): Buffer | null {
    if (buffer.length < 2) return null;

    this.logPacketNote(`[LoginParse] ${connection.key} src=${source} len=${buffer.length} bits=${buffer.length * 8}`);
    if (this.loginDebug || this.verbose) {
      const hex = buffer.toString('hex');
      console.log(`[LoginParse] raw hex=${hex}`);
      this.logPacketNote(`[LoginParse] raw hex=${hex}`);
    }
    if (this.lithDebugBits) {
      this.logBits(`[LoginReq] ${connection.key} src=${source}`, buffer, buffer.length * 8);
    }

    const stream = new RakBitStream(buffer);
    const packetId = stream.readByte();
    if (this.loginDebug || this.verbose) {
      const idStr = `0x${packetId.toString(16)}`;
      console.log(`[LoginParse] packetId=${idStr}`);
      this.logPacketNote(`[LoginParse] packetId=${idStr}`);
    }
    if (packetId !== 0x6d) {
      this.logPacketNote(`[LoginParse] skip packetId=0x${packetId.toString(16)} (not login 0x6D)`);
      return null;
    }

    try {
      const username = readCompressedString(stream, 64);
      const password = readCompressedString(stream, 64);

      if (!username || !this.isPrintableAscii(username)) {
        this.logPacketNote(`[LoginParse] invalid username from ${source} id=0x${packetId.toString(16)}`);
        return null;
      }
      if (password && !this.isPrintableAscii(password)) {
        this.logPacketNote(`[LoginParse] invalid password from ${source} id=0x${packetId.toString(16)}`);
        return null;
      }

      console.log(`[LoginParse] LOGIN_REQUEST parsed from ${source}: user="${username}" passLen=${password.length} id=0x${packetId.toString(16)}`);
      this.logPacketNote(`[LoginParse] parsed src=${source} id=0x${packetId.toString(16)} user="${username}" passLen=${password.length}`);
      if (this.loginDebug) {
        this.logPacketNote(`[LoginParse] parsed src=${source} password="${password}"`);
      }
      connection.username = username;
      connection.authenticated = true;

      const login = this.buildLoginResponse(true, this.worldIp, this.worldPort);
      return this.wrapReliable(login, connection);
    } catch (e) {
      this.logPacketNote(`[LoginParse] parse failed src=${source} id=0x${packetId.toString(16)} err=${e}`);
      return null;
    }
  }
  
  private tryReadString(buffer: Buffer, offset: number, maxLen: number): string | null {
    if (offset >= buffer.length) return null;
    
    const endOffset = Math.min(offset + maxLen, buffer.length);
    const slice = buffer.subarray(offset, endOffset);
    
    const nullPos = slice.indexOf(0);
    const strBytes = nullPos >= 0 ? slice.subarray(0, nullPos) : slice;
    
    if (strBytes.length === 0) return null;
    
    for (let i = 0; i < strBytes.length; i++) {
      const c = strBytes[i];
      if (c < 0x20 || c > 0x7e) return null;
    }
    
    return strBytes.toString('ascii');
  }
  
  private handleLithTechMessage(ctx: PacketContext, msgId: number): Buffer | null {
    this.logThrottled(`lithtech-msg-${msgId}`, `[PacketHandler] LithTech MSG_ID_${msgId} - handler not implemented`);
    return null;
  }

  buildLoginResponse(success: boolean, worldIp: string = '', worldPort: number = 0): Buffer {
    const writer = new RakBitStream();
    writer.writeByte(RakNetMessageId.ID_LOGIN_REQUEST_RETURN);
    writer.writeCompressed(success ? LoginResult.SUCCESS : LoginResult.FAILURE, 1);

    const address = success ? this.formatWorldAddress(worldIp, worldPort) : '';
    writeCompressedString(writer, address, 2048);

    this.logVerbose(`[LoginTrace] LOGIN_RESPONSE encoded bits=${writer.bits()} bytes=${writer.data.length} success=${success}`);
    this.logVerbose(`[LoginTrace] LOGIN_RESPONSE encoded hex=${writer.data.toString('hex')}`);
    this.logLoginResponse(`encoded success=${success}`, writer.data);

    return writer.data;
  }

  private formatWorldAddress(worldIp: string, worldPort: number): string {
    const trimmed = (worldIp || '').trim();
    if (!trimmed) return '';
    if (worldPort > 0 && !trimmed.includes(':')) {
      return `${trimmed}:${worldPort}`;
    }
    return trimmed;
  }

  private handleAckPacket(ctx: PacketContext): void {
    const { data, connection } = ctx;
    if (data.length < 17) {
      this.logVerbose(`[LoginTrace] ACK packet too short: ${data.length} bytes`);
      return;
    }

    const msgToAck = data.readUInt32BE(13);
    if (connection.lastLoginResponseMsgNum !== null && msgToAck === connection.lastLoginResponseMsgNum) {
      connection.loginResponseAckCount += 1;
      const latencyMs = connection.lastLoginResponseSentAt
        ? (Date.now() - connection.lastLoginResponseSentAt)
        : -1;
      this.logVerbose(`[LoginTrace] LOGIN_RESPONSE ACK msg=${msgToAck} ackCount=${connection.loginResponseAckCount} latencyMs=${latencyMs}`);
    } else {
      this.logVerbose(`[LoginTrace] ACK msg=${msgToAck}`);
    }
  }

  buildIdPacket(clientId: number, flags: number = 0): Buffer {
    const writer = new BitStreamWriter(64);
    
    writer.writeByte(LithTechMessageId.MSG_ID_PACKET);
    writer.writeUInt16(clientId);
    writer.writeByte(flags);
    
    return writer.toBuffer();
  }
}
