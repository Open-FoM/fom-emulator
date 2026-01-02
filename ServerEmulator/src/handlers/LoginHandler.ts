import * as crypto from 'crypto';
import RakBitStream from '../raknet-js/structures/BitStream';
import { BitOrder } from '../protocol/BitOrder';
import { RakNetMessageId, LoginResult } from '../protocol/Constants';
import {
    readCompressedString,
    readHuffmanStringRawLenBE,
    writeCompressedString,
} from '../protocol/RakStringCompressor';
import { Connection, LoginPhase } from '../network/Connection';
import { APARTMENT_WORLD_TABLE } from '../world/WorldRegistry';

type LoginHandlerHooks = {
    wrapReliable: (innerData: Buffer, connection: Connection) => Buffer;
    ensureBitOrder?: (actual: BitOrder | undefined, expected: BitOrder, context: string) => void;
    realignMsbBuffer?: (buffer: Buffer, bitOffset: number) => Buffer;
    logBits?: (tag: string, buffer: Buffer, bits: number) => void;
    onAuthenticated?: (connection: Connection, wasAuth: boolean) => Buffer | null;
};

type LoginHandlerConfig = {
    serverMode: 'master' | 'world';
    loginDebug: boolean;
    verbose: boolean;
    worldIp: string;
    worldPort: number;
    loginResponseMinimal: boolean;
    loginResponseTimestamp: boolean;
    loginRequireCredentials: boolean;
    acceptLoginAuthWithoutUser: boolean;
    resendDuplicateLogin6D: boolean;
    worldSelectWorldId: number;
    worldSelectWorldInst: number;
    worldSelectPlayerId: number;
    worldSelectPlayerIdRandom: boolean;
    worldLoginWorldConst: number;
};

export class LoginHandler {
    private hooks: LoginHandlerHooks;
    private config: LoginHandlerConfig;
    private apartmentInstByConn: Map<string, number> = new Map();
    private apartmentInstCounts: Map<number, number> = new Map();
    private apartmentInstList: number[] = [];

    // Build a handler with login parsing config and callbacks.
    constructor(config: LoginHandlerConfig, hooks: LoginHandlerHooks) {
        this.config = config;
        this.hooks = hooks;
        this.apartmentInstList = Object.keys(APARTMENT_WORLD_TABLE)
            .map((key) => Number.parseInt(key, 10))
            .filter((value) => Number.isFinite(value) && value > 0)
            .sort((a, b) => a - b);
    }

    // Reserve a worldInst for apartment worlds (worldId=4). Uses least-loaded inst id.
    private allocApartmentInst(connection: Connection): number {
        const existing = this.apartmentInstByConn.get(connection.key);
        if (existing !== undefined) {
            return existing;
        }
        if (this.apartmentInstList.length === 0) {
            return 0;
        }
        let chosen = this.apartmentInstList[0];
        let bestCount = this.apartmentInstCounts.get(chosen) ?? 0;
        for (const inst of this.apartmentInstList) {
            const count = this.apartmentInstCounts.get(inst) ?? 0;
            if (count < bestCount) {
                bestCount = count;
                chosen = inst;
            }
        }
        this.apartmentInstByConn.set(connection.key, chosen);
        this.apartmentInstCounts.set(chosen, bestCount + 1);
        return chosen;
    }

    // Release a previously reserved apartment inst.
    private releaseApartmentInst(connection: Connection): void {
        const inst = this.apartmentInstByConn.get(connection.key);
        if (inst === undefined) {
            return;
        }
        this.apartmentInstByConn.delete(connection.key);
        const count = (this.apartmentInstCounts.get(inst) ?? 1) - 1;
        if (count > 0) {
            this.apartmentInstCounts.set(inst, count);
        } else {
            this.apartmentInstCounts.delete(inst);
        }
    }

    // External hook for connection teardown.
    releaseConnection(connection: Connection): void {
        this.releaseApartmentInst(connection);
    }

    // Emit debug log lines when login debug is enabled.
    private logLoginDebug(message: string): void {
        if (this.config.loginDebug || this.config.verbose) {
            console.log(message);
        }
    }

