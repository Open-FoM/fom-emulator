/**
 * @openfom/networking
 *
 * Shared networking package for FoM server emulator.
 * Provides RakNet FFI bindings, protocol utilities, and compression codecs.
 */

// RakNet FFI bindings (exclude addressToString - use from address.ts)
export {
    RakPeer,
    NativeBitStream,
    RakPriority,
    RakReliability,
    type RakSystemAddress,
    type RakPacket,
    type RakStatistics,
    getVersion as getRakNetVersion,
    unassignedAddress,
    initStringCompressor,
    encodeString,
    decodeString,
    decodeStringDebug,
    addressFromString,
    CompressedString,
} from './bindings/raknet';

// LithNet FFI bindings (LithTech-compatible packet read/write)
export {
    LithPacketWrite,
    LithPacketRead,
    getVersion as getLithNetVersion,
} from './bindings/lithnet';

// Address utilities
export * from './net/address';

// Protocol utilities
export * from './protocol/Constants';
export * from './protocol/LithCompressed';
export * from './protocol/PacketDocs';
export * from './protocol/PacketNames';
export * from './protocol/Struct';

// Logging
export * from './logging/PacketLogger';
