import { LithPacketWrite } from '@openfom/networking';
import { LithMessage } from './base';
import { LithTechMessageId } from './shared';

export const CF_NEWOBJECT = 0x0001;
export const CF_POSITION = 0x0002;
export const CF_ROTATION = 0x0004;
export const CF_FLAGS = 0x0008;
export const CF_SCALE = 0x0010;
export const CF_RENDERINFO = 0x0040;
export const CF_ATTACHMENTS = 0x0100;
export const CF_FILENAMES = 0x0800;
export const CF_MODELINFO = 0x2020;
export const CF_DIMS = 0x8000;

export type UpdatePosition = { x: number; y: number; z: number };

export type UpdateBlockPayloadWriter = (writer: LithPacketWrite) => void;

export type MsgUpdateBlock = {
    objectId: number;
    flags: number;
    encodePayload?: UpdateBlockPayloadWriter;
};

export type MsgUpdateData = {
    blocks: MsgUpdateBlock[];
};

export type SpawnDefinition = {
    objectId: number;
    objType: number;
    position: UpdatePosition;
    subBlock?: Buffer;
    renderInfoBytes?: number[];
    renderFlags?: number;
    dims?: UpdatePosition;
    fileListBits?: { data: Buffer; bits: number };
    modelInfoBits?: { data: Buffer; bits: number };
};

export type ModelSpawnDefinition = {
    objectId: number;
    position: UpdatePosition;
    velocity?: UpdatePosition;
    objType?: number;
    subBlock?: Buffer;
    modelId: number;
    childModelIds?: number[];
    skinIds?: number[];
    renderStyleIds?: number[];
    flagsA?: number;
    flagsB?: number;
    userFlags?: number;
    scale?: UpdatePosition;
    rotationYaw?: number;
    includeFileListPostInit?: boolean;
    includeModelInfo?: boolean;
    modelInfoBits?: { data: Buffer; bits: number };
};

const writeUpdateFlags = (writer: LithPacketWrite, flags: number): void => {
    const hi = (flags >>> 7) & 0xff;
    let lo = flags & 0x7f;
    if (hi !== 0) {
        lo |= 0x80;
        writer.writeUint8(lo);
        writer.writeUint8(hi);
    } else {
        writer.writeUint8(lo);
    }
};

const MODEL_CHILD_BITS = 6; // FNumBits<MAX_CHILD_MODELS>::k_nValue (MAX_CHILD_MODELS=32)
const MODEL_TEXTURE_BITS = 6; // FNumBits<MAX_MODEL_TEXTURES>::k_nValue (MAX_MODEL_TEXTURES=32)
const MODEL_RENDERSTYLE_BITS = 4; // FNumBits<MAX_MODEL_RENDERSTYLES>::k_nValue (MAX_MODEL_RENDERSTYLES=8)

const writeModelFileBlock = (writer: LithPacketWrite, def: ModelSpawnDefinition): void => {
    const childIds = def.childModelIds ?? [];
    const skinIds = def.skinIds ?? [];
    const renderIds = def.renderStyleIds ?? [];

    writer.writeUint16(def.modelId & 0xffff);

    const numChildModels = Math.min(childIds.length + 1, 32);
    writer.writeBits(numChildModels, MODEL_CHILD_BITS);
    for (let i = 1; i < numChildModels; i += 1) {
        writer.writeUint16((childIds[i - 1] ?? 0xffff) & 0xffff);
    }

    const numTextures = Math.min(skinIds.length, 32);
    writer.writeBits(numTextures, MODEL_TEXTURE_BITS);
    for (let i = 0; i < numTextures; i += 1) {
        writer.writeUint16((skinIds[i] ?? 0xffff) & 0xffff);
    }

    const numRenderStyles = Math.min(renderIds.length, 8);
    writer.writeBits(numRenderStyles, MODEL_RENDERSTYLE_BITS);
    for (let i = 0; i < numRenderStyles; i += 1) {
        writer.writeUint16((renderIds[i] ?? 0xffff) & 0xffff);
    }
};

