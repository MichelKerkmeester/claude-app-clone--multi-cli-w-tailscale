// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Attention Inbox Read State
// ───────────────────────────────────────────────────────────────────

// Read state is a presentation overlay for this device. It never changes or
// reports the host's unresolved attention state.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS AND TYPES
// ───────────────────────────────────────────────────────────────────

const INBOX_READ_STATE_KEY = 'pi-remote.attention-inbox-read';

export interface InboxReadState {
  readonly readIds: ReadonlySet<string>;
  readonly storageReadable: boolean;
}

function emptyInboxReadState(storageReadable: boolean): InboxReadState {
  return { readIds: new Set(), storageReadable };
}

// ───────────────────────────────────────────────────────────────────
// 2. STORAGE
// ───────────────────────────────────────────────────────────────────

/** Load device-local read ids; storage failure fails open to an empty overlay. */
export function readInboxReadState(): InboxReadState {
  if (typeof window === 'undefined') return emptyInboxReadState(false);

  try {
    const raw = window.localStorage.getItem(INBOX_READ_STATE_KEY);
    if (raw === null) return emptyInboxReadState(true);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
      return emptyInboxReadState(false);
    }
    return { readIds: new Set(parsed), storageReadable: true };
  } catch {
    return emptyInboxReadState(false);
  }
}

/** Persist device-local read ids; report failure so the UI does not hide untracked items. */
export function writeInboxReadState(ids: ReadonlySet<string>): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(INBOX_READ_STATE_KEY, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. PURE TRANSITIONS
// ───────────────────────────────────────────────────────────────────

/** Return a new local overlay with one host lookup id marked read. */
export function markInboxItemRead(
  readIds: ReadonlySet<string>,
  lookupId: string,
): Set<string> {
  const next = new Set(readIds);
  next.add(lookupId);
  return next;
}
