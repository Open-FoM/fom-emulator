import dgram from 'dgram';
import { EventEmitter } from 'events';
import { DEFAULT_PORT, MAX_PACKET_SIZE } from '../protocol/Constants';

export interface RemoteInfo {
  address: string;
  port: number;
  family: 'IPv4' | 'IPv6';
}

export interface UDPServerEvents {
  listening: () => void;
  message: (data: Buffer, rinfo: RemoteInfo) => void;
  error: (err: Error) => void;
  close: () => void;
}

export class UDPServer extends EventEmitter {
  private socket: dgram.Socket;
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = DEFAULT_PORT) {
    super();
    this.port = port;
    this.socket = dgram.createSocket('udp4');
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.socket.on('message', (msg, rinfo) => {
      this.emit('message', msg, rinfo as RemoteInfo);
    });

    this.socket.on('listening', () => {
      const addr = this.socket.address();
      console.log(`[UDP] Server listening on ${addr.address}:${addr.port}`);
      this.isRunning = true;
      this.emit('listening');
    });

    this.socket.on('error', (err) => {
      console.error(`[UDP] Server error:`, err);
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      console.log('[UDP] Server closed');
      this.isRunning = false;
      this.emit('close');
    });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket.bind(this.port, '0.0.0.0', () => {
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isRunning) {
        this.socket.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  send(data: Buffer, port: number, address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (data.length > MAX_PACKET_SIZE) {
        reject(new Error(`Packet too large: ${data.length} > ${MAX_PACKET_SIZE}`));
        return;
      }
      this.socket.send(data, port, address, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getAddress(): { address: string; port: number } | null {
    if (!this.isRunning) return null;
    return this.socket.address() as { address: string; port: number };
  }
}
