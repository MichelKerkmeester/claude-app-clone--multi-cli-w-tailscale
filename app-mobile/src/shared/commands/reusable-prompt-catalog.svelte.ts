// ───────────────────────────────────────────────────────────────────
// MODULE: Reusable-Prompt Catalog + Picker (web) — host-gated
// ───────────────────────────────────────────────────────────────────
// Session-scoped client half for the host's reusable-prompt (skills) catalog.
// The relay does not expose the field yet, so the picker stays inert and
// unreachable: no caller feeds it, no rows are invented, and absent or
// malformed host data degrades to an empty, invisible picker.
//
// The candidate field contract is `reusablePrompts` on a host payload,
// carrying session-scoped entries. It is only accepted through
// `extractReusablePromptCatalog` plus `isReusablePromptCatalogPayload`, so
// whatever carrier eventually ships it lights the picker up without new
// client logic; anything else — absent field, wrong shape, wrong session —
// keeps it inert.
//
// There is no host write path here: insertion returns draft text and the
// person edits and sends it themselves, so scoping needs the session id
// alone (no epoch ticket), mirroring insertSlashCommand's locality.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { untrack } from 'svelte';

import { bindingFor, type ScopedCommandSnapshot } from './commands.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One reusable prompt entry: identity, display title, draft body, origin. */
export interface ReusablePromptEntryDto {
  readonly name: string;
  readonly title: string;
  readonly body: string;
  /** Provider origin (extension id, pack name...); collision badge key. */
  readonly source: string;
}

/**
 * The client-side expectation for the host's reusable-prompt catalog field:
 * session-scoped and bounded. Absent or malformed host data degrades to an
 * inert picker, never fabricated rows.
 */
export interface ReusablePromptCatalogDto {
  readonly sessionId: string;
  readonly entries: readonly ReusablePromptEntryDto[];
}

/** One picker row as a future surface renders it: entry plus collision badge. */
export interface ReusablePromptPickerEntry {
  readonly entry: ReusablePromptEntryDto;
  /** True when the name is available from more than one source. */
  readonly collidesWithOtherSource: boolean;
}

export type ReusablePromptPickerStatus = 'inert' | 'ready';

export interface ReusablePromptPickerState {
  readonly status: ReusablePromptPickerStatus;
  /** Current session picker rows, empty while inert. */
  readonly entries: readonly ReusablePromptPickerEntry[];
  /** False means a surface renders nothing at all — no trigger, no rows. */
  readonly visible: boolean;
  /** Guarded intake for the host carrier: pass the raw payload the field rides on. */
  readonly acceptCatalog: (raw: unknown) => void;
}

export interface InsertReusablePromptInput {
  readonly draft: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly entry: ReusablePromptEntryDto;
}

export interface InsertReusablePromptResult {
  readonly draft: string;
  readonly caretOffset: number;
  readonly announcement: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const MAX_CATALOG_ENTRIES = 500;
// Same canonical token grammar as slash command names: no leading slash,
// whitespace, path, control, or bidi characters — collision checks compare
// the two catalogs on identical identity terms.
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;

// ───────────────────────────────────────────────────────────────────
// 4. GUARD HELPERS
// ───────────────────────────────────────────────────────────────────

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return (
    own.length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isPickerName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && NAME_PATTERN.test(value);
}

// ───────────────────────────────────────────────────────────────────
// 5. GUARDED INTAKE
// ───────────────────────────────────────────────────────────────────

/** Narrow one entry: bounded strings, canonical name grammar. */
export function isReusablePromptEntry(value: unknown): value is ReusablePromptEntryDto {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, ['name', 'title', 'body', 'source']) &&
    isPickerName(record.name) &&
    isBoundedString(record.title, 120) &&
    isBoundedString(record.body, 2000) &&
    isBoundedString(record.source, 64)
  );
}

/** Narrow the whole field: session-scoped, bounded row count, every row guarded. */
export function isReusablePromptCatalogPayload(value: unknown): value is ReusablePromptCatalogDto {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, ['sessionId', 'entries']) &&
    typeof record.sessionId === 'string' &&
    SESSION_ID_PATTERN.test(record.sessionId) &&
    Array.isArray(record.entries) &&
    record.entries.length <= MAX_CATALOG_ENTRIES &&
    record.entries.every(isReusablePromptEntry)
  );
}

