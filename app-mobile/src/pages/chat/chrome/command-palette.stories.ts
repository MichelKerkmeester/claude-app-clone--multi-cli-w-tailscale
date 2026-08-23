// ───────────────────────────────────────────────────────────────────
// MODULE: COMMAND PALETTE STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import CommandPalette from './command-palette.svelte';
import type {
  HostCommandCatalogState,
  ScopedCommandSnapshot,
  SelectedCommandBinding,
} from '$shared/commands/commands.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Reuse the demo command catalog so ready/loading stories exercise the real snapshot shape.
// The combobox opens from input focus, so the story leaves that interaction intact.
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
