/**
 * ID_WORLD_LOGIN (0x72) - Client -> Server
 * See: Docs/Packets/ID_WORLD_LOGIN.md
 */

import { NativeBitStream } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export const WORLD_LOGIN_CONST = 0x13bc52;

export interface IdWorldLoginData {
    worldId: number;
    worldInst: number;
    playerId: number;
    worldConst: number;
}

export class IdWorldLoginPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_WORLD_LOGIN;

    worldId: number;
    worldInst: number;
    playerId: number;
    worldConst: number;

    constructor(data: IdWorldLoginData) {
        super();
        this.worldId = data.worldId;
        this.worldInst = data.worldInst;
        this.playerId = data.playerId;
        this.worldConst = data.worldConst;
    }

    encode(): Buffer {
        throw new Error('IdWorldLoginPacket is client->server only');
    }

    /**
     * Wire: u8 msgId, u8c worldId, u8c worldInst, u32c playerId, u32c worldConst
     */
    static decode(buffer: Buffer): IdWorldLoginPacket {
        const bs = new NativeBitStream(buffer, true);
        try {
            const packetId = bs.readU8();
            if (packetId !== RakNetMessageId.ID_WORLD_LOGIN) {
                throw new Error(`Expected packet ID 0x72, got 0x${packetId.toString(16)}`);
            }

            const worldId = bs.readCompressedU8();
            const worldInst = bs.readCompressedU8();
            const playerId = bs.readCompressedU32();
            const worldConst = bs.readCompressedU32();

            return new IdWorldLoginPacket({ worldId, worldInst, playerId, worldConst });
        } finally {
            bs.destroy();
        }
    }

    toString(): string {
        return `IdWorldLoginPacket { worldId: ${this.worldId}, worldInst: ${this.worldInst}, playerId: ${this.playerId}, worldConst: 0x${this.worldConst.toString(16)} }`;
    }
}
