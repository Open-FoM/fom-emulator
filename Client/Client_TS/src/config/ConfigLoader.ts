import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_PORT } from '../protocol/Constants';

export type ConsoleLogMode = 'off' | 'summary' | 'full';
export type LogFlushMode = 'off' | 'login' | 'always';

function loadEnvFile(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const raw = fs.readFileSync(filePath, 'utf8');
  let applied = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const cleaned = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const idx = cleaned.indexOf('=');
    if (idx <= 0) continue;
    const key = cleaned.slice(0, idx).trim();
    let value = cleaned.slice(idx + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
      applied += 1;
    }
  }
  return applied;
}

function loadIniFile(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const raw = fs.readFileSync(filePath, 'utf8');
  let applied = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    const hasValue = value.length > 0;
    if (hasValue || process.env[key] === undefined) {
      process.env[key] = value;
      applied += 1;
    }
  }
  return applied;
}

function formatBool(value: boolean): string {
  return value ? '1' : '0';
}

function formatPacketIds(ids?: number[]): string {
  if (!ids || ids.length === 0) return '';
  return ids.map((id) => `0x${id.toString(16).padStart(2, '0')}`).join(',');
}

export function loadEnvCandidates(): void {
  const envCandidates: string[] = [];
  const explicit = process.env.FOM_CLIENT_ENV || process.env.FOM_ENV || process.env.FOM_RSA_ENV || process.env.FOM_KEY_ENV;
  if (explicit) envCandidates.push(explicit);

  const cwd = process.cwd();
  envCandidates.push(path.resolve(cwd, 'fom_client.env'));
  envCandidates.push(path.resolve(cwd, '.env'));
  envCandidates.push(path.resolve(cwd, 'ClientEmulator', '.env'));
  envCandidates.push(path.resolve(cwd, 'ClientEmulator', 'fom_client.env'));
  envCandidates.push(path.resolve(cwd, '..', 'ClientEmulator', 'fom_client.env'));

  for (const candidate of envCandidates) {
    try {
      const applied = loadEnvFile(candidate);
      if (applied > 0) {
        // eslint-disable-next-line no-console
        console.log(`[FoMClient] Loaded ${applied} env vars from ${candidate}`);
        break;
      }
    } catch {
      // ignore env load errors, fallback to other candidates
    }
  }

  const iniCandidates: string[] = [];
  const iniExplicit = process.env.FOM_INI || process.env.FOM_CONFIG_INI;
  if (iniExplicit) iniCandidates.push(iniExplicit);
  iniCandidates.push(path.resolve(cwd, 'fom_client.ini'));
  iniCandidates.push(path.resolve(cwd, 'client.ini'));
  iniCandidates.push(path.resolve(cwd, 'config.ini'));
  iniCandidates.push(path.resolve(cwd, 'ClientEmulator', 'fom_client.ini'));
  iniCandidates.push(path.resolve(cwd, 'ClientEmulator', 'client.ini'));
  iniCandidates.push(path.resolve(cwd, 'ClientEmulator', 'config.ini'));
  iniCandidates.push(path.resolve(cwd, '..', 'ClientEmulator', 'fom_client.ini'));

  for (const candidate of iniCandidates) {
    try {
      const applied = loadIniFile(candidate);
      if (applied > 0) {
        // eslint-disable-next-line no-console
        console.log(`[FoMClient] Loaded ${applied} ini vars from ${candidate}`);
        break;
      }
    } catch {
      // ignore ini load errors, fallback to other candidates
    }
  }
}

export function cleanupLegacyLogs(): void {
  const enabled = parseBool(process.env.FOM_CLEAN_LEGACY_LOGS, false);
  if (!enabled) return;
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, 'logs', 'trace_raw.log'),
    path.resolve(cwd, 'logs', 'lithdebug.log'),
    path.resolve(cwd, 'ClientEmulator', 'logs', 'trace_raw.log'),
    path.resolve(cwd, 'ClientEmulator', 'logs', 'lithdebug.log'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        fs.unlinkSync(candidate);
      }
    } catch {
      // ignore cleanup errors
    }
  }
}

