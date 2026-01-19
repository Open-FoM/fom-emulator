/**
 * Load world service CSV rows and build spawn blocks.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createModelSpawnBlock, type ModelSpawnDefinition } from '@openfom/packets';
import { buildFileIdMap, normalizeResourcePath } from './WorldPreload';
type WorldServiceRow = {
    worldId: number;
    serviceType: number;
    x: number;
    y: number;
    z: number;
    rotation: number;
    propModel: string;
    propTextures: string[];
    propRenderStyle: string[];
    propScale: number;
    propMoveToFloor: number;
    propSolid: number;
    flags: number;
};
type WorldServiceOptions = {
    worldId: number;
    csvPath?: string;
    resourceListPath?: string;
    log?: (msg: string) => void;
    startObjectId?: number;
};
const FLAG_VISIBLE = 1 << 0;
const FLAG_FULLPOSITIONRES = 1 << 8;
const FLAG_SOLID = 1 << 13;

/**
 * Resolve the repo root directory from the current working directory.
 * @returns {string | null} Repo root path or null.
 */
const resolveRepoRoot = (): string | null => {
    let current = process.cwd();
    for (let i = 0; i < 8; i += 1) {
        if (existsSync(join(current, 'Docs')) && existsSync(join(current, 'Server'))) {
            return current;
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return null;
};

/**
 * Parse a CSV line into fields.
 * @param {string} line - Raw CSV line.
 * @returns {string[]} Parsed fields.
 */
const parseCsvLine = (line: string): string[] => {
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
 * Parse a numeric field (decimal or hex).
 * @param {string} value - Raw value.
 * @returns {number} Parsed number or 0.
 */
const parseNumber = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
        return Number.parseInt(trimmed, 16);
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Split a delimited list value.
 * @param {string} value - Raw list string.
 * @returns {string[]} Parsed entries.
 */
const splitList = (value: string): string[] => {
    return value
        .split(/[;|]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
};

/**
 * Resolve the world services CSV path.
 * @param {string} [override] - Optional override path.
 * @returns {string | null} Resolved CSV path or null.
 */
const resolveCsvPath = (override?: string): string | null => {
    if (override && existsSync(override)) return override;
    const root = resolveRepoRoot();
    if (!root) return null;
    const serverPath = join(root, 'Server', 'data', 'world_services_single_terminal.csv');
    if (existsSync(serverPath)) return serverPath;
    const fallback = join(root, 'Server', 'data', 'world_services.csv');
    if (existsSync(fallback)) return fallback;
    return null;
};

/**
 * Load world service rows from CSV.
 * @param {string} [pathOverride] - Optional CSV path override.
 * @param {(msg: string) => void} [log] - Optional logger.
 * @returns {WorldServiceRow[]} Parsed world service rows.
 */
const loadRows = (pathOverride?: string, log?: (msg: string) => void): WorldServiceRow[] => {
    const logger = log ?? (() => {});
    logger(`[WorldServices] Loading CSV (override=${pathOverride ?? 'none'})`);
    if (pathOverride && !existsSync(pathOverride)) {
        logger(`[WorldServices] CSV override not found: ${pathOverride}`);
    }
    const csvPath = resolveCsvPath(pathOverride);
    if (!csvPath) {
        logger('[WorldServices] CSV not found; skipping world services');
        return [];
    }
    if (pathOverride && csvPath !== pathOverride) {
        logger(`[WorldServices] CSV resolved to ${csvPath}`);
    }
    logger(`[WorldServices] CSV path: ${csvPath}`);
    const raw = readFileSync(csvPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    logger(`[WorldServices] CSV bytes=${raw.length} lines=${lines.length}`);
    if (lines.length <= 1) {
        logger('[WorldServices] CSV has no data rows; skipping');
        return [];
    }
    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const index = new Map<string, number>();
    header.forEach((name, idx) => index.set(name, idx));
    logger(`[WorldServices] CSV header (${header.length}): ${header.join(', ')}`);
    const rows: WorldServiceRow[] = [];
    let skipped = 0;
    for (const [rowIndex, line] of lines.slice(1).entries()) {
        const cols = parseCsvLine(line);
        if (cols.length < header.length) {
            skipped += 1;
            logger(
                `[WorldServices] Skipping row ${rowIndex + 2} (cols=${cols.length} expected=${header.length})`,
            );
            continue;
        }

        /**
         * Read a column by header name.
         * @param {string} name - Column name.
         * @returns {string} Column value.
         */
        const get = (name: string): string => cols[index.get(name) ?? -1] ?? '';
        const propScaleRaw = parseNumber(get('prop_scale'));
        const propScale = propScaleRaw > 10 ? propScaleRaw / 100 : propScaleRaw || 1.0;
        rows.push({
            worldId: Math.trunc(parseNumber(get('world_id'))),
            serviceType: Math.trunc(parseNumber(get('service_type'))),
            x: parseNumber(get('x')),
            y: parseNumber(get('y')),
            z: parseNumber(get('z')),
            rotation: parseNumber(get('rotation')),
            propModel: get('prop_model'),
            propTextures: splitList(get('prop_textures')),
            propRenderStyle: splitList(get('prop_renderstyle')),
            propScale,
            propMoveToFloor: Math.trunc(parseNumber(get('prop_movetofloor'))),
            propSolid: Math.trunc(parseNumber(get('prop_solid'))),
            flags: Math.trunc(parseNumber(get('flags'))),
        });
    }
    logger(`[WorldServices] Parsed rows=${rows.length} skipped=${skipped}`);
    return rows;
};

/**
 * Map a resource path to a file ID.
 * @param {string} value - Resource path.
 * @param {ReturnType<typeof buildFileIdMap>} idMap - File ID map.
 * @param {(msg: string) => void} log - Logger.
 * @returns {number} File ID or 0xffff for missing.
 */
const mapFileId = (
    value: string,
    idMap: ReturnType<typeof buildFileIdMap>,
    log: (msg: string) => void,
): number => {
    if (!value) return 0xffff;
    const normalized = normalizeResourcePath(value);
    const found = idMap.idByPath.get(normalized);
    if (found === undefined) {
        log(`[WorldServices] Missing fileId for resource: ${value}`);
        return 0xffff;
    }
    return found;
};

/**
 * Build model spawn blocks for world services in a specific world.
 * @param {WorldServiceOptions} options - Build options.
 * @returns {ReturnType<typeof createModelSpawnBlock>[]} Spawn blocks.
 */
export const buildWorldServiceSpawnBlocks = (options: WorldServiceOptions) => {
    const logger = options.log ?? (() => {});
    const allRows = loadRows(options.csvPath, logger);
    const rows = allRows.filter((row) => row.worldId === options.worldId);
    logger(
        `[WorldServices] Rows total=${allRows.length} for world_id=${options.worldId} => ${rows.length}`,
    );
    if (rows.length === 0) {
        logger(`[WorldServices] No rows for world_id=${options.worldId}`);
        return [];
    }
    logger(`[WorldServices] FileIdMap source=${options.resourceListPath ?? 'default'}`);
    const fileIdMap = buildFileIdMap(options.resourceListPath, logger);
    logger(`[WorldServices] FileIdMap entries=${fileIdMap.paths.length}`);
    const startId = options.startObjectId ?? 0x4000;
    const blocks = [];
    let missingModelCount = 0;
    let missingSkinCount = 0;
    let missingRenderCount = 0;
    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const objectId = startId + i;
        logger(
            `[WorldServices] Row#${i} -> obj=0x${objectId.toString(16)} model="${row.propModel}" skins=${row.propTextures.length} rs=${row.propRenderStyle.length} pos=(${row.x},${row.y},${row.z}) rot=${row.rotation} scale=${row.propScale}`,
        );
        const modelId = mapFileId(row.propModel, fileIdMap, logger);
        const skinIds = row.propTextures.map((tex) => mapFileId(tex, fileIdMap, logger));
        const renderStyleIds = row.propRenderStyle.map((rs) => mapFileId(rs, fileIdMap, logger));
        logger(
            `[WorldServices] Row#${i} fileIds: model=${modelId} skins=[${skinIds.join(',')}] rs=[${renderStyleIds.join(',')}]`,
        );
        if (modelId === 0xffff) {
            missingModelCount += 1;
            logger(`[WorldServices] Row#${i} missing model fileId: ${row.propModel}`);
        }
        if (skinIds.some((id) => id === 0xffff)) {
            missingSkinCount += 1;
            logger(`[WorldServices] Row#${i} missing skin fileIds: ${row.propTextures.join(';')}`);
        }
        if (renderStyleIds.some((id) => id === 0xffff)) {
            missingRenderCount += 1;
            logger(
                `[WorldServices] Row#${i} missing renderstyle fileIds: ${row.propRenderStyle.join(';')}`,
            );
        }
        let flagsA = FLAG_VISIBLE | FLAG_FULLPOSITIONRES;
        if (row.propSolid) flagsA |= FLAG_SOLID;
        const def: ModelSpawnDefinition = {
            objectId,
            position: { x: row.x, y: row.y, z: row.z },
            modelId,
            skinIds,
            renderStyleIds,
            flagsA,
            flagsB: 0,
            userFlags: 0,
            scale: { x: row.propScale, y: row.propScale, z: row.propScale },
            rotationYaw: row.rotation,
        };
        blocks.push(createModelSpawnBlock(def));
    }
    if (missingModelCount || missingSkinCount || missingRenderCount) {
        logger(
            `[WorldServices] Missing fileIds summary: model=${missingModelCount} skin=${missingSkinCount} renderstyle=${missingRenderCount}`,
        );
    }
    logger(
        `[WorldServices] Prepared ${blocks.length} world service spawns (world_id=${options.worldId})`,
    );
    return blocks;
};
