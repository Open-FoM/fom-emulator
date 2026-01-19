/**
 * World server entrypoint wiring RakNet transport, handlers, and dispatch.
 */
import {
    RakPeer,
    RakReliability,
    RakPriority,
    type RakSystemAddress,
    addressFromString,
    addressToIp,
    addressToString,
    createPacketLoggerContext,
    LithPacketRead,
} from '@openfom/networking';
import { RakNetCoreMessageId, RakNetMessageId, LithTechMessageId } from '@openfom/packets';
import {
    debug as logDebug,
    error as logError,
    info as logInfo,
    warn as logWarn,
} from '@openfom/utils';
import { loadRuntimeConfig } from './config';
import { startAdminServer } from './admin/AdminServer';
import { createPacketHandlers } from './handlers/registerHandlers';
import type { WorldConnection } from './types';
// Load server + logging configuration once at startup.
const runtime = loadRuntimeConfig();
const config = runtime.server;
const packetLogConfig = runtime.packetLog;
const adminConfig = runtime.admin;
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
    debugEnabled: config.debug,
    logWarn,
    logDebug,
    label: 'World',
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
logInfo('='.repeat(60));
logInfo(' FoM World Server');
logInfo('='.repeat(60));
logInfo(`  Port: ${config.port}`);
logInfo(`  Max Connections: ${config.maxConnections}`);
logInfo(`  Debug: ${config.debug}`);
logInfo('='.repeat(60));
logInfo('');
logInfo(
    `[Admin] Enabled=${adminConfig.enabled} Port=${adminConfig.port} Token=${adminConfig.token ? 'set' : 'empty'}`,
);
// Connection state for live clients + master relay targets.
const connections = new Map<string, WorldConnection>();
const masterPeers = new Map<string, { address: RakSystemAddress; lastSeen: number }>();
// RakNet peer handles UDP transport lifecycle.
const peer = new RakPeer();
if (!peer.startup(config.maxConnections, config.port, 0)) {
    logError('[World] Failed to start RakNet peer');
    process.exit(1);
}
peer.setMaxIncomingConnections(config.maxConnections);
peer.setIncomingPassword(config.password);
logInfo(`[World] Listening on port ${config.port}`);
logInfo('');
// Enable raw capture for reliability inspection and packet logging.
if (packetLogConfig.rawCapture) {
    peer.configureRawLog({
        enableRecv: packetLogConfig.rawCaptureRecv,
        enableSend: packetLogConfig.rawCaptureSend,
        maxQueue: packetLogConfig.rawCaptureMaxQueue,
        maxPacketBytes: packetLogConfig.rawCaptureMaxBytes,
    });
}
// Seed master relay target for heartbeat forwarding.
if (config.masterHost) {
    const addr = addressFromString(config.masterHost, config.masterPortHint);
    const key = addressToString(addr);
    masterPeers.set(key, { address: addr, lastSeen: Date.now() });
    logInfo(`[World] Heartbeat relay target ${key}`);
}

/**
 * Send a reliable RakNet packet to a client.
 * @param {Buffer} data - Packet payload.
 * @param {RakSystemAddress} address - Target address.
 * @returns {boolean} True when the send succeeded.
 */
function sendReliable(data: Buffer, address: RakSystemAddress): boolean {
    const addrIp = addressToIp(address);
    const connection = connections.get(getConnectionKey(address));
    if (logAppPackets) {
        logPacket(data, 'SEND', addrIp, address.port, connection?.playerId);
    }
    const success = peer.send(data, RakPriority.HIGH, RakReliability.RELIABLE, 0, address, false);
    if (config.debug) {
        const addr = addressToString(address);
        const msgId = data[0];
        logDebug(
            `[World] SEND 0x${msgId.toString(16).padStart(2, '0')} to ${addr} (${data.length} bytes) - ${success ? 'OK' : 'FAIL'}`,
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
    const connection = connections.get(getConnectionKey(address));
    if (logAppPackets) {
        logPacket(data, 'SEND', addrIp, address.port, connection?.playerId);
    }
    const success = peer.send(data, RakPriority.LOW, RakReliability.UNRELIABLE, 0, address, false);
    return success;
}

/**
 * Start the admin control plane for world server management.
 */
startAdminServer({
    admin: adminConfig,
    serverPort: config.port,
    worldId: config.worldId,
    worldInst: config.worldInst,
    connections,
    sendReliable,
    sendUnreliable,
    shutdown,
});

/**
 * Register packet handlers for incoming RakNet/LithTech messages.
 */
const handlers = createPacketHandlers({
    connections,
    masterPeers,
    config,
    sendReliable,
    getConnectionKey,
});

/**
 * Run the main receive loop until RakNet shuts down.
 * @returns {Promise<void>} Resolves after the loop exits.
 */
async function mainLoop(): Promise<void> {
    logInfo('[World] Starting main loop...');
    logInfo('');
    while (peer.isActive()) {
        // Drain raw capture before app dispatch to keep logs ordered by arrival.
        drainRawCapture(peer);
        let packet = peer.receive();
        while (packet) {
            const addrIp = addressToIp(packet.systemAddress);
            const connKey = getConnectionKey(packet.systemAddress);
            const conn = connections.get(connKey);
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
                logPacket(rawPayload, 'RECV', addrIp, packet.systemAddress.port, conn?.playerId);
            }
            // Replace packet data with the normalized app payload for handlers.
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
                        `[World] Error handling packet 0x${messageId.toString(16)} from ${addr}: ${errText}`,
                    );
                }
            } else {
                // No custom packet logging here; PacketInspector handles packet output.
            }
            packet = peer.receive();
        }
        // Small sleep to prevent busy-waiting.
        await Bun.sleep(10);
    }
}

/**
 * Gracefully shutdown RakNet and connected services.
 * @returns {void} No return value.
 */
function shutdown(): void {
    logInfo('\n[World] Shutting down...');
    peer.shutdown(500);
    peer.destroy();
    logInfo('[World] Goodbye!');
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Start the world server main loop.
 */
mainLoop().catch((err) => {
    const errText = err instanceof Error ? err.stack || err.message : String(err);
    logError(`[World] Fatal error in main loop: ${errText}`);
    peer.shutdown(0);
    peer.destroy();
    process.exit(1);
});
