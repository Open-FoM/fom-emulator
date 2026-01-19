import { LithPacketWrite, LithPacketRead } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

// LithTech unguaranteed update flags (UUF_*).
const UUF_ANIMINFO = 0x1;
const UUF_ROT = 0x2;
const UUF_POS = 0x4;
const UUF_YROTATION = 0x8;
const UUF_FLAGCOUNT = 4;

export interface UnguaranteedUpdateEntry {
    objectId: number;
    flags: number;
    position?: { x: number; y: number; z: number };
    yaw?: number;
}

export interface MsgUnguaranteedUpdateData {
    entries?: UnguaranteedUpdateEntry[];
    gameTime: number;
}

export class MsgUnguaranteedUpdate extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_UNGUARANTEEDUPDATE;

    entries: UnguaranteedUpdateEntry[];
    gameTime: number;
    private cachedPayloadBits: number | null = null;

    constructor(data: MsgUnguaranteedUpdateData) {
        super();
        this.entries = data.entries ?? [];
        this.gameTime = data.gameTime;
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgUnguaranteedUpdate.MESSAGE_ID);
        for (const entry of this.entries) {
            writer.writeUint16(entry.objectId & 0xffff);
            writer.writeBits(entry.flags & 0xf, UUF_FLAGCOUNT);

            if (entry.flags & UUF_POS) {
                const pos = entry.position ?? { x: 0, y: 0, z: 0 };
                // NOTE: Placeholder for world compression (EncodeCompressWorldPosition).
                writer.writeUint16(pos.x & 0xffff);
                writer.writeUint16(pos.y & 0xffff);
                writer.writeUint16(pos.z & 0xffff);
                writer.writeBool(false);
            }

            if (entry.flags & UUF_YROTATION) {
                const yaw = entry.yaw ?? 0;
                // Y-rotation uses a single int8 in LithTech (WriteYRotation).
                const angle = (yaw / 512) * (2 * Math.PI);
                let val = Math.round(angle * (127 / Math.PI));
                if (val > 127) val = 127;
                if (val < -127) val = -127;
                writer.writeInt8(val);
            } else if (entry.flags & UUF_ROT) {
                // TODO: Implement WriteCompLTRotation when rotation compression is mapped.
                writer.writeInt8(0);
                writer.writeInt8(0);
                writer.writeInt8(0);
            }

            if (entry.flags & UUF_ANIMINFO) {
                // TODO: Implement anim info encoding when needed.
                writer.writeUint8(0);
            }
        }

        // Terminator + server time.
        writer.writeUint16(0xffff);
        writer.writeBits(0, UUF_FLAGCOUNT);
        writer.writeFloat(this.gameTime);
        // payloadBits excludes the message id byte (8 bits).
        this.cachedPayloadBits = Math.max(0, writer.size() - 8);
        return writer.getData();
    }

    get payloadBits(): number {
        return this.cachedPayloadBits ?? 0;
    }

    static decode(buffer: Buffer): MsgUnguaranteedUpdate {
        using reader = new LithPacketRead(buffer);
        const messageId = reader.readUint8();
        if (messageId !== MsgUnguaranteedUpdate.MESSAGE_ID) {
            throw new Error(`Expected message ID ${MsgUnguaranteedUpdate.MESSAGE_ID}, got ${messageId}`);
        }
        while (true) {
            const objectId = reader.readUint16();
            const flags = reader.readBits(4);
            if (objectId === 0xffff) {
                const gameTime = reader.readFloat();
                return new MsgUnguaranteedUpdate({ entries: [], gameTime });
            }
            if (flags & UUF_POS) {
                reader.readUint16();
                reader.readUint16();
                reader.readUint16();
                const hasVel = reader.readBool();
                if (hasVel) {
                    reader.readFloat();
                    reader.readUint16();
                    reader.readUint16();
                    reader.readUint8();
                }
            }
            if (flags & UUF_YROTATION) {
                reader.readInt8();
            } else if (flags & UUF_ROT) {
                const b0 = reader.readInt8();
                reader.readInt8();
                reader.readInt8();
                if (b0 >= 0) {
                    reader.readInt8();
                    reader.readInt8();
                    reader.readInt8();
                }
            }
            if (flags & UUF_ANIMINFO) {
                reader.readUint8();
            }
        }
    }

    static createHeartbeat(gameTimeSeconds: number): MsgUnguaranteedUpdate {
        return new MsgUnguaranteedUpdate({ entries: [], gameTime: gameTimeSeconds });
    }

    toString(): string {
        return `MsgUnguaranteedUpdate { entries: ${this.entries.length}, gameTime: ${this.gameTime.toFixed(3)} }`;
    }
}
