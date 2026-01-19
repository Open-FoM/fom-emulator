import { FileLogger, configureLogger } from '@openfom/utils';
import { addressToIp } from '../net/address';
import { getRakNetTimeBytes, type RakPeer, type RakSystemAddress } from '../bindings/raknet';
import { PacketInspectorBridge, type PacketDirection } from './PacketInspector';

export const FOM_LAYER_UNKNOWN = 0;
export const FOM_LAYER_RAK = 1;
export const FOM_LAYER_LITH = 2;

export interface PacketLogConfigLike {
    quiet: boolean;
    consoleMode: 'off' | 'summary' | 'full';
    consoleMinIntervalMs: number;
    logToFile: boolean;
    logFileName?: string;
    analysisEnabled: boolean;
    consolePacketIds?: number[];
    filePacketIds?: number[];
    ignorePacketIds?: number[];
    consoleRepeatSuppressMs: number;
    flushMode: 'off' | 'login' | 'always';
    logProfile?: {
        name: string;
        repeatMs: number;
        minIntervalMs: number;
        rules: Array<{
            tag: string;
            ids: number[];
            repeatMs: number;
            minIntervalMs: number;
            suppress: boolean;
        }>;
    };
    rawCapture: boolean;
    rawCaptureRecv: boolean;
    rawCaptureSend: boolean;
    rawCaptureMaxQueue: number;
    rawCaptureMaxBytes: number;
    rawCaptureOnly: boolean;
    reliableTrace: boolean;
    reliableTraceIntervalMs: number;
}

export interface PacketLogOverrides {
    forceId: number;
    layerOverride: number;
    tagOverride?: string;
}

export interface PacketLoggerContext {
    logAppPackets: boolean;
    resolveLogOverrides: (messageId: number, direction: PacketDirection, preferLith?: boolean) => PacketLogOverrides;
    classifyPacket: (payload: Buffer) => {
        effectiveId: number;
        layer: number;
        innerId: number;
        payloadOffset: number;
        payloadLength: number;
        payloadOffsetBits: number;
        payloadBitLength: number;
        dispatchMode: number;
        dispatchReason: number;
    } | null;
    logPacket: (
        data: Buffer,
        direction: PacketDirection,
        address: string,
        port: number,
        connectionId?: number,
        tagOverride?: string,
        forceId?: number,
        layerOverride?: number,
    ) => void;
    drainRawCapture: (peer: RakPeer) => void;
    unwrapTimestamp: (payload: Buffer) => { timestamp: bigint; innerOffset: number } | null;
    getConnectionKey: (address: RakSystemAddress) => string;
}