    private pickRandomPlayerId(): number {
        const maxId = 0xfffe;
        return crypto.randomInt(1, maxId + 1) >>> 0;
    }

    private resolveWorldSelectPlayerId(connection: Connection): number {
        if (this.config.worldSelectPlayerId > 0) {
            connection.worldSelectPlayerId = this.config.worldSelectPlayerId >>> 0;
            return connection.worldSelectPlayerId;
        }
        if (connection.worldSelectPlayerId > 0) {
            return connection.worldSelectPlayerId;
        }
        let playerId = 0;
        if (this.config.worldSelectPlayerIdRandom) {
            // TODO(DB): replace random playerId with DB-backed account id (keep <= 0xFFFE).
            playerId = this.pickRandomPlayerId();
        } else {
            playerId = connection.id;
        }
        if (playerId <= 0) {
            playerId = connection.id;
        }
        connection.worldSelectPlayerId = playerId >>> 0;
        return connection.worldSelectPlayerId;
    }

    // Re-align a bitstream by discarding a number of MSB bits.
    private realignMsbBuffer(buffer: Buffer, bitOffset: number): Buffer {
        if (this.hooks.realignMsbBuffer) {
            return this.hooks.realignMsbBuffer(buffer, bitOffset);
        }
        const reader = new RakBitStream(buffer);
        if (bitOffset > 0) {
            reader.readBits(bitOffset);
        }
        const writer = new RakBitStream();
        const totalBits = Math.max(0, buffer.length * 8 - bitOffset);
        for (let i = 0; i < totalBits; i += 1) {
            writer.writeBit(reader.readBit() === 1);
        }
        const outBits = Math.max(0, writer.bits());
        const outBytes = Math.ceil(outBits / 8);
        return writer.data.subarray(0, outBytes);
    }

    // Read a bounded ASCII string using a bit-length prefix.
    private readBoundedString(stream: RakBitStream, maxLen: number): string {
        if (maxLen <= 1) {
            return '';
        }
        const bits = Math.floor(Math.log2(maxLen)) + 1;
        const len = stream.readBits(bits);
        const rawLen = Math.max(0, len);
        const safeLen = Math.min(rawLen, maxLen - 1);
        const bytes: number[] = [];
        for (let i = 0; i < rawLen; i += 1) {
            const byte = stream.readBits(8);
            if (i < safeLen) {
                bytes.push(byte);
            }
        }
        return Buffer.from(bytes).toString('latin1');
    }

    // Read a big-endian u32 from the bitstream.
    private readU32(stream: RakBitStream): number {
        const b0 = stream.readBits(8);
        const b1 = stream.readBits(8);
        const b2 = stream.readBits(8);
        const b3 = stream.readBits(8);
        return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    }

    // Read a compressed unsigned integer (RakNet "compressed") of size bytes.
    private readCompressedUInt(stream: RakBitStream, size: number): number {
        const comp = stream.readCompressed(size);
        let value = 0;
        let factor = 1;
        for (let i = 0; i < size; i += 1) {
            value += comp.readByte() * factor;
            factor *= 256;
        }
        return value >>> 0;
    }

    // Consume a fixed number of bytes from the bitstream.
    private skipBytes(stream: RakBitStream, count: number): void {
        for (let i = 0; i < count; i += 1) {
            stream.readBits(8);
        }
    }

    // Read either Huffman or compressed string without committing if parse fails.
    private readMaybeHuffmanString(stream: RakBitStream, maxLen: number): string {
        const offset = stream.readOffsetBits();
        const cloneAtOffset = () => {
            const clone = new RakBitStream(stream.data);
            if (offset > 0) {
                clone.readBits(offset);
            }
            return clone;
        };
        try {
            const clone = cloneAtOffset();
            const before = clone.readOffsetBits();
            const value = readHuffmanStringRawLenBE(clone, maxLen);
            const consumed = clone.readOffsetBits() - before;
            if (consumed > 0) {
                stream.readBits(consumed);
            }
            return value;
        } catch {
            try {
                const clone = cloneAtOffset();
                const before = clone.readOffsetBits();
                const value = readCompressedString(clone, maxLen);
                const consumed = clone.readOffsetBits() - before;
                if (consumed > 0) {
                    stream.readBits(consumed);
                }
                return value;
            } catch {
                return '';
            }
        }
    }

