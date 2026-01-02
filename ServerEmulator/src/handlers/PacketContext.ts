import { Connection } from '../network/Connection';
import { BitStreamReader } from '../protocol/BitStream';

export interface PacketContext {
    connection: Connection;
    data: Buffer;
    reader: BitStreamReader;
}

export interface ConnectionRequestInfo {
    requestType: number;
    password: string;
    timestamp: number;
    passwordValid: boolean;
}
