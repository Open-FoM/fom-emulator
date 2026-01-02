import assert from 'assert/strict';
import * as fs from 'fs';
import * as path from 'path';

const candidates = [
    path.resolve(process.cwd(), 'huffman_table_runtime.json'),
    path.resolve(process.cwd(), 'ServerEmulator', 'huffman_table_runtime.json'),
];

let found: string | null = null;
for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
        found = candidate;
        break;
    }
}

assert.ok(found, 'runtime huffman table not found');
const raw = fs.readFileSync(found!, 'utf8');
const parsed = JSON.parse(raw);
assert.ok(Array.isArray(parsed) && parsed.length === 256, 'runtime huffman table malformed');
