import { Connection } from '../network/Connection';
import { RakNetMessageId } from '../protocol/Constants';
import BitStream from '../raknet-js/structures/BitStream';
import { RangeList, RangeListRange } from '../raknet-js/structures/RangeList';
import { Reliability } from '../raknet-js/ReliabilityLayer';

export type ParsedRakNetPacket = {
    messageNumber: number;
    reliability: number;
    orderingChannel?: number;
    orderingIndex?: number;
    isSplit: boolean;
    splitPacketId?: number;
    splitPacketIndex?: number;
    splitPacketCount?: number;
    innerData: Buffer;
};

export type ParsedRakNetDatagram = {
    format: 'raknet' | 'legacy';
    hasAcks: boolean;
    ackRanges?: RangeList;
    hasRemoteTime: boolean;
    remoteTime?: number;
    packets: ParsedRakNetPacket[];
};

type ReliableLogHooks = {
    logVerbose?: (message: string) => void;
};

function scoreParsedDatagram(parsed: ParsedRakNetDatagram): number {
    let score = 0;
    if (parsed.hasRemoteTime) score += 1;
    for (const pkt of parsed.packets) {
        if (pkt.innerData.length > 0) score += 1;
        if (
            pkt.reliability === Reliability.RELIABLE ||
            pkt.reliability === Reliability.RELIABLE_ORDERED ||
            pkt.reliability === Reliability.RELIABLE_SEQUENCED
        ) {
            score += 2;
        }
        if (
            pkt.innerData.includes(RakNetMessageId.ID_LOGIN_REQUEST_TEXT) ||
            pkt.innerData.includes(RakNetMessageId.ID_LOGIN_REQUEST_RETURN) ||
            pkt.innerData.includes(RakNetMessageId.ID_LOGIN) ||
            pkt.innerData.includes(RakNetMessageId.ID_WORLD_LOGIN) ||
            pkt.innerData.includes(RakNetMessageId.ID_WORLD_LOGIN_RETURN) ||
            pkt.innerData.includes(RakNetMessageId.ID_WORLD_SELECT)
        ) {
            score += 5;
        }
        const first = pkt.innerData.length > 0 ? pkt.innerData[0] : -1;
        if (
            first === RakNetMessageId.ID_CONNECTION_REQUEST ||
            first === RakNetMessageId.ID_NEW_INCOMING_CONNECTION
        ) {
            score += 3;
        }
    }
    return score;
}

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

function parseRakNetBitAligned(data: Buffer): ParsedRakNetDatagram | null {
    if (!data || data.length === 0) return null;

    const stream = new SafeBitReader(data);
    const hasAcksBit = stream.readBit();
    if (hasAcksBit === null) return null;
    const hasAcks = hasAcksBit === 1;
    let ackRanges: RangeList | undefined;
    let ackRemoteTime: number | undefined;

    if (hasAcks) {
        ackRemoteTime = stream.readLong() ?? undefined;
        if (ackRemoteTime === undefined) return null;
        const count = stream.readCompressedUnsigned(2);
        if (count === null) return null;
        ackRanges = new RangeList();
        for (let i = 0; i < count; i += 1) {
            const equalBit = stream.readBit();
            const min = stream.readLong();
            if (equalBit === null || min === null) return null;
            let max = min;
            if (equalBit === 0) {
                const maxVal = stream.readLong();
                if (maxVal === null) return null;
                max = maxVal;
            }
            ackRanges.ranges.push(new RangeListRange(min, max));
        }
        if (stream.remainingBits() === 0) {
            return {
                format: 'raknet',
                hasAcks,
                ackRanges,
                hasRemoteTime: false,
                remoteTime: ackRemoteTime,
                packets: [],
            };
        }
    }

    const hasRemoteBit = stream.readBit();
    if (hasRemoteBit === null) return null;
    const hasRemoteTime = hasRemoteBit === 1;
    const remoteTime = hasRemoteTime ? (stream.readLong() ?? undefined) : undefined;
    if (hasRemoteTime && remoteTime === undefined) return null;
    const packets: ParsedRakNetPacket[] = [];

    while (stream.remainingBits() >= 8) {
        const messageNumber = stream.readLong();
        const reliabilityBits = stream.readBits(3);
        if (messageNumber === null || reliabilityBits === null) return null;
        const reliability = reliabilityBits;

        let orderingChannel: number | undefined;
        let orderingIndex: number | undefined;
        if (
            reliability === Reliability.UNRELIABLE_SEQUENCED ||
            reliability === Reliability.RELIABLE_ORDERED ||
            reliability === Reliability.RELIABLE_SEQUENCED
        ) {
            const channelBits = stream.readBits(5);
            const orderingVal = stream.readLong();
            if (channelBits === null || orderingVal === null) return null;
            orderingChannel = channelBits;
            orderingIndex = orderingVal;
        }

        const splitBit = stream.readBit();
        if (splitBit === null) return null;
        const isSplit = splitBit === 1;
        let splitPacketId: number | undefined;
        let splitPacketIndex: number | undefined;
        let splitPacketCount: number | undefined;
        if (isSplit) {
            const splitId = stream.readShort();
            const splitIndex = stream.readCompressedUnsigned(4);
            const splitCount = stream.readCompressedUnsigned(4);
            if (splitId === null || splitIndex === null || splitCount === null) return null;
            splitPacketId = splitId;
            splitPacketIndex = splitIndex;
            splitPacketCount = splitCount;
        }

        const lengthBits = stream.readCompressedUnsigned(2);
        if (lengthBits === null) return null;
        stream.alignRead();
        if (lengthBits > stream.remainingBits()) {
            return null;
        }

        const innerStream = new BitStream();
        for (let i = 0; i < lengthBits; i += 1) {
            const bit = stream.readBit();
            if (bit === null) return null;
            innerStream.writeBit(bit === 1);
        }

        const innerBytes = Math.ceil(lengthBits / 8);
        const innerData = innerStream.data.subarray(0, innerBytes);

        packets.push({
            messageNumber,
            reliability,
            orderingChannel,
            orderingIndex,
            isSplit,
            splitPacketId,
            splitPacketIndex,
            splitPacketCount,
            innerData,
        });
    }

    return {
        format: 'raknet',
        hasAcks,
        ackRanges,
        hasRemoteTime,
        remoteTime,
        packets,
    };
}

