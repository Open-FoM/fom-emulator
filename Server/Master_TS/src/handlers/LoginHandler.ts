/**
 * Login Handler for V2
 *
 * Handles the FoM login flow based on Docs/Packets specifications:
 *   0x6C (LOGIN_REQUEST) -> 0x6D (LOGIN_REQUEST_RETURN)
 *   0x6E (LOGIN) -> 0x6F (LOGIN_RETURN)
 *   0x70 (LOGIN_TOKEN_CHECK) bidirectional
 *   0x72 (WORLD_LOGIN) -> 0x73 (WORLD_LOGIN_RETURN)
 *   0x7B (WORLD_SELECT)
 *
 * Packet formats are based on reverse-engineered structures from:
 * - Docs/Packets/ID_LOGIN_REQUEST.md
 * - Docs/Packets/ID_LOGIN_REQUEST_RETURN.md
 * - Docs/Packets/ID_LOGIN.md
 * - Docs/Packets/ID_LOGIN_RETURN.md
 * - Docs/Packets/ID_LOGIN_TOKEN_CHECK.md
 */

import {
    RakNetMessageId,
    LoginRequestReturnStatus,
    LoginReturnStatus,
    AccountType,
} from '../protocol/Constants';
import { Connection, LoginPhase } from '../network/Connection';
import type { RakSystemAddress } from '../bindings/raknet';
import { NativeBitStream, encodeString } from '../bindings/raknet';
import {
    RakBitStream,
    readCompressedString,
    readByteArrayCompressed,
    writeCompressedString,
    writeByteArrayCompressed,
    decodeHuffmanBitsFromStream,
    writeHuffmanStringCompressedU32,
    readHuffmanStringCompressedU32,
} from '../protocol/HuffmanCodec';
import { buildWorldLoginBurst } from '../protocol/LithTechMessages';
import { APARTMENT_WORLD_TABLE } from '../world/WorldRegistry';

export interface LoginHandlerConfig {
    serverMode: 'master' | 'world';
    worldIp: string;
    worldPort: number;
    debug: boolean;
    loginDebug?: boolean;
    loginStrict?: boolean;
    loginRequireCredentials?: boolean;
    acceptLoginAuthWithoutUser?: boolean;
    resendDuplicateLogin6D?: boolean;
    loginClientVersion?: number;
    worldSelectWorldId?: number;
    worldSelectWorldInst?: number;
    worldSelectPlayerId?: number;
    worldSelectPlayerIdRandom?: boolean;
    worldLoginWorldConst?: number;
}

export interface LoginResponse {
    data: Buffer;
    address: RakSystemAddress;
}

export class LoginHandler {
    private config: LoginHandlerConfig;
    private apartmentInstByConn: Map<string, number> = new Map();
    private apartmentInstCounts: Map<number, number> = new Map();
    private apartmentInstList: number[] = [];