    // Build the session string returned in 0x6D (session token only).
    private buildSessionString(username: string, token: number): string {
        const rand = crypto.randomBytes(8).toString('hex');
        return `sess=${rand}`;
    }

    // Parse dotted IPv4 string into byte array.
    private parseIpv4Bytes(value: string): number[] | null {
        const parts = value.split('.');
        if (parts.length !== 4) return null;
        const bytes = parts.map((part) => Number.parseInt(part, 10));
        if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null;
        return bytes;
    }

    // Convert IPv4 string to BE u32 (so LE byte write yields correct host-order IP).
    private ipv4ToU32BE(value: string): number {
        const bytes = this.parseIpv4Bytes(value);
        if (!bytes) return 0;
        return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    }

    // Fast ASCII sanity check used for candidate strings.
    private isPrintableAscii(value: string): boolean {
        for (let i = 0; i < value.length; i += 1) {
            const c = value.charCodeAt(i);
            if (c < 0x20 || c > 0x7e) return false;
        }
        return true;
    }

    // === Login Flow (ordered: 0x6C -> 0x6D -> 0x6E -> 0x7B -> 0x72 -> 0x73) ===

    // Check whether a packet ID belongs to the login flow for the current server mode.
    isLoginRequestId(packetId: number): boolean {
        if (this.config.serverMode === 'world') {
            return (
                packetId === RakNetMessageId.ID_LOGIN ||
                packetId === RakNetMessageId.ID_WORLD_LOGIN
            );
        }
        return (
            packetId === RakNetMessageId.ID_LOGIN_REQUEST_TEXT ||
            packetId === RakNetMessageId.ID_LOGIN ||
            packetId === RakNetMessageId.ID_WORLD_LOGIN
        );
    }

