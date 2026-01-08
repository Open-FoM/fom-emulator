/**
 * RakNet Message IDs (Transport Layer)
 *
 * These are the packet IDs used in the FoM protocol at the RakNet layer.
 * Internal RakNet messages (0x00-0x1b) are handled by native RakNet.
 * Game-specific messages start at 0x6c for the login flow.
 *
 * See: Docs/Packets/README.md for packet documentation index
 */
export enum RakNetMessageId {
    // Internal RakNet messages (0x00-0x1b)
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

    // FoM Login flow (Docs/Packets/*.md)
    ID_LOGIN_REQUEST = 0x6c,        // 108 - Client -> Master (username + version)
    ID_LOGIN_REQUEST_RETURN = 0x6d, // 109 - Master -> Client (status + username echo)
    ID_LOGIN = 0x6e,                // 110 - Client -> Master (auth payload)
    ID_LOGIN_RETURN = 0x6f,         // 111 - Master -> Client (account data + apartment)
    ID_LOGIN_TOKEN_CHECK = 0x70,    // 112 - Bidirectional (token validation)
    ID_WORLD_LOGIN = 0x72,          // 114 - Client -> World (world entry request)
    ID_WORLD_LOGIN_RETURN = 0x73,   // 115 - Server -> Client (world address redirect)
    ID_WORLD_SELECT = 0x7b,         // 123 - Server -> Client (world selection payload)

    // User packets start here (LithTech game layer)
    ID_USER_PACKET_ENUM = 0x86,
}

/**
 * LithTech Message IDs (Game Layer)
 *
 * These are dispatched via the LithTech handler table at 0x006FAB50.
 * Wrapped inside RakNet USER_PACKET_ENUM (0x86) packets.
 *
 * See: Docs/Notes/CShell_Gameplay_Packets.md for handler details
 */
export enum LithTechMessageId {
    // Server -> Client messages
    MSG_CYCLECHECK = 4,           // Cycle/heartbeat check
    MSG_NETPROTOCOLVERSION = 4,   // Alias: protocol version handshake
    MSG_PROTOCOL_VERSION = 6,     // Protocol version (SMSG_LOADWORLD)
    MSG_LOADWORLD = 6,            // Alias: load world command
    MSG_CLIENTOBJECTID = 7,       // Client object ID assignment
    MSG_UPDATE = 8,               // Object update (guaranteed)
    MSG_UNGUARANTEEDUPDATE = 10,  // Object update (unguaranteed, position/rotation)
    MSG_YOURID = 12,              // Player ID assignment
    MSG_MESSAGE = 13,             // Game message wrapper (routes RakNet packet IDs to CShell)
    MSG_MESSAGE_GROUP = 14,       // Grouped message container

    // Client -> Server messages
    MSG_CONNECTSTAGE = 9,         // Client connection stage notification

    // Unknown / under investigation
    MSG_UNKNOWN_5 = 5,
    MSG_UNKNOWN_7 = 7,
    MSG_UNKNOWN_10 = 10,
    MSG_ID_PACKET = 12,
    MSG_UNKNOWN_13 = 13,
    MSG_UNKNOWN_15 = 15,
    MSG_UNKNOWN_16 = 16,
    MSG_UNKNOWN_17 = 17,
    MSG_UNKNOWN_19 = 19,
    MSG_UNKNOWN_20 = 20,
    MSG_UNKNOWN_21 = 21,
    MSG_UNKNOWN_22 = 22,
    MSG_UNKNOWN_23 = 23,
}

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

export function isLoginPacketId(packetId: number): boolean {
    return LOGIN_PACKET_IDS.has(packetId & 0xff);
}
