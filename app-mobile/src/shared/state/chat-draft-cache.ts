// ───────────────────────────────────────────────────────────────────
// MODULE: Per-session chat draft cache (device-local)
// ───────────────────────────────────────────────────────────────────
// A sessionId-keyed cache that lets the chat screen park its in-progress
// draft on the way out and restore it on the way back, so navigating
// A → Home → B → A keeps every session's work staged exactly where the
// person left it.
//
// Two lanes, because the payloads have different durability:
//  - text drafts persist to localStorage (versioned envelope; a storage
//    failure or malformed entry reads back as an empty draft, never an
//    error) — matches the fail-closed posture of view-mode.ts;
//  - attachment snapshots are memory-only, since Files and blob URLs
//    cannot survive serialization, so they are dropped on reload.
//
// Reads and writes never throw to callers: storage problems degrade to
// "nothing parked" instead of surfacing.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const DRAFT_TEXT_KEY_PREFIX = 'pi-remote.chat-draft:';

interface StoredDraftTextV1 {
  readonly v: 1;
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. TEXT DRAFT LANE (localStorage-backed, fail-closed)
// ───────────────────────────────────────────────────────────────────

/**
 * Park a session's raw draft text. An empty text clears the entry —
 * there is nothing to restore, and a stale park must not outlive the
 * draft the person deleted.
 */
export function parkDraftText(sessionId: string | null | undefined, text: string): void {
  if (sessionId === null || sessionId === undefined) return;
  try {
    const key = DRAFT_TEXT_KEY_PREFIX + sessionId;
    if (text === '') {
      window.localStorage.removeItem(key);
      return;
    }
    const payload: StoredDraftTextV1 = { v: 1, text };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage failure degrades silently; the live draft still exists in the screen.
  }
}

/**
 * Read a session's parked draft text. Any failure — storage unavailable,
 * malformed entry, unknown version — reads back as an empty draft so the
 * composer never shows stale or broken content.
 */
export function readParkedDraftText(sessionId: string | null | undefined): string {
  if (sessionId === null || sessionId === undefined) return '';
  try {
    const raw = window.localStorage.getItem(DRAFT_TEXT_KEY_PREFIX + sessionId);
    if (raw === null) return '';
    return decodeDraftText(raw);
  } catch {
    return '';
  }
}

function decodeDraftText(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const record = parsed as Record<string, unknown>;
    if (record.v !== 1 || typeof record.text !== 'string') return '';
    return record.text;
  } catch {
    return '';
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. ATTACHMENT SNAPSHOT LANE (memory-only)
// ───────────────────────────────────────────────────────────────────

const attachmentParks = new Map<string, unknown>();

/**
 * Park an attachment snapshot for a session, replacing any earlier one.
 * `null` clears the park (e.g. the draft was cleared before leaving).
 */
export function parkAttachmentSnapshot<T>(sessionId: string | null | undefined, snapshot: T): void {
  if (sessionId === null || sessionId === undefined) return;
  if (snapshot === null) {
    attachmentParks.delete(sessionId);
    return;
  }
  attachmentParks.set(sessionId, snapshot);
}

/**
 * Take (consume) a session's parked attachment snapshot, or null when
 * nothing is parked. Consumption makes park-on-leave → restore-on-return
 * idempotent: the next park writes fresh state.
 */
export function takeAttachmentSnapshot<T>(sessionId: string | null | undefined): T | null {
  if (sessionId === null || sessionId === undefined) return null;
  const snapshot = attachmentParks.get(sessionId);
  attachmentParks.delete(sessionId);
  return (snapshot as T) ?? null;
}

// ───────────────────────────────────────────────────────────────────
// 4. SECURITY CLEAR
// ───────────────────────────────────────────────────────────────────

/**
 * Drop every parked draft — text and attachments, all sessions. Security
 * events (logout, app lock) must not leave any session's staged work
 * behind for whoever unlocks the device next.
 */
export function clearChatDraftCache(disposeSnapshot?: (snapshot: unknown) => void): void {
  try {
    const doomed: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key !== null && key.startsWith(DRAFT_TEXT_KEY_PREFIX)) doomed.push(key);
    }
    for (const key of doomed) window.localStorage.removeItem(key);
  } catch {
    // Storage already unavailable — nothing parked there to clear.
  }
  // Snapshots hold live blob URLs for sessions that are not mounted, so the
  // owner must get a chance to revoke them; dropping the Map alone leaks them
  // for the life of the page.
  if (disposeSnapshot !== undefined) {
    for (const snapshot of attachmentParks.values()) {
      try {
        disposeSnapshot(snapshot);
      } catch {
        // A failing disposer must not strand the rest of the cache.
      }
    }
  }
  attachmentParks.clear();
}
