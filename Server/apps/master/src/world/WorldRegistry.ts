/**
 * World registry tables and lookup helpers.
 */
export type WorldInfo = {
    id: number;
    folder: string | null;
    display: string;
};
// Synced to the client runtime world table (CShell g_WorldTable). WORLD_ID is 1-based index.
// folder = null indicates missing/unmapped world data in current assets.
export const WORLD_TABLE: ReadonlyArray<WorldInfo> = [
    { id: 1, folder: 'NY_Manhattan', display: 'NYC - Manhattan' },
    { id: 2, folder: 'NY_Brooklyn', display: 'NYC - Brooklyn' },
    { id: 3, folder: 'tokyo', display: 'Tokyo - Upper' },
    { id: 4, folder: 'apartments', display: 'Apartments' },
    { id: 5, folder: null, display: 'Earth' },
    { id: 6, folder: 'necarsfield', display: 'Necars Field' },
    { id: 7, folder: 'Paris', display: 'Paris' },
    { id: 8, folder: null, display: 'Testing' },
    { id: 9, folder: 'Berlin', display: 'Berlin' },
    { id: 10, folder: 'lowertokyo', display: 'Tokyo - Lower' },
    { id: 11, folder: 'AndromedaCity', display: 'Andromeda City' },
    { id: 12, folder: 'Newhaven', display: 'New Haven' },
    { id: 13, folder: null, display: 'Ganymede' },
    { id: 14, folder: 'DeMorgan', display: 'DeMorgans Castle' },
    { id: 15, folder: 'keplersdome', display: 'Keplers Dome' },
    { id: 16, folder: 'Moonbase', display: 'Moon Base' },
    { id: 17, folder: null, display: 'STS Genesis' },
    { id: 18, folder: 'NY_GroundZero', display: 'NYC - Ground Zero' },
    { id: 19, folder: 'BookersValley', display: 'Bookers Valley' },
    { id: 20, folder: null, display: 'Epsilon Eridani' },
    { id: 21, folder: 'TerraVentureI', display: 'Terra Venture I' },
    { id: 22, folder: null, display: 'Dominion Exodus' },
    { id: 23, folder: null, display: 'Espen Paradise' },
    { id: 24, folder: 'Aquatica', display: 'Aquatica' },
    { id: 25, folder: 'Pegasi51', display: 'Pegasi 51' },
    { id: 26, folder: 'Aurelia', display: 'Aurelia' },
    { id: 27, folder: 'PaxPrime', display: 'Pax Prime' },
    { id: 28, folder: 'ceresdelta', display: 'Ceres Delta' },
    { id: 29, folder: 'titanstation', display: 'Titan Station' },
    { id: 30, folder: 'CloneFac', display: 'Cloning Facility' },
    { id: 31, folder: 'TrainingCenter', display: 'Training Center' },
    { id: 32, folder: null, display: '' },
];
export const APARTMENT_WORLD_TABLE: Readonly<Record<number, string>> = {
    1: 'city_1',
    2: 'colony_dirty_1',
    3: 'colony_1',
    4: 'city_paris_1',
    5: 'tokyo_1',
    6: 'colony_aqua_1',
    7: 'city_2',
    8: 'colony_dirty_2',
    9: 'colony_2',
    10: 'city_paris_2',
    11: 'tokyo_2',
    12: 'colony_aqua_2',
    13: 'colony_dirty_3',
    14: 'colony_3',
    15: 'city_paris_3',
    16: 'tokyo_3',
    17: 'colony_aqua_3',
    18: 'hq_cl',
    19: 'hq_gd',
    20: 'hq_co',
    21: 'spaceship',
    22: 'ci_prison_duel',
    23: 'backer_pent',
};

/**
 * Lookup world info by numeric ID.
 * @param {number} id - World ID.
 * @returns {WorldInfo | undefined} World info or undefined.
 */
export function getWorldInfo(id: number): WorldInfo | undefined {
    // Look up by numeric world id.
    return WORLD_TABLE.find((entry) => entry.id === id);
}

/**
 * Lookup apartment folder by index.
 * @param {number} index - Apartment index.
 * @returns {string | undefined} Apartment folder name or undefined.
 */
export function getApartmentFolder(index: number): string | undefined {
    // Lookup apartment instance folder by index.
    return APARTMENT_WORLD_TABLE[index];
}
