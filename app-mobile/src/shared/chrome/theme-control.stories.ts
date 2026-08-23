// ───────────────────────────────────────────────────────────────────
// MODULE: THEME CONTROL STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { ThemePreference } from '../format/view-helpers.js';
import ThemeControl from './theme-control.svelte';

// Each story shows one real `ThemePreference` value in the segmented selector's selected state.
// The theme values are the frozen contract; the change handler is a no-op arrow.
const onThemeChange = (_theme: ThemePreference): void => {};

const meta = {
  title: 'Views/ThemeControl',
  component: ThemeControl,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = { args: { value: 'system', onChange: onThemeChange } };

export const Light: Story = { args: { value: 'light', onChange: onThemeChange } };

export const Dark: Story = { args: { value: 'dark', onChange: onThemeChange } };
