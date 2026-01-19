/**
 * Register world server RakNet/LithTech packet handlers.
 */
import { LithTechMessageId, RakNetMessageId } from '@openfom/packets';
import type { HandlerContext, PacketHandler } from './types';
import { createConnectStageHandler } from './handleConnectStage';
import { createConnectionLostHandler } from './handleConnectionLost';
import { createDisconnectHandler } from './handleDisconnect';
import { createNewIncomingConnectionHandler } from './handleNewIncomingConnection';
import { createRegisterClientHandler } from './handleRegisterClient';
import { createUserPacketEnumHandler } from './handleUserPacketEnum';
import { createWorldLoginHandler } from './handleWorldLogin';
import { createWorldLoginRequestHandler } from './handleWorldLoginRequest';
import { createWorldQueryHandler } from './handleWorldQuery';
import { createWorldServiceHandler } from './handleWorldService';
import { createWorldSelectHandler } from './handleWorldSelect';

/**
 * Build the packet handler registry for the world server.
 * @param {HandlerContext} context - Handler context dependencies.
 * @returns {Map<number, PacketHandler>} Handler map keyed by message ID.
 */
export function createPacketHandlers(context: HandlerContext): Map<number, PacketHandler> {
    const handlers: Map<number, PacketHandler> = new Map();
    handlers.set(
        RakNetMessageId.ID_NEW_INCOMING_CONNECTION,
        createNewIncomingConnectionHandler(context),
    );
    handlers.set(RakNetMessageId.ID_DISCONNECTION_NOTIFICATION, createDisconnectHandler(context));
    handlers.set(RakNetMessageId.ID_CONNECTION_LOST, createConnectionLostHandler(context));
    handlers.set(RakNetMessageId.ID_WORLD_LOGIN, createWorldLoginHandler(context));
    handlers.set(RakNetMessageId.ID_WORLD_QUERY, createWorldQueryHandler(context));
    handlers.set(RakNetMessageId.ID_WORLD_LOGIN_REQUEST, createWorldLoginRequestHandler(context));
    handlers.set(RakNetMessageId.ID_WORLDSERVICE, createWorldServiceHandler(context));
    handlers.set(RakNetMessageId.ID_REGISTER_CLIENT, createRegisterClientHandler(context));
    handlers.set(RakNetMessageId.ID_WORLD_SELECT, createWorldSelectHandler(context));
    handlers.set(LithTechMessageId.MSG_CONNECTSTAGE, createConnectStageHandler(context));
    handlers.set(RakNetMessageId.ID_USER_PACKET_ENUM, createUserPacketEnumHandler(context));
    return handlers;
}
