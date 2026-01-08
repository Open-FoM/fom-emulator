/**
 * FoM World Server
 *
 * Handles in-world gameplay after players connect from the Master server.
 * Listens on port 62000 (default) for ID_WORLD_LOGIN (0x72) from clients
 * redirected by the master server.
 */

import {
    RakPeer,
    RakReliability,
    RakPriority,
    type RakSystemAddress,
    addressToIp,
    addressToString,
    PacketLogger,
    PacketDirection,
} from '@openfom/networking';
import {
    RakNetMessageId,
    IdWorldLoginPacket,
    LtGuaranteedPacket,
    MsgUnguaranteedUpdate,
    IdUserPacket,
} from '@openfom/packets';
import { configureLogger, debug as logDebug, error as logError, info as logInfo } from '@openfom/utils';
import { loadRuntimeConfig } from './config';

const runtime = loadRuntimeConfig();
const config = runtime.server;
const packetLogConfig = runtime.packetLog;

configureLogger({ quiet: packetLogConfig.quiet, debug: config.debug });

PacketLogger.installConsoleMirror({ echoToConsole: !packetLogConfig.quiet });

const packetLogger = new PacketLogger({
    console: !packetLogConfig.quiet && packetLogConfig.consoleMode !== 'off',
    file: packetLogConfig.logToFile,
    consoleMode: packetLogConfig.consoleMode,
    consoleMinIntervalMs: packetLogConfig.consoleMinIntervalMs,
    consolePacketIds: packetLogConfig.consolePacketIds,
    filePacketIds: packetLogConfig.filePacketIds,
    ignorePacketIds: packetLogConfig.ignorePacketIds,
    analysis: packetLogConfig.analysisEnabled,
    consoleRepeatSuppressMs: packetLogConfig.consoleRepeatSuppressMs,
    flushMode: packetLogConfig.flushMode,
    assumePayload: true,
});

PacketLogger.setGlobal(packetLogger);
PacketLogger.setConsoleMirrorEcho(!packetLogConfig.quiet);

logInfo('='.repeat(60));
logInfo(' FoM World Server');
logInfo('='.repeat(60));
logInfo(`  Ini: ${runtime.iniPath}`);
logInfo(`  Port: ${config.port}`);
logInfo(`  Max Connections: ${config.maxConnections}`);
logInfo(`  Debug: ${config.debug}`);
logInfo('='.repeat(60));
logInfo('');

interface WorldConnection {
    address: RakSystemAddress;
    key: string;
    playerId: number;
    worldId: number;
    worldInst: number;
    authenticated: boolean;
    worldTimeOrigin: number;
    lastHeartbeatAt: number;
    lithTechOutSeq: number;
}

const connections = new Map<string, WorldConnection>();

function getConnectionKey(address: RakSystemAddress): string {
    return `${addressToIp(address)}:${address.port}`;
}

const peer = new RakPeer();

if (!peer.startup(config.maxConnections, config.port, 0)) {
    logError('[World] Failed to start RakNet peer');
    process.exit(1);
}

peer.setMaxIncomingConnections(config.maxConnections);
peer.setIncomingPassword(config.password);

logInfo(`[World] Listening on port ${config.port}`);
logInfo('');

function sendReliable(data: Buffer, address: RakSystemAddress): boolean {
    const addrIp = addressToIp(address);
    const connection = connections.get(getConnectionKey(address));
    const outgoingPacket = {
        timestamp: new Date(),
        direction: PacketDirection.OUTGOING,
        address: addrIp,
        port: address.port,
        data,
        connectionId: connection?.playerId,
    };
    try {
        packetLogger.log(outgoingPacket);
    } catch {}

    const success = peer.send(
        data,
        RakPriority.HIGH,
        RakReliability.RELIABLE,
        0,
        address,
        false,
    );
    if (config.debug) {
        const addr = addressToString(address);
        const msgId = data[0];
        logDebug(`[World] SEND 0x${msgId.toString(16).padStart(2, '0')} to ${addr} (${data.length} bytes) - ${success ? 'OK' : 'FAIL'}`);
    }
    return success;
}

function sendUnreliable(data: Buffer, address: RakSystemAddress): boolean {
    const success = peer.send(
        data,
        RakPriority.LOW,
        RakReliability.UNRELIABLE,
        0,
        address,
        false,
    );
    return success;
}

function handleWorldLogin(packet: IdWorldLoginPacket, address: RakSystemAddress): void {
    const { worldId, worldInst, playerId, worldConst } = packet;
    const key = getConnectionKey(address);

    logInfo(`[World] 0x72 WORLD_LOGIN from ${key}: worldId=${worldId} inst=${worldInst} playerId=${playerId} const=0x${worldConst.toString(16)}`);

    const conn = connections.get(key);
    if (!conn) {
        logError(`[World] No connection found for ${key}`);
        return;
    }

    conn.playerId = playerId || 1;
    conn.worldId = worldId || 1;
    conn.worldInst = worldInst || 1;
    conn.authenticated = true;

    logInfo(`[World] Updated connection: playerId=${conn.playerId} worldId=${conn.worldId}`);
}

