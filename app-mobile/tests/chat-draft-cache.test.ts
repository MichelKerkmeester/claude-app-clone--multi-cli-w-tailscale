// ───────────────────────────────────────────────────────────────────
// MODULE: Per-session Chat Draft Cache Tests
// ───────────────────────────────────────────────────────────────────

// Proves the draft cache fails closed and parks per session: text
// round-trips across a session switch and never leaks between sessions;
// a storage failure or malformed entry reads back as an empty draft,
// never an error; attachment snapshots are memory-only, consume-on-take,
// and a security clear drops every parked draft.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  clearChatDraftCache,
  parkAttachmentSnapshot,
  parkDraftText,
  readParkedDraftText,
  takeAttachmentSnapshot,
} from '../src/shared/state/chat-draft-cache.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

const SESSION_A = 'session_cache_a';
const SESSION_B = 'session_cache_b';

beforeEach(() => {
  clearChatDraftCache();
});

afterEach(() => {
  clearChatDraftCache();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 3. TEXT DRAFT LANE
// ───────────────────────────────────────────────────────────────────

describe('parkDraftText / readParkedDraftText', () => {
  it('round-trips the exact raw draft for its session', () => {
    parkDraftText(SESSION_A, '  padded draft \n');
    expect(readParkedDraftText(SESSION_A)).toBe('  padded draft \n');
  });

  it('isolates parks per session — one session never reads another’s draft', () => {
    parkDraftText(SESSION_A, 'draft a');
    parkDraftText(SESSION_B, 'draft b');
    expect(readParkedDraftText(SESSION_A)).toBe('draft a');
    expect(readParkedDraftText(SESSION_B)).toBe('draft b');
  });

  it('parks an empty draft as nothing — clearing the composer clears the park', () => {
    parkDraftText(SESSION_A, 'draft a');
    parkDraftText(SESSION_A, '');
    expect(readParkedDraftText(SESSION_A)).toBe('');
  });

  it('returns an empty draft when nothing was parked for the session', () => {
    parkDraftText(SESSION_A, 'draft a');
    expect(readParkedDraftText(SESSION_B)).toBe('');
  });

  it('reads back an empty draft when the stored envelope is malformed', () => {
    localStorage.setItem('pi-remote.chat-draft:' + SESSION_A, '{not json at all');
    expect(readParkedDraftText(SESSION_A)).toBe('');
  });

  it('reads back an empty draft when the envelope version is unknown', () => {
    localStorage.setItem('pi-remote.chat-draft:' + SESSION_A, JSON.stringify({ v: 99, text: 'x' }));
    expect(readParkedDraftText(SESSION_A)).toBe('');
  });

  it('reads back an empty draft when localStorage throws on read', () => {
    parkDraftText(SESSION_A, 'draft a');
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(readParkedDraftText(SESSION_A)).toBe('');
    getItemSpy.mockRestore();
  });

  it('silently keeps the live draft when localStorage throws on write', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    expect(() => parkDraftText(SESSION_A, 'draft a')).not.toThrow();
    setItemSpy.mockRestore();
  });

  it('ignores parking without a session id', () => {
    parkDraftText(null, 'no session');
    parkDraftText(undefined, 'no session');
    expect(localStorage.length).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. ATTACHMENT SNAPSHOT LANE
// ───────────────────────────────────────────────────────────────────

describe('parkAttachmentSnapshot / takeAttachmentSnapshot', () => {
  it('parks and takes a snapshot per session', () => {
    const snapshot = { state: { items: [{ id: 'attachment-1' }] }, files: [], nextId: 2 };
    parkAttachmentSnapshot(SESSION_A, snapshot);
    expect(takeAttachmentSnapshot<typeof snapshot>(SESSION_A)).toEqual(snapshot);
  });

  it('consumes the park on take — a second take finds nothing', () => {
    parkAttachmentSnapshot(SESSION_A, { nextId: 5 });
    expect(takeAttachmentSnapshot<{ nextId: number }>(SESSION_A)).toEqual({ nextId: 5 });
    expect(takeAttachmentSnapshot<{ nextId: number }>(SESSION_A)).toBeNull();
  });

  it('does not cross sessions', () => {
    parkAttachmentSnapshot(SESSION_A, { nextId: 1 });
    expect(takeAttachmentSnapshot<{ nextId: number }>(SESSION_B)).toBeNull();
  });

  it('returns null when nothing is parked', () => {
    expect(takeAttachmentSnapshot(SESSION_A)).toBeNull();
  });

  it('clears a stale park when the draft is cleared before leaving', () => {
    parkAttachmentSnapshot(SESSION_A, { nextId: 1 });
    parkAttachmentSnapshot(SESSION_A, null);
    expect(takeAttachmentSnapshot(SESSION_A)).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────
// 5. SECURITY CLEAR
// ───────────────────────────────────────────────────────────────────

describe('clearChatDraftCache', () => {
  it('drops every session’s parked text and attachments', () => {
    parkDraftText(SESSION_A, 'draft a');
    parkDraftText(SESSION_B, 'draft b');
    parkAttachmentSnapshot(SESSION_A, { nextId: 3 });

    clearChatDraftCache();

    expect(readParkedDraftText(SESSION_A)).toBe('');
    expect(readParkedDraftText(SESSION_B)).toBe('');
    expect(takeAttachmentSnapshot(SESSION_A)).toBeNull();
  });
});
