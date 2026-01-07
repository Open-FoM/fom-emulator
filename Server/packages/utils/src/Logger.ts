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

const config: LoggerConfig = {
    quiet: false,
    debug: false,
};

// Update logging switches.
export function configureLogger(next: Partial<LoggerConfig>): void {
    if (typeof next.quiet === 'boolean') {
        config.quiet = next.quiet;
    }
    if (typeof next.debug === 'boolean') {
        config.debug = next.debug;
    }
}

// Internal emit function - logs to console or file based on quiet mode.
function emit(message: string, level: 'log' | 'warn' | 'error'): void {
    if (!config.quiet) {
        console[level](message);
    } else {
        // In quiet mode, write to file logger if available
        FileLogger.globalNote(message);
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
