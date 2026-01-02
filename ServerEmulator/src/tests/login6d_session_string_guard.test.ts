import assert from 'assert/strict';
import * as crypto from 'crypto';

function buildSessionString(
    username: string,
    token: number,
    worldIp: string,
    worldPort: number,
): string {
    const rand = crypto.randomBytes(8).toString('hex');
    const world = worldIp && worldPort ? `${worldIp}:${worldPort}` : worldIp;
    let session = world ? `sess=${rand};world=${world}` : `sess=${rand}`;
    if (session.length > 63) {
        session = `sess=${rand}`;
    }
    return session;
}

const session = buildSessionString('USER_YYYY_9999', 0x073d, '127.0.0.1', 2345);
assert.ok(session.length <= 63, 'session string exceeds client buffer');
for (const ch of session) {
    const code = ch.charCodeAt(0);
    assert.ok(code >= 0x20 && code <= 0x7e, 'session string contains non-ascii');
}
