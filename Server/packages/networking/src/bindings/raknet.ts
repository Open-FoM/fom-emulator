/**
 * RakNet FFI Bindings for Bun
 *
 * This module provides TypeScript bindings to the native RakNet 3.611 library
 * via Bun's FFI (Foreign Function Interface).
 *
 * Usage:
 *   import { RakPeer, RakReliability, RakPriority } from '@openfom/networking';
 *   const peer = new RakPeer();
 *   peer.startup(100, 61000, 0);
 *   peer.setMaxIncomingConnections(100);
 */

import { dlopen, FFIType, ptr, suffix, CString } from 'bun:ffi';
import { join } from 'path';
import { existsSync } from 'fs';
import { addressToString as formatAddress } from '../net/address';

// =============================================================================
// Types
// =============================================================================

export enum RakPriority {
    IMMEDIATE = 0,
    HIGH = 1,
    MEDIUM = 2,
    LOW = 3,
}

export enum RakReliability {
    UNRELIABLE = 0,
    UNRELIABLE_SEQUENCED = 1,
    RELIABLE = 2,
    RELIABLE_ORDERED = 3,
    RELIABLE_SEQUENCED = 4,
}

export interface RakSystemAddress {
    binaryAddress: number;
    port: number;
}

export interface RakPacket {
    length: number;
    data: Uint8Array;
    systemAddress: RakSystemAddress;
    packetNumber: number;
}

export interface RakStatistics {
    messagesSent: number;
    messagesReceived: number;
    messagesResent: number;
    messagesWaiting: number;
    bytesSent: number;
    bytesReceived: number;
    bytesResent: number;
    duplicateMessagesReceived: number;
    lastPing: number;
    averagePing: number;
    lowestPing: number;
}

// =============================================================================
// FFI Library Loading
// =============================================================================

// Determine library path based on platform
function getLibraryPath(): string {
    const libName = `raknet_ffi.${suffix}`;
    // Look for the library in several locations
    const searchPaths = [
        // Primary: relative to this source file in @openfom/networking package
        join(import.meta.dir, '..', '..', 'native', libName),
        // Fallback: workspace root resolution (when running from Server/)
        join(process.cwd(), 'packages', 'networking', 'native', libName),
    ];

    for (const p of searchPaths) {
        if (existsSync(p)) {
            return p;
        }
    }

    // Default to native directory
    return join(import.meta.dir, '..', '..', 'native', libName);
}

// Load the native library
const libPath = getLibraryPath();
// Gate library load logging to avoid noisy console output in quiet mode.
const shouldLogLoad = (() => {
    const raw = process.env.FOM_RAKNET_LOG || '';
    return raw === '1' || raw.toLowerCase() === 'true';
})();
if (shouldLogLoad) {
    console.log(`[RakNet FFI] Loading native library from: ${libPath}`);
}

