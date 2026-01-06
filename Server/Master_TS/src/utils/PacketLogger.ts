import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

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
    private static globalInstance: PacketLogger | null = null;
    private static processHooksInstalled = false;
    private static consoleMirrorInstalled = false;
    private static consoleMirrorEcho = true;
    private static pendingConsoleNotes: string[] = [];
    private static originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
    };
    private logFile: fs.WriteStream | null = null;
    private logToConsole: boolean;
    private logToFile: boolean;
    private logDir: string;
    private packetCount: number = 0;
    private consoleMode: 'off' | 'summary' | 'full';
    private consoleMinIntervalMs: number;
    private lastConsoleLogMs: number = 0;
    private consolePacketIds: Set<number> | null;
    private filePacketIds: Set<number> | null;
    private ignorePacketIds: Set<number> | null;
    private analysisEnabled: boolean;
    private consoleRepeatSuppressMs: number;
    private repeatState: Map<string, { lastLoggedMs: number; suppressed: number }>;
    private flushMode: 'off' | 'login' | 'always';
    private assumePayload: boolean;

    constructor(
        options: {
            console?: boolean;
            file?: boolean;
            logDir?: string;
            consoleMode?: 'off' | 'summary' | 'full';
            consoleMinIntervalMs?: number;
            consolePacketIds?: number[];
            filePacketIds?: number[];
            ignorePacketIds?: number[];
            analysis?: boolean;
            consoleRepeatSuppressMs?: number;
            flushMode?: 'off' | 'login' | 'always';
            assumePayload?: boolean;
        } = {},
    ) {
        this.logToConsole = options.console ?? true;
        this.logToFile = options.file ?? true;
        this.logDir = options.logDir ?? './logs';
        this.consoleMode = options.consoleMode ?? (this.logToConsole ? 'full' : 'off');
        this.consoleMinIntervalMs = Math.max(0, options.consoleMinIntervalMs ?? 0);
        this.consolePacketIds =
            options.consolePacketIds && options.consolePacketIds.length > 0
                ? new Set(options.consolePacketIds)
                : null;
        this.filePacketIds =
            options.filePacketIds && options.filePacketIds.length > 0
                ? new Set(options.filePacketIds)
                : null;
        this.ignorePacketIds =
            options.ignorePacketIds && options.ignorePacketIds.length > 0
                ? new Set(options.ignorePacketIds)
                : null;
        this.analysisEnabled = options.analysis ?? true;
        this.consoleRepeatSuppressMs = Math.max(0, options.consoleRepeatSuppressMs ?? 2000);
        this.repeatState = new Map();
        this.flushMode = options.flushMode ?? 'off';
        this.assumePayload = options.assumePayload ?? false;
        if (this.consoleMode === 'off') {
            this.logToConsole = false;
        }

        if (this.logToFile) {
            this.initLogFile();
        }
    }

    static setGlobal(logger: PacketLogger): void {
        PacketLogger.globalInstance = logger;
        PacketLogger.installProcessHooks();
        if (PacketLogger.pendingConsoleNotes.length > 0) {
            for (const line of PacketLogger.pendingConsoleNotes) {
                logger.logConsoleMirror(line);
            }
            PacketLogger.pendingConsoleNotes = [];
        }
    }

    static globalNote(message: string, toConsole: boolean = false): void {
        PacketLogger.globalInstance?.logNote(message, toConsole);
    }

    static installConsoleMirror(options: { echoToConsole?: boolean } = {}): void {
        PacketLogger.consoleMirrorEcho = options.echoToConsole ?? true;
        if (PacketLogger.consoleMirrorInstalled) return;
        PacketLogger.consoleMirrorInstalled = true;
        const wrap = (level: 'log' | 'warn' | 'error', original: (...args: unknown[]) => void) => {
            return (...args: unknown[]) => {
                const raw = util.format(...args);
                const sanitized = PacketLogger.stripAnsi(raw);
                if (PacketLogger.shouldMirrorConsoleLine(sanitized)) {
                    const note = sanitized;
                    if (PacketLogger.globalInstance) {
                        PacketLogger.globalInstance.logConsoleMirror(note);
                    } else {
                        PacketLogger.pendingConsoleNotes.push(note);
                        if (PacketLogger.pendingConsoleNotes.length > 200) {
                            PacketLogger.pendingConsoleNotes.shift();
                        }
                    }
                }
                if (PacketLogger.consoleMirrorEcho) {
                    original(...args);
                }
            };
        };
        console.log = wrap('log', PacketLogger.originalConsole.log);
        console.warn = wrap('warn', PacketLogger.originalConsole.warn);
        console.error = wrap('error', PacketLogger.originalConsole.error);
    }

    static setConsoleMirrorEcho(echoToConsole: boolean): void {
        PacketLogger.consoleMirrorEcho = echoToConsole;
    }

    logNote(message: string, toConsole: boolean = false): void {
        const time = this.formatTimestamp(new Date());
        const line = `[NOTE] [${time}] ${message}`;
        if (this.logToFile && this.logFile) {
            this.logFile.write(line + '\n');
        }
        if (toConsole && this.logToConsole) {
            console.log(line);
        }
    }

    private logConsoleMirror(message: string): void {
        const time = this.formatTimestamp(new Date());
        const line = `[${time}] ${message}`;
        if (this.logToFile && this.logFile) {
            this.logFile.write(line + '\n');
        }
    }

    private initLogFile(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        const latestName = path.join(this.logDir, 'fom_server.log');
        if (fs.existsSync(latestName)) {
            const stamp = this.formatTimestamp(new Date()).replace(':', '.');
            const rotated = path.join(this.logDir, `packets_${stamp}.log`);
            try {
                fs.renameSync(latestName, rotated);
            } catch {
                // ignore rotate failures; we'll reuse the existing log file
            }
        }

        this.logFile = fs.createWriteStream(latestName, { flags: 'w' });
        this.logFile.on('error', (err) => {
            console.error(`[PacketLogger] Log file error: ${err.message}`);
        });

        this.logFile.write(`# FoM Packet Log - Started ${this.formatTimestamp(new Date())}\n`);
        this.logFile.write(`# Format: [#] [TIME] [DIR] [ADDR:PORT] [LEN] [HEX...]\n`);
        this.logFile.write('#'.repeat(80) + '\n\n');

        console.log(`[PacketLogger] Logging to ${latestName}`);
    }

    private static stripAnsi(value: string): string {
        return value.replace(/\x1b\[[0-9;]*m/g, '');
    }

    private static shouldMirrorConsoleLine(line: string): boolean {
        const trimmed = line.trimStart();
        if (!trimmed) return false;
        if (trimmed.startsWith('[NOTE]') || trimmed.startsWith('[PROCESS]')) return false;
        if (/^\[\d+\]\s+(RECV|SEND)\b/.test(trimmed)) return false;
        if (/^(RECV|SEND)\b/.test(trimmed)) return false;
        if (/^[0-9a-fA-F]{4}\s{2}/.test(trimmed)) return false;
        return true;
    }

    private static installProcessHooks(): void {
        if (PacketLogger.processHooksInstalled) return;
        PacketLogger.processHooksInstalled = true;

        const logEvent = (label: string, detail?: unknown, fatal: boolean = false): void => {
            PacketLogger.globalInstance?.logProcessEvent(label, detail, fatal);
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
    }

    private logProcessEvent(label: string, detail?: unknown, fatal: boolean = false): void {
        const time = this.formatTimestamp(new Date());
        const detailText = detail !== undefined ? ` ${this.formatProcessDetail(detail)}` : '';
        const line = `[PROCESS] [${time}] ${label}${detailText}`;
        if (this.logToFile && this.logFile) {
            this.logFile.write(line + '\n');
            this.flushLogFile();
        }
        if (fatal && this.logToConsole) {
            console.error(line);
            if (detail instanceof Error && detail.stack) {
                console.error(detail.stack);
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
        this.packetCount++;

        const entry = this.formatPacket(packet);

        const consoleDecision = this.shouldLogConsole(packet);
        if (consoleDecision.log) {
            if (consoleDecision.suppressed > 0) {
                console.log(
                    `[PacketLogger] Suppressed ${consoleDecision.suppressed} repeats of ${consoleDecision.signature}`,
                );
            }
            if (this.consoleMode === 'summary') {
                this.logToConsoleSummary(packet);
            } else {
                this.logToConsoleFormatted(packet);
            }
        }

        if (this.shouldLogFile(packet) && this.logFile) {
            const shouldFlush = this.shouldFlush(packet);
            if (shouldFlush) {
                this.logFile.write(entry + '\n\n', () => this.flushLogFile());
            } else {
                this.logFile.write(entry + '\n\n');
            }
        }

        return consoleDecision.log;
    }

    private formatPacket(packet: LoggedPacket): string {
        const lines: string[] = [];
        const time = this.formatTimestamp(packet.timestamp);
        const dir = packet.direction;
        const addr = `${packet.address}:${packet.port}`;
        const connId = packet.connectionId ? ` [Conn#${packet.connectionId}]` : '';

        lines.push(
            `[${this.packetCount}] [${time}] ${dir} ${addr}${connId} (${packet.data.length} bytes)`,
        );
        lines.push(this.hexDump(packet.data));

        return lines.join('\n');
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

    private logToConsoleFormatted(packet: LoggedPacket): void {
        const dir =
            packet.direction === PacketDirection.INCOMING
                ? '\x1b[32mRECV\x1b[0m'
                : '\x1b[34mSEND\x1b[0m';
        const addr = `${packet.address}:${packet.port}`;
        const connId = packet.connectionId ? ` [Conn#${packet.connectionId}]` : '';

        console.log(
            `\n[${this.packetCount}] ${dir} ${addr}${connId} (${packet.data.length} bytes)`,
        );
        console.log(this.hexDumpColored(packet.data));
    }

    private logToConsoleSummary(packet: LoggedPacket): void {
        const dir = packet.direction === PacketDirection.INCOMING ? 'RECV' : 'SEND';
        const addr = `${packet.address}:${packet.port}`;
        const connId = packet.connectionId ? ` [Conn#${packet.connectionId}]` : '';
        const firstByte =
            packet.data.length > 0 ? ` id=0x${packet.data[0].toString(16).padStart(2, '0')}` : '';

        console.log(
            `[${this.packetCount}] ${dir} ${addr}${connId} (${packet.data.length} bytes)${firstByte}`,
        );
    }

    private shouldLogConsole(packet: LoggedPacket): {
        log: boolean;
        suppressed: number;
        signature: string;
    } {
        const signature = this.consoleSignature(packet);
        if (!this.logToConsole || this.consoleMode === 'off')
            return { log: false, suppressed: 0, signature };
        const effectiveId = this.getEffectiveId(packet);
        const forceLogin =
            this.containsLoginMarker(packet.data) ||
            effectiveId === 0x6c ||
            effectiveId === 0x6d ||
            effectiveId === 0x6e ||
            effectiveId === 0x6f ||
            effectiveId === 0x70 ||
            effectiveId === 0x72 ||
            effectiveId === 0x73 ||
            effectiveId === 0x7b;
        if (this.ignorePacketIds && effectiveId !== null && this.ignorePacketIds.has(effectiveId)) {
            return { log: false, suppressed: 0, signature };
        }
        if (this.consolePacketIds) {
            if (effectiveId === null) return { log: false, suppressed: 0, signature };
            if (!this.consolePacketIds.has(effectiveId))
                return { log: false, suppressed: 0, signature };
        }
        if (forceLogin) {
            return { log: true, suppressed: 0, signature };
        }
        const now = Date.now();
        if (
            this.consoleMinIntervalMs > 0 &&
            now - this.lastConsoleLogMs < this.consoleMinIntervalMs
        ) {
            return { log: false, suppressed: 0, signature };
        }
        if (this.consoleRepeatSuppressMs > 0) {
            const state = this.repeatState.get(signature);
            if (state && now - state.lastLoggedMs < this.consoleRepeatSuppressMs) {
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

    private shouldLogFile(packet: LoggedPacket): boolean {
        if (!this.logToFile || !this.logFile) return false;
        const effectiveId = this.getEffectiveId(packet);
        if (this.ignorePacketIds && effectiveId !== null && this.ignorePacketIds.has(effectiveId))
            return false;
        if (this.filePacketIds) {
            if (effectiveId === null) return false;
            if (!this.filePacketIds.has(effectiveId)) return false;
        }
        return true;
    }

    private shouldFlush(packet: LoggedPacket): boolean {
        if (this.flushMode === 'always') return true;
        if (this.flushMode !== 'login') return false;
        return this.containsLoginMarker(packet.data);
    }

    private containsLoginMarker(buffer: Buffer): boolean {
        for (let i = 0; i < buffer.length; i += 1) {
            const b = buffer[i];
            if (
                b === 0x6c ||
                b === 0x6d ||
                b === 0x6e ||
                b === 0x6f ||
                b === 0x70 ||
                b === 0x72 ||
                b === 0x73 ||
                b === 0x7b
            )
                return true;
        }
        return false;
    }

    private flushLogFile(): void {
        if (!this.logFile) return;
        const fd = (this.logFile as unknown as { fd?: number | null }).fd;
        if (typeof fd !== 'number') return;
        try {
            // fs.fsyncSync(fd);
            // Disabled: synchronous fsync blocks the event loop and stalls UDP handling.
        } catch {
            // ignore fsync failures
        }
    }

    private consoleSignature(packet: LoggedPacket): string {
        const connId = packet.connectionId ? `#${packet.connectionId}` : 'no-conn';
        const effectiveId = this.getEffectiveId(packet);
        const idTag =
            effectiveId !== null ? `0x${effectiveId.toString(16).padStart(2, '0')}` : 'none';
        return `${packet.direction}|${packet.address}:${packet.port}|${connId}|len=${packet.data.length}|id=${idTag}`;
    }

    private getEffectiveId(packet: LoggedPacket): number | null {
        if (packet.data.length === 0) return null;
        const firstByte = packet.data[0];
        if (this.assumePayload) {
            return firstByte;
        }
        if ((firstByte & 0x40) === 0x40 && (firstByte & 0x80) === 0 && packet.data.length >= 18) {
            return packet.data[17];
        }
        return firstByte;
    }

    private hexDump(buffer: Buffer, bytesPerLine: number = 16): string {
        const lines: string[] = [];

        for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
            const slice = buffer.subarray(offset, Math.min(offset + bytesPerLine, buffer.length));

            const hex = Array.from(slice)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ');

            const ascii = Array.from(slice)
                .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
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
        if (data.length < 1) return;

        const analysis: string[] = [];
        const firstByte = data[0];

        if (this.assumePayload) {
            const packetId = firstByte;
            const knownPackets: Record<number, string> = {
                0x00: 'ID_INTERNAL_PING',
                0x01: 'ID_PING',
                0x03: 'ID_CONNECTED_PONG',
                0x04: 'ID_CONNECTION_REQUEST',
                0x09: 'ID_OPEN_CONNECTION_REQUEST',
                0x0a: 'ID_OPEN_CONNECTION_REPLY',
                0x0e: 'ID_CONNECTION_REQUEST_ACCEPTED',
                0x13: 'ID_DISCONNECTION_NOTIFICATION',
                0x14: 'ID_CONNECTION_LOST',
                0x6c: 'ID_LOGIN_REQUEST',
                0x6d: 'ID_LOGIN_REQUEST_RETURN',
                0x6e: 'ID_LOGIN',
                0x6f: 'ID_LOGIN_RETURN',
                0x70: 'ID_LOGIN_TOKEN_CHECK',
                0x72: 'ID_WORLD_LOGIN',
                0x73: 'ID_WORLD_LOGIN_RETURN',
                0x7b: 'ID_WORLD_SELECT',
            };
            const packetName = knownPackets[packetId] || `UNKNOWN (0x${packetId.toString(16)})`;
            analysis.push(`  \x1b[35m→ Packet ID: ${packetName}\x1b[0m`);
            console.log(analysis.join('\n'));
            return;
        }

        const firstDword = data.readUInt32LE(0);
        if (firstDword === 0x9919d9c7) {
            analysis.push('  \x1b[35m→ Connection Magic detected (0x9919D9C7)\x1b[0m');
            if (data.length > 4) {
                const typeBits = data[4] & 0x07;
                const typeNames: Record<number, string> = {
                    1: 'QUERY',
                    2: 'CONNECT',
                    3: 'CONNECT_RESPONSE',
                };
                analysis.push(
                    `  \x1b[35m→ Request Type: ${typeBits} (${typeNames[typeBits] || 'UNKNOWN'})\x1b[0m`,
                );
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
                    0x0e: 'ID_CONNECTION_REQUEST_ACCEPTED',
                    0x11: 'ID_NEW_INCOMING_CONNECTION',
                };
                const innerName = knownInner[innerMsgId] || `0x${innerMsgId.toString(16)}`;

                analysis.push(
                    `  \x1b[33m→ Timestamp: ${timestamp}, Ordering: 0x${orderingInfo.toString(16)}\x1b[0m`,
                );
                analysis.push(
                    `  \x1b[33m→ LengthInfo: 0x${lengthInfo.toString(16)}, Inner: ${innerName}\x1b[0m`,
                );
            }
        } else {
            const packetId = data[0];
            const knownPackets: Record<number, string> = {
                0x00: 'ID_INTERNAL_PING',
                0x01: 'ID_PING',
                0x03: 'ID_CONNECTED_PONG',
                0x04: 'ID_CONNECTION_REQUEST',
                0x09: 'ID_OPEN_CONNECTION_REQUEST',
                0x0a: 'ID_OPEN_CONNECTION_REPLY',
                0x0e: 'ID_CONNECTION_REQUEST_ACCEPTED',
                0x13: 'ID_DISCONNECTION_NOTIFICATION',
                0x14: 'ID_CONNECTION_LOST',
                0x6c: 'ID_LOGIN_REQUEST',
                0x6d: 'ID_LOGIN_REQUEST_RETURN',
                0x6e: 'ID_LOGIN',
                0x6f: 'ID_LOGIN_RETURN',
                0x70: 'ID_LOGIN_TOKEN_CHECK',
                0x72: 'ID_WORLD_LOGIN',
                0x73: 'ID_WORLD_LOGIN_RETURN',
                0x7b: 'ID_WORLD_SELECT',
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
            this.flushLogFile();
            this.logFile.end();
            this.logFile = null;
        }
    }
}
