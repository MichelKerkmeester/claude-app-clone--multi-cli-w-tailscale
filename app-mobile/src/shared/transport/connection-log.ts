// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Connection Diagnostics Log
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS AND TYPES
// ───────────────────────────────────────────────────────────────────

const CONNECTION_LOG_STORAGE_KEY = 'pi-remote.connection-log';
const CONNECTION_LOG_SCHEMA_VERSION = 1;
const MAX_EVENT_DURATION_MS = 24 * 60 * 60 * 1_000;

export const CONNECTION_LOG_LIMIT = 100;

export type ConnectionLogKind = 'connection' | 'heartbeat' | 'diagnostic';
export type ConnectionLogStatus = 'started' | 'succeeded' | 'failed' | 'unavailable';
export type ConnectionLogCode =
  | 'aborted'
  | 'connectivity'
  | 'host-count'
  | 'invalid-response'
  | 'offline'
  | 'ping'
  | 'rate-limited'
  | 'stale'
  | 'timeout'
  | 'unknown'
  | 'unavailable';

export interface ConnectionLogEventInput {
  readonly at?: string;
  readonly kind: ConnectionLogKind;
  readonly status: ConnectionLogStatus;
  readonly durationMs?: number;
  readonly code?: ConnectionLogCode;
}

export interface ConnectionLogEvent {
  readonly at: string;
  readonly kind: ConnectionLogKind;
  readonly status: ConnectionLogStatus;
  readonly durationMs?: number;
  readonly code?: ConnectionLogCode;
}

export interface ConnectionDiagnostics {
  readonly schemaVersion: typeof CONNECTION_LOG_SCHEMA_VERSION;
  readonly capturedAt: string;
  readonly events: readonly ConnectionLogEvent[];
}

export type DiagnosticsClipboardWriter = (value: string) => Promise<void>;

// ───────────────────────────────────────────────────────────────────
// 2. STORAGE
// ───────────────────────────────────────────────────────────────────

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredEvents(): ConnectionLogEvent[] {
  const storage = localStorageOrNull();
  if (storage === null) return [];

  try {
    const raw = storage.getItem(CONNECTION_LOG_STORAGE_KEY);
    if (raw === null) return [];
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== CONNECTION_LOG_SCHEMA_VERSION) return [];
    if (!Array.isArray(value.events)) return [];
    return value.events
      .map((event) => normalizeStoredEvent(event))
      .filter((event): event is ConnectionLogEvent => event !== null)
      .slice(-CONNECTION_LOG_LIMIT);
  } catch {
    return [];
  }
}

function writeStoredEvents(events: readonly ConnectionLogEvent[]): void {
  const storage = localStorageOrNull();
  if (storage === null) return;
  try {
    storage.setItem(
      CONNECTION_LOG_STORAGE_KEY,
      JSON.stringify({
        version: CONNECTION_LOG_SCHEMA_VERSION,
        events: events.slice(-CONNECTION_LOG_LIMIT),
      }),
    );
  } catch {
    // Diagnostics remain available for this page even when device storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. EVENT NORMALIZATION
// ───────────────────────────────────────────────────────────────────

const EVENT_KINDS: readonly ConnectionLogKind[] = ['connection', 'heartbeat', 'diagnostic'];
const EVENT_STATUSES: readonly ConnectionLogStatus[] = [
  'started',
  'succeeded',
  'failed',
  'unavailable',
];
const EVENT_CODES: readonly ConnectionLogCode[] = [
  'aborted',
  'connectivity',
  'host-count',
  'invalid-response',
  'offline',
  'ping',
  'rate-limited',
  'stale',
  'timeout',
  'unknown',
  'unavailable',
];

function normalizeInputEvent(value: ConnectionLogEventInput): ConnectionLogEvent | null {
  if (!EVENT_KINDS.includes(value.kind) || !EVENT_STATUSES.includes(value.status)) return null;
  const at = normalizeTimestamp(value.at, true);
  if (at === null) return null;
  return buildEvent(value, at);
}

function normalizeStoredEvent(value: unknown): ConnectionLogEvent | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.kind !== 'string' ||
    typeof value.status !== 'string' ||
    !EVENT_KINDS.includes(value.kind as ConnectionLogKind) ||
    !EVENT_STATUSES.includes(value.status as ConnectionLogStatus)
  ) {
    return null;
  }
  const at = normalizeTimestamp(value.at, false);
  if (at === null) return null;
  return buildEvent(
    {
      kind: value.kind as ConnectionLogKind,
      status: value.status as ConnectionLogStatus,
      ...(value.durationMs === undefined ? {} : { durationMs: value.durationMs as number }),
      ...(value.code === undefined ? {} : { code: value.code as ConnectionLogCode }),
    },
    at,
  );
}

function buildEvent(value: ConnectionLogEventInput, at: string): ConnectionLogEvent {
  const durationMs = normalizeDuration(value.durationMs);
  const code = normalizeCode(value.code);
  return {
    at,
    kind: value.kind,
    status: value.status,
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(code === undefined ? {} : { code }),
  };
}

function normalizeTimestamp(value: unknown, allowMissing: boolean): string | null {
  if (value === undefined && allowMissing) return new Date().toISOString();
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizeDuration(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(Math.floor(value), MAX_EVENT_DURATION_MS);
}

function normalizeCode(value: unknown): ConnectionLogCode | undefined {
  return typeof value === 'string' && EVENT_CODES.includes(value as ConnectionLogCode)
    ? (value as ConnectionLogCode)
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ───────────────────────────────────────────────────────────────────
// 4. PUBLIC LOG OPERATIONS
// ───────────────────────────────────────────────────────────────────

/** Append one allowlisted event and discard the oldest event past the ceiling. */
export function appendConnectionEvent(value: ConnectionLogEventInput): void {
  const event = normalizeInputEvent(value);
  if (event === null) return;
  writeStoredEvents([...readStoredEvents(), event]);
}

/** Read the current device-local events in oldest-to-newest order. */
export function readConnectionLog(): readonly ConnectionLogEvent[] {
  return readStoredEvents();
}

/** Remove only this device's diagnostics history. */
export function clearConnectionLog(): void {
  const storage = localStorageOrNull();
  if (storage === null) return;
  try {
    storage.removeItem(CONNECTION_LOG_STORAGE_KEY);
  } catch {
    // A storage failure cannot make the diagnostics surface unusable.
  }
}

/** Serialize only the diagnostics schema; event normalization excludes secrets and free text. */
export function getConnectionDiagnostics(): string {
  const diagnostics: ConnectionDiagnostics = {
    schemaVersion: CONNECTION_LOG_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    events: readConnectionLog(),
  };
  return JSON.stringify(diagnostics, null, 2);
}

/** Copy the structured diagnostics blob through the browser clipboard when available. */
export async function copyConnectionDiagnostics(
  writeText: DiagnosticsClipboardWriter = writeToClipboard,
): Promise<boolean> {
  try {
    await writeText(getConnectionDiagnostics());
    return true;
  } catch {
    return false;
  }
}

async function writeToClipboard(value: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;
  if (clipboard === undefined) throw new Error('Clipboard access is unavailable.');
  await clipboard.writeText(value);
}