export function parseConsoleMode(value?: string): ConsoleLogMode {
  const v = (value || 'summary').toLowerCase();
  if (v === 'off' || v === '0' || v === 'false') return 'off';
  if (v === 'full' || v === 'verbose') return 'full';
  return 'summary';
}

export function parseFlushMode(value?: string): LogFlushMode {
  const v = (value || 'off').toLowerCase();
  if (v === 'always' || v === 'all' || v === '1' || v === 'true' || v === 'on') return 'always';
  if (v === 'login' || v === 'auth') return 'login';
  return 'off';
}

export function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const v = value.toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return defaultValue;
}

export function parsePacketIds(value?: string): number[] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map(v => v.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const ids: number[] = [];
  for (const part of parts) {
    const num = part.startsWith('0x') || part.startsWith('0X') ? parseInt(part, 16) : parseInt(part, 10);
    if (!Number.isNaN(num)) ids.push(num & 0xFF);
  }
  return ids.length > 0 ? ids : undefined;
}

function resolveConfigOutputPath(): string {
  const explicit = process.env.FOM_INI || process.env.FOM_CONFIG_INI;
  if (explicit) return explicit;
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === 'clientemulator') {
    return path.resolve(cwd, 'fom_client.ini');
  }
  return path.resolve(cwd, 'ClientEmulator', 'fom_client.ini');
}

