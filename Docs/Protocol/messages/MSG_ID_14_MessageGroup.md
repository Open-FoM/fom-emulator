# Message ID 14 - Message Group Packet

## Overview

Container packet that holds multiple sub-messages. Allows batching several messages into a single packet for efficiency.

## Message ID

- LithTech ID: `14` (0x0E)
- Handler Table Offset: `0x38` from `0x006FAB50`

## Handler Function

- Address: `0x004A0460`
- Name: `LithTech_OnMessageGroupPacket`

## Structure

```c
struct MSG_MessageGroup {
    // Repeating structure until length == 0:
    struct SubMessage {
        uint8_t length;     // 8 bits - Length of this sub-message in bits
        uint8_t msg_id;     // 8 bits - Sub-message type ID
        uint8_t payload[];  // 'length' bits of payload
    } messages[];
    uint8_t terminator;     // 0x00 - End of group
};
```

## Format Diagram

```
┌────────────────────────────────────────────────────────────┐
│ Len1 (8) │ ID1 (8) │ Payload1 (Len1 bits)                  │
├────────────────────────────────────────────────────────────┤
│ Len2 (8) │ ID2 (8) │ Payload2 (Len2 bits)                  │
├────────────────────────────────────────────────────────────┤
│ ... more sub-messages ...                                  │
├────────────────────────────────────────────────────────────┤
│ 0x00 (terminator)                                          │
└────────────────────────────────────────────────────────────┘
```

## Handler Decompiled

```c
// FUN_004a0460 (LithTech_OnMessageGroupPacket)
int OnMessageGroupPacket(void* clientState, Message* msg) {
    while (msg->readPos < msg->totalBits) {
        uint8_t subLen = CLTMessage_ReadBits(8);
        
        if (subLen == 0) {
            return 0; // End of group
        }
        
        // Validate length
        if (msg->totalBits - msg->readPos < subLen) {
            LogError("OnMessageGroupPacket", "LT_INVALIDSERVERPACKET", "invalid packet");
            return 0x2C; // Error
        }
        
        // Extract sub-message
        Message subMsg;
        subMsg.data = msg->data;
        subMsg.startBit = msg->currentBit + msg->readPos;
        subMsg.totalBits = subLen;
        
        // Advance read position
        msg->readPos += subLen;
        
        // Read sub-message ID
        uint8_t subMsgId = CLTMessage_ReadBits(8);
        
        // Dispatch to handler
        MessageHandler handler = g_MessageHandlers[subMsgId]; // At 0x006FAB50
        if (handler != NULL) {
            int result = handler(clientState, &subMsg);
            if (result != 0) {
                return result; // Propagate error
            }
        }
    }
    return 0;
}
```

## Sub-Message Dispatch

Sub-messages are dispatched using the same handler table at `0x006FAB50`.

Valid sub-message IDs include:
- ID 4, 5, 6, 7, 8, 10, 12, 13, 15, 16, 17, 19, 20, 21, 22, 23
- (Same as top-level message IDs)

## Error Handling

- Returns `0x2C` (LT_INVALIDSERVERPACKET) if sub-message length exceeds remaining data
- Logs: `"invalid packet"` on error

## Usage

- Primary mechanism for batching game state updates
- Reduces packet overhead by combining small messages
- Server sends grouped updates for efficiency

## Example

```
Group containing 3 sub-messages:
┌─────────────────────────────────────┐
│ 24 │ 12 │ [IDPacket data - 16 bits] │  <- ID Packet (24 bits total)
├─────────────────────────────────────┤
│ 16 │ 06 │ [Version - 8 bits]        │  <- Version check
├─────────────────────────────────────┤
│ 32 │ 20 │ [Update data - 24 bits]   │  <- Some update
├─────────────────────────────────────┤
│ 00 │                                │  <- Terminator
└─────────────────────────────────────┘
```

---

*Last updated: December 27, 2025*
