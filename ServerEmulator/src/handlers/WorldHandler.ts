import { Connection, ConnectionState } from '../network/Connection';
import { ConnectionRequestType, LithTechMessageId, RakNetMessageId } from '../protocol/Constants';
import { PacketContext, ConnectionRequestInfo } from './PacketContext';

export type WorldHandlerDeps = {
    buildConnectionAccepted: (connection: PacketContext['connection']) => Buffer;
    buildConnectionRejected: (reason: string) => Buffer;
    buildQueryResponse: () => Buffer;
    isLoginRequestId: (packetId: number) => boolean;
    tryParseLoginRequest: (ctx: PacketContext) => Buffer | null;
    tryParseLoginRequestRak: (
        buffer: Buffer,
        connection: Connection,
        source: string,
        options?: { dryRun?: boolean; bitOffset?: number; tracePath?: string },
    ) => Buffer | null;
    tryParseLoginNested: (payload: Buffer, connection: Connection, source: string) => Buffer | null;
    handleLithTechMessageCore: (ctx: PacketContext, msgId: number) => Buffer | null;
    logVerbose: (message: string) => void;
};

export class WorldHandler {
    private deps: WorldHandlerDeps;

    constructor(deps: WorldHandlerDeps) {
        this.deps = deps;
    }

    handleConnectionRequest(ctx: PacketContext, info: ConnectionRequestInfo): Buffer | null {
        if (info.requestType === ConnectionRequestType.QUERY) {
            return this.deps.buildQueryResponse();
        }
        if (info.requestType !== ConnectionRequestType.CONNECT) {
            return null;
        }

        if (info.passwordValid) {
            ctx.connection.state = ConnectionState.CONNECTED;
            return this.deps.buildConnectionAccepted(ctx.connection);
        }

        this.deps.logVerbose(`[WorldHandler] Invalid password from ${ctx.connection.key}`);
        return this.deps.buildConnectionRejected('INVALID_PASSWORD');
    }

    handleReliableInner(ctx: PacketContext, innerData: Buffer, innerMsgId: number): Buffer | null {
        if (ctx.connection.authenticated || innerData.length === 0) {
            return null;
        }
        if (this.deps.isLoginRequestId(innerMsgId)) {
            return this.deps.tryParseLoginRequestRak(
                innerData,
                ctx.connection,
                `reliable-inner-0x${innerMsgId.toString(16)}`,
                { tracePath: 'WorldHandler.handleReliableInner' },
            );
        }
        return this.deps.tryParseLoginNested(
            innerData,
            ctx.connection,
            `reliable-scan-0x${innerMsgId.toString(16)}`,
        );
    }

    handleGamePacket(ctx: PacketContext, packetId: number): Buffer | null {
        if (packetId === RakNetMessageId.ID_TIMESTAMP || this.deps.isLoginRequestId(packetId)) {
            return this.deps.tryParseLoginRequest(ctx);
        }
        if (
            packetId >= LithTechMessageId.MSG_CYCLECHECK &&
            packetId <= LithTechMessageId.MSG_UNKNOWN_23
        ) {
            return this.deps.handleLithTechMessageCore(ctx, packetId);
        }
        return null;
    }

    handleLithTechGuaranteed(_ctx: PacketContext, _innerData: Buffer): Buffer | null {
        return null;
    }

    handleLithTechMessage(ctx: PacketContext, msgId: number): Buffer | null {
        return this.deps.handleLithTechMessageCore(ctx, msgId);
    }
}
