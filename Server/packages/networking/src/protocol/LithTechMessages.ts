/**
 * LithTech Message Builder for V2
 *
 * Builds LithTech guaranteed packets. Native RakNet handles the transport layer,
 * but LithTech has its own sequence numbers and framing on top.
 *
 * Based on legacy TS emulator implementation patterns.
 */

import { NativeBitStream } from '../bindings/raknet';
import { LithTechMessageId } from './Constants';
import { BitStreamWriter } from './BitStream';

const SEQUENCE_MASK = 0x1fff; // 13 bits

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
function writeSizeIndicator(writer: BitStreamWriter, size: number): void {
    // Size encoding mirrors LithTech bit-size indicator.
    // Write lower 7 bits
    writer.writeBits(size & 0x7f, 7);

    if (size <= 0x7f) {
        writer.writeBits(0, 1); // No continuation
        return;
    }

    writer.writeBits(1, 1); // Continuation
    writer.writeBits((size >> 7) & 0x7, 3);

    if (size <= 0x3ff) {
        writer.writeBits(0, 1); // No continuation
        return;
    }

    writer.writeBits(1, 1); // Continuation

    // Write remaining bits one at a time
    let mask = 1 << 10;
    while (mask <= size) {
        writer.writeBits((size & mask) ? 1 : 0, 1);
        if (mask * 2 > size) {
            writer.writeBits(0, 1); // No more bits
            break;
        }
        writer.writeBits(1, 1); // More bits
        mask <<= 1;
    }
}

/**
 * Write raw bits from buffer to writer
 */
function writeBitsFromBuffer(writer: BitStreamWriter, buf: Buffer, bitCount: number): void {
    // Copy an arbitrary number of bits from a byte buffer.
    let bitsWritten = 0;
    for (let i = 0; i < buf.length && bitsWritten < bitCount; i++) {
        const byte = buf[i];
        const remaining = bitCount - bitsWritten;
        const take = remaining >= 8 ? 8 : remaining;
        writer.writeBits(byte, take);
        bitsWritten += take;
    }
}

/**
 * Build a LithTech guaranteed packet with submessages
 */
export function buildLithTechGuaranteedPacket(
    sequence: number,
    subMessages: SubMessage[],
): Buffer {
    // Compose LithTech guaranteed packet: sequence + submessage list.
    const writer = new BitStreamWriter(128);

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
    const writer = new BitStreamWriter(32);
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
    const writer = new BitStreamWriter(16);
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
    const writer = new BitStreamWriter(16);
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
    const writer = new BitStreamWriter(24);
    const timeBuf = Buffer.alloc(4);
    timeBuf.writeFloatLE(gameTime, 0);
    writer.writeBytes(timeBuf);
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
    // Initial world handshake burst expected by FoM client.
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
    const bs = new NativeBitStream();
    try {
        bs.writeU8(LithTechMessageId.MSG_UNGUARANTEEDUPDATE);
        bs.writeU32(timestamp >>> 0);
        return bs.getData();
    } finally {
        bs.destroy();
    }
}
