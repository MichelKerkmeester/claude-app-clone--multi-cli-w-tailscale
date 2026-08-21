import type { Meta, StoryObj } from '@storybook/sveltekit';

import DiffPreview from './DiffPreview.svelte';
import { DEMO_DIFF_FIXTURE } from '../../demo.js';

// Re-host the frozen DEMO_DIFF_FIXTURE patch so every story `patch` arg is the
// real unified-diff fixture — nothing is invented. The `diff-preview` surface
// declares five states; the patch carries add (+), remove (-) and context lines
// together, so Add/Remove/Context render the same fixture (the per-line classes
// drive the tint), FindMatch adds a find term that hits a real fixture line, and
// Wrapped enables the soft-wrap modifier.
const FIND_TERM = 'expiresAt';

const meta = {
  title: 'Artifacts/DiffPreview',
  component: DiffPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof DiffPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch } };
export const Remove: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch } };
export const Context: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch } };
export const FindMatch: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch, findTerm: FIND_TERM } };
export const Wrapped: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch, wrap: true } };
