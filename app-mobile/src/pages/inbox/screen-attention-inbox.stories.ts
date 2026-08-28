// ───────────────────────────────────────────────────────────────────
// MODULE: ATTENTION INBOX STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
import {
  installStoryHostFetch,
  storyHostHttpError,
} from '$shared/fixtures/story-host-fetch.js';
import AttentionInbox from './screen-attention-inbox.svelte';

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

const meta = {
  title: 'Views/AttentionInbox',
  component: AttentionInbox,
  tags: ['autodocs'],
} satisfies Meta<typeof AttentionInbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onBack: noop, onOpen: noop },
  beforeEach: () =>
    installStoryHostFetch({
      '/api/attention': () => ({ items: DEMO_ATTENTION_ITEMS }),
    }),
};

export const HostError: Story = {
  args: { onBack: noop, onOpen: noop },
  beforeEach: () =>
    installStoryHostFetch({
      '/api/attention': () => storyHostHttpError(404),
    }),
};
