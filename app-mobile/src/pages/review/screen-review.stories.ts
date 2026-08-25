// ───────────────────────────────────────────────────────────────────
// MODULE: REVIEW SCREEN STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import Review from './screen-review.svelte';

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const SESSION_IDS: readonly { readonly id: string }[] = DEMO_SESSIONS.sessions.map(
  (session) => ({ id: session.id }),
);

const noop = (): void => {};

const meta = {
  title: 'Views/Review',
  component: Review,
  tags: ['autodocs'],
} satisfies Meta<typeof Review>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { sessions: SESSION_IDS, onBack: noop, focusId: null },
};

export const Focused: Story = {
  args: { sessions: SESSION_IDS, onBack: noop, focusId: SESSION_IDS[0]?.id ?? null },
};
