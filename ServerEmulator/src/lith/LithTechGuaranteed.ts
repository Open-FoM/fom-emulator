import RakBitStream from '../raknet-js/structures/BitStream';
import { BitStreamReader, BitStreamWriter } from '../protocol/BitStream';
import { Connection } from '../network/Connection';

export interface LithTechSubMessage {
    msgId: number;
    payload: Buffer;
    payloadBits: number;
}

type LithParseHooks = {
    logNote?: (message: string) => void;
    shouldLogNoise?: () => boolean;
};

function readLithSizeIndicator(reader: BitStreamReader): number {
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

function skipLithBits(reader: BitStreamReader, bits: number): void {
    let remaining = bits;
    while (remaining > 0) {
        const take = Math.min(32, remaining);
        reader.readBits(take);
        remaining -= take;
    }
}

export function readLithBitsToBuffer(reader: BitStreamReader, bits: number): Buffer {
    const bytes = Buffer.alloc(Math.ceil(bits / 8));
    let remaining = bits;
    for (let i = 0; i < bytes.length; i += 1) {
        const take = Math.min(8, remaining);
        bytes[i] = take > 0 ? reader.readBits(take) : 0;
        remaining -= take;
    }
    return bytes;
}

export function repackLithBitsToRak(payload: Buffer, payloadBits: number): Buffer {
    const reader = new BitStreamReader(payload);
    const writer = new RakBitStream();
    for (let i = 0; i < payloadBits; i += 1) {
        writer.writeBit(reader.readBits(1) === 1);
    }
    const outBytes = Math.ceil(writer.bits() / 8);
    return writer.data.subarray(0, outBytes);
}

function concatLithBitBuffers(aBuf: Buffer, aBits: number, bBuf: Buffer, bBits: number): Buffer {
    const writer = new BitStreamWriter(Math.ceil((aBits + bBits) / 8));
    const readerA = new BitStreamReader(aBuf);
    let remainingA = aBits;
    while (remainingA > 0) {
        const take = Math.min(32, remainingA);
        writer.writeBits(readerA.readBits(take), take);
        remainingA -= take;
    }
    const readerB = new BitStreamReader(bBuf);
    let remainingB = bBits;
    while (remainingB > 0) {
        const take = Math.min(32, remainingB);
        writer.writeBits(readerB.readBits(take), take);
        remainingB -= take;
    }
    return writer.toBuffer();
}

export function parseLithTechGuaranteedSubPackets(
    buffer: Buffer,
    reader: BitStreamReader,
    connection: Connection,
    lastContinued: boolean,
    hooks: LithParseHooks = {},
): LithTechSubMessage[] {
    const packets: Array<{
        msgId: number;
        payload: Buffer;
        payloadBits: number;
        full: Buffer;
        fullBits: number;
    }> = [];
    let lastPacket = false;
    let safety = 0;
    const maxPackets = Math.max(4, buffer.length);

    try {
        while (!lastPacket && reader.remainingBits > 0 && safety < maxPackets) {
            safety += 1;
            const subBits = readLithSizeIndicator(reader);
            if (subBits === 0) {
                lastPacket = !reader.readBool();
                if (lastPacket) break;
                continue;
            }
            if (reader.remainingBits < subBits) break;

            const subStartBit = reader.position;
            const subReader = new BitStreamReader(buffer, subStartBit);
            const msgId = subBits >= 8 ? subReader.readBits(8) : -1;
            const payloadBits = Math.max(0, subBits - 8);
            const payload =
                payloadBits > 0 ? readLithBitsToBuffer(subReader, payloadBits) : Buffer.alloc(0);
            const full = Buffer.concat([Buffer.from([msgId & 0xff]), payload]);
            packets.push({ msgId, payload, payloadBits, full, fullBits: subBits });

            skipLithBits(reader, subBits);
            lastPacket = !reader.readBool();
        }
    } catch (e) {
        if (hooks.shouldLogNoise?.()) {
            hooks.logNote?.(`[LithParse] guaranteed parse error: ${e}`);
        }
        return [];
    }

    // Combine with any partial from previous frame.
    if (connection.lithPartialBits && connection.lithPartialBitLength > 0) {
        if (packets.length > 0) {
            const combinedFull = concatLithBitBuffers(
                connection.lithPartialBits,
                connection.lithPartialBitLength,
                packets[0].full,
                packets[0].fullBits,
            );
            const combinedBits = connection.lithPartialBitLength + packets[0].fullBits;
            const combinedReader = new BitStreamReader(combinedFull);
            const combinedMsgId = combinedBits >= 8 ? combinedReader.readBits(8) : -1;
            const combinedPayloadBits = Math.max(0, combinedBits - 8);
            const combinedPayload =
                combinedPayloadBits > 0
                    ? readLithBitsToBuffer(combinedReader, combinedPayloadBits)
                    : Buffer.alloc(0);
            packets[0] = {
                msgId: combinedMsgId,
                payload: combinedPayload,
                payloadBits: combinedPayloadBits,
                full: combinedFull,
                fullBits: combinedBits,
            };
            connection.lithPartialBits = null;
            connection.lithPartialBitLength = 0;
        }
    }

    // Store last continued sub-packet for next frame.
    if (lastContinued && packets.length > 0) {
        const tail = packets.pop() as {
            msgId: number;
            payload: Buffer;
            payloadBits: number;
            full: Buffer;
            fullBits: number;
        };
        connection.lithPartialBits = tail.full;
        connection.lithPartialBitLength = tail.fullBits;
        if (hooks.shouldLogNoise?.()) {
            hooks.logNote?.(
                `[LithPartial] stored bits=${tail.fullBits} msg=0x${tail.msgId.toString(16)}`,
            );
        }
    }

    return packets.map((p) => ({ msgId: p.msgId, payload: p.payload, payloadBits: p.payloadBits }));
}

export function parseLithTechGuaranteedSubPacketsAtOffset(
    buffer: Buffer,
    startBit: number,
): { packets: LithTechSubMessage[]; invalid: number; total: number } {
    const packets: LithTechSubMessage[] = [];
    let invalid = 0;
    let total = 0;
    const reader = new BitStreamReader(buffer, startBit);
    let lastPacket = false;
    let safety = 0;
    const maxPackets = Math.max(4, buffer.length);

    try {
        while (!lastPacket && reader.remainingBits > 0 && safety < maxPackets) {
            safety += 1;
            const subBits = readLithSizeIndicator(reader);
            total += 1;
            if (subBits === 0) {
                if (reader.remainingBits < 1) break;
                lastPacket = !reader.readBool();
                if (lastPacket) break;
                continue;
            }
            if (subBits < 8 || subBits > reader.remainingBits) {
                invalid += 1;
                break;
            }
            const subStartBit = reader.position;
            const subReader = new BitStreamReader(buffer, subStartBit);
            const msgId = subReader.readBits(8);
            const payloadBits = Math.max(0, subBits - 8);
            const payload =
                payloadBits > 0 ? readLithBitsToBuffer(subReader, payloadBits) : Buffer.alloc(0);
            packets.push({ msgId, payload, payloadBits });

            skipLithBits(reader, subBits);
            if (reader.remainingBits < 1) break;
            lastPacket = !reader.readBool();
        }
    } catch {
        invalid += 1;
    }

    return { packets, invalid, total };
}

export function sweepLithTechGuaranteedOffsets(
    buffer: Buffer,
    connection: Connection,
    baseBitOffset: number,
    maxOffsetBits: number = 16,
    hooks: LithParseHooks = {},
): { startBit: number; packets: LithTechSubMessage[] } {
    let bestStart = baseBitOffset;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestPackets: LithTechSubMessage[] = [];
    const maxBit = Math.min(buffer.length * 8, baseBitOffset + maxOffsetBits);

    const isLikelyMsgId = (id: number): boolean => {
        return (
            (id >= 0x04 && id <= 0x17) || id === 0x6b || id === 0x6c || id === 0x6d || id === 0xff
        );
    };

    for (let start = baseBitOffset; start < maxBit; start += 1) {
        const result = parseLithTechGuaranteedSubPacketsAtOffset(buffer, start);
        const msgScore = result.packets.reduce(
            (acc, msg) => acc + (isLikelyMsgId(msg.msgId) ? 2 : 0),
            0,
        );
        const score = result.packets.length * 3 + msgScore - result.invalid * 5;
        if (score > bestScore) {
            bestScore = score;
            bestStart = start;
            bestPackets = result.packets;
        }
    }

    const preview = bestPackets
        .slice(0, 4)
        .map((m) => `0x${m.msgId.toString(16)}`)
        .join(',');
    hooks.logNote?.(
        `[LithSweep] ${connection.key} base=${baseBitOffset} bestStart=${bestStart} msgs=${bestPackets.length} score=${bestScore} preview=[${preview}]`,
    );

    return { startBit: bestStart, packets: bestPackets };
}
