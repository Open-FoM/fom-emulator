#ifndef FOM_PACKET_INSPECTOR_H
#define FOM_PACKET_INSPECTOR_H

#include <stddef.h>
#include <stdint.h>

#if defined(_WIN32) || defined(_WIN64)
  #if defined(FOM_PI_EXPORTS)
    #define FOM_PI_API __declspec(dllexport)
  #else
    #define FOM_PI_API __declspec(dllimport)
  #endif
#else
  #define FOM_PI_API
#endif

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Direction of a logged packet relative to the app.
 * - FOM_LOG_DIR_RECV: inbound
 * - FOM_LOG_DIR_SEND: outbound
 */
typedef enum FomLogDirection
{
    /** Packet received by the app. */
    FomLogDirRecv = 0,
    /** Packet sent by the app. */
    FomLogDirSend = 1
} FomLogDirection;

/**
 * Output verbosity mode for a log line.
 * - FOM_LOG_MODE_FULL: include full metadata and payload
 * - FOM_LOG_MODE_SUMMARY: minimal metadata only
 */
typedef enum FomLogMode
{
    /** Full log output. */
    FomLogModeFull = 0,
    /** Summary log output. */
    FomLogModeSummary = 1
} FomLogMode;

/**
 * Destination for a log line.
 * - FOM_LOG_TARGET_CONSOLE: console output
 * - FOM_LOG_TARGET_FILE: file output
 */
typedef enum FomLogTarget
{
    /** Log to console. */
    FomLogTargetConsole = 0,
    /** Log to file. */
    FomLogTargetFile = 1
} FomLogTarget;

/**
 * Packet layer classification.
 * - FOM_LAYER_UNKNOWN: not classified
 * - FOM_LAYER_RAK: RakNet layer
 * - FOM_LAYER_LITH: LithTech layer
 */
typedef enum FomPacketLayer
{
    /** Not classified. */
    FomLayerUnknown = 0,
    /** RakNet layer. */
    FomLayerRak = 1,
    /** LithTech layer. */
    FomLayerLith = 2
} FomPacketLayer;

/**
 * Dispatch mode used to classify the packet.
 */
typedef enum FomDispatchMode
{
    /** Raw/unknown classification. */
    FomDispatchRaw = 0,
    /** Schema override parser. */
    FomDispatchOverride = 1,
    /** Heuristic fallback. */
    FomDispatchHeuristic = 2
} FomDispatchMode;

/**
 * Dispatch reason describing why a mode was chosen.
 */
typedef enum FomDispatchReason
{
    /** Success. */
    FomDispatchReasonOk = 0,
    /** No schema registered for the id. */
    FomDispatchReasonNoSchema = 1,
    /** Schema override failed to parse. */
    FomDispatchReasonOverrideFailed = 2,
    /** Heuristic fallback failed. */
    FomDispatchReasonHeuristicFailed = 3,
    /** Heuristic fallback disabled by config. */
    FomDispatchReasonHeuristicDisabled = 4,
    /** Parse failure (insufficient bits or malformed payload). */
    FomDispatchReasonParseFailed = 5
} FomDispatchReason;

/**
 * Inspect outcome for a packet.
 */
typedef enum FomInspectError
{
    /** Inspect succeeded. */
    FomInspectOk = 0,
    /** No data was provided. */
    FomInspectEmpty = 1,
    /** Packet payload was truncated. */
    FomInspectTruncated = 2,
    /** Packet contained only ACKs. */
    FomInspectAckOnly = 3,
    /** Internal parse failed. */
    FomInspectParseFailed = 4
} FomInspectError;

/**
 * Rule that filters or suppresses logging.
 */
typedef struct FomLogRule
{
    /** Tag to match, e.g. "Rak][Net_Recv". */
    const char* Tag;
    /** Optional list of effective IDs to match. */
    const uint8_t* Ids;
    /** Number of entries in ids. */
    uint32_t IdCount;
    /** Repeat suppression window in ms; -1 inherits. */
    int32_t RepeatMs;
    /** Minimum interval in ms; -1 inherits. */
    int32_t MinIntervalMs;
    /** 1 to suppress matched entries. */
    uint8_t Suppress;
} FomLogRule;

/**
 * Profile that groups multiple rules and defaults.
 */
