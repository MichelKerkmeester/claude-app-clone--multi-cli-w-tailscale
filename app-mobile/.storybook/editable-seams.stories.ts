// ───────────────────────────────────────────────────────────────────
// MODULE: EDITABLE SEAMS STORY
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import EditableSeams from './editable-seams.svelte';

const meta: Meta<typeof EditableSeams> = {
  title: 'Design/Editable seams',
  component: EditableSeams,
  parameters: {
    layout: 'fullscreen',
    // The page reports on the codebase rather than taking props, so an args
    // table would describe nothing.
    controls: { disable: true },
  },
} satisfies Meta<typeof EditableSeams>;

export default meta;
type Story = StoryObj<typeof EditableSeams>;

export const Reference: Story = {};
