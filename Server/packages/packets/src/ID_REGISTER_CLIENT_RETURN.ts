/**
 * ID_REGISTER_CLIENT_RETURN (0x79) - World Server -> Client
 * Response to ID_REGISTER_CLIENT (0x78).
 * 
 * Source: Object.lto @ 0x1007a850 (Packet_ID_WORLD_LOGIN_DATA_Ctor)
 *         Object.lto @ 0x1007ab00 (ID_WORLD_LOGIN_DATA_Write)
 * 
 * See: Docs/Notes/ID_REGISTER_CLIENT_RETURN_0x79.md
 */

import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';
import {
    ProfileA,
    ProfileB,
    ProfileC,
    ProfileCData,
    ProfileD,
} from './structs/profile';
import {
    CompactVec3,
    EntryGBlock,
    TableIBlock,
    FinalBlock,
} from './structs/common';
import { StringBundleE } from './structs/world';

export interface IdRegisterClientReturnData {
    worldId: number;
    playerId: number;
    flags: number;
    appearance?: ProfileCData;
}

export class IdRegisterClientReturnPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_REGISTER_CLIENT_RETURN;

    worldId: number;
    playerId: number;
    flags: number;
    
    profileA: ProfileA;
    profileB: ProfileB;
    profileC: ProfileC;
    profileD: ProfileD;
    stringBundle: StringBundleE;
    position1: CompactVec3;
    position2: CompactVec3;
    entryGBlock: EntryGBlock;
    tableIBlock: TableIBlock;
    finalBlock: FinalBlock;

    constructor(data: IdRegisterClientReturnData) {
        super();
        this.worldId = data.worldId;
        this.playerId = data.playerId;
        this.flags = data.flags;
        
        this.profileA = ProfileA.empty();
        this.profileB = ProfileB.empty();
        this.profileC = data.appearance ? new ProfileC(data.appearance) : ProfileC.defaultMale();
        this.profileD = ProfileD.empty();
        this.stringBundle = StringBundleE.empty();
        this.position1 = new CompactVec3();
        this.position2 = new CompactVec3();
        this.entryGBlock = EntryGBlock.empty();
        this.tableIBlock = TableIBlock.empty();
        this.finalBlock = FinalBlock.empty();
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_REGISTER_CLIENT_RETURN);
            bs.writeCompressedU8(this.worldId);
            bs.writeCompressedU32(this.playerId);
            bs.writeCompressedU8(this.flags);
            
            bs.writeStruct(this.profileA);
            bs.writeStruct(this.profileB);
            bs.writeStruct(this.profileC);
            bs.writeStruct(this.profileD);
            bs.writeStruct(this.stringBundle);
            
            bs.writeCompressedU8(3);
            bs.writeCompressedU8(0);
            bs.writeCompressedU16(0);
            
            bs.writeBit(true);
            bs.writeStruct(this.position1);
            
            bs.writeCompressedU32(0);
            bs.writeCompressedU32(0);
            
            bs.writeBit(false);
            bs.writeCompressedU16(0);
            
            bs.writeStruct(this.entryGBlock);
            bs.writeCompressedString('');
            bs.writeStruct(this.tableIBlock);
            bs.writeStruct(this.position2);
            
            bs.writeBit(false);
            bs.writeStruct(this.finalBlock);
            
            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    static decode(_buffer: Buffer): IdRegisterClientReturnPacket {
        throw new Error('IdRegisterClientReturnPacket decode not implemented - server->client only');
    }

    toString(): string {
        return `IdRegisterClientReturnPacket { worldId: ${this.worldId}, playerId: ${this.playerId}, flags: ${this.flags} }`;
    }
}
