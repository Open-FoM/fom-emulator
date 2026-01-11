import { NativeBitStream, encodeString } from '@openfom/networking';
import { RakNetMessageId } from './shared';
import { Packet } from './base';

export enum LoginReturnStatus {
    INVALID_LOGIN = 0,
    SUCCESS = 1,
    UNKNOWN_USERNAME = 2,
    LOGIN_RETURN_3 = 3,
    INCORRECT_PASSWORD = 4,
    CREATE_CHARACTER = 5,
    CREATE_CHARACTER_ERROR = 6,
    TEMP_BANNED = 7,
    PERM_BANNED = 8,
    DUPLICATE_IP = 9,
    INTEGRITY_CHECK_FAILED = 10,
    RUN_AS_ADMIN = 11,
    ACCOUNT_LOCKED = 12,
    NOT_PURCHASED = 13,
}

export enum AccountType {
    FREE = 0,
    BASIC = 1,
    PREMIUM = 2,
    ADMIN = 3,
}

export enum ItemType {
    NORMAL = 0,
    SECURED = 1,
    BOUND = 2,
    SPECIAL = 3,
}

export enum ItemQuality {
    STANDARD = 0,
    CUSTOM = 1,
    SPECIAL = 2,
    RARE = 3,
    SPECIAL_RARE = 4,
}

export enum ApartmentType {
    ALL = 0,
    CITY_FLAT = 1,
    RATHOLE = 2,
    COLONIAL_FLAT = 3,
    FRENCH_FLAT = 4,
    JAPANESE_FLAT = 5,
    UNDERWATER_FLAT = 6,
    CITY_APARTMENT = 7,
    CELLAR = 8,
    COLONIAL_APARTMENT = 9,
    FRENCH_APARTMENT = 10,
    JAPANESE_APARTMENT = 11,
    UNDERWATER_APARTMENT = 12,
    CITY_SUITE = 13,
    RAMSHACKLE_HUT = 14,
    COLONIAL_SUITE = 15,
    FRENCH_PENTHOUSE = 16,
    JAPANESE_PENTHOUSE = 17,
    UNDERWATER_SUITE = 18,
    UNDERGROUND_HQ = 19,
    TACTICAL_HQ = 20,
    CITY_TOWER_OFFICES = 21,
    ARCTURUS_FREIGHTER = 22,
    PRISON_DUEL_ARENA = 23,
    BACKER_SAFEHOUSE = 24,
}

export interface ApartmentData {
    id: number;
    type: ApartmentType;
    ownerPlayerID: number;
    ownerFactionID: number;
    allowedRanks: Array<{ rankID: number; allowed: boolean }>;
    isOpen: boolean;
    ownerName: string;
    entryCode: string;
    storageCapacity: number;
    storageField14: number;
    storageField18: number;
    storageField1C: number;
    storageItemCount: number;
    hasPublicInfo: boolean;
    entryPrice: number;
    publicName: string;
    publicDescription: string;
    allowedFactions: Map<number, string>;
    isDefault: boolean;
    isFeatured: boolean;
    occupancy: number;
}

export interface IdLoginReturnData {
    status: LoginReturnStatus;
    playerId: number;
    accountType?: AccountType;
    /**
     * Enables "Full account" features like faction level selection and certain consumable items.
     * When false, UI shows "(Full account only)" on restricted options.
     * Stored in StatGroup 6, checked via Player_CheckStatGroup6().
     */
    isFullAccount?: boolean;
    /**
     * Character data flags, written to SharedMem[0x1DE7E].
     * Used in item usage UI code to check character state.
     */
    hasCharFlags?: boolean;
    clientVersion?: number;
    isBanned?: boolean;
    banLength?: string;
    banReason?: string;
    worldIDs?: number[];
    factionMOTD?: string;
    apartment?: ApartmentData;
    /**
     * Default worldId written to SharedMem[1] on the client.
     * Used by the starmap UI to determine which world to connect to.
     * Must be set to a valid worldId (1-30) for world login to work.
     */
    defaultWorldId?: number;
    /**
     * Current/selected worldId stored in UI slot +0x18ED.
     * Written to SharedMem[0x1EEC1] when user clicks CONTINUE.
     * This is the world the player will actually connect to.
     */
    currentWorldId?: number;
}

export class IdLoginReturnPacket extends Packet {
    static RAKNET_ID = RakNetMessageId.ID_LOGIN_RETURN;

    status: LoginReturnStatus;
    playerId: number;
    accountType: AccountType;
    isFullAccount: boolean;
    hasCharFlags: boolean;
    clientVersion: number;
    isBanned: boolean;
    banLength: string;
    banReason: string;
    worldIDs: number[];
    factionMOTD: string;
    apartment: ApartmentData | null;
    defaultWorldId: number;
    currentWorldId: number;

