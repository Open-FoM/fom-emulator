import * as fs from 'fs';
import * as path from 'path';

export type PacketFixture = {
    name: string;
    msg_id: number;
    wrapper: 'reliable' | 'raw';
    bit_order?: 'lsb' | 'msb';
    hex: string;
    expected?: {
        username?: string;
        token?: number;
        preFlag?: number;
        postFlag?: number;
        payload_len?: number;
    };
    source_log?: string;
    source_timestamp?: string;
};

const FIXTURE_DIR = path.resolve(__dirname, '..', 'fixtures');

export function loadFixtures(): PacketFixture[] {
    if (!fs.existsSync(FIXTURE_DIR)) {
        return [];
    }

    const files = fs
        .readdirSync(FIXTURE_DIR)
        .filter((file) => file.endsWith('.json'))
        .map((file) => path.join(FIXTURE_DIR, file))
        .sort((a, b) => a.localeCompare(b));

    const fixtures: PacketFixture[] = [];
    for (const file of files) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw) as PacketFixture;
        fixtures.push(parsed);
    }
    return fixtures;
}
