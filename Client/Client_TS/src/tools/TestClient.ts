import * as dgram from 'dgram';
import os from 'os';
import path from 'path';
import {
  RakPeer,
  RakPriority,
  RakReliability,
  NativeBitStream,
  addressFromString,
  addressToIp,
  addressToString,
  decodeString,
  type RakSystemAddress,
} from '@openfom/networking';
import { BitStreamReader, BitStreamWriter } from '../utils/BitStream';
import {
  DEFAULT_PORT,
  LithTechMessageId,
  RakNetMessageId,
  SEQUENCE_MASK,
  WORLD_SERVER_PASSWORD,
} from '../protocol/Constants';
import {
  buildLoginAuth,
  buildLoginAuthSession,
  buildLoginRequest,
  buildRegisterClient,
  buildWorldHeartbeat,
  buildWorldLogin,
} from '../protocol/FoMPacketBuilder';
import type { LoginAuthOptions } from '../protocol/FoMPacketBuilder';
import { PacketDirection, PacketLogger } from '../utils/PacketLogger';
import {
  loadEnvCandidates,
  parseBool,
  parseConsoleMode,
  parseFlushMode,
  parsePacketIds,
} from '../config/ConfigLoader';

const MOVEMENT_REPLAY_PACKETS_HEX = [
  // 2026.01.16-23.43.43:426
  '40 00 00 00 00 7d 1a 3e 80 00 00 29 58 80 00 00' +
    ' 1f 40 00 00 21 10 19 00 00 00 00 01 f4 68 fa 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 44 0c 80 00 00 08 00',
  // 2026.01.16-23.43.43:494
  '40 00 00 00 00 7d 1a 4f 80 00 00 29 98 80 00 00' +
    ' 1f 80 00 00 20 c0 19 00 00 00 00 01 f4 69 3d 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 00 00 01 00',
  // 2026.01.16-23.43.44:167
  '40 00 00 00 00 7d 1a f7 c0 00 00 2a 18 80 00 00' +
    ' 1f c0 00 00 20 c0 19 00 00 00 00 01 f4 6b df 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 00 00 01 00',
  // 2026.01.16-23.43.44:832
  '40 00 00 00 00 7d 1b 9e 40 00 00 2a 58 80 00 00' +
    ' 20 00 00 00 20 c0 19 00 00 00 00 01 f4 6e 79 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 00 00 01 00',
  // 2026.01.16-23.43.45:499
  '40 00 00 00 00 7d 1c 44 c0 00 00 2b 18 80 00 00' +
    ' 20 40 00 00 20 c0 19 00 00 00 00 01 f4 71 13 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 00 00 01 00',
  // 2026.01.16-23.43.46:165
  '40 00 00 00 00 7d 1c eb 40 00 00 2b 58 80 00 00' +
    ' 20 80 00 00 20 c0 19 00 00 00 00 01 f4 73 ad 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 00 00 01 00',
  // 2026.01.16-23.43.46:831
  '40 00 00 00 00 7d 1d 91 c0 00 00 2b 98 80 00 00' +
    ' 20 c0 00 00 20 c0 19 00 00 00 00 01 f4 76 46 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 00 00 01 00',
  // 2026.01.16-23.43.47:021
  '40 00 00 00 00 7d 1d c1 00 00 00 2c 58 80 00 00' +
    ' 21 00 00 00 20 c0 19 00 00 00 00 01 f4 77 02 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 80 00 01 00',
  // 2026.01.16-23.43.47:685
  '40 00 00 00 00 7d 1e 67 40 00 00 2c 98 80 00 00' +
    ' 21 40 00 00 20 c0 19 00 00 00 00 01 f4 79 9d 7e' +
    ' 88 78 0b 4a e8 3b c8 94 a6 24 3c 00 00 00 00 20' +
    ' 6b 80 17 8b ec a8 3a 1d 80 00 00 00 00 00 01 51' +
    ' 41 02 4b 0a 09 2c 00 1d 20 36 29 a2 00 0f e3 62' +
    ' 20 66 01 90 80 00 01 00',
  // 2026.01.16-23.41.53:445 (SMSG_LOADWORLD inside packet group)
  '40 00 00 00 00 7c ae d5 c0 00 00 00 50 00 00 00' +
    ' 90 00 00 00 00 00 01 f2 bb 4d 00 00 00 02 40 00' +
    ' 00 04 40 03 00 00 00 00 01 f2 bb 43 00 00 00 00' +
    ' 01 f2 bb 4d 00 00 00 03 40 00 00 04 40 03 00 00' +
    ' 00 00 01 f2 bb 43 00 00 00 00 01 f2 bb 4e 00 00' +
    ' 00 04 40 00 00 02 40 00 00 00 00 00 01 f2 bb 4e' +
    ' 00 00 00 05 40 00 00 07 40 0e 48 04 07 00 00 00' +
    ' 00 00 00 00 20 0c 00 00 00 18 07 00 00 38 06 00' +
    ' 00 00 00 10 00 00',
  // 2026.01.17-19.04.21:789 (SMSG_LOADWORLD inside packet group)
  '40 00 00 00 00 39 9a 51 40 00 00 00 50 00 00 00' +
    ' 90 00 00 00 00 00 00 e6 69 3b 00 00 00 02 40 00' +
    ' 00 04 40 03 00 00 00 00 00 e6 69 31 00 00 00 00' +
    ' 00 e6 69 3b 00 00 00 03 40 00 00 04 40 03 00 00' +
    ' 00 00 00 e6 69 31 00 00 00 00 00 e6 69 3b 00 00' +
    ' 00 04 40 00 00 02 40 00 00 00 00 00 00 e6 69 3b' +
    ' 00 00 00 05 40 00 00 07 40 0e 48 04 07 00 00 00' +
    ' 00 00 00 00 20 0c 00 00 00 18 07 00 00 38 06 00' +
    ' 00 00 00 01 00 00',
  // 2026.01.17-19.05.49:624 (REGISTER_CLIENT_RETURN mis-ID)
  '40 00 00 00 00 39 f0 13 c0 00 00 02 10 00 00 0a' +
    ' 60 79 88 00 00 00 06 38 78 78 78 60 00 00 0c 3c' +
    ' 3c 3c 30 c3 0c 30 0e c0 00 00 00 00 00 00 a8 a0' +
    ' 81 25 85 04 96 00 0e 90 1b 14 d1 00 07 f1 b1 10' +
    ' 00 00 01 f4 00 00 09 c4 00 00 00 7d 00 00 00 3e' +
    ' 80 00 01 38 87 87 87 87 87 87 80 00 00 0c 83 c3' +
    ' c3 c3 c3 c3 c3 c3 c3 c3 c0 00 00 00 07 e1 e0 00' +
    ' 00 00 2b 00 00 00 32 78 78 78 78 78 78 78 78 78' +
    ' 78 78 78 78 00 00 01 13 3c 3c 3c 3c 00 00 00 96' +
    ' 00 00 02 71 0f 0f 0f 0f 0f 0f 0f 07 87 87 87 84' +
    ' e1 87 0c 30 00 78 78 30 f0 00 3c 21 08 43 c3 c3' +
    ' 0c 30 00 3c 3c 3c 00',
  // 2026.01.17-03.31.31:783 (CMSG_CONNECTSTAGE stage=0)
  '40 00 00 00 00 b1 3e 40 00 00 00 02 d0 00 00 00' +
    ' 90 00 00 00 00 00 02 c4 f9 00',
  // 2026.01.17-03.31.31:810 (CMSG_CONNECTSTAGE stage=0)
  '40 00 00 00 00 b1 3e 46 40 00 00 01 d0 00 00 00' +
    ' 90 00 00 00 00 00 02 c4 f9 19',
  // 2026.01.17-03.47.15:590 (CMSG_CONNECTSTAGE stage=0)
  '40 00 00 00 00 b4 d7 ee 80 00 00 02 d0 00 00 00' +
    ' 90 00 00 00 00 00 02 d3 5f ba',
  // 2026.01.17-03.47.15:632 (CMSG_CONNECTSTAGE stage=0)
  '40 00 00 00 00 b4 d7 f8 00 00 00 01 90 00 00 00' +
    ' 90 00 00 00 00 00 02 d3 5f e0',
  // 2026.01.18-15.53.36:605 (Missing connection, observed)
  '40 00 00 00 00 07 21 3d 40 00 00 02 10 00 00 00',
  // 2026.01.18-15.53.36:687 (Missing connection, observed)
  '40 00 00 00 00 07 21 52 00 00 00 02 10 00 00 00',
  // Missing connection (synthetic variation)
  '40 00 00 00 00 07 22 3d 40 00 00 02 10 00 00 00',
  // Missing connection (synthetic variation)
  '40 00 00 00 00 07 23 3d 40 00 00 02 10 00 00 00',
  // 2026.01.18-21.55.57:935 (ID_INTERNAL_PING)
  '40 00 00 00 00 5a 11 02 00 00 00 02 d0 00 00 00' +
    ' 90 00 00 00 00 00 01 68 44 08',
  // 2026.01.18-21.56.12:919 (ID_INTERNAL_PING)
  '40 00 00 00 00 5a 1f a3 00 00 00 04 50 00 00 00' +
    ' 90 00 00 00 00 00 01 68 7e 8c',
  // 2026.01.18-21.56.17:931 (ID_INTERNAL_PING)
  '40 00 00 00 00 5a 24 87 00 00 00 04 d0 00 00 00' +
    ' 90 00 00 00 00 00 01 68 92 1c',
  // 2026.01.18-21.55.38:522 (ACK)
  '80 00 00 00 00 b3 fc 15 80 00 00 00 60 00 00 00 00',
  // 2026.01.18-21.55.38:549 (ACK)
  '80 00 00 00 00 b3 fc 1f 80 00 00 00 40 00 00 00 20 00 00 00 80',
  // 2026.01.18-21.55.39:063 (ACK)
  '80 00 00 00 00 b3 fd 23 80 00 00 00 60 00 00 00 c0',
  // 2026.01.18-23.51.xx (World Disconnect: ID_PING / 0x01)
  '40 00 00 00 00 74 92 3f c0 00 00 2e d0 00 00 00' +
    ' 90 00 00 00 00 00 01 d2 43 aa',
  // 2026.01.18-23.51.xx (World Disconnect: ID_PING / 0x01)
  '40 00 00 00 00 74 92 4f 80 00 00 2e d0 00 00 00' +
    ' 90 00 00 00 00 00 01 d2 43 aa',
  // 2026.01.18-23.51.xx (World Disconnect: ID_PING / 0x01)
  '40 00 00 00 00 74 92 5f 00 00 00 2e d0 00 00 00' +
    ' 90 00 00 00 00 00 01 d2 43 aa',
];