    // Parse login-related packets from a RakNet bitstream buffer (entry point).
    tryParseLoginRequestRak(
        buffer: Buffer,
        connection: Connection,
        source: string,
        options?: { dryRun?: boolean; bitOffset?: number; tracePath?: string },
    ): Buffer | null {
        if (buffer.length < 2) {
            return null;
        }
        const dryRun = options?.dryRun === true;
        const bitOffset = Math.max(0, Math.min(7, options?.bitOffset ?? 0));
        const totalBits = buffer.length * 8 - bitOffset;
        const pathTag = options?.tracePath || 'LoginHandler.tryParseLoginRequestRak';

        if (this.hooks.logBits) {
            this.hooks.logBits(
                `[LoginReq] ${connection.key} src=${source}`,
                buffer,
                buffer.length * 8,
            );
        }

        const alignedBuffer = bitOffset > 0 ? this.realignMsbBuffer(buffer, bitOffset) : buffer;
        const stream = new RakBitStream(alignedBuffer);
        if (this.hooks.ensureBitOrder) {
            this.hooks.ensureBitOrder(
                (stream as unknown as { bitOrder?: BitOrder }).bitOrder,
                'msb',
                `${pathTag}:RakBitStream`,
            );
        }

        let packetId = stream.readByte();
        if (packetId === RakNetMessageId.ID_TIMESTAMP) {
            if (totalBits < 80) {
                return null;
            }
            stream.readLongLong();
            packetId = stream.readByte();
        }

        if (packetId === RakNetMessageId.ID_WORLD_LOGIN) {
            const info = this.parseWorldLogin(stream, connection, source, dryRun);
            if (!info || dryRun) {
                return null;
            }
            const expectedPlayerId =
                this.config.worldSelectPlayerId > 0
                    ? this.config.worldSelectPlayerId
                    : connection.worldSelectPlayerId;
            if (expectedPlayerId > 0 && info.playerId !== expectedPlayerId) {
                this.logLoginDebug(
                    `[Login72] playerId mismatch src=${source} got=${info.playerId} expected=${expectedPlayerId}`,
                );
                return null;
            }
            if (
                this.config.worldLoginWorldConst !== 0 &&
                info.worldConst !== 0 &&
                info.worldConst !== this.config.worldLoginWorldConst
            ) {
                this.logLoginDebug(
                    `[Login72] worldConst mismatch src=${source} got=0x${info.worldConst.toString(
                        16,
                    )} expected=0x${this.config.worldLoginWorldConst.toString(16)}`,
                );
            }
            if (this.config.serverMode === 'master') {
                if (!connection.authenticated) {
                    this.logLoginDebug(
                        `[Login72] ignore unauth src=${source} playerId=${info.playerId}`,
                    );
                    return null;
                }
                const response = this.buildWorldLoginReturn(
                    true,
                    this.config.worldIp,
                    this.config.worldPort,
                );
                this.logLoginDebug(
                    `[Login72] world login ok -> 0x73 world=${this.config.worldIp}:${this.config.worldPort} playerId=${info.playerId} worldId=${info.worldId} inst=${info.worldInst}`,
                );
                return this.hooks.wrapReliable(response, connection);
            }

            const wasAuth = connection.authenticated;
            connection.authenticated = true;
            connection.loginPhase = LoginPhase.AUTHENTICATED;
            connection.worldLoginWorldId = info.worldId;
            connection.worldLoginWorldInst = info.worldInst;
            connection.worldLoginPlayerId = info.playerId;
            connection.worldLoginWorldConst = info.worldConst;
            this.logLoginDebug(
                `[Login72] world login accepted src=${source} playerId=${info.playerId} worldId=${info.worldId} inst=${info.worldInst}`,
            );
            if (this.hooks.onAuthenticated) {
                const response = this.hooks.onAuthenticated(connection, wasAuth);
                if (response) return response;
            }
            return null;
        }

        if (packetId === RakNetMessageId.ID_LOGIN) {
            const wasAuth = connection.authenticated;
            this.parseLoginAuth(stream, connection, source, dryRun);
            if (!dryRun && connection.authenticated) {
                if (this.config.serverMode !== 'world' && !connection.worldSelectSent) {
                    const playerId = this.resolveWorldSelectPlayerId(connection);
                    const worldId = this.config.worldSelectWorldId;
                    const worldInst =
                        worldId === 4 && this.config.worldSelectWorldInst === 0
                            ? this.allocApartmentInst(connection)
                            : this.config.worldSelectWorldInst;
                    const response = this.buildWorldSelect(playerId, worldId, worldInst);
                    connection.worldSelectSent = true;
                    this.logLoginDebug(
                        `[Login6E] auth ok -> 0x7B worldId=${worldId} worldInst=${worldInst} playerId=${playerId}`,
                    );
                    return this.hooks.wrapReliable(response, connection);
                }
            }
            if (!dryRun && this.hooks.onAuthenticated) {
                const response = this.hooks.onAuthenticated(connection, wasAuth);
                if (response) return response;
            }
            return null;
        }

        if (!this.isLoginRequestId(packetId)) {
            return null;
        }
        const minBytes = this.minParseBytesForPacketId(packetId);
        if (minBytes !== null && buffer.length < minBytes) {
            return null;
        }
        if (packetId === RakNetMessageId.ID_LOGIN_REQUEST_TEXT) {
            return this.parseLoginRequestText(stream, connection, source, dryRun);
        }

        return null;
    }

    // Enforce minimum byte requirements for known login packets.
    private minParseBytesForPacketId(packetId: number): number | null {
        if (packetId === RakNetMessageId.ID_LOGIN_REQUEST_TEXT) {
            // 0x6C: id + raw u32 bit-length + token (u16), plus 2 flag bits.
            return 1 + 4 + 2;
        }
        if (packetId === RakNetMessageId.ID_LOGIN) {
            return 1;
        }
        if (packetId === RakNetMessageId.ID_WORLD_LOGIN) {
            return 1;
        }
        return null;
    }

