/**
 * ID_LOGIN_REQUEST (0x6C) - Client -> Server
 *
 * Initial login request containing username and client version.
 * See: Docs/Packets/ID_LOGIN_REQUEST.md
 */

import { NativeBitStream, decodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdLoginRequestData {
    username: string;
    clientVersion: number;
}

export class IdLoginRequestPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_LOGIN_REQUEST;

    username: string;
    clientVersion: number;

    constructor(data: IdLoginRequestData) {
        super();
        this.username = data.username;
        this.clientVersion = data.clientVersion;
    }

    /**
     * This packet is client->server only; encoding not supported.
     */
    encode(): Buffer {
        throw new Error('IdLoginRequestPacket is client->server only');
    }

    toString(): string {
        return `IdLoginRequestPacket { username: "${this.username}", clientVersion: ${this.clientVersion} }`;
    }

    /**
     * Decode 0x6C packet from buffer.
     *
     * Wire format:
     *   - u8 msgId (0x6C)
     *   - Huffman-encoded username (u32 bitCount prefix + bits)
     *   - u16c clientVersion
     *
     * Note: May be wrapped in ID_TIMESTAMP (0x19) prefix.
     */
    static decode(buffer: Buffer): IdLoginRequestPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            let packetId = bs.readU8();

            // Handle optional ID_TIMESTAMP wrapper
            if (packetId === RakNetMessageId.ID_TIMESTAMP) {
                bs.readBytes(8); // Skip 8-byte timestamp
                packetId = bs.readU8();
            }

            if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST) {
                throw new Error(`Expected packet ID 0x6C, got 0x${packetId.toString(16)}`);
            }

            // Decode Huffman-encoded username
            const username = decodeString(bs, 2048);

            // Read compressed u16 client version
            const clientVersion = bs.readCompressedU16();

            return new IdLoginRequestPacket({ username, clientVersion });
        } finally {
            bs.destroy();
        }
    }
}
