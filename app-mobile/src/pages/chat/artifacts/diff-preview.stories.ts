// ───────────────────────────────────────────────────────────────────
// MODULE: DIFF PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import DiffPreview from './diff-preview.svelte';
import { DEMO_DIFF_FIXTURE } from '$shared/fixtures/demo.js';

// Frozen unified diff — real line classes, find, and wrap modifiers.
const FIND_TERM = 'expiresAt';

const meta: Meta<typeof DiffPreview> = {
  title: 'Artifacts/DiffPreview',
  component: DiffPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof DiffPreview>;

export default meta;
type Story = StoryObj<typeof DiffPreview>;

export const Add: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch } };
export const Remove: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch } };
export const Context: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch } };
export const FindMatch: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch, findTerm: FIND_TERM } };
export const Wrapped: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch, wrap: true } };
