import * as fs from 'fs';
import * as path from 'path';
import { Connection, ConnectionState } from '../network/Connection';
import { BitStreamReader, BitStreamWriter } from '../protocol/BitStream';
import RakBitStream from '../raknet-js/structures/BitStream';
import { assertBitOrder } from '../protocol/BitOrder';
import type { BitOrder } from '../protocol/BitOrder';
import { PacketLogger } from '../utils/PacketLogger';
import { loadRsaKeyFromEnv, RsaKey } from '../utils/Rsa';
import { LoginHandler } from './LoginHandler';
import { buildFileList, resolveDefaultFileRoot } from '../files/FileList';
import {
    wrapReliablePacket,
    buildAckPacket,
    parseRakNetDatagram,
    ParsedRakNetPacket,
    ParsedRakNetDatagram,
} from '../reliable/ReliablePackets';
import { LithTechSubMessage, parseLithTechGuaranteedSubPackets } from '../lith/LithTechGuaranteed';
import { Reliability } from '../raknet-js/ReliabilityLayer';
import { PacketContext } from './PacketContext';
import { MasterHandler } from './MasterHandler';
import { WorldHandler } from './WorldHandler';
import {
    CONNECTION_MAGIC,
    ConnectionRequestType,
    ConnectionResponseFlag,
    RakNetMessageId,
    LithTechMessageId,
    WORLD_SERVER_PASSWORD,
    SEQUENCE_MASK,
    DEFAULT_PORT,
    OFFLINE_MESSAGE_ID,
    OFFLINE_SYSTEM_ADDRESS_BYTES,
} from '../protocol/Constants';

/**
 * Connection request data parsed from client
 * Based on Ghidra analysis of CUDPDriver_JoinSession (0x004B67B0)
 */
export interface ConnectionRequestData {
    magic: number;
    requestType: number;
    password: string; // 128 bytes (0x80) - null terminated
    timestamp: number; // 32-bit client timestamp
}

export class PacketHandler {
    private serverMode: 'master' | 'world';
    private worldIp: string;
    private worldPort: number;
    private worldSendProtocol: boolean;
    private worldSendId: boolean;
    private worldSendClientObjectId: boolean;
    private worldSendLoadWorld: boolean;
    private worldSendFileList: boolean;
    private fileListMaxBytes: number;
    private fileListRoot: string | null;
    private fileListMapPath: string;
    private fileListPayloads: Buffer[] = [];
    private worldDefaultId: number;
    private worldDefaultInst: number;
    private worldSpawnEnabled: boolean;
    private worldSpawnFlags: number;
    private worldSpawnObjType: number;
    private worldSpawnObjTypeExtra: number;
    private worldSpawnPos: [number, number, number];
    private worldSpawnVel: [number, number, number];
    private worldSpawnRot: [number, number, number, number];
    private worldSpawnRender: [number, number, number, number, number];
    private worldCompMin: [number, number, number];
    private worldCompMax: [number, number, number];
    private worldCompScale: [number, number, number];
    private worldSpawnStage: number;
    private worldHeartbeatEnabled: boolean;
    private worldHeartbeatIntervalMs: number;
    private worldUnguaranteedEnabled: boolean;
    private worldUnguaranteedIntervalMs: number;
    private worldUnguaranteedSendPos: boolean;
    private worldUnguaranteedSendVel: boolean;
    private worldUnguaranteedHasVelBit: boolean;
    private worldFlowRateBytesPerSec: number;
    private worldFlowBucketMax: number;
    private worldFlowDecayMs: number = 17;
    private worldFlowDebug: boolean;
    private worldFlowDebugLogMs: number;
    private worldUnguaranteedEnabled: boolean;
    private worldUnguaranteedIntervalMs: number;
    private masterHandler: MasterHandler;
    private worldHandler: WorldHandler;
    private verbose: boolean;
    private loginDebug: boolean;
    private logThrottleMs: number;
    private lastLogByKey: Map<string, number>;
    private lithDebugBurst: number;
    private lithDebugTrigger: string;
    private lithDebugHexBytes: number;
    private lithDebugRaw: boolean;
    private lithDebugRawBytes: number;
    private lithDebugRawMin: number;
    private lithDebugRawMax: number;
    private lithDebugScan: boolean;
    private lithDebugScanAny: boolean;
    private lithDebugScanMax: number;
    private lithDebugScanPayloadBytes: number;
    private lithDebugBits: boolean;
    private lithDebugBitsPerLine: number;
    private lithDebugBitsMax: number;
    private lithHasMoreFlag: boolean;
    private forceLoginOnFirstLith: boolean;
    private lithDebugLogPath: string | null;
    private lithDebugLogStream: fs.WriteStream | null;
    private rsaKey: RsaKey | null;
    private loginBlobBytes: number;
    private loginRequireCredentials: boolean;
    private loginResendDuplicate6D: boolean;
    private bitOrderStrict: boolean;
    private loginHandler: LoginHandler;

    // Initialize handler configuration, debug knobs, and child handlers.
    constructor() {
        const modeRaw = (process.env.SERVER_MODE || 'master').toLowerCase();
        this.serverMode = modeRaw === 'world' ? 'world' : 'master';
        this.worldIp = process.env.WORLD_IP || '127.0.0.1';
        const port = parseInt(process.env.WORLD_PORT || '', 10);
        this.worldPort = Number.isNaN(port) || port <= 0 ? DEFAULT_PORT : port;
        const worldDefault = this.serverMode === 'world';
        this.worldSendProtocol = this.parseBool(process.env.WORLD_SEND_PROTOCOL, worldDefault);
        this.worldSendId = this.parseBool(process.env.WORLD_SEND_ID, worldDefault);
        this.worldSendClientObjectId = this.parseBool(
            process.env.WORLD_SEND_CLIENTOBJECTID,
            worldDefault,
        );
        this.worldSendLoadWorld = this.parseBool(process.env.WORLD_SEND_LOADWORLD, worldDefault);
        this.worldSendFileList = this.parseBool(
            process.env.FOM_FILE_LIST ?? process.env.WORLD_SEND_FILE_LIST,
            worldDefault,
        );
        this.fileListMaxBytes = Math.max(
            256,
            parseInt(process.env.FOM_FILE_LIST_MAX_BYTES || '1024', 10) || 1024,
        );
        this.fileListRoot =
            process.env.FOM_FILE_ROOT ||
            process.env.FILE_ROOT ||
            resolveDefaultFileRoot(process.cwd());
        const cwd = process.cwd();
        const inServerDir = path.basename(cwd).toLowerCase() === 'serveremulator';
        this.fileListMapPath =
            process.env.FOM_FILE_ID_MAP ||
            (inServerDir
                ? path.resolve(cwd, 'file_id_map.json')
                : path.resolve(cwd, 'ServerEmulator', 'file_id_map.json'));
        const worldSelectWorldId = this.parseU32(
            process.env.FOM_WORLD_ID || process.env.WORLD_ID,
            16,
        );
        const worldSelectWorldInst = this.parseU32(
            process.env.FOM_WORLD_INST || process.env.WORLD_INST,
            0,
        );
        this.worldDefaultId = worldSelectWorldId;
        this.worldDefaultInst = worldSelectWorldInst;
        const spawnDefault = this.serverMode === 'world';
        this.worldSpawnEnabled = this.parseBool(
            process.env.FOM_WORLD_SPAWN ?? process.env.WORLD_SPAWN,
            spawnDefault,
        );
        this.worldSpawnFlags = this.parseU32(
            process.env.FOM_WORLD_SPAWN_FLAGS ?? process.env.WORLD_SPAWN_FLAGS,
            0x4f,
        );
        this.worldSpawnObjType = this.parseU32(
            process.env.FOM_WORLD_SPAWN_OBJTYPE ?? process.env.WORLD_SPAWN_OBJTYPE,
            3,
        ) & 0x3f;
        this.worldSpawnObjTypeExtra = this.parseU32(
            process.env.FOM_WORLD_SPAWN_OBJTYPE_EXTRA ?? process.env.WORLD_SPAWN_OBJTYPE_EXTRA,
            0,
        ) & 0xffff;
        this.worldSpawnStage = this.parseInt(
            process.env.FOM_WORLD_SPAWN_STAGE ?? process.env.WORLD_SPAWN_STAGE,
            0,
        );
        this.worldHeartbeatEnabled = this.parseBool(
            process.env.WORLD_HEARTBEAT,
            worldDefault,
        );
        this.worldUnguaranteedEnabled = this.parseBool(
            process.env.WORLD_SEND_UNGUARANTEED ?? process.env.WORLD_UNGUARANTEED,
            worldDefault,
        );
        this.worldHeartbeatIntervalMs = Math.max(
            0,
            this.parseInt(
                process.env.WORLD_HEARTBEAT_INTERVAL_MS,
                worldDefault ? 1000 : 0,
            ),
        );
        if (this.worldHeartbeatIntervalMs > 0) {
            if (this.worldHeartbeatIntervalMs < 200) this.worldHeartbeatIntervalMs = 200;
            if (this.worldHeartbeatIntervalMs > 1000) this.worldHeartbeatIntervalMs = 1000;
        }
        this.worldUnguaranteedIntervalMs = Math.max(
            0,
            this.parseInt(
                process.env.WORLD_UNGUARANTEED_INTERVAL_MS,
                worldDefault ? 200 : 0,
            ),
        );
        if (this.worldUnguaranteedIntervalMs > 0) {
            if (this.worldUnguaranteedIntervalMs < 200) this.worldUnguaranteedIntervalMs = 200;
            if (this.worldUnguaranteedIntervalMs > 1000) this.worldUnguaranteedIntervalMs = 1000;
        }
        this.worldFlowRateBytesPerSec = this.parseInt(
            process.env.WORLD_FLOW_RATE_BPS,
            0x7fffffff,
        );
        this.worldFlowBucketMax = this.parseInt(process.env.WORLD_FLOW_BUCKET_MAX, 0);
        this.worldFlowDebug = this.parseBool(process.env.WORLD_FLOW_DEBUG, false);
        this.worldFlowDebugLogMs = this.parseInt(process.env.WORLD_FLOW_DEBUG_LOG_MS, 1000);
        const spawnPos = this.parseFloatList(
            process.env.FOM_WORLD_SPAWN_POS ?? process.env.WORLD_SPAWN_POS,
            3,
            [0, 0, 0],
        );
        const spawnVel = this.parseFloatList(
            process.env.FOM_WORLD_SPAWN_VEL ?? process.env.WORLD_SPAWN_VEL,
            3,
            [0, 0, 0],
        );
        const spawnRot = this.parseFloatList(
            process.env.FOM_WORLD_SPAWN_ROT ?? process.env.WORLD_SPAWN_ROT,
            4,
            [0, 0, 0, 1],
        );
        const spawnRender = this.parseU8List(
            process.env.FOM_WORLD_SPAWN_RENDER ?? process.env.WORLD_SPAWN_RENDER,
            5,
            [255, 255, 255, 255, 0],
        );
        this.worldSpawnPos = [spawnPos[0], spawnPos[1], spawnPos[2]];
        this.worldSpawnVel = [spawnVel[0], spawnVel[1], spawnVel[2]];
        this.worldSpawnRot = [spawnRot[0], spawnRot[1], spawnRot[2], spawnRot[3]];
        this.worldSpawnRender = [
            spawnRender[0],
            spawnRender[1],
            spawnRender[2],
            spawnRender[3],
            spawnRender[4],
        ];
        const worldCompMin = this.parseFloatList(
            process.env.FOM_WORLD_COMP_MIN ?? process.env.WORLD_COMP_MIN,
            3,
            [0, 0, 0],
        );
        const worldCompMax = this.parseFloatList(
            process.env.FOM_WORLD_COMP_MAX ?? process.env.WORLD_COMP_MAX,
            3,
            [524288, 262144, 524288],
        );
        this.worldCompMin = [worldCompMin[0], worldCompMin[1], worldCompMin[2]];
        this.worldCompMax = [worldCompMax[0], worldCompMax[1], worldCompMax[2]];
        this.worldCompScale = [
            this.worldCompMax[0] !== this.worldCompMin[0]
                ? 1 / (this.worldCompMax[0] - this.worldCompMin[0])
                : 0,
            this.worldCompMax[1] !== this.worldCompMin[1]
                ? 1 / (this.worldCompMax[1] - this.worldCompMin[1])
                : 0,
            this.worldCompMax[2] !== this.worldCompMin[2]
                ? 1 / (this.worldCompMax[2] - this.worldCompMin[2])
                : 0,
        ];
        this.worldUnguaranteedSendPos = this.parseBool(
            process.env.FOM_WORLD_UNGUARANTEED_SEND_POS ??
                process.env.WORLD_UNGUARANTEED_SEND_POS,
            true,
        );
        this.worldUnguaranteedSendVel = this.parseBool(
            process.env.FOM_WORLD_UNGUARANTEED_SEND_VEL ??
                process.env.WORLD_UNGUARANTEED_SEND_VEL,
            false,
        );
        this.worldUnguaranteedHasVelBit = this.parseBool(
            process.env.FOM_WORLD_UNGUARANTEED_HAS_VEL_BIT ??
                process.env.WORLD_UNGUARANTEED_HAS_VEL_BIT,
            true,
        );
        const worldSelectPlayerId = this.parseU32(
            process.env.FOM_PLAYER_ID || process.env.PLAYER_ID,
            0,
        );
        const worldSelectPlayerIdRandom = this.parseBool(
            process.env.FOM_PLAYER_ID_RANDOM ?? process.env.PLAYER_ID_RANDOM,
            worldSelectPlayerId === 0,
        );
        const worldLoginWorldConst = this.parseU32(
            process.env.FOM_WORLD_CONST || process.env.WORLD_CONST,
            0x13bc52,
        );
        this.verbose = this.parseBool(process.env.PACKET_HANDLER_VERBOSE, false);
        this.loginDebug = this.parseBool(process.env.LOGIN_DEBUG, false);
        const throttle = parseInt(process.env.PACKET_HANDLER_LOG_THROTTLE_MS || '5000', 10);
        this.logThrottleMs = Number.isNaN(throttle) ? 5000 : Math.max(0, throttle);
        this.lastLogByKey = new Map();
        this.lithDebugBurst = this.parseInt(process.env.LITH_DEBUG_BURST, 0);
        this.lithDebugTrigger = (process.env.LITH_DEBUG_TRIGGER || 'none').toLowerCase();
        this.lithDebugHexBytes = this.parseInt(process.env.LITH_DEBUG_HEX_BYTES, 48);
        this.lithDebugRaw = this.parseBool(process.env.LITH_DEBUG_RAW, false);
        this.lithDebugRawBytes = this.parseInt(process.env.LITH_DEBUG_RAW_BYTES, 512);
        this.lithDebugRawMin = this.parseInt(process.env.LITH_DEBUG_RAW_MIN, 0);
        this.lithDebugRawMax = this.parseInt(process.env.LITH_DEBUG_RAW_MAX, 0);
        this.lithDebugScan = this.parseBool(process.env.LITH_DEBUG_SCAN, false);
        this.lithDebugScanAny = this.parseBool(process.env.LITH_DEBUG_SCAN_ANY, false);
        this.lithDebugScanMax = this.parseInt(process.env.LITH_DEBUG_SCAN_MAX, 12);
        this.lithDebugScanPayloadBytes = this.parseInt(
            process.env.LITH_DEBUG_SCAN_PAYLOAD_BYTES,
            32,
        );
        this.lithDebugBits = this.parseBool(process.env.LITH_DEBUG_BITS, false);
        this.lithDebugBitsPerLine = this.parseInt(process.env.LITH_DEBUG_BITS_PER_LINE, 128);
        this.lithDebugBitsMax = this.parseInt(process.env.LITH_DEBUG_BITS_MAX, 0);
        this.lithHasMoreFlag = this.parseBool(process.env.LITH_HAS_MORE_FLAG, false);
        this.forceLoginOnFirstLith = this.parseBool(process.env.FORCE_LOGIN_ON_FIRST_LITH, false);
        this.lithDebugLogPath = null;
        this.lithDebugLogStream = null;
        this.initLithDebugLog();
        this.rsaKey = loadRsaKeyFromEnv();
        const blobBytes = this.parseInt(process.env.FOM_LOGIN_BLOB_BYTES, 0);
        const blobBits = this.parseInt(process.env.FOM_LOGIN_BLOB_BITS, 0);
        this.loginBlobBytes =
            blobBytes > 0 ? blobBytes : blobBits > 0 ? Math.ceil(blobBits / 8) : 256;
        this.loginRequireCredentials = this.parseBool(process.env.LOGIN_REQUIRE_CREDENTIALS, false);
        this.loginResendDuplicate6D = this.parseBool(process.env.LOGIN_RESEND_DUPLICATE_6D, true);
        const loginResponseMinimal = this.parseBool(process.env.LOGIN_RESPONSE_MINIMAL, false);
        const loginResponseTimestamp = this.parseBool(process.env.LOGIN_RESPONSE_TIMESTAMP, false);
        this.bitOrderStrict = this.parseBool(process.env.BIT_ORDER_STRICT, false);
        this.loginHandler = new LoginHandler(
            {
                serverMode: this.serverMode,
                loginDebug: this.loginDebug,
                verbose: this.verbose,
                worldIp: this.worldIp,
                worldPort: this.worldPort,
                loginResponseMinimal,
                loginResponseTimestamp,
                loginRequireCredentials: this.loginRequireCredentials,
                acceptLoginAuthWithoutUser: this.serverMode === 'world',
                resendDuplicateLogin6D: this.loginResendDuplicate6D,
                worldSelectWorldId,
                worldSelectWorldInst,
                worldSelectPlayerId,
                worldSelectPlayerIdRandom,
                worldLoginWorldConst,
            },
            {
                wrapReliable: this.wrapReliable.bind(this),
                ensureBitOrder: this.ensureBitOrder.bind(this),
                realignMsbBuffer: this.realignMsbBuffer.bind(this),
                logBits: this.logBits.bind(this),
                onAuthenticated: this.queueWorldInitialPacketsOnAuth.bind(this),
            },
        );
        if (this.loginDebug || this.verbose) {
            const keyInfo = this.rsaKey
                ? `loaded (bytes=${this.rsaKey.modulusBytes}, endian=${this.rsaKey.endian})`
                : 'missing';
            console.log(
                `[PacketHandler] Login RSA key ${keyInfo}; loginBlobBytes=${this.loginBlobBytes}; mode=${this.serverMode}`,
            );
        }
        this.masterHandler = new MasterHandler({
            isLoginRequestId: this.isLoginRequestId.bind(this),
            tryParseLoginRequest: this.tryParseLoginRequest.bind(this),
            tryParseLoginRequestRak: this.loginHandler.tryParseLoginRequestRak.bind(this.loginHandler),
            tryParseLoginNested: this.tryParseLoginNested.bind(this),
            buildConnectionAccepted: this.buildConnectionAcceptedResponse.bind(this),
            buildConnectionRejected: this.buildConnectionRejectedResponse.bind(this),
            buildQueryResponse: this.buildQueryResponse.bind(this),
            logVerbose: this.logVerbose.bind(this),
        });
        this.worldHandler = new WorldHandler({
            buildConnectionAccepted: this.buildConnectionAcceptedResponse.bind(this),
            buildConnectionRejected: this.buildConnectionRejectedResponse.bind(this),
            buildQueryResponse: this.buildQueryResponse.bind(this),
            isLoginRequestId: this.isLoginRequestId.bind(this),
            tryParseLoginRequest: this.tryParseLoginRequest.bind(this),
            tryParseLoginRequestRak: this.loginHandler.tryParseLoginRequestRak.bind(this.loginHandler),
            tryParseLoginNested: this.tryParseLoginNested.bind(this),
            handleLithTechMessageCore: this.handleLithTechMessageCore.bind(this),
            logVerbose: this.logVerbose.bind(this),
        });

        if (this.serverMode === 'world' && this.worldSendFileList) {
            if (!this.fileListRoot || !fs.existsSync(this.fileListRoot)) {
                console.log('[PacketHandler] File list disabled: no file root found');
            } else {
                const result = buildFileList(
                    this.fileListRoot,
                    this.fileListMapPath,
                    this.fileListMaxBytes,
                    this.verbose ? this.logVerbose.bind(this) : undefined,
                );
                this.fileListPayloads = result.payloads;
                console.log(
                    `[PacketHandler] File list ready: root=${result.root} files=${result.entries.length} packets=${result.payloads.length} skipped=${result.skipped}`,
                );
            }
        }
    }

