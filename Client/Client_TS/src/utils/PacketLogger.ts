import * as fs from 'fs';
import * as path from 'path';
import {
  PacketInspectorBridge,
  type PacketLogConfig,
  type PacketInspectorTarget,
  type ConsoleMode,
  type PacketDirection as InspectorDirection,
} from '@openfom/networking';

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

type FlushMode = 'off' | 'login' | 'always';

export class PacketLogger {
  private static globalInstance: PacketLogger | null = null;
  private static processHooksInstalled = false;
  private logFile: fs.WriteStream | null = null;
  private logToConsole: boolean;
  private logToFile: boolean;
  private logDir: string;
  private consoleMode: ConsoleMode;
  private consoleMinIntervalMs: number;
  private consoleRepeatSuppressMs: number;
  private bridge: PacketInspectorBridge | null;
  private flushMode: FlushMode;

  constructor(options: {
    console?: boolean;
    file?: boolean;
    logDir?: string;
    consoleMode?: ConsoleMode;
    consoleMinIntervalMs?: number;
    consolePacketIds?: number[];
    filePacketIds?: number[];
    ignorePacketIds?: number[];
    analysis?: boolean;
    consoleRepeatSuppressMs?: number;
    flushMode?: FlushMode;
  } = {}) {
    this.logToConsole = options.console ?? true;
    this.logToFile = options.file ?? true;
    this.logDir = options.logDir ?? './logs';
    this.consoleMode = options.consoleMode ?? (this.logToConsole ? 'full' : 'off');
    this.consoleMinIntervalMs = Math.max(0, options.consoleMinIntervalMs ?? 0);
    this.consoleRepeatSuppressMs = Math.max(0, options.consoleRepeatSuppressMs ?? 2000);
    this.flushMode = options.flushMode ?? 'off';

    if (this.consoleMode === 'off') {
      this.logToConsole = false;
    }

    const config: PacketLogConfig = {
      consoleMinIntervalMs: this.consoleMinIntervalMs,
      consoleRepeatSuppressMs: this.consoleRepeatSuppressMs,
      consolePacketIds: options.consolePacketIds,
      filePacketIds: options.filePacketIds,
      ignorePacketIds: options.ignorePacketIds,
    };
    this.bridge = PacketInspectorBridge.create(config);
    if (!this.bridge) {
      this.logToConsole = false;
      this.logToFile = false;
      // eslint-disable-next-line no-console
      console.warn('[PacketLogger] PacketInspector.dll not ready; logging disabled');
      return;
    }

    if (this.logToFile) {
      this.initLogFile();
    }
  }

  static setGlobal(logger: PacketLogger): void {
    PacketLogger.globalInstance = logger;
    PacketLogger.installProcessHooks();
  }

  static globalNote(message: string, toConsole: boolean = false): void {
    PacketLogger.globalInstance?.logNote(message, toConsole);
  }

  logNote(message: string, toConsole: boolean = false): void {
    const time = this.formatTimestamp(new Date());
    const line = `[NOTE] [${time}] ${message}`;
    if (this.logToFile && this.logFile) {
      this.logFile.write(`${line}\n`);
    }
    if (toConsole && this.logToConsole) {
      this.safeConsoleLog(line);
    }
  }