function handleNewConnection(address: RakSystemAddress): void {
    const key = getConnectionKey(address);
    logInfo(`[World] New connection from ${key}`);

    const conn: WorldConnection = {
        address,
        key,
        playerId: 1,
        worldId: 1,
        worldInst: 1,
        authenticated: false,
        worldTimeOrigin: Date.now(),
        lastHeartbeatAt: 0,
        lithTechOutSeq: 0,
    };
    connections.set(key, conn);

    const seq = conn.lithTechOutSeq;
    conn.lithTechOutSeq = (seq + 1) & 0x1fff;

    const lithBurst = LtGuaranteedPacket.buildWorldLoginBurst(seq, conn.playerId, conn.playerId, conn.worldId);
    const wrappedBurst = IdUserPacket.wrap(lithBurst).encode();
    sendReliable(wrappedBurst, address);
    logInfo(`[World] -> LithTech burst (worldId=${conn.worldId}, ${wrappedBurst.length - 1} bytes)`);
}

function handleDisconnect(address: RakSystemAddress): void {
    const key = getConnectionKey(address);
    logInfo(`[World] Disconnected: ${key}`);
    connections.delete(key);
}

async function mainLoop() {
    logInfo('[World] Starting main loop...');
    logInfo('');

    while (peer.isActive()) {
        let packet = peer.receive();
        while (packet) {
            console.log('received packet');
            const addrIp = addressToIp(packet.systemAddress);
            const connection = connections.get(getConnectionKey(packet.systemAddress));
            const incomingPacket = {
                timestamp: new Date(),
                direction: PacketDirection.INCOMING,
                address: addrIp,
                port: packet.systemAddress.port,
                data: Buffer.from(packet.data),
                connectionId: connection?.playerId,
            };
            try {
                packetLogger.log(incomingPacket);
            } catch {}

            const messageId = packet.data[0];

            switch (messageId) {
                case RakNetMessageId.ID_NEW_INCOMING_CONNECTION:
                    handleNewConnection(packet.systemAddress);
                    break;

                case RakNetMessageId.ID_DISCONNECTION_NOTIFICATION:
                case RakNetMessageId.ID_CONNECTION_LOST:
                    handleDisconnect(packet.systemAddress);
                    break;

                case RakNetMessageId.ID_WORLD_LOGIN: {
                    const worldLoginPacket = IdWorldLoginPacket.decode(Buffer.from(packet.data));
                    handleWorldLogin(worldLoginPacket, packet.systemAddress);
                    break;
                }

                default:
                    if (config.debug || messageId >= 0x50) {
                        const addr = addressToString(packet.systemAddress);
                        logInfo(`[World] Unhandled 0x${messageId.toString(16).padStart(2, '0')} from ${addr} (${packet.length} bytes)`);
                        if (packet.length <= 32) {
                            const hex = Array.from(packet.data)
                                .map((b) => b.toString(16).padStart(2, '0'))
                                .join(' ');
                            logInfo(`         ${hex}`);
                        }
                    }
                    break;
            }

            packet = peer.receive();
        }

        const now = Date.now();
        const heartbeatMs = 3000;
        for (const conn of connections.values()) {
            if (!conn.authenticated) continue;
            if (conn.lastHeartbeatAt && (now - conn.lastHeartbeatAt) < heartbeatMs) continue;
            conn.lastHeartbeatAt = now;

            const elapsedSec = (now - conn.worldTimeOrigin) / 1000;
            const updateMsg = MsgUnguaranteedUpdate.createHeartbeat(elapsedSec);

            const seq = conn.lithTechOutSeq;
            conn.lithTechOutSeq = (seq + 1) & 0x1fff;
            const lithPacket = LtGuaranteedPacket.fromMessages(seq, [updateMsg]);
            const wrapped = IdUserPacket.wrap(lithPacket).encode();
            sendUnreliable(wrapped, conn.address);
        }

        await Bun.sleep(10);
    }
}

function shutdown() {
    logInfo('\n[World] Shutting down...');
    peer.shutdown(500);
    peer.destroy();
    logInfo('[World] Goodbye!');
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

mainLoop().catch((err) => {
    const errText = err instanceof Error ? err.stack || err.message : String(err);
    logError(`[World] Fatal error in main loop: ${errText}`);
    peer.shutdown(0);
    peer.destroy();
    process.exit(1);
});
