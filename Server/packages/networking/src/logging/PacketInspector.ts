import { dlopen, FFIType, ptr, suffix } from 'bun:ffi';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

export type ConsoleMode = 'off' | 'summary' | 'full';
export type PacketDirection = 'RECV' | 'SEND';

export interface LogRuleConfig {
    tag: string;
    ids: number[];
    repeatMs: number;
    minIntervalMs: number;
    suppress: boolean;
}

export interface LogProfileConfig {
    name: string;
    repeatMs: number;
    minIntervalMs: number;
    rules: LogRuleConfig[];
}

export interface PacketLogConfig {
    consoleMinIntervalMs: number;
    consoleRepeatSuppressMs: number;
    consolePacketIds?: number[];
    filePacketIds?: number[];
    ignorePacketIds?: number[];
    logProfile?: LogProfileConfig;
}

export type PacketInspectorTarget = 'console' | 'file';

type PacketInspectorLib = ReturnType<typeof dlopen>;

function resolveRootFromDir(dir: string): string {
    return resolve(dir, '..', '..', '..', '..', '..');
}

function getLibraryPath(): string | null {
    const libName = `PacketInspector.${suffix}`;
    const rootFromImport = resolveRootFromDir(import.meta.dir);
    const candidates = [
        join(process.cwd(), 'PacketInspector', 'Build', 'x64', 'Release', libName),
        join(process.cwd(), 'PacketInspector', 'Build', 'x64', 'Debug', libName),
        join(process.cwd(), 'PacketInspector', 'Build', 'Win32', 'Release', libName),
        join(process.cwd(), 'PacketInspector', 'Build', 'Win32', 'Debug', libName),
        join(process.cwd(), 'PacketInspector', 'Build', libName),
        join(process.cwd(), 'PacketInspector', 'Build', 'Release', libName),
        join(process.cwd(), 'PacketInspector', 'Build', 'Debug', libName),
        join(process.cwd(), 'PacketInspector', libName),
        join(rootFromImport, 'PacketInspector', 'Build', 'x64', 'Release', libName),
        join(rootFromImport, 'PacketInspector', 'Build', 'x64', 'Debug', libName),
        join(rootFromImport, 'PacketInspector', 'Build', 'Win32', 'Release', libName),
        join(rootFromImport, 'PacketInspector', 'Build', 'Win32', 'Debug', libName),
        join(rootFromImport, 'PacketInspector', 'Build', libName),
        join(rootFromImport, 'PacketInspector', 'Build', 'Release', libName),
        join(rootFromImport, 'PacketInspector', 'Build', 'Debug', libName),
        join(rootFromImport, 'PacketInspector', libName),
        join(rootFromImport, 'Server', 'packages', 'networking', 'native', libName),
    ];
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    return null;
}

function toMode(mode: ConsoleMode): number {
    if (mode === 'summary') return 1;
    return 0;
}

function toDirection(direction: PacketDirection): number {
    return direction === 'SEND' ? 1 : 0;
}

export class PacketInspectorBridge {
    private lib: PacketInspectorLib;
    private buffer: Uint8Array;
    private decoder = new TextDecoder();

    private constructor(lib: PacketInspectorLib, bufferSize: number) {
        this.lib = lib;
        this.buffer = new Uint8Array(bufferSize);
    }

    static create(config: PacketLogConfig): PacketInspectorBridge | null {
        const libPath = getLibraryPath();
        if (!libPath) return null;

        const lib = dlopen(libPath, {
            FomLogInitSimple: {
                returns: FFIType.void,
                args: [
                    FFIType.i32, // enabled
                    FFIType.i32, // log_recv
                    FFIType.i32, // log_send
                    FFIType.i32, // log_hex
                    FFIType.i32, // include_addr
                    FFIType.i32, // include_conn
                    FFIType.i32, // suppress_repeats
                    FFIType.i32, // suppress_repeats_in_file
                    FFIType.i32, // emit_suppressed_line
                    FFIType.i32, // emit_ansi_console
                    FFIType.i32, // strict_parsing
                    FFIType.i32, // best_guess_parsing
                    FFIType.u32, // max_dump_bytes
                    FFIType.i32, // min_interval_ms
                    FFIType.i32, // repeat_suppress_ms
                ],
            },
            FomLogSetProfileSimple: {
                returns: FFIType.void,
                args: [FFIType.ptr, FFIType.i32, FFIType.i32],
            },
            FomLogClearRules: {
                returns: FFIType.void,
                args: [],
            },
            FomLogAddRuleSimple: {
                returns: FFIType.void,
                args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.i32, FFIType.i32, FFIType.i32],
            },
            FomLogSetAllowConsoleIds: {
                returns: FFIType.void,
                args: [FFIType.ptr, FFIType.u32],
            },
            FomLogSetAllowFileIds: {
                returns: FFIType.void,
                args: [FFIType.ptr, FFIType.u32],
            },
            FomLogSetIgnoreIds: {
                returns: FFIType.void,
                args: [FFIType.ptr, FFIType.u32],
            },
            FomLogLoadConfigFile: {
                returns: FFIType.i32,
                args: [FFIType.ptr],
            },
            FomLogProcessEventSimple: {
                returns: FFIType.i32,
                args: [
                    FFIType.ptr, // data
                    FFIType.u32, // length
                    FFIType.u32, // bit_length
                    FFIType.i32, // direction
                    FFIType.ptr, // tag_override
                    FFIType.ptr, // address
                    FFIType.u16, // port
                    FFIType.i32, // connection_id
                    FFIType.i32, // force_id
                    FFIType.i32, // layer_override
                    FFIType.i32, // target
                    FFIType.i32, // mode
                    FFIType.ptr, // out_buffer
                    FFIType.u32, // out_buffer_size
                    FFIType.ptr, // out_decision
                ],
            },
            FomClassifyPacketSimple: {
                returns: FFIType.i32,
                args: [
                    FFIType.ptr, // data
                    FFIType.u32, // length
                    FFIType.ptr, // out_effective_id
                    FFIType.ptr, // out_layer
                    FFIType.ptr, // out_inner_id
                    FFIType.ptr, // out_payload_offset
                    FFIType.ptr, // out_payload_length
                    FFIType.ptr, // out_payload_offset_bits
                    FFIType.ptr, // out_payload_bit_length
                    FFIType.ptr, // out_dispatch_mode
                    FFIType.ptr, // out_dispatch_reason
                ],
            },
        });

