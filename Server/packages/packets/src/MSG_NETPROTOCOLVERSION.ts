import { LithPacketWrite, LithPacketRead } from '@openfom/networking';
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
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgNetProtocolVersion.MESSAGE_ID);
        writer.writeUint32(this.protocolVersion);
        writer.writeUint32(this.additionalVersion);
        return writer.getData();
    }

    static decode(buffer: Buffer): MsgNetProtocolVersion {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgNetProtocolVersion.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgNetProtocolVersion.MESSAGE_ID}, got ${messageId}`);
        }
        const protocolVersion = reader.readUint32();
        const additionalVersion = reader.readUint32();
        return new MsgNetProtocolVersion({ protocolVersion, additionalVersion });
    }

    static createDefault(): MsgNetProtocolVersion {
        return new MsgNetProtocolVersion({ protocolVersion: 7, additionalVersion: 0 });
    }

    toString(): string {
        return `MsgNetProtocolVersion { protocolVersion: ${this.protocolVersion}, additionalVersion: ${this.additionalVersion} }`;
    }
}
