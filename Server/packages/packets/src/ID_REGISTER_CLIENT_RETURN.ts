/**
 * ID_REGISTER_CLIENT_RETURN (0x79) - World Server -> Client
 * Response to ID_REGISTER_CLIENT (0x78).
 * 
 * Source: Object.lto @ 0x1007a850 (Packet_ID_WORLD_LOGIN_DATA_Ctor)
 *         Object.lto @ 0x1007ab00 (ID_WORLD_LOGIN_DATA_Write)
 * 
 * See: Docs/Notes/ID_REGISTER_CLIENT_RETURN_0x79.md
 */

import { NativeBitStream, writeLithHuffmanString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';
import {
    ProfileA,
    ProfileB,
    ProfileC,
    ProfileCData,
    applyProfileCAppearance,
    ProfileD,
} from './structs/profile';
import {
    CompactVec3,
    EntryGBlock,
    TableIBlock,
    ListKBlock,
} from './structs/common';
import { StringBundleE } from './structs/world';

const MAX_BLOB_BITS = 2048;
const MAX_BLOB_BYTES = MAX_BLOB_BITS / 8;

const writeStringBundleE = (bs: NativeBitStream, bundle: StringBundleE): void => {
    bs.writeCompressedU32(bundle.bundleId >>> 0);
    bs.writeBit(Boolean(bundle.flag));

    // LT string bundle uses u32c bit-length + Huffman bits (max 2048 bits per field).
    writeLithHuffmanString(bs, bundle.playerName?.value ?? '', MAX_BLOB_BITS);
    writeLithHuffmanString(bs, bundle.avatarData?.value ?? '', MAX_BLOB_BITS);
    writeLithHuffmanString(bs, bundle.factionOrTitle?.value ?? '', MAX_BLOB_BITS);
    writeLithHuffmanString(bs, bundle.unknownString?.value ?? '', MAX_BLOB_BITS);
};

const writeBlobH = (bs: NativeBitStream, blob: string): void => {
    // Same LT Huffman reader as StringBundleE (u32c bit-length + Huffman bits).
    writeLithHuffmanString(bs, blob ?? '', MAX_BLOB_BITS);
};

export interface IdRegisterClientReturnData {
    worldId: number;
    playerId: number;
    returnCode: number;
    appearance?: ProfileCData;
    profileEntries?: ProfileCData[];
}

export class IdRegisterClientReturnPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_REGISTER_CLIENT_RETURN;

    worldId: number;
    playerId: number;
    returnCode: number;
    
    profileA: ProfileA;
    profileB: ProfileB;
    profileC: ProfileC;
    profileD: ProfileD;
    stringBundle: StringBundleE;
    flagA: number;
    flagB: number;
    profileEntries: ProfileC[];
    baseSpawnEnabled: boolean;
    position1: CompactVec3;
    currencyA: number;
    currencyB: number;
    flag3: boolean;
    valC: number;
    field18916: number;
    position2: CompactVec3;
    entryGBlock: EntryGBlock;
    tableIBlock: TableIBlock;
    blobH: string;
    hasOverrideSpawn: boolean;
    listKBlock: ListKBlock;

    constructor(data: IdRegisterClientReturnData) {
        super();
        this.worldId = data.worldId;
        this.playerId = data.playerId;
        this.returnCode = data.returnCode;
        
        this.profileA = ProfileA.empty();
        this.profileB = ProfileB.empty();
        this.profileC = applyProfileCAppearance(ProfileC.defaultMale(), data.appearance ?? {});
        this.profileD = ProfileD.empty();
        this.stringBundle = StringBundleE.empty();
        this.flagA = 3;
        this.flagB = 0;
        this.profileEntries = (data.profileEntries ?? []).map(entry =>
            applyProfileCAppearance(ProfileC.defaultMale(), entry)
        );
        this.baseSpawnEnabled = true;
        this.position1 = new CompactVec3();
        this.currencyA = 0;
        this.currencyB = 0;
        this.flag3 = false;
        this.valC = 0;
        this.field18916 = 0;
        this.position2 = new CompactVec3();
        this.entryGBlock = EntryGBlock.empty();
        this.tableIBlock = TableIBlock.empty();
        this.blobH = '';
        this.hasOverrideSpawn = false;
        this.listKBlock = ListKBlock.empty();
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_REGISTER_CLIENT_RETURN);
            bs.writeCompressedU8(this.worldId);
            bs.writeCompressedU32(this.playerId);
            bs.writeCompressedU8(this.returnCode);
            
            bs.writeStruct(this.profileA);
            bs.writeStruct(this.profileB);
            bs.writeStruct(this.profileC);
            bs.writeStruct(this.profileD);
            writeStringBundleE(bs, this.stringBundle);
            
            bs.writeCompressedU8(this.flagA & 0xff);
            bs.writeCompressedU8(this.flagB & 0xff);
            bs.writeCompressedU16(this.profileEntries.length & 0xffff);
            for (const entry of this.profileEntries) {
                bs.writeStruct(entry);
            }
            
            bs.writeBit(this.baseSpawnEnabled);
            bs.writeStruct(this.position1);
            
            bs.writeCompressedU32(this.currencyA >>> 0);
            bs.writeCompressedU32(this.currencyB >>> 0);
            
            bs.writeBit(this.flag3);
            bs.writeCompressedU16(this.valC & 0xffff);
            bs.writeCompressedU32(this.field18916 >>> 0);
            
            bs.writeStruct(this.entryGBlock);
            writeBlobH(bs, this.blobH);
            bs.writeStruct(this.tableIBlock);
            bs.writeStruct(this.position2);
            
            bs.writeBit(this.hasOverrideSpawn);
            bs.writeStruct(this.listKBlock);
            
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(_buffer: Buffer): IdRegisterClientReturnPacket {
        throw new Error('IdRegisterClientReturnPacket decode not implemented - server->client only');
    }

    toString(): string {
        return `IdRegisterClientReturnPacket { worldId: ${this.worldId}, playerId: ${this.playerId}, returnCode: ${this.returnCode} }`;
    }
}
