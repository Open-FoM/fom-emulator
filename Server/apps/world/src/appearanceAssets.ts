/**
 * Resolve appearance assets from item templates and defaults.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { AppearanceData } from '@openfom/packets';
import { APPEARANCE_DEFAULTS } from '@openfom/packets';

/**
 * Item template mapping for appearance gear.
 */
export type AppearanceItemTemplate = {
    itemId: number;
    modelKey: string;
    skinPath: string;
};

/**
 * Resolved appearance asset file paths.
 */
export type AppearanceAssets = {
    modelFiles: string[];
    skinFiles: string[];
    headSkin?: string;
    hairSkin?: string;
};

/**
 * Appearance payload plus resolved asset paths.
 */
export type ResolvedAppearance = {
    profile: AppearanceData;
    assets: AppearanceAssets;
};

/**
 * Resolve the repo root for appearance CSV discovery.
 * @returns {string} Repo root path.
 */
const resolveRepoRoot = (): string => {
    const cwd = process.cwd();
    const candidates = [cwd, join(cwd, '..', '..', '..')];
    for (const base of candidates) {
        if (existsSync(join(base, 'Docs'))) return base;
    }
    return cwd;
};
const CSV_PATH = join(resolveRepoRoot(), 'Docs', 'Appearance', 'Appearance_ItemTemplate.csv');
let cachedTemplateMap: Map<number, AppearanceItemTemplate> | null = null;
const HEAD_TEX = {
    male: [
        'm_Face1_1',
        'm_Face2_2',
        'm_Face3_3',
        'm_Face4_4',
        'm_Face4_5',
        'm_Face1_6',
        'm_Face1_7',
        'm_Face1_8',
        'm_Face1_9',
        'm_Face2_10',
        'm_Face2_11',
        'm_Face2_12',
        'm_Face2_13',
        'm_Face3_14',
        'm_Face3_15',
        'm_Face3_16',
        'm_Face3_17',
        'm_Face4_18',
        'm_Face4_19',
        'm_Face4_20',
        'm_Face1_21',
        'm_Face2_22',
        'm_Face3_23',
        'm_Face1_24',
        'm_Face2_25',
        'm_Face3_26',
        'm_Face4_27',
        'm_Face4_28',
    ],
    female: [
        'f_Face1_1',
        'f_Face2_2',
        'f_Face3_3',
        'f_Face4_4',
        'f_Face4_5',
        'f_Face1_6',
        'f_Face1_7',
        'f_Face1_8',
        'f_Face1_9',
        'f_Face2_10',
        'f_Face2_11',
        'f_Face2_12',
        'f_Face2_13',
        'f_Face3_14',
        'f_Face3_15',
        'f_Face3_16',
        'f_Face3_17',
        'f_Face4_18',
        'f_Face4_19',
        'f_Face4_20',
        'f_Face1_21',
        'f_Face2_22',
        'f_Face3_23',
        'f_Face1_24',
        'f_Face2_25',
        'f_Face3_26',
        'f_Face4_27',
        'f_Face4_28',
    ],
};
const HAIR_TEX = {
    male: [
        'm_Hair1_1',
        'm_Hair1_2',
        'm_Hair1_3',
        'm_Hair2_4',
        'm_Hair2_5',
        'm_Hair2_6',
        'm_Hair3_7',
        'm_Hair3_8',
        'm_Hair3_9',
        'm_Hair4_10',
        'm_Hair4_11',
        'm_Hair4_12',
        'm_Hair5_13',
        'm_Hair5_14',
        'm_Hair5_15',
        'm_Hair6_16',
        'm_Hair7_17',
        'm_Hair8_18',
        'm_Hair9_19',
        'm_Hair10_20',
        'm_Hair11_21',
        'm_Hair12_22',
        'm_Hair13_23',
    ],
    female: [
        'f_Hair1_1',
        'f_Hair1_2',
        'f_Hair1_3',
        'f_Hair2_4',
        'f_Hair2_5',
        'f_Hair2_6',
        'f_Hair3_7',
        'f_Hair3_8',
        'f_Hair3_9',
        'f_Hair4_10',
        'f_Hair4_11',
        'f_Hair4_12',
        'f_Hair5_13',
        'f_Hair5_14',
        'f_Hair5_15',
        'f_Hair6_16',
        'f_Hair7_17',
        'f_Hair8_18',
        'f_Hair9_19',
        'f_Hair10_20',
        'f_Hair11_21',
        'f_Hair12_22',
        'f_Hair13_23',
    ],
};

/**
 * Build a head texture path from a texture name.
 * @param {string | undefined} name - Texture name.
 * @returns {string | undefined} Texture path or undefined.
 */
const toHeadSkinPath = (name: string | undefined): string | undefined =>
    name ? `Skins/Characters/Head/${name}.dtx` : undefined;

/**
 * Parse a CSV line into fields.
 * @param {string} line - CSV line text.
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
 * Load the appearance item template map from CSV (cached).
 * @returns {Map<number, AppearanceItemTemplate>} Template map keyed by itemId.
 */
