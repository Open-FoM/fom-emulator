import { LithPacketWrite } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';
import { MsgNetProtocolVersion } from './MSG_NETPROTOCOLVERSION';
import { MsgYourId } from './MSG_YOURID';
import { MsgClientObjectId } from './MSG_CLIENTOBJECTID';
import { MsgLoadWorld } from './MSG_LOADWORLD';

export interface MsgPacketGroupData {
    messages: LithMessage[];
}

/**
 * LithTech SMSG_PACKETGROUP (ID 14)
 * 
 * Based on IDA analysis of fom_client.exe OnMessageGroupPacket @ 0x00426C00:
 * - Outer message ID is RAW 8-bit (0x0E = 14)
 * - Sub-packet lengths are in BITS (8-bit value)
 * - Inner message IDs are also RAW 8-bit
 * 
 * The handler dispatch at 0x00427598 reads 8 bits and uses directly as g_MessageHandlers index.
 * NO BIT-SHIFTING is done on message IDs in the LithTech layer.
 */
export class MsgPacketGroup extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_MESSAGE_GROUP;

    messages: LithMessage[];

    constructor(data: MsgPacketGroupData) {
        super();
        this.messages = data.messages;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        
        writer.writeUint8(LithTechMessageId.MSG_MESSAGE_GROUP);

        for (const msg of this.messages) {
            const payload = msg.encode();
            const subPacketBitLength = payload.length * 8;
            
            if (subPacketBitLength > 255) {
                throw new Error(`Subpacket too large: ${subPacketBitLength} bits (max 255)`);
            }
            
            writer.writeUint8(subPacketBitLength);
            writer.writeData(payload, payload.length * 8);
        }

        writer.writeUint8(0);

        return writer.getData();
    }

    static decode(_buffer: Buffer): MsgPacketGroup {
        throw new Error('MsgPacketGroup.decode not implemented');
    }

    static fromMessages(messages: LithMessage[]): MsgPacketGroup {
        return new MsgPacketGroup({ messages });
    }

    static buildWorldLoginBurst(
        clientId: number,
        worldId: number,
        gameTime: number = 0.0,
    ): MsgPacketGroup {
        const messages: LithMessage[] = [
            MsgNetProtocolVersion.createDefault(),
            MsgYourId.create(clientId, false),
            MsgClientObjectId.create(clientId),
            MsgLoadWorld.create(worldId, gameTime),
        ];
        return MsgPacketGroup.fromMessages(messages);
    }

    toString(): string {
        const msgStrs = this.messages.map(m => m.toString()).join(', ');
        return `MsgPacketGroup { messages: [${msgStrs}] }`;
    }
}
