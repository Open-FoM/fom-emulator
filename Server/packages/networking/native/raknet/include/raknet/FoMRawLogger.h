// FoM raw packet logger (socket-level tap)
// Captures raw UDP send/recv datagrams into an in-process queue.

#ifndef FOM_RAW_LOGGER_H
#define FOM_RAW_LOGGER_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum FomRawLogDirection
{
    FOM_RAW_LOG_RECV = 0,
    FOM_RAW_LOG_SEND = 1
} FomRawLogDirection;

void FomRawLoggerConfigure(uint8_t EnableRecv,
                           uint8_t EnableSend,
                           uint32_t MaxQueue,
                           uint32_t MaxPacketBytes);

void FomRawLoggerPush(uint8_t IsSend,
                      const unsigned char* Data,
                      uint32_t Length,
                      uint32_t BinaryAddress,
                      uint16_t Port);

uint32_t FomRawLoggerPop(uint8_t* Buffer,
                         uint32_t BufferSize,
                         uint32_t* OutBinaryAddress,
                         uint16_t* OutPort,
                         uint32_t* OutDirection);

#ifdef __cplusplus
}
#endif

#endif
