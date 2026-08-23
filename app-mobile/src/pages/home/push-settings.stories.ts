// ───────────────────────────────────────────────────────────────────
// MODULE: PUSH SETTINGS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import PushSettings from './push-settings.svelte';

// Leave the story prop-free so it exercises the component's own graceful relay-error path.
const meta = {
  title: 'Home/PushSettings',
  component: PushSettings,
  tags: ['autodocs'],
} satisfies Meta<typeof PushSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
