// ───────────────────────────────────────────────────────────────────
// MODULE: TODO PANEL STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TodoProjectionV1 } from '@pi-remote/pi-rpc-protocol';

import TodoPanel from './todo-panel.svelte';

// Use the empty projection because task rows are intentionally unavailable in the demo catalog.
// The wrapper owns the unsupported projection-null state, so this story stays focused on the panel.
const EMPTY_PROJECTION: TodoProjectionV1 = {
  planId: 'plan_demo_todos',
  source: 'pi',
  revision: 1,
  updatedAt: '2026-08-18T09:05:00.000Z',
  tasks: [],
};

const noop = (): void => {};

const meta = {
  title: 'Chrome/TodoPanel',
  component: TodoPanel,
  tags: ['autodocs'],
} satisfies Meta<typeof TodoPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    projection: EMPTY_PROJECTION,
    refreshing: false,
    needsRefresh: false,
    announcement: '',
    onRefresh: noop,
    onAnnouncementConsumed: noop,
  },
};

export const Refreshing: Story = {
  args: {
    ...Empty.args,
    refreshing: true,
  },
};

export const NeedsRefresh: Story = {
  args: {
    ...Empty.args,
    needsRefresh: true,
  },
};
