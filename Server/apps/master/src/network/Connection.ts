import type { RakSystemAddress } from '@openfom/networking';
import {
    addressToKey,
    addressToString,
    CONNECTION_TIMEOUT,
    SEQUENCE_MASK,
} from '@openfom/networking';

/**
 * High-level lifecycle state for a client connection.
 */
export enum ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    DISCONNECTING,
}

/**
 * Login handshake phases aligned with legacy FoM message flow.
 */
export enum LoginPhase {
    NONE = 0,
    CONNECTED = 1,
    USER_SENT = 2, // Received 0x6B/0x6C with username
    PASSWORD_SENT = 3, // Legacy - for compatibility
    AUTH_PENDING = 4, // Sent 0x6D, waiting for 0x6E
    AUTHENTICATED = 5, // Received 0x6E, login complete
    WORLD_PENDING = 6, // Waiting for world login (0x72)
    IN_WORLD = 7, // Fully in world
}

/**
 * Per-client state container for master server login and world routing.
 */
export class Connection {
    // Identity
    readonly id: number;
    readonly address: RakSystemAddress;
    readonly key: string; // "ip:port" for logging
    readonly createdAt: Date;
    // Connection state
    state: ConnectionState = ConnectionState.DISCONNECTED;
    // Login state
    loginPhase: LoginPhase = LoginPhase.NONE;
    pendingLoginUser: string = '';
    pendingLoginClientVersion: number = 0;
    pendingLoginToken: number = 0;
    pendingLoginSession: string = '';
    pendingLoginAt: number = 0;
    // Authenticated user info
    username: string = '';
    authenticated: boolean = false;
    authenticatedUser: string | null = null;
    clientId: number = 0;
    // Login auth details (from 0x6E packet)
    loginAuthUsername: string = '';
    loginAuthComputer: string = '';
    loginAuthPasswordHash: string = '';
    loginAuthMacAddress: string = '';
    loginAuthLoginToken: string = '';
    loginAuthFileCRCs: number[] = [];
    loginAuthSteamTicket: boolean = false;
    loginAuthSteamTicketLength: number = 0;
    loginAuthSteamTicketBytes: number = 0;
    // World state
    worldId: number = 0;
    worldInst: number = 0;
    playerId: number = 0;
    // World login tracking (from 0x72)
    worldSelectSent: boolean = false;
    worldSelectWorldId: number = 0;
    worldSelectWorldInst: number = 0;
    worldSelectPlayerId: number = 0;
    worldLoginWorldId: number = 0;
    worldLoginWorldInst: number = 0;
    worldLoginPlayerId: number = 0;
    worldLoginWorldConst: number = 0;
    worldConnectStage: number = -1;
    worldSpawnSent: boolean = false;
    worldSpawnObjectId: number = 0;
    worldTimeOrigin: number = 0;
    worldLastHeartbeatAt: number = 0;
    worldHeartbeatGraceUntil: number = 0;
    // World flow control
    worldFlowInit: boolean = false;
    worldFlowLastUpdateMs: number = 0;
    worldFlowRateBytesPerSec: number = 0x7fffffff;
    worldFlowUsage: number = 0;
    worldFlowDebt: number = 0;
    worldFlowBucketMax: number = 0;
    worldPendingBytes: number = 0;
    worldInflightBytes: number = 0;
    worldFlowBlockCount: number = 0;
    worldFlowLastBlockLogAt: number = 0;
    // File transfer state
    fileListSent: boolean = false;
    // Timing and activity
    lastActivity: number = Date.now();
    lastTimestamp: number = 0;
    lastMessageNumber: number = 0;
    outgoingMessageNumber: number = 0;
    // Login response tracking
    loginResponseSendCount: number = 0;
    loginResponseAckCount: number = 0;
    lastLoginResponseMsgNum: number | null = null;
    lastLoginResponseSentAt: number = 0;
    loginResetTimer: ReturnType<typeof setTimeout> | null = null;
    loginResetAt: number = 0;
    // LithTech state
    lithTechOutSeq: number = 0;
    lithTechProtocolSent: boolean = false;
    lithTechIdSent: boolean = false;
    lithTechClientObjectIdSent: boolean = false;
    lithTechLoadWorldSent: boolean = false;
    lithDebugRemaining: number = 0;
    lithDebugTriggered: boolean = false;
    forcedLoginSent: boolean = false;
    pendingWorldPackets: Buffer[] = [];
    lithPartialBits: Buffer | null = null;
    lithPartialBitLength: number = 0;
    // Sequence numbers (for RakNet compatibility)
    private sendSequence: number = 0;
    private receiveSequence: number = 0;
    pendingAcks: number[] = [];
    reliableFormat: 'unknown' | 'raknet' | 'legacy' = 'unknown';

    /**
     * Initialize a new connection wrapper for a specific RakNet address.
     * @param {number} id - Connection ID assigned by the manager.
     * @param {RakSystemAddress} address - RakNet system address.
     */
    constructor(id: number, address: RakSystemAddress) {
        this.id = id;
        this.address = address;
        this.key = addressToString(address);
        this.createdAt = new Date();
    }

    /**
     * Whether the connection exceeded the inactivity timeout.
     * @returns {boolean} True when timed out.
     */
    get isTimedOut(): boolean {
        return Date.now() - this.lastActivity > CONNECTION_TIMEOUT;
    }

    /**
     * Milliseconds since the connection was created.
     * @returns {number} Connection age in milliseconds.
     */
    get connectionDuration(): number {
        return Date.now() - this.createdAt.getTime();
    }

