/**
 * Master server entrypoint wiring RakNet transport, login handling, and dispatch.
 */
import {
    RakPeer,
    RakReliability,
    RakPriority,
    type RakSystemAddress,
    addressToIp,
    addressToString,
    createPacketLoggerContext,
    LithPacketRead,
} from '@openfom/networking';
import {
    debug as logDebug,
    error as logError,
    info as logInfo,
    warn as logWarn,
} from '@openfom/utils';
import { RakNetCoreMessageId, RakNetMessageId, LithTechMessageId } from '@openfom/packets';
import { loadRuntimeConfig } from './config';
import { ConnectionManager } from './network/Connection';
import { LoginHandler } from './handlers/LoginHandler';
import { createPacketHandlers } from './handlers/registerHandlers';
import { loadRsaKeyFromJson, type RsaKeyJson } from './utils/Rsa';
import { startAdminServer } from './admin/AdminServer';
import { WorldDirectory, buildWorldEndpoint } from './world/WorldDirectory';
import { WorldDiscoveryClient } from './world/WorldDiscoveryClient';
import rsaKeyJson from './fom_private_key.json' with { type: 'json' };
// Load server + logging configuration once at startup.
const runtime = loadRuntimeConfig();
const config = runtime.server;
const packetLogConfig = runtime.packetLog;
const adminConfig = runtime.admin;
if (config.masterHeartbeatTimeoutMs > 0) {
    config.masterHeartbeatTimeoutMs = Math.max(20000, config.masterHeartbeatTimeoutMs);
}
// Known RakNet/LithTech IDs for packet classification (logging + dispatch normalization).
const RAKNET_ID_SET = new Set<number>([
    ...Object.values(RakNetCoreMessageId).filter(
        (value): value is number => typeof value === 'number',
    ),
    ...Object.values(RakNetMessageId).filter((value): value is number => typeof value === 'number'),
]);
const LITH_ID_SET = new Set<number>(
    Object.values(LithTechMessageId).filter((value): value is number => typeof value === 'number'),
);
// Centralized packet logging + raw capture helpers.
const packetLogger = createPacketLoggerContext({
    packetLogConfig,
    debugEnabled: config.debug || config.loginDebug,
    logWarn,
    logDebug,
    label: 'Master',
    rakMessageIds: RAKNET_ID_SET,
    lithMessageIds: LITH_ID_SET,
});
    const { logAppPackets, logPacket, drainRawCapture, getConnectionKey, classifyPacket } =
        packetLogger;
// Track per-connection trace throttling.
const dispatchTraceLast = new Map<string, number>();
// Rate-limit per-connection dispatch traces to keep logs readable.

/**
 * Determine whether to emit dispatch trace logs for a connection.
 * @param {string} connKey - Connection key.
 * @returns {boolean} True when trace logging should emit.
 */
const shouldTraceDispatch = (connKey: string): boolean => {
    if (!packetLogConfig.reliableTrace) return false;
    if (packetLogConfig.reliableTraceIntervalMs <= 0) return true;
    const now = Date.now();
    const last = dispatchTraceLast.get(connKey) ?? 0;
    if (now - last < packetLogConfig.reliableTraceIntervalMs) return false;
    dispatchTraceLast.set(connKey, now);
    return true;
};

/**
 * Load RSA keys for login decryption.
 */
