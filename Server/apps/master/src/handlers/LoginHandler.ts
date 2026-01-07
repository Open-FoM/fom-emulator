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
    RakMessageId,
    type RakSystemAddress,
    buildWorldLoginBurst,
} from '@openfom/networking';
import {
    RakNetMessageId,
    LoginRequestReturnStatus,
    LoginReturnStatus,
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
import { APARTMENT_WORLD_TABLE } from '../world/WorldRegistry';
import { info as logInfo } from '@openfom/utils';

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
            this.log(`[Login] Packet decode error: ${msg}`);
            return null;
        }
    }

    private handleLoginRequest(packet: IdLoginRequestPacket, connection: Connection) {
        const { username, clientVersion } = packet;
        this.log(`[Login6C] user="${username}" ver=${clientVersion} from ${connection.key}`);

        const strictLogin = this.config.loginStrict ?? false;

        if (!username || username.length < 3) {
            this.log(`[Login] Invalid username`);
            if (strictLogin) {
                return {
                    data: new IdLoginRequestReturnPacket({ status: LoginRequestReturnStatus.INVALID_INFO, username: '' }).encode(),
                    address: connection.address,
                };
            }
            return null;
        }

        const maxUserLen = strictLogin ? 32 : 64;
        if (!this.isPrintableAscii(username) || username.length > maxUserLen) {
            this.log(`[Login] reject invalid username len=${username.length}`);
            if (strictLogin) {
                return {
                    data: new IdLoginRequestReturnPacket({ status: LoginRequestReturnStatus.INVALID_INFO, username: '' }).encode(),
                    address: connection.address,
                };
            }
            return null;
        }

        if (strictLogin && !this.isClientVersionAllowed(clientVersion)) {
            this.log(`[Login] reject clientVersion=${clientVersion}`);
            return {
                data: new IdLoginRequestReturnPacket({ status: LoginRequestReturnStatus.OUTDATED_CLIENT, username }).encode(),
                address: connection.address,
            };
        }

        const now = Date.now();
        const cooldownMs = 2000;
        if (connection.lastLoginResponseSentAt && now - connection.lastLoginResponseSentAt < cooldownMs) {
            this.log(`[Login] cooldown skip user="${username}"`);
            return null;
        }

        if (connection.loginPhase === LoginPhase.AUTHENTICATED) {
            this.log(`[Login] already authenticated user="${username}"`);
            if (strictLogin) {
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

        if (connection.loginPhase === LoginPhase.USER_SENT && connection.pendingLoginUser === username) {
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
        return {
            data: new IdLoginRequestReturnPacket({ status: LoginRequestReturnStatus.SUCCESS, username }).encode(),
            address: connection.address,
        };
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
        passwordHash: string,
    ): LoginReturnStatus {
        // Centralized gate for strict auth decisions.
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

    private handleLoginAuth(packet: IdLoginPacket, connection: Connection) {
        if (connection.loginPhase !== LoginPhase.USER_SENT && !this.config.acceptLoginAuthWithoutUser) {
            this.log(`[Login6E] unexpected - phase=${connection.loginPhase}`);
            return null;
        }

        let username = packet.username || connection.pendingLoginUser || '';
        const { passwordHash, fileCRCs, macAddress, driveModels, driveSerials, loginToken, computerName, hasSteamTicket, steamTicketLength } = packet;

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

        const crcNote = fileCRCs.length > 0 ? fileCRCs.map((v) => `0x${v.toString(16)}`).join(',') : 'none';
        this.log(`[Login6E] user="${username}" hash="${passwordHash.slice(0,16)}..." mac="${macAddress}" crcs=[${crcNote}]`);

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

        if (this.config.serverMode === 'master') {
            const playerId = status === LoginReturnStatus.SUCCESS
                ? this.resolveWorldSelectPlayerId(connection)
                : 0;
            const worldId = this.resolveWorldSelectWorldId(connection);
            const worldInst = this.resolveWorldSelectWorldInst(connection, worldId);
            connection.worldSelectWorldId = worldId;
            connection.worldSelectWorldInst = worldInst;

            const loginReturn = new IdLoginReturnPacket({
                status,
                playerId,
                clientVersion: loginClientVersion,
            }).encode();

            this.log(`[Login6E] -> 0x6F status=${status} playerId=${playerId} world=${worldId}:${worldInst}`);
            const responses: LoginResponse[] = [{ data: loginReturn, address: connection.address }];

            if (status === LoginReturnStatus.SUCCESS) {
                const worldSelect = IdWorldSelectPacket.createWorldSelect(playerId, worldId, worldInst).encode();
                connection.worldSelectSent = true;
                this.log(`[Login6E] -> 0x7B subId=4 playerId=${playerId} world=${worldId}:${worldInst}`);
                responses.push({ data: worldSelect, address: connection.address });
            }

            return responses;
        }

        return null;
    }

    private handleLoginTokenCheck(packet: IdLoginTokenCheckPacket, connection: Connection): LoginResponse | null {
        this.log(`[Login] 0x70 from ${connection.key}`);

        if (packet.fromServer) {
            // Server -> Client (we received this - shouldn't happen on server)
            this.log(`[Login70] recv server->client success=${packet.success} user="${packet.username}"`);
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

    private handleWorldLogin(packet: IdWorldLoginPacket, connection: Connection): LoginResponse | LoginResponse[] | null {
        this.log(`[Login] 0x72 from ${connection.key}`);

        const { worldId, worldInst, playerId, worldConst } = packet;

        connection.worldId = worldId;
        connection.worldInst = worldInst;
        connection.playerId = playerId;
        connection.worldLoginWorldId = worldId;
        connection.worldLoginWorldInst = worldInst;
        connection.worldLoginPlayerId = playerId;
        connection.worldLoginWorldConst = worldConst;

        this.log(`[Login72] worldId=${worldId} inst=${worldInst} playerId=${playerId} const=0x${worldConst.toString(16)}`);

        if (this.config.serverMode === 'master') {
            if (!connection.authenticated) {
                this.log(`[Login72] ignore unauth`);
                return null;
            }

            const code = this.resolveWorldLoginReturnCode(connection);
            const response = new IdWorldLoginReturnPacket({
                code: code as WorldLoginReturnCode,
                flag: 0xff,
                worldIp: this.config.worldIp,
                worldPort: this.config.worldPort,
            });
            this.log(`[Login72] -> 0x73 code=${code} world=${this.config.worldIp}:${this.config.worldPort}`);
            return {
                data: response.encode(),
                address: connection.address,
            };
        }

        connection.authenticated = true;
        connection.loginPhase = LoginPhase.IN_WORLD;
        if (!connection.worldTimeOrigin) {
            connection.worldTimeOrigin = Date.now();
        }
        connection.worldLastHeartbeatAt = 0;

        const responses: LoginResponse[] = [];

        const response = IdWorldLoginReturnPacket.createSuccess(this.config.worldIp, this.config.worldPort);
        responses.push({
            data: response.encode(),
            address: connection.address,
        });

        const seq = connection.lithTechOutSeq;
        connection.lithTechOutSeq = (seq + 1) & 0x1fff;

        const clientId = connection.id;
        const objectId = playerId || connection.id;
        const lithWorldId = worldId || 16;

        const lithBurst = buildWorldLoginBurst(seq, clientId, objectId, lithWorldId);
        const wrappedBurst = Buffer.concat([Buffer.from([RakMessageId.USER_PACKET_ENUM]), lithBurst]);
        this.log(`[Login72] -> LithTech burst (${lithBurst.length} bytes)`);

        responses.push({
            data: wrappedBurst,
            address: connection.address,
        });

        return responses;
    }

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

    private log(message: string): void {
        if (this.config.debug || this.config.loginDebug) {
            logInfo(message);
        }
    }
}