    // Parse 0x6C (LOGIN_REQUEST_TEXT) and build 0x6D response when valid.
    // 0x6C payload (client -> master, MSB bit order):
    //   - preFlag bit (must be 0)
    //   - username (Huffman string, max 2048)
    //   - postFlag bit (must be 0)
    //   - token u16
    // 0x6D response (master -> client):
    //   - [optional] ID_TIMESTAMP + u64 time (LOGIN_RESPONSE_TIMESTAMP)
    //   - ID_LOGIN_REQUEST_RETURN
    //   - status (compressed u8)
    //   - session/address string (RakNet StringCompressor, max 2048)
    parseLoginRequestText(
        stream: RakBitStream,
        connection: Connection,
        source: string,
        dryRun: boolean,
    ): Buffer | null {
        try {
            const preFlag = stream.readBit();
            const rawUser = readHuffmanStringRawLenBE(stream, 2048);
            const postFlag = stream.readBit();
            const username = this.isPrintableAscii(rawUser) ? rawUser : '';
            const token = stream.readBits(16);
            const validUser = username.length >= 3 && username.length <= 64;
            const flagOk = preFlag === 0 && postFlag === 0;
            const tokenOk = token !== 0;

            if (!validUser || !flagOk || !tokenOk) {
                this.logLoginDebug(
                    `[Login6C] reject src=${source} userLen=${username.length} pre=${preFlag} post=${postFlag} token=0x${token.toString(16)}`,
                );
                return null;
            }

            if (!username) {
                this.logLoginDebug(`[Login6C] reject src=${source} empty user`);
                return null;
            }

            if (dryRun) {
                this.logLoginDebug(
                    `[Login6C] dryRun skip src=${source} user="${username}" token=0x${token.toString(16)}`,
                );
                return null;
            }

            const now = Date.now();
            const cooldownMs = 2000;
            if (
                connection.lastLoginResponseSentAt &&
                now - connection.lastLoginResponseSentAt < cooldownMs
            ) {
                this.logLoginDebug(
                    `[Login6C] cooldown skip src=${source} user="${username}" token=0x${token.toString(16)}`,
                );
                return null;
            }

            if (connection.loginPhase === LoginPhase.AUTHENTICATED) {
                this.logLoginDebug(
                    `[Login6C] already authenticated src=${source} user="${username}"`,
                );
                return null;
            }
            if (
                connection.loginPhase === LoginPhase.USER_SENT &&
                connection.pendingLoginAt &&
                now - connection.pendingLoginAt < cooldownMs
            ) {
                if (connection.pendingLoginUser && username !== connection.pendingLoginUser) {
                    this.logLoginDebug(
                        `[Login6C] pending mismatch user src=${source} user="${username}" pending="${connection.pendingLoginUser}"`,
                    );
                    return null;
                }
                if (connection.pendingLoginToken && token !== connection.pendingLoginToken) {
                    this.logLoginDebug(
                        `[Login6C] pending mismatch token src=${source} token=0x${token.toString(16)} pending=0x${connection.pendingLoginToken.toString(16)}`,
                    );
                    return null;
                }
            }
            if (connection.loginPhase === LoginPhase.USER_SENT) {
                if (
                    connection.pendingLoginUser &&
                    username &&
                    username !== connection.pendingLoginUser
                ) {
                    this.logLoginDebug(
                        `[Login6C] pending user conflict src=${source} user="${username}" pending="${connection.pendingLoginUser}"`,
                    );
                    return null;
                }
                if (
                    connection.pendingLoginToken &&
                    token &&
                    token !== connection.pendingLoginToken
                ) {
                    this.logLoginDebug(
                        `[Login6C] pending token conflict src=${source} token=0x${token.toString(16)} pending=0x${connection.pendingLoginToken.toString(16)}`,
                    );
                    return null;
                }
            }
            if (
                connection.loginPhase === LoginPhase.USER_SENT &&
                connection.pendingLoginUser === username &&
                connection.pendingLoginToken === token
            ) {
                if (connection.pendingLoginSession) {
                    if (!this.config.resendDuplicateLogin6D) {
                        this.logLoginDebug(
                            `[Login6C] duplicate pending -> skip resend 0x6D src=${source} user="${username}" token=0x${token.toString(16)}`,
                        );
                        return null;
                    }
                    this.logLoginDebug(
                        `[Login6C] duplicate pending -> resend 0x6D src=${source} user="${username}" token=0x${token.toString(16)}`,
                    );
                    const login = this.buildLoginResponse(
                        true,
                        this.config.worldIp,
                        this.config.worldPort,
                        connection.pendingLoginSession,
                    );
                    if (login.length === 0) {
                        this.logLoginDebug(
                            `[Login6C] duplicate pending build 0x6D failed src=${source} user="${username}"`,
                        );
                        return null;
                    }
                    const wrapped = this.hooks.wrapReliable(login, connection);
                    this.logLoginDebug(
                        `[Login6C] duplicate pending built 0x6D len=${login.length} wrapped=${wrapped.length} src=${source}`,
                    );
                    return wrapped;
                }
                this.logLoginDebug(
                    `[Login6C] duplicate pending src=${source} user="${username}" token=0x${token.toString(16)}`,
                );
                return null;
            }

            // Store pending login info; wait for 0x6E auth before authenticating.
            const session = this.buildSessionString(username, token);
            connection.pendingLoginUser = username;
            connection.pendingLoginToken = token;
            connection.pendingLoginSession = session;
            connection.pendingLoginAt = Date.now();
            connection.loginPhase = LoginPhase.USER_SENT;

            this.logLoginDebug(
                `[Login6C] build 0x6D src=${source} user="${username}" token=0x${token.toString(16)} sessionLen=${session.length}`,
            );
            const login = this.buildLoginResponse(
                true,
                this.config.worldIp,
                this.config.worldPort,
                session,
            );
            if (login.length === 0) {
                this.logLoginDebug(`[Login6C] build 0x6D failed src=${source} user="${username}"`);
                return null;
            }
            const wrapped = this.hooks.wrapReliable(login, connection);
            this.logLoginDebug(
                `[Login6C] built 0x6D len=${login.length} wrapped=${wrapped.length} src=${source}`,
            );
            return wrapped;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logLoginDebug(`[Login6C] exception src=${source} err=${msg}`);
            return null;
        }
    }

