/**
 * Protocol Constants - Values discovered through reverse engineering
 *
 * Ported from legacy TS emulator + Docs/Packets specifications
 */

// Connection constants
export const CONNECTION_MAGIC = 0x9919d9c7;
export const DEFAULT_PORT = 61000;
export const WORLD_SERVER_PASSWORD = '37eG87Ph';
export const MTU_SIZE = 1400;
export const OFFLINE_MESSAGE_ID = Buffer.from([
    0xff, 0x00, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78,
]);
export const OFFLINE_SYSTEM_ADDRESS_BYTES = Buffer.alloc(24, 0xff);
export const OPEN_CONNECTION_PROTOCOL_VERSION = 6;

// Sequence number handling
export const SEQUENCE_BITS = 13;
export const SEQUENCE_MASK = 0x1fff; // (1 << 13) - 1
export const MAX_SEQUENCE = 8191;

// Timeouts (ms)
export const CONNECTION_TIMEOUT = 10000;
export const RETRY_INTERVAL = 300;
export const HEARTBEAT_INTERVAL = 5000;

// Buffer sizes
export const MAX_OUT_OF_ORDER_PACKETS = 8;
export const MAX_PACKET_SIZE = 1400;

/**
 * RakNet Message IDs (Transport Layer)
 *
 * Note: In V2, internal RakNet messages (0x00-0x1b) are handled by native RakNet.
 * The values here are for reference and game-specific message handling.
 */
export enum RakNetMessageId {
    // Internal RakNet messages
    ID_INTERNAL_PING = 0x00,
    ID_PING = 0x01,
    ID_PING_OPEN_CONNECTIONS = 0x02,
    ID_CONNECTED_PONG = 0x03,
    ID_CONNECTION_REQUEST = 0x04,
    ID_SECURED_CONNECTION_RESPONSE = 0x05,
    ID_SECURED_CONNECTION_CONFIRMATION = 0x06,
    ID_RPC_MAPPING = 0x07,
    ID_DETECT_LOST_CONNECTIONS = 0x08,
    ID_OPEN_CONNECTION_REQUEST = 0x09,
    ID_OPEN_CONNECTION_REPLY = 0x0a,
    ID_RPC = 0x0b,
    ID_RPC_REPLY = 0x0c,
    ID_OUT_OF_BAND_INTERNAL = 0x0d,
    ID_CONNECTION_REQUEST_ACCEPTED = 0x0e,
    ID_CONNECTION_ATTEMPT_FAILED = 0x0f,
    ID_ALREADY_CONNECTED = 0x10,
    ID_NEW_INCOMING_CONNECTION = 0x11,
    ID_NO_FREE_INCOMING_CONNECTIONS = 0x12,
    ID_DISCONNECTION_NOTIFICATION = 0x13,
    ID_CONNECTION_LOST = 0x14,
    ID_RSA_PUBLIC_KEY_MISMATCH = 0x15,
    ID_CONNECTION_BANNED = 0x16,
    ID_INVALID_PASSWORD = 0x17,
    ID_MODIFIED_PACKET = 0x18,
    ID_TIMESTAMP = 0x19,
    ID_PONG = 0x1a,
    ID_ADVERTISE_SYSTEM = 0x1b,

    // FoM file list transfer (client file mgr / FTClient)
    ID_FILE_LIST_TRANSFER_HEADER = 0x32,
    ID_FILE_LIST_TRANSFER_RESPONSE = 0x36,

    // Game-specific (FoM) - Login flow (Docs/Packets/*.md)
    ID_LOGIN_REQUEST = 0x6c,        // 108 - Docs/Packets/ID_LOGIN_REQUEST.md
    ID_LOGIN_REQUEST_RETURN = 0x6d, // 109 - Docs/Packets/ID_LOGIN_REQUEST_RETURN.md
    ID_LOGIN = 0x6e,                // 110 - Docs/Packets/ID_LOGIN.md
    ID_LOGIN_RETURN = 0x6f,         // 111 - Docs/Packets/ID_LOGIN_RETURN.md
    ID_LOGIN_TOKEN_CHECK = 0x70,    // 112 - Docs/Packets/ID_LOGIN_TOKEN_CHECK.md
    ID_WORLD_LOGIN = 0x72,          // 114 - Docs/Packets/ID_WORLD_LOGIN.md
    ID_WORLD_LOGIN_RETURN = 0x73,   // 115 - Docs/Packets/ID_WORLD_LOGIN_RETURN.md
    ID_WORLD_SELECT = 0x7b,         // 123 - Docs/Packets/ID_WORLD_SELECT.md

    // User packets start here
    ID_USER_PACKET_ENUM = 0x86,
}

// Used by logging to force visibility of login-related traffic.
export const LOGIN_PACKET_IDS = new Set<number>([
    RakNetMessageId.ID_LOGIN_REQUEST,
    RakNetMessageId.ID_LOGIN_REQUEST_RETURN,
    RakNetMessageId.ID_LOGIN,
    RakNetMessageId.ID_LOGIN_RETURN,
    RakNetMessageId.ID_LOGIN_TOKEN_CHECK,
    RakNetMessageId.ID_WORLD_LOGIN,
    RakNetMessageId.ID_WORLD_LOGIN_RETURN,
    RakNetMessageId.ID_WORLD_SELECT,
]);

// Normalize packet ID to a byte and check membership.
export function isLoginPacketId(packetId: number): boolean {
    return LOGIN_PACKET_IDS.has(packetId & 0xff);
}

/**
 * LithTech Message IDs (Game Layer)
 *
 * These are dispatched via the handler table at 0x006FAB50
 */
