/**
 * Periodically query world servers for authoritative world info.
 */
import {
    addressFromString,
    RakPriority,
    RakReliability,
    type RakPeer,
    type RakSystemAddress,
} from '@openfom/networking';
import { IdWorldQueryPacket, IdWorldInfoPacket } from '@openfom/packets';
import { info, warn } from '@openfom/utils';
import { buildWorldEndpoint, type WorldDirectory, type WorldEndpoint } from './WorldDirectory';
export interface WorldDiscoveryConfig {
    token: string;
    password: string;
    queryIntervalMs: number;
    staleTtlMs: number;
    debug: boolean;
}
export class WorldDiscoveryClient {
    private peer: RakPeer;
    private directory: WorldDirectory;
    private config: WorldDiscoveryConfig;
    private timer: ReturnType<typeof setInterval> | null = null;
    private warnedNoEndpoints = false;
    private lastInfoLogByWorldId: Map<number, string> = new Map();

    /**
     * Create a world discovery client.
     * @param {RakPeer} peer - RakNet peer instance.
     * @param {WorldDirectory} directory - World directory to update.
     * @param {WorldDiscoveryConfig} config - Discovery configuration.
     */
    constructor(peer: RakPeer, directory: WorldDirectory, config: WorldDiscoveryConfig) {
        this.peer = peer;
        this.directory = directory;
        this.config = config;
    }

    /**
     * Start periodic world discovery queries.
     * @returns {void} No return value.
     */
    start(): void {
        this.queryAll();
        if (this.config.queryIntervalMs > 0) {
            this.timer = setInterval(() => this.queryAll(), this.config.queryIntervalMs);
        }
    }

    /**
     * Stop periodic world discovery queries.
     * @returns {void} No return value.
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Query all configured world endpoints.
     * @returns {void} No return value.
     */
    queryAll(): void {
        const endpoints = this.directory.listEndpoints();
        if (endpoints.length === 0) {
            if (this.config.debug) {
                if (!this.warnedNoEndpoints) {
                    warn('[WorldDiscovery] No world endpoints configured');
                    this.warnedNoEndpoints = true;
                }
            }
            return;
        }
        this.warnedNoEndpoints = false;
        if (!this.config.token) {
            warn('[WorldDiscovery] No discovery token configured; skipping query');
            return;
        }
        for (const endpoint of endpoints) {
            this.ensureConnected(endpoint);
            const address = addressFromString(endpoint.ip, endpoint.port);
            const packet = new IdWorldQueryPacket({ token: this.config.token });
            const sent = this.peer.send(
                packet.encode(),
                RakPriority.HIGH,
                RakReliability.RELIABLE,
                0,
                address,
                false,
            );
            if (this.config.debug) {
                // Intentionally quiet: discovery is chatty once configured.
            }
        }
        this.directory.pruneStale(this.config.staleTtlMs);
    }

    /**
     * Handle a world info response packet.
     * @param {IdWorldInfoPacket} packet - Decoded world info packet.
     * @param {RakSystemAddress} address - Source address.
     * @returns {void} No return value.
     */
    handleInfo(packet: IdWorldInfoPacket, address: RakSystemAddress): void {
        if (packet.token !== this.config.token) {
            warn('[WorldDiscovery] Ignoring response with invalid token');
            return;
        }
        const endpointKey = `${packet.worldIp}:${packet.worldPort}`;
        const sourceKey = `${this.addressToIp(address)}:${address.port}`;
        const allowed = this.directory
            .listEndpoints()
            .some((entry) => entry.key === sourceKey || entry.key === endpointKey);
        if (!allowed) {
            warn(`[WorldDiscovery] Ignoring response from unknown endpoint ${sourceKey}`);
            return;
        }
        const source: WorldEndpoint = buildWorldEndpoint(packet.worldIp, packet.worldPort);
        const existing = this.directory.resolveWorld(packet.worldId);
        const changed =
            !existing ||
            existing.worldIp !== packet.worldIp ||
            existing.worldPort !== packet.worldPort;
        this.directory.updateFromInfo({
            worldId: packet.worldId,
            worldIp: packet.worldIp,
            worldPort: packet.worldPort,
            source,
        });
        const lastLoggedEndpoint = this.lastInfoLogByWorldId.get(packet.worldId);
        if (changed && (!lastLoggedEndpoint || lastLoggedEndpoint !== endpointKey)) {
            this.lastInfoLogByWorldId.set(packet.worldId, endpointKey);
            if (this.config.debug) {
                info(`[WorldDiscovery] worldId=${packet.worldId} endpoint=${endpointKey}`);
            }
        }
    }

    /**
     * Ensure a connection is established to a world endpoint.
     * @param {WorldEndpoint} endpoint - World endpoint.
     * @returns {void} No return value.
     */
    private ensureConnected(endpoint: WorldEndpoint): void {
        const address = addressFromString(endpoint.ip, endpoint.port);
        if (this.peer.isConnected(address)) return;
        const ok = this.peer.connect(endpoint.ip, endpoint.port, this.config.password);
        if (this.config.debug) {
            // Intentionally quiet: connect attempts are noisy in normal operation.
        }
    }

    /**
     * Convert a RakNet system address to an IPv4 string.
     * @param {RakSystemAddress} address - Source address.
     * @returns {string} IPv4 string.
     */
    private addressToIp(address: RakSystemAddress): string {
        const ip = [
            address.binaryAddress & 0xff,
            (address.binaryAddress >>> 8) & 0xff,
            (address.binaryAddress >>> 16) & 0xff,
            (address.binaryAddress >>> 24) & 0xff,
        ].join('.');
        return ip;
    }
}
