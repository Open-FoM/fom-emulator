import { LithPacketWrite } from '@openfom/networking';
import { LithTechMessageId } from './shared';
import { LithMessage } from './base';

export enum PreloadType {
    START = 0,
    END = 1,
    MODEL = 2,
    TEXTURE = 3,
    SPRITE = 4,
    SOUND = 5,
    MODEL_CACHED = 6,
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

    static createStart(): MsgPreloadList {
        return new MsgPreloadList({ preloadType: PreloadType.START });
    }

    static createForFile(preloadType: PreloadType, fileId: number): MsgPreloadList {
        return new MsgPreloadList({ preloadType, fileIds: [fileId] });
    }

    static createEnd(): MsgPreloadList {
        return new MsgPreloadList({ preloadType: PreloadType.END });
    }

    static buildSeparated(preloadType: PreloadType, fileIds: number[], includeStartEnd = true): MsgPreloadList[] {
        const packets: MsgPreloadList[] = [];
        if (includeStartEnd) {
            packets.push(MsgPreloadList.createStart());
        }
        for (const fileId of fileIds) {
            packets.push(MsgPreloadList.createForFile(preloadType, fileId));
        }
        if (includeStartEnd) {
            packets.push(MsgPreloadList.createEnd());
        }
        return packets;
    }

    toString(): string {
        return `MsgPreloadList { type: ${PreloadType[this.preloadType]}, fileIds: [${this.fileIds.join(', ')}] }`;
    }
}
