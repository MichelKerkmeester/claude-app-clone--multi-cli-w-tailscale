// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION STATE ICON STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import SessionStateIcon from './session-state-icon.svelte';
import SessionStateIconStoryHost from './session-state-icon-story-host.svelte';

// Idle, running, interrupted, and the unknown fallback over real `SessionCardDto['status']` values.
const meta = {
  title: 'Views/SessionStateIcon',
  component: SessionStateIcon,
  tags: ['autodocs'],
  // Live surfaces wrap the glyph in `.state--idle` / `.state--running` /
  // `.state--interrupted` so currentColor is the status colour. Isolation has
  // no such parent; the host supplies the same wrapper.
  decorators: [
    (_story, context) => ({
      Component: SessionStateIconStoryHost,
      props: { status: context.args.status as SessionCardDto['status'] },
    }),
  ],
} satisfies Meta<typeof SessionStateIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { status: 'idle' } };

export const Running: Story = { args: { status: 'running' } };

export const Interrupted: Story = { args: { status: 'interrupted' } };

export const Unknown: Story = { args: { status: 'unknown' } };
