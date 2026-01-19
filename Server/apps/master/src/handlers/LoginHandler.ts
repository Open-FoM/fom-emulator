/**
 * Handle login/auth packets and route clients to world servers.
 */
import { type RakSystemAddress } from '@openfom/networking';
import {
    RakNetMessageId,
    LoginRequestReturnStatus,
    LoginReturnStatus,
    AccountType,
    IdLoginRequestPacket,
    IdLoginRequestReturnPacket,
    IdLoginPacket,
    IdLoginReturnPacket,
    IdLoginTokenCheckPacket,
    IdWorldLoginPacket,
    IdWorldLoginReturnPacket,
    WorldLoginReturnCode,
    IdWorldSelectPacket,
} from '@openfom/packets';
import { Connection, LoginPhase } from '../network/Connection';
import { info as logInfo } from '@openfom/utils';
import { WorldDirectory } from '../world/WorldDirectory';
export interface LoginHandlerConfig {
    serverMode: 'master' | 'world';
    debug: boolean;
    loginDebug?: boolean;
    loginStrict?: boolean;
    loginRequireCredentials?: boolean;
    acceptLoginAuthWithoutUser?: boolean;
    resendDuplicateLogin6D?: boolean;
    loginClientVersion?: number;
    loginResetDelayMs?: number;
    worldSelectWorldId?: number;
    worldSelectWorldInst?: number;
    worldSelectPlayerId?: number;
    worldSelectPlayerIdRandom?: boolean;
    loginAccountType?: number;
    loginIsFullAccount?: boolean;
    loginHasCharFlags?: boolean;
    masterHeartbeatTimeoutMs?: number;
    worldDirectory: WorldDirectory;
}
export interface LoginResponse {
    data: Buffer;
    address: RakSystemAddress;
    delay?: number;
}
export class LoginHandler {
    private config: LoginHandlerConfig;

    /**
     * Create a new login handler.
     * @param {LoginHandlerConfig} config - Login handler configuration.
     */
    constructor(config: LoginHandlerConfig) {
        this.config = config;
    }

    /**
     * Release per-connection login state.
     * @param {Connection} _connection - Connection instance.
     * @returns {void} No return value.
     */
    releaseConnection(_connection: Connection): void {
        this.clearLoginResetTimer(_connection, 'release');
    }

    /**
     * Check whether a packet ID belongs to the login flow.
     * @param {number} packetId - RakNet packet ID.
     * @returns {boolean} True when the packet is part of login flow.
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
     * Dispatch a login-related packet to the appropriate handler.
     * @param {number} packetId - RakNet packet ID.
     * @param {Uint8Array} data - Raw packet payload.
     * @param {Connection} connection - Connection instance.
     * @returns {LoginResponse | LoginResponse[] | null} Response packet(s) or null.
     */
    handle(
        packetId: number,
        data: Uint8Array,
        connection: Connection,
    ): LoginResponse | LoginResponse[] | null {
        const buffer = Buffer.from(data);
        try {
            switch (packetId) {
                case RakNetMessageId.ID_LOGIN_REQUEST: {
                    const packet = IdLoginRequestPacket.decode(buffer);
                    return this.handleLoginRequest(packet, connection);
                }
                case RakNetMessageId.ID_LOGIN: {
                    const packet = IdLoginPacket.decode(buffer);
                    return this.handleLoginAuth(packet, connection);
                }
                case RakNetMessageId.ID_LOGIN_TOKEN_CHECK: {
                    const packet = IdLoginTokenCheckPacket.decode(buffer);
                    return this.handleLoginTokenCheck(packet, connection);
                }
                case RakNetMessageId.ID_WORLD_LOGIN: {
                    const packet = IdWorldLoginPacket.decode(buffer);
                    return this.handleWorldLogin(packet, connection);
                }
                default:
                    return null;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`[Login] Packet decode packet ${packetId} error: ${msg}`);
            this.log(`[Login] Trace : ${err instanceof Error ? err.stack : ''}`);
            return null;
        }
    }

