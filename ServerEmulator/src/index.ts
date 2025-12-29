import { UDPServer, RemoteInfo } from './network/UDPServer';
import { ConnectionManager, ConnectionState } from './network/Connection';
import { PacketHandler, PacketContext } from './handlers/PacketHandler';
import { BitStreamReader } from './protocol/BitStream';
import { DEFAULT_PORT } from './protocol/Constants';
import { PacketLogger, PacketDirection } from './utils/PacketLogger';

type ConsoleLogMode = 'off' | 'summary' | 'full';

function parseConsoleMode(value?: string): ConsoleLogMode {
  const v = (value || 'summary').toLowerCase();
  if (v === 'off' || v === '0' || v === 'false') return 'off';
  if (v === 'full' || v === 'verbose') return 'full';
  return 'summary';
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const v = value.toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return defaultValue;
}

function parsePacketIds(value?: string): number[] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map(v => v.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const ids: number[] = [];
  for (const part of parts) {
    const num = part.startsWith('0x') || part.startsWith('0X') ? parseInt(part, 16) : parseInt(part, 10);
    if (!Number.isNaN(num)) ids.push(num & 0xFF);
  }
  return ids.length > 0 ? ids : undefined;
}

class FoMServer {
  private udpServer: UDPServer;
  private connectionManager: ConnectionManager;
  private packetHandler: PacketHandler;
  private packetLogger: PacketLogger;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(port: number = DEFAULT_PORT) {
    this.udpServer = new UDPServer(port);
    this.connectionManager = new ConnectionManager();
    this.packetHandler = new PacketHandler();
    const consoleMode = parseConsoleMode(process.env.PACKET_LOG);
    const consoleMinIntervalMs = Math.max(0, parseInt(process.env.PACKET_LOG_INTERVAL_MS || '5000', 10) || 0);
    const logToFile = parseBool(process.env.PACKET_LOG_FILE, true);
    const analysisEnabled = parseBool(process.env.PACKET_LOG_ANALYSIS, false);
    const consolePacketIds = parsePacketIds(process.env.PACKET_LOG_IDS);
    const consoleRepeatSuppressMs = Math.max(0, parseInt(process.env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0);
    this.packetLogger = new PacketLogger({
      console: consoleMode !== 'off',
      file: logToFile,
      consoleMode,
      consoleMinIntervalMs,
      consolePacketIds,
      analysis: analysisEnabled,
      consoleRepeatSuppressMs,
    });
    
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
    
    const incomingLogged = this.packetLogger.log(incomingPacket);
    this.packetLogger.logAnalysis(incomingPacket, incomingLogged);

    if (connection.state === ConnectionState.DISCONNECTED) {
      connection.state = ConnectionState.CONNECTING;
    }

    const firstByte = data[0];
    
    // Handle ACK packets (0x80-0xBF) - just log them
    if ((firstByte & 0x80) === 0x80 && (firstByte & 0x40) === 0) {
      return;
    }

    const ctx: PacketContext = {
      connection,
      data,
      reader: new BitStreamReader(data),
    };

    try {
      const response = this.packetHandler.handlePacket(ctx);
      
      // Send ACK for reliable packets (0x40-0x7F)
      if ((firstByte & 0x40) === 0x40 && (firstByte & 0x80) === 0) {
        const ack = this.packetHandler.buildAck(connection);
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
        this.udpServer.send(ack, rinfo.port, rinfo.address)
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

        this.udpServer.send(response, rinfo.port, rinfo.address)
          .catch((err) => {
            console.error(`[FoMServer] Send error:`, err);
          });
      }
    } catch (err) {
      console.error(`[FoMServer] Error handling packet:`, err);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const timedOut = this.connectionManager.cleanupTimedOut();
      if (timedOut.length > 0) {
        console.log(`[FoMServer] Cleaned up ${timedOut.length} timed-out connections`);
      }
    }, 10000);
  }

  async start(): Promise<void> {
    console.log('='.repeat(50));
    console.log('  Face of Mankind Server Emulator');
    console.log('  For game preservation purposes');
    console.log('='.repeat(50));
    
    await this.udpServer.start();
    this.startCleanupTimer();
    
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
    this.packetLogger.close();
    await this.udpServer.stop();
    console.log('[FoMServer] Stopped');
  }
}

async function main() {
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  const server = new FoMServer(port);

  process.on('SIGINT', async () => {
    console.log('\n[FoMServer] Shutting down...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (err) {
    console.error('[FoMServer] Failed to start:', err);
    process.exit(1);
  }
}

main();