    // Parse a boolean env/string with common truthy/falsey tokens.
    private parseBool(value: string | undefined, defaultValue: boolean): boolean {
        if (value === undefined) return defaultValue;
        const v = value.toLowerCase();
        if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
        if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
        return defaultValue;
    }

    // Parse an integer env/string with fallback default.
    private parseInt(value: string | undefined, defaultValue: number): number {
        if (!value) return defaultValue;
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? defaultValue : parsed;
    }

    private parseU32(value: string | undefined, defaultValue: number): number {
        if (!value) return defaultValue;
        const base = value.startsWith('0x') || /[a-f]/i.test(value) ? 16 : 10;
        const parsed = Number.parseInt(value, base);
        return Number.isNaN(parsed) ? defaultValue : (parsed >>> 0);
    }

    private parseFloatList(
        value: string | undefined,
        count: number,
        defaults: number[],
    ): number[] {
        if (!value) return defaults.slice(0, count);
        const parts = value.split(',').map((part) => Number.parseFloat(part.trim()));
        const out = defaults.slice(0, count);
        for (let i = 0; i < count; i += 1) {
            if (Number.isFinite(parts[i])) {
                out[i] = parts[i] as number;
            }
        }
        return out;
    }

    private parseU8List(
        value: string | undefined,
        count: number,
        defaults: number[],
    ): number[] {
        if (!value) return defaults.slice(0, count);
        const parts = value.split(',').map((raw) => {
            const token = raw.trim();
            const base = token.startsWith('0x') || /[a-f]/i.test(token) ? 16 : 10;
            const parsed = Number.parseInt(token, base);
            if (Number.isNaN(parsed)) return undefined;
            return Math.max(0, Math.min(255, parsed));
        });
        const out = defaults.slice(0, count);
        for (let i = 0; i < count; i += 1) {
            if (parts[i] !== undefined) {
                out[i] = parts[i] as number;
            }
        }
        return out;
    }

