import { PacketSchema } from './packetDecode';

function isPrintableAscii(value: string): boolean {
    for (let i = 0; i < value.length; i += 1) {
        const c = value.charCodeAt(i);
        if (c < 0x20 || c > 0x7e) return false;
    }
    return true;
}

export const LOGIN_6C_SCHEMA: PacketSchema = {
    name: 'login_6c',
    msgId: 0x6c,
    wrapper: 'reliable',
    scan: 'lsb',
    bitOrder: 'msb',
    fields: [
        { name: 'preFlag', type: 'bit' },
        { name: 'username', type: 'huffman_string_rawlen_be', maxLen: 2048 },
        { name: 'postFlag', type: 'bit' },
        { name: 'token', type: 'u16' },
    ],
    validate: (fields) => {
        const username = String(fields.username ?? '');
        const token = Number(fields.token ?? 0);
        const preFlag = Number(fields.preFlag ?? 1);
        const postFlag = Number(fields.postFlag ?? 1);
        let score = 0;
        if (isPrintableAscii(username)) score += 10;
        if (username.length >= 3 && username.length <= 64) score += 5;
        if (preFlag === 0 && postFlag === 0) score += 3;
        if (token !== 0) score += 2;
        return { ok: score >= 10, score };
    },
};

export const OPEN_CONN_09_SCHEMA: PacketSchema = {
    name: 'open_connection_request_09',
    msgId: 0x09,
    wrapper: 'raw',
    scan: 'byte',
    bitOrder: 'msb',
    startOffset: 0,
    fields: [{ name: 'payload', type: 'bytes', length: 'rest' }],
    validate: (fields) => {
        const payload = fields.payload as Buffer | undefined;
        const len = payload ? payload.length : 0;
        const score = len > 0 ? 5 : 0;
        return { ok: len > 0, score };
    },
};

export const LOGIN_6D_SCHEMA: PacketSchema = {
    name: 'login_6d',
    msgId: 0x6d,
    wrapper: 'raw',
    scan: 'byte',
    bitOrder: 'msb',
    fields: [
        { name: 'success', type: 'u8c' },
        { name: 'session', type: 'huffman_string_compressed', maxLen: 2048 },
    ],
    validate: (fields) => {
        const success = Number(fields.success ?? 0);
        const session = String(fields.session ?? '');
        let score = 0;
        if (success === 1) score += 5;
        if (isPrintableAscii(session)) score += 5;
        if (session.length > 0 && session.length <= 63) score += 2;
        return { ok: score >= 8, score };
    },
};

export const PACKET_SCHEMAS: PacketSchema[] = [
    LOGIN_6C_SCHEMA,
    LOGIN_6D_SCHEMA,
    OPEN_CONN_09_SCHEMA,
];
