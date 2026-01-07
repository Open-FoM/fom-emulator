import * as fs from 'fs';
import * as path from 'path';

export interface PacketDocEntry {
    id: number;
    name: string;
    direction: string;
    module: string;
    file: string;
    notes: string;
}

let cachedIndex: Map<number, PacketDocEntry> | null = null;

// Locate the canonical packet index (Docs/Packets/README.md).
function resolvePacketDocsPath(): string | null {
    const candidates = [
        path.resolve(process.cwd(), 'Docs', 'Packets', 'README.md'),
        path.resolve(process.cwd(), '..', 'Docs', 'Packets', 'README.md'),
        path.resolve(process.cwd(), '..', '..', 'Docs', 'Packets', 'README.md'),
        path.resolve(__dirname, '..', '..', '..', 'Docs', 'Packets', 'README.md'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

// Parse the markdown table rows into an ID -> metadata map.
function parsePacketDocs(readme: string): Map<number, PacketDocEntry> {
    const index = new Map<number, PacketDocEntry>();
    const lines = readme.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('|')) continue;
        if (!trimmed.includes('0x')) continue;
        const parts = trimmed.split('|').map((part) => part.trim());
        if (parts.length > 0 && parts[0] === '') parts.shift();
        if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        if (parts.length < 6) continue;
        const idToken = parts[0];
        if (!idToken.startsWith('0x')) continue;
        const id = Number.parseInt(idToken.slice(2), 16);
        if (!Number.isFinite(id)) continue;
        const entry: PacketDocEntry = {
            id,
            name: parts[1] || '',
            direction: parts[2] || '',
            module: parts[3] || '',
            file: parts[4] || '',
            notes: parts[5] || '',
        };
        index.set(id, entry);
    }
    return index;
}

// Lazy-load the packet index and cache for runtime lookups.
export function getPacketDocIndex(): Map<number, PacketDocEntry> {
    if (!cachedIndex) {
        const readmePath = resolvePacketDocsPath();
        if (readmePath && fs.existsSync(readmePath)) {
            const raw = fs.readFileSync(readmePath, 'utf8');
            cachedIndex = parsePacketDocs(raw);
        } else {
            cachedIndex = new Map();
        }
    }
    return cachedIndex;
}

// Lookup a packet entry by ID.
export function getPacketDocEntry(id: number): PacketDocEntry | undefined {
    return getPacketDocIndex().get(id);
}

// Lookup a packet name by ID.
export function getPacketDocName(id: number): string | undefined {
    return getPacketDocEntry(id)?.name;
}

// Reset cached packet index (for reloads/tests).
export function resetPacketDocIndex(): void {
    cachedIndex = null;
}
