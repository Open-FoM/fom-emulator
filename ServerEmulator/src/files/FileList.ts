import * as fs from 'fs';
import * as path from 'path';
import { BitStreamWriter } from '../protocol/BitStream';
import { RakNetMessageId } from '../protocol/Constants';

export type FileListEntry = {
    id: number;
    size: number;
    name: string;
};

export type FileListBuildResult = {
    payloads: Buffer[];
    entries: FileListEntry[];
    root: string;
    mapPath: string;
    skipped: number;
};

type FileIdMap = {
    nextId: number;
    entries: Record<string, number>;
};

const DEFAULT_EXCLUDE_EXTS = new Set([
    '.dmp',
    '.i64',
    '.id0',
    '.id1',
    '.id2',
    '.nam',
    '.til',
    '.bak',
    '.log',
    '.tmp',
]);

const MAX_FILE_ID = 0x7fff;

function ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function normalizeFilename(value: string): string {
    return value.replace(/[\\/]+/g, '\\').toUpperCase();
}

function collectFiles(
    root: string,
    excludeExts: Set<string>,
    log?: (msg: string) => void,
): Array<{ rel: string; size: number }> {
    const out: Array<{ rel: string; size: number }> = [];
    const rootResolved = path.resolve(root);

    const walk = (dir: string): void => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.isFile()) continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (excludeExts.has(ext)) continue;
            const rel = path.relative(rootResolved, full);
            if (!rel || rel.startsWith('..')) continue;
            try {
                const stat = fs.statSync(full);
                out.push({ rel, size: stat.size >>> 0 });
            } catch {
                log?.(`[FileList] skip unreadable: ${full}`);
            }
        }
    };

    walk(rootResolved);
    return out;
}

function loadFileIdMap(mapPath: string): FileIdMap {
    if (!fs.existsSync(mapPath)) {
        return { nextId: 1, entries: {} };
    }
    try {
        const raw = fs.readFileSync(mapPath, 'utf8');
        const parsed = JSON.parse(raw) as FileIdMap;
        if (!parsed || typeof parsed !== 'object') {
            return { nextId: 1, entries: {} };
        }
        const entries = parsed.entries ?? {};
        let maxId = 0;
        for (const value of Object.values(entries)) {
            if (typeof value === 'number' && Number.isFinite(value)) {
                if (value > maxId) maxId = value;
            }
        }
        const nextId = Math.max(1, parsed.nextId ?? 0, maxId + 1);
        return { nextId, entries };
    } catch {
        return { nextId: 1, entries: {} };
    }
}

function saveFileIdMap(mapPath: string, map: FileIdMap): void {
    ensureDir(mapPath);
    const payload = JSON.stringify(map, null, 2);
    fs.writeFileSync(mapPath, payload, 'utf8');
}

function buildPayloads(
    entries: FileListEntry[],
    maxBytes: number,
    log?: (msg: string) => void,
): Buffer[] {
    const payloads: Buffer[] = [];
    if (entries.length === 0) return payloads;
    const maxPayload = Math.max(256, maxBytes || 1024);

    let writer = new BitStreamWriter(maxPayload);
    let currentSize = 0;
    const flush = () => {
        if (currentSize <= 1) return;
        payloads.push(writer.toBuffer());
        writer = new BitStreamWriter(maxPayload);
        currentSize = 0;
    };

    const startPacket = () => {
        if (currentSize === 0) {
            writer.writeByte(RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER);
            currentSize = 1;
        }
    };

    for (const entry of entries) {
        const nameBytes = Buffer.from(entry.name, 'ascii');
        const entrySize = 2 + 4 + nameBytes.length + 1;
        if (entrySize + 1 > maxPayload) {
            log?.(`[FileList] skip oversized entry: ${entry.name}`);
            continue;
        }
        startPacket();
        if (currentSize + entrySize > maxPayload) {
            flush();
            startPacket();
        }
        writer.writeUInt16(entry.id & 0xffff);
        writer.writeUInt32(entry.size >>> 0);
        writer.writeString(entry.name, true);
        currentSize += entrySize;
    }
    flush();
    return payloads;
}

export function resolveDefaultFileRoot(cwd: string): string | null {
    const candidates = [
        path.resolve(cwd, 'FoTD', 'Resources'),
        path.resolve(cwd, 'Client', 'Resources'),
        path.resolve(cwd, 'Resources'),
        path.resolve(cwd, '..', 'FoTD', 'Resources'),
        path.resolve(cwd, '..', 'Client', 'Resources'),
        path.resolve(cwd, '..', 'Resources'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate;
        }
    }
    return null;
}

export function buildFileList(
    root: string,
    mapPath: string,
    maxPacketBytes: number,
    log?: (msg: string) => void,
    excludeExts: Set<string> = DEFAULT_EXCLUDE_EXTS,
): FileListBuildResult {
    const files = collectFiles(root, excludeExts, log);
    files.sort((a, b) => a.rel.localeCompare(b.rel));

    const map = loadFileIdMap(mapPath);
    let changed = false;
    let skipped = 0;
    const entries: FileListEntry[] = [];

    for (const file of files) {
        const normalized = normalizeFilename(file.rel);
        if (!normalized || normalized.length >= 256) {
            skipped += 1;
            continue;
        }
        let id = map.entries[normalized];
        if (!id) {
            if (map.nextId > MAX_FILE_ID) {
                skipped += 1;
                continue;
            }
            id = map.nextId++;
            map.entries[normalized] = id;
            changed = true;
        }
        entries.push({ id, size: file.size, name: normalized });
    }

    if (changed) {
        saveFileIdMap(mapPath, map);
    }

    const payloads = buildPayloads(entries, maxPacketBytes, log);
    return { payloads, entries, root, mapPath, skipped };
}
