import type { Meta, StoryObj } from '@storybook/sveltekit';
import PushSettings from './push-settings.svelte';

// PushSettings takes no props and fetches its push config itself; with no
// live relay the onMount fetch rejects and the surface renders its inline
// error state — the same graceful path the real app takes when the relay is
// unreachable. Handlers are component-internal; nothing to supply.
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
