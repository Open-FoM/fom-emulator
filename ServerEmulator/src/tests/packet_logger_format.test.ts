import assert from 'assert/strict';
import { PacketLogger, PacketDirection, LoggedPacket } from '../utils/PacketLogger';

const logger = new PacketLogger({ console: false, file: false });

const packet: LoggedPacket = {
    timestamp: new Date(2025, 11, 30, 6, 16, 39, 780),
    direction: PacketDirection.INCOMING,
    address: '127.0.0.1',
    port: 59851,
    data: Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'),
    connectionId: 1,
};

// Access private helpers for snapshotting formatting without writing files.
const formatPacket = (
    logger as unknown as { formatPacket: (p: LoggedPacket) => string }
).formatPacket.bind(logger);
(logger as unknown as { packetCount: number }).packetCount = 1;

const output = formatPacket(packet);
const lines = output.split('\n');
assert.equal(lines[0], '[1] [2025.12.30-06.16.39:780] RECV 127.0.0.1:59851 [Conn#1] (16 bytes)');
assert.equal(
    lines[1],
    '  0000  00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f  |................|',
);

// Verify repeat suppression behavior in isolation.
const consoleLogger = new PacketLogger({
    console: true,
    file: false,
    consoleMode: 'summary',
    consoleRepeatSuppressMs: 2000,
});
const consolePacket: LoggedPacket = { ...packet, direction: PacketDirection.OUTGOING };
const shouldLogConsole = (
    consoleLogger as unknown as {
        shouldLogConsole: (p: LoggedPacket) => { log: boolean; suppressed: number };
    }
).shouldLogConsole.bind(consoleLogger);

const nowBackup = Date.now;
Date.now = () => 1_000;
const first = shouldLogConsole(consolePacket);
Date.now = () => 1_500;
const second = shouldLogConsole(consolePacket);
Date.now = () => 3_500;
const third = shouldLogConsole(consolePacket);
Date.now = nowBackup;

assert.equal(first.log, true, 'first log should pass');
assert.equal(second.log, false, 'second log should be suppressed');
assert.equal(third.log, true, 'third log should pass after suppression window');
assert.equal(third.suppressed, 1, 'suppressed count should report one skipped log');
