#include "raknet/BitStream.h"
#include "raknet/RakNetTypes.h"
#include "raknet/RakString.h"

// Minimal RakNet stubs to satisfy BitStream linkage in PacketInspector.
// These code paths are not used by PacketInspector's parsing logic.

SystemAddress::SystemAddress()
{
    binaryAddress = 0;
    port = 0;
}

SystemAddress::SystemAddress(const char* a, unsigned short b)
{
    (void)a;
    binaryAddress = 0;
    port = b;
}

SystemAddress::SystemAddress(unsigned int a, unsigned short b)
{
    binaryAddress = a;
    port = b;
}

bool RakNet::RakString::Deserialize(RakNet::BitStream* bs)
{
    (void)bs;
    return false;
}

bool RakNet::RakString::Deserialize(char* str, RakNet::BitStream* bs)
{
    if (str)
    {
        str[0] = '\0';
    }
    (void)bs;
    return false;
}