const MOVEMENT_REPLAY_CADENCE_MS = [68, 673, 665, 667, 666, 666, 666, 190, 664];

const parseHexPacket = (value: string): Buffer => {
  const cleaned = value.replace(/[^a-fA-F0-9]/g, '');
  if (cleaned.length === 0 || cleaned.length % 2 !== 0) {
    throw new Error('Replay packet hex must be even-length and non-empty.');
  }
  return Buffer.from(cleaned, 'hex');
};

const MOVEMENT_REPLAY_PACKETS = MOVEMENT_REPLAY_PACKETS_HEX.map(parseHexPacket);

class TestClient {
  private masterPeer: RakPeer;
  private masterAddress: RakSystemAddress;
  private masterPollTimer?: NodeJS.Timeout;
  private masterConnected: boolean;
  private serverAddress: string;
  private serverPort: number;
  private packetLogger: PacketLogger;
  private connectionId: number;
  private loginAuthEnabled: boolean;
  private loginAuthUsername: string;
  private loginAuthPasswordHash: string;
  private loginAuthLoginToken: string;
  private loginAuthMacAddress: string;
  private loginAuthComputerName: string;
  private loginAuthDriveModels: string[];
  private loginAuthDriveSerials: string[];
  private loginAuthFileCRCs: [number, number, number];
  private loginAuthSteamTicket?: Buffer;
  private loginAuthSteamTicketLength?: number;
  private loginAuthSent: boolean;
  private loginAuthPass: string;
  private pendingLoginRequest?: { username: string; clientVersion: number };
  private pendingLoginAuth?: LoginAuthOptions;
  private worldLoginWorldId: number;
  private worldLoginWorldInst: number;
  private worldLoginPlayerId: number;
  private worldLoginWorldConst: number;
  private worldLoginTarget?: { address: string; port: number };
  private worldLoginPending: boolean;
  private worldLoginLastSelectKey?: string;
  private worldLoginRetryTimer?: NodeJS.Timeout;
  private worldPeer?: RakPeer;
  private worldAddress?: RakSystemAddress;
  private worldPollTimer?: NodeJS.Timeout;
  private worldConnected: boolean;
  private worldConnectionId: number;
  private worldConnectActive: boolean;
  private worldLoginSentToWorld: boolean;
  private worldLithOutSeq: number;
  private worldConnectStageMask: number;
  private worldHeartbeatTimer?: NodeJS.Timeout;
  private worldHeartbeatIntervalMs: number;
  private worldHeartbeatPayloadBytes: number;
  private worldRegisterSessionId: number;
  private worldRegisterSent: boolean;
  private worldYourId: number | null;
  private worldClientObjectId: number | null;
  private worldNetProtocol: { version: number; extra: number } | null;
  private worldUnguaranteedLog: boolean;
  private worldUnguaranteedLogIntervalMs: number;
  private worldUnguaranteedLogLast: number;
  private worldReplayEnabled: boolean;
  private worldReplayIntervalMs: number;
  private worldReplayLoopDelayMs: number;
  private worldReplayCadenceMs: number[];
  private worldReplayIndex: number;
  private worldReplayTimer?: NodeJS.Timeout;
  private worldReplaySocket?: dgram.Socket;
  private worldReplaySourcePort: number;
  private worldReplayPackets: Buffer[];
  private probePending: boolean;
  private probeTarget: 'master' | 'world';
  private probeIds: number[];
  private probePayloadBytes: number;

  constructor(
    serverAddress: string,
    serverPort: number,
    packetLogger: PacketLogger,
    connectionId: number = 1,
    loginAuth?: {
      enabled: boolean;
      username?: string;
      password?: string;
      passwordHash?: string;
      loginToken?: string;
      macAddress?: string;
      computerName?: string;
      driveModels?: string[];
      driveSerialNumbers?: string[];
      fileCRCs?: [number, number, number];
      steamTicket?: Buffer;
      steamTicketLength?: number;
    },
    worldLogin?: {
      worldId?: number;
      worldInst?: number;
      playerId?: number;
      worldConst?: number;
    },
    worldNet?: {
      connectionId?: number;
      heartbeatIntervalMs?: number;
      heartbeatPayloadBytes?: number;
      sessionId?: number;
    },
    worldReplay?: {
      enabled?: boolean;
      intervalMs?: number;
      loopDelayMs?: number;
      cadenceMs?: number[];
      sourcePort?: number;
    },
  ) {
    this.masterPeer = new RakPeer();
    this.masterPeer.startup(1, 0, 0);
    this.masterAddress = addressFromString(serverAddress, serverPort);
    this.masterConnected = false;
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
    this.packetLogger = packetLogger;
    this.connectionId = connectionId;
    this.loginAuthEnabled = loginAuth?.enabled ?? false;
    this.loginAuthUsername = loginAuth?.username ?? '';
    this.loginAuthPasswordHash = loginAuth?.passwordHash ?? '';
    this.loginAuthLoginToken = loginAuth?.loginToken ?? '';
    this.loginAuthMacAddress = loginAuth?.macAddress ?? '';
    this.loginAuthComputerName = loginAuth?.computerName ?? '';
    this.loginAuthDriveModels = loginAuth?.driveModels ?? [];
    this.loginAuthDriveSerials = loginAuth?.driveSerialNumbers ?? [];
    this.loginAuthFileCRCs = loginAuth?.fileCRCs ?? [0, 0, 0];
    this.loginAuthSteamTicket = loginAuth?.steamTicket;
    this.loginAuthSteamTicketLength = loginAuth?.steamTicketLength;
    this.loginAuthSent = false;
    this.loginAuthPass = loginAuth?.password ?? '';
    this.pendingLoginRequest = undefined;
    this.pendingLoginAuth = undefined;
    this.worldLoginWorldId = worldLogin?.worldId ?? 0;
    this.worldLoginWorldInst = worldLogin?.worldInst ?? 0;
    this.worldLoginPlayerId = worldLogin?.playerId ?? 0;
    this.worldLoginWorldConst = worldLogin?.worldConst ?? 0x13bc52;
    this.worldLoginPending = false;
    this.worldConnectionId = worldNet?.connectionId ?? (this.connectionId + 1);
    this.worldConnectActive = false;
    this.worldLoginSentToWorld = false;
    this.worldConnected = false;
    this.worldLithOutSeq = 0;
    this.worldConnectStageMask = 0;
    const heartbeatIntervalEnv = parseInt(
      process.env.WORLD_HEARTBEAT_MS ??
        process.env.FOM_WORLD_HEARTBEAT_MS ??
        '10000',
      10,
    );
    const heartbeatBytesEnv = parseInt(
      process.env.WORLD_HEARTBEAT_BYTES ??
        process.env.FOM_WORLD_HEARTBEAT_BYTES ??
        '35',
      10,
    );
    const sessionIdEnv = parseInt(
      process.env.WORLD_SESSION_ID ??
        process.env.FOM_WORLD_SESSION_ID ??
        '0',
      10,
    );
    const heartbeatInterval =
      worldNet?.heartbeatIntervalMs ?? (Number.isFinite(heartbeatIntervalEnv) ? heartbeatIntervalEnv : 10000);
    const heartbeatBytes =
      worldNet?.heartbeatPayloadBytes ?? (Number.isFinite(heartbeatBytesEnv) ? heartbeatBytesEnv : 35);
    const sessionId =
      worldNet?.sessionId ?? (Number.isFinite(sessionIdEnv) ? sessionIdEnv : 0);
    this.worldHeartbeatIntervalMs = Math.max(0, heartbeatInterval || 0);
    this.worldHeartbeatPayloadBytes = Math.max(1, heartbeatBytes || 1);
    this.worldRegisterSessionId = Math.max(0, sessionId || 0);
    this.worldRegisterSent = false;
    this.worldYourId = null;
    this.worldClientObjectId = null;
    this.worldNetProtocol = null;
    this.worldUnguaranteedLog = parseBool(
      process.env.WORLD_UNGUARANTEED_LOG ?? process.env.FOM_LOG_UNGUARANTEED,
      false,
    );
    this.worldUnguaranteedLogIntervalMs = Math.max(
      0,
      parseInt(
        process.env.WORLD_UNGUARANTEED_LOG_MS ??
          process.env.FOM_LOG_UNGUARANTEED_MS ??
          '5000',
        10,
      ) || 5000,
    );
    this.worldUnguaranteedLogLast = 0;
    this.worldReplayEnabled = worldReplay?.enabled ?? false;
    this.worldReplayIntervalMs = Math.max(0, worldReplay?.intervalMs ?? 0);
    this.worldReplayLoopDelayMs = Math.max(0, worldReplay?.loopDelayMs ?? 0);
    this.worldReplayCadenceMs = worldReplay?.cadenceMs ?? MOVEMENT_REPLAY_CADENCE_MS;
    this.worldReplayIndex = 0;
    this.worldReplaySourcePort = Math.max(0, worldReplay?.sourcePort ?? 0);
    this.worldReplayPackets = MOVEMENT_REPLAY_PACKETS;
    this.probePending = false;
    this.probeTarget = 'master';
    this.probeIds = [];
    this.probePayloadBytes = 0;

    this.masterPollTimer = setInterval(() => {
      this.pollMasterPeer();
    }, 10);
  }

