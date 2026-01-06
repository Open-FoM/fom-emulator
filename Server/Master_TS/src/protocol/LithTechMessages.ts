/**
 * LithTech Message Builder for V2
 *
 * Builds LithTech guaranteed packets. Native RakNet handles the transport layer,
 * but LithTech has its own sequence numbers and framing on top.
 *
 * Based on legacy TS emulator implementation patterns.
 */

import { RakBitStream } from './HuffmanCodec';

// LithTech message IDs
export const LithTechMessageId = {
    MSG_CYCLECHECK: 4,
    MSG_NETPROTOCOLVERSION: 4,
    MSG_LOADWORLD: 6,
    MSG_CLIENTOBJECTID: 7,
    MSG_UPDATE: 8,
    MSG_CONNECTSTAGE: 9,
    MSG_UNGUARANTEEDUPDATE: 10,
    MSG_YOURID: 12,
    MSG_MESSAGE_GROUP: 14,
} as const;

const SEQUENCE_MASK = 0x1fff; // 13 bits

/**
 * Simple MSB-first bit writer for LithTech message building
 */
class LithBitWriter {
    private buffer: number[] = [];
    private currentByte = 0;
    private bitPos = 7; // MSB first

    writeBit(b: number): void {
        this.currentByte |= (b & 1) << this.bitPos;
        if (--this.bitPos < 0) {
            this.buffer.push(this.currentByte);
            this.currentByte = 0;
            this.bitPos = 7;
        }
    }

    writeBits(value: number, count: number): void {
        for (let i = count - 1; i >= 0; i--) {
            this.writeBit((value >> i) & 1);
        }
    }

    writeByte(n: number): void {
        this.writeBits(n & 0xff, 8);
    }

    writeBytes(buf: Buffer): void {
        for (let i = 0; i < buf.length; i++) {
            this.writeByte(buf[i]);
        }
    }

    writeFloat(n: number): void {
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(n, 0);
        this.writeBytes(buf);
    }

    toBuffer(): Buffer {
        const result = [...this.buffer];
        if (this.bitPos < 7) {
            result.push(this.currentByte);
        }
        return Buffer.from(result);
    }
}

interface SubMessage {
    msgId: number;
    payload: Buffer;
    payloadBits: number;
}

/**
 * Write LithTech size indicator (variable length encoding)
 *
 * Format:
 * - 7 bits + 1 continuation bit
 * - If continuation set, 3 more bits + 1 continuation bit
 * - Then remaining bits one at a time with continuation
 */
function writeSizeIndicator(writer: LithBitWriter, size: number): void {
    // Write lower 7 bits
    writer.writeBits(size & 0x7f, 7);

    if (size <= 0x7f) {
        writer.writeBit(0); // No continuation
        return;
    }

    writer.writeBit(1); // Continuation
    writer.writeBits((size >> 7) & 0x7, 3);

    if (size <= 0x3ff) {
        writer.writeBit(0); // No continuation
        return;
    }

    writer.writeBit(1); // Continuation

    // Write remaining bits one at a time
    let mask = 1 << 10;
    while (mask <= size) {
        writer.writeBit((size & mask) ? 1 : 0);
        if (mask * 2 > size) {
            writer.writeBit(0); // No more bits
            break;
        }
        writer.writeBit(1); // More bits
        mask <<= 1;
    }
}

/**
 * Write raw bits from buffer to writer
 */
function writeBitsFromBuffer(writer: LithBitWriter, buf: Buffer, bitCount: number): void {
    let bitsWritten = 0;
    for (let i = 0; i < buf.length && bitsWritten < bitCount; i++) {
        const byte = buf[i];
        for (let bit = 7; bit >= 0 && bitsWritten < bitCount; bit--) {
            writer.writeBit((byte >> bit) & 1);
            bitsWritten++;
        }
    }
}

/**
 * Build a LithTech guaranteed packet with submessages
 */
