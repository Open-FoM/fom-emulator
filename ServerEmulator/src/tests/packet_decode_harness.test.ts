import assert from 'assert/strict';
import { loadFixtures } from './_support/fixtures';
import { decodeWithSchema, hexToBuffer } from './_support/packetDecode';
import { PACKET_SCHEMAS } from './_support/packetSchemas';

const fixtures = loadFixtures();
assert.ok(fixtures.length >= 3, 'packet-harness: expected at least three fixtures');

for (const fixture of fixtures) {
    const schema = PACKET_SCHEMAS.find(
        (item) => item.msgId === fixture.msg_id && item.wrapper === fixture.wrapper,
    );
    assert.ok(schema, `packet-harness: missing schema for ${fixture.name}`);
    if (fixture.bit_order) {
        assert.equal(
            schema.bitOrder,
            fixture.bit_order,
            `packet-harness: ${fixture.name} bit_order mismatch`,
        );
    }

    const packet = hexToBuffer(fixture.hex);
    const decoded = decodeWithSchema(packet, schema);
    assert.ok(decoded, `packet-harness: ${fixture.name} decode returned null`);
    assert.ok(decoded.ok, `packet-harness: ${fixture.name} validation failed`);

    if (fixture.expected) {
        if (fixture.expected.username !== undefined) {
            assert.equal(
                decoded.fields.username,
                fixture.expected.username,
                `packet-harness: ${fixture.name} username mismatch`,
            );
        }
        if (fixture.expected.token !== undefined) {
            assert.equal(
                decoded.fields.token,
                fixture.expected.token,
                `packet-harness: ${fixture.name} token mismatch`,
            );
        }
        if (fixture.expected.preFlag !== undefined) {
            assert.equal(
                decoded.fields.preFlag,
                fixture.expected.preFlag,
                `packet-harness: ${fixture.name} preFlag mismatch`,
            );
        }
        if (fixture.expected.postFlag !== undefined) {
            assert.equal(
                decoded.fields.postFlag,
                fixture.expected.postFlag,
                `packet-harness: ${fixture.name} postFlag mismatch`,
            );
        }
        if (fixture.expected.payload_len !== undefined) {
            const payload = decoded.fields.payload as Buffer | undefined;
            assert.ok(payload, `packet-harness: ${fixture.name} payload missing`);
            assert.equal(
                payload.length,
                fixture.expected.payload_len,
                `packet-harness: ${fixture.name} payload_len mismatch`,
            );
        }
    }
}
