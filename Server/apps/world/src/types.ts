/**
 * World server connection state tracked per client.
 */
export interface WorldConnection {
    address: import('@openfom/networking').RakSystemAddress;
    key: string;
    playerId: number;
    worldId: number;
    worldInst: number;
    authenticated: boolean;
    registered: boolean;
    lastActivity: number;
    lastHeartbeatAt: number;
    hasHeartbeat: boolean;
    lastHeartbeatRelayAt: number;
    worldTimeOrigin: number;
    lithTechOutSeq: number;
    connectStage: number;
    sentLoginBurst: boolean;
    pingInterval?: ReturnType<typeof setInterval>;
}