/**
 * Read the optional field off a raw host payload. Absent or malformed
 * resolves to null — the picker stays inert. The same entry point will serve
 * whichever carrier the host contract eventually ships.
 */
export function extractReusablePromptCatalog(payload: unknown): ReusablePromptCatalogDto | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const field = (payload as { reusablePrompts?: unknown }).reusablePrompts;
  return isReusablePromptCatalogPayload(field) ? field : null;
}

// ───────────────────────────────────────────────────────────────────
// 6. COLLISION BADGE
// ───────────────────────────────────────────────────────────────────

/**
 * True when the name is available from more than one source: another picker
 * entry of a different source, or an enabled slash-command row. Disabled
 * command rows are not available, so they never badge.
 */
export function entryHasNameCollision(
  name: string,
  ownSource: string,
  entries: readonly ReusablePromptEntryDto[],
  commandSnapshot: ScopedCommandSnapshot | null,
): boolean {
  const commandOffers = bindingFor(commandSnapshot, name) !== null;
  const otherEntryOffers = entries.some(
    (other) => other.name === name && other.source !== ownSource,
  );
  return commandOffers || otherEntryOffers;
}

// ───────────────────────────────────────────────────────────────────
// 7. DRAFT INSERTION
// ───────────────────────────────────────────────────────────────────

/**
 * Insert the entry's body as an editable draft. Pure: no network, no ticket,
 * no binding — the person edits and sends it themselves.
 */
export function insertReusablePrompt(input: InsertReusablePromptInput): InsertReusablePromptResult {
  const start = Math.min(input.selectionStart, input.selectionEnd);
  const end = Math.max(input.selectionStart, input.selectionEnd);
  const draft = input.draft.slice(0, start) + input.entry.body + input.draft.slice(end);
  return {
    draft,
    caretOffset: start + input.entry.body.length,
    announcement: `Inserted ${input.entry.title}. Not sent.`,
  };
}

// ───────────────────────────────────────────────────────────────────
// 8. SESSION-SCOPED PICKER LIFECYCLE
// ───────────────────────────────────────────────────────────────────

/**
 * Session-scoped picker lifecycle, the analog of the host-command-catalog
 * hook. Inert by default: nothing calls acceptCatalog until the host ships
 * its reusable-prompt field, so every projection is empty and any surface
 * built on this renders nothing at all.
 */
export function useReusablePromptPicker(
  getSessionId: () => string,
  getCommandSnapshot: () => ScopedCommandSnapshot | null,
): ReusablePromptPickerState {
  let state = $state<{ status: ReusablePromptPickerStatus; snapshot: ReusablePromptCatalogDto | null }>(
    { status: 'inert', snapshot: null },
  );

  function dispatch(next: {
    status: ReusablePromptPickerStatus;
    snapshot: ReusablePromptCatalogDto | null;
  }): void {
    state = next;
  }

  // Session change drops inherited rows: another session cannot see this one's catalog.
  $effect(() => {
    getSessionId();
    untrack(() => dispatch({ status: 'inert', snapshot: null }));
  });

  // Guarded, scope-checked intake: the future host carrier calls this with
  // the raw payload; absent fields, malformed shapes, and foreign sessions
  // all fail closed to inert.
  function acceptCatalog(raw: unknown): void {
    const catalog = extractReusablePromptCatalog(raw);
    if (catalog === null || catalog.sessionId !== getSessionId()) return;
    dispatch({ status: 'ready', snapshot: catalog });
  }

  return {
    get status() {
      return state.status;
    },
    get entries() {
      const snapshot = state.snapshot;
      if (state.status !== 'ready' || snapshot === null) return [];
      const commands = getCommandSnapshot();
      return snapshot.entries.map((entry) => ({
        entry,
        collidesWithOtherSource: entryHasNameCollision(
          entry.name,
          entry.source,
          snapshot.entries,
          commands,
        ),
      }));
    },
    get visible() {
      return state.status === 'ready' && state.snapshot !== null && state.snapshot.entries.length > 0;
    },
    acceptCatalog,
  };
}
