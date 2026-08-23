import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { ThemePreference } from '../format/view-helpers.js';
import ThemeControl from './theme-control.svelte';

// One story per real ThemePreference value — each shows the segmented selector
// with that option in its selected state. The theme values are the frozen
// theme contract; the change handler is a no-op arrow.
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
