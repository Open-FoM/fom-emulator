/**
 * Build and send preload list packets for world clients.
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, sep } from 'path';
import { LithPacketWrite, addressToString, type RakSystemAddress } from '@openfom/networking';
import { MsgPreloadList, PreloadType, RakNetMessageId } from '@openfom/packets';
type SendFn = (data: Buffer, address: RakSystemAddress) => boolean;
type PreloadEntry = {
    path: string;
    fileId: number;
    fileSize: number;
    preloadType: PreloadType;
};
type ResourceEntry = {
    path: string;
    fileId: number;
};
type ResourceEntryRaw = {
    path: string;
    fileId?: number;
};
export type FileIdMap = {
    paths: string[];
    idByPath: Map<string, number>;
};
type PreloadOptions = {
    address: RakSystemAddress;
    sendReliable: SendFn;
    log?: (msg: string) => void;
    includeStartEnd?: boolean;
    resourceListPath?: string;
    resourcesRoot?: string;
};
const DEFAULT_RESOURCE_LIST = `path
    Models\\\\Props\\\\Terminals\\\\marketing_terminal.ltb
    RS\\\\default.ltb
    skins\\\\Props\\\\Terminals\\\\mt_2_1.dtx
    skins\\\\Props\\\\Terminals\\\\mt_2_2.dtx
    skins\\\\Props\\\\Terminals\\\\mt_2_3.dtx
    skins\\\\Props\\\\Terminals\\\\mt_3_1.dtx
    skins\\\\Props\\\\Terminals\\\\mt_3_2.dtx
    skins\\\\Props\\\\Terminals\\\\mt_3_3.dtx
    skins\\\\Props\\\\Terminals\\\\mt_1_1.dtx
    skins\\\\Props\\\\Terminals\\\\mt_1_2.dtx
    skins\\\\Props\\\\Terminals\\\\mt_1_3.dtx
    Models\\\\Props\\\\Terminals\\\\productionterminal.ltb
    skins\\\\Props\\\\Terminals\\\\production_terminal.dtx
    Models\\\\Props\\\\Terminals\\\\medic.ltb
    skins\\\\Props\\\\Terminals\\\\medic.dtx
    Models\\\\Props\\\\Terminals\\\\storageaccess.ltb
    skins\\\\Props\\\\Terminals\\\\storageaccess.dtx
    Models\\\\Props\\\\Terminals\\\\apartment_entry.ltb
    skins\\\\Props\\\\Terminals\\\\apartment_entry.dtx
    skins\\\\Props\\\\Terminals\\\\apartment_entry2.dtx
    Models\\\\Props\\\\Terminals\\\\chemlab.ltb
    skins\\\\Props\\\\Terminals\\\\chemlab.dtx
    Models\\\\Props\\\\Terminals\\\\nf_terminal1.ltb
    RS\\\\Dot3bump_2pass.ltb
    skins\\\\Props\\\\Terminals\\\\nf_terminal1_normal.dtx
    skins\\\\Props\\\\Terminals\\\\nf_terminal1.dtx
    Models\\\\Props\\\\Terminals\\\\nf_terminal2.ltb
    skins\\\\Props\\\\Terminals\\\\nf_terminal2_normal.dtx
    skins\\\\Props\\\\Terminals\\\\nf_terminal2.dtx
    Models\\\\Props\\\\Terminals\\\\portal_terminal.ltb
    skins\\\\Props\\\\Terminals\\\\portal_0.dtx
    skins\\\\Props\\\\Terminals\\\\portal2_0.dtx
    skins\\\\Props\\\\Terminals\\\\portal3_0.dtx
    skins\\\\Props\\\\Terminals\\\\clportal_0.dtx
    Models\\\\Props\\\\Terminals\\\\colony_control.ltb
    skins\\\\Props\\\\Terminals\\\\colony_control.dtx
    Models\\\\Props\\\\Terminals\\\\mining.ltb
    skins\\\\Props\\\\Terminals\\\\mining.dtx
    Models/Props/Terminals/repunit.ltb
    Skins/Props/Terminals/repunit.dtx
    Models/Props/Terminals/barrierswitch.ltb
    Tex/RebirthWM/barrierconsole_d.dtx`;

/**
 * Parse a CSV row into fields.
 * @param {string} line - CSV row text.
 * @returns {string[]} Parsed fields.
 */
const parseCsvRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    fields.push(current.trim());
    return fields;
};

/**
 * Parse a file ID value (hex or decimal).
 * @param {string} value - Raw CSV field.
 * @returns {number | null} Parsed file ID or null.
 */
