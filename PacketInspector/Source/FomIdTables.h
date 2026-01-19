#pragma once

#include "FomPacketInspector.h"

#include <cstdint>

/**
 * Check if an ID is a LithTech message id.
 * @param Id ID to test.
 * @return True if LithTech id.
 */
bool IsLithMessageId(uint8_t Id);

/**
 * Check if an ID is a RakNet game id.
 * @param Id ID to test.
 * @return True if RakNet game id.
 */
bool IsRakGameId(uint8_t Id);

/**
 * Check if an ID is a known RakNet id (core or game).
 * @param Id ID to test.
 * @return True if known RakNet id.
 */
bool IsRakKnownId(uint8_t Id);

/**
 * Return the RakNet id name for display.
 * @param Id Rak id.
 * @return Name or nullptr if unknown.
 */
const char* GetRakIdName(uint8_t Id);

/**
 * Return the LithTech id name for display.
 * Prefers client/server naming based on direction.
 * @param Id Lith id.
 * @param Direction Log direction (recv/send).
 * @return Name or nullptr if unknown.
 */
const char* GetLithIdName(uint8_t Id, FomLogDirection Direction);

/**
 * Return a display name for the effective id using layer + direction.
 * @param Id Effective id.
 * @param Layer Packet layer.
 * @param Direction Log direction.
 * @return Name or nullptr if unknown.
 */
const char* GetPacketIdName(uint8_t Id, FomPacketLayer Layer, FomLogDirection Direction);

/**
 * Attempt to decode the inner Lith id from a payload.
 * @param Payload Payload pointer.
 * @param PayloadLength Payload length.
 * @param OutInnerId Output inner id.
 * @return True if decoded.
 */
bool TryDecodeLithInnerId(const uint8_t* Payload, uint32_t PayloadLength, uint8_t* OutInnerId);

/**
 * Validate a Lith payload structure using LSB bit order.
 * @param Payload Payload pointer (starts at Lith message id).
 * @param PayloadLength Payload length in bytes.
 * @param ExpectedId Expected Lith id (0 to skip check).
 * @return True if structure looks valid.
 */
bool ValidateLithPayload(const uint8_t* Payload, uint32_t PayloadLength, uint8_t ExpectedId);

/**
 * Scan a raw buffer for a Lith payload using LSB bit order.
 * @param Data Packet bytes.
 * @param Length Packet length in bytes.
 * @param OutOuterId Output outer Lith id (e.g., 0x0E).
 * @param OutInnerId Output inner Lith id if known (optional).
 * @return True if a valid Lith payload was found.
 */
bool ScanForLithPayloadBits(const uint8_t* Data, uint32_t Length, uint8_t* OutOuterId, uint8_t* OutInnerId);

/**
 * Scan for a Lith packet-group and return the outer id.
 * @param Payload Payload pointer.
 * @param PayloadLength Payload length.
 * @param OutOuterId Output group id.
 * @return True if detected.
 */
bool TryScanLithPacketGroup(const uint8_t* Payload, uint32_t PayloadLength, uint8_t* OutOuterId);

/**
 * Scan for Lith payload wrapped in Rak reliability framing.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param StartOffset Scan start offset.
 * @param Out Output inspect result.
 * @return True if detected.
 */
bool ScanForLithWrapped(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, FomInspectResult* Out);

/**
 * Scan for a direct Lith payload in a buffer.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param StartOffset Scan start offset.
 * @param Out Output inspect result.
 * @return True if detected.
 */
bool ScanForLithDirect(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, FomInspectResult* Out);

/**
 * Scan for a Rak id anywhere in the buffer.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param StartOffset Scan start offset.
 * @param Out Output inspect result.
 * @return True if detected.
 */
bool ScanForRakId(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, FomInspectResult* Out);

/**
 * Scan for a Rak game id and return the id only.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param StartOffset Scan start offset.
 * @param OutId Output id.
 * @return True if detected.
 */
bool ScanForRakGameIdOnly(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, uint8_t* OutId);

/**
 * Find the offset of a Lith packet-group in a payload.
 * @param Payload Payload pointer.
 * @param PayloadLength Payload length.
 * @param OutOffset Output offset.
 * @param OutInnerId Output inner id.
 * @return True if found.
 */
bool FindLithPacketGroupOffset(const uint8_t* Payload, uint32_t PayloadLength, uint32_t* OutOffset, uint8_t* OutInnerId);

/**
 * Find the offset of a Rak game id in a buffer.
 * @param Data Packet bytes.
 * @param Length Packet length.
 * @param StartOffset Scan start offset.
 * @param OutId Output id.
 * @return Offset or -1 if not found.
 */
int32_t FindRakGameIdOffset(const uint8_t* Data, uint32_t Length, uint32_t StartOffset, uint8_t* OutId);
