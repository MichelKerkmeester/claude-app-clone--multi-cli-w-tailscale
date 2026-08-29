// ───────────────────────────────────────────────────────────────────
// MODULE: ENROLLMENT SCREEN STORIES
// ───────────────────────────────────────────────────────────────────

import type { StoryObj } from '@storybook/sveltekit';
import type { DeviceIdentity } from '$shared/transport/auth.js';
import Enrollment from './screen-enrollment.svelte';

const onEnrolled: (device: DeviceIdentity) => void = () => {};

const STORY_CONTROLS = 'Story controls';
const ENROLLMENT_PHASE_OPTIONS = ['unenrolled', 'authenticating'] as const;
type EnrollmentPhase = (typeof ENROLLMENT_PHASE_OPTIONS)[number];
type EnrollmentStoryArgs = {
  enrollmentPhase: EnrollmentPhase;
};

function enrollmentProps(args: Partial<EnrollmentStoryArgs>) {
  return {
    phase: args.enrollmentPhase ?? 'unenrolled',
    onEnrolled,
  };
}

const meta = {
  title: 'Views/Enrollment',
  component: Enrollment,
  tags: ['autodocs'],
  args: {
    enrollmentPhase: 'unenrolled',
  },
  argTypes: {
    enrollmentPhase: {
      control: { type: 'select' },
      options: [...ENROLLMENT_PHASE_OPTIONS],
      description: 'Choose the enrollment phase rendered by the screen.',
      table: { category: STORY_CONTROLS },
    },
  },
  parameters: {
    controls: {
      exclude: ['phase', 'onEnrolled', 'onboardingGates'],
    },
  },
  render: (args: Partial<EnrollmentStoryArgs>) => ({
    Component: Enrollment,
    props: enrollmentProps(args),
  }),
};

export default meta;
type Story = StoryObj<EnrollmentStoryArgs>;

export const Default: Story = {
  args: { enrollmentPhase: 'unenrolled' },
};

export const Authenticating: Story = {
  args: { enrollmentPhase: 'authenticating' },
};
