// ───────────────────────────────────────────────────────────────────
// MODULE: IN-APP LINK OVERLAY STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import InAppLinkOverlay from './in-app-link-overlay.svelte';

const noop = (): void => {};

const meta: Meta<typeof InAppLinkOverlay> = {
  title: 'Artifacts/InAppLinkOverlay',
  component: InAppLinkOverlay,
  tags: ['autodocs'],
} satisfies Meta<typeof InAppLinkOverlay>;

export default meta;
type Story = StoryObj<typeof InAppLinkOverlay>;

export const OpenMailLink: Story = {
  args: {
    url: 'mailto:release-team@example.com?subject=Review%20the%20mobile%20release',
    onClose: noop,
  },
};