typedef struct FomLogProfile
{
    /** Profile name. */
    const char* Name;
    /** Rules array. */
    const FomLogRule* Rules;
    /** Number of rules. */
    uint32_t RuleCount;
    /** Default repeat suppression window in ms; -1 inherits. */
    int32_t RepeatMs;
    /** Default minimum interval in ms; -1 inherits. */
    int32_t MinIntervalMs;
} FomLogProfile;

/**
 * Simple list of packet IDs for allow/ignore filters.
 */
typedef struct FomLogIdList
{
    /** Pointer to ID array. */
    const uint8_t* Ids;
    /** Count of IDs. */
    uint32_t Count;
} FomLogIdList;

/**
 * Global logging configuration.
 */
typedef struct FomLogConfig
{
    /** Size of this struct for versioning. */
    uint32_t StructSize;
    /** Enable logging. */
    uint8_t Enabled;
    /** Log receive path. */
    uint8_t LogRecv;
    /** Log send path. */
    uint8_t LogSend;
    /** Emit hex dump in output. */
    uint8_t LogHex;
    /** Emit bit-level dump if available. */
    uint8_t LogBits;
    /** Use MSB ordering for bit dump. */
    uint8_t LogBitsMsb;
    /** Emit raw Lith payloads if detected. */
    uint8_t LogLithPayloads;
    /** Include address in header. */
    uint8_t IncludeAddr;
    /** Include connection id in header. */
    uint8_t IncludeConn;
    /** Suppress repeated lines in console. */
    uint8_t SuppressRepeats;
    /** Suppress repeated lines in file. */
    uint8_t SuppressRepeatsInFile;
    /** Emit a line when suppressing repeats. */
    uint8_t EmitSuppressedLine;
    /** Emit ANSI colors to console. */
    uint8_t EmitAnsiConsole;
    /** Force strict parsing (less guessing). */
    uint8_t StrictParsing;
    /** Allow best-guess parsing. */
    uint8_t BestGuessParsing;
    /** Emit dispatch-status line above packet logs. */
    uint8_t DispatchStatus;
    /** Use name-only labels for packet id (fallback to hex if unknown). */
    uint8_t NameOnlyLabels;
    /** Max bytes in hex dump. */
    uint32_t MaxDumpBytes;
    /** Max bits in bit dump. */
    uint32_t MaxDumpBits;
    /** Bits per line in bit dump. */
    uint32_t BitsPerLine;
    /** Minimum interval between lines in ms. */
    int32_t MinIntervalMs;
    /** Repeat suppression window in ms. */
    int32_t RepeatSuppressMs;
    /** Allow-list for console output. */
    FomLogIdList AllowConsoleIds;
    /** Allow-list for file output. */
    FomLogIdList AllowFileIds;
    /** Ignore-list applied to all output. */
    FomLogIdList IgnoreIds;
    /** Active profile with rules and defaults. */
    FomLogProfile Profile;
} FomLogConfig;

/**
 * Input packet metadata for logging.
 */
typedef struct FomLogEvent
{
    /** Packet buffer. */
    const uint8_t* Data;
    /** Length in bytes. */
    uint32_t Length;
    /** Length in bits (0 if unknown). */
    uint32_t BitLength;
    /** Direction of traffic. */
    FomLogDirection Direction;
    /** Optional override tag (e.g., "Net_Send"). */
    const char* TagOverride;
    /** Optional address string. */
    const char* Address;
    /** Optional port. */
    uint16_t Port;
    /** Optional connection id (-1 if unknown). */
    int32_t ConnectionId;
    /** Force effective id (-1 to auto). */
    int32_t ForceId;
    /** Force layer (-1 to auto). */
    int32_t LayerOverride;
} FomLogEvent;

/**
 * Classification result for a packet.
 */