export function writeConfigSnapshot(): void {
  const outPath = resolveConfigOutputPath();
  const overwrite = parseBool(process.env.FOM_CONFIG_OVERWRITE, false);
  if (!overwrite && fs.existsSync(outPath)) return;

  const consoleMode = parseConsoleMode(process.env.PACKET_LOG);
  const consoleMinIntervalMs = Math.max(0, parseInt(process.env.PACKET_LOG_INTERVAL_MS || '5000', 10) || 0);
  const logToFile = parseBool(process.env.PACKET_LOG_FILE, true);
  const analysisEnabled = parseBool(process.env.PACKET_LOG_ANALYSIS, false);
  const consolePacketIds = parsePacketIds(process.env.PACKET_LOG_IDS);
  const filePacketIds = parsePacketIds(process.env.PACKET_LOG_FILE_IDS);
  const ignorePacketIds = parsePacketIds(process.env.PACKET_LOG_IGNORE_IDS);
  const consoleRepeatSuppressMs = Math.max(0, parseInt(process.env.PACKET_LOG_REPEAT_SUPPRESS_MS || '2000', 10) || 0);
  const flushMode = parseFlushMode(process.env.PACKET_LOG_FLUSH);
  const quiet = parseBool(process.env.QUIET_MODE ?? process.env.FOM_QUIET_LOGS, false);
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

  const replyIp = process.env.REPLY_IP || process.env.BIND_IP || process.env.SERVER_IP || '127.0.0.1';
  const replyPortRaw = Number.parseInt(process.env.REPLY_PORT || process.env.PORT || String(DEFAULT_PORT), 10);
  const replyPort = Number.isNaN(replyPortRaw) || replyPortRaw <= 0 ? DEFAULT_PORT : replyPortRaw;

  const worldIp = process.env.WORLD_IP || '127.0.0.1';
  const worldPortRaw = parseInt(process.env.WORLD_PORT || '', 10);
  const worldPort = Number.isNaN(worldPortRaw) || worldPortRaw <= 0 ? DEFAULT_PORT : worldPortRaw;

  const blobBytesRaw = parseInt(process.env.FOM_LOGIN_BLOB_BYTES || '0', 10);
  const blobBitsRaw = parseInt(process.env.FOM_LOGIN_BLOB_BITS || '0', 10);
  const loginBlobBytes = blobBytesRaw > 0 ? blobBytesRaw : (blobBitsRaw > 0 ? Math.ceil(blobBitsRaw / 8) : 256);

  const lines: string[] = [];
  lines.push('# FoM Client Emulator config');
  lines.push(`# Generated ${new Date().toISOString()}`);
  lines.push('# Values reflect current effective settings (env or defaults).');
  lines.push('');
  lines.push('[server]');
  lines.push(`PORT=${Number.isNaN(port) ? DEFAULT_PORT : port}`);
  lines.push(`WORLD_IP=${worldIp}`);
  lines.push(`WORLD_PORT=${worldPort}`);
  lines.push(`REPLY_IP=${replyIp}`);
  lines.push(`REPLY_PORT=${replyPort}`);
  lines.push('BIND_IP=' + (process.env.BIND_IP || ''));
  lines.push('SERVER_IP=' + (process.env.SERVER_IP || ''));
  lines.push('');
  lines.push('[logging]');
  lines.push(`QUIET_MODE=${formatBool(quiet)}`);
  lines.push(`FOM_QUIET_LOGS=${process.env.FOM_QUIET_LOGS || ''}`);
  lines.push(`PACKET_LOG=${consoleMode}`);
  lines.push(`PACKET_LOG_INTERVAL_MS=${consoleMinIntervalMs}`);
  lines.push(`PACKET_LOG_FILE=${formatBool(logToFile)}`);
  lines.push(`PACKET_LOG_ANALYSIS=${formatBool(analysisEnabled)}`);
  lines.push(`PACKET_LOG_IDS=${formatPacketIds(consolePacketIds)}`);
  lines.push(`PACKET_LOG_FILE_IDS=${formatPacketIds(filePacketIds)}`);
  lines.push(`PACKET_LOG_IGNORE_IDS=${formatPacketIds(ignorePacketIds)}`);
  lines.push(`PACKET_LOG_REPEAT_SUPPRESS_MS=${consoleRepeatSuppressMs}`);
  lines.push(`PACKET_LOG_FLUSH=${flushMode}`);
  lines.push(`FOM_CLEAN_LEGACY_LOGS=${formatBool(parseBool(process.env.FOM_CLEAN_LEGACY_LOGS, false))}`);
  lines.push(`PACKET_HANDLER_VERBOSE=${formatBool(parseBool(process.env.PACKET_HANDLER_VERBOSE, false))}`);
  lines.push(`LOGIN_DEBUG=${formatBool(parseBool(process.env.LOGIN_DEBUG, false))}`);
  lines.push(`PACKET_HANDLER_LOG_THROTTLE_MS=${parseInt(process.env.PACKET_HANDLER_LOG_THROTTLE_MS || '5000', 10) || 0}`);
  lines.push('');
  lines.push('[lith_debug]');
  lines.push(`LITH_DEBUG_BURST=${parseInt(process.env.LITH_DEBUG_BURST || '0', 10) || 0}`);
  lines.push(`LITH_DEBUG_TRIGGER=${(process.env.LITH_DEBUG_TRIGGER || 'none').toLowerCase()}`);
  lines.push(`LITH_DEBUG_HEX_BYTES=${parseInt(process.env.LITH_DEBUG_HEX_BYTES || '48', 10) || 0}`);
  lines.push(`LITH_DEBUG_RAW=${formatBool(parseBool(process.env.LITH_DEBUG_RAW, false))}`);
  lines.push(`LITH_DEBUG_RAW_BYTES=${parseInt(process.env.LITH_DEBUG_RAW_BYTES || '512', 10) || 0}`);
  lines.push(`LITH_DEBUG_RAW_MIN=${parseInt(process.env.LITH_DEBUG_RAW_MIN || '0', 10) || 0}`);
  lines.push(`LITH_DEBUG_RAW_MAX=${parseInt(process.env.LITH_DEBUG_RAW_MAX || '0', 10) || 0}`);
  lines.push(`LITH_DEBUG_SCAN=${formatBool(parseBool(process.env.LITH_DEBUG_SCAN, false))}`);
  lines.push(`LITH_DEBUG_SCAN_ANY=${formatBool(parseBool(process.env.LITH_DEBUG_SCAN_ANY, false))}`);
  lines.push(`LITH_DEBUG_SCAN_MAX=${parseInt(process.env.LITH_DEBUG_SCAN_MAX || '12', 10) || 0}`);
  lines.push(`LITH_DEBUG_SCAN_PAYLOAD_BYTES=${parseInt(process.env.LITH_DEBUG_SCAN_PAYLOAD_BYTES || '32', 10) || 0}`);
  lines.push(`LITH_DEBUG_BITS=${formatBool(parseBool(process.env.LITH_DEBUG_BITS, false))}`);
  lines.push(`LITH_DEBUG_BITS_PER_LINE=${parseInt(process.env.LITH_DEBUG_BITS_PER_LINE || '128', 10) || 0}`);
  lines.push(`LITH_DEBUG_BITS_MAX=${parseInt(process.env.LITH_DEBUG_BITS_MAX || '0', 10) || 0}`);
  lines.push(`LITH_HAS_MORE_FLAG=${formatBool(parseBool(process.env.LITH_HAS_MORE_FLAG, false))}`);
  lines.push(`FORCE_LOGIN_ON_FIRST_LITH=${formatBool(parseBool(process.env.FORCE_LOGIN_ON_FIRST_LITH, false))}`);
  lines.push(`LITH_DEBUG_LOG=${formatBool(parseBool(process.env.LITH_DEBUG_LOG, false))}`);
  lines.push(`LITH_DEBUG_LOG_PATH=${process.env.LITH_DEBUG_LOG_PATH || 'logs/lithdebug.log'}`);
  lines.push('');
  lines.push('[login]');
  lines.push(`FOM_LOGIN_BLOB_BYTES=${loginBlobBytes}`);
  lines.push(`FOM_LOGIN_BLOB_BITS=${blobBitsRaw || 0}`);
  lines.push(`LOGIN_REQUIRE_CREDENTIALS=${formatBool(parseBool(process.env.LOGIN_REQUIRE_CREDENTIALS, false))}`);
  lines.push(`LOGIN_RESPONSE_MINIMAL=${formatBool(parseBool(process.env.LOGIN_RESPONSE_MINIMAL, false))}`);
  lines.push('');
  lines.push('[raknet]');
  lines.push(`FOM_HUFFMAN_TABLE=${process.env.FOM_HUFFMAN_TABLE || ''}`);
  lines.push('');
  lines.push('[rsa]');
  lines.push(`FOM_RSA_ENDIAN=${(process.env.FOM_RSA_ENDIAN || 'little').toLowerCase()}`);
  lines.push(`FOM_RSA_PUBLIC_E_HEX=${process.env.FOM_RSA_PUBLIC_E_HEX || '10001'}`);
  lines.push(`FOM_RSA_MODULUS_BYTES=${process.env.FOM_RSA_MODULUS_BYTES || '64'}`);
  lines.push(`FOM_RSA_PRIVATE_P_HEX=${process.env.FOM_RSA_PRIVATE_P_HEX || ''}`);
  lines.push(`FOM_RSA_PRIVATE_Q_HEX=${process.env.FOM_RSA_PRIVATE_Q_HEX || ''}`);
  lines.push(`FOM_RSA_PRIVATE_N_HEX=${process.env.FOM_RSA_PRIVATE_N_HEX || ''}`);
  lines.push(`FOM_RSA_PRIVATE_D_HEX=${process.env.FOM_RSA_PRIVATE_D_HEX || ''}`);
  lines.push('');
  lines.push('[config]');
  lines.push(`FOM_RSA_ENV=${process.env.FOM_RSA_ENV || ''}`);
  lines.push(`FOM_KEY_ENV=${process.env.FOM_KEY_ENV || ''}`);
  lines.push(`FOM_INI=${process.env.FOM_INI || ''}`);
  lines.push(`FOM_CONFIG_INI=${process.env.FOM_CONFIG_INI || ''}`);
  lines.push(`FOM_CONFIG_OVERWRITE=${formatBool(overwrite)}`);
  lines.push('');

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[FoMClient] Wrote config snapshot to ${outPath}`);
}
