#include "lithnet_ffi.h"

#include <cstdlib>
#include <cstring>
#include <vector>

#define LTMIN(a, b) ((a) < (b) ? (a) : (b))
#define LTMAX(a, b) ((a) > (b) ? (a) : (b))
#define LTCLAMP(val, lo, hi) LTMIN(LTMAX(val, lo), hi)

static const uint32_t CRC32_POLYNOMIAL = 0xedb88320;
static uint32_t g_CRCTable[256];
static bool g_CRCTableInitialized = false;

static void InitCRCTable() {
    if (g_CRCTableInitialized) return;
    for (uint32_t i = 0; i < 256; ++i) {
        uint32_t acc = i;
        for (uint32_t j = 0; j < 8; ++j) {
            if (acc & 1)
                acc = CRC32_POLYNOMIAL ^ (acc >> 1);
            else
                acc = acc >> 1;
        }
        g_CRCTable[i] = acc;
    }
    g_CRCTableInitialized = true;
}

static inline void CRCCalc(uint32_t& crc, uint8_t data) {
    crc = g_CRCTable[(crc ^ data) & 0xFF] ^ (crc >> 8);
}

class LithPacketWrite {
public:
    LithPacketWrite() : m_bitAccumulator(0), m_bitsAccumulated(0) {}
    
    void Reset() {
        m_data.clear();
        m_bitAccumulator = 0;
        m_bitsAccumulated = 0;
    }
    
    uint32_t Size() const {
        return static_cast<uint32_t>(m_data.size() * 32 + m_bitsAccumulated);
    }
    
    uint32_t SizeBytes() const {
        return (Size() + 7) / 8;
    }
    
    bool Empty() const {
        return Size() == 0;
    }
    
    void WriteBits(uint32_t value, uint32_t numBits) {
        if (numBits == 0 || numBits > 32) return;
        
        uint32_t writeMask = (numBits < 32) ? ((1u << numBits) - 1) : 0xFFFFFFFF;
        uint32_t writeValue = value & writeMask;
        
        m_bitAccumulator |= writeValue << m_bitsAccumulated;
        m_bitsAccumulated += numBits;
        
        if (m_bitsAccumulated >= 32) {
            m_data.push_back(m_bitAccumulator);
            m_bitsAccumulated -= 32;
            if (m_bitsAccumulated > 0)
                m_bitAccumulator = writeValue >> (numBits - m_bitsAccumulated);
            else
                m_bitAccumulator = 0;
        }
    }
    
    void WriteBits64(uint64_t value, uint32_t numBits) {
        if (numBits == 0 || numBits > 64) return;
        
        WriteBits(static_cast<uint32_t>(value), LTMIN(numBits, 32u));
        if (numBits > 32) {
            WriteBits(static_cast<uint32_t>(value >> 32), numBits - 32);
        }
    }
    
    void WriteData(const void* data, uint32_t numBits) {
        const uint32_t* data32 = reinterpret_cast<const uint32_t*>(data);
        while (numBits >= 32) {
            WriteBits(*data32, 32);
            ++data32;
            numBits -= 32;
        }
        if (numBits > 0) {
            uint32_t accumulator = 0;
            uint32_t mask = (numBits < 32) ? ((1u << numBits) - 1) : 0xFFFFFFFF;
            uint32_t shift = 0;
            const uint8_t* data8 = reinterpret_cast<const uint8_t*>(data32);
            while (mask) {
                accumulator |= (*data8 & mask) << shift;
                mask >>= 8;
                shift += 8;
                ++data8;
            }
            WriteBits(accumulator, numBits);
        }
    }
    
    void WriteString(const char* str) {
        if (!str) {
            WriteBits(0, 8);
            return;
        }
        while (*str) {
            WriteBits(static_cast<uint8_t>(*str), 8);
            ++str;
        }
        WriteBits(0, 8);
    }
    
    void Flush() {
        if (m_bitsAccumulated > 0) {
            m_data.push_back(m_bitAccumulator);
            m_bitsAccumulated = 0;
            m_bitAccumulator = 0;
        }
    }
    