    // Build 0x6D LOGIN_REQUEST_RETURN payload (master -> client).
    buildLoginResponse(
        success: boolean,
        worldIp: string = '',
        worldPort: number = 0,
        sessionOverride?: string,
    ): Buffer {
        const writer = new RakBitStream();
        if (this.config.loginResponseTimestamp) {
            writer.writeByte(RakNetMessageId.ID_TIMESTAMP);
            writer.writeLongLong(BigInt(Date.now()));
        }
        writer.writeByte(RakNetMessageId.ID_LOGIN_REQUEST_RETURN);
        writer.writeCompressed(success ? LoginResult.SUCCESS : LoginResult.FAILURE, 1);

        const override = sessionOverride && sessionOverride.length > 0 ? sessionOverride : '';
        const address = success
            ? override ||
              (this.config.loginResponseMinimal ? '' : this.formatWorldAddress(worldIp, worldPort))
            : '';
        if (this.config.loginDebug || this.config.verbose) {
            const mode = this.config.loginResponseTimestamp ? 'ts+6d' : '6d';
            console.log(
                `[Login6D] build mode=${mode} success=${success} addr="${address}" len=${address.length}`,
            );
            if (override) {
                console.log(`[Login6D] session="${override}"`);
            }
        }
        // LOGIN_REQUEST_RETURN uses RakNet StringCompressor (WriteCompressed length).
        writeCompressedString(writer, address, 2048);

        const payload = writer.data;

        // Validate 0x6D payload can round-trip decode locally before sending.
        try {
            const verify = new RakBitStream(payload);
            const packetId = verify.readByte();
            if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) {
                console.log(`[Login6D] encode verify failed: bad id=0x${packetId.toString(16)}`);
                return Buffer.alloc(0);
            }
            const statusStream = verify.readCompressed(1);
            const status = statusStream.readByte();
            const decoded = readCompressedString(verify, 2048);
            if (decoded !== address) {
                console.log(
                    `[Login6D] encode verify failed: status=${status} expected="${address}" got="${decoded}"`,
                );
                return Buffer.alloc(0);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(`[Login6D] encode verify failed: ${msg}`);
            return Buffer.alloc(0);
        }

        if (this.config.loginDebug || this.config.verbose) {
            console.log(
                `[Login6D] build ok payloadLen=${payload.length} first=0x${payload[0].toString(16)}`,
            );
        }
        return payload;
    }

