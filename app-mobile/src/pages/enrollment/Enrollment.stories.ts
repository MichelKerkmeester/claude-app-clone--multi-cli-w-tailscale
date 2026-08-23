import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { DeviceIdentity } from '$shared/transport/auth.js';
import Enrollment from './Enrollment.svelte';

const onEnrolled = (_device: DeviceIdentity): void => {};

const meta = {
  title: 'Views/Enrollment',
  component: Enrollment,
  tags: ['autodocs'],
} satisfies Meta<typeof Enrollment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { phase: 'unenrolled', onEnrolled },
};

export const Authenticating: Story = {
  args: { phase: 'authenticating', onEnrolled },
};
