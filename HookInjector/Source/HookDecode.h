/** Packet decode helpers for logging. */
#pragma once

#include "HookLogging.h"

/** Decodes the login 0x6D packet for logging. */
void DecodeLogin6D(const uint8_t* Data, int Length, const char* Tag);
bool DecodeLogin6DStatus(const uint8_t* Data, int Length, uint8_t* OutStatus);
bool DecodeLogin6DSuffixRaw(const uint8_t* Data, int Length, char* Out, int OutSize);
/** Decodes a LithTech packet for logging. */
void DecodeLithPacket(const uint8_t* Data, int Length);
