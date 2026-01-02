/**
 * A bunch of types of messages used by RakNet
 * @type {{ID_INTERNAL_PING: number, ID_PING: number, ID_PING_OPEN_CONNECTIONS: number, ID_CONNECTED_PONG: number, ID_CONNECTION_REQUEST: number, ID_SECURED_CONNECTION_RESPONSE: number, ID_SECURED_CONNECTION_CONFIRMATION: number, ID_RPC_MAPPING: number, ID_DETECT_LOST_CONNECTIONS: number, ID_OPEN_CONNECTION_REQUEST: number, ID_OPEN_CONNECTION_REPLY: number, ID_RPC: number, ID_RPC_REPLY: number, ID_OUT_OF_BAND_INTERNAL: number, ID_CONNECTION_REQUEST_ACCEPTED: number, ID_CONNECTION_ATTEMPT_FAILED: number, ID_ALREADY_CONNECTED: number, ID_NEW_INCOMING_CONNECTION: number, ID_NO_FREE_INCOMING_CONNECTIONS: number, ID_DISCONNECTION_NOTIFICATION: number, ID_CONNECTION_LOST: number, ID_RSA_PUBLIC_KEY_MISMATCH: number, ID_CONNECTION_BANNED: number, ID_INVALID_PASSWORD: number, ID_MODIFIED_PACKET: number, ID_TIMESTAMP: number, ID_PONG: number, ID_ADVERTISE_SYSTEM: number, ID_REMOTE_DISCONNECTION_NOTIFICATION: number, ID_REMOTE_CONNECTION_LOST: number, ID_REMOTE_NEW_INCOMING_CONNECTION: number, ID_DOWNLOAD_PROGRESS: number, ID_FILE_LIST_TRANSFER_HEADER: number, ID_FILE_LIST_TRANSFER_FILE: number, ID_DDT_DOWNLOAD_REQUEST: number, ID_TRANSPORT_STRING: number, ID_REPLICA_MANAGER_CONSTRUCTION: number, ID_REPLICA_MANAGER_DESTRUCTION: number, ID_REPLICA_MANAGER_SCOPE_CHANGE: number, ID_REPLICA_MANAGER_SERIALIZE: number, ID_REPLICA_MANAGER_DOWNLOAD_STARTED: number, ID_REPLICA_MANAGER_DOWNLOAD_COMPLETE: number, ID_CONNECTION_GRAPH_REQUEST: number, ID_CONNECTION_GRAPH_REPLY: number, ID_CONNECTION_GRAPH_UPDATE: number, ID_CONNECTION_GRAPH_NEW_CONNECTION: number, ID_CONNECTION_GRAPH_CONNECTION_LOST: number, ID_CONNECTION_GRAPH_DISCONNECTION_NOTIFICATION: number, ID_ROUTE_AND_MULTICAST: number, ID_RAKVOICE_OPEN_CHANNEL_REQUEST: number, ID_RAKVOICE_OPEN_CHANNEL_REPLY: number, ID_RAKVOICE_CLOSE_CHANNEL: number, ID_RAKVOICE_DATA: number, ID_AUTOPATCHER_GET_CHANGELIST_SINCE_DATE: number, ID_AUTOPATCHER_CREATION_LIST: number, ID_AUTOPATCHER_DELETION_LIST: number, ID_AUTOPATCHER_GET_PATCH: number, ID_AUTOPATCHER_PATCH_LIST: number, ID_AUTOPATCHER_REPOSITORY_FATAL_ERROR: number, ID_AUTOPATCHER_FINISHED_INTERNAL: number, ID_AUTOPATCHER_FINISHED: number, ID_AUTOPATCHER_RESTART_APPLICATION: number, ID_NAT_PUNCHTHROUGH_REQUEST: number, ID_NAT_TARGET_NOT_CONNECTED: number, ID_NAT_TARGET_CONNECTION_LOST: number, ID_NAT_CONNECT_AT_TIME: number, ID_NAT_SEND_OFFLINE_MESSAGE_AT_TIME: number, ID_NAT_IN_PROGRESS: number, ID_DATABASE_QUERY_REQUEST: number, ID_DATABASE_UPDATE_ROW: number, ID_DATABASE_REMOVE_ROW: number, ID_DATABASE_QUERY_REPLY: number, ID_DATABASE_UNKNOWN_TABLE: number, ID_DATABASE_INCORRECT_PASSWORD: number, ID_READY_EVENT_SET: number, ID_READY_EVENT_UNSET: number, ID_READY_EVENT_ALL_SET: number, ID_READY_EVENT_QUERY: number, ID_LOBBY_GENERAL: number, ID_AUTO_RPC_CALL: number, ID_AUTO_RPC_REMOTE_INDEX: number, ID_AUTO_RPC_UNKNOWN_REMOTE_INDEX: number, ID_RPC_REMOTE_ERROR: number, ID_USER_PACKET_ENUM: number}}
 */