function parseLegacyDatagram(data: Buffer): ParsedRakNetDatagram | null {
    if (!data || data.length < 18) return null;
    const headerByte = data[0];
    if ((headerByte & 0x40) !== 0x40) return null;

    const timestamp = data.readUInt32LE(5);
    const orderingInfo = data.readUInt32BE(9);
    const messageNumber = (orderingInfo >> 4) & 0xffffff;
    const innerData = data.subarray(17);

    return {
        format: 'legacy',
        hasAcks: false,
        ackRanges: undefined,
        hasRemoteTime: true,
        remoteTime: timestamp,
        packets: [
            {
                messageNumber,
                reliability: Reliability.RELIABLE,
                orderingChannel: undefined,
                orderingIndex: undefined,
                isSplit: false,
                innerData,
            },
        ],
    };
}

export function parseRakNetDatagram(data: Buffer): ParsedRakNetDatagram | null {
    const raknet = parseRakNetBitAligned(data);
    const legacy = parseLegacyDatagram(data);

    if (raknet && legacy) {
        const rakScore = scoreParsedDatagram(raknet);
        const legScore = scoreParsedDatagram(legacy);
        return legScore >= rakScore ? legacy : raknet;
    }
    return legacy ?? raknet;
}

export function wrapReliablePacket(
    innerData: Buffer,
    connection: Connection,
    hooks: ReliableLogHooks = {},
): Buffer {
    const useLegacy = connection.reliableFormat === 'legacy';
    const ourMsgNum = connection.outgoingMessageNumber || 0;
    let packetBuf: Buffer;

    if (useLegacy) {
        const legacy = Buffer.alloc(17 + innerData.length);
        legacy[0] = 0x40;
        legacy.writeUInt32BE(0x00000003, 1);
        legacy.writeUInt32LE(connection.lastTimestamp || 0, 5);
        const orderingInfo = (ourMsgNum << 4) | 0x10;
        legacy.writeUInt32BE(orderingInfo, 9);
        legacy.writeUInt32BE(innerData.length * 8 * 2, 13);
        innerData.copy(legacy, 17);
        packetBuf = legacy;
    } else {
        const packet = new BitStream();
        const remoteTime = connection.lastTimestamp || 0;

        // No ACK data in data packets (ACKs are sent separately).
        packet.writeBit(false);

        // FoM/RakNet expects the remote time bit set.
        packet.writeBit(true);
        packet.writeLong(remoteTime >>> 0);

        packet.writeLong(ourMsgNum >>> 0);
        packet.writeBits(Reliability.RELIABLE, 3);

        // No ordering channel/index for RELIABLE (only for sequenced/ordered).
        packet.writeBit(false); // not split

        packet.writeCompressedShort(innerData.length * 8);
        packet.alignWrite();
        for (let i = 0; i < innerData.length; i += 1) {
            packet.writeByte(innerData[i]);
        }

        packetBuf = packet.data;
    }

    connection.outgoingMessageNumber = ourMsgNum + 1;

    if (innerData.length > 0 && innerData[0] === RakNetMessageId.ID_LOGIN_REQUEST_RETURN) {
        connection.loginResponseSendCount += 1;
        connection.lastLoginResponseMsgNum = ourMsgNum;
        connection.lastLoginResponseSentAt = Date.now();
    }

    hooks.logVerbose?.(
        `[PacketHandler] Wrapped reliable #${ourMsgNum}: ${packetBuf.toString('hex')}`,
    );
    return packetBuf;
}

export function buildAckPacket(connection: Connection): Buffer {
    if (!connection.pendingAcks || connection.pendingAcks.length === 0) {
        return Buffer.alloc(0);
    }

    const useLegacy = connection.reliableFormat === 'legacy';
    if (useLegacy) {
        const ack = Buffer.alloc(17);
        ack[0] = 0x80;
        ack.writeUInt32BE(0x00000006, 1);
        ack.writeUInt32LE(connection.lastTimestamp || 0, 5);
        ack.writeUInt32BE(0x00000060, 9);
        ack.writeUInt32BE(connection.lastMessageNumber || 0, 13);
        connection.pendingAcks = [];
        return ack;
    }

    const ackList = new RangeList();
    for (const msg of connection.pendingAcks) {
        ackList.add(msg >>> 0);
    }

    const ack = new BitStream();
    ack.writeBit(true);
    ack.writeLong((connection.lastTimestamp || 0) >>> 0);
    ack.writeBitStream(ackList.serialize());

    connection.pendingAcks = [];
    return ack.data;
}
