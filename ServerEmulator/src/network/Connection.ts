import { RemoteInfo } from './UDPServer';
import { SEQUENCE_MASK, HEARTBEAT_INTERVAL, CONNECTION_TIMEOUT } from '../protocol/Constants';

export enum ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    DISCONNECTING,
}

export enum LoginPhase {
    NONE,
    USER_SENT,
    PASSWORD_SENT,
    AUTHENTICATED,
}

export class Connection {
    readonly id: number;
    readonly address: string;
    readonly port: number;

    state: ConnectionState = ConnectionState.DISCONNECTED;

    private sendSequence: number = 0;
    private receiveSequence: number = 0;
    private lastActivityTime: number = Date.now();
    private createdAt: number = Date.now();

    clientId: number = 0;
    username: string = '';
    authenticated: boolean = false;
    pendingLoginUser: string = '';
    pendingLoginToken: number = 0;
    pendingLoginSession: string = '';
    pendingLoginAt: number = 0;
    loginPhase: LoginPhase = LoginPhase.NONE;
    loginAuthSessionHash: string = '';
    loginAuthUsername: string = '';
    loginAuthHost: string = '';
    loginAuthComputer: string = '';
    loginAuthBlobFlag: boolean = false;
    loginAuthBlobBytes: number = 0;
    loginAuthBlobU32: number = 0;
    worldSelectSent: boolean = false;
    fileListSent: boolean = false;
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

    lastTimestamp: number = 0;
    lastMessageNumber: number = 0;
    outgoingMessageNumber: number = 0;
    pendingAcks: number[] = [];
    reliableFormat: 'unknown' | 'raknet' | 'legacy' = 'unknown';

    loginResponseSendCount: number = 0;
    loginResponseAckCount: number = 0;
    lastLoginResponseMsgNum: number | null = null;
    lastLoginResponseSentAt: number = 0;

    lithTechIdSent: boolean = false;
    lithTechClientObjectIdSent: boolean = false;
    lithTechLoadWorldSent: boolean = false;
    lithTechProtocolSent: boolean = false;
    lithTechOutSeq: number = 0;
    lithDebugRemaining: number = 0;
    lithDebugTriggered: boolean = false;
    forcedLoginSent: boolean = false;
    pendingWorldPackets: Buffer[] = [];
    lithPartialBits: Buffer | null = null;
    lithPartialBitLength: number = 0;

    constructor(id: number, rinfo: RemoteInfo) {
        this.id = id;
        this.address = rinfo.address;
        this.port = rinfo.port;
    }

    get key(): string {
        return `${this.address}:${this.port}`;
    }

    get isTimedOut(): boolean {
        return Date.now() - this.lastActivityTime > CONNECTION_TIMEOUT;
    }

    get connectionDuration(): number {
        return Date.now() - this.createdAt;
    }

    updateActivity(): void {
        this.lastActivityTime = Date.now();
    }

    getNextSendSequence(): number {
        const seq = this.sendSequence;
        this.sendSequence = (this.sendSequence + 1) & SEQUENCE_MASK;
        return seq;
    }

    isExpectedSequence(seq: number): boolean {
        const expected = (this.receiveSequence + 1) & SEQUENCE_MASK;
        return seq === expected;
    }

    updateReceiveSequence(seq: number): void {
        this.receiveSequence = seq;
    }

    toString(): string {
        return `Connection[${this.id}] ${this.address}:${this.port} (${ConnectionState[this.state]})`;
    }
}

export class ConnectionManager {
    private connections: Map<string, Connection> = new Map();
    private connectionById: Map<number, Connection> = new Map();
    private nextConnectionId: number = 1;

    getByAddress(address: string, port: number): Connection | undefined {
        return this.connections.get(`${address}:${port}`);
    }

    getById(id: number): Connection | undefined {
        return this.connectionById.get(id);
    }

    create(rinfo: RemoteInfo): Connection {
        const key = `${rinfo.address}:${rinfo.port}`;

        let conn = this.connections.get(key);
        if (conn) {
            return conn;
        }

        conn = new Connection(this.nextConnectionId++, rinfo);
        conn.state = ConnectionState.CONNECTING;
        this.connections.set(key, conn);
        this.connectionById.set(conn.id, conn);

        console.log(`[ConnectionManager] Created ${conn}`);
        return conn;
    }

    remove(conn: Connection): void {
        conn.state = ConnectionState.DISCONNECTED;
        this.connections.delete(conn.key);
        this.connectionById.delete(conn.id);
        console.log(`[ConnectionManager] Removed ${conn}`);
    }

    getAll(): Connection[] {
        return Array.from(this.connections.values());
    }

    getConnected(): Connection[] {
        return this.getAll().filter((c) => c.state === ConnectionState.CONNECTED);
    }

    cleanupTimedOut(): Connection[] {
        const timedOut: Connection[] = [];
        for (const conn of this.connections.values()) {
            if (conn.isTimedOut) {
                timedOut.push(conn);
                this.remove(conn);
            }
        }
        return timedOut;
    }

    get count(): number {
        return this.connections.size;
    }
}
