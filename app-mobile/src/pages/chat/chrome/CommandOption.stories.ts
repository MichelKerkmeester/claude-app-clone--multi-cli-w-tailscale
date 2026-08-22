import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import CommandOption from './CommandOption.svelte';
import { rankHostCommands, type RankedHostCommand } from '$shared/data/rankHostCommands.js';
import { demoPostJson } from '$shared/data/demo.js';

// Re-host the demo `/api/commands/list` rows through the real deterministic
// ranker so every CommandOption story's `command` is a real RankedHostCommand
// sourced from demo.ts — nothing is invented. The demo catalog rows are all
// enabled, so a disabled-row story is intentionally omitted (no disabled
// fixture exists in demo.ts; one is not invented).
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
    // 'pl' matches `/plan` as a name-prefix; the ranker emphasizes the matched
    // graphemes structurally — the row shown is the real ranked result.
    command: itemByQuery(FILTERED_BY_PL, 'plan'),
    active: true,
  },
};
