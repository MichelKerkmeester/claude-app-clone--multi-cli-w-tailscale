import type { Meta, StoryObj } from '@storybook/sveltekit';

import ImagePlaceholder from './ImagePlaceholder.svelte';
import {
  INBOUND_IMAGE_LIFECYCLE_STATES,
  imageStatusDefinition,
  type InboundImageLifecycleState,
} from './ImageStatus.svelte';

// Re-host the frozen inbound-image lifecycle vocabulary so every story `state`
// arg is sourced from the real INBOUND_IMAGE_LIFECYCLE_STATES list — nothing is
// invented. The `image-preview` surface keeps the byte-reading stage
// registry-only, so this stories the image-STATE placeholder wells only (no real
// bytes). noAspect is sourced from each state's frozen STATUS_DEFINITIONS via
// imageStatusDefinition; the aspect ratio is the demo image fixture's real 1×1
// ratio for states that render an aspect frame.
const ASPECT_RATIO = 1;

function placeholderStory(state: InboundImageLifecycleState): StoryObj<typeof ImagePlaceholder> {
  const definition = imageStatusDefinition(state);
  return {
    args: {
      state,
      aspectRatio: definition.noAspect ? null : ASPECT_RATIO,
      noAspect: definition.noAspect ?? false,
    },
  };
}

function requireState(state: InboundImageLifecycleState): InboundImageLifecycleState {
  if (!INBOUND_IMAGE_LIFECYCLE_STATES.includes(state)) {
    throw new Error(`Image state "${state}" is not declared by INBOUND_IMAGE_LIFECYCLE_STATES.`);
  }
  return state;
}

const meta: Meta<typeof ImagePlaceholder> = {
  title: 'Artifacts/ImagePlaceholder',
  component: ImagePlaceholder,
  tags: ['autodocs'],
} satisfies Meta<typeof ImagePlaceholder>;

export default meta;
type Story = StoryObj<typeof ImagePlaceholder>;

export const Processing: Story = placeholderStory(requireState('processing'));
export const Withheld: Story = placeholderStory(requireState('withheld'));
export const Denied: Story = placeholderStory(requireState('denied'));
export const Missing: Story = placeholderStory(requireState('missing'));
export const RevisionConflict: Story = placeholderStory(requireState('revision-conflict'));
export const Corrupt: Story = placeholderStory(requireState('corrupt'));
export const Stale: Story = placeholderStory(requireState('stale'));
export const Revoked: Story = placeholderStory(requireState('revoked'));
export const Unsupported: Story = placeholderStory(requireState('unsupported'));
export const Expired: Story = placeholderStory(requireState('expired'));
export const PrivacyCovered: Story = placeholderStory(requireState('privacy-covered'));
