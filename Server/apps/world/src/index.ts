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
    LithTechMessageId,
    IdWorldLoginPacket,
    IdRegisterClientPacket,
    IdRegisterClientReturnPacket,
    IdWorldServicePacket,
    MsgPacketGroup,
    MsgPreloadList,
    MsgClientObjectId,
    WorldSelectSubId,
    IdWorldSelectPacket,
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
    registered: boolean;
    worldTimeOrigin: number;
    lithTechOutSeq: number;
    connectStage: number;
    pingInterval?: ReturnType<typeof setInterval>;
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

function sendLithTechBurst(conn: WorldConnection): void {
    const packetGroup = MsgPacketGroup.buildWorldLoginBurst(
        conn.playerId,
        conn.worldId,
        0.0,
    );
    const encoded = packetGroup.encode();
    sendReliable(encoded, conn.address);
    logInfo(`[World] -> SMSG_PACKETGROUP (NETPROTOCOLVERSION + YOURID + LOADWORLD) worldId=${conn.worldId}, playerId=${conn.playerId}`);
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
    conn.worldInst = worldInst || config.worldInst;
    conn.authenticated = true;

    logInfo(`[World] Updated connection: playerId=${conn.playerId} worldId=${conn.worldId}`);
}

function handleRegisterClient(packet: IdRegisterClientPacket, address: RakSystemAddress): void {
    const { worldId, playerId, sessionId } = packet;
    const key = getConnectionKey(address);

    logInfo(`[World] 0x78 REGISTER_CLIENT from ${key}: worldId=${worldId} playerId=${playerId} sessionId=${sessionId}`);

    const conn = connections.get(key);
    if (!conn) {
        logError(`[World] No connection found for ${key}`);
        return;
    }

    conn.authenticated = true;

    conn.playerId = playerId || conn.playerId;
    conn.worldId = worldId || conn.worldId;
    conn.registered = true;

    const response = new IdRegisterClientReturnPacket({
        worldId: conn.worldId,
        playerId: conn.playerId,
        returnCode: 1,
    });
    
    const responseBuffer = response.encode();
    sendReliable(responseBuffer, address);
    logInfo(`[World] -> 0x79 REGISTER_CLIENT_RETURN (worldId=${conn.worldId}, playerId=${conn.playerId}, ${responseBuffer.length} bytes)`);

    // Send 0x7B WORLD_SELECT after 0x79
    const worldSelect = new IdWorldSelectPacket({
        playerId: conn.playerId,
        subId: WorldSelectSubId.WORLD_ID_INST,
        worldId: conn.worldId,
        worldInst: conn.worldInst,
    });
    const worldSelectBuffer = worldSelect.encode();
    sendReliable(worldSelectBuffer, address);
    logInfo(`[World] -> 0x7B WORLD_SELECT (worldId=${conn.worldId}, worldInst=${conn.worldInst}, ${worldSelectBuffer.length} bytes)`);
}

function handleNewConnection(address: RakSystemAddress): void {
    const key = getConnectionKey(address);
    logInfo(`[World] New connection from ${key}`);

    const conn: WorldConnection = {
        address,
        key,
        playerId: 1,
        worldId: 1,
        worldInst: config.worldInst,
        authenticated: false,
        registered: false,
        worldTimeOrigin: Date.now(),
        lithTechOutSeq: 0,
        connectStage: -1,
    };
    connections.set(key, conn);

    sendLithTechBurst(conn);
}

function handleWorldAuth(data: Buffer, address: RakSystemAddress): void {
    const key = getConnectionKey(address);
    const conn = connections.get(key);
    if (!conn) {
        logError(`[World] No connection found for ${key}`);
        return;
    }

    logInfo(`[World] 0x6b WORLD_LOGIN_REQUEST from ${key} (${data.length} bytes)`);
    // sendLithTechBurst(conn);
}

function handleDisconnect(address: RakSystemAddress): void {
    const key = getConnectionKey(address);
    const conn = connections.get(key);
    if (conn?.pingInterval) {
        clearInterval(conn.pingInterval);
    }
    logInfo(`[World] Disconnected: ${key}`);
    connections.delete(key);
}

