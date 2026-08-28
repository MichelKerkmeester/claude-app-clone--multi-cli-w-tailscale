// ───────────────────────────────────────────────────────────────────
// MODULE: Attention Inbox Screen Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AttentionInbox from '../src/pages/inbox/screen-attention-inbox.svelte';

const attention = vi.hoisted(() => ({
  fetchAttention: vi.fn(),
  openAttentionHint: vi.fn(),
}));

vi.mock('../src/shared/format/attention.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/format/attention.js')>()),
  ...attention,
}));

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

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

beforeEach(() => {
  window.localStorage.clear();
  attention.fetchAttention.mockReset();
  attention.openAttentionHint.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('attention inbox screen', () => {
  it('marks a signal read locally without opening it and removes it from the count and list', async () => {
    const hostItem = item('attention_screen_001');
    const originalHostItem = { ...hostItem };
    attention.fetchAttention.mockResolvedValue([hostItem]);
    const user = userEvent.setup();

    render(AttentionInbox, { props: { onBack: vi.fn(), onOpen: vi.fn() } });

    expect(await screen.findByText('Needs input')).toBeInTheDocument();
    expect(screen.getByText('1 signals')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    expect(screen.queryByText('Needs input')).not.toBeInTheDocument();
    expect(screen.getByText('0 signals')).toBeInTheDocument();
    expect(attention.fetchAttention).toHaveBeenCalledOnce();
    expect(attention.openAttentionHint).not.toHaveBeenCalled();
    expect(hostItem).toEqual(originalHostItem);
    expect(window.localStorage.getItem('pi-remote.attention-inbox-read')).toBe(
      JSON.stringify([hostItem.lookupId]),
    );
  });

  it('keeps every host signal visible when read storage is unavailable', async () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const first = item('attention_screen_storage_001');
    const second = item('attention_screen_storage_002');
    attention.fetchAttention.mockResolvedValue([first, second]);
    const user = userEvent.setup();

    render(AttentionInbox, { props: { onBack: vi.fn(), onOpen: vi.fn() } });

    expect(await screen.findAllByText('Needs input')).toHaveLength(2);
    expect(screen.getByText('2 signals')).toBeInTheDocument();
    const readButtons = screen.getAllByRole('button', { name: 'Mark as read' });
    expect(readButtons).toHaveLength(2);
    await user.click(readButtons[0]);
    expect(screen.getAllByText('Needs input')).toHaveLength(2);
    expect(screen.getByText('2 signals')).toBeInTheDocument();
  });
});
