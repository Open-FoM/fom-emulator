/**
 * Track and broadcast player movement updates.
 */
import type { RakSystemAddress } from '@openfom/networking';
import {
    MsgUnguaranteedUpdate,
    type PacketIdUpdate,
    type UnguaranteedUpdateEntry,
} from '@openfom/packets';
const UUF_POS = 0x4;
const UUF_YROTATION = 0x8;

/**
 * Latest movement snapshot tracked for a player.
 */
export interface MovementState {
    playerId: number;
    x: number;
    y: number;
    z: number;
    yaw: number;
    lastUpdateMs: number;
}

/**
 * Broadcast recipient for movement updates.
 */
export interface MovementRecipient {
    address: RakSystemAddress;
}

/**
 * Options for configuring the movement broadcaster loop.
 */
export interface MovementBroadcasterOptions {
    updateHz: number;
    getRecipients: () => MovementRecipient[];
    sendUnreliable: (data: Buffer, address: RakSystemAddress) => void;
    getGameTimeSeconds: () => number;
}

/**
 * Broadcasts condensed movement updates at a fixed cadence.
 */
export class MovementBroadcaster {
    private states = new Map<number, MovementState>();
    private timer: ReturnType<typeof setInterval> | null = null;
    private readonly options: MovementBroadcasterOptions;

    /**
     * Create a new broadcaster instance.
     * @param {MovementBroadcasterOptions} options - Broadcast configuration and hooks.
     */
    constructor(options: MovementBroadcasterOptions) {
        this.options = options;
    }

    /**
     * Track the latest client->server movement snapshot per player.
     * @param {PacketIdUpdate} update - Incoming movement update packet.
     * @returns {void} No return value.
     */
    recordPacket(update: PacketIdUpdate): void {
        for (const entry of update.entries) {
            if (!entry.position || entry.playerId === undefined) continue;
            const pos = entry.position;
            this.states.set(entry.playerId, {
                playerId: entry.playerId,
                x: pos.x,
                y: pos.y,
                z: pos.z,
                yaw: pos.rotation,
                lastUpdateMs: Date.now(),
            });
        }
    }

    /**
     * Fetch the last known movement state for a player.
     * @param {number} playerId - Player ID to lookup.
     * @returns {MovementState | null} Movement state or null if missing.
     */
    getState(playerId: number): MovementState | null {
        return this.states.get(playerId) ?? null;
    }

    /**
     * Remove a player from replication (e.g., disconnect cleanup).
     * @param {number} playerId - Player ID to remove.
     * @returns {void} No return value.
     */
    removePlayer(playerId: number): void {
        this.states.delete(playerId);
    }

    /**
     * Start the periodic broadcast loop.
     * @returns {void} No return value.
     */
    start(): void {
        if (this.timer) return;
        const intervalMs = Math.max(1, Math.floor(1000 / Math.max(1, this.options.updateHz)));
        this.timer = setInterval(() => this.tick(), intervalMs);
    }

    /**
     * Stop the periodic broadcast loop.
     * @returns {void} No return value.
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Build a minimal unguaranteed update list (pos + yaw only).
     * @returns {UnguaranteedUpdateEntry[]} Encoded movement entries.
     */
    private buildEntries(): UnguaranteedUpdateEntry[] {
        const entries: UnguaranteedUpdateEntry[] = [];
        for (const state of this.states.values()) {
            entries.push({
                objectId: state.playerId & 0xffff,
                flags: UUF_POS | UUF_YROTATION,
                position: { x: state.x, y: state.y, z: state.z },
                yaw: state.yaw,
            });
        }
        return entries;
    }

    /**
     * Emit a single broadcast tick to all recipients.
     * @returns {void} No return value.
     */
    private tick(): void {
        const recipients = this.options.getRecipients();
        if (recipients.length === 0) return;
        const entries = this.buildEntries();
        // TODO: Replace global broadcast with AOI + per-client budgets.
        // TODO: Encode position using world extents (EncodeCompressWorldPosition) once we have world BSP extents.
        const msg = new MsgUnguaranteedUpdate({
            entries,
            gameTime: this.options.getGameTimeSeconds(),
        });
        const payload = msg.encode();
        for (const recipient of recipients) {
            this.options.sendUnreliable(payload, recipient.address);
        }
    }
}