    /**
     * Handle ID_LOGIN_REQUEST packets.
     * @param {IdLoginRequestPacket} packet - Decoded login request.
     * @param {Connection} connection - Connection instance.
     * @returns {LoginResponse | null} Response packet or null.
     */
    private handleLoginRequest(
        packet: IdLoginRequestPacket,
        connection: Connection,
    ): LoginResponse | null {
        const { username, clientVersion } = packet;
        this.log(`[Login6C] user="${username}" ver=${clientVersion} from ${connection.key}`);
        const strictLogin = this.config.loginStrict ?? false;
        if (!username || username.length < 3) {
            this.log(`[Login] Invalid username`);
            if (strictLogin) {
                const rawAddr = `0x${connection.address.binaryAddress.toString(16).padStart(8, '0')}:${connection.address.port}`;
                this.log(
                    `[Login] SEND 0x6D status=${LoginRequestReturnStatus.INVALID_INFO} user="" connId=${connection.id} key=${connection.key} raw=${rawAddr}`,
                );
                return {
                    data: new IdLoginRequestReturnPacket({
                        status: LoginRequestReturnStatus.INVALID_INFO,
                        username: '',
                    }).encode(),
                    address: connection.address,
                };
            }
            return null;
        }
        const maxUserLen = strictLogin ? 32 : 64;
        if (!this.isPrintableAscii(username) || username.length > maxUserLen) {
            this.log(`[Login] reject invalid username len=${username.length}`);
            if (strictLogin) {
                const rawAddr = `0x${connection.address.binaryAddress.toString(16).padStart(8, '0')}:${connection.address.port}`;
                this.log(
                    `[Login] SEND 0x6D status=${LoginRequestReturnStatus.INVALID_INFO} user="" connId=${connection.id} key=${connection.key} raw=${rawAddr}`,
                );
                return {
                    data: new IdLoginRequestReturnPacket({
                        status: LoginRequestReturnStatus.INVALID_INFO,
                        username: '',
                    }).encode(),
                    address: connection.address,
                };
            }
            return null;
        }
        if (strictLogin && !this.isClientVersionAllowed(clientVersion)) {
            this.log(`[Login] reject clientVersion=${clientVersion}`);
            const rawAddr = `0x${connection.address.binaryAddress.toString(16).padStart(8, '0')}:${connection.address.port}`;
            this.log(
                `[Login] SEND 0x6D status=${LoginRequestReturnStatus.OUTDATED_CLIENT} user="${username}" connId=${connection.id} key=${connection.key} raw=${rawAddr}`,
            );
            return {
                data: new IdLoginRequestReturnPacket({
                    status: LoginRequestReturnStatus.OUTDATED_CLIENT,
                    username,
                }).encode(),
                address: connection.address,
            };
        }
        const now = Date.now();
        const cooldownMs = 2000;
        if (
            connection.lastLoginResponseSentAt &&
            now - connection.lastLoginResponseSentAt < cooldownMs
        ) {
            this.log(`[Login] cooldown skip user="${username}"`);
            return null;
        }
        if (connection.loginPhase === LoginPhase.AUTHENTICATED) {
            this.log(`[Login] already authenticated user="${username}"`);
            this.scheduleLoginReset(connection, 'login_request');
            if (strictLogin) {
                const rawAddr = `0x${connection.address.binaryAddress.toString(16).padStart(8, '0')}:${connection.address.port}`;
                this.log(
                    `[Login] SEND 0x6D status=${LoginRequestReturnStatus.ALREADY_LOGGED_IN} user="${connection.username || username}" connId=${connection.id} key=${connection.key} raw=${rawAddr}`,
                );
                return {
                    data: new IdLoginRequestReturnPacket({
                        status: LoginRequestReturnStatus.ALREADY_LOGGED_IN,
                        username: connection.username || username,
                    }).encode(),
                    address: connection.address,
                };
            }
            return null;
        }
        if (
            connection.loginPhase === LoginPhase.USER_SENT &&
            connection.pendingLoginUser === username
        ) {
            if (!this.config.resendDuplicateLogin6D) {
                this.log(`[Login] duplicate pending -> skip resend`);
                return null;
            }
            this.log(`[Login] duplicate pending -> resend 0x6D`);
        }
        connection.pendingLoginUser = username;
        connection.pendingLoginClientVersion = clientVersion;
        connection.pendingLoginAt = Date.now();
        connection.loginPhase = LoginPhase.USER_SENT;
        this.log(`[Login] Success: user="${username}" ver=${clientVersion}`);
        connection.lastLoginResponseSentAt = Date.now();
        const rawAddr = `0x${connection.address.binaryAddress.toString(16).padStart(8, '0')}:${connection.address.port}`;
        this.log(
            `[Login] SEND 0x6D status=${LoginRequestReturnStatus.SUCCESS} user="${username}" connId=${connection.id} key=${connection.key} raw=${rawAddr}`,
        );
        return {
            data: new IdLoginRequestReturnPacket({
                status: LoginRequestReturnStatus.SUCCESS,
                username,
            }).encode(),
            address: connection.address,
        };
    }