const lib = dlopen(libPath, {
    // Lifecycle
    rak_create: {
        returns: FFIType.ptr,
        args: [],
    },
    rak_destroy: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    rak_startup: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.u16, FFIType.u16, FFIType.i32],
    },
    rak_shutdown: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32],
    },
    rak_is_active: {
        returns: FFIType.bool,
        args: [FFIType.ptr],
    },

    // Server config
    rak_set_max_incoming_connections: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u16],
    },
    rak_set_incoming_password: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr, FFIType.i32],
    },

    // Security
    rak_init_security: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
    },
    rak_disable_security: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },

    // Connection management
    rak_connect: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u16, FFIType.ptr, FFIType.i32],
    },
    rak_close_connection: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32, FFIType.u16, FFIType.bool],
    },
    rak_is_connected: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.u32, FFIType.u16],
    },
    rak_get_connection_count: {
        returns: FFIType.u16,
        args: [FFIType.ptr],
    },

    // Send/Receive
    rak_send: {
        returns: FFIType.bool,
        args: [
            FFIType.ptr, // peer
            FFIType.ptr, // data
            FFIType.i32, // length
            FFIType.i32, // priority
            FFIType.i32, // reliability
            FFIType.u8, // ordering_channel
            FFIType.u32, // address.binary_address
            FFIType.u16, // address.port
            FFIType.bool, // broadcast
        ],
    },
    rak_receive: {
        returns: FFIType.ptr,
        args: [FFIType.ptr],
    },
    rak_deallocate_packet: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_packet_get_length: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    rak_packet_get_data: {
        returns: FFIType.ptr,
        args: [FFIType.ptr],
    },
    rak_packet_get_address: {
        returns: FFIType.u64,
        args: [FFIType.ptr],
    },
    rak_packet_copy_data: {
        returns: FFIType.u32,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },

    // Statistics
    rak_get_last_ping: {
        returns: FFIType.i32,
        args: [FFIType.ptr, FFIType.u32, FFIType.u16],
    },

    // Utility
    rak_address_from_string: {
        returns: FFIType.u64, // Returns struct as 64-bit value (32-bit addr + 16-bit port)
        args: [FFIType.ptr, FFIType.u16],
    },
    rak_get_version: {
        returns: FFIType.ptr,
        args: [],
    },

    // =============================================================================
    // BitStream Functions
    // =============================================================================
    rak_bs_create: {
        returns: FFIType.ptr,
        args: [],
    },
    rak_bs_create_from_data: {
        returns: FFIType.ptr,
        args: [FFIType.ptr, FFIType.u32, FFIType.bool],
    },
    rak_bs_destroy: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    rak_bs_reset: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    rak_bs_get_number_of_bytes_used: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    rak_bs_get_number_of_bits_used: {
        returns: FFIType.u32,
        args: [FFIType.ptr],
    },
    rak_bs_get_data: {
        returns: FFIType.ptr,
        args: [FFIType.ptr],
    },
    rak_bs_copy_data: {
        returns: FFIType.u32,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },
    // Write functions
    rak_bs_write_bit: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.bool],
    },
    rak_bs_write_u8: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u8],
    },
    rak_bs_write_u16: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u16],
    },
    rak_bs_write_u32: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32],
    },
    rak_bs_write_compressed_u8: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u8],
    },
    rak_bs_write_compressed_u16: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u16],
    },
    rak_bs_write_compressed_u32: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32],
    },
    rak_bs_write_bits: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.bool],
    },
    rak_bs_write_bytes: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },
    rak_bs_align_write_to_byte_boundary: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },
    // Read functions
    rak_bs_read_bit: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_u8: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_u16: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_u32: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_compressed_u8: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_compressed_u16: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_compressed_u32: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr],
    },
    rak_bs_read_bits: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.bool],
    },
    rak_bs_read_bytes: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    },
    rak_bs_align_read_to_byte_boundary: {
        returns: FFIType.void,
        args: [FFIType.ptr],
    },

    // =============================================================================
    // StringCompressor Functions
    // =============================================================================
    rak_string_compressor_init: {
        returns: FFIType.void,
        args: [],
    },
    rak_string_compressor_encode: {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u8],
    },
    rak_string_compressor_decode: {
        returns: FFIType.bool,
        args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u8],
    },
    rak_string_compressor_decode_debug: {
        returns: FFIType.i32,
        args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u8, FFIType.ptr, FFIType.ptr],
    },
});

// =============================================================================
// RakPeer Class
// =============================================================================

/**
 * High-level wrapper around the native RakNet peer.
 */
export class RakPeer {
    private handle: ReturnType<typeof lib.symbols.rak_create>;
    private destroyed = false;

    constructor() {
        this.handle = lib.symbols.rak_create();
        if (!this.handle) {
            throw new Error('Failed to create RakPeer instance');
        }
    }