  private initLogFile(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const latestName = path.join(this.logDir, 'fom_client.log');
    if (fs.existsSync(latestName)) {
      const stamp = this.formatTimestamp(new Date()).replace(':', '.');
      const rotated = path.join(this.logDir, `packets_${stamp}.log`);
      try {
        fs.renameSync(latestName, rotated);
      } catch {
        // ignore rotate failures
      }
    }

    this.logFile = fs.createWriteStream(latestName, { flags: 'w' });
    this.logFile.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(`[PacketLogger] Log file error: ${err.message}`);
    });
    this.safeConsoleLog(`[PacketLogger] Logging to ${latestName}`);
  }

  private static installProcessHooks(): void {
    if (PacketLogger.processHooksInstalled) return;
    PacketLogger.processHooksInstalled = true;

    const logEvent = (label: string, detail?: unknown, fatal: boolean = false): void => {
      PacketLogger.globalInstance?.logProcessEvent(label, detail, fatal);
    };
    const disableConsole = (): void => {
      PacketLogger.globalInstance?.disableConsoleLogging();
    };

    process.on('beforeExit', (code) => logEvent(`beforeExit code=${code}`));
    process.on('exit', (code) => logEvent(`exit code=${code}`));
    process.on('SIGINT', () => {
      logEvent('SIGINT');
      PacketLogger.globalInstance?.close();
      process.exit(130);
    });
    process.on('SIGTERM', () => {
      logEvent('SIGTERM');
      PacketLogger.globalInstance?.close();
      process.exit(143);
    });
    process.on('uncaughtException', (err) => {
      logEvent('uncaughtException', err, true);
      PacketLogger.globalInstance?.close();
      throw err;
    });
    process.on('unhandledRejection', (reason) => {
      logEvent('unhandledRejection', reason, true);
    });

    if (process.stdout) {
      process.stdout.on('error', (err: NodeJS.ErrnoException) => {
        if (err?.code === 'EPIPE') {
          disableConsole();
          return;
        }
        logEvent('stdout error', err, false);
      });
    }
    if (process.stderr) {
      process.stderr.on('error', (err: NodeJS.ErrnoException) => {
        if (err?.code === 'EPIPE') {
          disableConsole();
          return;
        }
        logEvent('stderr error', err, false);
      });
    }
  }

  private logProcessEvent(label: string, detail?: unknown, fatal: boolean = false): void {
    const time = this.formatTimestamp(new Date());
    const detailText = detail !== undefined ? ` ${this.formatProcessDetail(detail)}` : '';
    const line = `[PROCESS] [${time}] ${label}${detailText}`;
    if (this.logToFile && this.logFile) {
      this.logFile.write(`${line}\n`);
      this.flushLogFile();
    }
    if (fatal && this.logToConsole) {
      this.safeConsoleError(line);
      if (detail instanceof Error && detail.stack) {
        this.safeConsoleError(detail.stack);
      }
    }
  }

  private formatProcessDetail(detail: unknown): string {
    if (detail instanceof Error) {
      const message = detail.message || String(detail);
      const stack = detail.stack ? detail.stack.split('\n').slice(0, 2).join(' | ') : '';
      return stack ? `${message} (${stack})` : message;
    }
    return String(detail);
  }

  log(packet: LoggedPacket): boolean {
    if (!this.bridge) return false;
    const direction: InspectorDirection =
      packet.direction === PacketDirection.INCOMING ? 'RECV' : 'SEND';
    const formattedConsole = this.logToConsole && this.consoleMode !== 'off'
      ? this.bridge.format({
          data: packet.data,
          length: packet.data.length,
          direction,
          address: packet.address,
          port: packet.port,
          connectionId: packet.connectionId,
        }, 'console', this.consoleMode)
      : null;

    if (formattedConsole) {
      this.safeConsoleLog(this.ensureTrailingNewline(formattedConsole));
    }

    if (this.logToFile && this.logFile) {
      const formattedFile = this.bridge.format({
        data: packet.data,
        length: packet.data.length,
        direction,
        address: packet.address,
        port: packet.port,
        connectionId: packet.connectionId,
      }, 'file', this.consoleMode);
      if (formattedFile) {
        this.logFile.write(this.ensureTrailingNewline(formattedFile));
        if (this.flushMode === 'always') {
          this.flushLogFile();
        }
      }
    }

    return Boolean(formattedConsole);
  }

  logAnalysis(_packet: LoggedPacket, _consoleLogged: boolean = true): void {
    // PacketInspector handles decoding and formatting; analysis stays in the DLL.
  }

  close(): void {
    if (this.logFile) {
      try {
        this.logFile.end();
      } catch {
        // ignore
      }
      this.logFile = null;
    }
  }

  private ensureTrailingNewline(text: string): string {
    return text.endsWith('\n') ? text : `${text}\n`;
  }

  private formatTimestamp(date: Date): string {
    const pad = (value: number, size: number) => value.toString().padStart(size, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1, 2);
    const day = pad(date.getDate(), 2);
    const hour = pad(date.getHours(), 2);
    const minute = pad(date.getMinutes(), 2);
    const second = pad(date.getSeconds(), 2);
    const ms = pad(date.getMilliseconds(), 3);
    return `${year}.${month}.${day}-${hour}.${minute}.${second}:${ms}`;
  }

  private flushLogFile(): void {
    if (!this.logFile) return;
    const fd = (this.logFile as unknown as { fd?: number | null }).fd;
    if (typeof fd !== 'number') return;
    try {
      // fs.fsyncSync(fd);
    } catch {
      // ignore fsync failures
    }
  }

  private disableConsoleLogging(): void {
    this.logToConsole = false;
  }

  private safeConsoleLog(message: string): void {
    if (!this.logToConsole) return;
    if (process.stdout && !process.stdout.writable) {
      this.logToConsole = false;
      return;
    }
    try {
      // eslint-disable-next-line no-console
      console.log(message);
    } catch (err) {
      if ((err as { code?: string })?.code === 'EPIPE') {
        this.logToConsole = false;
        return;
      }
      throw err;
    }
  }

  private safeConsoleError(message: string): void {
    if (!this.logToConsole) return;
    if (process.stderr && !process.stderr.writable) {
      this.logToConsole = false;
      return;
    }
    try {
      // eslint-disable-next-line no-console
      console.error(message);
    } catch (err) {
      if ((err as { code?: string })?.code === 'EPIPE') {
        this.logToConsole = false;
        return;
      }
      throw err;
    }
  }
}
