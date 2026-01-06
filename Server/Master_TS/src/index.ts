/**
 * FoM Server Emulator V2
 *
 * Uses native RakNet 3.611 via Bun FFI for proper reliability, ACKs, and duplicate detection.
 *
 * Login flow handled:
 *   0x6C (LOGIN_REQUEST) -> 0x6D (LOGIN_REQUEST_RETURN)
 *   0x6E (LOGIN) -> 0x6F (LOGIN_RETURN)
 *   0x70 (LOGIN_TOKEN_CHECK) bidirectional
 *   0x72 (WORLD_LOGIN) -> 0x73 (WORLD_LOGIN_RETURN)
 */

import {
    RakPeer,
    RakReliability,
    RakPriority,
    RakMessageId,
    addressToString,
    type RakPacket,
    type RakSystemAddress,
} from './bindings/raknet';
import { ConnectionManager, LoginPhase } from './network/Connection';
import { LoginHandler } from './handlers/LoginHandler';
import { RakNetMessageId as FomMessageId } from './protocol/Constants';
import { loadRsaKeyFromFile, type RsaKey } from './utils/Rsa';
import { PacketLogger, PacketDirection } from './utils/PacketLogger';
import * as fs from 'fs';
import * as path from 'path';

function parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parseConsoleMode(value: string | undefined): 'off' | 'summary' | 'full' {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'off' || normalized === 'none' || normalized === '0') return 'off';
    if (normalized === 'summary' || normalized === 'short') return 'summary';
    return 'full';
}

function parseFlushMode(value: string | undefined): 'off' | 'login' | 'always' {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'always') return 'always';
    if (normalized === 'login') return 'login';
    return 'off';
}

function parsePacketIds(value: string | undefined): number[] | undefined {
    if (!value) return undefined;
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    const ids: number[] = [];
    for (const part of parts) {
        const parsed = part.startsWith('0x') || part.startsWith('0X')
            ? Number.parseInt(part, 16)
            : Number.parseInt(part, 10);
        if (Number.isFinite(parsed)) {
            ids.push(parsed & 0xff);
        }
    }
    return ids.length > 0 ? ids : undefined;
}

function loadIniConfig(filePath: string): Record<string, string> {
    const config: Record<string, string> = {};
    if (!fs.existsSync(filePath)) return config;
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim().toUpperCase();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key) config[key] = value;
    }
    return config;
}

