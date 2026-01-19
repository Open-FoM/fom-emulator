/**
 * Simple Logger for shared packages
 *
 * Provides basic logging functions that can be used by packages.
 * In quiet mode, messages are written to the FileLogger instead of console.
 */

import { FileLogger } from './FileLogger';

interface LoggerConfig {
    quiet: boolean;
    debug: boolean;
}

export type LogEntry = {
    level: 'log' | 'warn' | 'error';
    message: string;
    ts: number;
};

type LogListener = (entry: LogEntry) => void;

const config: LoggerConfig = {
    quiet: false,
    debug: false,
};

const listeners = new Set<LogListener>();

// Subscribe to log output (returns unsubscribe).
export function onLog(listener: LogListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Update logging switches.
export function configureLogger(next: Partial<LoggerConfig>): void {
    console.log('Configuring logger:', next);
    if (typeof next.quiet === 'boolean') {
        config.quiet = next.quiet;
    }
    if (typeof next.debug === 'boolean') {
        config.debug = next.debug;
    }
}

// Internal emit function - logs to file (if available) and console based on quiet mode.
function emit(message: string, level: 'log' | 'warn' | 'error'): void {
    const entry: LogEntry = { level, message, ts: Date.now() };
    for (const listener of listeners) {
        try {
            listener(entry);
        } catch {}
    }
    // Always mirror app-level logs into the file logger (if configured).
    FileLogger.globalNote(message);
    if (!config.quiet) {
        console[level](message);
    }
}

// Standard info logging.
export function info(message: string): void {
    emit(message, 'log');
}

// Warning logging.
export function warn(message: string): void {
    emit(message, 'warn');
}

// Error logging.
export function error(message: string): void {
    emit(message, 'error');
}

// Debug logging gated by config.debug.
export function debug(message: string): void {
    if (config.debug) {
        emit(message, 'log');
    }
}
