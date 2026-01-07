/**
 * FileLogger - File-based logging utility
 *
 * Extracted from PacketLogger to break circular dependency with Logger.
 * Provides file writing capabilities that can be used by Logger in quiet mode
 * and by PacketLogger for full packet logging.
 */

import * as fs from 'fs';
import * as path from 'path';

export class FileLogger {
    private static globalInstance: FileLogger | null = null;
    private static processHooksInstalled = false;
    private logFile: fs.WriteStream | null = null;
    private logDir: string = './logs';

    /**
     * Set the global FileLogger instance.
     * Called by PacketLogger or app initialization.
     */
    static setGlobal(logger: FileLogger): void {
        FileLogger.globalInstance = logger;
        FileLogger.installProcessHooks();
    }

    /**
     * Install process hooks for graceful shutdown.
     * Ensures log file is properly closed on exit/signals.
     */
    private static installProcessHooks(): void {
        if (FileLogger.processHooksInstalled) return;
        FileLogger.processHooksInstalled = true;

        const logEvent = (label: string, detail?: unknown, fatal: boolean = false): void => {
            FileLogger.globalInstance?.logProcessEvent(label, detail, fatal);
        };

        process.on('beforeExit', (code) => logEvent(`beforeExit code=${code}`));
        process.on('exit', (code) => logEvent(`exit code=${code}`));
        process.on('SIGINT', () => {
            logEvent('SIGINT');
            FileLogger.globalInstance?.close();
            process.exit(130);
        });
        process.on('SIGTERM', () => {
            logEvent('SIGTERM');
            FileLogger.globalInstance?.close();
            process.exit(143);
        });
        process.on('uncaughtException', (err) => {
            logEvent('uncaughtException', err, true);
            FileLogger.globalInstance?.close();
            throw err;
        });
        process.on('unhandledRejection', (reason) => {
            logEvent('unhandledRejection', reason, true);
        });
    }

    /**
     * Get the global FileLogger instance.
     */
    static getGlobal(): FileLogger | null {
        return FileLogger.globalInstance;
    }

    /**
     * Write a note to the global logger's file (if available).
     * Used by Logger in quiet mode to persist messages.
     */
    static globalNote(message: string): void {
        FileLogger.globalInstance?.logNote(message);
    }

    /**
     * Write a raw line to the global logger's file (if available).
     */
    static globalWrite(line: string): void {
        FileLogger.globalInstance?.write(line);
    }

    /**
     * Initialize the log file with optional directory.
     * Creates directory if it doesn't exist and rotates existing log.
     */
    initLogFile(logDir?: string): void {
        this.logDir = logDir ?? this.logDir;

        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        const latestName = path.join(this.logDir, 'fom_server.log');

        // Rotate existing log file
        if (fs.existsSync(latestName)) {
            const stamp = this.formatTimestamp(new Date()).replace(':', '.');
            const rotated = path.join(this.logDir, `fom_server_${stamp}.log`);
            try {
                fs.renameSync(latestName, rotated);
            } catch {
                // Ignore rotate failures; we'll reuse the existing log file
            }
        }

        this.logFile = fs.createWriteStream(latestName, { flags: 'w' });
        this.logFile.on('error', (err) => {
            console.error(`[FileLogger] Log file error: ${err.message}`);
        });
    }

    /**
     * Write a timestamped note line to the log file.
     */
    logNote(message: string): void {
        if (this.logFile) {
            const time = this.formatTimestamp(new Date());
            this.logFile.write(`[NOTE] [${time}] ${message}\n`);
        }
    }

    /**
     * Write a raw line to the log file.
     */
    write(line: string): void {
        if (this.logFile) {
            this.logFile.write(line + '\n');
        }
    }

    /**
     * Write without automatic newline.
     */
    writeRaw(content: string): void {
        if (this.logFile) {
            this.logFile.write(content);
        }
    }

    /**
     * Get the underlying write stream (for PacketLogger integration).
     */
    getStream(): fs.WriteStream | null {
        return this.logFile;
    }

    /**
     * Get the log directory path.
     */
    getLogDir(): string {
        return this.logDir;
    }

    /**
     * Format timestamp in consistent format: YYYY.MM.DD-HH.MM.SS:mmm
     */
    formatTimestamp(date: Date): string {
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

    /**
     * Log a process event (SIGINT, uncaughtException, etc.)
     */
    logProcessEvent(label: string, detail?: unknown, fatal: boolean = false): void {
        if (!this.logFile) return;
        const time = this.formatTimestamp(new Date());
        const detailText = detail !== undefined ? ` ${this.formatProcessDetail(detail)}` : '';
        const line = `[PROCESS] [${time}] ${label}${detailText}`;
        this.logFile.write(line + '\n');
        if (fatal) {
            console.error(line);
            if (detail instanceof Error && detail.stack) {
                console.error(detail.stack);
            }
        }
    }

    /**
     * Format process event detail for logging.
     */
    private formatProcessDetail(detail: unknown): string {
        if (detail instanceof Error) {
            const message = detail.message || String(detail);
            const stack = detail.stack ? detail.stack.split('\n').slice(0, 2).join(' | ') : '';
            return stack ? `${message} (${stack})` : message;
        }
        return String(detail);
    }

    /**
     * Close the log file.
     */
    close(): void {
        if (this.logFile) {
            this.logFile.end();
            this.logFile = null;
        }
    }
}