function handleConnectStage(data: Buffer, address: RakSystemAddress): void {
    const key = getConnectionKey(address);
    const conn = connections.get(key);
    if (!conn) {
        logError(`[World] CONNECTSTAGE: No connection found for ${key}`);
        return;
    }

    const stage = data[1];
    conn.connectStage = stage;
    logInfo(`[World] CMSG_CONNECTSTAGE from ${key}: stage=${stage}`);

    if (stage === 0) {
        logInfo(`[World] -> SMSG_PRELOADLIST (END) - client loaded world, sending preload end`);
        const preloadEnd = MsgPreloadList.createEnd();
        const encoded = preloadEnd.encode();
        sendReliable(encoded, conn.address);
    } else if (stage === 1) {
        logInfo(`[World] -> SMSG_CLIENTOBJECTID - client preloaded, sending object ID ${conn.playerId}`);
        const clientObjId = MsgClientObjectId.create(conn.playerId);
        const encoded = clientObjId.encode();
        sendReliable(encoded, conn.address);
    }
}

async function mainLoop() {
    logInfo('[World] Starting main loop...');
    logInfo('');

    while (peer.isActive()) {
        let packet = peer.receive();
        while (packet) {
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

            let payload = Buffer.from(packet.data);
            let messageId = payload[0];
            let timestamp: bigint | null = null;

            if (messageId === RakNetMessageId.ID_TIMESTAMP) {
                if (payload.length >= 6) {
                    // RakNetTime is 32-bit unless __GET_TIME_64BIT is defined.
                    timestamp = BigInt(payload.readUInt32LE(1));
                    payload = payload.subarray(5);
                    messageId = payload[0];
                    if (config.debug) {
                        logDebug(`[World] ID_TIMESTAMP -> innerId=0x${messageId.toString(16).padStart(2, '0')} ts=${timestamp.toString()} len=${payload.length}`);
                    }
                } else {
                    logError(`[World] ID_TIMESTAMP too short (${payload.length} bytes)`);
                    packet = peer.receive();
                    continue;
                }
            }

            switch (messageId) {
                case RakNetMessageId.ID_NEW_INCOMING_CONNECTION:
                    handleNewConnection(packet.systemAddress);
                    break;

                case RakNetMessageId.ID_DISCONNECTION_NOTIFICATION:
                case RakNetMessageId.ID_CONNECTION_LOST:
                    handleDisconnect(packet.systemAddress);
                    break;

                case RakNetMessageId.ID_WORLD_LOGIN: {
                    const worldLoginPacket = IdWorldLoginPacket.decode(Buffer.from(payload));
                    handleWorldLogin(worldLoginPacket, packet.systemAddress);
                    break;
                }

                case RakNetMessageId.ID_WORLD_LOGIN_REQUEST: {
                    handleWorldAuth(Buffer.from(payload), packet.systemAddress);
                    break;
                }

                case RakNetMessageId.ID_WORLDSERVICE: {
                    const worldServicePacket = IdWorldServicePacket.decode(Buffer.from(payload));
                    const key = getConnectionKey(packet.systemAddress);
                    logInfo(`[World] 0xa5 WORLDSERVICE from ${key}: ${worldServicePacket.toString()}`);
                    break;
                }

                case RakNetMessageId.ID_REGISTER_CLIENT: {
                    const registerPacket = IdRegisterClientPacket.decode(Buffer.from(payload));
                    handleRegisterClient(registerPacket, packet.systemAddress);
                    break;
                }

                case LithTechMessageId.MSG_CONNECTSTAGE: {
                    handleConnectStage(Buffer.from(payload), packet.systemAddress);
                    break;
                }

                case RakNetMessageId.ID_USER_PACKET_ENUM: {
                    if (payload.length < 2) {
                        logInfo(`[World] Unhandled 0x86 (USER_PACKET) too short (${payload.length} bytes)`);
                        break;
                    }
                    const lithId = payload[1];
                    if (config.debug) {
                        logDebug(`[World] USER_PACKET -> lithId=0x${lithId.toString(16).padStart(2, '0')} len=${payload.length - 1}`);
                    }
                    const lithPayload = payload.subarray(1);
                    if (lithId === LithTechMessageId.MSG_CONNECTSTAGE) {
                        handleConnectStage(Buffer.from(lithPayload), packet.systemAddress);
                    } else {
                        logInfo(`[World] Unhandled Lith msg 0x${lithId.toString(16).padStart(2, '0')} (len=${lithPayload.length})`);
                    }
                    break;
                }

                default:
                    const addr = addressToString(packet.systemAddress);
                    logInfo(`[World] Unhandled 0x${messageId.toString(16).padStart(2, '0')} from ${addr} (${payload.length} bytes)`);
                    if (payload.length <= 32) {
                        const hex = Array.from(payload)
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join(' ');
                        logInfo(`         ${hex}`);
                    }
                    break;
            }

            packet = peer.receive();
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