export default {
    //
    // RESERVED TYPES - DO NOT CHANGE THESE
    // All types from RakPeer
    //
    /// These types are never returned to the user.
    /// Ping from a connected system.  Update timestamps (internal use only)
    ID_INTERNAL_PING: 0,
    /// Ping from an unconnected system.  Reply but do not update timestamps. (internal use only)
    ID_PING: 1,
    /// Ping from an unconnected system.  Only reply if we have open connections. Do not update timestamps. (internal use only)
    ID_PING_OPEN_CONNECTIONS: 2,
    /// Pong from a connected system.  Update timestamps (internal use only)
    ID_CONNECTED_PONG: 3,
    /// Asking for a new connection (internal use only)
    ID_CONNECTION_REQUEST: 4,
    /// Connecting to a secured server/peer (internal use only)
    ID_SECURED_CONNECTION_RESPONSE: 5,
    /// Connecting to a secured server/peer (internal use only)
    ID_SECURED_CONNECTION_CONFIRMATION: 6,
    /// Packet that tells us the packet contains an integer ID to name mapping for the remote system (internal use only)
    ID_RPC_MAPPING: 7,
    /// A reliable packet to detect lost connections (internal use only)
    ID_DETECT_LOST_CONNECTIONS: 8,
    /// Offline message so we know when to reset and start a new connection (internal use only)
    ID_OPEN_CONNECTION_REQUEST: 9,
    /// Offline message response so we know when to reset and start a new connection (internal use only)
    ID_OPEN_CONNECTION_REPLY: 10,
    /// Remote procedure call (internal use only)
    ID_RPC: 11,
    /// Remote procedure call reply, for RPCs that return data (internal use only)
    ID_RPC_REPLY: 12,
    /// RakPeer - Same as ID_ADVERTISE_SYSTEM, but intended for internal use rather than being passed to the user. Second byte indicates type. Used currently for NAT punchthrough for receiver port advertisement. See ID_NAT_ADVERTISE_RECIPIENT_PORT
    ID_OUT_OF_BAND_INTERNAL: 13,

    //
    // USER TYPES - DO NOT CHANGE THESE
    //

    /// RakPeer - In a client/server environment, our connection request to the server has been accepted.
    ID_CONNECTION_REQUEST_ACCEPTED: 14,
    /// RakPeer - Sent to the player when a connection request cannot be completed due to inability to connect.
    ID_CONNECTION_ATTEMPT_FAILED: 15,
    /// RakPeer - Sent a connect request to a system we are currently connected to.
    ID_ALREADY_CONNECTED: 16,
    /// RakPeer - A remote system has successfully connected.
    ID_NEW_INCOMING_CONNECTION: 17,
    /// RakPeer - The system we attempted to connect to is not accepting new connections.
    ID_NO_FREE_INCOMING_CONNECTIONS: 18,
    /// RakPeer - The system specified in Packet::systemAddress has disconnected from us.  For the client, this would mean the server has shutdown.
    ID_DISCONNECTION_NOTIFICATION: 19,
    /// RakPeer - Reliable packets cannot be delivered to the system specified in Packet::systemAddress.  The connection to that system has been closed.
    ID_CONNECTION_LOST: 20,
    /// RakPeer - We preset an RSA public key which does not match what the system we connected to is using.
    ID_RSA_PUBLIC_KEY_MISMATCH: 21,
    /// RakPeer - We are banned from the system we attempted to connect to.
    ID_CONNECTION_BANNED: 22,
    /// RakPeer - The remote system is using a password and has refused our connection because we did not set the correct password.
    ID_INVALID_PASSWORD: 23,
    /// RakPeer - A packet has been tampered with in transit.  The sender is contained in Packet::systemAddress.
    ID_MODIFIED_PACKET: 24,
    /// RakPeer - The four bytes following this byte represent an unsigned int which is automatically modified by the difference in system times between the sender and the recipient. Requires that you call SetOccasionalPing.
    ID_TIMESTAMP: 25,
    /// RakPeer - Pong from an unconnected system.  First byte is ID_PONG, second sizeof(RakNetTime) bytes is the ping, following bytes is system specific enumeration data.
    ID_PONG: 26,
    /// RakPeer - Inform a remote system of our IP/Port, plus some offline data
    ID_ADVERTISE_SYSTEM: 27,
    /// ConnectionGraph plugin - In a client/server environment, a client other than ourselves has disconnected gracefully.  Packet::systemAddress is modified to reflect the systemAddress of this client.
    ID_REMOTE_DISCONNECTION_NOTIFICATION: 28,
    /// ConnectionGraph plugin - In a client/server environment, a client other than ourselves has been forcefully dropped. Packet::systemAddress is modified to reflect the systemAddress of this client.
    ID_REMOTE_CONNECTION_LOST: 29,
    /// ConnectionGraph plugin - In a client/server environment, a client other than ourselves has connected.  Packet::systemAddress is modified to reflect the systemAddress of the client that is not connected directly to us. The packet encoding is SystemAddress 1, ConnectionGraphGroupID 1, SystemAddress 2, ConnectionGraphGroupID 2
    ID_REMOTE_NEW_INCOMING_CONNECTION: 30,
    // RakPeer - Downloading a large message. Format is ID_DOWNLOAD_PROGRESS (MessageID), partCount (unsigned int), partTotal (unsigned int), partLength (unsigned int), first part data (length <= MAX_MTU_SIZE). See the three parameters partCount, partTotal and partLength in OnFileProgress in FileListTransferCBInterface.h
    ID_DOWNLOAD_PROGRESS: 31,

    /// FileListTransfer plugin - Setup data
    ID_FILE_LIST_TRANSFER_HEADER: 32,
    /// FileListTransfer plugin - A file
    ID_FILE_LIST_TRANSFER_FILE: 33,

    /// DirectoryDeltaTransfer plugin - Request from a remote system for a download of a directory
    ID_DDT_DOWNLOAD_REQUEST: 34,

    /// RakNetTransport plugin - Transport provider message, used for remote console
    ID_TRANSPORT_STRING: 35,

    /// ReplicaManager plugin - Create an object
    ID_REPLICA_MANAGER_CONSTRUCTION: 36,
    /// ReplicaManager plugin - Destroy an object
    ID_REPLICA_MANAGER_DESTRUCTION: 37,
    /// ReplicaManager plugin - Changed scope of an object
    ID_REPLICA_MANAGER_SCOPE_CHANGE: 38,
    /// ReplicaManager plugin - Serialized data of an object
    ID_REPLICA_MANAGER_SERIALIZE: 39,
    /// ReplicaManager plugin - New connection, about to send all world objects
    ID_REPLICA_MANAGER_DOWNLOAD_STARTED: 40,
    /// ReplicaManager plugin - Finished downloading all serialized objects
    ID_REPLICA_MANAGER_DOWNLOAD_COMPLETE: 41,

    /// ConnectionGraph plugin - Request the connection graph from another system
    ID_CONNECTION_GRAPH_REQUEST: 42,
    /// ConnectionGraph plugin - Reply to a connection graph download request
    ID_CONNECTION_GRAPH_REPLY: 43,
    /// ConnectionGraph plugin - Update edges / nodes for a system with a connection graph
    ID_CONNECTION_GRAPH_UPDATE: 44,
    /// ConnectionGraph plugin - Add a new connection to a connection graph
    ID_CONNECTION_GRAPH_NEW_CONNECTION: 45,
    /// ConnectionGraph plugin - Remove a connection from a connection graph - connection was abruptly lost
    ID_CONNECTION_GRAPH_CONNECTION_LOST: 46,
    /// ConnectionGraph plugin - Remove a connection from a connection graph - connection was gracefully lost
    ID_CONNECTION_GRAPH_DISCONNECTION_NOTIFICATION: 47,

    /// Router plugin - route a message through another system
    ID_ROUTE_AND_MULTICAST: 48,

    /// RakVoice plugin - Open a communication channel
    ID_RAKVOICE_OPEN_CHANNEL_REQUEST: 49,
    /// RakVoice plugin - Communication channel accepted
    ID_RAKVOICE_OPEN_CHANNEL_REPLY: 50,
    /// RakVoice plugin - Close a communication channel
    ID_RAKVOICE_CLOSE_CHANNEL: 51,
    /// RakVoice plugin - Voice data
    ID_RAKVOICE_DATA: 52,

    /// Autopatcher plugin - Get a list of files that have changed since a certain date
    ID_AUTOPATCHER_GET_CHANGELIST_SINCE_DATE: 53,
    /// Autopatcher plugin - A list of files to create
    ID_AUTOPATCHER_CREATION_LIST: 54,
    /// Autopatcher plugin - A list of files to delete
    ID_AUTOPATCHER_DELETION_LIST: 55,
    /// Autopatcher plugin - A list of files to get patches for
    ID_AUTOPATCHER_GET_PATCH: 56,
    /// Autopatcher plugin - A list of patches for a list of files
    ID_AUTOPATCHER_PATCH_LIST: 57,
    /// Autopatcher plugin - Returned to the user: An error from the database repository for the autopatcher.
    ID_AUTOPATCHER_REPOSITORY_FATAL_ERROR: 58,
    /// Autopatcher plugin - Finished getting all files from the autopatcher
    ID_AUTOPATCHER_FINISHED_INTERNAL: 59,
    ID_AUTOPATCHER_FINISHED: 60,
    /// Autopatcher plugin - Returned to the user: You must restart the application to finish patching.
    ID_AUTOPATCHER_RESTART_APPLICATION: 61,

    /// NATPunchthrough plugin - Intermediary got a request to help punch through a nat
    ID_NAT_PUNCHTHROUGH_REQUEST: 62,
    /// NATPunchthrough plugin - Intermediary cannot complete the request because the target system is not connected
    ID_NAT_TARGET_NOT_CONNECTED: 63,
    /// NATPunchthrough plugin - While attempting to connect, we lost the connection to the target system
    ID_NAT_TARGET_CONNECTION_LOST: 64,
    /// NATPunchthrough plugin - Internal message to connect at a certain time
    ID_NAT_CONNECT_AT_TIME: 65,
    /// NATPunchthrough plugin - Internal message to send a message (to punch through the nat) at a certain time
    ID_NAT_SEND_OFFLINE_MESSAGE_AT_TIME: 66,
    /// NATPunchthrough plugin - The facilitator is already attempting this connection
    ID_NAT_IN_PROGRESS: 67,

    /// LightweightDatabase plugin - Query
    ID_DATABASE_QUERY_REQUEST: 68,
    /// LightweightDatabase plugin - Update
    ID_DATABASE_UPDATE_ROW: 69,
    /// LightweightDatabase plugin - Remove
    ID_DATABASE_REMOVE_ROW: 70,
    /// LightweightDatabase plugin - A serialized table.  Bytes 1+ contain the table.  Pass to TableSerializer::DeserializeTable
    ID_DATABASE_QUERY_REPLY: 71,
    /// LightweightDatabase plugin - Specified table not found
    ID_DATABASE_UNKNOWN_TABLE: 72,
    /// LightweightDatabase plugin - Incorrect password
    ID_DATABASE_INCORRECT_PASSWORD: 73,

    /// ReadyEvent plugin - Set the ready state for a particular system
    ID_READY_EVENT_SET: 74,
    /// ReadyEvent plugin - Unset the ready state for a particular system
    ID_READY_EVENT_UNSET: 75,
    /// All systems are in state ID_READY_EVENT_SET
    ID_READY_EVENT_ALL_SET: 76,
    /// ReadyEvent plugin - Request of ready event state - used for pulling data when newly connecting
    ID_READY_EVENT_QUERY: 77,

    /// Lobby packets. Second byte indicates type.
    ID_LOBBY_GENERAL: 78,

    /// Auto RPC procedure call
    ID_AUTO_RPC_CALL: 79,

    /// Auto RPC functionName to index mapping
    ID_AUTO_RPC_REMOTE_INDEX: 80,

    /// Auto RPC functionName to index mapping, lookup failed. Will try to auto recover
    ID_AUTO_RPC_UNKNOWN_REMOTE_INDEX: 81,

    /// Auto RPC error code
    /// See AutoRPC.h for codes, stored in packet->data[1]
    ID_RPC_REMOTE_ERROR: 82,

    // For the user to use.  Start your first enumeration at this value.
    ID_USER_PACKET_ENUM: 83,
    //-------------------------------------------------------------------------------------------------------------

    key: function (value: number): string | undefined {
        const table = this as unknown as Record<string, number>;
        for (const prop in table) {
            if (Object.prototype.hasOwnProperty.call(table, prop)) {
                if (table[prop] === value) {
                    return prop;
                }
            }
        }
        return undefined;
    },
};
