import * as fs from 'fs';
import * as path from 'path';

export enum PacketDirection {
  INCOMING = 'RECV',
  OUTGOING = 'SEND',
}

export interface LoggedPacket {
  timestamp: Date;
  direction: PacketDirection;
  address: string;
  port: number;
  data: Buffer;
  connectionId?: number;
}

export class PacketLogger {
  private logFile: fs.WriteStream | null = null;
  private logToConsole: boolean;
  private logToFile: boolean;
  private logDir: string;
  private packetCount: number = 0;
  private consoleMode: 'off' | 'summary' | 'full';
  private consoleMinIntervalMs: number;
  private lastConsoleLogMs: number = 0;
  private consolePacketIds: Set<number> | null;
  private analysisEnabled: boolean;
  private consoleRepeatSuppressMs: number;
  private repeatState: Map<string, { lastLoggedMs: number; suppressed: number }>;

  constructor(options: { console?: boolean; file?: boolean; logDir?: string; consoleMode?: 'off' | 'summary' | 'full'; consoleMinIntervalMs?: number; consolePacketIds?: number[]; analysis?: boolean; consoleRepeatSuppressMs?: number } = {}) {
    this.logToConsole = options.console ?? true;
    this.logToFile = options.file ?? true;
    this.logDir = options.logDir ?? './logs';
    this.consoleMode = options.consoleMode ?? (this.logToConsole ? 'full' : 'off');
    this.consoleMinIntervalMs = Math.max(0, options.consoleMinIntervalMs ?? 0);
    this.consolePacketIds = options.consolePacketIds && options.consolePacketIds.length > 0 ? new Set(options.consolePacketIds) : null;
    this.analysisEnabled = options.analysis ?? true;
    this.consoleRepeatSuppressMs = Math.max(0, options.consoleRepeatSuppressMs ?? 2000);
    this.repeatState = new Map();
    if (this.consoleMode === 'off') {
      this.logToConsole = false;
    }
    
    if (this.logToFile) {
      this.initLogFile();
    }
  }

  private initLogFile(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(this.logDir, `packets_${timestamp}.log`);
    this.logFile = fs.createWriteStream(filename, { flags: 'a' });
    
    this.logFile.write(`# FoM Packet Log - Started ${new Date().toISOString()}\n`);
    this.logFile.write(`# Format: [#] [TIME] [DIR] [ADDR:PORT] [LEN] [HEX...]\n`);
    this.logFile.write('#'.repeat(80) + '\n\n');
    
    console.log(`[PacketLogger] Logging to ${filename}`);
  }

  log(packet: LoggedPacket): boolean {
    this.packetCount++;
    
    const entry = this.formatPacket(packet);
    
    const consoleDecision = this.shouldLogConsole(packet);
    if (consoleDecision.log) {
      if (consoleDecision.suppressed > 0) {
        console.log(`[PacketLogger] Suppressed ${consoleDecision.suppressed} repeats of ${consoleDecision.signature}`);
      }
      if (this.consoleMode === 'summary') {
        this.logToConsoleSummary(packet);
      } else {
        this.logToConsoleFormatted(packet);
      }
    }
    
    if (this.logToFile && this.logFile) {
      this.logFile.write(entry + '\n\n');
    }
    
    return consoleDecision.log;
  }

  private formatPacket(packet: LoggedPacket): string {
    const lines: string[] = [];
    const time = packet.timestamp.toISOString();
    const dir = packet.direction;
    const addr = `${packet.address}:${packet.port}`;
    const connId = packet.connectionId ? ` [Conn#${packet.connectionId}]` : '';
    
    lines.push(`[${this.packetCount}] ${time} ${dir} ${addr}${connId} (${packet.data.length} bytes)`);
    lines.push(this.hexDump(packet.data));
    
    return lines.join('\n');
  }

  private logToConsoleFormatted(packet: LoggedPacket): void {
    const dir = packet.direction === PacketDirection.INCOMING ? '\x1b[32mRECV\x1b[0m' : '\x1b[34mSEND\x1b[0m';
    const addr = `${packet.address}:${packet.port}`;
    const connId = packet.connectionId ? ` [Conn#${packet.connectionId}]` : '';
    
    console.log(`\n[${this.packetCount}] ${dir} ${addr}${connId} (${packet.data.length} bytes)`);
    console.log(this.hexDumpColored(packet.data));
  }

