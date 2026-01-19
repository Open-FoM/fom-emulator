#pragma once

#include "FomPacketInspector.h"

#include <cstdint>

struct FomSchemaDispatchResult
{
    bool Ok = false;
    uint8_t EffectiveId = 0;
    uint8_t InnerId = 0;
    uint8_t OuterId = 0;
    FomPacketLayer Layer = FomLayerUnknown;
    uint32_t ConsumedBits = 0;
    FomDispatchMode Mode = FomDispatchRaw;
    FomDispatchReason Reason = FomDispatchReasonOk;
};

/**
 * Attempt schema override parsing for a payload (LSB bit order).
 * Payload must point at the message id (payload-relative).
 * @param Payload Payload pointer.
 * @param PayloadBitLength Payload length in bits.
 * @param Out Output result.
 * @return True if a schema override parsed successfully.
 */
bool TrySchemaOverride(const uint8_t* Payload, uint32_t PayloadBitLength, FomSchemaDispatchResult* Out);

/**
 * Get a display label for a dispatch mode.
 * @param Mode Dispatch mode enum.
 * @return Static string label.
 */
const char* DispatchModeToString(uint8_t Mode);

/**
 * Get a display label for a dispatch reason.
 * @param Reason Dispatch reason enum.
 * @return Static string label.
 */
const char* DispatchReasonToString(uint8_t Reason);