const parseFileIdValue = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed =
        trimmed.startsWith('0x') || trimmed.startsWith('0X')
            ? Number.parseInt(trimmed, 16)
            : Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Resolve the repo root by walking up from a starting path.
 * @param {string} start - Starting directory.
 * @returns {string | null} Repo root or null when not found.
 */
function resolveRepoRoot(start: string): string | null {
    let current = start;
    for (let i = 0; i < 8; i += 1) {
        const docsPath = join(current, 'Docs');
        const clientPath = join(current, 'Client');
        if (existsSync(docsPath) && existsSync(clientPath)) {
            return current;
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return null;
}

/**
 * Normalize a resource path to backslash separators + lowercase.
 * @param {string} value - Raw path value.
 * @returns {string} Normalized path.
 */
export function normalizeResourcePath(value: string): string {
    return value
        .replace(/[\\/]+/g, '\\')
        .trim()
        .toLowerCase();
}

/**
 * Load resource entries from CSV or fallback list.
 * @param {string} [pathOverride] - Optional CSV path override.
 * @param {(msg: string) => void} [log] - Optional logger.
 * @returns {ResourceEntry[]} Parsed resource entries.
 */
function loadResourceEntries(pathOverride?: string, log?: (msg: string) => void): ResourceEntry[] {
    const logger = log ?? (() => {});
    let csv = '';
    let source = 'embedded-default';

    /**
     * Try to load a CSV override from a candidate path.
     * @param {string} candidate - Candidate path.
     * @param {string} label - Source label.
     * @returns {boolean} True when loaded.
     */
    const tryLoadOverride = (candidate: string, label: string) => {
        if (!candidate || !existsSync(candidate)) return false;
        csv = readFileSync(candidate, 'utf8');
        source = `override:${label}:${candidate}`;
        return true;
    };
    if (pathOverride) {
        const direct = pathOverride;
        const cwdPath = join(process.cwd(), pathOverride);
        let repoPath = '';
        const repoRoot = resolveRepoRoot(process.cwd());
        if (repoRoot) {
            repoPath = join(repoRoot, 'Server', pathOverride);
        }
        if (
            tryLoadOverride(direct, 'direct') ||
            tryLoadOverride(cwdPath, 'cwd') ||
            (repoPath && tryLoadOverride(repoPath, 'repo'))
        ) {
            logger(`[Preload] Resource list override resolved: ${source}`);
        }
    }
    if (!csv) {
        logger(`[Preload] cwd=${process.cwd()}`);
        const repoRoot = resolveRepoRoot(process.cwd());
        logger(`[Preload] repoRoot=${repoRoot ?? 'not-found'}`);
        if (repoRoot) {
            const serverPath = join(repoRoot, 'Server', 'data', 'WorldServiceResourceList.csv');
            const docPath = join(repoRoot, 'Docs', 'WorldServiceResourceList.csv');
            if (existsSync(serverPath)) {
                csv = readFileSync(serverPath, 'utf8');
                source = `server:${serverPath}`;
            } else if (existsSync(docPath)) {
                csv = readFileSync(docPath, 'utf8');
                source = `docs:${docPath}`;
            }
        }
    }
    if (!csv) {
        logger('[Preload] Resource list not found; using embedded default list');
        csv = DEFAULT_RESOURCE_LIST;
        source = 'embedded-default';
    }
    const lines = csv
        .split(/\r\n|\n|\r/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
    logger(`[Preload] Resource list raw lines=${lines.length}`);
    if (lines.length === 0) {
        return [];
    }

    /**
     * Check whether a string looks like a filename.
     * @param {string} value - Path segment to check.
     * @returns {boolean} True when it looks like a filename.
     */
    const looksLikeFileName = (value: string): boolean => /\\.[a-z0-9]{2,4}$/i.test(value);

    /**
     * Check whether a string looks like a directory.
     * @param {string} value - Path segment to check.
     * @returns {boolean} True when it looks like a directory.
     */
    const looksLikeDir = (value: string): boolean => value.length > 0 && !looksLikeFileName(value);

    /**
     * Join directory and filename with normalized separators.
     * @param {string} dir - Directory path.
     * @param {string} file - Filename.
     * @returns {string} Combined path.
     */
    const joinPath = (dir: string, file: string): string =>
        `${dir.replace(/[\\\\/]+/g, '\\\\')}\\\\${file}`;
    const header = parseCsvRow(lines[0]).map((col) => col.toLowerCase());
    const hasPathHeader = header.includes('path');
    const hasNameHeader = header.includes('name');
    const hasIdxHeader = header.includes('idx');
    const hasSizeHeader = header.includes('filesize') || header.includes('file_size');
    const hasIdHeader =
        header.includes('fileid') || header.includes('file_id') || header.includes('id');
    const rawEntries: ResourceEntryRaw[] = [];
    const csvStart =
        hasPathHeader || hasNameHeader || hasIdxHeader || hasSizeHeader || hasIdHeader ? 1 : 0;
    const fileIdIndex = header.findIndex(
        (col) => col === 'fileid' || col === 'file_id' || col === 'id',
    );
    const pathIndex = header.indexOf('path');
    const nameIndex = header.indexOf('name');
    const treatAsIdMap =
        hasIdHeader ||
        hasNameHeader ||
        (() => {
            const firstCols = parseCsvRow(lines[0]);
            return firstCols.length >= 2 && parseFileIdValue(firstCols[0]) !== null;
        })();
    logger(
        `[Preload] CSV parse: header=${header.join(', ') || '(none)'} treatAsIdMap=${treatAsIdMap} csvStart=${csvStart} fileIdIndex=${fileIdIndex} pathIndex=${pathIndex} nameIndex=${nameIndex}`,
    );
    if (treatAsIdMap) {
        for (let i = csvStart; i < lines.length; i += 1) {
            const cols = parseCsvRow(lines[i]).filter((col) => col.length > 0);
            if (cols.length < 2) continue;
            if (fileIdIndex >= 0 && (pathIndex >= 0 || nameIndex >= 0)) {
                const id = parseFileIdValue(cols[fileIdIndex] ?? '');
                const path = (cols[pathIndex >= 0 ? pathIndex : nameIndex] ?? '').trim();
                if (id !== null && path) {
                    rawEntries.push({ fileId: id, path });
                }
                continue;
            }
            const idA = parseFileIdValue(cols[0]);
            const idB = parseFileIdValue(cols[1]);
            if (idA !== null && cols[1]) {
                rawEntries.push({ fileId: idA, path: cols[1] });
                continue;
            }
            if (idB !== null && cols[0]) {
                rawEntries.push({ fileId: idB, path: cols[0] });
                continue;
            }
            if (cols[0]) {
                rawEntries.push({ path: cols[0] });
            }
        }
    } else {
        const matches: string[] = [];
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            if (line.toLowerCase() === 'path') continue;
            if (line.includes(',')) {
                const cols = parseCsvRow(line).filter((col) => col.length > 0);
                if (cols.length >= 2 && looksLikeFileName(cols[0]) && looksLikeDir(cols[1])) {
                    const combined = joinPath(cols[1], cols[0]);
                    matches.push(combined);
                    logger(`[Preload] Join csv: ${cols[1]} + ${cols[0]} => ${combined}`);
                } else if (cols.length > 0) {
                    matches.push(cols[0]);
                }
                continue;
            }
            const next = i + 1 < lines.length ? lines[i + 1] : '';
            if (next && next.toLowerCase() !== 'path') {
                if (looksLikeFileName(line) && looksLikeDir(next)) {
                    const combined = joinPath(next, line);
                    matches.push(combined);
                    logger(`[Preload] Join lines: ${next} + ${line} => ${combined}`);
                    i += 1;
                    continue;
                }
                if (looksLikeDir(line) && looksLikeFileName(next)) {
                    const combined = joinPath(line, next);
                    matches.push(combined);
                    logger(`[Preload] Join lines: ${line} + ${next} => ${combined}`);
                    i += 1;
                    continue;
                }
            }
            matches.push(line);
        }
        const unique = Array.from(new Set(matches));
        unique.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        for (const path of unique) {
            rawEntries.push({ path });
        }
    }
    const assigned: ResourceEntry[] = [];
    const used = new Set<number>();
    let nextId = 0;
    let autoAssigned = 0;
    let provided = 0;
    let duplicateSkipped = 0;
    for (const entry of rawEntries) {
        let fileId = entry.fileId;
        if (fileId === undefined || fileId === null || Number.isNaN(fileId)) {
            while (used.has(nextId)) nextId += 1;
            fileId = nextId;
            nextId += 1;
            autoAssigned += 1;
        } else {
            if (used.has(fileId)) {
                logger(`[Preload] Duplicate fileId ${fileId} for ${entry.path}; skipping`);
                duplicateSkipped += 1;
                continue;
            }
            if (fileId >= nextId) nextId = fileId + 1;
            provided += 1;
        }
        used.add(fileId);
        assigned.push({ fileId, path: entry.path });
    }
    assigned.sort((a, b) => a.fileId - b.fileId);
    logger(`[Preload] Resource list source=${source} entries=${assigned.length}`);
    logger(
        `[Preload] FileId assignment: provided=${provided} auto=${autoAssigned} duplicatesSkipped=${duplicateSkipped}`,
    );
    if (assigned.length <= 20) {
        logger(
            `[Preload] Resource list entries=${assigned.map((e) => `${e.fileId}:${e.path}`).join(' | ')}`,
        );
    } else {
        const head = assigned
            .slice(0, 5)
            .map((e) => `${e.fileId}:${e.path}`)
            .join(' | ');
        const tail = assigned
            .slice(-3)
            .map((e) => `${e.fileId}:${e.path}`)
            .join(' | ');
        logger(`[Preload] Resource list sample: head=${head} ... tail=${tail}`);
    }
    return assigned;
}

/**
 * Build a file ID map from the resource list.
 * @param {string} [resourceListPath] - Optional CSV path override.
 * @param {(msg: string) => void} [log] - Optional logger.
 * @returns {FileIdMap} File ID map with paths and lookup.
 */
export function buildFileIdMap(resourceListPath?: string, log?: (msg: string) => void): FileIdMap {
    const entries = loadResourceEntries(resourceListPath, log);
    const idByPath = new Map<string, number>();
    const paths: string[] = [];
    for (const entry of entries) {
        idByPath.set(normalizeResourcePath(entry.path), entry.fileId);
        paths[entry.fileId] = entry.path;
    }
    if (log) {
        log(`[Preload] FileIdMap built entries=${entries.length}`);
    }
    return { paths, idByPath };
}

/**
 * Detect the preload type from a resource path.
 * @param {string} path - Resource path.
 * @returns {PreloadType} Preload type enum value.
 */
function detectPreloadType(path: string): PreloadType {
    const lower = path.toLowerCase();
    if (lower.endsWith('.dtx')) return PreloadType.TEXTURE;
    if (lower.endsWith('.ltb')) {
        if (lower.startsWith('rs\\') || lower.startsWith('rs/')) {
            return PreloadType.TEXTURE;
        }
        return PreloadType.MODEL;
    }
    return PreloadType.MODEL;
}

/**
 * Resolve the resource root directory on disk.
 * @param {string} [pathOverride] - Optional resources root override.
 * @returns {string | null} Resource root path or null.
 */
function resolveResourcesRoot(pathOverride?: string): string | null {
    if (pathOverride && existsSync(pathOverride)) return pathOverride;
    const repoRoot = resolveRepoRoot(process.cwd());
    if (!repoRoot) return null;
    const root = join(repoRoot, 'Client', 'Client_FoM', 'Resources');
    return existsSync(root) ? root : null;
}

/**
 * Build a FILE_LIST_TRANSFER_HEADER packet for a preload entry.
 * @param {PreloadEntry} entry - Preload entry to serialize.
 * @returns {Buffer} Serialized packet buffer.
 */
function buildFileDescPacket(entry: PreloadEntry): Buffer {
    using writer = new LithPacketWrite();
    writer.writeUint8(RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER);
    writer.writeUint16(entry.fileId & 0xffff);
    writer.writeUint32(entry.fileSize >>> 0);
    writer.writeString(entry.path);
    return writer.getData();
}

/**
 * Build preload entries with sizes and types.
 * @param {ResourceEntry[]} entriesIn - Resource list entries.
 * @param {string | null} resourcesRoot - Resource root on disk.
 * @param {(msg: string) => void} [log] - Optional logger.
 * @returns {PreloadEntry[]} Preload entries with size/type info.
 */
function buildEntries(
    entriesIn: ResourceEntry[],
    resourcesRoot: string | null,
    log?: (msg: string) => void,
): PreloadEntry[] {
    const logger = log ?? (() => {});
    const entries: PreloadEntry[] = [];
    for (const entry of entriesIn) {
        const path = entry.path;
        const preloadType = detectPreloadType(path);
        let fileSize = 0;
        if (resourcesRoot) {
            const diskPath = join(resourcesRoot, path.replace(/[\\/]/g, sep));
            try {
                if (existsSync(diskPath)) {
                    fileSize = statSync(diskPath).size >>> 0;
                } else {
                    logger(`[Preload] Missing resource on disk: ${diskPath}`);
                }
            } catch (err) {
                logger(`[Preload] Failed to stat ${diskPath}: ${String(err)}`);
            }
        }
        entries.push({
            path,
            fileId: entry.fileId,
            fileSize,
            preloadType,
        });
    }
    return entries;
}

/**
 * Send preload list packets for a world connection.
 * @param {PreloadOptions} options - Preload send options.
 * @returns {void} No return value.
 */
export function sendWorldPreload(options: PreloadOptions): void {
    const logger = options.log ?? (() => {});
    const includeStartEnd = options.includeStartEnd !== false;

    /**
     * Build a short hex preview of a packet.
     * @param {Buffer} buf - Packet buffer.
     * @param {number} [max] - Max bytes to include.
     * @returns {string} Hex preview string.
     */
    const hexPreview = (buf: Buffer, max = 64): string => {
        const slice = buf.subarray(0, max);
        const hex = Array.from(slice, (byte) => byte.toString(16).padStart(2, '0')).join(' ');
        const suffix = buf.length > max ? ` ...(${buf.length})` : ` (${buf.length})`;
        return `${hex}${suffix}`;
    };
    const addrLabel = addressToString(options.address);
    logger(
        `[Preload] Begin send: addr=${addrLabel} listPath=${options.resourceListPath ?? 'default'} includeStartEnd=${includeStartEnd}`,
    );
    const list = loadResourceEntries(options.resourceListPath, logger);
    if (list.length === 0) {
        logger('[Preload] Resource list empty; skipping preload');
        return;
    }
    const resourcesRoot = resolveResourcesRoot(options.resourcesRoot);
    if (!resourcesRoot) {
        logger('[Preload] Resources root not found; sizes will be 0');
    } else {
        logger(`[Preload] Resources root=${resourcesRoot}`);
    }
    const entries = buildEntries(list, resourcesRoot, logger);
    const zeroSizes = entries.filter((entry) => entry.fileSize === 0).length;
    if (zeroSizes > 0) {
        logger(`[Preload] Entry sizes: zero=${zeroSizes} total=${entries.length}`);
    }
    logger(`[Preload] Sending filedesc packets count=${entries.length}`);
    let filedescFailed = 0;
    const filedescSample = new Set<number>();
    if (entries.length <= 6) {
        for (let i = 0; i < entries.length; i += 1) filedescSample.add(i);
    } else {
        [0, 1, 2, entries.length - 3, entries.length - 2, entries.length - 1].forEach((idx) => {
            if (idx >= 0 && idx < entries.length) filedescSample.add(idx);
        });
    }
    for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        const packet = buildFileDescPacket(entry);
        if (filedescSample.has(i)) {
            logger(
                `[Preload] Filedesc sample idx=${i} id=${entry.fileId} bytes=${hexPreview(packet)}`,
            );
        }
        const ok = options.sendReliable(packet, options.address);
        if (!ok) {
            filedescFailed += 1;
            logger(`[Preload] Send failed: filedesc id=${entry.fileId} path=${entry.path}`);
        }
    }
    if (filedescFailed > 0) {
        logger(`[Preload] Filedesc send complete failed=${filedescFailed}`);
    }
    let preloadFailed = 0;
    if (includeStartEnd) {
        const startPacket = MsgPreloadList.createStart().encode();
        logger(`[Preload] Preload start bytes=${hexPreview(startPacket)}`);
        const ok = options.sendReliable(startPacket, options.address);
        if (!ok) {
            preloadFailed += 1;
            logger('[Preload] Send failed: preload start');
        }
    }
    const preloadSample = filedescSample;
    for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        const preloadPacket = MsgPreloadList.createForFile(entry.preloadType, entry.fileId);
        if (preloadSample.has(i)) {
            logger(
                `[Preload] Preload sample idx=${i} id=${entry.fileId} type=${PreloadType[entry.preloadType]} bytes=${hexPreview(preloadPacket.encode())}`,
            );
        }
        const ok = options.sendReliable(preloadPacket.encode(), options.address);
        if (!ok) {
            preloadFailed += 1;
            logger(`[Preload] Send failed: preload fileId=${entry.fileId} path=${entry.path}`);
        }
    }
    if (includeStartEnd) {
        const endPacket = MsgPreloadList.createEnd().encode();
        logger(`[Preload] Preload end bytes=${hexPreview(endPacket)}`);
        const ok = options.sendReliable(endPacket, options.address);
        if (!ok) {
            preloadFailed += 1;
            logger('[Preload] Send failed: preload end');
        }
    }
    if (preloadFailed > 0) {
        logger(`[Preload] Preload list send complete failed=${preloadFailed}`);
    }
    logger(`[Preload] Sent ${entries.length} filedesc + preload packets`);
}
