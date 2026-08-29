// ───────────────────────────────────────────────────────────────────
// MODULE: DIFF PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import DiffPreview from './diff-preview.svelte';
import { DEMO_DIFF_FIXTURE } from '$shared/fixtures/demo.js';

// Frozen unified diff — real line classes, find, and wrap modifiers.
const FIND_TERM = 'expiresAt';

// Each named story isolates one parsed row kind. The shared fixture mixes add,
// remove, and context in one hunk, so it stays on FindMatch and Wrapped only.
const ADD_PATCH = [
  '--- a/policy.ts',
  '+++ b/policy.ts',
  '@@ -40,0 +41,2 @@ export function verifyTicket(ticket, now) {',
  '+  // Boundary is expired: fail closed rather than admit a stale ticket.',
  '+  if (ticket.expiresAt <= now) return false;',
].join('\n');

const REMOVE_PATCH = [
  '--- a/policy.ts',
  '+++ b/policy.ts',
  '@@ -42,1 +41,0 @@ export function verifyTicket(ticket, now) {',
  '-  if (ticket.expiresAt < now) return true;',
].join('\n');

const CONTEXT_PATCH = [
  '--- a/policy.ts',
  '+++ b/policy.ts',
  '@@ -40,3 +40,3 @@ export function verifyTicket(ticket, now) {',
  '   if (ticket.principal !== expected) return false;',
  '   return true;',
  ' }',
].join('\n');

const meta: Meta<typeof DiffPreview> = {
  title: 'Artifacts/DiffPreview',
  component: DiffPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof DiffPreview>;

export default meta;
type Story = StoryObj<typeof DiffPreview>;

export const Add: Story = { args: { patch: ADD_PATCH } };
export const Remove: Story = { args: { patch: REMOVE_PATCH } };
export const Context: Story = { args: { patch: CONTEXT_PATCH } };
export const FindMatch: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch, findTerm: FIND_TERM } };
export const Wrapped: Story = { args: { patch: DEMO_DIFF_FIXTURE.patch, wrap: true } };