    // Open the LithTech debug log stream when enabled.
    private initLithDebugLog(): void {
        const logEnabled = this.parseBool(process.env.LITH_DEBUG_LOG, false);
        if (!logEnabled) return;
        const logPathEnv = process.env.LITH_DEBUG_LOG_PATH || '';
        const logPath = logPathEnv || path.join('logs', 'lithdebug.log');
        const dir = path.dirname(logPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.lithDebugLogPath = logPath;
        this.lithDebugLogStream = fs.createWriteStream(logPath, { flags: 'w' });
        const stamp = new Date().toISOString();
        this.lithDebugLogStream.write(`# LithDebug log started ${stamp}\n`);
        console.log(`[PacketHandler] LithDebug logging to ${logPath}`);
    }

    // Write a LithTech debug line to file/console.
    private logLithDebug(line: string): void {
        console.log(line);
        if (this.lithDebugLogStream) {
            this.lithDebugLogStream.write(`${line}\n`);
        }
    }

    // Arm or trigger a LithTech debug burst when a trigger packet appears.
    private maybeTriggerLithDebug(connection: Connection, reason: string): void {
        if (this.lithDebugBurst <= 0 || connection.lithDebugTriggered) return;
        connection.lithDebugTriggered = true;
        connection.lithDebugRemaining = this.lithDebugBurst;
        this.logLithDebug(
            `[PacketHandler] LithDebug triggered (${reason}) for ${connection.key}: next ${this.lithDebugBurst} reliable packets`,
        );
    }

    // Render a byte slice as hex for logs.
    private formatHex(buffer: Buffer, maxBytes: number): string {
        const slice = buffer.subarray(0, Math.max(0, maxBytes));
        return (
            slice
                .toString('hex')
                .match(/.{1,2}/g)
                ?.join(' ') || ''
        );
    }

    // Render a byte slice as multi-line hex with offsets.
    private formatHexLines(buffer: Buffer, maxBytes: number, lineBytes: number = 16): string[] {
        const limit = maxBytes > 0 ? Math.min(buffer.length, maxBytes) : buffer.length;
        const slice = buffer.subarray(0, limit);
        const lines: string[] = [];
        for (let i = 0; i < slice.length; i += lineBytes) {
            const chunk = slice.subarray(i, i + lineBytes);
            const hex =
                chunk
                    .toString('hex')
                    .match(/.{1,2}/g)
                    ?.join(' ') || '';
            lines.push(`${i.toString(16).padStart(4, '0')}  ${hex}`);
        }
        return lines;
    }

    // Re-align a buffer by discarding a bit offset (MSB order).
    private realignMsbBuffer(buffer: Buffer, bitOffset: number): Buffer {
        const reader = new RakBitStream(buffer);
        if (bitOffset > 0) {
            reader.readBits(bitOffset);
        }
        const writer = new RakBitStream();
        const totalBits = Math.max(0, buffer.length * 8 - bitOffset);
        for (let i = 0; i < totalBits; i += 1) {
            writer.writeBit(reader.readBit() === 1);
        }
        const outBits = Math.max(0, writer.bits());
        const outBytes = Math.ceil(outBits / 8);
        return writer.data.subarray(0, outBytes);
    }

    // Dump a buffer as LSB-first bit lines for debug.
    private logBits(tag: string, buffer: Buffer, bits: number): void {
        if (!this.lithDebugBits) return;
        const totalBits = Math.min(bits, buffer.length * 8);
        const maxBits =
            this.lithDebugBitsMax > 0 ? Math.min(totalBits, this.lithDebugBitsMax) : totalBits;
        const perLine = this.lithDebugBitsPerLine > 0 ? this.lithDebugBitsPerLine : 128;
        this.logLithDebug(`[Bits] ${tag} bits=${totalBits} order=lsb0`);
        for (let offset = 0; offset < maxBits; offset += perLine) {
            const lineBits = Math.min(perLine, maxBits - offset);
            let line = `  ${offset.toString(16).padStart(4, '0')}  `;
            for (let i = 0; i < lineBits; i++) {
                const idx = offset + i;
                const byteIndex = idx >> 3;
                const bitIndex = idx & 7;
                const bitVal = (buffer[byteIndex] >> bitIndex) & 1;
                line += bitVal ? '1' : '0';
                if ((i & 7) === 7) {
                    line += ' ';
                }
            }
            this.logLithDebug(line);
        }
        if (maxBits < totalBits) {
            this.logLithDebug(`[Bits] ... truncated ${totalBits - maxBits} bits`);
        }
    }

    // Check raw log filters (min/max size) before logging.
    private shouldLogRaw(length: number): boolean {
        if (!this.lithDebugRaw) return false;
        if (this.lithDebugRawMin > 0 && length < this.lithDebugRawMin) return false;
        if (this.lithDebugRawMax > 0 && length > this.lithDebugRawMax) return false;
        return true;
    }

    // Scan payload for LithTech submessages and log potential hits.
    private scanLithTech(innerData: Buffer): void {
        if (!this.lithDebugScan) return;
        const msgIds = new Set<number>([
            LithTechMessageId.MSG_CYCLECHECK,
            LithTechMessageId.MSG_UNKNOWN_5,
            LithTechMessageId.MSG_PROTOCOL_VERSION,
            LithTechMessageId.MSG_UNKNOWN_7,
            LithTechMessageId.MSG_UPDATE,
            LithTechMessageId.MSG_UNKNOWN_10,
            LithTechMessageId.MSG_ID_PACKET,
            LithTechMessageId.MSG_UNKNOWN_13,
            LithTechMessageId.MSG_MESSAGE_GROUP,
            LithTechMessageId.MSG_UNKNOWN_15,
            LithTechMessageId.MSG_UNKNOWN_16,
            LithTechMessageId.MSG_UNKNOWN_17,
            LithTechMessageId.MSG_UNKNOWN_19,
            LithTechMessageId.MSG_UNKNOWN_20,
            LithTechMessageId.MSG_UNKNOWN_21,
            LithTechMessageId.MSG_UNKNOWN_22,
            LithTechMessageId.MSG_UNKNOWN_23,
        ]);

        const lengthBitSizes = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        const preSkips = [0, 8, 16, 24, 32, 40, 48, 56];
        let logged = 0;

        for (const pre of preSkips) {
            for (let off = 0; off < 8; off++) {
                const start = pre + off;
                for (const lenBitsSize of lengthBitSizes) {
                    if (logged >= this.lithDebugScanMax) return;
                    try {
                        const reader = new BitStreamReader(innerData, start);
                        if (reader.remainingBits < 13 + 1 + lenBitsSize + 8) continue;
                        const seq = reader.readBits(13);
                        const cont = reader.readBits(1);
                        const lenBits = reader.readBits(lenBitsSize);
                        if (lenBits <= 0 || lenBits > 4096) continue;
                        const msgId = reader.readBits(8);
                        if (!this.lithDebugScanAny && !msgIds.has(msgId)) continue;
                        if (this.lithDebugScanAny && (msgId === 0x00 || msgId === 0xff)) continue;
                        const payloadBytes = Math.ceil(lenBits / 8);
                        if (payloadBytes <= 0 || payloadBytes > reader.remainingBits / 8) continue;
                        const toRead = Math.min(payloadBytes, this.lithDebugScanPayloadBytes);
                        const payload = reader.readBytes(toRead);
                        const hex = this.formatHex(payload, toRead);
                        this.logLithDebug(
                            `[LithScan] startBit=${start} lenBits=${lenBitsSize} seq=${seq} cont=${cont} msg=0x${msgId.toString(16)} payloadBits=${lenBits} sample=${hex}`,
                        );
                        logged++;
                    } catch {
                        // ignore decode errors
                    }
                }
            }
        }
    }

    // Emit verbose logs only when enabled.
    private logVerbose(message: string): void {
        if (this.verbose) {
            console.log(message);
        }
    }

    // Gate noisy LithTech logs based on debug settings.
    private shouldLogLithNoise(): boolean {
        return (
            this.verbose ||
            this.lithDebugRaw ||
            this.lithDebugBits ||
            this.lithDebugScan ||
            this.lithDebugScanAny ||
            this.lithDebugBurst > 0
        );
    }

    // Emit a throttled log message keyed by tag.
    private logThrottled(key: string, message: string): void {
        if (this.logThrottleMs === 0) {
            console.log(message);
            return;
        }
        const now = Date.now();
        const last = this.lastLogByKey.get(key);
        if (last !== undefined && now - last < this.logThrottleMs) {
            return;
        }
        this.lastLogByKey.set(key, now);
        console.log(message);
    }

    // Top-level packet dispatcher for all inbound UDP data.
    handlePacket(ctx: PacketContext): Buffer | null {
        const { data, reader, connection } = ctx;

        if (data.length < 4) {
            console.log(`[PacketHandler] Packet too small: ${data.length} bytes`);
            return null;
        }

        const firstDword = data.readUInt32LE(0);

        // LithTech connection magic - custom protocol, NOT standard RakNet
        if (firstDword === CONNECTION_MAGIC) {
            return this.handleConnectionRequest(ctx);
        }

        // Standard RakNet packet (first byte is packet ID)
        const packetId = data[0];
        this.logVerbose(
            `[PacketHandler] Received packet ID: 0x${packetId.toString(16).padStart(2, '0')} from ${connection.key}`,
        );

        switch (packetId) {
            case RakNetMessageId.ID_OPEN_CONNECTION_REQUEST:
                return this.handleOpenConnectionRequest(ctx);

            case RakNetMessageId.ID_CONNECTION_REQUEST:
                return this.handleRakNetConnectionRequest(ctx);

            case RakNetMessageId.ID_LOGIN_REQUEST_RETURN:
                console.log('[PacketHandler] Unexpected LOGIN_REQUEST_RETURN from client');
                return null;

            case RakNetMessageId.ID_DISCONNECTION_NOTIFICATION:
                console.log(`[PacketHandler] Client ${connection.key} disconnected cleanly`);
                connection.state = ConnectionState.DISCONNECTED;
                this.loginHandler.releaseConnection(connection);
                return null;

            case RakNetMessageId.ID_PING:
            case RakNetMessageId.ID_INTERNAL_PING:
                return this.handlePing(ctx);

            default:
                break;
        }

        const parsed = parseRakNetDatagram(data);
        if (parsed) {
            this.handleAckRanges(connection, parsed);
            if (parsed.packets.length > 0) {
                return this.handleRakNetDatagram(ctx, parsed);
            }
            return null;
        }

        return this.handleGamePacket(ctx, packetId);
    }

    // Select master/world handler based on server mode.
    private getActiveHandler(): MasterHandler | WorldHandler {
        return this.serverMode === 'world' ? this.worldHandler : this.masterHandler;
    }

    // Pop the next queued world packet for a connection.
    dequeueWorldPacket(connection: Connection): Buffer | null {
        if (this.serverMode !== 'world') return null;
        if (connection.pendingWorldPackets.length === 0) return null;
        return connection.pendingWorldPackets.shift() ?? null;
    }

    // Expose world mode for external tick loops.
    isWorldServer(): boolean {
        return this.serverMode === 'world';
    }

    // Expose world tick interval for server scheduling.
    getWorldHeartbeatIntervalMs(): number {
        if (this.worldUnguaranteedEnabled && this.worldUnguaranteedIntervalMs > 0) {
            return this.worldUnguaranteedIntervalMs;
        }
        return this.worldHeartbeatIntervalMs;
    }

    // Build a world heartbeat/unguaranteed packet if due.
    buildWorldHeartbeat(connection: Connection, now: number): Buffer | null {
        if (this.serverMode !== 'world') return null;
        if (!connection.authenticated || connection.worldConnectStage < 0) return null;

        const sendUnguaranteed = this.worldUnguaranteedEnabled && this.worldUnguaranteedIntervalMs > 0;
        const sendHeartbeat = this.worldHeartbeatEnabled && this.worldHeartbeatIntervalMs > 0;
        if (!sendUnguaranteed && !sendHeartbeat) return null;

        const interval = sendUnguaranteed ? this.worldUnguaranteedIntervalMs : this.worldHeartbeatIntervalMs;
        if (
            connection.worldLastHeartbeatAt &&
            now - connection.worldLastHeartbeatAt < interval
        ) {
            return null;
        }
        const origin = connection.worldTimeOrigin || now;
        const gameTime = Math.max(0, (now - origin) / 1000);
        const packet = this.buildWorldUnguaranteedUpdate(connection, gameTime);
        if (!packet) return null;
        if (this.isWorldFlowBlocked(connection, packet.length, now)) {
            return null;
        }
        this.updateWorldFlowControl(connection, packet.length, now);
        connection.worldLastHeartbeatAt = now;
        return packet;
    }

    // Release any per-connection allocations (e.g., apartment inst).
    releaseConnection(connection: Connection): void {
        this.loginHandler.releaseConnection(connection);
    }

    /**
     * Handle LithTech custom connection request (NOT standard RakNet)
     *
     * Packet structure (from Ghidra CUDPDriver_JoinSession):
     * - Magic: 0x9919D9C7 (32 bits)
     * - Request Type: 3 bits (1=QUERY, 2=CONNECT, 3=CONNECT_RESPONSE)
     * - Password: 128 bytes (0x80) - null-terminated string for CONNECT
     * - Timestamp: 32 bits
     */
    // Handle legacy connection requests and queries.
    private handleConnectionRequest(ctx: PacketContext): Buffer | null {
        const { reader, connection } = ctx;

        const magic = reader.readUInt32();
        if (magic !== CONNECTION_MAGIC) {
            console.log(`[PacketHandler] Invalid magic: 0x${magic.toString(16)}`);
            return null;
        }

        const requestType = reader.readBits(3);

        const typeNames: Record<number, string> = {
            1: 'QUERY',
            2: 'CONNECT',
            3: 'CONNECT_RESPONSE',
        };
        console.log(
            `[PacketHandler] Connection request: ${typeNames[requestType] || 'UNKNOWN'} (${requestType}) from ${connection.key}`,
        );

        switch (requestType) {
            case ConnectionRequestType.CONNECT:
                return this.handleConnectRequest(ctx, reader);

            case ConnectionRequestType.QUERY: {
                const resp = this.getActiveHandler().handleConnectionRequest(ctx, {
                    requestType,
                    password: '',
                    timestamp: 0,
                    passwordValid: true,
                });
                if (resp) return resp;
                return this.buildQueryResponse();
            }

            default:
                console.log(`[PacketHandler] Unknown request type: ${requestType}`);
                return null;
        }
    }

    // Process RakNet CONNECT/QUERY request with password check.
    private handleConnectRequest(ctx: PacketContext, reader: BitStreamReader): Buffer | null {
        const { connection } = ctx;

        // Protocol: 128 bytes password field (0x80), null-terminated
        const availableBytes = Math.floor(reader.remainingBits / 8);
        if (availableBytes < 128) {
            console.log(
                `[PacketHandler] Short CONNECT packet: ${availableBytes} bytes available, expected 128. Treating missing bytes as empty.`,
            );
        }
        const passwordBytes = Buffer.alloc(128);
        if (availableBytes > 0) {
            const toRead = Math.min(128, availableBytes);
            reader.readBytes(toRead).copy(passwordBytes);
        }

        let passwordEnd = passwordBytes.indexOf(0);
        if (passwordEnd === -1) passwordEnd = passwordBytes.length;
        const password = passwordBytes.subarray(0, passwordEnd).toString('ascii');

        let timestamp = 0;
        if (reader.remainingBits >= 32) {
            timestamp = reader.readUInt32();
        } else {
            this.logVerbose(`[PacketHandler] No timestamp in connection request`);
        }

        if (this.verbose) {
            console.log(`[PacketHandler] Connect request details:`);
            console.log(`  Password: "${password}" (${password.length} chars)`);
            console.log(`  Timestamp: ${timestamp}`);
            console.log(`  Expected: "${WORLD_SERVER_PASSWORD}"`);
        }

        const passwordValid = password === '' || password === WORLD_SERVER_PASSWORD;

        const handler = this.getActiveHandler();
        const handlerResp = handler.handleConnectionRequest(ctx, {
            requestType: ConnectionRequestType.CONNECT,
            password,
            timestamp,
            passwordValid,
        });
        if (handlerResp) {
            return handlerResp;
        }

        if (passwordValid) {
            connection.state = ConnectionState.CONNECTED;
            return this.buildConnectionAcceptedResponse(connection);
        } else {
            console.log(`[PacketHandler] Invalid password from ${connection.key}`);
            return this.buildConnectionRejectedResponse('INVALID_PASSWORD');
        }
    }

    // Build server reply for accepted connection.
    private buildConnectionAcceptedResponse(connection: Connection): Buffer {
        const writer = new BitStreamWriter(256);

        writer.writeUInt32(CONNECTION_MAGIC);
        writer.writeBits(ConnectionRequestType.CONNECT_RESPONSE, 3);
        writer.writeBits(ConnectionResponseFlag.ACCEPTED, 1);
        writer.writeBits(ConnectionResponseFlag.SKIP_GUID_CHECK, 1);

        console.log(`[PacketHandler] Sending connection ACCEPTED to ${connection.key}`);
        return writer.toBuffer();
    }

    // Build server reply for rejected connection.
    private buildConnectionRejectedResponse(reason: string): Buffer {
        const writer = new BitStreamWriter(256);

        writer.writeUInt32(CONNECTION_MAGIC);
        writer.writeBits(ConnectionRequestType.CONNECT_RESPONSE, 3);
        writer.writeBits(ConnectionResponseFlag.REJECTED, 1);
        const guidFlag =
            reason === 'GUID_MISMATCH'
                ? ConnectionResponseFlag.GUID_MISMATCH
                : ConnectionResponseFlag.SKIP_GUID_CHECK;
        writer.writeBits(guidFlag, 1);

        console.log(`[PacketHandler] Sending connection REJECTED (${reason})`);
        return writer.toBuffer();
    }

    // Handle ping requests and return pong.
    private handlePing(ctx: PacketContext): Buffer {
        const writer = new BitStreamWriter(16);
        writer.writeByte(RakNetMessageId.ID_PONG);
        if (ctx.data.length > 1) {
            writer.writeBytes(ctx.data.subarray(1, Math.min(ctx.data.length, 9)));
        }
        return writer.toBuffer();
    }

    // Build server query response payload.
    private buildQueryResponse(): Buffer {
        const writer = new BitStreamWriter(256);

        const currentPlayerCount = 0;
        const maxPlayerCount = 100;

        writer.writeUInt32(CONNECTION_MAGIC);
        writer.writeBits(ConnectionRequestType.QUERY, 3);
        writer.writeString('Face of Mankind Emulator');
        writer.writeUInt16(currentPlayerCount);
        writer.writeUInt16(maxPlayerCount);

        return writer.toBuffer();
    }

    // Parse dotted IPv4 string into bytes.
    private parseIpv4(ip: string): number[] | null {
        const parts = ip.split('.');
        if (parts.length !== 4) return null;
        const bytes = parts.map((part) => Number.parseInt(part, 10));
        if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null;
        return bytes;
    }

    // Handle RakNet open connection request (0x09).
    private handleOpenConnectionRequest(ctx: PacketContext): Buffer | null {
        console.log(`[PacketHandler] ID_OPEN_CONNECTION_REQUEST from ${ctx.connection.key}`);

        const replyIp =
            process.env.REPLY_IP || process.env.BIND_IP || process.env.SERVER_IP || '127.0.0.1';
        const replyPortRaw = Number.parseInt(
            process.env.REPLY_PORT || process.env.PORT || String(DEFAULT_PORT),
            10,
        );
        const replyPort =
            Number.isNaN(replyPortRaw) || replyPortRaw <= 0 ? DEFAULT_PORT : replyPortRaw;

        let ipBytes = this.parseIpv4(replyIp);
        let resolvedIp = replyIp;
        if (!ipBytes) {
            const fallback = this.parseIpv4(ctx.connection.address) || [127, 0, 0, 1];
            ipBytes = fallback;
            resolvedIp = fallback.join('.');
        }

        const payloadLength =
            1 + OFFLINE_MESSAGE_ID.length + OFFLINE_SYSTEM_ADDRESS_BYTES.length + 6;
        const reply = Buffer.alloc(payloadLength);
        let offset = 0;
        reply[offset++] = RakNetMessageId.ID_OPEN_CONNECTION_REPLY;
        OFFLINE_MESSAGE_ID.copy(reply, offset);
        offset += OFFLINE_MESSAGE_ID.length;
        OFFLINE_SYSTEM_ADDRESS_BYTES.copy(reply, offset);
        offset += OFFLINE_SYSTEM_ADDRESS_BYTES.length;
        for (const b of ipBytes) {
            reply[offset++] = ~b & 0xff;
        }
        reply.writeUInt16BE(replyPort, offset);

        this.logVerbose(
            `[PacketHandler] Sending ID_OPEN_CONNECTION_REPLY addr=${resolvedIp}:${replyPort}`,
        );
        return reply;
    }

    // Apply ACK ranges to connection state.
    private handleAckRanges(connection: Connection, parsed: ParsedRakNetDatagram): void {
        if (!parsed.hasAcks || !parsed.ackRanges) return;
        const acked: number[] = [];
        for (const range of parsed.ackRanges.ranges) {
            for (let i = range.min; i <= range.max; i += 1) {
                acked.push(i);
            }
        }

        if (
            connection.lastLoginResponseMsgNum !== null &&
            acked.includes(connection.lastLoginResponseMsgNum)
        ) {
            connection.loginResponseAckCount += 1;
            return;
        }

        if (acked.length > 0 && this.verbose) {
            this.logVerbose(`[PacketHandler] ACKs received: ${acked.join(', ')}`);
        }
    }

    // Parse reliable datagram, dispatch acks and inner packets.
    private handleRakNetDatagram(ctx: PacketContext, parsed: ParsedRakNetDatagram): Buffer | null {
        const { connection } = ctx;
        if (typeof parsed.remoteTime === 'number') {
            connection.lastTimestamp = parsed.remoteTime >>> 0;
        }
        if (connection.reliableFormat === 'unknown') {
            connection.reliableFormat = parsed.format;
            this.logVerbose(`[PacketHandler] Reliable format detected: ${parsed.format}`);
        }

        let response: Buffer | null = null;
        for (const packet of parsed.packets) {
            if (
                packet.reliability === Reliability.RELIABLE ||
                packet.reliability === Reliability.RELIABLE_ORDERED ||
                packet.reliability === Reliability.RELIABLE_SEQUENCED
            ) {
                if (!connection.pendingAcks.includes(packet.messageNumber)) {
                    connection.pendingAcks.push(packet.messageNumber);
                }
            }
            response = this.handleReliableInner(ctx, packet);
            if (response) {
                break;
            }
        }
        return response;
    }

    // Handle reliable inner packets and login nesting.
    private handleReliableInner(ctx: PacketContext, packet: ParsedRakNetPacket): Buffer | null {
        const { connection } = ctx;
        const innerData = packet.innerData;
        const innerMsgId = innerData.length > 0 ? innerData[0] : -1;

        if (this.verbose) {
            console.log(`[PacketHandler] Reliable packet from ${connection.key}:`);
            console.log(`  MsgNum: ${packet.messageNumber}, Reliability: ${packet.reliability}`);
            console.log(
                `  Inner: ${innerData.length} bytes, FirstByte: 0x${innerMsgId.toString(16)}`,
            );
        }
        if (this.shouldLogRaw(innerData.length) && innerMsgId !== 0x00) {
            this.logLithDebug(
                `[RelRaw] ${connection.key} innerBytes=${innerData.length} first=0x${innerMsgId.toString(16)}`,
            );
            const lines = this.formatHexLines(innerData, this.lithDebugRawBytes);
            for (const line of lines) {
                this.logLithDebug(`[RelRaw]   ${line}`);
            }
            this.logBits(`[RelRaw] ${connection.key} inner`, innerData, innerData.length * 8);
        }
        if (this.shouldLogRaw(innerData.length)) {
            this.scanLithTech(innerData);
        }

        connection.lastMessageNumber = packet.messageNumber;

        if (innerMsgId === RakNetMessageId.ID_FILE_LIST_TRANSFER_RESPONSE) {
            this.handleFileListResponse(connection, innerData);
            return null;
        }

        if (innerMsgId === RakNetMessageId.ID_CONNECTION_REQUEST) {
            return this.handleReliableConnectionRequest(ctx, innerData);
        }

        const handlerLogin = this.getActiveHandler().handleReliableInner(
            ctx,
            innerData,
            innerMsgId,
        );
        if (handlerLogin) {
            return handlerLogin;
        }

        if (innerMsgId === RakNetMessageId.ID_NEW_INCOMING_CONNECTION) {
            console.log(`[PacketHandler] ID_NEW_INCOMING_CONNECTION - client fully connected!`);
            connection.state = ConnectionState.CONNECTED;
            if (this.lithDebugTrigger === 'on_connect') {
                this.maybeTriggerLithDebug(connection, 'on_connect');
            }
            return null;
        }

        // LithTech guaranteed packet format: 13-bit sequence + messages
        // First byte 0x00 often indicates start of LithTech layer
        if ((innerMsgId === 0x00 || innerMsgId === 0x40) && innerData.length > 4) {
            const lithResponse = this.handleLithTechGuaranteed(ctx, innerData);
            if (lithResponse) {
                return lithResponse;
            }
        }
        // Temporary: scan 0x80 payloads for nested LithTech frames (no functional handling yet).
        if (innerMsgId === 0x80 && innerData.length > 4) {
            if (!connection.authenticated) {
                const resp = this.tryParseLoginNested(innerData, connection, 'reliable-inner-0x80');
                if (resp) return resp;
            }
            if (this.shouldLogLithNoise()) {
                this.logLithDebug(
                    `[LithScan] ${connection.key} inner=0x80 bytes=${innerData.length}`,
                );
                this.scanLithTechFrames(innerData, connection);
            }
        }

        if (innerMsgId >= 0) {
            if (this.verbose) {
                this.logThrottled(
                    `unhandled-inner-${innerMsgId}`,
                    `[PacketHandler] Unhandled inner message: 0x${innerMsgId.toString(16)}`,
                );
            }
        }
        return null;
    }

    private handleFileListResponse(connection: Connection, innerData: Buffer): void {
        if (innerData.length < 1) return;
        const reader = new BitStreamReader(innerData);
        const msgId = reader.readByte();
        if (msgId !== RakNetMessageId.ID_FILE_LIST_TRANSFER_RESPONSE) return;

        const missing: number[] = [];
        const present: number[] = [];
        while (reader.remainingBits >= 16) {
            const value = reader.readUInt16();
            const isMissing = (value & 0x8000) !== 0;
            const id = value & 0x7fff;
            if (isMissing) {
                missing.push(id);
            } else {
                present.push(id);
            }
        }

        if (missing.length > 0) {
            const preview = missing.slice(0, 12).map((id) => id.toString(16)).join(',');
            this.logThrottled(
                `filelist-missing-${connection.key}`,
                `[FileList] ${connection.key} missing ${missing.length} files (ids: ${preview})`,
            );
        } else if (this.verbose && present.length > 0) {
            this.logThrottled(
                `filelist-ack-${connection.key}`,
                `[FileList] ${connection.key} acked ${present.length} files`,
            );
        }
    }

    // Parse and dispatch LithTech guaranteed subpackets.
    private handleLithTechGuaranteed(ctx: PacketContext, innerData: Buffer): Buffer | null {
        const handler = this.getActiveHandler();
        const handlerResp = handler.handleLithTechGuaranteed(ctx, innerData);
        if (handlerResp) return handlerResp;
        const { connection } = ctx;

        // Parse LithTech guaranteed packet using bit-stream reader
        const reader = new BitStreamReader(innerData);

        // Read 13-bit sequence number
        const sequenceNum = reader.readBits(13);
        // Read continuation flag (1 bit)
        const hasContinuation = reader.readBits(1);

        this.logVerbose(
            `[PacketHandler] LithTech guaranteed: seq=${sequenceNum}, cont=${hasContinuation}`,
        );
        if (this.shouldLogRaw(innerData.length)) {
            this.logLithDebug(
                `[LithRaw] ${connection.key} seq=${sequenceNum} cont=${hasContinuation} innerBytes=${innerData.length}`,
            );
            const lines = this.formatHexLines(innerData, this.lithDebugRawBytes);
            for (const line of lines) {
                this.logLithDebug(`[LithRaw]   ${line}`);
            }
        }

        // Byte-aligned pattern scan (helps detect structured frames)
        this.scanLithTechFrames(innerData, connection);

        // Deterministic LithTech guaranteed sub-packet parsing (matches engine size indicators).
        // External/LithTech source of truth:
        // - udpdriver.cpp :: CUDPConn::HandleGuaranteed + ReadSizeIndicator
        // - packet.cpp    :: CPacket_Read::ReadBits (LSB bit order)
        const deterministic = parseLithTechGuaranteedSubPackets(
            innerData,
            reader,
            connection,
            hasContinuation !== 0,
            {
                logNote: this.logPacketNote.bind(this),
                shouldLogNoise: this.shouldLogLithNoise.bind(this),
            },
        );
        const messages = deterministic;
        if (messages.length === 0 && (this.lithDebugRaw || this.verbose)) {
            this.logLithDebug(
                `[LithParse] ${connection.key} no sub-messages parsed (deterministic)`,
            );
        }
        this.logVerbose(`[PacketHandler] Parsed ${messages.length} LithTech sub-messages`);

        if (this.lithDebugTrigger === 'first_lith') {
            this.maybeTriggerLithDebug(connection, 'first_lith');
        }

        if (connection.lithDebugRemaining > 0) {
            this.logLithDebug(
                `[LithDebug] ${connection.key} seq=${sequenceNum} cont=${hasContinuation} innerBytes=${innerData.length} msgs=${messages.length}`,
            );
            for (const msg of messages) {
                const hex = this.formatHex(msg.payload, this.lithDebugHexBytes);
                this.logLithDebug(
                    `[LithDebug]   MSG_ID=0x${msg.msgId.toString(16)} bits=${msg.payloadBits} payload=${hex}`,
                );
            }
            connection.lithDebugRemaining = Math.max(0, connection.lithDebugRemaining - 1);
            this.logLithDebug(`[LithDebug] Remaining packets: ${connection.lithDebugRemaining}`);
        }

        let resp: Buffer | null = null;
        for (const msg of messages) {
            this.logVerbose(`  MSG_ID ${msg.msgId}: ${msg.payloadBits} bits`);
            this.logBits(
                `[LithMsg] ${connection.key} msg=0x${msg.msgId.toString(16)}`,
                msg.payload,
                msg.payloadBits,
            );
            resp = this.handleLithTechSubMessage(ctx, msg);
            if (resp) return resp;
        }

        if (!connection.lithTechProtocolSent) {
            connection.lithTechProtocolSent = true;
            return this.buildProtocolVersionPacket(connection);
        }
        if (!connection.lithTechIdSent) {
            connection.lithTechIdSent = true;
            return this.buildLithTechIdPacket(connection);
        }
        if (this.forceLoginOnFirstLith && !connection.forcedLoginSent) {
            connection.forcedLoginSent = true;
            console.log(
                `[PacketHandler] FORCE_LOGIN_ON_FIRST_LITH sending login response to ${connection.key}`,
            );
            const login = this.loginHandler.buildLoginResponse(true, this.worldIp, this.worldPort);
            return this.wrapReliable(login, connection);
        }

        return null;
    }

    // Build initial packets sent on connect (protocol/id).
    buildInitialPackets(connection: Connection): Buffer[] {
        const packets: Buffer[] = [];

        if (!connection.lithTechProtocolSent) {
            connection.lithTechProtocolSent = true;
            packets.push(this.buildProtocolVersionPacket(connection));
        }
        if (!connection.lithTechIdSent) {
            connection.lithTechIdSent = true;
            packets.push(this.buildLithTechIdPacket(connection));
        }

        return packets;
    }

    // Parse LithTech submessages from bitstream (strict).
    private parseLithTechSubMessages(reader: BitStreamReader): LithTechSubMessage[] {
        this.ensureBitOrder(
            (reader as unknown as { bitOrder?: BitOrder }).bitOrder,
            'lsb',
            'LithTechSubMessages',
        );
        const messages: LithTechSubMessage[] = [];

        try {
            while (reader.remainingBits >= 8) {
                const lengthBits = reader.readBits(8);
                if (lengthBits === 0) break;

                const msgId = reader.readBits(8);

                const payloadBytes = Math.ceil(lengthBits / 8);
                const payload = Buffer.alloc(payloadBytes);
                for (let i = 0; i < payloadBytes && reader.remainingBits >= 8; i++) {
                    payload[i] = reader.readBits(8);
                }

                messages.push({ msgId, payload, payloadBits: lengthBits });
                if (this.lithHasMoreFlag && reader.remainingBits >= 1) {
                    const hasMore = reader.readBits(1);
                    if (!hasMore) break;
                }
            }
        } catch (e) {
            if (this.shouldLogLithNoise()) {
                console.log(`[PacketHandler] Error parsing LithTech messages: ${e}`);
            }
        }

        return messages;
    }

    // Probe-parse LithTech submessages with tolerance.
    private parseLithTechSubMessagesProbe(buffer: Buffer): {
        messages: LithTechSubMessage[];
        startBit: number;
        invalidCount: number;
    } {
        const offsets = [0, 8, 16, 24, 32, 40];
        let bestMessages: LithTechSubMessage[] = [];
        let bestInvalid = Number.MAX_SAFE_INTEGER;
        let bestOffset = 0;
        let bestScore = -1;

        for (const offset of offsets) {
            const result = this.parseLithTechSubMessagesTolerant(buffer, offset);
            const score = result.messages.length * 10 - result.invalidCount;
            if (this.lithDebugRaw || this.verbose) {
                this.logLithDebug(
                    `[LithProbe] try offset=${offset} msgs=${result.messages.length} invalid=${result.invalidCount}`,
                );
            }
            if (score > bestScore) {
                bestScore = score;
                bestMessages = result.messages;
                bestInvalid = result.invalidCount;
                bestOffset = offset;
            }
        }

        return { messages: bestMessages, startBit: bestOffset, invalidCount: bestInvalid };
    }

    // Try to decode LithTech frames for debug scanning.
    private scanLithTechFrames(buffer: Buffer, connection: Connection): void {
        if (!this.lithDebugRaw && !this.verbose && !this.shouldLogRaw(buffer.length)) return;
        const targets = [
            RakNetMessageId.ID_LOGIN_REQUEST_TEXT,
            RakNetMessageId.ID_LOGIN_REQUEST_RETURN,
        ];
        const maxHits = 6;
        let hits = 0;

        for (let i = 0; i < buffer.length; i += 1) {
            if (!targets.includes(buffer[i])) continue;
            const start = Math.max(0, i - 12);
            const end = Math.min(buffer.length, i + 20);
            const slice = buffer.subarray(start, end);
            this.logLithDebug(
                `[FrameScan] ${connection.key} hit=0x${buffer[i].toString(16)} @${i} window=${slice.toString('hex')}`,
            );
            hits += 1;
            if (hits >= maxHits) break;
        }

        // Try structured decoders near buffer start
        this.decodeFrameLen32(buffer, connection);
        this.decodeFrameLen16(buffer, connection);
        this.decodeFrameIdLen16(buffer, connection);
    }

    // Decode len32 framed payloads for login scanning.
    private decodeFrameLen32(buffer: Buffer, connection: Connection): void {
        // format: [len32le][msgId8][payload...]
        if (buffer.length < 6) return;
        const maxFrames = 6;
        let offset = 0;
        let frames = 0;
        while (offset + 5 <= buffer.length && frames < maxFrames) {
            const len = buffer.readUInt32LE(offset);
            if (len === 0 || len > buffer.length) break;
            const msgId = buffer[offset + 4];
            const payloadStart = offset + 5;
            const payloadEnd = Math.min(buffer.length, payloadStart + len);
            const payload = buffer.subarray(payloadStart, payloadEnd);
            this.logLithDebug(
                `[Frame32] ${connection.key} off=${offset} len=${len} msgId=0x${msgId.toString(16)} payload=${this.formatHex(payload, this.lithDebugHexBytes)}`,
            );
            frames += 1;
            offset = payloadEnd;
        }
    }

    // Decode len16 framed payloads for login scanning.
    private decodeFrameLen16(buffer: Buffer, connection: Connection): void {
        // format: [len16le][msgId8][payload...]
        if (buffer.length < 4) return;
        const maxFrames = 8;
        let offset = 0;
        let frames = 0;
        while (offset + 3 <= buffer.length && frames < maxFrames) {
            const len = buffer.readUInt16LE(offset);
            if (len === 0 || len > buffer.length) break;
            const msgId = buffer[offset + 2];
            const payloadStart = offset + 3;
            const payloadEnd = Math.min(buffer.length, payloadStart + len);
            const payload = buffer.subarray(payloadStart, payloadEnd);
            this.logLithDebug(
                `[Frame16] ${connection.key} off=${offset} len=${len} msgId=0x${msgId.toString(16)} payload=${this.formatHex(payload, this.lithDebugHexBytes)}`,
            );
            this.scanNestedFrames(payload, connection, `frame16@${offset}`);
            frames += 1;
            offset = payloadEnd;
        }
    }

    // Decode id+len16 framed payloads for login scanning.
    private decodeFrameIdLen16(buffer: Buffer, connection: Connection): void {
        // format: [msgId8][len16le][payload...]
        if (buffer.length < 4) return;
        const maxFrames = 8;
        let offset = 0;
        let frames = 0;
        while (offset + 3 <= buffer.length && frames < maxFrames) {
            const msgId = buffer[offset];
            const len = buffer.readUInt16LE(offset + 1);
            if (len === 0 || len > buffer.length) break;
            const payloadStart = offset + 3;
            const payloadEnd = Math.min(buffer.length, payloadStart + len);
            const payload = buffer.subarray(payloadStart, payloadEnd);
            this.logLithDebug(
                `[FrameId16] ${connection.key} off=${offset} len=${len} msgId=0x${msgId.toString(16)} payload=${this.formatHex(payload, this.lithDebugHexBytes)}`,
            );
            this.scanNestedFrames(payload, connection, `frameId16@${offset}`);
            frames += 1;
            offset = payloadEnd;
        }
    }

    private tryDecodeLoginFrameAtOffset(
        payload: Buffer,
        offset: number,
        connection: Connection,
        tag: string,
    ): void {
        const emitLogin = (
            format: string,
            length: number,
            msgId: number,
            framePayload: Buffer,
        ): void => {
            const hexSample = this.formatHex(framePayload, this.lithDebugHexBytes);
            const hexFull = framePayload.toString('hex');
            this.logLithDebug(
                `[LoginFrame] ${connection.key} ${tag} off=${offset} fmt=${format} len=${length} msgId=0x${msgId.toString(16)} payload=${hexSample}`,
            );
            this.logPacketNote(
                `[LoginFrame] ${connection.key} ${tag} off=${offset} fmt=${format} len=${length} msgId=0x${msgId.toString(16)} payload=${hexFull}`,
            );
            const loginBuffer = Buffer.concat([Buffer.from([msgId]), framePayload]);
            this.loginHandler.tryParseLoginRequestRak(
                loginBuffer,
                connection,
                `${tag}:off=${offset}:${format}`,
                { dryRun: true, tracePath: 'PacketHandler.tryDecodeLoginFrameAtOffset' },
            );
        };

        if (offset + 3 <= payload.length) {
            const len16 = payload.readUInt16LE(offset);
            const msgId16 = payload[offset + 2];
            const payloadStart = offset + 3;
            const payloadEnd = payloadStart + len16;
            if (len16 > 0 && payloadEnd <= payload.length) {
                if (this.isLoginRequestId(msgId16)) {
                    emitLogin('len16', len16, msgId16, payload.subarray(payloadStart, payloadEnd));
                }
            }
        }

        if (offset + 3 <= payload.length) {
            const msgIdId16 = payload[offset];
            const lenId16 = payload.readUInt16LE(offset + 1);
            const payloadStart = offset + 3;
            const payloadEnd = payloadStart + lenId16;
            if (lenId16 > 0 && payloadEnd <= payload.length) {
                if (this.isLoginRequestId(msgIdId16)) {
                    emitLogin(
                        'id16',
                        lenId16,
                        msgIdId16,
                        payload.subarray(payloadStart, payloadEnd),
                    );
                }
            }
        }

        if (offset + 5 <= payload.length) {
            const len32 = payload.readUInt32LE(offset);
            const msgId32 = payload[offset + 4];
            const payloadStart = offset + 5;
            const payloadEnd = payloadStart + len32;
            if (len32 > 0 && payloadEnd <= payload.length) {
                if (this.isLoginRequestId(msgId32)) {
                    emitLogin('len32', len32, msgId32, payload.subarray(payloadStart, payloadEnd));
                }
            }
        }
    }

    // Search payload for embedded login frames and attempt decode.
    private scanNestedFrames(payload: Buffer, connection: Connection, tag: string): void {
        // Look for 0x6c/0x6d inside payload and attempt nested decode from nearby offsets.
        const targets = [
            RakNetMessageId.ID_LOGIN_REQUEST_TEXT,
            RakNetMessageId.ID_LOGIN_REQUEST_RETURN,
        ];
        for (let i = 0; i < payload.length; i += 1) {
            if (!targets.includes(payload[i])) continue;
            const start = Math.max(0, i - 8);
            const end = Math.min(payload.length, i + 24);
            const window = payload.subarray(start, end);
            const hitTag = `${tag}:hit@${i}`;
            this.logLithDebug(
                `[NestedScan] ${connection.key} ${tag} hit=0x${payload[i].toString(16)} @${i} window=${window.toString('hex')}`,
            );

            // Attempt shifted frame decoding around hit (i-2..i+2).
            for (let delta = -2; delta <= 2; delta += 1) {
                const offset = i + delta;
                if (offset < 0 || offset >= payload.length) continue;
                this.tryDecodeLoginFrameAtOffset(payload, offset, connection, hitTag);
            }

            // Try nested decodes starting at this offset
            const slice = payload.subarray(i);
            this.decodeFrameLen32(slice, connection);
            this.decodeFrameLen16(slice, connection);
            this.decodeFrameIdLen16(slice, connection);
        }
    }

    private parseLithTechSubMessagesTolerant(
        buffer: Buffer,
        startBit: number,
    ): { messages: LithTechSubMessage[]; invalidCount: number } {
        const messages: LithTechSubMessage[] = [];
        const reader = new BitStreamReader(buffer, startBit);
        this.ensureBitOrder(
            (reader as unknown as { bitOrder?: BitOrder }).bitOrder,
            'lsb',
            'LithTechSubMessagesTolerant',
        );
        let invalid = 0;
        let steps = 0;
        const maxSteps = Math.max(64, buffer.length * 2);

        try {
            while (reader.remainingBits >= 8 && steps < maxSteps) {
                const lengthBits = reader.readBits(8);
                steps += 1;

                if (lengthBits === 0) {
                    invalid += 1;
                    continue;
                }
                if (reader.remainingBits < 8) {
                    invalid += 1;
                    break;
                }

                const msgId = reader.readBits(8);
                if (lengthBits > reader.remainingBits) {
                    invalid += 1;
                    continue;
                }

                const payloadBytes = Math.ceil(lengthBits / 8);
                const payload = Buffer.alloc(payloadBytes);
                let bitsLeft = lengthBits;
                for (let i = 0; i < payloadBytes; i++) {
                    const take = Math.min(8, bitsLeft);
                    payload[i] = reader.readBits(take);
                    bitsLeft -= take;
                }

                messages.push({ msgId, payload, payloadBits: lengthBits });

                if (this.lithHasMoreFlag && reader.remainingBits >= 1) {
                    const hasMore = reader.readBits(1);
                    if (!hasMore) break;
                }
            }
        } catch (e) {
            if (this.shouldLogLithNoise()) {
                console.log(`[PacketHandler] Error parsing LithTech messages (tolerant): ${e}`);
            }
        }

        return { messages, invalidCount: invalid };
    }

    // Route a single LithTech submessage to handlers.
    private handleLithTechSubMessage(ctx: PacketContext, msg: LithTechSubMessage): Buffer | null {
        switch (msg.msgId) {
            case LithTechMessageId.MSG_PROTOCOL_VERSION:
                this.logVerbose(`[PacketHandler] Protocol version check`);
                return null;
            case LithTechMessageId.MSG_ID_PACKET:
                this.logVerbose(`[PacketHandler] ID packet received`);
                return null;
            case LithTechMessageId.MSG_CONNECTSTAGE: {
                if (msg.payloadBits < 16) return null;
                const reader = new BitStreamReader(msg.payload);
                const stage = reader.readBits(16);
                ctx.connection.worldConnectStage = stage;
                if (!ctx.connection.worldTimeOrigin) {
                    ctx.connection.worldTimeOrigin = Date.now();
                }
                this.logVerbose(`[PacketHandler] Connect stage=${stage}`);
                if (
                    this.serverMode === 'world' &&
                    this.worldSpawnEnabled &&
                    !ctx.connection.worldSpawnSent &&
                    stage === this.worldSpawnStage
                ) {
                    const spawn = this.buildWorldSpawnUpdate(ctx.connection);
                    if (spawn) {
                        ctx.connection.worldSpawnSent = true;
                        ctx.connection.worldSpawnObjectId =
                            ctx.connection.worldLoginPlayerId > 0
                                ? ctx.connection.worldLoginPlayerId
                                : (ctx.connection.id & 0xffff);
                        return spawn;
                    }
                }
                return null;
            }
            case LithTechMessageId.MSG_MESSAGE_GROUP:
                this.logVerbose(`[PacketHandler] Message group - unpacking`);
                const groupMessages = this.parseMessageGroup(msg.payload, msg.payloadBits);
                if (groupMessages.length > 0) {
                    if (this.lithDebugRaw || this.verbose) {
                        this.logLithDebug(
                            `[Group] ${ctx.connection.key} subMessages=${groupMessages.length} bits=${msg.payloadBits}`,
                        );
                        for (const sub of groupMessages) {
                            const hex = this.formatHex(sub.payload, this.lithDebugHexBytes);
                            this.logLithDebug(
                                `[Group]   MSG_ID=0x${sub.msgId.toString(16)} bits=${sub.payloadBits} payload=${hex}`,
                            );
                        }
                    }
                    for (const sub of groupMessages) {
                        const resp = this.handleLithTechSubMessage(ctx, sub);
                        if (resp) return resp;
                    }
                } else if (this.lithDebugRaw || this.verbose) {
                    this.logLithDebug(
                        `[Group] ${ctx.connection.key} no sub-messages parsed (bits=${msg.payloadBits})`,
                    );
                }
                return null;
            default:
                if (this.shouldLogLithNoise()) {
                    this.logThrottled(
                        `lithtech-unknown-${msg.msgId}`,
                        `[PacketHandler] Unknown LithTech MSG_ID ${msg.msgId}`,
                    );
                }
                if (!ctx.connection.authenticated && this.isLoginRequestId(msg.msgId)) {
                    const full = Buffer.concat([Buffer.from([msg.msgId & 0xff]), msg.payload]);
                    const resp = this.loginHandler.tryParseLoginRequestRak(
                        full,
                        ctx.connection,
                        `lith-msg-0x${msg.msgId.toString(16)}`,
                        { tracePath: 'PacketHandler.handleLithTechSubMessage:direct' },
                    );
                    if (resp) return resp;
                }
                if (!ctx.connection.authenticated && msg.payload.length > 0) {
                    if (msg.payload.includes(0x6c)) {
                        const resp = this.tryParseLoginNested(
                            msg.payload,
                            ctx.connection,
                            `lith-payload-0x${msg.msgId.toString(16)}`,
                        );
                        if (resp) return resp;
                    }
                }
                return null;
        }
        return null;
    }

    // Unpack LithTech message group container.
    private parseMessageGroup(payload: Buffer, payloadBits: number): LithTechSubMessage[] {
        const messages: LithTechSubMessage[] = [];
        if (payloadBits <= 0) return messages;

        const reader = new BitStreamReader(payload);
        const maxBits = Math.min(payloadBits, payload.length * 8);

        try {
            while (reader.position + 8 <= maxBits) {
                const lengthBits = reader.readBits(8);
                if (lengthBits === 0) break;
                if (reader.position + 8 > maxBits) break;
                const msgId = reader.readBits(8);
                if (reader.position + lengthBits > maxBits) {
                    this.logLithDebug(
                        `[Group] invalid length: want=${lengthBits} remaining=${maxBits - reader.position}`,
                    );
                    break;
                }

                const payloadBytes = Math.ceil(lengthBits / 8);
                const subPayload = Buffer.alloc(payloadBytes);
                let bitsLeft = lengthBits;
                for (let i = 0; i < payloadBytes; i++) {
                    const take = Math.min(8, bitsLeft);
                    subPayload[i] = reader.readBits(take);
                    bitsLeft -= take;
                }

                messages.push({ msgId, payload: subPayload, payloadBits: lengthBits });
            }
        } catch (e) {
            this.logLithDebug(`[Group] parse error: ${e}`);
        }

        return messages;
    }

    // Build LithTech ID packet.
    private buildLithTechIdPacket(connection: Connection): Buffer {
        const writer = new BitStreamWriter(64);

        const seq = connection.lithTechOutSeq || 0;
        connection.lithTechOutSeq = (seq + 1) & SEQUENCE_MASK;
        writer.writeBits(seq, 13);
        writer.writeBits(0, 1); // no continuation

        // MSG_ID 12: ID packet - 8 + 16 + 8 = 32 bits payload
        writer.writeBits(32, 8);
        writer.writeBits(LithTechMessageId.MSG_YOURID, 8);
        writer.writeBits(connection.id, 16);
        writer.writeBits(0, 8); // flags

        writer.writeBits(0, 1); // no more messages
        writer.writeBits(0, 8); // terminator

        const lithTechData = writer.toBuffer();
        this.logVerbose(
            `[PacketHandler] Built LithTech ID packet: ${lithTechData.toString('hex')}`,
        );

        return this.wrapReliable(lithTechData, connection);
    }

    private buildProtocolVersionPayload(): { payload: Buffer; payloadBits: number } {
        const writer = new BitStreamWriter(64);
        writer.writeBits(7, 32); // Protocol version 7
        writer.writeBits(0, 32); // Additional version data
        return { payload: writer.toBuffer(), payloadBits: 64 };
    }

    private buildYourIdPayload(connection: Connection): { payload: Buffer; payloadBits: number } {
        const writer = new BitStreamWriter(32);
        writer.writeBits(connection.id & 0xffff, 16);
        writer.writeBits(0, 8); // bLocal flag (0 = remote)
        return { payload: writer.toBuffer(), payloadBits: 24 };
    }

    private buildClientObjectIdPayload(objectId: number): { payload: Buffer; payloadBits: number } {
        const writer = new BitStreamWriter(16);
        writer.writeBits(objectId & 0xffff, 16);
        return { payload: writer.toBuffer(), payloadBits: 16 };
    }

    private buildLoadWorldPayload(worldId: number, gameTime: number): { payload: Buffer; payloadBits: number } {
        const writer = new BitStreamWriter(64);
        const timeBuf = Buffer.alloc(4);
        timeBuf.writeFloatLE(gameTime, 0);
        writer.writeBytes(timeBuf);
        writer.writeBits(worldId & 0xffff, 16);
        return { payload: writer.toBuffer(), payloadBits: 48 };
    }

    private writeUpdateFlags(writer: BitStreamWriter, flags: number): void {
        const low = flags & 0xff;
        const high = (flags >>> 8) & 0xff;
        if (flags > 0x7f) {
            writer.writeBits(low | 0x80, 8);
            writer.writeBits(high, 8);
        } else {
            writer.writeBits(low, 8);
        }
    }

    private buildWorldSpawnUpdatePayload(connection: Connection): { payload: Buffer; payloadBits: number } | null {
        let flags = this.worldSpawnFlags & 0xffff;
        if ((flags & 0x1) === 0) {
            this.logVerbose('[PacketHandler] Spawn flags missing CF_NEWOBJECT; forcing new object');
            flags |= 0x1;
        }
        const effectiveFlags = (flags & 0x1) !== 0 ? (flags | 0x200) : flags;
        const needsUncompressed = (effectiveFlags & (0x202 | 0x404)) !== 0;
        if (needsUncompressed && (flags & 0x8) === 0) {
            this.logVerbose('[PacketHandler] Spawn needs uncompressed pos/rot; forcing CF_FLAGS');
            flags |= 0x8;
        }

        const writer = new BitStreamWriter(512);
        this.writeUpdateFlags(writer, flags);

        const objectIdRaw =
            connection.worldLoginPlayerId > 0 && connection.worldLoginPlayerId <= 0xfffe
                ? connection.worldLoginPlayerId
                : (connection.id & 0xffff);
        writer.writeBits(objectIdRaw & 0xffff, 16);

        let objType = (this.worldSpawnObjType & 0x3f) || 3;
        if (objType !== 3) {
            this.logVerbose(
                `[PacketHandler] Spawn objType ${objType} not supported by stub; falling back to type 3`,
            );
            objType = 3;
        }
        writer.writeBits(objType, 8);
        this.writeVec3(writer, this.worldSpawnPos);
        if (objType === 3) {
            writer.writeBits(this.worldSpawnObjTypeExtra & 0xffff, 16);
        }

        if (flags & 0x8) {
            const flag1 = 0x100;
            writer.writeBits(flag1 & 0xffff, 16);
            writer.writeBits(0, 16);
            writer.writeBits(0, 32);
        }

        if (flags & 0x40) {
            writer.writeBits(this.worldSpawnRender[0] & 0xff, 8);
            writer.writeBits(this.worldSpawnRender[1] & 0xff, 8);
            writer.writeBits(this.worldSpawnRender[2] & 0xff, 8);
            writer.writeBits(this.worldSpawnRender[3] & 0xff, 8);
            writer.writeBits(this.worldSpawnRender[4] & 0xff, 8);
        }

        if (effectiveFlags & 0x202) {
            this.writeVec3(writer, this.worldSpawnPos);
            this.writeVec3(writer, this.worldSpawnVel);
        }

        if (effectiveFlags & 0x404) {
            this.writeQuat(writer, this.worldSpawnRot);
        }

        const subBits = writer.position;
        const updateWriter = new BitStreamWriter(64 + Math.ceil(subBits / 8));
        updateWriter.writeBits(subBits, 32);
        this.writeLithBits(updateWriter, writer.toBuffer(), subBits);
        return { payload: updateWriter.toBuffer(), payloadBits: updateWriter.position };
    }

    private buildWorldSpawnUpdate(connection: Connection): Buffer | null {
        if (!this.worldSpawnEnabled) return null;
        const payload = this.buildWorldSpawnUpdatePayload(connection);
        if (!payload) return null;
        this.logPacketNote(
            `[WorldSpawn] objId=${
                connection.worldLoginPlayerId > 0 ? connection.worldLoginPlayerId : (connection.id & 0xffff)
            } flags=0x${(this.worldSpawnFlags & 0xffff).toString(16)} type=${this.worldSpawnObjType & 0x3f}`,
        );
        return this.buildLithTechGuaranteedPacket(connection, [
            {
                msgId: LithTechMessageId.MSG_UPDATE,
                payload: payload.payload,
                payloadBits: payload.payloadBits,
            },
        ]);
    }

    private buildUnguaranteedHeartbeatPayload(gameTime: number): {
        payload: Buffer;
        payloadBits: number;
    } {
        const writer = new BitStreamWriter(16);
        writer.writeBits(0xffff, 16);
        writer.writeBits(0, 4);
        this.writeFloat(writer, gameTime);
        return { payload: writer.toBuffer(), payloadBits: 16 + 4 + 32 };
    }

    private buildWorldUnguaranteedUpdate(connection: Connection, gameTime: number): Buffer {
        const writer = new BitStreamWriter(64);
        if (this.worldUnguaranteedSendPos) {
            const objectId =
                connection.worldLoginPlayerId > 0 && connection.worldLoginPlayerId <= 0xfffe
                    ? connection.worldLoginPlayerId
                    : (connection.id & 0xffff);
            writer.writeBits(objectId & 0xffff, 16);
            writer.writeBits(0x4, 4);
            this.writeCompressedWorldPosU16(writer, this.worldSpawnPos);
            if (this.worldUnguaranteedHasVelBit) {
                writer.writeBits(this.worldUnguaranteedSendVel ? 1 : 0, 1);
            }
            if (this.worldUnguaranteedSendVel) {
                this.writeCompressedVec3(writer, this.worldSpawnVel);
            }
        }
        const heartbeat = this.buildUnguaranteedHeartbeatPayload(gameTime);
        this.writeLithBits(writer, heartbeat.payload, heartbeat.payloadBits);
        const payload = { payload: writer.toBuffer(), payloadBits: writer.position };
        return this.buildLithTechGuaranteedPacket(connection, [
            {
                msgId: LithTechMessageId.MSG_UNGUARANTEEDUPDATE,
                payload: payload.payload,
                payloadBits: payload.payloadBits,
            },
        ]);
    }

    private initWorldFlow(connection: Connection, now: number): void {
        if (connection.worldFlowInit) return;
        connection.worldFlowInit = true;
        connection.worldFlowLastUpdateMs = now;
        connection.worldFlowRateBytesPerSec = this.worldFlowRateBytesPerSec;
        if (this.worldFlowBucketMax > 0) {
            connection.worldFlowBucketMax = this.worldFlowBucketMax;
        } else {
            const interval = this.worldUnguaranteedIntervalMs > 0 ? this.worldUnguaranteedIntervalMs : 1000;
            const computed = Math.floor((connection.worldFlowRateBytesPerSec * interval) / 1000);
            connection.worldFlowBucketMax = Math.max(1, computed);
        }
    }

    private updateWorldFlowControl(connection: Connection, bytes: number, now: number): void {
        this.initWorldFlow(connection, now);
        const elapsed = now >= connection.worldFlowLastUpdateMs ? now - connection.worldFlowLastUpdateMs : 0;
        if (elapsed >= this.worldFlowDecayMs) {
            const dec = Math.floor((connection.worldFlowRateBytesPerSec * elapsed) / 1000);
            if (dec > 0) {
                if (connection.worldFlowDebt < dec) {
                    connection.worldFlowDebt = 0;
                } else {
                    connection.worldFlowDebt -= dec;
                }
                if (connection.worldFlowUsage < dec) {
                    connection.worldFlowUsage = 0;
                } else {
                    connection.worldFlowUsage -= dec;
                }
            }
            connection.worldFlowLastUpdateMs = now;
        }
        if (bytes <= 0) return;
        const bucket = connection.worldFlowBucketMax;
        if (bucket <= 0) return;
        let overflow = bytes;
        if (connection.worldFlowUsage < bucket) {
            const avail = bucket - connection.worldFlowUsage;
            if (avail >= bytes) {
                connection.worldFlowUsage += bytes;
                overflow = 0;
            } else {
                connection.worldFlowUsage = bucket;
                overflow = bytes - avail;
            }
        }
        if (overflow > 0) {
            connection.worldFlowDebt += overflow;
        }
    }

    private isWorldFlowBlocked(connection: Connection, bytes: number, now: number): boolean {
        if (bytes <= 0) return false;
        this.initWorldFlow(connection, now);
        this.updateWorldFlowControl(connection, 0, now);
        const bucket = connection.worldFlowBucketMax;
        if (bucket <= 0) return false;
        const pending = connection.worldPendingBytes + connection.worldInflightBytes;
        const blocked = bytes + pending > 2 * bucket;
        if (blocked && this.worldFlowDebug) {
            connection.worldFlowBlockCount += 1;
            if (
                !connection.worldFlowLastBlockLogAt ||
                now - connection.worldFlowLastBlockLogAt >= this.worldFlowDebugLogMs
            ) {
                connection.worldFlowLastBlockLogAt = now;
                console.log(
                    `[WorldFlow] block conn=${connection.id} pending=${pending} bytes=${bytes} bucket=${bucket} count=${connection.worldFlowBlockCount}`,
                );
            }
        }
        return blocked;
    }

    private writeLithBits(writer: BitStreamWriter, payload: Buffer, payloadBits: number): void {
        const reader = new BitStreamReader(payload);
        let remaining = payloadBits;
        while (remaining > 0) {
            const take = Math.min(32, remaining);
            writer.writeBits(reader.readBits(take), take);
            remaining -= take;
        }
    }

    private writeFloat(writer: BitStreamWriter, value: number): void {
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(value, 0);
        writer.writeBytes(buf);
    }

    private writeCompressedWorldPosU16(writer: BitStreamWriter, pos: [number, number, number]): void {
        const [x, y, z] = this.compressWorldPosU16(pos);
        writer.writeBits(x & 0xffff, 16);
        writer.writeBits(y & 0xffff, 16);
        writer.writeBits(z & 0xffff, 16);
    }

    private compressWorldPosU16(pos: [number, number, number]): [number, number, number] {
        const dx = pos[0] - this.worldCompMin[0];
        const dy = pos[1] - this.worldCompMin[1];
        const dz = pos[2] - this.worldCompMin[2];
        const sx = dx * this.worldCompScale[0];
        const sy = dy * this.worldCompScale[1];
        const sz = dz * this.worldCompScale[2];
        const clamp = (value: number, max: number): number => {
            if (value < 0) return 0;
            if (value > max) return max;
            return value;
        };
        const qx = clamp(sx * 524287.0, 524287.0);
        const qy = clamp(sy * 262143.0, 262143.0);
        const qz = clamp(sz * 524287.0, 524287.0);
        const v5 = Math.trunc(qx + 0.5);
        const v6 = Math.trunc(qy + 0.5);
        const v7 = Math.trunc(qz + 0.5);
        return [(v5 >>> 3) & 0xffff, (v6 >>> 2) & 0xffff, (v7 >>> 3) & 0xffff];
    }

    private writeCompressedVec3(writer: BitStreamWriter, vec: [number, number, number]): void {
        const { major, q1, q2, flags } = this.compressDirVector(vec);
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(major, 0);
        writer.writeBytes(buf);
        writer.writeBits(q1 & 0xffff, 16);
        writer.writeBits(q2 & 0xffff, 16);
        writer.writeBits(flags & 0xff, 8);
    }

    private compressDirVector(vec: [number, number, number]): {
        major: number;
        q1: number;
        q2: number;
        flags: number;
    } {
        let major = vec[0];
        let minor1 = vec[1];
        let minor2 = vec[2];
        let flags = 0;
        let maxAbs = Math.abs(major);
        const abs1 = Math.abs(minor1);
        if (maxAbs < abs1) {
            major = vec[1];
            minor1 = vec[0];
            minor2 = vec[2];
            flags |= 0x40;
            maxAbs = abs1;
        }
        const abs2 = Math.abs(minor2);
        if (abs2 > maxAbs) {
            major = vec[2];
            minor1 = vec[0];
            minor2 = vec[1];
            flags |= 0x80;
            maxAbs = abs2;
        }
        if (maxAbs <= 0) {
            return { major: 0, q1: 0, q2: 0, flags };
        }
        const signMajor = major >= 0 ? 1 : -1;
        const q1 = Math.trunc((Math.abs(minor1) / maxAbs) * 262143.0);
        const q2 = Math.trunc((Math.abs(minor2) / maxAbs) * 262143.0);
        flags |= ((q1 >>> 16) & 0x3) << 3;
        if ((minor1 >= 0 ? 1 : -1) !== signMajor) {
            flags |= 0x20;
        }
        flags |= (q2 >>> 16) & 0x3;
        if ((minor2 >= 0 ? 1 : -1) !== signMajor) {
            flags |= 0x04;
        }
        return { major, q1, q2, flags };
    }

    private writeVec3(writer: BitStreamWriter, vec: [number, number, number]): void {
        this.writeFloat(writer, vec[0]);
        this.writeFloat(writer, vec[1]);
        this.writeFloat(writer, vec[2]);
    }

    private writeQuat(writer: BitStreamWriter, quat: [number, number, number, number]): void {
        this.writeFloat(writer, quat[0]);
        this.writeFloat(writer, quat[1]);
        this.writeFloat(writer, quat[2]);
        this.writeFloat(writer, quat[3]);
    }

    private writeLithSizeIndicator(writer: BitStreamWriter, bits: number): void {
        const value = Math.max(0, bits >>> 0);
        writer.writeBits(value & 0x7f, 7);
        if (value < 0x80) {
            writer.writeBits(0, 1);
            return;
        }
        writer.writeBits(1, 1);
        writer.writeBits((value >> 7) & 0x7, 3);
        if (value < 0x400) {
            writer.writeBits(0, 1);
            return;
        }
        writer.writeBits(1, 1);
        let highest = 10;
        for (let bit = 31; bit >= 10; bit -= 1) {
            if (value & (1 << bit)) {
                highest = bit;
                break;
            }
        }
        for (let bit = 10; bit <= highest; bit += 1) {
            writer.writeBits((value >> bit) & 1, 1);
            writer.writeBits(bit === highest ? 0 : 1, 1);
        }
    }

    private buildLithTechGuaranteedPacket(
        connection: Connection,
        subMessages: Array<{ msgId: number; payload: Buffer; payloadBits: number }>,
    ): Buffer {
        const writer = new BitStreamWriter(256);
        const seq = connection.lithTechOutSeq || 0;
        connection.lithTechOutSeq = (seq + 1) & SEQUENCE_MASK;
        writer.writeBits(seq, 13);
        writer.writeBits(0, 1); // no continuation

        for (let i = 0; i < subMessages.length; i += 1) {
            const msg = subMessages[i];
            const subBits = msg.payloadBits + 8;
            this.writeLithSizeIndicator(writer, subBits);
            writer.writeBits(msg.msgId & 0xff, 8);
            if (msg.payloadBits > 0) {
                this.writeLithBits(writer, msg.payload, msg.payloadBits);
            }
            const hasMore = i < subMessages.length - 1;
            writer.writeBits(hasMore ? 1 : 0, 1);
        }

        writer.writeBits(0, 8); // terminator padding
        return this.wrapReliable(writer.toBuffer(), connection);
    }

    private buildWorldLoginBurst(connection: Connection): Buffer | null {
        if (this.serverMode !== 'world') return null;
        const subMessages: Array<{ msgId: number; payload: Buffer; payloadBits: number }> = [];

        if (this.worldSendProtocol && !connection.lithTechProtocolSent) {
            connection.lithTechProtocolSent = true;
            const payload = this.buildProtocolVersionPayload();
            subMessages.push({
                msgId: LithTechMessageId.MSG_NETPROTOCOLVERSION,
                payload: payload.payload,
                payloadBits: payload.payloadBits,
            });
        }

        if (this.worldSendId && !connection.lithTechIdSent) {
            connection.lithTechIdSent = true;
            const payload = this.buildYourIdPayload(connection);
            subMessages.push({
                msgId: LithTechMessageId.MSG_YOURID,
                payload: payload.payload,
                payloadBits: payload.payloadBits,
            });
        }

        if (this.worldSendClientObjectId && !connection.lithTechClientObjectIdSent) {
            connection.lithTechClientObjectIdSent = true;
            const playerId = connection.worldLoginPlayerId;
            const objectId =
                playerId > 0 && playerId <= 0xfffe ? playerId : (connection.id & 0xffff);
            const payload = this.buildClientObjectIdPayload(objectId);
            subMessages.push({
                msgId: LithTechMessageId.MSG_CLIENTOBJECTID,
                payload: payload.payload,
                payloadBits: payload.payloadBits,
            });
        }

        if (this.worldSendLoadWorld && !connection.lithTechLoadWorldSent) {
            connection.lithTechLoadWorldSent = true;
            const worldId =
                connection.worldLoginWorldId !== 0 ? connection.worldLoginWorldId : this.worldDefaultId;
            const payload = this.buildLoadWorldPayload(worldId, 0.0);
            subMessages.push({
                msgId: LithTechMessageId.MSG_LOADWORLD,
                payload: payload.payload,
                payloadBits: payload.payloadBits,
            });
        }

        if (subMessages.length === 0) return null;
        return this.buildLithTechGuaranteedPacket(connection, subMessages);
    }

    // Build LithTech protocol version packet.
    private buildProtocolVersionPacket(connection: Connection): Buffer {
        const writer = new BitStreamWriter(64);

        const seq = connection.lithTechOutSeq || 0;
        connection.lithTechOutSeq = (seq + 1) & SEQUENCE_MASK;
        writer.writeBits(seq, 13);
        writer.writeBits(0, 1); // no continuation

        // MSG_ID 4: Protocol version - 8 + 32 + 32 = 72 bits payload
        writer.writeBits(72, 8);
        writer.writeBits(LithTechMessageId.MSG_NETPROTOCOLVERSION, 8);
        writer.writeBits(7, 32); // Protocol version 7
        writer.writeBits(0, 32); // Additional version data

        writer.writeBits(0, 1); // no more messages
        writer.writeBits(0, 8); // terminator

        const lithTechData = writer.toBuffer();
        this.logVerbose(
            `[PacketHandler] Built protocol version packet: ${lithTechData.toString('hex')}`,
        );

        return this.wrapReliable(lithTechData, connection);
    }

    // Handle reliable connection requests and send accepted.
    private handleReliableConnectionRequest(ctx: PacketContext, innerData: Buffer): Buffer | null {
        const { connection } = ctx;

        if (this.verbose) {
            console.log(`[PacketHandler] ID_CONNECTION_REQUEST inside reliable packet`);
            console.log(`  Inner hex: ${innerData.toString('hex').substring(0, 100)}...`);
        }

        const passwordOffset = innerData.indexOf(Buffer.from(WORLD_SERVER_PASSWORD));
        if (passwordOffset !== -1) {
            this.logVerbose(
                `  Password "${WORLD_SERVER_PASSWORD}" found at inner offset ${passwordOffset}`,
            );
        }

        connection.state = ConnectionState.CONNECTED;

        // Build ID_CONNECTION_REQUEST_ACCEPTED response (legacy FoM/RakNet wrapper expects 25 bytes)
        // ID + external addr/port + client index + placeholder(8) + timestamp(8)
        const response = Buffer.alloc(25);
        let offset = 0;

        response[offset++] = RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED;

        const replyIp =
            process.env.REPLY_IP || process.env.BIND_IP || process.env.SERVER_IP || '127.0.0.1';
        const replyPortRaw = Number.parseInt(
            process.env.REPLY_PORT || process.env.PORT || String(DEFAULT_PORT),
            10,
        );
        const replyPort =
            Number.isNaN(replyPortRaw) || replyPortRaw <= 0 ? DEFAULT_PORT : replyPortRaw;
        const ipBytes = this.parseIpv4(replyIp) || [127, 0, 0, 1];

        // Server external IP (BE)
        response.writeUInt32BE(
            ((ipBytes[0] << 24) | (ipBytes[1] << 16) | (ipBytes[2] << 8) | ipBytes[3]) >>> 0,
            offset,
        );
        offset += 4;

        // Server port (BE)
        response.writeUInt16BE(replyPort, offset);
        offset += 2;

        // Client index (LE)
        response.writeUInt16LE(connection.id, offset);
        offset += 2;

        // Client external address placeholder (8 bytes)
        response.writeBigUInt64LE(BigInt(0), offset);
        offset += 8;

        // Timestamp (8 bytes)
        response.writeBigUInt64LE(BigInt(Date.now()), offset);
        offset += 8;

        this.logVerbose(
            `[PacketHandler] Sending ID_CONNECTION_REQUEST_ACCEPTED: ${response.toString('hex')}`,
        );

        // Send wrapped using legacy reliable header (FoM client expects this format here).
        return this.wrapLegacyReliable(response, connection);
    }

    // Wrap an inner payload into reliable transport.
    private wrapReliable(innerData: Buffer, connection: Connection): Buffer {
        return wrapReliablePacket(innerData, connection, {
            logVerbose: this.logVerbose.bind(this),
        });
    }

    // Legacy FoM reliable wrapper (byte-aligned 0x40 header).
    private wrapLegacyReliable(innerData: Buffer, connection: Connection): Buffer {
        const packet = Buffer.alloc(17 + innerData.length);

        packet[0] = 0x40; // RELIABLE header

        // Bytes 1-4: channel/flags (BE)
        packet.writeUInt32BE(0x00000003, 1);

        // Bytes 5-8: echo client timestamp (LE)
        packet.writeUInt32LE(connection.lastTimestamp || 0, 5);

        // Bytes 9-12: ordering info (BE) - include our message number
        const ourMsgNum = connection.outgoingMessageNumber || 0;
        const orderingInfo = (ourMsgNum << 4) | 0x10;
        packet.writeUInt32BE(orderingInfo, 9);
        connection.outgoingMessageNumber = ourMsgNum + 1;

        // Bytes 13-16: length in bits * 2 (BE)
        packet.writeUInt32BE(innerData.length * 8 * 2, 13);

        // Copy inner data
        innerData.copy(packet, 17);

        return packet;
    }

    // Build ACK packet for pending ranges.
    buildAck(connection: Connection): Buffer {
        return buildAckPacket(connection);
    }

    // Handle RakNet connection request and accept.
    private handleRakNetConnectionRequest(ctx: PacketContext): Buffer | null {
        const writer = new BitStreamWriter(64);
        writer.writeByte(RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED);

        const serverIpPlaceholder = 0;
        const serverPortPlaceholder = 0;

        writer.writeUInt32(serverIpPlaceholder);
        writer.writeUInt16(serverPortPlaceholder);
        writer.writeUInt16(ctx.connection.id);

        console.log(`[PacketHandler] Accepted RakNet connection for ${ctx.connection.key}`);
        return writer.toBuffer();
    }

    // Handle game-layer packets (login/LithTech).
    private handleGamePacket(ctx: PacketContext, packetId: number): Buffer | null {
        const { data, connection } = ctx;

        this.logVerbose(
            `[PacketHandler] Game packet 0x${packetId.toString(16).padStart(2, '0')} (${data.length} bytes)`,
        );

        const loginResponse = this.getActiveHandler().handleGamePacket(ctx, packetId);
        if (loginResponse) {
            return loginResponse;
        }
        if (this.serverMode === 'world') {
            return null;
        }

        if (
            packetId >= LithTechMessageId.MSG_CYCLECHECK &&
            packetId <= LithTechMessageId.MSG_UNKNOWN_23
        ) {
            this.logVerbose(`[PacketHandler] LithTech message ID ${packetId}`);
            return this.handleLithTechMessage(ctx, packetId);
        }

        if (this.verbose) {
            this.logThrottled(
                `unknown-packet-${packetId}`,
                `[PacketHandler] Unknown packet ID 0x${packetId.toString(16)} - logging for analysis`,
            );
        }
        return null;
    }

    // Route possible login request in game-layer packet.
    private tryParseLoginRequest(ctx: PacketContext): Buffer | null {
        const { data, connection } = ctx;
        const packetId = data.length > 0 ? data[0] : -1;
        return this.loginHandler.tryParseLoginRequestRak(
            data,
            connection,
            `game-0x${packetId.toString(16)}`,
            {
            tracePath: 'PacketHandler.tryParseLoginRequest',
            },
        );
    }

    // Check if packet ID belongs to login flow.
    private isLoginRequestId(packetId: number): boolean {
        return this.loginHandler.isLoginRequestId(packetId);
    }

    // Queue initial world packets for authenticated connection.
    private queueWorldInitialPackets(connection: Connection): void {
        if (this.serverMode !== 'world') return;
        if (connection.pendingWorldPackets.length > 0) return;
        const packets: Buffer[] = [];

        if (this.worldSendFileList && !connection.fileListSent && this.fileListPayloads.length > 0) {
            connection.fileListSent = true;
            for (const payload of this.fileListPayloads) {
                packets.push(this.wrapReliable(payload, connection));
            }
        }

        if (this.worldSendProtocol && !connection.lithTechProtocolSent) {
            connection.lithTechProtocolSent = true;
            packets.push(this.buildProtocolVersionPacket(connection));
        }
        if (this.worldSendId && !connection.lithTechIdSent) {
            connection.lithTechIdSent = true;
            packets.push(this.buildLithTechIdPacket(connection));
        }
        if (this.worldSendClientObjectId && !connection.lithTechClientObjectIdSent) {
            connection.lithTechClientObjectIdSent = true;
            const playerId = connection.worldLoginPlayerId;
            const objectId =
                playerId > 0 && playerId <= 0xfffe ? playerId : (connection.id & 0xffff);
            const payload = this.buildClientObjectIdPayload(objectId);
            packets.push(
                this.buildLithTechGuaranteedPacket(connection, [
                    {
                        msgId: LithTechMessageId.MSG_CLIENTOBJECTID,
                        payload: payload.payload,
                        payloadBits: payload.payloadBits,
                    },
                ]),
            );
        }
        if (this.worldSendLoadWorld && !connection.lithTechLoadWorldSent) {
            connection.lithTechLoadWorldSent = true;
            const worldId =
                connection.worldLoginWorldId !== 0 ? connection.worldLoginWorldId : this.worldDefaultId;
            const payload = this.buildLoadWorldPayload(worldId, 0.0);
            packets.push(
                this.buildLithTechGuaranteedPacket(connection, [
                    {
                        msgId: LithTechMessageId.MSG_LOADWORLD,
                        payload: payload.payload,
                        payloadBits: payload.payloadBits,
                    },
                ]),
            );
        }

        if (packets.length > 0) {
            connection.pendingWorldPackets.push(...packets);
        }
    }

    private tryParseLoginNested(
        payload: Buffer,
        connection: Connection,
        source: string,
    ): Buffer | null {
        if (connection.authenticated || payload.length === 0) {
            return null;
        }
        const targets = [
            RakNetMessageId.ID_LOGIN_REQUEST_TEXT,
            RakNetMessageId.ID_LOGIN,
            RakNetMessageId.ID_TIMESTAMP,
        ];
        const maxHits = 6;
        let hits = 0;

        for (let i = 0; i < payload.length; i += 1) {
            const byte = payload[i];
            if (!targets.includes(byte)) continue;
            hits += 1;
            const slice = payload.subarray(i);
            const resp = this.loginHandler.tryParseLoginRequestRak(
                slice,
                connection,
                `${source}:off=${i}`,
                {
                tracePath: 'PacketHandler.tryParseLoginNested:byte-scan',
                },
            );
            if (resp) return resp;
            if (hits >= maxHits) break;
        }

        return null;
    }

    // Append a note line to the packet log.
    private logPacketNote(message: string): void {
        PacketLogger.globalNote(message);
    }

    private ensureBitOrder(
        actual: BitOrder | undefined,
        expected: BitOrder,
        context: string,
    ): void {
        if (!actual || actual === expected) return;
        const key = `bitorder-${context}-${expected}-${actual}`;
        assertBitOrder(actual, expected, context, this.bitOrderStrict, (msg) => {
            this.logThrottled(key, msg);
        });
    }

    // On auth (world mode), queue protocol/id packets after login completes.
    private queueWorldInitialPacketsOnAuth(connection: Connection, wasAuth: boolean): Buffer | null {
        if (wasAuth || !connection.authenticated) {
            return null;
        }
        if (this.serverMode !== 'world') {
            return null;
        }
        const burst = this.buildWorldLoginBurst(connection);
        // Ensure file list (0x32) gets queued even when we return a burst.
        this.queueWorldInitialPackets(connection);
        if (burst) {
            return burst;
        }
        return this.dequeueWorldPacket(connection);
    }

    // Attempt to read a printable ASCII string from buffer.
    private tryReadString(buffer: Buffer, offset: number, maxLen: number): string | null {
        if (offset >= buffer.length) return null;

        const endOffset = Math.min(offset + maxLen, buffer.length);
        const slice = buffer.subarray(offset, endOffset);

        const nullPos = slice.indexOf(0);
        const strBytes = nullPos >= 0 ? slice.subarray(0, nullPos) : slice;

        if (strBytes.length === 0) return null;

        for (let i = 0; i < strBytes.length; i++) {
            const c = strBytes[i];
            if (c < 0x20 || c > 0x7e) return null;
        }

        return strBytes.toString('ascii');
    }

    // Dispatch LithTech message with handler fallback.
    private handleLithTechMessage(ctx: PacketContext, msgId: number): Buffer | null {
        const handler = this.getActiveHandler();
        const handlerResp = handler.handleLithTechMessage(ctx, msgId);
        if (handlerResp) return handlerResp;
        return this.handleLithTechMessageCore(ctx, msgId);
    }

    // Fallback handling/logging for unknown LithTech messages.
    private handleLithTechMessageCore(ctx: PacketContext, msgId: number): Buffer | null {
        if (this.shouldLogLithNoise()) {
            this.logThrottled(
                `lithtech-msg-${msgId}`,
                `[PacketHandler] LithTech MSG_ID_${msgId} - handler not implemented`,
            );
        }
        return null;
    }

    // Handle ACK-only packets.
    private handleAckPacket(ctx: PacketContext): void {
        const { data, connection } = ctx;
        if (data.length < 17) {
            return;
        }

        const msgToAck = data.readUInt32BE(13);
        if (
            connection.lastLoginResponseMsgNum !== null &&
            msgToAck === connection.lastLoginResponseMsgNum
        ) {
            connection.loginResponseAckCount += 1;
        }
    }

    // Build LithTech ID packet for given client id.
    buildIdPacket(clientId: number, flags: number = 0): Buffer {
        const writer = new BitStreamWriter(64);

        writer.writeByte(LithTechMessageId.MSG_ID_PACKET);
        writer.writeUInt16(clientId);
        writer.writeByte(flags);

        return writer.toBuffer();
    }
}