export function buildLithTechGuaranteedPacket(
    sequence: number,
    subMessages: SubMessage[],
): Buffer {
    const writer = new LithBitWriter();

    // 13-bit sequence number
    writer.writeBits(sequence & SEQUENCE_MASK, 13);
    // No continuation
    writer.writeBits(0, 1);

    for (let i = 0; i < subMessages.length; i++) {
        const msg = subMessages[i];
        const subBits = msg.payloadBits + 8; // +8 for msgId byte

        // Size indicator
        writeSizeIndicator(writer, subBits);

        // Message ID
        writer.writeBits(msg.msgId & 0xff, 8);

        // Payload bits
        if (msg.payloadBits > 0) {
            writeBitsFromBuffer(writer, msg.payload, msg.payloadBits);
        }

        // Has more messages flag
        const hasMore = i < subMessages.length - 1;
        writer.writeBits(hasMore ? 1 : 0, 1);
    }

    // Terminator padding
    writer.writeBits(0, 8);

    return writer.toBuffer();
}

/**
 * Build protocol version payload (MSG_NETPROTOCOLVERSION = 4)
 */
export function buildProtocolVersionPayload(): SubMessage {
    const writer = new LithBitWriter();
    writer.writeBits(7, 32); // Protocol version 7
    writer.writeBits(0, 32); // Additional version data
    return {
        msgId: LithTechMessageId.MSG_NETPROTOCOLVERSION,
        payload: writer.toBuffer(),
        payloadBits: 64,
    };
}

/**
 * Build your ID payload (MSG_YOURID = 12)
 */
export function buildYourIdPayload(clientId: number): SubMessage {
    const writer = new LithBitWriter();
    writer.writeBits(clientId & 0xffff, 16);
    writer.writeBits(0, 8); // bLocal flag (0 = remote)
    return {
        msgId: LithTechMessageId.MSG_YOURID,
        payload: writer.toBuffer(),
        payloadBits: 24,
    };
}

/**
 * Build client object ID payload (MSG_CLIENTOBJECTID = 7)
 */
export function buildClientObjectIdPayload(objectId: number): SubMessage {
    const writer = new LithBitWriter();
    writer.writeBits(objectId & 0xffff, 16);
    return {
        msgId: LithTechMessageId.MSG_CLIENTOBJECTID,
        payload: writer.toBuffer(),
        payloadBits: 16,
    };
}

/**
 * Build load world payload (MSG_LOADWORLD = 6)
 */
export function buildLoadWorldPayload(worldId: number, gameTime = 0.0): SubMessage {
    const writer = new LithBitWriter();
    writer.writeFloat(gameTime);
    writer.writeBits(worldId & 0xffff, 16);
    return {
        msgId: LithTechMessageId.MSG_LOADWORLD,
        payload: writer.toBuffer(),
        payloadBits: 48,
    };
}

/**
 * Build the initial world login burst packet
 * Contains: NETPROTOCOLVERSION + YOURID + CLIENTOBJECTID + LOADWORLD
 */
export function buildWorldLoginBurst(
    sequence: number,
    clientId: number,
    objectId: number,
    worldId: number,
): Buffer {
    const subMessages: SubMessage[] = [
        buildProtocolVersionPayload(),
        buildYourIdPayload(clientId),
        buildClientObjectIdPayload(objectId),
        buildLoadWorldPayload(worldId, 0.0),
    ];
    return buildLithTechGuaranteedPacket(sequence, subMessages);
}

/**
 * Build unguaranteed update heartbeat (MSG_UNGUARANTEEDUPDATE = 10)
 */
export function buildUnguaranteedUpdate(timestamp: number): Buffer {
    const writer = new RakBitStream();
    writer.writeByte(LithTechMessageId.MSG_UNGUARANTEEDUPDATE);
    writer.writeLong(timestamp);
    return writer.data;
}
