/**
 * ID_LOGIN (0x6E) - Client -> Server
 *
 * Authentication payload with credentials and client fingerprints.
 * See: Docs/Packets/ID_LOGIN.md
 */

import { NativeBitStream, decodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdLoginData {
    username: string;
    passwordHash: string;
    fileCRCs: number[];
    macAddress: string;
    driveModels: string[];
    driveSerials: string[];
    loginToken: string;
    computerName: string;
    hasSteamTicket: boolean;
    steamTicketLength: number;
}

export class IdLoginPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_LOGIN;

    username: string;
    passwordHash: string;
    fileCRCs: number[];
    macAddress: string;
    driveModels: string[];
    driveSerials: string[];
    loginToken: string;
    computerName: string;
    hasSteamTicket: boolean;
    steamTicketLength: number;

    constructor(data: IdLoginData) {
        super();
        this.username = data.username;
        this.passwordHash = data.passwordHash;
        this.fileCRCs = data.fileCRCs;
        this.macAddress = data.macAddress;
        this.driveModels = data.driveModels;
        this.driveSerials = data.driveSerials;
        this.loginToken = data.loginToken;
        this.computerName = data.computerName;
        this.hasSteamTicket = data.hasSteamTicket;
        this.steamTicketLength = data.steamTicketLength;
    }

    /**
     * This packet is client->server only; encoding not supported.
     */
    encode(): Buffer {
        throw new Error('IdLoginPacket is client->server only');
    }

    /**
     * Decode 0x6E packet from buffer.
     *
     * Wire format:
     *   - u8 msgId (0x6E)
     *   - Huffman username
     *   - bounded string passwordHash (64 bytes, hex)
     *   - u32c fileCRCs[3]
     *   - Huffman macAddress
     *   - 4x (bounded string driveModel[64], bounded string driveSerial[32])
     *   - bounded string loginToken (64 bytes)
     *   - Huffman computerName
     *   - bit hasSteamTicket
     *   - [if hasSteamTicket] 1024 compressed bytes + u32c steamTicketLength
     *
     * Note: May be wrapped in ID_TIMESTAMP (0x19) prefix.
     */
    static decode(buffer: Buffer): IdLoginPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            let packetId = bs.readU8();

            // Handle optional ID_TIMESTAMP wrapper
            if (packetId === RakNetMessageId.ID_TIMESTAMP) {
                bs.readBytes(8); // Skip 8-byte timestamp
                packetId = bs.readU8();
            }

            if (packetId !== RakNetMessageId.ID_LOGIN) {
                throw new Error(`Expected packet ID 0x6E, got 0x${packetId.toString(16)}`);
            }

            // Parse fields according to Docs/Packets/ID_LOGIN.md
            const username = decodeString(bs, 2048);
            const passwordHash = bs.readString(64, 'hex');

            // Read 3 file CRCs
            const fileCRCs: number[] = [];
            for (let i = 0; i < 3; i++) {
                fileCRCs.push(bs.readU32());
            }

            const macAddress = decodeString(bs, 2048);

            // Read 4 drive models and serial numbers
            const driveModels: string[] = [];
            const driveSerials: string[] = [];
            for (let i = 0; i < 4; i++) {
                driveModels.push(bs.readString(64));
                driveSerials.push(bs.readString(32));
            }

            const loginToken = bs.readString(64);
            const computerName = decodeString(bs, 2048);

            const hasSteamTicket = bs.readBit();
            let steamTicketLength = 0;

            if (hasSteamTicket) {
                // Read 1024 compressed bytes (discard for now)
                for (let i = 0; i < 1024; i++) {
                    bs.readCompressedU8();
                }
                steamTicketLength = bs.readCompressedU32();
            }

            return new IdLoginPacket({
                username,
                passwordHash,
                fileCRCs,
                macAddress,
                driveModels,
                driveSerials,
                loginToken,
                computerName,
                hasSteamTicket,
                steamTicketLength,
            });
        } finally {
            bs.destroy();
        }
    }
}
