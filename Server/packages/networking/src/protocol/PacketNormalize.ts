import { LithPacketRead } from '../bindings/lithnet';
import { parseReliablePayload } from '../bindings/raknet';
import { LithTechMessageId, RakNetMessageId } from '../../../packets/src/shared';

export interface PacketNormalizeOptions {
    raknetTimeBytes: number;
    raknetIdSet: ReadonlySet<number>;
    lithIdSet: ReadonlySet<number>;
    enableReliableUnwrap: boolean;
    enableLithDecode: boolean;
    trace?: boolean;
    tracePrefix?: string;
}

export interface PacketNormalizeResult {
    messageId: number;
    payload: Buffer;
    rawMessageId: number;
    lithId?: number;
    lithPayload?: Buffer;
    traceLines?: string[];
}

const isReliabilityFrame = (id: number): boolean => {
    const top = id & 0xC0;
    return top === 0x40 || top === 0xC0;
};

const normalizeLithPayload = (
    payload: Buffer,
    lithIdSet: ReadonlySet<number>,
    traceLines: string[] | undefined,
): { messageId: number; payload: Buffer; lithId: number } | null => {
    if (payload.length < 1) return null;
    const lithId = payload[0] ?? 0;
    if (lithIdSet.has(lithId)) {
        return { messageId: lithId, payload, lithId };
    }

    if (lithId === LithTechMessageId.MSG_MESSAGE) {
        try {
            using reader = new LithPacketRead(payload);
            const msgId = reader.readUint8();
            if (msgId !== LithTechMessageId.MSG_MESSAGE) return null;
            const packetId = reader.readUint8();
            const remainingBits = reader.tellEnd() - reader.tell();
            const innerPayload = remainingBits > 0 ? reader.readData(remainingBits) : Buffer.alloc(0);
            if (!lithIdSet.has(packetId)) return null;
            const wrapped = Buffer.concat([Buffer.from([packetId & 0xff]), innerPayload]);
            traceLines?.push(`[Dispatch] MSG_MESSAGE inner=0x${packetId.toString(16)} bits=${remainingBits}`);
            return { messageId: packetId, payload: wrapped, lithId: packetId };
        } catch {
            return null;
        }
    }

    if (lithId === LithTechMessageId.MSG_MESSAGE_GROUP) {
        try {
            using reader = new LithPacketRead(payload);
            const msgId = reader.readUint8();
            if (msgId !== LithTechMessageId.MSG_MESSAGE_GROUP) return null;
            while (!reader.eop()) {
                const subBits = reader.readUint8();
                if (subBits === 0) break;
                const subPayload = reader.readData(subBits);
                if (!subPayload.length) continue;
                const innerId = subPayload[0] ?? 0;
                if (!lithIdSet.has(innerId)) {
                    continue;
                }
                traceLines?.push(`[Dispatch] MSG_MESSAGE_GROUP inner=0x${innerId.toString(16)} bits=${subBits}`);
                return { messageId: innerId, payload: subPayload, lithId: innerId };
            }
        } catch {
            return null;
        }
    }

    return null;
};

export const normalizePacketForDispatch = (
    payload: Buffer,
    options: PacketNormalizeOptions,
): PacketNormalizeResult => {
    const traceLines = options.trace ? [] : undefined;
    const tracePrefix = options.tracePrefix ?? 'Dispatch';
    let messageId = payload[0] ?? 0;
    const rawMessageId = messageId;

    if (options.enableReliableUnwrap && isReliabilityFrame(messageId)) {
        const parsed = parseReliablePayload(payload);
        if (parsed && parsed.payloadLength > 0) {
            const end = parsed.payloadOffset + parsed.payloadLength;
            if (end <= payload.length) {
                const innerId = payload[parsed.payloadOffset] ?? 0;
                const innerKnown =
                    options.raknetIdSet.has(innerId) ||
                    options.lithIdSet.has(innerId) ||
                    innerId >= RakNetMessageId.ID_USER_PACKET_ENUM;
                if (innerKnown) {
                    payload = payload.subarray(parsed.payloadOffset, end);
                    messageId = innerId;
                    traceLines?.push(
                        `[${tracePrefix}] RELIABLE_UNWRAP outer=0x${rawMessageId.toString(16)} ` +
                        `rel=${parsed.reliability} off=${parsed.payloadOffset} len=${parsed.payloadLength} ` +
                        `inner=0x${innerId.toString(16)}`,
                    );
                } else {
                    traceLines?.push(
                        `[${tracePrefix}] RELIABLE_UNWRAP skip outer=0x${rawMessageId.toString(16)} ` +
                        `inner=0x${innerId.toString(16)} reason=unknown`,
                    );
                }
            } else {
                traceLines?.push(
                    `[${tracePrefix}] RELIABLE_UNWRAP fail outer=0x${rawMessageId.toString(16)} ` +
                    `reason=OOB off=${parsed.payloadOffset} len=${parsed.payloadLength} size=${payload.length}`,
                );
            }
        } else {
            traceLines?.push(`[${tracePrefix}] RELIABLE_UNWRAP fail outer=0x${rawMessageId.toString(16)}`);
        }
    }

    if (messageId === RakNetMessageId.ID_TIMESTAMP) {
        if (payload.length >= 1 + options.raknetTimeBytes + 1) {
            const innerOffset = 1 + options.raknetTimeBytes;
            payload = payload.subarray(innerOffset);
            messageId = payload[0] ?? 0;
            traceLines?.push(
                `[${tracePrefix}] TIMESTAMP unwrap bytes=${options.raknetTimeBytes} inner=0x${messageId.toString(16)}`,
            );
        } else {
            traceLines?.push(
                `[${tracePrefix}] TIMESTAMP unwrap fail bytes=${options.raknetTimeBytes} len=${payload.length}`,
            );
        }
    }

    if (options.enableLithDecode && messageId === RakNetMessageId.ID_USER_PACKET_ENUM) {
        const lithPayload = payload.subarray(1);
        const decoded = normalizeLithPayload(lithPayload, options.lithIdSet, traceLines);
        if (decoded) {
            payload = decoded.payload;
            messageId = decoded.messageId;
            return {
                messageId,
                payload,
                rawMessageId,
                lithId: decoded.lithId,
                lithPayload: decoded.payload,
                traceLines,
            };
        }
        traceLines?.push(`[${tracePrefix}] LITH unwrap skip reason=unknown`);
    }

    return {
        messageId,
        payload,
        rawMessageId,
        traceLines,
    };
};