    const uint8_t* GetData(uint32_t* outSize) {
        Flush();
        if (outSize) *outSize = SizeBytes();
        return reinterpret_cast<const uint8_t*>(m_data.data());
    }
    
    uint32_t CopyData(uint8_t* buffer, uint32_t bufferSize) {
        Flush();
        uint32_t copySize = LTMIN(SizeBytes(), bufferSize);
        if (copySize > 0) {
            memcpy(buffer, m_data.data(), copySize);
        }
        return copySize;
    }
    
    const std::vector<uint32_t>& GetInternalData() const { return m_data; }
    uint32_t GetBitsAccumulated() const { return m_bitsAccumulated; }
    uint32_t GetBitAccumulator() const { return m_bitAccumulator; }

private:
    std::vector<uint32_t> m_data;
    uint32_t m_bitAccumulator;
    uint32_t m_bitsAccumulated;
};

class LithPacketRead {
public:
    LithPacketRead(const uint8_t* data, uint32_t sizeBits) 
        : m_size(sizeBits), m_offset(0), m_curData(0) {
        uint32_t numWords = (sizeBits + 31) / 32;
        m_data.resize(numWords, 0);
        if (data && numWords > 0) {
            memcpy(m_data.data(), data, (sizeBits + 7) / 8);
        }
        RefreshIterator();
    }
    
    LithPacketRead(const LithPacketWrite& writer)
        : m_size(writer.Size()), m_offset(0), m_curData(0) {
        m_data = writer.GetInternalData();
        if (writer.GetBitsAccumulated() > 0) {
            m_data.push_back(writer.GetBitAccumulator());
        }
        RefreshIterator();
    }
    
    uint32_t Size() const { return m_size; }
    uint32_t Tell() const { return m_offset; }
    uint32_t TellEnd() const { return m_size - m_offset; }
    bool EOP() const { return m_offset >= m_size; }
    
    void Seek(int32_t offset) {
        m_offset = static_cast<uint32_t>(LTCLAMP(static_cast<int32_t>(m_offset) + offset, 0, static_cast<int32_t>(m_size)));
        RefreshIterator();
    }
    
    void SeekTo(uint32_t pos) {
        m_offset = LTMIN(m_size, pos);
        RefreshIterator();
    }
    
    uint32_t ReadBits(uint32_t numBits) {
        if (numBits == 0 || numBits > 32) return 0;
        
        numBits = LTMIN(numBits, m_size - m_offset);
        uint32_t readMask = (numBits < 32) ? ((1u << numBits) - 1) : 0xFFFFFFFF;
        
        uint32_t curOffset = m_offset & 31;
        uint32_t curLoaded = 32 - curOffset;
        uint32_t result = (m_curData >> curOffset) & readMask;
        
        m_offset += numBits;
        
        if (numBits >= curLoaded) {
            ++m_curIndex;
            if (m_curIndex < m_data.size()) {
                m_curData = m_data[m_curIndex];
            } else {
                m_curData = 0;
            }
            if (numBits > curLoaded) {
                uint32_t remainingMask = readMask >> curLoaded;
                result |= (m_curData & remainingMask) << curLoaded;
            }
        }
        
        return result;
    }
    
    uint64_t ReadBits64(uint32_t numBits) {
        if (numBits == 0 || numBits > 64) return 0;
        
        uint64_t result = static_cast<uint64_t>(ReadBits(LTMIN(numBits, 32u)));
        if (numBits > 32) {
            result |= static_cast<uint64_t>(ReadBits(numBits - 32)) << 32;
        }
        return result;
    }
    
    void ReadData(void* data, uint32_t numBits) {
        uint32_t* data32 = reinterpret_cast<uint32_t*>(data);
        while (numBits >= 32) {
            *data32 = ReadBits(32);
            ++data32;
            numBits -= 32;
        }
        if (numBits > 0) {
            uint8_t* data8 = reinterpret_cast<uint8_t*>(data32);
            while (numBits > 0) {
                uint32_t numRead = LTMIN(8u, numBits);
                *data8 = static_cast<uint8_t>(ReadBits(numRead));
                ++data8;
                numBits -= numRead;
            }
        }
    }
    
