import { OFFLINE_MESSAGE_ID, OPEN_CONNECTION_PROTOCOL_VERSION, RakNetMessageId } from './Constants';
import RakBitStream from '../raknet-js/structures/BitStream';
import { writeHuffmanStringRawLenBE } from './RakStringCompressor';

export interface RakPeerGuidSeed {
    guid: Buffer;
    seed: Buffer;
}

export interface OpenConnectionRequestOptions {
    targetIp: string;
    targetPort: number;
    protocolVersion?: number;
    guid?: Buffer;
    seed?: Buffer;
}

export interface LoginRequestTextOptions {
    username: string;
    token: number;
    includeTimestamp?: boolean;
    timestampMs?: bigint;
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
let lastQpcMicros = 0n;

const sleepMs = (ms: number): void => {
    if (ms <= 0) return;
    Atomics.wait(sleepBuffer, 0, 0, ms);
};

const qpcMicros64 = (): bigint => {
    const now = process.hrtime.bigint() / 1000n;
    if (now < lastQpcMicros) return lastQpcMicros;
    lastQpcMicros = now;
    return now;
};

const qpcMicros32 = (): number => Number(qpcMicros64() & 0xffffffffn) >>> 0;
const time64Seconds32 = (): number => Math.floor(Date.now() / 1000) >>> 0;

const ensureGuidSeed = (guid?: Buffer, seed?: Buffer): RakPeerGuidSeed => {
    if (guid && guid.length !== 16) {
        throw new Error('guid must be 16 bytes');
    }
    if (seed && seed.length !== 8) {
        throw new Error('seed must be 8 bytes');
    }
    if (guid && seed) return { guid, seed };
    const generated = buildRakPeerGuidSeed();
    return {
        guid: guid ?? generated.guid,
        seed: seed ?? generated.seed,
    };
};

export const parseIpv4Bytes = (value: string): number[] | null => {
    const parts = value.split('.');
    if (parts.length !== 4) return null;
    const bytes = parts.map((part) => Number.parseInt(part, 10));
    if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null;
    return bytes;
};

export const buildRakPeerGuidSeed = (): RakPeerGuidSeed => {
    const words = new Uint32Array(6);
    words[0] = qpcMicros32();
    words[1] = time64Seconds32();
    for (let i = 2; i < 6; i += 1) {
        sleepMs(1);
        sleepMs(0);
        words[i] = qpcMicros32();
        for (let j = 0; j < 7; j += 1) {
            const v6 = qpcMicros32() & 0xff;
            sleepMs(1);
            sleepMs(0);
            const v7 = qpcMicros32() & 0xff;
            const nibble = (v7 - v6) & 0x0f;
            const shift = 28 - 4 * j;
            words[i] = (words[i] ^ ((nibble << shift) >>> 0)) >>> 0;
        }
    }

    const buffer = Buffer.alloc(24);
    for (let i = 0; i < words.length; i += 1) {
        buffer.writeUInt32LE(words[i], i * 4);
    }
    return {
        guid: buffer.subarray(0, 16),
        seed: buffer.subarray(16),
    };
};

export const writeInvertedIpPort = (
    buffer: Buffer,
    offset: number,
    ipBytes: number[],
    port: number,
): number => {
    for (let i = 0; i < 4; i += 1) {
        const b = ipBytes[i] ?? 0;
        buffer[offset++] = ~b & 0xff;
    }
    const clampedPort = Math.max(0, Math.min(0xffff, port));
    buffer.writeUInt16BE(clampedPort, offset);
    return offset + 2;
};

export const buildOpenConnectionRequest = (options: OpenConnectionRequestOptions): Buffer => {
    const protocolVersion = options.protocolVersion ?? OPEN_CONNECTION_PROTOCOL_VERSION;
    const { guid, seed } = ensureGuidSeed(options.guid, options.seed);
    const ipBytes = parseIpv4Bytes(options.targetIp) || [127, 0, 0, 1];
    const payloadLength = 1 + 1 + 24 + OFFLINE_MESSAGE_ID.length + 4 + 2;
    const buffer = Buffer.alloc(payloadLength);

    let offset = 0;
    buffer[offset++] = RakNetMessageId.ID_OPEN_CONNECTION_REQUEST;
    buffer[offset++] = protocolVersion & 0xff;
    guid.copy(buffer, offset);
    offset += 16;
    seed.copy(buffer, offset);
    offset += 8;
    OFFLINE_MESSAGE_ID.copy(buffer, offset);
    offset += OFFLINE_MESSAGE_ID.length;
    writeInvertedIpPort(buffer, offset, ipBytes, options.targetPort);
    return buffer;
};

export const buildLoginRequestText = (options: LoginRequestTextOptions): Buffer => {
    const bs = new RakBitStream();
    if (options.includeTimestamp) {
        bs.writeByte(RakNetMessageId.ID_TIMESTAMP);
        const ts = options.timestampMs ?? BigInt(Date.now());
        bs.writeLongLong(ts);
    }
    bs.writeByte(RakNetMessageId.ID_LOGIN_REQUEST_TEXT);
    bs.writeBit(false); // preFlag
    writeHuffmanStringRawLenBE(bs, options.username ?? '', 2048);
    bs.writeBit(false); // postFlag
    const token = options.token & 0xffff;
    bs.writeBits(token, 16);
    return bs.data;
};
