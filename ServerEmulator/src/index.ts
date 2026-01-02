import { UDPServer, RemoteInfo } from './network/UDPServer';
import { ConnectionManager, ConnectionState } from './network/Connection';
import { PacketHandler } from './handlers/PacketHandler';
import { PacketContext } from './handlers/PacketContext';
import { BitStreamReader } from './protocol/BitStream';
import { DEFAULT_PORT } from './protocol/Constants';
import { PacketLogger, PacketDirection } from './utils/PacketLogger';
import {
    cleanupLegacyLogs,
    loadEnvCandidates,
    parseBool,
    parseConsoleMode,
    parseFlushMode,
    parsePacketIds,
    writeConfigSnapshot,
} from './config/ConfigLoader';

class FoMServer {
    private udpServer: UDPServer;
    private connectionManager: ConnectionManager;
    private packetHandler: PacketHandler;
    private packetLogger: PacketLogger;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private worldHeartbeatInterval: NodeJS.Timeout | null = null;

    constructor(port: number = DEFAULT_PORT) {
        this.udpServer = new UDPServer(port);
        this.connectionManager = new ConnectionManager();
        this.packetHandler = new PacketHandler();
        // Quiet mode: keep console output off but still mirror to file.
        const quiet = parseBool(process.env.QUIET_MODE ?? process.env.FOM_QUIET_LOGS, false);
        const consoleMode = parseConsoleMode(process.env.PACKET_LOG);
        const consoleMinIntervalMs = Math.max(
            0,
            parseInt(process.env.PACKET_LOG_INTERVAL_MS || '5000', 10) || 0,
        );
        const logToFile = parseBool(process.env.PACKET_LOG_FILE, true);
        const analysisEnabled = parseBool(process.env.PACKET_LOG_ANALYSIS, false);
        const consolePacketIds = parsePacketIds(process.env.PACKET_LOG_IDS);
        const filePacketIds = parsePacketIds(process.env.PACKET_LOG_FILE_IDS);
        const ignorePacketIds = parsePacketIds(process.env.PACKET_LOG_IGNORE_IDS);
        const consoleRepeatSuppressMs = Math.max(
            0,
            parseInt(process.env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0,
        );
        const flushMode = parseFlushMode(process.env.PACKET_LOG_FLUSH);
        this.packetLogger = new PacketLogger({
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
        });
        PacketLogger.setGlobal(this.packetLogger);
        PacketLogger.installConsoleMirror({ echoToConsole: !quiet });
        PacketLogger.setConsoleMirrorEcho(!quiet);

        this.setupHandlers();
    }

    private setupHandlers(): void {
        this.udpServer.on('message', (data: Buffer, rinfo: RemoteInfo) => {
            this.handleMessage(data, rinfo);
        });

        this.udpServer.on('error', (err: Error) => {
            console.error('[FoMServer] UDP error:', err);
        });
    }

    private handleMessage(data: Buffer, rinfo: RemoteInfo): void {
        const connection = this.connectionManager.create(rinfo);
        connection.updateActivity();

        const incomingPacket = {
            timestamp: new Date(),
            direction: PacketDirection.INCOMING,
            address: rinfo.address,
            port: rinfo.port,
            data: data,
            connectionId: connection.id,
        };

        let incomingLogged = false;
        try {
            incomingLogged = this.packetLogger.log(incomingPacket);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            PacketLogger.globalNote(
                `[Error] packetLog addr=${rinfo.address}:${rinfo.port} len=${data.length} err=${msg}`,
            );
        }
        try {
            this.packetLogger.logAnalysis(incomingPacket, incomingLogged);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            PacketLogger.globalNote(
                `[Error] packetAnalysis addr=${rinfo.address}:${rinfo.port} len=${data.length} err=${msg}`,
            );
        }

        if (connection.state === ConnectionState.DISCONNECTED) {
            connection.state = ConnectionState.CONNECTING;
        }

        const ctx: PacketContext = {
            connection,
            data,
            reader: new BitStreamReader(data),
        };

        try {
            let response = this.packetHandler.handlePacket(ctx);
            let queued: Buffer | null = null;
            if (!response) {
                response = this.packetHandler.dequeueWorldPacket(connection);
            } else {
                queued = this.packetHandler.dequeueWorldPacket(connection);
            }

            const ack = this.packetHandler.buildAck(connection);
            if (ack.length > 0) {
                const ackPacket = {
                    timestamp: new Date(),
                    direction: PacketDirection.OUTGOING,
                    address: rinfo.address,
                    port: rinfo.port,
                    data: ack,
                    connectionId: connection.id,
                };
                const ackLogged = this.packetLogger.log(ackPacket);
                this.packetLogger.logAnalysis(ackPacket, ackLogged);
                this.udpServer
                    .send(ack, rinfo.port, rinfo.address)
                    .catch((err) => console.error(`[FoMServer] ACK send error:`, err));
            }

            if (response) {
                const outgoingPacket = {
                    timestamp: new Date(),
                    direction: PacketDirection.OUTGOING,
                    address: rinfo.address,
                    port: rinfo.port,
                    data: response,
                    connectionId: connection.id,
                };

                const outgoingLogged = this.packetLogger.log(outgoingPacket);
                this.packetLogger.logAnalysis(outgoingPacket, outgoingLogged);

                this.udpServer.send(response, rinfo.port, rinfo.address).catch((err) => {
                    console.error(`[FoMServer] Send error:`, err);
                });
            }
            if (queued) {
                const outgoingPacket = {
                    timestamp: new Date(),
                    direction: PacketDirection.OUTGOING,
                    address: rinfo.address,
                    port: rinfo.port,
                    data: queued,
                    connectionId: connection.id,
                };

                const outgoingLogged = this.packetLogger.log(outgoingPacket);
                this.packetLogger.logAnalysis(outgoingPacket, outgoingLogged);

                this.udpServer.send(queued, rinfo.port, rinfo.address).catch((err) => {
                    console.error(`[FoMServer] Send error:`, err);
                });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.stack || err.message : String(err);
            PacketLogger.globalNote(
                `[Error] handlePacket addr=${rinfo.address}:${rinfo.port} len=${data.length} err=${msg}`,
            );
            console.error(`[FoMServer] Error handling packet:`, err);
        }
    }

    private startCleanupTimer(): void {
        this.cleanupInterval = setInterval(() => {
            const timedOut = this.connectionManager.cleanupTimedOut();
            if (timedOut.length > 0) {
                console.log(`[FoMServer] Cleaned up ${timedOut.length} timed-out connections`);
                for (const conn of timedOut) {
                    this.packetHandler.releaseConnection(conn);
                }
            }
        }, 10000);
    }

    private startWorldHeartbeatTimer(): void {
        if (!this.packetHandler.isWorldServer()) return;
        const intervalMs = this.packetHandler.getWorldHeartbeatIntervalMs();
        if (intervalMs <= 0) return;
        this.worldHeartbeatInterval = setInterval(() => {
            this.sendWorldHeartbeats();
        }, intervalMs);
    }

    private sendWorldHeartbeats(): void {
        const now = Date.now();
        for (const conn of this.connectionManager.getAll()) {
            if (conn.state === ConnectionState.DISCONNECTED) continue;
            const packet = this.packetHandler.buildWorldHeartbeat(conn, now);
            if (!packet) continue;
            const outgoingPacket = {
                timestamp: new Date(),
                direction: PacketDirection.OUTGOING,
                address: conn.address,
                port: conn.port,
                data: packet,
                connectionId: conn.id,
            };
            const outgoingLogged = this.packetLogger.log(outgoingPacket);
            this.packetLogger.logAnalysis(outgoingPacket, outgoingLogged);
            this.udpServer.send(packet, conn.port, conn.address).catch((err) => {
                console.error(`[FoMServer] Heartbeat send error:`, err);
            });
        }
    }

    async start(): Promise<void> {
        console.log('='.repeat(50));
        console.log('  Face of Mankind Server Emulator');
        console.log('  For game preservation purposes');
        console.log('='.repeat(50));
        console.log(`  Mode: ${(process.env.SERVER_MODE || 'master').toLowerCase()}`);

        await this.udpServer.start();
        this.startCleanupTimer();
        this.startWorldHeartbeatTimer();

        console.log('\n[FoMServer] Ready to accept connections');
        console.log('[FoMServer] Packet logging enabled (console + file)\n');
        console.log('Protocol details:');
        console.log('  - Connection magic: 0x9919D9C7');
        console.log(`  - Default port: ${DEFAULT_PORT}`);
        console.log('  - World password: 37eG87Ph');
        console.log('\nPress Ctrl+C to stop\n');
    }

    async stop(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.worldHeartbeatInterval) {
            clearInterval(this.worldHeartbeatInterval);
        }
        this.packetLogger.close();
        await this.udpServer.stop();
        console.log('[FoMServer] Stopped');
    }
}

async function main() {
    PacketLogger.installConsoleMirror();
    loadEnvCandidates();
    cleanupLegacyLogs();
    writeConfigSnapshot();
    const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
    const server = new FoMServer(port);

    process.on('SIGINT', async () => {
        console.log('\n[FoMServer] Shutting down...');
        await server.stop();
        process.exit(0);
    });

    process.on('uncaughtException', (err: Error) => {
        PacketLogger.globalNote(`[Error] uncaughtException ${err.stack || err.message}`);
    });
    process.on('unhandledRejection', (reason: unknown) => {
        const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
        PacketLogger.globalNote(`[Error] unhandledRejection ${msg}`);
    });

    try {
        await server.start();
    } catch (err) {
        console.error('[FoMServer] Failed to start:', err);
        process.exit(1);
    }
}

main();