export function createPacketLoggerContext(options: {
    packetLogConfig: PacketLogConfigLike;
    debugEnabled: boolean;
    logWarn: (message: string) => void;
    logDebug: (message: string) => void;
    label: string;
    rakMessageIds: Iterable<number>;
    lithMessageIds: Iterable<number>;
}): PacketLoggerContext {
    const {
        packetLogConfig,
        debugEnabled,
        logWarn,
        logDebug,
        label,
        rakMessageIds,
        lithMessageIds,
    } = options;
    const raknetIdSet = rakMessageIds instanceof Set ? rakMessageIds : new Set(rakMessageIds);
    const lithIdSet = lithMessageIds instanceof Set ? lithMessageIds : new Set(lithMessageIds);

    const resolveLayerOverride = (forceId: number, preferLith: boolean): number => {
        if (preferLith) return FOM_LAYER_LITH;
        if (raknetIdSet.has(forceId)) return FOM_LAYER_RAK;
        return FOM_LAYER_UNKNOWN;
    };

    configureLogger({ quiet: packetLogConfig.quiet, debug: debugEnabled });

    const packetConsoleEnabled =
        !packetLogConfig.quiet && packetLogConfig.consoleMode !== 'off';
    const packetLogFile = new FileLogger();
    if (packetLogConfig.logToFile) {
        packetLogFile.initLogFile('./logs', packetLogConfig.logFileName);
    }
    FileLogger.setGlobal(packetLogFile);

    const labelLower = label.toLowerCase();
    const disablePacketInspector =
        process.env.FOM_DISABLE_PACKETINSPECTOR === '1' ||
        (process.env.FOM_DISABLE_PACKETINSPECTOR_WORLD === '1' && labelLower === 'world') ||
        (process.env.FOM_DISABLE_PACKETINSPECTOR_MASTER === '1' && labelLower === 'master');

    let packetInspector: PacketInspectorBridge | null = null;
    if (!disablePacketInspector) {
        packetInspector = PacketInspectorBridge.create({
            consoleMinIntervalMs: packetLogConfig.consoleMinIntervalMs,
            consoleRepeatSuppressMs: packetLogConfig.consoleRepeatSuppressMs,
            consolePacketIds: packetLogConfig.consolePacketIds,
            filePacketIds: packetLogConfig.filePacketIds,
            ignorePacketIds: packetLogConfig.ignorePacketIds,
            logProfile: packetLogConfig.logProfile,
        });
        if (!packetInspector) {
            logWarn('[PacketInspector] PacketInspector.dll not found; packet logging disabled');
        }
    } else {
        logWarn('[PacketInspector] Disabled by env; packet logging disabled');
    }
    let packetInspectorFailed = false;
    const logAppPackets = !packetLogConfig.rawCaptureOnly || !packetLogConfig.rawCapture;

    const raknetTimeBytes = getRakNetTimeBytes();
    const resolveLogOverrides = (messageId: number, direction: PacketDirection, preferLith: boolean = false): PacketLogOverrides => {
        const forceId = messageId & 0xff;
        const layerOverride = resolveLayerOverride(forceId, preferLith);
        if (layerOverride !== FOM_LAYER_UNKNOWN) {
            return { forceId, layerOverride };
        }
        const tagOverride = direction === 'RECV' ? 'Unknown_Recv' : 'Unknown_SendTo';
        return { forceId, layerOverride: FOM_LAYER_UNKNOWN, tagOverride };
    };

    const logPacket = (
        data: Buffer,
        direction: PacketDirection,
        address: string,
        port: number,
        connectionId?: number,
        tagOverride?: string,
        forceId?: number,
        layerOverride?: number,
    ): void => {
        if (!packetInspector || packetInspectorFailed) return;
        try {
            if (packetConsoleEnabled) {
                const formatted = packetInspector.format(
                    {
                        data,
                        length: data.length,
                        direction,
                        address,
                        port,
                        connectionId,
                    },
                    'console',
                    packetLogConfig.consoleMode,
                    tagOverride,
                    forceId,
                    layerOverride,
                );
                if (formatted) {
                    const output = formatted.endsWith('\n') ? formatted : `${formatted}\n`;
                    process.stdout.write(output);
                }
            }
            if (packetLogConfig.logToFile) {
                const formatted = packetInspector.format(
                    {
                        data,
                        length: data.length,
                        direction,
                        address,
                        port,
                        connectionId,
                    },
                    'file',
                    'full',
                    tagOverride,
                    forceId,
                    layerOverride,
                );
                if (formatted) {
                    const output = formatted.endsWith('\n') ? formatted : `${formatted}\n`;
                    packetLogFile.writeRaw(output);
                }
            }
        } catch (err) {
            if (!packetInspectorFailed) {
                const msg = err instanceof Error ? err.message : String(err);
                logWarn(`[PacketInspector] Logging failed; disabling packet logging. err=${msg}`);
            }
            packetInspectorFailed = true;
        }
    };

    const getConnectionKey = (address: RakSystemAddress): string => {
        return `${addressToIp(address)}:${address.port}`;
    };

    const classifyPacket = (payload: Buffer) => {
        if (!packetInspector || packetInspectorFailed) return null;
        try {
            return packetInspector.classify({ data: payload, length: payload.length });
        } catch (err) {
            if (!packetInspectorFailed) {
                const msg = err instanceof Error ? err.message : String(err);
                logWarn(`[PacketInspector] Classify failed; disabling packet logging. err=${msg}`);
            }
            packetInspectorFailed = true;
            return null;
        }
    };

    const drainRawCapture = (peer: RakPeer): void => {
        if (!packetLogConfig.rawCapture) return;
        peer.drainRawLog((evt) => {
            const dirTag = evt.direction === 'RECV' ? 'Raw_Recv' : 'Raw_SendTo';
            const raw = Buffer.from(evt.data);
            if (evt.direction === 'RECV') {
                const connKey = getConnectionKey(evt.address);
                void connKey;
            }
            logPacket(
                raw,
                evt.direction,
                addressToIp(evt.address),
                evt.address.port,
                undefined,
                dirTag,
            );
        });
    };

    const unwrapTimestamp = (payload: Buffer): { timestamp: bigint; innerOffset: number } | null => {
        if (!payload.length) return null;
        if (payload.length < 1 + raknetTimeBytes + 1) return null;
        let timestamp = 0n;
        if (raknetTimeBytes === 8) {
            timestamp = payload.readBigUInt64LE(1);
        } else if (raknetTimeBytes === 4) {
            timestamp = BigInt(payload.readUInt32LE(1));
        } else {
            return null;
        }
        return { timestamp, innerOffset: 1 + raknetTimeBytes };
    };

    return {
        logAppPackets,
        resolveLogOverrides,
        classifyPacket,
        logPacket,
        drainRawCapture,
        unwrapTimestamp,
        getConnectionKey,
    };
}
