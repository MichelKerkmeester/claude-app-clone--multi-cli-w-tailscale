// ───────────────────────────────────────────────────────────────────
// MODULE: COMMAND OPTION STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import CommandOption from './command-option.svelte';
import { rankHostCommands, type RankedHostCommand } from '$shared/commands/rank-host-commands.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Demo catalog + ranker; no disabled row (catalog has none).
const DEMO_COMMANDS = (
  demoPostJson('/api/commands/list', {}) as {
    commands: readonly CommandDescriptorDto[];
  }
).commands;

const UNFILTERED = rankHostCommands(DEMO_COMMANDS, '');
const FILTERED_BY_PL = rankHostCommands(DEMO_COMMANDS, 'pl');

function itemByQuery(
  list: { items: readonly RankedHostCommand[] },
  name: string,
): RankedHostCommand {
  const found = list.items.find((item) => item.name === name);
  if (found === undefined) {
    throw new Error(`No ranked command found for name "${name}".`);
  }
  return found;
}

const noop = (): void => {};

const meta = {
  title: 'Chrome/CommandOption',
  component: CommandOption,
  tags: ['autodocs'],
} satisfies Meta<typeof CommandOption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    command: itemByQuery(UNFILTERED, 'plan'),
    active: true,
    onInsert: noop,
    onDisabledPress: noop,
  },
};

export const Inactive: Story = {
  args: {
    ...Active.args,
    active: false,
  },
};

export const Matched: Story = {
  args: {
    ...Active.args,
    // Prefix query exercises real ranker match highlighting.
    command: itemByQuery(FILTERED_BY_PL, 'plan'),
    active: true,
  },
};