    /**
     * Start the RakNet networking threads.
     * @param maxConnections Maximum connections (1 for client, N for server)
     * @param localPort Port to listen on
     * @param threadSleepMs Sleep time per update cycle (0 recommended)
     */
    startup(maxConnections: number, localPort: number, threadSleepMs: number = 0): boolean {
        this.ensureAlive();
        return lib.symbols.rak_startup(this.handle, maxConnections, localPort, threadSleepMs);
    }

    /**
     * Stop RakNet and close all connections.
     * @param blockDurationMs How long to wait for pending messages
     */
    shutdown(blockDurationMs: number = 0): void {
        this.ensureAlive();
        lib.symbols.rak_shutdown(this.handle, blockDurationMs);
    }

    /**
     * Check if the peer is active.
     */
    isActive(): boolean {
        this.ensureAlive();
        return lib.symbols.rak_is_active(this.handle);
    }

    /**
     * Set maximum incoming connections (server mode).
     */
    setMaxIncomingConnections(max: number): void {
        this.ensureAlive();
        lib.symbols.rak_set_max_incoming_connections(this.handle, max);
    }

    /**
     * Set the password for incoming connections.
     */
    setIncomingPassword(password: string | Buffer): void {
        this.ensureAlive();
        const buf = typeof password === 'string' ? Buffer.from(password) : password;
        lib.symbols.rak_set_incoming_password(this.handle, ptr(buf), buf.length);
    }

    /**
     * Initialize RSA security.
     * @param pubKeyE Public exponent (hex string)
     * @param pubKeyN Public modulus (hex string)
     * @param privKeyP Private key P (hex string, or null to generate)
     * @param privKeyQ Private key Q (hex string, or null to generate)
     */
    initSecurity(
        pubKeyE: string,
        pubKeyN: string,
        privKeyP: string | null = null,
        privKeyQ: string | null = null,
    ): void {
        this.ensureAlive();
        const ePtr = ptr(Buffer.from(pubKeyE + '\0'));
        const nPtr = ptr(Buffer.from(pubKeyN + '\0'));
        const pPtr = privKeyP ? ptr(Buffer.from(privKeyP + '\0')) : null;
        const qPtr = privKeyQ ? ptr(Buffer.from(privKeyQ + '\0')) : null;
        lib.symbols.rak_init_security(this.handle, ePtr, nPtr, pPtr, qPtr);
    }

    /**
     * Disable security.
     */
    disableSecurity(): void {
        this.ensureAlive();
        lib.symbols.rak_disable_security(this.handle);
    }

    /**
     * Connect to a remote host.
     */
    connect(host: string, port: number, password: string | Buffer | null = null): boolean {
        this.ensureAlive();
        const hostPtr = ptr(Buffer.from(host + '\0'));
        let passPtr = null;
        let passLen = 0;
        if (password) {
            const passBuf = typeof password === 'string' ? Buffer.from(password) : password;
            passPtr = ptr(passBuf);
            passLen = passBuf.length;
        }
        return lib.symbols.rak_connect(this.handle, hostPtr, port, passPtr, passLen);
    }

    /**
     * Close a connection.
     */
    closeConnection(address: RakSystemAddress, sendNotification: boolean = true): void {
        this.ensureAlive();
        lib.symbols.rak_close_connection(
            this.handle,
            address.binaryAddress,
            address.port,
            sendNotification,
        );
    }

    /**
     * Check if connected to a specific address.
     */
    isConnected(address: RakSystemAddress): boolean {
        this.ensureAlive();
        return lib.symbols.rak_is_connected(this.handle, address.binaryAddress, address.port);
    }

    /**
     * Get the number of active connections.
     */
    getConnectionCount(): number {
        this.ensureAlive();
        return lib.symbols.rak_get_connection_count(this.handle);
    }

    /**
     * Send data to a remote system.
     */
    send(
        data: Buffer | Uint8Array,
        priority: RakPriority,
        reliability: RakReliability,
        orderingChannel: number,
        address: RakSystemAddress,
        broadcast: boolean = false,
    ): boolean {
        this.ensureAlive();
        const buf = data instanceof Buffer ? data : Buffer.from(data);
        return lib.symbols.rak_send(
            this.handle,
            ptr(buf),
            buf.length,
            priority,
            reliability,
            orderingChannel,
            address.binaryAddress,
            address.port,
            broadcast,
        );
    }

