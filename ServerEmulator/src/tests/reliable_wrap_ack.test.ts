import assert from 'assert/strict';
import { PacketHandler } from '../handlers/PacketHandler';
import { Connection } from '../network/Connection';
import { parseRakNetDatagram } from '../reliable/ReliablePackets';

const handler = new PacketHandler();
const conn = new Connection(1, { address: '127.0.0.1', port: 61000, family: 'IPv4' });
conn.lastTimestamp = 0x12345678;
conn.lastMessageNumber = 0x1d;
conn.pendingAcks = [0x1d];

const ack = handler.buildAck(conn);

assert.ok(ack.length > 0, 'ack should be built');
const parsed = parseRakNetDatagram(ack);
assert.ok(parsed && parsed.hasAcks, 'ack datagram not detected');
const acked: number[] = [];
for (const range of parsed?.ackRanges?.ranges ?? []) {
    for (let i = range.min; i <= range.max; i += 1) {
        acked.push(i);
    }
}
assert.ok(acked.includes(0x1d), 'ack list missing expected message');
