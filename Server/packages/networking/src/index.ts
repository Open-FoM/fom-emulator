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
    getVersion,
    unassignedAddress,
    initStringCompressor,
    encodeString,
    decodeString,
    decodeStringDebug,
    addressFromString,
} from './bindings/raknet';

// Address utilities
export * from './net/address';

// Protocol utilities
export * from './protocol/BitStream';
export * from './protocol/Constants';
export * from './protocol/LithCompressed';
export * from './protocol/PacketDocs';
export * from './protocol/PacketNames';

// Logging
export * from './logging/PacketLogger';
