import { NativeBitStream, encodeString, decodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export enum LoginRequestReturnStatus {
    INVALID_INFO = 0,
    SUCCESS = 1,
    OUTDATED_CLIENT = 2,
    ALREADY_LOGGED_IN = 3,
}

export interface IdLoginRequestReturnData {
    status: LoginRequestReturnStatus;
    username: string;
}

export class IdLoginRequestReturnPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_LOGIN_REQUEST_RETURN;

    status: LoginRequestReturnStatus;
    username: string;

    constructor(data: IdLoginRequestReturnData) {
        super();
        this.status = data.status;
        this.username = data.username;
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_LOGIN_REQUEST_RETURN);
            bs.writeCompressedU8(this.status & 0xff);
            encodeString(this.username ?? '', bs, 2048);
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(buffer: Buffer): IdLoginRequestReturnPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) {
                throw new Error(`Expected packet ID 0x6D, got 0x${packetId.toString(16)}`);
            }

            const status = bs.readCompressedU8() as LoginRequestReturnStatus;
            const username = decodeString(bs, 2048);

            return new IdLoginRequestReturnPacket({ status, username });
        } finally {
            bs.destroy();
        }
    }

    toString(): string {
        const statusName = LoginRequestReturnStatus[this.status] ?? this.status;
        return `IdLoginRequestReturnPacket { status: ${statusName}, username: "${this.username}" }`;
    }
}
