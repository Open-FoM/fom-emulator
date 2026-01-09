/**
 * World login structs.
 * Source: object.lto WorldLogin_* functions
 */

import { NativeBitStream, CompressedString, Struct } from '@openfom/networking';

/**
 * StringBundleE - Bundle of huffman-encoded strings.
 * Source: WorldLogin_WriteStringBundleE @ 0x1007aa30 (offset 0xCCC)
 * 
 * Field mapping (from Handle_ID_WORLD_LOGIN @ 0x1007adcd):
 * - playerName -> SharedStringTable key 11219
 * - avatarData -> SharedStringTable key 11224
 * - factionOrTitle -> SharedStringTable key 126546
 */
export class StringBundleE extends Struct {
    constructor(
        public bundleId: number = 0,
        public flag: boolean = false,
        public playerName: CompressedString = CompressedString.empty(),
        public avatarData: CompressedString = CompressedString.empty(),
        public factionOrTitle: CompressedString = CompressedString.empty(),
        public unknownString: CompressedString = CompressedString.empty()
    ) {
        super();
    }

    encode(bs: NativeBitStream): void {
        bs.writeCompressedU32(this.bundleId);
        bs.writeBit(this.flag);
        
        bs.writeCompressedString(this.playerName);
        bs.writeCompressedString(this.avatarData);
        bs.writeCompressedString(this.factionOrTitle);
        bs.writeCompressedString(this.unknownString);
    }

    static decode(bs: NativeBitStream): StringBundleE {
        const bundleId = bs.readCompressedU32();
        const flag = bs.readBit();
        
        const playerName = bs.readCompressedString();
        const avatarData = bs.readCompressedString();
        const factionOrTitle = bs.readCompressedString();
        const unknownString = bs.readCompressedString();
        
        return new StringBundleE(bundleId, flag, playerName, avatarData, factionOrTitle, unknownString);
    }

    static empty(): StringBundleE {
        return new StringBundleE();
    }
}