    // Build world address session string for the 0x6D session payload.
    private formatWorldAddress(worldIp: string, worldPort: number): string {
        const trimmed = (worldIp || '').trim();
        if (!trimmed) return '';
        if (worldPort > 0 && !trimmed.includes(':')) {
            return `${trimmed}:${worldPort}`;
        }
        return trimmed;
    }

    // Parse 0x6E (LOGIN auth packet) and mark the connection authenticated.
    // Read order mirrors Packet_ID_LOGIN_Serialize in the client:
    //   - username (Huffman string, max 2048) [ClientNetworking this+0x91]
    //   - sessionHashHex (bounded 64) [MD5 hex built in ClientNetworking_HandleLoginRequestReturn_6D]
    //   - clientInfoU32[3] (u32 x3) [vector copied from ClientNetworking this+0x59C]
    //   - macAddress (Huffman string, max 2048) [GetAdaptersInfo -> "xx-xx-xx-xx-xx-xx"]
    //   - 4x pairs: (bounded 64, bounded 32) [currently empty in the 0x6E build path]
    //   - hostName (bounded 64) [ClientNetworking this+0x111]
    //   - computerName (Huffman/Compressed, max 2048) [GetComputerNameA, 32 bytes]
    //   - blobFlag bit, if set: 0x400 bytes + blobU32
    parseLoginAuth(
        stream: RakBitStream,
        connection: Connection,
        source: string,
        dryRun: boolean,
    ): void {
        if (
            connection.loginPhase !== LoginPhase.USER_SENT &&
            !this.config.acceptLoginAuthWithoutUser
        ) {
            return;
        }

        let username = '';
        let sessionHash = '';
        let hostName = '';
        let computerName = '';
        let macAddress = '';
        let infoU32a = 0;
        let infoU32b = 0;
        let infoU32c = 0;
        const infoPairs: Array<{ left: string; right: string }> = [];
        let blobFlag = 0;
        let blobBytes = 0;
        let blobU32 = 0;

        try {
            username = readHuffmanStringRawLenBE(stream, 2048);
            sessionHash = this.readBoundedString(stream, 64);
            infoU32a = this.readU32(stream);
            infoU32b = this.readU32(stream);
            infoU32c = this.readU32(stream);
            macAddress = readHuffmanStringRawLenBE(stream, 2048);
            for (let i = 0; i < 4; i += 1) {
                const left = this.readBoundedString(stream, 64);
                const right = this.readBoundedString(stream, 32);
                infoPairs.push({ left, right });
            }
            hostName = this.readBoundedString(stream, 64);
            computerName = this.readMaybeHuffmanString(stream, 2048);
            blobFlag = stream.readBit();
            if (blobFlag) {
                this.skipBytes(stream, 0x400);
                blobBytes = 0x400;
                blobU32 = this.readU32(stream);
            }
        } catch {
            // Best-effort parse; still allow auth to continue.
        }

        if (!username && connection.pendingLoginUser) {
            username = connection.pendingLoginUser;
        }

        if (dryRun) {
            return;
        }

        // TODO(DB): validate 0x6E auth payload before accepting login / sending 0x73.
        if (!this.validateLoginAuthWithDb(connection, {
            username,
            sessionHash,
            hostName,
            computerName,
            macAddress,
            infoU32a,
            infoU32b,
            infoU32c,
            blobFlag: blobFlag === 1,
            blobBytes,
            blobU32,
        })) {
            this.logLoginDebug(
                `[Login6E] reject (db) src=${source} user="${username}"`,
            );
            return;
        }

        connection.loginAuthSessionHash = sessionHash;
        connection.loginAuthUsername = username;
        connection.loginAuthHost = hostName;
        connection.loginAuthComputer = computerName;
        connection.loginAuthBlobFlag = blobFlag === 1;
        connection.loginAuthBlobBytes = blobBytes;
        connection.loginAuthBlobU32 = blobU32;

        connection.username = username;
        connection.authenticated = true;
        connection.loginPhase = LoginPhase.AUTHENTICATED;
        connection.pendingLoginUser = '';
        connection.pendingLoginToken = 0;
        connection.pendingLoginSession = '';
        connection.pendingLoginAt = 0;

        if (this.config.loginDebug || this.config.verbose) {
            const sessionPreview = sessionHash ? sessionHash.slice(0, 32) : '';
            const hostPreview = hostName || computerName;
            const blobNote = blobFlag
                ? ` blob=0x${blobBytes.toString(16)} u32=0x${blobU32.toString(16)}`
                : '';
            const pairCount = infoPairs.filter((pair) => pair.left || pair.right).length;
            const infoNote = ` mac="${macAddress}" info=[${infoU32a},${infoU32b},${infoU32c}] pairs=${pairCount}`;
            console.log(
                `[Login6E] ${connection.key} user="${username}" session="${sessionPreview}" host="${hostPreview}"${blobNote}${infoNote} src=${source}`,
            );
        }
    }

