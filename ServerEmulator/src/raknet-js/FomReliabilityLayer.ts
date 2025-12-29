/**
 * FoM-specific RakNet Reliability Layer
 * 
 * FoM uses BYTE-ALIGNED RakNet packets, not the bit-aligned format
 * that standard RakNet uses.
 * 
 * Reliable Packet format:
 * - Byte 0: 0x40 = Reliability header (0x40 = RELIABLE, 0x60 = RELIABLE_ORDERED, etc.)
 * - Bytes 1-3: Message number (24-bit, big endian)
 * - Byte 4: Channel/flags (usually 0x03)
 * - Bytes 5-8: Timestamp (little endian)
 * - Bytes 9-12: Ordering info (big endian)
 * - Bytes 13-16: Data bit length (big endian)
 * - Byte 17+: Inner RakNet/game message
 * 
 * ACK Packet format (0x80):
 * - Byte 0: 0x80 = ACK header
 * - Bytes 1-4: Flags (big endian, usually 0x00000006)
 * - Bytes 5-8: Remote timestamp (little endian)
 * - Bytes 9-12: ACK range info
 * - Bytes 13-16: Message number being ACK'd (big endian)
 */

import * as dgram from 'dgram';

export interface ParsedReliablePacket {
  headerByte: number;
  messageNumber: number;
  timestamp: number;
  orderingInfo: number;
  innerData: Buffer;
  innerMessageId: number;
}

export class FomReliabilityLayer {
  private server: dgram.Socket;
  private connection: { address: string; port: number };
  private messageNumberOut: number = 0;
  private lastRemoteTimestamp: number = 0;
  private lastRemoteMessageNumber: number = 0;
  private pendingAcks: number[] = [];
  private ackInterval: NodeJS.Timeout;

  constructor(server: dgram.Socket, connection: { address: string; port: number }) {
    this.server = server;
    this.connection = connection;
    
    // Send ACKs every 50ms
    this.ackInterval = setInterval(() => this.sendPendingAcks(), 50);
  }

  parseReliablePacket(data: Buffer): ParsedReliablePacket | null {
    if (data.length < 18) {
      console.log(`[FomRL] Packet too short: ${data.length} bytes`);
      return null;
    }

    const headerByte = data[0];
    
    // FoM reliable packets start with 0x40-0x7F (bit 6 set = reliable)
    if ((headerByte & 0x40) !== 0x40) {
      console.log(`[FomRL] Not a reliable packet: 0x${headerByte.toString(16)}`);
      return null;
    }

    // Parse header as byte-aligned, big-endian for multi-byte fields
    // Bytes 1-3: Message number (24-bit, BE) - but FoM seems to put it at 9-12
    // Let's extract from bytes 9-12 where we see varying values
    const msgNumber = data.readUInt32BE(9) & 0xFFFFFF; // Lower 24 bits
    
    // Bytes 5-8: Timestamp (LE, changes each packet)
    const timestamp = data.readUInt32LE(5);
    this.lastRemoteTimestamp = timestamp;
    this.lastRemoteMessageNumber = msgNumber;
    
    // Bytes 9-12: Ordering/sequencing info (BE)
    const orderingInfo = data.readUInt32BE(9);
    
    // Bytes 13-16: Data bit length * 2 (BE)
    const lengthInfo = data.readUInt32BE(13);
    
    // Inner data starts at offset 17
    const innerData = data.subarray(17);
    const innerMessageId = innerData.length > 0 ? innerData[0] : -1;

    console.log(`[FomRL] Parsed reliable packet:`);
    console.log(`  Header: 0x${headerByte.toString(16)}, MsgNum: ${msgNumber}`);
    console.log(`  Timestamp: ${timestamp}, OrderingInfo: 0x${orderingInfo.toString(16)}`);
    console.log(`  LengthInfo: 0x${lengthInfo.toString(16)} (${lengthInfo / 16} bytes)`);
    console.log(`  Inner data: ${innerData.length} bytes, ID: 0x${innerMessageId.toString(16)}`);

    // Queue ACK for this message
    if (!this.pendingAcks.includes(msgNumber)) {
      this.pendingAcks.push(msgNumber);
    }

    return {
      headerByte,
      messageNumber: msgNumber,
      timestamp,
      orderingInfo,
      innerData,
      innerMessageId,
    };
  }

  sendReliable(data: Buffer): void {
    // FoM reliable packet: 17-byte header + data
    // Byte 0: 0x40 (RELIABLE)
    // Bytes 1-4: 00 00 00 03 (BE) - channel/flags
    // Bytes 5-8: timestamp (LE) - echo client's timestamp
    // Bytes 9-12: ordering info (BE) - message number in upper bits
    // Bytes 13-16: length info (BE) - bits * 2
    // Bytes 17+: inner data
    
    const packet = Buffer.alloc(17 + data.length);
    
    packet[0] = 0x40;
    
    // Bytes 1-4: Channel/flags (BE)
    packet.writeUInt32BE(0x00000003, 1);
    
    // Bytes 5-8: Echo client timestamp (LE)
    packet.writeUInt32LE(this.lastRemoteTimestamp || (Date.now() & 0xFFFFFFFF), 5);
    
    // Bytes 9-12: Ordering info (BE) - include our message number
    // Client uses 0x00000010 for first message, then increments
    const orderingInfo = (this.messageNumberOut << 4) | 0x10;
    packet.writeUInt32BE(orderingInfo, 9);
    
    // Bytes 13-16: Length field (BE) - bits * 2
    const lengthField = (data.length * 8 * 2);
    packet.writeUInt32BE(lengthField, 13);
    
    // Inner data
    data.copy(packet, 17);

    console.log(`[FomRL] Sending reliable #${this.messageNumberOut}: ${packet.toString('hex')}`);
    this.messageNumberOut++;
    
    this.server.send(packet, this.connection.port, this.connection.address);
  }

  sendUnreliable(data: Buffer): void {
    console.log(`[FomRL] Sending unreliable: ${data.toString('hex')}`);
    this.server.send(data, this.connection.port, this.connection.address);
  }

  private sendPendingAcks(): void {
    if (this.pendingAcks.length === 0) return;

    // Build BYTE-ALIGNED ACK matching client format:
    // 80 00 00 00 06 [timestamp LE 4 bytes] [ordering BE 4 bytes] [msg# BE 4 bytes]
    
    const ack = Buffer.alloc(17);
    ack[0] = 0x80; // ACK header
    
    // Bytes 1-4: Flags (BE) - client uses 0x00000006
    ack.writeUInt32BE(0x00000006, 1);
    
    // Bytes 5-8: Echo timestamp (LE)
    ack.writeUInt32LE(this.lastRemoteTimestamp, 5);
    
    // Bytes 9-12: ACK range info (BE) - use 0x00000060 like client
    ack.writeUInt32BE(0x00000060, 9);
    
    // Bytes 13-16: Message number being ACK'd (BE)
    const msgToAck = this.pendingAcks[this.pendingAcks.length - 1] || 0;
    ack.writeUInt32BE(msgToAck, 13);

    console.log(`[FomRL] Sending ACK (byte-aligned): ${ack.toString('hex')} for msg ${msgToAck}`);
    this.server.send(ack, this.connection.port, this.connection.address);
    
    this.pendingAcks = [];
  }

  destroy(): void {
    if (this.ackInterval) {
      clearInterval(this.ackInterval);
    }
  }
}
