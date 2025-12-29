import { Connection, ConnectionState } from '../network/Connection';
import { BitStreamReader, BitStreamWriter } from '../protocol/BitStream';
import RakBitStream from '../raknet-js/structures/BitStream';
import { writeCompressedString } from '../protocol/RakStringCompressor';
import { 
  CONNECTION_MAGIC, 
  ConnectionRequestType,
  ConnectionResponseFlag,
  RakNetMessageId,
  LithTechMessageId,
  LoginResult,
  WORLD_SERVER_PASSWORD,
  SEQUENCE_MASK,
  DEFAULT_PORT
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
  private logThrottleMs: number;
  private lastLogByKey: Map<string, number>;
  private lithDebugBurst: number;
  private lithDebugTrigger: string;
  private lithDebugHexBytes: number;
  private forceLoginOnFirstLith: boolean;

  constructor() {
    this.fastLoginEnabled = this.parseBool(process.env.FAST_LOGIN, false);
    this.worldIp = process.env.WORLD_IP || '127.0.0.1';
    const port = parseInt(process.env.WORLD_PORT || '', 10);
    this.worldPort = Number.isNaN(port) || port <= 0 ? DEFAULT_PORT : port;
    this.verbose = this.parseBool(process.env.PACKET_HANDLER_VERBOSE, false);
    const throttle = parseInt(process.env.PACKET_HANDLER_LOG_THROTTLE_MS || '5000', 10);
    this.logThrottleMs = Number.isNaN(throttle) ? 5000 : Math.max(0, throttle);
    this.lastLogByKey = new Map();
    this.lithDebugBurst = this.parseInt(process.env.LITH_DEBUG_BURST, 0);
    this.lithDebugTrigger = (process.env.LITH_DEBUG_TRIGGER || 'none').toLowerCase();
    this.lithDebugHexBytes = this.parseInt(process.env.LITH_DEBUG_HEX_BYTES, 48);
    this.forceLoginOnFirstLith = this.parseBool(process.env.FORCE_LOGIN_ON_FIRST_LITH, false);
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

  private maybeTriggerLithDebug(connection: Connection, reason: string): void {
    if (this.lithDebugBurst <= 0 || connection.lithDebugTriggered) return;
    connection.lithDebugTriggered = true;
    connection.lithDebugRemaining = this.lithDebugBurst;
    console.log(`[PacketHandler] LithDebug triggered (${reason}) for ${connection.key}: next ${this.lithDebugBurst} reliable packets`);
  }

  private formatHex(buffer: Buffer, maxBytes: number): string {
    const slice = buffer.subarray(0, Math.max(0, maxBytes));
    return slice.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
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

  private handleOpenConnectionRequest(ctx: PacketContext): Buffer | null {
    console.log(`[PacketHandler] ID_OPEN_CONNECTION_REQUEST from ${ctx.connection.key}`);
    
    const writer = new BitStreamWriter(64);
    writer.writeByte(RakNetMessageId.ID_OPEN_CONNECTION_REPLY);
    
    this.logVerbose(`[PacketHandler] Sending ID_OPEN_CONNECTION_REPLY`);
    return writer.toBuffer();
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

    connection.lastTimestamp = timestamp;
    connection.lastMessageNumber = messageNumber;
    
    if (innerMsgId === RakNetMessageId.ID_CONNECTION_REQUEST) {
      return this.handleReliableConnectionRequest(ctx, innerData);
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
    if (innerMsgId === 0x00 && innerData.length > 4) {
      const lithResponse = this.handleLithTechGuaranteed(ctx, innerData);
      if (lithResponse) {
        return lithResponse;
      }
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
    
    // Parse sub-messages
    const messages = this.parseLithTechSubMessages(reader);
    this.logVerbose(`[PacketHandler] Parsed ${messages.length} LithTech sub-messages`);

    if (this.lithDebugTrigger === 'first_lith') {
      this.maybeTriggerLithDebug(connection, 'first_lith');
    }

    if (connection.lithDebugRemaining > 0) {
      console.log(`[LithDebug] ${connection.key} seq=${sequenceNum} cont=${hasContinuation} innerBytes=${innerData.length} msgs=${messages.length}`);
      for (const msg of messages) {
        const hex = this.formatHex(msg.payload, this.lithDebugHexBytes);
        console.log(`[LithDebug]   MSG_ID=0x${msg.msgId.toString(16)} bits=${msg.payloadBits} payload=${hex}`);
      }
      connection.lithDebugRemaining = Math.max(0, connection.lithDebugRemaining - 1);
      console.log(`[LithDebug] Remaining packets: ${connection.lithDebugRemaining}`);
    }
    
    for (const msg of messages) {
      this.logVerbose(`  MSG_ID ${msg.msgId}: ${msg.payloadBits} bits`);
      this.handleLithTechSubMessage(ctx, msg);
    }
    
    if (connection.state === ConnectionState.CONNECTED) {
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
        
        if (reader.remainingBits >= 1) {
          const hasMore = reader.readBits(1);
          if (!hasMore) break;
        }
      }
    } catch (e) {
      console.log(`[PacketHandler] Error parsing LithTech messages: ${e}`);
    }
    
    return messages;
  }
  
  private handleLithTechSubMessage(ctx: PacketContext, msg: LithTechSubMessage): void {
    switch (msg.msgId) {
      case LithTechMessageId.MSG_PROTOCOL_VERSION:
        this.logVerbose(`[PacketHandler] Protocol version check`);
        break;
      case LithTechMessageId.MSG_ID_PACKET:
        this.logVerbose(`[PacketHandler] ID packet received`);
        break;
      case LithTechMessageId.MSG_MESSAGE_GROUP:
        this.logVerbose(`[PacketHandler] Message group - need to unpack`);
        break;
      default:
        this.logThrottled(`lithtech-unknown-${msg.msgId}`, `[PacketHandler] Unknown LithTech MSG_ID ${msg.msgId}`);
    }
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
    
    // Server external IP (BE) - 127.0.0.1
    response.writeUInt32BE(0x7F000001, offset); offset += 4;
    
    // Server port (BE)
    response.writeUInt16BE(27888, offset); offset += 2;
    
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
      return this.tryParseLoginRequest(ctx);
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
    const { data, connection, reader } = ctx;
    
    if (this.verbose) {
      console.log(`[PacketHandler] Attempting to parse as LOGIN_REQUEST...`);
      console.log(`[LoginTrace] LOGIN_REQUEST raw bits=${data.length * 8} bytes=${data.length}`);
      console.log(`[LoginTrace] LOGIN_REQUEST raw hex=${data.toString('hex')}`);
    }
    
    if (data.length < 10) {
      console.log(`[PacketHandler] Packet too short for login request`);
      return null;
    }
    
    const packetId = reader.readByte();
    
    try {
      const possibleUsername = this.tryReadString(data, 1, 64);
      const possiblePassword = this.tryReadString(data, 65, 64);
      
      if (possibleUsername && possibleUsername.length > 0) {
        console.log(`[PacketHandler] Possible LOGIN_REQUEST detected:`);
        console.log(`  Packet ID: 0x${packetId.toString(16)}`);
        console.log(`  Username: "${possibleUsername}"`);
        console.log(`  Password: "${possiblePassword ? '***' : '(empty)'}"`);
        
        connection.username = possibleUsername;
        connection.authenticated = true;
        
        const login = this.buildLoginResponse(true, this.worldIp, this.worldPort);
        return this.wrapReliable(login, connection);
      }
    } catch (e) {
      this.logVerbose(`[PacketHandler] Not a valid login request format`);
    }
    
    return null;
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