function resolveIniPath(): string {
    const override = process.env.FOM_INI;
    if (override && override.trim() !== '') {
        return path.resolve(override.trim());
    }
    const candidates = [
        path.resolve(process.cwd(), 'fom_server.ini'),
        path.resolve(process.cwd(), 'Server', 'Master_TS', 'fom_server.ini'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return candidates[0];
}

const iniPath = resolveIniPath();
const iniConfig = loadIniConfig(iniPath);

function readSetting(name: string): string | undefined {
    const key = name.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(iniConfig, key)) {
        return iniConfig[key];
    }
    return process.env[name];
}

function readSettingAny(...names: string[]): string | undefined {
    for (const name of names) {
        const value = readSetting(name);
        if (value !== undefined && value !== '') return value;
    }
    return undefined;
}

// =============================================================================
// Configuration
// =============================================================================

const config = {
    port: parseInt(readSetting('PORT') || '61000', 10),
    maxConnections: parseInt(readSetting('MAX_CONNECTIONS') || '100', 10),
    password: readSetting('SERVER_PASSWORD') || '37eG87Ph',
    serverMode: (readSetting('SERVER_MODE') || 'master') as 'master' | 'world',
    worldIp: readSetting('WORLD_IP') || '127.0.0.1',
    worldPort: parseInt(readSetting('WORLD_PORT') || '62000', 10),
    debug: parseBool(readSetting('DEBUG'), true),
    loginDebug: parseBool(readSetting('LOGIN_DEBUG'), false),
    loginStrict: parseBool(readSetting('LOGIN_STRICT'), false),
    loginRequireCredentials: parseBool(readSetting('LOGIN_REQUIRE_CREDENTIALS'), false),
    acceptLoginAuthWithoutUser: parseBool(readSetting('ACCEPT_AUTH_WITHOUT_USER'), false),
    resendDuplicateLogin6D: parseBool(readSetting('RESEND_DUPLICATE_6D'), false),
    loginClientVersion: parseInt(readSetting('LOGIN_CLIENT_VERSION') || '0', 10),
    worldSelectWorldId: parseInt(readSettingAny('FOM_WORLD_ID', 'WORLD_ID') || '0', 10),
    worldSelectWorldInst: parseInt(readSettingAny('FOM_WORLD_INST', 'WORLD_INST') || '0', 10),
    worldSelectPlayerId: parseInt(readSetting('WORLD_SELECT_PLAYER_ID') || '0', 10),
    worldSelectPlayerIdRandom: parseBool(readSetting('WORLD_SELECT_PLAYER_ID_RANDOM'), false),
};

function addressToIp(address: RakSystemAddress): string {
    const parts = [
        (address.binaryAddress >> 0) & 0xff,
        (address.binaryAddress >> 8) & 0xff,
        (address.binaryAddress >> 16) & 0xff,
        (address.binaryAddress >> 24) & 0xff,
    ];
    return parts.join('.');
}

// =============================================================================
// Server Setup
// =============================================================================

// =============================================================================
// Load RSA Keys
// =============================================================================

const rsaKeyCandidates = [
    path.resolve(process.cwd(), 'fom_private_key.env'),
    path.resolve(process.cwd(), 'Server', 'Master_TS', 'fom_private_key.env'),
];
const rsaKeyPath = rsaKeyCandidates.find((candidate) => fs.existsSync(candidate)) ?? rsaKeyCandidates[0];
const rsaKey = loadRsaKeyFromFile(rsaKeyPath);
if (rsaKey) {
    console.log(`[RSA] Loaded private key from ${rsaKeyPath}`);
    console.log(`[RSA] Modulus: ${rsaKey.modulusBytes} bytes, Endian: ${rsaKey.endian}`);
} else {
    console.warn('[RSA] No private key loaded - login decryption will fail');
}

console.log('='.repeat(60));
console.log(' FoM Server Emulator V2 - Native RakNet');
console.log('='.repeat(60));
console.log(`  Ini: ${iniPath}`);
console.log(`  Mode: ${config.serverMode}`);
console.log(`  Port: ${config.port}`);
console.log(`  Max Connections: ${config.maxConnections}`);
console.log(`  RSA Key: ${rsaKey ? 'loaded' : 'NOT LOADED'}`);
console.log(`  Debug: ${config.debug}`);
console.log(`  LoginStrict: ${config.loginStrict}`);
console.log(`  LoginClientVersion: ${config.loginClientVersion}`);
console.log('='.repeat(60));
console.log('');

// Create components
const peer = new RakPeer();
const connections = new ConnectionManager();
const loginHandler = new LoginHandler({
    serverMode: config.serverMode,
    worldIp: config.worldIp,
    worldPort: config.worldPort,
    debug: config.debug,
    loginDebug: config.loginDebug,
    loginStrict: config.loginStrict,
    loginRequireCredentials: config.loginRequireCredentials,
    acceptLoginAuthWithoutUser: config.acceptLoginAuthWithoutUser,
    resendDuplicateLogin6D: config.resendDuplicateLogin6D,
    loginClientVersion: config.loginClientVersion,
    worldSelectWorldId: config.worldSelectWorldId,
    worldSelectWorldInst: config.worldSelectWorldInst,
    worldSelectPlayerId: config.worldSelectPlayerId,
    worldSelectPlayerIdRandom: config.worldSelectPlayerIdRandom,
});

const quiet = parseBool(readSettingAny('QUIET_MODE', 'FOM_QUIET_LOGS'), false);
const consoleMode = parseConsoleMode(readSetting('PACKET_LOG'));
const consoleMinIntervalMs = Math.max(
    0,
    Number.parseInt(readSetting('PACKET_LOG_INTERVAL_MS') || '5000', 10) || 0,
);
const logToFile = parseBool(readSetting('PACKET_LOG_FILE'), true);
const analysisEnabled = parseBool(readSetting('PACKET_LOG_ANALYSIS'), false);
const consolePacketIds = parsePacketIds(readSetting('PACKET_LOG_IDS'));
const filePacketIds = parsePacketIds(readSetting('PACKET_LOG_FILE_IDS'));
const ignorePacketIds = parsePacketIds(readSetting('PACKET_LOG_IGNORE_IDS'));
const consoleRepeatSuppressMs = Math.max(
    0,
    Number.parseInt(readSetting('PACKET_LOG_REPEAT_SUPPRESS_MS') || '2000', 10) || 0,
);
const flushMode = parseFlushMode(readSetting('PACKET_LOG_FLUSH'));

const packetLogger = new PacketLogger({
    console: !quiet && consoleMode !== 'off',
    file: logToFile,
    consoleMode,
    consoleMinIntervalMs,
    consolePacketIds,
    filePacketIds,
    ignorePacketIds,
    analysis: analysisEnabled,
    consoleRepeatSuppressMs,
    flushMode,
    assumePayload: true,
});

PacketLogger.setGlobal(packetLogger);
PacketLogger.installConsoleMirror({ echoToConsole: !quiet });
PacketLogger.setConsoleMirrorEcho(!quiet);

// Start the server
if (!peer.startup(config.maxConnections, config.port, 0)) {
    console.error('[Server] Failed to start RakNet peer');
    process.exit(1);
}

peer.setMaxIncomingConnections(config.maxConnections);
peer.setIncomingPassword(config.password);

console.log(`[Server] Listening on port ${config.port}`);
console.log('');

// =============================================================================
// Packet Handlers
// =============================================================================

type PacketHandler = (packet: RakPacket) => void;

const handlers: Map<number, PacketHandler> = new Map();

// RakNet internal: New connection
handlers.set(RakMessageId.NEW_INCOMING_CONNECTION, (packet) => {
    const conn = connections.getOrCreate(packet.systemAddress);
    conn.loginPhase = LoginPhase.CONNECTED;
    console.log(`[Server] New connection from ${conn.key}`);
});

// RakNet internal: Disconnection
handlers.set(RakMessageId.DISCONNECTION_NOTIFICATION, (packet) => {
    const conn = connections.get(packet.systemAddress);
    if (conn) {
        console.log(`[Server] Client disconnected: ${conn.key}`);
        loginHandler.releaseConnection(conn);
        connections.remove(packet.systemAddress);
    }
});

// RakNet internal: Connection lost
handlers.set(RakMessageId.CONNECTION_LOST, (packet) => {
    const conn = connections.get(packet.systemAddress);
    if (conn) {
        console.log(`[Server] Connection lost: ${conn.key}`);
        loginHandler.releaseConnection(conn);
        connections.remove(packet.systemAddress);
    }
});

// RakNet internal: Invalid password
handlers.set(RakMessageId.INVALID_PASSWORD, (packet) => {
    const addr = addressToString(packet.systemAddress);
    console.log(`[Server] Invalid password from: ${addr}`);
});

// Helper to send one or multiple responses
function sendResponses(response: ReturnType<typeof loginHandler.handle>): void {
    if (!response) return;
    if (Array.isArray(response)) {
        for (const r of response) {
            sendReliable(r.data, r.address);
        }
    } else {
        sendReliable(response.data, response.address);
    }
}

// FoM: Login request (0x6C)
handlers.set(FomMessageId.ID_LOGIN_REQUEST, (packet) => {
    const conn = connections.getOrCreate(packet.systemAddress);
    const response = loginHandler.handle(FomMessageId.ID_LOGIN_REQUEST, packet.data, conn);
    sendResponses(response);
});

// FoM: Login auth (0x6E)
handlers.set(FomMessageId.ID_LOGIN, (packet) => {
    const conn = connections.get(packet.systemAddress);
    if (!conn) return;
    const response = loginHandler.handle(FomMessageId.ID_LOGIN, packet.data, conn);
    sendResponses(response);
});

// FoM: Login token check (0x70)
handlers.set(FomMessageId.ID_LOGIN_TOKEN_CHECK, (packet) => {
    const conn = connections.get(packet.systemAddress);
    if (!conn) return;
    const response = loginHandler.handle(FomMessageId.ID_LOGIN_TOKEN_CHECK, packet.data, conn);
    sendResponses(response);
});

// FoM: World login (0x72)
handlers.set(FomMessageId.ID_WORLD_LOGIN, (packet) => {
    const conn = connections.get(packet.systemAddress);
    if (!conn) return;
    const response = loginHandler.handle(FomMessageId.ID_WORLD_LOGIN, packet.data, conn);
    sendResponses(response);
});

// =============================================================================
// Send Helper
// =============================================================================

function sendReliable(data: Buffer, address: RakSystemAddress): boolean {
    const addrIp = addressToIp(address);
    const connection = connections.get(address);
    const outgoingPacket = {
        timestamp: new Date(),
        direction: PacketDirection.OUTGOING,
        address: addrIp,
        port: address.port,
        data,
        connectionId: connection?.id,
    };
    try {
        const logged = packetLogger.log(outgoingPacket);
        packetLogger.logAnalysis(outgoingPacket, logged);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        PacketLogger.globalNote(
            `[Error] packetLog SEND addr=${addrIp}:${address.port} len=${data.length} err=${msg}`,
        );
    }

    const success = peer.send(
        data,
        RakPriority.HIGH,
        RakReliability.RELIABLE,  // Changed from RELIABLE_ORDERED - FoM expects RELIABLE
        0, // ordering channel
        address,
        false, // not broadcast
    );
    if (config.debug) {
        const addr = addressToString(address);
        const msgId = data[0];
        console.log(`[Server] SEND 0x${msgId.toString(16).padStart(2, '0')} to ${addr} (${data.length} bytes) - ${success ? 'OK' : 'FAIL'}`);
    }
    return success;
}

// =============================================================================
// Main Loop
// =============================================================================

async function mainLoop() {
    console.log('[Server] Starting main loop...');
    console.log('');

    while (peer.isActive()) {
        // Process all pending packets
        let packet = peer.receive();
        while (packet) {
            const addrIp = addressToIp(packet.systemAddress);
            const connection = connections.get(packet.systemAddress);
            const incomingPacket = {
                timestamp: new Date(),
                direction: PacketDirection.INCOMING,
                address: addrIp,
                port: packet.systemAddress.port,
                data: Buffer.from(packet.data),
                connectionId: connection?.id,
            };
            try {
                const logged = packetLogger.log(incomingPacket);
                packetLogger.logAnalysis(incomingPacket, logged);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                PacketLogger.globalNote(
                    `[Error] packetLog RECV addr=${addrIp}:${packet.systemAddress.port} len=${packet.length} err=${msg}`,
                );
            }

            const messageId = packet.data[0];
            const handler = handlers.get(messageId);

            if (handler) {
                try {
                    handler(packet);
                } catch (err) {
                    const addr = addressToString(packet.systemAddress);
                    console.error(`[Server] Error handling packet 0x${messageId.toString(16)} from ${addr}:`, err);
                }
            } else {
                // Log unknown packets
                if (config.debug || messageId >= 0x50) {  // Log game packets
                    const addr = addressToString(packet.systemAddress);
                    console.log(
                        `[Server] Unhandled 0x${messageId.toString(16).padStart(2, '0')} from ${addr} (${packet.length} bytes)`,
                    );
                    // Hex dump for small packets
                    if (packet.length <= 32) {
                        const hex = Array.from(packet.data)
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join(' ');
                        console.log(`         ${hex}`);
                    }
                }
            }

            // Get next packet
            packet = peer.receive();
        }

        // Small sleep to prevent busy-waiting
        await Bun.sleep(10);
    }
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

function shutdown() {
    console.log('\n[Server] Shutting down...');
    peer.shutdown(500);
    peer.destroy();
    console.log('[Server] Goodbye!');
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// =============================================================================
// Start
// =============================================================================

mainLoop().catch((err) => {
    console.error('[Server] Fatal error in main loop:', err);
    peer.shutdown(0);
    peer.destroy();
    process.exit(1);
});

