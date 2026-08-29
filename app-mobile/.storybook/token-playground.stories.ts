// ───────────────────────────────────────────────────────────────────
// MODULE: TOKEN PLAYGROUND STORY
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import TokenPlayground from './token-playground.svelte';

const meta: Meta<typeof TokenPlayground> = {
  title: 'Design/Token playground',
  component: TokenPlayground,
  parameters: {
    layout: 'fullscreen',
    // The page edits the design system rather than demonstrating a component,
    // so an args table would describe nothing.
    controls: { disable: true },
  },
} satisfies Meta<typeof TokenPlayground>;

export default meta;
type Story = StoryObj<typeof TokenPlayground>;

export const Playground: Story = {};
