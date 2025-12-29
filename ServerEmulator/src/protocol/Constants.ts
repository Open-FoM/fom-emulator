/**
 * Protocol Constants - Values discovered through reverse engineering
 * 
 * Reference: PROTOCOL_SPECIFICATION.md
 */

// Connection constants
export const CONNECTION_MAGIC = 0x9919D9C7;
export const DEFAULT_PORT = 61000;
export const WORLD_SERVER_PASSWORD = '37eG87Ph';
export const MTU_SIZE = 1400;

// Sequence number handling
export const SEQUENCE_BITS = 13;
export const SEQUENCE_MASK = 0x1FFF; // (1 << 13) - 1
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
  ID_OPEN_CONNECTION_REPLY = 0x0A,
  ID_RPC = 0x0B,
  ID_RPC_REPLY = 0x0C,
  ID_OUT_OF_BAND_INTERNAL = 0x0D,
  ID_CONNECTION_REQUEST_ACCEPTED = 0x0E,
  ID_CONNECTION_ATTEMPT_FAILED = 0x0F,
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
  ID_PONG = 0x1A,
  ID_ADVERTISE_SYSTEM = 0x1B,
  
  // Game-specific (FoM)
  ID_LOGIN_REQUEST_RETURN = 0x6D, // 109
  
  // User packets start here
  ID_USER_PACKET_ENUM = 0x86,
}

/**
 * LithTech Message IDs (Game Layer)
 * 
 * These are dispatched via the handler table at 0x006FAB50
 */
export enum LithTechMessageId {
  MSG_CYCLECHECK = 4,
  MSG_UNKNOWN_5 = 5,
  MSG_PROTOCOL_VERSION = 6,
  MSG_UNKNOWN_7 = 7,
  MSG_UPDATE = 8,
  MSG_UNKNOWN_10 = 10,
  MSG_ID_PACKET = 12,
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
 * Login result codes
 */
export enum LoginResult {
  SUCCESS = 0x01,
  FAILURE = 0x00,
  INVALID_CREDENTIALS = 0x02,
  BANNED = 0x03,
  SERVER_FULL = 0x04,
}
