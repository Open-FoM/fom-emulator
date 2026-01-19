import { NativeBitStream, readBitsLE } from '@openfom/networking';
import { CompactVec3 } from './structs/common';

export interface WeaponFireEntry {
    type: number;
    playerId?: number;
    position?: CompactVec3;
    inputFlagsRaw?: number;
    inputFlags?: {
        moveForward: boolean;
        moveBackward: boolean;
        moveLeft: boolean;
        moveRight: boolean;
        runLock: boolean;
        crouchToggle: boolean;
        jumpUse: boolean;
        forwardKey: boolean;
        backKey: boolean;
        leftKey: boolean;
        rightKey: boolean;
        runModifier: boolean;
    };
}

export interface PacketIdUpdateData {
    entries: WeaponFireEntry[];
    raw: Buffer;
}

/**
 * Packet_ID_UPDATE (0x7E / -130) - client -> server
 * WeaponFireEntry list (movement/input + weapon state). See AddressMap_CShell_dll.md.
 *
 * NOTE: Decode is best-effort and stops after the first entry with position data.
 */
export class PacketIdUpdate {
    static GAME_ID = 0x7e;

    entries: WeaponFireEntry[];
    raw: Buffer;

    constructor(data: PacketIdUpdateData) {
        this.entries = data.entries;
        this.raw = data.raw;
    }

    static decode(buffer: Buffer): PacketIdUpdate {
        const bs = new NativeBitStream(buffer);
        const entries: WeaponFireEntry[] = [];

        while (true) {
            let type: number;
            try {
                type = bs.readCompressedU8();
            } catch {
                try {
                    type = bs.readU8();
                } catch {
                    break;
                }
            }
            if (type === 0) {
                break;
            }
            const entry: WeaponFireEntry = { type };
            try {
                switch (type) {
                    case 1: {
                        bs.readCompressedU32();
                        bs.readCompressedU32();
                        bs.readCompressedU8();
                        if (bs.readBit()) bs.readCompressedU32();
                        if (bs.readBit()) readBitsLE(bs, 3);
                        bs.readCompressedU32();
                        // fallthrough into type2 payload
                    }
                    case 2: {
                        entry.playerId = bs.readCompressedU32();
                        entry.position = CompactVec3.decode(bs);

                        // Read_BitfieldBlock_0x30 (bit lengths in order)
                        readBitsLE(bs, 1);
                        readBitsLE(bs, 1);
                        readBitsLE(bs, 5);
                        readBitsLE(bs, 5);
                        readBitsLE(bs, 32);
                        readBitsLE(bs, 5);
                        readBitsLE(bs, 6);
                        readBitsLE(bs, 4);
                        readBitsLE(bs, 12);
                        readBitsLE(bs, 12);
                        readBitsLE(bs, 12);
                        const bitfieldHasExtra = bs.readBit();
                        if (bitfieldHasExtra) {
                            for (let i = 0; i < 9; i++) {
                                readBitsLE(bs, 12);
                            }
                        }
                        readBitsLE(bs, 1);
                        readBitsLE(bs, 1);
                        readBitsLE(bs, 1);
                        readBitsLE(bs, 1);

                        const flag84 = bs.readBit();
                        if (!flag84) {
                            readBitsLE(bs, 8);
                            let inputFlags = 0x10;
                            if (bs.readBit()) {
                                inputFlags = readBitsLE(bs, 12);
                            }
                            // Client writes exactly 12 bits here (CShell.dll PlayerInput_UpdateAndSend @ 0x101A2CE0).
                            // Fire/AltFire (actions 15/16) are NOT part of this field; they drive WeaponController_Update.
                            const inputFlagsMasked = inputFlags & 0xfff;
                            entry.inputFlagsRaw = inputFlagsMasked;
                            entry.inputFlags = {
                                moveForward: (inputFlagsMasked & 0x1) !== 0,
                                moveBackward: (inputFlagsMasked & 0x2) !== 0,
                                moveLeft: (inputFlagsMasked & 0x4) !== 0,
                                moveRight: (inputFlagsMasked & 0x8) !== 0,
                                runLock: (inputFlagsMasked & 0x10) !== 0,
                                crouchToggle: (inputFlagsMasked & 0x20) !== 0,
                                jumpUse: (inputFlagsMasked & 0x40) !== 0,
                                forwardKey: (inputFlagsMasked & 0x80) !== 0,
                                backKey: (inputFlagsMasked & 0x100) !== 0,
                                leftKey: (inputFlagsMasked & 0x200) !== 0,
                                rightKey: (inputFlagsMasked & 0x400) !== 0,
                                // action 5 (Run) modifier while moving/jumping
                                runModifier: (inputFlagsMasked & 0x800) !== 0,
                            };
                            if (bs.readBit()) readBitsLE(bs, 5);
                            if (bs.readBit()) {
                                bs.readCompressedU16();
                                bs.readBit();
                                const hasField120 = bs.readBit();
                                if (hasField120) {
                                    readBitsLE(bs, 7);
                                    const qx = bs.readCompressedU16();
                                    const qy = bs.readCompressedU16();
                                    const qz = bs.readCompressedU16();
                                    void ((qx << 16) >> 16);
                                    void ((qy << 16) >> 16);
                                    void ((qz << 16) >> 16);
                                }
                            }
                            const hasField124 = bs.readBit();
                            if (hasField124) {
                                readBitsLE(bs, 4);
                                readBitsLE(bs, 4);
                            }
                            if (bs.readBit()) readBitsLE(bs, 6);
                            if (bitfieldHasExtra) {
                                if (bs.readBit()) bs.readCompressedU16();
                                readBitsLE(bs, 7);
                            }
                            readBitsLE(bs, 8);
                            readBitsLE(bs, 3);
                            bs.readBit();
                            readBitsLE(bs, 10);
                            readBitsLE(bs, 10);
                            bs.readBit();
                        }
                        break;
                    }
                    case 3: {
                        entry.playerId = bs.readCompressedU32();
                        bs.readCompressedU16();
                        readBitsLE(bs, 3);
                        bs.readCompressedU8();
                        entry.position = CompactVec3.decode(bs);
                        const stopByte = readBitsLE(bs, 8);
                        if (stopByte === 0) {
                            bs.readBit();
                            readBitsLE(bs, 5);
                            readBitsLE(bs, 4);
                            let field128 = 0;
                            if (bs.readBit()) field128 = readBitsLE(bs, 6);
                            if (field128 >= 2 && field128 <= 4) bs.readCompressedU32();
                            readBitsLE(bs, 14);
                        }
                        break;
                    }
                    case 4: {
                        entry.playerId = bs.readCompressedU32();
                        bs.readCompressedU16();
                        bs.readBit();
                        readBitsLE(bs, 14);
                        bs.readBit();
                        bs.readBit();
                        bs.readBit();
                        bs.readBit();
                        entry.position = CompactVec3.decode(bs);
                        if (bs.readBit()) bs.readCompressedU32();
                        if (bs.readBit()) bs.readCompressedU32();
                        if (bs.readBit()) bs.readCompressedU32();
                        bs.readString(2048);
                        break;
                    }
                    default:
                        break;
                }
            } catch {
                break;
            }
            entries.push(entry);
        }

        return new PacketIdUpdate({ entries, raw: buffer });
    }