    /**
     * Receive a packet from the queue.
     * @returns Packet data or null if no packets waiting
     */
    receive(): RakPacket | null {
        this.ensureAlive();
        const packetPtr = lib.symbols.rak_receive(this.handle);
        if (!packetPtr) return null;

        // Use helper functions to avoid struct layout issues
        const length = lib.symbols.rak_packet_get_length(packetPtr);
        const addressPacked = lib.symbols.rak_packet_get_address(packetPtr);
        
        // Unpack address: high 32 bits = binary_address (shifted left 16), low 16 bits = port
        const binaryAddress = Number((addressPacked >> 16n) & 0xFFFFFFFFn);
        const port = Number(addressPacked & 0xFFFFn);

        // Allocate buffer and copy data using C helper
        const data = new Uint8Array(length);
        if (length > 0) {
            lib.symbols.rak_packet_copy_data(packetPtr, ptr(data), length);
        }

        // Deallocate the native packet
        lib.symbols.rak_deallocate_packet(this.handle, packetPtr);

        return {
            length,
            data,
            systemAddress: { binaryAddress, port },
            packetNumber: 0,
        };
    }

    /**
     * Get the last ping time for a connection.
     */
    getLastPing(address: RakSystemAddress): number {
        this.ensureAlive();
        return lib.symbols.rak_get_last_ping(this.handle, address.binaryAddress, address.port);
    }

    /**
     * Destroy this peer and free all resources.
     */
    destroy(): void {
        if (!this.destroyed && this.handle) {
            lib.symbols.rak_destroy(this.handle);
            this.destroyed = true;
        }
    }

    private ensureAlive(): void {
        if (this.destroyed) {
            throw new Error('RakPeer has been destroyed');
        }
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a system address from an IP string and port.
 */
export function addressFromString(ip: string, port: number): RakSystemAddress {
    const ipPtr = ptr(Buffer.from(ip + '\0'));
    const result = lib.symbols.rak_address_from_string(ipPtr, port);
    // Result is packed as (binaryAddress << 16) | port
    return {
        binaryAddress: Number((result >> BigInt(16)) & BigInt(0xffffffff)),
        port: Number(result & BigInt(0xffff)),
    };
}

/**
 * Convert a system address to a readable string.
 */
export function addressToString(address: RakSystemAddress): string {
    return formatAddress(address);
}

/**
 * Get the RakNet version string.
 */
export function getVersion(): string {
    const versionPtr = lib.symbols.rak_get_version();
    return new CString(versionPtr!).toString();
}

/**
 * Create an unassigned address (for broadcasts).
 */
export function unassignedAddress(): RakSystemAddress {
    return { binaryAddress: 0xffffffff, port: 0xffff };
}

// =============================================================================
// BitStream Class
// =============================================================================

/**
 * High-level wrapper around the native RakNet BitStream.
 * Use this for bit-exact encoding compatible with FoM client.
 */
export class NativeBitStream {
    private handle: ReturnType<typeof lib.symbols.rak_bs_create>;
    private destroyed = false;

    constructor(data?: Buffer | Uint8Array, copyData: boolean = true) {
        if (data) {
            const buf = data instanceof Buffer ? data : Buffer.from(data);
            this.handle = lib.symbols.rak_bs_create_from_data(ptr(buf), buf.length, copyData);
        } else {
            this.handle = lib.symbols.rak_bs_create();
        }
        if (!this.handle) {
            throw new Error('Failed to create BitStream instance');
        }
    }

    /**
     * Reset the BitStream for reuse.
     */
    reset(): void {
        this.ensureAlive();
        lib.symbols.rak_bs_reset(this.handle);
    }

    /**
     * Get the number of bytes used.
     */
    getNumberOfBytesUsed(): number {
        this.ensureAlive();
        return lib.symbols.rak_bs_get_number_of_bytes_used(this.handle);
    }

    /**
     * Get the number of bits used.
     */
    getNumberOfBitsUsed(): number {
        this.ensureAlive();
        return lib.symbols.rak_bs_get_number_of_bits_used(this.handle);
    }

    /**
     * Get the data as a Buffer.
     */
    getData(): Buffer {
        this.ensureAlive();
        const length = this.getNumberOfBytesUsed();
        const buffer = Buffer.alloc(length);
        lib.symbols.rak_bs_copy_data(this.handle, ptr(buffer), length);
        return buffer;
    }

    // --- Write functions ---

    writeBit(value: boolean | 1 | 0): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_bit(this.handle, Boolean(value));
    }

    writeU8(value: number): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_u8(this.handle, value & 0xff);
    }

