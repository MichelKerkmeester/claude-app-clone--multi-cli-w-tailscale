// ───────────────────────────────────────────────────────────────────
// MODULE: Attention Inbox Read State Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  markInboxItemRead,
  readInboxReadState,
  writeInboxReadState,
} from '../src/shared/state/inbox-read-state.js';
import {
  countAttentionItems,
  visibleAttentionItems,
} from '../src/shared/format/attention.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const READ_STATE_KEY = 'pi-remote.attention-inbox-read';
const OCCURRED_AT = '2026-08-13T10:00:00.000Z';

function item(lookupId: string): AttentionItemDto {
  return {
    lookupId,
    attentionClass: 'needs_input',
    generation: 1,
    nonce: `nonce_${lookupId}`,
    occurredAt: OCCURRED_AT,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('attention inbox read state', () => {
  it('loads persisted ids without changing the host attention item shape', () => {
    const hostItem = item('attention_read_001');
    window.localStorage.setItem(READ_STATE_KEY, JSON.stringify([hostItem.lookupId]));

    const state = readInboxReadState();

    expect(state.storageReadable).toBe(true);
    expect(state.readIds).toEqual(new Set([hostItem.lookupId]));
    expect(hostItem).toEqual(item('attention_read_001'));
    expect(hostItem).not.toHaveProperty('resolved');
  });

  it('filters a read item locally and leaves the host item unchanged', () => {
    const hostItem = item('attention_filter_001');
    const readIds = markInboxItemRead(new Set(), hostItem.lookupId);

    expect(visibleAttentionItems([hostItem], readIds)).toEqual([]);
    expect(countAttentionItems([hostItem], readIds)).toBe(0);
    expect(hostItem).toEqual(item('attention_filter_001'));
  });

  it('shows every item when local storage cannot be read or written', () => {
    const first = item('attention_storage_001');
    const second = item('attention_storage_002');
    window.localStorage.setItem(READ_STATE_KEY, JSON.stringify([first.lookupId]));
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const state = readInboxReadState();
    const effectiveReadIds = state.storageReadable ? state.readIds : new Set<string>();

    expect(state.storageReadable).toBe(false);
    expect(state.readIds).toEqual(new Set());
    expect(writeInboxReadState(new Set([first.lookupId]))).toBe(false);
    expect(visibleAttentionItems([first, second], effectiveReadIds)).toEqual([first, second]);
    expect(countAttentionItems([first, second], effectiveReadIds)).toBe(2);
  });
});
