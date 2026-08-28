// ───────────────────────────────────────────────────────────────────
// MODULE: Attention Inbox Capability Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AttentionInbox from '../src/pages/inbox/screen-attention-inbox.svelte';
import type { AttentionApprovalTicket } from '../src/pages/inbox/screen-attention-inbox.svelte';
import type { InboxEvent } from '../src/shared/format/inbox-timeline.js';

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

const BASE_PROPS = {
  onBack: vi.fn(),
  onOpen: vi.fn(),
};

function item(lookupId: string): AttentionItemDto {
  return {
    lookupId,
    attentionClass: 'needs_input',
    generation: 1,
    nonce: `nonce_${lookupId}`,
    occurredAt: '2026-08-13T10:00:00.000Z',
  };
}

function event(
  eventId: string,
  sessionId: string,
  title: string,
  occurredAt: number,
): InboxEvent {
  return {
    eventId,
    sessionId,
    nodeId: `node_${eventId}`,
    title,
    kind: 'question',
    content: `${title} content`,
    occurredAt,
    resolved: false,
    options: ['Approve', 'Deny'],
  };
}

function ticket(lookupId: string): AttentionApprovalTicket {
  return {
    lookupId,
    ticketId: `ticket_${lookupId}`,
    status: 'blocked',
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

describe('attention inbox capabilities', () => {
  it('renders a host event timeline newest-first across sessions', async () => {
    attention.fetchAttention.mockResolvedValue([item('snapshot_unused')]);
    const stream = [
      event('event_older', 'session_alpha', 'Older request', Date.parse('2026-08-13T09:00:00.000Z')),
      event('event_newer', 'session_beta', 'Newer request', Date.parse('2026-08-13T11:00:00.000Z')),
    ];

    render(AttentionInbox, { props: { ...BASE_PROPS, eventStream: stream } });

    const timeline = await screen.findByRole('region', { name: 'Inbox timeline' });
    const cards = within(timeline).getAllByRole('article');
    expect(cards.map((card) => card.getAttribute('data-inbox-event'))).toEqual([
      'event_newer',
      'event_older',
    ]);
    expect(cards[0]).toHaveTextContent('Newer request');
    expect(cards[1]).toHaveTextContent('Older request');
    expect(screen.queryByText('Needs input')).not.toBeInTheDocument();
  });

  it('keeps the snapshot list and omits the timeline when the event stream is absent', async () => {
    attention.fetchAttention.mockResolvedValue([item('snapshot_only')]);

    render(AttentionInbox, { props: BASE_PROPS });

    expect(await screen.findByText('Needs input')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Inbox timeline' })).not.toBeInTheDocument();
  });

  it('refuses an inline decision when the fresh blocked check says the ticket is stale', async () => {
    const hostItem = item('stale_ticket_item');
    const hostTicket = ticket(hostItem.lookupId);
    const onInlineDecision = vi.fn();
    const isTicketStillBlocked = vi.fn(() => false);
    attention.fetchAttention.mockResolvedValue([hostItem]);
    const user = userEvent.setup();

    render(AttentionInbox, {
      props: {
        ...BASE_PROPS,
        approvalTickets: [hostTicket],
        isTicketStillBlocked,
        onInlineDecision,
      },
    });

    expect(await screen.findByRole('button', { name: 'Approve once' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve once' }));

    await waitFor(() => expect(isTicketStillBlocked).toHaveBeenCalledWith(hostTicket));
    expect(onInlineDecision).not.toHaveBeenCalled();
  });

  it('passes an inline approval to the host when the ticket remains blocked', async () => {
    const hostItem = item('current_ticket_item');
    const hostTicket = ticket(hostItem.lookupId);
    const onInlineDecision = vi.fn().mockResolvedValue(undefined);
    const isTicketStillBlocked = vi.fn(() => true);
    attention.fetchAttention.mockResolvedValue([hostItem]);
    const user = userEvent.setup();

    render(AttentionInbox, {
      props: {
        ...BASE_PROPS,
        approvalTickets: [hostTicket],
        isTicketStillBlocked,
        onInlineDecision,
      },
    });

    expect(await screen.findByRole('button', { name: 'Deny' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve once' }));

    await waitFor(() =>
      expect(onInlineDecision).toHaveBeenCalledWith(hostTicket, 'approve'),
    );
  });

  it('renders no inline approval actions when the ticket payload is absent', async () => {
    attention.fetchAttention.mockResolvedValue([item('without_ticket')]);

    render(AttentionInbox, { props: BASE_PROPS });

    expect(await screen.findByText('Needs input')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve once' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
  });

  it('does not expose batch acknowledgement or report a read item without its host capability', async () => {
    const hostItem = item('without_bulk_rpc');
    attention.fetchAttention.mockResolvedValue([hostItem]);

    render(AttentionInbox, { props: { ...BASE_PROPS, onBulkAcknowledge: undefined } });

    expect(await screen.findByText('Needs input')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select signals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('toolbar', { name: 'Bulk inbox actions' })).not.toBeInTheDocument();
    expect(screen.getByText('Needs input')).toBeInTheDocument();
    expect(window.localStorage.getItem('pi-remote.attention-inbox-read')).toBeNull();
  });

  it('uses the bulk capability without locally reporting acknowledgement', async () => {
    const hostItem = item('with_bulk_rpc');
    const onBulkAcknowledge = vi.fn().mockResolvedValue(undefined);
    attention.fetchAttention.mockResolvedValue([hostItem]);
    const user = userEvent.setup();

    render(AttentionInbox, { props: { ...BASE_PROPS, onBulkAcknowledge } });

    await user.click(await screen.findByRole('button', { name: 'Select signals' }));
    await user.click(screen.getByRole('checkbox', { name: `Select ${hostItem.lookupId}` }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge selected' }));

    await waitFor(() => expect(onBulkAcknowledge).toHaveBeenCalledWith([hostItem.lookupId]));
    expect(screen.getByText('Needs input')).toBeInTheDocument();
    expect(window.localStorage.getItem('pi-remote.attention-inbox-read')).toBeNull();
  });
});