    writeU16(value: number): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_u16(this.handle, value & 0xffff);
    }

    writeU32(value: number): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_u32(this.handle, value >>> 0);
    }

    writeCompressedU8(value: number): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_compressed_u8(this.handle, value & 0xff);
    }

    writeCompressedU16(value: number): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_compressed_u16(this.handle, value & 0xffff);
    }

    writeCompressedU32(value: number): void {
        this.ensureAlive();
        lib.symbols.rak_bs_write_compressed_u32(this.handle, value >>> 0);
    }

    writeBits(data: Buffer | Uint8Array, numberOfBits: number, rightAlignedBits: boolean = true): void {
        this.ensureAlive();
        const buf = data instanceof Buffer ? data : Buffer.from(data);
        lib.symbols.rak_bs_write_bits(this.handle, ptr(buf), numberOfBits, rightAlignedBits);
    }

    writeBytes(data: Buffer | Uint8Array): void {
        this.ensureAlive();
        const buf = data instanceof Buffer ? data : Buffer.from(data);
        lib.symbols.rak_bs_write_bytes(this.handle, ptr(buf), buf.length);
    }

    alignWriteToByteBoundary(): void {
        this.ensureAlive();
        lib.symbols.rak_bs_align_write_to_byte_boundary(this.handle);
    }

    // --- Read functions ---

    readBit(): boolean {
        this.ensureAlive();
        const buf = Buffer.alloc(1);
        const success = lib.symbols.rak_bs_read_bit(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read bit');
        return buf[0] !== 0;
    }

    readU8(): number {
        this.ensureAlive();
        const buf = Buffer.alloc(1);
        const success = lib.symbols.rak_bs_read_u8(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read u8');
        return buf[0];
    }

    readU16(): number {
        this.ensureAlive();
        const buf = Buffer.alloc(2);
        const success = lib.symbols.rak_bs_read_u16(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read u16');
        return buf.readUInt16LE(0);
    }

    readU32(): number {
        this.ensureAlive();
        const buf = Buffer.alloc(4);
        const success = lib.symbols.rak_bs_read_u32(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read u32');
        return buf.readUInt32LE(0);
    }

    readCompressedU8(): number {
        this.ensureAlive();
        const buf = Buffer.alloc(1);
        const success = lib.symbols.rak_bs_read_compressed_u8(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read compressed u8');
        return buf[0];
    }

    readCompressedU16(): number {
        this.ensureAlive();
        const buf = Buffer.alloc(2);
        const success = lib.symbols.rak_bs_read_compressed_u16(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read compressed u16');
        return buf.readUInt16LE(0);
    }

    readCompressedU32(): number {
        this.ensureAlive();
        const buf = Buffer.alloc(4);
        const success = lib.symbols.rak_bs_read_compressed_u32(this.handle, ptr(buf));
        if (!success) throw new Error('Failed to read compressed u32');
        return buf.readUInt32LE(0);
    }

    readBits(numberOfBits: number, rightAlignedBits: boolean = true): Buffer {
        this.ensureAlive();
        const byteCount = Math.ceil(numberOfBits / 8);
        const buf = Buffer.alloc(byteCount);
        const success = lib.symbols.rak_bs_read_bits(this.handle, ptr(buf), numberOfBits, rightAlignedBits);
        if (!success) throw new Error('Failed to read bits');
        return buf;
    }

    readBytes(length: number): Buffer {
        this.ensureAlive();
        const buf = Buffer.alloc(length);
        const success = lib.symbols.rak_bs_read_bytes(this.handle, ptr(buf), length);
        if (!success) throw new Error('Failed to read bytes');
        return buf;
    }

    /**
     * Read a length-prefixed string.
     * @param maxLen Maximum length (determines bit count for length prefix)
     */
    readString(maxLen: number, encoding: BufferEncoding = 'latin1'): string {
        this.ensureAlive();
        if (maxLen <= 1) return '';
        const bits = Math.floor(Math.log2(maxLen)) + 1;
        const lenBuf = this.readBits(bits, true);
        const len = lenBuf[0] & ((1 << bits) - 1);
        if (len === 0) return '';
        return this.readBytes(len).toString(encoding);
    }

    /**
     * Write a length-prefixed string.
     * @param value String to write
     * @param maxLen Maximum length (determines bit count for length prefix)
     */
    writeString(value: string, maxLen: number): void {
        this.ensureAlive();
        if (maxLen <= 1) return;
        const raw = Buffer.from(value ?? '', 'latin1');
        const len = Math.min(raw.length, maxLen - 1);
        const bits = Math.floor(Math.log2(maxLen)) + 1;
        this.writeBits(Buffer.from([len]), bits, true);
        if (len > 0) this.writeBytes(raw.subarray(0, len));
    }

    alignReadToByteBoundary(): void {
        this.ensureAlive();
        lib.symbols.rak_bs_align_read_to_byte_boundary(this.handle);
    }

    writeCompressedString(value: string | CompressedString, maxChars: number = 2048): void {
        this.ensureAlive();
        if (typeof value === 'string') {
            initStringCompressor();
            const inputBuf = Buffer.from(value + '\0');
            lib.symbols.rak_string_compressor_encode(ptr(inputBuf), maxChars, this.handle, 0);
        } else {
            value.encode(this);
        }
    }

    readCompressedString(maxChars: number = 2048): CompressedString {
        this.ensureAlive();
        initStringCompressor();
        const outputBuf = Buffer.alloc(maxChars + 1);
        const success = lib.symbols.rak_string_compressor_decode(ptr(outputBuf), maxChars, this.handle, 0);
        if (!success) throw new Error('Failed to decode compressed string');
        let end = outputBuf.indexOf(0);
        if (end === -1) end = maxChars;
        return new CompressedString(outputBuf.subarray(0, end).toString('latin1'), maxChars);
    }

    writeStruct<T extends { encode(bs: NativeBitStream): void }>(struct: T): void {
        struct.encode(this);
    }

    readStruct<T>(StructClass: { decode(bs: NativeBitStream): T }): T {
        return StructClass.decode(this);
    }

    getHandle(): ReturnType<typeof lib.symbols.rak_bs_create> {
        this.ensureAlive();
        return this.handle;
    }

    destroy(): void {
        if (!this.destroyed && this.handle) {
            lib.symbols.rak_bs_destroy(this.handle);
            this.destroyed = true;
        }
    }

    private ensureAlive(): void {
        if (this.destroyed) {
            throw new Error('BitStream has been destroyed');
        }
    }
}

// =============================================================================
// StringCompressor Functions
// =============================================================================

let stringCompressorInitialized = false;

/**
 * Initialize the StringCompressor singleton.
 * Called automatically on first use.
 */
export function initStringCompressor(): void {
    if (!stringCompressorInitialized) {
        lib.symbols.rak_string_compressor_init();
        stringCompressorInitialized = true;
    }
}

/**
 * Encode a string using Huffman compression into a BitStream.
 * @param input String to encode
 * @param bs BitStream to write to
 * @param maxChars Maximum characters to encode (default 2048)
 * @param languageId Language ID (default 0)
 */
export function encodeString(input: string, bs: NativeBitStream, maxChars: number = 2048, languageId: number = 0): void {
    initStringCompressor();
    const inputBuf = Buffer.from(input + '\0');
    lib.symbols.rak_string_compressor_encode(ptr(inputBuf), maxChars, bs.getHandle(), languageId);
}

/**
 * Decode a Huffman-compressed string from a BitStream.
 * @param bs BitStream to read from
 * @param maxChars Maximum characters to decode (default 2048)
 * @param languageId Language ID (default 0)
 * @returns Decoded string
 */
export function decodeString(bs: NativeBitStream, maxChars: number = 2048, languageId: number = 0): string {
    initStringCompressor();
    const outputBuf = Buffer.alloc(maxChars + 1);
    const success = lib.symbols.rak_string_compressor_decode(ptr(outputBuf), maxChars, bs.getHandle(), languageId);
    if (!success) throw new Error('Failed to decode string');
    // Find null terminator
    let end = outputBuf.indexOf(0);
    if (end === -1) end = maxChars;
    return outputBuf.subarray(0, end).toString('utf8');
}

export interface DecodeStringDebugResult {
    errorCode: number;
    errorMessage: string;
    stringBitLength: number;
    unreadBits: number;
}

const DECODE_ERROR_MESSAGES: Record<number, string> = {
    0: 'Would succeed (passed all checks)',
    1: 'Null output buffer',
    2: 'Null bitstream',
    3: 'max_chars is 0',
    4: 'StringCompressor instance is null',
    5: 'Failed to read stringBitLength (ReadCompressed failed)',
    6: 'Not enough bits remaining in stream',
};

export function decodeStringDebug(bs: NativeBitStream, maxChars: number = 2048, languageId: number = 0): string {
    initStringCompressor();
    const outputBuf = Buffer.alloc(maxChars + 1);
    const bitLengthBuf = Buffer.alloc(4);
    const unreadBitsBuf = Buffer.alloc(4);
    
    const errorCode = lib.symbols.rak_string_compressor_decode_debug(
        ptr(outputBuf), 
        maxChars, 
        bs.getHandle(), 
        languageId,
        ptr(bitLengthBuf),
        ptr(unreadBitsBuf)
    );
    
    console.log({
        errorCode,
        errorMessage: DECODE_ERROR_MESSAGES[errorCode] ?? `Unknown error code: ${errorCode}`,
        stringBitLength: bitLengthBuf.readUInt32LE(0),
        unreadBits: unreadBitsBuf.readUInt32LE(0),
    });

    let end = outputBuf.indexOf(0);
    if (end === -1) end = maxChars;
    return outputBuf.subarray(0, end).toString('utf8');
}

/**
 * CompressedString - Huffman-compressed string via RakNet StringCompressor.
 * Source: StringCompressor::EncodeString/DecodeString (vtable +52/+56)
 */
export class CompressedString {
    constructor(
        public value: string = '',
        public maxChars: number = 2048
    ) {}

    encode(bs: NativeBitStream): void {
        encodeString(this.value, bs, this.maxChars);
    }

    static decode(bs: NativeBitStream, maxChars: number = 2048): CompressedString {
        const value = decodeString(bs, maxChars);
        return new CompressedString(value, maxChars);
    }

    static empty(maxChars: number = 2048): CompressedString {
        return new CompressedString('', maxChars);
    }

    static from(value: string | ArrayBufferLike, maxChars: number = 2048): CompressedString {
        if (typeof value === 'string') {
            return new CompressedString(value, maxChars);
        } else {
            return new CompressedString(Buffer.from(value).toString('latin1'), maxChars);
        }
    }

    toString(): string {
        return `CompressedString(value: ${this.value}, maxChars: ${this.maxChars})`;
    }
}

