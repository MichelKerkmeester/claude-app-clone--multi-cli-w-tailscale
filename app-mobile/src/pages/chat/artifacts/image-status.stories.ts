// ───────────────────────────────────────────────────────────────────
// MODULE: IMAGE STATUS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ImageStatus, {
  INBOUND_IMAGE_LIFECYCLE_STATES,
  imageStatusDefinition,
  type InboundImageLifecycleState,
} from './image-status.svelte';

// Reuse the frozen lifecycle vocabulary so stories cover declared visible states.
// The byte-reading stage stays registry-only and action callbacks remain inert.
function statusStory(state: InboundImageLifecycleState): StoryObj<typeof meta> {
  return { args: { state, onAction: () => {} } };
}

function requireState(state: InboundImageLifecycleState): InboundImageLifecycleState {
  if (!INBOUND_IMAGE_LIFECYCLE_STATES.includes(state)) {
    throw new Error(`Image state "${state}" is not declared by INBOUND_IMAGE_LIFECYCLE_STATES.`);
  }
  const definition = imageStatusDefinition(state);
  if (definition.copy === null && definition.actions.length === 0) {
    throw new Error(`Image state "${state}" renders no visible status.`);
  }
  return state;
}

const meta = {
  title: 'Artifacts/ImageStatus',
  component: ImageStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof ImageStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Processing: Story = statusStory(requireState('processing'));
export const ThumbnailFetching: Story = statusStory(requireState('thumbnail-fetching'));
export const Opening: Story = statusStory(requireState('opening'));
export const FullFetching: Story = statusStory(requireState('full-fetching'));
export const ViewerReady: Story = statusStory(requireState('viewer-ready'));
export const DetailsOpen: Story = statusStory(requireState('details-open'));
export const FullDegraded: Story = statusStory(requireState('full-degraded'));
export const Stalled: Story = statusStory(requireState('stalled'));
export const OfflineLoaded: Story = statusStory(requireState('offline-loaded'));
export const OfflineUnavailable: Story = statusStory(requireState('offline-unavailable'));
export const CapturePermission: Story = statusStory(requireState('capture-permission'));
export const Withheld: Story = statusStory(requireState('withheld'));
export const Denied: Story = statusStory(requireState('denied'));
export const Expired: Story = statusStory(requireState('expired'));
export const Missing: Story = statusStory(requireState('missing'));
export const RevisionConflict: Story = statusStory(requireState('revision-conflict'));
export const Corrupt: Story = statusStory(requireState('corrupt'));
export const RateLimited: Story = statusStory(requireState('rate-limited'));
export const Stale: Story = statusStory(requireState('stale'));
export const Revoked: Story = statusStory(requireState('revoked'));
export const Unsupported: Story = statusStory(requireState('unsupported'));
export const PrivacyCovered: Story = statusStory(requireState('privacy-covered'));