const rsaKey = loadRsaKeyFromJson(rsaKeyJson as RsaKeyJson);
if (rsaKey) {
    logInfo(`[RSA] Loaded private key: ${rsaKey.modulusBytes} bytes, ${rsaKey.endian} endian`);
} else {
    logWarn('[RSA] Failed to load private key - login decryption will fail');
}
logInfo('='.repeat(60));
logInfo(' FoM Master Server');
logInfo('='.repeat(60));
logInfo(`  Mode: ${config.serverMode}`);
logInfo(`  Port: ${config.port}`);
logInfo(`  Max Connections: ${config.maxConnections}`);
logInfo(`  RSA Key: ${rsaKey ? 'loaded' : 'NOT LOADED'}`);
logInfo(`  Debug: ${config.debug}`);
logInfo(`  LoginStrict: ${config.loginStrict}`);
logInfo(`  LoginClientVersion: ${config.loginClientVersion}`);
logInfo(`  MasterHeartbeatTimeoutMs: ${config.masterHeartbeatTimeoutMs}`);
logInfo('='.repeat(60));
logInfo('');
logInfo(
    `[Admin] Enabled=${adminConfig.enabled} Port=${adminConfig.port} Token=${adminConfig.token ? 'set' : 'empty'}`,
);
// Initialize core services and handlers.
// RakNet peer handles UDP transport lifecycle.
const peer = new RakPeer();
// Connection manager tracks per-client state + timeouts.
const connections = new ConnectionManager();
// Canonical world endpoint list used by discovery + world selection.
const worldDirectory = new WorldDirectory(
    config.worldServers.map((entry) => buildWorldEndpoint(entry.ip, entry.port)),
);
// Login handler enforces auth/strictness and emits world selection.
const loginHandler = new LoginHandler({
    serverMode: config.serverMode,
    debug: config.debug,
    loginDebug: config.loginDebug,
    loginStrict: config.loginStrict,
    loginRequireCredentials: config.loginRequireCredentials,
    acceptLoginAuthWithoutUser: config.acceptLoginAuthWithoutUser,
    resendDuplicateLogin6D: config.resendDuplicateLogin6D,
    loginClientVersion: config.loginClientVersion,
    loginResetDelayMs: config.loginResetDelayMs,
    worldSelectWorldId: config.worldSelectWorldId,
    worldSelectWorldInst: config.worldSelectWorldInst,
    worldSelectPlayerId: config.worldSelectPlayerId,
    worldSelectPlayerIdRandom: config.worldSelectPlayerIdRandom,
    loginAccountType: config.loginAccountType,
    loginIsFullAccount: config.loginIsFullAccount,
    loginHasCharFlags: config.loginHasCharFlags,
    masterHeartbeatTimeoutMs: config.masterHeartbeatTimeoutMs,
    worldDirectory,
});
// Start RakNet transport.
if (!peer.startup(config.maxConnections, config.port, 0)) {
    logError('[Server] Failed to start RakNet peer');
    process.exit(1);
}
peer.setMaxIncomingConnections(config.maxConnections);
peer.setIncomingPassword(config.password);
logInfo(`[Server] Listening on port ${config.port}`);
logInfo('');
if (packetLogConfig.rawCapture) {
    peer.configureRawLog({
        enableRecv: packetLogConfig.rawCaptureRecv,
        enableSend: packetLogConfig.rawCaptureSend,
        maxQueue: packetLogConfig.rawCaptureMaxQueue,
        maxPacketBytes: packetLogConfig.rawCaptureMaxBytes,
    });
}
// Start discovery once RakNet is online so reliable queries can connect.
const worldDiscovery = new WorldDiscoveryClient(peer, worldDirectory, {
    token: config.worldDiscoveryToken,
    password: config.password,
    queryIntervalMs: config.worldDiscoveryIntervalMs,
    staleTtlMs: config.worldDiscoveryStaleTtlMs,
    debug: config.debug,
});
worldDiscovery.start();

/**
 * Send a reliable RakNet packet to a client.
 * @param {Buffer} data - Packet payload.
 * @param {RakSystemAddress} address - Target address.
 * @returns {boolean} True when the send succeeded.
 */
function sendReliable(data: Buffer, address: RakSystemAddress): boolean {
    const addrIp = addressToIp(address);
    const connection = connections.get(address);
    if (logAppPackets) {
        logPacket(data, 'SEND', addrIp, address.port, connection?.id);
    }
    const success = peer.send(
        data,
        RakPriority.HIGH,
        RakReliability.RELIABLE, // FoM expects RELIABLE (not RELIABLE_ORDERED).
        0, // ordering channel
        address,
        false, // not broadcast
    );
    if (config.debug) {
        const addr = addressToString(address);
        const msgId = data[0];
        logDebug(
            `[Server] SEND 0x${msgId.toString(16).padStart(2, '0')} to ${addr} (${data.length} bytes) - ${success ? 'OK' : 'FAIL'}`,
        );
    }
    return success;
}

