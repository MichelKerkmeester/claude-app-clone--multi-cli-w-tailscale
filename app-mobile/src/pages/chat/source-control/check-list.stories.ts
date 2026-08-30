// ───────────────────────────────────────────────────────────────────
// MODULE: CHECK LIST STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CheckList from './check-list.svelte';

const meta = {
  title: 'Source Control/CheckList',
  component: CheckList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Preserves the host’s check order and expands the first explicitly failing check by default; an `unknown` classification is labeled “MUTED UNRESOLVED,” never treated as passing. Without source-control capability or checks, the list is omitted.',
      },
    },
  },
} satisfies Meta<typeof CheckList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const CHECKS = [
  {
    id: 'check-typecheck',
    name: 'TypeScript typecheck',
    classification: 'failing',
    statusLabel: 'Failing',
    detail: 'src/pages/chat/source-control/check-list.svelte:42 — Type "undefined" is not assignable to type "string".',
    webUrl: 'https://github.com/acme/atlas/actions/runs/9842157/jobs/28401931',
    order: 0,
  },
  {
    id: 'check-preview',
    name: 'Preview deployment',
    classification: 'unknown',
    statusLabel: 'Not reported',
    detail: 'The provider has not reported a deployment result for this revision.',
    webUrl: 'https://github.com/acme/atlas/deployments/preview',
    order: 1,
  },
  {
    id: 'check-eslint',
    name: 'ESLint',
    classification: 'pending',
    statusLabel: 'Running',
    detail: 'Waiting for the lint job to finish on the source-control surfaces.',
    webUrl: 'https://github.com/acme/atlas/actions/workflows/quality.yml',
    order: 2,
  },
  {
    id: 'check-unit-tests',
    name: 'Unit tests',
    classification: 'passing',
    statusLabel: 'Passed',
    detail: '248 tests passed in 31 seconds.',
    webUrl: 'https://github.com/acme/atlas/actions/runs/9842157',
    order: 3,
  },
];

export const WorstFirstWithFailureExpanded: Story = {
  args: {
    checks: CHECKS,
  },
};