typedef struct FomInspectResult
{
    /** Inspect status code. */
    FomInspectError Error;
    /** Classified layer. */
    FomPacketLayer Layer;
    /** Outer packet id. */
    uint8_t OuterId;
    /** Inner packet id. */
    uint8_t InnerId;
    /** Lith packet id if known. */
    uint8_t LithId;
    /** Effective id used for logging. */
    uint8_t EffectiveId;
    /** Timestamp present flag. */
    uint8_t HasTimestamp;
    /** Timestamp byte width. */
    uint8_t TimestampBytes;
    /** Timestamp value if present. */
    uint64_t Timestamp;
    /** Payload offset in bytes. */
    uint32_t PayloadOffset;
    /** Payload length in bytes. */
    uint32_t PayloadLength;
    /** Reliability flag if parsed. */
    uint8_t IsReliable;
    /** Dispatch mode for classification. */
    uint8_t DispatchMode;
    /** Dispatch reason for classification. */
    uint8_t DispatchReason;
    /** Dispatch success flag. */
    uint8_t DispatchOk;
    /** Reserved for alignment. */
    uint8_t DispatchReserved;
    /** Payload offset in bits (relative to original packet). */
    uint32_t PayloadOffsetBits;
    /** Payload length in bits (relative to effective payload). */
    uint32_t PayloadBitLength;
} FomInspectResult;

/**
 * Per-call decision and suppression state.
 */
typedef struct FomLogDecision
{
    /** 1 if the line should be logged. */
    uint8_t ShouldLog;
    /** Number of suppressed lines since last log. */
    uint32_t Suppressed;
    /** Inspect result for this event. */
    FomInspectResult Inspect;
} FomLogDecision;

/**
 * Initialize logging using the provided config.
 * @param Config Optional config; if null, defaults are used.
 */
FOM_PI_API void FomLogInit(const FomLogConfig* Config);

/**
 * Initialize logging using simple scalar parameters.
 * @param Enabled Enable logging when non-zero.
 * @param LogRecv Log receive events when non-zero.
 * @param LogSend Log send events when non-zero.
 * @param LogHex Emit hex dump when non-zero.
 * @param IncludeAddr Include address in header when non-zero.
 * @param IncludeConn Include connection id in header when non-zero.
 * @param SuppressRepeats Suppress repeats in console when non-zero.
 * @param SuppressRepeatsInFile Suppress repeats in file when non-zero.
 * @param EmitSuppressedLine Emit suppression line when non-zero.
 * @param EmitAnsiConsole Emit ANSI colors when non-zero.
 * @param StrictParsing Use strict parsing when non-zero.
 * @param BestGuessParsing Use best-guess parsing when non-zero.
 * @param MaxDumpBytes Max bytes in hex dump.
 * @param MinIntervalMs Minimum interval between logs.
 * @param RepeatSuppressMs Suppression window for repeats.
 */
FOM_PI_API void FomLogInitSimple(int32_t Enabled, int32_t LogRecv, int32_t LogSend, int32_t LogHex, int32_t IncludeAddr, int32_t IncludeConn, int32_t SuppressRepeats, int32_t SuppressRepeatsInFile, int32_t EmitSuppressedLine, int32_t EmitAnsiConsole, int32_t StrictParsing, int32_t BestGuessParsing, uint32_t MaxDumpBytes, int32_t MinIntervalMs, int32_t RepeatSuppressMs);

/**
 * Clear rules and reset config state.
 */
FOM_PI_API void FomLogShutdown(void);

/**
 * Remove all active rules.
 */
FOM_PI_API void FomLogClearRules(void);

/**
 * Add a rule to the active set.
 * @param Rule Rule to add.
 */
FOM_PI_API void FomLogAddRule(const FomLogRule* Rule);

/**
 * Replace current profile with the provided one.
 * @param Profile Profile to apply.
 */
FOM_PI_API void FomLogSetProfile(const FomLogProfile* Profile);

/**
 * Set profile defaults without rules.
 * @param Name Profile name.
 * @param RepeatMs Default repeat suppression window.
 * @param MinIntervalMs Default minimum interval.
 */
FOM_PI_API void FomLogSetProfileSimple(const char* Name, int32_t RepeatMs, int32_t MinIntervalMs);

/**
 * Add a rule with simple arguments.
 * @param Tag Tag to match.
 * @param Ids Optional list of IDs.
 * @param IdCount Number of IDs.
 * @param RepeatMs Repeat suppression window.
 * @param MinIntervalMs Minimum interval.
 * @param Suppress Suppress when non-zero.
 */
FOM_PI_API void FomLogAddRuleSimple(const char* Tag, const uint8_t* Ids, uint32_t IdCount, int32_t RepeatMs, int32_t MinIntervalMs, int32_t Suppress);

