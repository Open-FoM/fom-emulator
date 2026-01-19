/**
 * ProfileB block (4 compressed u16 values).
 * Source: WorldLogin_ReadProfileBlockB.
 */

import { NativeBitStream, Struct } from '@openfom/networking';

/**
 * ProfileB - 4 u16c values.
 * Source: WorldLogin_ReadProfileBlockB @ 0x6743AA40
 */
export class ProfileB extends Struct {
    constructor(public values: number[] = [0, 0, 0, 0]) {
        super();
    }

    /**
     * Serialize ProfileB (4 compressed u16 values).
     */
    encode(bs: NativeBitStream): void {
        for (let i = 0; i < 4; i++) bs.writeCompressedU16(this.values[i] & 0xffff);
    }

    /**
     * Deserialize ProfileB.
     */
    static decode(bs: NativeBitStream): ProfileB {
        return new ProfileB(
            Array(4)
                .fill(0)
                .map(() => bs.readCompressedU16()),
        );
    }

    /**
     * Create an empty ProfileB payload.
     */
    static empty(): ProfileB {
        return new ProfileB();
    }
}

/**
 * Appearance flag bits (4 x 1-bit).
 */
