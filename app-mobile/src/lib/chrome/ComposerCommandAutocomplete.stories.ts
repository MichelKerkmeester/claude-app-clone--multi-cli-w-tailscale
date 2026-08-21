import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import ComposerCommandAutocomplete, {
  deriveSlashPanelState,
  type SlashPanelDerivation,
} from './ComposerCommandAutocomplete.svelte';
import type {
  HostCommandCatalogState,
  ScopedCommandSnapshot,
} from '../../commands.js';
import { rankHostCommands, type RankedHostCommand } from '../../rankHostCommands.js';
import { demoPostJson } from '../../demo.js';

// Re-host the demo `/api/commands/list` rows through the real ranker and the
// panel's exported state-machine derivation so every story's `items` and
// `derivation` are sourced from demo.ts — nothing is invented. The panel takes
// an `open` prop, so these stories force it open to render real content (the
// row-bearing and copy-led states). `getAnchor` returns null: the panel then
// renders fixed at the viewport origin (no anchor rect), which is enough to
// show the real surface without inventing a composer tray.
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

const READY_CATALOG = makeCatalog(DEMO_SNAPSHOT);
const LOADING_CATALOG = makeCatalog(null);

function deriveReady(query: string): {
  derivation: SlashPanelDerivation;
  items: readonly RankedHostCommand[];
  activeName: string | null;
} {
  const ranked = rankHostCommands(DEMO_COMMANDS, query);
  const derivation = deriveSlashPanelState({
    triggerActive: true,
    query,
    draftStartsWithSlash: true,
    commitPending: false,
    catalogStatus: 'ready',
    snapshotPresent: true,
    catalogCount: DEMO_COMMANDS.length,
    matchCount: ranked.items.length,
    running: false,
  });
  return { derivation, items: ranked.items, activeName: ranked.activeName };
}

const READY_UNFILTERED = deriveReady('');
const READY_FILTERED = deriveReady('pl');
const READY_NO_MATCHES = deriveReady('xyz');

const LOADING_DERIVATION = deriveSlashPanelState({
  triggerActive: true,
  query: '',
  draftStartsWithSlash: true,
  commitPending: false,
  catalogStatus: 'loading',
  snapshotPresent: false,
  catalogCount: 0,
  matchCount: 0,
  running: false,
});

const noop = (): void => {};

const baseArgs = {
  prompt: '/',
  open: true,
  catalog: READY_CATALOG,
  running: false,
  getAnchor: (): HTMLElement | null => null,
  onInsert: noop,
  onDisabledPress: noop,
  onRetry: noop,
  onAnnounce: noop,
};

const meta = {
  title: 'Chrome/ComposerCommandAutocomplete',
  component: ComposerCommandAutocomplete,
  tags: ['autodocs'],
} satisfies Meta<typeof ComposerCommandAutocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyUnfiltered: Story = {
  args: {
    ...baseArgs,
    derivation: READY_UNFILTERED.derivation,
    activeName: READY_UNFILTERED.activeName,
    items: READY_UNFILTERED.items,
  },
};

export const ReadyFiltered: Story = {
  args: {
    ...baseArgs,
    prompt: '/pl',
    derivation: READY_FILTERED.derivation,
    activeName: READY_FILTERED.activeName,
    items: READY_FILTERED.items,
  },
};

export const ReadyNoMatches: Story = {
  args: {
    ...baseArgs,
    prompt: '/xyz',
    derivation: READY_NO_MATCHES.derivation,
    activeName: READY_NO_MATCHES.activeName,
    items: READY_NO_MATCHES.items,
  },
};

export const LoadingInitial: Story = {
  args: {
    ...baseArgs,
    catalog: LOADING_CATALOG,
    derivation: LOADING_DERIVATION,
    activeName: null,
    items: [],
  },
};