    constructor(data: IdLoginReturnData) {
        super();
        this.status = data.status;
        this.playerId = data.playerId;
        this.accountType = data.accountType ?? AccountType.FREE;
        this.isFullAccount = data.isFullAccount ?? false;
        this.hasCharFlags = data.hasCharFlags ?? false;
        this.clientVersion = data.clientVersion ?? 0;
        this.isBanned = data.isBanned ?? false;
        this.banLength = data.banLength ?? '';
        this.banReason = data.banReason ?? '';
        this.worldIDs = data.worldIDs ?? [];
        this.factionMOTD = data.factionMOTD ?? '';
        this.apartment = data.apartment ?? null;
        this.defaultWorldId = data.defaultWorldId ?? 1;
        this.currentWorldId = data.currentWorldId ?? 1;
    }

    encode(): Buffer {
        const bs = new NativeBitStream();
        try {
            bs.writeU8(RakNetMessageId.ID_LOGIN_RETURN);
            bs.writeCompressedU8(this.status & 0xff);
            bs.writeCompressedU32(this.playerId >>> 0);

            if (this.playerId !== 0) {
                bs.writeCompressedU8(this.accountType & 0xff);
                bs.writeBit(this.isFullAccount);
                bs.writeBit(this.hasCharFlags);
                bs.writeCompressedU16(this.clientVersion & 0xffff);
                bs.writeBit(this.isBanned);

                if (this.isBanned) {
                    encodeString(this.banLength, bs, 2048, 0);
                    encodeString(this.banReason, bs, 2048, 0);
                }

                bs.writeCompressedU8(this.worldIDs.length & 0xff);
                for (const worldId of this.worldIDs) {
                    bs.writeCompressedU32(worldId >>> 0);
                }

                encodeString(this.factionMOTD, bs, 2048, 0);
                this.writeApartment(bs, this.apartment);
                bs.writeCompressedU8(this.defaultWorldId & 0xff);
                bs.writeCompressedU8(this.currentWorldId & 0xff);
            }

            return bs.getData();
        } finally {
            bs.destroy();
        }
    }

    private writeApartment(bs: NativeBitStream, apt: ApartmentData | null): void {
        bs.writeCompressedU32(apt?.id ?? 0);
        bs.writeCompressedU8(apt?.type ?? 0);
        bs.writeCompressedU32(apt?.ownerPlayerID ?? 0);
        bs.writeCompressedU32(apt?.ownerFactionID ?? 0);

        const ranks = apt?.allowedRanks ?? [];
        bs.writeCompressedU8(ranks.length & 0xff);
        for (const rank of ranks) {
            bs.writeCompressedU8(rank.rankID & 0xff);
            bs.writeBit(rank.allowed);
        }

        bs.writeBit(apt?.isOpen ?? false);
        encodeString(apt?.ownerName ?? '', bs, 2048, 0);
        encodeString(apt?.entryCode ?? '', bs, 2048, 0);

        bs.writeCompressedU16(apt?.storageCapacity ?? 0);
        bs.writeCompressedU32(apt?.storageField14 ?? 0);
        bs.writeCompressedU32(apt?.storageField18 ?? 0);
        bs.writeCompressedU32(apt?.storageField1C ?? 0);
        // Client expects a full ItemList when count > 0; keep 0 until ItemList is implemented.
        bs.writeCompressedU16(0);

        bs.writeBit(apt?.hasPublicInfo ?? false);
        bs.writeCompressedU32(apt?.entryPrice ?? 0);
        encodeString(apt?.publicName ?? '', bs, 2048, 0);
        encodeString(apt?.publicDescription ?? '', bs, 2048, 0);

        const factions = apt?.allowedFactions ?? new Map();
        bs.writeCompressedU32(factions.size);
        for (const [factionId, factionName] of factions) {
            bs.writeCompressedU32(factionId >>> 0);
            encodeString(factionName, bs, 2048, 0);
        }

        bs.writeBit(apt?.isDefault ?? false);
        bs.writeBit(apt?.isFeatured ?? false);
        bs.writeCompressedU32(apt?.occupancy ?? 0);
    }

    static decode(_buffer: Buffer): IdLoginReturnPacket {
        throw new Error('IdLoginReturnPacket decode not implemented');
    }

    static createMinimal(status: LoginReturnStatus, playerId: number): IdLoginReturnPacket {
        return new IdLoginReturnPacket({ status, playerId });
    }

    static createSuccess(playerId: number, clientVersion: number): IdLoginReturnPacket {
        return new IdLoginReturnPacket({
            status: LoginReturnStatus.SUCCESS,
            playerId,
            accountType: AccountType.FREE,
            clientVersion,
        });
    }

    toString(): string {
        const statusName = LoginReturnStatus[this.status] ?? this.status;
        const accountTypeName = AccountType[this.accountType] ?? this.accountType;
        const worldIds = this.worldIDs.join(', ');
        const apartmentStr = this.apartment ? `ApartmentData { id: ${this.apartment.id}, type: ${ApartmentType[this.apartment.type] ?? this.apartment.type} }` : 'null';
        return `IdLoginReturnPacket { status: ${statusName}, playerId: ${this.playerId}, accountType: ${accountTypeName}, clientVersion: ${this.clientVersion}, isBanned: ${this.isBanned}, worldIDs: [${worldIds}], defaultWorldId: ${this.defaultWorldId}, currentWorldId: ${this.currentWorldId}, apartment: ${apartmentStr} }`;
    }
}