const buildDefaultModelInfoBits = (modelId: number): { data: Buffer; bits: number } => {
    using writer = new LithPacketWrite();

    const modelId16 = modelId & 0xffff;
    if (modelId16 === 0xffff) {
        writer.writeBits(0, 1);
        return { data: writer.getData(), bits: writer.size() };
    }

    // hasEntries = 1 (emit a single no-op entry tied to base model id).
    writer.writeBits(1, 1);
    // applyChange = 0, flagSet = 0.
    writer.writeBits(0, 1);
    writer.writeBits(0, 1);
    if (modelId16 <= 0xff) {
        writer.writeBits(0, 1); // 8-bit id
        writer.writeBits(modelId16 & 0xff, 8);
        writer.writeBits(1, 1); // useHighBits
    } else {
        writer.writeBits(1, 1); // 14-bit id
        writer.writeBits(modelId16 & 0x3fff, 14);
        writer.writeBits(1, 1); // useHighBits
    }
    writer.writeBits(0, 1); // localFlag
    writer.writeBits(0, 2); // lenSelector = 0 => 1 bit length
    writer.writeBits(0, 1); // scaledValue = 0
    writer.writeBits(0, 1); // scale present = 0 (default 1.0)
    writer.writeBits(0, 1); // loop end

    return { data: writer.getData(), bits: writer.size() };
};

const encodeSpawnPayload = (writer: LithPacketWrite, def: SpawnDefinition): void => {
    let objDefFlags = def.objType & 0x3f;
    const subBlock = def.subBlock;
    if (subBlock && subBlock.length > 0) {
        objDefFlags |= 0x40;
        if (subBlock.length > 0xff) objDefFlags |= 0x80;
    }

    writer.writeUint8(objDefFlags);
    writer.writeFloat(def.position.x);
    writer.writeFloat(def.position.y);
    writer.writeFloat(def.position.z);

    if (subBlock && subBlock.length > 0) {
        if (objDefFlags & 0x80) {
            writer.writeUint16(subBlock.length & 0xffff);
        } else {
            writer.writeUint8(subBlock.length & 0xff);
        }
        writer.writeData(subBlock, subBlock.length * 8);
    }

    if (def.renderInfoBytes) {
        const renderBytes = def.renderInfoBytes;
        for (let i = 0; i < 5; i += 1) {
            writer.writeUint8(renderBytes[i] ?? 0);
        }
        writer.writeUint8(def.renderFlags ?? 0);
    }

    if (def.dims) {
        writer.writeFloat(def.dims.x);
        writer.writeFloat(def.dims.y);
        writer.writeFloat(def.dims.z);
    }

    if (def.fileListBits) {
        writer.writeData(def.fileListBits.data, def.fileListBits.bits);
    }

    if (def.modelInfoBits) {
        writer.writeData(def.modelInfoBits.data, def.modelInfoBits.bits);
    }
};

