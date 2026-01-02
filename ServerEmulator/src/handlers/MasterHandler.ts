import { Connection } from '../network/Connection';
import { RakNetMessageId } from '../protocol/Constants';
import { PacketContext, ConnectionRequestInfo } from './PacketContext';

export type MasterHandlerDeps = {
    isLoginRequestId: (packetId: number) => boolean;
    tryParseLoginRequest: (ctx: PacketContext) => Buffer | null;
    tryParseLoginRequestRak: (
        buffer: Buffer,
        connection: Connection,
        source: string,
        options?: { dryRun?: boolean; bitOffset?: number; tracePath?: string },
    ) => Buffer | null;
    tryParseLoginNested: (payload: Buffer, connection: Connection, source: string) => Buffer | null;
    buildConnectionAccepted: (connection: Connection) => Buffer;
    buildConnectionRejected: (reason: string) => Buffer;
    buildQueryResponse: () => Buffer;
    logVerbose: (message: string) => void;
};

export class MasterHandler {
    private deps: MasterHandlerDeps;

    constructor(deps: MasterHandlerDeps) {
        this.deps = deps;
    }

    handleConnectionRequest(ctx: PacketContext, info: ConnectionRequestInfo): Buffer | null {
        if (info.requestType === 1) {
            return this.deps.buildQueryResponse();
        }
        if (info.requestType !== 2) {
            return null;
        }

        if (info.passwordValid) {
            return this.deps.buildConnectionAccepted(ctx.connection);
        }
        this.deps.logVerbose(`[MasterHandler] Invalid password from ${ctx.connection.key}`);
        return this.deps.buildConnectionRejected('INVALID_PASSWORD');
    }

    handleReliableInner(ctx: PacketContext, innerData: Buffer, innerMsgId: number): Buffer | null {
        if (innerData.length === 0) {
            return null;
        }
        const allowPostAuth =
            innerMsgId === RakNetMessageId.ID_WORLD_LOGIN;
        if (ctx.connection.authenticated && !allowPostAuth) {
            return null;
        }
        if (this.deps.isLoginRequestId(innerMsgId)) {
            return this.deps.tryParseLoginRequestRak(
                innerData,
                ctx.connection,
                `reliable-inner-0x${innerMsgId.toString(16)}`,
                { tracePath: 'MasterHandler.handleReliableInner' },
            );
        }
        return this.deps.tryParseLoginNested(
            innerData,
            ctx.connection,
            `reliable-scan-0x${innerMsgId.toString(16)}`,
        );
    }

    handleGamePacket(ctx: PacketContext, packetId: number): Buffer | null {
        if (packetId !== RakNetMessageId.ID_TIMESTAMP && !this.deps.isLoginRequestId(packetId)) {
            return null;
        }
        return this.deps.tryParseLoginRequest(ctx);
    }

    handleLithTechGuaranteed(_ctx: PacketContext, _innerData: Buffer): Buffer | null {
        return null;
    }

    handleLithTechMessage(_ctx: PacketContext, _msgId: number): Buffer | null {
        return null;
    }
}