  private logToConsoleSummary(packet: LoggedPacket): void {
    const dir = packet.direction === PacketDirection.INCOMING ? 'RECV' : 'SEND';
    const addr = `${packet.address}:${packet.port}`;
    const connId = packet.connectionId ? ` [Conn#${packet.connectionId}]` : '';
    const firstByte = packet.data.length > 0 ? ` id=0x${packet.data[0].toString(16).padStart(2, '0')}` : '';
    
    console.log(`[${this.packetCount}] ${dir} ${addr}${connId} (${packet.data.length} bytes)${firstByte}`);
  }

  private shouldLogConsole(packet: LoggedPacket): { log: boolean; suppressed: number; signature: string } {
    const signature = this.consoleSignature(packet);
    if (!this.logToConsole || this.consoleMode === 'off') return { log: false, suppressed: 0, signature };
    if (this.consolePacketIds) {
      if (packet.data.length === 0) return { log: false, suppressed: 0, signature };
      const packetId = packet.data[0];
      if (!this.consolePacketIds.has(packetId)) return { log: false, suppressed: 0, signature };
    }
    const now = Date.now();
    if (this.consoleMinIntervalMs > 0 && (now - this.lastConsoleLogMs) < this.consoleMinIntervalMs) {
      return { log: false, suppressed: 0, signature };
    }
    if (this.consoleRepeatSuppressMs > 0) {
      const state = this.repeatState.get(signature);
      if (state && (now - state.lastLoggedMs) < this.consoleRepeatSuppressMs) {
        state.suppressed += 1;
        this.repeatState.set(signature, state);
        return { log: false, suppressed: 0, signature };
      }
      const suppressed = state ? state.suppressed : 0;
      this.repeatState.set(signature, { lastLoggedMs: now, suppressed: 0 });
      this.lastConsoleLogMs = now;
      return { log: true, suppressed, signature };
    }
    this.lastConsoleLogMs = now;
    return { log: true, suppressed: 0, signature };
  }

  private consoleSignature(packet: LoggedPacket): string {
    const connId = packet.connectionId ? `#${packet.connectionId}` : 'no-conn';
    const firstByte = packet.data.length > 0 ? `0x${packet.data[0].toString(16).padStart(2, '0')}` : 'none';
    return `${packet.direction}|${packet.address}:${packet.port}|${connId}|len=${packet.data.length}|id=${firstByte}`;
  }

  private hexDump(buffer: Buffer, bytesPerLine: number = 16): string {
    const lines: string[] = [];
    
    for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
      const slice = buffer.subarray(offset, Math.min(offset + bytesPerLine, buffer.length));
      
      const hex = Array.from(slice)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      const ascii = Array.from(slice)
        .map(b => (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : '.')
        .join('');
      
      const offsetStr = offset.toString(16).padStart(4, '0');
      const hexPadded = hex.padEnd(bytesPerLine * 3 - 1, ' ');
      
      lines.push(`  ${offsetStr}  ${hexPadded}  |${ascii}|`);
    }
    
    return lines.join('\n');
  }

  private hexDumpColored(buffer: Buffer, bytesPerLine: number = 16): string {
    const lines: string[] = [];
    
    for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
      const slice = buffer.subarray(offset, Math.min(offset + bytesPerLine, buffer.length));
      
      const hexParts: string[] = [];
      const asciiParts: string[] = [];
      
      for (const b of slice) {
        if (b === 0x00) {
          hexParts.push(`\x1b[90m${b.toString(16).padStart(2, '0')}\x1b[0m`);
          asciiParts.push('\x1b[90m.\x1b[0m');
        } else if (b >= 0x20 && b <= 0x7e) {
          hexParts.push(`\x1b[33m${b.toString(16).padStart(2, '0')}\x1b[0m`);
          asciiParts.push(`\x1b[33m${String.fromCharCode(b)}\x1b[0m`);
        } else {
          hexParts.push(b.toString(16).padStart(2, '0'));
          asciiParts.push('.');
        }
      }
      
      const offsetStr = `\x1b[36m${offset.toString(16).padStart(4, '0')}\x1b[0m`;
      const hex = hexParts.join(' ');
      const paddingNeeded = bytesPerLine - slice.length;
      const padding = paddingNeeded > 0 ? '   '.repeat(paddingNeeded) : '';
      
      lines.push(`  ${offsetStr}  ${hex}${padding}  |${asciiParts.join('')}|`);
    }
    
