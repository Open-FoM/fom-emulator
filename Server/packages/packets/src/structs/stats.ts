/**
 * Stats block (ProfileD) - compressed u32 array.
 * Source: WorldLogin_ReadProfileBlockD.
 */

import { NativeBitStream, Struct } from '@openfom/networking';

/**
 * ProfileD - 53 compressed u32 values (stats/attributes).
 * Source: WorldLogin_ReadProfileBlockD @ 0x674334A0
 * Stat index map: Docs/Packets/ID_WORLD_LOGIN_DATA.md
 */

/**
 * Number of stats in ProfileD (compressed u32 entries).
 */
export const PROFILE_D_STAT_COUNT = 53;

/**
 * Definition for a ProfileD stat entry.
 */
export type ProfileDStatDef = {
    index: number;
    name: string;
    stringId?: number;
    notes?: string;
};

/**
 * ProfileD stat indices (runtime stat array offsets).
 */
export enum ProfileDStatIndex {
    Health = 0x00,
    Stamina = 0x01,
    BioEnergy = 0x02,
    Aura = 0x03,
    UniversalCredits = 0x04,
    FactionCredits = 0x05,
    Penalty = 0x06,
    PrisonerStatus = 0x07,
    HighestPenalty = 0x08,
    MostWantedStatus = 0x09,
    WantedStatus = 0x0a,
    Agility = 0x0b,
    BallisticDamage = 0x0c,
    EnergyDamage = 0x0d,
    BioDamage = 0x0e,
    AuraDamage = 0x0f,
    Destruction = 0x10,
    WeaponRecoil = 0x11,
    Armor = 0x12,
    Shielding = 0x13,
    Resistance = 0x14,
    Reflection = 0x15,
    HealthRegen = 0x16,
    StaminaRegen = 0x17,
    BioRegen = 0x18,
    AuraRegen = 0x19,
    Coins = 0x1a,
    HealingCooldown = 0x1b,
    FoodCooldown = 0x1c,
    XenoDamage = 0x1d,
    HealthDrain = 0x1e,
    StaminaDrain = 0x1f,
    BioEnergyDrain = 0x20,
    AuraDrain = 0x21,
    ProtectionBypass = 0x22,
    EffectiveRange = 0x23,
    WeaponFireDelay = 0x24,
    Blank1 = 0x25,
    Blank2 = 0x26,
    Weight = 0x27,
    JumpVelocityMultiplier = 0x28,
    FallDamageMultiplier = 0x29,
    Nightvision = 0x2a,
    SoundlessMovement = 0x2b,
    ActivationDistance = 0x2c,
    SprintSpeedMultiplier = 0x2d,
    MaxStamina = 0x2e,
    BioEnergyReplenishingCooldown = 0x2f,
    AuraHealingCooldown = 0x30,
    ShieldSettingOverrideFlag = 0x31,
    Unknown0x32 = 0x32,
    VortexEmitterCooldownFlag = 0x33,
    VortexEmitterCooldownSeconds = 0x34,
}

/**
 * Ordered list of stat definitions for ProfileD.
 */