const encodeModelSpawnPayload = (writer: LithPacketWrite, def: ModelSpawnDefinition): void => {
    const objType = def.objType ?? 1;
    const velocity = def.velocity ?? { x: 0, y: 0, z: 0 };
    const flagsA = def.flagsA ?? 0;
    const flagsB = def.flagsB ?? 0;
    const userFlags = def.userFlags ?? 0;
    const subBlock = def.subBlock;
    const includeFileListPostInit = def.includeFileListPostInit ?? true;
    const includeModelInfo = def.includeModelInfo ?? true;
    const modelInfoBits = def.modelInfoBits;

    let objDefFlags = objType & 0x3f;
    if (subBlock && subBlock.length > 0) {
        objDefFlags |= 0x40;
        if (subBlock.length > 0xff) objDefFlags |= 0x80;
    }

    writer.writeUint8(objDefFlags & 0xff);
    writer.writeFloat(def.position.x);
    writer.writeFloat(def.position.y);
    writer.writeFloat(def.position.z);

    if (subBlock && subBlock.length > 0) {
        if (objDefFlags & 0x80) {
            writer.writeUint16(subBlock.length & 0xffff);
        } else {
            writer.writeUint8(subBlock.length & 0xff);
        }
        writer.writeData(subBlock, subBlock.length * 8);
    }

    if (objType === 1) {
        writeModelFileBlock(writer, def);
    }

    if (includeFileListPostInit) {
        if (objType === 1) {
            writeModelFileBlock(writer, def);
        } else if (objType === 3) {
            writer.writeUint16(def.modelId & 0xffff);
        }
    }

    if (includeModelInfo) {
        if (modelInfoBits) {
            writer.writeData(modelInfoBits.data, modelInfoBits.bits);
        } else {
            const fallback = buildDefaultModelInfoBits(def.modelId);
            writer.writeData(fallback.data, fallback.bits);
        }
    }

    writer.writeUint16(flagsA & 0xffff);
    writer.writeUint16(flagsB & 0xffff);
    writer.writeUint32(userFlags >>> 0);

    if (def.scale) {
        writer.writeFloat(def.scale.x);
        writer.writeFloat(def.scale.y);
        writer.writeFloat(def.scale.z);
    }

    if (flagsA & 0x100) {
        writer.writeFloat(def.position.x);
        writer.writeFloat(def.position.y);
        writer.writeFloat(def.position.z);
        writer.writeFloat(velocity.x);
        writer.writeFloat(velocity.y);
        writer.writeFloat(velocity.z);
    } else {
        // Compressed position not supported here yet.
        writer.writeFloat(def.position.x);
        writer.writeFloat(def.position.y);
        writer.writeFloat(def.position.z);
        writer.writeFloat(velocity.x);
        writer.writeFloat(velocity.y);
        writer.writeFloat(velocity.z);
    }

    if (def.rotationYaw !== undefined) {
        const radians = (def.rotationYaw * Math.PI) / 180;
        const half = radians * 0.5;
        const sinHalf = Math.sin(half);
        const cosHalf = Math.cos(half);
        // LTRotation quaternion (x,y,z,r); yaw is rotation around +Y.
        writer.writeFloat(0);
        writer.writeFloat(sinHalf);
        writer.writeFloat(0);
        writer.writeFloat(cosHalf);
    }
};

export const createSpawnBlock = (def: SpawnDefinition): MsgUpdateBlock => {
    let flags = CF_NEWOBJECT;
    if (def.renderInfoBytes) flags |= CF_RENDERINFO;
    if (def.dims) flags |= CF_DIMS;
    if (def.fileListBits) flags |= CF_FILENAMES;
    if (def.modelInfoBits) flags |= CF_MODELINFO;

    return {
        objectId: def.objectId,
        flags,
        encodePayload: (writer) => encodeSpawnPayload(writer, def),
    };
};

export const createModelSpawnBlock = (def: ModelSpawnDefinition): MsgUpdateBlock => {
    let flags = CF_NEWOBJECT | CF_POSITION | CF_FLAGS;
    if (def.scale) flags |= CF_SCALE;
    if (def.rotationYaw !== undefined) flags |= CF_ROTATION;
    if (def.includeFileListPostInit ?? true) flags |= CF_FILENAMES;
    if (def.includeModelInfo ?? true) flags |= CF_MODELINFO;
    return {
        objectId: def.objectId,
        flags,
        encodePayload: (writer) => encodeModelSpawnPayload(writer, def),
    };
};

export class MsgUpdate extends LithMessage {
    static MESSAGE_ID = LithTechMessageId.MSG_UPDATE;

    blocks: MsgUpdateBlock[];
    private cachedPayloadBits: number | null = null;

    constructor(data: MsgUpdateData) {
        super();
        this.blocks = data.blocks ?? [];
    }

    encode(): Buffer {
        using writer = new LithPacketWrite();
        writer.writeUint8(MsgUpdate.MESSAGE_ID);

        for (const block of this.blocks) {
            using blockWriter = new LithPacketWrite();
            writeUpdateFlags(blockWriter, block.flags);
            if (block.flags !== 0) {
                blockWriter.writeUint16(block.objectId & 0xffff);
            }
            if (block.encodePayload) {
                block.encodePayload(blockWriter);
            }
            const blockBits = blockWriter.size();
            const blockData = blockWriter.getData();
            writer.writeUint32(blockBits >>> 0);
            writer.writeData(blockData, blockBits);
        }

        this.cachedPayloadBits = Math.max(0, writer.size() - 8);
        return writer.getData();
    }

    get payloadBits(): number {
        return this.cachedPayloadBits ?? 0;
    }

    toString(): string {
        return `MsgUpdate { blocks: ${this.blocks.length} }`;
    }
}