    /**
     * Touch last-activity timestamp for timeout tracking.
     * @returns {void} No return value.
     */
    updateActivity(): void {
        // Touch last activity for timeout tracking.
        this.lastActivity = Date.now();
    }

    /**
     * Treat either phase or explicit flag as authenticated.
     * @returns {boolean} True when authenticated.
     */
    isAuthenticated(): boolean {
        // Treat either phase or explicit flag as authenticated.
        return this.loginPhase >= LoginPhase.AUTHENTICATED || this.authenticated;
    }

    /**
     * Whether the login state has reached the world session phase.
     * @returns {boolean} True when in world.
     */
    isInWorld(): boolean {
        // Terminal state for world session.
        return this.loginPhase === LoginPhase.IN_WORLD;
    }

    /**
     * Allocate the next outbound sequence number (13-bit wrap).
     * @returns {number} Sequence number.
     */
    getNextSendSequence(): number {
        // Wrap sequence to 13-bit mask for legacy compatibility.
        const seq = this.sendSequence;
        this.sendSequence = (this.sendSequence + 1) & SEQUENCE_MASK;
        return seq;
    }

    /**
     * Validate that the incoming sequence is the next expected value.
     * @param {number} seq - Incoming sequence number.
     * @returns {boolean} True when the sequence matches expectation.
     */
    isExpectedSequence(seq: number): boolean {
        // Expect strictly incremented sequence numbers.
        const expected = (this.receiveSequence + 1) & SEQUENCE_MASK;
        return seq === expected;
    }

    /**
     * Advance the receive sequence tracker to the provided value.
     * @param {number} seq - Latest received sequence number.
     * @returns {void} No return value.
     */
    updateReceiveSequence(seq: number): void {
        // Advance receive sequence tracking.
        this.receiveSequence = seq;
    }

    /**
     * Human-readable connection identity for logs.
     * @returns {string} Connection label string.
     */
    toString(): string {
        return `Connection[${this.id}] ${this.key} (${ConnectionState[this.state]})`;
    }
}

/**
 * Connection manager for address and ID-indexed lookups.
 */
export class ConnectionManager {
    private connections: Map<string, Connection> = new Map();
    private connectionById: Map<number, Connection> = new Map();
    private nextId: number = 1;

    /**
     * Return an existing connection or create a new one for the address.
     * @param {RakSystemAddress} address - RakNet address to lookup.
     * @returns {Connection} Resolved connection instance.
     */
    getOrCreate(address: RakSystemAddress): Connection {
        // Primary lookup keyed by ip:port for log clarity.
        const key = this.addressToKey(address);
        let conn = this.connections.get(key);
        if (!conn) {
            conn = new Connection(this.nextId++, address);
            conn.state = ConnectionState.CONNECTING;
            this.connections.set(key, conn);
            this.connectionById.set(conn.id, conn);
            console.log(`[ConnMgr] New connection #${conn.id}: ${conn.key}`);
        }
        return conn;
    }

    /**
     * Lookup a connection by RakNet address.
     * @param {RakSystemAddress} address - RakNet address to lookup.
     * @returns {Connection | undefined} Connection instance, if found.
     */
    get(address: RakSystemAddress): Connection | undefined {
        return this.connections.get(this.addressToKey(address));
    }

    /**
     * Lookup a connection by allocated numeric ID.
     * @param {number} id - Connection ID.
     * @returns {Connection | undefined} Connection instance, if found.
     */
    getById(id: number): Connection | undefined {
        return this.connectionById.get(id);
    }

    /**
     * Lookup by playerId (linear scan for small connection counts).
     * @param {number} playerId - Player ID to lookup.
     * @returns {Connection | undefined} Connection instance, if found.
     */
    getByPlayerId(playerId: number): Connection | undefined {
        if (!playerId) return undefined;
        for (const conn of this.connections.values()) {
            if (conn.playerId === playerId) return conn;
        }
        return undefined;
    }

    /**
     * Remove a connection from both address and ID indices.
     * @param {RakSystemAddress} address - RakNet address to remove.
     * @returns {void} No return value.
     */
    remove(address: RakSystemAddress): void {
        // Remove from both address and ID indices.
        const key = this.addressToKey(address);
        const conn = this.connections.get(key);
        if (conn) {
            conn.state = ConnectionState.DISCONNECTED;
            console.log(`[ConnMgr] Removing connection #${conn.id}: ${conn.key}`);
            this.connections.delete(key);
            this.connectionById.delete(conn.id);
        }
    }

    /**
     * Return all tracked connections.
     * @returns {Connection[]} Connection list.
     */
    getAll(): Connection[] {
        return Array.from(this.connections.values());
    }

    /**
     * Return only connections marked CONNECTED.
     * @returns {Connection[]} Connected connection list.
     */
    getConnected(): Connection[] {
        return this.getAll().filter((c) => c.state === ConnectionState.CONNECTED);
    }

    /**
     * Remove and return connections that exceed inactivity timeout.
     * @returns {Connection[]} Timed-out connections.
     */
    cleanupTimedOut(): Connection[] {
        const timedOut: Connection[] = [];
        for (const conn of this.connections.values()) {
            if (conn.isTimedOut) {
                timedOut.push(conn);
                this.remove(conn.address);
            }
        }
        return timedOut;
    }

    /**
     * Current tracked connection count.
     * @returns {number} Connection count.
     */
    get count(): number {
        return this.connections.size;
    }

    /**
     * Normalize address to "ip:port" key string.
     * @param {RakSystemAddress} address - RakNet address to normalize.
     * @returns {string} Normalized address key.
     */
    private addressToKey(address: RakSystemAddress): string {
        return addressToKey(address);
    }
}
