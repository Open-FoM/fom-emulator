/**
 * Player entity definitions and helpers for world replication.
 */
import type { AppearanceData } from '@openfom/packets';
import type { AppearanceAssets } from './appearanceAssets';

/**
 * Minimal vector type for world-space positions (LithTech units).
 */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Server-side representation of a player replicated via MSG_ID_WORLD_UPDATE (0x19).
 */
export interface PlayerEntity {
    playerId: number;
    username?: string;
    worldId: number;
    worldInst: number;
    profile: AppearanceData;
    appearanceAssets: AppearanceAssets;
    position: Vec3;
    yaw: number;
    lastUpdateMs: number;
}

/**
 * Inputs for creating a new player entity snapshot.
 */
export interface PlayerEntityInit {
    playerId: number;
    worldId: number;
    worldInst: number;
    profile: AppearanceData;
    appearanceAssets: AppearanceAssets;
    username?: string;
    position?: Vec3;
    yaw?: number;
    nowMs?: number;
}

/**
 * Create a new player entity snapshot with defaults for missing values.
 * @param {PlayerEntityInit} init - Input values for the entity.
 * @returns {PlayerEntity} Initialized player entity snapshot.
 */
export const createPlayerEntity = (init: PlayerEntityInit): PlayerEntity => {
    const now = init.nowMs ?? Date.now();
    return {
        playerId: init.playerId,
        username: init.username,
        worldId: init.worldId,
        worldInst: init.worldInst,
        profile: init.profile,
        appearanceAssets: init.appearanceAssets,
        position: init.position ?? { x: 0, y: 0, z: 0 },
        yaw: init.yaw ?? 0,
        lastUpdateMs: now,
    };
};
