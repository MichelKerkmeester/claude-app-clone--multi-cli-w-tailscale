// ───────────────────────────────────────────────────────────────────
// MODULE: ATTENTION INBOX STORIES
// ───────────────────────────────────────────────────────────────────

import type { StoryObj } from '@storybook/sveltekit';
import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
import {
  installStoryHostFetch,
  storyHostHttpError,
} from '$shared/fixtures/story-host-fetch.js';
import AttentionInbox from './screen-attention-inbox.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const noop = (): void => {};

const DEMO_ATTENTION_ITEMS: readonly AttentionItemDto[] = [
  {
    lookupId: 'attn_needs_input_001',
    attentionClass: 'needs_input',
    generation: 1,
    nonce: 'nonce_attn_needs_input_001',
    occurredAt: '2026-08-28T11:40:00.000Z',
  },
  {
    lookupId: 'attn_finished_001',
    attentionClass: 'finished',
    generation: 1,
    nonce: 'nonce_attn_finished_001',
    occurredAt: '2026-08-28T11:12:00.000Z',
  },
  {
    lookupId: 'attn_error_001',
    attentionClass: 'error',
    generation: 2,
    nonce: 'nonce_attn_error_001',
    occurredAt: '2026-08-28T10:58:00.000Z',
  },
];

// ───────────────────────────────────────────────────────────────────
// 2. STORY CONTROLS
// ───────────────────────────────────────────────────────────────────

const STORY_CONTROLS = 'Story controls';

const INBOX_STATE_OPTIONS = ['empty', 'populated', 'error'] as const;
type InboxState = (typeof INBOX_STATE_OPTIONS)[number];

type InboxStoryArgs = {
  inboxState: InboxState;
  itemCount: number;
};

function clampCount(itemCount: number): number {
  if (!Number.isFinite(itemCount) || itemCount <= 0) return 0;
  return Math.min(Math.floor(itemCount), DEMO_ATTENTION_ITEMS.length);
}

// Inbox state owns the host answer. Count slices the demo items only when that
// state actually shows cards — empty/error with leftover items would still look
// populated because the list renders any returned item. There is no loading
// branch: the screen stays on the empty copy until a host page arrives.
function itemsFor(inboxState: InboxState, itemCount: number): readonly AttentionItemDto[] {
  if (inboxState !== 'populated') return [];
  return DEMO_ATTENTION_ITEMS.slice(0, clampCount(itemCount));
}

function installInboxHost(inboxState: InboxState, itemCount: number): () => void {
  if (inboxState === 'error') {
    return installStoryHostFetch({
      '/api/attention': () => storyHostHttpError(404),
    });
  }
  const items = itemsFor(inboxState, itemCount);
  return installStoryHostFetch({
    '/api/attention': () => ({ items }),
  });
}

function inboxProps(): { onBack: () => void; onOpen: () => void } {
  return {
    onBack: noop,
    onOpen: noop,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. META
// ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Views/AttentionInbox',
  component: AttentionInbox,
  tags: ['autodocs'],
  args: {
    inboxState: 'populated',
    itemCount: DEMO_ATTENTION_ITEMS.length,
  },
  argTypes: {
    inboxState: {
      control: 'radio',
      options: [...INBOX_STATE_OPTIONS],
      table: { category: STORY_CONTROLS },
    },
    itemCount: {
      control: { type: 'range', min: 0, max: DEMO_ATTENTION_ITEMS.length, step: 1 },
      table: { category: STORY_CONTROLS },
    },
  },
  parameters: {
    controls: {
      exclude: [
        'onBack',
        'onOpen',
        'eventStream',
        'approvalTickets',
        'isTicketStillBlocked',
        'onInlineDecision',
        'onBulkAcknowledge',
      ],
    },
  },
  beforeEach: ({ args }: { args: Partial<InboxStoryArgs> }) =>
    installInboxHost(args.inboxState ?? 'populated', args.itemCount ?? DEMO_ATTENTION_ITEMS.length),
  render: () => ({
    Component: AttentionInbox,
    props: inboxProps(),
  }),
};

export default meta;
type Story = StoryObj<InboxStoryArgs>;

export const Default: Story = {
  args: {
    inboxState: 'populated',
    itemCount: DEMO_ATTENTION_ITEMS.length,
  },
};

export const HostError: Story = {
  args: {
    inboxState: 'error',
    itemCount: 0,
  },
};