    uint32_t ReadString(char* dest, uint32_t maxLen) {
        uint32_t result = 0;
        char* end = dest ? (dest + maxLen) : nullptr;
        char nextChar;
        do {
            nextChar = static_cast<char>(ReadBits(8));
            ++result;
            if (dest && dest != end) {
                *dest = nextChar;
                ++dest;
            }
        } while (nextChar != 0);
        return result - 1;
    }
    
    uint32_t CalcChecksum() const {
        InitCRCTable();
        LithPacketRead temp(*this);
        temp.SeekTo(0);
        uint32_t crc = 0xFFFFFFFF;
        while (!temp.EOP()) {
            CRCCalc(crc, static_cast<uint8_t>(temp.ReadBits(8)));
        }
        return crc ^ 0xFFFFFFFF;
    }
    
    LithPacketRead(const LithPacketRead& other)
        : m_data(other.m_data), m_size(other.m_size), m_offset(other.m_offset),
          m_curIndex(other.m_curIndex), m_curData(other.m_curData) {}

private:
    void RefreshIterator() {
        if (EOP()) {
            m_curData = 0;
            return;
        }
        m_curIndex = m_offset / 32;
        if (m_curIndex < m_data.size()) {
            m_curData = m_data[m_curIndex];
        } else {
            m_curData = 0;
        }
    }
    
    std::vector<uint32_t> m_data;
    uint32_t m_size;
    uint32_t m_offset;
    size_t m_curIndex;
    uint32_t m_curData;
};

LITH_FFI_API LithPacketWriteHandle lith_packet_write_create(void) {
    return static_cast<LithPacketWriteHandle>(new LithPacketWrite());
}

LITH_FFI_API void lith_packet_write_destroy(LithPacketWriteHandle packet) {
    if (!packet) return;
    delete static_cast<LithPacketWrite*>(packet);
}

LITH_FFI_API void lith_packet_write_reset(LithPacketWriteHandle packet) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->Reset();
}

LITH_FFI_API uint32_t lith_packet_write_size(LithPacketWriteHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketWrite*>(packet)->Size();
}

LITH_FFI_API uint32_t lith_packet_write_size_bytes(LithPacketWriteHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketWrite*>(packet)->SizeBytes();
}

LITH_FFI_API bool lith_packet_write_empty(LithPacketWriteHandle packet) {
    if (!packet) return true;
    return static_cast<LithPacketWrite*>(packet)->Empty();
}

LITH_FFI_API void lith_write_bits(LithPacketWriteHandle packet, uint32_t value, uint32_t num_bits) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(value, num_bits);
}

LITH_FFI_API void lith_write_bits64(LithPacketWriteHandle packet, uint64_t value, uint32_t num_bits) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits64(value, num_bits);
}

LITH_FFI_API void lith_write_data(LithPacketWriteHandle packet, const void* data, uint32_t num_bits) {
    if (!packet || !data) return;
    static_cast<LithPacketWrite*>(packet)->WriteData(data, num_bits);
}

LITH_FFI_API void lith_write_bool(LithPacketWriteHandle packet, bool value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(value ? 1 : 0, 1);
}

LITH_FFI_API void lith_write_uint8(LithPacketWriteHandle packet, uint8_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(value, 8);
}

LITH_FFI_API void lith_write_uint16(LithPacketWriteHandle packet, uint16_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(value, 16);
}

LITH_FFI_API void lith_write_uint32(LithPacketWriteHandle packet, uint32_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(value, 32);
}

LITH_FFI_API void lith_write_uint64(LithPacketWriteHandle packet, uint64_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits64(value, 64);
}

LITH_FFI_API void lith_write_int8(LithPacketWriteHandle packet, int8_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(static_cast<uint32_t>(value), 8);
}