  private logIncoming(data: Buffer, address: string, port: number, connectionId: number): void {
    const incoming = {
      timestamp: new Date(),
      direction: PacketDirection.INCOMING,
      address,
      port,
      data,
      connectionId,
    };
    const logged = this.packetLogger.log(incoming);
    this.packetLogger.logAnalysis(incoming, logged);
  }

  private logOutgoing(data: Buffer, address: string, port: number, connectionId: number = this.connectionId): void {
    const outgoing = {
      timestamp: new Date(),
      direction: PacketDirection.OUTGOING,
      address,
      port,
      data,
      connectionId,
    };
    const logged = this.packetLogger.log(outgoing);
    this.packetLogger.logAnalysis(outgoing, logged);
  }

  private sendPacket(
    peer: RakPeer,
    address: RakSystemAddress,
    data: Buffer,
    connectionId: number,
    priority: RakPriority = RakPriority.HIGH,
    reliability: RakReliability = RakReliability.RELIABLE,
  ): void {
    const ip = addressToIp(address);
    this.logOutgoing(data, ip, address.port, connectionId);
    const ok = peer.send(
      data,
      priority,
      reliability,
      0,
      address,
      false,
    );
    if (!ok) {
      const addr = addressToString(address);
      PacketLogger.globalNote(`[Send] failed to ${addr} len=${data.length}`, true);
    }
  }

  private pollMasterPeer(): void {
    let packet = this.masterPeer.receive();
    while (packet) {
      const data = Buffer.from(packet.data);
      const ip = addressToIp(packet.systemAddress);
      this.logIncoming(data, ip, packet.systemAddress.port, this.connectionId);
      this.handleMasterMessage(data, packet.systemAddress);
      packet = this.masterPeer.receive();
    }
  }

  private pollWorldPeer(): void {
    if (!this.worldPeer) return;
    let packet = this.worldPeer.receive();
    while (packet) {
      const data = Buffer.from(packet.data);
      const ip = addressToIp(packet.systemAddress);
      this.logIncoming(data, ip, packet.systemAddress.port, this.worldConnectionId);
      this.handleWorldMessage(data, packet.systemAddress);
      packet = this.worldPeer.receive();
    }
  }

  private handleMasterMessage(data: Buffer, address: RakSystemAddress): void {
    if (data.length === 0) return;
    const msgId = data[0];

    if (
      msgId === RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED ||
      msgId === RakNetMessageId.ID_NEW_INCOMING_CONNECTION
    ) {
      if (!this.masterConnected) {
        this.masterConnected = true;
        this.masterAddress = address;
        this.serverAddress = addressToIp(address);
        this.serverPort = address.port;
        PacketLogger.globalNote(`[Master] Connected ${addressToString(address)}`, true);
      }
      if (this.pendingLoginRequest) {
        const pending = this.pendingLoginRequest;
        this.pendingLoginRequest = undefined;
        this.sendLoginRequest(pending);
      }
      if (this.pendingLoginAuth) {
        const pending = this.pendingLoginAuth;
        this.pendingLoginAuth = undefined;
        this.sendLoginAuth(pending);
      }
      if (this.worldLoginPending) {
        this.sendWorldLogin();
      }
      if (this.probePending && this.probeTarget === 'master') {
        this.sendProbePackets('master');
      }
      return;
    }

    if (
      msgId === RakNetMessageId.ID_CONNECTION_ATTEMPT_FAILED ||
      msgId === RakNetMessageId.ID_CONNECTION_LOST ||
      msgId === RakNetMessageId.ID_DISCONNECTION_NOTIFICATION
    ) {
      this.masterConnected = false;
      const addr = addressToString(address);
      PacketLogger.globalNote(`[Master] Disconnected msg=0x${msgId.toString(16)} ${addr}`, true);
      return;
    }

    this.tryAutoLoginAuth(data);
    this.tryAutoWorldLogin(data);
  }

  private hexDump(buffer: Buffer): void {
    const bytesPerLine = 16;
    for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
      const slice = buffer.subarray(offset, Math.min(offset + bytesPerLine, buffer.length));
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(slice).map(b => (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : '.').join('');
      console.log(`  ${offset.toString(16).padStart(4, '0')}  ${hex.padEnd(47)}  |${ascii}|`);
    }
  }

  private decodeLoginRequestReturnPayload(inner: Buffer): { status: number; username: string } | null {
    if (!inner || inner.length === 0) return null;
    try {
      const stream = new NativeBitStream(inner, true);
      let packetId = stream.readU8();
      if (packetId === RakNetMessageId.ID_TIMESTAMP) {
        stream.readBytes(8);
        packetId = stream.readU8();
      }
      if (packetId !== RakNetMessageId.ID_LOGIN_REQUEST_RETURN) return null;

      const status = stream.readCompressedU8() & 0xff;
      const username = decodeString(stream, 2048);
      return { status, username };
    } catch {
      return null;
    }
  }

  private decodeLoginRequestReturn(data: Buffer): { status: number; username: string } | null {
    return this.decodeLoginRequestReturnPayload(data);
  }

  private decodeLoginReturnPayload(
    inner: Buffer,
  ): { status: number; playerId: number; worldIds: number[]; defaultWorldId: number; currentWorldId: number } | null {
    if (!inner || inner.length === 0) return null;
    try {
      const stream = new NativeBitStream(inner, true);
      let packetId = stream.readU8();
      if (packetId === RakNetMessageId.ID_TIMESTAMP) {
        stream.readBytes(8);
        packetId = stream.readU8();
      }
      if (packetId !== RakNetMessageId.ID_LOGIN_RETURN) return null;

      const status = stream.readCompressedU8() & 0xff;
      const playerId = this.readCompressedUInt(stream, 4);
      const worldIds: number[] = [];
      let defaultWorldId = 0;
      let currentWorldId = 0;
      if (playerId !== 0) {
        // Align with server IdLoginReturnPacket.encode() to keep stream sync.
        stream.readCompressedU8(); // accountType
        stream.readBit(); // isFullAccount
        stream.readBit(); // hasCharFlags
        stream.readCompressedU16(); // clientVersion
        const isBanned = stream.readBit();
        if (isBanned) {
          decodeString(stream, 2048);
          decodeString(stream, 2048);
        }
        const worldCount = stream.readCompressedU8() & 0xff;
        for (let i = 0; i < worldCount; i += 1) {
          worldIds.push(stream.readCompressedU32() >>> 0);
        }
        decodeString(stream, 2048); // factionMOTD
        this.skipApartmentPayload(stream);
        defaultWorldId = stream.readCompressedU8() & 0xff;
        currentWorldId = stream.readCompressedU8() & 0xff;
      }
      return { status, playerId, worldIds, defaultWorldId, currentWorldId };
    } catch {
      return null;
    }
  }

  private decodeLoginReturn(
    data: Buffer,
  ): { status: number; playerId: number; worldIds: number[]; defaultWorldId: number; currentWorldId: number } | null {
    return this.decodeLoginReturnPayload(data);
  }

  private skipApartmentPayload(stream: NativeBitStream): void {
    stream.readCompressedU32(); // id
    stream.readCompressedU8(); // type
    stream.readCompressedU32(); // ownerPlayerID
    stream.readCompressedU32(); // ownerFactionID
    const ranks = stream.readCompressedU8() & 0xff;
    for (let i = 0; i < ranks; i += 1) {
      stream.readCompressedU8(); // rankID
      stream.readBit(); // allowed
    }
    stream.readBit(); // isOpen
    decodeString(stream, 2048); // ownerName
    decodeString(stream, 2048); // entryCode
    stream.readCompressedU16(); // storageCapacity
    stream.readCompressedU32(); // storageField14
    stream.readCompressedU32(); // storageField18
    stream.readCompressedU32(); // storageField1C
    stream.readCompressedU16(); // storageItemCount
    stream.readBit(); // hasPublicInfo
    stream.readCompressedU32(); // entryPrice
    decodeString(stream, 2048); // publicName
    decodeString(stream, 2048); // publicDescription
    const factions = stream.readCompressedU32() >>> 0;
    for (let i = 0; i < factions; i += 1) {
      stream.readCompressedU32(); // factionId
      decodeString(stream, 2048); // factionName
    }
    stream.readBit(); // isDefault
    stream.readBit(); // isFeatured
    stream.readCompressedU32(); // occupancy
  }

