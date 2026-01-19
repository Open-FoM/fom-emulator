#pragma once

#include "FomPacketInspector.h"

#include <cstdint>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

/**
 * Repeat-suppression state for a single signature.
 */
struct RepeatState
{
    /** Last log timestamp in ms. */
    uint64_t LastLoggedMs;
    /** Number of suppressed lines. */
    uint32_t Suppressed;
};

/**
 * Expanded rule entry with tag and ID list.
 */
struct RuleEntry
{
    /** Tag string to match. */
    std::string Tag;
    /** Optional list of IDs. */
    std::vector<uint8_t> Ids;
    /** Repeat suppression window in ms. */
    int32_t RepeatMs = -1;
    /** Minimum interval in ms. */
    int32_t MinIntervalMs = -1;
    /** True to suppress matching entries. */
    bool Suppress = false;
};

/**
 * Active profile defaults.
 */
struct ProfileEntry
{
    /** Profile name. */
    std::string Name;
    /** Repeat suppression window in ms. */
    int32_t RepeatMs = -1;
    /** Minimum interval in ms. */
    int32_t MinIntervalMs = -1;
};

/** Global lock for config and rule state. */
extern std::mutex GLock;
/** Active log config. */
extern FomLogConfig GConfig;
/** Active rule list. */
extern std::vector<RuleEntry> GRules;
/** Console allow-list. */
extern std::vector<uint8_t> GAllowConsoleIds;
/** File allow-list. */
extern std::vector<uint8_t> GAllowFileIds;
/** Ignore-list for all outputs. */
extern std::vector<uint8_t> GIgnoreIds;
/** Repeat state for console output. */
extern std::unordered_map<std::string, RepeatState> GRepeatConsole;
/** Repeat state for file output. */
extern std::unordered_map<std::string, RepeatState> GRepeatFile;
/** Active profile entry. */
extern ProfileEntry GProfile;
/** True if config load was attempted. */
extern bool GConfigFileAttempted;
/** True if config load succeeded. */
extern bool GConfigFileLoaded;
/** Resolved config path, if any. */
extern std::string GConfigFilePath;
/** Enable payload offset trace logging. */
extern uint8_t GTraceOffsets;
/** Enable Rak internal parse tracing. */
extern uint8_t GTraceRakParse;
/** Enable verbose Rak internal parse tracing. */
extern uint8_t GTraceRakParseVerbose;

/**
 * Copy config into global state.
 * @param Config Source config.
 */
void CopyConfig(const FomLogConfig* Config);

/**
 * Attempt to load config from disk while holding the lock.
 * @param OverridePath Optional override path.
 * @return True if loaded.
 */
bool TryLoadConfigFromFileLocked(const char* OverridePath);

/**
 * Resolve config path from override or default locations.
 * @param OverridePath Optional override path.
 * @return Resolved path or empty string.
 */
std::string ResolveConfigPath(const char* OverridePath);

/**
 * Load config from a specific ini path while holding the lock.
 * @param IniPath Path to ini.
 * @return True on success.
 */
bool LoadConfigFromIniPathLocked(const char* IniPath);

/**
 * Return a monotonic-ish time in ms for suppression.
 * @return Time in ms.
 */
uint64_t NowMs();

/**
 * Test if an ID exists in a list.
 * @param Id ID to check.
 * @param List List to scan.
 * @return True if present.
 */
bool IdInList(uint8_t Id, const std::vector<uint8_t>& List);

/**
 * Apply profile overrides for the given tag and id.
 * @param Tag Tag string.
 * @param EffectiveId Effective id to match.
 * @param OutMinInterval Output min interval.
 * @param OutRepeat Output repeat window.
 * @param OutForceSuppress Output suppression flag.
 */
void GetProfileOverrides(const std::string& Tag, int EffectiveId, int* OutMinInterval, int* OutRepeat, bool* OutForceSuppress);

/** Return true if offset tracing is enabled (config or env). */
bool IsTraceOffsetsEnabled();
/** Return true if Rak internal parse tracing is enabled (config or env). */
bool IsTraceRakParseEnabled();
/** Return true if verbose Rak parse tracing is enabled (config or env). */
bool IsTraceRakParseVerboseEnabled();