        const loaded = lib.symbols.FomLogLoadConfigFile ? lib.symbols.FomLogLoadConfigFile(null) : 0;
        if (!loaded) {
            const maxDumpBytes = 4096;
            lib.symbols.FomLogInitSimple(
                1,
                1,
                1,
                1,
                1,
                1,
                0,
                0,
                0,
                1,
                1,
                0,
                maxDumpBytes,
                0,
                0,
            );
        }

        return new PacketInspectorBridge(lib, 65536);
    }

    format(packet: {
        data: Uint8Array;
        length: number;
        direction: PacketDirection;
        address: string;
        port: number;
        connectionId?: number;
    }, target: PacketInspectorTarget, mode: ConsoleMode, tagOverride?: string, forceId?: number, layerOverride?: number): string | null {
        this.buffer.fill(0);
        const tagBuf = tagOverride ? Buffer.from(`${tagOverride}\0`) : null;
        const addrBuf = packet.address ? Buffer.from(`${packet.address}\0`) : null;
        const tagPtr = tagBuf ? ptr(tagBuf) : null;
        const addrPtr = addrBuf ? ptr(addrBuf) : null;
        const logged = this.lib.symbols.FomLogProcessEventSimple(
            ptr(packet.data),
            packet.length,
            0,
            toDirection(packet.direction),
            tagPtr,
            addrPtr,
            packet.port,
            packet.connectionId ?? -1,
            forceId ?? -1,
            layerOverride ?? -1,
            target === 'file' ? 1 : 0,
            toMode(mode),
            ptr(this.buffer),
            this.buffer.length,
            null,
        );
        if (!logged) return null;
        const end = this.buffer.indexOf(0);
        const slice = end >= 0 ? this.buffer.subarray(0, end) : this.buffer;
        return this.decoder.decode(slice);
    }

    classify(packet: { data: Uint8Array; length: number }): {
        effectiveId: number;
        layer: number;
        innerId: number;
        payloadOffset: number;
        payloadLength: number;
        payloadOffsetBits: number;
        payloadBitLength: number;
        dispatchMode: number;
        dispatchReason: number;
    } | null {
        if (!this.lib.symbols.FomClassifyPacketSimple) return null;
        const outEffectiveId = Buffer.alloc(4);
        const outLayer = Buffer.alloc(4);
        const outInnerId = Buffer.alloc(4);
        const outPayloadOffset = Buffer.alloc(4);
        const outPayloadLength = Buffer.alloc(4);
        const outPayloadOffsetBits = Buffer.alloc(4);
        const outPayloadBitLength = Buffer.alloc(4);
        const outDispatchMode = Buffer.alloc(4);
        const outDispatchReason = Buffer.alloc(4);
        const ok = this.lib.symbols.FomClassifyPacketSimple(
            ptr(packet.data),
            packet.length,
            ptr(outEffectiveId),
            ptr(outLayer),
            ptr(outInnerId),
            ptr(outPayloadOffset),
            ptr(outPayloadLength),
            ptr(outPayloadOffsetBits),
            ptr(outPayloadBitLength),
            ptr(outDispatchMode),
            ptr(outDispatchReason),
        );
        if (!ok) return null;
        return {
            effectiveId: outEffectiveId.readInt32LE(0),
            layer: outLayer.readInt32LE(0),
            innerId: outInnerId.readInt32LE(0),
            payloadOffset: outPayloadOffset.readUInt32LE(0),
            payloadLength: outPayloadLength.readUInt32LE(0),
            payloadOffsetBits: outPayloadOffsetBits.readUInt32LE(0),
            payloadBitLength: outPayloadBitLength.readUInt32LE(0),
            dispatchMode: outDispatchMode.readInt32LE(0),
            dispatchReason: outDispatchReason.readInt32LE(0),
        };
    }

}
