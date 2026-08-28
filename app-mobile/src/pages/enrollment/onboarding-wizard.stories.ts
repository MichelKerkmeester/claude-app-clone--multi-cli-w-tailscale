// ───────────────────────────────────────────────────────────────────
// MODULE: Onboarding Wizard Stories
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import OnboardingWizard from './onboarding-wizard.svelte';

const meta = {
  title: 'Views/Enrollment/Onboarding Wizard',
  component: OnboardingWizard,
  tags: ['autodocs'],
} satisfies Meta<typeof OnboardingWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Choice: Story = {
  args: {
    decisions: {},
    gates: [
      {
        id: 'pairing-guidance',
        title: 'Choose your pairing guidance',
        description: 'Choose how much help you want while pairing this device.',
        options: [
          { value: 'guided', label: 'Show guided pairing help' },
          { value: 'direct', label: 'Go straight to pairing' },
        ],
      },
    ],
  },
};

export const Complete: Story = {
  args: {
    decisions: { 'pairing-guidance': 'direct' },
    gates: [
      {
        id: 'pairing-guidance',
        title: 'Choose your pairing guidance',
        description: 'Choose how much help you want while pairing this device.',
        options: [
          { value: 'guided', label: 'Show guided pairing help' },
          { value: 'direct', label: 'Go straight to pairing' },
        ],
      },
    ],
  },
};
