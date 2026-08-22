import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '../../shared/data/demo.js';
import Review from './Review.svelte';

// Re-host the demo session ids through the relay's real /api/sessions shape so
// the Review roster is sourced from demo.ts — nothing is invented. The view
// loads approvals itself; with no live relay it renders its empty state.
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
