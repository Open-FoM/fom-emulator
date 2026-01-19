// FoM raw packet logger (socket-level tap)
// Stores raw datagrams in a bounded queue for FFI consumers.

#include "raknet/FoMRawLogger.h"

#include <cstring>
#include <deque>
#include <mutex>
#include <vector>

typedef struct RawLogEntry
{
    uint32_t Address;
    uint16_t Port;
    uint32_t Length;
    uint8_t Direction;
    std::vector<uint8_t> Data;
} RawLogEntry;

static std::mutex g_RawLogMutex;
static std::deque<RawLogEntry> g_RawLogQueue;
static uint32_t g_RawLogMaxQueue = 4096;
static uint32_t g_RawLogMaxPacketBytes = 4096;
static uint8_t g_RawLogEnableRecv = 0;
static uint8_t g_RawLogEnableSend = 0;

void FomRawLoggerConfigure(uint8_t EnableRecv,
                           uint8_t EnableSend,
                           uint32_t MaxQueue,
                           uint32_t MaxPacketBytes)
{
    std::lock_guard<std::mutex> Guard(g_RawLogMutex);
    g_RawLogEnableRecv = EnableRecv ? 1 : 0;
    g_RawLogEnableSend = EnableSend ? 1 : 0;
    g_RawLogMaxQueue = MaxQueue > 0 ? MaxQueue : 4096;
    g_RawLogMaxPacketBytes = MaxPacketBytes > 0 ? MaxPacketBytes : 4096;

    while (g_RawLogQueue.size() > g_RawLogMaxQueue)
    {
        g_RawLogQueue.pop_front();
    }
}

void FomRawLoggerPush(uint8_t IsSend,
                      const unsigned char* Data,
                      uint32_t Length,
                      uint32_t BinaryAddress,
                      uint16_t Port)
{
    if (!Data || Length == 0)
    {
        return;
    }

    std::lock_guard<std::mutex> Guard(g_RawLogMutex);
    if (IsSend)
    {
        if (!g_RawLogEnableSend)
        {
            return;
        }
    }
    else
    {
        if (!g_RawLogEnableRecv)
        {
            return;
        }
    }

    uint32_t CopyLength = Length;
    if (g_RawLogMaxPacketBytes > 0 && CopyLength > g_RawLogMaxPacketBytes)
    {
        CopyLength = g_RawLogMaxPacketBytes;
    }

    RawLogEntry Entry;
    Entry.Address = BinaryAddress;
    Entry.Port = Port;
    Entry.Length = CopyLength;
    Entry.Direction = IsSend ? FOM_RAW_LOG_SEND : FOM_RAW_LOG_RECV;
    Entry.Data.assign(Data, Data + CopyLength);

    if (g_RawLogQueue.size() >= g_RawLogMaxQueue)
    {
        g_RawLogQueue.pop_front();
    }
    g_RawLogQueue.push_back(std::move(Entry));
}

uint32_t FomRawLoggerPop(uint8_t* Buffer,
                         uint32_t BufferSize,
                         uint32_t* OutBinaryAddress,
                         uint16_t* OutPort,
                         uint32_t* OutDirection)
{
    if (!Buffer || BufferSize == 0)
    {
        return 0;
    }

    std::lock_guard<std::mutex> Guard(g_RawLogMutex);
    if (g_RawLogQueue.empty())
    {
        return 0;
    }

    RawLogEntry Entry = std::move(g_RawLogQueue.front());
    g_RawLogQueue.pop_front();

    uint32_t CopyLength = Entry.Length;
    if (CopyLength > BufferSize)
    {
        CopyLength = BufferSize;
    }

    if (CopyLength > 0)
    {
        std::memcpy(Buffer, Entry.Data.data(), CopyLength);
    }

    if (OutBinaryAddress)
    {
        *OutBinaryAddress = Entry.Address;
    }
    if (OutPort)
    {
        *OutPort = Entry.Port;
    }
    if (OutDirection)
    {
        *OutDirection = Entry.Direction;
    }

    return CopyLength;
}
