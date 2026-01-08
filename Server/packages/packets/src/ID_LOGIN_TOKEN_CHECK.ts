/**
 * ID_LOGIN_TOKEN_CHECK (0x70) - Bidirectional
 * See: Docs/Packets/ID_LOGIN_TOKEN_CHECK.md
 */

import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export interface IdLoginTokenCheckClientData {
    fromServer: false;
    requestToken: string;
}

export interface IdLoginTokenCheckServerData {
    fromServer: true;
    success: boolean;
    username: string;
}

export type IdLoginTokenCheckData = IdLoginTokenCheckClientData | IdLoginTokenCheckServerData;

export class IdLoginTokenCheckPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_LOGIN_TOKEN_CHECK;

    fromServer: boolean;
    success: boolean;
    username: string;
    requestToken: string;

    constructor(data: IdLoginTokenCheckData) {
        super();
        this.fromServer = data.fromServer;
        if (data.fromServer) {
            this.success = data.success;
            this.username = data.username;
            this.requestToken = '';
        } else {
            this.success = false;
            this.username = '';
            this.requestToken = data.requestToken;
        }
    }

    /**
     * Wire: u8 msgId, bit fromServer, [fromServer ? (bit success, str32 username) : str32 requestToken]
     */
    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_LOGIN_TOKEN_CHECK);
            bs.writeBit(this.fromServer);

            if (this.fromServer) {
                bs.writeBit(this.success);
                bs.writeString(this.username, 32);
            } else {
                bs.writeString(this.requestToken, 32);
            }

            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdLoginTokenCheckPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_LOGIN_TOKEN_CHECK) {
                throw new Error(`Expected packet ID 0x70, got 0x${packetId.toString(16)}`);
            }

            const fromServer = bs.readBit();

            if (fromServer) {
                const success = bs.readBit();
                const username = bs.readString(32);
                return new IdLoginTokenCheckPacket({ fromServer: true, success, username });
            }

            const requestToken = bs.readString(32);
            return new IdLoginTokenCheckPacket({ fromServer: false, requestToken });
        } finally {
            bs.destroy();
        }
    }

    static createServerResponse(success: boolean, username: string): IdLoginTokenCheckPacket {
        return new IdLoginTokenCheckPacket({ fromServer: true, success, username });
    }

    toString(): string {
        if (this.fromServer) {
            return `IdLoginTokenCheckPacket { fromServer: true, success: ${this.success}, username: "${this.username}" }`;
        }
        return `IdLoginTokenCheckPacket { fromServer: false, requestToken: "${this.requestToken}" }`;
    }
}
