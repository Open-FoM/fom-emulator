import { BitStreamWriter, BitStreamReader } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export interface MsgNetProtocolVersionData {
    protocolVersion: number;
    additionalVersion: number;
}

export class MsgNetProtocolVersion extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_NETPROTOCOLVERSION;

    protocolVersion: number;
    additionalVersion: number;

    constructor(data: MsgNetProtocolVersionData) {
        super();
        this.protocolVersion = data.protocolVersion;
        this.additionalVersion = data.additionalVersion;
    }

    encode(): Buffer {
        const writer = new BitStreamWriter(32);
        writer.writeBits(this.protocolVersion, 32);
        writer.writeBits(this.additionalVersion, 32);
        return writer.toBuffer();
    }

    get payloadBits(): number {
        return 64;
    }

    static decode(buffer: Buffer): MsgNetProtocolVersion {
        const reader = new BitStreamReader(buffer);
        const protocolVersion = reader.readBits(32);
        const additionalVersion = reader.readBits(32);
        return new MsgNetProtocolVersion({ protocolVersion, additionalVersion });
    }

    static createDefault(): MsgNetProtocolVersion {
        return new MsgNetProtocolVersion({ protocolVersion: 7, additionalVersion: 0 });
    }

    toString(): string {
        return `MsgNetProtocolVersion { protocolVersion: ${this.protocolVersion}, additionalVersion: ${this.additionalVersion} }`;
    }
}
