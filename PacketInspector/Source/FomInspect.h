#pragma once

#include "FomPacketInspector.h"

#include <cstdint>

/**
 * Inspect a payload buffer and populate IDs/layer.
 * @param Payload Payload pointer.
 * @param PayloadLength Payload length.
 * @param Out Output inspect result.
 */
void InspectPayloadIds(const uint8_t* Payload, uint32_t PayloadLength, FomInspectResult* Out);

/**
 * Unified inspect pipeline for both packet and log paths.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param Evt Optional log event for tag-based overrides.
 * @param OutResult Output inspect result.
 * @return 1 on success, 0 on failure.
 */
int InspectPacketPipeline(const uint8_t* Data, uint32_t Length, const FomLogEvent* Evt, FomInspectResult* OutResult);