export const PROFILE_D_STATS: ReadonlyArray<ProfileDStatDef> = Object.freeze([
    { index: 0x00, name: 'Health', stringId: 6300 },
    { index: 0x01, name: 'Stamina', stringId: 6301 },
    { index: 0x02, name: 'Bio Energy', stringId: 6302 },
    { index: 0x03, name: 'Aura', stringId: 6303 },
    { index: 0x04, name: 'Universal Credits', stringId: 6304, notes: 'currencyA - currencyB' },
    { index: 0x05, name: 'Faction Credits', stringId: 22103 },
    { index: 0x06, name: 'Penalty', stringId: 6306 },
    { index: 0x07, name: 'Prisoner Status', stringId: 6307, notes: "blocks item 'j' (msg 5668)" },
    { index: 0x08, name: 'Highest Penalty', stringId: 6308 },
    { index: 0x09, name: 'Most-Wanted Status', stringId: 6309 },
    { index: 0x0a, name: 'Wanted Status', stringId: 6310 },
    { index: 0x0b, name: 'Agility', stringId: 6311 },
    { index: 0x0c, name: 'Ballistic Damage', stringId: 6312 },
    { index: 0x0d, name: 'Energy Damage', stringId: 6313 },
    { index: 0x0e, name: 'Bio Damage', stringId: 6314 },
    { index: 0x0f, name: 'Aura Damage', stringId: 6315 },
    { index: 0x10, name: 'Destruction', stringId: 6316 },
    { index: 0x11, name: 'Weapon Recoil', stringId: 6317 },
    { index: 0x12, name: 'Armor', stringId: 29905 },
    { index: 0x13, name: 'Shielding', stringId: 6319 },
    { index: 0x14, name: 'Resistance', stringId: 6320 },
    { index: 0x15, name: 'Reflection', stringId: 6321 },
    { index: 0x16, name: 'Health Regeneration', stringId: 6322 },
    { index: 0x17, name: 'Stamina Regeneration', stringId: 6323 },
    { index: 0x18, name: 'Bio Regeneration', stringId: 6324 },
    { index: 0x19, name: 'Aura Regeneration', stringId: 6325 },
    { index: 0x1a, name: 'Coins', stringId: 6326 },
    { index: 0x1b, name: 'Healing Cooldown', stringId: 6427 },
    { index: 0x1c, name: 'Food Cooldown', stringId: 6428 },
    { index: 0x1d, name: 'Xeno Damage', stringId: 6329 },
    { index: 0x1e, name: 'Health Drain', stringId: 6330 },
    { index: 0x1f, name: 'Stamina Drain', stringId: 6331 },
    { index: 0x20, name: 'Bio Energy Drain', stringId: 6332 },
    { index: 0x21, name: 'Aura Drain', stringId: 6333 },
    { index: 0x22, name: 'Protection Bypass', stringId: 6334 },
    { index: 0x23, name: 'Effective Range', stringId: 6335 },
    { index: 0x24, name: 'Weapon Fire Delay', stringId: 6336 },
    { index: 0x25, name: 'Blank 1', stringId: 6337 },
    { index: 0x26, name: 'Blank 2', stringId: 6338 },
    { index: 0x27, name: 'Weight', stringId: 6339 },
    { index: 0x28, name: 'Jump Velocity Multiplier', stringId: 6340 },
    { index: 0x29, name: 'Fall Damage Multiplier', stringId: 6341 },
    { index: 0x2a, name: 'Nightvision', stringId: 6342 },
    { index: 0x2b, name: 'Soundless Movement', stringId: 6343 },
    { index: 0x2c, name: 'Activation Distance', stringId: 6344 },
    { index: 0x2d, name: 'Sprint Speed Multiplier', stringId: 6345 },
    { index: 0x2e, name: 'Max Stamina', stringId: 6346 },
    { index: 0x2f, name: 'Bio Energy Replenishing Cooldown', stringId: 6347 },
    { index: 0x30, name: 'Aura Healing Cooldown', stringId: 6348 },
    { index: 0x31, name: 'Shield Setting Override Flag' },
    { index: 0x32, name: 'Unknown' },
    { index: 0x33, name: 'Vortex Emitter Cooldown Flag' },
    { index: 0x34, name: 'Vortex Emitter Cooldown Seconds' },
]);

/**
 * Map from stat index to definition for quick lookups.
 */
export const PROFILE_D_STATS_BY_INDEX: Readonly<Record<number, ProfileDStatDef>> = Object.freeze(
    Object.fromEntries(PROFILE_D_STATS.map((def) => [def.index, def])),
);

/**
 * Stats container (ProfileD compressed u32 stat array).
 */
export class Stats extends Struct {
    constructor(public values: number[] = Array(PROFILE_D_STAT_COUNT).fill(0)) {
        super();
    }

    /**
     * Serialize ProfileD stats array.
     */
    encode(bs: NativeBitStream): void {
        for (let i = 0; i < PROFILE_D_STAT_COUNT; i++) bs.writeCompressedU32(this.values[i]);
    }

    /**
     * Deserialize ProfileD stats array.
     */
    static decode(bs: NativeBitStream): Stats {
        return new Stats(
            Array(PROFILE_D_STAT_COUNT)
                .fill(0)
                .map(() => bs.readCompressedU32()),
        );
    }

    /**
     * Read a stat by index with bounds fallback.
     */
    getStat(index: number): number {
        return this.values[index] ?? 0;
    }

    /**
     * Write a stat by index, clamped to array bounds.
     */
    setStat(index: number, value: number): void {
        if (index >= 0 && index < PROFILE_D_STAT_COUNT) {
            this.values[index] = value >>> 0;
        }
    }

    /**
     * Create a default ProfileD payload with starter values.
     */
    static empty(): Stats {
        const values = Array(PROFILE_D_STAT_COUNT).fill(0);

        // Stats
        values[ProfileDStatIndex.Health] = 1000;
        values[ProfileDStatIndex.HealthRegen] = 3;
        values[ProfileDStatIndex.Stamina] = 10000;
        values[ProfileDStatIndex.BioEnergy] = 1000;
        values[ProfileDStatIndex.Aura] = 1000;
        values[ProfileDStatIndex.AuraRegen] = 43;
        values[ProfileDStatIndex.Agility] = 800; // 80.0%
        values[ProfileDStatIndex.MaxStamina] = 10000;
        values[ProfileDStatIndex.JumpVelocityMultiplier] = 1100;
        values[ProfileDStatIndex.SprintSpeedMultiplier] = 1200;

        // Currencies
        values[ProfileDStatIndex.UniversalCredits] = 10000;
        values[ProfileDStatIndex.Coins] = 100;
        return new Stats(values);
    }
}