export enum LithTechMessageId {
    MSG_CYCLECHECK = 4,
    MSG_UNKNOWN_5 = 5,
    // Alias: SMSG_NETPROTOCOLVERSION
    MSG_NETPROTOCOLVERSION = 4,
    MSG_PROTOCOL_VERSION = 6,
    // Alias: SMSG_LOADWORLD
    MSG_LOADWORLD = 6,
    MSG_UNKNOWN_7 = 7,
    // Alias: SMSG_CLIENTOBJECTID
    MSG_CLIENTOBJECTID = 7,
    MSG_UPDATE = 8,
    // Alias: CMSG_CONNECTSTAGE
    MSG_CONNECTSTAGE = 9,
    // Alias: SMSG_UNGUARANTEEDUPDATE
    MSG_UNGUARANTEEDUPDATE = 10,
    MSG_UNKNOWN_10 = 10,
    MSG_ID_PACKET = 12,
    // Alias: SMSG_YOURID
    MSG_YOURID = 12,
    MSG_UNKNOWN_13 = 13,
    MSG_MESSAGE_GROUP = 14,
    MSG_UNKNOWN_15 = 15,
    MSG_UNKNOWN_16 = 16,
    MSG_UNKNOWN_17 = 17,
    MSG_UNKNOWN_19 = 19,
    MSG_UNKNOWN_20 = 20,
    MSG_UNKNOWN_21 = 21,
    MSG_UNKNOWN_22 = 22,
    MSG_UNKNOWN_23 = 23,
}

/**
 * Connection request types (3-bit field after magic)
 * From Ghidra CUDPDriver_JoinSession analysis
 */
export enum ConnectionRequestType {
    QUERY = 1,
    CONNECT = 2,
    CONNECT_RESPONSE = 3,
}

/**
 * Connection response flags (1-bit fields)
 * From Ghidra CUDPDriver_JoinSession analysis
 */
export const ConnectionResponseFlag = {
    ACCEPTED: 1,
    REJECTED: 0,
    SKIP_GUID_CHECK: 1,
    GUID_MISMATCH: 0,
} as const;

/**
 * Login request return status codes (0x6D response)
 * See: Docs/Packets/ID_LOGIN_REQUEST_RETURN.md
 */
export enum LoginRequestReturnStatus {
    INVALID_INFO = 0,
    SUCCESS = 1,
    OUTDATED_CLIENT = 2,
    ALREADY_LOGGED_IN = 3,
}

/**
 * Login return status codes (0x6F response)
 * See: Docs/Packets/ID_LOGIN_RETURN.md
 */
export enum LoginReturnStatus {
    INVALID_LOGIN = 0,
    SUCCESS = 1,
    UNKNOWN_USERNAME = 2,
    LOGIN_RETURN_3 = 3,
    INCORRECT_PASSWORD = 4,
    CREATE_CHARACTER = 5,
    CREATE_CHARACTER_ERROR = 6,
    TEMP_BANNED = 7,
    PERM_BANNED = 8,
    DUPLICATE_IP = 9,
    INTEGRITY_CHECK_FAILED = 10,
    RUN_AS_ADMIN = 11,
    ACCOUNT_LOCKED = 12,
    NOT_PURCHASED = 13,
}

/**
 * Account type enum (0x6F payload)
 */
export enum AccountType {
    FREE = 0,
    BASIC = 1,
    PREMIUM = 2,
    ADMIN = 3,
}

/**
 * Item type enum - binding/security status
 * See: Docs/Packets/ID_LOGIN_RETURN.md
 */
export enum ItemType {
    NORMAL = 0,
    SECURED = 1,
    BOUND = 2,
    SPECIAL = 3,
}

/**
 * Item quality enum - affects display color
 * See: Docs/Packets/ID_LOGIN_RETURN.md
 */
export enum ItemQuality {
    STANDARD = 0,   // White
    CUSTOM = 1,     // Blue
    SPECIAL = 2,    // Orange
    RARE = 3,       // Yellow
    SPECIAL_RARE = 4, // Red
}

/**
 * Apartment type enum
 * String ID = 10500 + type
 * See: Docs/Packets/ID_LOGIN_RETURN.md
 */
export enum ApartmentType {
    ALL = 0,
    CITY_FLAT = 1,
    RATHOLE = 2,
    COLONIAL_FLAT = 3,
    FRENCH_FLAT = 4,
    JAPANESE_FLAT = 5,
    UNDERWATER_FLAT = 6,
    CITY_APARTMENT = 7,
    CELLAR = 8,
    COLONIAL_APARTMENT = 9,
    FRENCH_APARTMENT = 10,
    JAPANESE_APARTMENT = 11,
    UNDERWATER_APARTMENT = 12,
    CITY_SUITE = 13,
    RAMSHACKLE_HUT = 14,
    COLONIAL_SUITE = 15,
    FRENCH_PENTHOUSE = 16,
    JAPANESE_PENTHOUSE = 17,
    UNDERWATER_SUITE = 18,
    UNDERGROUND_HQ = 19,
    TACTICAL_HQ = 20,
    CITY_TOWER_OFFICES = 21,
    ARCTURUS_FREIGHTER = 22,
    PRISON_DUEL_ARENA = 23,
    BACKER_SAFEHOUSE = 24,
}

/**
 * Legacy LoginResult enum for backwards compatibility
 * @deprecated Use LoginRequestReturnStatus or LoginReturnStatus instead
 */
export enum LoginResult {
    SUCCESS = 0x01,
    FAILURE = 0x00,
    INVALID_CREDENTIALS = 0x02,
    BANNED = 0x03,
    SERVER_FULL = 0x04,
}