    constructor(config: LoginHandlerConfig) {
        this.config = config;
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

    /**
     * Check if a packet ID is part of the login flow
     */
    isLoginPacket(packetId: number): boolean {
        return (
            packetId === RakNetMessageId.ID_LOGIN_REQUEST ||
            packetId === RakNetMessageId.ID_LOGIN ||
            packetId === RakNetMessageId.ID_LOGIN_TOKEN_CHECK ||
            packetId === RakNetMessageId.ID_WORLD_LOGIN
        );
    }

    /**
     * Handle a login-related packet
     */
    handle(
        packetId: number,
        data: Uint8Array,
        connection: Connection,
    ): LoginResponse | LoginResponse[] | null {
        switch (packetId) {
            case RakNetMessageId.ID_LOGIN_REQUEST:
                return this.handleLoginRequest(data, connection);
            case RakNetMessageId.ID_LOGIN:
                return this.handleLoginAuth(data, connection);
            case RakNetMessageId.ID_LOGIN_TOKEN_CHECK:
                return this.handleLoginTokenCheck(data, connection);
            case RakNetMessageId.ID_WORLD_LOGIN:
                return this.handleWorldLogin(data, connection);
            default:
                return null;
        }
    }

    // =========================================================================
    // 0x6C - Login Request
    // =========================================================================

    /**
     * Handle 0x6C - Login request with username
     *
     * Packet format (ID_LOGIN_REQUEST 0x6C):
     *   - username (StringCompressor with compressed u32 bit count prefix) OR
     *   - preFlag (1 bit, observed 0)
     *   - username (Huffman with raw u32 BE bit count prefix)
     *   - postFlag (1 bit, observed 0)
     *   - clientVersion (raw u16, 16 bits)
     *
     * Notes:
     *   - We accept the StringCompressor layout while keeping the packet ID at 0x6C.
     *
     * Packet format (legacy 0x6C raw layout):
     *   - preFlag (1 bit, observed 0)
     *   - username (Huffman with raw u32 BE bit count prefix)
     *   - postFlag (1 bit, observed 0)
     *   - clientVersion (raw u16, 16 bits)
     *
     * See: Docs/Notes/LOGIN_REQUEST_6C.md, Docs/Packets/ID_LOGIN_REQUEST.md
     */
    private handleLoginRequest(data: Uint8Array, connection: Connection): LoginResponse | null {
        const packetId = data[0];
        this.log(`[Login] 0x${packetId.toString(16)} from ${connection.key} (${data.length} bytes)`);
        
        // Debug: dump raw bytes
        if (this.config.debug) {
            const hex = Array.from(data.slice(0, Math.min(32, data.length)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
            this.log(`[Login] raw: ${hex}`);
        }

        let username = '';
        let clientVersion = 0;
        let parseSuccess = false;

        // Handle timestamp prefix first
        let actualPacketId = packetId;
        let dataOffset = 0;
        if (packetId === RakNetMessageId.ID_TIMESTAMP && data.length > 9) {
            // Skip timestamp header: 1 byte (0x19) + 8 bytes (u64 timestamp)
            dataOffset = 9;
            actualPacketId = data[9];
        }

        // StringCompressor format (compressed u32 bit count prefix)
        if (actualPacketId === RakNetMessageId.ID_LOGIN_REQUEST) {
            try {
                const stream = new RakBitStream(Buffer.from(data.slice(dataOffset)));
                stream.readByte(); // Skip packet ID

                username = readCompressedString(stream, 2048);
                const versionStream = stream.readCompressed(2);
                clientVersion = versionStream.readShort();
                parseSuccess = true;
                this.log(`[Login6C] StringCompressor: user="${username}" ver=${clientVersion}`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`[Login6C] StringCompressor parse failed: ${msg}`);
            }
        }

        // Raw U32BE format with preFlag/postFlag bits
        // Format: [bit:preFlag] [u32 BE bit-count] [huffman bits] [bit:postFlag] [u16 token]
        if (!parseSuccess && actualPacketId === RakNetMessageId.ID_LOGIN_REQUEST) {
            try {
                const stream = new RakBitStream(Buffer.from(data.slice(dataOffset)));
                stream.readByte(); // Skip packet ID (0x6C)

                // Read preFlag bit (observed 0)
                const preFlag = stream.readBit();
                this.log(`[Login6C] preFlag=${preFlag}`);

                // Read raw u32 BE bit-count (32 bits, big-endian)
                const bitCount = stream.readBits(32);
                this.log(`[Login6C] bitCount=${bitCount} (0x${bitCount.toString(16)})`);

                if (bitCount > 0 && bitCount <= 2048 * 16) {
                    // Decode Huffman-encoded username
                    username = decodeHuffmanBitsFromStream(stream, bitCount, 2048);
                    this.log(`[Login6C] Huffman decoded: user="${username}"`);

                    // Read postFlag bit (observed 0)
                    const postFlag = stream.readBit();
                    this.log(`[Login6C] postFlag=${postFlag}`);

                    // Read u16 token/version (16 bits, MSB-first)
                    clientVersion = stream.readBits(16);
                    parseSuccess = true;
                    this.log(`[Login6C] Raw U32BE format: user="${username}" ver=${clientVersion}`);
                } else {
                    this.log(`[Login6C] Invalid bitCount=${bitCount}`);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`[Login6C] Raw U32BE parse failed: ${msg}`);
            }
        }

        // Fallback for 0x6C: try without flag bits (in case preFlag/postFlag are not present)
        if (!parseSuccess && actualPacketId === RakNetMessageId.ID_LOGIN_REQUEST) {
            try {
                const stream = new RakBitStream(Buffer.from(data.slice(dataOffset)));
                stream.readByte(); // Skip packet ID

                // Try reading raw u32 BE bit-count directly (no preFlag)
                const bitCount = stream.readBits(32);
                this.log(`[Login6C-fallback] bitCount=${bitCount} (0x${bitCount.toString(16)})`);

                if (bitCount > 0 && bitCount <= 2048 * 16) {
                    username = decodeHuffmanBitsFromStream(stream, bitCount, 2048);
                    // Read u16 version
                    clientVersion = stream.readBits(16);
                    parseSuccess = true;
                    this.log(`[Login6C-fallback] Raw U32BE (no flags): user="${username}" ver=${clientVersion}`);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`[Login6C-fallback] parse failed: ${msg}`);
            }
        }

        // Final fallback: scan for printable ASCII sequences
        if (!parseSuccess) {
            username = this.extractAsciiUsername(data);
            if (username) {
                parseSuccess = true;
                this.log(`[Login] ASCII scan fallback: user="${username}"`);
            }
        }

        const strictLogin = this.config.loginStrict ?? false;

        if (!parseSuccess || !username || username.length < 3) {
            this.log(`[Login] Failed to parse username from packet`);
            if (strictLogin) {
                return {
                    data: this.buildLoginRequestReturn(LoginRequestReturnStatus.INVALID_INFO, ''),
                    address: connection.address,
                };
            }
            return null;
        }

        // Validate username
        const maxUserLen = strictLogin ? 32 : 64;
        if (!this.isPrintableAscii(username) || username.length > maxUserLen) {
            this.log(`[Login] reject invalid username len=${username.length}`);
            if (strictLogin) {
                return {
                    data: this.buildLoginRequestReturn(LoginRequestReturnStatus.INVALID_INFO, ''),
                    address: connection.address,
                };
            }
            return null;
        }

        // Validate client version
        if (strictLogin && !this.isClientVersionAllowed(clientVersion)) {
            this.log(`[Login] reject clientVersion=${clientVersion}`);
            return {
                data: this.buildLoginRequestReturn(LoginRequestReturnStatus.OUTDATED_CLIENT, username),
                address: connection.address,
            };
        }

        // Check cooldown
        const now = Date.now();
        const cooldownMs = 2000;
        if (connection.lastLoginResponseSentAt && now - connection.lastLoginResponseSentAt < cooldownMs) {
            this.log(`[Login] cooldown skip user="${username}"`);
            return null;
        }

        // Check if already authenticated
        if (connection.loginPhase === LoginPhase.AUTHENTICATED) {
            this.log(`[Login] already authenticated user="${username}"`);
            if (strictLogin) {
                return {
                    data: this.buildLoginRequestReturn(
                        LoginRequestReturnStatus.ALREADY_LOGGED_IN,
                        connection.username || username,
                    ),
                    address: connection.address,
                };
            }
            return null;
        }

        // Handle duplicate pending request
        if (connection.loginPhase === LoginPhase.USER_SENT && connection.pendingLoginUser === username) {
            if (!this.config.resendDuplicateLogin6D) {
                this.log(`[Login] duplicate pending -> skip resend`);
                return null;
            }
            this.log(`[Login] duplicate pending -> resend 0x6D`);
        }

        // Store pending login info
        connection.pendingLoginUser = username;
        connection.pendingLoginClientVersion = clientVersion;
        connection.pendingLoginAt = Date.now();
        connection.loginPhase = LoginPhase.USER_SENT;

        this.log(`[Login] Success: user="${username}" ver=${clientVersion}`);

        // Build 0x6D response
        const response = this.buildLoginRequestReturn(LoginRequestReturnStatus.SUCCESS, username);
        connection.lastLoginResponseSentAt = Date.now();

        return {
            data: response,
            address: connection.address,
        };
    }

    /**
     * Extract username by scanning for printable ASCII sequences
     */
    private extractAsciiUsername(data: Uint8Array): string {
        // Skip packet ID, look for sequences of printable ASCII
        for (let start = 1; start < data.length - 3; start++) {
            let end = start;
            while (end < data.length && end - start < 64) {
                const c = data[end];
                if (c >= 0x20 && c <= 0x7e) {
                    end++;
                } else {
                    break;
                }
            }
            const len = end - start;
            if (len >= 3 && len <= 32) {
                const str = Buffer.from(data.slice(start, end)).toString('latin1');
                // Basic username validation: alphanumeric with some allowed chars
                if (/^[a-zA-Z0-9_\-\.]+$/.test(str)) {
                    return str;
                }
            }
        }
        return '';
    }

    private isPrintableAscii(value: string): boolean {
        for (let i = 0; i < value.length; i++) {
            const c = value.charCodeAt(i);
            if (c < 0x20 || c > 0x7e) return false;
        }
        return true;
    }

    private isClientVersionAllowed(clientVersion: number): boolean {
        const expected = this.config.loginClientVersion ?? 0;
        if (expected <= 0) {
            return true;
        }
        return clientVersion === expected;
    }

    private evaluateLoginAuthStatus(
        connection: Connection,
        username: string,
        passwordHash: Buffer,
    ): LoginReturnStatus {
        if (!username || username.length < 3 || username.length > 32 || !this.isPrintableAscii(username)) {
            return LoginReturnStatus.UNKNOWN_USERNAME;
        }
        if (connection.pendingLoginUser && connection.pendingLoginUser !== username) {
            return LoginReturnStatus.INVALID_LOGIN;
        }
        if (this.config.loginRequireCredentials) {
            if (!passwordHash || passwordHash.length === 0) {
                return LoginReturnStatus.INCORRECT_PASSWORD;
            }
        }
        return LoginReturnStatus.SUCCESS;
    }

    /**
     * Build 0x6D LOGIN_REQUEST_RETURN response using native RakNet BitStream
     *
     * Packet format:
     *   - status (ByteArrayCompressed u8, LTClient format)
     *   - username (StringCompressor, max 2048)
     *
     * See: Docs/Packets/ID_LOGIN_REQUEST_RETURN.md
     */
    private buildLoginRequestReturn(status: LoginRequestReturnStatus, username: string): Buffer {
        const writer = new RakBitStream();
        
        try {
            writer.writeByte(RakNetMessageId.ID_LOGIN_REQUEST_RETURN);
            
            // Write status using LTClient ByteArrayCompressed (u8)
            writeByteArrayCompressed(writer, Buffer.from([status & 0xff]), 8, true);

            // Write Huffman-encoded username with compressed u32 bit count (LT client format)
            writeHuffmanStringCompressedU32(writer, username ?? '', 2048);

            const payload = writer.data;

            // Debug: dump raw bytes
            if (this.config.debug) {
                const hex = Array.from(payload.slice(0, Math.min(32, payload.length)))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(' ');
                this.log(`[Login6D] raw: ${hex}`);
            }

            // Validate 0x6D payload can round-trip decode locally before sending
            try {
                const verify = new RakBitStream(payload);
                const packetId = verify.readByte();
                if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) {
                    console.log(`[Login6D] encode verify failed: bad id=0x${packetId.toString(16)}`);
                    return Buffer.alloc(0);
                }
                const statusDecoded = readByteArrayCompressed(verify, 8, true)[0] & 0xff;
                const decoded = readHuffmanStringCompressedU32(verify, 2048);
                
                if (decoded !== (username ?? '')) {
                    console.log(
                        `[Login6D] encode verify failed: status=${statusDecoded} expected="${username}" got="${decoded}"`,
                    );
                    return Buffer.alloc(0);
                }
                this.log(`[Login6D] verified: status=${statusDecoded} user="${decoded}"`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.log(`[Login6D] encode verify exception: ${msg}`);
                return Buffer.alloc(0);
            }

            this.log(`[Login6D] build status=${status} user="${username}" len=${payload.length}`);
            return payload;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(`[Login6D] native build exception: ${msg}`);
            return Buffer.alloc(0);
        }
    }


    // =========================================================================
    // 0x6E - Login Authentication
    // =========================================================================

    /**
     * Handle 0x6E - Login authentication packet
     *
     * Packet format (ID_LOGIN 0x6E):
     *   - username (StringCompressor)
     *   - passwordHash (bounded string, 64 bytes)
     *   - fileCRCs[3] (compressed u32)
     *   - macAddress (StringCompressor)
     *   - driveModels[4] (bounded string, 64 bytes each)
     *   - driveSerialNumbers[4] (bounded string, 32 bytes each)
     *   - loginToken (bounded string, 64 bytes)
     *   - computerName (StringCompressor)
     *   - hasSteamTicket (bit)
     *   - [if hasSteamTicket] steamTicket (0x400 compressed bytes) + steamTicketLength (compressed u32)
     *
     * See: Docs/Packets/ID_LOGIN.md
     */
    private handleLoginAuth(data: Uint8Array, connection: Connection): LoginResponse | null {
        this.log(`[Login] 0x6E from ${connection.key} (${data.length} bytes)`);

        if (connection.loginPhase !== LoginPhase.USER_SENT && !this.config.acceptLoginAuthWithoutUser) {
            this.log(`[Login6E] unexpected - phase=${connection.loginPhase}`);
            return null;
        }

        let username = '';
        let computerName = '';
        let macAddress = '';
        let loginToken = '';
        let passwordHash = Buffer.alloc(0);
        const fileCRCs: number[] = [];
        const driveModels: string[] = [];
        const driveSerials: string[] = [];
        let hasSteamTicket = false;
        let steamTicketLength = 0;

        try {
            const stream = new RakBitStream(Buffer.from(data));
            let packetId = stream.readByte(); // Skip packet ID

            // Handle timestamp prefix if present
            if (packetId === RakNetMessageId.ID_TIMESTAMP) {
                stream.readLongLong(); // Skip timestamp
                packetId = stream.readByte(); // Read actual packet ID
            }

            // Parse according to Docs/Packets/ID_LOGIN.md
            username = readCompressedString(stream, 2048);
            passwordHash = this.readBoundedBytes(stream, 0x40);

            // Read 3 file CRCs
            for (let i = 0; i < 3; i++) {
                fileCRCs.push(this.readCompressedUInt(stream, 4));
            }

            macAddress = readCompressedString(stream, 2048);

            // Read 4 drive models and serial numbers
            for (let i = 0; i < 4; i++) {
                driveModels.push(this.readBoundedString(stream, 0x40));
                driveSerials.push(this.readBoundedString(stream, 0x20));
            }

            loginToken = this.readBoundedString(stream, 0x40);
            computerName = readCompressedString(stream, 2048);

            hasSteamTicket = stream.readBit() === 1;
            if (hasSteamTicket) {
                // Read 0x400 compressed bytes
                for (let i = 0; i < 0x400; i++) {
                    stream.readCompressed(1);
                }
                steamTicketLength = this.readCompressedUInt(stream, 4);
            }
        } catch {
            // Best-effort parse - continue with what we got
        }

        // Fall back to pending username if not parsed
        if (!username && connection.pendingLoginUser) {
            username = connection.pendingLoginUser;
        }

        // Store auth details
        connection.loginAuthUsername = username;
        connection.loginAuthComputer = computerName;
        connection.loginAuthPasswordHash = passwordHash.toString('hex');
        connection.loginAuthMacAddress = macAddress;
        connection.loginAuthLoginToken = loginToken;
        connection.loginAuthFileCRCs = fileCRCs;
        connection.loginAuthSteamTicket = hasSteamTicket;
        connection.loginAuthSteamTicketLength = steamTicketLength;

        const strictLogin = this.config.loginStrict ?? false;
        const status = strictLogin
            ? this.evaluateLoginAuthStatus(connection, username, passwordHash)
            : LoginReturnStatus.SUCCESS;
        const loginClientVersion = connection.pendingLoginClientVersion || 0;

        const hashPreview = passwordHash.length > 0 ? passwordHash.subarray(0, 8).toString('hex') : '';
        const crcNote = fileCRCs.length > 0 ? fileCRCs.map((v) => `0x${v.toString(16)}`).join(',') : 'none';
        this.log(
            `[Login6E] auth status=${status} user="${username}" hash=${hashPreview} mac="${macAddress}" crcs=[${crcNote}]`,
        );

        if (status === LoginReturnStatus.SUCCESS) {
            connection.username = username;
            connection.authenticated = true;
            connection.authenticatedUser = username;
            connection.loginPhase = LoginPhase.AUTHENTICATED;
            connection.pendingLoginUser = '';
            connection.pendingLoginClientVersion = 0;
            connection.pendingLoginAt = 0;
        } else {
            connection.authenticated = false;
            connection.loginPhase = LoginPhase.USER_SENT;
        }

        // In master mode, send 0x6F after authentication decision
        if (this.config.serverMode === 'master') {
            const playerId = status === LoginReturnStatus.SUCCESS
                ? this.resolveWorldSelectPlayerId(connection)
                : 0;
            const worldId = this.resolveWorldSelectWorldId(connection);
            const worldInst = this.resolveWorldSelectWorldInst(connection, worldId);
            connection.worldSelectWorldId = worldId;
            connection.worldSelectWorldInst = worldInst;

            const loginReturn = this.buildLoginReturn({
                status,
                playerId,
                clientVersion: loginClientVersion,
            });

            this.log(`[Login6E] -> 0x6F status=${status} playerId=${playerId} world=${worldId}:${worldInst}`);
            return {
                data: loginReturn,
                address: connection.address,
            };
        }

        return null;
    }

    /**
     * Build 0x6F LOGIN_RETURN response
     *
     * See: Docs/Packets/ID_LOGIN_RETURN.md
     */
    private buildLoginReturn(options: {
        status: LoginReturnStatus;
        playerId: number;
        clientVersion: number;
        accountType?: AccountType;
        field4?: boolean;
        field5?: boolean;
        isBanned?: boolean;
    }): Buffer {
        const bs = new NativeBitStream();
        bs.writeU8(RakNetMessageId.ID_LOGIN_RETURN);
        bs.writeCompressedU8(options.status & 0xff);
        bs.writeCompressedU32(options.playerId >>> 0);

        if (options.playerId !== 0) {
            const accountType = options.accountType ?? AccountType.FREE;
            bs.writeCompressedU8(accountType & 0xff);
            bs.writeBit(Boolean(options.field4));
            bs.writeBit(Boolean(options.field5));
            bs.writeCompressedU16(options.clientVersion & 0xffff);

            const isBanned = Boolean(options.isBanned);
            bs.writeBit(isBanned);
            if (isBanned) {
                encodeString('0', bs, 2048, 0); // banLength
                encodeString('', bs, 2048, 0); // banReason
            }

            // worldIDs vector (count + ids)
            bs.writeCompressedU8(0);
            // factionMOTD
            encodeString('', bs, 2048, 0);
            // apartment (minimal stub)
            this.writeApartmentStubNative(bs);
            // field_final1, field_final2
            bs.writeCompressedU8(0);
            bs.writeCompressedU8(0);
        }

        const payload = bs.getData();
        if (this.config.debug) {
            this.debugDecodeLoginReturn(payload);
        }
        bs.destroy();
        return payload;
    }

    private debugDecodeLoginReturn(payload: Buffer): void {
        try {
            const bs = new NativeBitStream(payload, true);
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_LOGIN_RETURN) {
                this.log(`[Login6F] decode failed: bad id=0x${packetId.toString(16)}`);
                bs.destroy();
                return;
            }
            const status = bs.readCompressedU8();
            const playerId = bs.readCompressedU32();
            let accountType = 0;
            let clientVersion = 0;
            let field4 = false;
            let field5 = false;
            let isBanned = false;
            if (playerId !== 0) {
                accountType = bs.readCompressedU8();
                field4 = bs.readBit();
                field5 = bs.readBit();
                clientVersion = bs.readCompressedU16();
                isBanned = bs.readBit();
            }
            bs.destroy();
            this.log(
                `[Login6F] decode status=${status} playerId=${playerId} accountType=${accountType} field4=${field4} field5=${field5} clientVersion=${clientVersion} banned=${isBanned}`,
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`[Login6F] decode exception: ${msg}`);
        }
    }

    private writeApartmentStub(writer: RakBitStream): void {
        writer.writeCompressed(0, 4); // id
        writer.writeCompressed(0, 1); // type
        writer.writeCompressed(0, 4); // ownerPlayerID
        writer.writeCompressed(0, 4); // ownerFactionID
        writer.writeCompressed(0, 1); // allowedRanks vector count
        writer.writeBit(false); // isOpen
        writeCompressedString(writer, '', 2048); // ownerName
        writeCompressedString(writer, '', 2048); // entryCode
        // storage ItemList (minimal)
        writer.writeCompressed(0, 2); // capacity
        writer.writeCompressed(0, 4); // field_14
        writer.writeCompressed(0, 4); // field_18
        writer.writeCompressed(0, 4); // field_1C
        writer.writeCompressed(0, 2); // itemCount
        writer.writeBit(false); // hasPublicInfo
        writer.writeCompressed(0, 4); // entryPrice
        writeCompressedString(writer, '', 2048); // publicName
        writeCompressedString(writer, '', 2048); // publicDescription
        writer.writeCompressed(0, 4); // allowedFactions map count
        writer.writeBit(false); // isDefault
        writer.writeBit(false); // isFeatured
        writer.writeCompressed(0, 4); // occupancy
    }

    private writeApartmentStubNative(writer: NativeBitStream): void {
        writer.writeCompressedU32(0); // id
        writer.writeCompressedU8(0); // type
        writer.writeCompressedU32(0); // ownerPlayerID
        writer.writeCompressedU32(0); // ownerFactionID
        writer.writeCompressedU8(0); // allowedRanks vector count
        writer.writeBit(false); // isOpen
        encodeString('', writer, 2048, 0); // ownerName
        encodeString('', writer, 2048, 0); // entryCode
        // storage ItemList (minimal)
        writer.writeCompressedU16(0); // capacity
        writer.writeCompressedU32(0); // field_14
        writer.writeCompressedU32(0); // field_18
        writer.writeCompressedU32(0); // field_1C
        writer.writeCompressedU16(0); // itemCount
        writer.writeBit(false); // hasPublicInfo
        writer.writeCompressedU32(0); // entryPrice
        encodeString('', writer, 2048, 0); // publicName
        encodeString('', writer, 2048, 0); // publicDescription
        writer.writeCompressedU32(0); // allowedFactions map count
        writer.writeBit(false); // isDefault
        writer.writeBit(false); // isFeatured
        writer.writeCompressedU32(0); // occupancy
    }

    // =========================================================================
    // 0x70 - Login Token Check
    // =========================================================================

    /**
     * Handle 0x70 - Login token check (bidirectional)
     *
     * Packet format:
     *   - fromServer (bit)
     *   - [if fromServer] success (bit) + username (bounded string, 32 bytes)
     *   - [if !fromServer] requestToken (bounded string, 32 bytes)
     *
     * See: Docs/Packets/ID_LOGIN_TOKEN_CHECK.md
     */
    private handleLoginTokenCheck(data: Uint8Array, connection: Connection): LoginResponse | null {
        this.log(`[Login] 0x70 from ${connection.key} (${data.length} bytes)`);

        try {
            const stream = new RakBitStream(Buffer.from(data));
            stream.readByte(); // Skip packet ID

            const fromServer = stream.readBit() === 1;
            if (fromServer) {
                // Server -> Client (we received this - shouldn't happen on server)
                const success = stream.readBit() === 1;
                const username = this.readBoundedString(stream, 0x20);
                this.log(`[Login70] recv server->client success=${success} user="${username}"`);
                return null;
            }

            // Client -> Server
            const requestToken = this.readBoundedString(stream, 0x20);
            const username = connection.pendingLoginUser || connection.username || '';

            this.log(`[Login70] token="${requestToken}" -> respond with user="${username}"`);

            // Build response
            const response = this.buildLoginTokenCheckResponse(true, username);
            return {
                data: response,
                address: connection.address,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`[Login70] parse error: ${msg}`);
            return null;
        }
    }

    private buildLoginTokenCheckResponse(success: boolean, username: string): Buffer {
        const writer = new RakBitStream();
        writer.writeByte(RakNetMessageId.ID_LOGIN_TOKEN_CHECK);
        writer.writeBit(true); // fromServer
        writer.writeBit(Boolean(success));
        this.writeBoundedString(writer, username ?? '', 0x20);
        return writer.data;
    }

    // =========================================================================
    // 0x72 - World Login
    // =========================================================================

    /**
     * Handle 0x72 - World login
     */
    private handleWorldLogin(data: Uint8Array, connection: Connection): LoginResponse | LoginResponse[] | null {
        this.log(`[Login] 0x72 from ${connection.key} (${data.length} bytes)`);

        try {
            const stream = new RakBitStream(Buffer.from(data));
            stream.readByte(); // Skip packet ID

            const worldId = this.readCompressedUInt(stream, 1) & 0xff;
            const worldInst = this.readCompressedUInt(stream, 1) & 0xff;
            const playerId = this.readCompressedUInt(stream, 4);
            const worldConst = this.readCompressedUInt(stream, 4);

            connection.worldId = worldId;
            connection.worldInst = worldInst;
            connection.playerId = playerId;
            connection.worldLoginWorldId = worldId;
            connection.worldLoginWorldInst = worldInst;
            connection.worldLoginPlayerId = playerId;
            connection.worldLoginWorldConst = worldConst;

            this.log(`[Login72] worldId=${worldId} inst=${worldInst} playerId=${playerId} const=0x${worldConst.toString(16)}`);

            // In master mode, send world redirect (0x73)
            if (this.config.serverMode === 'master') {
                if (!connection.authenticated) {
                    this.log(`[Login72] ignore unauth`);
                    return null;
                }

                const response = this.buildWorldLoginReturn(
                    true,
                    this.config.worldIp,
                    this.config.worldPort,
                );
                this.log(`[Login72] -> 0x73 world=${this.config.worldIp}:${this.config.worldPort}`);
                return {
                    data: response,
                    address: connection.address,
                };
            }

            // In world mode, accept and send LithTech burst
            connection.authenticated = true;
            connection.loginPhase = LoginPhase.IN_WORLD;

            const responses: LoginResponse[] = [];

            // Build 0x73 response
            const response = this.buildWorldLoginReturn(true, this.config.worldIp, this.config.worldPort);
            responses.push({
                data: response,
                address: connection.address,
            });

            // Send LithTech burst (NETPROTOCOLVERSION + YOURID + CLIENTOBJECTID + LOADWORLD)
            const seq = connection.lithTechOutSeq;
            connection.lithTechOutSeq = (seq + 1) & 0x1fff;

            const clientId = connection.id;
            const objectId = playerId || connection.id;
            const lithWorldId = worldId || 16;

            const lithBurst = buildWorldLoginBurst(seq, clientId, objectId, lithWorldId);
            this.log(`[Login72] -> LithTech burst (${lithBurst.length} bytes)`);

            responses.push({
                data: lithBurst,
                address: connection.address,
            });

            return responses;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`[Login72] parse error: ${msg}`);
            return null;
        }
    }

    /**
     * Build 0x73 WORLD_LOGIN_RETURN response
     */
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

    /**
     * Build 0x7B WORLD_SELECT packet
     */
    buildWorldSelect(playerId: number, worldId: number, worldInst: number): Buffer {
        const writer = new RakBitStream();
        writer.writeByte(RakNetMessageId.ID_WORLD_SELECT);
        writer.writeCompressed(playerId >>> 0, 4);
        writer.writeCompressed(4, 1); // worldCount or type?
        writer.writeCompressed(worldId & 0xff, 1);
        writer.writeCompressed(worldInst & 0xff, 1);
        return writer.data;
    }

    // =========================================================================
    // Utility Methods
    // =========================================================================

    private resolveWorldSelectPlayerId(connection: Connection): number {
        if (this.config.worldSelectPlayerId && this.config.worldSelectPlayerId > 0) {
            connection.worldSelectPlayerId = this.config.worldSelectPlayerId >>> 0;
            return connection.worldSelectPlayerId;
        }
        if (connection.worldSelectPlayerId > 0) {
            return connection.worldSelectPlayerId;
        }
        let playerId = 0;
        if (this.config.worldSelectPlayerIdRandom) {
            playerId = (Math.random() * 0xfffe + 1) >>> 0;
        } else {
            playerId = connection.id;
        }
        if (playerId <= 0) {
            playerId = connection.id;
        }
        connection.worldSelectPlayerId = playerId >>> 0;
        return connection.worldSelectPlayerId;
    }

    private resolveWorldSelectWorldId(connection: Connection): number {
        if (connection.worldSelectWorldId > 0) {
            return connection.worldSelectWorldId;
        }
        const worldId = this.config.worldSelectWorldId ?? 0;
        if (worldId > 0) {
            connection.worldSelectWorldId = worldId >>> 0;
            return connection.worldSelectWorldId;
        }
        return 0;
    }

    private resolveWorldSelectWorldInst(connection: Connection, worldId: number): number {
        if (connection.worldSelectWorldInst > 0) {
            return connection.worldSelectWorldInst;
        }
        const worldInst = this.config.worldSelectWorldInst ?? 0;
        if (worldInst > 0) {
            connection.worldSelectWorldInst = worldInst >>> 0;
            return connection.worldSelectWorldInst;
        }
        if (worldId === 4) {
            connection.worldSelectWorldInst = this.allocApartmentInst(connection) >>> 0;
            return connection.worldSelectWorldInst;
        }
        return 0;
    }

    private readCompressedUInt(stream: RakBitStream, size: number): number {
        const comp = stream.readCompressed(size);
        let value = 0;
        let factor = 1;
        for (let i = 0; i < size; i++) {
            value += comp.readByte() * factor;
            factor *= 256;
        }
        return value >>> 0;
    }

    private readBoundedBytes(stream: RakBitStream, maxLen: number): Buffer {
        if (maxLen <= 1) return Buffer.alloc(0);
        const bits = Math.floor(Math.log2(maxLen)) + 1;
        const len = stream.readBits(bits);
        const rawLen = Math.max(0, len);
        const safeLen = Math.min(rawLen, maxLen - 1);
        const bytes: number[] = [];
        for (let i = 0; i < rawLen; i++) {
            const byte = stream.readByte();
            if (i < safeLen) {
                bytes.push(byte);
            }
        }
        return Buffer.from(bytes);
    }

    private readBoundedString(stream: RakBitStream, maxLen: number): string {
        return this.readBoundedBytes(stream, maxLen).toString('latin1');
    }

    private writeBoundedString(stream: RakBitStream, value: string, maxLen: number): void {
        if (maxLen <= 1) return;
        const raw = Buffer.from(value ?? '', 'latin1');
        let length = raw.length;
        if (length >= maxLen) {
            length = maxLen - 1;
        }
        const bits = Math.floor(Math.log2(maxLen)) + 1;
        stream.writeBits(length, bits);
        for (let i = 0; i < length; i++) {
            stream.writeByte(raw[i]);
        }
    }

    private ipv4ToU32BE(value: string): number {
        const parts = value.split('.');
        if (parts.length !== 4) return 0;
        const bytes = parts.map((part) => Number.parseInt(part, 10));
        if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return 0;
        return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    }

    private log(message: string): void {
        if (this.config.debug || this.config.loginDebug) {
            console.log(message);
        }
    }
}
