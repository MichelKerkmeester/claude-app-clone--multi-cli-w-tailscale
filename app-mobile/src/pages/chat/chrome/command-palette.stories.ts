import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import CommandPalette from './command-palette.svelte';
import type {
  HostCommandCatalogState,
  ScopedCommandSnapshot,
  SelectedCommandBinding,
} from '$shared/commands/commands.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Re-host the demo `/api/commands/list` rows as a real HostCommandCatalogState
// so every CommandPalette story's `catalog.commands` is sourced from demo.ts —
// nothing is invented. The catalog snapshot carries the demo host epoch / catalog
// revision the `demoSocket` envelope uses. The palette's bits-ui Combobox opens
// its dropdown on input focus (internal state, no prop to force it open), so the
// catalog shows the ready combobox — the input plus the "/" trigger — over the
// real command rows.
const DEMO_COMMANDS = (
  demoPostJson('/api/commands/list', {}) as {
    commands: readonly CommandDescriptorDto[];
  }
).commands;

const DEMO_SNAPSHOT: ScopedCommandSnapshot = {
  hostEpoch: 'demo-epoch-01',
  sessionId: 'demo-session-refactor',
  sessionRevision: 1,
  catalogRevision: 1,
  commands: DEMO_COMMANDS,
  fetchedAt: Date.now(),
};

function makeCatalog(snapshot: ScopedCommandSnapshot | null): HostCommandCatalogState {
  return {
    status: snapshot === null ? 'loading' : 'ready',
    snapshot,
    commands: snapshot?.commands ?? [],
    refresh: async () => undefined,
  };
}

const noop = (): void => {};
const onInsert = (_name: string, _binding: SelectedCommandBinding): void => {};

const meta = {
  title: 'Chrome/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    catalog: makeCatalog(DEMO_SNAPSHOT),
    onInsert,
  },
};

export const Loading: Story = {
  args: {
    ...Ready.args,
    catalog: makeCatalog(null),
    isDisabled: true,
  },
};
