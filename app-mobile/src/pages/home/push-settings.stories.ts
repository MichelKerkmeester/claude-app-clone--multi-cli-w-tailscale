// ───────────────────────────────────────────────────────────────────
// MODULE: PUSH SETTINGS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { PushConfig } from '$shared/format/attention.js';
import {
  installStoryHostFetch,
  storyHostHttpError,
} from '$shared/fixtures/story-host-fetch.js';
import PushSettings from './push-settings.svelte';

const DEMO_PUSH_CONFIG: PushConfig = {
  supported: true,
  vapidPublicKey: 'BNtYwF0z3q4VapidPublicKeyFromHostPreviewNotASecret',
  preferences: { needs_input: true, finished: true, error: false },
};

const meta = {
  title: 'Home/PushSettings',
  component: PushSettings,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Push support and current preferences are fetched from the relay after mount. A denied browser permission disables preference changes and shows a recovery notice; if the browser exposes no notification capability, subscribe is inert, and if the relay does not advertise push the inbox remains the fallback. The browser-settings action is unavailable when the host cannot open browser settings.',
      },
    },
  },
} satisfies Meta<typeof PushSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  beforeEach: () =>
    installStoryHostFetch({
      '/api/push/config': () => DEMO_PUSH_CONFIG,
    }),
};

export const HostError: Story = {
  args: {},
  beforeEach: () =>
    installStoryHostFetch({
      '/api/push/config': () => storyHostHttpError(404),
    }),
};
