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

    ID_WORLD_LOGIN_REQUEST = 0x6b,
    // FoM Login flow (Docs/Packets/*.md)
    ID_LOGIN_REQUEST = 0x6c,        // 108 - Client -> Master (username + version)
    ID_LOGIN_REQUEST_RETURN = 0x6d, // 109 - Master -> Client (status + username echo)
    ID_LOGIN = 0x6e,                // 110 - Client -> Master (auth payload)
    ID_LOGIN_RETURN = 0x6f,         // 111 - Master -> Client (account data + apartment)
    ID_LOGIN_TOKEN_CHECK = 0x70,    // 112 - Bidirectional (token validation)
    ID_WORLD_LOGIN = 0x72,          // 114 - Client -> World (world entry request)
    ID_WORLD_LOGIN_RETURN = 0x73,   // 115 - Server -> Client (world address redirect)
    ID_REGISTER_CLIENT = 0x78,      // 120 - Client -> World (world registration after LithTech burst)
    ID_REGISTER_CLIENT_RETURN = 0x79, // 121 - World -> Client (world login data / profile)
    ID_WORLD_SELECT = 0x7b,         // 123 - Server -> Client (world selection payload)

    // User packets start here (LithTech game layer)
    ID_USER_PACKET_ENUM = 0x86,

    // World service packets (post-login gameplay)
    ID_WORLDSERVICE = 0xa5,         // 165 - Client -> World (world service interaction)
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
    MSG_CYCLECHECK = 4,           // 0x04 - Cycle/heartbeat check
    MSG_NETPROTOCOLVERSION = 4,   // 0x04 - Alias: protocol version handshake
    MSG_PROTOCOL_VERSION = 6,     // 0x06 - Protocol version (SMSG_LOADWORLD)
    MSG_LOADWORLD = 6,            // 0x06 - Alias: load world command
    MSG_CLIENTOBJECTID = 7,       // 0x07 - Client object ID assignment
    MSG_UPDATE = 8,               // 0x08 - Object update (guaranteed)
    MSG_UNGUARANTEEDUPDATE = 10,  // 0x0A - Object update (unguaranteed, position/rotation)
    MSG_YOURID = 12,              // 0x0C - Player ID assignment
    MSG_MESSAGE = 13,             // 0x0D - Game message wrapper (routes RakNet packet IDs to CShell)
    MSG_MESSAGE_GROUP = 14,       // 0x0E - Grouped message container
    MSG_SKYDEF = 16,              // 0x10 - Sky definition
    MSG_PRELOADLIST = 19,         // 0x13 - Preload file list (textures, models, sounds)

    // Client -> Server messages
    MSG_CONNECTSTAGE = 9,         // 0x09 - Client connection stage notification (stage 0=loaded, 1=preloaded)
}

export const LOGIN_PACKET_IDS = new Set<number>([
    RakNetMessageId.ID_LOGIN_REQUEST,
    RakNetMessageId.ID_LOGIN_REQUEST_RETURN,
    RakNetMessageId.ID_LOGIN,
    RakNetMessageId.ID_LOGIN_RETURN,
    RakNetMessageId.ID_LOGIN_TOKEN_CHECK,
    RakNetMessageId.ID_WORLD_LOGIN,
    RakNetMessageId.ID_WORLD_LOGIN_RETURN,
    RakNetMessageId.ID_REGISTER_CLIENT,
    RakNetMessageId.ID_REGISTER_CLIENT_RETURN,
    RakNetMessageId.ID_WORLD_SELECT,
]);

export function isLoginPacketId(packetId: number): boolean {
    return LOGIN_PACKET_IDS.has(packetId & 0xff);
}
