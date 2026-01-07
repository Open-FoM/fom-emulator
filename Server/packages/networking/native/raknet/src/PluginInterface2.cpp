/// \file
///
/// This file is part of RakNet Copyright 2003 Jenkins Software LLC
///
/// Usage of RakNet is subject to the appropriate license agreement.


#include "raknet/PluginInterface2.h"
#include "raknet/RakPeerInterface.h"
#include "raknet/BitStream.h"

PluginInterface2::PluginInterface2()
{
	rakPeerInterface=0;
}
PluginInterface2::~PluginInterface2()
{

}
void PluginInterface2::SendUnified( const RakNet::BitStream * bitStream, PacketPriority priority, PacketReliability reliability, char orderingChannel, SystemAddress systemAddress, bool broadcast )
{
	rakPeerInterface->Send(bitStream, priority, reliability, orderingChannel, systemAddress, broadcast);
}
Packet *PluginInterface2::AllocatePacketUnified(unsigned dataSize)
{
	return rakPeerInterface->AllocatePacket(dataSize);
}
void PluginInterface2::PushBackPacketUnified(Packet *packet, bool pushAtHead)
{
	return rakPeerInterface->PushBackPacket(packet, pushAtHead);
}
bool PluginInterface2::SendListUnified( char **data, const int *lengths, const int numParameters, PacketPriority priority, PacketReliability reliability, char orderingChannel, SystemAddress systemAddress, bool broadcast )
{
	return rakPeerInterface->SendList(data, lengths, numParameters, priority, reliability, orderingChannel, systemAddress, broadcast);
}
void PluginInterface2::SetRakPeerInterface( RakPeerInterface *ptr )
{
	rakPeerInterface=ptr;
}