const loadAppearanceTemplateMap = (): Map<number, AppearanceItemTemplate> => {
    if (cachedTemplateMap) return cachedTemplateMap;
    const map = new Map<number, AppearanceItemTemplate>();
    if (!existsSync(CSV_PATH)) {
        cachedTemplateMap = map;
        return map;
    }
    const raw = readFileSync(CSV_PATH, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(1)) {
        const cols = parseCsvLine(line);
        if (cols.length < 7) continue;
        const itemId = Number(cols[1]);
        if (!Number.isFinite(itemId)) continue;
        map.set(itemId, {
            itemId,
            modelKey: cols[5] ?? '',
            skinPath: cols[6] ?? '',
        });
    }
    cachedTemplateMap = map;
    return map;
};

/**
 * Resolve a character model path from a model key and gender.
 * @param {string} modelKey - Model key from the template.
 * @param {boolean} isFemale - Whether to use the female model prefix.
 * @returns {string | null} Model path or null when missing.
 */
const resolveModelPath = (modelKey: string, isFemale: boolean): string | null => {
    if (!modelKey) return null;
    const prefix = isFemale ? 'f_' : 'm_';
    return `Models/Items/Characters/${prefix}${modelKey}.ltb`;
};

/**
 * Resolve a template entry by itemId.
 * @param {number} [itemId] - Item template ID.
 * @returns {AppearanceItemTemplate | null} Template entry or null.
 */
const resolveTemplate = (itemId?: number): AppearanceItemTemplate | null => {
    if (!itemId) return null;
    const map = loadAppearanceTemplateMap();
    return map.get(itemId) ?? null;
};

/**
 * Select the head skin texture path.
 * @param {number | undefined} headTex - Head texture index.
 * @param {boolean} isFemale - Whether to use female textures.
 * @returns {string | undefined} Texture path or undefined.
 */
const chooseHeadSkin = (headTex: number | undefined, isFemale: boolean): string | undefined => {
    const list = isFemale ? HEAD_TEX.female : HEAD_TEX.male;
    const name = list[headTex ?? 0];
    return toHeadSkinPath(name);
};

/**
 * Select the hair skin texture path.
 * @param {number | undefined} hairTex - Hair texture index.
 * @param {boolean} isFemale - Whether to use female textures.
 * @returns {string | undefined} Texture path or undefined.
 */
const chooseHairSkin = (hairTex: number | undefined, isFemale: boolean): string | undefined => {
    const list = isFemale ? HAIR_TEX.female : HAIR_TEX.male;
    const name = list[hairTex ?? 0];
    return toHeadSkinPath(name);
};

/**
 * Build a default appearance payload by gender.
 * @param {boolean} isFemale - Whether to use female defaults.
 * @returns {AppearanceData} Appearance payload.
 */
export const createDefaultAppearance = (isFemale = false): AppearanceData => ({
    isFemale: isFemale ? 1 : 0,
    skinTone: isFemale ? APPEARANCE_DEFAULTS.FEMALE_SKIN_TONE : APPEARANCE_DEFAULTS.MALE_SKIN_TONE,
    headTexA: isFemale
        ? APPEARANCE_DEFAULTS.FEMALE_HEAD_TEX_A
        : APPEARANCE_DEFAULTS.MALE_HEAD_TEX_A,
    headTexB: isFemale
        ? APPEARANCE_DEFAULTS.FEMALE_HEAD_TEX_B
        : APPEARANCE_DEFAULTS.MALE_HEAD_TEX_B,
    torsoItemId: isFemale ? APPEARANCE_DEFAULTS.FEMALE_TORSO : APPEARANCE_DEFAULTS.MALE_TORSO,
    legsItemId: isFemale ? APPEARANCE_DEFAULTS.FEMALE_LEGS : APPEARANCE_DEFAULTS.MALE_LEGS,
    shoesItemId: isFemale ? APPEARANCE_DEFAULTS.FEMALE_SHOES : APPEARANCE_DEFAULTS.MALE_SHOES,
});

/**
 * Resolve appearance assets for a profile payload.
 * @param {AppearanceData} profile - Appearance payload.
 * @returns {ResolvedAppearance} Resolved assets with profile.
 */
export const resolveAppearance = (profile: AppearanceData): ResolvedAppearance => {
    const isFemale = Boolean(profile.isFemale);
    const torso = resolveTemplate(profile.torsoItemId);
    const legs = resolveTemplate(profile.legsItemId);
    const shoes = resolveTemplate(profile.shoesItemId);
    const modelFiles = new Set<string>();
    const skinFiles = new Set<string>();
    for (const entry of [torso, legs, shoes]) {
        if (!entry) continue;
        const modelPath = resolveModelPath(entry.modelKey, isFemale);
        if (modelPath) modelFiles.add(modelPath);
        if (entry.skinPath) skinFiles.add(entry.skinPath);
    }
    const headSkin = chooseHeadSkin(profile.headTexA, isFemale);
    const hairSkin = chooseHairSkin(profile.headTexB, isFemale);
    if (headSkin) skinFiles.add(headSkin);
    if (hairSkin) skinFiles.add(hairSkin);
    return {
        profile,
        assets: {
            modelFiles: Array.from(modelFiles),
            skinFiles: Array.from(skinFiles),
            headSkin,
            hairSkin,
        },
    };
};