    return lines.join('\n');
  }

  logAnalysis(packet: LoggedPacket, consoleLogged: boolean = true): void {
    if (!this.analysisEnabled || !this.logToConsole || !consoleLogged) return;
    const data = packet.data;
    if (data.length < 4) return;

    const analysis: string[] = [];
    const firstByte = data[0];
    
    const firstDword = data.readUInt32LE(0);
    if (firstDword === 0x9919D9C7) {
      analysis.push('  \x1b[35m→ Connection Magic detected (0x9919D9C7)\x1b[0m');
      if (data.length > 4) {
        const typeBits = (data[4] & 0x07);
        const typeNames: Record<number, string> = { 1: 'QUERY', 2: 'CONNECT', 3: 'CONNECT_RESPONSE' };
        analysis.push(`  \x1b[35m→ Request Type: ${typeBits} (${typeNames[typeBits] || 'UNKNOWN'})\x1b[0m`);
      }
    } else if ((firstByte & 0x80) === 0x80 && (firstByte & 0x40) === 0) {
      analysis.push('  \x1b[36m→ ACK Packet (0x80)\x1b[0m');
      if (data.length >= 17) {
        const timestamp = data.readUInt32LE(5);
        const msgNum = data.readUInt32BE(13);
        analysis.push(`  \x1b[36m→ Timestamp: ${timestamp}, MsgNum: ${msgNum}\x1b[0m`);
      }
    } else if ((firstByte & 0x40) === 0x40) {
      analysis.push('  \x1b[33m→ RELIABLE Packet\x1b[0m');
      if (data.length >= 18) {
        const timestamp = data.readUInt32LE(5);
        const orderingInfo = data.readUInt32BE(9);
        const lengthInfo = data.readUInt32BE(13);
        const innerMsgId = data[17];
        
        const knownInner: Record<number, string> = {
          0x04: 'ID_CONNECTION_REQUEST',
          0x0E: 'ID_CONNECTION_REQUEST_ACCEPTED',
          0x11: 'ID_NEW_INCOMING_CONNECTION',
        };
        const innerName = knownInner[innerMsgId] || `0x${innerMsgId.toString(16)}`;
        
        analysis.push(`  \x1b[33m→ Timestamp: ${timestamp}, Ordering: 0x${orderingInfo.toString(16)}\x1b[0m`);
        analysis.push(`  \x1b[33m→ LengthInfo: 0x${lengthInfo.toString(16)}, Inner: ${innerName}\x1b[0m`);
      }
    } else {
      const packetId = data[0];
      const knownPackets: Record<number, string> = {
        0x00: 'ID_INTERNAL_PING',
        0x01: 'ID_PING',
        0x03: 'ID_CONNECTED_PONG',
        0x04: 'ID_CONNECTION_REQUEST',
        0x09: 'ID_OPEN_CONNECTION_REQUEST',
        0x0A: 'ID_OPEN_CONNECTION_REPLY',
        0x0E: 'ID_CONNECTION_REQUEST_ACCEPTED',
        0x13: 'ID_DISCONNECTION_NOTIFICATION',
        0x14: 'ID_CONNECTION_LOST',
        0x6D: 'ID_LOGIN_REQUEST_RETURN',
      };
      const packetName = knownPackets[packetId] || `UNKNOWN (0x${packetId.toString(16)})`;
      analysis.push(`  \x1b[35m→ Packet ID: ${packetName}\x1b[0m`);
    }

    if (analysis.length > 0 && this.logToConsole) {
      console.log(analysis.join('\n'));
    }
  }

  close(): void {
    if (this.logFile) {
      this.logFile.write(`\n# Log ended ${new Date().toISOString()}\n`);
      this.logFile.write(`# Total packets: ${this.packetCount}\n`);
      this.logFile.end();
      this.logFile = null;
    }
  }
}