/**
 * Send an unreliable RakNet packet to a client.
 * @param {Buffer} data - Packet payload.
 * @param {RakSystemAddress} address - Target address.
 * @returns {boolean} True when the send succeeded.
 */
function sendUnreliable(data: Buffer, address: RakSystemAddress): boolean {
    const addrIp = addressToIp(address);
    const connection = connections.get(address);
    if (logAppPackets) {
        logPacket(data, 'SEND', addrIp, address.port, connection?.id);
    }
    const success = peer.send(data, RakPriority.LOW, RakReliability.UNRELIABLE, 0, address, false);
    if (config.debug) {
        const addr = addressToString(address);
        const msgId = data[0];
        logDebug(
            `[Server] SEND (UNREL) 0x${msgId.toString(16).padStart(2, '0')} to ${addr} (${data.length} bytes) - ${success ? 'OK' : 'FAIL'}`,
        );
    }
    return success;
}

/**
 * Start the admin control plane for master server management.
 */
startAdminServer({
    admin: adminConfig,
    serverPort: config.port,
    connections,
    sendReliable,
    sendUnreliable,
    shutdown,
    worldDirectory,
    worldDiscovery,
});

/**
 * Register packet handlers for incoming RakNet messages.
 */
const handlers = createPacketHandlers({
    connections,
    loginHandler,
    sendReliable,
    worldDiscovery,
    worldHeartbeatToken: config.worldDiscoveryToken,
});

/**
 * Run the main receive loop until RakNet shuts down.
 * @returns {Promise<void>} Resolves after the loop exits.
 */