  private readCompressedUInt(stream: NativeBitStream, size: number): number {
    switch (size) {
      case 1:
        return stream.readCompressedU8() >>> 0;
      case 2:
        return stream.readCompressedU16() >>> 0;
      case 4:
        return stream.readCompressedU32() >>> 0;
      default:
        throw new Error(`Unsupported compressed int size ${size}`);
    }
  }

  private ipv4FromU32LE(value: number): string {
    const b0 = value & 0xff;
    const b1 = (value >>> 8) & 0xff;
    const b2 = (value >>> 16) & 0xff;
    const b3 = (value >>> 24) & 0xff;
    return `${b0}.${b1}.${b2}.${b3}`;
  }

  private decodeWorldSelect(data: Buffer): { subId: number; playerId: number; worldId?: number; worldInst?: number } | null {
    if (!data || data.length === 0) return null;
    const stream = new NativeBitStream(data, true);
    let packetId = stream.readU8();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      stream.readBytes(8);
      packetId = stream.readU8();
    }
    if (packetId !== 0x7b) return null;

    const playerId = this.readCompressedUInt(stream, 4);
    const subId = this.readCompressedUInt(stream, 1) & 0xff;
    if (subId === 4 || subId === 7) {
      const worldId = this.readCompressedUInt(stream, 1) & 0xff;
      const worldInst = this.readCompressedUInt(stream, 1) & 0xff;
      return { subId, playerId, worldId, worldInst };
    }
    return { subId, playerId };
  }

  private decodeWorldLoginReturn(data: Buffer): { code: number; flag: number; worldIp: string; worldPort: number } | null {
    if (!data || data.length === 0) return null;
    const stream = new NativeBitStream(data, true);
    let packetId = stream.readU8();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      stream.readBytes(8);
      packetId = stream.readU8();
    }
    if (packetId !== RakNetMessageId.ID_WORLD_LOGIN_RETURN) return null;

    const code = this.readCompressedUInt(stream, 1) & 0xff;
    const flag = this.readCompressedUInt(stream, 1) & 0xff;
    const worldIpU32 = this.readCompressedUInt(stream, 4);
    const worldPort = this.readCompressedUInt(stream, 2) & 0xffff;
    const worldIp = this.ipv4FromU32LE(worldIpU32);
    return { code, flag, worldIp, worldPort };
  }

  private decodeRegisterClientReturn(data: Buffer): { worldId: number; playerId: number; returnCode: number } | null {
    if (!data || data.length === 0) return null;
    const stream = new NativeBitStream(data, true);
    let packetId = stream.readU8();
    if (packetId === RakNetMessageId.ID_TIMESTAMP) {
      stream.readBytes(8);
      packetId = stream.readU8();
    }
    if (packetId !== RakNetMessageId.ID_REGISTER_CLIENT_RETURN) return null;
    const worldId = this.readCompressedUInt(stream, 1) & 0xff;
    const playerId = this.readCompressedUInt(stream, 4);
    const returnCode = this.readCompressedUInt(stream, 1) & 0xff;
    return { worldId, playerId, returnCode };
  }

  private readLithSizeIndicator(reader: BitStreamReader): number {
    let result = reader.readBits(7);
    const above7f = reader.readBool();
    if (!above7f) return result;
    result |= reader.readBits(3) << 7;
    const above7 = reader.readBool();
    if (!above7) return result;
    let mask = 1 << 10;
    do {
      if (reader.readBool()) {
        result |= mask;
      }
      mask <<= 1;
    } while (reader.readBool());
    return result >>> 0;
  }

  private readLithBitsToBuffer(reader: BitStreamReader, bits: number): Buffer {
    const bytes = Buffer.alloc(Math.ceil(bits / 8));
    let remaining = bits;
    for (let i = 0; i < bytes.length; i += 1) {
      const take = Math.min(8, remaining);
      bytes[i] = take > 0 ? reader.readBits(take) : 0;
      remaining -= take;
    }
    return bytes;
  }

  private skipLithBits(reader: BitStreamReader, bits: number): void {
    let remaining = bits;
    while (remaining > 0) {
      const take = Math.min(32, remaining);
      reader.readBits(take);
      remaining -= take;
    }
  }

  private parseLithTechGuaranteedSubMessages(data: Buffer): Array<{ msgId: number; payload: Buffer; payloadBits: number }> {
    const messages: Array<{ msgId: number; payload: Buffer; payloadBits: number }> = [];
    if (data.length < 2) return messages;
    const reader = new BitStreamReader(data);
    reader.readBits(13); // sequence
    reader.readBits(1); // continuation
    let lastPacket = false;
    let safety = 0;
    const maxPackets = Math.max(4, data.length);

    while (!lastPacket && reader.remainingBits > 0 && safety < maxPackets) {
      safety += 1;
      const subBits = this.readLithSizeIndicator(reader);
      if (subBits === 0) {
        if (reader.remainingBits < 1) break;
        lastPacket = !reader.readBool();
        if (lastPacket) break;
        continue;
      }
      if (subBits < 8 || subBits > reader.remainingBits) break;
      const subStart = reader.position;
      const subReader = new BitStreamReader(data, subStart);
      const msgId = subReader.readBits(8);
      const payloadBits = Math.max(0, subBits - 8);
      const payload = payloadBits > 0 ? this.readLithBitsToBuffer(subReader, payloadBits) : Buffer.alloc(0);
      messages.push({ msgId, payload, payloadBits });
      this.skipLithBits(reader, subBits);
      if (reader.remainingBits < 1) break;
      lastPacket = !reader.readBool();
    }
    return messages;
  }

  private decodeLoadWorldPayload(payload: Buffer): { gameTime: number; worldId: number } | null {
    if (payload.length < 6) return null;
    const reader = new BitStreamReader(payload);
    const timeBytes = reader.readBytes(4);
    const gameTime = timeBytes.readFloatLE(0);
    const worldId = reader.readUInt16();
    return { gameTime, worldId };
  }

  private decodeUnguaranteedUpdatePayload(
    payload: Buffer,
  ): { terminator: boolean; flags: number; gameTime?: number } | null {
    const reader = new BitStreamReader(payload);
    if (reader.remainingBits < 20) return null;
    const objId = reader.readUInt16();
    const flags = reader.readBits(4);
    if (objId === 0xffff) {
      if (reader.remainingBits < 32) return { terminator: true, flags };
      const timeBytes = reader.readBytes(4);
      const gameTime = timeBytes.readFloatLE(0);
      return { terminator: true, flags, gameTime };
    }
    return { terminator: false, flags };
  }

  private shouldLogWorldUnguaranteed(now: number): boolean {
    if (!this.worldUnguaranteedLog) return false;
    if (this.worldUnguaranteedLogIntervalMs <= 0) return true;
    if (now - this.worldUnguaranteedLogLast < this.worldUnguaranteedLogIntervalMs) {
      return false;
    }
    this.worldUnguaranteedLogLast = now;
    return true;
  }

  private decodeNetProtocolPayload(payload: Buffer): { version: number; extra: number } | null {
    if (payload.length < 8) return null;
    const reader = new BitStreamReader(payload);
    const version = reader.readUInt32();
    const extra = reader.readUInt32();
    return { version, extra };
  }

  private decodeYourIdPayload(payload: Buffer): { id: number; flags: number } | null {
    if (payload.length < 3) return null;
    const reader = new BitStreamReader(payload);
    const id = reader.readUInt16();
    const flags = reader.readBits(8);
    return { id, flags };
  }

  private decodeClientObjectIdPayload(payload: Buffer): { id: number } | null {
    if (payload.length < 2) return null;
    const reader = new BitStreamReader(payload);
    const id = reader.readUInt16();
    return { id };
  }

  private writeLithBits(writer: BitStreamWriter, payload: Buffer, payloadBits: number): void {
    const reader = new BitStreamReader(payload);
    let remaining = payloadBits;
    while (remaining > 0) {
      const take = Math.min(32, remaining);
      writer.writeBits(reader.readBits(take), take);
      remaining -= take;
    }
  }

  private buildLithTechGuaranteedPacket(subMessages: Array<{ msgId: number; payload: Buffer; payloadBits: number }>): Buffer {
    const writer = new BitStreamWriter(128);
    const seq = this.worldLithOutSeq & SEQUENCE_MASK;
    this.worldLithOutSeq = (seq + 1) & SEQUENCE_MASK;
    writer.writeBits(seq, 13);
    writer.writeBits(0, 1); // no continuation
    for (let i = 0; i < subMessages.length; i += 1) {
      const msg = subMessages[i];
      const subBits = msg.payloadBits + 8;
      writer.writeBits(subBits, 8);
      writer.writeBits(msg.msgId & 0xff, 8);
      if (msg.payloadBits > 0) {
        this.writeLithBits(writer, msg.payload, msg.payloadBits);
      }
      const hasMore = i < subMessages.length - 1;
      writer.writeBits(hasMore ? 1 : 0, 1);
    }
    writer.writeBits(0, 8);
    const payload = writer.toBuffer();
    return Buffer.concat([Buffer.from([RakNetMessageId.ID_USER_PACKET_ENUM]), payload]);
  }

  private sendConnectStage(stage: number): void {
    if (!this.worldPeer || !this.worldAddress) return;
    const bit = 1 << (stage & 0x1f);
    if (this.worldConnectStageMask & bit) return;
    this.worldConnectStageMask |= bit;
    const payloadWriter = new BitStreamWriter(16);
    payloadWriter.writeBits(stage & 0xffff, 16);
    const payload = payloadWriter.toBuffer();
    const lith = this.buildLithTechGuaranteedPacket([
      { msgId: LithTechMessageId.MSG_CONNECTSTAGE, payload, payloadBits: 16 },
    ]);
    this.sendPacket(
      this.worldPeer,
      this.worldAddress,
      lith,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private startWorldHeartbeat(): void {
    if (!this.worldPeer || !this.worldAddress) return;
    if (this.worldHeartbeatIntervalMs <= 0) return;
    if (this.worldHeartbeatTimer) return;
    this.worldHeartbeatTimer = setInterval(() => {
      if (!this.worldPeer || !this.worldAddress) return;
      const heartbeat = buildWorldHeartbeat({
        sizeBytes: this.worldHeartbeatPayloadBytes,
        timestampMs: BigInt(Date.now()),
      });
      this.sendPacket(
        this.worldPeer,
        this.worldAddress,
        heartbeat,
        this.worldConnectionId,
        RakPriority.LOW,
        RakReliability.UNRELIABLE,
      );
    }, this.worldHeartbeatIntervalMs);
  }

  private initWorldReplaySocket(): void {
    if (this.worldReplaySocket) return;
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: this.worldReplaySourcePort > 0 });
    socket.on('error', (err) => {
      PacketLogger.globalNote(`[Replay] Socket error: ${err.message}`, true);
    });
    if (this.worldReplaySourcePort > 0) {
      socket.bind(this.worldReplaySourcePort);
    }
    this.worldReplaySocket = socket;
  }

  private scheduleWorldReplayNext(delayMs: number): void {
    if (this.worldReplayTimer) {
      clearTimeout(this.worldReplayTimer);
      this.worldReplayTimer = undefined;
    }
    this.worldReplayTimer = setTimeout(() => {
      this.worldReplayTimer = undefined;
      const lastIndex = this.sendWorldReplayPacket();
      const cadence = this.worldReplayCadenceMs;
      const fallback = this.worldReplayLoopDelayMs || this.worldReplayIntervalMs || 0;
      const nextDelay =
        this.worldReplayIntervalMs > 0
          ? this.worldReplayIntervalMs
          : (cadence[lastIndex] ?? fallback);
      this.scheduleWorldReplayNext(Math.max(0, nextDelay));
    }, Math.max(0, delayMs));
  }

  private startWorldReplay(): void {
    if (!this.worldReplayEnabled) return;
    if (!this.worldAddress) return;
    if (this.worldReplayTimer) return;
    if (!this.worldReplayPackets.length) return;
    this.initWorldReplaySocket();
    this.worldReplayIndex = 0;
    PacketLogger.globalNote(
      `[Replay] Starting movement replay packets=${this.worldReplayPackets.length}`,
      true,
    );
    if (this.worldReplayIntervalMs > 0) {
      this.worldReplayTimer = setInterval(() => {
        this.sendWorldReplayPacket();
      }, this.worldReplayIntervalMs);
      this.sendWorldReplayPacket();
      return;
    }
    this.scheduleWorldReplayNext(0);
  }

  private stopWorldReplay(): void {
    if (this.worldReplayTimer) {
      clearTimeout(this.worldReplayTimer);
      clearInterval(this.worldReplayTimer);
      this.worldReplayTimer = undefined;
    }
    if (this.worldReplaySocket) {
      this.worldReplaySocket.close();
      this.worldReplaySocket = undefined;
    }
  }

  private sendWorldReplayPacket(): number {
    if (!this.worldAddress) return 0;
    if (!this.worldReplaySocket) return 0;
    const packet = this.worldReplayPackets[this.worldReplayIndex];
    const ip = addressToIp(this.worldAddress);
    const port = this.worldAddress.port;
    this.logOutgoing(packet, ip, port, this.worldConnectionId);
    this.worldReplaySocket.send(packet, port, ip);
    const sentIndex = this.worldReplayIndex;
    this.worldReplayIndex = (this.worldReplayIndex + 1) % this.worldReplayPackets.length;
    return sentIndex;
  }

  private initWorldPeer(): void {
    if (this.worldPeer) return;
    this.worldPeer = new RakPeer();
    this.worldPeer.startup(1, 0, 0);
    this.worldConnected = false;
    this.worldPollTimer = setInterval(() => {
      this.pollWorldPeer();
    }, 10);
  }

  private handleWorldMessage(data: Buffer, address: RakSystemAddress): void {
    if (data.length === 0) return;
    let payload = data;
    let msgId = data[0];
    if (msgId === RakNetMessageId.ID_TIMESTAMP && data.length > 9) {
      payload = data.subarray(9);
      msgId = payload[0];
    }
    if (msgId === RakNetMessageId.ID_USER_PACKET_ENUM && payload.length > 1) {
      // World packets carry LithTech data inside the RakNet user packet wrapper.
      payload = payload.subarray(1);
      msgId = payload[0];
    }

    if (
      msgId === RakNetMessageId.ID_CONNECTION_REQUEST_ACCEPTED ||
      msgId === RakNetMessageId.ID_NEW_INCOMING_CONNECTION
    ) {
      if (!this.worldConnected) {
        this.worldConnected = true;
        this.worldAddress = address;
        PacketLogger.globalNote(`[World] Connected ${addressToString(address)}`, true);
      }
      this.sendWorldLoginToWorld();
      this.startWorldHeartbeat();
      this.startWorldReplay();
      this.maybeRegisterClient();
      if (this.probePending && this.probeTarget === 'world') {
        this.sendProbePackets('world');
      }
      return;
    }

    if (
      msgId === RakNetMessageId.ID_CONNECTION_ATTEMPT_FAILED ||
      msgId === RakNetMessageId.ID_CONNECTION_LOST ||
      msgId === RakNetMessageId.ID_DISCONNECTION_NOTIFICATION
    ) {
      this.worldConnected = false;
      this.worldConnectActive = false;
      if (!this.worldReplayEnabled) {
        this.stopWorldReplay();
      }
      if (this.worldHeartbeatTimer) {
        clearInterval(this.worldHeartbeatTimer);
        this.worldHeartbeatTimer = undefined;
      }
      PacketLogger.globalNote(
        `[World] Disconnected msg=0x${msgId.toString(16)} ${addressToString(address)}`,
        true,
      );
      return;
    }

    const registerReturn = this.decodeRegisterClientReturn(payload);
    if (registerReturn) {
      PacketLogger.globalNote(
        `[World] REGISTER_CLIENT_RETURN worldId=${registerReturn.worldId} playerId=${registerReturn.playerId} code=${registerReturn.returnCode}`,
        true,
      );
      return;
    }

    if (msgId === RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) {
      const parsed = this.parseFileListTransfer(payload);
      if (parsed) {
        const preview = parsed.names.length > 0 ? ` preview=${parsed.names.join(',')}` : '';
        PacketLogger.globalNote(
          `[World] FileList 0x32 entries=${parsed.ids.length}${preview}`,
          true,
        );
        this.sendFileListAck(parsed.ids, address);
        return;
      }
    }

    const messages = this.parseLithTechGuaranteedSubMessages(payload);
    for (const msg of messages) {
      if (msg.msgId === LithTechMessageId.MSG_NETPROTOCOLVERSION) {
        const decoded = this.decodeNetProtocolPayload(msg.payload);
        if (decoded) {
          this.worldNetProtocol = decoded;
          PacketLogger.globalNote(
            `[World] SMSG_NETPROTOCOLVERSION version=${decoded.version} extra=${decoded.extra}`,
            true,
          );
        }
        continue;
      }
      if (msg.msgId === LithTechMessageId.MSG_YOURID) {
        const decoded = this.decodeYourIdPayload(msg.payload);
        if (decoded) {
          this.worldYourId = decoded.id;
          PacketLogger.globalNote(
            `[World] SMSG_YOURID id=${decoded.id} flags=${decoded.flags}`,
            true,
          );
        }
        continue;
      }
      if (msg.msgId === LithTechMessageId.MSG_CLIENTOBJECTID) {
        const decoded = this.decodeClientObjectIdPayload(msg.payload);
        if (decoded) {
          this.worldClientObjectId = decoded.id;
          PacketLogger.globalNote(
            `[World] SMSG_CLIENTOBJECTID id=${decoded.id}`,
            true,
          );
        }
        this.sendConnectStage(1);
        continue;
      }
      if (msg.msgId === LithTechMessageId.MSG_LOADWORLD) {
        const decoded = this.decodeLoadWorldPayload(msg.payload);
        if (decoded) {
          PacketLogger.globalNote(
            `[World] SMSG_LOADWORLD worldId=${decoded.worldId} gameTime=${decoded.gameTime}`,
            true,
          );
        }
        this.sendConnectStage(0);
        continue;
      }
      if (msg.msgId === LithTechMessageId.MSG_UNGUARANTEEDUPDATE) {
        const decoded = this.decodeUnguaranteedUpdatePayload(msg.payload);
        if (decoded && this.shouldLogWorldUnguaranteed(Date.now())) {
          const timeNote =
            decoded.terminator && typeof decoded.gameTime === 'number'
              ? ` time=${decoded.gameTime.toFixed(3)}`
              : '';
          PacketLogger.globalNote(
            `[World] SMSG_UNGUARANTEEDUPDATE end=${decoded.terminator ? 1 : 0} flags=0x${decoded.flags.toString(
              16,
            )}${timeNote}`,
            true,
          );
        }
      }
    }
  }

  private parseFileListTransfer(inner: Buffer): { ids: number[]; names: string[] } | null {
    if (inner.length < 2 || inner[0] !== RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) return null;
    const reader = new BitStreamReader(inner);
    const msgId = reader.readByte();
    if (msgId !== RakNetMessageId.ID_FILE_LIST_TRANSFER_HEADER) return null;
    const ids: number[] = [];
    const names: string[] = [];
    let safety = 0;
    const maxEntries = Math.max(4, Math.floor(inner.length / 4));

    while (reader.remainingBits >= 16 && safety < maxEntries) {
      safety += 1;
      const fileId = reader.readUInt16();
      if (reader.remainingBits < 32) break;
      reader.readUInt32(); // size (unused by test client)
      const chars: number[] = [];
      while (reader.remainingBits >= 8) {
        const byte = reader.readByte();
        if (byte === 0) break;
        chars.push(byte);
        if (chars.length > 1024) break;
      }
      ids.push(fileId & 0x7fff);
      if (names.length < 4 && chars.length > 0) {
        names.push(Buffer.from(chars).toString('ascii'));
      }
    }

    return ids.length > 0 ? { ids, names } : null;
  }

  private sendFileListAck(ids: number[], address: RakSystemAddress): void {
    if (!this.worldPeer) return;
    const writer = new BitStreamWriter(Math.max(8, 1 + ids.length * 2));
    writer.writeByte(RakNetMessageId.ID_FILE_LIST_TRANSFER_RESPONSE);
    for (const id of ids) {
      writer.writeUInt16(id & 0x7fff);
    }
    const payload = writer.toBuffer();
    this.sendPacket(
      this.worldPeer,
      address,
      payload,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  connectWorldDirect(address: string, port: number): void {
    this.startWorldConnection({ address, port });
  }

  private connectMaster(): void {
    if (this.masterConnected) return;
    const ok = this.masterPeer.connect(this.serverAddress, this.serverPort, WORLD_SERVER_PASSWORD);
    if (!ok) {
      PacketLogger.globalNote(
        `[Master] Connect failed ${this.serverAddress}:${this.serverPort}`,
        true,
      );
    }
  }

  connect(): void {
    this.connectMaster();
  }

  sendLoginAuth(options: {
    username: string;
    passwordHash?: Buffer | string;
    fileCRCs?: [number, number, number];
    macAddress?: string;
    driveModels?: string[];
    driveSerialNumbers?: string[];
    loginToken?: string;
    computerName?: string;
    steamTicket?: Buffer;
    steamTicketLength?: number;
  }): void {
    const payloadOptions: LoginAuthOptions = {
      username: options.username ?? '',
      passwordHash: options.passwordHash,
      fileCRCs: options.fileCRCs,
      macAddress: options.macAddress,
      driveModels: options.driveModels,
      driveSerialNumbers: options.driveSerialNumbers,
      loginToken: options.loginToken,
      computerName: options.computerName,
      steamTicket: options.steamTicket,
      steamTicketLength: options.steamTicketLength,
    };
    const payload = buildLoginAuth(payloadOptions);
    if (!this.masterConnected) {
      this.pendingLoginAuth = payloadOptions;
      this.connectMaster();
      return;
    }
    this.pendingLoginAuth = undefined;
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      payload,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private sendWorldLogin(): void {
    if (!this.masterConnected) {
      this.connectMaster();
      return;
    }
    const payload = buildWorldLogin({
      worldId: this.worldLoginWorldId,
      worldInst: this.worldLoginWorldInst,
      playerId: this.worldLoginPlayerId,
      worldConst: this.worldLoginWorldConst,
    });
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      payload,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private scheduleWorldLoginRetry(delayMs: number): void {
    if (this.worldLoginRetryTimer) {
      clearTimeout(this.worldLoginRetryTimer);
    }
    this.worldLoginRetryTimer = setTimeout(() => {
      if (this.worldLoginPending) {
        this.sendWorldLogin();
      }
    }, delayMs);
  }

  private sendWorldLoginToWorld(): void {
    if (!this.worldPeer || !this.worldAddress) return;
    if (this.worldLoginSentToWorld) return;
    this.worldLoginSentToWorld = true;
    const payload = buildWorldLogin({
      worldId: this.worldLoginWorldId,
      worldInst: this.worldLoginWorldInst,
      playerId: this.worldLoginPlayerId,
      worldConst: this.worldLoginWorldConst,
    });
    this.sendPacket(
      this.worldPeer,
      this.worldAddress,
      payload,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private sendRegisterClientToWorld(): void {
    if (!this.worldPeer || !this.worldAddress) return;
    if (this.worldRegisterSent) return;
    if (this.worldLoginPlayerId <= 0) return;
    const worldId = this.worldLoginWorldId > 0 ? this.worldLoginWorldId : 1;
    const payload = buildRegisterClient({
      worldId,
      playerId: this.worldLoginPlayerId,
      sessionId: this.worldRegisterSessionId,
    });
    this.worldRegisterSent = true;
    this.sendPacket(
      this.worldPeer,
      this.worldAddress,
      payload,
      this.worldConnectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  private sendProbePackets(target: 'master' | 'world'): void {
    if (!this.probePending) return;
    const ids = this.probeIds.length > 0 ? this.probeIds : [LithTechMessageId.MSG_CONNECTSTAGE];
    const payloadBytes = Math.max(0, this.probePayloadBytes | 0);
    const payload = payloadBytes > 0 ? Buffer.alloc(payloadBytes, 0) : Buffer.alloc(0);

    if (target === 'master') {
      if (!this.masterConnected) return;
      PacketLogger.globalNote(`[Probe] Sending ${ids.length} Lith IDs to master`, true);
      for (const id of ids) {
        const lith = this.buildLithTechGuaranteedPacket([
          { msgId: id & 0xff, payload, payloadBits: payload.length * 8 },
        ]);
        this.sendPacket(
          this.masterPeer,
          this.masterAddress,
          lith,
          this.connectionId,
          RakPriority.HIGH,
          RakReliability.RELIABLE,
        );
      }
      this.probePending = false;
      return;
    }

    if (!this.worldPeer || !this.worldAddress) return;
    PacketLogger.globalNote(`[Probe] Sending ${ids.length} Lith IDs to world`, true);
    for (const id of ids) {
      const lith = this.buildLithTechGuaranteedPacket([
        { msgId: id & 0xff, payload, payloadBits: payload.length * 8 },
      ]);
      this.sendPacket(
        this.worldPeer,
        this.worldAddress,
        lith,
        this.worldConnectionId,
        RakPriority.HIGH,
        RakReliability.RELIABLE,
      );
    }
    this.probePending = false;
  }

  startProbe(target: 'master' | 'world', ids: number[], payloadBytes: number): void {
    const uniqueIds = Array.from(new Set(ids.filter(Number.isFinite).map(value => value & 0xff)));
    this.probeTarget = target;
    this.probeIds = uniqueIds;
    this.probePayloadBytes = Math.max(0, payloadBytes | 0);
    this.probePending = true;
    if (target === 'world') {
      if (!this.worldConnected) {
        const address = this.worldLoginTarget ?? { address: this.serverAddress, port: this.serverPort };
        this.connectWorldDirect(address.address, address.port);
        return;
      }
      this.sendProbePackets('world');
      return;
    }
    if (!this.masterConnected) {
      this.connectMaster();
      return;
    }
    this.sendProbePackets('master');
  }

  private maybeRegisterClient(): void {
    if (!this.worldConnected) return;
    this.sendRegisterClientToWorld();
  }

  private startWorldConnection(target: { address: string; port: number }): void {
    this.initWorldPeer();
    if (!this.worldPeer) return;
    if (this.worldConnectActive && this.worldLoginTarget) {
      if (
        this.worldLoginTarget.address === target.address &&
        this.worldLoginTarget.port === target.port
      ) {
        return;
      }
    }
    if (this.worldHeartbeatTimer) {
      clearInterval(this.worldHeartbeatTimer);
      this.worldHeartbeatTimer = undefined;
    }
    this.worldLoginTarget = target;
    this.worldConnectActive = true;
    this.worldLoginSentToWorld = false;
    this.worldConnectStageMask = 0;
    this.worldRegisterSent = false;
    this.worldLithOutSeq = 0;
    this.worldConnected = false;
    this.worldAddress = addressFromString(target.address, target.port);
    PacketLogger.globalNote(`[WorldConnect] connect ${target.address}:${target.port}`, true);
    const ok = this.worldPeer.connect(target.address, target.port, WORLD_SERVER_PASSWORD);
    if (!ok) {
      PacketLogger.globalNote(
        `[WorldConnect] connect failed ${target.address}:${target.port}`,
        true,
      );
    }
    if (this.worldReplayEnabled) {
      this.startWorldReplay();
    }
  }

  private tryAutoLoginAuth(data: Buffer): void {
    if (!this.loginAuthEnabled) return;
    const decoded = this.decodeLoginRequestReturn(data);
    if (!decoded || decoded.status !== 1) return;
    if (this.loginAuthSent) return;
    const passwordHash =
      this.loginAuthPasswordHash ||
      (this.loginAuthPass ? buildLoginAuthSession(this.loginAuthPass, '') : '');
    this.loginAuthSent = true;
    this.sendLoginAuth({
      username: this.loginAuthUsername || decoded.username,
      passwordHash,
      macAddress: this.loginAuthMacAddress,
      loginToken: this.loginAuthLoginToken,
      computerName: this.loginAuthComputerName,
      driveModels: this.loginAuthDriveModels,
      driveSerialNumbers: this.loginAuthDriveSerials,
      fileCRCs: this.loginAuthFileCRCs,
      steamTicket: this.loginAuthSteamTicket,
      steamTicketLength: this.loginAuthSteamTicketLength,
    });
  }

  private tryAutoWorldLogin(data: Buffer): void {
    const loginReturn = this.decodeLoginReturn(data);
    if (loginReturn && loginReturn.status === 1) {
      if (loginReturn.playerId > 0 && this.worldLoginPlayerId === 0) {
        this.worldLoginPlayerId = loginReturn.playerId;
        this.maybeRegisterClient();
      }
      if (this.worldLoginWorldId === 0) {
        const selected = loginReturn.currentWorldId || loginReturn.defaultWorldId;
        this.worldLoginWorldId = selected || loginReturn.worldIds[0] || 0;
      }
      if (this.worldLoginWorldId > 0 && !this.worldLoginPending) {
        this.worldLoginPending = true;
        this.sendWorldLogin();
      }
    }

    const select = this.decodeWorldSelect(data);
    if (select && select.subId === 4) {
      const worldId = select.worldId ?? 0;
      const worldInst = select.worldInst ?? 0;
      const playerId = select.playerId ?? 0;
      if (this.worldLoginPlayerId !== 0 && playerId !== this.worldLoginPlayerId) {
        return;
      }
      const selectKey = `${playerId}:${worldId}:${worldInst}`;
      if (selectKey !== this.worldLoginLastSelectKey) {
        this.worldLoginLastSelectKey = selectKey;
        this.worldLoginWorldId = worldId;
        this.worldLoginWorldInst = worldInst;
        this.worldLoginPlayerId = playerId;
        this.maybeRegisterClient();
        this.worldLoginPending = true;
        this.sendWorldLogin();
      }
    }

    const decoded = this.decodeWorldLoginReturn(data);
    if (!decoded) return;
    const { code, worldIp, worldPort } = decoded;
    if (!worldIp || worldIp === '0.0.0.0' || worldPort <= 0) return;

    const target = { address: worldIp, port: worldPort };
    this.worldLoginTarget = target;

    if (code === 8) {
      this.scheduleWorldLoginRetry(5000);
      return;
    }
    if (code === 1) {
      this.worldLoginPending = false;
      this.startWorldConnection(target);
    }
  }

  sendLoginRequest(options: {
    username: string;
    clientVersion: number;
  }): void {
    this.loginAuthSent = false;
    const payload = buildLoginRequest(options);
    if (!this.masterConnected) {
      this.pendingLoginRequest = options;
      this.connectMaster();
      return;
    }
    this.pendingLoginRequest = undefined;
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      payload,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  sendRawPacket(data: Buffer): void {
    if (!this.masterConnected) {
      this.connectMaster();
      return;
    }
    this.sendPacket(
      this.masterPeer,
      this.masterAddress,
      data,
      this.connectionId,
      RakPriority.HIGH,
      RakReliability.RELIABLE,
    );
  }

  close(): void {
    this.packetLogger.close();
    if (this.masterPollTimer) {
      clearInterval(this.masterPollTimer);
      this.masterPollTimer = undefined;
    }
    this.masterPeer.shutdown(200);
    this.masterPeer.destroy();
    if (this.worldPollTimer) {
      clearInterval(this.worldPollTimer);
      this.worldPollTimer = undefined;
    }
    if (this.worldPeer) {
      this.worldPeer.shutdown(200);
      this.worldPeer.destroy();
      this.worldPeer = undefined;
    }
    if (this.worldLoginRetryTimer) {
      clearTimeout(this.worldLoginRetryTimer);
      this.worldLoginRetryTimer = undefined;
    }
    if (this.worldHeartbeatTimer) {
      clearInterval(this.worldHeartbeatTimer);
      this.worldHeartbeatTimer = undefined;
    }
    this.stopWorldReplay();
  }
}

async function main() {
  loadEnvCandidates();
  const args = process.argv.slice(2);
  const command = args[0] || 'connect';
  const address = args[1] || '127.0.0.1';
  const port = parseInt(args[2] || String(DEFAULT_PORT), 10);
  const flags = args.slice(3);

  const getFlag = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const hit = flags.find((arg) => arg.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
  };

  const parseCsv = (value: string | undefined): string[] => {
    if (!value) return [];
    return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
  };

  const parseU32 = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const base = value.startsWith('0x') || /[a-f]/i.test(value) ? 16 : 10;
    const parsed = Number.parseInt(value, base);
    return Number.isNaN(parsed) ? undefined : (parsed >>> 0);
  };

  const parseIdList = (value: string | undefined): number[] => {
    if (!value) return [];
    return value
      .split(',')
      .map((v) => parseU32(v.trim()))
      .filter((v): v is number => typeof v === 'number')
      .map((v) => v & 0xff);
  };

  const collectLithIds = (): number[] => {
    const ids = Object.values(LithTechMessageId)
      .filter((v): v is number => typeof v === 'number')
      .map((v) => v & 0xff);
    return Array.from(new Set(ids)).sort((a, b) => a - b);
  };

  const parseU32Block = (value: string | undefined): [number, number, number] => {
    if (!value) return [0, 0, 0];
    const parts = value.split(',').map((v) => parseU32(v.trim()) ?? 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const parseBlob = (value: string | undefined): Buffer | undefined => {
    if (!value) return undefined;
    const cleaned = value.replace(/[^a-fA-F0-9]/g, '');
    if (cleaned.length % 2 !== 0) {
      throw new Error('login ticket hex must be even length');
    }
    const maxBytes = 0x400;
    const byteLen = cleaned.length / 2;
    if (byteLen > maxBytes) {
      throw new Error(`login ticket hex exceeds ${maxBytes} bytes`);
    }
    return Buffer.from(cleaned, 'hex');
  };

  const user = getFlag('user') || process.env.FOM_LOGIN_USER || 'test';
  const clientVersionRaw =
    getFlag('client-version') ||
    process.env.FOM_CLIENT_VERSION ||
    getFlag('token') ||
    process.env.FOM_LOGIN_TOKEN ||
    '0';
  const clientVersionValue = Number.parseInt(
    clientVersionRaw,
    clientVersionRaw.startsWith('0x') || /[a-f]/i.test(clientVersionRaw) ? 16 : 10,
  );
  const clientVersion = Number.isNaN(clientVersionValue) ? 0 : clientVersionValue;
  const loginDelayRaw = getFlag('login') || getFlag('login-delay');
  const loginDelaySec = loginDelayRaw !== undefined ? Number.parseFloat(loginDelayRaw) : NaN;
  const loginDelayMs = Number.isFinite(loginDelaySec) && loginDelaySec > 0 ? Math.round(loginDelaySec * 1000) : 0;
  const loginAuth = parseBool(getFlag('login-auth') || process.env.FOM_LOGIN_AUTH, true);
  const loginPass = getFlag('login-pass') || process.env.FOM_LOGIN_PASS || '';
  const loginUsername =
    getFlag('login-user') || getFlag('login-a') || process.env.FOM_LOGIN_STR_A || user;
  let loginPasswordHash =
    getFlag('login-hash') || getFlag('login-b') || process.env.FOM_LOGIN_STR_B || '';
  if (!loginPasswordHash && loginPass) {
    loginPasswordHash = buildLoginAuthSession(loginPass, '');
  }
  const loginToken =
    getFlag('login-token') || getFlag('login-c') || process.env.FOM_LOGIN_STR_C || '';
  const loginMacAddress =
    getFlag('login-mac') || getFlag('login-f') || process.env.FOM_LOGIN_STR_F || '';
  const loginComputerName =
    getFlag('login-computer') || getFlag('login-g') || process.env.FOM_LOGIN_STR_G || os.hostname();
  const loginDriveModels = parseCsv(
    getFlag('login-drives') || getFlag('login-extra64') || process.env.FOM_LOGIN_EXTRA64,
  );
  const loginDriveSerials = parseCsv(
    getFlag('login-serials') || getFlag('login-extra32') || process.env.FOM_LOGIN_EXTRA32,
  );
  const loginFileCRCs = parseU32Block(
    getFlag('login-crc') || getFlag('login-u32') || process.env.FOM_LOGIN_U32_BLOCK,
  );
  const loginSteamTicket =
    parseBlob(getFlag('login-ticket') || getFlag('login-blob') || process.env.FOM_LOGIN_BLOB_HEX);
  const loginSteamTicketLength = parseU32(
    getFlag('login-ticket-len') || getFlag('login-blob-u32') || process.env.FOM_LOGIN_BLOB_U32,
  );

  const worldId =
    parseU32(getFlag('world-id') || process.env.WORLD_ID);
  const worldInst =
    parseU32(getFlag('world-inst') || process.env.WORLD_INST);
  const playerId =
    parseU32(getFlag('world-player') || process.env.FOM_PLAYER_ID || process.env.PLAYER_ID);
  const worldConst =
    parseU32(getFlag('world-const') || process.env.WORLD_CONST);
  const worldHeartbeatMs = parseU32(
    getFlag('world-heartbeat-ms') ||
      getFlag('world-heartbeat') ||
      process.env.WORLD_HEARTBEAT_MS ||
      process.env.FOM_WORLD_HEARTBEAT_MS,
  );
  const worldHeartbeatBytes = parseU32(
    getFlag('world-heartbeat-bytes') ||
      process.env.WORLD_HEARTBEAT_BYTES ||
      process.env.FOM_WORLD_HEARTBEAT_BYTES,
  );
  const worldSessionId = parseU32(
    getFlag('world-session') ||
      getFlag('world-session-id') ||
      process.env.WORLD_SESSION_ID ||
      process.env.FOM_WORLD_SESSION_ID,
  );
  const worldReplayMs = parseU32(
    getFlag('world-replay-ms') ||
      process.env.WORLD_REPLAY_MS ||
      process.env.FOM_WORLD_REPLAY_MS,
  );
  const worldReplayLoopMs = parseU32(
    getFlag('world-replay-loop-ms') ||
      process.env.WORLD_REPLAY_LOOP_MS ||
      process.env.FOM_WORLD_REPLAY_LOOP_MS,
  );
  const worldReplayPort = parseU32(
    getFlag('world-replay-port') ||
      process.env.WORLD_REPLAY_PORT ||
      process.env.FOM_WORLD_REPLAY_PORT,
  );
  const worldReplayEnabled = parseBool(
    getFlag('world-replay') || process.env.WORLD_REPLAY || process.env.FOM_WORLD_REPLAY,
    false,
  ) || (worldReplayMs !== undefined);
  const worldIp = getFlag('world-ip') || process.env.WORLD_IP;
  const worldPortRaw = getFlag('world-port') || process.env.WORLD_PORT;
  const worldPort = worldPortRaw ? Number.parseInt(worldPortRaw, 10) : NaN;
  const probeIdsRaw = getFlag('probe-ids') || process.env.FOM_PROBE_IDS;
  const probeTargetRaw = (getFlag('probe-target') || process.env.FOM_PROBE_TARGET || 'master').toLowerCase();
  const probePayloadBytes = parseU32(getFlag('probe-bytes') || process.env.FOM_PROBE_BYTES) ?? 0;
  const probeIds = probeIdsRaw ? parseIdList(probeIdsRaw) : collectLithIds();
  const probeTarget = probeTargetRaw === 'world' ? 'world' : 'master';

  const quiet = parseBool(process.env.QUIET_MODE ?? process.env.FOM_QUIET_LOGS, false);
  if (quiet) {
    // Match server behavior: silence console spam while keeping file logs.
    // eslint-disable-next-line no-console
    console.log = () => {};
  }

  console.log('='.repeat(50));
  console.log('  FoM Test Client');
  console.log('='.repeat(50));
  console.log(`Target: ${address}:${port}`);

  const consoleMode = parseConsoleMode(process.env.PACKET_LOG ?? 'full');
  const consoleMinIntervalMs = Math.max(0, parseInt(process.env.PACKET_LOG_INTERVAL_MS || '0', 10) || 0);
  const logToFile = parseBool(process.env.PACKET_LOG_FILE, true);
  const analysisEnabled = parseBool(process.env.PACKET_LOG_ANALYSIS, false);
  const consolePacketIds = parsePacketIds(process.env.PACKET_LOG_IDS);
  const filePacketIds = parsePacketIds(process.env.PACKET_LOG_FILE_IDS);
  const ignorePacketIds = parsePacketIds(process.env.PACKET_LOG_IGNORE_IDS);
  const consoleRepeatSuppressMs = Math.max(0, parseInt(process.env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0);
  const flushMode = parseFlushMode(process.env.PACKET_LOG_FLUSH);
  const logDir = process.env.PACKET_LOG_DIR || path.resolve(process.cwd(), 'logs');

  const packetLogger = new PacketLogger({
    console: !quiet && consoleMode !== 'off',
    file: logToFile,
    consoleMode,
    consoleMinIntervalMs,
    consolePacketIds,
    filePacketIds,
    ignorePacketIds,
    analysis: analysisEnabled,
    consoleRepeatSuppressMs,
    flushMode,
    logDir,
  });
  PacketLogger.setGlobal(packetLogger);

  const client = new TestClient(address, port, packetLogger, 1, {
    enabled: loginAuth,
    username: loginUsername,
    password: loginPass,
    passwordHash: loginPasswordHash,
    loginToken: loginToken,
    macAddress: loginMacAddress,
    computerName: loginComputerName,
    driveModels: loginDriveModels,
    driveSerialNumbers: loginDriveSerials,
    fileCRCs: loginFileCRCs,
    steamTicket: loginSteamTicket,
    steamTicketLength: loginSteamTicketLength,
  }, {
    worldId: worldId ?? 0,
    worldInst: worldInst ?? 0,
    playerId: playerId ?? 0,
    worldConst: worldConst ?? 0x13bc52,
  }, {
    heartbeatIntervalMs: worldHeartbeatMs,
    heartbeatPayloadBytes: worldHeartbeatBytes,
    sessionId: worldSessionId,
  }, {
    enabled: worldReplayEnabled,
    intervalMs: worldReplayMs ?? 0,
    loopDelayMs: worldReplayLoopMs ?? 0,
    sourcePort: worldReplayPort ?? 0,
  });

  switch (command) {
    case 'connect':
      client.connect();
      break;
    case 'world':
    case 'world-connect': {
      const targetIp = worldIp || address;
      const targetPort = Number.isFinite(worldPort) ? worldPort : port;
      if (!targetIp || !Number.isFinite(targetPort) || targetPort <= 0) {
        console.log('Missing --world-ip/--world-port (or set WORLD_IP/WORLD_PORT).');
        client.close();
        return;
      }
      client.connectWorldDirect(targetIp, targetPort);
      break;
    }
    case 'probe': {
      client.startProbe(probeTarget, probeIds, probePayloadBytes);
      break;
    }
    case 'login':
      client.sendLoginRequest({
        username: user,
        clientVersion,
      });
      break;
    case 'login6e':
      if (!loginUsername) {
        console.log('Missing --login-user/--login-a/--user for login6e.');
        client.close();
        return;
      }
      client.sendLoginAuth({
        username: loginUsername,
        passwordHash: loginPasswordHash,
        loginToken: loginToken,
        macAddress: loginMacAddress,
        computerName: loginComputerName,
        driveModels: loginDriveModels,
        driveSerialNumbers: loginDriveSerials,
        fileCRCs: loginFileCRCs,
        steamTicket: loginSteamTicket,
        steamTicketLength: loginSteamTicketLength,
      });
      break;
    default:
      console.log('Usage: bun src/tools/TestClient.ts [connect|login|login6e|world|world-connect|probe] [address] [port] [--user=NAME] [--client-version=N] [--login-user=NAME] [--login-pass=TEXT] [--login-hash=TEXT] [--login-token=TEXT] [--login-mac=TEXT] [--login-computer=TEXT] [--login-crc=v1,v2,v3] [--login-drives=a,b,c,d] [--login-serials=a,b,c,d] [--login-ticket=HEX] [--login-ticket-len=N] [--login=SECONDS] [--login-auth=BOOL] [--world-ip=IP] [--world-port=N] [--world-id=N] [--world-inst=N] [--world-player=N] [--world-const=N] [--world-session=N] [--world-heartbeat-ms=N] [--world-heartbeat-bytes=N] [--world-replay=BOOL] [--world-replay-ms=N] [--world-replay-loop-ms=N] [--world-replay-port=N] [--probe-ids=04,06,09] [--probe-target=master|world] [--probe-bytes=N]');
      client.close();
      return;
  }

  if (loginDelayMs > 0 && command !== 'login' && command !== 'world' && command !== 'world-connect') {
    setTimeout(() => {
      client.sendLoginRequest({
        username: user,
        clientVersion,
      });
    }, loginDelayMs);
  }

  // Keep the client alive by default; user can close the window or Ctrl+C.
}

main();
