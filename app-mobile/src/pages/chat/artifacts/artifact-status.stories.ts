// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT STATUS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ArtifactStatus from './artifact-status.svelte';
import type { ArtifactResourceStatus } from './use-artifact-resource.svelte.js';
import type { ArtifactViewerPhase } from './types.js';
import { catalogSurfaceById } from '$shared/catalog/catalog-registry.js';
import { DEMO_DIFF_FIXTURE, DEMO_ARTIFACT_STATES_FIXTURE } from '$shared/fixtures/demo.js';

// Reuse catalog-declared status values so the a11y vocabulary and demo subset stay tied to the registry.
// Fixture-only values cannot silently diverge.
const SURFACE = catalogSurfaceById('artifact-status');
if (SURFACE === undefined) {
  throw new Error('The artifact-status surface is missing from the catalog registry.');
}

const STATUSES = SURFACE.states as readonly ArtifactResourceStatus[];
const PHASE: ArtifactViewerPhase = 'viewer-ready';
const SUBJECT = DEMO_DIFF_FIXTURE.summary;

// Keep the demo selector referenced so fixture provenance remains visible to the story.
void DEMO_ARTIFACT_STATES_FIXTURE;

function statusStory(status: ArtifactResourceStatus): StoryObj<typeof meta> {
  return { args: { phase: PHASE, status, subject: SUBJECT } };
}

const meta = {
  title: 'Artifacts/ArtifactStatus',
  component: ArtifactStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof ArtifactStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

function requireStatus(status: ArtifactResourceStatus): ArtifactResourceStatus {
  if (!STATUSES.includes(status)) {
    throw new Error(`Status "${status}" is not declared by the artifact-status surface.`);
  }
  return status;
}

export const Idle: Story = statusStory(requireStatus('idle'));
export const Loading: Story = statusStory(requireStatus('loading'));
export const Stalled: Story = statusStory(requireStatus('stalled'));
export const Ready: Story = statusStory(requireStatus('ready'));
export const Empty: Story = statusStory(requireStatus('empty'));
export const Offline: Story = statusStory(requireStatus('offline'));
export const Stale: Story = statusStory(requireStatus('stale'));
export const Denied: Story = statusStory(requireStatus('denied'));
export const Expired: Story = statusStory(requireStatus('expired'));
export const Missing: Story = statusStory(requireStatus('missing'));
export const Revoked: Story = statusStory(requireStatus('revoked'));
export const Corrupt: Story = statusStory(requireStatus('corrupt'));
export const TooLarge: Story = statusStory(requireStatus('too-large'));
