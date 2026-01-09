export const CONNECTION_MAGIC = 0x9919d9c7;
export const DEFAULT_PORT = 61000;
export const WORLD_SERVER_PASSWORD = '37eG87Ph';
export const MTU_SIZE = 1400;
export const OFFLINE_MESSAGE_ID = Buffer.from([
    0xff, 0x00, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78,
]);
export const OFFLINE_SYSTEM_ADDRESS_BYTES = Buffer.alloc(24, 0xff);
export const OPEN_CONNECTION_PROTOCOL_VERSION = 6;

export const SEQUENCE_BITS = 13;
export const SEQUENCE_MASK = 0x1fff;
export const MAX_SEQUENCE = 8191;

export const CONNECTION_TIMEOUT = 600000; // 10 minutes for debugging
export const RETRY_INTERVAL = 300;
export const HEARTBEAT_INTERVAL = 5000;

export const MAX_OUT_OF_ORDER_PACKETS = 8;
export const MAX_PACKET_SIZE = 1400;

export enum ConnectionRequestType {
    QUERY = 1,
    CONNECT = 2,
    CONNECT_RESPONSE = 3,
}

export const ConnectionResponseFlag = {
    ACCEPTED: 1,
    REJECTED: 0,
    SKIP_GUID_CHECK: 1,
    GUID_MISMATCH: 0,
} as const;

const LOGIN_PACKET_IDS = new Set<number>([
    0x6c, // ID_LOGIN_REQUEST
    0x6d, // ID_LOGIN_REQUEST_RETURN
    0x6e, // ID_LOGIN
    0x6f, // ID_LOGIN_RETURN
    0x70, // ID_LOGIN_TOKEN_CHECK
    0x72, // ID_WORLD_LOGIN
    0x73, // ID_WORLD_LOGIN_RETURN
    0x7b, // ID_WORLD_SELECT
]);

export function isLoginPacketId(packetId: number): boolean {
    return LOGIN_PACKET_IDS.has(packetId & 0xff);
}
