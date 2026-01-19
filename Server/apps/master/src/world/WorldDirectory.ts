/**
 * Track discovered world servers and resolve endpoints for login flow.
 */
export type WorldEndpoint = {
    ip: string;
    port: number;
    key: string;
    worldId?: number;
};
export type WorldServerInfo = {
    worldId: number;
    worldIp: string;
    worldPort: number;
    source: WorldEndpoint;
    lastSeenMs: number;
};
export class WorldDirectory {
    private endpoints: WorldEndpoint[];
    private byWorldId: Map<number, WorldServerInfo> = new Map();
    private byEndpointKey: Map<string, WorldServerInfo> = new Map();

    /**
     * Create a world directory with initial endpoints.
     * @param {WorldEndpoint[]} endpoints - Initial world endpoints.
     */
    constructor(endpoints: WorldEndpoint[]) {
        this.endpoints = endpoints;
    }

    /**
     * List configured world endpoints.
     * @returns {WorldEndpoint[]} World endpoint list.
     */
    listEndpoints(): WorldEndpoint[] {
        return this.endpoints;
    }
    // Replace endpoint list (used by ServerManager to track online worlds).

    /**
     * Replace the configured world endpoints.
     * @param {WorldEndpoint[]} endpoints - New world endpoints.
     * @returns {void} No return value.
     */
    setEndpoints(endpoints: WorldEndpoint[]): void {
        this.endpoints = endpoints;
        if (endpoints.length === 0) {
            this.byWorldId.clear();
            this.byEndpointKey.clear();
            return;
        }
        const allowed = new Set(endpoints.map((entry) => entry.key));
        for (const [worldId, entry] of this.byWorldId.entries()) {
            if (!allowed.has(entry.source.key)) {
                this.byWorldId.delete(worldId);
            }
        }
        for (const key of Array.from(this.byEndpointKey.keys())) {
            if (!allowed.has(key)) {
                this.byEndpointKey.delete(key);
            }
        }
        // Seed worldId entries supplied by admin/server manager even if discovery hasn't replied yet.
        for (const endpoint of endpoints) {
            if (!endpoint.worldId || endpoint.worldId <= 0) continue;
            this.updateFromInfo({
                worldId: endpoint.worldId,
                worldIp: endpoint.ip,
                worldPort: endpoint.port,
                source: endpoint,
            });
        }
    }
    // Fallback: synthesize world IDs from endpoint order (1-based).

    /**
     * Build fallback world IDs from endpoint order.
     * @returns {number[]} Fallback world ID list.
     */
    getFallbackWorldIds(): number[] {
        const ids: number[] = [];
        const seen = new Set<number>();
        for (const endpoint of this.endpoints) {
            if (endpoint.worldId && endpoint.worldId > 0) {
                if (!seen.has(endpoint.worldId)) {
                    ids.push(endpoint.worldId);
                    seen.add(endpoint.worldId);
                }
                continue;
            }
            const synthetic = ids.length + 1;
            if (!seen.has(synthetic)) {
                ids.push(synthetic);
                seen.add(synthetic);
            }
        }
        return ids;
    }
    // Fallback: resolve endpoint by 1-based synthetic world ID; worldId<=0 => first endpoint.

    /**
     * Resolve a fallback endpoint for a world ID.
     * @param {number} worldId - World ID to resolve.
     * @returns {WorldEndpoint | null} Resolved endpoint or null.
     */
    resolveFallbackEndpoint(worldId: number): WorldEndpoint | null {
        if (this.endpoints.length === 0) return null;
        const hasExplicit = this.endpoints.some((endpoint) => (endpoint.worldId ?? 0) > 0);
        if (hasExplicit) {
            if (worldId > 0) {
                const match = this.endpoints.find((endpoint) => endpoint.worldId === worldId);
                if (match) return match;
            }
            // Fall back to first explicitly tagged endpoint.
            const first = this.endpoints.find((endpoint) => (endpoint.worldId ?? 0) > 0);
            return first ?? this.endpoints[0];
        }
        if (worldId <= 0) return this.endpoints[0];
        const index = worldId - 1;
        return this.endpoints[index] ?? null;
    }

    /**
     * Get the default fallback world ID.
     * @returns {number | null} Default fallback world ID or null.
     */
    getDefaultFallbackWorldId(): number | null {
        if (this.endpoints.length === 0) return null;
        const explicit = this.endpoints.find((endpoint) => (endpoint.worldId ?? 0) > 0);
        if (explicit?.worldId) return explicit.worldId;
        return 1;
    }

    /**
     * Update directory state from a world info payload.
     * @param {Omit<WorldServerInfo, 'lastSeenMs'>} info - World info without timestamps.
     * @returns {void} No return value.
     */
    updateFromInfo(info: Omit<WorldServerInfo, 'lastSeenMs'>): void {
        const entry: WorldServerInfo = {
            ...info,
            lastSeenMs: Date.now(),
        };
        this.byWorldId.set(entry.worldId, entry);
        this.byEndpointKey.set(entry.source.key, entry);
    }

    /**
     * Resolve a world by ID.
     * @param {number} worldId - World ID.
     * @returns {WorldServerInfo | null} World info or null.
     */
    resolveWorld(worldId: number): WorldServerInfo | null {
        return this.byWorldId.get(worldId) ?? null;
    }

    /**
     * Resolve a world by endpoint key.
     * @param {string} key - Endpoint key.
     * @returns {WorldServerInfo | null} World info or null.
     */
    resolveByEndpointKey(key: string): WorldServerInfo | null {
        return this.byEndpointKey.get(key) ?? null;
    }

    /**
     * List known world IDs in ascending order.
     * @returns {number[]} Sorted world IDs.
     */
    getWorldIds(): number[] {
        return Array.from(this.byWorldId.keys()).sort((a, b) => a - b);
    }

    /**
     * Get the default world ID from discovered worlds.
     * @returns {number | null} Default world ID or null.
     */
    getDefaultWorldId(): number | null {
        const ids = this.getWorldIds();
        return ids.length > 0 ? ids[0] : null;
    }

    /**
     * Prune stale world entries older than a max age.
     * @param {number} maxAgeMs - Maximum age in milliseconds.
     * @returns {void} No return value.
     */
    pruneStale(maxAgeMs: number): void {
        if (maxAgeMs <= 0) return;
        const now = Date.now();
        for (const [worldId, entry] of this.byWorldId.entries()) {
            if (now - entry.lastSeenMs > maxAgeMs) {
                this.byWorldId.delete(worldId);
                this.byEndpointKey.delete(entry.source.key);
            }
        }
    }

    /**
     * Describe the directory contents for logging.
     * @returns {string} Summary string.
     */
    describe(): string {
        const ids = this.getWorldIds();
        if (ids.length === 0) return 'WorldDirectory{empty}';
        const summary = ids
            .map((id) => {
                const info = this.byWorldId.get(id);
                if (!info) return `${id}:?`;
                return `${id}:${info.worldIp}:${info.worldPort}`;
            })
            .join(', ');
        return `WorldDirectory{${summary}}`;
    }
}

/**
 * Build a world endpoint descriptor from IP/port.
 * @param {string} ip - World IP address.
 * @param {number} port - World port.
 * @param {number} [worldId] - Optional world ID.
 * @returns {WorldEndpoint} World endpoint descriptor.
 */
export function buildWorldEndpoint(ip: string, port: number, worldId?: number): WorldEndpoint {
    return {
        ip,
        port,
        key: `${ip}:${port}`,
        worldId: Number.isFinite(worldId) ? (worldId as number) : undefined,
    };
}
