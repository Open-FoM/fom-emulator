import { LithPacketWrite } from '@openfom/networking';
import { LithTechMessageId } from './shared';
import { LithMessage } from './base';

export enum PreloadType {
    MODEL = 0x10,
    SPRITE = 0x11,
    TEXTURE = 0x12,
    SOUND = 0x14,
    END = 0x13,
}

export interface MsgPreloadListData {
    preloadType: PreloadType;
    fileIds?: number[];
}

export class MsgPreloadList extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_PRELOADLIST;

    readonly preloadType: PreloadType;
    readonly fileIds: number[];

    constructor(data: MsgPreloadListData) {
        super();
        this.preloadType = data.preloadType;
        this.fileIds = data.fileIds ?? [];
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgPreloadList.MESSAGE_ID);
        writer.writeUint8(this.preloadType);
        for (const fileId of this.fileIds) {
            writer.writeUint16(fileId);
        }
        return writer.getData();
    }

    static createEnd(): MsgPreloadList {
        return new MsgPreloadList({ preloadType: PreloadType.END });
    }

    toString(): string {
        return `MsgPreloadList { type: ${PreloadType[this.preloadType]}, fileIds: [${this.fileIds.join(', ')}] }`;
    }
}
