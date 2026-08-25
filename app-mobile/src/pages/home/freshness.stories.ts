// ───────────────────────────────────────────────────────────────────
// MODULE: FRESHNESS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import Freshness from './freshness.svelte';

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const UPDATED_AT: string | null = DEMO_SESSIONS.sessions[0]?.updatedAt ?? null;

const meta = {
  title: 'Views/Freshness',
  component: Freshness,
  tags: ['autodocs'],
} satisfies Meta<typeof Freshness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = { args: { stale: false, at: UPDATED_AT } };

export const Stale: Story = { args: { stale: true, at: UPDATED_AT } };