LITH_FFI_API void lith_write_int16(LithPacketWriteHandle packet, int16_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(static_cast<uint32_t>(value), 16);
}

LITH_FFI_API void lith_write_int32(LithPacketWriteHandle packet, int32_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits(static_cast<uint32_t>(value), 32);
}

LITH_FFI_API void lith_write_int64(LithPacketWriteHandle packet, int64_t value) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteBits64(static_cast<uint64_t>(value), 64);
}

LITH_FFI_API void lith_write_float(LithPacketWriteHandle packet, float value) {
    if (!packet) return;
    uint32_t bits;
    memcpy(&bits, &value, sizeof(bits));
    static_cast<LithPacketWrite*>(packet)->WriteBits(bits, 32);
}

LITH_FFI_API void lith_write_double(LithPacketWriteHandle packet, double value) {
    if (!packet) return;
    uint64_t bits;
    memcpy(&bits, &value, sizeof(bits));
    static_cast<LithPacketWrite*>(packet)->WriteBits64(bits, 64);
}

LITH_FFI_API void lith_write_string(LithPacketWriteHandle packet, const char* str) {
    if (!packet) return;
    static_cast<LithPacketWrite*>(packet)->WriteString(str);
}

LITH_FFI_API const uint8_t* lith_packet_write_get_data(LithPacketWriteHandle packet, uint32_t* out_size) {
    if (!packet) {
        if (out_size) *out_size = 0;
        return nullptr;
    }
    return static_cast<LithPacketWrite*>(packet)->GetData(out_size);
}

LITH_FFI_API uint32_t lith_packet_write_copy_data(LithPacketWriteHandle packet, uint8_t* buffer, uint32_t buffer_size) {
    if (!packet || !buffer || buffer_size == 0) return 0;
    return static_cast<LithPacketWrite*>(packet)->CopyData(buffer, buffer_size);
}

LITH_FFI_API LithPacketReadHandle lith_packet_read_create(const uint8_t* data, uint32_t size_bits) {
    return static_cast<LithPacketReadHandle>(new LithPacketRead(data, size_bits));
}

LITH_FFI_API LithPacketReadHandle lith_packet_read_create_bytes(const uint8_t* data, uint32_t size_bytes) {
    return static_cast<LithPacketReadHandle>(new LithPacketRead(data, size_bytes * 8));
}

LITH_FFI_API LithPacketReadHandle lith_packet_read_from_write(LithPacketWriteHandle write_packet) {
    if (!write_packet) return nullptr;
    return static_cast<LithPacketReadHandle>(
        new LithPacketRead(*static_cast<LithPacketWrite*>(write_packet))
    );
}

LITH_FFI_API void lith_packet_read_destroy(LithPacketReadHandle packet) {
    if (!packet) return;
    delete static_cast<LithPacketRead*>(packet);
}

LITH_FFI_API uint32_t lith_packet_read_size(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->Size();
}

LITH_FFI_API uint32_t lith_packet_read_tell(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->Tell();
}

LITH_FFI_API uint32_t lith_packet_read_tell_end(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->TellEnd();
}

LITH_FFI_API bool lith_packet_read_eop(LithPacketReadHandle packet) {
    if (!packet) return true;
    return static_cast<LithPacketRead*>(packet)->EOP();
}

LITH_FFI_API void lith_packet_read_seek(LithPacketReadHandle packet, int32_t offset_bits) {
    if (!packet) return;
    static_cast<LithPacketRead*>(packet)->Seek(offset_bits);
}

LITH_FFI_API void lith_packet_read_seek_to(LithPacketReadHandle packet, uint32_t position_bits) {
    if (!packet) return;
    static_cast<LithPacketRead*>(packet)->SeekTo(position_bits);
}

LITH_FFI_API uint32_t lith_read_bits(LithPacketReadHandle packet, uint32_t num_bits) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->ReadBits(num_bits);
}

LITH_FFI_API uint64_t lith_read_bits64(LithPacketReadHandle packet, uint32_t num_bits) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->ReadBits64(num_bits);
}

