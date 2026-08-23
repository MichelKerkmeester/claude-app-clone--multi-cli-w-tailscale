import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TodoProjectionV1 } from '@pi-remote/pi-rpc-protocol';

import TodoPanel from './todo-panel.svelte';

// The `todos` surface is registry-only because the demo projection is not
// exported for a typed preview (see registry.ts): `demoTodoProjection` and
// `DEMO_TODO_TASKS` stay module-private in demo.ts, so the grouped / all-done
// states — which require the unexported task rows — are intentionally omitted
// (nothing invented). The empty state is constructable without inventing task
// content: its `tasks` array is `[]`, and the structural fields below are the
// real values the demo's `demoTodoProjection` 'empty' branch emits
// (planId 'plan_demo_todos', source 'pi', revision 1, updatedAt
// '2026-08-18T09:05:00.000Z'). `unsupported` is a projection-null state owned
// by the TodoProjectionBlock wrapper, not by TodoPanel itself.
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