    /**
     * Check if a string is printable ASCII.
     * @param {string} value - Input string.
     * @returns {boolean} True when all characters are printable ASCII.
     */
    private isPrintableAscii(value: string): boolean {
        for (let i = 0; i < value.length; i++) {
            const c = value.charCodeAt(i);
            if (c < 0x20 || c > 0x7e) return false;
        }
        return true;
    }

    /**
     * Check whether the client version matches the configured requirement.
     * @param {number} clientVersion - Client version number.
     * @returns {boolean} True when the version is accepted.
     */
    private isClientVersionAllowed(clientVersion: number): boolean {
        const expected = this.config.loginClientVersion ?? 0;
        if (expected <= 0) {
            return true;
        }
        return clientVersion === expected;
    }
    // TODO: Implement remaining handles
    /*
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
        NOT_PURCHASED = 13
    */

    /**
     * Evaluate login auth result based on username and credential policy.
     * @param {Connection} connection - Connection instance.
     * @param {string} username - Username from login auth.
     * @param {string} passwordHash - Password hash payload.
     * @returns {LoginReturnStatus} Login return status code.
     */
    private evaluateLoginAuthStatus(
        connection: Connection,
        username: string,
        passwordHash: string,
    ): LoginReturnStatus {
        // Centralized gate for strict auth decisions.
        if (
            !username ||
            username.length < 3 ||
            username.length > 32 ||
            !this.isPrintableAscii(username)
        ) {
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
     * Handle ID_LOGIN packets with credentials and auth metadata.
     * @param {IdLoginPacket} packet - Decoded login auth packet.
     * @param {Connection} connection - Connection instance.
     * @returns {LoginResponse[] | null} Response packet(s) or null.
     */
    private handleLoginAuth(
        packet: IdLoginPacket,
        connection: Connection,
    ): LoginResponse[] | null {
        if (
            connection.loginPhase !== LoginPhase.USER_SENT &&
            !this.config.acceptLoginAuthWithoutUser
        ) {
            this.log(`[Login6E] unexpected - phase=${connection.loginPhase}`);
            return null;
        }
        let username = packet.username || connection.pendingLoginUser || '';
        const {
            passwordHash,
            fileCRCs,
            macAddress,
            loginToken,
            computerName,
            hasSteamTicket,
            steamTicketLength,
        } = packet;
        connection.loginAuthUsername = username;
        connection.loginAuthComputer = computerName;
        connection.loginAuthPasswordHash = passwordHash;
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
        const crcNote =
            fileCRCs.length > 0 ? fileCRCs.map((v) => `0x${v.toString(16)}`).join(',') : 'none';
        this.log(
            `[Login6E] user="${username}" hash="${passwordHash.slice(0, 16)}..." mac="${macAddress}" crcs=[${crcNote}]`,
        );
        if (status === LoginReturnStatus.SUCCESS) {
            connection.username = username;
            connection.authenticated = true;
            connection.authenticatedUser = username;
            connection.loginPhase = LoginPhase.AUTHENTICATED;
            this.clearLoginResetTimer(connection, 'login_success');
            connection.pendingLoginUser = '';
            connection.pendingLoginClientVersion = 0;
            connection.pendingLoginAt = 0;
        } else {
            connection.authenticated = false;
            connection.loginPhase = LoginPhase.USER_SENT;
        }
        const playerId =
            status === LoginReturnStatus.SUCCESS ? this.resolveWorldSelectPlayerId(connection) : 0;
        // Populate world list from discovery, with fallback to configured endpoints (ordered).
        // TODO: Replace fallback selection with per-account worldId from DB when persistence is wired.
        const discoveredWorldIds = this.config.worldDirectory.getWorldIds();
        const fallbackWorldIds = this.config.worldDirectory.getFallbackWorldIds();
        const hasWorlds = discoveredWorldIds.length > 0 || fallbackWorldIds.length > 0;
        if (status === LoginReturnStatus.SUCCESS && !hasWorlds) {
            // No worlds configured or discovered; gate login with a silent failure.
            this.log('[Login6E] No valid worlds available; denying login (LOGIN_RETURN_3)');
            return [
                {
                    data: new IdLoginReturnPacket({
                        status: LoginReturnStatus.LOGIN_RETURN_3,
                        playerId: 0,
                    }).encode(),
                    address: connection.address,
                },
            ];
        }
        const worldIds = discoveredWorldIds.length > 0 ? discoveredWorldIds : fallbackWorldIds;
        // Default world is always Manhattan (1); selected world is random from discovery (or fallback).
        const defaultWorldId = 1;
        const currentWorldId = this.resolveWorldId(discoveredWorldIds, fallbackWorldIds);
        if (discoveredWorldIds.length === 0) {
            const note =
                fallbackWorldIds.length > 0
                    ? `fallback=${fallbackWorldIds.join(',')}`
                    : 'fallback=none';
            this.log(`[Login6E] No discovered worlds; using ${note}`);
        }
        // TODO: Handle account db data here
        const loginReturn = new IdLoginReturnPacket({
            status,
            playerId,
            accountType: this.resolveAccountType(),
            isFullAccount: this.config.loginIsFullAccount ?? false,
            hasCharFlags: this.config.loginHasCharFlags ?? false,
            clientVersion: loginClientVersion,
            worldIDs: worldIds,
            defaultWorldId,
            currentWorldId,
        }).encode();
        this.log(
            `[Login6E] -> 0x6F status=${status} playerId=${playerId} defaultWorldId=${defaultWorldId} currentWorldId=${currentWorldId}`,
        );
        return [{ data: loginReturn, address: connection.address }];
    }

    /**
     * Handle ID_LOGIN_TOKEN_CHECK packets.
     * @param {IdLoginTokenCheckPacket} packet - Decoded token check packet.
     * @param {Connection} connection - Connection instance.
     * @returns {LoginResponse | null} Response packet or null.
     */
    private handleLoginTokenCheck(
        packet: IdLoginTokenCheckPacket,
        connection: Connection,
    ): LoginResponse | null {
        this.log(`[Login] 0x70 from ${connection.key}`);
        if (packet.fromServer) {
            // Server -> Client (we received this - shouldn't happen on server)
            this.log(
                `[Login70] recv server->client success=${packet.success} user="${packet.username}"`,
            );
            return null;
        }
        // Client -> Server
        const username = connection.pendingLoginUser || connection.username || '';
        this.log(`[Login70] token="${packet.requestToken}" -> respond with user="${username}"`);
        const response = IdLoginTokenCheckPacket.createServerResponse(true, username);
        return {
            data: response.encode(),
            address: connection.address,
        };
    }

    /**
     * Handle ID_WORLD_LOGIN packets and reply with world endpoint info.
     * @param {IdWorldLoginPacket} packet - Decoded world login packet.
     * @param {Connection} connection - Connection instance.
     * @returns {LoginResponse | LoginResponse[] | null} Response packet(s) or null.
     */
    private handleWorldLogin(
        packet: IdWorldLoginPacket,
        connection: Connection,
    ): LoginResponse | LoginResponse[] | null {
        this.log(`[Login] 0x72 from ${connection.key}`);
        const { worldId, worldInst, playerId, worldConst } = packet;
        this.clearLoginResetTimer(connection, 'world_login');
        connection.worldId = worldId;
        connection.worldInst = worldInst;
        connection.playerId = playerId;
        const rawHeartbeatTimeoutMs = this.config.masterHeartbeatTimeoutMs ?? 0;
        const heartbeatTimeoutMs =
            rawHeartbeatTimeoutMs > 0 ? Math.max(20000, rawHeartbeatTimeoutMs) : 0;
        connection.worldLastHeartbeatAt = 0;
        connection.worldHeartbeatGraceUntil =
            heartbeatTimeoutMs > 0 ? Date.now() + heartbeatTimeoutMs : 0;
        connection.worldLoginWorldId = worldId;
        connection.worldLoginWorldInst = worldInst;
        connection.worldLoginPlayerId = playerId;
        connection.worldLoginWorldConst = worldConst;
        connection.loginPhase = LoginPhase.WORLD_PENDING;
        this.log(
            `[Login72] worldId=${worldId} inst=${worldInst} playerId=${playerId} const=0x${worldConst.toString(16)}`,
        );
        if (!connection.authenticated) {
            this.log(`[Login72] ignore unauth`);
            return null;
        }
        const code = this.resolveWorldLoginReturnCode(connection);
        const resolvedWorldId =
            worldId ||
            this.config.worldDirectory.getDefaultWorldId() ||
            this.config.worldDirectory.getDefaultFallbackWorldId() ||
            0;
        if (!worldId && resolvedWorldId) {
            connection.worldId = resolvedWorldId;
            connection.worldLoginWorldId = resolvedWorldId;
        }
        const worldInfo =
            (resolvedWorldId ? this.config.worldDirectory.resolveWorld(resolvedWorldId) : null) ||
            (this.config.worldDirectory.getDefaultWorldId()
                ? this.config.worldDirectory.resolveWorld(
                      this.config.worldDirectory.getDefaultWorldId() ?? 0,
                  )
                : null);
        let worldIp = worldInfo?.worldIp ?? '';
        let worldPort = worldInfo?.worldPort ?? 0;
        if (!worldInfo) {
            const fallback = this.config.worldDirectory.resolveFallbackEndpoint(resolvedWorldId);
            if (!fallback) {
                this.log('[Login72] no discovered world info or fallback endpoint available');
                return {
                    data: new IdWorldLoginReturnPacket({
                        code: WorldLoginReturnCode.SERVER_UNAVAILABLE,
                        flag: 0xff,
                        worldIp: '0.0.0.0',
                        worldPort: 0,
                    }).encode(),
                    address: connection.address,
                };
            }
            worldIp = fallback.ip;
            worldPort = fallback.port;
            this.log(
                `[Login72] using fallback endpoint ${fallback.key} for worldId=${resolvedWorldId}`,
            );
        }
        const response = new IdWorldLoginReturnPacket({
            code: code as WorldLoginReturnCode,
            flag: 0xff,
            worldIp,
            worldPort,
        });
        this.log(`[Login72] -> ${response}`);
        return {
            data: response.encode(),
            address: connection.address,
        };
    }

    /**
     * Resolve the world login return code from connection state.
     * @param {Connection} connection - Connection instance.
     * @returns {number} World login return code.
     */
    private resolveWorldLoginReturnCode(connection: Connection): number {
        // Scaffolding: map future server-side checks to client UI codes.
        // TODO: replace these stubs with real validation signals.
        if (!connection.authenticated) {
            return 2; // server unavailable / not authorized
        }
        switch (connection.worldConnectStage) {
            case 2:
                return 2; // server unavailable
            case 3:
                return 3; // faction not available
            case 4:
                return 4; // world full
            case 6:
                return 6; // faction privileges revoked
            case 7:
                return 7; // vortex gate range error
            case 8:
                return 8; // retry later
            default:
                break;
        }
        return 1;
    }

    /**
     * Resolve the player ID used in world selection.
     * @param {Connection} connection - Connection instance.
     * @returns {number} Player ID value.
     */
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

    /**
     * Resolve a world ID from discovery or fallback sets.
     * @param {number[]} discoveredWorldIds - Discovered world IDs.
     * @param {number[]} fallbackWorldIds - Fallback world IDs.
     * @returns {number} Selected world ID.
     */
    private resolveWorldId(discoveredWorldIds: number[], fallbackWorldIds: number[]): number {
        if (discoveredWorldIds.length > 0) {
            return this.pickRandomWorldId(discoveredWorldIds);
        }
        if (fallbackWorldIds.length > 0) {
            return this.pickRandomWorldId(fallbackWorldIds);
        }
        return 0;
    }

    /**
     * Pick a random world ID from a list.
     * @param {number[]} worldIds - World ID candidates.
     * @returns {number} Selected world ID.
     */
    private pickRandomWorldId(worldIds: number[]): number {
        if (worldIds.length === 0) return 0;
        const index = Math.floor(Math.random() * worldIds.length);
        return worldIds[index] ?? 0;
    }

    /**
     * Resolve account type for login return payloads.
     * @returns {AccountType} Account type enum value.
     */
    private resolveAccountType(): AccountType {
        const raw = this.config.loginAccountType ?? AccountType.FREE;
        if (raw === AccountType.BASIC || raw === AccountType.PREMIUM || raw === AccountType.ADMIN) {
            return raw;
        }
        return AccountType.PREMIUM;
    }

    /**
     * Emit login logs when debug is enabled.
     * @param {string} message - Log message.
     * @returns {void} No return value.
     */
    private log(message: string): void {
        if (this.config.debug || this.config.loginDebug) {
            logInfo(message);
        }
    }

    /**
     * Schedule a login state reset after a delay.
     * @param {Connection} connection - Connection instance.
     * @param {string} reason - Reason label for logs.
     * @returns {void} No return value.
     */
    private scheduleLoginReset(connection: Connection, reason: string): void {
        const delayMs = this.config.loginResetDelayMs ?? 0;
        if (delayMs <= 0) return;
        if (connection.loginResetTimer) return;
        if (connection.isInWorld() || connection.loginPhase !== LoginPhase.AUTHENTICATED) return;
        connection.loginResetAt = Date.now() + delayMs;
        this.log(`[Login] schedule reset in ${delayMs}ms for ${connection.key} (${reason})`);
        connection.loginResetTimer = setTimeout(() => {
            connection.loginResetTimer = null;
            connection.loginResetAt = 0;
            this.log(`[Login] auto-reset ${connection.key} (${reason})`);
            this.resetLoginState(connection);
        }, delayMs);
    }

    /**
     * Clear any scheduled login reset timer.
     * @param {Connection} connection - Connection instance.
     * @param {string} reason - Reason label for logs.
     * @returns {void} No return value.
     */
    private clearLoginResetTimer(connection: Connection, reason: string): void {
        if (!connection.loginResetTimer) return;
        clearTimeout(connection.loginResetTimer);
        connection.loginResetTimer = null;
        connection.loginResetAt = 0;
        this.log(`[Login] cancel reset for ${connection.key} (${reason})`);
    }

    /**
     * Reset all login-related fields on a connection.
     * @param {Connection} connection - Connection instance.
     * @returns {void} No return value.
     */
    private resetLoginState(connection: Connection): void {
        connection.loginPhase = LoginPhase.CONNECTED;
        connection.pendingLoginUser = '';
        connection.pendingLoginClientVersion = 0;
        connection.pendingLoginToken = 0;
        connection.pendingLoginSession = '';
        connection.pendingLoginAt = 0;
        connection.username = '';
        connection.authenticated = false;
        connection.authenticatedUser = null;
        connection.clientId = 0;
        connection.loginAuthUsername = '';
        connection.loginAuthComputer = '';
        connection.loginAuthPasswordHash = '';
        connection.loginAuthMacAddress = '';
        connection.loginAuthLoginToken = '';
        connection.loginAuthFileCRCs = [];
        connection.loginAuthSteamTicket = false;
        connection.loginAuthSteamTicketLength = 0;
        connection.loginAuthSteamTicketBytes = 0;
        connection.worldId = 0;
        connection.worldInst = 0;
        connection.playerId = 0;
        connection.worldSelectSent = false;
        connection.worldSelectWorldId = 0;
        connection.worldSelectWorldInst = 0;
        connection.worldSelectPlayerId = 0;
        connection.worldLoginWorldId = 0;
        connection.worldLoginWorldInst = 0;
        connection.worldLoginPlayerId = 0;
        connection.worldLoginWorldConst = 0;
        connection.worldConnectStage = -1;
        connection.worldSpawnSent = false;
        connection.worldSpawnObjectId = 0;
        connection.worldTimeOrigin = 0;
        connection.worldLastHeartbeatAt = 0;
        connection.worldHeartbeatGraceUntil = 0;
        connection.loginResponseSendCount = 0;
        connection.loginResponseAckCount = 0;
        connection.lastLoginResponseMsgNum = null;
        connection.lastLoginResponseSentAt = 0;
    }
}