    toString(): string {
        if (this.entries.length === 0) {
            return 'PacketIdUpdate { entries: [] }';
        }
        const entry = this.entries[0];
        if (entry.position) {
            const pos = entry.position;
            let flagsStr = '';
            if (entry.inputFlagsRaw !== undefined) {
                const flags: string[] = [];
                if (entry.inputFlags?.moveForward) flags.push('moveForward');
                if (entry.inputFlags?.moveBackward) flags.push('moveBackward');
                if (entry.inputFlags?.moveLeft) flags.push('moveLeft');
                if (entry.inputFlags?.moveRight) flags.push('moveRight');
                if (entry.inputFlags?.runLock) flags.push('runLock');
                if (entry.inputFlags?.crouchToggle) flags.push('crouchToggle');
                if (entry.inputFlags?.jumpUse) flags.push('jumpUse');
                if (entry.inputFlags?.forwardKey) flags.push('forwardKey');
                if (entry.inputFlags?.backKey) flags.push('backKey');
                if (entry.inputFlags?.leftKey) flags.push('leftKey');
                if (entry.inputFlags?.rightKey) flags.push('rightKey');
                if (entry.inputFlags?.runModifier) flags.push('runModifier');
                flagsStr = `, flags: 0x${entry.inputFlagsRaw.toString(16).padStart(3, '0')} [${flags.join(',')}]`;
            }
            return `PacketIdUpdate { entryType: ${entry.type}, playerId: ${entry.playerId ?? 0}, pos: (${pos.x}, ${pos.y}, ${pos.z}), yaw: ${pos.rotation}${flagsStr} }`;
        }
        return `PacketIdUpdate { entryType: ${entry.type} }`;
    }
}