/**
 * Set the allow-list for console output.
 * @param Ids ID list.
 * @param Count Number of IDs.
 */
FOM_PI_API void FomLogSetAllowConsoleIds(const uint8_t* Ids, uint32_t Count);

/**
 * Set the allow-list for file output.
 * @param Ids ID list.
 * @param Count Number of IDs.
 */
FOM_PI_API void FomLogSetAllowFileIds(const uint8_t* Ids, uint32_t Count);

/**
 * Set the ignore-list for all output.
 * @param Ids ID list.
 * @param Count Number of IDs.
 */
FOM_PI_API void FomLogSetIgnoreIds(const uint8_t* Ids, uint32_t Count);

/**
 * Load config from an ini file on disk.
 * @param Path Optional path override.
 * @return 1 on success, 0 on failure.
 */
FOM_PI_API int FomLogLoadConfigFile(const char* Path);

/**
 * Inspect a packet and classify IDs/layer.
 * @param Data Packet bytes.
 * @param Length Packet length in bytes.
 * @param OutResult Output inspect result.
 * @return 1 on success, 0 on failure.
 */
FOM_PI_API int FomInspectPacket(const uint8_t* Data, uint32_t Length, FomInspectResult* OutResult);

/**
 * Classify a packet and return effective id/layer/offset info (simple outputs).
 * @param Data Packet bytes.
 * @param Length Packet length in bytes.
 * @param OutEffectiveId Output effective id.
 * @param OutLayer Output packet layer.
 * @param OutInnerId Output inner id (if any).
 * @param OutPayloadOffset Output payload offset in bytes.
 * @param OutPayloadLength Output payload length in bytes.
 * @param OutPayloadOffsetBits Output payload offset in bits.
 * @param OutPayloadBitLength Output payload length in bits.
 * @param OutDispatchMode Output dispatch mode.
 * @param OutDispatchReason Output dispatch reason.
 * @return 1 on success, 0 otherwise.
 */
FOM_PI_API int FomClassifyPacketSimple(const uint8_t* Data,
                                       uint32_t Length,
                                       int32_t* OutEffectiveId,
                                       int32_t* OutLayer,
                                       int32_t* OutInnerId,
                                       uint32_t* OutPayloadOffset,
                                       uint32_t* OutPayloadLength,
                                       uint32_t* OutPayloadOffsetBits,
                                       uint32_t* OutPayloadBitLength,
                                       int32_t* OutDispatchMode,
                                       int32_t* OutDispatchReason);

/**
 * Process a log event and optionally render a log line.
 * @param Evt Input event.
 * @param Target Output target.
 * @param Mode Output mode.
 * @param OutBuffer Output buffer (optional).
 * @param OutBufferSize Output buffer size.
 * @param OutDecision Optional decision struct.
 * @return 1 if processed, 0 otherwise.
 */
FOM_PI_API int FomLogProcessEvent(const FomLogEvent* Evt, FomLogTarget Target, FomLogMode Mode, char* OutBuffer, uint32_t OutBufferSize, FomLogDecision* OutDecision);

/**
 * Convenience wrapper for FomLogProcessEvent.
 * @param Data Packet bytes.
 * @param Length Packet length in bytes.
 * @param BitLength Packet length in bits (0 if unknown).
 * @param Direction Direction value.
 * @param TagOverride Optional override tag.
 * @param Address Optional address string.
 * @param Port Optional port.
 * @param ConnectionId Optional connection id.
 * @param ForceId Forced effective id (-1 to auto).
 * @param LayerOverride Forced layer (-1 to auto).
 * @param Target Target value.
 * @param Mode Mode value.
 * @param OutBuffer Output buffer (optional).
 * @param OutBufferSize Output buffer size.
 * @param OutDecision Optional decision struct.
 * @return 1 if processed, 0 otherwise.
 */
FOM_PI_API int FomLogProcessEventSimple(const uint8_t* Data, uint32_t Length, uint32_t BitLength, int32_t Direction, const char* TagOverride, const char* Address, uint16_t Port, int32_t ConnectionId, int32_t ForceId, int32_t LayerOverride, int32_t Target, int32_t Mode, char* OutBuffer, uint32_t OutBufferSize, FomLogDecision* OutDecision);

#ifdef __cplusplus
}
#endif

#endif