async function mainLoop(): Promise<void> {
    logInfo('[Server] Starting main loop...');
    logInfo('');
    const cleanupIntervalMs = 1000;
    let lastCleanupAt = Date.now();
    while (peer.isActive()) {
        drainRawCapture(peer);
        let packet = peer.receive();
        while (packet) {
            const addrIp = addressToIp(packet.systemAddress);
            const connKey = getConnectionKey(packet.systemAddress);
            const connection = connections.get(packet.systemAddress);
            if (connection) {
                connection.updateActivity();
            }
            const rawPayload = Buffer.from(packet.data);
            let payload = rawPayload;
            let messageId = 0x00;
            const traceDispatch = shouldTraceDispatch(connKey);
            const classified = classifyPacket(rawPayload);
            const canUseClassified = Boolean(
                classified &&
                classified.payloadBitLength > 0 &&
                classified.payloadOffsetBits + classified.payloadBitLength <= rawPayload.length * 8,
            );
            if (classified && traceDispatch) {
                logInfo(
                    `[Dispatch] mode=${classified.dispatchMode} ok=${canUseClassified ? 1 : 0} ` +
                        `id=0x${classified.effectiveId.toString(16)} inner=0x${classified.innerId.toString(16)} ` +
                        `layer=${classified.layer} offBits=${classified.payloadOffsetBits} bits=${classified.payloadBitLength} reason=${classified.dispatchReason}`,
                );
            } else if (traceDispatch) {
                logInfo(
                    `[Dispatch] mode=raw ok=0 id=0x00 inner=0x00 layer=0 bits=${rawPayload.length * 8} reason=pi_unavailable`,
                );
            }
            if (classified && canUseClassified) {
                const bitOffset = classified.payloadOffsetBits;
                const bitLength = classified.payloadBitLength;
                if (bitOffset % 8 === 0 && bitLength % 8 === 0) {
                    const start = bitOffset / 8;
                    const end = start + bitLength / 8;
                    payload = rawPayload.subarray(start, end);
                } else {
                    using reader = new LithPacketRead(rawPayload, rawPayload.length * 8);
                    reader.seekTo(bitOffset);
                    payload = reader.readData(bitLength);
                }
                messageId = classified.effectiveId & 0xff;
            }
            if (logAppPackets) {
                logPacket(rawPayload, 'RECV', addrIp, packet.systemAddress.port, connection?.id);
            }
            // Replace packet data with unwrapped payload for handlers.
            packet.data = payload;
            packet.length = payload.length;
            const handler = handlers.get(messageId);
            if (handler) {
                try {
                    handler(packet);
                } catch (err) {
                    const addr = addressToString(packet.systemAddress);
                    const errText = err instanceof Error ? err.stack || err.message : String(err);
                    logError(
                        `[Server] Error handling packet 0x${messageId.toString(16)} from ${addr}: ${errText}`,
                    );
                }
            } else {
                // No custom packet logging here; PacketInspector handles packet output.
            }
            packet = peer.receive();
        }
        const now = Date.now();
        if (now - lastCleanupAt >= cleanupIntervalMs) {
            lastCleanupAt = now;
            const timeoutMs = Math.max(1000, config.connectionTimeoutMs || 60000);
            for (const conn of connections.getAll()) {
                // Only timeout pre-auth connections; once authenticated the client won't talk to master regularly.
                if (conn.isAuthenticated()) continue;
                if (now - conn.lastActivity < timeoutMs) continue;
                logInfo(`[ConnMgr] Timeout: ${conn.key} idle=${now - conn.lastActivity}ms`);
                peer.closeConnection(conn.address, false);
                connections.remove(conn.address);
            }
            const rawHeartbeatTimeoutMs = Math.max(0, config.masterHeartbeatTimeoutMs || 0);
            const heartbeatTimeoutMs =
                rawHeartbeatTimeoutMs > 0 ? Math.max(20000, rawHeartbeatTimeoutMs) : 0;
            if (heartbeatTimeoutMs > 0 && config.worldDiscoveryToken) {
                for (const conn of connections.getAll()) {
                    if (!conn.isAuthenticated()) continue;
                    if (conn.worldLastHeartbeatAt > 0) {
                        if (now - conn.worldLastHeartbeatAt < heartbeatTimeoutMs) continue;
                        logInfo(
                            `[ConnMgr] Heartbeat timeout: playerId=${conn.playerId} idle=${now - conn.worldLastHeartbeatAt}ms`,
                        );
                        peer.closeConnection(conn.address, false);
                        connections.remove(conn.address);
                        continue;
                    }
                    if (conn.worldHeartbeatGraceUntil > 0 && now > conn.worldHeartbeatGraceUntil) {
                        logInfo(
                            `[ConnMgr] Heartbeat timeout: playerId=${conn.playerId} idle=${now - conn.worldHeartbeatGraceUntil}ms`,
                        );
                        peer.closeConnection(conn.address, false);
                        connections.remove(conn.address);
                    }
                }
            }
        }
        // Small sleep to prevent busy-waiting
        await Bun.sleep(10);
    }
    logInfo('\n[Server] Main loop has exited.');
}

/**
 * Gracefully shutdown RakNet and connected services.
 * @returns {void} No return value.
 */
function shutdown(): void {
    logInfo('\n[Server] Shutting down...');
    worldDiscovery.stop();
    peer.shutdown(500);
    peer.destroy();
    logInfo('[Server] Goodbye!');
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
    const errText = err instanceof Error ? err.stack || err.message : String(err);
    logError(`[Server] Uncaught exception: ${errText}`);
    shutdown();
});
process.on('unhandledRejection', (reason) => {
    const reasonText = reason instanceof Error ? reason.stack || reason.message : String(reason);
    logError(`[Server] Unhandled rejection: ${reasonText}`);
    shutdown();
});
process.on('beforeExit', (code) => {
    logInfo(`[Server] Process beforeExit event with code: ${code}`);
});

/**
 * Start the master server main loop.
 */
mainLoop().catch((err) => {
    const errText = err instanceof Error ? err.stack || err.message : String(err);
    logError(`[Server] Fatal error in main loop: ${errText}`);
    peer.shutdown(0);
    peer.destroy();
    process.exit(1);
});