LITH_FFI_API void lith_read_data(LithPacketReadHandle packet, void* data, uint32_t num_bits) {
    if (!packet || !data) return;
    static_cast<LithPacketRead*>(packet)->ReadData(data, num_bits);
}

LITH_FFI_API bool lith_read_bool(LithPacketReadHandle packet) {
    if (!packet) return false;
    return static_cast<LithPacketRead*>(packet)->ReadBits(1) != 0;
}

LITH_FFI_API uint8_t lith_read_uint8(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<uint8_t>(static_cast<LithPacketRead*>(packet)->ReadBits(8));
}

LITH_FFI_API uint16_t lith_read_uint16(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<uint16_t>(static_cast<LithPacketRead*>(packet)->ReadBits(16));
}

LITH_FFI_API uint32_t lith_read_uint32(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->ReadBits(32);
}

LITH_FFI_API uint64_t lith_read_uint64(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->ReadBits64(64);
}

LITH_FFI_API int8_t lith_read_int8(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<int8_t>(static_cast<LithPacketRead*>(packet)->ReadBits(8));
}

LITH_FFI_API int16_t lith_read_int16(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<int16_t>(static_cast<LithPacketRead*>(packet)->ReadBits(16));
}

LITH_FFI_API int32_t lith_read_int32(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<int32_t>(static_cast<LithPacketRead*>(packet)->ReadBits(32));
}

LITH_FFI_API int64_t lith_read_int64(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<int64_t>(static_cast<LithPacketRead*>(packet)->ReadBits64(64));
}

LITH_FFI_API float lith_read_float(LithPacketReadHandle packet) {
    if (!packet) return 0.0f;
    uint32_t bits = static_cast<LithPacketRead*>(packet)->ReadBits(32);
    float result;
    memcpy(&result, &bits, sizeof(result));
    return result;
}

LITH_FFI_API double lith_read_double(LithPacketReadHandle packet) {
    if (!packet) return 0.0;
    uint64_t bits = static_cast<LithPacketRead*>(packet)->ReadBits64(64);
    double result;
    memcpy(&result, &bits, sizeof(result));
    return result;
}

LITH_FFI_API uint32_t lith_read_string(LithPacketReadHandle packet, char* buffer, uint32_t max_len) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->ReadString(buffer, max_len);
}

LITH_FFI_API uint32_t lith_peek_bits(LithPacketReadHandle packet, uint32_t num_bits) {
    if (!packet) return 0;
    LithPacketRead* reader = static_cast<LithPacketRead*>(packet);
    uint32_t savedPos = reader->Tell();
    uint32_t result = reader->ReadBits(num_bits);
    reader->SeekTo(savedPos);
    return result;
}

LITH_FFI_API uint64_t lith_peek_bits64(LithPacketReadHandle packet, uint32_t num_bits) {
    if (!packet) return 0;
    LithPacketRead* reader = static_cast<LithPacketRead*>(packet);
    uint32_t savedPos = reader->Tell();
    uint64_t result = reader->ReadBits64(num_bits);
    reader->SeekTo(savedPos);
    return result;
}

LITH_FFI_API uint8_t lith_peek_uint8(LithPacketReadHandle packet) {
    return static_cast<uint8_t>(lith_peek_bits(packet, 8));
}

LITH_FFI_API uint16_t lith_peek_uint16(LithPacketReadHandle packet) {
    return static_cast<uint16_t>(lith_peek_bits(packet, 16));
}

LITH_FFI_API uint32_t lith_peek_uint32(LithPacketReadHandle packet) {
    return lith_peek_bits(packet, 32);
}

LITH_FFI_API uint32_t lith_packet_calc_checksum(LithPacketReadHandle packet) {
    if (!packet) return 0;
    return static_cast<LithPacketRead*>(packet)->CalcChecksum();
}

LITH_FFI_API const char* lith_get_version(void) {
    return "LithNet FFI v1.0.0 (LithTech-compatible packet read/write)";
}
