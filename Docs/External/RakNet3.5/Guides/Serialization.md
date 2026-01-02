# Serialization with BitStream

## Overview
`RakNet::BitStream` writes and reads native types as a string of bits and is used extensively across RakNet.

## Constructing a BitStream
- Default constructor for a new stream.
- Constructor with `initialBytesToAllocate` to pre-allocate storage.
- Constructor that wraps existing packet data for reading without copying.

Example from `BitStream` header comments:

```cpp
RakNet::BitStream bs(packet->data, packet->length, false);
```

## Core APIs
- `Write()` / `Read()` for writing and reading values.
- `Serialize()` for bidirectional read or write based on a `writeToBitstream` flag.
- `SerializeDelta()` for sending values only when they change.
- `SerializeCompressed()` and `SerializeCompressedDelta()` for compressed values.

## Strings and Tables
- Use `StringCompressor` for Huffman-based string compression.
- Use `StringTable` for shared string indexing.

## Notes
- `BitStream` mentions `__BITSTREAM_NATIVE_END` for endian behavior.
- For compressed floating point, header comments note a lossy range of -1 to +1.

## Reference
- BitStream
- BitStream_NoTemplate
- StringCompressor
- StringTable
- DataCompressor


