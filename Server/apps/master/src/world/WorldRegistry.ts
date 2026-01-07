export type WorldInfo = {
    id: number;
    folder: string | null;
    display: string;
};

// Synced to Client/Client_FoM/Resources/Worlds. If folder is null, the file is missing/unknown in current assets.
export const WORLD_TABLE: ReadonlyArray<WorldInfo> = [
    { id: 1, folder: 'NY_Manhattan', display: 'NYC-Manhattan' },
    { id: 2, folder: 'NY_Brooklyn', display: 'NYC-Brooklyn' },
    { id: 3, folder: 'tokyo', display: 'Tokyo - Upper' },
    { id: 4, folder: 'apartments', display: 'Apartments' },
    { id: 5, folder: null, display: 'Earth' },
    { id: 6, folder: 'necarsfield', display: 'Necarsfield' },
    { id: 7, folder: 'Paris', display: 'Paris' },
    { id: 8, folder: 'Aquatica', display: 'Aquatica' },
    { id: 9, folder: 'Berlin', display: 'Berlin' },
    { id: 10, folder: 'lowertokyo', display: 'Tokyo - Lower' },
    { id: 11, folder: 'AndromedaCity', display: 'Andromeda City' },
    { id: 12, folder: 'Newhaven', display: 'Newhaven' },
    { id: 13, folder: 'Aurelia', display: 'Aurelia' },
    { id: 14, folder: 'DeMorgan', display: 'De Morgan' },
    { id: 15, folder: 'CloneFac', display: 'Clone Facility' },
    { id: 16, folder: 'MoonBase', display: 'Moonbase' },
    { id: 17, folder: 'Pegasi51', display: 'Pegasi 51' },
    { id: 18, folder: 'NY_GroundZero', display: 'NYC-Ground Zero' },
    { id: 19, folder: 'BookersValley', display: 'Bookers Valley' },
    { id: 20, folder: 'titanstation', display: 'Titan Station' },
    { id: 21, folder: 'TerraVentureI', display: 'Terra Venture I' },
    { id: 22, folder: null, display: 'Dominion Exodus (missing)' },
    { id: 23, folder: null, display: 'Espen Paradise (missing)' },
];

// Remaining missing IDs: 22 (Dominion Exodus), 23 (Espen Paradise)

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

export function getWorldInfo(id: number): WorldInfo | undefined {
    // Look up by numeric world id.
    return WORLD_TABLE.find((entry) => entry.id === id);
}

export function getApartmentFolder(index: number): string | undefined {
    // Lookup apartment instance folder by index.
    return APARTMENT_WORLD_TABLE[index];
}
