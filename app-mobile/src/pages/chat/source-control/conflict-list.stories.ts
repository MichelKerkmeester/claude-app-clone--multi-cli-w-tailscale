// ───────────────────────────────────────────────────────────────────
// MODULE: CONFLICT LIST STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ConflictList from './conflict-list.svelte';

const meta = {
  title: 'Source Control/ConflictList',
  component: ConflictList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Keeps provider-reported conflicts separate from locally confirmed conflicts so their provenance is not collapsed. Without source-control capability, conflict data, or any conflict entries, no section is rendered.',
      },
    },
  },
} satisfies Meta<typeof ConflictList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const CONFLICTS = {
  providerReported: [
    { path: 'app-mobile/src/routes/session/[id]/+page.svelte' },
    { path: 'app-mobile/src/shared/state/session-state.ts' },
  ],
  locallyConfirmed: [
    { path: 'app-mobile/src/pages/chat/source-control/source-control-hub.svelte' },
    { path: 'app-mobile/src/shared/commands/rank-host-commands.ts' },
  ],
};

export const ProviderReportedAndLocallyConfirmed: Story = {
  args: {
    conflicts: CONFLICTS,
  },
};