    // Placeholder for DB-backed auth validation.
    // Return false to reject 0x6E and block 0x73 emission.
    private validateLoginAuthWithDb(
        _connection: Connection,
        _auth: {
            username: string;
            sessionHash: string;
            hostName: string;
            computerName: string;
            macAddress: string;
            infoU32a: number;
            infoU32b: number;
            infoU32c: number;
            blobFlag: boolean;
            blobBytes: number;
            blobU32: number;
        },
    ): boolean {
        // TODO(DB): query account/session store here.
        return true;
    }

    private parseWorldLogin(
        stream: RakBitStream,
        _connection: Connection,
        source: string,
        _dryRun: boolean,
    ): { worldId: number; worldInst: number; playerId: number; worldConst: number } | null {
        try {
            const worldId = this.readCompressedUInt(stream, 1) & 0xff;
            const worldInst = this.readCompressedUInt(stream, 1) & 0xff;
            const playerId = this.readCompressedUInt(stream, 4);
            const worldConst = this.readCompressedUInt(stream, 4);
            return { worldId, worldInst, playerId, worldConst };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logLoginDebug(`[Login72] parse failed src=${source} err=${msg}`);
            return null;
        }
    }

    private buildWorldSelect(playerId: number, worldId: number, worldInst: number): Buffer {
        const writer = new RakBitStream();
        writer.writeByte(RakNetMessageId.ID_WORLD_SELECT);
        writer.writeCompressed(playerId >>> 0, 4);
        writer.writeCompressed(4, 1);
        writer.writeCompressed(worldId & 0xff, 1);
        writer.writeCompressed(worldInst & 0xff, 1);
        return writer.data;
    }

    // Build 0x73 WORLD_LOGIN_RETURN (master/world -> client).
    // Layout: id + code(u8c) + flag(u8c) + ip(u32c, BE->LE) + port(u16c)
    private buildWorldLoginReturn(
        success: boolean,
        worldIp: string,
        worldPort: number,
        options?: { code?: number; flag?: number },
    ): Buffer {
        const writer = new RakBitStream();
        writer.writeByte(RakNetMessageId.ID_WORLD_LOGIN_RETURN);
        const code = options?.code ?? (success ? 1 : 0);
        const flag = options?.flag ?? 0;
        writer.writeCompressed(code & 0xff, 1);
        writer.writeCompressed(flag & 0xff, 1);
        const ipU32 = this.ipv4ToU32BE(worldIp);
        writer.writeCompressed(ipU32 >>> 0, 4);
        writer.writeCompressed(worldPort & 0xffff, 2);
        return writer.data;
    }
}
